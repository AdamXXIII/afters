// settings (overlay sheet over anything): Music, SFX, Haptics, Reduced motion, Text size, Leave table.
import './overlays.css';
import { h, button, toggle, onTap, iconButton } from '../ui/components.js';
import { setHaptics, hapticsEnabled } from '../ui/haptics.js';

export default {
  id: 'settings',
  overlay: true,
  mount({ overlay }, ctx) {
    const a = ctx.audio;
    const app = ctx.app;
    const sizes = [1, 1.15, 1.3];
    const seg = h('div.segmented', sizes.map((s) => {
      const b = h('button', { type: 'button', 'aria-pressed': String((app.settings.textSize || 1) === s) }, `${Math.round(s * 100)}%`);
      onTap(b, () => {
        app.saveSettings({ textSize: s });
        seg.querySelectorAll('button').forEach((x, i) => x.setAttribute('aria-pressed', String(sizes[i] === s)));
      });
      return b;
    }));
    const inGame = !!ctx.client;
    const close = iconButton('close', { label: 'Close settings', onClick: () => ctx.actions.closeOverlay() });
    close.classList.add('settings-close');
    const sheet = h('div.settings-sheet.enter-up',
      h('div.row', h('h2.t-heading.sheet-title.grow', 'Settings'), close),
      toggle('Music', { checked: a.settings.music, onChange: (v) => a.set('music', v), e2e: 'set-music' }),
      toggle('Sound effects', { checked: a.settings.sfx, onChange: (v) => a.set('sfx', v) }),
      toggle('Haptics', { checked: hapticsEnabled(), onChange: (v) => setHaptics(v) }),
      toggle('Reduced motion', { checked: !!app.settings.reducedMotion, onChange: (v) => app.saveSettings({ reducedMotion: v }) }),
      h('div.toggle', h('span', 'Text size'), seg),
      inGame ? button('Leave table', { kind: 'secondary', onClick: () => { ctx.actions.closeOverlay(); ctx.actions.leave(); } }) : null,
      h('p.t-eyebrow.center', 'AFTERS - made for the table'),
    );
    const dim = h('div.dim.dim-light', sheet);
    dim.addEventListener('click', (e) => { if (e.target === dim) ctx.actions.closeOverlay(); });
    overlay.append(dim);
    return {};
  },
};
