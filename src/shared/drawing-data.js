// Drawing DATA helpers (pure, Node-safe: use these in host logic). The pad UI is in drawing.js.
// Shared drawing canvas for games (Crossed Wires and anything else that doodles).
//
//   import { drawPad, renderDrawing, replayDuration, encodeDrawing, decodeDrawing } from '../../shared/drawing.js';
//   const pad = drawPad({ onChange: (d) => ctx.client.act('draw', { d: encodeDrawing(d) }) });
//   sheet.append(pad.el);              // canvas + toolbar (colours, brush sizes, undo, clear)
//   pad.drawing                        // { v:1, strokes:[{c, s, p:[x,y, dx,dy, ...]}] }
//   pad.destroy();
//
//   // replay in sync on every phone, as a pure function of time (works with &freeze=1):
//   frame(ctx) { renderDrawing(canvas, drawing, { t: ctx.elapsed(), speed: 1 }); }
//
// Coordinates are integers on a 1000 x 1000 board (any canvas size/aspect scales to fit), points are
// thinned (>= 6 units apart) and delta-encoded, so a busy doodle is a few KB of JSON. Colours and
// sizes are indexes into PALETTE / SIZES, so every phone draws them identically.

export const BOARD = 1000;
export const PALETTE = ['#2A1A17', '#E2553B', '#E0A526', '#2F5D7C', '#7F9A74', '#B5527E', '#7A4A2A', '#FBF4EA'];
export const PALETTE_NAMES = ['Ink', 'Tomato', 'Mustard', 'Willow', 'Sage', 'Damson', 'Gravy', 'Linen (rubber)'];
export const SIZES = [6, 14, 30, 64]; // board units
export const MIN_STEP = 6;
export const MAX_POINTS = 6000; // whole drawing cap (keeps messages small)

/** An empty drawing. */
export const emptyDrawing = () => ({ v: 1, strokes: [] });

/** Absolute points of a stroke: [[x,y], ...] */
export function strokePoints(st) {
  const out = [];
  let x = 0; let y = 0;
  for (let i = 0; i + 1 < st.p.length; i += 2) {
    if (i === 0) { x = st.p[0]; y = st.p[1]; } else { x += st.p[i]; y += st.p[i + 1]; }
    out.push([x, y]);
  }
  return out;
}

export function countPoints(d) { return (d?.strokes || []).reduce((n, s) => n + s.p.length / 2, 0); }

/** Compact string form for the network (JSON is fine too; this just trims a little). */
export function encodeDrawing(d) { return JSON.stringify({ v: 1, s: (d?.strokes || []).map((st) => [st.c, st.s, st.p]) }); }

/** Parse + validate untrusted drawing data (host side: never trust a phone). */
export function decodeDrawing(raw, { maxPoints = MAX_POINTS } = {}) {
  let o = raw;
  try { if (typeof raw === 'string') o = JSON.parse(raw); } catch { return emptyDrawing(); }
  const list = Array.isArray(o?.s) ? o.s.map(([c, s, p]) => ({ c, s, p })) : Array.isArray(o?.strokes) ? o.strokes : [];
  const strokes = [];
  let n = 0;
  for (const st of list) {
    if (!st || !Array.isArray(st.p) || st.p.length < 2) continue;
    const c = Number.isInteger(st.c) && st.c >= 0 && st.c < PALETTE.length ? st.c : 0;
    const s = Number.isInteger(st.s) && st.s >= 0 && st.s < SIZES.length ? st.s : 1;
    const p = st.p.slice(0, Math.max(0, (maxPoints - n) * 2)).map((v) => Math.round(Number(v) || 0));
    if (p.length % 2) p.pop();
    if (p.length < 2) break;
    n += p.length / 2;
    strokes.push({ c, s, p });
    if (n >= maxPoints) break;
  }
  return { v: 1, strokes };
}

/** How long a natural-speed replay takes (ms): ~8 ms per point + a pause between strokes, capped. */
export function replayDuration(d, { perPoint = 8, perStroke = 120, max = 9000 } = {}) {
  const t = (d?.strokes || []).reduce((acc, s) => acc + perStroke + (s.p.length / 2) * perPoint, 0);
  return Math.min(max, t);
}

/**
 * Draw `d` onto `canvas` (CSS-size aware). opts.t = ms into a replay (omit = whole drawing);
 * opts.duration = how long the full replay lasts (default replayDuration). Pure: same t, same pixels.
 */
export function renderDrawing(canvas, d, { t = null, duration = null, background = '#FFFDF8', fit = 'contain' } = {}) {
  const g = canvas.getContext('2d');
  const W = canvas.width; const H = canvas.height;
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = background;
  g.fillRect(0, 0, W, H);
  const k = fit === 'cover' ? Math.max(W, H) / BOARD : Math.min(W, H) / BOARD;
  g.translate((W - BOARD * k) / 2, (H - BOARD * k) / 2);
  g.scale(k, k);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const strokes = d?.strokes || [];
  // budget of points to draw at time t (proportional to the natural replay timeline)
  let budget = Infinity;
  if (t !== null) {
    const total = countPoints(d) || 1;
    const dur = duration ?? replayDuration(d);
    budget = dur <= 0 ? total : Math.floor(Math.max(0, Math.min(1, t / dur)) * total);
  }
  for (const st of strokes) {
    if (budget <= 0) break;
    const pts = strokePoints(st);
    const n = Math.min(pts.length, budget);
    budget -= pts.length;
    g.strokeStyle = PALETTE[st.c] || PALETTE[0];
    g.fillStyle = g.strokeStyle;
    g.lineWidth = SIZES[st.s] || SIZES[1];
    if (n === 1) {
      g.beginPath(); g.arc(pts[0][0], pts[0][1], g.lineWidth / 2, 0, Math.PI * 2); g.fill();
      continue;
    }
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < n; i++) {
      // smooth with midpoints (quadratic) so thinned points still look like a pen
      const [x0, y0] = pts[i - 1]; const [x1, y1] = pts[i];
      g.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
    }
    g.lineTo(pts[n - 1][0], pts[n - 1][1]);
    g.stroke();
  }
  g.restore();
}

