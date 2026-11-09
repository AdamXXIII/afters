// r2-write: the fact with an underlined gap, field (max 40), "Tell a porky". Too-honest => shake.
import './r2.css';
import { h, button, textField } from '../ui/components.js';
import { sayLater } from './common.js';

export function factText(text) {
  const [a, b] = String(text).split('_____');
  return h('div.fact-text', a, h('span.gap', { 'aria-label': 'blank' }), b ?? '');
}

export default {
  id: 'r2-write',
  layout: 'input',
  shot: 'write',
  mount({ sheet }, ctx) {
    const p = ctx.payload;
    const field = textField({ max: p.max || 40, placeholder: 'Your porky', onSubmit: () => tell() });
    const btn = button('Tell a porky', { onClick: () => tell(), e2e: 'submit' });
    function tell() {
      const t = field.input.value.trim();
      if (!t) { field.error(); return; }
      ctx.audio.sfx('plated');
      ctx.haptic('submit');
      ctx.client.submit(t);
    }
    sheet.append(
      h('div.card.fact-card', h('div.t-eyebrow', `Fact ${p.index + 1} of ${p.count}`), factText(p.fact.text)),
      field,
      h('div.sheet-actions', btn),
    );
    const offReject = ctx.client.on('reject', () => field.error());
    if (!ctx.frozen) setTimeout(() => field.input.focus({ preventScroll: true }), 450);
    const cancel = p.index === 0 ? sayLater(ctx, ctx.line('r2Write'), { delay: 300, compact: true }) : () => {};
    return { unmount() { offReject(); cancel(); } };
  },
};
