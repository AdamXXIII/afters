// Host-authoritative BOX engine (DESIGN 2 + 2.7, ARCHITECTURE "How to add a game").
// Pure logic: no DOM, no network. Inject `send`, `now` and `seed`. Runs only on the host phone.
//
// The box owns the table: players, reconnects, settings (content rating), reactions, the phase
// clock, the menu ("dessert trolley") and tonight's running leaderboard. Each game in
// src/games/<id>/ plugs in a host object (createHost(api)) that runs its own phases through `api`.
//
// Box phases: lobby -> menu -> <game phases...> -> results (or the game's own final phase) -> menu

import { DUR, LIMITS, MIN_PLAYERS, MAX_PLAYERS, AVATARS, NIGHT_POINTS } from './constants.js';
import { mulberry32, shuffle, subSeed } from '../util/rng.js';
import { cleanInput, familySafe } from '../util/text.js';
import { GAMES, gameById } from '../games/index.js';

const BOX_MSGS = new Set(['profile', 'settings', 'start', 'choose', 'focus', 'fancy', 'skip', 'again', 'menu', 'newTable', 'kick', 'react', 'leave', 'endGame', 'toLobby']);
const JOINABLE = new Set(['lobby', 'menu', 'results']);

export class HostEngine {
  /**
   * @param {object} o
   * @param {(msg:object, toPeerId?:string)=>void} o.send  broadcast when toPeerId omitted
   * @param {()=>number} [o.now]   host clock (ms)
   * @param {number} [o.seed]
   * @param {number} [o.speed]     divides every duration (tests/demo)
   * @param {string} o.room        4-letter code
   */
  constructor({ send, now = () => Date.now(), seed = (Math.random() * 2 ** 32) >>> 0, speed = 1, room = 'TEST', games = GAMES }) {
    this.send = send;
    this.now = now;
    this.seed = seed >>> 0;
    this.rng = mulberry32(this.seed);
    this.speed = speed;
    this.room = room;
    this.games = games;
    this.players = []; // ordered by join time
    this.peers = new Map(); // peerId -> playerId
    this.hostPeerId = null;
    this.settings = { rating: 'family', adult: false, speakerId: null };
    this.seq = 0;
    this.phase = null;
    this.privFn = null;
    this.progressFn = null;
    this.earlyAt = null;
    this.paused = false;
    this.game = null; // { def, host, plays }
    this.lastGameId = null;
    this.history = []; // [{gameId, winnerIds}]
    this.menu = { focus: null, fancy: {} };
    this.used = new Map(); // deck key -> Set of used ids (whole night, per rating)
    this._idn = 0;
    this._lastReact = new Map();
    this.api = this._makeApi();
    this._enter('lobby', null, {});
  }

  // ---------- public API ----------

  setHostPeer(peerId) { this.hostPeerId = peerId; }

  get hostPlayer() { return this.players.find((p) => p.peerId === this.hostPeerId) || null; }

  get adult() { return this.settings.rating === 'adult'; }

  /** Kept for old callers: classic code read `engine.g`. */
  get g() { return this.game?.host?.g || null; }

  dur(ms) { return Math.round(ms / this.speed); }

