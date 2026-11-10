// Afters Classic host logic: the original 3-course show (Plate Up, Porkies, Last Orders),
// ported onto the box api (see ARCHITECTURE "How to add a game"). Runs on the host phone only.
import { DUR, LIMITS, EMPTY_PLATE } from '../../game/constants.js';
import { scoreMatchup, scoreFact, scoreLastOrders } from '../../game/scoring.js';
import { computeAwards } from '../../game/awards.js';
import { mulberry32, shuffle, subSeed } from '../../util/rng.js';
import { isTooHonest, normalise } from '../../util/text.js';
import { R1_PROMPTS } from './content/prompts.js';
import { R2_FACTS } from './content/facts.js';
import { R3_PROMPTS } from './content/lastOrders.js';

/** Porkies options all look alike: lower case, no trailing punctuation, single spaces
 *  (play-test: the truth was the only tidy, capitalised card, so it gave itself away). */
const plain = (t) => String(t || '').replace(/\s+/g, ' ').trim().replace(/[.!?,;:]+$/, '').toLowerCase();

export const newStats = () => ({ cleanPlates: 0, fooled: 0, truths: 0, r3Answers: 0, ties: 0, lastSubmits: 0, reactions: 0 });

export class ClassicHost {
  constructor(api) {
    this.api = api;
    this.g = null;
  }

  get players() { return this.api.players; }
  player(id) { return this.api.player(id); }

  start() {
    for (const p of this.players) p.stats = newStats();
    this._newGame();
    this.api.enter('intro', DUR.intro, { first: !this.api.history.length, plays: this.api.plays });
  }

  advance(id) {
    const g = this.g;
    switch (id) {
      case 'intro': return this._r1Intro();
      case 'r1-intro': return this._r1Write();
      case 'r1-write': this._closeR1Write(); return this._r1Vote(0);
      case 'r1-vote': return this._r1Reveal();
      case 'r1-reveal':
        return g.r1.index + 1 < g.r1.order.length ? this._r1Vote(g.r1.index + 1) : this._scores('r1-scores');
      case 'r1-scores': return this._r2Intro();
      case 'r2-intro': return this._r2Write(0);
      case 'r2-write': this._closeLate(); return this._r2Pick();
      case 'r2-pick': return this._r2Reveal();
      case 'r2-reveal':
        return g.r2.index + 1 < g.r2.facts.length ? this._r2Write(g.r2.index + 1) : this._scores('r2-scores');
      case 'r2-scores': return this._r3Intro();
      case 'r3-intro': return this._r3Write();
      case 'r3-write': this._closeLate(); return this._r3Swipe();
      case 'r3-swipe': return this._r3Reveal();
      case 'r3-reveal': return this._podium();
      case 'podium': return this._end();
      default:
    }
  }

  handle(p, msg, { fresh }) {
    if (!fresh) return;
    switch (msg.type) {
      case 'submit': return this._submit(p, msg);
      case 'vote': return this._vote(p, msg);
      case 'pick': return this._pick(p, msg);
      case 'swipe': return this._swipe(p, msg);
      case 'lot': return this._lot(p);
      default:
    }
  }

  /** Host may skip the podium once the cake has landed (play-test: 13 s with nothing to do). */
  canSkip(phaseId, since) { return phaseId === 'podium' && since >= this.api.dur(7000); }

  activeFor(phaseId, connected) {
    if (phaseId === 'r1-vote') {
      const m = this.g.r1.matchups[this.g.r1.order[this.g.r1.index]];
      return connected.filter((p) => !m.authors.includes(p.id));
    }
    return connected;
  }

  // ---------- helpers ----------

  _enter(id, dur, payload, priv = null, progress = null) {
    this.g && (this.g.straggler = null);
    this._progressNow = progress;
    const prog = progress && (() => ({ ...progress(), straggler: this.g?.straggler || null }));
    this.api.enter(id, dur, payload, { priv, progress: prog, final: id === 'end' });
  }

  _markSubmit(p) { this.g.lastSubmit = { id: p.id, at: this.api.now() }; this.g.submitters.add(p.id); }

  /** Everyone but one is done writing: pull the clock in to 10 s so the table isn't sat waiting.
   *  The straggler's id goes out in progress (`straggler`) so Cyril can call them out by name. */
  _squeeze() {
    const id = this.api.phase.id;
    if (!/-write$/.test(id) || this.g.squeezed === this.api.seq || !this.api.phase.endsAt) return;
    const live = this.players.filter((p) => p.connected);
    if (live.length < 3) return;
    const { done } = this.api.phase.id === id && this._progressNow ? this._progressNow() : { done: {} };
    const left = live.filter((p) => !done[p.id]);
    if (left.length !== 1) return;
    if (this.api.hurry(DUR.squeeze)) { this.g.squeezed = this.api.seq; this.g.straggler = left[0].id; }
  }

