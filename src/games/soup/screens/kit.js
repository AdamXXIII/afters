// Something in the Soup: shared screen bits. The tureen (the pot), avatar discs, the seat strip,
// the header card, money, the role card. AI-generated (Claude, Soup team, 2026-11-13).
import { h, timerRing } from '../../../ui/components.js';
import { AVATARS } from '../../../game/constants.js';
import { avatarIcon } from '../../../ui/icons.js';

export const money = (n) => `£${Math.round(n || 0).toLocaleString('en-GB')}`;
export const nameOf = (ctx, id) => ctx.player(id)?.name || 'Someone';
export const colourOf = (ctx, id) => AVATARS[ctx.player(id)?.avatar]?.colour || '#7A4A2A';
export const isGhost = (ctx, id = ctx.meId) => !(ctx.payload?.alive || []).includes(id);
export const clamp01 = (k) => Math.min(1, Math.max(0, k));
export const easeOut = (k) => 1 - (1 - clamp01(k)) ** 3;

/** Cyril speaks after a beat (instantly in screenshots). Returns a cancel fn. */
export const say = (ctx, lines, o = {}, delay = 600) => {
  if (!lines) return () => {};
  const t = setTimeout(() => ctx.say(lines, { hold: 3000, placement: 'side', ...o }), ctx.frozen ? 0 : delay);
  return () => clearTimeout(t);
};

export function disc(ctx, id, { size = 34, cls = '' } = {}) {
  const pl = ctx.player(id);
  const ghost = !!ctx.payload?.alive && isGhost(ctx, id);
  return h(`span.sp-av${cls}${ghost ? '.ghost' : ''}`, {
    style: { '--pc': colourOf(ctx, id), width: `${size}px`, height: `${size}px` },
    title: pl?.name || '', html: avatarIcon(pl?.avatar ?? 0),
  });
}

/** Seat strip: everyone at the table, ghosts faded with a wisp. */
export function seats(ctx, { size = 30, done = null } = {}) {
  const ids = ctx.payload.seats || ctx.players.map((p) => p.id);
  const items = new Map(ids.map((id) => [id, h('div.sp-seat', disc(ctx, id, { size }), h('span.nm', nameOf(ctx, id)))]));
  const el = h('div.sp-seats', [...items.values()]);
  el.sync = (c) => { if (done) for (const [id, it] of items) it.classList.toggle('in', !!done(c, id)); };
  return el;
}

