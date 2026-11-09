// The one persistent Three.js stage (DESIGN 3.6). Screens change camera shot, layout framing,
// props and mood; the scene never reloads.
import * as THREE from 'three';
import { Cyril } from './Cyril.js';
import { buildRoom, buildProps, buildCake, buildThrowables, seatPosition, seatAngle, TABLE_Y } from './props.js';
import { buildAvatar, animateAvatar, renderAvatarThumbnails } from './avatars.js';
import { radialTexture } from './textures.js';

// Camera shots: [position], [target]. fov 40 portrait (DESIGN 3.6).
export const SHOTS = {
  title: { pos: [0, 0.55, 1.1], target: [0, 0.22, 0], orbit: 6 },
  create: { pos: [0, 0.42, 0.75], target: [0.12, 0.2, 0] },
  join: { pos: [0, 0.42, 0.75], target: [0.12, 0.2, 0] },
  lobby: { pos: [0, 1.6, 1.4], target: [0, 0, -0.2] },
  intro: { pos: [0, 0.4, 0.8], target: [0, 0.2, 0] },
  write: { pos: [0, 0.205, 0.42], target: [0, 0.2, 0] },
  vote: { pos: [0, 0.7, 1.0], target: [0, 0.18, 0] },
  reveal: { pos: [0, 0.5, 0.9], target: [0, 0.2, 0] },
  scores: { pos: [0, 0.9, 1.2], target: [0, 0.1, -0.2] },
  podiumStart: { pos: [0, 0.6, 1.4], target: [0, 0.2, 0] },
  podium: { pos: [0, 0.35, 0.7], target: [0, 0.17, 0] },
  end: { pos: [0, 0.6, 1.15], target: [0, 0.15, 0] },
};

const easeInOutQuint = (t) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2);

function warmEnvironment(renderer) {
  // A tiny procedural room for reflections: dark warm walls, a candle glow, a cool window.
  const env = new THREE.Scene();
  const box = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshBasicMaterial({ color: '#2A1510', side: THREE.BackSide }));
  env.add(box);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFB866').multiplyScalar(6) }));
  glow.position.set(0.5, 2.5, 2);
  env.add(glow);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(2, 2.6), new THREE.MeshBasicMaterial({ color: new THREE.Color('#9FB6D9').multiplyScalar(1.2) }));
  win.position.set(2.5, 1.5, -4.9);
  env.add(win);
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(8, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color('#F3E6D3').multiplyScalar(0.6) }));
  fill.rotation.x = -Math.PI / 2;
  fill.position.y = -2;
  env.add(fill);
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(env, 0.04);
  pm.dispose();
  return rt.texture;
}

