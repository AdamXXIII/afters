// end: the winner stays up on the cake (show), and your receipt stub + Same again / New table
// (host) or a waiting card (guests), with Leave for everyone.
import './podium.css';
import { h, button } from '../ui/components.js';
import { getPodiumSet } from '../stage/podium-set.js';
import { finaleMemo, glyph } from './podium.js';

const ORD = (n) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'}`;
const fmt = (n) => Math.round(n || 0).toLocaleString('en-GB');

const glassSvg = '<svg viewBox="0 0 40 52" aria-hidden="true"><defs><clipPath id="endbowl"><path d="M8 4h24c0 12-3 20-12 21C11 24 8 16 8 4z"/></clipPath></defs>'
  + '<g clip-path="url(#endbowl)"><rect class="wine" x="6" y="9" width="28" height="18" fill="#7A1E2C"/></g>'
  + '<path d="M8 4h24c0 12-3 20-12 21C11 24 8 16 8 4z" fill="none" stroke="#7A4A2A" stroke-width="2" stroke-linejoin="round"/>'
  + '<path d="M20 25v17M12 46h16" stroke="#7A4A2A" stroke-width="2.4" stroke-linecap="round"/></svg>';

export default {
  id: 'end',
  layout: 'split',
  shot: 'end',
  mount({ show, sheet }, ctx) {
    ctx.stage.setPodium(null);
    const rows = ctx.payload?.rows || [];
    // awards come from the podium payload (end rows don't carry them)
    const awardOf = (id) => finaleMemo.rows?.find((r) => r.id === id)?.award || null;
    const set = getPodiumSet(ctx.stage);
    if (rows.length) set.show({ rows, players: ctx.players, mode: 'end', reduced: ctx.reduced });
    ctx.cyril.setMood?.('calm');

    const win = rows[0];
    const wp = ctx.player(win?.id);
    if (wp) {
      show.append(h('div.end-show', h('div.end-ribbon', glyph(wp), h('span', h('b', wp.name), ' takes the cake'))));
    }

    const meRow = rows.find((r) => r.id === ctx.meId);
    const award = meRow ? awardOf(meRow.id) : null;
    let stub = null;
    if (meRow) {
      const r = meRow.rank;
      const place = r === 1
        ? h('div.end-stub-place', 'You took ', h('em', 'the cake'), '.')
        : h('div.end-stub-place', 'You came ', h('em', ORD(r)), '.');
      stub = h('div.end-stub',
        h('span.end-stub-av', glyph(ctx.me), h(`span.end-stub-medal.${r <= 3 ? `r${r}` : 'rx'}`, String(r))),
        h('div.end-stub-text', place,
          h('div.end-stub-sub', `${fmt(meRow.score)} pts · out of ${rows.length}`),
          award ? h('div.end-stub-award', award.title) : null));
    }

    const host = ctx.player(ctx.state?.hostId) || ctx.player(ctx.payload?.hostId);
    const leave = button('Leave the table', { kind: 'ghost', onClick: () => ctx.actions.leave(), e2e: 'leave' });
    const page = h('div.end-page');
    // Cyril's last word lives on the sheet (a bubble would sit on the winner); his mouth still moves
    const line = ctx.isHost ? 'Same again? I\u2019ve got wick for one more.' : 'Same again? That\u2019s up to whoever\u2019s holding the table.';
    const quote = h('p.end-quote', h('span.end-quote-text', `\u201c${line}\u201d`), h('span.end-quote-by', '\u2014 Cyril'));
    const talk = ctx.frozen ? null : setTimeout(() => { ctx.cyril.setTalking(true); ctx.cyril.react('smug'); }, 450);
    const hush = ctx.frozen ? null : setTimeout(() => ctx.cyril.setTalking(false), 2400);
    if (ctx.isHost) {
      page.append(
        h('div.t-eyebrow', 'That’s dessert'),
        h('h2.end-title', 'Another round?'),
        quote,
        stub,
        h('div.end-actions',
          button('Same again', { onClick: () => ctx.client.again(), e2e: 'again' }),
          button('New table', { kind: 'secondary', onClick: () => ctx.client.newTable(), e2e: 'new-table' }),
          leave));
    } else {
      page.append(
        h('div.t-eyebrow', 'That’s dessert'),
        h('h2.end-title', 'Fancy another?'),
        quote,
        stub,
        h('div.end-actions',
          h('div.end-wait', h('span.end-glass', { html: glassSvg }),
            h('div.t-heading', `Waiting for ${host?.name || 'the host'} to pour another round.`)),
          leave));
    }
    sheet.append(page);
    return {
      unmount() { set.hide(); clearTimeout(talk); clearTimeout(hush); ctx.cyril.setTalking(false); },
    };
  },
};
