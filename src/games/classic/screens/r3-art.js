// Round 3 (Last Orders) shared art + helpers. Owned by the Round 3 team; screens r3-* only.
// Hand-drawn SVG props (brass bell, wine glass, ticket edge) and a lateness-aware timeline.
import { SHOTS } from '../../../stage/Stage.js';

// Camera shots for the finale (added at runtime so the shared SHOTS table stays untouched).
// Cyril framed small and high so the HTML cards below never sit on his face.
SHOTS['r3-intro'] ??= { pos: [0, 0.5, 1.5], target: [0, -0.04, 0] };
SHOTS['r3-swipe'] ??= { pos: [0, 0.62, 1.12], target: [0, 0.16, 0] };
SHOTS['r3-reveal'] ??= { pos: [0, 0.56, 1.75], target: [0, -0.16, 0] };

const uid = (() => { let n = 0; return (p) => `${p}${++n}`; })();

/** Brass pub bell on a wall bracket. */
export function bellSvg() {
  const g = uid('bg');
  return `<svg viewBox="0 0 120 120" aria-hidden="true">
  <defs>
    <linearGradient id="${g}" x1="0" x2="1">
      <stop offset="0" stop-color="#8A6420"/><stop offset=".28" stop-color="#E9C46A"/><stop offset=".5" stop-color="#FFE6A6"/>
      <stop offset=".72" stop-color="#C89B3C"/><stop offset="1" stop-color="#7A5518"/>
    </linearGradient>
  </defs>
  <g class="r3-bell-swing">
    <rect x="56" y="4" width="8" height="16" rx="3" fill="#5A3424"/>
    <circle cx="60" cy="22" r="7" fill="none" stroke="url(#${g})" stroke-width="4"/>
    <path d="M60 27c-17 0-27 13-28 33-.6 12-3 20-10 26h76c-7-6-9.4-14-10-26-1-20-11-33-28-33z" fill="url(#${g})" stroke="#6E4B14" stroke-width="2" stroke-linejoin="round"/>
    <path d="M44 46c2-7 7-11 13-12" stroke="#FFF4D6" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".8"/>
    <rect x="18" y="84" width="84" height="9" rx="4.5" fill="url(#${g})" stroke="#6E4B14" stroke-width="2"/>
    <circle class="r3-bell-clapper" cx="60" cy="100" r="7" fill="#7A5518" stroke="#4A320C" stroke-width="2"/>
  </g>
</svg>`;
}

/** Ding lines either side of the bell. */
export function dingSvg() {
  return `<svg viewBox="0 0 200 80" aria-hidden="true" class="r3-ding">
  <g stroke="#FFC86B" stroke-width="5" stroke-linecap="round" fill="none">
    <path d="M38 22 22 12M32 42H12M38 60 22 70"/><path d="M162 22l16-10M168 42h20M162 60l16 10"/>
  </g></svg>`;
}

/** A wine glass. fill: 0..1 how full (claret), used for counters and clinks. */
export function glassSvg(fill = 1, { stroke = 'currentColor' } = {}) {
  const y = 6 + (1 - fill) * 12;
  const g = uid('gl');
  return `<svg viewBox="0 0 32 40" aria-hidden="true">
  <defs><clipPath id="${g}"><path d="M7 4h18c.6 6-.4 13-3 16.5A8 8 0 0 1 16 24a8 8 0 0 1-6-3.5C7.4 17 6.4 10 7 4z"/></clipPath></defs>
  ${fill > 0 ? `<rect clip-path="url(#${g})" x="4" y="${y.toFixed(1)}" width="24" height="24" fill="#7A1E2C"/><rect clip-path="url(#${g})" x="4" y="${y.toFixed(1)}" width="24" height="1.6" fill="#B0243A"/>` : ''}
  <path d="M7 4h18c.6 6-.4 13-3 16.5A8 8 0 0 1 16 24a8 8 0 0 1-6-3.5C7.4 17 6.4 10 7 4z" fill="rgba(255,255,255,.18)" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
  <path d="M10.5 7c-.3 4 .3 8 2 10.5" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".7"/>
  <path d="M16 24v10M10 36h12" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round"/>
</svg>`;
}

