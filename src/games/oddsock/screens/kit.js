// Odd Sock shared bits. One idea: the laundry basket got tipped out on the dinner table. Each
// secret word is a woven name tape (the kind your mum sewed into school jumpers); players are
// pegged on a washing line in speaking order; the odd one out gets a mismatched sock.
// AI-generated (Claude, Odd Sock builder, 2026-11-13).
import { h, onTap, timerRing } from '../../../ui/components.js';
import { AVATARS } from '../../../game/constants.js';
import { avatarIcon } from '../../../ui/icons.js';

export const nameOf = (ctx, id) => ctx.player(id)?.name || 'Someone';
export const colourOf = (ctx, id) => AVATARS[ctx.player(id)?.avatar]?.colour || '#7A4A2A';
export const you = (ctx, id, cap = true) => (id === ctx.meId ? (cap ? 'You' : 'you') : nameOf(ctx, id));

export function disc(ctx, id, { size = 34, cls = '' } = {}) {
  const pl = ctx.player(id);
  return h(`span.os-av${cls}`, { style: { '--pc': colourOf(ctx, id), width: `${size}px`, height: `${size}px` }, title: pl?.name || '', html: avatarIcon(pl?.avatar ?? 0) });
}

/** Cyril speaks after a beat (instantly in screenshots). Returns a cancel fn. */
export function sayLater(ctx, lines, { delay = 600, ...o } = {}) {
  if (!lines) return () => {};
  const split = ctx.phase && ['oddsock-word', 'oddsock-clue', 'oddsock-vote', 'oddsock-guess'].includes(ctx.phase.id);
  const t = setTimeout(() => ctx.say(lines, { hold: 2600, placement: 'side', ...(split ? { compact: true } : {}), ...o }), ctx.frozen ? 0 : delay);
  return () => clearTimeout(t);
}

/**
 * A sock, drawn. pattern: 'stripe' (the matching pair) or 'spot' (the odd one).
 * Body colour + accent colour; `mirror` flips it to face left.
 */
export function sockSvg({ body = '#3E8E8A', accent = '#FBF4EA', pattern = 'stripe', mirror = false, cls = '' } = {}) {
  const shape = 'M14 6H38V40C38 44 41 47 45 49L54 54C60 57 62 64 58 69C55 73 49 74 44 72L24 65C17 62 14 56 14 49Z';
  const marks = pattern === 'stripe'
    ? `<path d="M14 22H38M14 30H38" stroke="${accent}" stroke-width="4.2"/><path d="M14 38H38" stroke="${accent}" stroke-width="4.2"/>`
    : `<circle cx="21" cy="24" r="2.6" fill="${accent}"/><circle cx="31" cy="31" r="2.6" fill="${accent}"/><circle cx="21" cy="40" r="2.6" fill="${accent}"/><circle cx="30" cy="49" r="2.6" fill="${accent}"/><circle cx="43" cy="60" r="2.6" fill="${accent}"/><circle cx="52" cy="64" r="2.2" fill="${accent}"/>`;
  return `<svg class="os-sock${cls}" viewBox="0 0 64 80" aria-hidden="true"${mirror ? ' style="transform:scaleX(-1)"' : ''}>
<defs><clipPath id="osc${pattern}"><path d="${shape}"/></clipPath></defs>
<path d="${shape}" fill="${body}"/>
<g clip-path="url(#osc${pattern})">${marks}<path d="M40 50C44 56 46 62 44 72L60 72V50Z" fill="rgba(0,0,0,.14)"/><path d="M14 6H38V13H14Z" fill="rgba(255,255,255,.22)"/></g>
<path d="M14 13H38" stroke="rgba(42,26,23,.35)" stroke-width="1.2" stroke-dasharray="2 2"/>
<path d="${shape}" fill="none" stroke="#2A1A17" stroke-width="2.4" stroke-linejoin="round"/>
</svg>`;
}

/** The secret word as a woven name tape. size: 'big' | 'small'. */
export function nameTape(word, { size = 'big', label = 'Your word', cls = '' } = {}) {
  const len = String(word || '').length;
  return h(`div.os-tape.${size}${cls}${len > 12 ? '.long' : ''}${len > 18 ? '.xlong' : ''}`,
    label ? h('span.os-tape-l', label) : null,
    h('span.os-tape-w', word || '?'));
}

/** Header card on the show layer: title, one line, a timer and a round badge. */
export function header(ctx, { title, line, timer = true, tone = '' } = {}) {
  const p = ctx.payload || {};
  const t = timer ? timerRing() : null;
  const badge = p.round ? h(`span.os-badge${p.final ? '.x2' : ''}`, p.final ? 'Last round · ×2' : `Round ${p.round} of ${p.rounds}`) : null;
  const el = h(`div.os-head${tone ? `.${tone}` : ''}`,
    h('div.os-head-row', t, h('div.os-head-t', badge, h('div.os-title', title), line ? h('div.os-line', line) : null)));
  el.timer = t;
  return el;
}

/**
 * The washing line: everyone pegged in speaking order. `turn` = index into the full order of
 * turns (laps x players); done ones get a tick; the current one hangs lower and bigger.
 */
export function washingLine(ctx, { order, turn = -1, lap = 1, laps = 1 } = {}) {
  const n = order.length;
  const cur = turn >= 0 ? turn % n : -1;
  const items = order.map((id, i) => {
    const done = turn >= 0 && (lap > 1 || i < cur);
    const now = i === cur;
    return h(`div.os-peg${now ? '.now' : ''}${done ? '.done' : ''}${id === ctx.meId ? '.me' : ''}`, { style: { '--i': i } },
      h('span.os-clip'),
      h('div.os-pegav', disc(ctx, id, { size: now ? 50 : 34 }), done && !now ? h('span.os-tick', { html: TICK }) : null),
      h('span.nm', you(ctx, id)));
  });
  return h('div.os-line-wrap',
    laps > 1 ? h('div.os-lap', `Lap ${lap} of ${laps}`) : null,
    h('div.os-washing', { style: { '--n': n } }, h('span.os-rope'), h('div.os-pegs', items)));
}

export const TICK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.4 4.4L19 7.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
export const SPEAK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v4h3l5 4V6L7 10z"/><path d="M16 9c1.2 1.6 1.2 4.4 0 6M19 6.5c2.6 3 2.6 8 0 11"/></svg>';

/** A name button for the vote. */
export function nameBtn(ctx, id, { e2e } = {}) {
  const b = h('button.os-pick', { type: 'button', 'data-e2e': e2e || `os-vote-${id}`, style: { '--pc': colourOf(ctx, id) } },
    disc(ctx, id, { size: 36 }), h('span.nm', nameOf(ctx, id)), h('span.n'), h('span.tick', { html: TICK }));
  b.dataset.id = id;
  return b;
}

export function skipBtn(ctx, show, label = 'Skip') {
  if (!ctx.isHost) return null;
  const b = h('button.os-skip', { type: 'button', 'data-e2e': 'skip' }, label);
  onTap(b, () => ctx.client.skip());
  show.append(b);
  return (c) => b.classList.toggle('on', c.elapsed() > 2000 / (c.phase?.speed || 1));
}

/** Count an element up to `to` (instant when frozen). */
export function countTo(el, to, { prefix = '+', frozen = false, ms = 650 } = {}) {
  if (frozen || !to) { el.textContent = `${prefix}${to}`; return; }
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / ms);
    el.textContent = `${prefix}${Math.round(to * (1 - (1 - k) ** 3))}`;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
