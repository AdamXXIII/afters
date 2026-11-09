// Procedural textures generated at startup (<= 512 px, DESIGN 3.6). No downloaded assets.
import * as THREE from 'three';

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function tex(c, { srgb = true, repeat = null } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

/** Soft radial glow (flame halo, blob shadows). */
export function radialTexture({ size = 64, inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)', mid = null } = {}) {
  const c = canvas(size);
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, inner);
  if (mid) grd.addColorStop(0.45, mid);
  grd.addColorStop(1, outer);
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  return tex(c);
}

/** Linen weave normal map (DESIGN 3.6 tablecloth). */
export function weaveNormalTexture(size = 256) {
  const c = canvas(size);
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const threads = 64;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * threads * Math.PI * 2;
      const v = (y / size) * threads * Math.PI * 2;
      const over = (Math.floor((x / size) * threads) + Math.floor((y / size) * threads)) % 2;
      const nx = over ? Math.cos(u) * 0.55 : Math.cos(u) * 0.2;
      const ny = over ? Math.cos(v) * 0.2 : Math.cos(v) * 0.55;
      const n = (Math.random() - 0.5) * 0.12;
      const i = (y * size + x) * 4;
      img.data[i] = 128 + (nx + n) * 110;
      img.data[i + 1] = 128 + (ny + n) * 110;
      img.data[i + 2] = 235;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return tex(c, { srgb: false, repeat: 6 });
}

