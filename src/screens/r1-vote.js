// r1-vote: the show layer carries the prompt on a menu card with the timer and live "votes in"
// discs; the sheet holds the two answers as handwritten place cards you tap to vote.
// Authors get the same two cards, unclickable, with theirs marked: "Look innocent."
import './r1.css';
import { h, timerRing, onTap } from '../ui/components.js';
import { ICONS } from '../ui/icons.js';
import { avatarDisc, tiltFor, fitText, cyrilNote } from './r1-kit.js';

export default {
  id: 'r1-vote',
  layout: 'split',
  shot: 'scores', // keeps Cyril whole and visible below the prompt card in split layout
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const seed = ctx.phase.seed;
    const author = ctx.priv.role === 'author';
    const timer = timerRing();
    const voters = (p.voterIds || []).map((id) => ctx.player(id)).filter(Boolean);
    const discs = new Map(voters.map((v) => [v.id, avatarDisc(v, { size: 32, cls: '.r1-voter' })]));
    const tally = h('span.r1-tally-n');
    const promptText = h('div.r1-vote-prompt', p.prompt);
    show.append(h('div.r1-vote-top',
      h('div.r1-vote-card',
        h('div.r1-vote-head', timer, h('div.r1-vote-meta',
          h('span.t-eyebrow', `Head to head · ${p.index + 1} of ${p.count}`),
          h('div.r1-tally', h('div.r1-voters', [...discs.values()]), tally))),
        promptText)));
    fitText(promptText, { max: 26, min: 19, maxH: 104 });

    const opts = p.answers.map((a, i) => {
      const yours = author && ctx.priv.mine === a.key;
      const el = h(`button.r1-opt${yours ? '.yours' : ''}`, {
        type: 'button', 'aria-pressed': String(ctx.mine.vote === a.key), disabled: author, 'data-e2e': author ? 'choice-mine' : `vote-${a.key}`,
        style: { '--tilt': `${(i ? 0.8 : -0.8) + tiltFor(seed, a.key, 0.5)}deg` },
      },
      h('span.r1-opt-key', a.key),
      h('span.r1-opt-txt', a.text),
      yours ? h('span.r1-opt-yours', 'Yours') : null,
      h('span.r1-opt-tick', { html: ICONS.tick }));
      if (!author) onTap(el, () => ctx.client.vote(a.key), { sound: 'select', buzz: 'select' });
      return el;
    });
    const optA = opts[0]; const optB = opts[1];
    const or = h('div.r1-or', h('span', 'or'));
    if (author) {
      sheet.append(h('div.r1-vote-sheet.r1-in',
        h('div.r1-vote-ask', h('div.r1-vote-q', 'One of these is yours.'), h('div.r1-vote-hint', 'You sit this vote out. Look innocent.')),
        optA, or, optB,
        cyrilNote('I’ve seen poker faces at funerals. *Hold it.*')));
    } else {
      sheet.append(h('div.r1-vote-sheet.r1-in',
        h('div.r1-vote-ask', h('div.r1-vote-q', 'Which plate goes down better?'), h('div.r1-vote-hint', 'Tap one. Change your mind until the candle burns down.')),
        optA, or, optB,
        cyrilNote(ctx.line('r1Vote'))));
    }

    const update = (c) => {
      opts.forEach((b, i) => b.setAttribute('aria-pressed', String(c.mine.vote === p.answers[i].key)));
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
