// r1-wait: both plates served. Cyril gets the stage (show layout, framed big in the middle);
// up top a timer and who's still cooking (with a tomato call-out for the one straggler);
// at the bottom a mustard pass holding your two handwritten place cards and a willow plate to spin.
import './r1.css';
import { h, timerRing } from '../../../ui/components.js';
import { SHOTS } from '../../../stage/Stage.js';
import { avatarDisc, willowPlate, tiltFor } from './r1-kit.js';

SHOTS['r1-wait'] ||= { expr: 'sly', pos: [0, 0.34, 0.98], target: [0, 0.16, 0], subject: 'cyril', maxS: 0.3 };

const SPIN_QUIPS = [
  [1, 'Lovely wrist.'],
  [5, 'Five spins. Circus calibre.'],
  [12, 'Twelve. Please return the crockery.'],
  [25, 'Twenty-five. I am calling your mother.'],
];

export default {
  id: 'r1-wait',
  layout: 'show',
  shot: 'r1-wait',
  rail: true, // react while you wait
  mount({ show }, ctx) {
    const prompts = ctx.priv.prompts || [];
    const seed = ctx.phase?.seed || 1;
    // the answers are the payoff: big handwriting, one card per row, sized down only for long ones
    const served = prompts.map((p, i) => {
      const a = ctx.mine.submitted[p.matchupId] || '…';
      const fit = a.length > 44 ? '.xl' : a.length > 26 ? '.l' : '';
      return h('div.r1-served', { style: { '--tilt': `${(i ? 0.9 : -1.1) + tiltFor(seed, p.matchupId, 0.4)}deg` } },
        h('div.r1-served-q', p.prompt),
        h(`div.r1-served-a${fit}`, a));
    });

    // spin-the-plate fidget
    const plate = h('button.r1-spin', { type: 'button', 'aria-label': 'Spin the plate', html: willowPlate() });
    const count = h('div.r1-spin-count', 'Spin me');
    let spin = 0; let spins = 0;
    plate.addEventListener('pointerdown', () => {
      spins++;
      spin += 540 + Math.random() * 540;
      plate.style.setProperty('--rot', `${spin}deg`);
      ctx.haptic('tap');
      ctx.audio.sfx('tap');
      const q = SPIN_QUIPS.filter(([n]) => spins >= n).pop();
      count.textContent = `${spins} spin${spins === 1 ? '' : 's'}${q ? ` · ${q[1]}` : ''}`;
      if (spins === 5) ctx.audio.sfx('plated');
    });

    const timer = timerRing();
    const tally = h('div.r1-wt-tally');
    const label = h('div.r1-wt-label');
    const cooks = h('div.r1-wt-cooks');
    const callout = h('div.r1-wt-call');
    let lastStraggler = null;

    const render = (c) => {
      const active = c.players.filter((p) => p.connected !== false);
      const waiting = active.filter((p) => !c.progress.done[p.id]);
      const done = c.players.filter((p) => c.progress.done[p.id]).length;
      tally.replaceChildren(h('b', String(done)), h('span', ` of ${c.players.length} plated`));
      label.textContent = waiting.length ? 'Still in the kitchen' : 'Everyone has plated';
      // the one player still writing once everyone else is done (host sends it; fall back to a lone cook)
      const sid = c.progress.straggler || (waiting.length === 1 && active.length >= 3 ? waiting[0].id : null);
      const strag = sid ? c.player(sid) : null;
      cooks.replaceChildren(...(waiting.length
        ? waiting.filter((p) => p.id !== strag?.id).map((p) => h('span.r1-cook', avatarDisc(p, { size: 30 }), h('span.nm', p.name), h('span.r1-dots', h('i'), h('i'), h('i'))))
        : [h('span.r1-cook.all', 'Here we go…')]));
      cooks.hidden = !!strag && waiting.length <= 1;
      if (strag) {
        if (lastStraggler !== strag.id) {
          callout.replaceChildren(avatarDisc(strag, { size: 44 }),
            h('span.r1-wt-call-txt', h('span.k', 'Waiting on'), h('b', strag.name)),
            h('span.r1-dots', h('i'), h('i'), h('i')));
          if (!c.frozen && lastStraggler === null) c.cyril.react('smug');
        }
        callout.hidden = false;
      } else callout.hidden = true;
      lastStraggler = strag ? strag.id : lastStraggler;
    };

    show.append(h('div.r1-wt',
      h('div.r1-wt-top',
        timer,
        h('div.r1-wt-meta', label, tally)),
      cooks,
      callout,
      h('div.r1-wt-pass.r1-in',
        h('div.r1-wt-head',
          h('div.r1-wt-spin', plate, count),
          h('div.r1-wt-titles', h('div.r1-wait-title', 'Plated.'), h('div.r1-wait-sub', 'Both answers are on the pass.'))),
        h('div.r1-served-row', served))));
    render(ctx);
    timer.set(ctx.remaining(), ctx.duration);
    return {
      update: render,
      frame(c) { timer.set(c.remaining(), c.duration); },
    };
  },
};
