// The 8 player avatars (DESIGN 3.5): after-dinner objects with dot eyes. Each < 1.5k triangles.
import * as THREE from 'three';
import { AVATARS } from '../game/constants.js';

const eyeWhite = new THREE.MeshBasicMaterial({ color: '#FFFDF7' });
const eyePupil = new THREE.MeshBasicMaterial({ color: '#2A1A17' });
const eyeGeo = new THREE.SphereGeometry(0.0085, 12, 8);
const pupilGeo = new THREE.SphereGeometry(0.0045, 10, 6);

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
const lathe = (pts, seg = 24) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);

function addEyes(group, y, z, spread = 0.016, scale = 1) {
  const eyes = [];
  for (const s of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(spread * s, y, z);
    g.scale.setScalar(scale);
    const w = new THREE.Mesh(eyeGeo, eyeWhite);
    w.scale.z = 0.6;
    const p = new THREE.Mesh(pupilGeo, eyePupil);
    p.position.z = 0.006;
    p.scale.z = 0.5;
    g.add(w, p);
    group.add(g);
    eyes.push(g);
  }
  group.userData.eyes = eyes;
}

function jelly(accent) {
  const g = new THREE.Group();
  const geo = lathe([[0, 0], [0.05, 0], [0.052, 0.01], [0.048, 0.04], [0.042, 0.065], [0.03, 0.085], [0.015, 0.094], [0, 0.096]], 32);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i); const z = pos.getZ(i);
    const a = Math.atan2(z, x);
    const k = 1 + 0.07 * Math.cos(a * 8);
    pos.setX(i, x * k); pos.setZ(i, z * k);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, std(accent, { roughness: 0.12, metalness: 0, transparent: true, opacity: 0.88, emissive: new THREE.Color(accent).multiplyScalar(0.25) }));
  g.add(m);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.06, 0.006, 32), std('#FBF4EA', { roughness: 0.3 }));
  plate.position.y = -0.002;
  g.add(plate);
  addEyes(g, 0.05, 0.047);
  g.userData.wobble = m;
  return g;
}

function sprout(accent) {
  const g = new THREE.Group();
  const green = std('#8DB36B', { roughness: 0.55 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.042, 20, 14), green);
  body.position.y = 0.045;
  g.add(body);
  const leafMat = std(new THREE.Color('#5E8A45'), { roughness: 0.6, side: THREE.DoubleSide });
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 8, 0, Math.PI), leafMat);
    const a = (i / 5) * Math.PI * 2 + 0.4;
    leaf.scale.set(1, 1.2, 0.35);
    leaf.position.set(Math.sin(a) * 0.03, 0.04 + (i % 2) * 0.01, Math.cos(a) * 0.03);
    leaf.rotation.set(0.3, a, 0);
    if (Math.abs(Math.sin(a / 2)) < 0.3) continue; // keep the face clear
    g.add(leaf);
    // a lighter inner leaf layer so it reads as a sprout, not a ball
    const inner = new THREE.Mesh(leaf.geometry, std('#A9CC7E', { roughness: 0.6, side: THREE.DoubleSide }));
    inner.scale.set(0.8, 1.05, 0.3); inner.position.set(Math.sin(a + 0.6) * 0.024, 0.06, Math.cos(a + 0.6) * 0.024); inner.rotation.set(0.15, a + 0.6, 0);
    g.add(inner);
  }
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.016, 8), green);
  stalk.position.y = 0.088;
  g.add(stalk);
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.004, 6, 12), std(accent));
  bow.position.set(0.022, 0.085, 0.01);
  g.add(bow);
  addEyes(g, 0.05, 0.04);
  return g;
}

