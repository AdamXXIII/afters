// ?demo=<screen-id>: jump straight to a screen with bots and deterministic data (DESIGN 4).
// The real HostEngine + bots run; we fast-forward phases with instant bots, then stop on the
// target. &freeze=1 pauses the engine and pins time at a good-looking moment (or &t=ms).
import { attachBrain } from './bots.js';
import { params } from './util/params.js';

const settle = async (n = 3) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)); };

const meIsAuthor = (eng, meId) => {
  const r1 = eng.g?.r1;
  if (!r1) return false;
  return r1.matchups[r1.order[r1.index]].authors.includes(meId);
};

/**
 * Target specs. match(engine, meId) -> bool. me/bots: 'idle' | 'act' | 'some' on the target phase.
 * t: frozen elapsed ms (number or (phase) => number) used when &freeze=1.
 */
export const DEMOS = {
  lobby: { lobby: true },
  intro: { match: (e) => e.phase.id === 'intro', t: 2500 },
  'r1-intro': { match: (e) => e.phase.id === 'r1-intro', t: 3200 },
  'r1-write': { match: (e) => e.phase.id === 'r1-write', me: 'idle', bots: 'some', t: 24000 },
  'r1-wait': { match: (e) => e.phase.id === 'r1-write', me: 'act', bots: 'some', t: 31000 },
  'r1-vote': { match: (e, me) => e.phase.id === 'r1-vote' && !meIsAuthor(e, me), me: 'idle', bots: 'some', t: 5200 },
  'r1-vote-author': { match: (e, me) => e.phase.id === 'r1-vote' && meIsAuthor(e, me), me: 'idle', bots: 'some', t: 5200 },
  'r1-reveal': { match: (e, me) => e.phase.id === 'r1-reveal' && !meIsAuthor(e, me), t: 4300 },
  'r1-scores': { match: (e) => e.phase.id === 'r1-scores', t: 2600 },
  'r2-intro': { match: (e) => e.phase.id === 'r2-intro', t: 3200 },
  'r2-write': { match: (e) => e.phase.id === 'r2-write', me: 'idle', bots: 'some', t: 14000 },
  'r2-wait': { match: (e) => e.phase.id === 'r2-write', me: 'act', bots: 'some', t: 22000 },
  'r2-pick': { match: (e) => e.phase.id === 'r2-pick', me: 'idle', bots: 'some', t: 6500 },
  'r2-reveal': { match: (e) => e.phase.id === 'r2-reveal', t: (p) => { const s = p.payload.steps.find((x) => x.kind === 'truth'); return s ? s.at + 1600 : 4000; } },
  'r2-scores': { match: (e) => e.phase.id === 'r2-scores', t: 2600 },
  'r3-intro': { match: (e) => e.phase.id === 'r3-intro', t: 3200 },
  'r3-write': { match: (e) => e.phase.id === 'r3-write', me: 'idle', bots: 'act', t: 21000 },
  'r3-swipe': { match: (e) => e.phase.id === 'r3-swipe', me: 'idle', bots: 'act', t: (p) => Math.round(p.payload.perCard * 1.4) },
  'r3-reveal': { match: (e) => e.phase.id === 'r3-reveal', t: (p) => p.payload.toastAt + 1800 },
  podium: { match: (e) => e.phase.id === 'podium', t: 6500 },
  end: { match: (e) => e.phase.id === 'end', t: 1500 },
  reconnect: { match: (e, me) => e.phase.id === 'r1-vote' && !meIsAuthor(e, me), me: 'idle', bots: 'idle', t: 5200, after: 'reconnect' },
};

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
  const meId = app.client.state.me;
  const meBrain = attachBrain(app.client, { mode: 'instant', seed: seed + 5, gate: () => !reached || spec.me === 'act' });
  await settle();

  if (!spec.lobby) {
    engine.start();
    reached = spec.match(engine, meId);
    let guard = 0;
    while (!reached && guard++ < 200) {
      await settle();
      if (engine.phase.id === 'end') break;
      engine.advance();
      reached = spec.match(engine, meId);
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
  app._demoT = { [id]: t ?? 0, ...(spec.after ? { [spec.after]: t ?? 0 } : {}) };
  if (params.autopilot || params.autoplay) app.setAutopilot(true);
  app._suppress = false;
  app.stage.start();
  if (spec.after === 'reconnect') {
    app.client.state.status = 'reconnecting';
    app.render();
  }
}
