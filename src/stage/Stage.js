// The one persistent Three.js stage (DESIGN 3.6). Screens change camera shot, layout framing,
// props and mood; the scene never reloads.
import * as THREE from 'three';
import { Cyril } from './Cyril.js';
import { buildRoom, buildProps, buildCake, buildThrowables, seatPosition, seatAngle, TABLE_Y } from './props.js';
import { buildAvatar, animateAvatar, renderAvatarThumbnails } from './avatars.js';
import { radialTexture } from './textures.js';
import { contentRects, freeBands } from './framing.js';

// Camera shots: [position], [target]. fov 40 portrait (DESIGN 3.6).
export const SHOTS = {
  // subject: what the content-aware framer keeps in the free part of the show layer.
  //   'cyril' = whole candle, 'head' = face + flame (input strip), 'podium' = cake + winners,
  //   undefined = classic framing (whole region; the screen's layout is built around it).
  title: { expr: 'welcome', pos: [0, 0.55, 1.1], target: [0, 0.22, 0], orbit: 6 },
  create: { expr: 'welcome', pos: [0.05, 0.36, 0.78], target: [0, 0.17, 0], subject: 'cyril', maxS: 0.3 },
  join: { expr: 'welcome', pos: [-0.05, 0.36, 0.78], target: [0, 0.17, 0], subject: 'cyril', maxS: 0.3 },
  lobby: { expr: 'welcome', pos: [0, 1.6, 1.4], target: [0, 0, -0.2] },
  intro: { expr: 'welcome', pos: [0, 0.3, 0.95], target: [0, 0.16, 0], subject: 'cyril', orbit: 3, maxS: 0.44 },
  write: { expr: 'attentive', pos: [0, 0.27, 1.05], target: [0, 0.21, 0], subject: 'head' },
  vote: { expr: 'sly', pos: [0, 0.55, 1.05], target: [0, 0.16, 0], subject: 'cyril' },
  reveal: { expr: 'eager', pos: [0, 0.34, 0.95], target: [0, 0.15, 0], subject: 'cyril' },
  scores: { expr: 'sly', pos: [0, 0.4, 1.0], target: [0, 0.16, 0], subject: 'cyril' },
  podiumStart: { expr: 'proud', pos: [0, 0.75, 1.7], target: [0, 0.2, -0.2], subject: 'podium' },
  podium: { expr: 'proud', pos: [0, 0.42, 1.2], target: [0, 0.16, -0.2], subject: 'podium' },
  end: { expr: 'warm', pos: [0, 0.6, 1.15], target: [0, 0.15, 0] },
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
  constructor(canvas, { quality = 'auto', reducedMotion = false, autoQuality = true, maxFps = 0 } = {}) {
    this.maxFps = maxFps; // 0 = uncapped (rAF). Tests cap it so software GL never queues frames.
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
    this.hemi = new THREE.HemisphereLight('#FFD9A8', '#3B1F18', 0.2);
    this.scene.add(this.hemi);
    this.rim = new THREE.DirectionalLight('#9FB6D9', 0.25);
    this.rim.position.set(1.5, 2, -2.5);
    this.scene.add(this.rim);
    // a soft warm room glow so the table edge doesn't fall to black on small screens
    this.warm = new THREE.PointLight('#FFB070', 1.3, 5, 2);
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
    this.cake.scale.setScalar(1.6);
    this.cake.visible = false;
    this.cake.position.set(0.07, TABLE_Y, -0.36);
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
    // View frame in CSS px: the camera frustum maps to screen rows [fy, fy+fh], centre column
    // shifted by xs. Smoothed toward a goal set by the content-aware framer (framing.js).
    this.view = { fh: 1, fy: 0, xs: 0 };
    this.viewGoal = null; // {mode:'region', fh, fy, xs} | {mode:'subject', S, Yc, Xc}
    this.subject = null;
    this.stripPx = 132;
    this.layout = 'show';
    this._measureAt = 0;
    this._snapView = true;
    this._tmpV = new THREE.Vector3();
    this._viewM = new THREE.Matrix4();

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
    // Landscape phone (matches src/ui/landscape.css): show on the left, input sheet on the right.
    this.land = w > h && h <= 600;
    document.body.classList.toggle('land', this.land);
    this.w = w; this.h = h;
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    if (this.view.fh <= 1) this.view.fh = h;
    this._measureAt = 0;
    this._applyFrame();
  }

  // ---------- camera ----------

  /** Move to a named shot (SHOTS). Duration in ms; reduced motion = quick crossfade-ish cut. */
  setShot(name, { duration = 800, instant = false } = {}) {
    const s = SHOTS[name];
    if (!s) return;
    this.shotName = name;
    this.orbit = s.orbit || 0;
    this.subject = s.subject || null;
    this.cyril.setExpression(s.expr || 'neutral');
    this.shotMaxS = s.maxS || null;
    this._measureAt = 0;
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
    this._measureAt = 0; // re-measure the free space on the next frame
    if (instant) this._snapView = true;
  }

  _safeTop() {
    if (!this._probe) {
      this._probe = document.createElement('div');
      this._probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:env(safe-area-inset-top,0px);visibility:hidden;pointer-events:none';
      document.body.append(this._probe);
    }
    return this._probe.offsetHeight || 0;
  }

  /** Height of the visible show region for the current layout (CSS px). */
  _showBottom() {
    const H = this.h;
    if (this.land && this.layout !== 'show') return H;
    if (this.layout === 'split') return H * 0.4;
    if (this.layout === 'input') return this.stripPx + this._safeTop();
    const rail = document.getElementById('rail');
    const rr = rail?.getBoundingClientRect();
    return rr && rr.height > 0 && rr.top > H * 0.5 ? rr.top : H - 72;
  }

  /** Decide where the subject should sit, from where the HTML content actually is. */
  _measure() {
    const W = this.w; const H = this.h;
    const bottom = this._showBottom() - (this.layout === 'show' ? 22 : 0);
    if (this.land && this.layout === 'split') {
      // left column (width from landscape.css --land-l): Cyril low and big, bubble room above him
      const colW = this._landCol();
      const S = Math.min(H * 0.5, colW * 0.62);
      return { mode: 'subject', subject: this.subject || 'cyril', S, Yc: H - S / 2 - 18, Xc: colW / 2 };
    }
    if (this.layout === 'input') {
      const slot = document.querySelector('#strip .cyril-slot');
      const r = slot?.getBoundingClientRect();
      const top = this._safeTop();
      const sh = bottom - top;
      if (r && r.width > 4) {
        // only the part of the slot above the sheet is visible: fit mouth-to-flame inside it
        const y0 = Math.max(r.top, top + 2); const y1 = Math.min(r.bottom, bottom - 6);
        const S = Math.max(60, y1 - y0);
        return { mode: 'subject', subject: 'head', S, Yc: (y0 + y1) / 2, Xc: r.left + r.width / 2 };
      }
      return { mode: 'subject', subject: 'head', S: sh * 0.85, Yc: top + sh / 2, Xc: 58 };
    }
    if (!this.subject) return { mode: 'region', fh: bottom, fy: 0, xs: 0 };
    const top = this._safeTop() + 8;
    let rects = [];
    try {
      rects = contentRects([document.getElementById('show'), document.getElementById('topbar')]);
    } catch (e) { rects = []; }
    const maxS = (this.land ? 0.62 : (this.shotMaxS || (this.layout === 'split' ? 0.27 : 0.36))) * H;
    const minS = this.land ? 110 : this.layout === 'split' ? 104 : 128;
    const tryCol = (cx, half) => freeBands(rects, top, bottom, cx - half, cx + half)[0];
    const fitIn = (band, Xc) => {
      if (this.subject === 'podium') { // leave a strip above the cake for Cyril's line
        const S = Math.min(maxS, band.h - 96);
        return { S, Yc: band.bottom - S / 2 - 4, Xc };
      }
      // Tall band: Cyril sits low, leaving headroom for his speech bubble above.
      if (band.h > maxS + 110) return { S: maxS, Yc: band.bottom - maxS / 2 - 6, Xc };
      const S = Math.min(maxS, band.h - 10);
      return { S, Yc: band.top + band.h / 2, Xc };
    };
    const centre = tryCol(W / 2, 70);
    const left = tryCol(W * 0.27, 62);
    let g;
    if (this.land && this.subject !== 'podium') {
      // landscape: Cyril takes whichever side column is free (screens put their cards on the other side)
      const lc = tryCol(W * 0.2, 80); const rc = tryCol(W * 0.8, 80);
      const best = [lc && { b: lc, x: W * 0.2 }, rc && { b: rc, x: W * 0.8 }, centre && { b: centre, x: W / 2 }]
        .filter(Boolean).sort((a, b) => b.b.h - a.b.h)[0];
      if (best && best.b.h >= minS) {
        const S = Math.min(maxS, best.b.h - (best.b.h > maxS + 90 ? 90 : 10));
        return { mode: 'subject', subject: this.subject, S, Yc: best.b.bottom - S / 2 - 6, Xc: best.x };
      }
    }
    if (centre && centre.h > maxS + 110) g = fitIn(centre, W / 2); // room for Cyril and a bubble above him
    else if (centre && centre.h >= minS + 100 && this.subject === 'cyril') {
      // centred, a little smaller, leaving a bubble-sized gap above his flame
      const S = Math.min(maxS, centre.h - 100);
      g = { S, Yc: centre.bottom - S / 2 - 6, Xc: W / 2 };
    } else if (left && left.h >= minS && this.subject === 'cyril') g = fitIn(left, W * 0.27); // bubble goes beside him
    else if (centre && centre.h >= minS) g = fitIn(centre, W / 2);
    else {
      // No room anywhere: peek over the content (flame and eyes in the gap, body behind cards).
      const b = centre || { top, bottom, h: bottom - top };
      const S = minS * 1.1;
      g = { S, Yc: b.top + S / 2 + 2, Xc: W / 2 };
    }
    return { mode: 'subject', subject: this.subject, ...g };
  }

  _landCol() {
    const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--land-l')) || 42;
    return this.w * v / 100;
  }

  /** World points that bound a subject. */
  _subjectPoints(subject) {
    const pts = [];
    const c = this.cyril.group;
    const add = (obj, x, y, z) => pts.push(obj.localToWorld(this._tmpV.set(x, y, z)).clone());
    if (subject === 'head') {
      for (const x of [-0.07, 0.07]) add(c, x, 0.105, 0.08);
      add(c, 0, 0.36, 0);
    } else if (subject === 'podium') {
      const k = this.cake;
      for (const x of [-0.22, 0.24]) for (const z of [-0.2, 0.2]) add(k, x, 0, z);
      add(k, 0, 0.4, 0);
    } else {
      for (const x of [-0.1, 0.1]) { add(c, x, -0.02, 0.1); add(c, x, 0.24, 0.0); }
      add(c, 0, 0.4, 0); // flame tip with room for a ballooning reaction
    }
    return pts;
  }

  /** Turn a subject goal (screen size/centre) into view-frame params for the current camera. */
  _subjectView(goal) {
    this._viewM.lookAt(this.camPos, this.camTarget, THREE.Object3D.DEFAULT_UP);
    this._viewM.setPosition(this.camPos);
    const inv = this._viewM.clone().invert();
    let ax0 = Infinity; let ax1 = -Infinity; let ay0 = Infinity; let ay1 = -Infinity;
    for (const p of this._subjectPoints(goal.subject)) {
      p.applyMatrix4(inv);
      const d = Math.max(0.02, -p.z);
      const ax = p.x / d; const ay = p.y / d;
      ax0 = Math.min(ax0, ax); ax1 = Math.max(ax1, ax); ay0 = Math.min(ay0, ay); ay1 = Math.max(ay1, ay);
    }
    const tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const f0 = this.h / (2 * tanH);
    const fw = (this.w - 20) / Math.max(1e-4, ax1 - ax0); // never wider than the phone
    const f = THREE.MathUtils.clamp(Math.min(goal.S / Math.max(1e-4, ay1 - ay0), fw), f0 * 0.12, f0 * 4);
    const fh = 2 * f * tanH;
    const ayc = (ay0 + ay1) / 2; const axc = (ax0 + ax1) / 2;
    const fy = goal.Yc - fh / 2 + ayc * f;
    const xs = this.w / 2 - (goal.Xc - axc * f);
    return { fh, fy, xs };
  }

  _updateView(dtReal) {
    const now = performance.now();
    if (now > this._measureAt) {
      const g = this._measure();
      const old = this.viewGoal;
      const moved = !old || old.mode !== g.mode || old.subject !== g.subject
        || (g.mode === 'subject' ? Math.abs(g.S - old.S) > 10 || Math.abs(g.Yc - old.Yc) > 10 || Math.abs(g.Xc - old.Xc) > 10
          : Math.abs(g.fh - old.fh) > 4);
      if (moved) this.viewGoal = g;
      this._measureAt = now + 250;
    }
    const g = this.viewGoal;
    if (!g) return;
    const t = g.mode === 'subject' ? this._subjectView(g) : g;
    const v = this.view;
    const k = this._snapView || this.reduced ? 1 : 1 - Math.exp(-dtReal * 6);
    this._snapView = false;
    v.fh += (t.fh - v.fh) * k; v.fy += (t.fy - v.fy) * k; v.xs += (t.xs - v.xs) * k;
    this._applyFrame();
  }

  _applyFrame() {
    const W = this.w; const H = this.h;
    const fh = Math.max(20, this.view.fh);
    this.camera.aspect = W / fh;
    this.camera.setViewOffset(W, fh, this.view.xs, -this.view.fy, W, H);
    this.camera.updateProjectionMatrix();
  }

  /** CSS-pixel screen position of a world point. */
  project(v3) {
    const v = v3.clone().project(this.camera);
    return { x: (v.x + 1) / 2 * this.w, y: (1 - v.y) / 2 * this.h, behind: v.z > 1 };
  }

  cyrilHeadScreen() { return this.project(this.cyril.headWorld()); }

  /** Screen rect of what the camera is framing when it isn't just Cyril (podium cake + winners). */
  subjectScreen() {
    if (this.subject !== 'podium' || !this.cake.visible) return null;
    const pts = [];
    const k = this.cake;
    for (const x of [-0.22, 0.24]) for (const y of [0, 0.3]) pts.push(this.project(k.localToWorld(new THREE.Vector3(x, y, 0.15))));
    const xs = pts.map((p) => p.x); const ys = pts.map((p) => p.y);
    const x = Math.min(...xs); const y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  }

  /** Screen rects of Cyril's face (eyes to mouth), whole body and flame, plus tail anchors. */
  cyrilScreen() {
    const g = this.cyril.group;
    const P = (x, y, z) => this.project(g.localToWorld(new THREE.Vector3(x, y, z)));
    const box = (pts) => {
      const xs = pts.map((p) => p.x); const ys = pts.map((p) => p.y);
      const x = Math.min(...xs); const y = Math.min(...ys);
      return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
    };
    const face = box([P(-0.07, 0.1, 0.08), P(0.07, 0.1, 0.08), P(-0.07, 0.215, 0.08), P(0.07, 0.215, 0.08)]);
    const body = box([P(-0.12, -0.02, 0.1), P(0.12, -0.02, 0.1), P(-0.09, 0.245, 0), P(0.09, 0.245, 0)]);
    const flame = box([P(-0.03, 0.25, 0), P(0.03, 0.25, 0), P(0, 0.37, 0)]);
    return { face, body, flame, sideR: P(0.088, 0.17, 0.03), sideL: P(-0.088, 0.17, 0.03), top: P(0, 0.365, 0) };
  }

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
        avatar.scale.setScalar(1.5);
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
        s.group.rotation.y = -seatAngle(i) * 0.45; // half-turned to the table, half to us
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
    this.cyrilGoal.copy(top3 ? new THREE.Vector3(0.5, TABLE_Y + 0.02, -0.5) : this.cyrilHome);
    if (!top3) {
      for (const s of this.seats.values()) { s.group.position.set(s.home.x, TABLE_Y, s.home.z); s.group.rotation.y = -seatAngle(s.seat) * 0.45; s.avatar.scale.setScalar(1.5); }
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
    if (this.maxFps && now - this.lastRender < 1000 / this.maxFps) return;
    const dt = Math.min(0.05, (now - this._last) / 1000);
    this._last = now;
    this.time += dt;
    this.lastRender = now;

    const fk = 1 - Math.exp(-dt * 7);
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
    this._updateView(Math.min(0.5, (now - (this._lastView || now)) / 1000));
    this._lastView = now;

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
          const off = rank === 0 ? new THREE.Vector3(0, 0, 0.0) : rank === 1 ? new THREE.Vector3(-0.17, 0, 0.06) : new THREE.Vector3(0.22, 0, 0.14);
          const goal = this.cake.position.clone().add(off);
          goal.y = TABLE_Y + tier.top * this.cake.scale.y * this.cakeRise;
          s.group.position.x += (goal.x - s.group.position.x) * fk;
          s.group.position.z += (goal.z - s.group.position.z) * fk;
          s.group.position.y = goal.y + Math.max(0, d.y);
          s.group.rotation.y += (0 - s.group.rotation.y) * fk;
          const sc = rank === 0 ? 1.9 : 1.6;
          s.avatar.scale.setScalar(s.avatar.scale.x + (sc - s.avatar.scale.x) * fk);
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

  /** Render now and measure the frame (screenshot harness: proves WebGL isn't blank).
   * Downsamples via a 2D canvas (full-size readPixels is very slow under software GL). */
  snapshotStats() {
    this.renderer.render(this.scene, this.camera);
    const w = 72; const h = Math.round(72 * this.h / Math.max(1, this.w));
    const c = this._statCanvas || (this._statCanvas = document.createElement('canvas'));
    c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(this.canvas, 0, 0, w, h);
    const px = g.getImageData(0, 0, w, h).data;
    let sum = 0; let sum2 = 0; let bright = 0; const n = w * h;
    for (let i = 0; i < px.length; i += 4) {
      const l = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
      sum += l; sum2 += l * l;
      if (l > 90) bright++;
    }
    const mean = sum / n;
    return { w: this.canvas.width, h: this.canvas.height, mean: Math.round(mean), std: Math.round(Math.sqrt(Math.max(0, sum2 / n - mean * mean))), brightFrac: +(bright / n).toFixed(3) };
  }
}
