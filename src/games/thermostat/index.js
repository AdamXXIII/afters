// Thermostat: one of you secretly sees a target on a scale ("Cold ... Hot") and says one clue out
// loud. Everyone else drags ONE shared dial together, live on every phone, then locks in. Closer
// scores more; the Clue-giver scores double. Finale "Hot seat": last place gives the clue, the
// target is half as wide, triple points.
// Rules + screens: ./DESIGN.md. AI-generated (Claude, Thermostat builder, 2026-11-13).
import { ThermostatHost } from './host.js';

const giverIs = (e, me) => e.phase.payload?.giver === me;
/** Demo helper: make this phone (or someone else) the first Clue-giver while the intro is on. */
const firstGiver = (mine) => (e, me) => {
  if (e.phase.id !== 'thermostat-intro') return;
  const r = e.game?.host?.rounds?.[0];
  if (!r) return;
  if (mine) r.giver = me;
  else if (r.giver === me) r.giver = e.players.find((p) => p.id !== me)?.id || r.giver;
};
const hotGiver = (mine) => (e, me) => {
  if (e.phase.id !== 'thermostat-scores') return;
  const h = e.game?.host;
  const last = h?.rounds?.[h.rounds.length - 1];
  if (!last?.final) return;
  if (mine) last.giver = me;
  else if (last.giver === me) last.giver = e.players.find((p) => p.id !== me)?.id || last.giver;
};
/** Demo helper: land the dial `off` away from the target so the reveal shows a scoring band. */
const landNear = (off) => (e) => {
  if (e.phase.id !== 'thermostat-dial') return;
  const host = e.game?.host;
  if (host) host.demoLand = off;
};
const at = (k, plus) => (p) => (p.payload?.steps?.[k] ?? 0) + plus;

