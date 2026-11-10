// Pie Chart host logic (runs on the host phone only; talks to phones only through `api`).
// See ./DESIGN.md for rules, timers and scoring.
import { QUESTIONS } from './content/questions.js';
import { TABLE_POLLS } from './content/polls.js';
import { FINALS } from './content/finals.js';

export const PC = {
  intro: 6000, poll: 12000, dial: 25000, bet: 12000, reveal: 10500, scores: 6000,
  finalIntro: 5000, final: 25000, finalReveal: 11000,
};
// reveal timeline (ms, before api.dur): when the real slice starts sweeping, lands, bets resolve, aside
export const REVEAL = { sweep: 900, land: 3300, bets: 4200, aside: 5400 };
export const BETS = ['mhigher', 'higher', 'lower', 'mlower'];
export const MUCH = 15;
export const BULL = 2;

export function knifePoints(diff) {
  if (diff <= BULL) return 2000;
  return Math.max(0, Math.round((1500 - 75 * diff) / 50) * 50);
}

export function betPoints(bet, cut, real) {
  const d = real - cut;
  if (Math.abs(d) <= BULL) return 0;
  const up = d > 0;
  if (bet === 'higher') return up ? 500 : 0;
  if (bet === 'lower') return up ? 0 : 500;
  if (bet === 'mhigher') return up ? (d >= MUCH ? 1000 : 250) : 0;
  if (bet === 'mlower') return up ? 0 : (-d >= MUCH ? 1000 : 250);
  return 0;
}

export const outcomeOf = (diff) => (diff <= BULL ? 'bullseye' : diff <= 8 ? 'close' : diff <= 20 ? 'off' : 'miles');

export class PercentagesHost {
  constructor(api) {
    this.api = api;
    this.round = 0;
    this.rounds = [];
    this.scoresShown = false;
  }

  start() {
    const api = this.api;
    const ps = api.players;
    const n = Math.min(8, Math.max(4, ps.length));
    const rng = api.sub('pc-plan');
    // knife order: shuffled, everyone once before anyone twice
    const order = [];
    while (order.length < n) {
      const pass = ps.map((p) => p.id).sort(() => rng() - 0.5);
      order.push(...pass);
    }
    const polls = ps.length >= 7 ? 2 : 1;
    const pollAt = new Set(polls === 2 ? [Math.floor(n / 3), Math.floor((2 * n) / 3)] : [Math.floor(n / 2)]);
    const qs = api.take(QUESTIONS, 'pc-q', n - polls, rng);
    const tp = api.take(TABLE_POLLS, 'pc-poll', polls, rng);
    let qi = 0;
    let pi = 0;
    this.rounds = [];
    for (let i = 0; i < n; i++) {
      if (pollAt.has(i)) this.rounds.push({ kind: 'poll', poll: tp[pi++], knife: order[i] });
      else this.rounds.push({ kind: 'nation', q: qs[qi++], knife: order[i] });
    }
    this.final = api.take(FINALS, 'pc-final', 1, rng)[0];
    this.round = 0;
    this.api.enter('percentages-intro', PC.intro, { rounds: n, polls, plays: api.plays });
  }

  advance(id) {
    switch (id) {
      case 'percentages-intro': return this._startRound();
      case 'percentages-poll': return this._dial();
      case 'percentages-dial': return this._bet();
      case 'percentages-bet': return this._reveal();
      case 'percentages-reveal':
        this.round += 1;
        if (this.round < this.rounds.length) return this._startRound();
        return this._scores();
      case 'percentages-scores': return this.api.enter('percentages-final-intro', PC.finalIntro, { q: this.final.q });
      case 'percentages-final-intro': return this._final();
      case 'percentages-final': return this._finalReveal();
      case 'percentages-final-reveal':
        return this.api.finish(this.api.players.map((p) => ({ id: p.id, score: p.score })));
      default:
    }
  }

  activeFor(phaseId, connected) {
    const r = this.rounds[this.round];
    if (phaseId === 'percentages-dial') return connected.filter((p) => p.id === r.knife);
    if (phaseId === 'percentages-bet') return connected.filter((p) => p.id !== r.knife);
    return connected;
  }