const TUREEN = (id) => `<svg viewBox="0 0 220 150" aria-hidden="true">
<defs>
  <linearGradient id="${id}b" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#FFFDF8"/><stop offset=".7" stop-color="#F1E6D2"/><stop offset="1" stop-color="#D9C6A6"/></linearGradient>
  <linearGradient id="${id}l" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E9DCC4"/></linearGradient>
</defs>
<g class="steam" fill="none" stroke="#FBF4EA" stroke-width="3.2" stroke-linecap="round" opacity=".55">
  <path d="M86 30c-8-9 8-15 0-25"/><path d="M110 26c-8-9 8-15 0-24"/><path d="M134 30c-8-9 8-15 0-25"/>
</g>
<ellipse cx="110" cy="140" rx="74" ry="8" fill="#1A0B07" opacity=".45"/>
<path d="M38 74h144c0 36-30 62-72 62S38 110 38 74z" fill="url(#${id}b)" stroke="#2F5D7C" stroke-width="2.4"/>
<path d="M54 96c16 9 36 13 56 13s40-4 56-13" fill="none" stroke="#2F5D7C" stroke-width="2"/>
<g fill="#2F5D7C"><circle cx="66" cy="110" r="2.6"/><circle cx="88" cy="118" r="2.6"/><circle cx="110" cy="121" r="2.6"/><circle cx="132" cy="118" r="2.6"/><circle cx="154" cy="110" r="2.6"/></g>
<path d="M78 88c4-6 10-6 14 0s10 6 14 0 10-6 14 0 10 6 14 0 10-6 14 0" fill="none" stroke="#2F5D7C" stroke-width="1.6" opacity=".7"/>
<path d="M38 80c-14 0-20 8-14 16s16 4 18-2" fill="none" stroke="#C89B3C" stroke-width="5" stroke-linecap="round"/>
<path d="M182 80c14 0 20 8 14 16s-16 4-18-2" fill="none" stroke="#C89B3C" stroke-width="5" stroke-linecap="round"/>
<rect x="76" y="132" width="68" height="8" rx="3" fill="#E9DCC4" stroke="#2F5D7C" stroke-width="2"/>
<g class="lid"><path d="M44 74c0-22 30-36 66-36s66 14 66 36z" fill="url(#${id}l)" stroke="#2F5D7C" stroke-width="2.4"/>
<path d="M62 66c10-12 28-18 48-18s38 6 48 18" fill="none" stroke="#2F5D7C" stroke-width="1.6" opacity=".7"/>
<path d="M100 40c0-8 4-12 10-12s10 4 10 12" fill="#C89B3C" stroke="#8A6A2A" stroke-width="2"/>
<rect x="38" y="70" width="144" height="7" rx="3.5" fill="#C89B3C" stroke="#8A6A2A" stroke-width="1.4"/></g>
</svg>`;
let uid = 0;
/** The pot: a willow-pattern tureen with a brass label for the money. el.set(n) */
export function tureen({ size = 150, label = 'The pot' } = {}) {
  const amount = h('b.sp-pot-n', money(0));
  const el = h('div.sp-tureen', { style: { '--sz': `${size}px` } },
    h('div.sp-tureen-art', { html: TUREEN(`sp${++uid}`) }),
    h('div.sp-pot-tag', h('span.sp-pot-l', label), amount));
  el.set = (n) => { amount.textContent = money(n); };
  return el;
}

/** Header card on the show layer: a title, one line of instruction, a timer, the pot. */
export function header(ctx, { title, line, timer = true, pot = true, tone = '' } = {}) {
  const t = timer ? timerRing() : null;
  const potEl = pot ? h('div.sp-hpot', h('span', 'Pot'), h('b', money(ctx.payload.pot))) : null;
  const el = h(`div.sp-head${tone ? `.${tone}` : ''}`,
    h('div.sp-head-row', t, h('div.sp-head-t', h('div.sp-title', title), line ? h('div.sp-line', line) : null), potEl));
  el.timer = t;
  return el;
}

/** "You're a ghost" ribbon for the dead. */
export function ghostRibbon(ctx) {
  if (!isGhost(ctx)) return null;
  const g = (ctx.payload.ghosts || []).find((x) => x.id === ctx.meId);
  return h('div.sp-ghostband', h('span.ic', { html: WISP }), g?.how === 'poisoned' ? 'Poisoned. You haunt the table now.' : 'Banished. You haunt the table now.');
}

