// r1-write: two prompts, one at a time. Field (max 60) + "Serve it". (DESIGN 2.3)
import { h, button, textField } from '../ui/components.js';
import { promptCard, sayLater } from './common.js';

export default {
  id: 'r1-write',
  layout: 'input',
  shot: 'write',
  mount({ sheet }, ctx) {
    const prompts = ctx.priv.prompts || [];
    const max = ctx.payload.max || 60;
    const body = h('div.col.grow');
    sheet.append(body);
    let saidTen = false;

    const render = (c) => {
      const left = prompts.filter((p) => c.mine.submitted[p.matchupId] === undefined);
      const cur = left[0];
      if (!cur) return;
      if (body.dataset.slot === cur.matchupId) return;
      body.dataset.slot = cur.matchupId;
      const idx = prompts.indexOf(cur) + 1;
      const field = textField({ max, placeholder: 'Your answer', onSubmit: () => serve() });
      const serveBtn = button('Serve it', { onClick: () => serve(), e2e: 'submit' });
      const card = promptCard(cur.prompt, { eyebrow: `Prompt ${idx} of ${prompts.length}`, round: 1 });
      function serve() {
        const text = field.input.value.trim();
        if (!text) { field.error(); return; }
        c.audio.sfx('plated');
        c.haptic('submit');
        card.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-160px) rotate(-4deg) scale(.8)', opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.64,0,.78,0)', fill: 'forwards' });
        setTimeout(() => ctx.client.submit(text, cur.matchupId), 200);
      }
      body.replaceChildren(card, field, h('div.sheet-actions', serveBtn));
      body.classList.remove('enter-up'); void body.offsetWidth; body.classList.add('enter-up');
      if (!c.frozen) setTimeout(() => field.input.focus({ preventScroll: true }), 450);
    };
    render(ctx);
    const cancel = sayLater(ctx, ctx.line('r1Write'), { delay: 300, compact: true, hold: 2600 });
    return {
      update: render,
      frame(c) {
        if (!saidTen && c.duration && c.remaining() < 10000 && c.remaining() > 8000) { saidTen = true; c.say(c.line('timer10'), { compact: true }); }
      },
      unmount: cancel,
    };
  },
};
