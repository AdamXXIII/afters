// Crossed Wires screen helpers (only telephone screens import this).
import { h, button } from '../../../ui/components.js';
import { avatarIcon, ICONS } from '../../../ui/icons.js';
import { AVATARS } from '../../../game/constants.js';

export { h, button, ICONS };

export const colourOf = (p) => p?.colour || AVATARS[p?.avatar]?.colour || '#7A4A2A';

/** Player avatar disc (colour + white glyph). */
export function av(p, { size = 28, cls = '' } = {}) {
  return h(`span.tp-av${cls}`, { style: { '--pc': colourOf(p), '--sz': `${size}px` }, title: p?.name || '', html: avatarIcon(p?.avatar ?? 0) });
}

/** Little name tag: avatar + name. */
export function who(p, { size = 22, label = null } = {}) {
  return h('span.tp-who', { style: { '--pc': colourOf(p) } }, av(p, { size }), label ? h('i', label) : null, h('b', p?.name || 'Someone'));
}

/** Fire callbacks once when ctx.elapsed() passes each time. Works frozen too. */
export function timeline(steps) {
  const fired = new Set();
  return {
    run(ctx) {
      const t = ctx.elapsed();
      steps.forEach((s, i) => {
        if (!fired.has(i) && t >= s.at) {
          fired.add(i);
          try { s.fn(ctx, t - s.at); } catch (e) { console.error('[tp timeline]', e); }
        }
      });
    },
  };
}

/** Shrink text until it fits. */
export function fitText(el, { max, min, maxH }) {
  let s = max;
  el.style.fontSize = `${s}px`;
  requestAnimationFrame(() => {
    let guard = 0;
    while (el.scrollHeight > maxH && s > min && guard++ < 30) { s -= 1; el.style.fontSize = `${s}px`; }
  });
}

/** Seeded tilt in degrees (same on every phone). */
export function tilt(seed, key, max = 3) {
  let x = 2166136261 ^ seed;
  for (const ch of String(key)) x = Math.imul(x ^ ch.charCodeAt(0), 16777619);
  return ((((x >>> 0) % 1000) / 1000) * 2 - 1) * max;
}

/** Cyril's note inside the sheet (never covers the strip). */
export function cyrilNote(text) {
  const body = h('div.tp-note-txt');
  const set = (t) => {
    const s = [].concat(t).join(' ');
    body.replaceChildren(...s.split(/(\*[^*]+\*)/g).map((part) => (part.startsWith('*') && part.endsWith('*') ? h('em', part.slice(1, -1)) : part)));
  };
  set(text);
  const el = h('div.tp-note', h('span.tp-note-badge', { html: ICONS.flame }), h('div', h('div.tp-note-who', 'Cyril'), body));
  el.set = set;
  return el;
}

/** Curly phone cord as an SVG path between x0 and x1 (horizontal), loops = coils. */
export function cordPath(x0, x1, y, { loops = 6, r = 7 } = {}) {
  const w = x1 - x0;
  let d = `M${x0} ${y}`;
  for (let i = 0; i < loops; i++) {
    const a = x0 + (w * i) / loops; const b = x0 + (w * (i + 0.5)) / loops; const c = x0 + (w * (i + 1)) / loops;
    d += ` C${a + (b - a) * 0.2} ${y - r * 1.6}, ${b + (b - a) * 0.6} ${y - r * 1.6}, ${b} ${y} S${c - (c - b) * 0.2} ${y + r * 1.3}, ${c} ${y}`;
  }
  return d;
}

export function cordSvg(width = 120, height = 26, { loops = 6, colour = 'currentColor', stroke = 3 } = {}) {
  return `<svg class="tp-cord" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><path d="${cordPath(4, width - 4, height / 2, { loops, r: height / 4 })}" fill="none" stroke="${colour}" stroke-width="${stroke}" stroke-linecap="round"/></svg>`;
}

export const TP_ICONS = {
  pencil: '<svg viewBox="0 0 24 24"><path d="M4 20l1.2-4.6L15.8 4.8a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M14 6.6l3.4 3.4" stroke="currentColor" stroke-width="2.2"/></svg>',
  brush: '<svg viewBox="0 0 24 24"><path d="M14.5 4.5l5 5-7.8 7.8-5-5z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M6.7 12.3c-2.5.3-3.5 2.4-3.7 4.4-.1 1.4-.8 2.3-1.5 2.8 3.6 1 7.5-.3 8.1-3.3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/></svg>',
  dice: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="8.5" cy="8.5" r="1.6" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/></svg>',
  handset: '<svg viewBox="0 0 24 24"><path d="M6.6 3.5h2.6l1.6 4.2-2 1.4a11 11 0 0 0 6.1 6.1l1.4-2 4.2 1.6v2.6a2 2 0 0 1-2 2A16.6 16.6 0 0 1 4.6 5.5a2 2 0 0 1 2-2z" fill="currentColor"/></svg>',
  send: '<svg viewBox="0 0 24 24"><path d="M4 12h13M12 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  bolt: '<svg viewBox="0 0 24 24"><path d="M13 2 4 14h6l-1 8 9-12h-6z" fill="currentColor"/></svg>',
  film: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" stroke="currentColor" stroke-width="1.8"/></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" fill="currentColor"/><path d="M10 20.5a2 2 0 0 0 4 0" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" fill="currentColor"/></svg>',
};

/** Icon + label inside a button. */
export function iconBtn(label, icon, o) {
  const b = button(label, o);
  b.insertAdjacentHTML('afterbegin', `<span class="tp-btn-ic">${TP_ICONS[icon] || ''}</span>`);
  return b;
}

/** "Step 2 of 6" pips. */
export function stepPips(step, steps, kinds) {
  return h('div.tp-pips', Array.from({ length: steps }, (_, i) => h(`i.${kinds(i)}${i < step ? '.done' : ''}${i === step ? '.cur' : ''}`)));
}

/**
 * Nudges: when someone nudges this phone (progress.nudge.to === me), buzz + shake + toast once.
 * Returns update(ctx).
 */
export function nudgeWatcher(ctx) {
  let seen = ctx.progress?.nudge?.n ?? 0;
  return (c) => {
    const nd = c.progress?.nudge;
    if (!nd || nd.n === seen) return;
    seen = nd.n;
    if (nd.to !== c.meId || c.frozen) return;
    const from = c.player(nd.from);
    c.haptic('error');
    c.audio.sfx('bell');
    document.body.classList.remove('tp-nudged'); void document.body.offsetWidth; document.body.classList.add('tp-nudged');
    setTimeout(() => document.body.classList.remove('tp-nudged'), 700);
    c.toast(c.line('tpNudged', { name: from?.name || 'Someone' }).join(' '));
  };
}

export const kindLabel = (k) => ({ write: 'wrote', draw: 'drew', guess: 'guessed' }[k] || '');
