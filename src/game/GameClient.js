// Every phone (including the host's own UI) talks to the HostEngine through a GameClient.
// It mirrors public state, keeps a host-clock offset (DESIGN 2.7) and offers action helpers.

import { Emitter } from '../util/emitter.js';

// `game` is free scratch space for a game's optimistic per-phase state (cleared every phase).
const freshMine = (seq) => ({ seq, submitted: {}, r3: [], vote: null, pick: null, swipes: {}, rejected: 0, game: {} });

export class GameClient extends Emitter {
  /**
   * @param {{makeTransport:()=>import('../net/Transport.js').TransportBase, label?:string}} o
   */
  constructor({ makeTransport, label = 'client' }) {
    super();
    this.makeTransport = makeTransport;
    this.label = label;
    this.transport = null;
    this.state = {
      status: 'idle', // idle | connecting | joined | refused | reconnecting | lost | left
      error: null,
      room: null,
      me: null,
      token: null,
      hostId: null,
      players: [],
      settings: { rating: 'family', adult: false, speakerId: null },
      phase: null,
      progress: { seq: 0, done: {}, counts: {} },
      offset: 0,
      rtt: 0,
      mine: freshMine(0),
    };
    this._samples = [];
    this._pingTimer = null;
    this._reconnectTimer = null;
    this._unsubs = [];
  }

  // ---------- connection ----------

  /** Join room `code`. Resolves on welcome, rejects with Error(code) on refuse/no-room. */
  async join(code, { name, avatar, token } = {}) {
    this.state.room = code;
    this.state.status = 'connecting';
    this._profile = { name, avatar };
    this._changed();
    await this._open(code);
    return this._hello(token);
  }

  async _open(code) {
    this._detach();
    const t = this.makeTransport();
    this.transport = t;
    this._unsubs.push(t.onMessage((m) => this._onMessage(m)));
    this._unsubs.push(t.onPeer((pid, ev) => { if (ev === 'leave' && pid === 'host') this._lostHost(); }));
    await t.connect(code);
  }

  _detach() {
    this._unsubs.forEach((u) => u());
    this._unsubs = [];
    if (this.transport) try { this.transport.close(); } catch { /* ignore */ }
    this.transport = null;
  }

