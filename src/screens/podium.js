// podium: camera dollies down the table; top 3 rise on the cake tiers; everyone else on the bill.
import './podium.css';
import { h, chip } from '../ui/components.js';
import { sayLater } from './common.js';

export default {
  id: 'podium',
  layout: 'show',
  shot: 'podiumStart',
  mount({ show }, ctx) {
    const rows = ctx.payload.rows || [];
    const top3 = rows.slice(0, 3);
    ctx.stage.setPodium(top3.map((r) => r.id));
    setTimeout(() => ctx.stage.setShot('podium', { duration: 3000, instant: ctx.frozen }), ctx.frozen ? 0 : 200);
    const winners = h('div.podium-names', top3.map((r, i) => h(`div.podium-name.p${i + 1}`,
      h('div.t-eyebrow.on-dark', ['Winner', 'Second', 'Third'][i]),
      h(i === 0 ? 'div.t-title-xl.on-dark' : 'div.t-heading.on-dark', ctx.player(r.id)?.name || '?'),
      h('div.podium-score', `${r.score}`))));
    const bill = h('div.bill',
      h('div.bill-head', h('span.t-eyebrow', 'The bill'), h('span.t-eyebrow', 'Table awards')),
      rows.map((r) => h('div.bill-row', h('span.bill-rank', `${r.rank}.`), chip(ctx.player(r.id)), h('span.bill-award', r.award?.title || ''), h('span.bill-score', String(r.score)))));
    show.append(h('div.podium-wrap', winners, bill));
    ctx.cyril.react('delight');
    if (top3[0]?.id === ctx.meId) ctx.haptic('win');
    if (!ctx.frozen) ctx.audio.sfx('fanfare');
    return { unmount: sayLater(ctx, ctx.line('podium'), { delay: 1200, hold: 2600 }) };
  },
};
