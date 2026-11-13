// Top Shelf shared bits: the drinks cabinet (shelves + player bottles), bottle tokens,
// category labels, the question card, player discs. Every animated thing is a pure function
// of a time value, so frozen screenshots and phone-to-phone sync both work.
import { h, timerRing } from '../../../ui/components.js';
import { AVATARS } from '../../../game/constants.js';
import { avatarIcon } from '../../../ui/icons.js';
import { CAT_INFO } from '../content/index.js';

export const colourOf = (pl) => AVATARS[pl?.avatar]?.colour || '#7A4A2A';
export const easeOut = (k) => 1 - (1 - Math.min(1, Math.max(0, k))) ** 3;
export const easeInOut = (k) => { const x = Math.min(1, Math.max(0, k)); return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; };
export const cat = (id) => CAT_INFO[id] || { id, name: id, note: '', glass: '#C89B3C' };
export const LETTERS = ['A', 'B', 'C', 'D'];

export function disc(player, { size = 30, cls = '' } = {}) {
  return h(`span.ts-av${cls}`, { style: { '--pc': colourOf(player), width: `${size}px`, height: `${size}px` }, title: player?.name || '', html: avatarIcon(player?.avatar ?? 0) });
}

/** A player's bottle: coloured glass, brass cork, their avatar glyph on a linen label. */
export function bottleSvg(colour, avatar) {
  return `<svg viewBox="0 0 30 46" aria-hidden="true">
<path d="M11 1.5h8v3h-8z" fill="#C89B3C"/><path d="M11.6 4.5h6.8v7.2c0 1.6 1 2.4 2.6 3.6C23.4 17 25 19.2 25 22.5V41a3.5 3.5 0 0 1-3.5 3.5h-13A3.5 3.5 0 0 1 5 41V22.5c0-3.3 1.6-5.5 4-7.2 1.6-1.2 2.6-2 2.6-3.6z" fill="${colour}" stroke="rgba(30,12,8,.55)" stroke-width="1.2"/>
<path d="M8.4 21.5c0-2 1-3.4 2.4-4.6" stroke="rgba(255,255,255,.55)" stroke-width="1.6" fill="none" stroke-linecap="round"/>
<rect x="7.2" y="25" width="15.6" height="14" rx="2.4" fill="#FBF4EA"/>
<g transform="translate(9.48 26.48) scale(.46)" style="color:${colour}">${glyph(avatar, colour)}</g>
</svg>`;
}
// avatar glyphs are white-on-transparent SVGs; recolour them for the linen label
function glyph(avatar, colour) {
  return avatarIcon(avatar ?? 0).replace(/<svg[^>]*>/, '').replace('</svg>', '').replace(/#fff(fff)?/gi, colour).replace(/white/g, colour);
}

/** Category label: a little bottle in the category's glass + its name. */
export function catChip(id, { big = false } = {}) {
  const c = cat(id);
  return h(`span.ts-cat${big ? '.big' : ''}`, { style: { '--g': c.glass } }, h('span.ts-cat-b', { html: CAT_BOTTLE }), h('span.ts-cat-n', c.name));
}
export const CAT_BOTTLE = '<svg viewBox="0 0 16 28" aria-hidden="true"><path d="M6 1h4v2H6z" fill="#C89B3C"/><path d="M6.3 3h3.4v4.6c0 .9.6 1.4 1.5 2.1 1.3 1 2.3 2.2 2.3 4V25a2 2 0 0 1-2 2H4.5a2 2 0 0 1-2-2V13.7c0-1.8 1-3 2.3-4 .9-.7 1.5-1.2 1.5-2.1z" fill="var(--g)"/><rect x="4" y="15" width="8" height="7" rx="1.2" fill="#FBF4EA"/></svg>';

/** The question card for the show layer: category, timer, question, "Q 1 of 2". */
export function qCard(p, { timer = true, compact = false } = {}) {
  const t = timer ? timerRing() : null;
  const tag = p.mode === 'steal' ? 'Steal' : p.mode === 'port' ? (p.duo ? 'Leader alone' : 'Pass the Port') : p.mode === 'final' ? 'The Last Drop' : `Round ${p.round + 1} of ${p.of}${p.perRound > 1 ? ` · ${p.n} of 2` : ''}`;
  const card = h(`div.ts-qcard${compact ? '.compact' : ''}.m-${p.mode || 'normal'}`, { style: { '--g': cat(p.cat).glass } },
    h('div.ts-qhead', t, catChip(p.cat), h('span.ts-qtag', tag)),
    h('div.ts-q', p.q));
  if (p.q.length > 70) card.classList.add('long');
  if (p.q.length > 100) card.classList.add('xlong');
  card.timer = t;
  return card;
}

/** The shelf window worth showing: the occupied range plus a little air, at least `min` rows. */
export function shelfRange(maps, top, min = 6, pad = 1) {
  const vals = maps.flatMap((m) => Object.values(m || {}));
  let lo = Math.max(0, Math.min(...vals, top) - 1);
  let hi = Math.min(top, Math.max(...vals, 0) + pad);
  while (hi - lo < min) { if (hi < top) hi += 1; else if (lo > 0) lo -= 1; else break; }
  return { lo, hi };
}

/**
 * The drinks cabinet, showing shelves lo..hi (the rest of the climb is implied by the numbers).
 * Every player has their own lane, so bottles never pile up or jump sideways. Each bottle
 * carries its owner's name; a flag above it says what just happened.
 */
export function cabinet(ctx, { top = 15, lo = 0, hi = top, size = 'full' } = {}) {
  const ids = ctx.players.map((p) => p.id);
  const n = ids.length;
  const planks = [];
  for (let s = lo; s <= hi; s++) {
    planks.push(h(`div.ts-plank${s === top ? '.top' : ''}${s === 0 ? '.floor' : ''}`, { style: { '--s': String(s - lo) } },
      h('span.ts-plank-n', s === top ? 'Top shelf' : s === 0 ? 'Floor' : String(s))));
  }
  const toks = new Map();
  ctx.players.forEach((pl, lane) => {
    const me = pl.id === ctx.meId;
    const tok = h(`div.ts-tok${me ? '.me' : ''}`, { style: { '--pc': colourOf(pl), '--x': String(lane) } },
      h('div.ts-tok-tag',
        h('span.ts-tok-flag'),
        h('span.ts-tok-crown', { html: '<svg viewBox="0 0 48 32"><path d="M4 28 2 6l12 10L24 2l10 14L46 6l-2 22z" fill="#FFD27A" stroke="#8A5A10" stroke-width="3" stroke-linejoin="round"/></svg>' }),
        h('span.ts-tok-n', me ? 'You' : pl.name)),
      h('div.ts-tok-b', { html: bottleSvg(colourOf(pl), pl.avatar) }));
    tok.title = pl.name;
    toks.set(pl.id, tok);
  });
  const shelves = h('div.ts-shelves', planks, [...toks.values()]);
  const toTop = top - hi;
  const el = h(`div.ts-cab.${size}${hi - lo > 7 ? '.dense' : ''}`, { style: { '--rows': String(hi - lo), '--n': String(n) } },
    h('div.ts-cab-crown', h('span', size === 'tiny' ? `${top} shelves` : toTop > 0 ? `Top shelf: ${top} \u00b7 ${toTop} above` : 'Cyril\u2019s cabinet')),
    h('div.ts-cab-in', shelves));
  /** pos: {id: shelfFloat}; extra: {id: {flag, kind, shield, hot, lead, dim}} */
  el.place = (pos, extra = {}) => {
    for (const [id, tok] of toks) {
      const s = pos[id];
      if (s === undefined) { tok.style.display = 'none'; continue; }
      tok.style.display = '';
      tok.style.setProperty('--s', (Math.max(lo - 0.6, Math.min(hi + 0.6, s)) - lo).toFixed(3));
      const e = extra[id] || {};
      tok.querySelector('.ts-tok-flag').textContent = e.flag || '';
      tok.dataset.flag = e.kind || '';
      tok.classList.toggle('shield', !!e.shield);
      tok.classList.toggle('dim', !!e.dim);
      tok.classList.toggle('hot', !!e.hot);
      tok.classList.toggle('lead', !!e.lead);
    }
  };
  el.still = (shelves, extra) => {
    const pos = {};
    for (const id of ids) pos[id] = shelves[id] ?? 0;
    el.place(pos, extra);
  };
  return el;
}

/** Leader(s) of a {id: shelf} map, for the crown. */
export function leaders(shelves) {
  const max = Math.max(...Object.values(shelves));
  return max > 0 ? new Set(Object.keys(shelves).filter((id) => shelves[id] === max)) : new Set();
}

/** Bottles from `before` to `after` shelves at time t, staggered per player, with a little hop. */
export function moveFrame(ids, before, after, t, { start, dur = 900, stagger = 90 }) {
  const pos = {};
  ids.forEach((id, i) => {
    const k = easeInOut((t - start - i * stagger) / dur);
    const a = before[id] ?? 0; const b = after[id] ?? a;
    const hop = a !== b ? Math.sin(Math.PI * Math.min(1, Math.max(0, k))) * 0.4 : 0;
    pos[id] = a + (b - a) * k + hop;
  });
  return pos;
}

export function skipBtn(ctx, show) {
  if (!ctx.isHost) return null;
  const b = h('button.ts-skip', { type: 'button', 'data-e2e': 'skip' }, 'Skip');
  b.addEventListener('click', () => ctx.client.skip());
  show.append(b);
  return (c) => b.classList.toggle('on', c.elapsed() > 1500 / (c.phase?.speed || 1));
}

export const say = (ctx, lines, o = {}, delay = 500) => {
  if (!lines) return () => {};
  const t = setTimeout(() => ctx.say(lines, { hold: 2600, placement: 'side', ...o }), ctx.frozen ? 0 : delay);
  return () => clearTimeout(t);
};

/** Fill {name} in one of Cyril's lines. */
export const named = (lines, name) => (lines || []).map((l) => l.replaceAll('{name}', name));