  _closeLate() {
    const ls = this.g.lastSubmit;
    if (ls && this.g.submitters.size >= 2) this.player(ls.id).stats.lastSubmits += 1;
    this.g.lastSubmit = null;
    this.g.submitters = new Set();
  }

  _scores(id) {
    const rows = this.players.map((p) => ({ id: p.id, score: p.score, prev: p.boardScore, delta: p.score - p.boardScore }))
      .sort((a, b) => b.score - a.score);
    const prevRank = [...rows].sort((a, b) => b.prev - a.prev).map((r) => r.id);
    rows.forEach((r) => { r.prevRank = prevRank.indexOf(r.id); });
    for (const p of this.players) p.boardScore = p.score;
    this._enter(id, DUR[id], { rows, round: id === 'r1-scores' ? 1 : 2 });
  }

  // ---------- game setup ----------

  _newGame() {
    const rng = mulberry32(Math.floor(this.api.rng() * 2 ** 32));
    const seats = shuffle(this.players.map((p) => p.id), rng);
    const N = seats.length;
    const prompts = this.api.take(R1_PROMPTS, 'classic-r1', N, rng);
    const matchups = prompts.map((pr, i) => ({
      id: `m${i}`,
      prompt: pr.text,
      authors: [seats[i], seats[(i + 1) % N]],
      answers: {},
      votes: {},
      house: null,
    }));
    const facts = this.api.take(R2_FACTS, 'classic-r2', N <= 5 ? 3 : 2, rng);
    const [r3] = this.api.take(R3_PROMPTS, 'classic-r3', 1, rng);
    this.g = {
      seats,
      r1: { matchups, order: shuffle(matchups.map((_, i) => i), rng), index: 0 },
      r2: { facts, index: 0, porkies: {}, options: [], picks: {} },
      r3: { prompt: r3.text, answers: [], deck: [], swipes: {}, cheers: {}, finished: new Set() },
      lastSubmit: null,
      submitters: new Set(),
    };
  }

  // ---------- Round 1: Plate Up ----------

  _r1Intro() { this._enter('r1-intro', DUR['r1-intro'], { round: 1 }); }

  _r1Write() {
    const { matchups } = this.g.r1;
    const assignments = {};
    for (const p of this.players) {
      assignments[p.id] = matchups.filter((m) => m.authors.includes(p.id)).map((m) => ({ matchupId: m.id, prompt: m.prompt }));
    }
    this._enter('r1-write', DUR['r1-write'], { assignments, max: LIMITS.r1 },
      (p) => ({ prompts: assignments[p.id] }),
      () => {
        const done = {}; const counts = {};
        for (const p of this.players) {
          const n = matchups.filter((m) => m.authors.includes(p.id) && m.answers[p.id] !== undefined).length;
          counts[p.id] = n;
          done[p.id] = n >= 2;
        }
        return { done, counts };
      });
  }

  _submit(p, msg) {
    const id = this.api.phase.id;
    if (id === 'r1-write') {
      const m = this.g.r1.matchups.find((x) => x.id === msg.slot);
      if (!m || !m.authors.includes(p.id)) return;
      const t = this.api.clean(msg.text, LIMITS.r1);
      if (!t) return;
      m.answers[p.id] = t;
      this._markSubmit(p);
      this.api.ack(p, { slot: msg.slot });
      this._squeeze();
      return this.api.progress();
    }
    if (id === 'r2-write') {
      const fact = this.g.r2.facts[this.g.r2.index];
      const t = this.api.clean(msg.text, LIMITS.r2);
      if (!t) return;
      if (isTooHonest(t, fact)) return this.api.reject(p, 'too-honest');
      this.g.r2.porkies[p.id] = t;
      this._markSubmit(p);
      this.api.ack(p);
      this._squeeze();
      return this.api.progress();
    }
    if (id === 'r3-write') {
      const mine = this.g.r3.answers.filter((a) => a.authorId === p.id);
      if (mine.length >= LIMITS.r3Answers) return;
      const t = this.api.clean(msg.text, LIMITS.r3);
      if (!t) return;
      this.g.r3.answers.push({ id: `c${this.g.r3.answers.length}`, authorId: p.id, text: t });
      p.stats.r3Answers += 1;
      this._markSubmit(p);
      this.api.ack(p, { n: mine.length + 1 });
      this._squeeze();
      return this.api.progress();
    }
  }

