// topshelf-reveal: drumroll, the right answer lights up, everyone's picks land on the options,
// then the bottles climb or slip on the cabinet with a flag each (+2 quick, +1, -1, Saved, Stole!).
// Pure function of ctx.elapsed() so frozen screenshots and phone sync both work.
import { h } from '../../../ui/components.js';
import { ICONS } from '../../../ui/icons.js';
import { cabinet, disc, qCard, moveFrame, LETTERS } from './kit.js';

const FLAME = '<svg viewBox="0 0 24 24"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-7 .5 2 1.5 3 2.5 3 0-3-1-5.5.5-8z" fill="currentColor"/></svg>';

const FLAG = {
  fast: (m) => ({ flag: `+${m.to - m.from}`, kind: 'up' }),
  right: (m) => ({ flag: m.to === m.from ? 'Right' : `+${m.to - m.from}`, kind: m.to === m.from ? 'same' : 'up' }),
  wrong: (m) => ({ flag: m.to === m.from ? 'Wrong' : `−${m.from - m.to}`, kind: m.to === m.from ? 'same' : 'down' }),
  none: () => ({ flag: '', kind: '' }),
  saved: () => ({ flag: 'Saved', kind: 'saved' }),
  steal: () => ({ flag: 'Stole', kind: 'up' }),
  robbed: () => ({ flag: 'Robbed', kind: 'down' }),
  'port-right': (m) => ({ flag: `+${m.to - m.from}`, kind: 'up' }),
  'port-wrong': (m) => ({ flag: m.to === m.from ? 'Wrong' : `−${m.from - m.to}`, kind: 'down' }),
  bet: (m) => ({ flag: m.to === m.from ? 'Bet' : '+1', kind: 'up' }),
};

/** What happened to me, in one short line. */
function myLine(p, me) {
  const m = p.moves[me];
  if (!m) return '';
  const pick = p.picks[me];
  if (p.mode === 'port') {
    if (me === p.port.victim) return p.port.right ? 'You got it. Up two.' : m.tag === 'saved' ? 'Wrong, but your Steady Hand saved you.' : p.port.answered ? 'Wrong. Down two.' : 'No answer. Down two.';
    const b = p.port.bets[me];
    if (!b) return 'No bet, no shelf.';
    return b.won ? 'Good call. Up one.' : 'Bad call. No harm done.';
  }
  if (p.mode === 'steal') {
    if (m.tag === 'steal') return 'You stole the leader’s shelf!';
    if (m.tag === 'robbed') return 'Robbed! You swap down.';
    if (me === p.steal?.leader && pick?.right) return 'Right. Your shelf is safe.';
    return pick ? (pick.right ? 'Right, but someone was quicker.' : 'Wrong. No harm in a steal round.') : 'No answer.';
  }
  if (p.mode === 'final') {
    if (!pick) return `No answer. Down ${m.wager}.`;
    return pick.right ? `Right! Up ${m.to - m.from}.` : `Wrong. Down ${m.from - m.to}.`;
  }
  if (m.tag === 'saved') return 'Wrong, but your Steady Hand saved you.';
  if (!pick) return 'No answer. You stay put.';
  if (pick.fast) return `Right and quick: up ${m.to - m.from}.`;
  if (pick.right) return m.to > m.from ? 'Right: up one.' : 'Right, but you’re already at the top.';
  return m.from === 0 ? 'Wrong. Already on the floor.' : 'Wrong: down one.';
}

function noteKey(p, ctx) {
  const ids = Object.keys(p.moves);
  if (p.mode === 'steal') {
    if (p.steal?.thief) return ctx.line('tsStole', { name: ctx.player(p.steal.thief)?.name || '?' });
    return ctx.line(p.steal?.held ? 'tsHeld' : 'tsNobodyStole');
  }
  if (p.mode === 'port') return ctx.line(p.port.right ? 'tsPortRight' : 'tsPortWrong', { name: ctx.player(p.port.victim)?.name || '?' });
  if (ids.some((id) => p.moves[id].earned)) {
    const id = ids.find((x) => p.moves[x].earned);
    return [`${ctx.player(id)?.name || '?'}: three in a row. A Steady Hand: the next slip is forgiven.`];
  }
  if (ids.some((id) => p.moves[id].tag === 'saved')) return ctx.line('tsSaved');
  const right = ids.filter((id) => p.picks[id]?.right).length;
  if (right === ids.length) return ctx.line('tsAll');
  if (right === 0) return ctx.line('tsNone');
  return ctx.line('tsSome');
}

