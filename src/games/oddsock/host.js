// Odd Sock host logic. Runs on the host phone only; talks to phones only through `api`.
// Everyone gets the same secret word except the Odd Sock, who gets a close one and doesn't know.
// Clues go round the table out loud, one word each; then a live vote. Caught? The Odd Sock gets
// one guess at the table's word to steal the round. See ./DESIGN.md.
// AI-generated (Claude, Odd Sock builder, 2026-11-13).
import { PAIRS } from './content/pairs.js';
import { normalise, levenshtein } from '../../util/text.js';

export const OS = { intro: 10000, word: 14000, clue: 15000, vote: 45000, guess: 25000, round: 9000 };
export const PTS = { spotted: 500, escape: 1500, steal: 1500 };
// reveal beats (ms, before api.dur)
const BEAT = { first: 900, perVote: 420, stamp: 900, flip: 1500, tail: 3600 };

export const shuffle = (arr, rng) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

/** Same word give or take a typo, a plural or an article ("the pyramids" = "Pyramids"). */
export function sameWord(a, b) {
  const strip = (s) => normalise(s).replace(/[^a-z0-9]/g, '').replace(/(es|s)$/, '');
  const x = strip(a); const y = strip(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const long = Math.max(x.length, y.length);
  if (long <= 4) return false;
  return levenshtein(x, y) <= (long > 9 ? 2 : 1);
}

export const roundsFor = (n) => (n <= 5 ? 4 : 3);
export const lapsFor = (n) => (n <= 5 ? 2 : 1);

export class OddSockHost {
  constructor(api) {
    this.api = api;
    this.rounds = [];
    this.i = 0;
    this.rig = null; // demo only: { sock, catch } forces the odd sock / the verdict for screenshots
  }

  start() {
    const api = this.api;
    const rng = api.sub('os-plan');
    const ids = api.players.map((p) => p.id);
    const n = roundsFor(ids.length);
    const socks = shuffle(ids, rng);
    const pairs = api.take(PAIRS, 'os-pair', n, rng);
    this.rounds = pairs.map((pair, k) => {
      const flip = rng() < 0.5;
      return { pair, common: flip ? pair.b : pair.a, odd: flip ? pair.a : pair.b, sock: socks[k % socks.length] };
    });
    this.i = 0;
    api.enter('oddsock-intro', OS.intro, { rounds: n, laps: lapsFor(ids.length), plays: api.plays });
  }

  get r() { return this.rounds[this.i]; }

  canSkip(phaseId, since) { return phaseId === 'oddsock-clue' && since > 1500; }

  advance(id) {
    const r = this.r;
    switch (id) {
      case 'oddsock-intro': return this._word();
      case 'oddsock-word': r.turn = 0; return this._clue();
      case 'oddsock-clue':
        if (r.turn + 1 < r.order.length * r.laps) { r.turn += 1; return this._clue(); }
        return this._vote();
      case 'oddsock-vote': return this._reveal();
      case 'oddsock-reveal':
        if (r.caught) return this._guess();
        if (r.again) { this._relap(); return this._clue(); }
        return this._round();
      case 'oddsock-guess': return this._round();
      case 'oddsock-round':
        if (this.i + 1 < this.rounds.length) { this.i += 1; return this._word(); }
        return this.api.finish(this.api.players.map((p) => ({ id: p.id, score: p.score })));
      default:
    }
  }

  activeFor(phaseId, connected) {
    const r = this.r;
    if (!r) return connected;
    if (phaseId === 'oddsock-clue') return connected.filter((p) => p.id === this._speaker());
    if (phaseId === 'oddsock-guess') return connected.filter((p) => p.id === r.sock);
    if (phaseId === 'oddsock-vote') return connected.filter((p) => !r.out?.includes(p.id));
    return connected;
  }

  handle(p, msg, { fresh, isHost }) {
    if (!fresh) return;
    const ph = this.api.phase.id;
    const r = this.r;
    if (!r) return;
    switch (msg.type) {
      case 'os-ready':
        if (ph !== 'oddsock-word') return;
        r.ready[p.id] = true;
        this.api.progress();
        return;
      case 'os-said':
        // the speaker taps "Said it"; the host's phone can move a quiet table along too
        if (ph !== 'oddsock-clue' || (p.id !== this._speaker() && !isHost)) return;
        r.said[r.turn] = true;
        this.api.progress();
        return;
      case 'os-vote': {
        if (ph !== 'oddsock-vote' || r.out.includes(p.id)) return;
        const to = msg.to ?? null;
        if (to !== null && (to === p.id || !this.api.player(to) || r.out.includes(to))) return;
        if (to === null) delete r.votes[p.id];
        else r.votes[p.id] = to;
        this.api.progress();
        return;
      }
      case 'os-guess': {
        if (ph !== 'oddsock-guess' || p.id !== r.sock || r.guess != null) return;
        const t = this.api.clean(msg.text, 30);
        if (!t) return;
        r.guess = t;
        this.api.ack(p);
        this.api.progress();
        return;
      }
      default:
    }
  }

  // ---------- phases ----------

  _mult() { return this.i === this.rounds.length - 1 && this.rounds.length > 1 ? 2 : 1; }

  _base() {
    return { round: this.i + 1, rounds: this.rounds.length, mult: this._mult(), final: this._mult() > 1 };
  }

  _word() {
    const r = this.r;
    const api = this.api;
    if (this.rig?.sock && api.player(this.rig.sock)) r.sock = this.rig.sock;
    // speaking order: everyone round the table, starting one seat further on each round,
    // and never with the Odd Sock (they'd have nothing to copy)
    const ids = api.players.map((p) => p.id);
    let start = this.i % ids.length;
    if (ids[start] === r.sock) start = (start + 1) % ids.length;
    r.order = ids.slice(start).concat(ids.slice(0, start));
    r.laps = lapsFor(ids.length);
    Object.assign(r, { ready: {}, said: {}, votes: {}, turn: 0, guess: null, caught: false, accused: null, out: [], again: false });
    api.enter('oddsock-word', OS.word, { ...this._base(), order: r.order }, {
      priv: (p) => ({ word: p.id === r.sock ? r.odd : r.common }),
      progress: () => ({ done: this._doneMap((p) => !!r.ready[p.id]), counts: {} }),
    });
  }

  /** After a wrong accusation: one more lap with whoever is left (never starting on the sock). */
  _relap() {
    const r = this.r;
    let left = r.order.filter((id) => !r.out.includes(id));
    if (left[0] === r.sock) left = left.slice(1).concat(left[0]);
    Object.assign(r, { order: left, laps: 1, turn: 0, said: {}, again: false });
  }

  _speaker() { const r = this.r; return r.order?.[r.turn % r.order.length]; }

  _clue() {
    const r = this.r;
    const speaker = this._speaker();
    this.api.enter('oddsock-clue', OS.clue, {
      ...this._base(), order: r.order, turn: r.turn, lap: Math.floor(r.turn / r.order.length) + 1, laps: r.laps,
      speaker, total: r.order.length * r.laps,
    }, {
      priv: (p) => ({ word: p.id === r.sock ? r.odd : r.common }),
      progress: () => ({ done: { [speaker]: !!r.said[r.turn] }, counts: {} }),
    });
  }

  _vote() {
    const r = this.r;
    r.votes = {};
    this.api.enter('oddsock-vote', OS.vote, { ...this._base(), order: r.order, out: r.out.slice() }, {
      priv: (p) => ({ word: p.id === r.sock ? r.odd : r.common }),
      progress: () => ({ done: this._doneMap((p) => r.out.includes(p.id) || !!r.votes[p.id]), counts: {}, votes: { ...r.votes } }),
    });
  }

  _reveal() {
    const r = this.r;
    const api = this.api;
    if (this.rig?.catch) for (const p of api.players) if (p.id !== r.sock) r.votes[p.id] = r.sock;
    if (this.rig?.miss) {
      const inno = r.order.filter((id) => id !== r.sock);
      r.votes = {};
      for (const id of r.order) r.votes[id] = id === inno[0] ? inno[1] : inno[0];
      if (inno[2]) r.votes[inno[2]] = r.sock;
    }
    const counts = {};
    for (const to of Object.values(r.votes)) counts[to] = (counts[to] || 0) + 1;
    const top = Math.max(0, ...Object.values(counts));
    const leaders = Object.keys(counts).filter((id) => counts[id] === top);
    r.accused = top > 0 && leaders.length === 1 ? leaders[0] : null;
    r.tie = leaders.length > 1;
    r.caught = r.accused === r.sock;
    // wrong sock: they drop off the line and the rest go again, until only three are left
    r.again = !!r.accused && !r.caught && r.order.length - 1 >= 3;
    if (r.accused && !r.caught) r.out.push(r.accused);
    // the votes, one by one: biggest pile last so the drama builds
    const order = Object.entries(r.votes).sort((a, b) => (counts[a[1]] - counts[b[1]]) || (a[0] < b[0] ? -1 : 1));
    const at = order.map((_, k) => api.dur(BEAT.first + k * BEAT.perVote));
    const stampAt = api.dur(BEAT.first + Math.max(0, order.length - 1) * BEAT.perVote + BEAT.stamp);
    const flipAt = stampAt + api.dur(BEAT.flip);
    api.enter('oddsock-reveal', flipAt + api.dur(BEAT.tail), {
      ...this._base(), votes: order.map(([from, to]) => ({ from, to })), at, stampAt, flipAt,
      accused: r.accused, tie: r.tie, leaders: r.tie ? leaders : [], caught: r.caught,
      sock: r.again ? null : r.sock, oddWord: r.again ? null : r.odd, again: r.again, left: r.again ? r.order.length - 1 : null, out: r.out.slice(),
    });
  }

  _guess() {
    const r = this.r;
    this.api.enter('oddsock-guess', OS.guess, { ...this._base(), sock: r.sock, oddWord: r.odd }, {
      priv: (p) => (p.id === r.sock ? {} : { word: r.common }),
      progress: () => ({ done: { [r.sock]: r.guess != null }, counts: {} }),
    });
  }

  _round() {
    const r = this.r;
    const api = this.api;
    const m = this._mult();
    const deltas = Object.fromEntries(api.players.map((p) => [p.id, 0]));
    const right = r.guess != null && sameWord(r.guess, r.common);
    let outcome;
    if (r.caught && right) {
      outcome = 'stolen';
      deltas[r.sock] += PTS.steal * m;
    } else {
      outcome = r.caught ? 'caught' : 'escaped';
      for (const [from, to] of Object.entries(r.votes)) if (to === r.sock && from in deltas) deltas[from] += PTS.spotted * m;
      if (!r.caught && r.sock in deltas) deltas[r.sock] += PTS.escape * m;
    }
    api.addScores(deltas);
    api.enter('oddsock-round', OS.round, {
      ...this._base(), outcome, sock: r.sock, common: r.common, odd: r.odd, guess: r.guess, right,
      accused: r.accused, tie: r.tie, out: r.out.slice(), votes: { ...r.votes }, deltas, rows: this._rows(), last: this.i === this.rounds.length - 1,
    });
  }

  _rows() {
    const rows = this.api.players.map((p) => ({ id: p.id, score: p.score })).sort((a, b) => b.score - a.score);
    let rank = 0;
    rows.forEach((row, i) => { if (i === 0 || row.score !== rows[i - 1].score) rank = i + 1; row.rank = rank; });
    return rows;
  }

  _doneMap(fn) {
    const done = {};
    for (const p of this.api.players) done[p.id] = !!fn(p);
    return done;
  }
}
