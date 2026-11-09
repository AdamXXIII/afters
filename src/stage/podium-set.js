// Finale set-piece (podium + end): three layer cakes on a doily'd brass board, the top three
// avatars dropped onto them, a paper crown, sparklers, a spotlight and 3D napkin confetti.
// Owned by the finale team. Everything is a pure function of `t` (podium elapsed ms) so frozen
// screenshots, reduced motion and the synced show all land on the same frame.
import * as THREE from 'three';
import { TABLE_Y } from './props.js';
import { buildAvatar, animateAvatar } from './avatars.js';
import { radialTexture } from './textures.js';

const CONFETTI = 240;
const SPARKS = 70; // per sparkler
const PAPER = ['#E2553B', '#E0A526', '#FFC86B', '#FBF4EA', '#B0243A', '#F3E6CF', '#E2553B', '#FFE6A8'];
const FOIL = '#FFD46B'; // every 4th piece is gold foil and glints

const hash = (i, k = 0) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const easeOutCubic = (x) => 1 - (1 - x) ** 3;
const easeInOutQuint = (x) => (x < 0.5 ? 16 * x ** 5 : 1 - (-2 * x + 2) ** 5 / 2);
const easeOutBack = (x, s = 1.7) => 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2;
function bounce(x) { // 0..1 drop with two bounces, returns height fraction (1 = top, 0 = landed)
  if (x <= 0) return 1;
  if (x >= 1) return 0;
  if (x < 0.55) { const k = x / 0.55; return 1 - k * k; }
  if (x < 0.82) { const k = (x - 0.685) / 0.135; return 0.16 * (1 - k * k); }
  const k = (x - 0.91) / 0.09; return 0.04 * (1 - k * k);
}

function canvas(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }

/** Naked layer-cake side: sponge, cream and jam stripes with a crumb speckle. */
function spongeTexture(layers = 3) {
  const c = canvas(128, 256);
  const g = c.getContext('2d');
  const H = 256;
  const bands = [];
  for (let i = 0; i < layers; i++) bands.push(['sponge', 1], i < layers - 1 ? ['cream', 0.28] : null, i < layers - 1 ? ['jam', 0.14] : null);
  const list = bands.filter(Boolean);
  const total = list.reduce((s, b) => s + b[1], 0);
  let y = 0;
  for (const [kind, w] of list) {
    const hh = (w / total) * H;
    if (kind === 'sponge') {
      const grd = g.createLinearGradient(0, y, 0, y + hh);
      grd.addColorStop(0, '#E9BE78'); grd.addColorStop(0.5, '#F1CC8A'); grd.addColorStop(1, '#DDAE66');
      g.fillStyle = grd;
    } else g.fillStyle = kind === 'cream' ? '#FFF6E6' : '#B3263A';
    g.fillRect(0, y, 128, hh + 1);
    y += hh;
  }
  for (let i = 0; i < 900; i++) { // crumb texture
    g.fillStyle = `rgba(${hash(i, 1) < 0.5 ? '150,95,40' : '255,236,200'},${0.12 + hash(i, 2) * 0.18})`;
    g.fillRect(hash(i, 3) * 128, hash(i, 4) * 256, 1 + hash(i, 5) * 2, 1 + hash(i, 6) * 2);
  }
  return tex(c);
}

