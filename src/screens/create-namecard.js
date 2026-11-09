// Front-door helpers (create + join): a live place card that writes your name in the
// players' hand as you type, a back link for the sheet header, and a field binding.
import './create.css';
import { h, onTap } from '../ui/components.js';

const CHEVRON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** "‹ Back" text link for the sheet header row (48 px hit area). */
export function backLink(onClick) {
  const b = h('button.fd-back', { type: 'button', 'aria-label': 'Back to the start' }, h('span', { html: CHEVRON }), 'Back');
  onTap(b, onClick);
  return b;
}

/** Sheet header: eyebrow on the left, back link on the right, a Fraunces question below. */
export function sheetHead(eyebrow, title, onBack) {
  return h('div.fd-head',
    h('div.fd-head-row', h('div.t-eyebrow', eyebrow), backLink(onBack)),
    h('h2.fd-title', title));
}

/**
 * A tented place card that mirrors a name field. `field` is a textField() wrap.
 * kicker: the small line above the name ("Reserved for").
 */
export function nameCard(field, { kicker = 'Reserved for', tilt = -2 } = {}) {
  const name = h('div.fd-card-name');
  const card = h('div.fd-card', { style: { '--tilt': `${tilt}deg` }, 'aria-hidden': 'true' },
    h('div.fd-card-kicker', h('i'), kicker, h('i')),
    name,
  );
  const sync = (bump) => {
    const v = field.input.value.trim();
    name.textContent = v || 'your name here';
    name.classList.toggle('empty', !v);
    if (bump) {
      card.classList.remove('bump');
      void card.offsetWidth;
      card.classList.add('bump');
    }
  };
  field.input.addEventListener('input', () => sync(true));
  sync(false);
  return card;
}
