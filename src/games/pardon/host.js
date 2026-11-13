// Pardon? host logic. Runs on the host phone only; talks to phones ONLY through `api`.
// Round 1 Say What? (read gibberish aloud, the reader taps who got it), Round 2 Mishearing
// (write your own misheard version of a line, the table votes the funniest), Round 3 Hum Along
// (Cyril plays public-domain tunes, everyone picks the name, fastest scores most; ends on Backwards).
// Rules, timers and scoring: ./DESIGN.md.
import { GIBBERISH } from './content/gibberish.js';
import { TUNES } from './content/tunes.js';
import { LINES } from './content/lines.js';
import { tuneLength } from './tune.js';

export const PD = {
  intro: 7000, round: 5000,
  read: 45000, steal: 30000, quick: 10000, said: 5500,
  tuneLead: 1600, tuneAnswer: 9000, tuneMax: 34000, tuneReveal: 6500,
  write: 55000, vote: 25000, verdict: 9500,
};
export const PTS = {
  guess: 1000, steal: 500, readerQuick: 500, readerSlow: 200,
  tuneMax: 1000, tuneMin: 300, tuneFirst: 200,
  vote: 300, funniest: 500,
};
export const MAX_WRITE = 70;

// "Wrong accent" cards: every third read, the reader must do a voice. The whole table sees it.
export const ACCENTS = {
  family: ['a newsreader', 'a pirate', 'your nan', 'a football commentator', 'a robot', 'a whisper', 'a posh butler', 'the weather forecast', 'a sergeant major', 'a ghost'],
  adult: ['a late-night radio DJ', 'a pirate', 'your nan after a sherry', 'a football commentator', 'a nature documentary', 'a posh butler', 'a sergeant major', 'a breathy whisper'],
};

// Hum Along modes: the last two tunes get weird, and are worth double.
export const MODES = { normal: { label: null, x: 1 }, wonky: { label: 'Wonky', x: 2 }, backwards: { label: 'Backwards', x: 2 } };

export function tunePoints(ms, mode = 'normal') {
  const s = Math.max(0, ms) / 1000;
  const base = Math.max(PTS.tuneMin, Math.round((PTS.tuneMax - 45 * s) / 10) * 10);
  return base * (MODES[mode]?.x || 1);
}

const norm = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

export class PardonHost {
  constructor(api) {
    this.api = api;
    this.reads = [];
    this.tunes = [];
    this.i = 0;
  }

  // ---------- plan ----------
  start() {
    const api = this.api;
    const ps = api.players;
    const rng = api.sub('pd-plan');
    // Round 1: everyone reads once (twice each with 3 players, so the round isn't over in a blink).
    const order = ps.map((p) => p.id).sort(() => rng() - 0.5);
    const readers = ps.length <= 3 ? [...order, ...order.slice().sort(() => rng() - 0.5)] : order;
    const cards = api.take(GIBBERISH, 'pd-gib', readers.length, rng);
    const accents = ACCENTS[api.adult ? 'adult' : 'family'].slice().sort(() => rng() - 0.5);
    const accentAt = rng() < 0.5 ? 1 : 2;
    this.reads = readers.map((id, i) => ({ reader: id, card: cards[i % cards.length], accent: i % 3 === accentAt ? accents[i % accents.length] : null }));
    // Round 2: 5 tunes (4 with big tables), the last two wonky then backwards.
    const nT = ps.length >= 7 ? 4 : 5;
    const picked = api.take({ family: TUNES, adult: TUNES }, 'pd-tune', nT, rng);
    this.tunes = picked.map((t, i) => ({ tune: t, mode: i === nT - 1 ? 'backwards' : i === nT - 2 ? 'wonky' : 'normal' }));
    // Round 3: one line to mishear.
    this.line = api.take({ family: LINES, adult: LINES }, 'pd-line', 1, rng)[0];
    this.api.enter('pardon-intro', PD.intro, { plays: api.plays, reads: this.reads.length, tunes: this.tunes.length });
  }

  advance(id) {
    switch (id) {
      case 'pardon-intro': return this._round(1);
      case 'pardon-round':
        this.i = 0;
        if (this.roundNo === 1) return this._read();
        if (this.roundNo === 2) return this._write();
        return this._tune();
      case 'pardon-read': return this._said();
      case 'pardon-said':
        this.i += 1;
        return this.i < this.reads.length ? this._read() : this._round(2);
      case 'pardon-write': return this._vote();
      case 'pardon-vote': return this._verdict();
      case 'pardon-verdict': return this._round(3);
      case 'pardon-tune': return this._tuneReveal();
      case 'pardon-tune-reveal':
        this.i += 1;
        if (this.i < this.tunes.length) return this._tune();
        return this.api.finish(this.api.players.map((p) => ({ id: p.id, score: p.score })));
      default:
    }
  }

  activeFor(phaseId, connected) {
    if (phaseId === 'pardon-read') return connected.filter((p) => p.id === this.reads[this.i]?.reader);
    if (phaseId === 'pardon-vote') return connected.filter((p) => this.voters?.has(p.id));
    return connected;
  }

