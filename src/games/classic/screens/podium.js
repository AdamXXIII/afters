// podium: the payoff. Three layer cakes rise from the cloth (3rd, 2nd, then an empty top tier
// under a drumroll spotlight), the winner drops on with a paper crown, sparklers and a burst of
// napkin confetti; then the bill slides up with everyone's award. Every beat is driven by
// ctx.elapsed(), so the whole table sees the same frame at the same time.
// Before the cakes: the Last Orders swing (~3 s). The old leaderboard ticks up each player's
// Last Orders points, then rows overtake into the final order. The cake timeline starts after it.
import './podium.css';
import { h, button } from '../../../ui/components.js';
import { avatarIcon } from '../../../ui/icons.js';
import { AVATARS } from '../../../game/constants.js';
import { getPodiumSet } from '../../../stage/podium-set.js';

const fmt = (n) => Math.round(n).toLocaleString('en-GB');
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const easeOut = (x) => 1 - (1 - x) ** 3;

/** Shared with end.js: the podium's rows (with awards) survive into the end screen. */
export const finaleMemo = { rows: null };

// The engine hands out one fallback award to everyone left over; give each of them their own
// (same order on every phone, so the whole table sees the same bill).
const SPARE_AWARDS = ['Quietly Brilliant', 'Dark Horse', 'Good Sport', 'Crumb Collector', 'Napkin Folder', 'Last Biscuit', 'Steady Hand', 'The Regular'];
export function dedupeAwards(rows) {
  const used = new Set();
  let k = 0;
  return rows.map((r) => {
    if (!r.award) return r;
    let title = r.award.title;
    if (used.has(title)) { while (used.has(SPARE_AWARDS[k % SPARE_AWARDS.length]) && k < 40) k++; title = SPARE_AWARDS[k % SPARE_AWARDS.length]; }
    used.add(title);
    return title === r.award.title ? r : { ...r, award: { ...r.award, title } };
  });
}

/** Display ranks with dead heats: equal scores share a rank, shown as "=7". */
export function tieRanks(rows) {
  return rows.map((r, i) => {
    let j = i; while (j > 0 && rows[j - 1].score === r.score) j--;
    const tied = (i > 0 && rows[i - 1].score === r.score) || (i < rows.length - 1 && rows[i + 1].score === r.score);
    return { ...r, shownRank: tied ? `=${j + 1}` : String(j + 1) };
  });
}

export function glyph(player, cls = '') {
  const colour = AVATARS[player?.avatar]?.colour || '#7A4A2A';
  return h(`span.fin-glyph${cls}`, { style: { '--pc': colour }, html: avatarIcon(player?.avatar ?? 0) });
}

/** The bill (receipt): everyone ranked with their award. Also opened from the end screen. */
export function buildBill(ctx, rows) {
  const dense = rows.length > 5;
  const drips = ctx.cyril?.tallyCount ?? 0;
  return h(`div.fin-bill${dense ? '.dense' : ''}`,
      h('div.fin-bill-head', h('span', 'The bill'), h('span.fin-bill-table', `Table for ${rows.length}`)),
      h('div.fin-bill-rows', rows.map((r, i) => {
        const p = ctx.player(r.id);
        return h(`div.fin-row${r.id === ctx.meId ? '.me' : ''}${i < 3 ? `.top.t${i + 1}` : ''}`, { style: { '--i': i } },
          h('span.fin-row-rank', r.shownRank),
          glyph(p),
          h('span.fin-row-who', h('span.fin-row-name', p?.name || '?', r.id === ctx.meId ? h('span.fin-you', 'You') : null), h('span.fin-row-award', r.award?.title || '')),
          h('span.fin-row-dots'),
          h('span.fin-row-score', fmt(r.score)));
      })),
      h('div.fin-bill-foot',
        h('div.fin-foot-line', h('span', 'Tip for Cyril'), h('span.fin-row-dots'), h('span', 'Applause')),
        h('div.fin-foot-line.muted', h('span', 'Wax drips'), h('span.fin-row-dots'), h('span', drips ? String(drips) : 'None, miraculously'))));

}

// ---------- the Last Orders swing ----------
const SWING = 2900;                       // ms before the cake timeline starts
const SW = { tick: 250, tickEach: 110, tickDur: 650, move: 1450, moveDur: 650, out: 2550 };
const easeInOut = (x) => (x < 0.5 ? 16 * x ** 5 : 1 - (-2 * x + 2) ** 5 / 2);

