// The compact show strip for input layout (DESIGN 2.2): Cyril's head (WebGL shows through the
// left slot), timer ring and "who's done" chips.
import { h, timerRing, chipsRow } from './components.js';

export function mountStrip(stripEl, ctx) {
  const timer = timerRing();
  const chips = chipsRow(ctx.players, (p) => (ctx.progress.done[p.id] ? 'done' : 'waiting'), { compact: ctx.players.length > 4 });
  const inner = h('div.strip-inner', h('div.cyril-slot'), timer, chips);
  stripEl.replaceChildren(inner);
  return {
    update(c) { chips.update((p) => (c.progress.done[p.id] ? 'done' : 'waiting')); },
    frame(c) { if (c.duration) timer.set(c.remaining(), c.duration); },
    unmount() { stripEl.replaceChildren(); },
    timer,
    chips,
  };
}
