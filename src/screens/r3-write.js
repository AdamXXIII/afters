// r3-write: one prompt for the table, a field that never loses focus, and an order pad of four
// numbered tickets. Each answer is stamped onto the next ticket; "Another!" counts down.
import './r3.css';
import { h, button, textField } from '../ui/components.js';
import { sayIfFresh } from './r3-art.js';

export default {
  id: 'r3-write',
  layout: 'input',
  shot: 'write',
  mount({ sheet }, ctx) {
    const p = ctx.payload;
    const maxN = p.maxAnswers || 4;
    const field = textField({ max: p.max || 45, placeholder: 'Quick, another one…', onSubmit: () => add() });
    field.classList.add('r3w-field');
    const btnLabel = h('span.r3w-btn-l', 'Another!');
    const btnLeft = h('span.r3w-btn-n');
    const btn = button('', { onClick: () => add(), e2e: 'submit' });
    btn.classList.add('r3w-btn');
    btn.replaceChildren(btnLabel, btnLeft);

    const prompt = h('div.r3w-prompt',
      h('div.r3w-prompt-top', h('span.r3w-eyebrow', 'Last orders'), h('span.r3w-tag', `As many as you can`)),
      h(`div.r3w-prompt-t${p.prompt.length > 60 ? '.long' : ''}`, p.prompt));

    const tally = h('span.r3w-tally');
    const slots = Array.from({ length: maxN }, (_, i) => h('div.r3w-slot', { style: { '--tilt': `${[-1.2, 0.8, -0.6, 1.1][i % 4]}deg` } },
      h('span.r3w-no', `No.${i + 1}`),
      h('span.r3w-txt', ''),
      h('span.r3w-empty', i === 0 ? 'Your first order goes here' : 'Another one here'),
    ));
    const pad = h('div.r3w-pad', slots);
    const done = h('div.r3w-done', h('span.r3w-done-stamp', 'Order in'), h('span.r3w-done-s', 'That\'s your four. Lovely.'));
    const padWrap = h('div.r3w-pad-wrap',
      h('div.r3w-pad-head', h('span.r3w-pad-title', 'Your order pad'), tally),
      pad, done);

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
    sheet.append(prompt, h('div.r3w-entry', field, btn), padWrap);

    let shown = -1;
    const update = (c) => {
      const mine = c.mine.r3;
      const n = Math.min(maxN, mine.length);
      const animate = shown >= 0 && !c.frozen;
      slots.forEach((s, i) => {
        const filled = i < n;
        if (filled && !s.classList.contains('filled')) {
          s.querySelector('.r3w-txt').textContent = mine[i];
          s.classList.add('filled');
          if (animate) {
            s.classList.add('fresh');
            setTimeout(() => s.classList.remove('fresh'), 700);
          }
        }
        s.classList.toggle('next', i === n);
      });
      shown = n;
      const left = maxN - n;
      tally.textContent = `${n} of ${maxN}`;
      btnLeft.textContent = left > 0 ? `${left} left` : '';
      btnLabel.textContent = left === 0 ? 'All four served' : n === 0 ? 'Order it!' : 'Another!';
      btn.disabled = left === 0;
      field.input.disabled = left === 0;
      padWrap.classList.toggle('complete', left === 0);
      field.classList.toggle('gone', left === 0);
    };
    update(ctx);
    if (!ctx.frozen) setTimeout(() => field.input.focus({ preventScroll: true }), 450);
    return { update, unmount: sayIfFresh(ctx, ctx.line('r3Write'), { at: 300, window: 1500, compact: true, hold: 2000 }) };
  },
};