  onPeerLeave(peerId) {
    const pid = this.peers.get(peerId);
    this.peers.delete(peerId);
    const p = this.player(pid);
    if (!p) return;
    if (this.phase.id === 'lobby' || (!this.game && JOINABLE.has(this.phase.id) && !this.history.length)) {
      this.players = this.players.filter((x) => x !== p);
      if (this.settings.speakerId === p.id) this.settings.speakerId = this.hostPlayer?.id || null;
      delete this.menu.fancy[p.id];
    } else {
      p.connected = false;
      p.peerId = null;
      try { this.game?.host.onLeave?.(p); } catch (e) { console.error('[game] onLeave', e); }
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
    if (BOX_MSGS.has(msg.type)) {
      switch (msg.type) {
        case 'profile': return this._profile(p, msg);
        case 'settings': if (isHost) this._settings(msg); return;
        case 'start': if (isHost) this.start(); return;
        case 'choose': if (isHost) this.choose(msg.gameId); return;
        case 'focus': if (isHost) this._focus(msg.gameId); return;
        case 'fancy': return this._fancy(p, msg.gameId);
        case 'skip': if (isHost) this._skip(); return;
        case 'again': if (isHost && this._isFinal()) this.again(); return;
        case 'menu': if (isHost && this._isFinal()) this.toMenu(); return;
        case 'newTable': if (isHost && (this._isFinal() || this.phase.id === 'menu')) this.newTable(); return;
        case 'endGame': if (isHost && this.game) this.toMenu(); return; // stop mid-game, no cherries
        case 'toLobby': if (isHost && this.phase.id !== 'lobby') this.toLobby(); return;
        case 'kick': if (isHost) this._kick(msg.playerId); return;
        case 'react': return this._react(p, msg);
        case 'leave': return this.onPeerLeave(peerId);
        default: return;
      }
    }
    if (!this.game) return;
    try {
      this.game.host.handle?.(p, msg, { fresh, isHost });
    } catch (e) { console.error('[game] handle', e); }
  }

  /** Call often (e.g. every 100 ms). Ends phases on time. */
  tick() {
    if (this.paused || !this.phase) return;
    const t = this.now();
    if ((this.phase.endsAt && t >= this.phase.endsAt) || (this.earlyAt && t >= this.earlyAt)) this.advance();
  }

  /** Jump to the next phase now (demo fast-forward, host skip, timers). */
  advance() {
    this.earlyAt = null;
    const id = this.phase.id;
    if (id === 'lobby' || id === 'menu' || id === 'results') return;
    if (!this.game) return;
    try {
      this.game.host.advance(id);
    } catch (e) {
      console.error('[game] advance', e);
      this.toMenu();
    }
  }

  /** Lobby -> menu. */
  start() {
    if (this.phase.id !== 'lobby') return false;
    const n = this.players.filter((p) => p.connected).length;
    if (n < MIN_PLAYERS) return false;
    this.players = this.players.filter((p) => p.connected);
    this.toMenu();
    return true;
  }

  /** Host picked a game from the menu. Returns false for coming-soon tiles or too few players. */
  choose(gameId) {
    if (this.phase.id !== 'menu' && !this._isFinal()) return false;
    const def = gameById(gameId, this.games);
    if (!def || !def.createHost) return false;
    const connected = this.players.filter((p) => p.connected);
    const [min, max] = def.players || [MIN_PLAYERS, MAX_PLAYERS];
    if (connected.length < min || connected.length > max) return false;
    this.players = connected;
    for (const p of this.players) { p.score = 0; p.boardScore = 0; }
    this.game = { def, host: null, plays: (this.lastGameId === gameId ? (this.game?.plays || 0) : 0) + 1, recorded: false };
    this.lastGameId = gameId;
    this.menu = { focus: null, fancy: {} };
    this.game.host = def.createHost(this.api);
    this.game.host.start();
    return true;
  }

  /** Same game again, same players. */
  again() {
    const id = this.game?.def.id || this.lastGameId;
    if (!id || !this.choose(id)) this.toMenu();
  }

  toMenu() {
    try { this.game?.host?.dispose?.(); } catch { /* ignore */ }
    this.game = null;
    this.players = this.players.filter((p) => p.connected);
    this.menu = { focus: null, fancy: {} };
    this._enter('menu', null, { night: this._nightRows(), history: this.history.slice(-6), last: this.lastGameId }, null,
      () => ({ done: {}, counts: {}, focus: this.menu.focus, fancy: { ...this.menu.fancy } }));
    this._broadcastLobby();
  }

  /** Host: back to the lobby (new people can sit down, avatars change), keeping tonight's scores. */
  toLobby() {
    try { this.game?.host?.dispose?.(); } catch { /* ignore */ }
    this.game = null;
    this.players = this.players.filter((p) => p.connected);
    this.menu = { focus: null, fancy: {} };
    this._enter('lobby', null, {});
    this._broadcastLobby();
  }

  newTable() {
    try { this.game?.host?.dispose?.(); } catch { /* ignore */ }
    for (const p of this.players) { p.score = 0; p.boardScore = 0; p.night = 0; p.nightPrev = 0; }
    this.players = this.players.filter((p) => p.connected);
    this.game = null;
    this.history = [];
    this._enter('lobby', null, {});
    this._broadcastLobby();
  }

  player(id) { return this.players.find((p) => p.id === id) || null; }

  publicPlayers() {
    return this.players.map((p) => ({
      id: p.id, name: p.name, avatar: p.avatar, colour: AVATARS[p.avatar].colour,
      score: p.score, night: p.night || 0, connected: p.connected, isHost: p.peerId !== null && p.peerId === this.hostPeerId,
    }));
  }

  /** Snapshot for reconnects / debugging (no secrets beyond what the phase already shows). */
  snapshot() {
    return { room: this.room, seq: this.seq, phase: this.phase, players: this.publicPlayers(), settings: this.settings, history: this.history };
  }

  // ---------- the api handed to each game's host ----------

  _makeApi() {
    const eng = this;
    return {
      get players() { return eng.players; },
      get connected() { return eng.players.filter((p) => p.connected); },
      player: (id) => eng.player(id),
      get settings() { return eng.settings; },
      get rating() { return eng.settings.rating; },
      get adult() { return eng.adult; },
      get seed() { return eng.seed; },
      get rng() { return eng.rng; },
      get speed() { return eng.speed; },
      get phase() { return eng.phase; },
      get seq() { return eng.seq; },
      get hostPlayer() { return eng.hostPlayer; },
      get plays() { return eng.game?.plays || 1; },
      /** Games finished tonight: [{gameId, winnerIds}] */
      get history() { return eng.history; },
      now: () => eng.now(),
      dur: (ms) => eng.dur(ms),
      send: (msg, toPlayerId) => {
        if (toPlayerId === undefined) return eng.send(msg);
        const p = eng.player(toPlayerId);
        if (p?.peerId) eng.send(msg, p.peerId);
      },
      /** Start a phase. o.priv(player) -> private payload; o.progress() -> {done, counts, ...}; o.final -> host may pick Menu/Same again. */
      enter: (id, duration, payload, o = {}) => eng._enter(id, duration, payload, o.priv || null, o.progress || null, o),
      /** Re-send progress (and end early once everyone active is done). */
      progress: () => eng._progress(),
      /** Pull the phase end in to now + ms (never later than it already was) and re-send the phase. */
      hurry: (ms) => eng._hurry(ms),
      ack: (p, extra = {}) => p.peerId && eng.send({ type: 'ack', seq: eng.seq, ...extra }, p.peerId),
      reject: (p, reason, extra = {}) => p.peerId && eng.send({ type: 'reject', seq: eng.seq, reason, ...extra }, p.peerId),
      addScores: (deltas) => eng._addScores(deltas),
      /** Pick n items from a {family, adult} deck without repeats tonight. key names the deck. */
      take: (deck, key, n, rng = eng.rng) => eng._take(deck, key, n, rng),
      deck: (deck) => eng._deck(deck),
      clean: (text, max) => eng._clean(text, max),
      /** Record this game's result into tonight's table (idempotent). rows: [{id, score}] */
      record: (rows) => eng._record(rows),
      /** Record + show the shared results screen (host then picks Menu / Same again). */
      finish: (rows, extra = {}) => eng._finish(rows, extra),
      toMenu: () => eng.toMenu(),
      /** Deterministic rng for this phase + salt (same on every replay of the seed). */
      sub: (salt) => mulberry32(subSeed(eng.seed, `${eng.seq}-${salt}`)),
    };
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
        try { this.game?.host.onRejoin?.(p); } catch { /* ignore */ }
        this._welcome(p, peerId);
        this._broadcastLobby();
        return;
      }
    }
    if (!JOINABLE.has(this.phase.id)) return this.send({ type: 'refuse', reason: 'started' }, peerId);
    if (this.players.length >= MAX_PLAYERS) return this.send({ type: 'refuse', reason: 'full' }, peerId);
    const taken = new Set(this.players.map((p) => p.avatar));
    const avatar = Number.isInteger(msg.avatar) && !taken.has(msg.avatar) ? msg.avatar : AVATARS.findIndex((_, i) => !taken.has(i));
    const p = {
      id: `p${++this._idn}`,
      token: `${this.room}-${Math.floor(this.rng() * 1e9).toString(36)}${this._idn}`,
      peerId,
      name: this._name(msg.name, this._idn),
      avatar,
      score: 0,
      boardScore: 0,
      night: 0,
      nightPrev: 0,
      connected: true,
      joinedAt: this.now(),
      stats: {},
    };
    this.players.push(p);
    this.peers.set(peerId, p.id);
    if (!this.settings.speakerId && peerId === this.hostPeerId) this.settings.speakerId = p.id;
    this._welcome(p, peerId);
    this._broadcastLobby();
    if (this.phase.id === 'menu') this._progress();
  }

  _welcome(p, peerId) {
    this.send({ type: 'welcome', playerId: p.id, token: p.token, room: this.room, hostNow: this.now() }, peerId);
    this.send(this._lobbyMsg(), peerId);
    this._sendPhaseTo(p);
    if (this.progressFn) this.send(this._progressMsg(), peerId);
  }

  _name(raw, n) {
    let name = cleanInput(raw, LIMITS.name) || `Guest ${n}`;
    if (!this.adult) name = familySafe(name);
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
    let rating = null;
    if (msg.rating === 'family' || msg.rating === 'adult') rating = msg.rating;
    else if (typeof msg.adult === 'boolean') rating = msg.adult ? 'adult' : 'family';
    if (rating) { this.settings.rating = rating; this.settings.adult = rating === 'adult'; }
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
    p.stats.reactions = (p.stats.reactions || 0) + 1;
    this.send({ type: 'react', from: p.id, kind: msg.kind, at: t });
  }

  _skip() {
    const since = this.now() - this.phase.startsAt;
    const gameSkip = this.game?.host.canSkip?.(this.phase.id, since);
    if (!/intro$/.test(this.phase.id) && !gameSkip) return;
    if (since < this.dur(DUR['skip-after'])) return;
    this.advance();
  }

  // ---------- menu ----------

  _focus(gameId) {
    if (this.phase.id !== 'menu' || (gameId !== null && !gameById(gameId, this.games))) return;
    this.menu.focus = gameId;
    this._progress();
  }

  _fancy(p, gameId) {
    if (this.phase.id !== 'menu') return;
    if (gameId === null || this.menu.fancy[p.id] === gameId) delete this.menu.fancy[p.id];
    else if (gameById(gameId, this.games)) this.menu.fancy[p.id] = gameId;
    this._progress();
  }

  _isFinal() { return this.phase.id === 'results' || !!this.phase.final; }

  // ---------- tonight's table ----------

  _record(rows) {
    if (!this.game || this.game.recorded) return null;
    this.game.recorded = true;
    // A game may pass explicit places (`rank` on every row) when score alone doesn't decide
    // (e.g. Same Here: the Wobbly Chair holder can't win even with the top score).
    const explicit = rows.length > 0 && rows.every((r) => Number.isFinite(r.rank));
    const sorted = rows.slice().sort((a, b) => (explicit ? a.rank - b.rank : 0) || b.score - a.score);
    const out = [];
    let rank = 0;
    sorted.forEach((r, i) => {
      if (explicit) rank = r.rank;
      else if (i === 0 || r.score !== sorted[i - 1].score) rank = i + 1;
      const pts = rank <= NIGHT_POINTS.length ? NIGHT_POINTS[rank - 1] : 1;
      out.push({ id: r.id, score: r.score, rank, cherries: pts });
    });
    for (const p of this.players) p.nightPrev = p.night || 0;
    for (const r of out) { const p = this.player(r.id); if (p) p.night = (p.night || 0) + r.cherries; }
    this.history.push({ gameId: this.game.def.id, winnerIds: out.filter((r) => r.rank === 1).map((r) => r.id) });
    this._broadcastLobby();
    return out;
  }

  _nightRows() {
    const rows = this.players.map((p) => ({ id: p.id, night: p.night || 0, prev: p.nightPrev || 0, delta: (p.night || 0) - (p.nightPrev || 0) }))
      .sort((a, b) => b.night - a.night);
    const prevOrder = [...rows].sort((a, b) => b.prev - a.prev).map((r) => r.id);
    let rank = 0;
    rows.forEach((r, i) => {
      if (i === 0 || r.night !== rows[i - 1].night) rank = i + 1;
      r.rank = rank;
      r.prevRank = prevOrder.indexOf(r.id);
    });
    return rows;
  }

  _finish(rows, extra = {}) {
    const ranked = this._record(rows) || rows;
    this._enter('results', null, {
      gameId: this.game?.def.id, title: this.game?.def.title, rows: ranked, night: this._nightRows(), ...extra,
    }, null, null, { final: true });
  }

  // ---------- phase plumbing ----------

  _enter(id, duration, payload, privFn = null, progressFn = null, o = {}) {
    this.seq += 1;
    this.earlyAt = null;
    const startsAt = this.now();
    this.phase = {
      type: 'phase',
      id,
      game: this.game?.def.id || null,
      final: !!o.final,
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
    this._activeFn = o.active || null;
    for (const p of this.players) this._sendPhaseTo(p);
    if (progressFn) this.send(this._progressMsg());
  }

  _hurry(ms) {
    const ph = this.phase;
    if (!ph?.endsAt) return false;
    const at = this.now() + this.dur(ms);
    if (at >= ph.endsAt) return false;
    ph.endsAt = at;
    for (const p of this.players) this._sendPhaseTo(p);
    return true;
  }

  _sendPhaseTo(p) {
    if (!p.peerId || !this.phase) return;
    let priv = null;
    try { priv = this.privFn ? this.privFn(p) : null; } catch (e) { console.error('[game] priv', e); }
    this.send({ ...this.phase, players: this.publicPlayers(), private: priv }, p.peerId);
  }

  _progressMsg() {
    return { type: 'progress', seq: this.seq, ...this.progressFn() };
  }

  _progress() {
    if (this.progressFn) this.send(this._progressMsg());
    this._checkEarly();
  }

  /** Ends the phase shortly after everyone (connected + active) has acted. */
  _checkEarly() {
    if (!this.progressFn || this.earlyAt || !this.game) return;
    const { done } = this.progressFn();
    const connected = this.players.filter((p) => p.connected);
    let need = connected;
    if (this._activeFn) need = this._activeFn(connected);
    else if (this.game.host.activeFor) need = this.game.host.activeFor(this.phase.id, connected);
    if (need.length && need.every((p) => done?.[p.id])) {
      this.earlyAt = Math.min(this.phase.endsAt ?? Infinity, this.now() + this.dur(DUR['early-grace']));
    }
  }

  _addScores(deltas) {
    for (const [id, n] of Object.entries(deltas)) {
      const p = this.player(id);
      if (p) p.score += n;
    }
  }

  _deck(deck) {
    if (Array.isArray(deck)) return deck;
    const fam = deck?.family || [];
    return this.adult && deck?.adult?.length ? deck.adult : fam;
  }

  _take(deck, key, n, rng) {
    const list = this._deck(deck);
    const k = `${key}:${this.adult ? 'adult' : 'family'}`;
    if (!this.used.has(k)) this.used.set(k, new Set());
    const usedSet = this.used.get(k);
    let pool = list.filter((x) => !usedSet.has(x.id ?? x));
    if (pool.length < n) { usedSet.clear(); pool = list.slice(); }
    const chosen = shuffle(pool, rng).slice(0, n);
    chosen.forEach((x) => usedSet.add(x.id ?? x));
    return chosen;
  }

  _clean(text, max) {
    let t = cleanInput(text, max);
    if (!this.adult) t = familySafe(t);
    return t;
  }
}
