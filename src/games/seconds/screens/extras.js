// Who Had Seconds? cards: the intro (how it plays), each new faker, standings, last call.
import { h } from '../../../ui/components.js';
import { disc, placeCards, say, skipBtn, TYPE_ICON, TYPE_NAME } from './kit.js';

function menuCard({ title, art, lede, rules, final = false }) {
  return h(`div.sc-card${final ? '.final' : ''}`,
    h('div.sc-card-title', title),
    art ? h('div.sc-card-art', art) : null,
    lede ? h('div.sc-card-lede', lede) : null,
    rules ? h('ol.sc-rules', rules.map((r, i) => h('li', h('span.n', String(i + 1)), h('span', r)))) : null);
}

function enter(card, ctx, tilt = -3) {
  if (ctx.frozen || ctx.reduced) return;
  card.animate([{ transform: `translateY(30px) rotate(${tilt}deg) scale(.92)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 650, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' });
}

const intro = {
  id: 'seconds-intro',
  layout: 'show',
  shot: 'intro',
  mount({ show }, ctx) {
    const types = h('div.sc-typesrow', Object.keys(TYPE_ICON).map((k) => h('span.sc-typechip', h('span.ic', { html: TYPE_ICON[k] }), TYPE_NAME[k])));
    const card = menuCard({
      title: 'Who Had Seconds?',
      art: placeCards({ n: 5, odd: 3 }),
      rules: [
        'Everyone reads the same secret task. One faker gets nothing and bluffs.',
        'On three, everyone does it at once.',
        'Point at the faker. Catch them early for more points.',
      ],
    });
    card.append(types);
    show.append(h('div.sc-dim'), h('div.sc-cardstage', card));
    enter(card, ctx);
    const sk = skipBtn(ctx, show);
    const cancel = say(ctx, ctx.line(ctx.payload.plays > 1 ? 'scIntroAgain' : 'scIntro'), { hold: 3000 }, 900);
    return { frame: (c) => sk?.(c), unmount: cancel };
  },
};

const turn = {
  id: 'seconds-turn',
  layout: 'show',
  shot: 'intro',
  mount({ show }, ctx) {
    const p = ctx.payload;
    const card = menuCard({
      title: p.two ? 'Two of you had seconds.' : 'Someone had seconds.',
      art: placeCards({ n: 5, odd: 1 + (p.turn % 3), two: p.two }),
      lede: p.two ? 'Two fakers. They don’t know each other.' : 'Read your task. Look innocent.',
    });
    card.prepend(h('div.sc-card-count', `Faker ${p.turn + 1} of ${p.turns}`));
    card.classList.add('turn');
    if (p.two) card.classList.add('two');
    show.append(h('div.sc-dim'), h('div.sc-cardstage', card));
    enter(card, ctx, p.turn % 2 ? 3 : -3);
    if (!ctx.frozen) ctx.audio.sfx('curtain');
    const sk = skipBtn(ctx, show);
    const cancel = say(ctx, ctx.line(p.two ? 'scTwo' : 'scTurn'), {}, 700);
    ctx.cyril.react('smug', { duration: ctx.frozen ? 60000 : 1400 });
    return { frame: (c) => sk?.(c), unmount: cancel };
  },
};

const scores = {
  id: 'seconds-scores',
  layout: 'show',
  shot: 'scores',
  mount({ show }, ctx) {
    const rows = ctx.payload.rows || [];
    const list = h('div.sc-board', rows.map((r, i) => {
      const pl = ctx.player(r.id);
      return h(`div.sc-boardrow${i === 0 ? '.first' : ''}${r.id === ctx.meId ? '.me' : ''}`, { style: { '--d': `${i * 70}ms` } },
        h('span.rk', String(r.rank)), disc(pl, { size: i === 0 ? 44 : 34 }), h('span.nm', pl?.name || '?'), h('span.sc', String(r.score)));
    }));
    show.append(h('div.sc-scores', h('div.sc-scores-t', 'Before last call'), list));
    if (!ctx.frozen) ctx.audio.sfx('fanfare');
    ctx.cyril.react('delight', { duration: ctx.frozen ? 60000 : 1200 });
    const sk = skipBtn(ctx, show);
    const cancel = say(ctx, ctx.line('scScores'), {}, 900);
    return { frame: (c) => sk?.(c), unmount: cancel };
  },
};

const finalIntro = {
  id: 'seconds-final-intro',
  layout: 'show',
  shot: 'intro',
  mount({ show }, ctx) {
    const card = menuCard({
      title: 'Last call',
      final: true,
      art: placeCards({ n: 5, odd: -1 }),
      lede: 'One task. Double points. Someone had seconds. Maybe everyone did.',
      rules: ['If your phone says you had seconds, you might not be alone.', 'Think nobody got the task? Vote “We’re all faking”.'],
    });
    card.querySelectorAll('.sc-pcard').forEach((c) => { c.classList.add('odd'); c.textContent = '?'; });
    show.append(h('div.sc-dim'), h('div.sc-cardstage', card));
    enter(card, ctx, 3);
    if (!ctx.frozen) ctx.audio.sfx('bell');
    const sk = skipBtn(ctx, show);
    const cancel = say(ctx, ctx.line('scFinal'), {}, 900);
    return { frame: (c) => sk?.(c), unmount: cancel };
  },
};

export { disc };
export default [intro, turn, scores, finalIntro];
