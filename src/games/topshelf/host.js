// Top Shelf host logic (runs on the host phone only; talks to phones only through `api`).
// A trivia climb up Cyril's drinks cabinet. Rules + timings: ./DESIGN.md.
// AI-generated (Claude, Top Shelf builder, 2026-11-13).
import { CATEGORIES, BEDROOM, questionDeck } from './content/index.js';

export const TOP = 15; // the top shelf; the floor is 0
export const FAST = 5000; // right inside this many ms = two shelves
export const TS = {
  intro: 8000, roundIntro: 5000, pick: 12000, q: 15000, qFinal: 20000,
  port: 12000, wager: 12000, reveal: 7600, summit: 9000,
};
// reveal timeline (ms, before api.dur)
export const REVEAL = { answer: 900, picks: 1500, move: 2700, note: 4300 };

/** The eight rounds. Normal rounds ask two questions; the specials ask one. */
export const PLAN = ['normal', 'normal', 'normal', 'steal', 'normal', 'port', 'normal', 'final'];

const fresh = () => ({ shelf: 0, streak: 0, shield: false, right: 0, picks: 0, fastest: Infinity });

export class TopShelfHost {
  constructor(api) {
    this.api = api;
    this.round = 0;
    this.qInRound = 0;
    this.st = {};
    this.lastCat = null;
  }

  start() {
    const api = this.api;
    this.st = {};
    for (const p of api.players) this.st[p.id] = fresh();
    this.round = 0;
    this.lastCat = null;
    this.cats = CATEGORIES.concat(api.adult ? [BEDROOM] : []);
    api.enter('topshelf-intro', TS.intro, { plays: api.plays, top: TOP, rounds: PLAN.length });
  }

  _s(id) {
    if (!this.st[id]) this.st[id] = fresh();
    return this.st[id];
  }

  get kind() { return PLAN[this.round]; }

  advance(id) {
    switch (id) {
      case 'topshelf-intro': return this._roundStart();
      case 'topshelf-round-intro': return this._pick();
      case 'topshelf-pick': {
        if (!this.cat) this.cat = this.options[Math.floor(this.api.sub(`ts-auto-${this.round}`)() * this.options.length)];
        this.lastCat = this.cat;
        this.qInRound = 0;
        if (this.kind === 'port') return this._duo() ? this._question() : this._port(); // two of you: no vote, see _victim
        if (this.kind === 'final') return this._wager();
        return this._question();
      }
      case 'topshelf-port': return this._question();
      case 'topshelf-wager': return this._question();
      case 'topshelf-q': return this._reveal();
      case 'topshelf-reveal':
        this.qInRound += 1;
        if (this.kind === 'normal' && this.qInRound < 2) return this._question();
        this.round += 1;
        if (this.round < PLAN.length) return this._roundStart();
        return this._summit();
      case 'topshelf-summit':
        return this.api.finish(this._standings().map((r) => ({ id: r.id, score: r.shelf })));
      default:
    }
  }

  activeFor(phaseId, connected) {
    if (phaseId === 'topshelf-pick') return connected.filter((p) => p.id === this.picker);
    return connected;
  }

  handle(p, msg, { fresh: isFresh }) {
    if (!isFresh) return;
    const ph = this.api.phase.id;
    switch (msg.type) {
      case 'ts-pick': {
        if (ph !== 'topshelf-pick' || p.id !== this.picker || this.cat) return;
        if (!this.options.includes(msg.cat)) return;
        this.cat = msg.cat;
        this.api.progress();
        return;
      }
      case 'ts-answer': {
        if (ph !== 'topshelf-q' || this.answers[p.id]) return;
        if (this.mode === 'port' && p.id !== this.victim) return;
        const i = Number(msg.i);
        if (!Number.isInteger(i) || i < 0 || i >= this.q.options.length) return;
        this.answers[p.id] = { i, t: Math.max(0, this.api.now() - this.api.phase.startsAt) };
        this.api.ack(p);
        this.api.progress();
        return;
      }
      case 'ts-bet': {
        if (ph !== 'topshelf-q' || this.mode !== 'port' || p.id === this.victim || this.bets[p.id] !== undefined) return;
        if (typeof msg.yes !== 'boolean') return;
        this.bets[p.id] = msg.yes;
        this.api.progress();
        return;
      }
      case 'ts-port': {
        if (ph !== 'topshelf-port' || p.id === msg.to || !this.api.player(msg.to)) return;
        this.portVotes[p.id] = msg.to;
        this.api.progress();
        return;
      }
      case 'ts-wager': {
        const n = Number(msg.n);
        if (ph !== 'topshelf-wager' || ![1, 2, 3].includes(n)) return;
        this.wagers[p.id] = n;
        this.api.progress();
        return;
      }
      default:
    }
  }