function teacup(accent) {
  const g = new THREE.Group();
  const china = std('#FBF7EF', { roughness: 0.25 });
  const cup = new THREE.Mesh(lathe([[0, 0.012], [0.024, 0.012], [0.032, 0.02], [0.044, 0.05], [0.05, 0.078], [0.047, 0.078], [0.041, 0.052], [0.03, 0.024], [0, 0.022]], 32), china);
  cup.material.side = THREE.DoubleSide;
  g.add(cup);
  const tea = new THREE.Mesh(new THREE.CircleGeometry(0.045, 24), std('#7A4A2A', { roughness: 0.2 }));
  tea.rotation.x = -Math.PI / 2; tea.position.y = 0.07;
  g.add(tea);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.0475, 0.0035, 6, 32), std(accent, { roughness: 0.35 }));
  band.rotation.x = Math.PI / 2; band.position.y = 0.068;
  g.add(band);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.0045, 8, 16, Math.PI * 1.4), china);
  handle.position.set(0.05, 0.048, 0); handle.rotation.z = -Math.PI * 0.7;
  g.add(handle);
  const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.05, 0.008, 32), std(accent, { roughness: 0.3 }));
  saucer.position.y = 0.006;
  g.add(saucer);
  addEyes(g, 0.042, 0.04);
  return g;
}

function cheese(accent) {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(-0.05, 0); s.lineTo(0.05, 0); s.lineTo(0.04, 0.075); s.lineTo(-0.05, 0.02); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2 });
  geo.translate(0, 0, -0.03);
  const m = new THREE.Mesh(geo, std('#F2C14E', { roughness: 0.55 }));
  g.add(m);
  const holeMat = std('#C9962E', { roughness: 0.8 });
  for (const [x, y, z, r] of [[-0.03, 0.012, 0.031, 0.008], [0.015, 0.03, 0.031, 0.006], [0.032, 0.015, -0.031, 0.007], [-0.01, 0.045, -0.031, 0.006]]) {
    const h = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), holeMat);
    h.position.set(x, y, z); h.scale.z = 0.4;
    g.add(h);
  }
  const rind = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.008, 0.066), std(accent, { roughness: 0.5 }));
  rind.position.y = 0.002;
  g.add(rind);
  addEyes(g, 0.03, 0.036, 0.014);
  return g;
}

function peppermill(accent) {
  const g = new THREE.Group();
  const wood = std('#5A3424', { roughness: 0.45 });
  const body = new THREE.Mesh(lathe([[0, 0], [0.03, 0], [0.032, 0.008], [0.026, 0.03], [0.022, 0.06], [0.026, 0.085], [0.03, 0.1], [0.026, 0.11], [0, 0.112]], 24), wood);
  g.add(body);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0265, 0.0265, 0.012, 24), std(accent, { roughness: 0.4 }));
  band.position.y = 0.072;
  g.add(band);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.011, 12, 8), std('#C89B3C', { metalness: 0.8, roughness: 0.3 }));
  knob.position.y = 0.12;
  g.add(knob);
  addEyes(g, 0.045, 0.022, 0.011, 0.9);
  return g;
}

function pudding(accent) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), std('#4A2618', { roughness: 0.85 }));
  body.position.y = 0.025;
  g.add(body);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.039, 0.036, 0.025, 20), std('#4A2618', { roughness: 0.85 }));
  base.position.y = 0.0125;
  g.add(base);
  const cap = new THREE.Mesh(lathe([[0, 0.072], [0.02, 0.07], [0.034, 0.062], [0.04, 0.052], [0.036, 0.05], [0.028, 0.056], [0, 0.064]], 24), std('#FFF2D2', { roughness: 0.35 }));
  g.add(cap);
  const holly = std('#2F5D3C', { roughness: 0.5, side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.012, 8), holly);
    leaf.scale.set(1.6, 0.7, 1);
    leaf.position.set(0.012 * s, 0.075, 0);
    leaf.rotation.set(-1.2, 0, 0.4 * s);
    g.add(leaf);
  }
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 6), std('#C0263A', { roughness: 0.3 }));
    b.position.set(-0.004 + i * 0.004, 0.078 + (i === 1 ? 0.003 : 0), 0.002);
    g.add(b);
  }
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.006, 28), std(accent, { roughness: 0.3 }));
  plate.position.y = -0.002;
  g.add(plate);
  addEyes(g, 0.035, 0.04);
  return g;
}

function egg(accent) {
  const g = new THREE.Group();
  const cup = new THREE.Mesh(lathe([[0, 0], [0.028, 0], [0.026, 0.006], [0.012, 0.016], [0.012, 0.026], [0.03, 0.04], [0.034, 0.05], [0, 0.046]], 24), std(accent, { roughness: 0.3 }));
  g.add(cup);
  const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 20, 14), std('#F6E9D2', { roughness: 0.5 }));
  e.scale.set(1, 1.3, 1);
  e.position.y = 0.075;
  g.add(e);
  const cosy = new THREE.Mesh(new THREE.TorusGeometry(0.031, 0.006, 8, 24), std(new THREE.Color(accent).lerp(new THREE.Color('#FBF4EA'), 0.35), { roughness: 0.95 }));
  cosy.rotation.x = Math.PI / 2; cosy.position.y = 0.054;
  g.add(cosy);
  addEyes(g, 0.082, 0.026, 0.012, 0.9);
  return g;
}

