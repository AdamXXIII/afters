// r2-pick: the fact large + fanned place cards; option list in the sheet (own porky greyed).
import './r2.css';
import { h, choice, placeCard } from '../ui/components.js';
import { showTimer, sayLater } from './common.js';
import { factText } from './r2-write.js';

export default {
  id: 'r2-pick',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const timer = showTimer(show);
    const fact = factText(p.fact.text);
    fact.classList.add('show-fact');
    show.append(h('div.show-top.with-timer', h('div.t-eyebrow.on-dark', `Fact ${p.index + 1} of ${p.count}`), fact));
    const n = p.options.length;
    show.append(h('div.fan', p.options.map((o, i) => {
      const a = (i - (n - 1) / 2) * (40 / Math.max(1, n - 1));
      const c = placeCard(o.text, { tilt: a });
      return c;
    })));
    const own = ctx.priv.ownOptionId;
    const list = h('div.pick-list');
    const btns = p.options.map((o) => {
      const b = choice(o.text, { mine: o.id === own, tag: o.id === own ? 'Yours' : null, selected: ctx.mine.pick === o.id, e2e: 'pick', onPick: () => ctx.client.pick(o.id) });
      list.append(b);
      return b;
    });
    sheet.append(h('div.t-eyebrow', 'Which one is true?'), list);
    const cancel = p.index === 0 ? sayLater(ctx, ctx.line('r2Pick'), { delay: 300 }) : () => {};
    return {
      update(c) { btns.forEach((b, i) => b.setAttribute('aria-pressed', String(c.mine.pick === p.options[i].id))); },
      frame(c) { timer.set(c.remaining(), c.duration); },
      unmount: cancel,
    };
  },
};
