// r2-kit: small helpers shared by the Round 2 (Porkies) screens only.
// Copied/adapted from common.js so Round 2 can diverge without touching shared files.
import './r2.css';
import { h, button } from '../ui/components.js';
import { avatarIcon } from '../ui/icons.js';
import { AVATARS } from '../game/constants.js';

export const LETTERS = 'ABCDEFGHIJ';

/** The fact with its blank. `fill` (optional) writes into the gap in handwriting. */
export function factText(text, { fill = null, gold = false } = {}) {
  const [a, b] = String(text).split('_____');
  const gap = h(`span.r2-gap${fill ? '.filled' : ''}${gold ? '.gold' : ''}`, { 'aria-label': fill || 'blank' }, h('span.r2-gap-ink', fill || ''));
  const el = h('div.r2-fact', a, gap, b ?? '');
  el.gap = gap;
  el.setFill = (t) => {
    gap.firstChild.textContent = t || '';
    gap.classList.toggle('filled', !!t);
  };
  return el;
}

/** Pig snout drawn as a wax-seal style mark (no emoji). */
export function snoutSvg({ ring = true } = {}) {
  return `<svg viewBox="0 0 64 64" aria-hidden="true">${ring ? '<circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="3 3.2"/>' : ''}<ellipse cx="32" cy="33" rx="17" ry="12.5" fill="none" stroke="currentColor" stroke-width="4"/><ellipse cx="25.5" cy="33" rx="3.4" ry="5" fill="currentColor"/><ellipse cx="38.5" cy="33" rx="3.4" ry="5" fill="currentColor"/></svg>`;
}

/** A claret wax seal with the snout pressed into it. */
export function waxSeal(cls = '') {
  return h(`div.r2-seal${cls}`, { html: `<svg class="blob" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 4c7 0 9 6 15 8s12-1 16 4 1 11 4 16 9 8 9 15-6 9-8 15 1 12-4 16-11 1-16 4-8 9-15 9-9-6-15-8-12 1-16-4-1-11-4-16-9-8-9-15 6-9 8-15-1-12 4-16 11-1 16-4 8-9 15-9z"/></svg><div class="mark">${snoutSvg()}</div>` });
}

/** Player avatar disc (colour + glyph), sized by CSS. */
export function avatarDisc(player, cls = '') {
  const colour = player?.colour || AVATARS[player?.avatar]?.colour || '#7A4A2A';
  return h(`span.r2-av${cls}`, { style: { '--pc': colour }, title: player?.name || '', html: avatarIcon(player?.avatar ?? 0) });
}

/** Avatar + name pill used on reveal cards. */
export function nameTag(player, { cls = '' } = {}) {
  return h(`span.r2-tag${cls}`, avatarDisc(player), h('span.nm', player?.name || '?'));
}

export function hostSkip(ctx, show) {
  if (!ctx.isHost) return null;
  const b = button('Skip', { kind: 'ghost', block: false, onClick: () => ctx.client.skip() });
  b.classList.add('on-dark');
  const wrap = h('div.r2-skip', b);
  wrap.style.opacity = '0';
  show.append(wrap);
  return { frame(c) { wrap.style.opacity = c.elapsed() > 3000 / (c.phase?.speed || 1) ? '1' : '0'; } };
}

/** Fire Cyril's line once per mount after `delay` ms. */
export function sayLater(ctx, lines, { delay = 400, ...o } = {}) {
  const t = setTimeout(() => ctx.say(lines, o), ctx.frozen ? 0 : delay);
  return () => clearTimeout(t);
}

/** Count a number up (frozen: jump straight to the end). */
export function countTo(el, to, { from = 0, ms = 600, prefix = '', frozen = false } = {}) {
  if (frozen) { el.textContent = `${prefix}${to}`; return; }
  const t0 = performance.now();
  const step = () => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    el.textContent = `${prefix}${Math.round(from + (to - from) * (1 - (1 - k) ** 3))}`;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Seeded number in [-max, max] (same on every phone). */
export function tilt(seed, key, max = 3) {
  let x = 2166136261 ^ (seed | 0);
  for (const ch of String(key)) x = Math.imul(x ^ ch.charCodeAt(0), 16777619);
  return (((x >>> 0) % 1000) / 1000 * 2 - 1) * max;
}
