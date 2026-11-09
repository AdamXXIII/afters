// r3-reveal: top 5 in reverse order with clinking glasses; #1 is "Toast of the Table".
import './r3.css';
import { h } from '../ui/components.js';
import { ICONS } from '../ui/icons.js';
import { timeline } from './common.js';

export default {
  id: 'r3-reveal',
  layout: 'show',
  shot: 'reveal',
  mount({ show }, ctx) {
    const p = ctx.payload;
    const byId = new Map(p.top.map((c) => [c.id, c]));
    const list = h('div.top5');
    const banner = h('div.toast-banner');
    const wrap = h('div.toast-wrap', h('div.t-eyebrow.on-dark', 'Last orders'), h('div.show-prompt', p.prompt), banner, list);
    show.append(wrap);
    const quiet = ctx.frozen;
    const sfx = (n, o) => { if (!quiet) ctx.audio.sfx(n, o); };
    const steps = p.steps.map((s) => ({
      at: s.at,
      fn: () => {
        const c = byId.get(s.cardId);
        const clinks = h('div.clinks');
        const el = h(`div.place-card.top-card${c.toast ? '.is-toast' : ''}`, h('span.rank', String(c.rank)), h('div.t-answer', c.text), clinks,
          h('div', h('span.stamp', `${ctx.player(c.authorId)?.name || '?'} +${c.points}`)));
        list.prepend(el);
        while (list.children.length > 3) list.lastChild.remove();
        c.glasses.forEach((_, k) => setTimeout(() => { clinks.append(h('span', { html: ICONS.glassFull })); sfx('clink', { step: k }); }, quiet ? 0 : 200 + k * 160));
      },
    }));
    steps.push({ at: p.toastAt, fn: () => {
      if (!p.toastIds.length) return;
      banner.replaceChildren(h('div.t-round.on-dark', 'Toast of the Table'));
      sfx('fanfare');
      ctx.cyril.react('delight');
      ctx.say(ctx.line('r3Toast'), { hold: 1500 });
      if (!ctx.reduced && !quiet) {
        const conf = h('div.confetti', Array.from({ length: 40 }, (_, i) => h('i', { style: {
          left: `${(i * 37) % 100}%`, background: i % 3 ? '#FBF4EA' : '#C89B3C', animationDelay: `${(i % 10) * 0.08}s`,
        } })));
        show.append(conf);
      }
    } });
    const tl = timeline(steps);
    tl.run(ctx);
    return { frame: (c) => tl.run(c) };
  },
};
