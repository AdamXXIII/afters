// Cyril's doodles (Node-safe): hand-shaped drawings for bots, demos and empty steps.
// Each doodle is built from wobbly circles and lines on the 1000x1000 board in the shared
// drawing format ({v:1, strokes:[{c, s, p:[x0,y0, dx,dy, ...]}]}). Colours index drawing PALETTE:
// 0 ink, 1 tomato, 2 mustard, 3 willow, 4 sage, 5 damson, 6 gravy, 7 linen (rubber).
import { mulberry32 } from '../../util/rng.js';

function enc(pts) {
  const p = [Math.round(pts[0][0]), Math.round(pts[0][1])];
  let [lx, ly] = p;
  for (let i = 1; i < pts.length; i++) {
    const x = Math.round(pts[i][0]); const y = Math.round(pts[i][1]);
    if (Math.hypot(x - lx, y - ly) < 6 && i < pts.length - 1) continue;
    p.push(x - lx, y - ly); lx = x; ly = y;
  }
  return p;
}

function kit(rng) {
  const j = (a) => (rng() - 0.5) * 2 * a;
  const out = [];
  const BOLD = [1, 2, 2, 3];
  const add = (pts, c = 0, s = 1) => { if (pts.length) out.push({ c, s: BOLD[s] ?? s, p: enc(pts) }); };
  return {
    out,
    /** wobbly ellipse */
    ring(cx, cy, rx, ry = rx, c = 0, s = 1, { from = 0, to = Math.PI * 2, wob = 0.05 } = {}) {
      const n = Math.max(14, Math.round((Math.abs(to - from) * Math.max(rx, ry)) / 22));
      const ph = rng() * 6; const pts = [];
      for (let i = 0; i <= n; i++) {
        const a = from + ((to - from) * i) / n;
        const k = 1 + Math.sin(a * 3 + ph) * wob + j(wob / 3);
        pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
      }
      add(pts, c, s);
    },
    /** wobbly polyline through points */
    line(points, c = 0, s = 1, wob = 6) {
      const pts = [];
      for (let i = 0; i < points.length - 1; i++) {
        const [x0, y0] = points[i]; const [x1, y1] = points[i + 1];
        const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 24));
        for (let k = i ? 1 : 0; k <= n; k++) pts.push([x0 + ((x1 - x0) * k) / n + j(wob), y0 + ((y1 - y0) * k) / n + j(wob)]);
      }
      add(pts, c, s);
    },
    dot(x, y, c = 0, s = 2) { out.push({ c, s, p: [Math.round(x), Math.round(y), 2, 1] }); },
    /** scribble fill inside an ellipse */
    fill(cx, cy, rx, ry, c, s = 2) {
      const pts = []; const rows = Math.max(3, Math.round((ry * 2) / 34));
      for (let r = 0; r <= rows; r++) {
        const y = cy - ry + (2 * ry * r) / rows;
        const w = rx * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2)) * 0.92;
        pts.push(r % 2 ? [cx + w, y] : [cx - w, y], r % 2 ? [cx - w, y + j(4)] : [cx + w, y + j(4)]);
      }
      add(pts, c, s);
    },
    j,
  };
}

const face = (k, x, y, sc = 1, smile = true) => {
  k.dot(x - 40 * sc, y - 20 * sc); k.dot(x + 40 * sc, y - 20 * sc);
  if (smile) k.ring(x, y + 10 * sc, 45 * sc, 30 * sc, 0, 1, { from: 0.3, to: Math.PI - 0.3, wob: 0.02 });
  else k.ring(x, y + 45 * sc, 30 * sc, 20 * sc, 0, 1, { from: Math.PI + 0.4, to: Math.PI * 2 - 0.4, wob: 0.02 });
};