export class Stage {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{quality?:string, reducedMotion?:boolean, autoQuality?:boolean}} o
   */
  constructor(canvas, { quality = 'auto', reducedMotion = false, autoQuality = true } = {}) {
    this.canvas = canvas;
    this.reduced = reducedMotion;
    this.autoQuality = autoQuality && quality === 'auto';
    this.dprCap = quality === 'low' ? 1.25 : 2;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.dprCap));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor('#3B1F18');

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#3B1F18');
    this.scene.fog = new THREE.FogExp2('#3B1F18', 0.35);
    this.scene.environment = warmEnvironment(this.renderer);
    this.scene.environmentIntensity = 0.45;

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.02, 30);
    this.camPos = new THREE.Vector3(...SHOTS.title.pos);
    this.camTarget = new THREE.Vector3(...SHOTS.title.target);
    this.tween = null;
    this.shotName = 'title';
    this.orbit = SHOTS.title.orbit || 0;
    this.shakeUntil = 0;
    this.shakeAmp = 0;

    // Lights (DESIGN 3.6): key = Cyril's candle; fill hemisphere; cool rim
    this.hemi = new THREE.HemisphereLight('#FFD9A8', '#3B1F18', 0.35);
    this.scene.add(this.hemi);
    this.rim = new THREE.DirectionalLight('#9FB6D9', 0.25);
    this.rim.position.set(1.5, 2, -2.5);
    this.scene.add(this.rim);
    // a soft warm room glow so the table edge doesn't fall to black on small screens
    this.warm = new THREE.PointLight('#FFB070', 2.4, 5, 2);
    this.warm.position.set(-0.5, 0.9, 1.3);
    this.scene.add(this.warm);

    this.room = buildRoom();
    this.scene.add(this.room);
    this.props = buildProps();
    this.scene.add(this.props);

    this.cyril = new Cyril({ reducedMotion: this.reduced });
    this.cyril.group.position.y = TABLE_Y + 0.02;
    this.scene.add(this.cyril.group);
    this.cyrilHome = new THREE.Vector3(0, TABLE_Y + 0.02, 0);
    this.cyrilGoal = this.cyrilHome.clone();

    // Cyril's blob shadow + a candle pool of light on the cloth
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({
      map: radialTexture({ size: 128, inner: 'rgba(255,190,110,0.22)', mid: 'rgba(255,170,90,0.08)', outer: 'rgba(255,170,90,0)' }),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    pool.position.y = TABLE_Y + 0.0015;
    this.scene.add(pool);
    this.pool = pool;

    // Avatars at seats
    this.seats = new Map(); // playerId -> {group, avatar, index, drop}
    this.avatarCache = new Map();
    const blobMat = new THREE.MeshBasicMaterial({ map: radialTexture({ size: 64, inner: 'rgba(30,14,10,0.6)', outer: 'rgba(30,14,10,0)' }), transparent: true, depthWrite: false });
    this.blobGeo = new THREE.PlaneGeometry(0.16, 0.16).rotateX(-Math.PI / 2);
    this.blobMat = blobMat;

    // Cake (podium)
    this.cake = buildCake();
    this.cake.visible = false;
    this.cake.position.set(0.12, TABLE_Y, -0.08);
    this.scene.add(this.cake);
    this.cakeRise = 0;
    this.podiumIds = null;

    // Thrown reactions pool
    const { roll, rose } = buildThrowables();
    this.throwPool = [];
    for (let i = 0; i < 12; i++) {
      const m = (i % 2 ? rose : roll).clone();
      m.visible = false;
      this.scene.add(m);
      this.throwPool.push({ mesh: m, kind: i % 2 ? 'rose' : 'roll', life: -1 });
    }

    // Layout framing: the camera centre sits in the visible show region.
    this.frame = { h: 1, goal: 1, x: 0, xGoal: 0 }; // fraction of canvas height used as the "full frame"
    this.stripPx = 132;
    this.layout = 'show';

    this.frameFns = new Set();
    this._last = performance.now();
    this.running = false;
    this.lastRender = 0;
    this.ft = { sum: 0, n: 0, t0: performance.now() };
    this.time = 0;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.visualViewport?.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => (document.hidden ? this.stop() : this.start()));
  }

  // ---------- lifecycle ----------

  start() {
    if (this.running) return;
    this.running = true;
    this._last = performance.now();
    const loop = () => {
      if (!this.running) return;
      requestAnimationFrame(loop);
      this._frame();
    };
    requestAnimationFrame(loop);
  }

  stop() { this.running = false; }

  onFrame(fn) { this.frameFns.add(fn); return () => this.frameFns.delete(fn); }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.w = w; this.h = h;
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this._applyFrame();
  }

  // ---------- camera ----------

  /** Move to a named shot (SHOTS). Duration in ms; reduced motion = quick crossfade-ish cut. */
  setShot(name, { duration = 800, instant = false } = {}) {
    const s = SHOTS[name];
    if (!s) return;
    this.shotName = name;
    this.orbit = s.orbit || 0;
    const to = { pos: new THREE.Vector3(...s.pos), target: new THREE.Vector3(...s.target) };
    if (instant || this.reduced) {
      this.camPos.copy(to.pos);
      this.camTarget.copy(to.target);
      this.tween = null;
      return;
    }
    this.tween = { from: { pos: this.camPos.clone(), target: this.camTarget.clone() }, to, t0: performance.now(), dur: duration };
  }

  shake(amp = 0.004, ms = 150) {
    if (this.reduced) return;
    this.shakeAmp = amp;
    this.shakeUntil = performance.now() + ms;
  }

  /** 'show' | 'split' | 'input'. stripPx sets the input-mode show strip height. */
  setLayout(layout, { stripPx, instant = false } = {}) {
    this.layout = layout;
    if (stripPx) this.stripPx = stripPx;
    this.frame.goal = layout === 'split' ? 0.4 : layout === 'input' ? this.stripPx / Math.max(1, this.h) : 1;
    // input strip: Cyril's head sits in the left slot (centre ~56 px from the left edge)
    this.frame.xGoal = layout === 'input' ? (this.w / 2 - 58) / Math.max(1, this.w) : 0;
    if (instant) { this.frame.h = this.frame.goal; this.frame.x = this.frame.xGoal; this._applyFrame(); }
  }

  _applyFrame() {
    const W = this.w; const H = this.h;
    const fh = Math.max(0.05, this.frame.h) * H;
    this.camera.aspect = W / fh;
    this.camera.setViewOffset(W, fh, this.frame.x * W, 0, W, H);
    this.camera.updateProjectionMatrix();
  }

  /** CSS-pixel screen position of a world point. */
  project(v3) {
    const v = v3.clone().project(this.camera);
    return { x: (v.x + 1) / 2 * this.w, y: (1 - v.y) / 2 * this.h, behind: v.z > 1 };
  }

  cyrilHeadScreen() { return this.project(this.cyril.headWorld()); }

  // ---------- avatars ----------

  /** Sync avatars at seats with the player list (array of {id, avatar}). New ones drop in. */
  setPlayers(players) {
    const ids = new Set(players.map((p) => p.id));
    for (const [id, s] of this.seats) {
      if (!ids.has(id)) { this.scene.remove(s.group); this.seats.delete(id); }
    }
    players.forEach((p, i) => {
      let s = this.seats.get(p.id);
      if (s && s.avatarIndex !== p.avatar) { this.scene.remove(s.group); this.seats.delete(p.id); s = null; }
      if (!s) {
        const group = new THREE.Group();
        const avatar = buildAvatar(p.avatar);
        avatar.scale.setScalar(1.25);
        group.add(avatar);
        const blob = new THREE.Mesh(this.blobGeo, this.blobMat);
        blob.position.y = 0.001;
        group.add(blob);
        this.scene.add(group);
        s = { group, avatar, avatarIndex: p.avatar, drop: { y: 0.5, v: 0 } };
        this.seats.set(p.id, s);
      }
      s.seat = i;
      s.home = seatPosition(i);
      s.connected = p.connected !== false;
      if (!this.podiumIds) {
        s.group.position.x = s.home.x;
        s.group.position.z = s.home.z;
        s.group.rotation.y = -seatAngle(i);
      }
    });
  }

  avatarScreen(playerId) {
    const s = this.seats.get(playerId);
    if (!s) return null;
    return this.project(s.group.localToWorld(new THREE.Vector3(0, 0.08, 0)));
  }

  /** Make an avatar hop (reveal juice). */
  hop(playerId) {
    const s = this.seats.get(playerId);
    if (s) s.drop.v = 1.4;
  }

  thumbnails(size = 160) {
    if (!this._thumbs) this._thumbs = renderAvatarThumbnails(this.renderer, size);
    return this._thumbs;
  }

  // ---------- podium ----------

  /** Show the cake with the top 3 player ids on its tiers; null to hide. */
  setPodium(top3) {
    this.podiumIds = top3;
    this.cake.visible = !!top3;
    this.cakeRise = 0;
    this.cyrilGoal.copy(top3 ? new THREE.Vector3(-0.17, TABLE_Y + 0.02, 0.06) : this.cyrilHome);
    if (!top3) {
      for (const s of this.seats.values()) { s.group.position.set(s.home.x, TABLE_Y, s.home.z); s.group.rotation.y = -seatAngle(s.seat); }
    }
  }

  // ---------- reactions ----------

  throwReaction(kind) {
    if (kind !== 'roll' && kind !== 'rose') return;
    const slot = this.throwPool.find((p) => p.kind === kind && p.life < 0) || this.throwPool.find((p) => p.kind === kind);
    const start = new THREE.Vector3((Math.random() - 0.5) * 1.2, -1.05, 0.6).unproject(this.camera);
    const a = Math.random() * Math.PI - Math.PI; // land behind/around Cyril
    const r = 0.14 + Math.random() * 0.3;
    const end = new THREE.Vector3(this.cyril.group.position.x + Math.cos(a) * r, TABLE_Y + 0.02, Math.sin(a) * r * 0.6 + 0.12);
    slot.from = start;
    slot.to = end;
    slot.life = 0;
    slot.spin = new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10);
    slot.mesh.visible = true;
    slot.mesh.scale.setScalar(1);
  }

  _updateThrows(dt) {
    for (const p of this.throwPool) {
      if (p.life < 0) continue;
      p.life += dt;
      const L = 1.2;
      const t = Math.min(1, p.life / 0.75);
      const pos = p.from.clone().lerp(p.to, t);
      pos.y += Math.sin(t * Math.PI) * 0.35 * (1 - t * 0.3);
      if (t >= 1) {
        const k = (p.life - 0.75) / (L - 0.75);
        pos.y = p.to.y + Math.abs(Math.sin(k * Math.PI * 2)) * 0.02 * (1 - k);
        p.mesh.scale.setScalar(Math.max(0.001, 1 - Math.max(0, k - 0.6) / 0.4));
      } else {
        p.mesh.rotation.x += p.spin.x * dt; p.mesh.rotation.y += p.spin.y * dt; p.mesh.rotation.z += p.spin.z * dt;
      }
      p.mesh.position.copy(pos);
      if (p.life > L) { p.life = -1; p.mesh.visible = false; }
    }
  }

  // ---------- frame ----------

  _frame() {
    const now = performance.now();
    if (this.layout === 'input' && now - this.lastRender < 30) return; // 30 fps in writing phases
    const dt = Math.min(0.05, (now - this._last) / 1000);
    this._last = now;
    this.time += dt;
    this.lastRender = now;

    // framing
    const fk = 1 - Math.exp(-dt * 7);
    if (Math.abs(this.frame.h - this.frame.goal) > 0.0005 || Math.abs(this.frame.x - this.frame.xGoal) > 0.0005) {
      this.frame.h += (this.frame.goal - this.frame.h) * fk;
      this.frame.x += (this.frame.xGoal - this.frame.x) * fk;
      this._applyFrame();
    }

    // camera tween
    if (this.tween) {
      const k = Math.min(1, (now - this.tween.t0) / this.tween.dur);
      const e = easeInOutQuint(k);
      this.camPos.lerpVectors(this.tween.from.pos, this.tween.to.pos, e);
      this.camTarget.lerpVectors(this.tween.from.target, this.tween.to.target, e);
      if (k >= 1) this.tween = null;
    }
    const cam = this.camera;
    cam.position.copy(this.camPos);
    if (this.orbit && !this.reduced) {
      const ang = THREE.MathUtils.degToRad(this.orbit) * Math.sin((this.time / 14) * Math.PI * 2);
      const off = this.camPos.clone().sub(this.camTarget);
      off.applyAxisAngle(new THREE.Vector3(0, 1, 0), ang);
      cam.position.copy(this.camTarget).add(off);
    }
    if (now < this.shakeUntil) {
      cam.position.x += (Math.random() - 0.5) * 2 * this.shakeAmp;
      cam.position.y += (Math.random() - 0.5) * 2 * this.shakeAmp;
    }
    cam.lookAt(this.camTarget);

    // Cyril
    this.cyril.group.position.lerp(this.cyrilGoal, 1 - Math.exp(-dt * 4));
    this.cyril.update(dt);
    this.pool.position.x = this.cyril.group.position.x;
    this.pool.position.z = this.cyril.group.position.z;
    this.pool.material.opacity = Math.min(1.2, this.cyril.flicker);

    // avatars: drop-in spring + idle bob, podium placement
    const amp = this.reduced ? 0.5 : 1;
    for (const [id, s] of this.seats) {
      const d = s.drop;
      d.v += (-d.y * 260 - d.v * 18) * dt;
      d.y += d.v * dt;
      if (d.y < 0 && d.v < 0 && Math.abs(d.v) < 0.05) d.y = 0;
      s.group.position.y = TABLE_Y + Math.max(-0.01, d.y);
      s.avatar.userData.lift = 0;
      animateAvatar(s.avatar, this.time, amp);
      s.group.visible = true;
      if (this.podiumIds) {
        const rank = this.podiumIds.indexOf(id);
        if (rank >= 0) {
          const tier = this.cake.userData.tiers[2 - rank] || this.cake.userData.tiers[0];
          const off = rank === 0 ? new THREE.Vector3(-0.02, 0, 0.0) : rank === 1 ? new THREE.Vector3(-0.07, 0, 0.09) : new THREE.Vector3(0.06, 0, 0.15);
          const goal = this.cake.position.clone().add(off);
          goal.y = TABLE_Y + tier.top * this.cakeRise;
          s.group.position.x += (goal.x - s.group.position.x) * fk;
          s.group.position.z += (goal.z - s.group.position.z) * fk;
          s.group.position.y = goal.y + Math.max(0, d.y);
          s.group.rotation.y += (0 - s.group.rotation.y) * fk;
        } else {
          s.group.visible = false;
        }
      }
    }
    if (this.cake.visible) {
      this.cakeRise = Math.min(1, this.cakeRise + dt / 1.6);
      const e = 1 - (1 - this.cakeRise) ** 3;
      this.cake.position.y = TABLE_Y - 0.3 * (1 - e);
    }

    this._updateThrows(dt);
    for (const fn of this.frameFns) {
      try { fn(dt, this.time); } catch (e) { console.error('[stage frame]', e); }
    }
    this.renderer.render(this.scene, cam);
    this._quality(now, dt);
  }

  _quality(now, dt) {
    if (!this.autoQuality) return;
    this.ft.sum += dt * 1000;
    this.ft.n += 1;
    if (now - this.ft.t0 > 2000) {
      const avg = this.ft.sum / this.ft.n;
      const dpr = this.renderer.getPixelRatio();
      if (avg > 20 && dpr > 1.25) {
        const next = dpr > 1.5 ? 1.5 : 1.25;
        this.renderer.setPixelRatio(next);
        this.resize();
      }
      this.ft = { sum: 0, n: 0, t0: now };
    }
  }

  /** Render now and measure the frame (screenshot harness: proves WebGL isn't blank). */
  snapshotStats() {
    this.renderer.render(this.scene, this.camera);
    const gl = this.renderer.getContext();
    const w = gl.drawingBufferWidth; const h = gl.drawingBufferHeight;
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let sum = 0; let sum2 = 0; let bright = 0; const n = w * h;
    for (let i = 0; i < px.length; i += 16) {
      const l = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
      sum += l; sum2 += l * l;
      if (l > 90) bright++;
    }
    const m = n / 4;
    const mean = sum / m;
    return { w, h, mean: Math.round(mean), std: Math.round(Math.sqrt(Math.max(0, sum2 / m - mean * mean))), brightFrac: +(bright / m).toFixed(3) };
  }
}
