// Same Here show screens: intro (how it plays), reveal (answers grouped, smallest first, the herd
// last; then the Wobbly Chair; then the standings), crown (who thinks like the table).
// AI-generated (Claude, Same Here builder, 2026-11-13).
import { h } from '../../../ui/components.js';
import { disc, chair, pips, questionCard, answerCard, sayLater, skipBtn, nameOf } from './kit.js';

// ---------- intro ----------
function introArt(seed) {
  const row = h('div.sh-art-stack',
    h('div.sh-art-row',
      answerCard('Telly', { cls: '.mini.herd', seed, key: 'i1' }),
      answerCard('Telly', { cls: '.mini.herd', seed, key: 'i2' }),
      answerCard('Telly', { cls: '.mini.herd', seed, key: 'i3' })),
    h('span.sh-art-cap', h('b', '3 said Telly'), h('br'), '+1 point each'));
  const odd = h('div.sh-art-odd', answerCard('Tablet', { cls: '.mini', seed, key: 'i4' }), chair({ size: 40, cls: '.rock' }),
    h('span.sh-art-cap', h('b', 'Only one said Tablet'), h('br'), 'Wobbly Chair'));
  return h('div.sh-art', row, odd);
}

const intro = {
  id: 'samehere-intro',
  layout: 'show',
  shot: 'intro',
  mount({ show }, ctx) {
    const steps = ctx.game?.steps || [];
    const card = h('div.sh-menu',
      h('div.sh-menu-title', 'Same Here'),
      h('div.sh-menu-art', introArt(ctx.phase?.seed || 1)),
      h('ol.sh-rules', steps.map((r, i) => h('li', h('span.n', String(i + 1)), h('span.t', r)))),
      h('div.sh-menu-foot', `Question: Name something with a screen. First to ${ctx.payload.target} points wins.`));
    show.append(h('div.sh-dim'), h('div.sh-cardwrap', card));
    if (!ctx.frozen) card.animate([{ transform: 'translateY(28px) rotate(-2deg) scale(.94)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 620, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' });
    const sk = skipBtn(ctx, show);
    const cancel = sayLater(ctx, ctx.line(ctx.payload.plays > 1 ? 'shIntroAgain' : 'shIntro'), { delay: 900, hold: 3000 });
    ctx.cyril.react('smug', { duration: ctx.frozen ? 60000 : 1200 });
    return { frame: (c) => sk?.(c), unmount: cancel };
  },
};

// ---------- reveal ----------
function standingsBoard(ctx, p) {
  const rows = p.standings.map((r, i) => {
    const pl = ctx.player(r.id);
    const me = r.id === ctx.meId;
    const up = (p.deltas?.[r.id] || 0) > 0;
    return h(`div.sh-srow${me ? '.me' : ''}${r.id === p.chair ? '.chaired' : ''}${up ? '.up' : ''}`, { style: { '--i': i } },
      disc(pl, { size: 30 }),
      h('span.nm', me ? 'You' : pl?.name || '?'),
      r.id === p.chair ? chair({ size: 26, cls: '.rock' }) : null,
      pips(r.score, p.target),
      h('span.sc', String(r.score)),
      up ? h('span.sh-plus', '+1') : null);
  });
  return h('div.sh-board', h('div.sh-board-h', h('span', 'Points. First to '), h('b', String(p.target)), h('span', ' wins')), rows,
    p.chair ? h('div.sh-board-foot', chair({ size: 20 }), `${nameOf(ctx, p.chair)} can’t win while on the Wobbly Chair.`) : null);
}

const reveal = {
  id: 'samehere-reveal',
  layout: 'show',
  shot: 'reveal',
  mount({ show }, ctx) {
    const p = ctx.payload;
    const seed = ctx.phase?.seed || 1;
    const stepOf = (kind, gid) => p.steps.find((s) => s.kind === kind && (gid == null || s.gid === gid));
    const herdG = p.groups.find((g) => g.gid === p.herd);

    const groupEls = p.groups.map((g) => {
      const herd = g.gid === p.herd;
      const lone = g.pids.length === 1;
      const el = h(`div.sh-grp${herd ? '.herd' : ''}${lone ? '.lone' : ''}`, { style: { '--tilt': '0deg' } },
        answerCard([g.text, ...(g.also || [])].join(' / '), { cls: herd ? '.herd' : '', seed, key: g.gid }),
        h(`div.sh-grp-who${g.pids.length > 3 ? '.two' : ''}`, g.pids.map((id, i) => h('span.sh-grp-p', { style: { '--i': i } }, disc(ctx.player(id), { size: herd ? 34 : 28 }), h('span.nm', nameOf(ctx, id))))),
        h(`span.sh-grp-n${herd ? '.big' : ''}`, String(g.pids.length)),
        herd ? h('span.sh-stamp', 'Same here! +1') : null,
        g.also?.length ? h('span.sh-also', 'The table voted these the same') : null);
      el.gid = g.gid;
      return el;
    });
    const list = h(`div.sh-groups${p.groups.length > 5 ? '.many' : ''}`, groupEls);

    let verdictText;
    if (p.outcome === 'herd') verdictText = h('span', h('b', herdG.text), ` wins. +1 to ${herdG.pids.map((id) => nameOf(ctx, id)).join(', ')}.`);
    else if (p.outcome === 'split') verdictText = h('span', h('b', 'Split table.'), ' A tie at the top, so nobody scores.');
    else if (p.outcome === 'scattered') verdictText = h('span', h('b', 'All different.'), ' Nobody matched. Nobody scores.');
    else verdictText = h('span', h('b', 'No answers.'), ' Nobody scores.');
    const alone = p.groups.filter((g) => g.pids.length === 1).length;
    const verdict = h(`div.sh-verdict.${p.outcome}`, verdictText,
      !p.lone && alone > 1 ? h('span.sh-verdict-n', `${alone} people on their own, so nobody gets the Wobbly Chair.`) : null);

    let chairEl = null;
    if (p.lone) {
      const kept = p.chairFrom === p.lone;
      chairEl = h('div.sh-chairbox',
        chair({ size: 58, cls: '.rock' }),
        h('div.sh-chairbox-t',
          h('b', p.lone === ctx.meId ? 'You’re on the Wobbly Chair' : `${nameOf(ctx, p.lone)} is on the Wobbly Chair`),
          h('small', kept ? 'Still there. Alone again.' : p.chairFrom ? `${nameOf(ctx, p.chairFrom)} is off it. Can’t win from the chair.` : 'The only one on their own. Can’t win from the chair.')));
    }
    const board = standingsBoard(ctx, p);
    const qc = questionCard(p.q, { round: p.round, compact: true });
    const root = h('div.sh-rv', qc, list, verdict, chairEl, board);
    show.append(root);

    // timeline from ctx.elapsed(): reveal groups, verdict, chair, standings
    const said = new Set();
    const fired = new Set();
    let cyrilLines = [];
    const once = (k, fn) => { if (!fired.has(k)) { fired.add(k); fn(); } };
    const apply = (c) => {
      const t = c.elapsed();
      groupEls.forEach((el) => {
        const s = stepOf('group', el.gid);
        const on = s && t >= s.at;
        el.classList.toggle('on', !!on);
        if (on && !c.frozen) once(`g${el.gid}`, () => {
          if (el.gid === p.herd) { c.audio.sfx('fanfare'); c.haptic(herdG.pids.includes(c.meId) ? 'win' : 'stamp'); c.cyril.react('delight'); }
          else c.audio.sfx('stamp');
        });
      });
      const sv = stepOf('verdict'); const sc = stepOf('chair'); const ss = stepOf('standings');
      verdict.classList.toggle('on', t >= sv.at);
      if (t >= sv.at) once('v', () => {
        if (said.has('v')) return; said.add('v');
        const key = p.outcome === 'herd' ? 'shHerd' : p.outcome === 'split' ? 'shSplit' : 'shScattered';
        cyrilLines.push(sayLater(c, c.line(key, { answer: herdG?.text || '' }), { delay: 0 }));
        if (p.outcome !== 'herd' && !c.frozen) c.cyril.react('sad');
      });
      if (chairEl) {
        chairEl.classList.toggle('on', t >= sc.at);
        groupEls.forEach((el) => el.classList.toggle('chairhit', t >= sc.at && el.classList.contains('lone') && p.groups.find((g) => g.gid === el.gid)?.pids[0] === p.lone));
        if (t >= sc.at && !c.frozen) once('c', () => { c.audio.sfx('groan'); c.haptic(p.lone === c.meId ? 'fooled' : 'tap'); c.cyril.react('shock'); cyrilLines.push(sayLater(c, c.line('shChair', { name: c.player(p.lone)?.name || 'Someone' }), { delay: 300 })); });
      }
      root.classList.toggle('board', t >= ss.at);
    };
    apply(ctx);
    return { frame: apply, unmount() { cyrilLines.forEach((f) => f()); } };
  },
};

// ---------- crown ----------
const crown = {
  id: 'samehere-crown',
  layout: 'show',
  shot: 'scores',
  mount({ show }, ctx) {
    const p = ctx.payload;
    const names = p.winners.map((id) => nameOf(ctx, id));
    const wname = names.join(' & ') || 'Nobody';
    const card = h('div.sh-crown',
      h('div.sh-crown-avs', p.winners.map((id) => disc(ctx.player(id), { size: 76 }))),
      h('div.sh-crown-name', `${wname} ${p.winners.length > 1 || p.winners[0] === ctx.meId ? 'win' : 'wins'}`),
      h('div.sh-crown-sub', `${(p.standings.find((r) => r.id === p.winners[0])?.score) ?? 0} points. Thinks exactly like the table.`),
      p.chair ? h(`div.sh-crown-chair${p.robbed ? '.robbed' : ''}`, chair({ size: 46, cls: '.rock' }),
        h('div', h('b', p.chair === ctx.meId ? 'You finished on the Wobbly Chair' : `${nameOf(ctx, p.chair)} finished on the Wobbly Chair`),
          h('small', p.robbed ? `${p.chairScore} points, and still can’t win from there.` : 'Never mind. There’s always the next game.'))) : null,
      h('div.sh-crown-foot', `${p.rounds} questions`));
    show.append(h('div.sh-dim'), h('div.sh-cardwrap', card));
    if (!ctx.frozen) { ctx.audio.sfx('fanfare'); card.animate([{ transform: 'scale(.9)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 560, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' }); }
    ctx.cyril.react('guffaw', { duration: ctx.frozen ? 60000 : 1200 });
    const line = p.robbed ? ctx.line('shRobbed', { chair: ctx.player(p.chair)?.name || 'Someone' }) : ctx.line('shFinal', { name: ctx.player(p.winners[0])?.name || 'Someone' });
    const cancel = sayLater(ctx, line, { delay: 900, hold: 3000 });
    return { unmount: cancel };
  },
};

export default [intro, reveal, crown];
