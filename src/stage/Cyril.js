// Cyril Waxley, the host: a stout church candle (DESIGN 1.2 - 1.3).
// Build: merged wax body (1 draw call) + flame shader + eyes/brows/mouth/bow tie + brass holder.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { radialTexture, waxTexture } from './textures.js';

const WAX = '#F3E6CF';
const CLARET = '#7A1E2C';
const TOFFEE = '#7A4A2A';
const BRASS = '#C89B3C';

const C_BASE = new THREE.Color('#FFF4D6');
const C_MID = new THREE.Color('#FFC86B');
const TIP = {
  calm: new THREE.Color('#E2553B').lerp(new THREE.Color('#FFC86B'), 0.35),
  hurry: new THREE.Color('#E2553B'),
  shock: new THREE.Color('#8FB8FF'),
  celebrate: new THREE.Color('#FFE7A8'),
};

// ---------- small value noise for flicker ----------
function hash1(n) { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }
function noise1(x) {
  const i = Math.floor(x); const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash1(i) * (1 - u) + hash1(i + 1) * u; // 0..1
}
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const easeOut = (t) => 1 - (1 - t) ** 3;

const flameVert = /* glsl */`
  uniform float uTime;
  uniform float uSway;
  varying float vH;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec3 p = position;
    float h = clamp((p.y + 0.03) / 0.06, 0.0, 1.0);
    vH = h;
    float sway = sin(uTime * 8.17) * 0.6 + sin(uTime * 13.3 + 1.7) * 0.4;
    p.x += sway * 0.0045 * h * h * uSway;
    p.z += sin(uTime * 6.1 + 0.4) * 0.002 * h * h * uSway;
    p.xz *= mix(1.0, 0.55, h * h);   // taper toward the tip
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const flameFrag = /* glsl */`
  uniform vec3 uBase;
  uniform vec3 uMid;
  uniform vec3 uTip;
  uniform float uBright;
  varying float vH;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec3 c = mix(uBase, uMid, smoothstep(0.15, 0.55, vH));
    c = mix(c, uTip, smoothstep(0.55, 1.0, vH));
    float facing = pow(clamp(dot(vN, vV), 0.0, 1.0), 1.4);
    float a = facing * (1.0 - smoothstep(0.7, 1.0, vH) * 0.85) * smoothstep(0.0, 0.12, vH + 0.05);
    gl_FragColor = vec4(c * uBright * (0.9 + facing * 0.6), a);
  }
