// results: the shared "game over" screen any game can end on with api.finish(rows).
// Show = the game's dish + winner; sheet = this game's standings with the cherries each place
// earned, Tonight's table, and the host's Back to the menu / Same again.
import './menu.css';
import './results.css';
import { h, button } from '../ui/components.js';
import { avatarIcon } from '../ui/icons.js';
import { AVATARS } from '../game/constants.js';
import { dishSvg, CHERRY_SVG } from './menu-art.js';
import { nightStrip } from './menu.js';
import { sayLater } from './common.js';

const ORD = (n) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'}`;

export default {
  id: 'results',
  layout: 'split',
  shot: 'scores',
  rail: true,
  mount({ show, sheet }, ctx) {
    const g = ctx.games.find((x) => x.id === ctx.payload.gameId) || {};
    const rows = ctx.payload.rows || [];
    const winners = rows.filter((r) => r.rank === 1).map((r) => ctx.player(r.id)).filter(Boolean);
    const headEl = (h('div.rs-show',
      h('div.rs-dish', { html: dishSvg(g.dish) }),
      h('div.rs-eyebrow', `${g.title || ctx.payload.title || 'That game'} · the bill`),
      h('div.rs-win', winners.length ? h('span', h('b', winners.map((p) => p.name).join(' & ')), winners.length > 1 ? ' share it' : ' takes it') : 'Nobody won. Somehow.')));
    void show;

    const list = h(`ol.rs-list${rows.length > 5 ? '.many' : ''}`);
    rows.forEach((r, i) => {
      const p = ctx.player(r.id);
      if (!p) return;
      list.append(h(`li.rs-row${r.rank === 1 ? '.win' : ''}${r.id === ctx.meId ? '.me' : ''}`, { style: { '--pc': AVATARS[p.avatar]?.colour, '--i': i } },
        h('span.rs-rank', ORD(r.rank)),
        h('span.rs-av', { html: avatarIcon(p.avatar) }),
        h('span.rs-nm', p.name),
        h('span.rs-score', Math.round(r.score || 0).toLocaleString('en-GB')),
        h('span.rs-cher', h('span.rs-cher-ic', { html: CHERRY_SVG }), `+${r.cherries ?? 0}`)));
    });
    const actions = ctx.isHost
      ? h('div.rs-act',
        button('Back to the menu', { e2e: 'to-menu', onClick: () => ctx.client.toMenu() }),
        button('Same again', { kind: 'secondary', e2e: 'again', onClick: () => ctx.client.again() }))
      : h('div.rs-wait', `${ctx.player(ctx.state?.hostId)?.name || 'The host'} is picking the next dish.`);
    sheet.append(h('div.rs-sheet', headEl, list, nightStrip(ctx, ctx.payload.night || [], { big: true }), actions));

    const last = rows[rows.length - 1];
    const lines = winners[0] ? ctx.line('resultsWin', { name: winners[0].name }) : ctx.line('everyoneDone');
    const c1 = sayLater(ctx, lines, { delay: 600, hold: 2200, placement: 'side' });
    const c2 = last && rows.length > 2 && ctx.player(last.id) ? sayLater(ctx, ctx.line('resultsLast', { name: ctx.player(last.id).name }), { delay: 3400, hold: 2200, placement: 'side' }) : null;
    if (winners.length) ctx.cyril.react('guffaw');
    return { unmount() { c1?.(); c2?.(); } };
  },
};