function buildSwing(ctx, rows) {
  const n = rows.length;
  const rowH = n > 6 ? 46 : 54;
  const els = rows.map((r) => {
    const p = ctx.player(r.id);
    const rank = h('span.fin-sw-rank', String(r.prevRank));
    const score = h('span.fin-sw-score', fmt(r.prev));
    const flag = h('span.fin-sw-flag', r.delta > 0 ? `+${fmt(r.delta)}` : 'dry');
    const el = h(`div.fin-sw-row${r.id === ctx.meId ? '.me' : ''}${r.delta <= 0 ? '.zero' : ''}`,
      rank, glyph(p), h('span.fin-sw-name', p?.name || '?'), flag, score);
    return { r, el, rank, score, flag, from: r.prevRank - 1, to: rows.indexOf(r), climb: r.prevRank - 1 - rows.indexOf(r) };
  });
  const moved = els.some((e) => e.climb !== 0);
  const list = h('div.fin-sw-list', { style: { height: `${n * rowH}px`, '--rh': `${rowH}px` } }, els.map((e) => e.el));
  const el = h('div.fin-sw', h('div.fin-sw-head', h('span.fin-sw-eyebrow', 'Last Orders swing'), h('span.fin-sw-sub', 'Round 3')), list);
  // delta ticks happen in the OLD order, top of the old board first
  const byOld = els.slice().sort((a, b) => a.from - b.from);
  let last = -1;
  return {
    el, moved,
    frame(t) {
      const key = Math.round(t / 16);
      if (key === last) return;
      last = key;
      const mk = easeInOut(clamp01((t - SW.move) / SW.moveDur));
      byOld.forEach((e, i) => {
        const tk = easeOut(clamp01((t - SW.tick - i * SW.tickEach) / SW.tickDur));
        e.score.textContent = fmt(e.r.prev + e.r.delta * tk);
        e.el.classList.toggle('ticked', tk > 0);
        const y = (e.from + (e.to - e.from) * mk) * rowH;
        // climbers lift and grow a touch as they pass
        const lift = e.climb > 0 ? Math.sin(Math.PI * mk) : 0;
        e.el.style.transform = `translateY(${y.toFixed(1)}px) scale(${(1 + 0.04 * lift).toFixed(3)})`;
        e.el.style.zIndex = e.climb > 0 ? '2' : '1';
        e.el.classList.toggle('up', e.climb > 0 && mk > 0.05);
        e.el.classList.toggle('down', e.climb < 0 && mk > 0.05);
        e.rank.textContent = mk >= 0.5 ? e.r.shownRank : String(e.r.prevRank);
      });
    },
  };
}