  _closeR1Write() {
    for (const m of this.g.r1.matchups) {
      m.empty = m.authors.map((a) => m.answers[a] === undefined);
      m.authors.forEach((a) => { if (m.answers[a] === undefined) m.answers[a] = EMPTY_PLATE; });
    }
    this._closeLate();
  }

  _r1Vote(index) {
    const r1 = this.g.r1;
    r1.index = index;
    const m = r1.matchups[r1.order[index]];
    const payload = {
      index, count: r1.order.length, matchupId: m.id, prompt: m.prompt,
      answers: [{ key: 'A', text: m.answers[m.authors[0]] }, { key: 'B', text: m.answers[m.authors[1]] }],
      voterIds: this.players.filter((p) => !m.authors.includes(p.id)).map((p) => p.id),
    };
    this._enter('r1-vote', DUR['r1-vote'], payload,
      (p) => ({ role: m.authors.includes(p.id) ? 'author' : 'voter', mine: m.authors.indexOf(p.id) === 0 ? 'A' : m.authors.indexOf(p.id) === 1 ? 'B' : null }),
      () => {
        const done = {};
        for (const p of this.players) done[p.id] = m.authors.includes(p.id) || m.votes[p.id] !== undefined;
        return { done, counts: {} };
      });
  }

  _vote(p, msg) {
    if (this.api.phase.id !== 'r1-vote') return;
    const m = this.g.r1.matchups[this.g.r1.order[this.g.r1.index]];
    if (m.authors.includes(p.id) || !['A', 'B'].includes(msg.choice)) return;
    m.votes[p.id] = msg.choice;
    this.api.progress();
  }

  _r1Reveal() {
    const r1 = this.g.r1;
    const m = r1.matchups[r1.order[r1.index]];
    const voters = Object.keys(m.votes);
    const rng = mulberry32(subSeed(this.api.seed, m.id));
    m.house = voters.length === 1 && !m.empty[0] && !m.empty[1] ? (rng() < 0.5 ? 'A' : 'B') : null;
    const res = scoreMatchup(m);
    const deltas = {};
    m.authors.forEach((a, i) => { deltas[a] = res.points[i] + res.bonus[i]; });
    this.api.addScores(deltas);
    if (res.outcome === 'clean') m.authors.forEach((a, i) => { if (res.bonus[i]) this.player(a).stats.cleanPlates += 1; });
    if (res.outcome === 'tie') m.authors.forEach((a) => { this.player(a).stats.ties += 1; });
    const answers = ['A', 'B'].map((key, i) => ({
      key, text: m.answers[m.authors[i]], authorId: m.authors[i], empty: m.empty[i],
      votes: Object.entries(m.votes).filter(([, v]) => v === key).map(([id]) => id),
      house: m.house === key, points: res.points[i], bonus: res.bonus[i],
    }));
    this._enter('r1-reveal', DUR['r1-reveal'], {
      index: r1.index, count: r1.order.length, prompt: m.prompt, answers, outcome: res.outcome, deltas,
    });
  }

  // ---------- Round 2: Porkies ----------

  _r2Intro() { this._enter('r2-intro', DUR['r2-intro'], { round: 2 }); }

  _r2Write(index) {
    const r2 = this.g.r2;
    r2.index = index;
    r2.porkies = {};
    r2.picks = {};
    const f = r2.facts[index];
    this._enter('r2-write', DUR['r2-write'], { index, count: r2.facts.length, fact: { id: f.id, text: f.text }, max: LIMITS.r2 },
      null,
      () => {
        const done = {};
        for (const p of this.players) done[p.id] = r2.porkies[p.id] !== undefined;
        return { done, counts: {} };
      });
  }

