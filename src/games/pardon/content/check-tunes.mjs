// node src/games/pardon/content/check-tunes.mjs : parse every tune, print length, range and the
// interval/rhythm fingerprint so a human (or a critic) can sing it against the real thing.
import { TUNES } from './tunes.js';
import { parseNotes, tuneLength } from '../tune.js';
const N = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const name = (m) => `${N[m % 12]}${Math.floor(m / 12) - 1}`;
const ids = new Set(); const titles = new Set(); let bad = 0;
for (const t of TUNES) {
  if (ids.has(t.id) || titles.has(t.title)) { console.log('DUPLICATE', t.id, t.title); bad++; }
  ids.add(t.id); titles.add(t.title);
  let ns;
  try { ns = parseNotes(t.notes); } catch (e) { console.log('PARSE', t.id, e.message); bad++; continue; }
  const ms = ns.filter((n) => n.m !== null).map((n) => n.m);
  const iv = []; for (let i = 1; i < ms.length; i++) iv.push(ms[i] - ms[i - 1]);
  const secs = tuneLength(t);
  const flag = secs < 6 || secs > 18 || Math.min(...ms) < 55 || Math.max(...ms) > 76 ? ' !' : '';
  console.log(`${t.id} ${t.kind.padEnd(9)} ${secs.toFixed(1).padStart(5)}s ${name(Math.min(...ms))}-${name(Math.max(...ms))} ${String(ns.length).padStart(2)}n ${t.title}${flag}`);
  if (process.argv[2] === '-v') console.log('   iv', iv.join(' '), '\n   rh', ns.map((n) => n.beats).join(' '));
}
const kinds = {}; for (const t of TUNES) kinds[t.kind] = (kinds[t.kind] || 0) + 1;
console.log(TUNES.length, 'tunes', JSON.stringify(kinds));
if (bad) process.exit(1);
