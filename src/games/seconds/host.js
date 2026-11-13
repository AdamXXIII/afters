// Who Had Seconds? host logic. Runs on the host phone only; talks to phones only through `api`.
// Rules, timings and scoring: ./DESIGN.md.
import { TASKS, CATEGORIES, FAKE_HINT } from './content/tasks.js';

export const SC = {
  intro: 12000, turn: 5000, task: 16000, count: 9000, vote: 20000,
  hung: 5000, verdict: 13000, scores: 7000, finalIntro: 7000,
};
// countdown beats inside seconds-count (ms, before api.dur): 3, 2, 1, NOW, then "freeze"
export const BEATS = { three: 300, two: 1300, one: 2300, now: 3300, freeze: 7600 };
// verdict timeline (ms, before api.dur): drumroll, stamp, faker unmasked, tasks, points
export const VERDICT = { stamp: 1900, unmask: 3600, points: 5200, tasks: 6800 };
export const CATCH = [1000, 750, 500];
export const SURVIVE = 250; // faker, per task with no majority
export const ESCAPE = 1000; // faker, got away (framed someone, or never caught)
export const SHARP = 250; // pointed at the faker, but the table didn't follow
export const FINAL = 2000;
const TASKS_PER_TURN = 3;

export class SecondsHost {
  constructor(api) {
    this.api = api;
    this.turns = [];
    this.t = 0; // turn index
    this.k = 0; // task index inside the turn
    this.votes = {};
    this.ready = {};
    this.done = false;
  }

  start() {
    const api = this.api;
    const rng = api.sub('sc-plan');
    const ids = api.players.map((p) => p.id).sort(() => rng() - 0.5);
    const n = ids.length;
    const twoFakers = n >= 5;
    const turnCount = twoFakers ? Math.min(n - 1, 5) : Math.min(n, 5);
    const doubleAt = twoFakers ? Math.floor(turnCount / 2) : -1;
    const cats = api.take(CATEGORIES, 'sc-cat', turnCount + 1, rng);
    const order = ids.slice();
    this.turns = [];
    for (let i = 0; i < turnCount; i++) {
      const fakers = order.splice(0, i === doubleAt ? 2 : 1);
      this.turns.push({ fakers, cat: cats[i], tasks: this._pick(cats[i], TASKS_PER_TURN, rng), two: fakers.length === 2, log: [] });
    }
    // Last call: one task, double points. Half the time EVERY phone says "you had seconds".
    const all = rng() < 0.5;
    const finalCat = cats[turnCount] || cats[0];
    this.final = {
      fakers: all ? ids.slice() : [ids[Math.floor(rng() * n)]], all, cat: finalCat,
      tasks: this._pick(finalCat, 1, rng), final: true, log: [],
    };
    this.t = 0;
    this.k = 0;
    api.enter('seconds-intro', SC.intro, { turns: turnCount, two: twoFakers, plays: api.plays });
  }

  /** n tasks from one category, all different types where possible. */
  _pick(cat, n, rng) {
    const pool = this.api.deck(TASKS).filter((x) => x.cat === cat);
    const src = pool.length >= n ? pool : this.api.deck(TASKS);
    // half a category at a time, so a category that comes round again brings new tasks
    const shuffled = this.api.take(src, `sc-task-${cat}`, Math.max(n, Math.min(6, src.length)), rng);
    const out = [];
    const types = new Set();
    for (const x of shuffled) { if (out.length < n && !types.has(x.type)) { out.push(x); types.add(x.type); } }
    for (const x of shuffled) { if (out.length < n && !out.includes(x)) out.push(x); }
    return out;
  }

  get turn() { return this.t < this.turns.length ? this.turns[this.t] : this.final; }

  canSkip(phaseId) {
    return phaseId === 'seconds-turn' || phaseId === 'seconds-reveal' || phaseId === 'seconds-scores';
  }

  advance(id) {
    switch (id) {
      case 'seconds-intro': return this._turnCard();
      case 'seconds-turn': return this._task();
      case 'seconds-task': return this._count();
      case 'seconds-count': return this._vote();
      case 'seconds-vote': return this._resolve();
      case 'seconds-reveal': return this._next();
      case 'seconds-scores': return this.api.enter('seconds-final-intro', SC.finalIntro, {});
      case 'seconds-final-intro': this.k = 0; return this._task();
      default:
    }
  }

  handle(p, msg, { fresh }) {
    if (!fresh) return;
    const ph = this.api.phase.id;
    if (msg.type === 'sc-ready' && ph === 'seconds-task') {
      this.ready[p.id] = true;
      this.api.progress();
      return;
    }
    if (msg.type === 'sc-vote' && ph === 'seconds-vote') {
      const target = msg.target;
      if (target === p.id) return;
      if (!(this._options().includes(target) || this.api.player(target))) return;
      this.votes[p.id] = target;
      this.api.progress();
    }
  }

  onLeave() {
    const id = this.api.phase?.id;
    if (id === 'seconds-task' || id === 'seconds-vote') this.api.progress();
  }

  // ---------- phases ----------

  _turnCard() {
    const turn = this.turn;
    this.k = 0;
    this.api.enter('seconds-turn', SC.turn, { turn: this.t, turns: this.turns.length, two: !!turn.two, final: !!turn.final });
  }

  _base() {
    const turn = this.turn;
    const task = turn.tasks[this.k];
    return {
      turn: this.t, turns: this.turns.length, task: this.k, tasks: turn.tasks.length,
      type: task.type, two: !!turn.two, final: !!turn.final,
    };
  }

