// Character Witness: the opening summons (how it plays), the standings, the cross-examination card.
import { h } from '../../../ui/components.js';
import { disc, dock, statement, seal, sayLater, skipBtn } from './kit.js';

function summons({ title, rules, art, cls = '', foot = null }) {
  return h(`div.wt-summons${cls}`,
    h('div.wt-summons-title', title),
    art ? h('div.wt-summons-art', art) : null,
    h('ol.wt-rules', rules.map((r, i) => h('li', h('span.n', String(i + 1)), h('span.t', r)))),
    foot ? h('div.wt-summons-foot', foot) : null);
}

function fan(seed) {
  const a = statement('the photo albums', { cls: '.mini', seed, key: 'a' });
  const b = statement('my nan’s radio', { cls: '.mini', seed, key: 'b' });
  const c = statement('a signed football', { cls: '.mini', seed, key: 'c' });
  b.append(seal('Sworn', '.sm'));
  a.append(h('span.wt-ministamp', 'Fake'));
  c.append(h('span.wt-ministamp', 'Fake'));
  return h('div.wt-fan', a, b, c);
}

const intro = {
  id: 'witness-intro',
  layout: 'show',
  shot: 'intro',
  mount({ show }, ctx) {
    const card = summons({
      title: 'Character Witness',
      art: fan(ctx.phase?.seed || 1),
      rules: [
        'One of you answers a question about yourself. Honestly.',
        'Everyone else writes a fake answer in that person’s voice.',
        'Find the real one. Fool the table to score.',
      ],
      foot: `${ctx.payload.rounds} in the dock. Points double halfway, then a cross-examination for triple.`,
    });
    show.append(h('div.wt-dim'), h('div.wt-cardwrap', card));
    if (!ctx.frozen) card.animate([{ transform: 'translateY(28px) rotate(-2deg) scale(.94)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 620, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' });
    const sk = skipBtn(ctx, show);
    const cancel = sayLater(ctx, ctx.line(ctx.payload.plays > 1 ? 'wtIntroAgain' : 'wtIntro'), { delay: 900, hold: 3000 });
    ctx.cyril.react('smug', { duration: ctx.frozen ? 60000 : 1200 });
    return { frame: (c) => sk?.(c), unmount: cancel };
  },
};

const scores = {
  id: 'witness-scores',
  layout: 'show',
  shot: 'scores',
  mount({ show }, ctx) {
    const rows = ctx.payload.rows || [];
    const next = ctx.player(ctx.payload.next);
    const list = rows.map((r, i) => {
      const pl = ctx.player(r.id);
      const me = r.id === ctx.meId;
      return h(`div.wt-srow${i === 0 ? '.top' : ''}${me ? '.me' : ''}${r.id === ctx.payload.next ? '.next' : ''}`, { style: { '--i': i } },
        h('span.rk', String(r.rank ?? i + 1)), disc(pl, { size: i === 0 ? 44 : 34 }), h('span.nm', me ? 'You' : pl?.name || '?'), h('span.sc', String(r.score)));
    });
    show.append(h('div.wt-scores',
      h('div.wt-scores-h', 'The standings'),
      h('div.wt-slist', list),
      h('div.wt-nextup', dock(next, { size: 46 }), h('div', h('b', ctx.payload.next === ctx.meId ? 'You take the stand next' : `${next?.name || '?'} takes the stand next`), h('small', 'Last place. Fooled jurors pay them, triple.')))));
    if (!ctx.frozen) ctx.audio.sfx('fanfare');
    ctx.cyril.react('delight', { duration: ctx.frozen ? 60000 : 1200 });
    const cancel = sayLater(ctx, ctx.line('wtScores'), { delay: 900 });
    return { unmount: cancel };
  },
};

const crossIntro = {
  id: 'witness-cross-intro',
  layout: 'show',
  shot: 'intro',
  mount({ show }, ctx) {
    const def = ctx.player(ctx.payload.defendant);
    const me = ctx.payload.defendant === ctx.meId;
    const card = summons({
      title: 'Cross-examination',
      cls: '.cross',
      art: h('div.wt-cross-art', dock(def, { size: 92 }), h('div.wt-cross-nm', me ? 'You' : def?.name || '?'), h('span.wt-x2.big', 'Triple points')),
      rules: [
        `${me ? 'You answer' : `${def?.name || '?'} answers`} one last question, honestly.`,
        `${me ? 'You keep' : 'They keep'} two fakes to stand beside it.`,
        'Find the real one. Everything pays triple.',
      ],
    });
    show.append(h('div.wt-dim'), h('div.wt-cardwrap', card));
    if (!ctx.frozen) { card.animate([{ transform: 'translateY(28px) rotate(2deg) scale(.94)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 620, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' }); ctx.audio.sfx('bell'); }
    const sk = skipBtn(ctx, show);
    const cancel = sayLater(ctx, ctx.line('wtCross'), { delay: 900 });
    ctx.cyril.react('drumroll', { duration: ctx.frozen ? 60000 : 1400 });
    return { frame: (c) => sk?.(c), unmount: cancel };
  },
};

export default [intro, scores, crossIntro];
