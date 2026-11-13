// Something in the Soup: host logic (runs on the host phone only; talks to phones only through `api`).
// Rules, phases and timers: ./DESIGN.md. AI-generated (Claude, Soup team, 2026-11-13).
import { ITEMS, ROOMS, MORNINGS } from './content/tasks.js';

export const SP = {
  intro: 13000, roles: 15000,
  spoons: 30000, code: 35000, parcel: 22000, result: 7500,
  table: 80000, vote: 22000, night: 16000, morning: 9000,
  final: 22000, end: 16000,
};
// banish reveal timeline (ms, before api.dur)
export const BANISH = { first: 1600, per: 1100, role: 2200, tail: 4200 };
export const PARCEL = { window: 2400, pass: 60, drop: 120, fumble: 40 };
export const TASKS = ['spoons', 'code', 'parcel'];

export class SoupHost {
  constructor(api) {
    this.api = api;
    this.timers = [];
    this.demoTask = null; // demos may force the next task kind
  }

  // ---------- setup ----------
  start() {
    const api = this.api;
    const ids = api.players.map((p) => p.id);
    const rng = api.sub('soup-roles');
    const order = ids.slice().sort(() => rng() - 0.5);
    const nPois = ids.length >= 6 ? 2 : 1;
    this.roles = {};
    order.forEach((id, i) => { this.roles[id] = i < nPois ? 'poisoner' : 'faithful'; });
    if (this.demoRoles) Object.assign(this.roles, this.demoRoles(ids));
    this.seats = ids.slice();
    this.alive = new Set(ids);
    this.ghosts = []; // [{id, how:'banished'|'poisoned', day, role}]
    this.pot = 0;
    this.shields = new Set();
    this.seanceUsed = new Set();
    this.day = 0;
    this.finalMode = false;
    this.finalRound = 0;
    this.offset = (api.plays - 1) % TASKS.length;
    this.log = [];
    this.api.enter('soup-intro', SP.intro, { n: ids.length, poisoners: nPois, plays: api.plays }, { priv: (p) => this._priv(p) });
  }

  dispose() { this._clear(); }

  // ---------- helpers ----------
  _priv(p) {
    const role = this.roles?.[p.id];
    if (!role) return null;
    const partners = role === 'poisoner' ? Object.keys(this.roles).filter((id) => id !== p.id && this.roles[id] === 'poisoner') : [];
    return { role, partners, shield: this.shields.has(p.id) };
  }
  _aliveIds() { return this.seats.filter((id) => this.alive.has(id)); }
  _pois() { return this._aliveIds().filter((id) => this.roles[id] === 'poisoner'); }
  _faith() { return this._aliveIds().filter((id) => this.roles[id] === 'faithful'); }
  _base() {
    return {
      day: this.day, pot: this.pot, alive: this._aliveIds(), seats: this.seats,
      ghosts: this.ghosts.map((g) => ({ id: g.id, how: g.how, day: g.day, role: g.how === 'banished' ? g.role : null })),
      poisoners: Object.values(this.roles).filter((r) => r === 'poisoner').length,
    };
  }
  _doneMap(fn) { const d = {}; for (const p of this.api.players) d[p.id] = !!fn(p.id); return d; }
  _clear() { for (const t of this.timers) clearTimeout(t); this.timers = []; }
  _later(ms, fn) { const t = setTimeout(fn, ms); this.timers.push(t); }

  activeFor(phaseId, connected) {
    if (phaseId === 'soup-roles' || phaseId === 'soup-intro') return connected;
    if (phaseId === 'soup-task' && this.task?.kind === 'parcel') return []; // runs the full clock
    return connected.filter((p) => this.alive.has(p.id));
  }

  // ---------- flow ----------
  advance(id) {
    this._clear();
    switch (id) {
      case 'soup-intro': return this._roles();
      case 'soup-roles': return this._task();
      case 'soup-task': return this._result();
      case 'soup-result': return this._table();
      case 'soup-table': return this._vote();
      case 'soup-vote': return this._banish();
      case 'soup-banish': return this._afterBanish();
      case 'soup-night': return this._morning();
      case 'soup-morning': return this._afterMorning();
      case 'soup-final': return this._finalReveal();
      case 'soup-final-reveal': return this.finalUnanimous ? this._end() : this._vote();
      case 'soup-end': return this.api.finish(this.api.players.map((p) => ({ id: p.id, score: p.score })));
      default:
    }
  }

