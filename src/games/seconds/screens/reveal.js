// seconds-reveal. Two shapes:
//  hung    - nobody got a majority: who pointed at whom, then the next task.
//  verdict - drumroll on the accused, stamp (Had seconds! / Innocent! / Got away! / All faking!),
//            the faker unmasked, the real tasks shown to the faker, points.
// Everything is a pure function of ctx.elapsed(), so screenshots and sync both work.
import { h } from '../../../ui/components.js';
import { disc, TYPE_ICON, where, skipBtn } from './kit.js';

const STAMP = { caught: 'Had seconds!', framed: 'Innocent!', escaped: 'Got away!', all: 'All faking!' };
const LINE = { caught: 'scCaught', framed: 'scFramed', escaped: 'scEscaped', all: 'scAll' };
const names = (ctx, ids) => {
  const n = ids.map((id) => ctx.player(id)?.name || '?');
  return n.length <= 2 ? n.join(' and ') : `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`;
};

function pointers(ctx, votes, target, size = 24) {
  return h('span.sc-pointers', Object.keys(votes).filter((v) => votes[v] === target).map((v) => disc(ctx.player(v), { size })));
}

function hung(show, ctx) {
  const p = ctx.payload;
  const rows = Object.entries(p.tally).filter(([target]) => ctx.player(target)).sort((a, b) => b[1] - a[1]).map(([target, n]) => {
    const pl = ctx.player(target);
    return h('div.sc-tallyrow', disc(pl, { size: 44 }), h('span.nm', pl.name), pointers(ctx, p.votes, target, 28), h('b.n', String(n)));
  });
  const unsure = p.tally.none || 0;
  if (unsure) rows.push(h('div.sc-tallynote', `${unsure} not sure yet`));
  show.append(h('div.sc-rv.hung',
    h('div.sc-rvcard',
      h('div.sc-where', where(p)),
      h('div.sc-title', 'No majority'),
      h('div.sc-sub', `The faker lives. Task ${p.task + 2} next. Watch closer.`),
      rows.length ? h('div.sc-tally', rows) : h('div.sc-sub', 'Nobody pointed at anyone. Very polite.'))));
  if (!ctx.frozen) ctx.audio.sfx('page');
  ctx.cyril.react('sad', { duration: ctx.frozen ? 60000 : 1200 });
  const t = setTimeout(() => ctx.say(ctx.line('scHung'), { hold: 2400, placement: 'side' }), ctx.frozen ? 0 : 500);
  return { unmount: () => clearTimeout(t) };
}

