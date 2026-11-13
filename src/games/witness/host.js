// Character Witness host logic. Runs on the host phone only; talks to phones only through `api`.
// One player is in the dock each round: they answer a question about themselves (or plead the
// fifth once and lie), everyone else writes a fake in their voice, the table picks the real one.
// Finale "Cross-examination": the last-placed player takes the stand, keeps ONE fake beside
// their answer, and the table finds the real one, for triple points. From the halfway dock on,
// every round pays double. See ./DESIGN.md.
// Bluff-and-pick ideas adapted from Afters Classic's Porkies (copied, not imported).
import { QUESTIONS, HOUSE } from './content/questions.js';
import { normalise, levenshtein } from '../../util/text.js';

export const WT = {
  intro: 9000, write: 40000, pick: 15000, pickPerExtra: 1500, pickMax: 24000,
  scores: 7000, crossIntro: 7500, choose: 15000, crossPick: 14000,
};
export const MAX = 50; // characters per answer
export const PTS = { truth: 1000, perFooled: 500, defendant: 250, expert: 250, echo: 750 };
// reveal beats (ms, before api.dur)
const BEAT = { nobody: 2400, fake: 2900, truth: 3800, verdict: 3400, silent: 5000 };

export const shuffle = (arr, rng) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

/** Same answer, give or take a typo ("my teddy" vs "My Teddy!"). */
export function sameAnswer(a, b) {
  const x = normalise(a); const y = normalise(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const long = Math.max(x.length, y.length);
  if (long <= 4) return false;
  return levenshtein(x, y) <= (long > 10 ? 2 : 1);
}

export class WitnessHost {
  constructor(api) {
    this.api = api;
    this.rounds = [];
    this.i = 0;
    this.fifthUsed = new Set();
  }

  start() {
    const api = this.api;
    const rng = api.sub('wt-plan');
    const ids = shuffle(api.players.map((p) => p.id), rng);
    const qs = api.take(QUESTIONS, 'wt-q', ids.length + 1, rng);
    this.rounds = ids.map((id, n) => ({ defendant: id, q: qs[n], final: false }));
    this.finalQ = qs[ids.length] || qs[0];
    this.i = 0;
    this.fifthUsed = new Set();
    api.enter('witness-intro', WT.intro, { rounds: ids.length, plays: api.plays });
  }

  get r() { return this.rounds[this.i]; }

  advance(id) {
    const r = this.r;
    switch (id) {
      case 'witness-intro': return this._write();
      case 'witness-write':
        if (!r.truth) return this._reveal();
        return r.final ? this._choose() : this._pick();
      case 'witness-choose': return this._pick();
      case 'witness-pick': return this._reveal();
      case 'witness-reveal':
        if (r.final) return this.api.finish(this.api.players.map((p) => ({ id: p.id, score: p.score })));
        if (this.i + 1 < this.rounds.length) { this.i += 1; return this._write(); }
        return this._scores();
      case 'witness-scores': return this._crossIntro();
      case 'witness-cross-intro': this.i += 1; return this._write();
      default:
    }
  }

  activeFor(phaseId, connected) {
    const r = this.r;
    if (!r) return connected;
    if (phaseId === 'witness-pick') return connected.filter((p) => p.id !== r.defendant);
    if (phaseId === 'witness-choose') return connected.filter((p) => p.id === r.defendant);
    return connected;
  }

  handle(p, msg, { fresh }) {
    if (!fresh) return;
    const ph = this.api.phase.id;
    const r = this.r;
    if (!r) return;
    switch (msg.type) {
      case 'wt-answer': {
        if (ph !== 'witness-write') return;
        const t = this.api.clean(msg.text, MAX);
        if (!t) return;
        if (p.id === r.defendant) {
          r.truth = t;
          r.fifth = !!msg.fifth && !r.final && !this.fifthUsed.has(p.id);
          if (r.fifth) this.fifthUsed.add(p.id);
        } else {
          r.fakes[p.id] = t;
        }
        this.api.ack(p);
        this.api.progress();
        return;
      }
      case 'wt-pick': {
        if (ph !== 'witness-pick' || p.id === r.defendant) return;
        const o = r.options.find((x) => x.id === msg.optionId);
        if (!o || o.authors.includes(p.id) || (o.kind === 'truth' && r.echo.includes(p.id))) return;
        r.picks[p.id] = { id: o.id, at: this.api.now() - this.api.phase.startsAt };
        this.api.progress();
        return;
      }
      case 'wt-keep': {
        if (ph !== 'witness-choose' || p.id !== r.defendant || !Array.isArray(msg.ids)) return;
        const ids = [...new Set(msg.ids)].filter((id) => r.fakeOpts.some((o) => o.id === id)).slice(0, this._keepN());
        if (!ids.length) return;
        r.kept = ids;
        this.api.ack(p);
        this.api.progress();
        return;
      }
      default:
    }
  }

  // ---------- phases ----------

  _fill(q, defendant) {
    const name = this.api.player(defendant)?.name || 'Someone';
    let text = q.q.replaceAll('{name}', name);
    if (text.includes('{other}')) {
      const others = this.api.players.filter((p) => p.id !== defendant);
      const o = others[Math.floor(this.api.sub(`other-${q.id}`)() * others.length)];
      text = text.replaceAll('{other}', o?.name || 'the cat');
    }
    return text;
  }

  /** Stakes: x1 for the first half of the docks, x2 from halfway, x3 for cross-examination. */
  _mult() {
    const r = this.r;
    if (r.final) return 3;
    const regular = this.rounds.filter((x) => !x.final).length;
    return this.i >= Math.ceil(regular / 2) ? 2 : 1;
  }

  _base() {
    const r = this.r;
    const regular = this.rounds.filter((x) => !x.final).length;
    return { index: r.final ? regular : this.i, count: regular, defendant: r.defendant, q: r.text, kind: r.q.k, final: r.final, mult: this._mult() };
  }

  _write() {
    const r = this.r;
    Object.assign(r, { text: this._fill(r.q, r.defendant), truth: null, fifth: false, fakes: {}, picks: {}, options: [], echo: [], kept: null, autoKept: false });
    const fifthLeft = !r.final && !this.fifthUsed.has(r.defendant);
    this.api.enter('witness-write', WT.write, { ...this._base(), max: MAX, fifthLeft }, {
      progress: () => ({ done: this._doneMap((p) => (p.id === r.defendant ? !!r.truth : !!r.fakes[p.id])), counts: {}, inDock: !!r.truth }),
    });
  }

  /** The options: the defendant's answer, merged fakes, house fakes until there are three. */
  _build() {
    const r = this.r;
    const byNorm = new Map();
    r.echo = [];
    for (const [pid, text] of Object.entries(r.fakes)) {
      if (sameAnswer(text, r.truth)) { r.echo.push(pid); continue; } // knows them too well
      const k = normalise(text);
      if (byNorm.has(k)) byNorm.get(k).authors.push(pid);
      else byNorm.set(k, { kind: 'fake', text, authors: [pid] });
    }
    const options = [{ kind: 'truth', text: r.truth, authors: [r.defendant] }, ...byNorm.values()];
    const bank = this.api.adult ? HOUSE.adult : HOUSE.family;
    const pool = shuffle(bank[r.q.k] || bank.thing, this.api.sub(`house-${r.q.id}`));
    for (const t of pool) {
      if (options.length >= 3) break;
      if (!options.some((o) => sameAnswer(o.text, t))) options.push({ kind: 'house', text: t, authors: [] });
    }
    return options;
  }

  _choose() {
    const r = this.r;
    const all = this._build();
    r.all = all;
    r.fakeOpts = all.filter((o) => o.kind !== 'truth').map((o, i) => ({ ...o, id: `k${i}` }));
    this.api.enter('witness-choose', WT.choose, {
      ...this._base(), truth: r.truth,
      fakes: r.fakeOpts.map((o) => ({ id: o.id, text: o.text, house: o.kind === 'house' })), keep: this._keepN(),
    }, {
      progress: () => ({ done: { [r.defendant]: (r.kept?.length || 0) >= this._keepN() }, counts: {} }),
    });
  }

  _keepN() { return Math.min(2, this.r.fakeOpts?.length || 0); }

  _pick() {
    const r = this.r;
    let options;
    if (r.final) {
      const kept = (r.kept || []).map((id) => r.fakeOpts.find((o) => o.id === id)).filter(Boolean);
      if (kept.length < this._keepN()) {
        // the defendant dithered: Cyril tops up with players' fakes (house ones last)
        const rest = shuffle(r.fakeOpts.filter((o) => !kept.includes(o)), this.api.sub('keep'))
          .sort((a, b) => (a.kind === 'house') - (b.kind === 'house'));
        while (kept.length < this._keepN() && rest.length) kept.push(rest.shift());
        r.autoKept = true;
      }
      options = [r.all[0], ...kept];
    } else options = this._build();
    const rng = this.api.sub(`opts-${r.q.id}`);
    r.options = shuffle(options, rng).map((o, i) => ({ kind: o.kind, text: o.text, authors: o.authors, id: `o${i}` }));
    const n = r.options.length;
    const dur = r.final ? WT.crossPick : Math.min(WT.pickMax, WT.pick + Math.max(0, n - 4) * WT.pickPerExtra);
    const truthId = r.options.find((o) => o.kind === 'truth').id;
    const jury = () => this.api.players.filter((p) => p.id !== r.defendant);
    this.api.enter('witness-pick', dur, {
      ...this._base(), options: r.options.map((o) => ({ id: o.id, text: o.text })), autoKept: r.autoKept,
    }, {
      priv: (p) => {
        if (p.id === r.defendant) return { role: 'defendant', ownOptionId: truthId };
        const own = r.options.find((o) => o.authors.includes(p.id));
        const echo = r.echo.includes(p.id);
        return { role: 'jury', ownOptionId: echo ? truthId : own?.id || null, echo };
      },
      progress: () => ({
        done: this._doneMap((p) => p.id === r.defendant || !!r.picks[p.id]),
        counts: { picked: jury().filter((p) => r.picks[p.id]).length, of: jury().length },
      }),
    });
  }

  _reveal() {
    const r = this.r;
    const api = this.api;
    const m = this._mult();
    const deltas = Object.fromEntries(api.players.map((p) => [p.id, 0]));
    const add = (id, n) => { if (id in deltas) deltas[id] += n; };

    if (!r.truth) {
      // the defendant said nothing: contempt of court, nobody scores
      const fakes = Object.entries(r.fakes).map(([pid, text], i) => ({ id: `o${i}`, kind: 'fake', text, authors: [pid], pickers: [] }));
      api.enter('witness-reveal', BEAT.silent, {
        ...this._base(), outcome: 'silent', options: fakes, order: [], steps: [{ kind: 'silent', at: 0 }], deltas, fifth: false, mult: m,
        missed: 0, expert: null, echo: [], scores: this._rows(),
      });
      return;
    }

    const pickers = Object.fromEntries(r.options.map((o) => [o.id, []]));
    for (const [pid, pk] of Object.entries(r.picks)) if (pickers[pk.id]) pickers[pk.id].push(pid);
    const truth = r.options.find((o) => o.kind === 'truth');
    let missed = 0;
    for (const o of r.options) {
      const ps = pickers[o.id];
      if (o.kind === 'truth') ps.forEach((pid) => add(pid, PTS.truth * m));
      else {
        missed += ps.length;
        if (o.kind === 'fake') o.authors.forEach((a) => add(a, PTS.perFooled * m * ps.length));
      }
    }
    add(r.defendant, PTS.defendant * m * missed);
    // expert witness: whoever found the truth fastest
    const found = pickers[truth.id].slice().sort((a, b) => r.picks[a].at - r.picks[b].at);
    const expert = found[0] || null;
    if (expert) add(expert, PTS.expert * m);
    r.echo.forEach((pid) => add(pid, PTS.echo * m));
    api.addScores(deltas);

    // timeline: duds batched, then fakes by ascending pickers, the sworn answer, then the verdict
    const steps = [];
    let t = 700;
    const fakes = r.options.filter((o) => o.kind !== 'truth');
    const zero = fakes.filter((o) => !pickers[o.id].length);
    const picked = fakes.filter((o) => pickers[o.id].length).sort((a, b) => pickers[a.id].length - pickers[b.id].length);
    if (zero.length) {
      if (r.final) for (const o of zero) { steps.push({ kind: 'fake', optionId: o.id, at: t }); t += BEAT.fake; }
      else { steps.push({ kind: 'nobody', optionIds: zero.map((o) => o.id), at: t }); t += BEAT.nobody; }
    }
    for (const o of picked) { steps.push({ kind: 'fake', optionId: o.id, at: t }); t += BEAT.fake; }
    steps.push({ kind: 'truth', optionId: truth.id, at: t }); t += BEAT.truth;
    steps.push({ kind: 'verdict', at: t }); t += BEAT.verdict;
    api.enter('witness-reveal', Math.min(t, 28000), {
      ...this._base(), outcome: 'normal', fifth: r.fifth, mult: m,
      options: r.options.map((o) => ({ id: o.id, kind: o.kind, text: o.text, authors: o.authors, pickers: pickers[o.id] })),
      steps: steps.map((s) => ({ ...s, at: api.dur(s.at) })),
      missed, expert, echo: r.echo, deltas, scores: this._rows(),
    });
  }

  _rows() {
    const rows = this.api.players.map((p) => ({ id: p.id, score: p.score })).sort((a, b) => b.score - a.score);
    let rank = 0;
    rows.forEach((row, i) => { if (i === 0 || row.score !== rows[i - 1].score) rank = i + 1; row.rank = rank; });
    return rows;
  }

  _scores() {
    const rows = this._rows();
    // the final defendant: last place (ties broken by seed). Catch-up: they pick the two fakes, x3.
    const low = rows[rows.length - 1].score;
    const tied = rows.filter((x) => x.score === low);
    const def = tied[Math.floor(this.api.sub('cross')() * tied.length)].id;
    this.rounds.push({ defendant: def, q: this.finalQ, final: true });
    this.api.enter('witness-scores', WT.scores, { rows, next: def });
  }

  _crossIntro() {
    const next = this.rounds[this.rounds.length - 1];
    this.api.enter('witness-cross-intro', WT.crossIntro, { defendant: next.defendant, mult: 3 });
  }

  _doneMap(fn) {
    const done = {};
    for (const p of this.api.players) done[p.id] = !!fn(p);
    return done;
  }
}
