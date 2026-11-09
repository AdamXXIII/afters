// percentages-reveal: the knife line sits on the pie at the cut, a drumroll, then the real slice
// sweeps round while the number counts up; stamp (BULLSEYE / CLOSE / OFF / MILES OFF) with the
// knife-holder's points; the bets resolve in lanes (winners hop with +points); Cyril's aside.
// Everything is a pure function of ctx.elapsed() so frozen screenshots and sync both work.
import { h } from '../../../ui/components.js';
import { pie, questionCard, disc, easeOut, BET_INFO, ARROW_UP, ARROW_UP2 } from './kit.js';

const FLAME = '<svg viewBox="0 0 24 24"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-7 .5 2 1.5 3 2.5 3 0-3-1-5.5.5-8z" fill="currentColor"/></svg>';
const STAMP = { bullseye: 'Bullseye!', close: 'Close!', off: 'Off', miles: 'Miles off' };
const LINE = { bullseye: 'pcBullseye', close: 'pcClose', off: 'pcOff', miles: 'pcMiles' };

export default {
  id: 'percentages-reveal',
  layout: 'show',
  shot: 'scores',
  rail: true,
  mount({ show }, ctx) {
    const p = ctx.payload;
    const at = p.at;
    const knife = ctx.player(p.knife);
    const card = questionCard(p, { timer: false, compact: true });
    const pieEl = pie({ size: 250, ticks: false });
    pieEl.classList.add('reveal');
    const kpts = p.deltas[p.knife] || 0;
    const stamp = h(`div.pc-stamp.${p.outcome}`,
      h('div.pc-stamp-t', STAMP[p.outcome]),
      h('div.pc-stamp-s', disc(knife, { size: 26 }), h('span', p.diff === 0 ? `${knife?.name || '?'}: not a crumb off` : `${knife?.name || '?'} was ${p.diff} off`), h('b', `+${kpts}`)));
    const pollNote = p.poll ? h('div.pc-pollnote', `${p.poll.yes} of ${p.poll.n} of you said yes`) : null;
    const lanes = buildLanes(ctx);
    const note = h('div.pc-note', h('span.pc-note-f', { html: FLAME }), h('span.pc-note-t'));
    const setNote = (lines) => { note.querySelector('.pc-note-t').textContent = (lines || []).join(' '); note.classList.add('on'); };
    show.append(h('div.pc-rv',
      card,
      h('div.pc-rv-mid', h('div.pc-rv-pie', pieEl), stamp, pollNote),
      note,
      lanes.el));

    let phaseShown = -1;
    const quiet = ctx.frozen;
    const fire = (k, fn) => { if (phaseShown < k) { phaseShown = k; if (!quiet || k >= 0) fn(); } };
    const render = (t) => {
      // knife + ghost of the cut are on from the start
      pieEl.knife(p.cut); pieEl.ghost(p.cut);
      if (t < at.sweep) {
        pieEl.slice(0); pieEl.num('?'); pieEl.label(p.kind === 'poll' ? 'this table' : 'the nation');
      } else if (t < at.land) {
        const k = easeOut((t - at.sweep) / (at.land - at.sweep));
        const v = p.real * k;
        pieEl.slice(v); pieEl.num(`${Math.round(v)}%`); pieEl.label(p.kind === 'poll' ? 'of this table' : 'said yes');
      } else {
        pieEl.slice(p.real); pieEl.num(`${p.real}%`); pieEl.label(p.kind === 'poll' ? 'of this table' : 'said yes');
      }
      show.classList.toggle('pc-landed', t >= at.land);
      show.classList.toggle('pc-betsin', t >= at.bets);
    };
    const steps = [
      [at.sweep, () => { if (!quiet) { ctx.audio.sfx('drumroll', { duration: (at.land - at.sweep) / 1000 }); ctx.cyril.react('drumroll', { duration: at.land - at.sweep }); } }],
      [at.land, () => {
        if (!quiet) { ctx.audio.sfx('stamp'); ctx.stage.shake?.(); ctx.haptic('stamp'); if (p.outcome === 'bullseye') ctx.audio.sfx('fanfare'); }
        ctx.cyril.react(p.outcome === 'bullseye' ? 'delight' : p.outcome === 'miles' ? 'shock' : p.outcome === 'close' ? 'smug' : 'sad', { duration: quiet ? 60000 : 1300 });

        if (p.knife === ctx.meId && kpts && !quiet) ctx.haptic('win');
      }],
      [at.bets, () => {
        lanes.resolve();
        if (!quiet) { ctx.audio.sfx('countup', { ticks: 10 }); if ((p.bets[ctx.meId]?.pts || 0) > 0) ctx.haptic('win'); }
      }],
      [at.aside, () => {
        const line = p.poll ? ctx.line('pcPollReveal') : p.aside ? [p.aside] : null;
        if (line) { setNote(line); if (!quiet) ctx.cyril.react('smug', { duration: 1200 }); }
      }],
    ];
    const run = (c) => {
      const t = c.elapsed();
      render(t);
      steps.forEach(([s, fn], i) => { if (t >= s) fire(i, fn); });
    };
    run(ctx);
    return { frame: run };
  },
};

function buildLanes(ctx) {
  const p = ctx.payload;
  const kinds = ['mlower', 'lower', 'higher', 'mhigher'];
  const lanes = kinds.filter((k) => Object.values(p.bets).some((b) => b.bet === k)).map((k) => {
    const ids = Object.keys(p.bets).filter((id) => p.bets[id].bet === k);
    const much = k[0] === 'm'; const down = k.includes('lower');
    const won = ids.length && p.bets[ids[0]].pts > 0;
    const pts = ids.length ? p.bets[ids[0]].pts : 0;
    return h(`div.pc-lane.${down ? 'down' : 'up'}${ids.length ? '' : '.empty'}${won ? '.won' : '.lost'}`,
      h('div.pc-lane-h', h('span.ic', { html: much ? ARROW_UP2 : ARROW_UP }), h('span', BET_INFO[k].label)),
      h('div.pc-lane-who', ids.map((id) => disc(ctx.player(id), { size: 28, cls: id === ctx.meId ? '.me' : '' }))),
      h('div.pc-lane-pts', ids.length ? (won ? `+${pts}` : 'Nope') : '–'));
  });
  const nobody = !Object.keys(p.bets).length;
  const el = h('div.pc-lanes', nobody ? h('div.pc-lanes-none', 'Nobody bet. Cowards, the lot of you.') : lanes);
  return { el, resolve() { el.classList.add('resolved'); } };
}
