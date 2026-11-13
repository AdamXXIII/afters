// badtaste-win: the crowned card fills the blank, a brass rosette lands, the player behind it is
// named. Then the rest of the pile turns its owners' names over, and the crowns tally.
// A pure function of ctx.elapsed() so frozen shots and sync both work.
import { h } from '../../../ui/components.js';
import { promptCard, answerCard, disc, tag, cyrilDisc, nameOf } from './kit.js';

const AT = { card: 300, rosette: 1300, owner: 2100, rest: 3600, restStep: 450, tally: 5600 };

export default {
  id: 'badtaste-win',
  layout: 'show',
  shot: 'reveal',
  rail: true,
  mount({ show }, ctx) {
    const p = ctx.payload;
    const sp = ctx.phase?.speed || 1;
    const at = (k) => AT[k] / sp;
    const seed = ctx.phase?.seed || 1;
    const win = p.cards[p.winner];
    const house = win.by === 'house';
    const mine = win.by === ctx.meId;
    const critic = nameOf(ctx, p.critic);

    const pc = promptCard(ctx, p, { answer: win.text, timer: false, size: 'win' });
    const rosette = h('div.bt-rosette', h('span.t1', p.cyrilChose ? 'Cyril’s' : 'Critic’s'), h('span.t2', 'pick'));
    const owner = h('div.bt-owner',
      h('span.lbl', house ? 'Cyril’s own card.' : 'Played by'),
      house ? h('span.bt-tag.house.big', cyrilDisc(38), h('span.nm', 'Cyril')) : tag(ctx, win.by, { cls: '.big' }),
      house ? h('span.bt-plus.none', 'Nobody scores') : h('span.bt-plus', '+1 crown'));
    const rest = p.cards.filter((_, i) => i !== p.winner).map((c, i) => h('div.bt-restrow', { style: { '--i': i } },
      h('span.bt-rest-t', c.text[0].toUpperCase() + c.text.slice(1)),
      c.by === 'house' ? h('span.bt-rest-by', cyrilDisc(24), 'Cyril') : h('span.bt-rest-by', disc(ctx.player(c.by), { size: 24 }), c.by === ctx.meId ? 'You' : nameOf(ctx, c.by))));
    const restBox = h('div.bt-rest', h('div.bt-rest-h', 'The rest of the pile'), rest);
    const tally = h('div.bt-tally', p.scores.map((r) => h(`div.bt-tallyi${r.id === win.by ? '.won' : ''}${r.id === ctx.meId ? '.me' : ''}`,
      disc(ctx.player(r.id), { size: 28 }),
      h('span.bt-crowns', Array.from({ length: Math.min(r.score, 6) }, () => h('i')), r.score > 6 ? h('b', `${r.score}`) : null, r.score ? null : h('span.z', '0')))));
    const note = p.cyrilChose ? h('div.bt-note', `${critic} ran out of time. Cyril picked one.`)
      : mine ? h('div.bt-note.you', `${critic} crowned yours.`) : null;
    const wrap = h(`div.bt-win${house ? '.house' : ''}`, h('div.bt-wincard', pc, rosette), note, owner, restBox, tally);
    show.append(wrap);

    const beats = [
      ['card', () => { wrap.classList.add('s-card'); ctx.cyril.react('drumroll', { duration: 900 }); }],
      ['rosette', () => { wrap.classList.add('s-rosette'); if (!ctx.frozen) { ctx.audio.sfx('stamp'); ctx.stage.shake?.(); ctx.haptic('stamp'); } }],
      ['owner', () => {
        wrap.classList.add('s-owner');
        if (!ctx.frozen) { ctx.audio.sfx(house ? 'groan' : 'truth'); if (mine) ctx.haptic('win'); }
        ctx.cyril.react(house ? 'smug' : 'delight', { duration: ctx.frozen ? 60000 : 1500 });
        const key = house ? 'btHouse' : p.cyrilChose ? 'btCyrilChose' : 'btWin';
        ctx.say(ctx.line(key, { name: nameOf(ctx, win.by), critic }), { hold: 2400, placement: 'side' });
      }],
      ['rest', () => wrap.classList.add('s-rest')],
      ['tally', () => { wrap.classList.add('s-tally'); if (!ctx.frozen) ctx.audio.sfx('countup', { ticks: 4 }); }],
    ];
    const fired = new Set();
    const run = (c) => {
      const t = c.elapsed();
      for (const [k, fn] of beats) if (!fired.has(k) && t >= at(k)) { fired.add(k); try { fn(); } catch (e) { console.error('[badtaste-win]', e); } }
    };
    if (ctx.frozen) wrap.classList.add('frozen');
    run(ctx);
    return { frame: run };
  },
};
