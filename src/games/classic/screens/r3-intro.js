// r3-intro: the finale's menu card. A brass pub bell rings twice above a tomato "Last Orders"
// card; inside, a linen menu lists the three beats (write, swipe, toast), one big line each.
import './r3.css';
import { h, button } from '../../../ui/components.js';
import { bellSvg, dingSvg, penSvg, swipeSvg, crownSvg, ruleSvg, r3Timeline, sayIfFresh } from './r3-art.js';

export default {
  id: 'r3-intro',
  layout: 'show',
  shot: 'r3-intro',
  mount({ show }, ctx) {
    const frozen = ctx.frozen;
    const reduced = ctx.reduced;
    // one big line per rule: icon, verb, what it means. Even rows, shared baseline.
    const step = (icon, title, sub, pts, i) => h('li.r3i-step', { style: { '--i': i } },
      h('span.r3i-ico', { html: icon }),
      h('span.r3i-step-t', title),
      h('span.r3i-step-s', sub),
      pts ? h('span.r3i-pts', pts) : null);

    const bell = h('div.r3i-bell', { html: bellSvg() + dingSvg() });
    const card = h('div.r3i-card',
      h('div.r3i-ribbon', 'The finale'),
      h('div.r3i-eyebrow', 'Course Three'),
      h('h1.r3i-title', 'Last Orders'),
      h('div.r3i-rule', { html: ruleSvg() }),
      h('ol.r3i-menu',
        step(penSvg(), 'Write', 'up to four', null, 0),
        step(swipeSvg(), 'Swipe', '5 glasses', '+200', 1),
        step(crownSvg(), 'Toast', 'top card', '+1000', 2)),
    );
    card.prepend(bell);
    const wrap = h('div.r3i-wrap', card);
    show.append(wrap);

    // host skip (after 3 s), copied from common.hostSkip so it can be styled for this card
    let skip = null;
    if (ctx.isHost) {
      const b = button('Skip', { kind: 'ghost', block: false, onClick: () => ctx.client.skip() });
      b.classList.add('on-dark');
      skip = h('div.r3i-skip', b);
      show.append(skip);
    }

    const late = ctx.elapsed() > 1200 || frozen;
    if (late || reduced) wrap.classList.add('settled');
    else requestAnimationFrame(() => wrap.classList.add('play'));

    const tl = r3Timeline([
      { at: 250, fn: (l) => {
        if (l > 600) return;
        ctx.audio.sfx('bell');
        ctx.haptic('stamp');
        ctx.cyril.react('shock');
        if (!reduced) ctx.stage.shake?.(0.004, 160);
      } },
      { at: 1100, fn: (l) => { if (l < 600) { ctx.cyril.react('smug', { duration: 2400 }); ctx.cyril.setMood('celebrate'); } } },
    ]);
    tl(ctx);
    if (late) { ctx.cyril.react('smug', { duration: 6000 }); ctx.cyril.setMood('celebrate'); }
    const cancel = sayIfFresh(ctx, ctx.line('r3Intro'), { at: 900, window: 4200, hold: 2200 });
    return {
      frame(c) {
        tl(c);
        if (skip) skip.classList.toggle('on', c.elapsed() > 3000 / (c.phase?.speed || 1));
      },
      unmount() { cancel(); ctx.cyril.setMood('calm'); },
    };
  },
};
