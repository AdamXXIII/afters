// Bonce screen kit: deck icons, avatar discs, the tilt singleton, small helpers.
import { h } from '../../../ui/components.js';
import { avatarIcon } from '../../../ui/icons.js';
import { tiltSensor, lockLandscape, unlockOrientation, vibrate, BUZZ } from '../../../shared/sensors.js';
import { TEAMS } from '../content/index.js';

export { TEAMS, vibrate, BUZZ };

const s = (inner) => `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

/** Hand-drawn deck icons (48x48, currentColor). */
export const DECK_ICONS = {
  film: s('<rect x="7" y="13" width="34" height="24" rx="3"/><path d="M7 19h34M7 31h34M13 13v6M21 13v6M29 13v6M37 13v6M13 31v6M21 31v6M29 31v6M37 31v6"/><path d="m21 22 7 3-7 3z" fill="currentColor"/>'),
  monocle: s('<circle cx="20" cy="22" r="10"/><path d="M28 29c4 5 6 9 6 14"/><path d="M14 18c3-3 8-3 11 0" stroke-width="1.8"/><path d="M8 8c6-3 18-3 24 0"/>'),
  cassette: s('<rect x="5" y="11" width="38" height="26" rx="4"/><circle cx="17" cy="23" r="4"/><circle cx="31" cy="23" r="4"/><path d="M21 23h6M13 37l3-6h16l3 6"/>'),
  megaphone: s('<path d="M8 20v8l6 1 20 9V11L14 19z"/><path d="M14 29l3 10h5l-2-9"/><path d="M39 18c2 2 2 10 0 12M43 15c3 4 3 14 0 18"/>'),
  pie: s('<path d="M5 28h38l-4 9H9z"/><path d="M8 28c0-9 7-15 16-15s16 6 16 15"/><path d="M16 21l2 3M24 18v4M32 21l-2 3"/><path d="M20 9c1-3 3-4 4-6M27 10c1-2 2-3 2-5" stroke-width="1.8"/>'),
  spanner: s('<path d="M30 7a10 10 0 0 0-9 14L8 34a4 4 0 0 0 6 6l13-13a10 10 0 0 0 14-9l-6 6-6-2-2-6z"/>'),
  mask: s('<path d="M7 12c8 3 26 3 34 0 0 14-6 25-17 25S7 26 7 12z"/><path d="M15 21c2-2 5-2 7 0M26 21c2-2 5-2 7 0"/><path d="M17 29c4 4 10 4 14 0"/>'),
  theatre: s('<path d="M6 8h36v6c-6 3-12 3-18 0-6 3-12 3-18 0z"/><path d="M6 14v26M42 14v26M6 40h36"/><path d="M14 22c6 2 6 12 0 14M34 22c-6 2-6 12 0 14"/>'),
  paw: s('<ellipse cx="24" cy="31" rx="9" ry="7"/><circle cx="12" cy="20" r="4"/><circle cx="19" cy="12" r="4"/><circle cx="29" cy="12" r="4"/><circle cx="36" cy="20" r="4"/>'),
  cracker: s('<path d="M14 18h20v12H14z"/><path d="M14 18l-8-5v22l8-5M34 18l8-5v22l-8-5"/><path d="M20 18l3 12M27 18l-3 12" stroke-width="1.8"/>'),
  trophy: s('<path d="M15 7h18v10a9 9 0 0 1-18 0z"/><path d="M15 10H8c0 7 4 10 8 10M33 10h7c0 7-4 10-8 10"/><path d="M24 26v7M16 41h16l-2-8H18z"/>'),
  heart: s('<path d="M24 40S7 29 7 18a8.5 8.5 0 0 1 17-2 8.5 8.5 0 0 1 17 2c0 11-17 22-17 22z"/><path d="M15 17c1-3 3-4 5-4" stroke-width="1.8"/>'),
  tiara: s('<path d="M7 34 9 16l8 9 7-14 7 14 8-9 2 18z"/><path d="M7 38h34"/><circle cx="24" cy="25" r="2.5" fill="currentColor"/>'),
  banana: s('<path d="M10 14c-2 14 8 26 26 24 3 0 5-2 4-4-14 2-22-6-24-18"/><path d="M10 14l-2-5 6 2"/><path d="M17 22c3 7 9 11 17 12" stroke-width="1.8"/>'),
  moon: s('<path d="M30 7a17 17 0 1 0 11 27A14 14 0 0 1 30 7z"/><path d="M34 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="currentColor" stroke-width="1"/>'),
  lips: s('<path d="M5 24c6-8 11-11 15-9 2 1 3 1 4 0 1 1 2 1 4 0 4-2 9 1 15 9-5 8-11 12-19 12S10 32 5 24z"/><path d="M5 24c8 2 30 2 38 0"/>'),
  cocktail: s('<path d="M8 9h32L24 27z"/><path d="M24 27v13M16 41h16"/><path d="M30 9l6-6" /><circle cx="37" cy="4" r="2" fill="currentColor"/><path d="M14 15h20" stroke-width="1.8"/>'),
};

export const deckIcon = (key) => DECK_ICONS[key] || DECK_ICONS.film;

/** Phone-on-forehead pictogram (for the rules card and the guesser's prep). */
export const HEAD_SVG = `<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="72" r="34" fill="#F3E6CF" stroke="#2A1A17" stroke-width="3"/><path d="M33 58c6-14 48-14 54 0" fill="#7A4A2A" stroke="#2A1A17" stroke-width="3"/><circle cx="48" cy="80" r="3.4" fill="#2A1A17"/><circle cx="72" cy="80" r="3.4" fill="#2A1A17"/><path d="M50 95c6 4 14 4 20 0" stroke="#2A1A17" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="30" y="22" width="60" height="34" rx="7" fill="#E2553B" stroke="#2A1A17" stroke-width="3"/><rect x="36" y="28" width="48" height="22" rx="3" fill="#FBF4EA"/><path d="M44 39h32" stroke="#2A1A17" stroke-width="3.4" stroke-linecap="round"/></svg>`;
export const TILT_DOWN_SVG = `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="14" y="10" width="36" height="22" rx="5" fill="#7F9A74" stroke="#2A1A17" stroke-width="2.6" transform="rotate(28 32 21)"/><path d="M32 38v18m-7-7 7 7 7-7" stroke="#2A1A17" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
export const TILT_UP_SVG = `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="14" y="32" width="36" height="22" rx="5" fill="#2F5D7C" stroke="#2A1A17" stroke-width="2.6" transform="rotate(-28 32 43)"/><path d="M32 26V8m-7 7 7-7 7 7" stroke="#2A1A17" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
export const SHOUT_SVG = `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="24" cy="34" r="16" fill="#F3E6CF" stroke="#2A1A17" stroke-width="2.6"/><ellipse cx="29" cy="39" rx="6" ry="7" fill="#7A1E2C" stroke="#2A1A17" stroke-width="2.4"/><circle cx="20" cy="28" r="2.2" fill="#2A1A17"/><circle cx="30" cy="27" r="2.2" fill="#2A1A17"/><path d="M44 22l8-6M46 32h10M44 42l8 6" stroke="#E2553B" stroke-width="3.4" stroke-linecap="round"/></svg>`;

export function disc(player, { size = 36, cls = '' } = {}) {
  return h(`span.fh-disc${cls}`, { style: { '--pc': player?.colour || '#7A4A2A', '--sz': `${size}px` }, title: player?.name || '', html: avatarIcon(player?.avatar ?? 0) });
}

/** Mulberry-ish deterministic 0..1 from seed + key (same on every phone). */
export function rnd(seed, key) {
  let x = 2166136261 ^ seed;
  for (const ch of String(key)) x = Math.imul(x ^ ch.charCodeAt(0), 16777619);
  x ^= x >>> 13; x = Math.imul(x, 0x5bd1e995); x ^= x >>> 15;
  return ((x >>> 0) % 10000) / 10000;
}

/** Shrink a node's font until it fits its box (single pass, cheap). */
export function fit(el, { max, min, maxW, maxH }) {
  let size = max;
  el.style.fontSize = `${size}px`;
  let guard = 0;
  while (guard++ < 40 && size > min && ((maxW && el.scrollWidth > maxW) || (maxH && el.scrollHeight > maxH))) {
    size -= 2;
    el.style.fontSize = `${size}px`;
  }
  return size;
}

export const S = (ctx, ms) => ms / (ctx.phase?.speed || 1);

/** Team id of a player from a payload's teams map. */
export const teamOf = (teams, id) => (teams ? (teams.gravy.includes(id) ? 'gravy' : teams.custard.includes(id) ? 'custard' : null) : null);

// ---- the one tilt sensor for this phone (survives pick -> turn) ----
let tilt = null;
let onTiltFn = null;
export function getTilt() {
  if (!tilt) tilt = tiltSensor({ onTilt: (dir) => onTiltFn?.(dir) });
  return tilt;
}
export function setTiltHandler(fn) { onTiltFn = fn; }
/** Called from the guesser's "I'm ready" tap: motion permission + landscape lock (both best effort). */
export async function armGuesser() {
  const t = getTilt();
  let r = 'unsupported';
  try { r = await t.start(); } catch { /* fallback */ }
  lockLandscape().catch(() => {});
  return r;
}
export function releaseGuesser() {
  setTiltHandler(null);
  try { tilt?.stop(); } catch { /* ignore */ }
  unlockOrientation().catch(() => {});
}

/** A bubble once per mount, after a delay (instant in screenshots). */
export function sayLater(ctx, lines, { delay = 500, ...o } = {}) {
  const t = setTimeout(() => ctx.say(lines, o), ctx.frozen ? 0 : delay);
  return () => clearTimeout(t);
}

export const CYRIL_BADGE = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3c2 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-7 .5 2 1.5 3 3 3-1-3-1-5 0-7z" fill="#FFC86B"/><rect x="11" y="18" width="18" height="19" rx="3" fill="#F3E6CF" stroke="#2A1A17" stroke-width="1.6"/><circle cx="17" cy="25" r="1.6" fill="#2A1A17"/><circle cx="23" cy="25" r="1.6" fill="#2A1A17"/><path d="M17 30c2 1.5 4 1.5 6 0" stroke="#2A1A17" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>';

/** Cyril's line as a quiet card in the sheet (when a bubble would cover the show). */
export function cyrilCard(lines) {
  const text = (Array.isArray(lines) ? lines : [lines]).join(' ');
  return h('div.fh-cy', h('i', { html: CYRIL_BADGE }), h('div', h('small', 'Cyril'), h('span', text)));
}

/** Cyril the candle with a phone stuck on his forehead, eyes rolled up at it (Bonce's mascot). */
export const CYRIL_BONCE_SVG = `<svg viewBox="0 0 220 290" aria-hidden="true">
<defs><radialGradient id="fhFl" cx="50%" cy="70%" r="60%"><stop offset="0" stop-color="#FFF4D6"/><stop offset=".5" stop-color="#FFC86B"/><stop offset="1" stop-color="#E2553B"/></radialGradient>
<radialGradient id="fhGlow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFE7A8" stop-opacity=".9"/><stop offset="1" stop-color="#FFE7A8" stop-opacity="0"/></radialGradient></defs>
<circle cx="110" cy="40" r="44" fill="url(#fhGlow)"/>
<path d="M110 6c8 16 22 24 22 44a22 22 0 0 1-44 0c0-12 7-20 11-28 2 8 6 12 11 12-4-10-4-18 0-28z" fill="url(#fhFl)"/>
<path d="M110 74v-12" stroke="#2A1A17" stroke-width="4" stroke-linecap="round"/>
<path d="M58 84c0-8 24-12 52-12s52 4 52 12v150H58z" fill="#F3E6CF" stroke="#2A1A17" stroke-width="5" stroke-linejoin="round"/>
<path d="M58 84c8 8 20 6 26 0 3 16 12 18 15 2 6 10 18 8 22-2 4 20 16 22 18 2 6 8 16 6 23-2" fill="none" stroke="#2A1A17" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M150 90c4 16 4 30 0 40" stroke="#E6D3B8" stroke-width="7" stroke-linecap="round"/>
<g transform="rotate(-6 110 112)"><rect x="40" y="88" width="140" height="62" rx="12" fill="#E2553B" stroke="#2A1A17" stroke-width="5"/><rect x="50" y="97" width="120" height="44" rx="5" fill="#FBF4EA"/>
<text x="110" y="129" text-anchor="middle" font-family="Fraunces Variable, Georgia, serif" font-weight="900" font-size="30" fill="#2A1A17">???</text></g>
<ellipse cx="88" cy="176" rx="15" ry="17" fill="#FFFDF7" stroke="#2A1A17" stroke-width="4"/><ellipse cx="132" cy="176" rx="15" ry="17" fill="#FFFDF7" stroke="#2A1A17" stroke-width="4"/>
<circle cx="90" cy="166" r="6.5" fill="#2A1A17"/><circle cx="134" cy="166" r="6.5" fill="#2A1A17"/>
<path d="M72 152c6-6 16-8 24-4M124 148c8-4 18-2 24 4" stroke="#7A4A2A" stroke-width="5" stroke-linecap="round" fill="none"/>
<ellipse cx="110" cy="206" rx="11" ry="13" fill="#7A1E2C" stroke="#2A1A17" stroke-width="4"/>
<path d="M96 228l-14-9v18zM124 228l14-9v18z" fill="#7A1E2C" stroke="#2A1A17" stroke-width="3.5" stroke-linejoin="round"/><circle cx="110" cy="228" r="6" fill="#7A1E2C" stroke="#2A1A17" stroke-width="3.5"/>
<ellipse cx="110" cy="246" rx="74" ry="16" fill="#C89B3C" stroke="#2A1A17" stroke-width="5"/><path d="M36 246v12c0 9 33 16 74 16s74-7 74-16v-12" fill="#A87E2C" stroke="#2A1A17" stroke-width="5"/>
<path d="M184 250c16 0 20 18 4 22" stroke="#2A1A17" stroke-width="5" fill="none" stroke-linecap="round"/>
<path d="M30 124l-14-8M28 140H10M32 156l-14 8M190 124l14-8M192 140h18M188 156l14 8" stroke="#FBF4EA" stroke-width="5" stroke-linecap="round"/>
</svg>`;

/** A willow-pattern dinner plate (the recap piles the hits onto it). */
export const PLATE_SVG = (() => {
  const dots = Array.from({ length: 28 }, (_, i) => { const a = (i / 28) * Math.PI * 2; return `<circle cx="${200 + Math.cos(a) * 178}" cy="${200 + Math.sin(a) * 178}" r="5" fill="#2F5D7C"/>`; }).join('');
  return `<svg viewBox="0 0 400 400" aria-hidden="true"><ellipse cx="200" cy="214" rx="196" ry="190" fill="rgba(42,26,23,.35)"/><circle cx="200" cy="200" r="196" fill="#FBF7EF" stroke="#E6D3B8" stroke-width="4"/><circle cx="200" cy="200" r="188" fill="none" stroke="#2F5D7C" stroke-width="6"/>${dots}<circle cx="200" cy="200" r="150" fill="none" stroke="#2F5D7C" stroke-width="2.5"/><circle cx="200" cy="200" r="140" fill="#FFFDF8"/></svg>`;
})();