  // ---------- helpers ----------

  _shelves() {
    const out = {};
    for (const p of this.api.players) out[p.id] = this._s(p.id).shelf;
    return out;
  }

  _shields() {
    const out = {};
    for (const p of this.api.players) if (this._s(p.id).shield) out[p.id] = true;
    return out;
  }

  _duo() { return this.api.players.length === 2; }

  _base() {
    return { duo: this._duo(), round: this.round, of: PLAN.length, kind: this.kind, top: TOP, shelves: this._shelves(), shields: this._shields() };
  }

  _standings() {
    return this.api.players.map((p) => ({ id: p.id, ...this._s(p.id) }))
      .sort((a, b) => b.shelf - a.shelf || b.right - a.right || a.fastest - b.fastest);
  }

  /** Highest player (ties: most right answers, then the fastest right answer). */
  _leader() { return this._standings()[0]?.id || null; }

  _doneMap(fn) {
    const done = {};
    for (const p of this.api.players) done[p.id] = !!fn(p);
    return done;
  }

  // ---------- phases ----------

  _roundStart() {
    if (this.kind === 'normal') return this._pick();
    const leader = this.kind === 'steal' || (this.kind === 'port' && this._duo()) ? this._leader() : null;
    this.api.enter('topshelf-round-intro', TS.roundIntro, { ...this._base(), leader });
  }

  _pick() {
    const api = this.api;
    const rng = api.sub(`ts-pick-${this.round}`);
    // the lowest player picks; ties go to whoever has picked least, then a seeded draw
    const live = api.players.filter((p) => p.connected !== false);
    const pool = live.length ? live : api.players;
    const low = Math.min(...pool.map((p) => this._s(p.id).shelf));
    let tied = pool.filter((p) => this._s(p.id).shelf === low);
    const fewest = Math.min(...tied.map((p) => this._s(p.id).picks));
    tied = tied.filter((p) => this._s(p.id).picks === fewest);
    // the very first pick goes to whoever is holding the table (the host phone)
    const host = api.hostPlayer;
    if (this.round === 0 && host && tied.some((p) => p.id === host.id)) this.picker = host.id;
    else this.picker = tied[Math.floor(rng() * tied.length)].id;
    this._s(this.picker).picks += 1;
    const avail = this.cats.filter((c) => c.id !== this.lastCat).sort(() => rng() - 0.5);
    this.options = avail.slice(0, 3).map((c) => c.id);
    this.cat = null;
    api.enter('topshelf-pick', TS.pick, { ...this._base(), picker: this.picker, low, options: this.options }, {
      progress: () => ({ done: { [this.picker]: !!this.cat }, counts: {}, chosen: this.cat }),
    });
  }

  _port() {
    this.portVotes = {};
    this.api.enter('topshelf-port', TS.port, { ...this._base(), cat: this.cat }, {
      progress: () => ({ done: this._doneMap((p) => !!this.portVotes[p.id]), counts: {}, votes: this.portVotes }),
    });
  }

  _wager() {
    this.wagers = {};
    this.api.enter('topshelf-wager', TS.wager, { ...this._base(), cat: this.cat }, {
      progress: () => ({ done: this._doneMap((p) => !!this.wagers[p.id]), counts: {} }),
    });
  }

