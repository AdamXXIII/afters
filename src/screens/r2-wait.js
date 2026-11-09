// r2-wait: "Porky told. Keep a straight face." Your lie sealed on a place card,
// who we're still waiting on (chips), and a boop-the-snout fidget.
import { h } from '../ui/components.js';
import { waxSeal, snoutSvg, tilt, avatarDisc } from './r2-kit.js';

const BOOPS = ['Boop.', 'Oink.', 'Steady on.', 'Again?', 'Mind the flame.', 'Snout of order.', 'Frankly, rude.'];

function waiting(ctx) {
  return ctx.players.filter((p) => !ctx.progress.done[p.id] && p.connected !== false);
}

export default {
  id: 'r2-wait',
  layout: 'input',
  shot: 'write',
  mount({ sheet }, ctx) {
    const mineText = ctx.mine?.submitted?.only || '';
    const t = tilt(ctx.phase?.seed || 3, ctx.meId || 'me', 2.5);
    const placeCard = h('div.r2-sealed', { style: { '--tilt': `${t}deg` } },
      h('div.t-eyebrow', 'Your porky'),
      h('div.r2-sealed-txt', mineText || 'Sealed and served'),
      waxSeal('.small'));

    const chipsWrap = h('div.r2-waiting-chips');
    const label = h('div.t-eyebrow.r2-waiting-label');
    const setWaiting = (c) => {
      const list = waiting(c);
      label.textContent = list.length ? `Still fibbing (${list.length})` : 'Everyone’s lied. Here we go.';
      chipsWrap.replaceChildren(...list.map((p, i) => h('div.r2-fibber', { style: { '--i': i } }, avatarDisc(p, '.lg'), h('span.nm', p.name), h('span.r2-dots', h('i'), h('i'), h('i')))));
    };
    setWaiting(ctx);

    const snout = h('button.r2-boop', { type: 'button', 'aria-label': 'Boop the snout', html: snoutSvg({ ring: false }) });
    const boopTxt = h('div.r2-boop-txt', 'Boop the snout while you wait');
    let n = 0;
    snout.addEventListener('pointerdown', () => {
      n += 1;
      snout.classList.remove('booped'); void snout.offsetWidth; snout.classList.add('booped');
      boopTxt.textContent = n < 3 ? BOOPS[0] : BOOPS[(n - 2) % BOOPS.length];
      ctx.haptic('tap');
      ctx.audio.sfx(n % 4 === 0 ? 'oink' : 'tap');
    });

    sheet.append(h('div.r2-wait',
      h('div.r2-wait-head', h('div.r2-wait-title', 'Porky told.'), h('div.r2-wait-sub', 'Keep a straight face.')),
      placeCard,
      h('div.r2-waiting', label, chipsWrap),
      h('div.r2-boop-wrap', snout, boopTxt),
    ));
    return { update: (c) => setWaiting(c) };
  },
};
