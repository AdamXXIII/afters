// r2-intro: "Course Two - Porkies". A bright linen menu card on a deep claret field: one huge
// title, two plain rules, and the prices as two big claret tiles. Wax seal stamps on.
// Cyril explains in 2 bubbles above.
import { h } from '../../../ui/components.js';
import { waxSeal, hostSkip, sayLater } from './r2-kit.js';

const STEPS = ['Fill the gap with a lie', 'Spot the true answer'];

export default {
  id: 'r2-intro',
  layout: 'show',
  shot: 'intro',
  rail: false,
  mount({ show }, ctx) {
    const seal = waxSeal('.intro');
    const card = h('div.r2-menu',
      seal,
      h('div.r2-menu-eyebrow', 'Course two'),
      h('div.r2-menu-title', 'Porkies'),
      h('ol.r2-steps', STEPS.map((a, i) => h('li', h('span.n', String(i + 1)), h('span.tx', a)))),
      h('div.r2-prices',
        h('div.r2-price', h('span.v', '+500'), h('span.l', 'for each friend you fool')),
        h('div.r2-price.gold', h('span.v', '+1000'), h('span.l', 'for spotting the truth'))),
    );
    show.append(h('div.r2-intro-wrap', card));
    if (!ctx.frozen) {
      card.animate([{ transform: 'translateY(60px) rotateX(24deg) scale(.9)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 650, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
      seal.animate([{ transform: 'scale(2.4) rotate(-30deg)', opacity: 0 }, { transform: 'scale(.9) rotate(-8deg)', opacity: 1, offset: 0.7 }, { transform: 'rotate(-8deg)', opacity: 1 }], { duration: 260, delay: 760, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
      card.querySelectorAll('.r2-steps li, .r2-price').forEach((el, i) => el.animate([{ transform: 'translateY(14px) scale(.96)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, delay: 900 + i * 110, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' }));
      setTimeout(() => { ctx.audio.sfx('stamp'); ctx.haptic('stamp'); ctx.stage.shake?.(); }, 840);
    }
    const skip = hostSkip(ctx, show);
    const cancel = sayLater(ctx, ['Course two: Porkies. Every fact you\'ll see is true.', 'Every answer\'s a lie. Bar one.'], { delay: 1200, hold: 2400 });
    return { frame: (c) => skip?.frame(c), unmount: cancel };
  },
};
