// Front-door helpers (create + join): a live place card that writes your name in the
// players' hand as you type, a back link for the sheet header, and a field binding.
import './create.css';
import { h, onTap } from '../ui/components.js';

const CHEVRON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const PEN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l2.5-7.5L15 4l5 5-8.5 8.5z" fill="currentColor" opacity=".2"/><path d="M4 20l2.5-7.5L15 4l5 5-8.5 8.5zM4 20l5-2M12 7l5 5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';

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
 * A tented place card that IS the name field: you write straight onto it in the players' hand.
 * `field` is a textField() wrap; its <input> moves inside the card (data-e2e etc. are kept).
 */
export function nameCard(field, { kicker = 'Reserved for', tilt = -2, compact = false } = {}) {
  const input = field.input;
  input.classList.remove('input');
  input.classList.add('fd-card-input');
  input.placeholder = 'Your name';
  input.autocapitalize = 'words';
  input.spellcheck = false;
  const count = field.querySelector('.count');
  const card = h(`label.fd-card${compact ? '.compact' : ''}`, { style: { '--tilt': `${tilt}deg` } },
    h('span.fd-card-kicker', { 'aria-hidden': 'true' }, h('i'), kicker, h('i')),
    input,
    h('span.fd-pen', { html: PEN, 'aria-hidden': 'true' }),
    count,
  );
  input.addEventListener('input', () => {
    card.classList.remove('bump');
    void card.offsetWidth;
    card.classList.add('bump');
  });
  card.error = field.error;
  card.input = input;
  // field.error() shakes the input; shake the whole card instead
  field.error = () => { card.classList.remove('error'); void card.offsetWidth; card.classList.add('error'); card.error(); input.classList.remove('error'); };
  return card;
}
