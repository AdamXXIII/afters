// Many Happy Returns: shared screen bits. Card faces and backs (hand-drawn SVG medallions), the
// turn banner, the seat row, the pile, Cyril's stings. Scoped .rt-*.
// AI-generated (Claude, Many Happy Returns builder, 2026-11-13).
import { h, timerRing } from '../../../ui/components.js';
import { AVATARS } from '../../../game/constants.js';
import { avatarIcon } from '../../../ui/icons.js';
import { hapticsEnabled } from '../../../ui/haptics.js';
import { KINDS, FLAVOUR } from '../cards.js';

export const nameOf = (ctx, id) => (id === ctx.meId ? 'You' : ctx.player(id)?.name || 'Someone');
export const ownName = (ctx, id) => ctx.player(id)?.name || 'Someone';
export const colourOf = (ctx, id) => AVATARS[ctx.player(id)?.avatar]?.colour || '#7A4A2A';
export const isMe = (ctx, id) => id === ctx.meId;
export const possessive = (ctx, id) => (isMe(ctx, id) ? 'Your' : `${ownName(ctx, id)}’s`);

// ---------- icons: one stroke family (2.6 px, round caps), linen on the card's colour ----------
const S = 'fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"';
export const ICON = {
  peek: `<svg viewBox="0 0 40 40" ${S}><path d="M4 20c4-7 9.5-10.5 16-10.5S32 13 36 20c-4 7-9.5 10.5-16 10.5S8 27 4 20z"/><circle cx="20" cy="20" r="5.2"/><circle cx="21.8" cy="18.2" r="1.3" fill="currentColor" stroke="none"/></svg>`,
  skip: `<svg viewBox="0 0 40 40" ${S}><path d="M6 28c2-10 8-15 15-15 5 0 9 2.5 11.5 7"/><path d="M33.5 12.5l-1 8-7.8-1.6"/><path d="M5 33h30" stroke-dasharray="1 5.5"/></svg>`,
  shuffle: `<svg viewBox="0 0 40 40" ${S}><path d="M5 12h6c8 0 10 16 18 16h5"/><path d="M5 28h6c3 0 5-2.4 6.6-5.4M22.4 17.4C24 14.4 26 12 29 12h5"/><path d="M30 7.5l4.5 4.5L30 16.5M30 23.5l4.5 4.5L30 32.5"/></svg>`,
  pinch: `<svg viewBox="0 0 40 40" ${S}><path d="M8 33c-1.5-5 .5-9 4-11l7-4"/><path d="M19 18c-2.5-4-2.5-8 0-11"/><path d="M19 18l9-6.5c2-1.4 4.6.8 3.2 3L27 21c-2 3-5.4 4.4-9 4"/><rect x="21" y="25" width="11" height="9" rx="1.6" transform="rotate(-14 26 29)"/></svg>`,
  plate: `<svg viewBox="0 0 40 40" ${S}><ellipse cx="17" cy="24" rx="12" ry="5"/><ellipse cx="17" cy="23.4" rx="6.6" ry="2.4"/><path d="M27 12h8M31.5 8.5L35 12l-3.5 3.5"/><path d="M8 13.5h3.5M9.8 11.7v3.6" /></svg>`,
  steady: `<svg viewBox="0 0 40 40" ${S}><path d="M13 21V10a2.4 2.4 0 0 1 4.8 0v8"/><path d="M17.8 17V7.5a2.4 2.4 0 0 1 4.8 0V17"/><path d="M22.6 17.5V9.5a2.4 2.4 0 0 1 4.8 0V20"/><path d="M27.4 20v-5.5a2.3 2.3 0 0 1 4.6 0V24c0 6-4 10-10 10-4.4 0-7-2-9-5.5L9 22.4a2.4 2.4 0 0 1 4-2.4l2 2.5"/></svg>`,
  breath: `<svg viewBox="0 0 40 40" ${S}><circle cx="13" cy="20" r="9"/><path d="M10.5 17.2v.1M15.5 17.2v.1" stroke-width="3.2"/><circle cx="17.6" cy="22.6" r="1.8"/><path d="M23.5 18h9.5c2.2 0 3.2-2.6 1.5-4"/><path d="M24 23h12"/><path d="M23.5 28h7.5c2.2 0 3.2 2.6 1.5 4"/></svg>`,
  cake: `<svg viewBox="0 0 40 40" ${S}><path d="M7 34V22h26v12"/><path d="M7 26c3 2.5 6.5 2.5 9.5 0s6.5-2.5 9.5 0 5.5 2.5 7 1"/><path d="M4.5 34h31"/><path d="M14 22v-6M20 22v-6M26 22v-6"/><path d="M14 9.5c1.2 1.6 1.6 2.6.4 3.8M20 9.5c1.2 1.6 1.6 2.6.4 3.8M26 9.5c1.2 1.6 1.6 2.6.4 3.8"/></svg>`,
  back: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 34h10M16 34V19.5c0-1.4 1.8-2.5 4-2.5s4 1.1 4 2.5V34"/><path d="M20 8c2.6 2.8 3.6 4.6 3.6 6.4a3.6 3.6 0 0 1-7.2 0c0-1.8 1-3.6 3.6-6.4z" fill="currentColor" fill-opacity=".25"/></svg>`,
};