  _r2Pick() {
    const r2 = this.g.r2;
    const f = r2.facts[r2.index];
    const byNorm = new Map();
    for (const [pid, text] of Object.entries(r2.porkies)) {
      const k = normalise(text);
      if (byNorm.has(k)) byNorm.get(k).authors.push(pid);
      else byNorm.set(k, { kind: 'porky', text, authors: [pid] });
    }
    const options = [...byNorm.values(), { kind: 'truth', text: f.answer, authors: [] }];
    for (const hh of f.house) {
      if (options.length >= 4) break;
      if (!byNorm.has(normalise(hh))) options.push({ kind: 'house', text: hh, authors: [] });
    }
    const rng = mulberry32(subSeed(this.api.seed, `${f.id}-opts`));
    r2.options = shuffle(options, rng).map((o, i) => ({ ...o, id: `o${i}` }));
    this._enter('r2-pick', DUR['r2-pick'], {
      index: r2.index, count: r2.facts.length, fact: { id: f.id, text: f.text },
      options: r2.options.map((o) => ({ id: o.id, text: plain(o.text) })),
    },
    (p) => ({ ownOptionId: r2.options.find((o) => o.authors.includes(p.id))?.id || null }),
    () => {
      const done = {};
      for (const p of this.players) done[p.id] = r2.picks[p.id] !== undefined;
      return { done, counts: {} };
    });
  }

  _pick(p, msg) {
    if (this.api.phase.id !== 'r2-pick') return;
    const o = this.g.r2.options.find((x) => x.id === msg.optionId);
    if (!o || o.authors.includes(p.id)) return;
    this.g.r2.picks[p.id] = o.id;
    this.api.progress();
  }

  _r2Reveal() {
    const r2 = this.g.r2;
    const f = r2.facts[r2.index];
    const { deltas, pickers } = scoreFact(r2.options, r2.picks);
    this.api.addScores(deltas);
    for (const o of r2.options) {
      if (o.kind === 'porky') o.authors.forEach((a) => { this.player(a).stats.fooled += pickers[o.id].length; });
      if (o.kind === 'truth') pickers[o.id].forEach((pid) => { this.player(pid).stats.truths += 1; });
    }
    const fakes = r2.options.filter((o) => o.kind !== 'truth');
    const zero = fakes.filter((o) => pickers[o.id].length === 0);
    const picked = fakes.filter((o) => pickers[o.id].length > 0).sort((a, b) => pickers[a.id].length - pickers[b.id].length);
    // Punchier reveal (2026-11-09): shorter beats, the truth lands sooner.
    const steps = [];
    let t = 0;
    if (zero.length) { steps.push({ kind: 'nobody', optionIds: zero.map((o) => o.id), at: t, dur: 2200 }); t += 2200; }
    for (const o of picked) { steps.push({ kind: 'porky', optionId: o.id, at: t, dur: 2800 }); t += 2800; }
    const truth = r2.options.find((o) => o.kind === 'truth');
    steps.push({ kind: 'truth', optionId: truth.id, at: t, dur: 3400 }); t += 3400;
    steps.push({ kind: 'aside', at: t, dur: 2600 }); t += 2600;
    const total = Math.min(t, 22000);
    this._enter('r2-reveal', total, {
      index: r2.index, count: r2.facts.length, fact: { id: f.id, text: f.text }, aside: f.aside,
      options: r2.options.map((o) => ({ id: o.id, text: plain(o.text), kind: o.kind, authors: o.authors, pickers: pickers[o.id] })),
      steps: steps.map((s) => ({ ...s, at: this.api.dur(s.at), dur: this.api.dur(s.dur) })),
      deltas,
    });
  }

  // ---------- Round 3: Last Orders ----------

  _r3Intro() { this._enter('r3-intro', DUR['r3-intro'], { round: 3 }); }

  _r3Write() {
    const r3 = this.g.r3;
    this._enter('r3-write', DUR['r3-write'], { prompt: r3.prompt, max: LIMITS.r3, maxAnswers: LIMITS.r3Answers }, null, () => {
      const done = {}; const counts = {};
      for (const p of this.players) {
        counts[p.id] = r3.answers.filter((a) => a.authorId === p.id).length;
        done[p.id] = counts[p.id] >= LIMITS.r3Answers || (counts[p.id] > 0 && r3.finished.has(p.id));
      }
      return { done, counts };
    });
  }

  /** "That's my lot": done writing Last Orders with fewer than 4 answers. */
  _lot(p) {
    if (this.api.phase.id !== 'r3-write') return;
    if (!this.g.r3.answers.some((a) => a.authorId === p.id)) return;
    this.g.r3.finished.add(p.id);
    this.api.ack(p, { lot: true });
    this._squeeze();
    this.api.progress();
  }