export const DOODLES = {
  cat(k) {
    k.fill(500, 600, 230, 200, 2, 3);
    k.ring(500, 600, 240, 210, 0, 2);
    k.line([[300, 480], [320, 300], [420, 410]], 0, 2);
    k.line([[580, 410], [680, 300], [700, 480]], 0, 2);
    face(k, 500, 590, 1.6);
    k.line([[380, 640], [230, 610]], 0, 1); k.line([[380, 670], [230, 690]], 0, 1);
    k.line([[620, 640], [770, 610]], 0, 1); k.line([[620, 670], [770, 690]], 0, 1);
    k.ring(500, 630, 18, 14, 1, 2);
  },
  house(k) {
    k.line([[240, 480], [240, 820], [760, 820], [760, 480]], 0, 2);
    k.line([[200, 500], [500, 220], [800, 500]], 1, 2);
    k.fill(500, 420, 160, 120, 1, 3);
    k.line([[440, 820], [440, 640], [560, 640], [560, 820]], 6, 2);
    k.line([[290, 560], [390, 560], [390, 640], [290, 640], [290, 560]], 3, 1);
    k.line([[610, 560], [710, 560], [710, 640], [610, 640], [610, 560]], 3, 1);
    k.line([[650, 300], [650, 220], [700, 220], [700, 350]], 0, 1);
    k.ring(720, 160, 40, 30, 0, 0); k.ring(760, 100, 30, 22, 0, 0);
    k.ring(150, 160, 70, 70, 2, 2);
  },
  ghost(k) {
    k.line([[300, 820], [300, 420]], 0, 2);
    k.ring(500, 420, 200, 220, 0, 2, { from: Math.PI, to: Math.PI * 2 });
    k.line([[700, 420], [700, 820], [640, 760], [580, 820], [520, 760], [460, 820], [400, 760], [340, 820], [300, 820]], 0, 2);
    k.fill(420, 440, 36, 50, 0, 2); k.fill(580, 440, 36, 50, 0, 2);
    k.ring(500, 590, 40, 50, 0, 2);
    k.line([[160, 300], [220, 330]], 3, 1); k.line([[800, 300], [860, 270]], 3, 1);
  },
  fish(k) {
    k.fill(470, 500, 230, 140, 3, 3);
    k.ring(470, 500, 240, 150, 0, 2);
    k.line([[700, 500], [850, 380], [850, 620], [700, 500]], 0, 2);
    k.ring(340, 470, 30, 30, 0, 1); k.dot(340, 470, 0, 2);
    k.line([[420, 420], [460, 500], [420, 580]], 0, 1);
    k.ring(200, 300, 24, 24, 3, 1); k.ring(160, 220, 16, 16, 3, 1); k.ring(190, 150, 10, 10, 3, 1);
  },
  rocket(k) {
    k.ring(500, 450, 120, 280, 0, 2);
    k.fill(500, 350, 90, 120, 1, 2);
    k.ring(500, 430, 50, 50, 3, 2);
    k.line([[390, 600], [290, 760], [400, 700]], 0, 2);
    k.line([[610, 600], [710, 760], [600, 700]], 0, 2);
    k.line([[440, 740], [470, 880], [500, 790], [530, 900], [560, 740]], 2, 2);
    k.dot(200, 200, 2, 2); k.dot(800, 280, 2, 2); k.dot(760, 120, 2, 1);
  },
  cake(k) {
    k.line([[250, 560], [250, 820], [750, 820], [750, 560]], 0, 2);
    k.ring(500, 560, 250, 60, 0, 2);
    k.line([[250, 600], [320, 650], [390, 600], [460, 650], [530, 600], [600, 650], [670, 600], [750, 640]], 5, 2);
    k.line([[500, 500], [500, 330]], 3, 2);
    k.ring(500, 290, 26, 46, 2, 2);
    k.fill(500, 290, 16, 30, 1, 1);
    k.dot(340, 720, 1, 2); k.dot(480, 740, 1, 2); k.dot(640, 710, 1, 2);
  },
  snail(k) {
    k.ring(520, 520, 190, 180, 6, 2);
    k.ring(520, 520, 120, 115, 6, 1); k.ring(520, 520, 55, 55, 6, 1);
    k.line([[300, 700], [820, 700], [860, 650], [820, 560]], 0, 2);
    k.line([[300, 700], [220, 660], [200, 560]], 0, 2);
    k.line([[220, 580], [180, 440]], 0, 1); k.line([[240, 580], [260, 440]], 0, 1);
    k.dot(180, 430, 0, 2); k.dot(262, 430, 0, 2);
    k.line([[120, 760], [880, 760]], 4, 1);
  },
  sun(k) {
    k.fill(500, 480, 170, 170, 2, 3);
    k.ring(500, 480, 180, 180, 1, 2);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      k.line([[500 + Math.cos(a) * 230, 480 + Math.sin(a) * 230], [500 + Math.cos(a) * 330, 480 + Math.sin(a) * 330]], 1, 2);
    }
    k.line([[400, 440], [470, 440]], 0, 3); k.line([[530, 440], [600, 440]], 0, 3);
    k.ring(500, 520, 70, 40, 0, 1, { from: 0.3, to: Math.PI - 0.3, wob: 0.02 });
  },
  pig(k) {
    k.fill(500, 520, 250, 200, 5, 3);
    k.ring(500, 520, 260, 210, 0, 2);
    k.ring(500, 560, 80, 56, 0, 2); k.dot(470, 560, 0, 2); k.dot(530, 560, 0, 2);
    k.dot(420, 460, 0, 2); k.dot(580, 460, 0, 2);
    k.line([[320, 360], [300, 250], [400, 330]], 0, 2); k.line([[600, 330], [700, 250], [680, 360]], 0, 2);
    k.line([[360, 720], [360, 820]], 0, 2); k.line([[640, 720], [640, 820]], 0, 2);
  },
  person(k) {
    k.ring(500, 250, 90, 100, 0, 2); face(k, 500, 250, 0.9);
    k.line([[500, 350], [500, 640]], 0, 2);
    k.line([[340, 420], [500, 470], [660, 400]], 0, 2);
    k.line([[400, 860], [500, 640], [600, 860]], 0, 2);
    k.line([[410, 160], [500, 120], [590, 160]], 6, 3);
    k.line([[660, 400], [720, 300]], 1, 2); k.ring(740, 270, 40, 40, 1, 2);
  },
};

