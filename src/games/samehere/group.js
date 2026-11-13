// Same Here: grouping answers that mean the same thing. Node-safe (host logic + sim).
// Two tiers: OBVIOUS matches merge on their own (case, punctuation, "the", plurals, typos,
// titles like "Inspector", a few common synonyms); CLOSE calls (one answer inside another,
// a shared surname) become disputes the table votes on.
// AI-generated (Claude, Same Here builder, 2026-11-13).
import { normalise, levenshtein } from '../../util/text.js';

// words that never decide what an answer is ("Inspector Morse" = "Morse", "Mr Bean" = "Bean")
const FILLER = new Set([
  'a', 'an', 'the', 'my', 'your', 'some', 'of', 'and',
  'mr', 'mrs', 'ms', 'miss', 'dr', 'doctor', 'sir', 'lady', 'lord', 'saint', 'st',
  'inspector', 'detective', 'di', 'dci', 'dc', 'ds', 'lieutenant', 'sergeant', 'captain', 'professor', 'prof',
]);

// everyday words that mean the same thing at a British table
const SYN = [
  ['tv', 'telly', 'television'],
  ['mum', 'mom', 'mother', 'mam', 'mummy'],
  ['dad', 'father', 'daddy'],
  ['nan', 'nana', 'gran', 'granny', 'grandma', 'nanny', 'grandmother'],
  ['grandad', 'grandpa', 'grandfather', 'granddad'],
  ['phone', 'mobile', 'mobile phone', 'smartphone', 'iphone', 'cell phone'],
  ['car', 'motor'],
  ['bike', 'bicycle'],
  ['hoover', 'vacuum', 'vacuum cleaner', 'hoover cleaner'],
  ['loo', 'toilet', 'bog', 'lavatory', 'wc', 'khazi'],
  ['sofa', 'couch', 'settee'],
  ['bin', 'dustbin', 'rubbish bin', 'wheelie bin'],
  ['quid', 'pound', 'pounds'],
  ['pub', 'boozer'],
  ['football', 'footy', 'soccer'],
  ['lorry', 'truck'],
  ['jumper', 'sweater', 'pullover'],
  ['trainers', 'sneakers', 'trainer'],
  ['remote', 'remote control', 'tv remote', 'clicker', 'zapper'],
  ['laptop', 'computer', 'pc'],
  ['holiday', 'vacation'],
  ['film', 'movie'],
  ['shit', 'crap'],
  ['fuck', 'fucking hell', 'fuck sake', 'for fucks sake', 'ffs', 'fucks sake'],
  ['ow', 'ouch', 'ow ow ow'],
  ['nyc', 'new york', 'new york city'],
  ['uk', 'britain', 'great britain', 'united kingdom'],
  ['usa', 'us', 'america', 'united states', 'united states of america'],
];
const SYN_MAP = new Map();
SYN.forEach((list, i) => list.forEach((w) => SYN_MAP.set(w, `~${i}`)));

/** Plural/possessive to a stem: "spiders" -> "spider", "boxes" -> "box", "nan's" -> "nan". */
function stem(w) {
  if (w.length <= 3) return w;
  if (/ies$/.test(w) && w.length > 4) return `${w.slice(0, -3)}y`;
  if (/(ches|shes|xes|sses|zes)$/.test(w)) return w.slice(0, -2);
  if (/[^s]s$/.test(w) && !/(us|is|ss)$/.test(w)) return w.slice(0, -1);
  return w;
}

