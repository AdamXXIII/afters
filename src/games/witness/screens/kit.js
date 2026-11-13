// Character Witness shared bits: avatar discs, the dock card (who's on the stand + the question),
// statement cards (answers in the players' handwriting), the wax seal, small timing helpers.
import { h, onTap, timerRing } from '../../../ui/components.js';
import { AVATARS } from '../../../game/constants.js';
import { avatarIcon } from '../../../ui/icons.js';

export const LETTERS = 'ABCDEFGHIJ';

export const colourOf = (pl) => AVATARS[pl?.avatar]?.colour || '#7A4A2A';

export function disc(player, { size = 30, cls = '' } = {}) {
  return h(`span.wt-av${cls}`, { style: { '--pc': colourOf(player), width: `${size}px`, height: `${size}px` }, title: player?.name || '', html: avatarIcon(player?.avatar ?? 0) });
}

/** Avatar + name pill. */
export function tag(player, { meId = null, cls = '' } = {}) {
  const me = meId && player?.id === meId;
  return h(`span.wt-tag${cls}${me ? '.you' : ''}`, { style: { '--pc': colourOf(player) } }, disc(player, { size: 26 }), h('span.nm', me ? 'You' : player?.name || '?'));
}

/** Seeded -max..max from a seed + key (same on every phone). */
export function tilt(seed, key, max = 2) {
  let x = 2166136261 ^ (seed >>> 0);
  for (const ch of String(key)) x = Math.imul(x ^ ch.charCodeAt(0), 16777619);
  return (((x >>> 0) % 10000) / 10000 - 0.5) * 2 * max;
}

/** Brass dock rail drawn round an avatar: the person on the stand. */
export function dock(player, { size = 64, cls = '' } = {}) {
  return h(`div.wt-dock${cls}`, { style: { '--pc': colourOf(player), '--sz': `${size}px` } },
    disc(player, { size }),
    h('span.wt-rail', { html: '<svg viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden="true"><path d="M2 10h96" stroke-width="5"/><path d="M8 10v22M29 10v22M50 10v22M71 10v22M92 10v22" stroke-width="3.6"/><path d="M2 32h96" stroke-width="4"/></svg>' }));
}

/**
 * The dock card on the show layer: who's on the stand, the question about them, a timer.
 * p = phase payload ({defendant, q, index, count, final})
 */
export function dockCard(ctx, p, { timer = true, compact = false } = {}) {
  const def = ctx.player(p.defendant);
  const me = p.defendant === ctx.meId;
  const t = timer ? timerRing() : null;
  const who = h('div.wt-who',
    h('span.wt-who-n', me ? 'You' : def?.name || '?'),
    h('span.wt-who-s', p.final ? (me ? 'are on the stand, ×2' : 'on the stand, ×2') : (me ? 'are in the dock' : 'in the dock')));
  const q = h('div.wt-q', p.q);
  const len = p.q.length;
  const card = h(`div.wt-dockcard${p.final ? '.final' : ''}${compact ? '.compact' : ''}${len > 58 ? '.long' : ''}${len > 80 ? '.xlong' : ''}`,
    h('div.wt-dc-head', dock(def, { size: compact ? 40 : 48 }), who,
      p.final ? h('span.wt-x2', '×2') : h('span.wt-count', `${(p.index ?? 0) + 1}/${p.count ?? 1}`),
      t),
    q);
  card.timer = t;
  return card;
}

/** A written statement: the answer in handwriting on a ruled card, with an optional letter. */
export function statement(text, { letter = null, cls = '', seed = 1, key = '' } = {}) {
  const el = h(`div.wt-stmt${cls}`, { style: { '--tilt': `${tilt(seed, `st${key}`, 1.6)}deg` } },
    letter ? h('span.wt-stmt-l', letter) : null,
    h(`div.wt-stmt-t${text.length > 30 ? '.long' : ''}`, text));
  return el;
}

/** Claret wax seal (the sworn mark). */
export function seal(label = 'Sworn', cls = '') {
  return h(`div.wt-seal${cls}`, { html: `<svg class="blob" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 4c7 0 9 6 15 8s12-1 16 4 1 11 4 16 9 8 9 15-6 9-8 15 1 12-4 16-11 1-16 4-8 9-15 9-9-6-15-8-12 1-16-4-1-11-4-16-9-8-9-15 6-9 8-15-1-12 4-16 11-1 16-4 8-9 15-9z"/><circle cx="50" cy="50" r="31" fill="none" stroke="rgba(255,226,214,.45)" stroke-width="2" stroke-dasharray="3 3"/></svg><span class="wt-seal-t">${label}</span>` });
}

/** Fire Cyril's line once per mount. */
export function sayLater(ctx, lines, { delay = 500, ...o } = {}) {
  if (!lines) return () => {};
  const t = setTimeout(() => ctx.say(lines, { hold: 2600, placement: 'side', ...o }), ctx.frozen ? 0 : delay);
  return () => clearTimeout(t);
}

export function skipBtn(ctx, show) {
  if (!ctx.isHost) return null;
  const b = h('button.wt-skip', { type: 'button', 'data-e2e': 'skip' }, 'Skip');
  onTap(b, () => ctx.client.skip());
  show.append(b);
  return (c) => b.classList.toggle('on', c.elapsed() > 2000 / (c.phase?.speed || 1));
}

/** Count an element's number up to `to` (instant when frozen). */
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

export const firstName = (pl) => (pl?.name || '?');
