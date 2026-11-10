// end: the winner stays up on the cake (show). Sheet (claret): the winner's name huge, your
// receipt stub, then ONE clear action: host Back to the menu (Same again / Leave as small links),
// guests a waiting card + heckles, with Leave.
import './podium.css';
import './end.css';
import { h, button, onTap } from '../../../ui/components.js';
import { ICONS } from '../../../ui/icons.js';
import { computeAwards } from '../../../game/awards.js';
import { getPodiumSet } from '../../../stage/podium-set.js';
import { finaleMemo, glyph, dedupeAwards, tieRanks, buildBill } from './podium.js';
import { CHERRY_SVG } from '../../../screens/menu-art.js';

const ORD = (n) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'}`;
const fmt = (n) => Math.round(n || 0).toLocaleString('en-GB');

const CROWN_SVG = '<svg viewBox="0 0 32 22" aria-hidden="true"><path d="M3 19 1 5l8 6 7-10 7 10 8-6-2 14z" fill="#FFC86B" stroke="#3B1F18" stroke-width="2" stroke-linejoin="round"/><circle cx="16" cy="13" r="2.2" fill="#B0243A"/></svg>';

const glassSvg = '<svg viewBox="0 0 40 52" aria-hidden="true"><defs><clipPath id="endbowl"><path d="M8 4h24c0 12-3 20-12 21C11 24 8 16 8 4z"/></clipPath></defs>'
  + '<g clip-path="url(#endbowl)"><rect class="wine" x="6" y="9" width="28" height="18" fill="#7A1E2C"/></g>'
  + '<path d="M8 4h24c0 12-3 20-12 21C11 24 8 16 8 4z" fill="none" stroke="#7A1E2C" stroke-width="2.6" stroke-linejoin="round"/>'
  + '<path d="M20 25v17M12 46h16" stroke="#7A1E2C" stroke-width="3" stroke-linecap="round"/></svg>';

export default {
  id: 'end',
  layout: 'split',
  shot: 'end',
  mount({ sheet }, ctx) {
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
    const coWinners = rows.filter((r) => r.rank === 1).map((r) => ctx.player(r.id)).filter(Boolean);
    document.body.classList.add('end-nohandle');

    const meRow = rows.find((r) => r.id === ctx.meId);
    const award = meRow ? awardOf(meRow.id) : null;
    let stub = null;
    let pop = null;
    const billLink = h('button.end-billlink', { type: 'button', 'data-e2e': 'see-bill' }, 'See the bill');
    onTap(billLink, () => {
      if (pop) return;
      const close = button('Lovely, thanks', { kind: 'secondary', block: false, onClick: () => { pop?.remove(); pop = null; } });
      pop = h('div.end-billpop', buildBill(ctx, tieRanks(memo)), close);
      document.body.append(pop);
    });

    // the hero: the winner's name, huge
    const winName = coWinners.length > 1 ? coWinners.map((p) => p.name).join(' & ') : (wp?.name || '');
    const hero = wp ? h('div.end-hero',
      h('div.end-hero-av', glyph(wp), h('span.end-hero-crown', { html: CROWN_SVG })),
      h('div.end-hero-txt',
        h('div.end-hero-k', coWinners.length > 1 ? 'Share the cake' : 'Takes the cake'),
        h(`div.end-hero-name${winName.length > 9 ? '.long' : ''}${winName.length > 14 ? '.xlong' : ''}`, winName),
        h('div.end-hero-sub', `${fmt(win.score)} pts`, awardOf(win.id) ? h('span', ` \u00b7 ${awardOf(win.id).title}`) : null))) : null;

    if (meRow) {
      const r = meRow.rank;
      const place = r === 1
        ? h('div.end-stub-place', 'You took ', h('em', 'the cake'), '!')
        : h('div.end-stub-place', 'You came ', h('em', ORD(r)), '.');
      stub = h('div.end-stub',
        h('span.end-stub-av', glyph(ctx.me), h(`span.end-stub-medal.${r <= 3 ? `r${r}` : 'rx'}`, String(r))),
        h('div.end-stub-text', place,
          h('div.end-stub-sub', award ? h('i', award.title) : `${fmt(meRow.score)} pts`,
            meRow.cherries ? h('span.end-stub-cher', h('span.end-cher-ic', { html: CHERRY_SVG }), `+${meRow.cherries} tonight`) : null)));
    }

    const host = ctx.player(ctx.state?.hostId) || ctx.player(ctx.payload?.hostId);
    const leave = button('Leave the table', { kind: 'ghost', block: false, onClick: () => ctx.actions.leave(), e2e: 'leave' });
    const page = h('div.end-page');
    const talk = ctx.frozen ? null : setTimeout(() => { ctx.cyril.setTalking(true); ctx.cyril.react('smug'); }, 450);
    const hush = ctx.frozen ? null : setTimeout(() => ctx.cyril.setTalking(false), 2400);
    if (ctx.isHost) {
      const again = button('Same again', { kind: 'ghost', block: false, onClick: () => ctx.client.again(), e2e: 'again' });
      page.append(
        hero,
        stub,
        h('p.end-quote', h('span.end-quote-text', `\u201c${ctx.line('end')[0]}\u201d`), h('span.end-quote-by', '\u2014 Cyril')),
        h('div.end-actions',
          button('Back to the menu', { onClick: () => ctx.client.toMenu(), e2e: 'to-menu' }),
          h('div.end-links', again, ...(memo ? [h('span.end-sep', '\u00b7'), billLink] : []), h('span.end-sep', '\u00b7'), leave)));
    } else {
      page.append(
        hero,
        stub,
        h('div.end-actions',
          h('div.end-wait', h('span.end-glass', { html: glassSvg }),
            h('div.end-wait-text', h('div.t-heading', `${host?.name || 'The host'} is deciding`, h('span.end-dots', h('i'), h('i'), h('i'))),
              h('div.end-wait-sub', 'Heckle while you wait. Everyone sees it.'))),
          h('div.end-throw',
            h('div.end-throw-row', ...[['roll', 'Throw a bread roll'], ['rose', 'Throw a rose'], ['applause', 'Applaud'], ['groan', 'Groan']].map(([kind, label]) => {
              const b = h('button.end-throw-btn', { type: 'button', 'aria-label': label, 'data-e2e': `end-react-${kind}` },
                h('span.end-throw-ic.rail-btn', { html: ICONS[kind] || '' }), h('span.end-throw-name', { roll: 'Roll', rose: 'Rose', applause: 'Clap', groan: 'Groan' }[kind]));
              let last = 0;
              onTap(b, () => { const now = Date.now(); if (now - last < 400) return; last = now; ctx.client.react(kind); }, { sound: null });
              return b;
            }))),
          h('div.end-links', ...(memo ? [billLink, h('span.end-sep', '\u00b7')] : []), leave)));
    }
    sheet.append(page);
    return {
      unmount() { pop?.remove(); document.body.classList.remove('end-nohandle'); set.hide(); clearTimeout(talk); clearTimeout(hush); ctx.cyril.setTalking(false); },
    };
  },
};
