// Text helpers: normalising, too-honest check, family-safe filter.

const NUMBER_WORDS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
};

/** lowercase, strip punctuation + leading article, collapse spaces, number words -> digits */
export function normalise(s) {
  let t = String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
  t = t.replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  t = t.replace(/^(a|an|the) /, '');
  // "one hundred and sixteen" -> 116 ; "thirty eight" -> 38
  const words = t.split(' ');
  const out = [];
  let acc = null;
  for (const w of words) {
    if (w in NUMBER_WORDS) {
      const n = NUMBER_WORDS[w];
      if (acc === null) acc = n;
      else if (n === 100) acc *= 100;
      else acc += n;
    } else if (w === 'and' && acc !== null) {
      continue;
    } else {
      if (acc !== null) { out.push(String(acc)); acc = null; }
      out.push(w);
    }
  }
  if (acc !== null) out.push(String(acc));
  return out.join(' ');
}

export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** True when a porky is actually the truth (DESIGN 2.4). */
export function isTooHonest(text, fact) {
  const n = normalise(text);
  if (!n) return false;
  const targets = [fact.answer, ...(fact.aliases || [])].map(normalise);
  return targets.some((t) => {
    const limit = t.length > 8 ? 2 : 1;
    return levenshtein(n, t) <= limit;
  });
}

// Deliberately small, mild list. Masks the word with cutlery "++++".
const BLOCK = [
  'fuck', 'fucking', 'shit', 'shite', 'cunt', 'bastard', 'bollocks', 'wanker', 'twat', 'prick',
  'dick', 'cock', 'piss', 'arse', 'arsehole', 'asshole', 'bitch', 'slut', 'whore', 'tosser', 'bellend',
];
const BLOCK_RE = new RegExp(`\\b(${BLOCK.join('|')})(s|es|ing|ed)?\\b`, 'gi');

export function familySafe(text) {
  return String(text || '').replace(BLOCK_RE, (m) => '+'.repeat(Math.max(4, Math.min(m.length, 6))));
}

export function cleanInput(text, max) {
  return String(text || '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