/** Paper doily: scalloped lace circle with pierced rings. */
function doilyTexture() {
  const S = 512; const c = canvas(S); const g = c.getContext('2d'); const R = S / 2;
  g.translate(R, R);
  g.fillStyle = '#FFFDF7';
  g.beginPath();
  const n = 48;
  for (let i = 0; i <= n * 8; i++) {
    const a = (i / (n * 8)) * Math.PI * 2;
    const r = R * (0.93 + 0.06 * Math.abs(Math.sin(a * n / 2)));
    if (i === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r); else g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.fill();
  g.globalCompositeOperation = 'destination-out';
  for (const [rr, count, size] of [[0.88, 48, 0.022], [0.79, 40, 0.03], [0.7, 32, 0.018], [0.62, 28, 0.014]]) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rr;
      g.beginPath();
      g.ellipse(Math.cos(a) * R * rr, Math.sin(a) * R * rr, R * size * 1.6, R * size, a, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.globalCompositeOperation = 'source-over';
  g.strokeStyle = 'rgba(200,155,60,0.35)'; g.lineWidth = 2;
  for (const rr of [0.66, 0.74, 0.84]) { g.beginPath(); g.arc(0, 0, R * rr, 0, Math.PI * 2); g.stroke(); }
  const t = tex(c);
  return t;
}

/** Prize rosette: pleated brass disc, claret tails, a big numeral. */
function rosetteTexture(n) {
  const W = 256; const H = 320; const c = canvas(W, H); const g = c.getContext('2d');
  const cx = W / 2; const cy = 120;
  const tails = n === 1 ? '#7A1E2C' : n === 2 ? '#2F5D7C' : '#7F9A74';
  g.fillStyle = tails;
  for (const s of [-1, 1]) {
    g.save(); g.translate(cx + s * 22, cy + 40); g.rotate(s * 0.22);
    g.beginPath(); g.moveTo(-26, 0); g.lineTo(26, 0); g.lineTo(26, 150); g.lineTo(0, 124); g.lineTo(-26, 150); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(-26, 0, 8, 140); g.fillStyle = tails;
    g.restore();
  }
  // pleats
  g.beginPath();
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2; const r = i % 2 ? 108 : 118;
    if (!i) g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); else g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  g.fillStyle = tails; g.fill();
  const gold = g.createRadialGradient(cx - 24, cy - 30, 10, cx, cy, 92);
  gold.addColorStop(0, '#FFE6A8'); gold.addColorStop(0.55, '#E0B354'); gold.addColorStop(1, '#A87A26');
  g.beginPath(); g.arc(cx, cy, 86, 0, Math.PI * 2); g.fillStyle = gold; g.fill();
  g.lineWidth = 5; g.strokeStyle = '#8A6118'; g.stroke();
  g.beginPath(); g.arc(cx, cy, 72, 0, Math.PI * 2); g.lineWidth = 2; g.strokeStyle = 'rgba(122,74,42,0.6)'; g.setLineDash([4, 6]); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#3B1F18';
  g.font = '900 112px "Fraunces Variable", "Fraunces", Georgia, serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(n), cx, cy + 8);
  return tex(c);
}

/** Polished brass matcap: warm body, hot candle highlight, dark mahogany reflections at the rim. */
let _brassMatcap = null;
function brassMatcap() {
  if (_brassMatcap) return _brassMatcap;
  const S = 256; const c = canvas(S); const g = c.getContext('2d');
  const base = g.createRadialGradient(S * 0.5, S * 0.5, 0, S * 0.5, S * 0.5, S * 0.5);
  base.addColorStop(0, '#E9C379'); base.addColorStop(0.55, '#C99A44'); base.addColorStop(0.82, '#7A5222'); base.addColorStop(0.95, '#3B1F18'); base.addColorStop(1, '#5A3424');
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  const band = g.createLinearGradient(0, S * 0.62, 0, S * 0.9); // reflected tablecloth
  band.addColorStop(0, 'rgba(255,236,200,0)'); band.addColorStop(0.5, 'rgba(255,230,180,0.35)'); band.addColorStop(1, 'rgba(255,236,200,0)');
  g.fillStyle = band; g.fillRect(0, 0, S, S);
  const hot = g.createRadialGradient(S * 0.36, S * 0.3, 0, S * 0.36, S * 0.3, S * 0.2); // the candle
  hot.addColorStop(0, 'rgba(255,252,240,1)'); hot.addColorStop(0.35, 'rgba(255,230,170,0.75)'); hot.addColorStop(1, 'rgba(255,210,140,0)');
  g.fillStyle = hot; g.fillRect(0, 0, S, S);
  const rim = g.createRadialGradient(S * 0.72, S * 0.4, 0, S * 0.72, S * 0.4, S * 0.08); // window
  rim.addColorStop(0, 'rgba(210,225,255,0.6)'); rim.addColorStop(1, 'rgba(210,225,255,0)');
  g.fillStyle = rim; g.fillRect(0, 0, S, S);
  _brassMatcap = tex(c);
  return _brassMatcap;
}
const brassMat = (o = {}) => new THREE.MeshMatcapMaterial({ matcap: brassMatcap(), ...o });

/** Additive light cone with a soft fresnel edge (fake volumetric spotlight). */
function coneMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color('#FFC86B') }, uAlpha: { value: 0 } },
    vertexShader: `varying float vY; varying vec3 vN; varying vec3 vV;
      void main(){ vY = uv.y; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uAlpha; varying float vY; varying vec3 vN; varying vec3 vV;
      void main(){ float f = pow(abs(dot(normalize(vN), normalize(vV))), 2.0); float a = uAlpha * f * smoothstep(0.0, 0.55, vY) * (0.35 + 0.65 * (1.0 - vY));
        gl_FragColor = vec4(uColor * a, a); }`,
  });
}

