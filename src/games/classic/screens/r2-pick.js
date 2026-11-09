// r2-pick: the fact on a card at the top of the show layer, the options laid out as lettered
// place cards on the cloth, and who has picked. Sheet: lettered option list (own porky greyed).
import { h, timerRing } from '../../../ui/components.js';
import { haptic } from '../../../ui/haptics.js';
import { audio } from '../../../audio/synth.js';
import { factText, LETTERS, avatarDisc } from './r2-kit.js';

function optionBtn(o, letter, { mine, selected, onPick }) {
  const b = h(`button.r2-opt${mine ? '.mine' : ''}`, { type: 'button', 'aria-pressed': String(!!selected), disabled: mine, 'data-e2e': mine ? 'choice-mine' : 'pick' },
    h('span.l', letter),
    h('span.txt', o.text),
    mine ? h('span.yours', 'Yours') : h('span.tick', { html: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>' }),
  );
  if (!mine) {
    b.addEventListener('click', () => {
      audio.unlock(); audio.sfx('select'); haptic('select');
      onPick();
    });
  }
  return b;
}

export default {
  id: 'r2-pick',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const own = ctx.priv?.ownOptionId;
    const timer = timerRing();

    const fact = factText(p.fact.text);
    show.append(h('div.r2-pick-top',
      h(`div.card.r2-pick-fact${p.fact.text.length > 80 ? '.long' : ''}`,
        h('div.r2-pick-meta', h('span.t-eyebrow', `Fact ${p.index + 1} of ${p.count}`)),
        fact),
      h('div.r2-pick-timer', timer)));

    const n = p.options.length;
    const pickedRow = h('div.r2-picked');
    show.append(h('div.r2-pick-bottom', pickedRow));

    const btns = p.options.map((o, i) => optionBtn(o, LETTERS[i], {
      mine: o.id === own,
      selected: ctx.mine.pick === o.id,
      onPick: () => ctx.client.pick(o.id),
    }));
    const hint = h('div.r2-pick-hint');
    sheet.append(
      h('div.r2-pick-head', h('div.r2-pick-row', h('div.r2-pick-q', 'Which one is true?'), h('span.r2-pick-count', `1 of ${n} is real`)), hint),
      h(`div.r2-opts${n > 6 ? '.many' : ''}`, { style: { '--rows': n } }, btns),
      n > 6 ? h('div.r2-more', 'More below') : null,
    );

    const setPicked = (c) => {
      const done = c.players.filter((pl) => c.progress.done[pl.id]);
      pickedRow.replaceChildren(
        h('span.r2-picked-lbl', done.length === c.players.length ? 'Everyone’s picked' : `${done.length} of ${c.players.length} picked`),
        h('span.r2-picked-avs', c.players.map((pl) => avatarDisc(pl, c.progress.done[pl.id] ? '.done' : '.wait'))),
      );
      const mine = c.mine.pick;
      btns.forEach((b, i) => b.setAttribute('aria-pressed', String(mine === p.options[i].id)));
      const i = p.options.findIndex((o) => o.id === mine);
      hint.replaceChildren(...(i >= 0 ? [h('span.lock', LETTERS[i]), 'Locked in. Change it till time\u2019s up.'] : ['Tap the one you believe. Not yours.']));
      hint.classList.toggle('locked', i >= 0);
    };
    setPicked(ctx);
    return {
      update: setPicked,
      frame(c) { timer.set(c.remaining(), c.duration); },
    };
  },
};
