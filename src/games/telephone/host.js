// Crossed Wires host logic. Runs on the host phone only; talks to phones only through `api`.
// See DESIGN.md in this folder for rules, phases, timers and scoring.
import { decodeDrawing, replayDuration } from '../../shared/drawing-data.js';
import { shuffle } from '../../util/rng.js';
import { STARTERS } from './content/starters.js';
import { doodle, DOODLE_KEYS } from './doodles.js';
import { MODES, TIMERS, LIMITS, holder, kindOf, kept } from './logic.js';

const INTRO = 12000;
const VOTE = 9000;
const AWARDS = 9500;
const PTS = { vote: 500, kept: 250, straight: 300, flipBest: 250 };
// reveal beats (ms at speed 1)
const BEAT = { title: 1300, text: 2300, guess: 2700, drawHold: 1000, drawMax: 3400, blank: 1700, flipFrame: 600, flipMax: 2600, flipbook: 4200, end: 3200 };

export class TelephoneHost {
  constructor(api) {
    this.api = api;
    this.mode = 'classic';
    this.seats = [];
    this.chains = [];
    this.step = 0;
    this.pending = {};
    this.votes = {};
    this.allVotes = {}; // key -> count across the game
    this.nudge = { n: 0, to: null, from: null };
    this.lastNudge = {};
    this.revealIndex = 0;
  }

  get n() { return this.seats.length; }
  get steps() { return this.n; }

  start() {
    const rng = this.api.sub('seats');
    this.seats = shuffle(this.api.players.map((p) => p.id), rng);
    this.chains = this.seats.map((id, c) => ({ id: c, ownerId: id, steps: [] }));
    this.api.enter('telephone-intro', INTRO, { modes: MODES, plays: this.api.plays }, {
      progress: () => ({ done: {}, counts: {}, mode: this.mode }),
      active: () => [],
    });
  }

  advance(phaseId) {
    switch (phaseId) {
      case 'telephone-intro': this.step = 0; return this._enterStep();
      case 'telephone-write':
      case 'telephone-draw':
      case 'telephone-guess':
        this._closeStep();
        this.step += 1;
        if (this.step < this.steps) return this._enterStep();
        this.revealIndex = 0;
        return this._reveal();
      case 'telephone-reveal': return this._vote();
      case 'telephone-vote':
        this._tally();
        this.revealIndex += 1;
        if (this.revealIndex < this.chains.length) return this._reveal();
        return this._awards();
      case 'telephone-awards': return this._finish();
      default: return undefined;
    }
  }

  activeFor(phaseId, connected) {
    if (/write|draw|guess/.test(phaseId)) return connected.filter((p) => this.seats.includes(p.id));
    if (phaseId === 'telephone-vote') return connected.filter((p) => this.seats.includes(p.id));
    return [];
  }

  handle(p, msg, { fresh, isHost }) {
    if (!fresh) return;
    const ph = this.api.phase.id;
    switch (msg.type) {
      case 'mode':
        if (isHost && ph === 'telephone-intro' && MODES.includes(msg.mode)) { this.mode = msg.mode; this.api.progress(); }
        return;
      case 'text': {
        if (ph !== 'telephone-write' && ph !== 'telephone-guess') return;
        const text = this.api.clean(msg.text, LIMITS.text);
        if (!text) return this.api.reject(p, 'empty');
        this.pending[p.id] = { text, done: true };
        this.api.ack(p);
        this.api.progress();
        return;
      }
      case 'draw': {
        if (ph !== 'telephone-draw') return;
        const d = decodeDrawing(msg.d, { maxPoints: LIMITS.points });
        const prev = this.pending[p.id];
        this.pending[p.id] = { drawing: d, done: !!msg.final || !!prev?.done, doodle: typeof msg.doodle === 'string' && DOODLE_KEYS.includes(msg.doodle) ? msg.doodle : null };
        if (msg.final) { this.api.ack(p); this.api.progress(); }
        return;
      }
      case 'nudge': {
        if (!/write|draw|guess/.test(ph)) return;
        const to = this.api.player(msg.to);
        const t = this.api.now();
        if (!to || to.id === p.id || t - (this.lastNudge[p.id] || 0) < 3000 / this.api.speed) return;
        this.lastNudge[p.id] = t;
        this.nudge = { n: this.nudge.n + 1, to: to.id, from: p.id };
        this.api.progress();
        return;
      }
      case 'vote': {
        if (ph !== 'telephone-vote') return;
        const m = this.api.phase.payload.moments.find((x) => x.key === msg.key);
        if (!m || m.authorId === p.id) return;
        this.votes[p.id] = msg.key;
        this.api.progress();
        return;
      }
      case 'next':
        if (isHost && ph === 'telephone-reveal' && this.api.now() - this.api.phase.startsAt > 1200 / this.api.speed) this.advance(ph);
        return;
      default:
    }
  }