  onLeave(p) {
    // the reader walked off mid-card: nobody got it, move on
    const r = this.reads[this.i];
    if (this.api.phase.id === 'pardon-read' && r && p.id === r.reader && !r.done) { r.done = true; r.got = null; this.api.progress(); }
  }

  handle(p, msg, { fresh }) {
    if (!fresh) return;
    const ph = this.api.phase.id;
    const now = this.api.now();
    switch (msg.type) {
      case 'pd-got': {
        const r = this.reads[this.i];
        if (ph !== 'pardon-read' || !r || p.id !== r.reader || r.done) return;
        const who = msg.id === 'none' ? null : msg.id;
        if (who && (who === r.reader || !this.api.player(who))) return;
        r.done = true;
        r.got = who;
        r.ms = now - this.api.phase.startsAt;
        this.api.ack(p);
        this.api.progress();
        return;
      }
      case 'pd-tune': {
        const t = this.tunes[this.i];
        if (ph !== 'pardon-tune' || !t || t.answers[p.id]) return;
        if (!t.options.some((o) => o.id === msg.id)) return;
        const ms = now - this.api.phase.startsAt - t.playAt;
        // phones can't tap before it plays; anything early (bots, lag) counts as instant
        t.answers[p.id] = { id: msg.id, ok: msg.id === t.tune.id, ms: Math.max(0, ms) };
        this.api.ack(p);
        this.api.progress();
        return;
      }
      case 'pd-write': {
        if (ph !== 'pardon-write') return;
        const text = this.api.clean(String(msg.text || ''), MAX_WRITE);
        if (!text) return this.api.reject(p, 'empty');
        if (norm(text) === norm(this.line.line)) return this.api.reject(p, 'same');
        this.written[p.id] = text;
        this.api.ack(p);
        this.api.progress();
        return;
      }
      case 'pd-vote': {
        if (ph !== 'pardon-vote' || !this.voters.has(p.id)) return;
        const e = this.entries.find((x) => x.key === msg.key);
        if (!e || e.authors.includes(p.id)) return;
        this.votes[p.id] = e.key;
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

  _round(n) {
    this.roundNo = n;
    this.api.enter('pardon-round', PD.round, {
      round: n,
      count: n === 1 ? this.reads.length : n === 3 ? this.tunes.length : 1,
      rows: n > 1 ? this._standings() : null,
    });
  }

  _read() {
    const r = this.reads[this.i];
    Object.assign(r, { done: false, got: null, ms: 0 });
    const d = (ms) => this.api.dur(ms);
    // `say` is public on purpose: after the steal mark every phone shows it so anyone can have a go.
    // The answer is private to the reader.
    this.api.enter('pardon-read', PD.read, {
      index: this.i, count: this.reads.length, reader: r.reader,
      say: r.card.say, hint: r.card.hint, accent: r.accent,
      stealAt: d(PD.steal), quick: d(PD.quick),
    }, {
      priv: (pl) => (pl.id === r.reader ? { real: r.card.real } : null),
      progress: () => ({ done: { [r.reader]: r.done }, counts: {}, got: r.got }),
    });
  }

  _said() {
    const r = this.reads[this.i];
    const steal = this.api.dur(PD.steal);
    const quick = this.api.dur(PD.quick);
    const deltas = {};
    for (const p of this.api.players) deltas[p.id] = 0;
    let stolen = false;
    if (r.got) {
      stolen = r.ms >= steal;
      deltas[r.got] += stolen ? PTS.steal : PTS.guess;
      if (!stolen) deltas[r.reader] += r.ms <= quick ? PTS.readerQuick : PTS.readerSlow;
    }
    this.api.addScores(deltas);
    this.api.enter('pardon-said', PD.said, {
      index: this.i, count: this.reads.length, reader: r.reader,
      say: r.card.say, real: r.card.real, hint: r.card.hint, accent: r.accent,
      got: r.got, secs: r.got ? Math.max(1, Math.round((r.ms * (this.api.speed || 1)) / 1000)) : null,
      stolen, quick: !!r.got && !stolen && r.ms <= quick, deltas,
    });
  }

  _tune() {
    const t = this.tunes[this.i];
    const rng = this.api.sub(`pd-opts-${this.i}`);
    // three decoys: two of the same kind so it's a real choice, one wildcard
    const same = TUNES.filter((x) => x.id !== t.tune.id && x.kind === t.tune.kind).sort(() => rng() - 0.5);
    const other = TUNES.filter((x) => x.id !== t.tune.id && x.kind !== t.tune.kind).sort(() => rng() - 0.5);
    const decoys = [...same.slice(0, 2), other[0]];
    t.options = [t.tune, ...decoys].map((x) => ({ id: x.id, title: x.title })).sort(() => rng() - 0.5);
    t.answers = {};
    const playMs = tuneLength(t.tune, t.mode) * 1000;
    t.playAt = this.api.dur(PD.tuneLead);
    const total = Math.min(PD.tuneMax, PD.tuneLead + playMs + PD.tuneAnswer);
    this.api.enter('pardon-tune', total, {
      index: this.i, count: this.tunes.length, mode: t.mode, kind: t.tune.kind,
      notes: t.tune.notes, bpm: t.tune.bpm, seed: this.api.seed + this.i,
      playAt: t.playAt, options: t.options,
      scores: Object.fromEntries(this.api.players.map((p) => [p.id, p.score])),
    }, {
      progress: () => ({
        done: Object.fromEntries(this.api.players.map((p) => [p.id, !!t.answers[p.id]])),
        counts: { in: Object.keys(t.answers).length },
        // who's in, fastest first (not what they said) so the table feels the race
        order: Object.entries(t.answers).sort((a, b) => a[1].ms - b[1].ms).map(([id]) => id),
        secs: Object.fromEntries(Object.entries(t.answers).map(([id, a]) => [id, Math.round((a.ms * (this.api.speed || 1)) / 100) / 10])),
      }),
    });
  }

  _tuneReveal() {
    const t = this.tunes[this.i];
    const deltas = {};
    for (const p of this.api.players) deltas[p.id] = 0;
    const right = Object.entries(t.answers).filter(([, a]) => a.ok).sort((a, b) => a[1].ms - b[1].ms);
    const first = right[0]?.[0] || null;
    const answers = {};
    for (const [id, a] of Object.entries(t.answers)) {
      const real = a.ms * (this.api.speed || 1);
      const pts = a.ok ? tunePoints(real, t.mode) + (id === first ? PTS.tuneFirst : 0) : 0;
      deltas[id] = pts;
      answers[id] = { id: a.id, ok: a.ok, secs: Math.round(real / 100) / 10, pts };
    }
    this.api.addScores(deltas);
    this.api.enter('pardon-tune-reveal', PD.tuneReveal, {
      index: this.i, count: this.tunes.length, mode: t.mode,
      tune: { id: t.tune.id, title: t.tune.title, by: t.tune.by, kind: t.tune.kind, notes: t.tune.notes, bpm: t.tune.bpm },
      options: t.options, answers, first, deltas,
    });
  }

  _write() {
    this.written = {};
    this.api.enter('pardon-write', PD.write, { line: this.line.line, from: this.line.from, max: MAX_WRITE, eg: this.line.eg?.[0] || null }, {
      progress: () => ({ done: Object.fromEntries(this.api.players.map((p) => [p.id, !!this.written[p.id]])), counts: {} }),
    });
  }

  _vote() {
    const rng = this.api.sub('pd-vote');
    const byText = new Map();
    for (const [id, text] of Object.entries(this.written)) {
      const k = norm(text);
      if (byText.has(k)) byText.get(k).authors.push(id);
      else byText.set(k, { text, authors: [id] });
    }
    let list = [...byText.values()];
    // fewer than 3 entries? Cyril chips in with his own mishearings so there's a real vote
    const eg = (this.line.eg || []).slice(1).sort(() => rng() - 0.5); // eg[0] is the on-screen example
    while (list.length < 3 && eg.length) {
      const text = eg.pop();
      if (!byText.has(norm(text))) list.push({ text, authors: [], house: true });
    }
    list = list.sort(() => rng() - 0.5).map((e, i) => ({ ...e, key: String.fromCharCode(65 + i) }));
    this.entries = list;
    this.votes = {};
    this.voters = new Set(this.api.players.filter((p) => list.some((e) => !e.authors.includes(p.id))).map((p) => p.id));
    const priv = (pl) => ({ mine: list.filter((e) => e.authors.includes(pl.id)).map((e) => e.key) });
    this.api.enter('pardon-vote', PD.vote, { line: this.line.line, from: this.line.from, entries: list.map((e) => ({ key: e.key, text: e.text })) }, {
      priv,
      progress: () => ({ done: Object.fromEntries(this.api.players.map((p) => [p.id, !this.voters.has(p.id) || !!this.votes[p.id]])), counts: { votes: Object.keys(this.votes).length } }),
    });
  }

  _verdict() {
    const deltas = {};
    for (const p of this.api.players) deltas[p.id] = 0;
    const tally = {};
    for (const [voter, key] of Object.entries(this.votes)) (tally[key] ||= []).push(voter);
    const most = Math.max(0, ...this.entries.map((e) => (tally[e.key] || []).length));
    const entries = this.entries.map((e) => {
      const voters = tally[e.key] || [];
      const top = most > 0 && voters.length === most;
      const each = e.house ? 0 : voters.length * PTS.vote + (top ? PTS.funniest : 0);
      for (const a of e.authors) deltas[a] += each;
      return { key: e.key, text: e.text, authors: e.authors, house: !!e.house, voters, top, pts: each };
    }).sort((a, b) => a.voters.length - b.voters.length);
    this.api.addScores(deltas);
    const d = (ms) => this.api.dur(ms);
    this.api.enter('pardon-verdict', PD.verdict, {
      line: this.line.line, from: this.line.from, entries, deltas,
      per: d(Math.min(1300, 5600 / Math.max(1, entries.length))), start: d(900),
    });
  }
}
