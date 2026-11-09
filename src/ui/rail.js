// Reaction rail (DESIGN 2.2): bread roll, rose, applause, groan. Rate limited 1 per 400 ms.
import { h, onTap } from './components.js';
import { ICONS } from './icons.js';

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
    onTap(b, () => {
      const now = Date.now();
      if (now - last < 400) return;
      last = now;
      onReact(kind);
    }, { sound: null });
    return b;
  }));
}
