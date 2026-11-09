// r2-scores: the standings after Porkies, written up like the bill so far. Rows FLIP from the
// old order, scores count up, each row shows what Porkies earned; the course's top earner gets a seal.
import { h, chip } from '../ui/components.js';
import { audio } from '../audio/synth.js';
import { waxSeal, sayLater, countTo } from './r2-kit.js';

export default {
  id: 'r2-scores',
  layout: 'show',
  shot: 'scores',
  mount({ show }, ctx) {
    const rows = ctx.payload.rows || [];
    const frozen = ctx.frozen;
    const best = rows.reduce((b, r) => (r.delta > (b?.delta ?? 0) ? r : b), null);
    const byPrev = rows.slice().sort((a, b) => (a.prevRank ?? 0) - (b.prevRank ?? 0));
    const board = h('div.r2-board');
    const els = new Map();
    for (const r of frozen ? rows : byPrev) {
      const rank = frozen ? rows.indexOf(r) : r.prevRank ?? rows.indexOf(r);
      const score = h('span.r2-row-score', String(frozen ? r.score : r.prev ?? r.score));
      const finalRank = rows.indexOf(r);
      const moved = (r.prevRank ?? finalRank) - finalRank;
      const delta = h('span.r2-row-delta', r.delta > 0 ? `+${r.delta}` : '+0');
      const arrow = Math.abs(moved) >= 2 || (moved > 0 && finalRank === 0) ? h(`span.r2-move${moved > 0 ? '.up' : '.down'}`, moved > 0 ? `\u25B2${moved}` : `\u25BC${-moved}`) : null;
      if (!(r.delta > 0)) delta.classList.add('zero');
      const row = h(`div.r2-row${r.id === best?.id ? '.best' : ''}${r.id === ctx.meId ? '.me' : ''}`,
        h('span.r2-row-rank', String(rank + 1)),
        chip(ctx.player(r.id)),
        arrow,
        h('span.r2-row-right', score, delta),
        r.id === best?.id ? waxSeal('.row') : null);
      row.scoreEl = score; row.rankEl = row.firstChild; row.deltaEl = delta;
      if (!frozen) delta.style.opacity = '0';
      els.set(r.id, row);
      board.append(row);
    }
    const leader = ctx.player(rows[0]?.id);
    show.append(h('div.r2-scores',
      h('div.r2-scores-head',
        h('div.t-eyebrow.on-dark', 'The bill so far'),
        h('h2.r2-scores-title', 'After course two'),
        best && best.delta > 0 ? h('div.r2-scores-sub', h('b', ctx.player(best.id)?.name || '?'), best.id === rows[0]?.id ? ` told the best porkies (+${best.delta}) and leads the table.` : ` told the best porkies (+${best.delta}). ${leader?.name || '?'} still leads.`) : null),
      board));

    let t1 = 0;
    if (!frozen) {
      t1 = setTimeout(() => {
        const first = new Map([...els].map(([id, e]) => [id, e.getBoundingClientRect().top]));
        rows.forEach((r, i) => { const e = els.get(r.id); board.append(e); e.rankEl.textContent = String(i + 1); });
        for (const [id, e] of els) {
          const dy = first.get(id) - e.getBoundingClientRect().top;
          if (dy) e.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.83,0,.17,1)' });
        }
        rows.forEach((r, i) => {
          const e = els.get(r.id);
          countTo(e.scoreEl, r.score, { from: r.prev ?? 0, ms: 700 });
          e.deltaEl.animate([{ opacity: 0, transform: 'translateX(20px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: 120 + i * 70, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' });
        });
        audio.sfx('countup', { ticks: 14 });
      }, 700);
    }
    const cancel = sayLater(ctx, ctx.line('r2Scores'), { delay: 1800, hold: 2400, placement: 'side' });
    return { unmount() { clearTimeout(t1); cancel(); } };
  },
};