  onLeave(p) {
    // knife-holder left mid-dial: lock where they were
    const r = this.rounds[this.round];
    if (r && this.api.phase.id === 'percentages-dial' && p.id === r.knife) this.api.progress();
  }

  handle(p, msg, { fresh }) {
    if (!fresh) return;
    const ph = this.api.phase.id;
    const r = this.rounds[this.round];
    const now = this.api.now();
    switch (msg.type) {
      case 'pc-dial':
      case 'pc-lock': {
        if (ph !== 'percentages-dial' || p.id !== r.knife || r.locked) return;
        const v = clampPct(msg.v);
        if (v === null) return;
        r.cut = v;
        r.touched = true;
        if (msg.type === 'pc-lock') r.locked = true;
        // throttle live updates a touch (phones already throttle)
        if (msg.type === 'pc-dial' && now - (r.lastSend || 0) < 60) return;
        r.lastSend = now;
        this.api.progress();
        return;
      }
      case 'pc-heckle': {
        if (ph !== 'percentages-dial' || p.id === r.knife || r.locked) return;
        if (msg.dir !== 'up' && msg.dir !== 'down') return;
        if (now - (r.heckleAt[p.id] || 0) < 280) return;
        r.heckleAt[p.id] = now;
        r.heckleN += 1;
        r.heckles.push({ n: r.heckleN, id: p.id, dir: msg.dir });
        if (r.heckles.length > 12) r.heckles.shift();
        r.heckleCount[msg.dir] += 1;
        this.api.progress();
        return;
      }
      case 'pc-bet': {
        if (ph !== 'percentages-bet' || p.id === r.knife || !BETS.includes(msg.bet)) return;
        r.bets[p.id] = msg.bet;
        this.api.progress();
        return;
      }
      case 'pc-poll': {
        if (ph !== 'percentages-poll' || typeof msg.yes !== 'boolean') return;
        r.answers[p.id] = msg.yes;
        this.api.progress();
        return;
      }
      case 'pc-top3': {
        if (ph !== 'percentages-final' || !Array.isArray(msg.ids)) return;
        const valid = new Set(this.finalOpts.map((o) => o.id));
        const ids = [...new Set(msg.ids)].filter((x) => valid.has(x)).slice(0, 3);
        if (ids.length !== 3) return;
        this.picks[p.id] = ids;
        this.api.ack(p);
        this.api.progress();
        return;
      }
      default:
    }
  }

  // ---------- rounds ----------

  _info(r) {
    return r.kind === 'poll'
      ? { kind: 'poll', q: r.poll.q, yes: r.poll.yes, no: r.poll.no }
      : { kind: 'nation', q: r.q.q };
  }

  _base(r) {
    return { index: this.round, count: this.rounds.length, knife: r.knife, ...this._info(r) };
  }

  _startRound() {
    const r = this.rounds[this.round];
    Object.assign(r, { cut: 50, touched: false, locked: false, heckles: [], heckleN: 0, heckleAt: {}, heckleCount: { up: 0, down: 0 }, bets: {}, answers: {} });
    if (r.kind === 'poll') {
      this.api.enter('percentages-poll', PC.poll, this._base(r), {
        progress: () => ({ done: this._doneMap((p) => r.answers[p.id] !== undefined), counts: { answered: Object.keys(r.answers).length } }),
      });
    } else this._dial();
  }

  _dial() {
    const r = this.rounds[this.round];
    if (r.kind === 'poll') {
      const ids = this.api.players.map((p) => p.id).filter((id) => r.answers[id] !== undefined);
      const yes = ids.filter((id) => r.answers[id]).length;
      r.pollN = ids.length;
      r.pollYes = yes;
      r.real = ids.length ? Math.round((100 * yes) / ids.length) : 0;
    } else r.real = r.q.pct;
    this.api.enter('percentages-dial', PC.dial, { ...this._base(r), polled: r.kind === 'poll' ? r.pollN : null }, {
      progress: () => ({
        done: { [r.knife]: r.locked },
        counts: {},
        dial: r.cut,
        touched: r.touched,
        locked: r.locked,
        heckles: r.heckles,
        hc: r.heckleCount,
      }),
    });
  }