`;

function mouthShapes() {
  // D shape: flat top, round bottom (width 0.03, height 0.016)
  const d = new THREE.Shape();
  d.moveTo(-0.015, 0);
  d.lineTo(0.015, 0);
  d.quadraticCurveTo(0.015, -0.016, 0, -0.016);
  d.quadraticCurveTo(-0.015, -0.016, -0.015, 0);
  // smile: crescent
  const s = new THREE.Shape();
  s.moveTo(-0.017, 0.002);
  s.quadraticCurveTo(0, -0.008, 0.017, 0.002);
  s.quadraticCurveTo(0.012, -0.014, 0, -0.015);
  s.quadraticCurveTo(-0.012, -0.014, -0.017, 0.002);
  const geoD = new THREE.ShapeGeometry(d, 10);
  geoD.translate(0, 0.008, 0);
  const geoS = new THREE.ShapeGeometry(s, 10);
  geoS.translate(0, 0.006, 0);
  return { D: geoD, smile: geoS };
}

export class Cyril {
  constructor({ reducedMotion = false } = {}) {
    this.reduced = reducedMotion;
    this.group = new THREE.Group();
    this.group.name = 'Cyril';
    this.rig = new THREE.Group(); // squash/stretch/tilt pivot at the base
    this.group.add(this.rig);
    this._build();
    this.t = 0;
    this.lookTarget = null;
    this.pupil = new THREE.Vector2();
    this.pupilGoal = new THREE.Vector2();
    this.nextDrift = 0;
    this.nextBlink = 2 + Math.random() * 3;
    this.blinkT = -1;
    this.mouthOpen = 0;
    this.mouthPulseUntil = 0;
    this.talking = false;
    this.talkStart = 0;
    this.reaction = null;
    this.drumroll = false;
    this.mood = 'calm';
    this.tip = TIP.calm.clone();
    this.tallyCount = 0;
    this.flicker = 1;
  }

  _build() {
    const wax = new THREE.MeshStandardMaterial({ color: '#FFFFFF', map: waxTexture(), roughness: 0.5, emissive: new THREE.Color('#FFC890'), emissiveIntensity: 0.1 });
    // Fake subsurface: the wax glows more near the flame (emissive ramps with height).
    wax.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying float vWaxY;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWaxY = position.y;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vWaxY;')
        .replace('#include <emissivemap_fragment>', [
          '#include <emissivemap_fragment>',
          'totalEmissiveRadiance *= mix(0.45, 1.7, smoothstep(0.02, 0.245, vWaxY));',
          // wax translucency: light bleeds through the silhouette edges, warmest near the flame
          'float waxFres = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.2);',
          'totalEmissiveRadiance += vec3(1.0, 0.58, 0.26) * waxFres * mix(0.12, 0.55, smoothstep(0.05, 0.24, vWaxY));',
        ].join('\n'));
    };
    this.waxMat = wax;

    // Body lathe profile (radius, y)
    const prof = [
      [0.0, 0.0], [0.084, 0.0], [0.0855, 0.006], [0.085, 0.03], [0.0835, 0.09], [0.081, 0.16],
      [0.0785, 0.222], [0.0775, 0.231], [0.0745, 0.2375], [0.069, 0.2405], [0.06, 0.241], [0.05, 0.236], [0.0, 0.232],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const body = new THREE.LatheGeometry(prof, 64);
    {
      // hand-poured, not machined: gentle lumps, and the top slumps a touch toward the back
      const pos = body.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i); const y = pos.getY(i); const z = pos.getZ(i);
        const a = Math.atan2(x, z);
        const k = 1 + 0.01 * Math.sin(a * 3 + y * 18) + 0.006 * Math.sin(a * 7 + 1.3) * (y / 0.24);
        pos.setX(i, x * k); pos.setZ(i, z * k);
        if (y > 0.2) pos.setY(i, y - Math.max(0, -Math.cos(a)) * 0.006 * ((y - 0.2) / 0.04));
      }
    }
    const dish = new THREE.TorusGeometry(0.07, 0.011, 8, 48);
    dish.rotateX(-Math.PI / 2);
    dish.scale(1, 0.55, 1);
    dish.translate(0, 0.235, 0);
    const parts = [body, dish];
    // lumpy melted rim
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2 + Math.sin(i * 2.1) * 0.2;
      const r = 0.008 + 0.005 * Math.abs(Math.sin(i * 1.7));
      const b = new THREE.SphereGeometry(r, 10, 8);
      b.scale(1.6, 0.7, 1.1);
      b.rotateY(a);
      b.translate(Math.sin(a) * 0.073, 0.238 + Math.sin(i * 3.3) * 0.002, Math.cos(a) * 0.073);
      parts.push(b);
    }
    const drips = [[20, 0.009, 0.05], [95, 0.011, 0.07], [160, 0.008, 0.035], [230, 0.012, 0.06], [300, 0.01, 0.045]];
    for (const [deg, r, len] of drips) parts.push(this._dripGeo(deg, r, len));
    const merged = mergeGeometries(parts.map((g) => { const n = g.toNonIndexed(); n.deleteAttribute('uv'); return n; }), false);
    // cylindrical UVs so the drip streaks run down from the rim on every part
    {
      const pos = merged.attributes.position;
      const uv = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) {
        uv[i * 2] = Math.atan2(pos.getX(i), pos.getZ(i)) / (Math.PI * 2) + 0.5;
        uv[i * 2 + 1] = pos.getY(i) / 0.245;
      }
      merged.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    }
    merged.computeVertexNormals();
    this.body = new THREE.Mesh(merged, wax);
    this.rig.add(this.body);
    // molten pool in the dish: glossy, a little amber, lit from the wick
    const pool = new THREE.Mesh(new THREE.CircleGeometry(0.062, 40), new THREE.MeshStandardMaterial({
      color: '#F4D9A8', roughness: 0.12, emissive: new THREE.Color('#FFB866'), emissiveIntensity: 0.35, transparent: true, opacity: 0.92,
    }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.2345;
    this.rig.add(pool);
    this.poolMat = pool.material;

    // Tally drips (sad reaction): grow one per sad moment, persistent
    this.tally = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.009, 0.04, 4, 8), wax, 12);
    this.tally.count = 0;
    this.tally.frustumCulled = false;
    this.rig.add(this.tally);
    this._tallyGrow = [];

    // Wick
    const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.004, 0.025, 6), new THREE.MeshStandardMaterial({ color: '#2B1D18', roughness: 1 }));
    wick.position.set(0, 0.25, 0);
    wick.rotation.z = THREE.MathUtils.degToRad(8);
    this.rig.add(wick);

    // Flame
    this.flameUniforms = {
      uTime: { value: 0 }, uSway: { value: 1 }, uBright: { value: 1.25 },
      uBase: { value: C_BASE.clone() }, uMid: { value: C_MID.clone() }, uTip: { value: TIP.calm.clone() },
    };
    const flameMat = new THREE.ShaderMaterial({
      uniforms: this.flameUniforms, vertexShader: flameVert, fragmentShader: flameFrag,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.flamePivot = new THREE.Group();
    this.flamePivot.position.set(0.002, 0.262, 0);
    this.rig.add(this.flamePivot);
    this.flame = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), flameMat);
    this.flame.scale.set(0.75, 1.8, 0.75);
    this.flame.position.y = 0.046;
    this.flamePivot.add(this.flame);
    // inner core: blue at the root, white-hot, smaller
    this.coreUniforms = {
      uTime: this.flameUniforms.uTime, uSway: this.flameUniforms.uSway, uBright: { value: 1.2 },
      uBase: { value: new THREE.Color('#6F9BFF') }, uMid: { value: new THREE.Color('#FFF8E6') }, uTip: { value: new THREE.Color('#FFE2A0') },
    };
    this.core = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 10), new THREE.ShaderMaterial({
      uniforms: this.coreUniforms, vertexShader: flameVert, fragmentShader: flameFrag,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.core.scale.set(0.42, 1.05, 0.42);
    this.core.position.y = 0.03;
    this.flamePivot.add(this.core);
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: radialTexture({ size: 128, inner: 'rgba(255,200,120,0.9)', mid: 'rgba(255,160,80,0.22)', outer: 'rgba(255,140,60,0)' }),
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.16,
    }));
    this.glow.scale.setScalar(0.62);
    this.glow.position.y = 0.04;
    this.flamePivot.add(this.glow);
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: radialTexture({ size: 64, inner: 'rgba(255,214,140,1)', mid: 'rgba(255,184,102,0.35)', outer: 'rgba(255,170,90,0)' }),
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.35,
    }));
    this.halo.scale.setScalar(0.22);
    this.halo.position.y = 0.05;
    this.flamePivot.add(this.halo);

    this.light = new THREE.PointLight('#FFB866', 1.6, 2.2, 2);
    this.light.position.y = 0.05;
    this.flamePivot.add(this.light);

    // Face
    this.face = new THREE.Group();
    this.rig.add(this.face);
    const white = new THREE.MeshBasicMaterial({ color: '#FFFDF7' });
    const pupilMat = new THREE.MeshBasicMaterial({ color: '#2A1A17' });
    const eyeGeo = new THREE.SphereGeometry(0.0152, 20, 14);
    const pupilGeo = new THREE.SphereGeometry(0.0084, 16, 10);
    const glintGeo = new THREE.SphereGeometry(0.0024, 8, 6);
    this.eyes = [-1, 1].map((side) => {
      const g = new THREE.Group();
      g.position.set(0.026 * side, 0.17, 0.072);
      const w = new THREE.Mesh(eyeGeo, white);
      w.scale.set(1, 1.1, 0.6);
      const p = new THREE.Mesh(pupilGeo, pupilMat);
      p.position.z = 0.0098;
      p.scale.z = 0.5;
      const glint = new THREE.Mesh(glintGeo, white);
      glint.position.set(-0.0028, 0.003, 0.009);
      p.add(glint);
      g.add(w, p);
      this.face.add(g);
      return { g, pupil: p, side };
    });
    const browMat = new THREE.MeshStandardMaterial({ color: TOFFEE, roughness: 0.7 });
    const browGeo = new THREE.CapsuleGeometry(0.0036, 0.02, 4, 8);
    browGeo.rotateZ(Math.PI / 2);
    this.brows = [-1, 1].map((side) => {
      const m = new THREE.Mesh(browGeo, browMat);
      m.position.set(0.026 * side, 0.195, 0.0775);
      this.face.add(m);
      return { m, side };
    });
    // rosy cheeks, sitting on the curved wax
    const blushMat = new THREE.MeshBasicMaterial({ map: radialTexture({ size: 64, inner: 'rgba(226,85,59,0.55)', mid: 'rgba(226,85,59,0.22)', outer: 'rgba(226,85,59,0)' }), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    this.blush = [-1, 1].map((side) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.034, 0.022), blushMat);
      const x = 0.047 * side; const R = 0.0822;
      m.position.set(x, 0.142, Math.sqrt(R * R - x * x) + 0.0012);
      m.rotation.y = Math.asin(x / R);
      this.face.add(m);
      return m;
    });
    this.blushMat = blushMat;
    this.mouthGeo = mouthShapes();
    this.mouthMat = new THREE.MeshBasicMaterial({ color: CLARET, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
    this.mouth = new THREE.Mesh(this.mouthGeo.D, this.mouthMat);
    this.mouth.position.set(0, 0.125, 0.0832);
    this.mouth.rotation.x = -0.05;
    this.face.add(this.mouth);

    // Bow tie (merged)
    const bowMat = new THREE.MeshStandardMaterial({ color: CLARET, roughness: 0.4 });
    const l = new THREE.ConeGeometry(0.018, 0.03, 4); l.rotateZ(-Math.PI / 2); l.translate(-0.015, 0, 0);
    const r = new THREE.ConeGeometry(0.018, 0.03, 4); r.rotateZ(Math.PI / 2); r.translate(0.015, 0, 0);
    const k = new THREE.SphereGeometry(0.0075, 10, 8);
    const bow = new THREE.Mesh(mergeGeometries([l.toNonIndexed(), r.toNonIndexed(), k.toNonIndexed()]), bowMat);
    bow.geometry.computeVertexNormals();
    bow.position.set(0, 0.09, 0.087);
    bow.scale.z = 0.6;
    this.face.add(bow);
    this.bow = bow;

    // Brass holder (merged): dish, rim, finger ring
    const brass = new THREE.MeshStandardMaterial({ color: BRASS, metalness: 0.85, roughness: 0.3 });
    const dishG = new THREE.CylinderGeometry(0.11, 0.12, 0.02, 40); dishG.translate(0, -0.01, 0);
    const rim = new THREE.TorusGeometry(0.115, 0.006, 8, 48); rim.rotateX(Math.PI / 2); rim.translate(0, 0.0, 0);
    const ring = new THREE.TorusGeometry(0.03, 0.006, 8, 24); ring.translate(0.14, 0.012, 0);
    const cup = new THREE.CylinderGeometry(0.092, 0.095, 0.014, 40); cup.translate(0, 0.006, 0);
    const holder = new THREE.Mesh(mergeGeometries([dishG.toNonIndexed(), rim.toNonIndexed(), ring.toNonIndexed(), cup.toNonIndexed()]), brass);
    this.group.add(holder);
    this.holder = holder;
  }

  _dripGeo(deg, r, len) {
    const g = new THREE.CapsuleGeometry(r, len, 4, 8);
    const a = THREE.MathUtils.degToRad(deg);
    const R = 0.0775;
    g.scale(1, 1, 0.7);
    g.rotateY(a);
    g.translate(Math.sin(a) * R, 0.24 - len / 2 - r * 0.3, Math.cos(a) * R);
    return g;
  }

  // ---------- public API ----------

  /** Trigger a reaction: delight | shock | smug | sad | guffaw | drumroll (DESIGN 1.3). */
  react(name, { duration } = {}) {
    const dur = duration || { delight: 1000, shock: 900, smug: 1200, sad: 1000, guffaw: 800, drumroll: 1800 }[name] || 900;
    this.reaction = { name, t0: this.t, dur: dur / 1000 };
    if (name === 'sad') this._addTally();
    if (name === 'drumroll') this.drumroll = true;
    else this.drumroll = false;
  }

  /** Flame state light: calm | hurry | celebrate */
  setMood(mood) { this.mood = TIP[mood] ? mood : 'calm'; }

  /** One mouth-open pulse (called by the speech bubble per vowel). */
  pulse(ms = 90) { this.mouthPulseUntil = this.t + ms / 1000; }

  setTalking(on) {
    if (on && !this.talking) this.talkStart = this.t;
    this.talking = on;
  }

  /** World-space point to look at, or null to drift. */
  lookAt(v3) { this.lookTarget = v3 ? v3.clone() : null; }

  /** Look toward a normalised screen offset (-1..1, -1..1). */
  lookScreen(x, y) { this.lookTarget = null; this.pupilGoal.set(THREE.MathUtils.clamp(x, -1, 1), THREE.MathUtils.clamp(y, -1, 1)); this.nextDrift = this.t + 3; }

  headWorld(out = new THREE.Vector3()) { return this.group.localToWorld(out.set(0, 0.31, 0)); }

  _addTally() {
    if (this.tallyCount >= 12) return;
    const i = this.tallyCount++;
    const a = THREE.MathUtils.degToRad(40 + i * 53);
    this._tallyGrow.push({ i, a, t0: this.t });
    this.tally.count = this.tallyCount;
  }

  // ---------- per frame ----------

  update(dt) {
    this.t += dt;
    const t = this.t;
    const amp = this.reduced ? 0.5 : 1;

    // pose defaults (idle)
    const breathe = Math.sin(t * Math.PI * 2 * 0.25) * 0.012 * amp;
    let sy = 1 + breathe; let sx = 1 - breathe * 0.5;
    let y = 0; let tiltZ = 0; let tiltX = 0; let shakeX = 0;
    let flameScale = 1; let bright = 1; let flick = 0.12;
    let eyeSY = 1; let eyeY = 0; let browL = 0; let browR = 0; let browRotL = 0; let browRotR = 0;
    let mouthOpen = 0; let mouthShape = 'D'; let mouthX = 1; let tipName = this.mood;

    // talking
    if (this.talking) {
      flameScale *= 1.1;
      const since = t - this.talkStart;
      tiltX = Math.sin(clamp01(since / 0.4) * Math.PI) * THREE.MathUtils.degToRad(3);
    }
    if (t < this.mouthPulseUntil) mouthOpen = 1;

    // reactions
    const R = this.reaction;
    if (R) {
      const e = (t - R.t0) / R.dur;
      if (e >= 1 && R.name !== 'drumroll') this.reaction = null;
      else {
        const p = clamp01(e);
        const env = R.name === 'drumroll' ? 1 : Math.min(1, p / 0.1, (1 - p) / 0.25);
        switch (R.name) {
          case 'delight': {
            if (p < 0.15) { sy *= lerp(1, 0.9, p / 0.15); sx *= lerp(1, 1.06, p / 0.15); }
            else if (p < 0.7) { const q = (p - 0.15) / 0.55; y = Math.sin(q * Math.PI) * 0.03 * amp; sy *= lerp(1.08, 1.0, Math.abs(q - 0.5) * 2); }
            else if (p < 0.85) { sy *= lerp(0.92, 1, (p - 0.7) / 0.15); sx *= lerp(1.05, 1, (p - 0.7) / 0.15); }
            flameScale *= lerp(1, 1.6, env); bright *= lerp(1, 1.35, env);
            eyeSY = lerp(1, 0.35, env); eyeY = 0.004 * env; mouthShape = 'smile'; tipName = 'celebrate';
            browL = browR = 0.003 * env;
            break;
          }
          case 'shock': {
            const g = p < 0.28 ? 1 : 0;
            flameScale *= g ? 0.5 : lerp(0.5, 1, clamp01((p - 0.28) / 0.3));
            if (g) tipName = 'shock';
            browL = browR = 0.006 * env;
            mouthShape = 'O'; mouthOpen = 0.9 * env; mouthX = 0.6;
            const w = Math.exp(-p * 5) * Math.sin(p * 40);
            sy *= 1 + 0.06 * env * (p < 0.2 ? p / 0.2 : 1) * 0.6 + w * 0.03 * amp;
            eyeSY = 1.15;
            break;
          }
          case 'smug':
            browL = 0.005 * env; browRotL = -0.25 * env; eyeSY = lerp(1, 0.55, env);
            tiltZ = THREE.MathUtils.degToRad(8) * env * amp; mouthShape = 'smile';
            break;
          case 'sad':
            bright *= lerp(1, 0.7, env); browRotL = 0.35 * env; browRotR = -0.35 * env; browL = browR = -0.001 * env;
            eyeY = -0.002 * env; flameScale *= lerp(1, 0.85, env);
            break;
          case 'guffaw':
            if (p < 0.65) shakeX = Math.sin(t * Math.PI * 2 * 14) * THREE.MathUtils.degToRad(2) * amp;
            flick = 0.4; mouthOpen = Math.max(mouthOpen, 0.6 + 0.4 * Math.abs(Math.sin(t * 30))); eyeSY = 0.5; browL = browR = 0.003;
            break;
          case 'drumroll':
            eyeSY = 0.12; y = Math.sin(t * Math.PI * 2 * 20) * 0.002 * amp; flick = 0.3; flameScale *= 0.92 + 0.08 * Math.sin(t * 40);
            browRotL = 0.2; browRotR = -0.2;
            break;
          default:
        }
      }
    }

    // blink
    if (t > this.nextBlink && this.blinkT < 0) this.blinkT = t;
    if (this.blinkT >= 0) {
      const b = (t - this.blinkT) * 1000;
      const k = b < 60 ? lerp(1, 0.1, b / 60) : b < 150 ? lerp(0.1, 1, (b - 60) / 90) : 1;
      eyeSY *= k;
      if (b >= 150) { this.blinkT = -1; this.nextBlink = t + 2.5 + Math.random() * 3.5; }
    }

    // flicker (value noise ~7 Hz, 12% amplitude)
    const n = noise1(t * 7) * 0.65 + noise1(t * 17 + 3) * 0.35;
    this.flicker = 1 + (n - 0.5) * 2 * flick * amp;

    // apply body
    this.rig.position.y = y;
    this.rig.scale.set(sx, sy, sx);
    this.rig.rotation.z = tiltZ + shakeX;
    this.rig.rotation.x = -tiltX;

    // flame
    const fs = flameScale * (0.96 + (this.flicker - 1) * 0.6);
    this.flamePivot.scale.setScalar(THREE.MathUtils.lerp(this.flamePivot.scale.x, fs, 1 - Math.exp(-dt * 18)));
    this.flameUniforms.uTime.value = t;
    this.flameUniforms.uSway.value = amp * (1 + flick * 2);
    this.flameUniforms.uBright.value = 1.25 * bright * this.flicker;
    this.tip.lerp(TIP[tipName] || TIP.calm, 1 - Math.exp(-dt * (tipName === 'shock' ? 40 : 8)));
    this.flameUniforms.uTip.value.copy(this.tip);
    this.light.intensity = 1.6 * bright * this.flicker * this.flamePivot.scale.x;
    this.halo.material.opacity = 0.35 * bright * this.flicker;
    this.glow.material.opacity = 0.16 * bright * this.flicker;
    this.coreUniforms.uBright.value = 1.1 * bright * this.flicker;
    this.poolMat.emissiveIntensity = 0.3 + 0.15 * this.flicker * bright;
    this.blushMat.opacity = R && (R.name === 'delight' || R.name === 'smug') ? 1 : R && R.name === 'shock' ? 0.4 : 0.75;
    this.waxMat.emissiveIntensity = (0.16 + 0.1 * clamp01((this.flicker - 0.85) / 0.3)) * bright;

    // eyes + pupils
    if (this.lookTarget) {
      const local = this.group.worldToLocal(this.lookTarget.clone());
      this.pupilGoal.set(THREE.MathUtils.clamp(local.x * 6, -1, 1), THREE.MathUtils.clamp((local.y - 0.17) * 6, -1, 1));
    } else if (t > this.nextDrift) {
      this.pupilGoal.set(Math.random() * 1.4 - 0.7, Math.random() * 0.8 - 0.4);
      this.nextDrift = t + 3;
    }
    this.pupil.lerp(this.pupilGoal, 0.15);
    for (const e of this.eyes) {
      e.g.scale.y = THREE.MathUtils.lerp(e.g.scale.y, eyeSY, 1 - Math.exp(-dt * 30));
      e.g.position.y = 0.17 + eyeY;
      e.pupil.position.x = this.pupil.x * 0.005;
      e.pupil.position.y = this.pupil.y * 0.005;
    }
    this.brows[0].m.position.y = 0.195 + browL + eyeY; this.brows[0].m.rotation.z = browRotL;
    this.brows[1].m.position.y = 0.195 + browR + eyeY; this.brows[1].m.rotation.z = browRotR;
    if (this.talking && mouthOpen > 0.5) { this.brows[0].m.position.y += 0.001; this.brows[1].m.position.y += 0.001; }

    // mouth
    this.mouthOpen = THREE.MathUtils.lerp(this.mouthOpen, mouthOpen, 1 - Math.exp(-dt * 35));
    const geo = mouthShape === 'smile' && this.mouthOpen < 0.4 ? this.mouthGeo.smile : this.mouthGeo.D;
    if (this.mouth.geometry !== geo) this.mouth.geometry = geo;
    if (geo === this.mouthGeo.smile) this.mouth.scale.set(1, 1, 1);
    else this.mouth.scale.set(mouthX, lerp(0.08, mouthShape === 'O' ? 0.9 : 1, this.mouthOpen), 1);

    // tally drips grow out of the rim
    const m4 = new THREE.Matrix4();
    for (const d of this._tallyGrow) {
      const g = clamp01((t - d.t0) / 0.9);
      const len = 0.5 + easeOut(g) * 0.5;
      const R = 0.079;
      m4.compose(
        new THREE.Vector3(Math.sin(d.a) * R, 0.24 - 0.03 * len, Math.cos(d.a) * R),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), d.a),
        new THREE.Vector3(1, len, 0.7),
      );
      this.tally.setMatrixAt(d.i, m4);
    }
    if (this._tallyGrow.length) this.tally.instanceMatrix.needsUpdate = true;
  }
}
