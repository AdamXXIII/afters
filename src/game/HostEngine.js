// Host-authoritative game state machine (DESIGN 2 + 2.7).
// Pure logic: no DOM, no network. Inject `send`, `now` and `seed`.
// Runs only on the host phone. Every other phone (and the host's own UI) is a GameClient.

import { DUR, LIMITS, MIN_PLAYERS, MAX_PLAYERS, EMPTY_PLATE, AVATARS } from './constants.js';
import { scoreMatchup, scoreFact, scoreLastOrders } from './scoring.js';
import { computeAwards } from './awards.js';
import { mulberry32, shuffle, subSeed } from '../util/rng.js';
import { cleanInput, familySafe, isTooHonest, normalise } from '../util/text.js';
import { R1_PROMPTS, R2_FACTS, R3_PROMPTS } from '../content/index.js';

const newStats = () => ({ cleanPlates: 0, fooled: 0, truths: 0, r3Answers: 0, ties: 0, lastSubmits: 0, reactions: 0 });

export class HostEngine {
  /**
   * @param {object} o
   * @param {(msg:object, toPeerId?:string)=>void} o.send  broadcast when toPeerId omitted
   * @param {()=>number} [o.now]   host clock (ms)
   * @param {number} [o.seed]
   * @param {number} [o.speed]     divides every duration (tests/demo)
   * @param {string} o.room        4-letter code
   */
  constructor({ send, now = () => Date.now(), seed = (Math.random() * 2 ** 32) >>> 0, speed = 1, room = 'TEST' }) {
    this.send = send;
    this.now = now;
    this.seed = seed >>> 0;
    this.rng = mulberry32(this.seed);
    this.speed = speed;
    this.room = room;
    this.players = []; // ordered by join time
    this.peers = new Map(); // peerId -> playerId
    this.hostPeerId = null;
    this.settings = { adult: false, speakerId: null };
    this.seq = 0;
    this.phase = null;
    this.privFn = null;
    this.progressFn = null;
    this.earlyAt = null;
    this.paused = false;
    this.used = { r1: new Set(), r2: new Set(), r3: new Set() };
    this.g = null;
    this._idn = 0;
    this._lastReact = new Map();
    this._enter('lobby', null, {});
  }

  // ---------- public API ----------

  setHostPeer(peerId) { this.hostPeerId = peerId; }

  get hostPlayer() { return this.players.find((p) => p.peerId === this.hostPeerId) || null; }

  dur(ms) { return Math.round(ms / this.speed); }

  onPeerLeave(peerId) {
    const pid = this.peers.get(peerId);
    this.peers.delete(peerId);
    const p = this.player(pid);
    if (!p) return;
    if (this.phase.id === 'lobby') {
      this.players = this.players.filter((x) => x !== p);
      if (this.settings.speakerId === p.id) this.settings.speakerId = this.hostPlayer?.id || null;
    } else {
      p.connected = false;
      p.peerId = null;
    }
    this._broadcastLobby();
    this._checkEarly();
  }

