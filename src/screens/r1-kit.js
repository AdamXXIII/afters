// Round 1 (Plate Up) private helpers. Copied/forked from common.js so the round can diverge
// without touching shared files. Only r1-* screens import this.
import { h, button } from '../ui/components.js';
import { avatarIcon, ICONS } from '../ui/icons.js';
import { AVATARS } from '../game/constants.js';

/** Fires callbacks once when ctx.elapsed() passes each time (ms). Works with frozen time too. */
export function timeline(steps) {
  const fired = new Set();
  return {
    run(ctx) {
      const t = ctx.elapsed();
      steps.forEach((s, i) => {
        if (!fired.has(i) && t >= s.at) {
          fired.add(i);
          try { s.fn(ctx, t - s.at); } catch (e) { console.error('[r1 timeline]', e); }
        }
      });
    },
  };
}

/** Say a Cyril line once per mount after `delay` ms. Returns a cancel fn. */
export function sayLater(ctx, lines, { delay = 400, ...o } = {}) {
  const t = setTimeout(() => ctx.say(lines, o), ctx.frozen ? 0 : delay);
  return () => clearTimeout(t);
}

/** Seeded tilt (same on every phone). */
export function tiltFor(seed, key, max = 3) {
  let x = 2166136261 ^ seed;
  for (const ch of String(key)) x = Math.imul(x ^ ch.charCodeAt(0), 16777619);
  return (((x >>> 0) % 1000) / 1000 * 2 - 1) * max;
}

export const colourOf = (p) => p?.colour || AVATARS[p?.avatar]?.colour || '#7A4A2A';

/** Round avatar disc: player colour + white glyph. */
export function avatarDisc(p, { size = 28, cls = '' } = {}) {
  return h(`span.r1-av${cls}`, { style: { '--pc': colourOf(p), '--sz': `${size}px` }, title: p?.name || '', html: avatarIcon(p?.avatar ?? 0) });
}

/** A short line from Cyril rendered inside the sheet (never covers the show). */
export function cyrilNote(text, { tone = '' } = {}) {
  const rich = String(text).split(/(\*[^*]+\*)/g).map((part) => (part.startsWith('*') && part.endsWith('*') ? h('em', part.slice(1, -1)) : part));
  const el = h(`div.r1-note${tone}`,
    h('span.r1-note-badge', { html: ICONS.flame }),
    h('div.r1-note-body', h('div.r1-note-who', 'Cyril'), h('div.r1-note-txt', rich)));
  el.set = (t) => { el.querySelector('.r1-note-txt').textContent = [].concat(t).join(' ').replace(/\*/g, ''); };
  return el;
}

/** Host-only Skip pill (appears after 3 s). */
export function hostSkip(ctx, show) {
  if (!ctx.isHost) return null;
  const b = button('Skip', { kind: 'ghost', block: false, onClick: () => ctx.client.skip() });
  b.classList.add('r1-skip');
  b.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3l5 5-5 5" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>');
  const wrap = h('div.r1-skip-wrap', b);
  show.append(wrap);
  return { frame(c) { wrap.classList.toggle('on', c.elapsed() > 3000 / (c.phase?.speed || 1)); } };
}

/** Shrink an element's font-size until it fits within maxH px (runs after layout). */
export function fitText(el, { max, min, maxH }) {
  let size = max;
  el.style.fontSize = `${size}px`;
  const run = () => {
    if (!el.isConnected) return;
    while (size > min && el.scrollHeight > maxH) { size -= 1; el.style.fontSize = `${size}px`; }
  };
  requestAnimationFrame(run);
  document.fonts?.ready?.then(run);
}

