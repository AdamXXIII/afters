// Crossed Wires pure helpers (Node-safe): rotation, "kept the thread" matching, timers.

export const MODES = ['classic', 'speedy', 'flip'];

export const TIMERS = {
  classic: { write: 30000, draw: 50000, guess: 22000 },
  speedy: { write: 25000, draw: 30000, guess: 15000 },
  flip: { write: 30000, draw: 45000, guess: 25000 },
};

export const LIMITS = { text: 70, points: 2200 };

/** How far each rumour travels. 'once' = every player adds one step (Gartic-style, steps = players);
 *  'twice' = it goes round the table twice (more drift at small tables), capped so a game stays ~15 min. */
export const LENGTHS = ['once', 'twice'];
export const MAX_STEPS = 10;
export const stepsFor = (n, length) => (length === 'twice' ? Math.max(n, Math.min(2 * n, MAX_STEPS)) : n);
/** Small tables go round twice by default so a line has room to drift. */
export const defaultLength = (n) => (n <= 4 ? 'twice' : 'once');

/** Seat holding line `c` at step `s` (N players). */
export const holder = (c, s, n) => (c + s) % n;

/** Kind of step s in a mode: 0 = write, then draw/guess alternate (flip: all draws). */
export const kindOf = (s, mode) => (s === 0 ? 'write' : mode === 'flip' ? 'draw' : s % 2 === 1 ? 'draw' : 'guess');

const STOP = new Set(('a an the and or of in on at to for with by from up down is are was were be been it its it\'s this that these those '
  + 'his her their our your my me you he she they we i him them us very really just some any no not too so as into out over under '
  + 'than then there here who what which when where why how all one two being has have had do does did doing very big small little '
  + 'giant tiny huge having getting going doing trying being make making s').split(/\s+/));

/** Content words, lowercased, plurals folded ("cats" -> "cat", "boxes" -> "box"). */
export function keyWords(text) {
  return String(text || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter((w) => w && !STOP.has(w))
    .map((w) => (w.length > 4 && w.endsWith('es') && /(s|x|z|ch|sh)es$/.test(w) ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w));
}

/** Share of `a`'s key words found in `b` (0..1). Close spellings (one letter off, 5+ letters) count. */
export function overlap(a, b) {
  const A = [...new Set(keyWords(a))];
  const B = new Set(keyWords(b));
  if (!A.length || !B.size) return 0;
  let hit = 0;
  for (const w of A) {
    if (B.has(w)) { hit++; continue; }
    if (w.length >= 5) for (const x of B) if (x.length >= 5 && near(w, x)) { hit++; break; }
  }
  return hit / A.length;
}

function near(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0; let j = 0; let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** "Kept the thread": at least half of the key words, or at least two of them. */
export const kept = (from, to) => {
  const o = overlap(from, to);
  return o >= 0.5 || (o > 0 && keyWords(from).length >= 4 && o * new Set(keyWords(from)).size >= 2);
};
