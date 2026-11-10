// r1-vote: the show layer carries a compact prompt card (timer + live "votes in" discs) with Cyril
// framed whole below it; the sheet is a dark field holding the two answers as big saturated slabs
// (A mustard, B willow) you tap to vote.
// Authors get the SAME sheet (so a sideways glance gives nothing away): same two slabs, same
// headline; their taps just wiggle (the host ignores author votes anyway), and one small line says
// "One of these is yours. Look innocent."
import './r1.css';
import { h, timerRing, onTap } from '../../../ui/components.js';
import { ICONS } from '../../../ui/icons.js';
import { avatarDisc, fitText } from './r1-kit.js';

export default {
  id: 'r1-vote',
  layout: 'split',
  shot: 'scores', // keeps Cyril whole and visible below the prompt card in split layout
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const author = ctx.priv.role === 'author';
    const timer = timerRing();
    const voters = (p.voterIds || []).map((id) => ctx.player(id)).filter(Boolean);
    const discs = new Map(voters.map((v) => [v.id, avatarDisc(v, { size: 30, cls: '.r1-voter' })]));
    const tally = h('span.r1-tally-n');
    const promptText = h('div.r1-vote-prompt', p.prompt);
    show.append(h('div.r1-vote-top',
      h('div.r1-vote-card',
        h('div.r1-vote-head', timer, h('div.r1-vote-meta',
          h('span.t-eyebrow', `Head to head · ${p.index + 1} of ${p.count}`),
          h('div.r1-tally', h('div.r1-voters', [...discs.values()]), tally))),
        promptText)));
    fitText(promptText, { max: 26, min: 19, maxH: 92 });

    const hint = h('div.r1-vote-hint', author ? 'One of these is yours. Look innocent.' : 'Tap one. Change your mind till the candle’s out.');
    const opts = p.answers.map((a, i) => {
      const txt = h('span.r1-opt-txt', a.text);
      const el = h(`button.r1-opt.r1-opt-${i ? 'b' : 'a'}`, {
        type: 'button', 'aria-pressed': String(!author && ctx.mine.vote === a.key), 'data-e2e': author ? 'choice-mine' : `vote-${a.key}`,
        'aria-disabled': author ? 'true' : null,
      },
      h('span.r1-opt-key', a.key),
      txt,
      h('span.r1-opt-tick', { html: ICONS.tick }));
      if (author) {
        onTap(el, () => {
          el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope');
          hint.textContent = 'Nice try. Authors don’t vote. Look innocent.';
        }, { sound: 'tap', buzz: 'tap' });
      } else onTap(el, () => ctx.client.vote(a.key), { sound: 'select', buzz: 'select' });
      el.txt = txt;
      return el;
    });
    const or = h('div.r1-or', h('span', 'or'));
    sheet.append(h(`div.r1-vote-sheet.r1-in${author ? '.author' : ''}`,
      h('div.r1-vote-ask', h('div.r1-vote-q', 'Which plate goes down better?'), hint),
      opts[0], or, opts[1]));
    opts.forEach((o) => fitText(o.txt, { max: 44, min: 28, maxH: 118 }));

    const update = (c) => {
      if (!author) opts.forEach((b, i) => b.setAttribute('aria-pressed', String(c.mine.vote === p.answers[i].key)));
      let n = 0;
      for (const [id, d] of discs) { const done = !!c.progress.done[id]; d.classList.toggle('in', done); if (done) n++; }
      tally.textContent = `${n}/${voters.length} voted`;
    };
    update(ctx);
    return {
      update,
      frame(c) { timer.set(c.remaining(), c.duration); },
    };
  },
};