  _bet() {
    const r = this.rounds[this.round];
    r.locked = true;
    this.api.enter('percentages-bet', PC.bet, { ...this._base(r), cut: r.cut, hc: r.heckleCount }, {
      progress: () => ({ done: this._doneMap((p) => p.id === r.knife || !!r.bets[p.id]), counts: {}, bets: r.bets }),
    });
  }

  _reveal() {
    const r = this.rounds[this.round];
    const diff = Math.abs(r.cut - r.real);
    const deltas = {};
    for (const p of this.api.players) deltas[p.id] = 0;
    deltas[r.knife] = knifePoints(diff);
    const bets = {};
    for (const [id, bet] of Object.entries(r.bets)) {
      bets[id] = { bet, pts: betPoints(bet, r.cut, r.real) };
      deltas[id] = (deltas[id] || 0) + bets[id].pts;
    }
    this.api.addScores(deltas);
    const d = (ms) => this.api.dur(ms);
    const at = { sweep: d(REVEAL.sweep), land: d(REVEAL.land), bets: d(REVEAL.bets), aside: d(REVEAL.aside) };
    const scores = this.api.players.map((p) => ({ id: p.id, score: p.score })).sort((a, b) => b.score - a.score);
    this.api.enter('percentages-reveal', PC.reveal, {
      ...this._base(r), cut: r.cut, real: r.real, diff, outcome: outcomeOf(diff), bets, deltas, at,
      aside: r.kind === 'nation' ? r.q.aside || null : null,
      poll: r.kind === 'poll' ? { n: r.pollN, yes: r.pollYes } : null,
      scores,
    });
  }

  _scores() {
    const rows = this.api.players.map((p) => ({ id: p.id, score: p.score, prev: p.score, delta: 0 }))
      .sort((a, b) => b.score - a.score);
    let rank = 0;
    rows.forEach((row, i) => { if (i === 0 || row.score !== rows[i - 1].score) rank = i + 1; row.rank = rank; row.prevRank = i; });
    this.api.enter('percentages-scores', PC.scores, { rows });
  }

  _final() {
    const rng = this.api.sub('pc-final-order');
    this.finalOpts = this.final.options.map((o, i) => ({ id: `o${i}`, t: o.t, pct: o.pct }));
    const shown = this.finalOpts.map((o) => ({ id: o.id, t: o.t })).sort(() => rng() - 0.5);
    this.picks = {};
    this.api.enter('percentages-final', PC.final, { q: this.final.q, options: shown }, {
      progress: () => ({ done: this._doneMap((p) => !!this.picks[p.id]), counts: {} }),
    });
  }

  _finalReveal() {
    const sorted = this.finalOpts.slice().sort((a, b) => a.pct - b.pct); // lowest first
    const top = sorted.slice(-3).map((o) => o.id).reverse(); // [1st, 2nd, 3rd]
    const topSet = new Set(top);
    const deltas = {};
    for (const p of this.api.players) {
      const ids = this.picks[p.id] || [];
      let pts = 0;
      for (const id of ids) if (topSet.has(id)) pts += 1000;
      if (ids.includes(top[0])) pts += 500;
      deltas[p.id] = pts;
    }
    this.api.addScores(deltas);
    const per = this.api.dur(520);
    const start = this.api.dur(900);
    const bars = sorted.map((o, i) => ({ id: o.id, t: o.t, pct: o.pct, at: start + i * per, place: topSet.has(o.id) ? top.indexOf(o.id) + 1 : 0 }));
    this.api.enter('percentages-final-reveal', PC.finalReveal, {
      q: this.final.q, bars, top, picks: this.picks, deltas,
      pointsAt: start + sorted.length * per + this.api.dur(600),
      scores: this.api.players.map((p) => ({ id: p.id, score: p.score })).sort((a, b) => b.score - a.score),
    });
  }

  _doneMap(fn) {
    const done = {};
    for (const p of this.api.players) done[p.id] = !!fn(p);
    return done;
  }
}

function clampPct(v) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
}
