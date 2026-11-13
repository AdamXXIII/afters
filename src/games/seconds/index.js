// EXAMPLE GAME: "Call It" - the smallest complete game module. Copy this folder to start a new game.
// Hidden from the menu (hidden: true); play it with ?bots=4&autoplay=1&game=example or
// `node scripts/sim.mjs 4 50 example`. See ARCHITECTURE.md "How to add a game".
import { Host } from './host.js';

export default {
  id: 'seconds',
  title: 'Call It',
  dish: 'cloche',
  course: 'A coin under a cloche',
  tagline: 'Heads or tails? Three flips.',
  blurb: 'Everyone calls the coin. Right call, 100 points. That\'s it. It\'s an example.',
  players: [3, 8],
  minutes: 1,
  colour: '#C89B3C',
  tags: ['New'],
  hidden: true,
  createHost: (api) => new Host(api),
  // bots: return true when you handled the phase
  bot({ ph, client, later, rng, still }) {
    if (ph.id !== 'seconds-call') return false;
    later(800 + rng() * 2000, () => { if (still()) client.act('call', { side: rng() < 0.5 ? 'heads' : 'tails' }, { side: 'sent' }); });
    return true;
  },
  screens: () => import('./screens/index.js'),
  demos: {
    'seconds-call': { match: (e) => e.phase.id === 'seconds-call', me: 'idle', bots: 'some', t: 2000 },
    'seconds-reveal': { match: (e) => e.phase.id === 'seconds-reveal', t: 1500 },
  },
  // Optional: Cyril lines for this game (family + adult). ctx.line('exCall') finds them.
  lines: {
    family: { exCall: [['Heads or tails? Choose wisely.'], ['Call it. Quickly.']] },
    adult: { exCall: [['Heads or tails? Insert your own joke.']] },
  },
};
