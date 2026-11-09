// r1-reveal: 7 s fixed timeline (DESIGN 2.3): drumroll, voters' tokens fly into the cards,
// author names stamp on, points count up, winner lifts, Cyril reacts, cards slide out.
import './r1.css';
import { h } from '../ui/components.js';
import { ICONS } from '../ui/icons.js';
import { timeline, avatarDisc, tiltFor, fitText, countTo, R1_ICONS, R1_LINES, pickLine } from './r1-kit.js';

export default {
  id: 'r1-reveal',
  layout: 'show',
  shot: 'reveal',
  mount({ show }, ctx) {
    const p = ctx.payload;
    const seed = ctx.phase.seed;
    const S = (ms) => ms / (ctx.phase.speed || 1);
    const quiet = ctx.frozen;
    const totalVotes = p.answers.reduce((n, a) => n + a.votes.length + (a.house ? 0.5 : 0), 0);

    const cards = p.answers.map((a, i) => {
      const txt = h('div.r1-rc-txt', a.empty ? 'sent out an empty plate' : a.text);
      const card = h(`div.r1-rc${a.empty ? '.empty' : ''}`, { style: { '--tilt': `${(i ? 1.6 : -1.6) + tiltFor(seed, a.key, 1)}deg`, '--i': i } },
        txt,
        h('div.r1-rc-votes'));
      card.txt = txt;
      card.votes = card.querySelector('.r1-rc-votes');
      return card;
    });
    const promptText = h('div.r1-rv-prompt', p.prompt);
    show.append(h('div.r1-rv',
      h('div.r1-rv-top', h('span.t-eyebrow', `Head to head · ${p.index + 1} of ${p.count}`), promptText),
      h('div.r1-rv-cards', cards)));
    fitText(promptText, { max: 22, min: 17, maxH: 84 });
    cards.forEach((c) => fitText(c.txt, { max: 30, min: 22, maxH: 76 }));

    const sfx = (n, o) => { if (!quiet) ctx.audio.sfx(n, o); };
    const tl = timeline([
      { at: 0, fn: () => {
        ctx.cyril.react('drumroll', { duration: S(2200) });
        sfx('drumroll', { duration: S(2000) / 1000 });
        cards.forEach((c) => c.classList.add('suspense'));
      } },
      { at: S(600), fn: () => {
        p.answers.forEach((a, i) => {
          const list = a.votes.map((vid) => avatarDisc(ctx.player(vid), { size: 32, cls: '.r1-tok' }));
          if (a.house) list.push(h('span.r1-av.r1-tok.house', { title: 'House vote (half)', html: ICONS.flame }));
          list.forEach((t, k) => {
            t.style.setProperty('--d', `${quiet ? 0 : k * 90 + i * 45}ms`);
            t.style.setProperty('--fx', `${(i ? -1 : 1) * (30 + k * 12)}px`);
            cards[i].votes.append(t);
          });
          if (!list.length) cards[i].votes.append(h('span.r1-novote', 'No votes'));
          const n = a.votes.length;
          cards[i].append(h('div.r1-rc-count', a.house ? `${n} vote${n === 1 ? '' : 's'} + Cyril’s half` : `${n} vote${n === 1 ? '' : 's'}`));
        });
      } },
      { at: S(2200), fn: () => {
        cards.forEach((c) => c.classList.remove('suspense'));
        p.answers.forEach((a, i) => {
          const pl = ctx.player(a.authorId);
          cards[i].append(h('div.r1-rc-stamp', { style: { '--pc': pl?.colour || '#7A1E2C' } }, avatarDisc(pl, { size: 22 }), h('span', pl?.name || '?')));
        });
        sfx('stamp'); ctx.stage.shake(); ctx.haptic('stamp');
      } },
      { at: S(3000), fn: () => {
        p.answers.forEach((a, i) => {
          const pts = a.points + a.bonus;
          const share = totalVotes ? Math.round(((a.votes.length + (a.house ? 0.5 : 0)) / totalVotes) * 100) : 0;
          const num = h('span.n', '+0');
          const other0 = p.answers[1 - i];
          const won = a.points > other0.points;
          cards[i].append(h(`div.r1-rc-pts${won ? '.won' : ''}`, won ? h('span.lau', { html: R1_ICONS.laurel }) : null, num, h('span.share', `${share}%`)));
          countTo(num, 0, pts, { ms: 650, prefix: '+', frozen: quiet });
          const other = p.answers[1 - i];
          const win = a.points > other.points;
          const tie = a.points === other.points && a.points > 0;
          cards[i].classList.toggle('win', win);
          cards[i].classList.toggle('lose', !win && !tie);
          if (a.bonus) cards[i].append(h('div.r1-rc-clean', h('span', 'Clean plate'), h('b', `+${a.bonus}`)));
          if (win && a.authorId === ctx.meId) ctx.haptic('win');
        });
        sfx('countup');
      } },
      { at: S(3600), fn: () => {
        const o = p.outcome;
        const mood = o === 'clean' ? 'delight' : o === 'tie' ? 'smug' : o === 'empty' ? 'sad' : 'guffaw';
        ctx.cyril.react(mood);
        if (o === 'clean') sfx('fanfare');
        const key = { clean: 'r1Clean', tie: 'r1Tie', empty: 'r1Empty', novotes: 'r1NoVotes' }[o];
        ctx.say(key ? ctx.line(key) : [pickLine(R1_LINES.normal, seed, p.index)], { hold: 1500, placement: 'side' });
      } },
      { at: S(5600), fn: () => { if (!quiet) cards.forEach((c) => c.classList.add('out')); } },
    ]);
    tl.run(ctx);
    return { frame: (c) => tl.run(c) };
  },
};
