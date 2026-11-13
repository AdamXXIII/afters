// Pardon? shared bits: avatar discs, the ear trumpet, the gibberish card, skip button, Cyril helper.
import { h, onTap } from '../../../ui/components.js';
import { AVATARS } from '../../../game/constants.js';
import { avatarIcon } from '../../../ui/icons.js';

export const say = (ctx, lines, o = {}, delay = 600) => {
  if (!lines) return () => {};
  const t = setTimeout(() => ctx.say(lines, { hold: 2600, placement: 'side', ...o }), ctx.frozen ? 0 : delay);
  return () => clearTimeout(t);
};

export const colourOf = (pl) => AVATARS[pl?.avatar]?.colour || '#7A4A2A';

export function disc(player, { size = 30, cls = '' } = {}) {
  return h(`span.pd-av${cls}`, { style: { '--pc': colourOf(player), width: `${size}px`, height: `${size}px` }, title: player?.name || '', html: avatarIcon(player?.avatar ?? 0) });
}

export const easeOut = (k) => 1 - (1 - Math.min(1, Math.max(0, k))) ** 3;

/** Seeded 0..1 from seed + key (same on every phone). */
export function srand(seed, key) {
  let x = 2166136261 ^ seed;
  for (const ch of String(key)) x = Math.imul(x ^ ch.charCodeAt(0), 16777619);
  return ((x >>> 0) % 10000) / 10000;
}

/** The ear trumpet: Cyril's hearing aid, the game's one drawn idea. */
export const TRUMPET = `<svg viewBox="0 0 120 80" aria-hidden="true">
<defs><linearGradient id="pdBr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F2CF7A"/><stop offset=".55" stop-color="#C89B3C"/><stop offset="1" stop-color="#8A6420"/></linearGradient>
<radialGradient id="pdBell" cx="35%" cy="40%" r="70%"><stop offset="0" stop-color="#3B1F18"/><stop offset="1" stop-color="#120806"/></radialGradient></defs>
<path d="M14 40c0-4 3-7 7-7h6c14 0 30-14 50-26l4 66c-20-12-36-26-54-26h-6c-4 0-7-3-7-7z" fill="url(#pdBr)" stroke="#6E4C16" stroke-width="2.4" stroke-linejoin="round"/>
<ellipse cx="80" cy="40" rx="9" ry="33" fill="url(#pdBell)" stroke="#6E4C16" stroke-width="2.4"/>
<ellipse cx="80" cy="40" rx="9" ry="33" fill="none" stroke="#FCE3A0" stroke-width="1.4" opacity=".55" transform="translate(-2 0)"/>
<path d="M30 33c10-1 24-10 38-18" stroke="#FFF4D6" stroke-width="2.6" stroke-linecap="round" fill="none" opacity=".7"/>
<circle cx="11" cy="40" r="6" fill="#5A3424" stroke="#C89B3C" stroke-width="2"/>
</svg>`;

export const NOTE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l10-2v12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="2.6" fill="currentColor"/><circle cx="16.5" cy="16" r="2.6" fill="currentColor"/></svg>';
export const SPEAKER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
export const EYE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/></svg>';
export const MOUTH = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11c3-3 6-4 9-2 3-2 6-1 9 2-3 4-6 6-9 6s-6-2-9-6z" fill="currentColor"/><path d="M5.5 11.2c2.2 1 4.4 1.4 6.5 1.4s4.3-.4 6.5-1.4" stroke="#FBF4EA" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>';

export const HINT = { Saying: 'A saying', Phrase: 'Something people say', Question: 'A question', Place: 'A place', Story: 'A story', Thing: 'A thing' };

/** The gibberish itself: words on a linen card, set big, each word a separate tile so it reads as nonsense. */
export function gibCard(text, { size = 'xl', tilt = true } = {}) {
  const words = String(text).split(/\s+/);
  const len = String(text).length;
  const fit = len > 24 ? 'long' : len > 16 ? 'mid' : 'short';
  return h(`div.pd-gib.${size}.${fit}`, words.map((w, i) => h('span.pd-word', { style: { '--r': tilt ? `${((i * 37) % 5) - 2}deg` : '0deg' } }, w)));
}

export function skipBtn(ctx, show) {
  if (!ctx.isHost) return null;
  const b = h('button.pd-skip', { type: 'button', 'data-e2e': 'skip' }, 'Skip');
  onTap(b, () => ctx.client.skip());
  show.append(b);
  return (c) => b.classList.toggle('on', c.elapsed() > 1500 / (c.phase?.speed || 1));
}

/** "Tune 2 of 5" style progress pips. */
export function pips(i, n) {
  return h('span.pd-pips', Array.from({ length: n }, (_, k) => h(`i${k < i ? '.done' : k === i ? '.now' : ''}`)));
}

/** Small standings strip (round cards 2 and 3). */
export function standings(ctx, rows = []) {
  return h('div.pd-stand', rows.slice(0, 5).map((r, i) => {
    const pl = ctx.player(r.id);
    return h(`div.pd-stand-row${i === 0 ? '.lead' : ''}`, h('span.rk', String(i + 1)), disc(pl, { size: 26 }), h('span.nm', pl?.name || '?'), h('span.sc', String(r.score)));
  }));
}
