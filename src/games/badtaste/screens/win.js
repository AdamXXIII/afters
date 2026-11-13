// badtaste-win: the crowned card fills the blank, a brass rosette lands, the player behind it is
// named. Then the rest of the pile turns its owners' names over, and the crowns tally.
// A pure function of ctx.elapsed() so frozen shots and sync both work.
import { h } from '../../../ui/components.js';
import { promptCard, disc, cyrilDisc, nameOf } from './kit.js';

const CROWN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 8.5l4.3 3.6L12 5l4.2 7.1 4.3-3.6-1.7 9.5H5.2z" fill="currentColor"/><rect x="5.2" y="19.2" width="13.6" height="2.3" rx="1" fill="currentColor"/></svg>';

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
    const pl = ctx.player(win.by);
    const owner = h(`div.bt-owner${mine ? '.mine' : ''}`,
      house ? cyrilDisc(60) : disc(pl, { size: 60 }),
      h('div.bt-owner-t',
        h('span.lbl', house ? 'Cyril’s own card' : mine ? 'Your card won' : 'Played by'),
        h('span.nm', house ? 'Cyril' : mine ? 'You' : pl?.name || '?')),
      house ? h('span.bt-plus.none', 'Nobody scores') : h('span.bt-plus', { html: `${CROWN}<b>+1</b>` }));
    const rest = p.cards.filter((_, i) => i !== p.winner).map((c, i) => h('div.bt-restrow', { style: { '--i': i } },
      h('span.bt-rest-t', c.text[0].toUpperCase() + c.text.slice(1)),
      c.by === 'house' ? h('span.bt-rest-by', cyrilDisc(24), 'Cyril') : h('span.bt-rest-by', disc(ctx.player(c.by), { size: 24 }), c.by === ctx.meId ? 'You' : nameOf(ctx, c.by))));
    const restBox = h('div.bt-rest', h('div.bt-rest-h', 'Who played the rest'), rest);
    const tally = h('div.bt-tally', h('div.bt-tally-h', { html: `${CROWN}<span>Crowns so far</span>` }), h('div.bt-tally-l', p.scores.map((r) => h(`div.bt-tallyi${r.id === win.by ? '.won' : ''}${r.id === ctx.meId ? '.me' : ''}`,
      disc(ctx.player(r.id), { size: 24 }),
      h('span.nm', r.id === ctx.meId ? 'You' : nameOf(ctx, r.id)),
      h('b', String(r.score))))));
    const note = p.cyrilChose ? h('div.bt-note', `${critic} ran out of time. Cyril picked one.`)
      : p.decider ? h('div.bt-note', 'The decider') : null;
    const next = h('div.bt-next');
    tally.append(next);
    const wrap = h(`div.bt-win${house ? '.house' : ''}${p.cards.length > 5 ? '.many' : ''}`, h('div.bt-wincard', pc, rosette), note, owner, restBox, tally);
    show.append(wrap);

    const beats = [
      ['card', () => { wrap.classList.add('s-card'); ctx.cyril.react('drumroll', { duration: 900 }); }],
      ['rosette', () => { wrap.classList.add('s-rosette'); if (!ctx.frozen) { ctx.audio.sfx('stamp'); ctx.stage.shake?.(); ctx.haptic('stamp'); } }],
      ['owner', () => {
        wrap.classList.add('s-owner');
        if (!ctx.frozen) { ctx.audio.sfx(house ? 'groan' : 'truth'); if (mine) ctx.haptic('win'); }
        ctx.cyril.react(house ? 'smug' : 'delight', { duration: ctx.frozen ? 60000 : 1500 });
        const key = house ? 'btHouse' : p.cyrilChose ? 'btCyrilChose' : 'btWin';
        if (p.cards.length <= 5) ctx.say(ctx.line(key, { name: nameOf(ctx, win.by), critic }), { hold: 2400, placement: 'side' });
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
    let lastSec = -1;
    const tick = (c) => {
      run(c);
      const sec = Math.max(0, Math.ceil(c.remaining() / 1000));
      if (sec === lastSec) return;
      lastSec = sec;
      next.innerHTML = p.last && !p.decider ? `Final scores in <b>${sec}</b>` : `Next round in <b>${sec}</b>`;
    };
    tick(ctx);
    return { frame: tick };
  },
};