export const DOODLE_KEYS = Object.keys(DOODLES);

/** A doodle as a drawing. key: name or index; seed: wobble. */
export function doodle(key, seed = 1) {
  const name = typeof key === 'number' ? DOODLE_KEYS[((key % DOODLE_KEYS.length) + DOODLE_KEYS.length) % DOODLE_KEYS.length] : key;
  const k = kit(mulberry32(seed >>> 0));
  (DOODLES[name] || DOODLES.cat)(k);
  return { v: 1, strokes: k.out };
}

/** Shift a drawing a little (flipbook frames from bots). */
export function nudgeDrawing(d, dx, dy) {
  return { v: 1, strokes: (d?.strokes || []).map((s) => ({ ...s, p: [s.p[0] + dx, s.p[1] + dy, ...s.p.slice(2)] })) };
}

// which doodle a bot draws for a sentence (keyword -> doodle), else a seeded random one
const DOODLE_WORDS = [
  ['cat', /\b(cat|kitten|puss|lion|tiger)/], ['fish', /\b(fish|shark|whale|goldfish|mermaid|octopus|crab|lobster|jellyfish|seagull)/],
  ['ghost', /\b(ghost|haunted|mummy|vampire|spooky)/], ['house', /\b(house|castle|shed|lighthouse|caravan|church|steeple|home)/],
  ['rocket', /\b(rocket|alien|astronaut|moon|space)/], ['cake', /\b(cake|birthday|bun|pudding|candle|wedding)/],
  ['snail', /\b(snail|tortoise|worm|slug)/], ['sun', /\b(sun|beach|holiday|sunbed|summer)/],
  ['pig', /\b(pig|sausage|bacon|cow|sheep|llama|horse|goat)/], ['person', /\b(man|vicar|grandad|granny|nan|mum|dad|king|queen|knight|wizard|pirate|cowboy|nun|postman|milkman|plumber|santa)/],
];
/** Which doodle fits a sentence (keyword match, else a seeded random one). */
export function doodleFor(text, rng = Math.random) {
  const t = String(text || '').toLowerCase();
  const hit = DOODLE_WORDS.find(([, re]) => re.test(t));
  return hit ? hit[0] : DOODLE_KEYS[Math.floor(rng() * DOODLE_KEYS.length)];
}

/** Scale + centre a drawing so its strokes fill the board (for heroes and tiles). */
export function fitToContent(d, pad = 70) {
  const strokes = d?.strokes || [];
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const s of strokes) { let x = 0; let y = 0; for (let i = 0; i + 1 < s.p.length; i += 2) { if (i === 0) { x = s.p[0]; y = s.p[1]; } else { x += s.p[i]; y += s.p[i + 1]; } x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } }
  if (!strokes.length || !isFinite(x0)) return d;
  const w = Math.max(60, x1 - x0); const hh = Math.max(60, y1 - y0);
  const k = Math.min(2.2, (1000 - pad * 2) / Math.max(w, hh));
  const ox = 500 - ((x0 + x1) / 2) * k; const oy = 500 - ((y0 + y1) / 2) * k;
  return { v: 1, strokes: strokes.map((s) => ({ c: s.c, s: s.s, p: s.p.map((v, i) => (i < 2 ? Math.round(v * k + (i ? oy : ox)) : Math.round(v * k))) })) };
}