export default {
  id: 'topshelf-reveal',
  layout: 'show',
  shot: 'scores',
  rail: true,
  mount({ show }, ctx) {
    const p = ctx.payload;
    const at = p.at;
    const ids = ctx.players.map((x) => x.id).filter((id) => p.moves[id]);
    const card = qCard(p, { timer: false, compact: true });
    const voters = (i) => ids.filter((id) => p.picks[id]?.i === i);
    const opts = p.options.map((t, i) => {
      const who = h('span.ts-ropt-who', voters(i).map((id) => disc(ctx.player(id), { size: 22, cls: id === ctx.meId ? '.me' : '' })));
      const el = h(`div.ts-ropt${i === p.correct ? '.right' : ''}`, h('span.ts-opt-k', LETTERS[i]), h('span.ts-ropt-t', t), h('span.ts-ropt-ok', { html: ICONS.tick }), who);
      return el;
    });
    const mine = h('div.ts-mine', h('span.ts-mine-t', myLine(p, ctx.meId)));
    const after = {};
    for (const id of ids) after[id] = p.moves[id].to;
    const cab = cabinet(ctx, { top: p.top, size: 'full' });
    const note = h('div.ts-note', h('span.ts-note-f', { html: FLAME }), h('span.ts-note-t'));
    show.append(h(`div.ts-rv.m-${p.mode}`,
      h('div.ts-rv-a', card, h('div.ts-ropts', opts), mine, note),
      h('div.ts-rv-b', cab)));

    const myMove = p.moves[ctx.meId];
    const good = myMove && (myMove.to > myMove.from || (p.picks[ctx.meId]?.right && myMove.to === myMove.from));
    const extrasAt = (moved) => {
      const ex = {};
      for (const id of ids) {
        const m = p.moves[id];
        const f = moved ? (FLAG[m.tag] || FLAG.none)(m) : {};
        ex[id] = { ...f, shield: moved ? !!(p.moves[id].earned || (p.shields?.[id])) : !!(p.shields?.[id] || m.tag === 'saved'), dim: false };
      }
      return ex;
    };
    // shields in payload are AFTER the reveal; before the move show the old ones (saved ones had one)
    const quiet = ctx.frozen;
    const fired = new Set();
    const once = (k, fn) => { if (!fired.has(k)) { fired.add(k); fn(); } };
    const run = (c) => {
      const t = c.elapsed();
      show.classList.toggle('ts-answered', t >= at.answer);
      show.classList.toggle('ts-picked', t >= at.picks);
      show.classList.toggle('ts-moved', t >= at.move);
      const moving = t >= at.move;
      cab.place(moveFrame(ids, p.before, after, t, { start: at.move, dur: 900 / (c.phase?.speed || 1), stagger: 80 / (c.phase?.speed || 1) }), extrasAt(moving));
      if (t < at.answer) once('roll', () => { if (!quiet) { ctx.audio.sfx('drumroll', { duration: at.answer / 1000 }); ctx.cyril.react('drumroll', { duration: at.answer }); } });
      if (t >= at.answer) once('ans', () => {
        if (!quiet) { ctx.audio.sfx('stamp'); ctx.haptic('stamp'); ctx.stage.shake?.(); }
        const right = ids.filter((id) => p.picks[id]?.right).length;
        ctx.cyril.react(right === 0 ? 'shock' : right === ids.length ? 'delight' : 'smug', { duration: quiet ? 60000 : 1200 });
      });
      if (t >= at.picks) once('picks', () => { if (!quiet) ctx.audio.sfx('pop'); });
      if (t >= at.move) once('move', () => {
        if (quiet) return;
        ctx.audio.sfx(p.mode === 'steal' && p.steal?.thief ? 'fanfare' : 'countup', { ticks: 8 });
        if (myMove && myMove.to !== myMove.from) ctx.haptic(good ? 'win' : 'fooled');
      });
      if (t >= at.note) once('note', () => {
        note.querySelector('.ts-note-t').textContent = (noteKey(p, ctx) || []).join(' ');
        note.classList.add('on');
      });
    };
    run(ctx);
    mine.classList.toggle('good', !!good);
    mine.classList.toggle('bad', !!myMove && myMove.to < myMove.from);
    return { frame: run };
  },
};