export const WISP = '<svg viewBox="0 0 24 24"><path d="M12 3c-4 0-7 3-7 7v9l2.3-1.6L9.6 19l2.4-1.6 2.4 1.6 2.3-1.6L19 19v-9c0-4-3-7-7-7z" fill="currentColor" opacity=".9"/><circle cx="9.5" cy="10" r="1.3" fill="#2A1A17"/><circle cx="14.5" cy="10" r="1.3" fill="#2A1A17"/></svg>';
export const VIAL = '<svg viewBox="0 0 48 64"><path d="M18 4h12v6h-2v12c8 3 13 10 13 19 0 12-8 20-17 20S7 53 7 41c0-9 5-16 13-19V10h-2z" fill="#3E8E5A" stroke="#C89B3C" stroke-width="2.6" stroke-linejoin="round"/><path d="M10 41c4 3 9 4 14 4s10-1 14-4c0 9-6 16-14 16s-14-7-14-16z" fill="#7BD07F" opacity=".85"/><circle cx="20" cy="47" r="2.2" fill="#E6FFD8"/><circle cx="28" cy="51" r="1.6" fill="#E6FFD8"/><path d="M16 4h16" stroke="#C89B3C" stroke-width="3" stroke-linecap="round"/><path d="M17 31c-3 2-5 5-5 9" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".5" fill="none"/></svg>';
export const SPOON = '<svg viewBox="0 0 48 64"><ellipse cx="24" cy="15" rx="11" ry="13" fill="#E9DCC4" stroke="#8A6A2A" stroke-width="2.4"/><path d="M22 27h4l2 32a4 4 0 0 1-8 0z" fill="#E9DCC4" stroke="#8A6A2A" stroke-width="2.4" stroke-linejoin="round"/><path d="M19 10c1-3 3-4 5-4" stroke="#fff" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg>';
export const SHIELD = '<svg viewBox="0 0 24 24"><path d="M12 2.5 4 5.5v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10v-6z" fill="#C89B3C" stroke="#7A5418" stroke-width="1.6" stroke-linejoin="round"/><path d="M8.5 12l2.4 2.4 4.6-5" fill="none" stroke="#FBF4EA" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
export const FINGER = '<svg viewBox="0 0 24 24"><path d="M4 11.5h9.5a1.8 1.8 0 0 0 0-3.6H8.6l.9-2.6a1.6 1.6 0 0 0-2.9-1.3L3 9v8.5c0 1.4 1.1 2.5 2.5 2.5H12a1.8 1.8 0 0 0 0-3.5h.6a1.8 1.8 0 0 0 0-3.5h.6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" transform="scale(-1 1) translate(-24 0)"/><path d="M13 8h8" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';
export const MOON = '<svg viewBox="0 0 48 48"><path d="M30 6a18 18 0 1 0 12 30A16 16 0 0 1 30 6z" fill="#F3E6CF"/><circle cx="22" cy="20" r="2.4" fill="#E6D3B8"/><circle cx="16" cy="30" r="1.6" fill="#E6D3B8"/></svg>';
export const PARCEL = '<svg viewBox="0 0 96 96"><rect x="14" y="34" width="68" height="52" rx="6" fill="#B5527E" stroke="#5E1E3C" stroke-width="3"/><rect x="10" y="26" width="76" height="16" rx="5" fill="#C9659A" stroke="#5E1E3C" stroke-width="3"/><rect x="42" y="26" width="12" height="60" fill="#E0A526" stroke="#7A5418" stroke-width="2.4"/><path d="M48 26c-8-14-26-14-22-2 2 5 14 4 22 2zM48 26c8-14 26-14 22-2-2 5-14 4-22 2z" fill="#E0A526" stroke="#7A5418" stroke-width="2.4" stroke-linejoin="round"/><path d="M20 50h18M20 60h12" stroke="#FBF4EA" stroke-width="3" stroke-linecap="round" opacity=".5"/></svg>';

/** A name button for picking a player (point / vote / night). */
export function nameBtn(ctx, id, { e2e, onPick, dark = false } = {}) {
  const b = h(`button.sp-pick${dark ? '.dark' : ''}`, { type: 'button', 'data-e2e': e2e || `sp-pick-${id}`, style: { '--pc': colourOf(ctx, id) } },
    disc(ctx, id, { size: 36 }), h('span.nm', nameOf(ctx, id)), h('span.tick', { html: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.4 4.4L19 7.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' }));
  b.dataset.id = id;
  return b;
}

/** Stable pseudo-random 0..1 from a seed + key (same on every phone). */
export function srand(seed, key) {
  let x = 2166136261 ^ seed;
  for (const ch of String(key)) x = Math.imul(x ^ ch.charCodeAt(0), 16777619);
  return ((x >>> 0) % 10000) / 10000;
}