  _roles() {
    this.seen = {};
    this.api.enter('soup-roles', SP.roles, { ...this._base() }, {
      priv: (p) => this._priv(p),
      progress: () => ({ done: this._doneMap((id) => this.seen[id]), counts: {} }),
    });
  }

  // ---------- day: task ----------
  _task() {
    this.day += 1;
    const kind = this.demoTask || TASKS[(this.day - 1 + this.offset) % TASKS.length];
    const alive = this._aliveIds();
    const rng = this.api.sub(`task-${this.day}`);
    const t = { kind, inputs: {} };
    this.task = t;
    let payload = { ...this._base(), kind };
    if (kind === 'spoons') {
      const item = this.api.take(ITEMS, 'soup-item', 1, rng)[0];
      t.target = alive.length * 2 + Math.floor(rng() * (alive.length + 1)); // 2n..3n; each player puts 0-5
      t.item = item;
      payload = { ...payload, target: t.target, item, max: 5 };
    } else if (kind === 'code') {
      const room = this.api.take(ROOMS, 'soup-room', 1, rng)[0];
      t.code = alive.map(() => Math.floor(rng() * 10));
      t.room = room;
      payload = { ...payload, room, length: alive.length };
    } else {
      t.holder = alive[Math.floor(rng() * alive.length)];
      Object.assign(t, { passes: 0, drops: [], fumbles: [], net: 0, passedBy: {}, n: 0, rng });
      payload = { ...payload, window: this.api.dur(PARCEL.window), values: PARCEL };
    }
    this.api.enter('soup-task', SP[kind], payload, {
      priv: (p) => {
        const base = this._priv(p);
        if (kind === 'code' && this.alive.has(p.id)) {
          const slot = alive.indexOf(p.id);
          return { ...base, slot, digit: t.code[slot] };
        }
        return base;
      },
      progress: () => {
        if (kind === 'parcel') return { done: {}, counts: {}, holder: t.holder, until: t.until, passes: t.passes, drops: t.drops.slice(-6), fumbles: t.fumbles.slice(-6), net: t.net, n: t.n };
        return { done: this._doneMap((id) => t.inputs[id] !== undefined), counts: { in: Object.keys(t.inputs).length } };
      },
    });
    if (kind === 'parcel') this._arm();
  }

  _arm() {
    const t = this.task;
    t.until = this.api.now() + this.api.dur(PARCEL.window);
    const seq = this.api.seq;
    const n = t.n;
    this._later(this.api.dur(PARCEL.window), () => {
      if (this.api.seq !== seq || t.n !== n || this.api.phase.id !== 'soup-task') return;
      t.drops.push({ id: t.holder, n: t.n });
      t.net -= PARCEL.drop;
      this._pass(t.holder, false);
    });
    this.api.progress();
  }

  _pass(from, ok) {
    const t = this.task;
    if (ok) { t.passes += 1; t.net += PARCEL.pass; t.passedBy[from] = (t.passedBy[from] || 0) + 1; }
    const others = this._aliveIds().filter((id) => id !== from);
    t.holder = others.length ? others[Math.floor(t.rng() * others.length)] : from;
    t.n += 1;
    this._arm();
  }