export default {
  id: 'thermostat',
  title: 'Thermostat',
  dish: 'thermostat',     // menu art key (needs a dish in src/screens/menu-art.js; falls back to the cloche)
  // dish art notes: a brass oven-dial / thermostat face lying on a plate: a half-moon linen face
  // with tick marks, a willow-to-tomato arc round the rim, a claret needle with a knurled brass hub.
  mood: ['talky', 'loud', 'clever'],
  course: 'A brass dial on a warm plate. Mind your fingers.',
  hint: 'One clue, one dial, everyone argues',
  tagline: 'Is Glastonbury overrated? Argue with your hands.',
  blurb: 'One of you sees a secret spot on a scale and says one clue out loud. Everyone else drags the same dial to find it, all at once, live. Closer scores more.',
  players: [3, 8],
  minutes: 12,
  steps: [
    'One of you secretly sees a spot on a scale, like Cold to Hot.',
    'They say one clue out loud. Everyone else drags the same dial to it.',
    'Closer scores more. The Clue-giver scores double.',
  ],
  hasAdult: true,
  colour: '#E2553B',
  tags: ['Talking', 'Guessing', 'Together'],
  createHost: (api) => new ThermostatHost(api),
  screens: () => import('./screens/index.js'),

  bot({ ph, client, later, rand, rng, still }) {
    const me = client.state.me;
    const p = ph.payload || {};
    const mine = () => client.state.mine.game || {};
    switch (ph.id) {
      case 'thermostat-clue': {
        if (p.giver !== me) return true;
        later(rand(2500, 9000), () => {
          if (!still() || mine().said) return;
          const eg = ph.private?.eg;
          client.act('th-said', { clue: eg ? eg[0] : '' }, { said: true });
        });
        return true;
      }
      case 'thermostat-dial': {
        if (p.giver === me) return true;
        const prog = () => client.state.progress || {};
        let v = null;
        const nudge = (up) => {
          if (!still()) return;
          const cur = prog().dial ?? 50;
          v = Math.max(2, Math.min(98, (v ?? cur) + (rng() - 0.5) * (v == null ? 60 : 16)));
          client.act('th-dial', { v, up }, null);
        };
        const lock = () => {
          if (!still()) return;
          const pr = prog();
          if (pr.done?.[me]) return;
          client.act('th-lock', {}, { locked: true });
        };
        later(rand(1200, 6000), () => nudge(false));
        later(rand(6500, 9000), () => nudge(false));
        later(rand(9500, 14000), lock);
        // if someone moved it after we locked, lock again a little later
        for (const t of [22000, 32000, 42000, 52000]) later(t + rand(0, 3000), lock);
        return true;
      }
      default:
        return false;
    }
  },

  resolveScreen(state) {
    const ph = state.phase;
    if (!ph || ph.game !== 'thermostat') return null;
    const giver = ph.payload?.giver === state.me;
    if (ph.id === 'thermostat-clue') return giver ? 'thermostat-give' : 'thermostat-listen';
    if (ph.id === 'thermostat-dial') return giver ? 'thermostat-squirm' : 'thermostat-dial';
    return null;
  },

  demos: {
    'thermostat-intro': { match: (e) => e.phase.id === 'thermostat-intro', t: 3200 },
    'thermostat-give': { match: (e, me) => { firstGiver(true)(e, me); return e.phase.id === 'thermostat-clue' && giverIs(e, me); }, me: 'idle', t: 6000 },
    'thermostat-listen': { match: (e, me) => { firstGiver(false)(e, me); return e.phase.id === 'thermostat-clue' && !giverIs(e, me); }, me: 'idle', bots: 'idle', t: 6000 },
    'thermostat-dial': { match: (e, me) => { firstGiver(false)(e, me); return e.phase.id === 'thermostat-dial' && !giverIs(e, me) && !e.phase.payload.final; }, me: 'idle', bots: 'some', t: 14000 },
    'thermostat-squirm': { match: (e, me) => { firstGiver(true)(e, me); return e.phase.id === 'thermostat-dial' && giverIs(e, me); }, me: 'idle', bots: 'some', t: 14000 },
    'thermostat-reveal-open': { match: (e, me) => { firstGiver(false)(e, me); landNear(-11)(e); return e.phase.id === 'thermostat-reveal' && !e.phase.payload.final; }, t: at('open', 900) },
    'thermostat-reveal': { match: (e, me) => { firstGiver(false)(e, me); landNear(6)(e); return e.phase.id === 'thermostat-reveal' && !e.phase.payload.final; }, t: at('points', 1400) },
    'thermostat-scores': { match: (e) => e.phase.id === 'thermostat-scores', t: 2600 },
    'thermostat-hot': { match: (e, me) => { hotGiver(false)(e, me); return e.phase.id === 'thermostat-hot'; }, t: 3000 },
    'thermostat-hot-give': { match: (e, me) => { hotGiver(true)(e, me); return e.phase.id === 'thermostat-clue' && e.phase.payload.final && giverIs(e, me); }, me: 'idle', t: 6000 },
    'thermostat-hot-dial': { match: (e, me) => { hotGiver(false)(e, me); return e.phase.id === 'thermostat-dial' && e.phase.payload.final && !giverIs(e, me); }, me: 'idle', bots: 'some', t: 14000 },
    'thermostat-hot-reveal': { match: (e, me) => { hotGiver(false)(e, me); landNear(1.5)(e); return e.phase.id === 'thermostat-reveal' && e.phase.payload.final; }, t: at('points', 1400) },
  },

  lines: {
    family: {
      thIntro: [
        ['Thermostat. One clue, one dial, and a lot of pointing.', 'Hands off the actual heating.'],
        ['Nobody touches the real thermostat in this house. Use this one.'],
      ],
      thIntroAgain: [['Back to the dial. Someone always wants it warmer.'], ['Another go. I\'ve given the dial a polish.']],
      thGive: [['One clue. Make it count.'], ['Think. Then say it out loud.']],
      thListen: [['Listen to {name}. No peeking at their phone.'], ['{name} is thinking. Give them a moment. Or heckle.']],
      thDial: [['One dial between you. Do try to share.'], ['Argue it out. Politely. Then lock it in.'], ['Everybody grab it at once. Splendid. Chaos.']],
      thSquirm: [['Not a word, {name}. Not even a face.'], ['Hands in your lap, {name}. You\'ve said your piece.']],
      thSpot: [['Spot on! Frankly, mind-reading.'], ['Bang on the money. I\'m slightly unnerved.']],
      thWarm: [['Warm. Very warm. Nearly there.'], ['Close enough to feel the heat.']],
      thLuke: [['Lukewarm. Like my bathwater.'], ['On the edge of it. A tepid effort.']],
      thCold: [['Stone cold. Were you even listening?'], ['Nowhere near. I\'ve felt warmer draughts.']],
      thScores: [['The standings. Last place takes the hot seat.']],
      thHot: [['The hot seat! A tiny target and triple points.'], ['Final round. Half the target, three times the points.']],
    },
    adult: {
      thIntro: [
        ['Thermostat. One clue, one dial, and a proper row about it.'],
        ['Grab the dial. Fight for it. This is how families break up at Christmas.'],
      ],
      thGive: [['One clue. Don\'t fuck it up.'], ['One clue. Not a bloody essay.']],
      thDial: [['One dial. Several opinions. Good luck, you lunatics.'], ['Argue it out. Then lock the bloody thing in.']],
      thSquirm: [['Not a word, {name}. Sit on your hands.'], ['Zip it, {name}. Watch them cock it up.']],
      thSpot: [['Spot on! How the hell did you do that?']],
      thCold: [['Stone cold. Were any of you actually listening?'], ['Nowhere near. Shocking. Absolutely shocking.']],
      thHot: [['The hot seat. Tiny target, triple points, no pressure. Lots of pressure.']],
    },
  },
};
