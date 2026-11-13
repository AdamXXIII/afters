// badtaste-win, in two beats. The moment: the crowned answer alone, big, on its own card, with the
// Critic's name and a brass rosette, then the player behind it. The summary: the whole line, who
// played the rest, and the crowns so far. A pure function of ctx.elapsed() (frozen shots, sync).
import { h } from '../../../ui/components.js';
import { promptCard, disc, cyrilDisc, criticBadge, nameOf } from './kit.js';
import { cap } from '../content/index.js';

const CROWN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 8.5l4.3 3.6L12 5l4.2 7.1 4.3-3.6-1.7 9.5H5.2z" fill="currentColor"/><rect x="5.2" y="19.2" width="13.6" height="2.3" rx="1" fill="currentColor"/></svg>';

const AT = { card: 300, rosette: 1100, owner: 1900, rest: 4600, tally: 5600 };

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
        h('span.nm', house ? 'Cyril' : mine ? 'You' : pl?.name || '?'),
        h('span.bt-owner-line', `“${win.text[0].toUpperCase()}${win.text.slice(1)}”`)),
      house ? h('span.bt-plus.none', 'Nobody scores') : h('span.bt-plus', { html: `${CROWN}<b>+${p.deltas[win.by] || 1}</b>` }));
    const rest = p.cards.filter((_, i) => i !== p.winner).map((c, i) => h('div.bt-restrow', { style: { '--i': i } },
      h('span.bt-rest-t', c.text[0].toUpperCase() + c.text.slice(1)),
      c.by === 'house' ? h('span.bt-rest-by', cyrilDisc(24), 'Cyril') : h('span.bt-rest-by', disc(ctx.player(c.by), { size: 24 }), c.by === ctx.meId ? 'You' : nameOf(ctx, c.by))));
    const restBox = h('div.bt-rest', h('div.bt-rest-h', 'Who played the rest'), rest);
    const tally = h('div.bt-tally', h('div.bt-tally-h', { html: p.duo ? `${CROWN}<span>Crowns so far · you two ${p.scores.reduce((n, r) => n + r.score, 0)}, Cyril ${p.house || 0}</span>` : `${CROWN}<span>Crowns so far</span>` }), h('div.bt-tally-l', p.scores.map((r) => h(`div.bt-tallyi${r.id === win.by ? '.won' : ''}${r.id === ctx.meId ? '.me' : ''}`,
      disc(ctx.player(r.id), { size: 24 }),
      h('span.nm', r.id === ctx.meId ? 'You' : nameOf(ctx, r.id)),
      h('b', String(r.score)))).concat(p.duo ? [h(`div.bt-tallyi.cyril${house ? '.won' : ''}`, cyrilDisc(24), h('span.nm', 'Cyril'), h('b', String(p.house || 0)))] : [])));
    const note = p.decider ? h('div.bt-note', 'The decider') : null;
    const next = h('div.bt-next');
    tally.append(next);
    // beat one: the winner alone
    const momentOwner = h('div.bt-m-owner',
      house ? cyrilDisc(52) : disc(pl, { size: 52 }),
      h('span.nm', house ? 'Cyril’s own card' : mine ? 'You' : pl?.name || '?'),
      house ? h('span.bt-plus.none', 'Nobody scores') : h('span.bt-plus', { html: `${CROWN}<b>+${p.deltas[win.by] || 1}</b>` }));
    const moment = h('div.bt-moment',
      h('div.bt-m-critic', p.cyrilChose ? cyrilDisc(30) : criticBadge(ctx.player(p.critic), { size: 30 }),
        h('span', p.cyrilChose ? `${critic} ran out of time. Cyril picked` : p.critic === ctx.meId ? 'You crowned' : `${critic} crowned`)),
      h(`div.bt-m-card${win.text.length > 30 ? '.long' : ''}`, h('span.bt-m-t', cap(win.text)), rosette),
      momentOwner);
    // beat two: the summary
    const summary = h('div.bt-summary', h('div.bt-wincard', pc), note, owner, restBox, tally);
    const wrap = h(`div.bt-win${house ? '.house' : ''}${p.cards.length > 5 ? '.many' : ''}`, moment, summary);
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
