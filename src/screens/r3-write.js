// r3-write: one prompt, field stays focused, answers drop into a ticket stack. Max 4. "Another!"
import './r3.css';
import { h, button, textField } from '../ui/components.js';
import { promptCard, sayLater } from './common.js';

export default {
  id: 'r3-write',
  layout: 'input',
  shot: 'write',
  mount({ sheet }, ctx) {
    const p = ctx.payload;
    const maxN = p.maxAnswers || 4;
    const field = textField({ max: p.max || 45, placeholder: 'Quick, another one', onSubmit: () => add() });
    const btn = button('Another!', { onClick: () => add(), e2e: 'submit' });
    const counter = h('span.t-eyebrow');
    const tickets = h('div.tickets');
    function add() {
      const t = field.input.value.trim();
      if (!t) { field.error(); return; }
      if (ctx.client.state.mine.r3.length >= maxN) return;
      ctx.audio.sfx('plated');
      ctx.haptic('submit');
      ctx.client.submit(t);
      field.clear();
      field.input.focus({ preventScroll: true });
    }
    // keep the keyboard up: never let the button steal focus
    btn.addEventListener('pointerdown', (e) => e.preventDefault());
    sheet.append(promptCard(p.prompt, { eyebrow: 'Last orders', round: 3 }), field, h('div.r3-count', counter), btn, tickets);
    let shown = 0;
    const update = (c) => {
      const mine = c.mine.r3;
      while (shown < mine.length) tickets.prepend(h('div.ticket', mine[shown++]));
      counter.textContent = mine.length >= maxN ? 'That\'s your four. Lovely.' : `${mine.length} of ${maxN} answers`;
      btn.disabled = mine.length >= maxN;
      field.input.disabled = mine.length >= maxN;
    };
    update(ctx);
    if (!ctx.frozen) setTimeout(() => field.input.focus({ preventScroll: true }), 450);
    return { update, unmount: sayLater(ctx, ctx.line('r3Write'), { delay: 300, compact: true }) };
  },
};
