// r1-reveal: 7 s fixed timeline (DESIGN 2.3): drumroll, vote tokens fly, author stamps,
// points count up, Cyril reacts, cards slide out.
import './r1.css';
import { h, placeCard, countUp } from '../ui/components.js';
import { timeline, avatarToken } from './common.js';

export default {
  id: 'r1-reveal',
  layout: 'show',
  shot: 'reveal',
  mount({ show }, ctx) {
    const p = ctx.payload;
    const S = (ms) => ms / (ctx.phase.speed || 1);
    const cards = p.answers.map((a, i) => {
      const card = placeCard(a.text, { tilt: i ? 2 : -2 });
      card.classList.add('reveal-card');
      card.prepend(h('div.ab-key', a.key));
      const tokens = h('div.reveal-tokens');
      card.append(tokens);
      card.tokens = tokens;
      return card;
    });
    show.append(h('div.reveal-wrap',
      h('div.t-eyebrow.on-dark', `Matchup ${p.index + 1} of ${p.count}`),
      h('div.show-prompt', p.prompt),
      h('div.reveal-cards', cards)));

    const quiet = ctx.frozen;
    const sfx = (n, o) => { if (!quiet) ctx.audio.sfx(n, o); };
    const tl = timeline([
      { at: 0, fn: () => { ctx.cyril.react('drumroll', { duration: S(2200) }); sfx('drumroll', { duration: S(2000) / 1000 }); } },
      { at: S(600), fn: () => {
        p.answers.forEach((a, i) => {
          a.votes.forEach((vid, k) => setTimeout(() => cards[i].tokens.append(avatarToken(ctx.player(vid))), quiet ? 0 : k * 90));
          if (a.house) cards[i].tokens.append(avatarToken(null, { house: true }));
        });
      } },
      { at: S(2200), fn: () => {
        p.answers.forEach((a, i) => cards[i].append(h('div.reveal-author', h('span.stamp', ctx.player(a.authorId)?.name || '?'))));
        sfx('stamp'); ctx.stage.shake(); ctx.haptic('stamp');
      } },
      { at: S(3000), fn: () => {
        p.answers.forEach((a, i) => {
          const pts = h('span.reveal-points', '+0');
          cards[i].append(pts);
          if (quiet) pts.textContent = `+${a.points + a.bonus}`; else countUp({ set textContent(v) { pts.textContent = `+${v}`; } }, 0, a.points + a.bonus, 600);
          if (a.bonus) cards[i].append(h('span.stamp.reveal-bonus', 'Clean plate +250'));
          const win = a.points > p.answers[1 - i].points;
          cards[i].classList.toggle('win', win);
          if (win && a.authorId === ctx.meId) ctx.haptic('win');
        });
        sfx('countup');
      } },
      { at: S(3600), fn: () => {
        const o = p.outcome;
        const mood = o === 'clean' ? 'delight' : o === 'tie' ? 'smug' : o === 'empty' ? 'sad' : 'guffaw';
        ctx.cyril.react(mood);
        if (o === 'clean') sfx('fanfare');
        const key = { clean: 'r1Clean', tie: 'r1Tie', empty: 'r1Empty', novotes: 'r1NoVotes' }[o] || 'r1Normal';
        ctx.say(ctx.line(key), { hold: 1500, placement: 'side' });
      } },
      { at: S(5600), fn: () => { if (!quiet) cards.forEach((c) => c.classList.add('out')); } },
    ]);
    tl.run(ctx);
    return { frame: (c) => tl.run(c) };
  },
};