  _r3Swipe() {
    const r3 = this.g.r3;
    const rng = mulberry32(subSeed(this.api.seed, 'deck'));
    let deck = r3.answers.slice();
    if (deck.length > LIMITS.deckCap) {
      const byAuthor = new Map();
      for (const a of shuffle(deck, rng)) {
        if (!byAuthor.has(a.authorId)) byAuthor.set(a.authorId, []);
        byAuthor.get(a.authorId).push(a);
      }
      const chosen = [];
      for (const list of byAuthor.values()) chosen.push(...list.slice(0, 2));
      const rest = shuffle(deck.filter((a) => !chosen.includes(a)), rng);
      deck = chosen.concat(rest).slice(0, LIMITS.deckCap);
    }
    r3.deck = shuffle(deck, rng);
    r3.swipes = {};
    r3.cheers = {};
    const n = Math.max(1, r3.deck.length);
    const perCard = Math.min(DUR['r3-card'], Math.floor(DUR['r3-swipe-max'] / n));
    this._enter('r3-swipe', perCard * n, {
      prompt: r3.prompt, deck: r3.deck.map((c) => ({ id: c.id, text: c.text })), perCard: this.api.dur(perCard), glasses: LIMITS.glasses,
    },
    (p) => ({ ownCardIds: r3.deck.filter((c) => c.authorId === p.id).map((c) => c.id) }),
    () => {
      const done = {}; const counts = {};
      for (const p of this.players) {
        const s = r3.swipes[p.id] || {};
        counts[p.id] = Object.values(s).filter(Boolean).length;
        done[p.id] = false; // swipe phase is timeline-driven, never ends early
      }
      return { done, counts };
    });
  }

  _swipe(p, msg) {
    if (this.api.phase.id !== 'r3-swipe') return;
    const r3 = this.g.r3;
    const card = r3.deck.find((c) => c.id === msg.cardId);
    if (!card || card.authorId === p.id) return;
    const s = (r3.swipes[p.id] ||= {});
    if (s[card.id] !== undefined) return;
    const used = Object.values(s).filter(Boolean).length;
    const cheers = !!msg.cheers && used < LIMITS.glasses;
    s[card.id] = cheers;
    if (cheers) (r3.cheers[card.id] ||= []).push(p.id);
    this.api.progress();
  }

  _r3Reveal() {
    const r3 = this.g.r3;
    const { deltas, toastIds } = scoreLastOrders(r3.deck, r3.cheers);
    this.api.addScores(deltas);
    const rng = mulberry32(subSeed(this.api.seed, 'top'));
    const ranked = shuffle(r3.deck, rng).sort((a, b) => (r3.cheers[b.id] || []).length - (r3.cheers[a.id] || []).length);
    const top = ranked.slice(0, 5).map((c, i) => ({
      id: c.id, text: c.text, authorId: c.authorId, rank: i + 1, glasses: r3.cheers[c.id] || [],
      points: 200 * (r3.cheers[c.id] || []).length + (toastIds.includes(c.id) ? 1000 : 0), toast: toastIds.includes(c.id),
    }));
    const cardDur = this.api.dur(DUR['r3-reveal-card']);
    const steps = top.slice().reverse().map((c, i) => ({ cardId: c.id, at: i * cardDur, dur: cardDur }));
    const total = DUR['r3-reveal-card'] * top.length + DUR['r3-reveal-toast'];
    this._enter('r3-reveal', total, { prompt: r3.prompt, top, steps, toastIds, toastAt: this.api.dur(DUR['r3-reveal-card'] * top.length), deltas });
  }

  // ---------- Podium / end ----------

  _podium() {
    const ranked = this.players.slice().sort((a, b) => b.score - a.score);
    const awards = computeAwards(this.players);
    const prevOrder = this.players.slice().sort((a, b) => b.boardScore - a.boardScore).map((p) => p.id);
    const rows = ranked.map((p, i) => ({
      id: p.id, score: p.score, rank: i + 1, award: awards[p.id],
      prev: p.boardScore, delta: p.score - p.boardScore, prevRank: prevOrder.indexOf(p.id) + 1,
    }));
    for (const p of this.players) p.boardScore = p.score;
    // tonight's table is updated as the podium starts, so the end screen can show it
    this.night = this.api.record(this.players.map((p) => ({ id: p.id, score: p.score })));
    this._enter('podium', DUR.podium, { rows });
  }

  _end() {
    const ranked = this.players.slice().sort((a, b) => b.score - a.score);
    const night = this.night || [];
    this._enter('end', null, {
      rows: ranked.map((p, i) => ({ id: p.id, score: p.score, rank: i + 1, cherries: night.find((r) => r.id === p.id)?.cherries || 0 })),
      hostId: this.api.hostPlayer?.id || null,
    });
  }
}
