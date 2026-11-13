// Crossed Wires: write a rumour, pass it down the table (draw it, guess it, draw it again), then
// watch every line fall apart, stroke by stroke, on every phone at once. See DESIGN.md here.
import { TelephoneHost } from './host.js';
import { STARTERS } from './content/starters.js';
import { TP_LINES } from './content/lines.js';
import { doodle, nudgeDrawing, doodleFor } from './doodles.js';
import { encodeDrawing } from '../../shared/drawing-data.js';

const STEP_PHASES = new Set(['telephone-write', 'telephone-draw', 'telephone-guess']);

const GUESS_FOR = {
  cat: ['A cat with a grudge', 'Angry cat', 'A cat at a party'], fish: ['A fish in trouble', 'Big fish', 'A fish going to work'],
  ghost: ['A ghost doing karaoke', 'Scared ghost', 'Ghost at a bus stop'], house: ['A house on fire', 'Haunted house', 'A tiny house'],
  rocket: ['A rocket to Wigan', 'Rocket with feelings', 'Space rocket'], cake: ['A birthday cake', 'Cake on fire', 'Wedding cake disaster'],
  snail: ['A snail in a hurry', 'Speedy snail', 'Snail on holiday'], sun: ['The sun with a hangover', 'Happy sun', 'Sun at the beach'],
  pig: ['A pig in love', 'Pig with ears', 'A posh pig'], person: ['A man waving', 'Bloke with a balloon', 'A person having a moment'],
};

function bot({ ph, client, later, rng, rand, still, answer }) {
  if (!ph.id.startsWith('telephone-')) return false;
  const pv = ph.private || {};
  const rating = client.state.settings?.rating === 'adult' ? 'adult' : 'family';
  const send = (type, data, mine) => { if (still()) client.act(type, data, mine); };
  switch (ph.id) {
    case 'telephone-write': {
      const deck = STARTERS[rating];
      later(rand(1500, 7000), () => send('text', { text: deck[Math.floor(rng() * deck.length)].text }, { sent: true }));
      return true;
    }
    case 'telephone-draw': {
      let key = rng() < 0.5 ? doodleFor(pv.text, rng) : doodleFor('', rng);
      let d = doodle(key, Math.floor(rng() * 1e6));
      if (ph.payload.mode === 'flip' && pv.prev?.strokes?.length) { d = nudgeDrawing(pv.prev, Math.round(rand(50, 110)), Math.round(rand(-60, 20))); key = null; }
      later(rand(3000, 12000), () => send('draw', { d: encodeDrawing(d), final: true, doodle: key }, { sent: true }));
      return true;
    }
    case 'telephone-guess': {
      const opts = pv.doodle ? GUESS_FOR[pv.doodle] : null;
      const text = opts && rng() < 0.65 ? opts[Math.floor(rng() * opts.length)] : answer();
      later(rand(1500, 6000), () => send('text', { text }, { sent: true }));
      return true;
    }
    case 'telephone-vote': {
      const mineId = client.state.me;
      const opts = (ph.payload.moments || []).filter((m) => m.authorId !== mineId);
      if (!opts.length) return true;
      const pickM = opts[Math.floor(rng() * opts.length)];
      later(rand(1200, 5000), () => send('vote', { key: pickM.key }, { vote: pickM.key }));
      return true;
    }
    default:
      return true; // intro, reveal, awards: watch
  }
}

const at = (n) => (e) => e.phase.id === n;

export default {
  id: 'telephone',
  title: 'Crossed Wires',
  dish: 'spaghetti',      // menu illustration (src/screens/menu-art.js)
  mood: ['drawing', 'loud', 'rude'], // menu filters: loud, talky, sneaky, clever, drawing, rude (18+)
  course: 'A tangle of spaghetti, passed down the table',
  hint: 'Draw it, pass it on',
  tagline: 'Write it, draw it, guess it, ruin it.',
  blurb: 'Your sentence goes round the table: drawn, guessed, drawn again. Then we watch it fall apart, stroke by stroke.',
  players: [3, 8],
  minutes: 12,
  steps: ['Write a silly sentence.', 'It goes round: draw it, guess it.', 'Watch every chain fall apart.'], // menu "How it plays"
  hasAdult: true, // has 18+ content when the table picks Adults
  colour: '#2F5D7C',
  tags: ['Drawing', 'Guessing', 'Chaos'],
  createHost: (api) => new TelephoneHost(api),
  bot,
  screens: () => import('./screens/index.js'),
  lines: TP_LINES,
  resolveScreen(state) {
    const ph = state.phase;
    if (!STEP_PHASES.has(ph.id)) return null;
    if (!ph.private || state.mine.game?.sent || state.progress?.done?.[state.me]) return 'telephone-wait';
    return null;
  },
  demos: {
    'telephone-intro': { match: at('telephone-intro'), t: 2600 },
    'telephone-write': { match: at('telephone-write'), me: 'idle', bots: 'some', t: 9000 },
    'telephone-draw': { match: at('telephone-draw'), me: 'idle', bots: 'some', t: 21000 },
    'telephone-guess': { match: at('telephone-guess'), me: 'idle', bots: 'some', t: 9000 },
    'telephone-wait': { match: at('telephone-draw'), me: 'act', bots: 'some', t: 26000 },
    'telephone-reveal': { match: (e) => e.phase.id === 'telephone-reveal', t: (ph) => { const b = ph.payload.beats[1]; return b.at + b.replay + 400; } },
    'telephone-reveal-guess': { match: (e) => e.phase.id === 'telephone-reveal', t: (ph) => { const b = ph.payload.beats[2]; return b.at + b.dur * 0.8; } },
    'telephone-reveal-end': { match: (e) => e.phase.id === 'telephone-reveal', t: (ph) => ph.payload.end.at + 2400 },
    'telephone-vote': { match: at('telephone-vote'), me: 'idle', bots: 'some', t: 4000 },
    'telephone-awards': { match: at('telephone-awards'), t: 6500 },
    'telephone-flip': {
      match: (e) => { if (e.phase.id === 'telephone-intro' && e.game?.host) e.game.host.mode = 'flip'; return e.phase.id === 'telephone-reveal'; },
      t: (ph) => ph.payload.end.flipAt + 1800,
    },
  },
};
