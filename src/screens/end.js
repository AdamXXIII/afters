// end: the winner stays up on the cake (show), and your receipt stub + Same again / New table
// (host) or a waiting card (guests), with Leave for everyone.
import './podium.css';
import { h, button, onTap } from '../ui/components.js';
import { ICONS } from '../ui/icons.js';
import { computeAwards } from '../game/awards.js';
import { getPodiumSet } from '../stage/podium-set.js';
import { finaleMemo, glyph, dedupeAwards } from './podium.js';

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
    // (fallback for a phone that joined straight into the end, e.g. a demo: the host can recompute)
    let memo = finaleMemo.rows;
    if (!memo) {
      try {
        const eng = window.__afters?.engine?.();
        if (eng?.players) { const aw = computeAwards(eng.players); memo = dedupeAwards(rows.map((r) => ({ ...r, award: aw[r.id] }))); }
      } catch { memo = null; }
    }
    const awardOf = (id) => memo?.find((r) => r.id === id)?.award || null;
    const set = getPodiumSet(ctx.stage);
    if (rows.length) set.show({ rows, players: ctx.players, mode: 'end', reduced: ctx.reduced });
    ctx.cyril.setMood?.('calm');

    const win = rows[0];
    const wp = ctx.player(win?.id);
    if (wp) {
      show.append(h('div.end-show', h('div.end-ribbon', glyph(wp), h('span', h('b', wp.name), ' takes the cake'))));
    }
    document.body.classList.add('end-nohandle');

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
          h('div.end-stub-sub', `Out of ${rows.length} \u00b7 ${fmt(meRow.score)} pts`),
          award ? h('div.end-stub-award', award.title) : null));
    }

    const host = ctx.player(ctx.state?.hostId) || ctx.player(ctx.payload?.hostId);
    const leave = button('Leave the table', { kind: 'ghost', onClick: () => ctx.actions.leave(), e2e: 'leave' });
    const page = h('div.end-page');
    // Cyril's last word lives on the sheet (a bubble would sit on the winner); his mouth still moves
    const line = ctx.isHost ? 'Same again? I\u2019ve got wick for one more.' : 'Not my call, I\u2019m only the candle.';
    const quote = h('p.end-quote', h('span.end-quote-text', `\u201c${line}\u201d`), h('span.end-quote-by', '\u2014 Cyril, your host'));
    const talk = ctx.frozen ? null : setTimeout(() => { ctx.cyril.setTalking(true); ctx.cyril.react('smug'); }, 450);
    const hush = ctx.frozen ? null : setTimeout(() => ctx.cyril.setTalking(false), 2400);
    if (ctx.isHost) {
      page.append(
        h('div.t-eyebrow', 'That’s dessert'),
        h('h2.end-title', 'Another round?'),
        quote,
        stub,
        h('p.end-hint', h('b', 'Same again'), ': same seats, fresh questions.'),
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
            h('div.end-wait-text', h('div.t-heading', `${host?.name || 'The host'} is deciding`, h('span.end-dots', h('i'), h('i'), h('i'))),
              h('div.end-wait-sub', 'Same again or new table. Hold your glass.'))),
          h('div.end-throw', h('span.end-throw-label', 'Heckle while you wait (every phone sees it)'),
            h('div.end-throw-row', ...[['roll', 'Throw a bread roll'], ['rose', 'Throw a rose'], ['applause', 'Applaud'], ['groan', 'Groan']].map(([kind, label]) => {
              const b = h('button.end-throw-btn', { type: 'button', 'aria-label': label, 'data-e2e': `end-react-${kind}` },
                h('span.end-throw-ic.rail-btn', { html: ICONS[kind] || '' }), h('span.end-throw-name', { roll: 'Roll', rose: 'Rose', applause: 'Clap', groan: 'Groan' }[kind]));
              let last = 0;
              onTap(b, () => { const now = Date.now(); if (now - last < 400) return; last = now; ctx.client.react(kind); }, { sound: null });
              return b;
            }))),
          leave));
    }
    sheet.append(page);
    return {
      unmount() { document.body.classList.remove('end-nohandle'); set.hide(); clearTimeout(talk); clearTimeout(hush); ctx.cyril.setTalking(false); },
    };
  },
};