export default {
  id: 'podium',
  layout: 'show',
  shot: 'podiumStart',
  mount({ show }, ctx) {
    const rows = tieRanks(dedupeAwards(ctx.payload.rows || []));
    finaleMemo.rows = rows;
    const set = getPodiumSet(ctx.stage);
    const swing = rows.length > 1 && rows.every((r) => typeof r.prev === 'number' && r.prevRank) ? SWING : 0;
    const dur = ctx.duration || 14000;
    set.show({ rows, players: ctx.players, mode: 'podium', duration: Math.max(6000, dur - swing), reduced: ctx.reduced });
    set.setTime(Math.max(0, ctx.elapsed() - swing));
    // the cake timeline, shifted to start after the swing
    const T = Object.fromEntries(Object.entries(set.T).map(([k, v]) => [k, k === 'scale' ? v : v + swing]));
    const name = (id) => ctx.player(id)?.name || 'Someone';
    const winner = rows[0];

    // --- header: suspense line, then the winner's name slams in
    const nameEl = h('div.fin-name', name(winner?.id));
    if ((winner && name(winner.id).length > 9)) nameEl.classList.add('long');
    const scoreEl = h('span.fin-score-n', '0');
    const head = h('div.fin-head',
      h('div.fin-pre', h('div.fin-eyebrow', 'The final bill'), h('div.fin-ask', 'Who takes', h('br'), 'the cake?')),
      h('div.fin-win',
        h('div.fin-eyebrow', h('span.fin-rule'), 'Tonight’s winner', h('span.fin-rule')),
        nameEl,
        h('div.fin-meta', h('span.fin-score', scoreEl, h('span.fin-pts', 'pts')),
          winner?.award ? h('span.fin-award', winner.award.title) : null)));

    // --- place cards under 2nd and 3rd
    const tags = rows.slice(0, 3).map((r, i) => h(`div.fin-tag.r${i + 1}`,
      h('div.fin-tag-name', name(r.id)),
      h('div.fin-tag-score', fmt(r.score))));

    const dense = rows.length > 5;
    const bill = buildBill(ctx, rows);

    // --- the Last Orders swing: old order, points tick on, then the overtakes
    const sw = swing ? buildSwing(ctx, rows) : null;

    const root = h(`div.fin${dense ? '.dense' : ''}`, { dataset: { step: '0', sw: swing ? '1' : '0' } }, h('div.fin-dim'), h('div.fin-vignette'), sw?.el, head, h('div.fin-tags', tags), bill);
    show.append(root);

    // --- host-only Skip once the cake has landed (host accepts it from 7 s)
    let skip = null;
    if (ctx.isHost) {
      const b = button('Skip', { kind: 'ghost', block: false, e2e: 'podium-skip', onClick: () => ctx.client.skip() });
      b.classList.add('on-dark');
      skip = h('div.fin-skip', b);
      show.append(skip);
    }

    // --- beats (fire once, in order; frozen screenshots fire them all at once)
    const said = new Set();
    const beat = (key, at, fn) => ({ key, at, fn });
    const beats = [
      beat('sw', 0, () => { if (swing && !ctx.frozen) ctx.audio.sfx('countup'); }),
      beat('sw-move', SW.move, () => { if (swing && !ctx.frozen && sw.moved) { ctx.audio.sfx('swipe', { dir: 'right' }); ctx.haptic('select'); } }),
      beat('t3', T.t3, () => { if (!ctx.frozen) { ctx.audio.sfx('stamp'); ctx.haptic('stamp'); } }),
      beat('t2', T.t2, () => { if (!ctx.frozen) { ctx.audio.sfx('stamp'); ctx.haptic('stamp'); } }),
      beat('drum', T.cake1, () => {
        ctx.cyril.react('drumroll', { duration: T.win - T.cake1 });
        ctx.cyril.setMood?.('hurry');
        if (!ctx.frozen) ctx.audio.sfx('drumroll');
      }),
      beat('win', T.win, () => {
        ctx.cyril.react('delight');
        ctx.cyril.setMood?.('celebrate');
        if (!ctx.frozen) setTimeout(() => ctx.cyril.setMood?.('calm'), 1600);
        if (!ctx.frozen) {
          ctx.stage.shake(0.006, 260);
          ctx.audio.sfx('fwump'); ctx.audio.sfx('fanfare');
          setTimeout(() => ctx.audio.sfx('applause'), 400);
          ctx.haptic(winner?.id === ctx.meId ? 'win' : 'stamp');
        }
      }),
    ];
    // Cyril compères the build-up from above his head (the winner's moment belongs to the header)
    const lines = [
      ...(swing ? [{ at: 150, until: SW.out, lines: [sw.moved ? 'Last orders are in. Mind the overtaking.' : 'Last orders are in. Nobody budged.'] }] : []),
      { at: T.t3 + 250, until: T.t2, lines: ['Third place. Splendid effort. Mostly.'] },
      { at: T.t2 + 250, until: T.cake1, lines: ['Second place. Close enough to smell the icing.'] },
      { at: T.cake1 + 150, until: T.win, lines: ['And the cake goes to...'] },
      { at: T.win + 1100, until: T.bill + 1200, lines: [`${name(winner?.id)}. Who will now be insufferable.`] },
    ];

    let shownStep = -1;
    const frame = () => {
      const t = ctx.elapsed();
      set.setTime(Math.max(0, t - swing));
      if (sw) {
        sw.frame(t);
        const on = t < SW.out + 300;
        if (root.dataset.sw !== (on ? '1' : '0')) root.dataset.sw = on ? '1' : '0';
      }
      if (skip) skip.classList.toggle('on', t > 7000 / (ctx.phase?.speed || 1));
      const step = t >= T.bill ? 5 : t >= T.win ? 4 : t >= T.cake1 ? 3 : t >= T.t2 ? 2 : t >= T.t3 ? 1 : 0;
      if (step !== shownStep) { shownStep = step; root.dataset.step = String(step); }
      if (ctx.frozen && t > T.win + 1600) ctx.cyril.setMood?.('calm');
      for (const b of beats) if (!said.has(b.key) && t >= b.at) { said.add(b.key); try { b.fn(); } catch (e) { console.error(e); } }
      // Cyril: in frozen mode only the latest due line is said
      const due = lines.filter((l) => t >= l.at);
      const last = due[due.length - 1];
      if (last && !said.has(last.at)) {
        due.forEach((l) => said.add(l.at));
        if (t < last.until) ctx.say(last.lines, { hold: Math.max(600, last.until - t - 300), placement: 'above' });
      }
      // winner score counts up
      const k = easeOut(clamp01((t - T.win - 250 * T.scale) / (1300 * T.scale)));
      scoreEl.textContent = fmt((winner?.score || 0) * k);
      // pin the place cards under their cakes
      const an = set.anchors();
      tags.forEach((el, i) => {
        const a = an[i]?.foot;
        if (a) el.style.transform = `translate(${a.x.toFixed(1)}px, ${(a.y + 4).toFixed(1)}px) translate(-50%, 0)`;
      });
    };
    frame();
    return {
      frame,
      unmount() { set.hide(); skip?.remove(); ctx.cyril.setMood?.('calm'); },
    };
  },
};
