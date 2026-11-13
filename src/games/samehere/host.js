// Same Here host logic. Runs on the host phone only; talks to phones only through `api`.
// A plain question, everyone writes one answer in secret. Answers that mean the same thing are
// grouped (obvious ones on their own, close calls by a live table vote). Everyone in the single
// biggest group scores a point. If exactly one person is alone with their answer, they get the
// Wobbly Chair (it stays until someone else is the lone one). First to the target without the
// chair wins. See ./DESIGN.md. AI-generated (Claude, Same Here builder, 2026-11-13).
import { QUESTIONS } from './content/questions.js';
import { autoGroup, suggestDisputes, merge } from './group.js';

export const SH = {
  intro: 10000, write: 30000, sort: 25000, crown: 9000,
  target: 5, maxRounds: 14, max: 32, maxDisputes: 5,
};
// reveal beats (ms, before api.dur)
const BEAT = { lead: 900, group: 1100, herd: 2200, verdict: 1600, chair: 2600, standings: 2600 };

export class SameHereHost {
  constructor(api) {
    this.api = api;
    this.round = 0;
    this.chair = null; // player id on the Wobbly Chair
    this.target = SH.target;
    this.cur = null;
  }

  start() {
    this.round = 0;
    this.chair = null;
    this.target = SH.target;
    this.last = null;
    this.api.enter('samehere-intro', SH.intro, { target: this.target, plays: this.api.plays });
  }

  advance(id) {
    switch (id) {
      case 'samehere-intro': return this._write();
      case 'samehere-write': return this._afterWrite();
      case 'samehere-sort': return this._reveal();
      case 'samehere-reveal': return this._next();
      case 'samehere-crown': return this._finish();
      default:
    }
  }

  handle(p, msg, { fresh }) {
    if (!fresh) return;
    const ph = this.api.phase.id;
    const r = this.cur;
    if (!r) return;
    switch (msg.type) {
      case 'sh-answer': {
        if (ph !== 'samehere-write') return;
        const t = this.api.clean(msg.text, SH.max);
        if (!t || r.fixed?.has(p.id)) return; // r.fixed: answers pinned by the sort demo
        r.answers[p.id] = t;
        this.api.ack(p);
        this.api.progress();
        return;
      }
      case 'sh-vote': {
        if (ph !== 'samehere-sort') return;
        const d = r.disputes.find((x) => x.id === msg.id);
        if (!d || !this._mayVote(d, p.id)) return;
        if (msg.same === true || msg.same === false) d.votes[p.id] = msg.same;
        else delete d.votes[p.id];
        this.api.progress();
        return;
      }
      case 'sh-propose': {
        // "These two are the same": any player can put two answers to the table
        if (ph !== 'samehere-sort' || r.disputes.length >= SH.maxDisputes) return;
        const a = r.groups.find((g) => g.gid === msg.a); const b = r.groups.find((g) => g.gid === msg.b);
        if (!a || !b || a === b) return;
        if (r.disputes.some((d) => (d.a === a.gid && d.b === b.gid) || (d.a === b.gid && d.b === a.gid))) return;
        const d = { id: `d${r.disputes.length}`, a: a.gid, b: b.gid, by: p.id, votes: {} };
        if (this._mayVote(d, p.id)) d.votes[p.id] = true;
        r.disputes.push(d);
        // a fresh argument: everyone gets a say again
        for (const k of Object.keys(r.done)) if (k !== p.id) r.done[k] = false;
        this.api.progress();
        return;
      }
      case 'sh-done': {
        if (ph !== 'samehere-sort') return;
        r.done[p.id] = !!msg.done;
        this.api.progress();
        return;
      }
      default:
    }
  }

  // ---------- phases ----------

  _standings() {
    return this.api.players.map((p) => ({ id: p.id, score: p.score })).sort((a, b) => b.score - a.score);
  }

  _write() {
    this.round += 1;
    const [q] = this.api.take(QUESTIONS, 'sh-q', 1, this.api.sub('q'));
    this.cur = { q, answers: {}, groups: [], disputes: [], done: {} };
    this.api.enter('samehere-write', SH.write, {
      round: this.round, q: q.q, max: SH.max, target: this.target, chair: this.chair, standings: this._standings(),
    }, {
      progress: () => ({ done: this._doneMap((p) => !!this.cur.answers[p.id]), counts: {} }),
    });
  }

  _afterWrite() {
    const r = this.cur;
    const list = this.api.players.filter((p) => r.answers[p.id]).map((p) => ({ pid: p.id, text: r.answers[p.id] }));
    r.groups = autoGroup(list);
    r.disputes = suggestDisputes(r.groups, 3).map(([a, b], i) => ({ id: `d${i}`, a, b, by: null, votes: {} }));
    // sort only when Cyril has spotted a close call: no heads-down phone time otherwise
    if (r.disputes.length) return this._sort();
    return this._reveal();
  }

  _sort() {
    const r = this.cur;
    r.done = {};
    const groups = r.groups.map((g) => ({ gid: g.gid, text: g.text, n: g.pids.length }));
    this.api.enter('samehere-sort', SH.sort, { round: this.round, q: r.q.q, groups, suggested: r.disputes.length, maxDisputes: SH.maxDisputes }, {
      priv: (p) => ({ mine: r.groups.find((g) => g.pids.includes(p.id))?.gid || null }),
      progress: () => ({
        done: this._doneMap((p) => !!r.done[p.id]),
        counts: {},
        disputes: r.disputes.map((d) => ({
          id: d.id, a: d.a, b: d.b, by: d.by, judges: this._judges(d),
          same: Object.keys(d.votes).filter((k) => d.votes[k]),
          diff: Object.keys(d.votes).filter((k) => !d.votes[k]),
        })),
      }),
    });
  }

