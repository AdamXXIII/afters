// The compact show strip for input layout (DESIGN 2.2): Cyril's head (WebGL shows through the
// left slot), a status lane (who's done, or Cyril's line when he talks), the timer ring and the
// "who's done" chips.
import { h, timerRing, chipsRow } from './components.js';
import { haptic } from './haptics.js';

const VERBS = { 'r1-write': 'plated', 'r1-wait': 'plated', 'r2-write': 'fibbed', 'r2-wait': 'fibbed', 'r3-write': 'poured', default: 'done' };

export function mountStrip(stripEl, ctx) {
  const timer = timerRing();
  const chips = chipsRow(ctx.players, (p) => (ctx.progress.done[p.id] ? 'done' : 'waiting'), { compact: ctx.players.length > 3 });
  if (ctx.players.length > 5) chips.classList.add('crowd');
  const count = h('b');
  const pips = h('span.pips', ctx.players.map(() => h('i')));
  const verb = VERBS[ctx.phase?.id] || VERBS.default;
  const status = h('div.strip-status', pips, h('span', count, ` of ${ctx.players.length} ${verb}`));
  const inner = h('div.strip-inner', h('div.cyril-slot'), status, h('div.strip-row', timer, chips));
  stripEl.replaceChildren(inner);
  let lastDone = -1;
  const sync = (c) => {
    const n = c.players.filter((p) => c.progress.done[p.id]).length;
    if (n === lastDone) return;
    if (lastDone >= 0 && n > lastDone && !c.frozen) haptic('pop');
    lastDone = n;
    count.textContent = String(n);
    [...pips.children].forEach((pip, i) => pip.classList.toggle('on', i < n));
  };
  sync(ctx);
  if (ctx.duration) timer.set(ctx.remaining(), ctx.duration);
  return {
    update(c) {
      chips.update((p) => (c.progress.done[p.id] ? 'done' : 'waiting'));
      sync(c);
    },
    frame(c) { if (c.duration) timer.set(c.remaining(), c.duration); },
    unmount() { stripEl.replaceChildren(); },
    timer,
    chips,
  };
}
