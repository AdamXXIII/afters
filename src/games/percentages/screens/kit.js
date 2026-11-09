// Pie Chart shared bits: the pie (SVG), the question card, avatar discs, bet labels.
import { h, timerRing } from '../../../ui/components.js';
import { AVATARS } from '../../../game/constants.js';
import { avatarIcon } from '../../../ui/icons.js';

let uid = 0;
const TAU = Math.PI * 2;
const pt = (cx, cy, r, f) => [cx + Math.sin(f * TAU) * r, cy - Math.cos(f * TAU) * r];

/** Wedge path from 12 o'clock clockwise covering fraction f (0..1). */
export function wedge(cx, cy, r, f) {
  if (f <= 0.0005) return '';
  if (f >= 0.9995) return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
  const [x, y] = pt(cx, cy, r, f);
  return `M${cx} ${cy}L${cx} ${cy - r}A${r} ${r} 0 ${f > 0.5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}Z`;
}

/**
 * The pie: a lattice-topped pie in a willow-pattern dish. The cut slice (cherry filling, no
 * lattice) is the percentage. Optional brass knife line marks a guess.
 * returns el with .slice(v) (0..100), .knife(v|null), .ghost(v|null), .num(text), .label(text)
 */
export function pie({ size = 260, number = true, ticks = true } = {}) {
  const id = `pc${++uid}`;
  const C = 150;
  const R = 112; // pie radius
  const crimps = Array.from({ length: 40 }, (_, i) => {
    const [x, y] = pt(C, C, R + 1, i / 40);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="8.2"/>`;
  }).join('');
  const dishDots = Array.from({ length: 24 }, (_, i) => {
    const [x, y] = pt(C, C, 139, (i + 0.5) / 24);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.3"/>`;
  }).join('');
  const tickMarks = ticks ? Array.from({ length: 20 }, (_, i) => {
    const [x1, y1] = pt(C, C, 129, i / 20);
    const [x2, y2] = pt(C, C, i % 5 ? 133 : 136, i / 20);
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke-width="${i % 5 ? 1.6 : 2.6}"/>`;
  }).join('') : '';
  const labels = ticks ? [[0, '0'], [0.25, '25'], [0.5, '50'], [0.75, '75']].map(([f, t]) => {
    const [x, y] = pt(C, C, 145.5, f);
    return `<text x="${x.toFixed(1)}" y="${(y + 3.6).toFixed(1)}">${t}</text>`;
  }).join('') : '';
  const el = h('div.pc-pie', {
    style: { width: `${size}px`, height: `${size}px`, '--pc-size': `${size}px` },
    html: `<svg viewBox="-8 -8 316 316" aria-hidden="true">
<defs>
  <radialGradient id="${id}d" cx="50%" cy="42%" r="60%"><stop offset="0" stop-color="#FFFDF8"/><stop offset=".8" stop-color="#F6EEDF"/><stop offset="1" stop-color="#E9DCC6"/></radialGradient>
  <radialGradient id="${id}c" cx="45%" cy="38%" r="70%"><stop offset="0" stop-color="#F6CB7C"/><stop offset=".55" stop-color="#E2A24F"/><stop offset="1" stop-color="#B9732F"/></radialGradient>
  <radialGradient id="${id}f" cx="50%" cy="50%" r="55%"><stop offset="0" stop-color="#C73C49"/><stop offset=".7" stop-color="#9E2433"/><stop offset="1" stop-color="#6E1422"/></radialGradient>
  <pattern id="${id}l" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(45 150 150)">
    <rect width="26" height="26" fill="#7C1A28"/>
    <rect x="0" y="4" width="26" height="12" rx="5" fill="url(#${id}c)"/>
    <rect x="4" y="0" width="12" height="26" rx="5" fill="#E7AA58"/>
    <rect x="4" y="4" width="12" height="12" fill="#EDB565"/>
    <path d="M6 6h8" stroke="#FBE2A8" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>
  </pattern>
  <clipPath id="${id}k"><circle cx="${C}" cy="${C}" r="${R - 6}"/></clipPath>
  <filter id="${id}s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#2A120C" flood-opacity=".45"/></filter>
</defs>
<g class="dish" filter="url(#${id}s)">
  <circle cx="${C}" cy="${C}" r="150" fill="url(#${id}d)"/>
  <circle cx="${C}" cy="${C}" r="146" fill="none" stroke="#2F5D7C" stroke-width="3"/>
  <g fill="#2F5D7C" opacity=".85">${dishDots}</g>
  <circle cx="${C}" cy="${C}" r="132" fill="none" stroke="#2F5D7C" stroke-width="1.2" opacity=".55"/>
</g>
<g class="ticks" stroke="#2F5D7C" stroke-linecap="round">${tickMarks}</g>
<g class="lbls">${labels}</g>
<g class="crust"><g fill="#C27C36">${crimps}</g><circle cx="${C}" cy="${C}" r="${R}" fill="url(#${id}c)"/></g>
<circle cx="${C}" cy="${C}" r="${R - 6}" fill="url(#${id}l)"/>
<circle cx="${C}" cy="${C}" r="${R - 6}" fill="none" stroke="#9A5A22" stroke-width="2" opacity=".5"/>
<g clip-path="url(#${id}k)"><path class="ghost" d="" fill="#FBF4EA" fill-opacity=".22" stroke="#FBF4EA" stroke-width="2.4" stroke-dasharray="5 5"/></g>
<path class="slice" d="" fill="url(#${id}f)" stroke="#5A0F1B" stroke-width="2.4" stroke-linejoin="round"/>
<path class="gloss" d="" fill="none" stroke="#FFD2C8" stroke-width="3" stroke-linecap="round" opacity=".55"/>
<g class="knife" style="display:none">
  <line class="kblade" x1="${C}" y1="${C}" x2="${C}" y2="${C - R - 4}" stroke="#F4E7C8" stroke-width="7" stroke-linecap="round"/>
  <line x1="${C}" y1="${C}" x2="${C}" y2="${C - R - 4}" stroke="#8A6A2A" stroke-width="2"/>
  <rect class="khandle" x="${C - 9}" y="${C - R - 40}" width="18" height="34" rx="8" fill="#5A3424" stroke="#C89B3C" stroke-width="2.5"/>
  <circle cx="${C}" cy="${C - R - 30}" r="2.4" fill="#C89B3C"/><circle cx="${C}" cy="${C - R - 18}" r="2.4" fill="#C89B3C"/>
</g>
</svg>${number ? '<div class="pc-cream"><span class="pc-num"></span><span class="pc-num-lbl"></span></div>' : ''}`,
  });
  const svg = el.querySelector('svg');
  const slice = svg.querySelector('.slice');
  const gloss = svg.querySelector('.gloss');
  const ghost = svg.querySelector('.ghost');
  const knife = svg.querySelector('.knife');
  const num = el.querySelector('.pc-num');
  const lbl = el.querySelector('.pc-num-lbl');
  el.svg = svg;
  el.slice = (v) => {
    const f = Math.max(0, Math.min(100, v)) / 100;
    slice.setAttribute('d', wedge(C, C, R + 3, f));
    if (f > 0.04 && f < 0.999) {
      const a0 = 0.012; const a1 = Math.min(f - 0.012, 0.22);
      const [x0, y0] = pt(C, C, R - 12, a0); const [x1, y1] = pt(C, C, R - 12, a1);
      gloss.setAttribute('d', `M${x0.toFixed(1)} ${y0.toFixed(1)}A${R - 12} ${R - 12} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`);
    } else gloss.setAttribute('d', '');
  };
  el.ghost = (v) => ghost.setAttribute('d', v == null ? '' : wedge(C, C, R - 6, v / 100));
  el.knife = (v) => {
    if (v == null) { knife.style.display = 'none'; return; }
    knife.style.display = '';
    knife.setAttribute('transform', `rotate(${(v / 100) * 360} ${C} ${C})`);
  };
  el.num = (t) => { if (num) num.textContent = t; };
  el.label = (t) => { if (lbl) lbl.textContent = t; };
  /** Pointer position -> 0..100 (clockwise from 12 o'clock). */
  el.valueAt = (clientX, clientY) => {
    const r = svg.getBoundingClientRect();
    const x = clientX - (r.left + r.width / 2);
    const y = clientY - (r.top + r.height / 2);
    let a = Math.atan2(x, -y) / TAU;
    if (a < 0) a += 1;
    return a * 100;
  };
  el.slice(0);
  return el;
}

/** The question card on the show layer: eyebrow, framing line, the question, "roughly" tag. */
export function questionCard(p, { timer = true, compact = false, tag = null } = {}) {
  const poll = p.kind === 'poll';
  const t = timer ? timerRing() : null;
  const lead = poll ? 'What % of this table' : 'Of 100 Brits asked, how many said they…';
  const q = h('div.pc-q', `${p.q}?`);
  const card = h(`div.pc-qcard${poll ? '.poll' : ''}${compact ? '.compact' : ''}`,
    h('div.pc-qhead', t,
      h('div.pc-qmeta',
        h('span.t-eyebrow', poll ? `Table poll · ${p.index + 1} of ${p.count}` : `Slice ${p.index + 1} of ${p.count}`),
        tag || h('span.pc-src', poll ? 'Asked live, anonymously' : 'Roughly, from surveys'))),
    h('div.pc-lead', lead),
    q);
  card.timer = t;
  const len = p.q.length;
  if (len > 52) card.classList.add('long');
  if (len > 64) card.classList.add('xlong');
  return card;
}

export function disc(player, { size = 30, cls = '' } = {}) {
  const colour = AVATARS[player?.avatar]?.colour || '#7A4A2A';
  return h(`span.pc-av${cls}`, { style: { '--pc': colour, width: `${size}px`, height: `${size}px` }, title: player?.name || '', html: avatarIcon(player?.avatar ?? 0) });
}

export const BET_INFO = {
  mhigher: { label: 'Much higher', short: 'Much higher', pay: '1000 if 15+ above', arrow: '⇈' },
  higher: { label: 'Higher', short: 'Higher', pay: '500', arrow: '↑' },
  lower: { label: 'Lower', short: 'Lower', pay: '500', arrow: '↓' },
  mlower: { label: 'Much lower', short: 'Much lower', pay: '1000 if 15+ below', arrow: '⇊' },
};

export const ARROW_UP = '<svg viewBox="0 0 24 24"><path d="M12 20V5M5 11.5l7-7 7 7" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
export const ARROW_UP2 = '<svg viewBox="0 0 24 24"><path d="M5 12.5l7-7 7 7M5 19.5l7-7 7 7" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
export const arrowFor = (bet) => (bet === 'mhigher' ? ARROW_UP2 : bet === 'higher' ? ARROW_UP : bet === 'lower' ? ARROW_UP : ARROW_UP2);
export const isDown = (bet) => bet === 'lower' || bet === 'mlower';

/** Count a number element up from a to b over ms, driven by an elapsed time. */
export const lerp = (a, b, k) => a + (b - a) * k;
export const easeOut = (k) => 1 - (1 - Math.min(1, Math.max(0, k))) ** 3;
export const easeOutBack = (k) => { const c = 1.4; const x = Math.min(1, Math.max(0, k)) - 1; return 1 + (c + 1) * x ** 3 + c * x ** 2; };

/** Seeded pseudo-random 0..1 from a seed + key (same on every phone). */
export function srand(seed, key) {
  let x = 2166136261 ^ seed;
  for (const ch of String(key)) x = Math.imul(x ^ ch.charCodeAt(0), 16777619);
  return ((x >>> 0) % 10000) / 10000;
}

/** Heckle tags flying up the show layer. feed.push(heckle, player) */
export function heckleFeed(ctx) {
  const el = h('div.pc-heckles');
  const seen = new Set();
  el.sync = (list = [], { quiet = false } = {}) => {
    for (const hk of list) {
      if (seen.has(hk.n)) continue;
      seen.add(hk.n);
      const pl = ctx.player(hk.id);
      const x = 8 + srand(ctx.phase.seed, `hx${hk.n}`) * 62;
      const tilt = (srand(ctx.phase.seed, `ht${hk.n}`) - 0.5) * 14;
      const tag = h(`div.pc-heckle.${hk.dir}`, { style: { left: `${x}%`, '--tilt': `${tilt}deg`, '--pc': AVATARS[pl?.avatar]?.colour || '#7A4A2A' } },
        disc(pl, { size: 26 }), h('span.nm', pl?.name || '?'), h('b', hk.dir === 'up' ? 'Higher!' : 'Lower!'));
      el.append(tag);
      if (quiet) tag.classList.add('still');
      else setTimeout(() => tag.remove(), 2400);
    }
    if (quiet) [...el.children].slice(0, -5).forEach((c) => c.remove());
  };
  return el;
}