  _wagersFilled() {
    const out = {};
    for (const p of this.api.players) out[p.id] = this.wagers?.[p.id] || 1;
    return out;
  }

  _victim() {
    // Two of you: "Make them answer". No vote (it would always be a tie): the leader answers
    // alone and the one below calls it, so the round is a catch-up shot, not a coin flip.
    if (this._duo()) { this.portTally = {}; return this._leader(); }
    const tally = {};
    for (const to of Object.values(this.portVotes || {})) tally[to] = (tally[to] || 0) + 1;
    const ids = this.api.players.map((p) => p.id);
    const max = Math.max(0, ...Object.values(tally));
    // nobody voted: the decanter goes to the leader
    const pool = max ? ids.filter((id) => tally[id] === max) : [this._leader()];
    this.portTally = tally;
    const rng = this.api.sub(`ts-victim-${this.round}`);
    return pool[Math.floor(rng() * pool.length)];
  }

  _question() {
    const api = this.api;
    const rng = api.sub(`ts-q-${this.round}-${this.qInRound}`);
    const final = this.kind === 'final';
    const deck = questionDeck(this.cat, final);
    const raw = api.take(deck, `ts-${this.cat}${final ? '-hard' : ''}`, 1, rng)[0];
    const order = [0, 1, 2, 3].sort(() => rng() - 0.5);
    this.q = { id: raw.id, text: raw.q, options: order.map((k) => raw.a[k]), correct: order.indexOf(0), cat: this.cat };
    this.mode = this.kind === 'steal' ? 'steal' : this.kind === 'port' ? 'port' : final ? 'final' : 'normal';
    this.answers = {};
    this.bets = {};
    if (this.mode === 'port') this.victim = this._victim();
    if (this.mode === 'steal') this.leader = this._leader();
    const payload = {
      ...this._base(),
      cat: this.cat,
      q: this.q.text,
      options: this.q.options,
      n: this.mode === 'normal' ? this.qInRound + 1 : 1,
      perRound: this.mode === 'normal' ? 2 : 1,
      mode: this.mode,
      fast: this.mode === 'normal' ? api.dur(FAST) : 0,
      victim: this.mode === 'port' ? this.victim : null,
      tally: this.mode === 'port' ? this.portTally : null,
      leader: this.mode === 'steal' ? this.leader : null,
      wagers: this.mode === 'final' ? this._wagersFilled() : null,
    };
    api.enter('topshelf-q', final ? TS.qFinal : TS.q, payload, {
      progress: () => ({
        done: this._doneMap((p) => (this.mode === 'port' && p.id !== this.victim ? this.bets[p.id] !== undefined : !!this.answers[p.id])),
        counts: {},
      }),
    });
  }

  _climb(id, delta, { shieldable = true } = {}) {
    const s = this._s(id);
    const from = s.shelf;
    let used = false;
    if (delta < 0 && shieldable && s.shield) { s.shield = false; used = true; delta = 0; }
    s.shelf = Math.max(0, Math.min(TOP, s.shelf + delta));
    return { from, to: s.shelf, used };
  }

  /** Streaks: three right in a row earns a Steady Hand (one slip forgiven). */
  _mark(id, right) {
    const s = this._s(id);
    if (!right) { s.streak = 0; return false; }
    s.right += 1;
    s.streak += 1;
    if (s.streak >= 3 && !s.shield) { s.shield = true; s.streak = 0; return true; }
    return false;
  }