  _result() {
    const t = this.task;
    const alive = this._aliveIds();
    let gain = 0;
    let contributors = [];
    const res = { kind: t.kind };
    if (t.kind === 'spoons') {
      const total = alive.reduce((s, id) => s + (t.inputs[id] || 0), 0);
      const off = Math.abs(total - t.target);
      gain = off === 0 ? 1000 : off === 1 ? 400 : 0;
      contributors = alive.filter((id) => t.inputs[id] !== undefined);
      const hands = contributors.map((id) => t.inputs[id]).sort((a, b) => b - a);
      Object.assign(res, { total, target: t.target, item: t.item, off, entered: contributors.length, hands });
    } else if (t.kind === 'code') {
      const code = t.code.join('');
      const right = alive.filter((id) => t.inputs[id] === code);
      gain = Math.round((1000 * right.length) / alive.length / 50) * 50;
      contributors = right;
      // the clue: which digit did the table get wrong most often? (a lying Poisoner's seat shows up here)
      const typed = alive.filter((id) => t.inputs[id]);
      const wrong = t.code.map((d, i) => typed.filter((id) => t.inputs[id][i] !== String(d)).length);
      const worst = Math.max(0, ...wrong);
      const worstSlot = worst > 0 && wrong.filter((w) => w === worst).length === 1 ? wrong.indexOf(worst) : -1;
      Object.assign(res, { code, right: right.length, of: alive.length, room: t.room, typed: typed.length, wrongSeat: worstSlot >= 0 ? alive[worstSlot] : null, wrongN: worst });
    } else {
      gain = t.net;
      contributors = Object.keys(t.passedBy);
      Object.assign(res, { passes: t.passes, drops: t.drops.length, fumbles: t.fumbles.length, dropIds: t.drops.map((d) => d.id) });
    }
    const before = this.pot;
    this.pot = Math.max(0, this.pot + gain);
    let shieldTo = null;
    const pool = contributors.filter((id) => this.alive.has(id) && !this.shields.has(id));
    if (gain > 0 && pool.length) {
      const rng = this.api.sub(`shield-${this.day}`);
      shieldTo = pool[Math.floor(rng() * pool.length)];
      this.shields.add(shieldTo);
    }
    this.api.enter('soup-result', SP.result, { ...this._base(), ...res, gain: this.pot - before, before }, {
      priv: (p) => ({ ...this._priv(p), newShield: p.id === shieldTo }),
    });
  }

  // ---------- day: round table + vote + banish ----------
  _table() {
    this.points = {};
    this.ready = {};
    this.api.enter('soup-table', SP.table, { ...this._base() }, {
      priv: (p) => this._priv(p),
      progress: () => ({ done: this._doneMap((id) => this.ready[id]), counts: {}, points: { ...this.points } }),
    });
  }

  _vote() {
    this.votes = {};
    this.seance = {};
    const seanceLeft = this.ghosts.map((g) => g.id).filter((id) => !this.seanceUsed.has(id));
    this.api.enter('soup-vote', SP.vote, { ...this._base(), final: this.finalMode, seanceLeft }, {
      priv: (p) => this._priv(p),
      progress: () => ({ done: this._doneMap((id) => this.votes[id] || this.seance[id] !== undefined), counts: { votes: Object.keys(this.votes).length } }),
    });
  }

  _banish() {
    const rng = this.api.sub(`banish-${this.day}-${this.finalRound}`);
    const alive = this._aliveIds();
    const votes = alive.filter((id) => this.votes[id]).map((id) => ({ from: id, to: this.votes[id] })).sort(() => rng() - 0.5);
    const ghostVotes = Object.entries(this.seance).filter(([, to]) => to).map(([from, to]) => ({ from, to, ghost: true }));
    for (const g of Object.keys(this.seance)) if (this.seance[g]) this.seanceUsed.add(g);
    const all = [...votes, ...ghostVotes];
    const counts = {};
    for (const v of all) counts[v.to] = (counts[v.to] || 0) + 1;
    const top = Math.max(0, ...Object.values(counts));
    const leaders = Object.keys(counts).filter((id) => counts[id] === top);
    let banished = null;
    let tie = false;
    if (leaders.length === 1) banished = leaders[0];
    else if (leaders.length > 1) { tie = true; banished = leaders[Math.floor(rng() * leaders.length)]; }
    const role = banished ? this.roles[banished] : null;
    if (banished) {
      this.alive.delete(banished);
      this.shields.delete(banished);
      this.ghosts.push({ id: banished, how: 'banished', day: this.day, role });
      this.log.push({ day: this.day, kind: 'banished', id: banished, role });
    }
    const d = (ms) => this.api.dur(ms);
    const at = all.map((_, i) => d(BANISH.first + i * BANISH.per));
    const stampAt = d(BANISH.first + all.length * BANISH.per + 400);
    const roleAt = stampAt + d(BANISH.role);
    const total = BANISH.first + all.length * BANISH.per + 400 + BANISH.role + BANISH.tail;
    const landslide = !!banished && !tie && all.length >= 3 && counts[banished] === all.length;
    this.api.enter('soup-banish', total, { ...this._base(), landslide, votes: all, at, counts, banished, role, tie, leaders, stampAt, roleAt, final: this.finalMode }, {
      priv: (p) => this._priv(p),
    });
  }