function buildCake({ tiers, top }) {
  const g = new THREE.Group();
  const icing = new THREE.MeshStandardMaterial({ color: '#FFF9EE', roughness: 0.32, emissive: '#FFE7C2', emissiveIntensity: 0.08 });
  const ribbon = new THREE.MeshStandardMaterial({ color: '#7A1E2C', roughness: 0.45 });
  const brass = new THREE.MeshStandardMaterial({ color: '#C89B3C', roughness: 0.28, metalness: 0.85 });
  let y = 0;
  const tierInfo = [];
  tiers.forEach(([r, h], ti) => {
    const side = new THREE.MeshStandardMaterial({ map: spongeTexture(2 + (ti % 2)), roughness: 0.8 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 64, 1, true), side);
    body.position.y = y + h / 2;
    g.add(body);
    // icing cap + drips
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.0025, r + 0.0025, 0.008, 64), icing);
    cap.position.y = y + h - 0.002;
    g.add(cap);
    const dh = h * 0.55;
    const drip = new THREE.CylinderGeometry(r + 0.0022, r + 0.0022, dh, 96, 1, true);
    const pos = drip.attributes.position;
    const ph = ti * 1.7;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) > 0) continue;
      const a = Math.atan2(pos.getZ(i), pos.getX(i));
      const d = 0.22 + 0.78 * Math.max(0, Math.sin(a * 9 + ph)) ** 2.4 * (0.55 + 0.45 * hash(Math.round((a + 4) * 3), ti));
      pos.setY(i, dh / 2 - dh * d);
    }
    drip.computeVertexNormals();
    const dm = new THREE.Mesh(drip, icing);
    dm.position.y = y + h - dh / 2;
    g.add(dm);
    // ribbon band at the foot of each tier, brass piping on top of it
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.003, r + 0.003, 0.014, 64, 1, true), ribbon);
    band.position.y = y + 0.008;
    g.add(band);
    const pipe = new THREE.Mesh(new THREE.TorusGeometry(r + 0.003, 0.0024, 6, 64).rotateX(Math.PI / 2), brass);
    pipe.position.y = y + 0.016;
    g.add(pipe);
    tierInfo.push({ y, h, r });
    y += h;
  });
  // decorations on the top: strawberries for the winner, cream kisses otherwise
  const tr = tiers[tiers.length - 1][0];
  const n = top === 'berries' ? 9 : 8;
  const berry = new THREE.MeshStandardMaterial({ color: '#C8283A', roughness: 0.35, emissive: '#5A0A12', emissiveIntensity: 0.2 });
  const cream = icing;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.2;
    const m = top === 'berries'
      ? new THREE.Mesh(new THREE.SphereGeometry(0.0085, 10, 8), berry)
      : new THREE.Mesh(new THREE.ConeGeometry(0.0075, 0.014, 8), cream);
    if (top === 'berries') m.scale.set(1, 1.25, 1);
    m.position.set(Math.cos(a) * (tr - 0.009), y + 0.009, Math.sin(a) * (tr - 0.009));
    g.add(m);
  }
  g.userData.height = y;
  g.userData.tiers = tierInfo;
  return g;
}

function buildCrown() {
  const geo = new THREE.CylinderGeometry(0.034, 0.03, 0.036, 60, 1, true);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) < 0) continue;
    const a = Math.atan2(pos.getZ(i), pos.getX(i));
    const k = Math.abs(((a / (Math.PI * 2)) * 6 + 10) % 1 - 0.5) * 2; // 6 points
    pos.setY(i, -0.018 + 0.016 + 0.022 * (1 - k));
  }
  geo.computeVertexNormals();
  const gold = brassMat({ side: THREE.DoubleSide });
  const crown = new THREE.Group();
  crown.add(new THREE.Mesh(geo, gold));
  const jewel = new THREE.MeshStandardMaterial({ color: '#B0243A', roughness: 0.15, metalness: 0.2, emissive: '#5A0A12', emissiveIntensity: 0.4 });
  for (let i = 0; i < 6; i++) {
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.0042, 8, 6), gold);
    // align with the zig-zag peaks
    const pa = ((i + 0.5) / 6) * Math.PI * 2;
    const a = (i / 6) * Math.PI * 2;
    tip.position.set(Math.cos(pa) * 0.034, 0.02, Math.sin(pa) * 0.034);
    crown.add(tip);
    const j = new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 6), jewel);
    j.position.set(Math.cos(a) * 0.033, -0.006, Math.sin(a) * 0.033);
    j.scale.z = 0.6;
    crown.add(j);
  }
  return crown;
}