/** A big illustrated birthday cake (the dread). Candles flicker in CSS; `.out` blows them out. */
export function cakeArt(cls = '') {
  return h(`div.rt-cakeart${cls}`, {
    html: `<svg viewBox="0 0 200 170" aria-hidden="true">
<ellipse cx="100" cy="158" rx="84" ry="9" fill="#1A0B07" opacity=".35"/>
<ellipse cx="100" cy="148" rx="86" ry="14" fill="#FBF4EA" stroke="#3B1F18" stroke-width="3.5"/>
<path d="M30 92h140v48c0 6-31 11-70 11s-70-5-70-11z" fill="#F3E6CF" stroke="#3B1F18" stroke-width="3.5"/>
<path d="M30 112c0 6 31 11 70 11s70-5 70-11" fill="none" stroke="#C89B3C" stroke-width="3"/>
<ellipse cx="100" cy="92" rx="70" ry="13" fill="#FBF4EA" stroke="#3B1F18" stroke-width="3.5"/>
<path d="M31 94c0 8 6 12 10 6s6 10 12 4 6 12 13 4 7 10 13 3 7 12 14 4 6 10 13 3 7 10 13 3 6 9 12 2 7 8 10-4" fill="none" stroke="#7A1E2C" stroke-width="7" stroke-linecap="round"/>
<g fill="#E2553B" stroke="#3B1F18" stroke-width="2"><circle cx="58" cy="132" r="4"/><circle cx="100" cy="137" r="4"/><circle cx="142" cy="132" r="4"/></g>
<g stroke="#3B1F18" stroke-width="2.6">
  <rect x="55" y="54" width="9" height="34" rx="2.5" fill="#E0A526"/><rect x="77" y="48" width="9" height="40" rx="2.5" fill="#2F5D7C"/>
  <rect x="98" y="44" width="9" height="44" rx="2.5" fill="#E2553B"/><rect x="119" y="48" width="9" height="40" rx="2.5" fill="#7F9A74"/>
  <rect x="140" y="54" width="9" height="34" rx="2.5" fill="#B5527E"/>
</g>
<g class="flames">
  <g class="fl" style="--d:0s"><ellipse cx="59.5" cy="44" rx="9" ry="12" class="glow"/><path d="M59.5 34c4.6 5 6 8 6 10.4a6 6 0 0 1-12 0c0-2.4 1.4-5.4 6-10.4z" class="core"/></g>
  <g class="fl" style="--d:.13s"><ellipse cx="81.5" cy="38" rx="9" ry="12" class="glow"/><path d="M81.5 28c4.6 5 6 8 6 10.4a6 6 0 0 1-12 0c0-2.4 1.4-5.4 6-10.4z" class="core"/></g>
  <g class="fl" style="--d:.27s"><ellipse cx="102.5" cy="34" rx="9" ry="12" class="glow"/><path d="M102.5 24c4.6 5 6 8 6 10.4a6 6 0 0 1-12 0c0-2.4 1.4-5.4 6-10.4z" class="core"/></g>
  <g class="fl" style="--d:.06s"><ellipse cx="123.5" cy="38" rx="9" ry="12" class="glow"/><path d="M123.5 28c4.6 5 6 8 6 10.4a6 6 0 0 1-12 0c0-2.4 1.4-5.4 6-10.4z" class="core"/></g>
  <g class="fl" style="--d:.2s"><ellipse cx="144.5" cy="44" rx="9" ry="12" class="glow"/><path d="M144.5 34c4.6 5 6 8 6 10.4a6 6 0 0 1-12 0c0-2.4 1.4-5.4 6-10.4z" class="core"/></g>
</g>
<g class="smoke" fill="none" stroke="#E6D3B8" stroke-width="3" stroke-linecap="round">
  <path d="M59.5 46c-5-7 5-11 0-19"/><path d="M81.5 40c-5-7 5-11 0-19"/><path d="M102.5 36c-5-7 5-11 0-19"/><path d="M123.5 40c-5-7 5-11 0-19"/><path d="M144.5 46c-5-7 5-11 0-19"/>
</g>
</svg>`,
  });
}

