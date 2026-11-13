// Top Shelf: intro card, special-round cards (Steal, Pass the Port, The Last Drop), the summit.
import { h } from '../../../ui/components.js';
import { cabinet, disc, skipBtn, say } from './kit.js';

const STEAL_ART = '<svg viewBox="0 0 120 70" aria-hidden="true"><path d="M30 52V22M30 22l-9 9M30 22l9 9" stroke="#FFC86B" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M90 18v30M90 48l-9-9M90 48l9-9" stroke="#E2553B" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M44 14c10-8 22-8 32 0" stroke="#FBF4EA" stroke-width="3" stroke-dasharray="4 5" fill="none"/><path d="M76 56c-10 8-22 8-32 0" stroke="#FBF4EA" stroke-width="3" stroke-dasharray="4 5" fill="none"/></svg>';
const PORT_ART = '<svg viewBox="0 0 120 70" aria-hidden="true"><path d="M52 4h16v6H52z" fill="#C89B3C"/><path d="M54 10h12v10c0 3 3 5 7 8 6 4 10 9 10 17 0 13-10 22-23 22S37 58 37 45c0-8 4-13 10-17 4-3 7-5 7-8z" fill="#7A1E2C" stroke="#FBF4EA" stroke-width="2.5"/><path d="M44 44c0-6 3-10 7-13" stroke="rgba(255,255,255,.5)" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M90 40h22M104 32l8 8-8 8" stroke="#FFC86B" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const DROP_ART = '<svg viewBox="0 0 120 70" aria-hidden="true"><path d="M60 4c8 14 20 26 20 40a20 20 0 0 1-40 0c0-14 12-26 20-40z" fill="#FFC86B" stroke="#FBF4EA" stroke-width="2.5"/><path d="M50 46a10 10 0 0 0 8 10" stroke="rgba(255,255,255,.7)" stroke-width="3.4" fill="none" stroke-linecap="round"/></svg>';

const intro = {
  id: 'topshelf-intro',
  layout: 'show',
  shot: 'intro',
  mount({ show }, ctx) {
    const p = ctx.payload;
    const cab = cabinet(ctx, { top: p.top, size: 'tiny', labels: false });
    cab.still(Object.fromEntries(ctx.players.map((x) => [x.id, 0])));
    const steps = [
      'Answer on your phone. Right climbs a shelf; quick and right climbs two.',
      'Wrong slips one. Whoever is lowest picks the next category.',
      'The last question is a bet. Highest bottle wins.',
    ];
    const card = h('div.ts-card',
      h('div.ts-card-title', 'Top Shelf'),
      h('div.ts-card-lede', ctx.adult ? 'A quiz with altitude. After dark.' : 'A quiz with altitude.'),
      h('div.ts-card-body', cab, h('ol.ts-steps', steps.map((s, i) => h('li', h('span.n', String(i + 1)), h('span', s))))));
    show.append(h('div.ts-dim'), h('div.ts-cardwrap', card));
    if (!ctx.frozen) card.animate([{ transform: 'translateY(30px) rotate(-2deg) scale(.94)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 620, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' });
    const sk = skipBtn(ctx, show);
    const cancel = say(ctx, ctx.line(p.plays > 1 ? 'tsIntroAgain' : 'tsIntro'), { hold: 3000 }, 900);
    return { frame: (c) => sk?.(c), unmount: cancel };
  },
};

const ROUND = {
  steal: { title: 'Steal!', art: STEAL_ART, line: 'tsStealIntro', rule: 'One question. The quickest right answer swaps shelves with the leader.' },
  port: { title: 'Pass the Port', art: PORT_ART, line: 'tsPortIntro', rule: 'Vote who answers alone. Right: up two. Wrong: down two. Everyone else bets.' },
  final: { title: 'The Last Drop', art: DROP_ART, line: 'tsFinalIntro', rule: 'One hard question. Bet one, two or three shelves on it.' },
};

const roundIntro = {
  id: 'topshelf-round-intro',
  layout: 'show',
  shot: 'intro',
  mount({ show }, ctx) {
    const p = ctx.payload;
    const r = ROUND[p.kind] || ROUND.steal;
    const leader = p.leader ? ctx.player(p.leader) : null;
    const card = h(`div.ts-card.special.k-${p.kind}`,
      h('div.ts-card-round', `Round ${p.round + 1} of ${p.of}`),
      h('div.ts-card-title', r.title),
      h('div.ts-card-art', { html: r.art }),
      h('div.ts-card-rule', r.rule),
      leader ? h('div.ts-card-leader', disc(leader, { size: 32 }), h('span', `Leader: ${leader.name}, shelf ${p.shelves[p.leader]}`)) : null);
    show.append(h('div.ts-dim'), h('div.ts-cardwrap', card));
    if (!ctx.frozen) card.animate([{ transform: 'scale(.8) rotate(3deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 560, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' });
    if (!ctx.frozen) ctx.audio.sfx(p.kind === 'final' ? 'bell' : 'fanfare');
    ctx.cyril.react(p.kind === 'steal' ? 'smug' : 'drumroll', { duration: ctx.frozen ? 60000 : 1400 });
    const sk = skipBtn(ctx, show);
    const cancel = say(ctx, ctx.line(r.line), { hold: 2600 }, 700);
    return { frame: (c) => sk?.(c), unmount: cancel };
  },
};

const summit = {
  id: 'topshelf-summit',
  layout: 'show',
  shot: 'scores',
  rail: true,
  mount({ show }, ctx) {
    const p = ctx.payload;
    const rows = p.rows || [];
    const best = rows[0]?.shelf ?? 0;
    const winners = rows.filter((r) => r.rank === 1);
    const cab = cabinet(ctx, { top: p.top, size: 'full' });
    const ex = {};
    for (const r of rows) ex[r.id] = { hot: r.rank === 1, flag: r.rank === 1 ? 'Winner' : '', kind: r.rank === 1 ? 'win' : '' };
    cab.still(Object.fromEntries(rows.map((r) => [r.id, r.shelf])), ex);
    const names = winners.map((w) => ctx.player(w.id)?.name || '?');
    const title = best >= p.top ? (winners.length > 1 ? 'Sharing the top shelf' : 'On the top shelf') : (winners.length > 1 ? 'Sharing the highest shelf' : 'Highest bottle');
    const head = h('div.ts-sum-h',
      h('div.ts-sum-who', winners.map((w) => disc(ctx.player(w.id), { size: 44 }))),
      h('div.ts-sum-t', h('span.ts-sum-l', title), h('span.ts-sum-n', names.join(' & '))),
      h('div.ts-sum-s', `Shelf ${best}`));
    show.append(h('div.ts-sum', head, cab));
    ctx.cyril.react('delight', { duration: ctx.frozen ? 60000 : 1600 });
    if (!ctx.frozen) { ctx.audio.sfx('fanfare'); if (winners.some((w) => w.id === ctx.meId)) ctx.haptic('win'); }
    const cancel = say(ctx, winners.length > 1 ? ctx.line('tsSummitTie') : ctx.line('tsSummit', { name: names[0] || '?' }), { hold: 3000 }, 900);
    return { unmount: cancel };
  },
};

export default [intro, roundIntro, summit];