  _afterBanish() {
    const pois = this._pois().length;
    const faith = this._faith().length;
    const n = pois + faith;
    if (pois === 0 || faith === 0) return this._end();
    if (this.finalMode) return n > 2 ? this._final() : this._end();
    if (n <= 3) return this._final();
    return this._night();
  }

  // ---------- night + morning ----------
  _night() {
    this.night = {};
    this.api.enter('soup-night', SP.night, { ...this._base() }, {
      priv: (p) => this._priv(p),
      progress: () => ({ done: this._doneMap((id) => this.night[id] !== undefined), counts: {} }),
    });
  }

  _morning() {
    const rng = this.api.sub(`night-${this.day}`);
    const pois = this._pois();
    const faith = this._faith();
    const picks = pois.map((id) => this.night[id]).filter((id) => id && faith.includes(id));
    let victim = picks.length ? picks[Math.floor(rng() * picks.length)] : null;
    let auto = false;
    if (!victim && faith.length) { victim = faith[Math.floor(rng() * faith.length)]; auto = true; }
    // the table's hunch: what the Faithful tapped (never the Poisoners' choice)
    const hc = {};
    for (const id of faith) { const t = this.night[id]; if (t && t !== id) hc[t] = (hc[t] || 0) + 1; }
    const hTop = Math.max(0, ...Object.values(hc));
    const hLeaders = Object.keys(hc).filter((id) => hc[id] === hTop);
    const hunch = hTop >= 2 && hLeaders.length === 1 && hLeaders[0] !== victim ? { id: hLeaders[0], n: hTop } : null;
    let saved = false;
    if (victim && this.shields.has(victim)) { saved = true; this.shields.delete(victim); } else if (victim) {
      this.alive.delete(victim);
      this.ghosts.push({ id: victim, how: 'poisoned', day: this.day, role: 'faithful' });
      this.log.push({ day: this.day, kind: 'poisoned', id: victim });
    }
    const lines = this.api.take(MORNINGS, 'soup-morning', 1, rng);
    this.api.enter('soup-morning', SP.morning, { ...this._base(), victim: saved ? null : victim, savedId: saved ? victim : null, saved, auto, hunch, line: lines[0]?.t || null }, {
      priv: (p) => this._priv(p),
    });
  }

  _afterMorning() {
    const pois = this._pois().length;
    const faith = this._faith().length;
    if (faith === 0) return this._end();
    if (pois + faith <= 3) return this._final();
    return this._task();
  }

  // ---------- final table ----------
  _final() {
    this.finalMode = true;
    this.finalRound += 1;
    this.choices = {};
    this.api.enter('soup-final', SP.final, { ...this._base(), round: this.finalRound }, {
      priv: (p) => this._priv(p),
      progress: () => ({ done: this._doneMap((id) => this.choices[id]), counts: {} }),
    });
  }

  _finalReveal() {
    const alive = this._aliveIds();
    const rng = this.api.sub('final-order');
    const choices = alive.map((id) => ({ id, choice: this.choices[id] || 'share', auto: !this.choices[id] })).sort(() => rng() - 0.5);
    this.finalUnanimous = choices.every((c) => c.choice === 'share');
    const d = (ms) => this.api.dur(ms);
    const at = choices.map((_, i) => d(1400 + i * 1300));
    const verdictAt = d(1400 + choices.length * 1300 + 500);
    this.api.enter('soup-final-reveal', 1400 + choices.length * 1300 + 500 + 4500, { ...this._base(), choices, at, verdictAt, unanimous: this.finalUnanimous }, {
      priv: (p) => this._priv(p),
    });
  }