  // ---------- steps ----------

  _chainOf(playerId, s = this.step) {
    const k = this.seats.indexOf(playerId);
    if (k < 0) return -1;
    return (k - s + this.n * 4) % this.n;
  }

  _enterStep() {
    const s = this.step;
    const kind = kindOf(s, this.mode);
    const T = TIMERS[this.mode];
    this.pending = {};
    this.nudge = { n: this.nudge.n, to: null, from: null };
    const payload = { step: s, steps: this.steps, mode: this.mode, kind, max: LIMITS.text };
    const priv = (pl) => {
      const c = this._chainOf(pl.id, s);
      if (c < 0) return null;
      const chain = this.chains[c];
      const prev = chain.steps[s - 1];
      const out = { chain: c, owner: chain.ownerId, from: prev?.authorId || null, next: this.seats[holder(c, s + 1, this.n)] };
      if (kind === 'draw') {
        out.text = this.mode === 'flip' ? chain.steps[0].text : prev.text;
        if (this.mode === 'flip' && prev?.drawing) out.prev = prev.drawing;
        out.frame = s;
      }
      if (kind === 'guess') { out.drawing = prev.drawing; if (prev.doodle) out.doodle = prev.doodle; }
      return out;
    };
    const progress = () => {
      const done = {};
      for (const id of this.seats) done[id] = !!this.pending[id]?.done;
      return { done, counts: {}, nudge: this.nudge };
    };
    this.api.enter(`telephone-${kind}`, T[kind], payload, { priv, progress });
  }

  /** Lock in this step: everyone's entry joins its line; gaps are filled so no line breaks. */
  _closeStep() {
    const s = this.step;
    const kind = kindOf(s, this.mode);
    const rng = this.api.sub(`fill${s}`);
    this.seats.forEach((id, k) => {
      const c = (k - s + this.n * 4) % this.n;
      const chain = this.chains[c];
      const got = this.pending[id];
      const entry = { kind, authorId: id, auto: false };
      if (kind === 'draw') {
        const empty = !got?.drawing?.strokes?.length;
        entry.drawing = empty ? doodle(Math.floor(rng() * DOODLE_KEYS.length), Math.floor(rng() * 1e6)) : got.drawing;
        entry.auto = empty;
        if (got?.doodle && !empty) entry.doodle = got.doodle;
      } else {
        entry.text = got?.text || this.api.take(STARTERS, 'telephone-fill', 1, rng)[0].text;
        entry.auto = !got?.text;
      }
      if (kind === 'guess') {
        const source = chain.steps[s - 2];
        entry.match = !entry.auto && !!source && kept(source.text, entry.text);
        const drawer = chain.steps[s - 1];
        if (entry.match && !drawer.auto) this.api.addScores({ [id]: PTS.kept, [drawer.authorId]: PTS.kept });
        else if (entry.match) this.api.addScores({ [id]: PTS.kept });
      }
      chain.steps[s] = entry;
    });
    this.pending = {};
  }

  // ---------- reveal ----------

  _reveal() {
    const i = this.revealIndex;
    const chain = this.chains[i];
    const d = (ms) => this.api.dur(ms);
    const beats = [];
    let t = d(BEAT.title);
    const flip = this.mode === 'flip';
    chain.steps.forEach((st, s) => {
      let dur;
      if (st.kind === 'draw') {
        const strokes = st.drawing?.strokes?.length || 0;
        if (flip) dur = strokes ? Math.min(BEAT.flipMax, replayDuration(st.drawing, { max: BEAT.flipMax })) + BEAT.flipFrame : BEAT.blank;
        else dur = strokes ? Math.min(BEAT.drawMax, replayDuration(st.drawing, { max: BEAT.drawMax })) + BEAT.drawHold : BEAT.blank;
      } else dur = st.kind === 'guess' ? BEAT.guess : BEAT.text;
      beats.push({ step: s, at: t, dur: d(dur), replay: st.kind === 'draw' ? d(dur - (flip ? BEAT.flipFrame : BEAT.drawHold)) : 0 });
      t += d(dur);
    });
    const flipAt = flip ? t : null;
    if (flip) t += d(BEAT.flipbook);
    // verdict: does the last thing written still match the first sentence?
    const texts = chain.steps.filter((st) => st.kind !== 'draw');
    const last = texts[texts.length - 1];
    const straight = !flip && texts.length > 1 && kept(chain.steps[0].text, last.text);
    const crossed = chain.steps.findIndex((st) => st.kind === 'guess' && !st.match);
    if (straight && !chain.scored) {
      chain.scored = true;
      const deltas = {};
      for (const st of chain.steps) if (!st.auto) deltas[st.authorId] = (deltas[st.authorId] || 0) + PTS.straight;
      this.api.addScores(deltas);
    }
    chain.verdict = flip ? 'flip' : straight ? 'straight' : 'crossed';
    chain.crossedAt = crossed;
    const end = { at: t, verdict: chain.verdict, crossedAt: crossed, flipAt, lastStep: chain.steps.indexOf(last) };
    t += d(BEAT.end);
    this.api.enter('telephone-reveal', t, { index: i, count: this.chains.length, mode: this.mode, chain: this._pub(chain), beats, end }, {});
  }