/** Willow-pattern plate (blue rim pattern + tree silhouette). */
export function willowPlateTexture(size = 512) {
  const c = canvas(size);
  const g = c.getContext('2d');
  const r = size / 2;
  const blue = '#2F5D7C';
  g.fillStyle = '#FBF7EF';
  g.fillRect(0, 0, size, size);
  g.translate(r, r);
  // rim bands
  g.strokeStyle = blue;
  g.lineWidth = size * 0.018;
  g.beginPath(); g.arc(0, 0, r * 0.97, 0, Math.PI * 2); g.stroke();
  g.lineWidth = size * 0.006;
  g.beginPath(); g.arc(0, 0, r * 0.74, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(0, 0, r * 0.7, 0, Math.PI * 2); g.stroke();
  // rim scroll pattern
  g.fillStyle = blue;
  for (let i = 0; i < 28; i++) {
    g.save();
    g.rotate((i / 28) * Math.PI * 2);
    g.beginPath();
    g.ellipse(0, -r * 0.84, size * 0.028, size * 0.06, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#FBF7EF';
    g.beginPath();
    g.ellipse(0, -r * 0.84, size * 0.012, size * 0.032, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = blue;
    g.beginPath();
    g.arc(size * 0.05, -r * 0.8, size * 0.01, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  // centre scene: willow tree, bridge, two birds
  g.globalAlpha = 0.9;
  g.fillStyle = blue;
  g.beginPath(); g.ellipse(-r * 0.2, -r * 0.18, r * 0.24, r * 0.16, -0.3, 0, Math.PI * 2); g.fill();
  g.fillRect(-r * 0.22, -r * 0.1, r * 0.04, r * 0.3);
  for (let i = 0; i < 9; i++) {
    g.beginPath();
    g.moveTo(-r * 0.36 + i * r * 0.04, -r * 0.12);
    g.quadraticCurveTo(-r * 0.4 + i * r * 0.045, r * 0.02, -r * 0.42 + i * r * 0.05, r * 0.12);
    g.lineWidth = size * 0.006;
    g.strokeStyle = blue;
    g.stroke();
  }
  g.lineWidth = size * 0.01;
  g.beginPath(); g.arc(r * 0.12, r * 0.32, r * 0.22, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  g.fillRect(-r * 0.5, r * 0.3, r * 1.0, size * 0.008);
  g.beginPath(); g.moveTo(r * 0.18, -r * 0.42); g.quadraticCurveTo(r * 0.24, -r * 0.48, r * 0.3, -r * 0.42); g.quadraticCurveTo(r * 0.36, -r * 0.48, r * 0.42, -r * 0.42); g.stroke();
  g.beginPath(); g.moveTo(r * 0.26, -r * 0.3); g.quadraticCurveTo(r * 0.31, -r * 0.35, r * 0.36, -r * 0.3); g.quadraticCurveTo(r * 0.41, -r * 0.35, r * 0.46, -r * 0.3); g.stroke();
  // pagoda
  g.fillRect(r * 0.2, -r * 0.12, r * 0.22, r * 0.2);
  g.beginPath(); g.moveTo(r * 0.14, -r * 0.12); g.lineTo(r * 0.31, -r * 0.26); g.lineTo(r * 0.48, -r * 0.12); g.fill();
  return tex(c);
}

/** Back wall: warm radial falloff, a framed picture and a night window with one star. */
export function wallTexture(w = 512, h = 512) {
  const c = canvas(w, h);
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(w * 0.5, h * 0.62, 10, w * 0.5, h * 0.6, w * 0.75);
  grd.addColorStop(0, '#8A4A2E');
  grd.addColorStop(0.35, '#5E3020');
  grd.addColorStop(0.75, '#3B1F18');
  grd.addColorStop(1, '#241310');
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
  // wallpaper stripes, very subtle
  g.globalAlpha = 0.05;
  g.fillStyle = '#FFC86B';
  for (let x = 0; x < w; x += 24) g.fillRect(x, 0, 6, h);
  g.globalAlpha = 1;
  // dado rail
  g.fillStyle = 'rgba(20,10,8,0.35)';
  g.fillRect(0, h * 0.78, w, h * 0.012);
  // window (night blue) with one star
  const wx = w * 0.66; const wy = h * 0.2; const ww = w * 0.2; const wh = h * 0.3;
  g.fillStyle = '#2A160F';
  g.fillRect(wx - 8, wy - 8, ww + 16, wh + 16);
  const sky = g.createLinearGradient(0, wy, 0, wy + wh);
  sky.addColorStop(0, '#13202D');
  sky.addColorStop(1, '#1B2A3A');
  g.fillStyle = sky;
  g.fillRect(wx, wy, ww, wh);
  g.fillStyle = '#2A160F';
  g.fillRect(wx + ww / 2 - 3, wy, 6, wh);
  g.fillRect(wx, wy + wh / 2 - 3, ww, 6);
  const sx = wx + ww * 0.28; const sy = wy + wh * 0.22;
  const star = g.createRadialGradient(sx, sy, 0, sx, sy, 10);
  star.addColorStop(0, 'rgba(255,248,220,1)');
  star.addColorStop(1, 'rgba(255,248,220,0)');
  g.fillStyle = star;
  g.fillRect(sx - 10, sy - 10, 20, 20);
  // framed picture (a still life silhouette)
  const px = w * 0.16; const py = h * 0.24; const pw = w * 0.2; const ph = h * 0.24;
  g.fillStyle = '#7A5A2A';
  g.fillRect(px - 10, py - 10, pw + 20, ph + 20);
  g.fillStyle = '#2E1A12';
  g.fillRect(px, py, pw, ph);
  g.fillStyle = 'rgba(200,155,60,0.25)';
  g.beginPath(); g.ellipse(px + pw / 2, py + ph * 0.7, pw * 0.3, ph * 0.12, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(px + pw * 0.42, py + ph * 0.5, pw * 0.12, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(px + pw * 0.6, py + ph * 0.55, pw * 0.09, 0, Math.PI * 2); g.fill();
  return tex(c);
}

/** Wood grain for the table edge / chairs. */
export function woodTexture(size = 256) {
  const c = canvas(size);
  const g = c.getContext('2d');
  g.fillStyle = '#5A3424';
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 70; i++) {
    g.strokeStyle = `rgba(${30 + Math.random() * 30},${14 + Math.random() * 12},8,${0.15 + Math.random() * 0.25})`;
    g.lineWidth = 1 + Math.random() * 2;
    g.beginPath();
    const y = Math.random() * size;
    g.moveTo(0, y);
    for (let x = 0; x <= size; x += 16) g.lineTo(x, y + Math.sin(x * 0.05 + i) * 3);
    g.stroke();
  }
  return tex(c, { repeat: 2 });
}

/** Folded napkin / paper noise. */
export function paperTexture(size = 128, base = '#FBF4EA') {
  const c = canvas(size);
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  const img = g.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 10;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  return tex(c);
}

/** Candle wax: vertical drip streaks, faint mottling, a warmer band near the melted top.
 * Lathe UVs: u wraps around, v runs bottom (0) to top (1). */
export function waxTexture(w = 256, h = 256) {
  const c = canvas(w, h);
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, h, 0, 0);
  grd.addColorStop(0, '#E9D6B8');
  grd.addColorStop(0.55, '#F3E6CF');
  grd.addColorStop(0.9, '#F7EBD6');
  grd.addColorStop(1, '#FBEFD9');
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
  // drip streaks from the top edge
  let seed = 3;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 26; i++) {
    const x = rnd() * w; const len = h * (0.12 + rnd() * 0.5); const wd = 2 + rnd() * 6;
    const sg = g.createLinearGradient(0, 0, 0, len);
    sg.addColorStop(0, 'rgba(255,248,232,0.55)');
    sg.addColorStop(1, 'rgba(255,248,232,0)');
    g.fillStyle = sg;
    g.beginPath();
    g.moveTo(x - wd / 2, 0); g.lineTo(x + wd / 2, 0); g.lineTo(x + wd * 0.3, len - wd); g.arc(x, len - wd, wd * 0.3, 0, Math.PI); g.closePath();
    g.fill();
  }
  // soft mottling
  const img = g.getImageData(0, 0, w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const n = (Math.sin(x * 0.11 + Math.sin(y * 0.05) * 3) + Math.sin(y * 0.07 + x * 0.02)) * 2.2 + (rnd() - 0.5) * 3;
      img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n * 0.8;
    }
  }
  g.putImageData(img, 0, 0);
  const t = tex(c);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}