/** A card face. size: 'hand' | 'big' | 'mini'. */
export function cardFace(ctx, card, { size = 'hand', cls = '', occ = null } = {}) {
  const K = KINDS[card.k] || KINDS.peek;
  const bank = FLAVOUR[ctx.adult ? 'adult' : 'family'][card.k];
  const flavour = card.k === 'cake' ? (occ || '') : bank ? bank[(card.f ?? 0) % bank.length] : '';
  const el = h(`div.rt-card.${size}.k-${card.k}${cls}`, { style: { '--kc': K.colour, '--kl': K.lip }, 'data-k': card.k },
    h('div.rt-card-band', h('span.rt-card-n', K.name)),
    h('div.rt-card-med', { html: ICON[card.k] || '' }),
    h('div.rt-card-rule', K.rule),
    size === 'big' && flavour ? h('div.rt-card-fl', flavour) : null);
  return el;
}

/** The back of a card (the pile). */
export function cardBack({ cls = '' } = {}) {
  return h(`div.rt-back${cls}`, h('div.rt-back-in', { html: ICON.back }), h('span.rt-back-w', 'Many Happy Returns'));
}

export function disc(ctx, id, { size = 34, cls = '' } = {}) {
  const pl = ctx.player(id);
  return h(`span.rt-av${cls}`, { style: { '--pc': colourOf(ctx, id), width: `${size}px`, height: `${size}px` }, title: pl?.name || '', html: avatarIcon(pl?.avatar ?? 0) });
}

/**
 * The turn banner: whose turn, unmissable. Mine = claret with the candle glow; theirs = their colour.
 * `label` overrides the text (e.g. "Jo plays").
 */
export function banner(ctx, { who = ctx.payload.turn, label = null, sub = null, timer = true, cls = '' } = {}) {
  const me = isMe(ctx, who);
  const t = timer ? timerRing() : null;
  const two = ctx.payload.turnsLeft > 1 && who === ctx.payload.turn;
  const text = label || (me ? 'Your turn' : `${ownName(ctx, who)}’s turn`);
  const el = h(`div.rt-banner${me ? '.mine' : ''}${cls}`, { style: { '--pc': colourOf(ctx, who) } },
    h('span.rt-banner-av', disc(ctx, who, { size: 44, cls: '.ring' }), two ? h('span.rt-two', { title: 'Two turns' }, '×2') : null),
    h('div.rt-banner-t', h('div.rt-banner-n', text), sub ? h('div.rt-banner-s', sub) : null),
    t);
  el.timer = t;
  return el;
}

/** Everyone round the table: hand counts, whose turn, who's out. */
export function seats(ctx, { highlight = ctx.payload.turn } = {}) {
  const p = ctx.payload;
  const order = p.order || ctx.players.map((x) => x.id);
  const out = new Set(p.out || []);
  const many = order.length > 6;
  return h(`div.rt-seats${many ? '.many' : ''}`, order.map((id) => {
    const gone = out.has(id);
    return h(`div.rt-seat${id === highlight && !gone ? '.on' : ''}${gone ? '.gone' : ''}${isMe(ctx, id) ? '.me' : ''}`, { style: { '--pc': colourOf(ctx, id) } },
      h('div.rt-seat-av', disc(ctx, id, { size: many ? 30 : 34 }), gone ? h('span.rt-seat-x', { html: ICON.cake }) : h('span.rt-seat-c', String(p.counts?.[id] ?? 0))),
      h('span.rt-seat-nm', isMe(ctx, id) ? 'You' : ownName(ctx, id)));
  }));
}

/** The draw pile with its count and the cake meter. */
export function pile(ctx, { big = false, onTap = null } = {}) {
  const p = ctx.payload;
  const n = p.pile ?? 0;
  const cakes = p.cakes ?? 0;
  const layers = Math.min(5, Math.max(1, Math.ceil(n / 5)));
  const stack = h(`div.rt-pile${big ? '.big' : ''}${onTap ? '.tap' : ''}`, { style: { '--layers': layers } },
    Array.from({ length: layers - 1 }, (_, i) => h('div.rt-pile-l', { style: { '--i': i + 1 } })),
    cardBack({ cls: '.top' }));
  const odds = n ? Math.round((cakes / n) * 100) : 0;
  const meter = h('div.rt-meter',
    h('div.rt-meter-n', h('b', String(n)), h('span', n === 1 ? 'card left' : 'cards left')),
    h('div.rt-meter-cakes', { 'aria-label': `${cakes} cakes in the pile` },
      Array.from({ length: cakes }, () => h('span.rt-meter-cake', { html: ICON.cake })),
      h('span.rt-meter-t', `${cakes} ${cakes === 1 ? 'cake' : 'cakes'} in there`)),
    h('div.rt-odds', { style: { '--odds': `${Math.min(100, odds)}%` } }, h('i'), h('span', `${odds}% chance the next card is cake`)));
  return { stack, meter, el: h(`div.rt-pilezone${big ? '.big' : ''}`, stack, meter) };
}

