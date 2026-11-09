// Reaction rail (DESIGN 2.2): bread roll, rose, applause, groan. Rate limited 1 per 400 ms.
import { h, onTap } from './components.js';
import { ICONS } from './icons.js';
import { audio } from '../audio/synth.js';

const KINDS = [
  { kind: 'roll', label: 'Throw a bread roll' },
  { kind: 'rose', label: 'Throw a rose' },
  { kind: 'applause', label: 'Applaud' },
  { kind: 'groan', label: 'Groan' },
];

export function mountRail(railEl, onReact) {
  let last = 0;
  railEl.replaceChildren(...KINDS.map(({ kind, label }) => {
    const b = h('button.rail-btn', { type: 'button', 'aria-label': label, html: ICONS[kind], 'data-e2e': `react-${kind}` });
    b.append(h('span.ring', { 'aria-hidden': 'true' }));
    onTap(b, () => {
      const now = Date.now();
      if (now - last < 400) { audio.sfx('nope'); return; }
      last = now;
      b.classList.remove('fired'); void b.offsetWidth; b.classList.add('fired');
      if (kind === 'roll' || kind === 'rose') audio.sfx('throw');
      onReact(kind);
    }, { sound: null, buzz: 'tap' });
    return b;
  }));
}
