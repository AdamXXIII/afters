// r1-wait: both plates served. Shows what you served (handwritten place cards), who is still
// cooking (live chips), and a willow-pattern plate to spin while you wait.
import './r1.css';
import { h } from '../ui/components.js';
import { avatarDisc, willowPlate, tiltFor } from './r1-kit.js';

const SPIN_QUIPS = [
  [1, 'Lovely wrist.'],
  [5, 'Five spins. Circus calibre.'],
  [12, 'Twelve. Please return the crockery.'],
  [25, 'Twenty-five. I am calling your mother.'],
];

export default {
  id: 'r1-wait',
  layout: 'input',
  shot: 'write',
  mount({ sheet }, ctx) {
    const prompts = ctx.priv.prompts || [];
    const seed = ctx.phase?.seed || 1;
    const served = prompts.map((p, i) => h('div.r1-served', { style: { '--tilt': `${(i ? 1.6 : -1.8) + tiltFor(seed, p.matchupId, 0.6)}deg` } },
      h('div.r1-served-q', p.prompt),
      h('div.r1-served-a', ctx.mine.submitted[p.matchupId] || '…')));

    // spin-the-plate fidget
    const plate = h('button.r1-spin', { type: 'button', 'aria-label': 'Spin the plate', html: willowPlate() });
    const count = h('div.r1-spin-count', 'Tap the plate. Go on.');
    let spin = 0; let spins = 0;
    plate.addEventListener('pointerdown', () => {
      spins++;
      spin += 540 + Math.random() * 540;
      plate.style.setProperty('--rot', `${spin}deg`);
      plate.classList.remove('wob'); void plate.offsetWidth; plate.classList.add('wob');
      ctx.haptic('tap');
      ctx.audio.sfx('tap');
      const q = SPIN_QUIPS.filter(([n]) => spins >= n).pop();
      count.textContent = `${spins} spin${spins === 1 ? '' : 's'}${q ? ` · ${q[1]}` : ''}`;
      if (spins === 5) ctx.audio.sfx('plated');
    });

    const chips = h('div.r1-cooks');
    const status = h('div.r1-wait-status');
    const renderWaiting = (c) => {
      const waiting = c.players.filter((p) => !c.progress.done[p.id] && p.connected !== false);
      const done = c.players.filter((p) => c.progress.done[p.id]).length;
      status.replaceChildren(
        h('span.t-eyebrow', waiting.length ? 'Still in the kitchen' : 'Everyone has plated'),
        h('span.r1-wait-tally', `${done}/${c.players.length} served`));
      chips.replaceChildren(...(waiting.length
        ? waiting.map((p) => h('span.r1-cook', avatarDisc(p, { size: 30 }), h('span.nm', p.name), h('span.r1-dots', h('i'), h('i'), h('i'))))
        : [h('span.r1-cook.all', 'Here we go…')]));
    };
    renderWaiting(ctx);

    sheet.append(h('div.r1-wait.r1-in',
      h('div.r1-wait-head', h('div.r1-wait-title', 'Plated.'), h('div.r1-wait-sub', 'Both answers are on the pass. Keep a straight face.')),
      h('div.r1-served-row', served),
      h('div.r1-spin-wrap', plate, count),
      h('div.r1-wait-foot', status, chips)));
    return { update: renderWaiting };
  },
};