  _hello(token) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { off(); reject(Object.assign(new Error('timeout'), { code: 'timeout' })); }, 10000);
      const off = this.on('_handshake', (m) => {
        clearTimeout(timer);
        off();
        if (m.type === 'welcome') resolve(m);
        else reject(Object.assign(new Error(m.reason), { code: m.reason }));
      });
      this.transport.send({ type: 'hello', name: this._profile?.name, avatar: this._profile?.avatar, token: token || this.state.token || undefined });
    });
  }

  _lostHost() {
    if (this.state.status === 'left' || this.state.status === 'refused') return;
    this.state.status = 'reconnecting';
    this._changed();
    this.emit('status', 'reconnecting');
    this._scheduleReconnect(Date.now());
  }

  _scheduleReconnect(since) {
    clearTimeout(this._reconnectTimer);
    if (Date.now() - since > 90000) {
      this.state.status = 'lost';
      this._changed();
      return;
    }
    this._reconnectTimer = setTimeout(() => this.retry(since), 2000);
  }

  /** Try to reconnect now (Retry button). */
  async retry(since = Date.now()) {
    if (!this.state.room || this.state.status === 'left') return;
    try {
      await this._open(this.state.room);
      await this._hello(this.state.token);
    } catch (e) {
      this._scheduleReconnect(since);
    }
  }

  leave() {
    this.transport?.send({ type: 'leave' });
    this.state.status = 'left';
    clearInterval(this._pingTimer);
    clearTimeout(this._reconnectTimer);
    setTimeout(() => this._detach(), 50);
    this._changed();
  }

  // ---------- clock ----------

  now() { return Date.now() + this.state.offset; }

  _startClockSync() {
    clearInterval(this._pingTimer);
    this._samples = [];
    let n = 0;
    const burst = () => {
      n = 0;
      const one = () => {
        if (n++ >= 5 || !this.transport) return;
        this.transport.send({ type: 'ping', t0: Date.now() });
        setTimeout(one, 60);
      };
      one();
    };
    burst();
    this._pingTimer = setInterval(burst, 20000);
  }

  _onPong(m) {
    const t2 = Date.now();
    const rtt = t2 - m.t0;
    this._samples.push({ rtt, offset: m.t1 + rtt / 2 - t2 });
    if (this._samples.length > 10) this._samples.shift();
    const best = this._samples.slice().sort((a, b) => a.rtt - b.rtt).slice(0, 3).map((s) => s.offset).sort((a, b) => a - b);
    this.state.offset = best[Math.floor(best.length / 2)];
    this.state.rtt = rtt;
  }

  // ---------- inbound ----------

  _onMessage(m) {
    const s = this.state;
    switch (m.type) {
      case 'welcome':
        s.me = m.playerId;
        s.token = m.token;
        s.room = m.room;
        s.status = 'joined';
        s.offset = m.hostNow - Date.now();
        this.emit('_handshake', m);
        this._startClockSync();
        this.emit('status', 'joined');
        break;
      case 'refuse':
        s.status = 'refused';
        s.error = m.reason;
        this.emit('_handshake', m);
        break;
      case 'pong': this._onPong(m); return;
      case 'lobby':
        s.players = m.players;
        s.settings = m.settings;
        s.hostId = m.hostId;
        s.room = m.room;
        break;
      case 'phase': {
        const isNew = !s.phase || m.seq !== s.phase.seq;
        s.phase = m;
        if (m.players) s.players = m.players;
        if (isNew) {
          s.mine = freshMine(m.seq);
          s.progress = { seq: m.seq, done: {}, counts: {} };
        }
        this._changed();
        if (isNew) this.emit('phase', m);
        return;
      }
      case 'progress':
        if (m.seq === s.phase?.seq) s.progress = m;
        break;
      case 'ack':
        break;
      case 'reject':
        if (m.seq === s.phase?.seq) {
          s.mine.submitted = {};
          s.mine.rejected += 1;
        }
        this.emit('reject', m);
        break;
      case 'react':
        this.emit('react', m);
        return;
      case 'kick':
        s.status = 'left';
        s.error = 'kicked';
        this._detach();
        break;
      default:
        return;
    }
    this._changed();
  }

  _changed() { this.emit('change', this.state); }

  // ---------- helpers ----------

  get me() { return this.state.players.find((p) => p.id === this.state.me) || null; }
  get isHost() { return !!this.state.me && this.state.me === this.state.hostId; }
  player(id) { return this.state.players.find((p) => p.id === id) || null; }

  _send(msg) { this.transport?.send({ ...msg, seq: this.state.phase?.seq }); }

  // ---------- actions ----------

  setProfile({ name, avatar }) { this.transport?.send({ type: 'profile', name, avatar }); }
  setSettings(settings) { this.transport?.send({ type: 'settings', ...settings }); }
  start() { this.transport?.send({ type: 'start' }); }
  skip() { this.transport?.send({ type: 'skip' }); }
  again() { this.transport?.send({ type: 'again' }); }
  /** Box menu: host picks / browses a game; anyone can say which one they fancy (null clears). */
  chooseGame(gameId) { this.transport?.send({ type: 'choose', gameId }); }
  focusGame(gameId) { this.transport?.send({ type: 'focus', gameId }); }
  fancyGame(gameId) { this.transport?.send({ type: 'fancy', gameId }); }
  toMenu() { this.transport?.send({ type: 'menu' }); }
  /** Host only: stop the game now and go back to the games menu (no cherries for it). */
  endGame() { this.transport?.send({ type: 'endGame' }); }
  /** Host only: back to the lobby, keeping tonight's scores. */
  toLobby() { this.transport?.send({ type: 'toLobby' }); }

  /**
   * Generic game action for game modules: sends {type, ...data, seq} to the host's game.
   * Pass `mine` to merge optimistic local state into state.mine.game (cleared each phase).
   */
  act(type, data = {}, mine = null) {
    if (mine) Object.assign(this.state.mine.game, mine);
    this._send({ type, ...data });
    if (mine) this._changed();
  }
  newTable() { this.transport?.send({ type: 'newTable' }); }
  kick(playerId) { this.transport?.send({ type: 'kick', playerId }); }
  react(kind) { this.transport?.send({ type: 'react', kind }); }

  /** Round 1: slot = matchupId. Round 2/3: slot omitted. */
  submit(text, slot) {
    const mine = this.state.mine;
    const id = this.state.phase?.id;
    if (id === 'r3-write') mine.r3.push(text);
    else mine.submitted[slot || 'only'] = text;
    this._send({ type: 'submit', text, slot });
    this._changed();
  }

  vote(choice) { this.state.mine.vote = choice; this._send({ type: 'vote', choice }); this._changed(); }
  pick(optionId) { this.state.mine.pick = optionId; this._send({ type: 'pick', optionId }); this._changed(); }
  swipe(cardId, cheers) {
    if (this.state.mine.swipes[cardId] !== undefined) return;
    this.state.mine.swipes[cardId] = !!cheers;
    this._send({ type: 'swipe', cardId, cheers: !!cheers });
    this._changed();
  }
}
