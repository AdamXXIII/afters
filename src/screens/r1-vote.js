// r1-vote: prompt + A/B place cards on the show layer; two big choice buttons (authors look innocent).
import './r1.css';
import { h, choice, placeCard } from '../ui/components.js';
import { showTimer, sayLater, tiltFor } from './common.js';

export default {
  id: 'r1-vote',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const seed = ctx.phase.seed;
    const timer = showTimer(show);
    show.append(h('div.show-top.with-timer',
      h('div.t-eyebrow.on-dark', `Matchup ${p.index + 1} of ${p.count}`),
      h('div.show-prompt', p.prompt)));
    show.append(h('div.ab-cards', p.answers.map((a, i) => {
      const card = placeCard(a.text, { tilt: (i ? 2 : -2) + tiltFor(seed, a.key, 1) });
      card.prepend(h('div.ab-key', a.key));
      return card;
    })));

    let buttons = [];
    if (ctx.priv.role === 'author') {
      sheet.append(h('div.waiting-card', h('div.t-heading', 'This is yours. Look innocent.'), h('p.t-body.t-muted', 'The table is voting on your plate right now.')));
    } else {
      sheet.append(h('div.t-eyebrow', 'Which plate was better?'));
      buttons = p.answers.map((a) => {
        const b = choice(a.text, { tall: true, tag: a.key, selected: ctx.mine.vote === a.key, e2e: `vote-${a.key}`, onPick: () => ctx.client.vote(a.key) });
        b.style.setProperty('--round', 'var(--round-1)');
        sheet.append(b);
        return b;
      });
      sheet.append(h('p.t-body.t-muted.center', 'You can change your mind until the candle burns down.'));
    }
    const cancel = sayLater(ctx, ctx.line('r1Vote'), { delay: 300, hold: 2200 });
    return {
      update(c) { buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(c.mine.vote === p.answers[i].key))); },
      frame(c) { timer.set(c.remaining(), c.duration); },
      unmount: cancel,
    };
  },
};