/** What just happened, in one line (top of the next turn). */
export function lastLine(ctx, last) {
  if (!last) return null;
  const by = nameOf(ctx, last.by);
  const K = (k) => KINDS[k]?.name || 'a card';
  switch (last.kind) {
    case 'cancelled': return `Steady On! ${possessive(ctx, last.by)} ${K(last.k)} was cancelled.`;
    case 'skip': return `${by} skipped.`;
    case 'plate': return `${by} passed the plate. ${isMe(ctx, last.next) ? 'You take' : `${ownName(ctx, last.next)} takes`} two turns.`;
    case 'shuffle': return `${by} shuffled the pile.`;
    case 'pinch': return `${by} pinched a card from ${isMe(ctx, last.target) ? 'you' : ownName(ctx, last.target)}.`;
    case 'pinch-empty': return `${by} tried to pinch from an empty hand.`;
    case 'drew': return last.auto ? `${by} ran out of time and drew. Safe.` : `${by} drew. Safe.`;
    case 'tucked': return `${by} blew out a cake and hid it back in the pile.`;
    case 'out': return `${by} drew a cake. Out.`;
    default: return null;
  }
}

/** Cyril speaks after a beat (instantly in screenshots). Returns a cancel fn. */
export function sayLater(ctx, lines, { delay = 600, ...o } = {}) {
  if (!lines) return () => {};
  const t = setTimeout(() => ctx.say(lines, { hold: 2400, placement: 'side', compact: true, ...o }), ctx.frozen ? 0 : delay);
  return () => clearTimeout(t);
}

export function buzz(pattern) {
  if (!hapticsEnabled() || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try { navigator.vibrate(pattern); } catch { /* ignore */ }
}

/** Synth stings for this game (falls back silently when audio is locked or off). */
export function sting(ctx, name) {
  const a = ctx.audio;
  if (ctx.frozen || !a?.ctx || a.settings?.sfx === false || typeof a.tone !== 'function') { a?.sfx?.(name === 'cake' ? 'drumroll' : 'tap'); return; }
  try {
    if (name === 'cake') {
      // "Happy Birthday" first four notes, wrong, then a brass stab and a shiver
      [392, 392, 440, 392].forEach((f, i) => a.tone(f, { type: 'triangle', when: i * 0.13, decay: 0.16, gain: 0.22 }));
      [196, 233, 277].forEach((f) => a.tone(f, { type: 'sawtooth', when: 0.6, decay: 0.9, gain: 0.12, detune: 8 }));
      a.noise({ when: 0.6, dur: 0.5, type: 'bandpass', freq: 3200, q: 2, gain: 0.08 });
      a.tone(55, { type: 'sine', when: 0.6, decay: 0.5, gain: 0.35, freqEnd: 40 });
    } else if (name === 'blow') {
      a.noise({ dur: 0.7, type: 'bandpass', freq: 600, freqEnd: 2400, q: 0.7, gain: 0.3, attack: 0.05 });
      [523, 659, 784, 1047].forEach((f, i) => a.tone(f, { type: 'sine', when: 0.5 + i * 0.09, decay: 0.4, gain: 0.16 }));
    } else if (name === 'out') {
      [311, 294, 277, 247].forEach((f, i) => a.tone(f, { type: 'sawtooth', when: i * 0.32, decay: i === 3 ? 0.9 : 0.3, gain: 0.12, freqEnd: i === 3 ? 196 : null }));
    } else if (name === 'turn') {
      a.tone(784, { type: 'sine', decay: 0.25, gain: 0.2 });
      a.tone(1175, { type: 'sine', when: 0.1, decay: 0.45, gain: 0.18 });
    } else if (name === 'flip') {
      a.noise({ dur: 0.12, type: 'bandpass', freq: 1800, freqEnd: 900, q: 1, gain: 0.2 });
    } else if (name === 'steady') {
      a.tone(180, { type: 'square', decay: 0.18, gain: 0.12, freqEnd: 120 });
      a.noise({ dur: 0.08, type: 'lowpass', freq: 900, gain: 0.3 });
    } else a.sfx(name);
  } catch { /* ignore */ }
}
