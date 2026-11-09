// App orchestrator: boots the stage + UI, owns hosting/joining, resolves which screen to show
// from the GameClient state, builds the per-screen ctx, and handles reactions/overlays.
import { Stage } from './stage/Stage.js';
import { Router } from './ui/router.js';
import { Bubbles } from './ui/bubble.js';
import { mountRail } from './ui/rail.js';
import { h, iconButton, toast } from './ui/components.js';
import { haptic } from './ui/haptics.js';
import { audio } from './audio/synth.js';
import { GameClient } from './game/GameClient.js';
import { openHostRoom } from './game/hostRoom.js';
import { LocalTransport } from './net/LocalTransport.js';
import { PeerTransport } from './net/PeerTransport.js';
import { createBot, attachBrain } from './bots.js';
import { line } from './content/lines.js';
import { AVATARS, MIN_PLAYERS } from './game/constants.js';
import { params } from './util/params.js';
import { store } from './util/storage.js';
import { SCREENS, OVERLAYS } from './screens/index.js';

const REDUCED = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export class App {
  constructor() {
    this.params = params;
    this.client = null;
    this.room = null; // host only: {engine, transport, code, close}
    this.bots = [];
    this.brain = null;
    this.preScreen = 'title';
    this.overlay = null;
    this.frozen = params.freeze;
    this.frozenT = params.t;
    this.demo = params.demo;
    this.ready = false;
    this.settings = { textSize: 1, reducedMotion: REDUCED, ...store.get('settings', {}) };
    this._groans = [];
    this._lastScreen = null;
    this._suppress = false; // demo fast-forward hides intermediate screens
  }

  // ---------- boot ----------

  async boot() {
    this.applySettings();
    const canvas = document.getElementById('stage');
    const automated = typeof navigator !== 'undefined' && navigator.webdriver;
    this.stage = new Stage(canvas, { quality: params.quality, reducedMotion: this.settings.reducedMotion, autoQuality: !automated, maxFps: params.fps || (automated ? 4 : 0) });
    this.router = new Router({
      stage: this.stage,
      showEl: document.getElementById('show'),
      sheetEl: document.getElementById('sheet-body'),
      stripEl: document.getElementById('strip'),
    });
    for (const def of SCREENS) this.router.register(def);
    this.bubbles = new Bubbles({ host: document.getElementById('bubbles'), stage: this.stage });
    mountRail(document.getElementById('rail'), (kind) => this.client?.react(kind));
    this._topbar();
    this._viewport();
    document.addEventListener('pointerdown', () => audio.unlock(), { passive: true });
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('dblclick', (e) => e.preventDefault());
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this._wakeLock(); });
    this.stage.onFrame(() => this._frame());
    this.stage.start();

    if (params.demo) {
      const { runDemo } = await import('./demo.js');
      await runDemo(this, params.demo);
    } else if (params.bots > 0 || params.autoplay) {
      await this.createTable(params.name || 'You', { bots: Math.max(params.bots, params.autoplay ? 4 : 0) });
      if (params.autoplay) this.setAutopilot(true);
    } else if (params.room) {
      this.preScreen = 'join';
    }
    this.render();
    this.ready = true;
    document.body.classList.add('booted');
  }

  applySettings() {
    document.documentElement.style.setProperty('--ts', String(this.settings.textSize || 1));
    document.documentElement.dataset.reducedMotion = this.settings.reducedMotion ? '1' : '0';
  }

  saveSettings(patch) {
    Object.assign(this.settings, patch);
    store.set('settings', this.settings);
    this.applySettings();
    if ('reducedMotion' in patch) { this.stage.reduced = patch.reducedMotion; this.stage.cyril.reduced = patch.reducedMotion; }
  }

  _topbar() {
    const bar = document.getElementById('topbar');
    bar.replaceChildren(iconButton('gear', { label: 'Settings', onClick: () => this.openOverlay('settings') }));
  }

  _viewport() {
    const vv = window.visualViewport;
    const apply = () => {
      const H = window.innerHeight;
      const vh = vv ? vv.height : H;
      const kb = vh < H * 0.75;
      document.body.classList.toggle('kb-open', kb);
      document.documentElement.style.setProperty('--app-h', `${Math.round(vh)}px`);
      const app = document.getElementById('app');
      if (app) app.style.transform = vv && vv.offsetTop ? `translateY(${vv.offsetTop}px)` : '';
      if (document.body.dataset.layout === 'input') this.stage.setLayout('input', { stripPx: kb ? 76 : 132 });
    };
    vv?.addEventListener('resize', apply);
    vv?.addEventListener('scroll', apply);
    window.addEventListener('resize', apply);
    apply();
  }

  async _wakeLock() {
    if (!('wakeLock' in navigator) || !this.client || this.client.state.status !== 'joined') return;
    try {
      if (this._lock && !this._lock.released) return;
      this._lock = await navigator.wakeLock.request('screen');
    } catch { /* not allowed right now */ }
  }

  // ---------- hosting / joining ----------

  _transportsForHost() {
    const local = new LocalTransport({ role: 'host', bridge: params.transport === 'local' });
    if (params.transport === 'local' || params.demo) return [local];
    return [local, new PeerTransport({ role: 'host', signal: params.signal })];
  }

  _clientTransport() {
    if (params.transport === 'local') return new LocalTransport({ role: 'client', bridge: true });
    return new PeerTransport({ role: 'client', signal: params.signal });
  }

  /** Open a table on this phone and join it as the host player. */
  async createTable(name, { bots = 0, code = null, seed = params.seed, speed = params.speed, botMode = 'realtime' } = {}) {
    let room;
    try {
      room = await openHostRoom({ makeTransports: () => this._transportsForHost(), code, seed: seed ?? undefined, speed });
    } catch (e) {
      if (params.transport === 'auto') {
        toast('Couldn\'t reach the table server. This table is on this phone only.');
        room = await openHostRoom({ makeTransports: () => [new LocalTransport({ role: 'host' })], code, seed: seed ?? undefined, speed });
      } else throw e;
    }
    this.room = room;
    const t = new LocalTransport({ role: 'client' });
    room.engine.setHostPeer(t.id);
    const client = new GameClient({ makeTransport: () => (t.closed ? new LocalTransport({ role: 'client', id: t.id }) : t), label: 'host' });
    this._attachClient(client);
    await client.join(room.code, { name, avatar: store.get('avatar', undefined) });
    for (let i = 0; i < bots; i++) await this.addBot({ mode: botMode, speed });
    return room.code;
  }

  async addBot({ mode = 'realtime', speed = params.speed } = {}) {
    if (!this.room) return null;
    const index = this.bots.length + 1;
    const bot = await createBot({ code: this.room.code, index, seed: params.seed || 7, mode, speed, react: !params.e2e });
    this.bots.push(bot);
    return bot;
  }

  /** Join someone else's table. Throws Error with .code: no-room | started | full | timeout */
  async joinTable(code, name) {
    const client = new GameClient({ makeTransport: () => this._clientTransport(), label: 'player' });
    this._attachClient(client);
    try {
      await client.join(code, { name, avatar: store.get('avatar', undefined) });
    } catch (e) {
      this._detachClient();
      throw e;
    }
  }

  _attachClient(client) {
    this._detachClient();
    this.client = client;
    this._unsubs = [
      client.on('change', () => this.render()),
      client.on('phase', (p) => this._onPhase(p)),
      client.on('react', (m) => this._onReact(m)),
      client.on('reject', (m) => { if (m.reason === 'too-honest') this.say(line('r2TooHonest'), { compact: true }); }),
      client.on('status', (s) => { if (s === 'joined') this._wakeLock(); }),
    ];
    if (params.autopilot) this.setAutopilot(true);
  }

  _detachClient() {
    this._unsubs?.forEach((u) => u());
    this._unsubs = [];
    this.brain?.detach();
    this.brain = null;
    this.client = null;
  }

  /** Local player plays itself (autoplay / tests). */
  setAutopilot(on) {
    this.brain?.detach();
    this.brain = null;
    if (on && this.client) this.brain = attachBrain(this.client, { mode: 'realtime', speed: params.speed, seed: (params.seed || 3) + 99 });
    if (on && this.client?.isHost) this._autoStart = true;
  }

  leaveTable() {
    this.client?.leave();
    this._detachClient();
    for (const b of this.bots) b.client.leave();
    this.bots = [];
    this.room?.close();
    this.room = null;
    this.preScreen = 'title';
    audio.wantMusic(false);
    this.stage.setPodium(null);
    this.stage.setPlayers([]);
    this.render();
  }

  go(preScreen) {
    this.preScreen = preScreen;
    this.render();
  }

  // ---------- overlays (settings, reconnect) ----------

  openOverlay(id) {
    if (this.overlay?.id === id) return;
    this.closeOverlay();
    const def = OVERLAYS.find((d) => d.id === id);
    if (!def) return;
    const host = document.getElementById('overlay');
    const el = h('div.overlay-root', { dataset: { overlay: id } });
    host.append(el);
    const inst = def.mount({ overlay: el }, this.ctx(id)) || {};
    this.overlay = { id, el, inst };
    document.body.dataset.overlay = id;
  }

  closeOverlay() {
    if (!this.overlay) return;
    const { el, inst } = this.overlay;
    inst.unmount?.();
    el.classList.add('fade-out');
    setTimeout(() => el.remove(), 200);
    this.overlay = null;
    delete document.body.dataset.overlay;
  }

  // ---------- screen resolution ----------

  /** Which screen id should this phone show right now? */
  resolveScreen() {
    const c = this.client;
    if (!c || !['joined', 'reconnecting', 'lost'].includes(c.state.status) || !c.state.phase) {
      return this.preScreen === 'lobby' ? 'title' : this.preScreen;
    }
    const ph = c.state.phase;
    const me = c.state.me;
    const mine = c.state.mine;
    switch (ph.id) {
      case 'lobby': return 'lobby';
      case 'r1-write': {
        const mineSlots = ph.private?.prompts?.length ?? 2;
        const n = Object.keys(mine.submitted).length;
        return n >= mineSlots || c.state.progress.done[me] ? 'r1-wait' : 'r1-write';
      }
      case 'r2-write':
        return mine.submitted.only !== undefined || c.state.progress.done[me] ? 'r2-wait' : 'r2-write';
      default:
        return ph.id;
    }
  }

  render() {
    if (this._suppress || !this.router) return;
    const id = this.resolveScreen();
    const seq = this.client?.state.phase?.seq ?? 0;
    const pre = ['title', 'create', 'join'].includes(id);
    const key = pre ? id : `${id}:${seq}`;
    const ctx = this.ctx(id);
    this._lastScreen = id;
    this.router.go(id, ctx, key);
    if (this.overlay) this.overlay.inst.update?.(ctx);

    // reconnect overlay follows connection status
    const st = this.client?.state.status;
    if ((st === 'reconnecting' || st === 'lost') && this.overlay?.id !== 'reconnect') this.openOverlay('reconnect');
    if (st === 'joined' && this.overlay?.id === 'reconnect') this.closeOverlay();

    // avatars on the table follow the roster
    this.stage.setPlayers(this.client?.state.players || []);
    const inGame = !!this.client?.state.phase && this.client.state.phase.id !== 'lobby';
    const s = this.client?.state;
    audio.setSpeaker(!!s && s.me && s.settings?.speakerId === s.me);
    audio.wantMusic(inGame);

    if (this._autoStart && this.client?.isHost && s.phase?.id === 'lobby' && s.players.length >= MIN_PLAYERS) {
      this._autoStart = false;
      setTimeout(() => this.client?.start(), 600);
    }
  }

  /** Build the context object every screen receives. */
  ctx(screenId = this._lastScreen) {
    const app = this;
    const c = this.client;
    const s = c?.state;
    const phase = s?.phase || null;
    const players = s?.players || [];
    const meId = s?.me || null;
    const frozenT = this.frozen ? (this.frozenT ?? this._demoT?.[screenId] ?? (phase?.duration ? phase.duration * 0.3 : 0)) : null;
    return {
      app,
      screenId,
      client: c,
      state: s,
      phase,
      payload: phase?.payload || {},
      priv: phase?.private || {},
      progress: s?.progress || { done: {}, counts: {} },
      mine: s?.mine || { submitted: {}, r3: [], swipes: {} },
      players,
      meId,
      me: players.find((p) => p.id === meId) || null,
      player: (id) => players.find((p) => p.id === id) || null,
      isHost: !!c?.isHost,
      isSpeaker: !!s && s.settings?.speakerId === meId,
      room: s?.room || this.room?.code || null,
      settings: s?.settings || {},
      duration: phase?.duration || 0,
      now: () => (c ? c.now() : Date.now()),
      elapsed: () => (frozenT !== null ? frozenT : phase ? Math.max(0, (c.now() - phase.startsAt)) : 0),
      remaining: () => (frozenT !== null ? Math.max(0, (phase?.duration || 0) - frozenT) : phase?.endsAt ? Math.max(0, phase.endsAt - c.now()) : 0),
      frozen: this.frozen,
      demo: this.demo,
      reduced: this.settings.reducedMotion,
      stage: this.stage,
      cyril: this.stage.cyril,
      say: (lines, o) => this.say(lines, o),
      line,
      audio,
      haptic,
      toast,
      avatars: AVATARS,
      go: (id) => this.go(id),
      actions: {
        createTable: (name) => this.createTable(name),
        joinTable: (code, name) => this.joinTable(code, name),
        leave: () => this.leaveTable(),
        openSettings: () => this.openOverlay('settings'),
        closeOverlay: () => this.closeOverlay(),
        addBot: () => this.addBot(),
      },
    };
  }

  say(lines, o = {}) {
    if (this._suppress) return Promise.resolve();
    return this.bubbles.say(lines, { instant: this.frozen, ...o });
  }

  // ---------- events ----------

  _onPhase(p) {
    if (this._suppress) return;
    this.bubbles.clear();
    this.stage.cyril.setMood('calm');
    if (p.id !== 'podium' && p.id !== 'end') this.stage.setPodium(null);
    const m = audio.music;
    if (m) m.setIntensity(/write/.test(p.id) ? 'write' : 'normal');
  }

  _onReact(m) {
    if (this._suppress) return;
    const p = this.client?.player(m.from);
    if (m.kind === 'roll' || m.kind === 'rose') {
      this.stage.throwReaction(m.kind);
      setTimeout(() => audio.sfx(m.kind === 'roll' ? 'fwump' : 'flutter'), 700);
    } else {
      this._burst(m.kind, p);
      audio.sfx(m.kind);
    }
    if (m.kind === 'groan') {
      const now = Date.now();
      this._groans = this._groans.filter((t) => now - t < 2000);
      this._groans.push(now);
      if (this._groans.length >= 5) {
        this._groans = [];
        this.stage.cyril.react('shock');
        this.say(line('mindFlame'), { hold: 1200 });
      }
    }
    if (m.from === this.client?.state.me) haptic('tap');
  }

  _burst(kind, player) {
    const host = document.getElementById('bubbles');
    const chipEl = document.querySelector(`#show .chip[data-pid="${player?.id}"], #strip .chip[data-pid="${player?.id}"]`);
    let x = window.innerWidth / 2 + (Math.random() - 0.5) * 160;
    let y = window.innerHeight - 120;
    if (chipEl) { const r = chipEl.getBoundingClientRect(); x = r.left + 22; y = r.top + 22; }
    const colour = AVATARS[player?.avatar]?.colour || '#C89B3C';
    const rays = Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2;
      return `<line x1="${32 + Math.cos(a) * 12}" y1="${32 + Math.sin(a) * 12}" x2="${32 + Math.cos(a) * (kind === 'groan' ? 20 : 28)}" y2="${32 + Math.sin(a) * (kind === 'groan' ? 20 : 28)}" stroke="${colour}" stroke-width="4" stroke-linecap="round"/>`;
    }).join('');
    const el = h('div.burst', { style: { left: `${x}px`, top: `${y}px` }, html: `<svg viewBox="0 0 64 64">${rays}${kind === 'groan' ? `<circle cx="32" cy="32" r="8" fill="none" stroke="${colour}" stroke-width="3"/>` : ''}</svg>` });
    host.append(el);
    setTimeout(() => el.remove(), 750);
  }

  _frame() {
    const c = this.client;
    const ph = c?.state.phase;
    if (!ph || !ph.endsAt || this.frozen) return;
    const rem = ph.endsAt - c.now();
    const hurry = rem > 0 && rem <= 10000 && /write|vote|pick/.test(ph.id);
    this.stage.cyril.setMood(hurry ? 'hurry' : 'calm');
    if (audio.music && /write/.test(ph.id)) audio.music.setIntensity(hurry ? 'hurry' : 'write');
  }

  /** Debug/test API on window.__afters */
  debugApi() {
    const app = this;
    return {
      get ready() { return app.ready; },
      get screen() { return app._lastScreen; },
      get phase() { return app.client?.state.phase?.id || null; },
      get room() { return app.client?.state.room || null; },
      get status() { return app.client?.state.status || 'idle'; },
      get players() { return app.client?.state.players || []; },
      app,
      autopilot: (on = true) => app.setAutopilot(on),
      stats: () => app.stage.snapshotStats(),
      engine: () => app.room?.engine || null,
    };
  }
}