function verdict(show, ctx) {
  const p = ctx.payload;
  const at = p.at;
  const quiet = ctx.frozen;
  const accused = p.accused ? ctx.player(p.accused) : null;
  const fakerIds = p.all ? [] : p.fakers;

  // One big face at a time. Beat 1: who the table pointed at (and who pointed). Beat 2: the stamp,
  // under the face, never over it. Beat 3: the faker's face takes the stage. Beat 4: points pop.
  // Beat 5: the real tasks, so the faker finally learns what everyone was doing.
  const big = (pl, cls = '') => h(`div.sc-bigface${cls}`, disc(pl, { size: 124 }), h('div.sc-bigname', pl?.name || '?'));
  let stageA;
  let lineA;
  if (p.kind === 'all') {
    stageA = h('div.sc-heroall', ctx.players.slice(0, 8).map((pl) => disc(pl, { size: 58 })));
    lineA = 'Everyone’s phone said the same thing...';
  } else if (accused) {
    stageA = big(accused);
    lineA = `The table points at ${accused.name}`;
  } else {
    stageA = h('div.sc-bigface', h('span.sc-av.blank.huge', '?'), h('div.sc-bigname', 'Nobody'));
    lineA = 'Nobody could agree';
  }
  const pointedBy = accused ? Object.keys(p.votes).filter((v) => p.votes[v] === accused.id) : [];
  const byRow = pointedBy.length
    ? h('div.sc-by', h('span', 'Pointed by'), h('span.sc-pointers', pointedBy.map((v) => disc(ctx.player(v), { size: 30 }))))
    : null;
  const swap = (p.kind === 'framed' || p.kind === 'escaped') && fakerIds.length;
  const stageB = swap ? h('div.sc-fakerface', fakerIds.map((id) => big(ctx.player(id)))) : null;
  let unmaskText;
  if (p.kind === 'all') unmaskText = 'Nobody had the task. You were all faking.';
  else if (p.kind === 'caught') unmaskText = p.fakers.length > 1 ? `${names(ctx, p.fakers)} both had seconds` : `${accused?.name || '?'} had seconds`;
  else unmaskText = `${names(ctx, p.fakers)} had seconds all along`;
  const stamp = h(`div.sc-stamp.${p.kind}`, h('span.a', STAMP[p.kind]), swap ? h('span.b', 'Got away!') : null);
  const caption = h('div.sc-heroline', h('span.a', lineA), h('span.b', unmaskText));
  const hero = h(`div.sc-hero${swap ? '.swap' : ''}`, caption, h('div.sc-stage', stageA, stageB), stamp, byRow);

  // points: big pops, yours ringed
  const rows = Object.entries(p.deltas).sort((a, b) => b[1] - a[1]);
  const pts = h('div.sc-pts', rows.length
    ? rows.map(([id, n]) => h(`span.sc-ptchip${id === ctx.meId ? '.me' : ''}`, disc(ctx.player(id), { size: 34 }), h('span.nm', ctx.player(id)?.name || '?'), h('b', `+${n}`)))
    : h('span.sc-sub', 'Nobody scored. Shocking.'));

  const tasks = h('div.sc-tasks',
    h('div.sc-tasks-h', p.kind === 'all' ? 'The task nobody got' : 'What everyone else was doing'),
    p.done.map((x) => h('div.sc-taskrow', h('span.ic', { html: TYPE_ICON[x.type] }), h('span', x.t))));

  show.append(h(`div.sc-rv.${p.kind}`, h('div.sc-where.on-dark', where(p)), hero, pts, tasks));

  const steps = [
    [0, () => { if (!quiet) { ctx.audio.sfx('drumroll', { duration: at.stamp / 1000 }); ctx.haptic('drumroll'); } ctx.cyril.react('drumroll', { duration: quiet ? 60000 : at.stamp }); }],
    [at.stamp, () => {
      show.classList.add('sc-stamped');
      if (!quiet) {
        ctx.audio.sfx('stamp'); ctx.stage.shake?.(); ctx.haptic('stamp');
        if (p.kind === 'caught' || p.kind === 'all') ctx.audio.sfx('fanfare');
        else ctx.audio.sfx('groan');
      }
      ctx.cyril.react(p.kind === 'caught' ? 'delight' : p.kind === 'all' ? 'guffaw' : 'shock', { duration: quiet ? 60000 : 1300 });
      if (!quiet) ctx.say(ctx.line(LINE[p.kind]), { hold: 2600, placement: 'side' });
    }],
    [at.unmask, () => {
      show.classList.add('sc-unmasked');
      if (!quiet) { ctx.audio.sfx(swap ? 'oink' : 'pop'); if (swap) ctx.stage.shake?.(); if (fakerIds.includes(ctx.meId) && p.kind !== 'caught') ctx.haptic('fooled'); }
    }],
    [at.points, () => {
      show.classList.add('sc-ptsin');
      if (!quiet && rows.length) { ctx.audio.sfx('countup', { ticks: 8 }); if (p.deltas[ctx.meId]) ctx.haptic('win'); }
    }],
    [at.tasks, () => { show.classList.add('sc-tasksin'); if (!quiet) ctx.audio.sfx('page'); }],
  ];
  let next = 0;
  const run = (c) => {
    const t = c.elapsed();
    while (next < steps.length && t >= steps[next][0]) {
      const [when, fn] = steps[next];
      next += 1;
      void when;
      fn();
    }
  };
  run(ctx);
  return { frame: run };
}

export default {
  id: 'seconds-reveal',
  layout: 'show',
  shot: 'reveal',
  rail: true,
  mount({ show }, ctx) {
    const r = ctx.payload.kind === 'hung' ? hung(show, ctx) : verdict(show, ctx);
    const sk = skipBtn(ctx, show, ctx.payload.kind === 'hung' ? 1500 : 7000);
    return { ...r, frame: (c) => { r.frame?.(c); sk?.(c); } };
  },
};
