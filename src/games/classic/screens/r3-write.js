// r3-write: one prompt for the table, a field that never loses focus, and an order pad of four
// numbered tickets. Each answer is stamped onto the next ticket; "Another!" counts down.
import './r3.css';
import { h, button, textField } from '../../../ui/components.js';
import { sayIfFresh } from './r3-art.js';

const EMPTY = ['Your first order goes here', 'And another…', 'Keep them coming', 'Last one, chef'];
const QUIPS = [null, 'One down. Splendid.', 'Two! Steady on.', 'Three. Show-off.', 'Four. Kitchen\'s closed.'];

export default {
  id: 'r3-write',
  layout: 'input',
  shot: 'write',
  mount({ sheet }, ctx) {
    const p = ctx.payload;
    const maxN = p.maxAnswers || 4;
    const field = textField({ max: p.max || 45, placeholder: 'Quick, another one…', onSubmit: () => add() });
    field.classList.add('r3w-field');
    field.prepend(h('span.r3w-pen', { 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24"><path d="M4 20l1.5-5L16 4.5l3.5 3.5L9 18.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M14 6.5l3.5 3.5" stroke="currentColor" stroke-width="2"/></svg>' }));
    const btnLabel = h('span.r3w-btn-l', 'Another!');
    const btnLeft = h('span.r3w-btn-n');
    const btn = button('', { onClick: () => add(), e2e: 'submit' });
    btn.classList.add('r3w-btn');
    btn.replaceChildren(btnLabel, btnLeft);

    const tag = h('span.r3w-tag', 'Sends when time\'s up');
    const prompt = h('div.r3w-prompt',
      h('div.r3w-prompt-top', h('span.r3w-eyebrow', 'Last orders'), tag),
      h(`div.r3w-prompt-t${p.prompt.length > 60 ? '.long' : ''}`, p.prompt));

    const tally = h('span.r3w-tally');
    const slots = Array.from({ length: maxN }, (_, i) => h('div.r3w-slot', { style: { '--tilt': `${[-1.2, 0.8, -0.6, 1.1][i % 4]}deg` } },
      h('span.r3w-no', `No.${i + 1}`),
      h('span.r3w-txt', ''),
      h('span.r3w-empty', EMPTY[i % EMPTY.length]),
      h('span.r3w-nextup', 'Next up'),
    ));
    const pad = h('div.r3w-pad', slots);
    const doneS = h('span.r3w-done-s', 'That\'s your four. Lovely.');
    const done = h('div.r3w-done', h('span.r3w-done-stamp', 'Order in'), doneS);
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
      btn.disabled = true;
      field.input.focus({ preventScroll: true });
    }
    // keep the keyboard up: never let the button steal focus
    btn.addEventListener('pointerdown', (e) => e.preventDefault());
    // "That's my lot": done with fewer than four. Never steals focus, so you can still add more.
    const lot = button('That\'s my lot', { kind: 'secondary', e2e: 'lot', onClick: () => {
      if (!ctx.client.state.mine.r3.length || ctx.client.state.mine.game?.lot) return;
      ctx.client.act('lot', {}, { lot: true });
      ctx.audio.sfx('stamp');
      ctx.haptic('stamp');
    } });
    lot.classList.add('r3w-lot');
    lot.addEventListener('pointerdown', (e) => e.preventDefault());
    const tip = h('div.r3w-tip', h('b', 'Tip: '), 'short and silly beats clever.');
    const wait = h('div.r3w-wait');
    sheet.append(prompt, h('div.r3w-entry', field, btn), padWrap, lot, wait, tip);
    const syncBtn = () => { btn.disabled = !field.input.value.trim() || ctx.client.state.mine.r3.length >= maxN; };
    field.input.addEventListener('input', syncBtn);

    let shown = -1;
    let saidStrag = false;
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
            if (i === n - 1 && QUIPS[n]) c.say(QUIPS[n], { compact: true, hold: 1300 });
          }
        }
        s.classList.toggle('next', i === n);
      });
      shown = n;
      const left = maxN - n;
      tally.textContent = `${n} of ${maxN}`;
      btnLeft.textContent = '';
      btnLabel.textContent = left === 0 ? 'All four served' : n === 0 ? 'Order it!' : 'Another!';
      btn.disabled = left === 0 || !field.input.value.trim();
      field.input.disabled = left === 0;
      const isLot = !!c.mine.game?.lot && n > 0;
      const finished = left === 0 || isLot;
      padWrap.classList.toggle('complete', finished);
      padWrap.classList.toggle('lot', isLot && left > 0);
      padWrap.classList.toggle('started', n > 0);
      doneS.textContent = left === 0 ? 'That\'s your four. Lovely.' : `${n} sent. Thought of another? Add it.`;
      field.classList.toggle('gone', left === 0);
      lot.hidden = n === 0 || finished;
      tip.hidden = n > 0;
      // the straggler: everyone else is done, the clock drops to 10 s
      const strag = c.progress?.straggler;
      if (strag && strag === c.meId && !finished) {
        wait.textContent = '';
        wait.className = 'r3w-wait';
        tag.textContent = 'All waiting on you!';
        tag.classList.add('hurry');
        if (!saidStrag && !c.frozen) { saidStrag = true; c.say(`${c.me?.name || 'You'}, the kitchen's closing!`, { compact: true, hold: 1600 }); }
      }
      if (!(strag && strag === c.meId && !finished) && tag.classList.contains('hurry')) { tag.textContent = 'Sends when time\'s up'; tag.classList.remove('hurry'); }
      if (strag && strag === c.meId && !finished) {
        // handled above
      } else if (strag && strag !== c.meId && finished) {
        wait.textContent = `Waiting on ${c.player(strag)?.name || 'someone'}…`;
        wait.className = 'r3w-wait';
      } else {
        wait.textContent = '';
        wait.className = 'r3w-wait';
      }
    };
    update(ctx);
    if (!ctx.frozen) setTimeout(() => field.input.focus({ preventScroll: true }), 450);
    return { update, unmount: sayIfFresh(ctx, ctx.line('r3Write'), { at: 300, window: 1500, compact: true, hold: 2000 }) };
  },
};