  _task() {
    const turn = this.turn;
    if (!turn.final && !turn.fakers.some((id) => this.api.player(id)?.connected)) return this._skipTurn();
    const task = turn.tasks[this.k];
    this.ready = {};
    const fakers = new Set(turn.fakers);
    this.api.enter('seconds-task', SC.task, this._base(), {
      priv: (pl) => (fakers.has(pl.id)
        ? { faker: true, hint: FAKE_HINT[task.type].act, peek: this.k >= 1 ? turn.cat : null, two: !!turn.two }
        : { faker: false, text: task.t, cat: turn.cat }),
      progress: () => ({ done: this._doneMap((pl) => !!this.ready[pl.id]), counts: {} }),
    });
  }

  _count() {
    const beats = Object.fromEntries(Object.entries(BEATS).map(([k, v]) => [k, this.api.dur(v)]));
    this.api.enter('seconds-count', SC.count, { ...this._base(), beats });
  }

  /** Non-person vote options for the current task. */
  _options() {
    const turn = this.turn;
    if (turn.final) return ['all'];
    if (this.k < turn.tasks.length - 1) return ['none'];
    return [];
  }

  _vote() {
    this.votes = {};
    const n = this.api.connected.length;
    const last = !this.turn.final && this.k === this.turn.tasks.length - 1;
    this.api.enter('seconds-vote', SC.vote, {
      ...this._base(), options: this._options(), need: Math.floor(n / 2) + 1, last,
    }, {
      progress: () => ({ done: this._doneMap((pl) => !!this.votes[pl.id]), counts: {}, votes: this.votes }),
    });
  }

  _tally() {
    const tally = {};
    for (const target of Object.values(this.votes)) tally[target] = (tally[target] || 0) + 1;
    return tally;
  }

  /** The person with the most votes, if they're alone at the top. */
  _top(tally) {
    const people = Object.entries(tally).filter(([id]) => this.api.player(id));
    people.sort((a, b) => b[1] - a[1]);
    if (!people.length) return null;
    if (people[1] && people[1][1] === people[0][1]) return null;
    return { id: people[0][0], n: people[0][1] };
  }

  _resolve() {
    const turn = this.turn;
    const tally = this._tally();
    const top = this._top(tally);
    const fakers = new Set(turn.fakers);
    const n = this.api.connected.length;
    const last = this.k === turn.tasks.length - 1;
    const votes = { ...this.votes };
    const deltas = {};
    const add = (id, pts) => { if (pts) deltas[id] = (deltas[id] || 0) + pts; };
    let kind;
    let accused = null;

    if (turn.final) {
      for (const [id, target] of Object.entries(votes)) {
        if (turn.all ? target === 'all' : fakers.has(target) && !fakers.has(id)) add(id, FINAL);
      }
      accused = top && top.n >= 2 && (!tally.all || top.n > tally.all) ? top.id : null;
      if (turn.all) kind = 'all';
      else if (accused && fakers.has(accused)) kind = 'caught';
      else { kind = accused ? 'framed' : 'escaped'; for (const f of turn.fakers) add(f, FINAL); }
    } else {
      if (top && (top.n > n / 2 || (last && top.n >= 2))) accused = top.id;
      if (!accused && !last) {
        for (const f of turn.fakers) turn.log.push({ id: f, pts: SURVIVE });
        return this._reveal({ kind: 'hung', tally, votes, deltas: {} });
      }
      const caught = !!accused && fakers.has(accused);
      kind = caught ? 'caught' : accused ? 'framed' : 'escaped';
      for (const [id, target] of Object.entries(votes)) {
        if (fakers.has(id) || !fakers.has(target)) continue;
        add(id, caught ? CATCH[this.k] : SHARP);
      }
      for (const entry of turn.log) add(entry.id, entry.pts);
      for (const f of turn.fakers) {
        if (caught && f === accused) continue;
        if (!caught || turn.two) add(f, ESCAPE);
      }
    }
    this.api.addScores(deltas);
    this._reveal({
      kind, tally, votes, accused, deltas, fakers: turn.fakers, all: !!turn.all,
      cat: turn.cat, done: turn.tasks.slice(0, this.k + 1).map((x) => ({ type: x.type, t: x.t })),
    });
  }

  _reveal(data) {
    this.done = data.kind !== 'hung';
    const at = Object.fromEntries(Object.entries(VERDICT).map(([k, v]) => [k, this.api.dur(v)]));
    this.api.enter('seconds-reveal', this.done ? SC.verdict : SC.hung, { ...this._base(), ...data, at });
  }

  _next() {
    if (!this.done) { this.k += 1; return this._task(); }
    if (this.turn.final) return this._finish();
    this.t += 1;
    this.k = 0;
    if (this.t < this.turns.length) return this._turnCard();
    return this._scores();
  }

  _skipTurn() {
    this.t += 1;
    this.k = 0;
    if (this.t < this.turns.length) return this._turnCard();
    return this._scores();
  }

  _scores() {
    const rows = this.api.players.map((p) => ({ id: p.id, score: p.score })).sort((a, b) => b.score - a.score);
    let rank = 0;
    rows.forEach((row, i) => { if (i === 0 || row.score !== rows[i - 1].score) rank = i + 1; row.rank = rank; });
    this.api.enter('seconds-scores', SC.scores, { rows });
  }

  _finish() {
    this.api.finish(this.api.players.map((p) => ({ id: p.id, score: p.score })));
  }

  _doneMap(fn) {
    const done = {};
    for (const p of this.api.players) done[p.id] = !!fn(p);
    return done;
  }
}
