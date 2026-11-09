// settings (overlay sheet over anything): Music, SFX, Haptics, Reduced motion, Text size, Leave table.
// Laid out like the back of a menu: two grouped cards, an icon per row, one dry line each.
import './overlays.css';
import './settings.css';
import { h, toggle, onTap, iconButton } from '../ui/components.js';
import { setHaptics, hapticsEnabled } from '../ui/haptics.js';

const I = (body) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const ICON = {
  // two quavers
  music: I('<path d="M9 18V6l10-2v12"/><path d="M9 9.5l10-2"/><circle cx="6.5" cy="18" r="2.5" fill="currentColor" stroke="none"/><circle cx="16.5" cy="16" r="2.5" fill="currentColor" stroke="none"/>'),
  // service bell
  sfx: I('<path d="M6 13a6 6 0 0 1 12 0v1H6z"/><path d="M4 17h16"/><circle cx="12" cy="5.5" r="1.3" fill="currentColor" stroke="none"/>'),
  // a phone, buzzing
  haptics: I('<rect x="8" y="3.5" width="8" height="17" rx="2"/><path d="M4.5 9v6M19.5 9v6M2 10.5v3M22 10.5v3"/>'),
  // a still wine glass
  motion: I('<path d="M7.5 3.5h9c0 5-1.6 8-4.5 8s-4.5-3-4.5-8z"/><path d="M8 7.5h8" /><path d="M12 11.5V20M8.5 20.5h7"/>'),
  text: I('<path d="M3.5 18 8 6l4.5 12M5.2 14h5.6"/><path d="M14.5 18l3-8 3 8M15.6 15.4h3.8"/>'),
  leave: I('<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 8l-4 4 4 4M6 12h10"/>'),
  flame: '<svg viewBox="0 0 24 40" aria-hidden="true"><path d="M12 1.5c1.4 6.2 9.5 11.6 9.5 22.3A9.5 9.5 0 0 1 2.5 23.8C2.5 15.6 8 12.4 9.2 6.8c1.6 2.4 1.6 5 1.2 7.3C12.6 11.6 13 6.4 12 1.5z" fill="#E0A526"/><path d="M12 21c.8 3 4.6 5 4.6 9a4.6 4.6 0 0 1-9.2 0c0-3.6 3.8-5.4 4.6-9z" fill="#FFC86B"/></svg>',
};

function row(icon, label, desc, opts) {
  const t = toggle(label, opts);
  t.classList.add('st-row');
  t.querySelector('span').replaceWith(
    h('span.st-ico', { html: ICON[icon] }),
    h('span.st-text', h('b', label), h('small', desc)),
  );
  return t;
}

export default {
  id: 'settings',
  overlay: true,
  mount({ overlay }, ctx) {
    const a = ctx.audio;
    const app = ctx.app;
    const sizes = [1, 1.15, 1.3];
    const seg = h('div.st-seg', { role: 'group', 'aria-label': 'Text size' }, sizes.map((s) => {
      const b = h('button', { type: 'button', 'aria-pressed': String((app.settings.textSize || 1) === s), 'aria-label': `${Math.round(s * 100)}%` },
        h('span.st-aa', { style: { fontSize: `${[15, 20, 25][sizes.indexOf(s)]}px` } }, 'Aa'));
      onTap(b, () => {
        app.saveSettings({ textSize: s });
        seg.querySelectorAll('button').forEach((x, i) => x.setAttribute('aria-pressed', String(sizes[i] === s)));
      });
      return b;
    }));
    const inGame = !!ctx.client;
    const close = iconButton('close', { label: 'Close settings', onClick: () => ctx.actions.closeOverlay() });
    close.classList.add('settings-close');
    let leave = null;
    if (inGame) {
      leave = h('button.st-leave', { type: 'button' }, h('span.st-ico', { html: ICON.leave }), 'Leave the table');
      onTap(leave, () => { ctx.actions.closeOverlay(); ctx.actions.leave(); });
    }
    const sheet = h('div.settings-sheet.st-sheet', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Settings' },
      h('div.st-grab', { 'aria-hidden': 'true' }),
      h('div.st-head', h('div', h('div.t-eyebrow', 'Settings'), h('h2.st-title', 'House rules')), close),
      h('div.st-cyril', h('span.st-cyril-candle', { 'aria-hidden': 'true' }, h('span.st-cyril-flame', { html: ICON.flame }), h('b'), h('u')), h('p', 'Adjust to taste. I’ll be here, melting.', h('small', '— Cyril'))),
      h('div.st-group',
        h('div.st-label', 'Sound'),
        h('div.st-card',
          row('music', 'Music', 'The house band', { checked: a.settings.music, onChange: (v) => a.set('music', v), e2e: 'set-music' }),
          row('sfx', 'Sound effects', 'Clinks, stamps, oinks', { checked: a.settings.sfx, onChange: (v) => a.set('sfx', v) }),
        )),
      h('div.st-group',
        h('div.st-label', 'Comfort'),
        h('div.st-card',
          row('haptics', 'Haptics', 'A little buzz when you tap', { checked: hapticsEnabled(), onChange: (v) => setHaptics(v) }),
          row('motion', 'Reduced motion', 'Calmer camera, no confetti', { checked: !!app.settings.reducedMotion, onChange: (v) => app.saveSettings({ reducedMotion: v }) }),
          h('div.st-row.st-size', h('span.st-ico', { html: ICON.text }), h('span.st-text', h('b', 'Text size'), h('small', 'Bigger words')), seg),
        )),
      leave,
    );
    const dim = h('div.dim.dim-light', sheet);
    dim.addEventListener('click', (e) => { if (e.target === dim) ctx.actions.closeOverlay(); });
    overlay.append(dim);
    return {};
  },
};
