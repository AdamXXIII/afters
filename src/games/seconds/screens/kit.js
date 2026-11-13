// Who Had Seconds? shared bits: task-type icons, avatar discs, the top card, the countdown sounds.
import { h, timerRing, onTap } from '../../../ui/components.js';
import { AVATARS } from '../../../game/constants.js';
import { avatarIcon } from '../../../ui/icons.js';

// Drawn icons, one stroke weight (2.6 on a 32 grid), round caps. currentColor.
const S = (d) => `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const TYPE_ICON = {
  hands: S('<path d="M10.5 17V7.5M14.5 15V5M18.5 15V5.5M22.5 16.5V9"/><path d="M22.5 16.5v4a7 7 0 0 1-7 7h-1c-2.6 0-4.3-1.2-5.6-3.2L5.5 19c-.8-1.3.9-2.8 2.2-1.6L10.5 20V17"/>'),
  number: S('<path d="M12.5 16 9.5 5.5M18.5 16l3-10.5"/><path d="M22.5 15.5v5a7 7 0 0 1-7 7h-1a6 6 0 0 1-6-6v-5c0-1.4 1-2.5 2.5-2.5h9.8c1 0 1.7.7 1.7 1.5Z"/><path d="M13 18.5h7"/>'),
  point: S('<path d="M15 13.5h13"/><path d="M15 13.5h-4.5a5.5 5.5 0 0 0-5.5 5.5v1a6 6 0 0 0 6 6h3.5a3 3 0 0 0 0-6"/><path d="M11 20h7.5a2.75 2.75 0 0 0 0-5.5"/><path d="M8 13.5 11.5 9"/>'),
  face: S('<circle cx="16" cy="16" r="12"/><path d="M11 12.5v1.5M21 12.5v1.5"/><path d="M10 21c2-1.8 3.7.8 6-.6s4-1.4 6 .6"/>'),
};
export const TYPE_NAME = { hands: 'Hands up', number: 'Fingers', point: 'Point', face: 'Face' };
export const TYPE_SHOUT = { hands: 'Hands!', number: 'Fingers!', point: 'Point!', face: 'Face!' };
export const FINGER = S('<path d="M4 16h14"/><path d="M18 16h-1a4 4 0 0 0-4 4v1.5a5.5 5.5 0 0 0 5.5 5.5h4a5.5 5.5 0 0 0 5.5-5.5V19a3 3 0 0 0-3-3h-7"/><path d="M19 21.5h6"/>');
export const HOLD = S('<path d="M16 6a8 8 0 0 0-8 8v3M24 14a8 8 0 0 0-3-6.2"/><path d="M16 10a4 4 0 0 0-4 4v5a10 10 0 0 0 1.5 5.2M20 14v4a14 14 0 0 1-1.6 6.5"/><path d="M16 14v6"/>');

export function disc(player, { size = 30, cls = '' } = {}) {
  const colour = AVATARS[player?.avatar]?.colour || '#7A4A2A';
  return h(`span.sc-av${cls}`, { style: { '--pc': colour, width: `${size}px`, height: `${size}px` }, title: player?.name || '', html: avatarIcon(player?.avatar ?? 0) });
}

export function typeBadge(type, { big = false } = {}) {
  return h(`span.sc-type.${type}${big ? '.big' : ''}`, h('span.ic', { html: TYPE_ICON[type] }), h('span', TYPE_NAME[type]));
}

/** "Turn 2 · Task 1 of 3" (or "Last call") as plain words. */
export function where(p) {
  if (p.final) return 'Last call';
  return `Faker ${p.turn + 1} of ${p.turns} · Task ${p.task + 1} of ${p.tasks}`;
}

/** Top card on the show layer: timer, where we are, the title. */
export function topCard(p, title, { timer = true, sub = null } = {}) {
  const t = timer ? timerRing() : null;
  const card = h('div.sc-top',
    h('div.sc-topcard',
      h('div.sc-tophead', t, h('div.sc-where', where(p)), typeBadge(p.type)),
      h('div.sc-title', title),
      sub ? h('div.sc-sub', sub) : null));
  card.timer = t;
  return card;
}

export function say(ctx, lines, o = {}, delay = 500) {
  if (!lines) return () => {};
  const t = setTimeout(() => ctx.say(lines, { hold: 2600, placement: 'side', ...o }), ctx.frozen ? 0 : delay);
  return () => clearTimeout(t);
}

export function skipBtn(ctx, show, after = 1500) {
  if (!ctx.isHost) return null;
  const b = h('button.sc-skip', { type: 'button', 'data-e2e': 'skip' }, 'Skip');
  onTap(b, () => ctx.client.skip());
  show.append(b);
  return (c) => b.classList.toggle('on', c.elapsed() > after / (c.phase?.speed || 1));
}

/** Seeded 0..1 (same on every phone). */
export function srand(seed, key) {
  let x = 2166136261 ^ seed;
  for (const ch of String(key)) x = Math.imul(x ^ ch.charCodeAt(0), 16777619);
  return ((x >>> 0) % 10000) / 10000;
}

export const clamp01 = (k) => Math.min(1, Math.max(0, k));
export const easeOut = (k) => 1 - (1 - clamp01(k)) ** 3;

/** The row of folded place cards, one of them turned the other way (the faker). */
export function placeCards({ n = 5, odd = 2, two = false } = {}) {
  const cards = Array.from({ length: n }, (_, i) => {
    const isOdd = i === odd || (two && i === n - 1);
    return h(`span.sc-pcard${isOdd ? '.odd' : ''}`, { style: { '--i': i, '--tilt': `${(i - (n - 1) / 2) * 5}deg` } }, isOdd ? '?' : '');
  });
  return h('div.sc-pcards', cards);
}

// ---------- countdown sounds (WebAudio, built from the box synth's primitives) ----------
export function countBeep(audio, k) {
  // k = 3, 2, 1: a woodblock knock that climbs, so the room hears the count coming
  if (!audio?.ctx || !audio.settings?.sfx) return;
  const f = { 3: 660, 2: 784, 1: 988 }[k] || 660;
  try {
    audio.noise({ dur: 0.05, freq: f * 1.6, q: 8, gain: 0.7 });
    audio.tone(f, { decay: 0.18, gain: 0.32 });
    audio.tone(f / 2, { decay: 0.12, gain: 0.12 });
  } catch { /* audio is best effort */ }
}

export function nowHit(audio) {
  if (!audio?.ctx || !audio.settings?.sfx) return;
  try {
    [1319, 1661, 1976, 2637].forEach((f, i) => audio.tone(f, { decay: 0.9 - i * 0.15, gain: 0.16, type: i ? 'sine' : 'triangle' }));
    audio.tone(110, { freqEnd: 55, decay: 0.3, gain: 0.5 });
    audio.noise({ dur: 0.5, type: 'highpass', freq: 5000, gain: 0.12 });
  } catch { /* best effort */ }
}

export function freezeHit(audio) {
  if (!audio?.ctx || !audio.settings?.sfx) return;
  try { audio.tone(523, { freqEnd: 392, decay: 0.35, gain: 0.18, type: 'triangle' }); } catch { /* best effort */ }
}