export class PodiumSet {
  constructor(stage) {
    this.stage = stage;
    this.root = new THREE.Group();
    this.root.name = 'finale';
    this.root.visible = false;
    this.root.position.set(0, TABLE_Y, 0.04);
    this.root.scale.setScalar(1.2);
    stage.scene.add(this.root);
    this.t = 0;
    this.T = { t3: 1200, t2: 2800, cake1: 4300, win: 6000, bill: 8200 };
    this.mode = 'podium';
    this.reduced = false;

    // board + doily
    const board = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.34, 0.014, 72), brassMat());
    board.position.y = 0.007;
    const doily = new THREE.Mesh(new THREE.CircleGeometry(0.32, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: doilyTexture(), transparent: true, alphaTest: 0.4, roughness: 0.9 }));
    doily.position.y = 0.0145;
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: radialTexture({ size: 64, inner: 'rgba(30,14,10,0.55)', outer: 'rgba(30,14,10,0)' }), transparent: true, depthWrite: false }));
    shadow.position.y = 0.0012;
    this.board = new THREE.Group();
    this.board.add(shadow, board, doily);
    this.root.add(this.board);

    // three cakes: 1st centre-back (3 tiers), 2nd front-left (2), 3rd front-right (1)
    const base = 0.0145;
    this.slots = [
      { cake: buildCake({ tiers: [[0.078, 0.062], [0.066, 0.058], [0.054, 0.054]], top: 'berries' }), pos: new THREE.Vector3(0, base, 0.05), scale: 1.12 },
      { cake: buildCake({ tiers: [[0.07, 0.06], [0.059, 0.054]], top: 'kisses' }), pos: new THREE.Vector3(-0.142, base, -0.06), scale: 1.0 },
      { cake: buildCake({ tiers: [[0.068, 0.062]], top: 'kisses' }), pos: new THREE.Vector3(0.142, base, -0.05), scale: 1.0 },
    ];
    this.slots.forEach((s, i) => {
      s.holder = new THREE.Group();
      s.holder.position.copy(s.pos);
      s.lift = new THREE.Group(); // rises from under the cloth
      s.lift.add(s.cake);
      s.holder.add(s.lift);
      const rosette = new THREE.Mesh(new THREE.PlaneGeometry(0.046, 0.0575), new THREE.MeshBasicMaterial({ map: rosetteTexture(i + 1), transparent: true, alphaTest: 0.05, fog: false }));
      const r0 = s.cake.userData.tiers[0];
      rosette.position.set(0, r0.y + r0.h * 0.42, r0.r + 0.006);
      rosette.renderOrder = 2;
      s.cake.add(rosette);
      s.rosette = rosette;
      s.avatarSlot = new THREE.Group();
      s.avatarSlot.position.y = s.cake.userData.height;
      s.cake.add(s.avatarSlot);
      this.root.add(s.holder);
    });
    this.crown = buildCrown();
    this.crownScale = 1.45;
    this.crown.visible = false;
    this.slots[0].avatarSlot.add(this.crown);

    // a brass cloche hides the winner's spot until the reveal, then lifts away
    // smooth bell profile (superellipse), bottom to top
    const prof = [];
    const CR = 0.104; const CH = 0.3;
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI / 2;
      prof.push(new THREE.Vector2(CR * Math.cos(a) ** 0.62, 0.008 + CH * Math.sin(a) ** 1.25));
    }
    const brass = brassMat();
    const cloche = new THREE.Mesh(new THREE.LatheGeometry(prof, 72), brass);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(CR + 0.002, 0.0055, 12, 72).rotateX(Math.PI / 2), brass);
    lip.position.y = 0.008;
    const knobProf = [[0, 0], [0.012, 0], [0.006, 0.01], [0.005, 0.018], [0.014, 0.026], [0.016, 0.032], [0.01, 0.04], [0, 0.042]];
    const knob = new THREE.Mesh(new THREE.LatheGeometry(knobProf.map(([x, y]) => new THREE.Vector2(x, y)), 32), brass);
    knob.position.y = CH + 0.004;
    const bead = new THREE.Mesh(new THREE.TorusGeometry(CR * 0.55, 0.0028, 8, 64).rotateX(Math.PI / 2), brass);
    bead.position.y = 0.008 + CH * Math.sin(Math.acos((0.55) ** (1 / 0.62))) ** 1.25;
    this.cloche = new THREE.Group();
    this.cloche.add(cloche, lip, knob, bead);
    const glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTexture({ size: 64, inner: 'rgba(255,245,220,1)', mid: 'rgba(255,220,160,0.35)', outer: 'rgba(255,200,120,0)' }), blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    glint.scale.set(0.09, 0.09, 1);
    glint.position.set(-0.04, 0.25, 0.075);
    this.cloche.add(glint);
    this.clocheGlint = glint;
    this.cloche.position.set(0, 0.0145, 0.05);
    this.root.add(this.cloche);

    // Cyril presides from a brass candlestick so the cakes never hide him
    const stickProf = [[0, 0], [0.07, 0], [0.072, 0.008], [0.05, 0.016], [0.026, 0.03], [0.02, 0.05], [0.028, 0.06], [0.018, 0.075], [0.016, 0.11], [0.03, 0.122], [0.05, 0.13], [0.052, 0.136], [0, 0.136]];
    this.stick = new THREE.Mesh(new THREE.LatheGeometry(stickProf.map(([x, y]) => new THREE.Vector2(x, y)), 48),
      brassMat());
    this.stickH = 0.136;
    this.stick.visible = false;
    stage.scene.add(this.stick);

    // spotlight cone + halo over the winner
    this.cone = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.2, 1.1, 40, 1, true), coneMaterial());
    this.cone.position.set(0, 0.66, 0.04);
    this.cone.renderOrder = 3;
    this.root.add(this.cone);
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTexture({ size: 128, inner: 'rgba(255,214,140,0.85)', mid: 'rgba(255,170,80,0.28)', outer: 'rgba(255,150,60,0)' }), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    this.halo.scale.set(0.55, 0.55, 1);
    this.halo.position.set(0, 0.3, -0.12);
    this.root.add(this.halo);
    this.pool = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: radialTexture({ size: 128, inner: 'rgba(255,200,120,0.5)', mid: 'rgba(255,170,90,0.16)', outer: 'rgba(255,170,90,0)' }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.pool.position.y = 0.016;
    this.root.add(this.pool);

    // sparklers stuck in the winner's top tier
    this.sparklers = [];
    const stickMat = new THREE.MeshStandardMaterial({ color: '#6B6B6B', roughness: 0.4, metalness: 0.7 });
    const sparkTex = radialTexture({ size: 32, inner: 'rgba(255,255,255,1)', mid: 'rgba(255,220,150,0.6)', outer: 'rgba(255,200,120,0)' });
    for (const s of [-1, 1]) {
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.09, 5), stickMat);
      const tip = new THREE.Vector3(s * 0.038, 0.085, -0.02);
      stick.position.set(s * 0.034, 0.04, -0.02);
      stick.rotation.z = -s * 0.12;
      this.slots[0].avatarSlot.add(stick);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPARKS * 3), 3));
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(SPARKS * 3), 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.012, map: sparkTex, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
      pts.frustumCulled = false;
      this.slots[0].avatarSlot.add(pts);
      const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, blending: THREE.AdditiveBlending, depthWrite: false, color: '#FFE3A8', fog: false }));
      core.scale.set(0.03, 0.03, 1);
      core.position.copy(tip);
      this.slots[0].avatarSlot.add(core);
      this.sparklers.push({ stick, pts, tip, core, side: s });
    }

    // napkin confetti (one InstancedMesh)
    const cgeo = new THREE.PlaneGeometry(0.02, 0.013);
    const cmat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false });
    this.confetti = new THREE.InstancedMesh(cgeo, cmat, CONFETTI);
    this.confetti.frustumCulled = false;
    const col = new THREE.Color();
    this.pieces = [];
    for (let i = 0; i < CONFETTI; i++) {
      col.set(i % 4 === 0 ? FOIL : PAPER[Math.floor(hash(i, 9) * PAPER.length)]);
      this.confetti.setColorAt(i, col);
      this.baseCols = this.baseCols || [];
      this.baseCols.push(col.clone());
      const rain = i >= CONFETTI * 0.62;
      const side = i % 2 ? 1 : -1;
      const p = rain
        ? { p0: new THREE.Vector3((hash(i, 1) - 0.5) * 0.8, 0.62 + hash(i, 2) * 0.22, (hash(i, 3) - 0.3) * 0.5), v0: new THREE.Vector3((hash(i, 4) - 0.5) * 0.1, 0, 0), delay: 150 + hash(i, 5) * 2600 }
        : { p0: new THREE.Vector3(side * 0.42, 0.04, 0.44), v0: new THREE.Vector3(-side * (0.3 + hash(i, 1) * 0.55), 0.95 + hash(i, 2) * 0.6, -0.35 - hash(i, 3) * 0.45), delay: hash(i, 5) * 120 };
      p.ph = hash(i, 6) * Math.PI * 2;
      p.spin = new THREE.Vector3(4 + hash(i, 7) * 9, 3 + hash(i, 8) * 7, 2 + hash(i, 10) * 5);
      p.k = 2.4 + hash(i, 11) * 1.4;
      p.vt = 0.16 + hash(i, 12) * 0.1;
      p.ground = 0.0015 + hash(i, 13) * 0.0015;
      p.tLand = this._landTime(p);
      this.pieces.push(p);
    }
    this.confetti.instanceColor.needsUpdate = true;
    this.root.add(this.confetti);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._v = new THREE.Vector3(); this._s = new THREE.Vector3(1, 1, 1); this._n = new THREE.Vector3(); this._c = new THREE.Color();

    this.avatars = [null, null, null];
    this.unhook = null;
  }

  // closed-form drag + terminal-velocity flight (seconds)
  _flight(p, s, out) {
    const e = (1 - Math.exp(-p.k * s)) / p.k;
    out.set(p.p0.x + p.v0.x * e, p.p0.y + (p.v0.y + p.vt) * e - p.vt * s, p.p0.z + p.v0.z * e);
    out.x += Math.sin(s * 3.1 + p.ph) * 0.03 * Math.min(1, s);
    out.z += Math.cos(s * 2.3 + p.ph) * 0.02 * Math.min(1, s);
    return out;
  }

  _landTime(p) {
    const v = new THREE.Vector3();
    let lo = 0.05; let hi = 30;
    // find apex-ish start: walk forward until falling below ground
    for (let s = 0.05; s < 30; s += 0.05) { if (this._flight(p, s, v).y < p.ground) { hi = s; lo = s - 0.05; break; } }
    for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (this._flight(p, m, v).y < p.ground) hi = m; else lo = m; }
    return hi;
  }

  /** Show for `rows` (ranked). mode: 'podium' (timeline from t=0) | 'end' (settled). */
  show({ rows, players, mode = 'podium', duration = 14000, reduced = false }) {
    const scale = Math.max(0.05, duration / 14000);
    this.T = { t3: 1200 * scale, t2: 2800 * scale, cake1: 4300 * scale, win: 6000 * scale, bill: 8200 * scale, scale };
    this.mode = mode;
    this.reduced = reduced;
    const ids = rows.slice(0, 3).map((r) => r.id);
    const key = ids.map((id) => `${id}:${players.find((p) => p.id === id)?.avatar}`).join('|');
    if (key !== this.key) {
      this.key = key;
      this.slots.forEach((s, i) => {
        if (this.avatars[i]) s.avatarSlot.remove(this.avatars[i]);
        this.avatars[i] = null;
        const p = players.find((pl) => pl.id === ids[i]);
        if (!p) return;
        const a = buildAvatar(p.avatar ?? i);
        a.scale.setScalar(i === 0 ? 1.34 : 1);
        if (i === 0) {
          const box = new THREE.Box3().setFromObject(a);
          this.crownY = box.max.y - 0.006;
          this.crownScale = Math.max(0.85, Math.min(1.35, (box.max.x - box.min.x) / 0.085 * 0.95));
        }
        s.avatarSlot.add(a);
        this.avatars[i] = a;
      });
    }
    this.slots.forEach((s, i) => { s.holder.visible = i < rows.length; });
    this.root.visible = true;
    const st = this.stage;
    if (!this.saved) this.saved = { warmPos: st.warm.position.clone(), warmI: st.warm.intensity, warmD: st.warm.distance, hemiI: st.hemi.intensity };
    if (!this.unhook) this.unhook = st.onFrame((dt, time) => this._frame(dt, time));
  }

  hide() {
    this.root.visible = false;
    this.stick.visible = false;
    if (this.unhook) { this.unhook(); this.unhook = null; }
    const st = this.stage;
    if (this.saved) { st.warm.position.copy(this.saved.warmPos); st.warm.intensity = this.saved.warmI; st.warm.distance = this.saved.warmD; st.hemi.intensity = this.saved.hemiI; this.saved = null; }
    st.cyrilGoal.copy(st.cyrilHome);
    st.cyril.group.scale.setScalar(1);
    st.props.visible = true;
    st.cyril.lookAt(null);
    for (const s of st.seats.values()) s.group.visible = true;
  }

  setTime(ms) { this.t = ms; }

  /** Screen-space anchors (CSS px) for HTML labels: foot of each cake front, top of each avatar. */
  anchors() {
    const out = [];
    this.slots.forEach((s, i) => {
      const r0 = s.cake.userData.tiers[0];
      const foot = s.cake.localToWorld(new THREE.Vector3(0, 0, r0.r));
      const head = s.avatarSlot.localToWorld(new THREE.Vector3(0, i === 0 ? 0.16 : 0.12, 0));
      out.push({ foot: this.stage.project(foot), head: this.stage.project(head) });
    });
    return out;
  }

  _camera(t, time) {
    const st = this.stage;
    const T = this.T;
    let pos; let target;
    if (this.mode === 'end') {
      pos = new THREE.Vector3(0.06, TABLE_Y + 0.33, 1.1);
      target = new THREE.Vector3(0.06, TABLE_Y + 0.25, 0);
    } else {
      const hero = { pos: new THREE.Vector3(0, TABLE_Y + 0.36, 1.78), target: new THREE.Vector3(0, TABLE_Y + 0.15, 0.02) };
      const start = { pos: new THREE.Vector3(0, TABLE_Y + 0.95, 2.3), target: new THREE.Vector3(0, TABLE_Y + 0.05, 0) };
      const k = this.reduced ? 1 : easeInOutQuint(clamp01(t / (3000 * T.scale)));
      // before the bill arrives the podium sits lower (fills the frame); then it cranes up for the bill
      const crane = this.reduced ? (t >= T.bill ? 1 : 0) : easeInOutQuint(clamp01((t - T.bill) / (900 * T.scale)));
      hero.pos.y += 0.13 - 0.22 * crane;
      hero.target.y += 0.13 - 0.22 * crane;
      pos = start.pos.clone().lerp(hero.pos, k);
      target = start.target.clone().lerp(hero.target, k);
      // drumroll push-in, then a kick back on the reveal
      const push = this.reduced ? 0 : clamp01((t - T.cake1) / (T.win - T.cake1));
      const kick = this.reduced ? 0 : Math.max(0, 1 - Math.abs((t - T.win) / (500 * T.scale))) * (t > T.win ? 1 : 0);
      pos.lerp(target, 0.07 * easeOutCubic(push) * (t < T.win ? 1 : Math.max(0, 1 - (t - T.win) / (900 * T.scale))) - 0.03 * kick);
    }
    if (!this.reduced) pos.x += Math.sin(time * 0.35) * 0.025;
    st.tween = null;
    st.orbit = 0;
    st.camPos.copy(pos);
    st.camTarget.copy(target);
    st.camera.position.copy(pos);
    st.camera.lookAt(target);
  }

  _frame(dt, time) {
    const st = this.stage;
    const T = this.T;
    const t = this.mode === 'end' ? 1e7 : this.t;
    this._camera(t, time);
    // hide the table-side avatars and the stage's own cake; this set owns the finale
    for (const s of st.seats.values()) s.group.visible = false;
    st.cake.visible = false;
    // Cyril compères from stage right, a touch smaller so the cakes are the stars
    if (this.mode === 'end') st.cyrilGoal.set(0.3, TABLE_Y + 0.01 + this.stickH, -0.2);
    else st.cyrilGoal.set(0.3, TABLE_Y + 0.01 + this.stickH, -0.36);
    this.stick.visible = true;
    this.stick.position.set(st.cyril.group.position.x, TABLE_Y, st.cyril.group.position.z);
    this.stick.scale.set(1, Math.max(0.01, st.cyril.group.position.y - TABLE_Y - 0.01) / this.stickH, 1);
    st.cyril.group.scale.setScalar(this.mode === 'end' ? 0.85 : 0.95);
    st.props.visible = false; // clear the table: the cakes are the only dinner now
    // light: lift the warm fill onto the cakes
    st.warm.position.set(0.05, 0.75, 0.95);
    const dim = this.mode === 'end' || this.reduced ? 0 : clamp01((t - T.cake1) / (500 * T.scale)) * (1 - clamp01((t - T.win) / (400 * T.scale)));
    st.warm.intensity = 3.2 * (1 - 0.7 * dim);
    st.hemi.intensity = (this.saved?.hemiI ?? 0.35) * (1 - 0.5 * dim);
    st.warm.distance = 4;

    const reveal = [T.win, T.t2, T.t3];
    const cakeAt = [T.cake1, T.t2, T.t3];
    this.slots.forEach((s, i) => {
      const H = s.cake.userData.height;
      const k = this.reduced ? (t >= cakeAt[i] ? 1 : 0) : clamp01((t - cakeAt[i]) / (750 * T.scale));
      s.holder.scale.setScalar(s.scale);
      s.lift.position.y = -(H + 0.03) * (1 - easeOutBack(k, 1.3));
      s.lift.visible = k > 0;
      s.rosette.visible = this.mode === 'end' || t < T.bill + 200 * T.scale;
      const a = this.avatars[i];
      if (!a) return;
      // the winner is placed under the cloche during the drumroll; 2nd/3rd drop on after their cake
      const dropT = i === 0 ? T.win - 200 * T.scale : reveal[i] + 350 * T.scale;
      const dk = this.reduced ? (t >= dropT ? 1 : 0) : clamp01((t - dropT) / (650 * T.scale));
      a.visible = t >= dropT;
      const hgt = bounce(dk);
      const hk = i === 0 && !this.reduced ? clamp01((t - T.win - 100 * T.scale) / (520 * T.scale)) : 0;
      a.position.y = i === 0 ? Math.sin(hk * Math.PI) * 0.07 : hgt * 0.3;
      // squash on each landing
      const land = dk > 0.5 && dk < 0.62 ? Math.sin(((dk - 0.5) / 0.12) * Math.PI) : 0;
      const sq = 1 - land * 0.18;
      const base = i === 0 ? 1.34 : 1;
      a.scale.set(base * (2 - sq), base * sq, base * (2 - sq));
      animateAvatar(a, time, this.reduced ? 0.5 : 1);
      if (a.userData.lift !== undefined) a.userData.lift = 0;
      // gentle sway toward the camera for the winner's victory bob
      a.rotation.y = i === 0 && dk >= 1 && !this.reduced ? Math.sin(time * 1.6) * 0.25 : 0;
    });

    // cloche: sits from the start, gleams under the drumroll spotlight, then flies up on the reveal
    const lk = this.reduced ? (t >= T.win ? 1 : 0) : clamp01((t - T.win + 120 * T.scale) / (650 * T.scale));
    this.cloche.visible = lk < 1;
    this.cloche.position.y = 0.0145 + easeOutCubic(lk) * 0.9 * (this.reduced ? 0 : 1);
    this.cloche.rotation.z = -lk * 0.5;
    this.cloche.position.x = lk * 0.12;
    const rattle = !this.reduced && t > T.cake1 && t < T.win ? Math.sin(time * 38) * 0.02 * clamp01((t - T.cake1) / (T.win - T.cake1)) : 0;
    this.cloche.rotation.x = rattle;
    this.clocheGlint.material.opacity = 0.5 + 0.5 * Math.abs(Math.sin(time * 1.3));

    // crown drops in after the winner lands
    const ck = this.reduced ? (t >= T.win ? 1 : 0) : clamp01((t - T.win - 700 * T.scale) / (550 * T.scale));
    this.crown.visible = ck > 0 && !!this.avatars[0];
    this.crown.scale.setScalar(this.crownScale || 1.3);
    this.crown.position.y = (this.crownY || 0.1) + 0.017 * (this.crownScale || 1.3) + (1 - easeOutCubic(ck)) * 0.22;
    this.crown.rotation.set(0.12 * (1 - ck), time * 0.6 * (this.reduced ? 0 : 1), -0.16);

    // spotlight + halo: dim sweep during the drumroll, full on the winner
    const pre = clamp01((t - T.cake1) / (900 * T.scale));
    const on = clamp01((t - T.win) / (300 * T.scale));
    const flick = this.reduced ? 1 : 0.92 + 0.08 * Math.sin(time * 13) * Math.sin(time * 7.3);
    this.cone.material.uniforms.uAlpha.value = (0.5 * pre * (1 - on) + 0.42 * on) * flick;
    this.cone.rotation.z = (1 - pre) * Math.sin(time * 2.2) * 0.25 * (this.reduced ? 0 : 1);
    this.halo.material.opacity = (0.22 * pre + 0.6 * on) * (this.mode === 'end' ? 0.5 : 1);
    this.halo.scale.setScalar(0.5 + 0.08 * on + (this.reduced ? 0 : Math.sin(time * 2) * 0.02));
    this.pool.material.opacity = 0.4 + 0.6 * Math.max(on, pre);

    // sparklers
    const sOn = t > T.win + 250 * T.scale;
    for (const sp of this.sparklers) {
      sp.stick.visible = sOn; sp.core.visible = sOn; sp.pts.visible = sOn && !this.reduced;
      if (!sOn) continue;
      sp.core.scale.setScalar(0.022 + 0.01 * Math.abs(Math.sin(time * 31 + sp.side)));
      const P = sp.pts.geometry.attributes.position; const C = sp.pts.geometry.attributes.color;
      for (let j = 0; j < SPARKS; j++) {
        const life = ((time * 1.7 + hash(j, sp.side + 3)) % 1);
        const th = hash(j, 21 + sp.side) * Math.PI * 2; const up = hash(j, 22) * 1.2 - 0.2;
        const sp0 = 0.09 + hash(j, 23) * 0.09;
        const r = sp0 * life;
        P.setXYZ(j, sp.tip.x + Math.cos(th) * r * Math.cos(up), sp.tip.y + Math.sin(up) * r - 0.08 * life * life, sp.tip.z + Math.sin(th) * r * Math.cos(up));
        const f = (1 - life) ** 1.5;
        C.setXYZ(j, f, f * 0.82, f * 0.5);
      }
      P.needsUpdate = true; C.needsUpdate = true;
    }

    // confetti
    const m = this._m; const v = this._v; const q = this._q; const e = this._e; const sc = this._s;
    let any = false;
    for (let i = 0; i < CONFETTI; i++) {
      const p = this.pieces[i];
      const s = (t - T.win - p.delay * T.scale) / 1000;
      if (this.reduced || s <= 0) { m.makeScale(0, 0, 0); this.confetti.setMatrixAt(i, m); continue; }
      any = true;
      const landed = s >= p.tLand;
      this._flight(p, Math.min(s, p.tLand), v);
      if (landed) { v.y = p.ground; e.set(-Math.PI / 2, 0, p.ph); } else e.set(p.spin.x * s + p.ph, p.spin.y * s, p.spin.z * s);
      q.setFromEuler(e);
      sc.setScalar(Math.min(1, s * 8));
      m.compose(v, q, sc);
      this.confetti.setMatrixAt(i, m);
      // fake paper shading: brighter when the face turns to the camera / up to the light
      this._n.set(0, 0, 1).applyQuaternion(q);
      const face = Math.abs(this._n.z * 0.7 + this._n.y * 0.5);
      let lit = landed ? 0.8 : 0.62 + 0.45 * face;
      if (i % 4 === 0 && !landed) lit += face > 0.86 ? 1.1 : 0; // foil glint
      this._c.copy(this.baseCols[i]).multiplyScalar(lit);
      this.confetti.setColorAt(i, this._c);
    }
    this.confetti.visible = any;
    this.confetti.instanceMatrix.needsUpdate = true;
    if (any) this.confetti.instanceColor.needsUpdate = true;

    // Cyril watches the winner's tier
    const w = this.slots[0].avatarSlot.localToWorld(new THREE.Vector3(0, 0.05, 0));
    st.cyril.lookAt(w);
  }
}

/** One shared set per stage (podium and end reuse it, so the end screen keeps the winner up). */
export function getPodiumSet(stage) {
  if (!stage.__finaleSet) stage.__finaleSet = new PodiumSet(stage);
  return stage.__finaleSet;
}