function bourbon(accent) {
  const g = new THREE.Group();
  const choc = std('#4A2618', { roughness: 0.7 });
  const geo = new THREE.BoxGeometry(0.1, 0.016, 0.05, 2, 1, 1);
  for (const y of [0.008, 0.034]) {
    const m = new THREE.Mesh(geo, choc);
    m.position.y = y;
    g.add(m);
  }
  const cream = new THREE.Mesh(new THREE.BoxGeometry(0.094, 0.01, 0.046), std(new THREE.Color('#E8D2B0').lerp(new THREE.Color(accent), 0.45), { roughness: 0.5 }));
  cream.position.y = 0.021;
  g.add(cream);
  const dimple = std('#2E170E', { roughness: 0.9 });
  for (let i = 0; i < 6; i++) {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.002, 8), dimple);
    d.position.set(-0.03 + (i % 3) * 0.03, 0.0425, i < 3 ? -0.012 : 0.012);
    g.add(d);
  }
  g.rotation.x = 0;
  addEyes(g, 0.021, 0.027, 0.018);
  return g;
}

const BUILDERS = [jelly, sprout, teacup, cheese, peppermill, pudding, egg, bourbon];

/** Build avatar `index` (0-7) as a Group with base at y=0, facing +z. */
export function buildAvatar(index) {
  const a = AVATARS[index % AVATARS.length];
  const g = BUILDERS[index % BUILDERS.length](a.colour);
  g.name = `avatar-${a.key}`;
  g.userData.index = index;
  g.userData.phase = index * 0.7;
  return g;
}

/** Idle bob 0.5 Hz with phase offset; jelly wobbles. */
export function animateAvatar(g, t, amp = 1) {
  const ph = g.userData.phase || 0;
  const inner = g.userData.inner || g;
  inner.position.y = Math.sin(t * Math.PI + ph) * 0.004 * amp + (g.userData.lift || 0);
  if (g.userData.wobble) {
    const w = Math.sin(t * 9 + ph) * 0.03 * amp;
    g.userData.wobble.scale.set(1 + w, 1 - w, 1 + w);
  }
}

/**
 * Render each avatar to a small PNG data URL (lobby picker thumbnails).
 * Uses an offscreen render target, so the main canvas is untouched.
 */
export function renderAvatarThumbnails(renderer, size = 160) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#FFD9A8', '#3B1F18', 1.4));
  const key = new THREE.PointLight('#FFB866', 0.9, 2, 2);
  key.position.set(0.12, 0.25, 0.3);
  scene.add(key);
  const rim = new THREE.DirectionalLight('#9FB6D9', 0.6);
  rim.position.set(-1, 1, -1);
  scene.add(rim);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 5);
  cam.position.set(0, 0.1, 0.32);
  cam.lookAt(0, 0.05, 0);
  const rt = new THREE.WebGLRenderTarget(size, size, { samples: 4 });
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  const px = new Uint8Array(size * size * 4);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const out = [];
  const prevTarget = renderer.getRenderTarget();
  const prevClear = renderer.getClearAlpha();
  renderer.setClearAlpha(0);
  for (let i = 0; i < AVATARS.length; i++) {
    const g = buildAvatar(i);
    g.rotation.y = -0.35;
    scene.add(g);
    renderer.setRenderTarget(rt);
    renderer.clear();
    renderer.render(scene, cam);
    renderer.readRenderTargetPixels(rt, 0, 0, size, size, px);
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      const src = (size - 1 - y) * size * 4;
      img.data.set(px.subarray(src, src + size * 4), y * size * 4);
    }
    ctx.putImageData(img, 0, 0);
    out.push(c.toDataURL('image/png'));
    scene.remove(g);
  }
  renderer.setRenderTarget(prevTarget);
  renderer.setClearAlpha(prevClear);
  rt.dispose();
  return out;
}
