// r2-reveal: zero-pick porkies batched, then each porky by ascending pickers, then THE TRUTH in gold.
import './r2.css';
import { h, placeCard } from '../ui/components.js';
import { ICONS } from '../ui/icons.js';
import { timeline, avatarToken } from './common.js';
import { factText } from './r2-write.js';

export default {
  id: 'r2-reveal',
  layout: 'show',
  shot: 'reveal',
  mount({ show }, ctx) {
    const p = ctx.payload;
    const byId = new Map(p.options.map((o) => [o.id, o]));
    const stageEl = h('div.porky-stage');
    const fact = factText(p.fact.text);
    fact.classList.add('show-fact');
    show.append(h('div.porky-wrap', h('div.t-eyebrow.on-dark', `Fact ${p.index + 1} of ${p.count}`), fact, stageEl));
    const quiet = ctx.frozen;
    const sfx = (n, o) => { if (!quiet) ctx.audio.sfx(n, o); };
    const names = (ids) => ids.map((id) => ctx.player(id)?.name || '?').join(' & ');

    const steps = p.steps.map((s) => ({
      at: s.at,
      fn: () => {
        if (s.kind === 'nobody') {
          stageEl.replaceChildren(h('div.t-eyebrow.on-dark.center', 'Nobody fell for these'),
            h('div.porky-nobody', s.optionIds.map((id) => placeCard(byId.get(id).text, { tilt: 0 }))));
          sfx('groan');
        } else if (s.kind === 'porky') {
          const o = byId.get(s.optionId);
          const who = o.kind === 'house' ? 'A house porky, from me' : `PORKY by ${names(o.authors)} +${500 * o.pickers.length}`;
          const card = h('div.card.porky-card',
            h('div.t-answer', o.text),
            h('div.pickers', o.pickers.map((id) => avatarToken(ctx.player(id)))),
            h('div.who', h('span.snout', { html: ICONS.snout }), ' ', h('span.stamp', who)));
          stageEl.replaceChildren(card);
          sfx('oink'); ctx.stage.shake(); ctx.haptic('stamp');
          if (o.authors.includes(ctx.meId) && o.pickers.length) ctx.haptic('fooled');
          if (o.pickers.length >= 3) ctx.say(ctx.line('r2FooledMany', { n: o.pickers.length }), { hold: 1400 });
          else ctx.cyril.react('guffaw');
        } else if (s.kind === 'truth') {
          const o = byId.get(s.optionId);
          const card = h('div.card.porky-card.truth',
            h('div.t-eyebrow', 'The truth'),
            h('div.t-answer', o.text),
            h('div.pickers', o.pickers.map((id) => avatarToken(ctx.player(id)))),
            o.pickers.length ? h('div.who', h('span.stamp', `+1000 to ${names(o.pickers)}`)) : null);
          stageEl.replaceChildren(card);
          sfx('truth');
          ctx.cyril.react(o.pickers.length ? 'delight' : 'sad');
          if (o.pickers.includes(ctx.meId)) ctx.haptic('win');
          if (!o.pickers.length) ctx.say(ctx.line('r2Nobody'), { hold: 1600 });
        } else if (s.kind === 'aside') {
          ctx.say(p.aside, { hold: 1800 });
        }
      },
    }));
    // When time is pinned (screenshots) only the latest step matters.
    const tl = timeline(steps);
    if (ctx.frozen) {
      const t = ctx.elapsed();
      const last = steps.filter((s) => s.at <= t).pop();
      last?.fn();
      return {};
    }
    tl.run(ctx);
    return { frame: (c) => tl.run(c) };
  },
};