  _reveal() {
    const api = this.api;
    const q = this.q;
    const moves = {};
    const picks = {};
    const before = this._shelves();
    const ids = api.players.map((p) => p.id);
    let steal = null;
    let port = null;
    for (const id of ids) {
      const a = this.answers[id];
      if (a) picks[id] = { i: a.i, right: a.i === q.correct, ms: a.t, fast: false };
    }
    const stay = (id, tag = 'none') => ({ from: before[id], to: before[id], tag, earned: false });

    if (this.mode === 'normal') {
      for (const id of ids) {
        const a = picks[id];
        let tag = 'none';
        let delta = 0;
        if (a?.right) {
          a.fast = a.ms <= api.dur(FAST);
          delta = a.fast ? 2 : 1;
          tag = a.fast ? 'fast' : 'right';
          this._s(id).fastest = Math.min(this._s(id).fastest, a.ms);
        } else if (a) { delta = -1; tag = 'wrong'; }
        const earned = this._mark(id, !!a?.right);
        const r = this._climb(id, delta);
        moves[id] = { ...r, tag: r.used ? 'saved' : tag, earned };
      }
    } else if (this.mode === 'steal') {
      const leader = this.leader;
      const leaderRight = !!picks[leader]?.right;
      for (const id of ids) moves[id] = { ...stay(id, picks[id] ? (picks[id].right ? 'right' : 'wrong') : 'none'), earned: this._mark(id, !!picks[id]?.right) };
      const thieves = ids.filter((id) => id !== leader && picks[id]?.right && before[id] < before[leader])
        .sort((a, b) => picks[a].ms - picks[b].ms);
      if (leader && !leaderRight && thieves.length) {
        const thief = thieves[0];
        const a = this._s(thief); const b = this._s(leader);
        [a.shelf, b.shelf] = [b.shelf, a.shelf];
        moves[thief] = { ...moves[thief], to: a.shelf, tag: 'steal' };
        moves[leader] = { ...moves[leader], to: b.shelf, tag: 'robbed' };
        steal = { thief, leader, held: false };
      } else steal = { thief: null, leader, held: leaderRight };
    } else if (this.mode === 'port') {
      const v = this.victim;
      const right = !!picks[v]?.right;
      for (const id of ids) moves[id] = stay(id);
      const earned = this._mark(v, right);
      const r = this._climb(v, right ? 2 : -2);
      moves[v] = { ...r, tag: r.used ? 'saved' : right ? 'port-right' : 'port-wrong', earned };
      const bets = {};
      for (const id of ids) {
        if (id === v || this.bets[id] === undefined) continue;
        const won = this.bets[id] === right;
        bets[id] = { yes: this.bets[id], won };
        if (won) moves[id] = { ...this._climb(id, 1), tag: 'bet', earned: false };
      }
      port = { victim: v, right, answered: !!picks[v], bets, tally: this.portTally || {} };
    } else {
      const w = this._wagersFilled();
      for (const id of ids) {
        const a = picks[id];
        const r = this._climb(id, a?.right ? w[id] : -w[id], { shieldable: false });
        moves[id] = { ...r, tag: a ? (a.right ? 'right' : 'wrong') : 'none', wager: w[id], earned: false };
        if (a) this._mark(id, a.right);
      }
    }
    // mirror shelves into the game score so anything box-side stays consistent
    const deltas = {};
    for (const id of ids) deltas[id] = this._s(id).shelf - (api.player(id)?.score || 0);
    api.addScores(deltas);
    const d = (ms) => api.dur(ms);
    api.enter('topshelf-reveal', TS.reveal, {
      ...this._base(),
      before,
      cat: q.cat, q: q.text, options: q.options, correct: q.correct,
      mode: this.mode, picks, moves, steal, port,
      n: this.mode === 'normal' ? this.qInRound + 1 : 1,
      perRound: this.mode === 'normal' ? 2 : 1,
      at: { answer: d(REVEAL.answer), picks: d(REVEAL.picks), move: d(REVEAL.move), note: d(REVEAL.note) },
    });
  }

  _summit() {
    const rows = this._standings();
    let rank = 0;
    rows.forEach((r, i) => { if (i === 0 || r.shelf !== rows[i - 1].shelf) rank = i + 1; r.rank = rank; });
    this.api.enter('topshelf-summit', TS.summit, {
      ...this._base(),
      rows: rows.map((r) => ({ id: r.id, shelf: r.shelf, rank: r.rank, right: r.right })),
    });
  }
}
