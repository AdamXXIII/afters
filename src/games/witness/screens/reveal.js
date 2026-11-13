// witness-reveal: the evidence, one statement at a time. Duds nobody believed are thrown out in
// one beat; then each fake that fooled someone (fewest first) is stamped FAKE with its forger
// named and the fooled hopping on; then the defendant's own answer gets the claret seal (or
// "pleaded the fifth"), with the finders and the Expert Witness; then the verdict: this round's
// points for everyone. Pure function of ctx.elapsed() so frozen shots and sync both work.
import { h } from '../../../ui/components.js';
import { disc, dock, dockCard, tag, statement, seal, countTo, LETTERS, tilt } from './kit.js';

export default {
  id: 'witness-reveal',
  layout: 'show',
  shot: 'reveal',
  rail: true,
  mount({ show }, ctx) {
    const p = ctx.payload;
    const seed = ctx.phase?.seed || 1;
    const quiet = ctx.frozen;
    const m = p.mult || 1;
    const byId = new Map(p.options.map((o) => [o.id, o]));
    const letter = new Map(p.options.map((o, i) => [o.id, LETTERS[i]]));
    const pl = (id) => ctx.player(id);
    const name = pl(p.defendant)?.name || 'Someone';
    const isMe = (id) => id === ctx.meId;
    const sfx = (n, o) => { if (!quiet) ctx.audio.sfx(n, o); };

    const card = dockCard(ctx, p, { timer: false, compact: true });
    const tracker = h('div.wt-track', p.options.map((o) => h('span.wt-track-i', { dataset: { id: o.id } }, letter.get(o.id))));
    const stageEl = h('div.wt-rv-stage');
    show.append(h(`div.wt-rv${p.final ? '.final' : ''}`, card, tracker, stageEl));
    const mark = (ids, cls) => ids.forEach((id) => tracker.querySelector(`[data-id="${id}"]`)?.classList.add(cls));
    const current = (ids) => tracker.querySelectorAll('.wt-track-i').forEach((e) => e.classList.toggle('cur', ids.includes(e.dataset.id)));
    const hop = (els, base = 300) => els.forEach((e, i) => { e.style.animationDelay = `${base + i * 110}ms`; e.classList.add('hop'); });
    const youLine = (t) => h('div.wt-you', t);

    const render = {
      silent() {
        stageEl.replaceChildren(h('div.wt-card.silent',
          h('div.wt-card-big', 'No comment.'),
          h('div.wt-card-sub', `${name} said nothing. Contempt of court. Nobody scores.`)));
        ctx.cyril.react('sad', { duration: quiet ? 60000 : 1400 });
        ctx.say(ctx.line('wtSilent', { name }), { hold: 2400, placement: 'side' });
      },
      nobody(s) {
        current(s.optionIds); mark(s.optionIds, 'dud');
        const cards = s.optionIds.map((id) => {
          const o = byId.get(id);
          return h('div.wt-dud', { style: { '--tilt': `${tilt(seed, id, 3)}deg` } },
            h('span.wt-dud-l', letter.get(id)),
            h('div.wt-dud-t', o.text),
            h('div.wt-dud-by', o.kind === 'house' ? h('span.wt-house', 'Cyril’s guess') : o.authors.map((a) => tag(pl(a), { meId: ctx.meId, cls: '.sm' }))));
        });
        stageEl.replaceChildren(h('div.wt-nobody',
          h('div.wt-nobody-h', s.optionIds.length > 1 ? 'Nobody believed these' : 'Nobody believed this'),
          h('div.wt-duds', cards)));
        sfx('groan');
        ctx.cyril.react('smug', { duration: quiet ? 60000 : 1100 });
      },
      fake(s) {
        const o = byId.get(s.optionId);
        current([o.id]); mark([o.id], 'fake');
        const fooled = o.pickers.map((id) => tag(pl(id), { meId: ctx.meId, cls: '.big' }));
        hop(fooled, 380);
        const pts = h('span.wt-pts', '+0');
        const house = o.kind === 'house';
        const st = statement(o.text, { cls: '.hero', letter: letter.get(o.id), seed, key: o.id });
        st.append(h('div.wt-stamp.fake', 'Fake'));
        const by = house
          ? h('div.wt-by', h('span.lbl', 'Forged by'), h('span.wt-house', 'Cyril, the house'))
          : h('div.wt-by', h('span.lbl', o.authors.length > 1 ? 'Forged by both' : 'Forged by'), o.authors.map((a) => tag(pl(a), { meId: ctx.meId })));
        const fellMe = o.pickers.includes(ctx.meId);
        const toldMe = o.authors.includes(ctx.meId);
        stageEl.replaceChildren(h('div.wt-card.fake',
          st, by,
          o.pickers.length ? h('div.wt-fooled', h('span.lbl', o.pickers.length === 1 ? 'Fooled' : `Fooled ${o.pickers.length}`), h('span.list', fooled)) : null,
          p.final ? h('div.wt-ptsrow', h('span.each', `Kept by ${name}. Fooled jurors pay ${isMe(p.defendant) ? 'you' : 'them'}.`)) : house ? h('div.wt-ptsrow', h('span.each', 'Mine. No points for anyone.')) : h('div.wt-ptsrow', pts, h('span.each', `to ${o.authors.map((a) => (isMe(a) ? 'you' : pl(a)?.name || '?')).join(' & ')}`)),
          fellMe ? youLine(`You fell for it. That isn’t ${name}.`) : toldMe ? youLine(`Your fake fooled ${o.pickers.length}. Shameless.`) : null));
        if (!house && !p.final) countTo(pts, 500 * m * o.pickers.length, { frozen: quiet });
        sfx('stamp');
        if (!quiet) { ctx.stage.shake?.(); ctx.haptic('stamp'); if (toldMe && o.pickers.length) ctx.haptic('fooled'); }
        if (o.pickers.length >= 2) ctx.say(ctx.line('wtFooledMany', { n: o.pickers.length }), { hold: 1500, placement: 'side' });
        ctx.cyril.react(o.pickers.length >= 2 ? 'guffaw' : 'smug', { duration: quiet ? 60000 : 1300 });
      },
      truth(s) {
        const o = byId.get(s.optionId);
        current([o.id]); mark([o.id], 'truth');
        const finders = o.pickers.slice();
        const found = finders.map((id) => {
          const t = tag(pl(id), { meId: ctx.meId, cls: '.big' });
          if (id === p.expert) t.append(h('span.wt-expert', 'Fastest'));
          return t;
        });
        hop(found, 520);
        const st = statement(o.text, { cls: '.hero.truth', letter: letter.get(o.id), seed, key: o.id });
        st.append(seal(p.fifth ? 'Fifth' : 'Sworn'));
        const pts = h('span.wt-pts.gold', '+0');
        stageEl.replaceChildren(h(`div.wt-card.truth${p.fifth ? '.fifth' : ''}`,
          h('div.wt-ribbon', p.fifth ? `${name} pleaded the fifth` : `${name}’s real answer`),
          st,
          p.fifth ? h('div.wt-fifthnote', 'A lie, in their own words. Still the one to find.') : null,
          finders.length
            ? h('div.wt-fooled.found', h('span.lbl', 'Found by'), h('span.list', found))
            : h('div.wt-fooled.none', h('span.lbl', 'Found by nobody. Not one of you.')),
          finders.length ? h('div.wt-ptsrow', pts, h('span.each', finders.length > 1 ? 'each' : `to ${isMe(finders[0]) ? 'you' : pl(finders[0])?.name || '?'}`), p.expert ? h('span.wt-xp', `+${250 * m} fastest`) : null) : null,
          isMe(p.defendant) ? youLine(p.missed ? `You fooled ${p.missed}. +${(p.final ? 500 : 250) * m * p.missed}.` : 'They know you too well.') : null));
        if (finders.length) countTo(pts, 1000 * m, { frozen: quiet });
        sfx('truth');
        if (!quiet && finders.includes(ctx.meId)) ctx.haptic('win');
        ctx.cyril.react(finders.length ? 'delight' : 'shock', { duration: quiet ? 60000 : 1500 });
        if (!finders.length) ctx.say(ctx.line('wtNobody', { name }), { hold: 2000, placement: 'side' });
        else if (p.fifth) ctx.say(ctx.line('wtFifth', { name }), { hold: 2000, placement: 'side' });
      },
      verdict() {
        current([]);
        const rows = Object.entries(p.deltas).filter(([, d]) => d > 0).sort((a, b) => b[1] - a[1]);
        const why = (id) => {
          const bits = [];
          const opt = p.options.find((o) => o.kind === 'truth');
          if (id === p.defendant && p.missed) bits.push(`fooled ${p.missed}`);
          if (opt?.pickers.includes(id)) bits.push(id === p.expert ? 'found it first' : 'found it');
          const fooled = p.options.filter((o) => o.kind === 'fake' && o.authors.includes(id)).reduce((n, o) => n + o.pickers.length, 0);
          if (fooled && id !== p.defendant) bits.push(`fooled ${fooled}`);
          if ((p.echo || []).includes(id)) bits.push('wrote the same answer');
          return bits.join(', ');
        };
        const list = rows.length
          ? rows.map(([id, d], i) => h(`div.wt-vrow${isMe(id) ? '.me' : ''}`, { style: { '--i': i } }, disc(pl(id), { size: 34 }), h('span.nm', h('b', isMe(id) ? 'You' : pl(id)?.name || '?'), h('small', why(id))), h('span.wt-vpts', `+${d}`)))
          : [h('div.wt-vnone', 'Nobody scored. A hung jury.')];
        const lead = p.scores?.[0];
        stageEl.replaceChildren(h('div.wt-card.verdict',
          h('div.wt-verdict-h', dock(pl(p.defendant), { size: 40 }), h('div', h('div.wt-title', 'Verdict'), h('div.wt-sub', p.final ? 'Cross-examination, triple points' : `${name}’s turn in the dock${m > 1 ? `, double points` : ''}`))),
          h('div.wt-vlist', list),
          lead && !p.final ? h('div.wt-lead', 'Leading: ', h('b', isMe(lead.id) ? 'you' : pl(lead.id)?.name || '?'), ` on ${lead.score}`) : null));
        sfx('countup', { ticks: 8 });
        if (!quiet && (p.deltas[ctx.meId] || 0) > 0) ctx.haptic('win');
      },
    };

    const steps = p.steps || [];
    if (ctx.frozen) {
      const t = ctx.elapsed();
      const shown = steps.filter((s) => s.at <= t);
      const last = shown.pop();
      for (const s of shown) {
        if (s.kind === 'nobody') mark(s.optionIds, 'dud');
        if (s.kind === 'fake') mark([s.optionId], 'fake');
        if (s.kind === 'truth') mark([s.optionId], 'truth');
      }
      if (last) render[last.kind](last);
      return {};
    }
    const fired = new Set();
    const run = (c) => {
      const t = c.elapsed();
      steps.forEach((s, i) => {
        if (fired.has(i) || t < s.at) return;
        fired.add(i);
        try { render[s.kind]?.(s); } catch (e) { console.error('[witness-reveal]', e); }
      });
    };
    run(ctx);
    if (!quiet) ctx.cyril.react('drumroll', { duration: Math.max(400, (steps[0]?.at || 600) - 100) });
    return { frame: run };
  },
};