  _pub(chain) {
    return { id: chain.id, ownerId: chain.ownerId, steps: chain.steps.map((st) => ({ kind: st.kind, text: st.text, drawing: st.drawing, authorId: st.authorId, auto: st.auto, match: st.match })) };
  }

  _vote() {
    const chain = this.chains[this.revealIndex];
    this.votes = {};
    const moments = chain.steps.map((st, s) => ({ key: `${chain.id}:${s}`, step: s, kind: st.kind, text: st.text, drawing: st.drawing, authorId: st.authorId, auto: st.auto }))
      .filter((m) => !m.auto);
    this.api.enter('telephone-vote', VOTE, { index: this.revealIndex, count: this.chains.length, chainId: chain.id, ownerId: chain.ownerId, moments }, {
      progress: () => {
        const done = {}; const counts = {};
        for (const id of this.seats) done[id] = !!this.votes[id];
        for (const k of Object.values(this.votes)) counts[k] = (counts[k] || 0) + 1;
        return { done, counts };
      },
    });
  }

  _tally() {
    const chain = this.chains[this.revealIndex];
    const deltas = {};
    for (const key of Object.values(this.votes)) {
      const s = Number(key.split(':')[1]);
      const st = chain.steps[s];
      if (!st) continue;
      this.allVotes[key] = (this.allVotes[key] || 0) + 1;
      deltas[st.authorId] = (deltas[st.authorId] || 0) + PTS.vote;
      st.votes = (st.votes || 0) + 1;
    }
    chain.votes = Object.keys(this.votes).length;
    this.api.addScores(deltas);
  }

  // ---------- awards ----------

  _awards() {
    let best = null;
    for (const chain of this.chains) {
      chain.steps.forEach((st, s) => {
        const v = st.votes || 0;
        if (v > 0 && (!best || v > best.votes || (v === best.votes && st.kind === 'draw' && best.kind !== 'draw'))) {
          best = { key: `${chain.id}:${s}`, chainId: chain.id, step: s, kind: st.kind, text: st.text, drawing: st.drawing, authorId: st.authorId, votes: v,
            prompt: s > 0 ? (chain.steps[s - 1].text || null) : null };
        }
      });
    }
    if (this.mode === 'flip') {
      const top = this.chains.slice().sort((a, b) => (b.votes || 0) - (a.votes || 0))[0];
      if (top) {
        const deltas = {};
        for (const st of top.steps) if (!st.auto) deltas[st.authorId] = (deltas[st.authorId] || 0) + PTS.flipBest;
        this.api.addScores(deltas);
      }
    }
    const score = (c) => c.steps.filter((st) => st.match).length;
    const straight = this.mode === 'flip' ? null : this.chains.slice().sort((a, b) => score(b) - score(a) || (b.verdict === 'straight') - (a.verdict === 'straight'))[0];
    const crossedList = this.chains.filter((c) => c.crossedAt > 0).sort((a, b) => a.crossedAt - b.crossedAt);
    const crossed = crossedList[0] || null;
    const brief = (c) => c && { chainId: c.id, ownerId: c.ownerId, first: c.steps[0].text, last: [...c.steps].reverse().find((st) => st.kind !== 'draw')?.text, matches: score(c), verdict: c.verdict,
      crossedBy: c.crossedAt > 0 ? c.steps[c.crossedAt].authorId : null };
    this.api.enter('telephone-awards', AWARDS, {
      mode: this.mode, moment: best, straight: brief(straight && score(straight) > 0 ? straight : null), crossed: brief(crossed),
      rows: this.api.players.map((p) => ({ id: p.id, score: p.score })),
    });
  }

  _finish() {
    this.api.finish(this.api.players.map((p) => ({ id: p.id, score: p.score })));
  }

  onLeave() { this.api.progress(); }
  dispose() {}
}