  _end() {
    const alive = this._aliveIds();
    const pois = alive.filter((id) => this.roles[id] === 'poisoner');
    const winner = pois.length ? 'poisoners' : 'faithful';
    const winners = winner === 'poisoners' ? pois : alive;
    const share = winners.length ? Math.floor(this.pot / winners.length / 10) * 10 : 0;
    const deltas = {};
    for (const p of this.api.players) deltas[p.id] = winners.includes(p.id) ? share : 0;
    // ghosts on the winning side get a tenth of a share, so the dead still care how it ends
    const tip = Math.floor(share / 100) * 10;
    for (const g of this.ghosts) {
      const side = this.roles[g.id] === 'poisoner' ? 'poisoners' : 'faithful';
      if (side === winner && deltas[g.id] !== undefined) deltas[g.id] += tip;
    }
    this.api.addScores(deltas);
    const roles = this.seats.map((id) => ({ id, role: this.roles[id], alive: this.alive.has(id), how: this.ghosts.find((g) => g.id === id)?.how || null }));
    this.api.enter('soup-end', SP.end, { ...this._base(), winner, winners, share, tip, roles, deltas, log: this.log }, { priv: (p) => this._priv(p) });
  }

  // ---------- messages ----------
  handle(p, msg, { fresh }) {
    if (!fresh) return;
    const ph = this.api.phase.id;
    const alive = !!this.alive?.has(p.id);
    switch (msg.type) {
      case 'sp-seen':
        if (ph !== 'soup-roles') return;
        this.seen[p.id] = true; this.api.progress(); return;
      case 'sp-spoons': {
        if (ph !== 'soup-task' || this.task.kind !== 'spoons' || !alive) return;
        const n = Math.round(Number(msg.n));
        if (!Number.isFinite(n) || n < 0 || n > 5) return;
        this.task.inputs[p.id] = n; this.api.ack(p); this.api.progress(); return;
      }
      case 'sp-code': {
        if (ph !== 'soup-task' || this.task.kind !== 'code' || !alive) return;
        const c = String(msg.code || '').replace(/\D/g, '');
        if (c.length !== this.task.code.length) return;
        this.task.inputs[p.id] = c; this.api.ack(p); this.api.progress(); return;
      }
      case 'sp-pass': {
        if (ph !== 'soup-task' || this.task.kind !== 'parcel' || !alive) return;
        const t = this.task;
        if (msg.n !== t.n) return; // a stale tap from the previous hand-off
        if (p.id === t.holder) return this._pass(p.id, true);
        const now = this.api.now();
        t.lastFumble ||= {};
        if (now - (t.lastFumble[p.id] || 0) < this.api.dur(700)) return;
        t.lastFumble[p.id] = now;
        t.fumbles.push({ id: p.id, n: t.fumbles.length + 1 });
        t.net -= PARCEL.fumble;
        this.api.progress();
        return;
      }
      case 'sp-point': {
        if (ph !== 'soup-table' || !alive) return;
        const to = msg.to;
        if (to === null || to === undefined) delete this.points[p.id];
        else if (this.alive.has(to) && to !== p.id) this.points[p.id] = to;
        else return;
        this.api.progress(); return;
      }
      case 'sp-ready':
        if (ph !== 'soup-table' || !alive) return;
        this.ready[p.id] = !!msg.on; this.api.progress(); return;
      case 'sp-vote':
        if (ph !== 'soup-vote' || !alive || !this.alive.has(msg.to) || msg.to === p.id) return;
        this.votes[p.id] = msg.to; this.api.progress(); return;
      case 'sp-seance':
        if (ph !== 'soup-vote' || alive || this.seanceUsed.has(p.id) || !this.ghosts.some((g) => g.id === p.id)) return;
        if (msg.to !== null && !this.alive.has(msg.to)) return;
        this.seance[p.id] = msg.to; this.api.progress(); return;
      case 'sp-night':
        if (ph !== 'soup-night' || !alive || !this.alive.has(msg.to) || msg.to === p.id) return;
        this.night[p.id] = msg.to; this.api.progress(); return;
      case 'sp-final':
        if (ph !== 'soup-final' || !alive || (msg.choice !== 'share' && msg.choice !== 'banish')) return;
        this.choices[p.id] = msg.choice; this.api.progress(); return;
      default:
    }
  }

  onLeave(p) {
    if (this.api.phase.id === 'soup-task' && this.task?.kind === 'parcel' && this.task.holder === p.id) this._pass(p.id, false);
  }
}
