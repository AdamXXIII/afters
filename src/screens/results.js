// results: the shared "game over" screen any game can end on with api.finish(rows).
// Show = the 3D table + Cyril; sheet = a claret "bill": the winner's name big, one row per player
// (this game's score + the cherries it earned folded into tonight's running total), then the
// host's Back to the menu / Same again. Cherries are counted once, in the Tonight column.
import './menu.css';
import './results.css';
import { h, button } from '../ui/components.js';
import { avatarIcon } from '../ui/icons.js';
import { AVATARS } from '../game/constants.js';
import { dishSvg, CHERRY_SVG } from './menu-art.js';
import { sayLater } from './common.js';

const ORD = (n) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'}`;

export default {
  id: 'results',
  layout: 'split',
  shot: 'scores',
  rail: true,
  mount({ sheet }, ctx) {
    const g = ctx.games.find((x) => x.id === ctx.payload.gameId) || {};
    const rows = ctx.payload.rows || [];
    const night = new Map((ctx.payload.night || []).map((r) => [r.id, r]));
    const winners = rows.filter((r) => r.rank === 1).map((r) => ctx.player(r.id)).filter(Boolean);
    const winName = winners.map((p) => p.name).join(' & ');

    const headEl = h('div.rs-show',
      h('div.rs-dish', { html: dishSvg(g.dish) }),
      h('div.rs-eyebrow', `${g.title || ctx.payload.title || 'That game'} · the bill`),
      h(`div.rs-win${winName.length > 12 ? '.long' : ''}`, winners.length
        ? [h('b', winName), h('span', winners.length > 1 ? ' share it' : ' takes it')]
        : 'Nobody won. Somehow.'));

    const many = rows.length > 5;
    const list = h(`ol.rs-list${many ? '.many' : rows.length <= 3 ? '.few' : ''}`);
    list.append(h('li.rs-cols', { 'aria-hidden': 'true' }, h('span', 'This game'), h('span.rs-cols-n', h('span.rs-cols-ic', { html: CHERRY_SVG }), 'Tonight')));
    rows.forEach((r, i) => {
      const p = ctx.player(r.id);
      if (!p) return;
      const n = night.get(r.id);
      const earned = r.cherries ?? n?.delta ?? 0;
      list.append(h(`li.rs-row${r.rank === 1 ? '.win' : ''}${r.id === ctx.meId ? '.me' : ''}`, { style: { '--pc': AVATARS[p.avatar]?.colour, '--i': i } },
        h('span.rs-rank', ORD(r.rank)),
        h('span.rs-av', { html: avatarIcon(p.avatar) }),
        h('span.rs-nm', p.name, r.id === ctx.meId ? h('span.rs-you', 'you') : null),
        h('span.rs-score', Math.round(r.score || 0).toLocaleString('en-GB')),
        h('span.rs-night',
          earned ? h('span.rs-earn', `+${earned}`) : null,
          h('span.rs-tot', String(n?.night ?? earned)))));
    });

    const actions = ctx.isHost
      ? h('div.rs-act',
        button('Back to the menu', { e2e: 'to-menu', onClick: () => ctx.client.toMenu() }),
        button('Same again', { kind: 'secondary', e2e: 'again', onClick: () => ctx.client.again() }))
      : h('div.rs-wait', h('b', ctx.player(ctx.state?.hostId)?.name || 'The host'), ' is picking the next dish', h('span.rs-dots', h('i'), h('i'), h('i')));
    sheet.append(h('div.rs-sheet', headEl, list, actions));

    const last = rows[rows.length - 1];
    const lines = winners[0] ? ctx.line('resultsWin', { name: winners[0].name }) : ctx.line('everyoneDone');
    const c1 = sayLater(ctx, lines, { delay: 600, hold: 2200, placement: 'side' });
    const c2 = last && rows.length > 2 && ctx.player(last.id) ? sayLater(ctx, ctx.line('resultsLast', { name: ctx.player(last.id).name }), { delay: 3400, hold: 2200, placement: 'side' }) : null;
    if (winners.length) ctx.cyril.react('guffaw');
    return { unmount() { c1?.(); c2?.(); } };
  },
};
