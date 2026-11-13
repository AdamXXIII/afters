import { h, button } from '../../../ui/components.js';

const call = {
  id: 'samehere-call',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    show.append(h('div.t-display', { style: { textAlign: 'center', paddingTop: '30%', color: 'var(--c-linen)' } }, `Flip ${ctx.payload.round} of ${ctx.payload.of}`));
    const row = h('div', { style: { display: 'grid', gap: '10px' } });
    const pick = (side) => ctx.client.act('call', { side }, { side });
    const heads = button('Heads', { e2e: 'call-heads', onClick: () => pick('heads') });
    const tails = button('Tails', { kind: 'secondary', e2e: 'call-tails', onClick: () => pick('tails') });
    row.append(heads, tails);
    sheet.append(row);
    const cancel = setTimeout(() => ctx.say(ctx.line('exCall')), 300);
    return {
      update(c) { const s = c.mine.game.side; heads.disabled = !!s; tails.disabled = !!s; },
      unmount() { clearTimeout(cancel); },
    };
  },
};

const reveal = {
  id: 'samehere-reveal',
  layout: 'show',
  shot: 'reveal',
  mount({ show }, ctx) {
    const { side, deltas } = ctx.payload;
    show.append(h('div.t-display', { style: { textAlign: 'center', paddingTop: '60%', color: 'var(--c-linen)' } },
      `It's ${side}!`, h('div.t-body', deltas[ctx.meId] ? 'You called it. +100' : 'Wrong. Nothing.')));
    ctx.cyril.react(deltas[ctx.meId] ? 'delight' : 'smug');
  },
};

export default [call, reveal];
