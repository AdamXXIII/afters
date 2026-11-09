// r1-scores: the standings after Plate Up, as a bill of fare. Rows FLIP from the old order to
// the new, scores count up, "+n" flags slide in, a bar shows each score against the leader,
// shared ranks read "=2", and the leader gets a brass crown.
import './r1.css';
import { h } from '../ui/components.js';
import { ICONS } from '../ui/icons.js';
import { avatarDisc, countTo, R1_ICONS, R1_LINES, pickLine } from './r1-kit.js';

const ord = (n) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'}`;
const rankHtml = (n) => { const o = ord(n); return `${n}<sup>${o.slice(String(n).length)}</sup>`; };

export default {
  id: 'r1-scores',
  layout: 'show',
  shot: 'scores',
  mount({ show }, ctx) {
    const rows = (ctx.payload.rows || []).slice();
    const animate = !ctx.frozen;
    const top = Math.max(1, ...rows.map((r) => r.score));
    const rankOf = (r) => 1 + rows.filter((x) => x.score > r.score).length;
    const tied = (r) => rows.filter((x) => x.score === r.score).length > 1;
    const byPrev = rows.slice().sort((a, b) => (a.prevRank ?? 0) - (b.prevRank ?? 0));
    const prevTop = Math.max(1, ...rows.map((r) => r.prev ?? 0));

    const board = h('div.r1-board');
    const els = new Map();
    for (const r of animate ? byPrev : rows) {
      const pl = ctx.player(r.id);
      const rank = rankOf(r);
      const score = h('span.r1-row-score', String(animate ? r.prev ?? 0 : r.score));
      const bar = h('span.r1-row-bar', { style: { '--k': String((animate ? r.prev ?? 0 : r.score) / (animate ? prevTop : top)), '--pc': pl?.colour || '#7A4A2A' } });
      const move = (r.prevRank ?? rows.indexOf(r)) - rows.indexOf(r);
      const el = h(`div.r1-row${rank === 1 ? '.lead' : ''}${r.id === ctx.meId ? '.me' : ''}`, { dataset: { pid: r.id } },
        bar,
        h('span.r1-row-rank', { html: rankHtml(animate ? (r.prevRank ?? 0) + 1 : rank) }),
        avatarDisc(pl, { size: 38 }),
        h('span.r1-row-name', pl?.name || '?', r.id === ctx.meId ? h('span.r1-you', 'you') : null, tied(r) ? h('span.r1-joint', 'joint') : null),
        move ? h(`span.r1-row-move${move > 0 ? '.up' : '.down'}`, { html: move > 0 ? R1_ICONS.up : R1_ICONS.down }, String(Math.abs(move))) : null,
        h('span.r1-row-right', r.delta > 0 && (r.prev ?? 0) > 0 && !animate ? h('span.r1-row-delta', `+${r.delta}`) : null, score),
        rank === 1 ? h('span.r1-row-crown', { html: ICONS.crown }) : null);
      el.scoreEl = score; el.bar = bar; el.rankEl = el.querySelector('.r1-row-rank');
      els.set(r.id, el);
      board.append(el);
    }

    const many = rows.length > 6;
    show.append(h(`div.r1-scores${many ? '.many' : ''}`,
      h('div.r1-scores-head',
        h('div.r1-scores-eye', h('span.t-eyebrow', 'The standings · course 1 of 3')),
        h('h2.r1-scores-title', 'After course one'),
        h('div.r1-scores-sub', h('span.q', pickLine(R1_LINES.scores, ctx.phase?.seed || 0)), h('span.by', '— Cyril'))),
      board));
    board.querySelectorAll('.r1-row').forEach((e, i) => e.style.setProperty('--i', i));

    let flipT = null;
    if (animate) {
      flipT = setTimeout(() => {
        const first = new Map([...els].map(([id, e]) => [id, e.getBoundingClientRect().top]));
        rows.forEach((r) => {
          const e = els.get(r.id);
          board.append(e);
          e.rankEl.innerHTML = rankHtml(rankOf(r));
        });
        for (const [id, e] of els) {
          const dy = first.get(id) - e.getBoundingClientRect().top;
          if (dy) e.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.83,0,.17,1)' });
        }
        rows.forEach((r) => {
          const e = els.get(r.id);
          if (r.delta > 0 && (r.prev ?? 0) > 0) e.querySelector('.r1-row-right').prepend(h('span.r1-row-delta', `+${r.delta}`));
          e.bar.style.setProperty('--k', String(r.score / top));
          countTo(e.scoreEl, r.prev ?? 0, r.score, { ms: 700 });
        });
        ctx.audio.sfx('countup', { ticks: 14 });
      }, 800);
    }
    const leader = rows[0] && ctx.player(rows[0].id);
    // Cyril's quip is the subtitle (same on every table size); with room, he also chips in
    const cancel = () => {}; // Cyril's quip lives in the header so it never covers the board
    const t2 = setTimeout(() => ctx.cyril.react(leader?.id === ctx.meId ? 'delight' : 'smug'), ctx.frozen ? 0 : 1500);
    return { unmount() { cancel(); clearTimeout(flipT); clearTimeout(t2); } };
  },
};
