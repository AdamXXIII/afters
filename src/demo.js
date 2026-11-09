// ?demo=<screen-id>: jump straight to a screen with bots and deterministic data (DESIGN 4).
// The real HostEngine + bots run; we fast-forward phases with instant bots, then stop on the
// target. &freeze=1 pauses the engine and pins time at a good-looking moment (or &t=ms).
//
// Box entries live here; each game adds its own via `demos` in src/games/<id>/index.js
// (every game demo first goes lobby -> menu -> chooses that game, then fast-forwards).
import { attachBrain } from './bots.js';
import { params } from './util/params.js';
import { GAMES } from './games/index.js';

const settle = async (n = 3) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)); };

/** Pretend a couple of games have already been played tonight (menu/results look lived-in). */
function fakeNight(engine) {
  const ps = engine.players;
  const pts = [[5, 3, 2, 1, 1, 1, 1, 1], [3, 5, 1, 2, 1, 1, 1, 1]];
  ps.forEach((p, i) => { p.nightPrev = pts[0][i] || 1; p.night = (pts[0][i] || 1) + (pts[1][i] || 1); });
  engine.history = [{ gameId: 'classic', winnerIds: [ps[0].id] }, { gameId: 'classic', winnerIds: [ps[1].id] }];
}

/**
 * Target specs. match(engine, meId) -> bool. me/bots: 'idle' | 'act' | 'some' on the target phase.
 * t: frozen elapsed ms (number or (phase) => number) used when &freeze=1.
 * box: 'lobby' | 'menu' | 'results' for box screens; game: which game a game demo plays.
 */
export const DEMOS = {
  lobby: { box: 'lobby' },
  menu: { box: 'menu', night: true, t: 2600 },
  'menu-first': { box: 'menu', night: false, t: 2600 },
  'menu-adult': { box: 'menu', night: true, adult: true, t: 2600 },
  results: { box: 'results', t: 3200 },
};
for (const g of GAMES) {
  for (const [id, spec] of Object.entries(g.demos || {})) DEMOS[id] = { game: g.id, ...spec };
}

export async function runDemo(app, id) {
  if (id === 'title' || id === 'create' || id === 'join') {
    app.preScreen = id;
    return;
  }
  if (id === 'settings') {
    app.preScreen = 'title';
    setTimeout(() => app.openOverlay('settings'), 50);
    return;
  }
  const spec = DEMOS[id];
  if (!spec) { console.warn('[demo] unknown screen', id); app.preScreen = 'title'; return; }

  app._suppress = true;
  app.stage.stop(); // don't render while fast-forwarding (much faster under software GL)
  const seed = params.seed || 7;
  const nBots = params.players - 1;
  let reached = false;
  let botIndex = 0;
  await app.createTable(params.name || 'Alex', { bots: 0, code: 'DMMO', seed, speed: params.speed });
  const engine = app.room.engine;
  for (let i = 0; i < nBots; i++) {
    const idx = botIndex++;
    const bot = await app.addBot({ mode: 'instant' });
    bot.brain.gate = () => !reached || spec.bots === 'act' || (spec.bots === 'some' && idx % 2 === 0);
  }
  if (params.me === 'guest' && app.bots[0]) {
    engine.setHostPeer(app.bots[0].client.transport.id);
    engine._broadcastLobby();
  }
  if (spec.adult || params.adult) engine._settings({ rating: 'adult' });
  const meId = app.client.state.me;
  const meBrain = attachBrain(app.client, { mode: 'instant', seed: seed + 5, gate: () => !reached || spec.me === 'act' });
  await settle();

  if (spec.box !== 'lobby') {
    engine.start(); // -> menu
    if (spec.night) fakeNight(engine);
    if (spec.box === 'menu') {
      reached = true;
      engine.toMenu();
      const ps = engine.players;
      engine.menu.focus = 'classic';
      if (ps[1]) engine.menu.fancy[ps[1].id] = 'classic';
      if (ps[2]) engine.menu.fancy[ps[2].id] = 'telephone';
      if (ps[3]) engine.menu.fancy[ps[3].id] = 'classic';
      if (ps[4]) engine.menu.fancy[ps[4].id] = 'forehead';
      engine._progress();
    } else if (spec.box === 'results') {
      reached = true;
      fakeNight(engine);
      engine.choose('classic');
      engine.players.forEach((p, i) => { p.score = [4200, 3600, 2100, 1800, 900, 700, 400, 300][i] || 100; });
      engine.api.finish(engine.players.map((p) => ({ id: p.id, score: p.score })));
    } else {
      engine.choose(spec.game || 'classic');
      reached = spec.match(engine, meId);
      let guard = 0;
      while (!reached && guard++ < 200) {
        await settle();
        if (engine.phase.final || engine.phase.id === 'results' || engine.phase.id === 'menu') break;
        engine.advance();
        reached = spec.match(engine, meId);
      }
    }
    await settle(4);
    if (params.freeze) engine.paused = true;
  }
  meBrain.detach();
  for (const b of app.bots) {
    b.brain.mode = 'realtime';
    if (!params.freeze) b.brain.actNow();
  }
  if (params.freeze) for (const b of app.bots) b.brain.enabled = false;

  // pinned time for screenshots
  const ph = app.client.state.phase;
  const t = typeof spec.t === 'function' ? spec.t(ph) : spec.t;
  const screen = app.resolveScreen();
  app._demoT = { [id]: t ?? 0, [screen]: t ?? 0, ...(spec.after ? { [spec.after]: t ?? 0 } : {}) };
  if (params.autopilot || params.autoplay) app.setAutopilot(true);
  app._suppress = false;
  app.stage.start();
  if (spec.after === 'reconnect') {
    app.client.state.status = 'reconnecting';
    app.render();
  }
}
