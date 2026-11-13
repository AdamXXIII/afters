// Something in the Soup: the final table (share the pot or banish again), its reveal, and the end.
import { h, onTap } from '../../../ui/components.js';
import { header, say, nameOf, disc, isGhost, ghostRibbon, tureen, money, VIAL, SPOON, WISP } from './kit.js';

const final = {
  id: 'soup-final',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const hd = header(ctx, { title: 'The final table', line: 'All share, or banish again. A Poisoner here takes the lot.', tone: 'brass' });
    const ring = h('div.sp-finalists', p.alive.map((id) => h('div.sp-seat.in', disc(ctx, id, { size: 40 }), h('span.nm', nameOf(ctx, id)))));
    show.append(h('div.sp-top', hd, ring));
    let body;
    let share; let again;
    if (isGhost(ctx)) {
      body = h('div.sp-sheet.sp-ghostsheet.sp-in', ghostRibbon(ctx), h('div.sp-ghost-b', 'The finalists decide. If a Poisoner is among them and everyone shares, the Poisoners take the lot.'));
    } else {
      share = h('button.sp-big.share', { type: 'button', 'data-e2e': 'sp-share' }, h('span.ic', { html: SPOON }), h('b', 'Share the pot'), h('span', 'I trust everyone left'));
      again = h('button.sp-big.again', { type: 'button', 'data-e2e': 'sp-again' }, h('span.ic', { html: VIAL }), h('b', 'Banish again'), h('span', 'Someone here is a Poisoner'));
      onTap(share, () => ctx.client.act('sp-final', { choice: 'share' }, { choice: 'share' }), { sound: 'select', buzz: 'select' });
      onTap(again, () => ctx.client.act('sp-final', { choice: 'banish' }, { choice: 'banish' }), { sound: 'select', buzz: 'select' });
      body = h('div.sp-sheet.sp-in', h('div.sp-potline', 'In the pot: ', h('b', money(p.pot))), h('div.sp-bigrow', share, again), h('div.sp-hint', 'Choices are revealed one by one. You can change yours until the clock runs out.'));
    }
    sheet.append(body);
    const cancel = say(ctx, ctx.line('spFinal'), { hold: 3600 }, 600);
    ctx.cyril.react('drumroll', { duration: ctx.frozen ? 60000 : 1200 });
    const update = (c) => {
      const ch = c.mine.game.choice;
      share?.setAttribute('aria-pressed', String(ch === 'share'));
      again?.setAttribute('aria-pressed', String(ch === 'banish'));
    };
    update(ctx);
    return { update, frame(c) { hd.timer.set(c.remaining(), c.duration); }, unmount: cancel };
  },
};

const finalReveal = {
  id: 'soup-final-reveal',
  layout: 'show',
  shot: 'reveal',
  mount({ show }, ctx) {
    const p = ctx.payload;
    const rows = p.choices.map((c) => h('div.sp-frow', disc(ctx, c.id, { size: 40 }), h('b.nm', nameOf(ctx, c.id)),
      h(`span.sp-fchoice.${c.choice}`, c.choice === 'share' ? 'Share' : 'Banish again')));
    const verdict = h(`div.sp-fverdict${p.unanimous ? '.yes' : '.no'}`, p.unanimous ? 'Everyone shares.' : 'Not everyone trusts the table.', h('span', p.unanimous ? 'Now for the truth.' : 'Banish again.'));
    const card = h('div.sp-card.sp-freveal', h('div.sp-banish-t', 'The final table'), h('div.sp-frows', rows), verdict);
    show.append(h('div.sp-dim'), h('div.sp-cardwrap', card));
    let shown = -1; let done = false; let cancel = () => {};
    return {
      frame(c) {
        const t = c.elapsed();
        p.at.forEach((a, i) => {
          if (t >= a && i > shown) { shown = i; rows[i].classList.add('on'); if (!c.frozen) { c.audio.sfx(p.choices[i].choice === 'share' ? 'clink' : 'stamp'); c.haptic('select'); } }
        });
        if (!done && t >= p.verdictAt) {
          done = true; card.classList.add('verdict');
          if (!c.frozen) c.cyril.react(p.unanimous ? 'drumroll' : 'shock');
          cancel = say(c, c.line(p.unanimous ? 'spShare' : 'spSplit'), { hold: 2600 }, 300);
        }
      },
      unmount: () => cancel(),
    };
  },
};

const end = {
  id: 'soup-end',
  layout: 'show',
  shot: 'reveal',
  mount({ show }, ctx) {
    const p = ctx.payload;
    const pois = p.winner === 'poisoners';
    const pot = tureen({ size: 110, label: pois ? 'Stolen' : 'Shared' });
    pot.set(p.pot);
    const grid = h('div.sp-endgrid', p.roles.map((r) => {
      const won = p.winners.includes(r.id);
      return h(`div.sp-endp${r.role === 'poisoner' ? '.pois' : ''}${won ? '.won' : ''}${r.alive ? '' : '.dead'}`,
        disc(ctx, r.id, { size: 40 }),
        h('b.nm', nameOf(ctx, r.id)),
        h('span.role', h('span.ic', { html: r.role === 'poisoner' ? VIAL : SPOON }), r.role === 'poisoner' ? 'Poisoner' : 'Faithful'),
        h('span.fate', r.alive ? (won ? `+${money(p.deltas[r.id])}` : 'Survived') : h('span', h('span.ic', { html: WISP }), r.how === 'poisoned' ? 'Poisoned' : 'Banished')));
    }));
    const card = h(`div.sp-card.sp-end${pois ? '.pois' : ''}`,
      h('div.sp-end-t', pois ? 'The Poisoners win' : 'The Faithful win'),
      h('div.sp-end-row', pot, h('div.sp-end-s', p.winners.length ? [h('b', `${money(p.share)} each`), ` to ${p.winners.map((id) => nameOf(ctx, id)).join(', ')}`] : 'Nobody is paid.', p.tip ? h('div.sp-end-tip', `Ghosts on the winning side get ${money(p.tip)}.`) : null)),
      grid);
    show.append(h('div.sp-dim'), h('div.sp-cardwrap', card));
    if (!ctx.frozen) { ctx.audio.sfx(pois ? 'groan' : 'fanfare'); if (p.winners.includes(ctx.meId)) ctx.haptic('win'); }
    ctx.cyril.react(pois ? 'shock' : 'delight', { duration: ctx.frozen ? 60000 : 1400 });
    const cancel = say(ctx, ctx.line(pois ? 'spWinPoisoners' : 'spWinFaithful'), { hold: 3600 }, 900);
    return { unmount: cancel };
  },
};

export default [final, finalReveal, end];
