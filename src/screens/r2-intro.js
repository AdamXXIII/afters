// r2-intro: "Course Two - Porkies" menu card. Wax seal stamps on, three numbered steps,
// and the scoring set out like prices on a menu. Cyril explains in 2 bubbles.
import { h } from '../ui/components.js';
import { waxSeal, hostSkip, sayLater } from './r2-kit.js';

const STEPS = [
  ['Read a true fact', 'with a word missing.'],
  ['Fill the gap with a lie', 'good enough to fool the table.'],
  ['Find the real answer', 'among everyone\'s porkies.'],
];

export default {
  id: 'r2-intro',
  layout: 'show',
  shot: 'intro',
  mount({ show }, ctx) {
    const seal = waxSeal('.intro');
    const card = h('div.r2-menu',
      seal,
      h('div.r2-menu-eyebrow', 'Course Two'),
      h('div.r2-menu-title', 'Porkies'),
      h('div.r2-menu-sub', 'A course of lies, with one true thing on the plate.'),
      h('ol.r2-steps', STEPS.map(([a, b], i) => h('li', h('span.n', String(i + 1)), h('span.tx', h('b', a), ' ', b)))),
      h('div.r2-prices',
        h('div.r2-price', h('span.l', 'Find the truth'), h('span.dots'), h('span.v', '1000')),
        h('div.r2-price', h('span.l', 'Each person you fool'), h('span.dots'), h('span.v', '500'))),
    );
    show.append(h('div.r2-intro-wrap', card));
    if (!ctx.frozen) {
      card.animate([{ transform: 'translateY(40px) rotateX(24deg) scale(.92)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 700, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
      seal.animate([{ transform: 'scale(2.2) rotate(-30deg)', opacity: 0 }, { transform: 'scale(.92) rotate(-8deg)', opacity: 1, offset: 0.7 }, { transform: 'rotate(-8deg)', opacity: 1 }], { duration: 260, delay: 820, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
      card.querySelectorAll('.r2-steps li, .r2-price').forEach((el, i) => el.animate([{ transform: 'translateX(-14px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, delay: 1000 + i * 110, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' }));
      setTimeout(() => { ctx.audio.sfx('stamp'); ctx.haptic('stamp'); ctx.stage.shake?.(); }, 900);
    }
    const skip = hostSkip(ctx, show);
    const cancel = sayLater(ctx, ctx.line('r2Intro'), { delay: 1200, hold: 2400 });
    return { frame: (c) => skip?.frame(c), unmount: cancel };
  },
};
