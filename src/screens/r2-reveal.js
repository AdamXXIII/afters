// r2-reveal: zero-pick porkies batched ("Nobody fell for these"), then each porky by ascending
// pickers (stamped PORKY, author named, fooled players hop on, points count up), then THE TRUTH
// in gold foil, written into the fact's gap. A tracker row shows how far through the reveal we are.
import { h } from '../ui/components.js';
import { factText, LETTERS, nameTag, snoutSvg, countTo, tilt } from './r2-kit.js';

export default {
  id: 'r2-reveal',
  layout: 'show',
  shot: 'reveal',
  mount({ show }, ctx) {
    const p = ctx.payload;
    const seed = ctx.phase?.seed || 1;
    const byId = new Map(p.options.map((o) => [o.id, o]));
    const letterOf = new Map(p.options.map((o, i) => [o.id, LETTERS[i]]));
    const pl = (id) => ctx.player(id);
    const quiet = ctx.frozen;
    const sfx = (n, o) => { if (!quiet) ctx.audio.sfx(n, o); };

    const fact = factText(p.fact.text);
    const tracker = h('div.r2-track', p.options.map((o) => h('span.r2-track-i', { dataset: { id: o.id } }, letterOf.get(o.id))));
    const factCard = h('div.card.r2-rev-fact', h('div.r2-pick-meta', h('span.t-eyebrow', `Fact ${p.index + 1} of ${p.count}`), tracker), fact);
    const stageEl = h('div.r2-rev-stage');
    show.append(h('div.r2-rev', factCard, stageEl));

    const mark = (ids, cls) => ids.forEach((id) => tracker.querySelector(`[data-id="${id}"]`)?.classList.add(cls));
    const setCurrent = (ids) => tracker.querySelectorAll('.r2-track-i').forEach((e) => e.classList.toggle('cur', ids.includes(e.dataset.id)));

    const authorsLine = (o) => (o.kind === 'house'
      ? h('div.r2-by', h('span.lbl', 'A house porky'), h('span.r2-tag.house', h('span.r2-av.house', { html: '<svg viewBox="0 0 24 24"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-7 .5 2 1.5 3 2.5 3 0-3-1-5.5.5-8z" fill="currentColor"/></svg>' }), h('span.nm', 'Cyril')))
      : h('div.r2-by', h('span.lbl', o.authors.length > 1 ? 'Told by both' : 'Told by'), o.authors.map((id) => nameTag(pl(id)))));

    const hop = (els, base = 250) => els.forEach((e, i) => { e.style.animationDelay = `${base + i * 110}ms`; e.classList.add('hop'); });

    const render = {
      nobody(s) {
        setCurrent(s.optionIds); mark(s.optionIds, 'dud');
        const cards = s.optionIds.map((id) => {
          const o = byId.get(id);
          return h('div.r2-dud', { style: { '--tilt': `${tilt(seed, id, 4)}deg` } },
            h('span.r2-dud-l', letterOf.get(id)),
            h('div.r2-dud-txt', o.text),
            h('div.r2-dud-by', o.kind === 'house' ? 'house porky' : `by ${o.authors.map((a) => pl(a)?.name || '?').join(' & ')}`));
        });
        stageEl.replaceChildren(h('div.r2-nobody',
          h('div.r2-nobody-head', h('span.r2-nobody-big', 'Nobody fell for these'), h('span.r2-nobody-sub', 'Zero fooled. Back to the kitchen.')),
          h('div.r2-duds', cards)));
        sfx('groan');
        if (!quiet) ctx.cyril.react('smug');
      },
      porky(s) {
        const o = byId.get(s.optionId);
        setCurrent([o.id]); mark([o.id], 'porky');
        const pts = h('span.r2-pts', '+0');
        const fooled = o.pickers.map((id) => nameTag(pl(id)));
        hop(fooled, 420);
        const card = h('div.r2-card.porky', { style: { '--tilt': `${tilt(seed, o.id, 2)}deg` } },
          h('div.r2-card-top', h('span.r2-card-l', letterOf.get(o.id)), h('span.t-eyebrow', 'A porky')),
          h('div.r2-card-txt', o.text),
          h('div.r2-stamp', h('span.sn', { html: snoutSvg({ ring: false }) }), 'Porky!'),
          authorsLine(o),
          h('div.r2-fooled', h('span.lbl', o.pickers.length === 1 ? 'Fooled' : `Fooled all ${o.pickers.length}`), h('span.list', fooled)),
          o.kind === 'house' ? null : h('div.r2-pts-row', pts, h('span.each', o.authors.length > 1 ? 'each, for the fibbers' : 'for the fibber')),
        );
        stageEl.replaceChildren(card);
        if (o.kind !== 'house') countTo(pts, 500 * o.pickers.length, { prefix: '+', frozen: quiet, ms: 700 });
        sfx('oink'); sfx('stamp');
        if (!quiet) { ctx.stage.shake(); ctx.haptic('stamp'); }
        if (o.authors.includes(ctx.meId) && o.pickers.length) ctx.haptic('fooled');
        if (o.pickers.length >= 3) ctx.say(ctx.line('r2FooledMany', { n: o.pickers.length }), { hold: 1400, placement: 'side' });
        else if (!quiet) ctx.cyril.react('guffaw');
      },
      truth(s) {
        const o = byId.get(s.optionId);
        setCurrent([o.id]); mark([o.id], 'truth');
        fact.setFill(o.text); fact.gap.classList.add('gold');
        const found = o.pickers.map((id) => nameTag(pl(id)));
        hop(found, 520);
        const pts = h('span.r2-pts.gold', '+0');
        const card = h('div.r2-card.truth',
          h('div.r2-ribbon', 'The truth'),
          h('div.r2-card-top', h('span.r2-card-l', letterOf.get(o.id)), h('span.t-eyebrow', 'Honest to goodness')),
          h('div.r2-card-txt', o.text),
          o.pickers.length
            ? h('div.r2-fooled', h('span.lbl', 'Spotted by'), h('span.list', found))
            : h('div.r2-fooled.none', h('span.lbl', 'Found by nobody. Not one of you.')),
          o.pickers.length ? h('div.r2-pts-row', pts, h('span.each', o.pickers.length > 1 ? 'each, for the honest' : 'for the honest one')) : null,
          h('div.r2-sparkle', Array.from({ length: 9 }, (_, i) => h('i', { style: { '--i': i, '--x': `${(tilt(seed, `s${i}`, 1) * 0.5 + 0.5) * 100}%`, '--y': `${(tilt(seed, `y${i}`, 1) * 0.5 + 0.5) * 100}%` } }))),
        );
        stageEl.replaceChildren(card);
        if (o.pickers.length) countTo(pts, 1000, { prefix: '+', frozen: quiet, ms: 700 });
        sfx('truth');
        if (!quiet) ctx.cyril.react(o.pickers.length ? 'delight' : 'sad');
        if (o.pickers.includes(ctx.meId)) ctx.haptic('win');
        if (!o.pickers.length) ctx.say(ctx.line('r2Nobody'), { hold: 1600, placement: 'side' });
      },
      aside() {
        ctx.say(p.aside, { hold: 2200, placement: 'side' });
      },
    };

    const steps = p.steps;
    const fired = new Set();
    // Truth also needs earlier marks when time is pinned: replay marks silently.
    const catchUp = (upto) => {
      for (const s of steps) {
        if (s.at > upto) break;
        if (s.kind === 'nobody') mark(s.optionIds, 'dud');
        if (s.kind === 'porky') mark([s.optionId], 'porky');
      }
    };
    const run = (c) => {
      const t = c.elapsed();
      steps.forEach((s, i) => {
        if (fired.has(i) || t < s.at) return;
        fired.add(i);
        try { render[s.kind]?.(s); } catch (e) { console.error('[r2-reveal]', e); }
      });
    };
    if (ctx.frozen) {
      const t = ctx.elapsed();
      const shown = steps.filter((s) => s.at <= t && s.kind !== 'aside');
      const last = shown.pop();
      catchUp(t);
      if (last) render[last.kind](last);
      if (steps.some((s) => s.kind === 'aside' && s.at <= t)) render.aside();
      return {};
    }
    run(ctx);
    return { frame: run };
  },
};