/** Two glasses clinking (Cheers button icon / toast mark). */
export function clinkSvg() {
  return `<svg viewBox="0 0 40 32" aria-hidden="true">
  <g transform="rotate(-14 13 16)"><path d="M6 3h13c.4 4.5-.3 9-2.2 11.5a5.6 5.6 0 0 1-8.6 0C6.3 12 5.6 7.5 6 3z" fill="currentColor" opacity=".25" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M6.6 8h11.8c-.3 2.6-.9 4.8-1.8 6a5.6 5.6 0 0 1-8.2 0C7.5 12.8 6.9 10.6 6.6 8z" fill="currentColor"/><path d="M12.5 17v9M8.5 27.5h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></g>
  <g transform="rotate(14 27 16)"><path d="M21 3h13c.4 4.5-.3 9-2.2 11.5a5.6 5.6 0 0 1-8.6 0C21.3 12 20.6 7.5 21 3z" fill="currentColor" opacity=".25" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M21.6 8h11.8c-.3 2.6-.9 4.8-1.8 6a5.6 5.6 0 0 1-8.2 0C22.5 12.8 21.9 10.6 21.6 8z" fill="currentColor"/><path d="M27.5 17v9M23.5 27.5h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></g>
  <path d="M20 1.5v3M15.5 2.5l1.4 2.2M24.5 2.5l-1.4 2.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
</svg>`;
}

export function passSvg() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

export function penSvg() {
  return '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 25l2-7L21 6l5 5-12 12z" fill="#FBF4EA" stroke="#2A1A17" stroke-width="2" stroke-linejoin="round"/><path d="M19 8l5 5" stroke="#2A1A17" stroke-width="2"/><path d="M7 25l2-7 5 5z" fill="#E2553B" stroke="#2A1A17" stroke-width="2" stroke-linejoin="round"/></svg>';
}

export function swipeSvg() {
  return '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="9" y="5" width="15" height="21" rx="3" fill="#FBF4EA" stroke="#2A1A17" stroke-width="2" transform="rotate(12 16 16)"/><path d="M4 16h6M7 13l-3 3 3 3M28 16h-6M25 13l3 3-3 3" stroke="#E2553B" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

export function crownSvg() {
  return '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 23 3 10l7 5 6-9 6 9 7-5-2 13z" fill="#E9C46A" stroke="#6E4B14" stroke-width="2" stroke-linejoin="round"/><rect x="5" y="23" width="22" height="4" rx="1.5" fill="#C89B3C" stroke="#6E4B14" stroke-width="2"/><circle cx="16" cy="18" r="2" fill="#E2553B"/></svg>';
}

/** Ornamental rule: line - diamond - line. */
export function ruleSvg() {
  return '<svg viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden="true"><path d="M0 6h86M114 6h86" stroke="currentColor" stroke-width="1.5"/><path d="M100 1l5 5-5 5-5-5z" fill="currentColor"/><circle cx="90" cy="6" r="1.6" fill="currentColor"/><circle cx="110" cy="6" r="1.6" fill="currentColor"/></svg>';
}

/**
 * Timeline that fires each step once when ctx.elapsed() passes s.at, passing `late` (ms since
 * the step was due) so steps can skip transient juice (sounds, bubbles) when mounted late
 * (reconnects, frozen screenshots) and jump straight to their end state.
 */
export function r3Timeline(steps) {
  const fired = new Set();
  return (ctx) => {
    const t = ctx.elapsed();
    steps.forEach((s, i) => {
      if (!fired.has(i) && t >= s.at) {
        fired.add(i);
        try { s.fn(t - s.at, t); } catch (e) { console.error('[r3 timeline]', e); }
      }
    });
  };
}

/** Say a Cyril line only if we are still inside its natural window (not on a late mount). */
export function sayIfFresh(ctx, lines, { at = 0, window = 2500, ...o } = {}) {
  const late = ctx.elapsed() - at;
  if (late > window) return () => {};
  if (ctx.frozen && late < 0) return () => {}; // frozen before the line is due: it hasn't been said yet
  const t = setTimeout(() => ctx.say(lines, o), ctx.frozen ? 0 : Math.max(0, -late));
  return () => clearTimeout(t);
}

/** Count a number up into el over ms (respects frozen/late by jumping). */
export function countTo(el, from, to, ms, { instant = false, prefix = '', onDone } = {}) {
  if (instant || ms <= 0) { el.textContent = `${prefix}${to}`; onDone?.(); return () => {}; }
  const t0 = performance.now();
  let raf = 0;
  const step = (now) => {
    const k = Math.min(1, (now - t0) / ms);
    const e = 1 - (1 - k) ** 3;
    el.textContent = `${prefix}${Math.round(from + (to - from) * e)}`;
    if (k < 1) raf = requestAnimationFrame(step); else onDone?.();
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}
