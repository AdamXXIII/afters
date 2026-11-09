// Bot players: join like any phone and play automatically. Used by ?demo=, ?bots=N, autopilot and tests.
import { GameClient } from './game/GameClient.js';
import { LocalTransport } from './net/LocalTransport.js';
import { BOT_ANSWERS, BOT_NAMES } from './content/index.js';
import { mulberry32, shuffle, subSeed } from './util/rng.js';

const USED = new Set();

/**
 * Attach an automatic brain to any GameClient.
 * @param {GameClient} client
 * @param {{mode?:'instant'|'realtime', speed?:number, seed?:number, react?:boolean}} o
 * @returns {{enabled:boolean, detach():void, actNow():void}}
 */
export function attachBrain(client, { mode = 'realtime', speed = 1, seed = 1, react = false, gate = null } = {}) {
  const rng = mulberry32(seed >>> 0);
  const answers = shuffle(BOT_ANSWERS, rng);
  let ai = 0;
  // Bots on one page share a pool so the table doesn't see the same joke twice.
  const nextAnswer = () => {
    for (let k = 0; k < answers.length; k++) {
      const a = answers[ai++ % answers.length];
      if (!USED.has(a)) { USED.add(a); return a; }
    }
    USED.clear();
    return answers[ai++ % answers.length];
  };
  const timers = new Set();
  const brain = { enabled: true, mode, gate, detach, actNow: () => act(true) };
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
    const me = s.me;
    switch (ph.id) {
      case 'r1-write': {
        const prompts = ph.private?.prompts || [];
        prompts.forEach((pr, i) => {
          later(rand(1500, 6000) + i * 2500, () => {
            if (still() && client.state.mine.submitted[pr.matchupId] === undefined) client.submit(nextAnswer(), pr.matchupId);
          });
        });
        break;
      }
      case 'r1-vote':
        if (ph.private?.role === 'voter') later(rand(1200, 5000), () => { if (still() && !client.state.mine.vote) client.vote(rng() < 0.5 ? 'A' : 'B'); });
        break;
      case 'r2-write': {
        const send = () => {
          if (!still() || client.state.mine.submitted.only !== undefined) return;
          client.submit(nextAnswer().toLowerCase().slice(0, 40));
        };
        later(rand(1500, 7000), send);
        const off = client.on('reject', () => { if (still()) later(600, send); else off(); });
        const offP = client.on('phase', () => { off(); offP(); });
        break;
      }
      case 'r2-pick': {
        const own = ph.private?.ownOptionId;
        const opts = ph.payload.options.filter((o) => o.id !== own);
        later(rand(1500, 6000), () => { if (still() && !client.state.mine.pick) client.pick(opts[Math.floor(rng() * opts.length)].id); });
        break;
      }
      case 'r3-write':
        [0, 1].forEach((i) => later(rand(1500, 4000) + i * 3000, () => { if (still() && client.state.mine.r3.length < 4) client.submit(nextAnswer().slice(0, 45)); }));
        break;
      case 'r3-swipe': {
        const own = new Set(ph.private?.ownCardIds || []);
        const per = ph.payload.perCard;
        let used = 0;
        ph.payload.deck.forEach((card, i) => {
          if (own.has(card.id)) return;
          const cheers = used < ph.payload.glasses && rng() < 0.4;
          if (cheers) used += 1;
          const delay = brain.mode === 'instant' ? 0 : i * per * speed + rand(400, 2400);
          later(delay, () => { if (still()) client.swipe(card.id, cheers); });
        });
        break;
      }
      default:
        if (react && brain.mode === 'realtime' && /reveal|scores|podium/.test(ph.id) && rng() < 0.5) {
          later(rand(800, 4000), () => { if (still()) client.react(['roll', 'rose', 'applause', 'groan'][Math.floor(rng() * 4)]); });
        }
    }
    void me;
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
export async function createBot({ code, index = 0, seed = 1, mode = 'realtime', speed = 1, avatar, react = true, makeTransport, gate = null }) {
  const client = new GameClient({ makeTransport: makeTransport || (() => new LocalTransport({ role: 'client' })), label: `bot${index}` });
  const name = BOT_NAMES[index % BOT_NAMES.length];
  await client.join(code, { name, avatar });
  const brain = attachBrain(client, { mode, speed, seed: subSeed(seed, `bot${index}`), react, gate });
  return { client, brain, name };
}