  /** Who decides a close call: everyone who didn't write either answer (everyone, if that's nobody). */
  _judges(d) {
    const r = this.cur;
    const authors = new Set([d.a, d.b].flatMap((gid) => r.groups.find((g) => g.gid === gid)?.pids || []));
    const others = this.api.players.filter((p) => !authors.has(p.id)).map((p) => p.id);
    return others.length ? others : this.api.players.map((p) => p.id);
  }

  _mayVote(d, pid) { return this._judges(d).includes(pid); }

  _reveal() {
    const api = this.api;
    const r = this.cur;
    // settle the arguments: more "same" than "different" merges them
    const merged = [];
    const ruled = r.disputes.map((d) => {
      const judges = new Set(this._judges(d));
      const vs = Object.entries(d.votes).filter(([pid]) => judges.has(pid)).map(([, v]) => v);
      const same = vs.filter(Boolean).length;
      const diff = vs.length - same;
      const ok = same > diff;
      if (ok) merged.push([d.a, d.b]);
      const A = r.groups.find((g) => g.gid === d.a); const B = r.groups.find((g) => g.gid === d.b);
      return { a: A?.text, b: B?.text, same, diff, merged: ok };
    });
    const groups = merge(r.groups, merged);
    const sizes = groups.map((g) => g.pids.length);
    const top = sizes.length ? Math.max(...sizes) : 0;
    const tops = groups.filter((g) => g.pids.length === top);
    // the herd: the single biggest group, of two or more
    const herd = tops.length === 1 && top >= 2 ? tops[0] : null;
    const outcome = !groups.length ? 'empty' : herd ? 'herd' : top < 2 ? 'scattered' : 'split';
    const lones = groups.filter((g) => g.pids.length === 1);
    // the Wobbly Chair: exactly one person on their own
    const lone = lones.length === 1 && groups.length > 1 ? lones[0].pids[0] : null;
    const chairFrom = this.chair;
    if (lone) this.chair = lone;

    const deltas = Object.fromEntries(api.players.map((p) => [p.id, 0]));
    if (herd) herd.pids.forEach((id) => { if (id in deltas) deltas[id] = 1; });
    api.addScores(deltas);

    // timeline: smallest groups first, the herd last
    const order = groups.slice().sort((a, b) => a.pids.length - b.pids.length || (a.gid < b.gid ? -1 : 1));
    if (herd) { order.splice(order.indexOf(herd), 1); order.push(herd); }
    const steps = [];
    let t = BEAT.lead;
    order.forEach((g) => {
      steps.push({ kind: 'group', gid: g.gid, at: t });
      t += g === herd ? BEAT.herd : BEAT.group + Math.min(3, g.pids.length - 1) * 150;
    });
    steps.push({ kind: 'verdict', at: t }); t += BEAT.verdict;
    if (lone) { steps.push({ kind: 'chair', at: t }); t += BEAT.chair; }
    steps.push({ kind: 'standings', at: t }); t += BEAT.standings;

    const winner = this._winner();
    this.last = { winner };
    api.enter('samehere-reveal', Math.min(t, 32000), {
      round: this.round, q: r.q.q, target: this.target,
      groups: order.map((g) => ({ gid: g.gid, text: g.text, pids: g.pids, also: g.also || [] })),
      herd: herd?.gid || null, outcome, lone, chairFrom, chair: this.chair, ruled,
      missing: api.players.filter((p) => !r.answers[p.id]).map((p) => p.id),
      steps: steps.map((s) => ({ ...s, at: api.dur(s.at) })),
      deltas, standings: this._standings(), winner: winner?.id || null, last: !!winner || this.round >= SH.maxRounds,
    });
  }

  /** First to the target without the chair. A tie at the top plays on (sudden death). */
  _winner() {
    const ps = this.api.players.filter((p) => p.id !== this.chair);
    const at = ps.filter((p) => p.score >= this.target).sort((a, b) => b.score - a.score);
    if (at.length && (at.length === 1 || at[0].score > at[1].score)) return at[0];
    return null;
  }

  _next() {
    if (!this.last?.winner && this.round < SH.maxRounds) return this._write();
    return this._crown();
  }

  /** The crowning: who thinks like the table, and who's still on the chair. Then the bill. */
  _crown() {
    const api = this.api;
    const off = api.players.filter((p) => p.id !== this.chair);
    const best = off.length ? Math.max(...off.map((p) => p.score)) : 0;
    const winners = off.filter((p) => p.score === best).map((p) => p.id);
    const chairP = api.player(this.chair);
    this.best = best;
    api.enter('samehere-crown', SH.crown, {
      winners, chair: this.chair, chairScore: chairP?.score ?? 0, target: this.target,
      standings: this._standings(), rounds: this.round,
      robbed: !!chairP && chairP.score >= best && chairP.score > 0,
    });
  }

  _finish() {
    // The chair can't win: pass explicit places. Everyone off the chair is ranked by score
    // (ties share a place); the chair holder comes last, with their real score on the bill.
    const off = this.api.players.filter((p) => p.id !== this.chair).sort((a, b) => b.score - a.score);
    const rows = [];
    off.forEach((p, i) => {
      const rank = i > 0 && p.score === off[i - 1].score ? rows[i - 1].rank : i + 1;
      rows.push({ id: p.id, score: p.score, rank });
    });
    const chairP = this.api.player(this.chair);
    if (chairP) rows.push({ id: chairP.id, score: chairP.score, rank: rows.length + 1 });
    this.api.finish(rows);
  }

  _doneMap(fn) {
    const done = {};
    for (const p of this.api.players) done[p.id] = !!fn(p);
    return done;
  }
}