/** Count a number up from `from` to `to`; frozen -> jump straight to the end value. */
export function countTo(el, from, to, { ms = 600, prefix = '', frozen = false } = {}) {
  if (frozen) { el.textContent = `${prefix}${to}`; return; }
  const t0 = performance.now();
  const step = () => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    const e = 1 - (1 - k) ** 3;
    el.textContent = `${prefix}${Math.round(from + (to - from) * e)}`;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Small round course pips: ● ○ ○ for course one. */
export function coursePips(n = 1, of = 3) {
  return h('span.r1-pips', { 'aria-label': `Course ${n} of ${of}` }, Array.from({ length: of }, (_, i) => h(`i${i < n ? '.on' : ''}`)));
}

/** Willow-pattern plate SVG (procedural; blue on bone china). */
export function willowPlate({ spin = false } = {}) {
  const rimDots = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    const r = i % 2 ? 49 : 50.5;
    return `<circle cx="${(60 + Math.cos(a) * r).toFixed(2)}" cy="${(60 + Math.sin(a) * r).toFixed(2)}" r="${i % 2 ? 1.6 : 2.6}" fill="#2F5D7C"/>`;
  }).join('');
  const scallops = Array.from({ length: 12 }, (_, i) => {
    const a0 = (i / 12) * Math.PI * 2;
    const a1 = ((i + 1) / 12) * Math.PI * 2;
    const am = (a0 + a1) / 2;
    const p = (a, r) => `${(60 + Math.cos(a) * r).toFixed(2)} ${(60 + Math.sin(a) * r).toFixed(2)}`;
    return `<path d="M${p(a0, 41)} Q${p(am, 45.5)} ${p(a1, 41)}" stroke="#2F5D7C" stroke-width="1.3" fill="none"/>`;
  }).join('');
  return `<svg viewBox="0 0 120 120" aria-hidden="true" class="${spin ? 'spinme' : ''}">
  <defs><radialGradient id="r1china" cx="45%" cy="40%" r="70%"><stop offset="0" stop-color="#FFFDF8"/><stop offset=".75" stop-color="#F7EFE2"/><stop offset="1" stop-color="#E9DCC8"/></radialGradient></defs>
  <circle cx="60" cy="60" r="58" fill="url(#r1china)" stroke="#D9C6A8" stroke-width="1.2"/>
  <circle cx="60" cy="60" r="54.5" fill="none" stroke="#2F5D7C" stroke-width="2.2"/>
  ${rimDots}${scallops}
  <circle cx="60" cy="60" r="38" fill="none" stroke="#2F5D7C" stroke-width=".9" opacity=".7"/>
  <g stroke="#2F5D7C" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M30 74h60" stroke-width="1.4"/>
    <path d="M44 74c4-7 12-7 16 0" stroke-width="1.8"/>
    <path d="M44 74v3M60 74v3M52 70.6v6.4" stroke-width="1.2"/>
    <path d="M70 74V58M66 58h8l-4-5z" stroke-width="1.6"/>
    <path d="M70 53l0-3" stroke-width="1.2"/>
    <path d="M36 74c-1-9 2-15 8-19M40 62c-3-1-6 0-8 2M41 58c2-4 6-6 10-5" stroke-width="1.6"/>
    <path d="M77 74c2-10 6-14 11-14" stroke-width="1.4"/>
    <path d="M47 40q3-3 6 0q3-3 6 0M63 35q3-3 6 0q3-3 6 0" stroke-width="1.5"/>
    <path d="M38 82c8 3 36 3 44 0" stroke-width="1" opacity=".7"/>
  </g>
  <ellipse cx="44" cy="40" rx="18" ry="8" fill="#fff" opacity=".35" transform="rotate(-28 44 40)"/>
</svg>`;
}

/** Simple line icons used across Round 1. */
export const R1_ICONS = {
  pen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.2-4.6L16.5 4.1a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M14.5 6l3.5 3.5" stroke="currentColor" stroke-width="1.9"/></svg>',
  cloche: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17h18M4.5 17a7.5 7.5 0 0 1 15 0" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><circle cx="12" cy="8" r="1.3" fill="currentColor"/><path d="M2.5 19.5h19" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
  rival: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="4" fill="currentColor"/><path d="M4.5 20c.8-4 3.8-6 7.5-6s6.7 2 7.5 6z" fill="currentColor"/><text x="12" y="11.4" font-size="6.5" font-family="system-ui" font-weight="800" text-anchor="middle" fill="#FBF4EA">?</text></svg>',
  fork: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v6a2 2 0 0 0 4 0V3M9 3v18M17 21V3c-2.2 1.4-3 4-3 7v4h3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  up: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 2l4 6H2z" fill="currentColor"/></svg>',
  down: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 10L2 4h8z" fill="currentColor"/></svg>',
  laurel: '<svg viewBox="0 0 40 20" aria-hidden="true"><g fill="currentColor"><path d="M20 18c-6 0-11-4-13-10 4 1 7 4 8 8"/><path d="M20 18c6 0 11-4 13-10-4 1-7 4-8 8"/><ellipse cx="6" cy="6" rx="1.8" ry="3.6" transform="rotate(-30 6 6)"/><ellipse cx="34" cy="6" rx="1.8" ry="3.6" transform="rotate(30 34 6)"/><ellipse cx="9" cy="12" rx="1.6" ry="3.2" transform="rotate(-60 9 12)"/><ellipse cx="31" cy="12" rx="1.6" ry="3.2" transform="rotate(60 31 12)"/></g></svg>',
};

export { ICONS };

/** Extra Round 1 lines in Cyril's voice; picked by seed so every phone says the same thing. */
export const R1_LINES = {
  intro: ['Course one. Two of you, one question, no mercy.', 'Best answer wins. Worst answer gets my sympathy.'],
  normal: [
    'Splendid. The table has spoken.',
    'A clear winner. The loser may sulk into the gravy.',
    'Decisive. I have seen softer verdicts at the Old Bailey.',
    'The people have chosen. Frankly, I agree with them.',
    'Well plated. The other one was… also food.',
  ],
  novotes: ['Nobody voted. I\'ll assume you were all chewing.'],
  scores: [
    'Somebody\'s leading. Somebody isn\'t. I love them all equally. Nearly.',
    'Early days. I once saw a man come back from last with a single pun.',
  ],
};
export const pickLine = (list, seed, salt = 0) => list[((seed >>> 0) + salt) % list.length];