/** The comparable form of an answer: normalised, filler dropped, stemmed, synonyms folded. */
export function key(text) {
  const n = normalise(String(text || '').replace(/['’]s\b/g, ''));
  if (!n) return '';
  if (SYN_MAP.has(n)) return SYN_MAP.get(n);
  const words = n.split(' ').filter((w) => !FILLER.has(w));
  const base = (words.length ? words : n.split(' ')).map(stem).join(' ');
  if (SYN_MAP.has(base)) return SYN_MAP.get(base);
  return base.replace(/ /g, '');
}

/** Word list for close-call checks. */
function words(text) {
  const n = normalise(String(text || '').replace(/['’]s\b/g, ''));
  return n.split(' ').filter((w) => w && !FILLER.has(w)).map(stem);
}

/** Obvious: the table wouldn't argue (same key, or a small typo in a longer word). */
export function obvious(a, b) {
  const x = key(a); const y = key(b);
  if (!x || !y) return false;
  if (x === y) return true;
  if (x.startsWith('~') || y.startsWith('~')) return false;
  const long = Math.max(x.length, y.length);
  if (long < 5) return false;
  if (/\d/.test(x) || /\d/.test(y)) return false; // "Apollo 11" vs "Apollo 13"
  return levenshtein(x, y) <= (long >= 10 ? 2 : 1);
}

/** Close call: worth a table vote ("Sherlock" vs "Sherlock Holmes", "Holmes" vs "Mycroft Holmes"). */
export function close(a, b) {
  if (obvious(a, b)) return false;
  const wa = words(a); const wb = words(b);
  if (!wa.length || !wb.length) return false;
  const sa = new Set(wa); const sb = new Set(wb);
  const shared = [...sa].filter((w) => sb.has(w) && w.length >= 4);
  if (shared.length) return true;
  const x = key(a); const y = key(b);
  if (x.startsWith('~') || y.startsWith('~')) return false;
  const long = Math.max(x.length, y.length);
  if (long >= 6 && !/\d/.test(x + y) && levenshtein(x, y) <= (long >= 10 ? 4 : 2)) return true;
  if (Math.min(x.length, y.length) >= 4 && (x.includes(y) || y.includes(x))) return true;
  return false;
}

/**
 * Group answers. answers = [{pid, text}] -> groups [{gid, text, pids, texts}].
 * The group's label is its most common spelling (first written wins a tie).
 */
export function autoGroup(answers) {
  const groups = [];
  for (const a of answers) {
    const g = groups.find((x) => x.texts.some((t) => obvious(t, a.text)));
    if (g) { g.pids.push(a.pid); g.texts.push(a.text); } else groups.push({ pids: [a.pid], texts: [a.text] });
  }
  return groups.map((g, i) => ({ gid: `g${i}`, text: label(g.texts), pids: g.pids, texts: g.texts }));
}

export function label(texts) {
  const count = new Map();
  for (const t of texts) { const k = t.trim(); count.set(k, (count.get(k) || 0) + 1); }
  let best = texts[0]; let n = 0;
  for (const [t, c] of count) if (c > n) { best = t; n = c; }
  return best;
}

/** Close-call pairs between groups, biggest groups first, at most `max`. */
export function suggestDisputes(groups, max = 3) {
  const out = [];
  const order = groups.slice().sort((a, b) => b.pids.length - a.pids.length);
  const used = new Set();
  for (let i = 0; i < order.length; i++) {
    for (let j = i + 1; j < order.length; j++) {
      const A = order[i]; const B = order[j];
      if (used.has(B.gid) && used.has(A.gid)) continue;
      if (A.texts.some((ta) => B.texts.some((tb) => close(ta, tb)))) {
        out.push([A.gid, B.gid]);
        used.add(A.gid); used.add(B.gid);
        if (out.length >= max) return out;
      }
    }
  }
  return out;
}

/** Apply merges (pairs of gids) with union-find; returns new merged groups (ids kept from the first). */
export function merge(groups, pairs) {
  const parent = new Map(groups.map((g) => [g.gid, g.gid]));
  const find = (x) => { while (parent.get(x) !== x) x = parent.get(x); return x; };
  for (const [a, b] of pairs) {
    if (!parent.has(a) || !parent.has(b)) continue;
    const ra = find(a); const rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  }
  const byRoot = new Map();
  for (const g of groups) {
    const r = find(g.gid);
    if (!byRoot.has(r)) byRoot.set(r, { gid: r, pids: [], texts: [], parts: [] });
    const m = byRoot.get(r);
    m.pids.push(...g.pids); m.texts.push(...g.texts); m.parts.push(g.text);
  }
  return [...byRoot.values()].map((m) => ({ gid: m.gid, text: label(m.texts), pids: m.pids, texts: m.texts, also: [...new Set(m.parts)].filter((t) => t !== label(m.texts)) }));
}
