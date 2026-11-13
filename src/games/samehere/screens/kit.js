// Same Here shared bits: avatar discs, the question card, handwritten answer cards, points pips,
// the Wobbly Chair drawing, small timing helpers. Scoped .sh-*.
// AI-generated (Claude, Same Here builder, 2026-11-13).
import { h, onTap } from '../../../ui/components.js';
import { AVATARS } from '../../../game/constants.js';
import { avatarIcon } from '../../../ui/icons.js';

export const colourOf = (pl) => AVATARS[pl?.avatar]?.colour || '#7A4A2A';
export const nameOf = (ctx, id) => (id === ctx.meId ? 'You' : ctx.player(id)?.name || 'Someone');

export function disc(player, { size = 30, cls = '' } = {}) {
  return h(`span.sh-av${cls}`, { style: { '--pc': colourOf(player), width: `${size}px`, height: `${size}px` }, title: player?.name || '', html: avatarIcon(player?.avatar ?? 0) });
}

/** Seeded -max..max from a seed + key (same on every phone). */
export function tilt(seed, key, max = 2) {
  let x = 2166136261 ^ (seed >>> 0);
  for (const ch of String(key)) x = Math.imul(x ^ ch.charCodeAt(0), 16777619);
  return (((x >>> 0) % 10000) / 10000 - 0.5) * 2 * max;
}

/**
 * The Wobbly Chair: a bentwood café chair, one back leg short, so it rocks.
 * Drawn once; CSS rocks it (.sh-chair.rock).
 */
export const CHAIR_SVG = `<svg viewBox="0 0 64 80" aria-hidden="true">
  <path class="ch-shadow" d="M10 76 h44" />
  <path class="ch-wood" d="M18 6 C 16 22 17 30 20 40 M46 6 C 48 22 47 30 44 40" />
  <path class="ch-wood" d="M18 6 C 26 1 38 1 46 6" />
  <path class="ch-wood thin" d="M20 16 C 28 13 36 13 44 16 M20 26 C 28 23 36 23 44 26" />
  <path class="ch-seat" d="M10 40 C 10 36 54 36 54 40 C 54 45 10 45 10 40 Z" />
  <path class="ch-wood" d="M14 44 L 11 75 M50 44 L 53 75 M24 45 L 23 68 M40 45 L 42 75" />
  <path class="ch-wood thin" d="M13 62 C 24 59 40 59 52 62" />
</svg>`;

export function chair({ size = 40, cls = '' } = {}) {
  return h(`span.sh-chair${cls}`, { style: { '--sz': `${size}px` }, html: CHAIR_SVG });
}

/** Points toward the target as little place settings: filled = earned. */
export function pips(score, target, { cls = '' } = {}) {
  const n = Math.max(target, score);
  return h(`span.sh-pips${cls}`, { 'aria-label': `${score} of ${target}` },
    Array.from({ length: n }, (_, i) => h(`i${i < score ? '.on' : ''}${i >= target ? '.over' : ''}`)));
}

/** The question card (show layer). */
export function questionCard(text, { round = null, compact = false, cls = '' } = {}) {
  const len = text.length;
  return h(`div.sh-qcard${compact ? '.compact' : ''}${len > 44 ? '.long' : ''}${len > 64 ? '.xlong' : ''}${cls}`,
    round ? h('span.sh-qn', `Question ${round}`) : null,
    h('div.sh-q', text));
}

/** An answer in the player's handwriting on a little place card. */
export function answerCard(text, { cls = '', seed = 1, key = '' } = {}) {
  return h(`div.sh-ans${cls}${text.length > 18 ? '.long' : ''}`, { style: { '--tilt': `${tilt(seed, `a${key}`, 1.6)}deg` } },
    h('span.sh-ans-t', text));
}

/** Fire Cyril's line once per mount. */
export function sayLater(ctx, lines, { delay = 500, ...o } = {}) {
  if (!lines) return () => {};
  const t = setTimeout(() => ctx.say(lines, { hold: 2600, placement: 'side', ...o }), ctx.frozen ? 0 : delay);
  return () => clearTimeout(t);
}

export function skipBtn(ctx, show) {
  if (!ctx.isHost) return null;
  const b = h('button.sh-skip', { type: 'button', 'data-e2e': 'skip' }, 'Skip');
  onTap(b, () => ctx.client.skip());
  show.append(b);
  return (c) => b.classList.toggle('on', c.elapsed() > 2000 / (c.phase?.speed || 1));
}

/** Who's on the chair, said plainly (for the write screen). */
export function chairNote(ctx, chairId) {
  if (!chairId) return null;
  const me = chairId === ctx.meId;
  return h(`div.sh-chairnote${me ? '.me' : ''}`, chair({ size: 30 }),
    h('span', me ? h('b', 'You’re on the Wobbly Chair.') : [h('b', ctx.player(chairId)?.name || 'Someone'), ' is on the Wobbly Chair.'],
      ' ', me ? 'It passes to the next person left on their own.' : 'They can’t win from there.'));
}
