// badtaste-intro: how it plays, three sentences, with a little spread of cards as the picture.
import { h } from '../../../ui/components.js';
import { answerCard, cardBack, sayLater, skipBtn } from './kit.js';
import { STEPS, STEPS_DUO } from './steps.js';


export default {
  id: 'badtaste-intro',
  layout: 'show',
  shot: 'intro',
  mount({ show }, ctx) {
    const seed = ctx.phase?.seed || 1;
    const adult = ctx.adult;
    const prompt = h('div.bt-prompt.mini', h('div.bt-ptext', adult ? 'The thing that finally broke me at work: ' : 'The real reason I left the Scouts: ', h('span.bt-slot', '   ')));
    const spread = h('div.bt-spread',
      prompt,
      h('div.bt-fan',
        cardBack({ cls: '.fanc', seed, key: 'a' }),
        answerCard(adult ? 'a fourth reply-all' : 'my nan’s voice notes', { cls: '.fanc.win', seed, key: 'b' }),
        cardBack({ cls: '.fanc', seed, key: 'c' })));
    const card = h('div.bt-howto',
      h('div.bt-howto-title', 'Bad Taste'),
      spread,
      h('ol.bt-rules', (ctx.payload.duo ? STEPS_DUO : STEPS).map((r, i) => h('li', { style: { '--i': i } }, h('span.n', String(i + 1)), h('span.t', r)))),
      h('div.bt-howto-foot', ctx.payload.duo ? `${ctx.payload.rounds} rounds, three each as Critic. Most crowns wins.` : `${ctx.payload.rounds} rounds. Everyone judges. Most crowns wins.`));
    show.append(h('div.bt-dim'), h('div.bt-cardwrap', card));
    if (!ctx.frozen) card.animate([{ transform: 'translateY(28px) rotate(-2deg) scale(.94)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 620, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' });
    const sk = skipBtn(ctx, show);
    const cancel = sayLater(ctx, ctx.line(ctx.payload.plays > 1 ? 'btIntroAgain' : ctx.payload.duo ? 'btIntroDuo' : 'btIntro'), { delay: 900, hold: 3000 });
    ctx.cyril.react('smug', { duration: ctx.frozen ? 60000 : 1200 });
    return { frame: (c) => sk?.(c), unmount: cancel };
  },
};
