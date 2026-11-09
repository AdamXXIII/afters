// Bot players: join like any phone and play automatically. Used by ?demo=, ?bots=N, autopilot and tests.
// The box handles the menu; each game's `bot(b)` (src/games/<id>/index.js) plays that game's phases.
import { GameClient } from './game/GameClient.js';
import { LocalTransport } from './net/LocalTransport.js';
import { BOT_ANSWERS, BOT_NAMES } from './content/index.js';
import { mulberry32, shuffle, subSeed } from './util/rng.js';
import { GAMES, gameById } from './games/index.js';

const USED = new Set();
const deckOf = (rating) => (Array.isArray(BOT_ANSWERS) ? BOT_ANSWERS : (rating === 'adult' && BOT_ANSWERS.adult?.length ? BOT_ANSWERS.adult : BOT_ANSWERS.family));

/**
 * Attach an automatic brain to any GameClient.
 * @param {GameClient} client
 * @param {{mode?:'instant'|'realtime', speed?:number, seed?:number, react?:boolean, gate?:Function, chooser?:boolean, game?:string}} o
 *   chooser: when this client is the host, it picks `game` (default 'classic') from the menu.
 * @returns {{enabled:boolean, detach():void, actNow():void}}
 */
export function attachBrain(client, { mode = 'realtime', speed = 1, seed = 1, react = false, gate = null, chooser = false, game = 'classic' } = {}) {
  const rng = mulberry32(seed >>> 0);
  const order = { family: shuffle(deckOf('family'), rng), adult: shuffle(deckOf('adult'), rng) };
  let ai = 0;
  // Bots on one page share a pool so the table doesn't see the same joke twice.
  const answer = () => {
    const answers = order[client.state.settings?.rating === 'adult' ? 'adult' : 'family'];
    for (let k = 0; k < answers.length; k++) {
      const a = answers[ai++ % answers.length];
      if (!USED.has(a)) { USED.add(a); return a; }
    }
    USED.clear();
    return answers[ai++ % answers.length];
  };
  const timers = new Set();
  const brain = { enabled: true, mode, gate, chooser, game, detach, actNow: () => act(true) };
  let handledSeq = -1;

  const later = (ms, fn) => {
    if (brain.mode === 'instant') { queueMicrotask(() => brain.enabled && fn()); return; }
    const t = setTimeout(() => { timers.delete(t); if (brain.enabled) fn(); }, Math.max(0, ms / speed));
    timers.add(t);
  };
  const rand = (lo, hi) => lo + (hi - lo) * rng();

  function act(force = false) {
    if (!brain.enabled) return;
    const s = client.state;
    const ph = s.phase;
    if (!ph || s.status !== 'joined') return;
    if (!force && ph.seq === handledSeq) return;
    if (brain.gate && !brain.gate(ph, client)) return; // demo: hold still on the target screen
    handledSeq = ph.seq;
    const seq = ph.seq;
    const still = () => client.state.phase?.seq === seq;
    const b = { ph, client, later, rand, rng, still, answer, mode: brain.mode, speed, react };

    if (ph.id === 'menu') {
      if (brain.chooser && client.isHost) {
        later(rand(1200, 2200), () => { if (still()) client.focusGame(brain.game); });
        later(rand(2600, 3600), () => { if (still()) client.chooseGame(brain.game); });
      } else if (!client.isHost && brain.mode === 'realtime' && rng() < 0.7) {
        const open = GAMES.filter((g) => !g.comingSoon);
        later(rand(600, 2400), () => { if (still()) client.fancyGame(open[Math.floor(rng() * open.length)].id); });
      }
      return;
    }
    if (ph.id === 'end' || ph.id === 'results') {
      if (brain.chooser && client.isHost && brain.again) later(rand(2500, 3500), () => { if (still()) client.toMenu(); });
    }
    const def = gameById(ph.game);
    let handled = false;
    try { handled = !!def?.bot?.(b); } catch (e) { console.error('[bot]', e); }
    if (!handled && react && brain.mode === 'realtime' && /reveal|scores|podium|results/.test(ph.id) && rng() < 0.5) {
      later(rand(800, 4000), () => { if (still()) client.react(['roll', 'rose', 'applause', 'groan'][Math.floor(rng() * 4)]); });
    }
  }

  const offPhase = client.on('phase', () => act());
  const offStatus = client.on('status', (st) => { if (st === 'joined') act(true); });

  function detach() {
    brain.enabled = false;
    offPhase();
    offStatus();
    timers.forEach(clearTimeout);
    timers.clear();
  }
  queueMicrotask(() => act());
  return brain;
}

/**
 * Create a bot that joins room `code` over a LocalTransport and plays.
 * @returns {Promise<{client:GameClient, brain:ReturnType<typeof attachBrain>, name:string}>}
 */
export async function createBot({ code, index = 0, seed = 1, mode = 'realtime', speed = 1, avatar, react = true, makeTransport, gate = null, chooser = false, game }) {
  const client = new GameClient({ makeTransport: makeTransport || (() => new LocalTransport({ role: 'client' })), label: `bot${index}` });
  const name = BOT_NAMES[index % BOT_NAMES.length];
  await client.join(code, { name, avatar });
  const brain = attachBrain(client, { mode, speed, seed: subSeed(seed, `bot${index}`), react, gate, chooser, game });
  return { client, brain, name };
}