  handle(peerId, msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'ping') {
      this.send({ type: 'pong', t0: msg.t0, t1: this.now() }, peerId);
      return;
    }
    if (msg.type === 'hello') return this._hello(peerId, msg);
    const p = this.player(this.peers.get(peerId));
    if (!p) return;
    const isHost = peerId === this.hostPeerId;
    const fresh = msg.seq === undefined || msg.seq === this.phase.seq;
    switch (msg.type) {
      case 'profile': return this._profile(p, msg);
      case 'settings': if (isHost) this._settings(msg); return;
      case 'start': if (isHost) this.start(); return;
      case 'skip': if (isHost) this._skip(); return;
      case 'again': if (isHost && this.phase.id === 'end') this.again(); return;
      case 'newTable': if (isHost && this.phase.id === 'end') this.newTable(); return;
      case 'kick': if (isHost) this._kick(msg.playerId); return;
      case 'react': return this._react(p, msg);
      case 'leave': return this.onPeerLeave(peerId);
      case 'submit': if (fresh) this._submit(p, msg); return;
      case 'vote': if (fresh) this._vote(p, msg); return;
      case 'pick': if (fresh) this._pick(p, msg); return;
      case 'swipe': if (fresh) this._swipe(p, msg); return;
      default:
    }
  }

  /** Call often (e.g. every 100 ms). Ends phases on time. */
  tick() {
    if (this.paused || !this.phase) return;
    const t = this.now();
    if ((this.phase.endsAt && t >= this.phase.endsAt) || (this.earlyAt && t >= this.earlyAt)) this.advance();
  }

  /** Jump to the next phase now (demo fast-forward, host skip). */
  advance() {
    this.earlyAt = null;
    const id = this.phase.id;
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

  start() {
    if (this.phase.id !== 'lobby') return false;
    const n = this.players.filter((p) => p.connected).length;
    if (n < MIN_PLAYERS) return false;
    this.players = this.players.filter((p) => p.connected);
    this._newGame();
    this._enter('intro', DUR.intro, {});
    return true;
  }

  again() {
    for (const p of this.players) { p.score = 0; p.boardScore = 0; p.stats = newStats(); }
    this.players = this.players.filter((p) => p.connected);
    if (this.players.length < MIN_PLAYERS) return this.newTable();
    this._newGame();
    this._enter('intro', DUR.intro, {});
  }

  newTable() {
    for (const p of this.players) { p.score = 0; p.boardScore = 0; p.stats = newStats(); }
    this.players = this.players.filter((p) => p.connected);
    this.g = null;
    this._enter('lobby', null, {});
    this._broadcastLobby();
  }

  player(id) { return this.players.find((p) => p.id === id) || null; }

  publicPlayers() {
    return this.players.map((p) => ({
      id: p.id, name: p.name, avatar: p.avatar, colour: AVATARS[p.avatar].colour,
      score: p.score, connected: p.connected, isHost: p.peerId !== null && p.peerId === this.hostPeerId,
    }));
  }

  /** Snapshot for reconnects / debugging (no secrets beyond what the phase already shows). */
  snapshot() {
    return { room: this.room, seq: this.seq, phase: this.phase, players: this.publicPlayers(), settings: this.settings };
  }

  // ---------- lobby ----------

  _hello(peerId, msg) {
    // Reconnect by token
    if (msg.token) {
      const p = this.players.find((x) => x.token === msg.token);
      if (p) {
        if (p.peerId && p.peerId !== peerId) this.peers.delete(p.peerId);
        p.peerId = peerId;
        p.connected = true;
        this.peers.set(peerId, p.id);
        this._welcome(p, peerId);
        return;
      }
    }
    if (this.phase.id !== 'lobby') return this.send({ type: 'refuse', reason: 'started' }, peerId);
    if (this.players.length >= MAX_PLAYERS) return this.send({ type: 'refuse', reason: 'full' }, peerId);
    const taken = new Set(this.players.map((p) => p.avatar));
    let avatar = Number.isInteger(msg.avatar) && !taken.has(msg.avatar) ? msg.avatar : AVATARS.findIndex((_, i) => !taken.has(i));
    const p = {
      id: `p${++this._idn}`,
      token: `${this.room}-${Math.floor(this.rng() * 1e9).toString(36)}${this._idn}`,
      peerId,
      name: this._name(msg.name, this._idn),
      avatar,
      score: 0,
      boardScore: 0,
      connected: true,
      joinedAt: this.now(),
      stats: newStats(),
    };
    this.players.push(p);
    this.peers.set(peerId, p.id);
    if (!this.settings.speakerId && peerId === this.hostPeerId) this.settings.speakerId = p.id;
    this._welcome(p, peerId);
    this._broadcastLobby();
  }

  _welcome(p, peerId) {
    this.send({ type: 'welcome', playerId: p.id, token: p.token, room: this.room, hostNow: this.now() }, peerId);
    this.send(this._lobbyMsg(), peerId);
    this._sendPhaseTo(p);
    if (this.progressFn) this.send(this._progressMsg(), peerId);
  }

  _name(raw, n) {
    let name = cleanInput(raw, LIMITS.name) || `Guest ${n}`;
    if (!this.settings.adult) name = familySafe(name);
    return name;
  }

  _profile(p, msg) {
    if (msg.name !== undefined) p.name = this._name(msg.name, this._idn);
    if (Number.isInteger(msg.avatar) && msg.avatar >= 0 && msg.avatar < AVATARS.length) {
      if (!this.players.some((x) => x !== p && x.avatar === msg.avatar)) p.avatar = msg.avatar;
    }
    this._broadcastLobby();
  }

  _settings(msg) {
    if (typeof msg.adult === 'boolean') this.settings.adult = msg.adult;
    if (msg.speakerId && this.player(msg.speakerId)) this.settings.speakerId = msg.speakerId;
    this._broadcastLobby();
  }

  _kick(playerId) {
    const p = this.player(playerId);
    if (!p || p.peerId === this.hostPeerId) return;
    if (p.peerId) this.send({ type: 'kick' }, p.peerId);
    this.onPeerLeave(p.peerId);
  }

  _lobbyMsg() {
    return { type: 'lobby', room: this.room, players: this.publicPlayers(), settings: this.settings, hostId: this.hostPlayer?.id || null };
  }

  _broadcastLobby() { this.send(this._lobbyMsg()); }

  _react(p, msg) {
    const t = this.now();
    if (t - (this._lastReact.get(p.id) || 0) < LIMITS.reactMs) return;
    this._lastReact.set(p.id, t);
    if (!['roll', 'rose', 'applause', 'groan'].includes(msg.kind)) return;
    p.stats.reactions += 1;
    this.send({ type: 'react', from: p.id, kind: msg.kind, at: t });
  }

  _skip() {
    if (!/intro$/.test(this.phase.id)) return;
    if (this.now() - this.phase.startsAt < this.dur(DUR['skip-after'])) return;
    this.advance();
  }

  // ---------- phase plumbing ----------

  _enter(id, duration, payload, privFn = null, progressFn = null) {
    this.seq += 1;
    this.earlyAt = null;
    const startsAt = this.now();
    this.phase = {
      type: 'phase',
      id,
      seq: this.seq,
      startsAt,
      endsAt: duration == null ? null : startsAt + this.dur(duration),
      duration: duration == null ? null : this.dur(duration),
      seed: Math.floor(this.rng() * 2 ** 32) >>> 0,
      speed: this.speed,
      payload,
    };
    this.privFn = privFn;
    this.progressFn = progressFn;
    for (const p of this.players) this._sendPhaseTo(p);
    if (progressFn) this.send(this._progressMsg());
  }

  _sendPhaseTo(p) {
    if (!p.peerId || !this.phase) return;
    const msg = { ...this.phase, players: this.publicPlayers(), private: this.privFn ? this.privFn(p) : null };
    this.send(msg, p.peerId);
  }

  _progressMsg() {
    return { type: 'progress', seq: this.seq, ...this.progressFn() };
  }

  _progress() {
    if (this.progressFn) this.send(this._progressMsg());
    this._checkEarly();
  }

  /** Ends the phase shortly after everyone (connected) has acted. */
  _checkEarly() {
    if (!this.progressFn || this.earlyAt) return;
    const { done } = this.progressFn();
    const need = this._activeFor(this.phase.id);
    if (need.length && need.every((p) => done[p.id])) {
      this.earlyAt = Math.min(this.phase.endsAt ?? Infinity, this.now() + this.dur(DUR['early-grace']));
    }
  }

  _activeFor(phaseId) {
    const connected = this.players.filter((p) => p.connected);
    if (phaseId === 'r1-vote') {
      const m = this.g.r1.matchups[this.g.r1.order[this.g.r1.index]];
      return connected.filter((p) => !m.authors.includes(p.id));
    }
    return connected;
  }

  _markSubmit(p) { this.g.lastSubmit = { id: p.id, at: this.now() }; this.g.submitters.add(p.id); }

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

  _addScores(deltas) {
    for (const [id, n] of Object.entries(deltas)) {
      const p = this.player(id);
      if (p) p.score += n;
    }
  }

  _take(list, usedSet, n, rng) {
    let pool = list.filter((x) => !usedSet.has(x.id));
    if (pool.length < n) { usedSet.clear(); pool = list.slice(); }
    const chosen = shuffle(pool, rng).slice(0, n);
    chosen.forEach((x) => usedSet.add(x.id));
    return chosen;
  }

  // ---------- game setup ----------

  _newGame() {
    const rng = mulberry32(Math.floor(this.rng() * 2 ** 32));
    const seats = shuffle(this.players.map((p) => p.id), rng);
    const N = seats.length;
    const prompts = this._take(R1_PROMPTS, this.used.r1, N, rng);
    const matchups = prompts.map((pr, i) => ({
      id: `m${i}`,
      prompt: pr.text,
      authors: [seats[i], seats[(i + 1) % N]],
      answers: {},
      votes: {},
      house: null,
    }));
    const facts = this._take(R2_FACTS, this.used.r2, N <= 5 ? 4 : 3, rng);
    const [r3] = this._take(R3_PROMPTS, this.used.r3, 1, rng);
    this.g = {
      seats,
      r1: { matchups, order: shuffle(matchups.map((_, i) => i), rng), index: 0 },
      r2: { facts, index: 0, porkies: {}, options: [], picks: {} },
      r3: { prompt: r3.text, answers: [], deck: [], swipes: {}, cheers: {} },
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

  _cleanAnswer(text, max) {
    let t = cleanInput(text, max);
    if (!this.settings.adult) t = familySafe(t);
    return t;
  }

  _submit(p, msg) {
    const id = this.phase.id;
    if (id === 'r1-write') {
      const m = this.g.r1.matchups.find((x) => x.id === msg.slot);
      if (!m || !m.authors.includes(p.id)) return;
      const t = this._cleanAnswer(msg.text, LIMITS.r1);
      if (!t) return;
      m.answers[p.id] = t;
      this._markSubmit(p);
      this.send({ type: 'ack', seq: this.seq, slot: msg.slot }, p.peerId);
      return this._progress();
    }
    if (id === 'r2-write') {
      const fact = this.g.r2.facts[this.g.r2.index];
      const t = this._cleanAnswer(msg.text, LIMITS.r2);
      if (!t) return;
      if (isTooHonest(t, fact)) {
        this.send({ type: 'reject', seq: this.seq, reason: 'too-honest' }, p.peerId);
        return;
      }
      this.g.r2.porkies[p.id] = t;
      this._markSubmit(p);
      this.send({ type: 'ack', seq: this.seq }, p.peerId);
      return this._progress();
    }
    if (id === 'r3-write') {
      const mine = this.g.r3.answers.filter((a) => a.authorId === p.id);
      if (mine.length >= LIMITS.r3Answers) return;
      const t = this._cleanAnswer(msg.text, LIMITS.r3);
      if (!t) return;
      this.g.r3.answers.push({ id: `c${this.g.r3.answers.length}`, authorId: p.id, text: t });
      p.stats.r3Answers += 1;
      this._markSubmit(p);
      this.send({ type: 'ack', seq: this.seq, n: mine.length + 1 }, p.peerId);
      return this._progress();
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
    if (this.phase.id !== 'r1-vote') return;
    const m = this.g.r1.matchups[this.g.r1.order[this.g.r1.index]];
    if (m.authors.includes(p.id) || !['A', 'B'].includes(msg.choice)) return;
    m.votes[p.id] = msg.choice;
    this._progress();
  }

  _r1Reveal() {
    const r1 = this.g.r1;
    const m = r1.matchups[r1.order[r1.index]];
    const voters = Object.keys(m.votes);
    const rng = mulberry32(subSeed(this.seed, m.id));
    m.house = voters.length === 1 && !m.empty[0] && !m.empty[1] ? (rng() < 0.5 ? 'A' : 'B') : null;
    const res = scoreMatchup(m);
    const deltas = {};
    m.authors.forEach((a, i) => { deltas[a] = res.points[i] + res.bonus[i]; });
    this._addScores(deltas);
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
    for (const h of f.house) {
      if (options.length >= 4) break;
      if (!byNorm.has(normalise(h))) options.push({ kind: 'house', text: h, authors: [] });
    }
    const rng = mulberry32(subSeed(this.seed, `${f.id}-opts`));
    r2.options = shuffle(options, rng).map((o, i) => ({ ...o, id: `o${i}` }));
    this._enter('r2-pick', DUR['r2-pick'], {
      index: r2.index, count: r2.facts.length, fact: { id: f.id, text: f.text },
      options: r2.options.map((o) => ({ id: o.id, text: o.text })),
    },
    (p) => ({ ownOptionId: r2.options.find((o) => o.authors.includes(p.id))?.id || null }),
    () => {
      const done = {};
      for (const p of this.players) done[p.id] = r2.picks[p.id] !== undefined;
      return { done, counts: {} };
    });
  }

  _pick(p, msg) {
    if (this.phase.id !== 'r2-pick') return;
    const o = this.g.r2.options.find((x) => x.id === msg.optionId);
    if (!o || o.authors.includes(p.id)) return;
    this.g.r2.picks[p.id] = o.id;
    this._progress();
  }

  _r2Reveal() {
    const r2 = this.g.r2;
    const f = r2.facts[r2.index];
    const { deltas, pickers } = scoreFact(r2.options, r2.picks);
    this._addScores(deltas);
    for (const o of r2.options) {
      if (o.kind === 'porky') o.authors.forEach((a) => { this.player(a).stats.fooled += pickers[o.id].length; });
      if (o.kind === 'truth') pickers[o.id].forEach((pid) => { this.player(pid).stats.truths += 1; });
    }
    const fakes = r2.options.filter((o) => o.kind !== 'truth');
    const zero = fakes.filter((o) => pickers[o.id].length === 0);
    const picked = fakes.filter((o) => pickers[o.id].length > 0).sort((a, b) => pickers[a.id].length - pickers[b.id].length);
    const steps = [];
    let t = 0;
    if (zero.length) { steps.push({ kind: 'nobody', optionIds: zero.map((o) => o.id), at: t, dur: 2000 }); t += 2000; }
    for (const o of picked) { steps.push({ kind: 'porky', optionId: o.id, at: t, dur: 3000 }); t += 3000; }
    const truth = r2.options.find((o) => o.kind === 'truth');
    steps.push({ kind: 'truth', optionId: truth.id, at: t, dur: 4000 }); t += 4000;
    steps.push({ kind: 'aside', at: t, dur: 2500 }); t += 2500;
    const total = Math.min(t, 28000);
    this._enter('r2-reveal', total, {
      index: r2.index, count: r2.facts.length, fact: { id: f.id, text: f.text }, aside: f.aside,
      options: r2.options.map((o) => ({ id: o.id, text: o.text, kind: o.kind, authors: o.authors, pickers: pickers[o.id] })),
      steps: steps.map((s) => ({ ...s, at: this.dur(s.at), dur: this.dur(s.dur) })),
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
        done[p.id] = counts[p.id] >= LIMITS.r3Answers;
      }
      return { done, counts };
    });
  }

  _r3Swipe() {
    const r3 = this.g.r3;
    const rng = mulberry32(subSeed(this.seed, 'deck'));
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
      prompt: r3.prompt, deck: r3.deck.map((c) => ({ id: c.id, text: c.text })), perCard: this.dur(perCard), glasses: LIMITS.glasses,
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
    if (this.phase.id !== 'r3-swipe') return;
    const r3 = this.g.r3;
    const card = r3.deck.find((c) => c.id === msg.cardId);
    if (!card || card.authorId === p.id) return;
    const s = (r3.swipes[p.id] ||= {});
    if (s[card.id] !== undefined) return;
    const used = Object.values(s).filter(Boolean).length;
    const cheers = !!msg.cheers && used < LIMITS.glasses;
    s[card.id] = cheers;
    if (cheers) (r3.cheers[card.id] ||= []).push(p.id);
    this._progress();
  }

  _r3Reveal() {
    const r3 = this.g.r3;
    const { deltas, toastIds } = scoreLastOrders(r3.deck, r3.cheers);
    this._addScores(deltas);
    const rng = mulberry32(subSeed(this.seed, 'top'));
    const ranked = shuffle(r3.deck, rng).sort((a, b) => (r3.cheers[b.id] || []).length - (r3.cheers[a.id] || []).length);
    const top = ranked.slice(0, 5).map((c, i) => ({
      id: c.id, text: c.text, authorId: c.authorId, rank: i + 1, glasses: r3.cheers[c.id] || [],
      points: 200 * (r3.cheers[c.id] || []).length + (toastIds.includes(c.id) ? 1000 : 0), toast: toastIds.includes(c.id),
    }));
    const cardDur = this.dur(DUR['r3-reveal-card']);
    const steps = top.slice().reverse().map((c, i) => ({ cardId: c.id, at: i * cardDur, dur: cardDur }));
    const total = DUR['r3-reveal-card'] * top.length + DUR['r3-reveal-toast'];
    this._enter('r3-reveal', total, { prompt: r3.prompt, top, steps, toastIds, toastAt: this.dur(DUR['r3-reveal-card'] * top.length), deltas });
  }

  // ---------- Podium / end ----------

  _podium() {
    const ranked = this.players.slice().sort((a, b) => b.score - a.score);
    const awards = computeAwards(this.players);
    const rows = ranked.map((p, i) => ({ id: p.id, score: p.score, rank: i + 1, award: awards[p.id] }));
    for (const p of this.players) p.boardScore = p.score;
    this._enter('podium', DUR.podium, { rows });
  }

  _end() {
    const ranked = this.players.slice().sort((a, b) => b.score - a.score);
    this._enter('end', null, { rows: ranked.map((p, i) => ({ id: p.id, score: p.score, rank: i + 1 })), hostId: this.hostPlayer?.id || null });
  }
}
