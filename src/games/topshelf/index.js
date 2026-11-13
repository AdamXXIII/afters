// Top Shelf: category trivia climb up Cyril's drinks cabinet. The lowest player picks the
// category, quick right answers climb two shelves, wrong ones slip one. Mid-game Steal and
// Pass the Port rounds; the Last Drop wager decides who ends on the top shelf.
// Rules + screens: ./DESIGN.md. AI-generated (Claude, Top Shelf builder, 2026-11-13).
import { TopShelfHost } from './host.js';
import { ALL } from './content/index.js';

const byText = new Map(ALL.flatMap((c) => c.qs.map((q) => [q.q, q])));
const ph = (id) => (e) => e.phase.id === id;
const mode = (m) => (e) => e.phase.id === 'topshelf-q' && e.phase.payload.mode === m;
const rvMode = (m) => (e) => e.phase.id === 'topshelf-reveal' && e.phase.payload.mode === m;
const moveT = (p) => p.payload.at.move + 1400;

export default {
  id: 'topshelf',
  title: 'Top Shelf',
  dish: 'cabinet',        // menu illustration (src/screens/menu-art.js)
  mood: ['clever'], // menu filters: loud, talky, sneaky, clever, drawing, rude (18+)
  course: 'A nightcap from Cyril\'s cabinet',
  hint: 'Trivia climb',
  tagline: 'Climb the drinks cabinet, one right answer at a time.',
  blurb: 'Quiz your way up Cyril\'s drinks cabinet. Quick answers climb two shelves, wrong ones slip. Whoever is lowest picks the next category.',
  players: [3, 8],
  minutes: 10,
  steps: [
    'Answer on your phone. Right climbs a shelf, wrong slips one.',
    'Right inside five seconds climbs two.',
    'Whoever is lowest picks the category, and the last question is a bet.',
  ],
  hasAdult: true,
  colour: '#C89B3C',
  tags: ['Quiz', 'Quick', 'Betting'],
  createHost: (api) => new TopShelfHost(api),
  screens: () => import('./screens/index.js'),

  bot({ ph: p, client, later, rand, rng, still, mode: m }) {
    const me = client.state.me;
    const pl = p.payload || {};
    const mine = () => client.state.mine.game || {};
    const fast = m === 'instant';
    switch (p.id) {
      case 'topshelf-pick':
        if (pl.picker === me) later(fast ? 0 : rand(1500, 5000), () => { if (still() && !mine().cat) { const cat = pl.options[Math.floor(rng() * pl.options.length)]; client.act('ts-pick', { cat }, { cat }); } });
        return true;
      case 'topshelf-q': {
        if (pl.mode === 'port' && pl.victim !== me) {
          later(fast ? 0 : rand(1200, 6000), () => { if (still() && mine().yes === undefined) { const yes = rng() < 0.5; client.act('ts-bet', { yes }, { yes }); } });
          return true;
        }
        // bots know roughly half the answers (they look the question up; phones never get told)
        const known = byText.get(pl.q);
        const skill = pl.mode === 'final' ? 0.4 : 0.6;
        let i = Math.floor(rng() * pl.options.length);
        if (known && rng() < skill) i = pl.options.indexOf(known.a[0]);
        if (rng() < 0.06 && !fast) return true; // dozed off
        later(fast ? 0 : rand(1500, 11000), () => { if (still() && mine().i === undefined) client.act('ts-answer', { i }, { i }); });
        return true;
      }
      case 'topshelf-port': {
        const others = client.state.players.filter((x) => x.id !== me);
        later(fast ? 0 : rand(1500, 7000), () => { if (still() && !mine().to && others.length) { const to = others[Math.floor(rng() * others.length)].id; client.act('ts-port', { to }, { to }); } });
        return true;
      }
      case 'topshelf-wager':
        later(fast ? 0 : rand(1500, 7000), () => { if (still() && !mine().n) { const n = 1 + Math.floor(rng() * 3); client.act('ts-wager', { n }, { n }); } });
        return true;
      default:
        return false; // intros, reveals, summit: let the box brain throw the odd bread roll
    }
  },

  demos: {
    'topshelf-intro': { match: ph('topshelf-intro'), t: 2600 },
    'topshelf-pick': { match: (e, me) => e.phase.id === 'topshelf-pick' && e.phase.payload.picker === me && e.phase.payload.round === 0, me: 'idle', bots: 'idle', t: 2500 },
    'topshelf-pick-watch': { match: (e, me) => e.phase.id === 'topshelf-pick' && e.phase.payload.picker !== me && e.phase.payload.round > 0, me: 'idle', bots: 'idle', t: 2500 },
    'topshelf-q': { match: (e) => mode('normal')(e) && e.phase.payload.round > 0, me: 'idle', bots: 'some', t: 3200 },
    'topshelf-q-answered': { match: (e) => mode('normal')(e) && e.phase.payload.round > 1, me: 'act', bots: 'some', t: 6000 },
    'topshelf-reveal': { match: (e) => rvMode('normal')(e) && e.phase.payload.round > 1, t: moveT },
    'topshelf-round-intro': { match: (e) => e.phase.id === 'topshelf-round-intro' && e.phase.payload.kind === 'steal', t: 2200 },
    'topshelf-q-steal': { match: mode('steal'), me: 'idle', bots: 'some', t: 3200 },
    'topshelf-reveal-steal': { match: rvMode('steal'), t: moveT },
    'topshelf-port-intro': { match: (e) => e.phase.id === 'topshelf-round-intro' && e.phase.payload.kind === 'port', t: 2200 },
    'topshelf-port': { match: ph('topshelf-port'), me: 'idle', bots: 'some', t: 3000 },
    'topshelf-q-bet': { match: (e, me) => mode('port')(e) && e.phase.payload.victim !== me, me: 'idle', bots: 'some', t: 3200 },
    'topshelf-reveal-port': { match: rvMode('port'), t: moveT },
    'topshelf-final-intro': { match: (e) => e.phase.id === 'topshelf-round-intro' && e.phase.payload.kind === 'final', t: 2200 },
    'topshelf-wager': { match: ph('topshelf-wager'), me: 'idle', bots: 'some', t: 3000 },
    'topshelf-q-final': { match: mode('final'), me: 'idle', bots: 'some', t: 4000 },
    'topshelf-reveal-final': { match: rvMode('final'), t: moveT },
    'topshelf-summit': { match: ph('topshelf-summit'), t: 3200 },
  },

  lines: {
    family: {
      tsIntro: [
        ['My drinks cabinet. The good stuff lives on the top shelf.', 'Nobody has ever reached it sober. Off you go.'],
        ['Top Shelf. A quiz, but with altitude.', 'Mind the step. I\'ve lost guests that way.'],
      ],
      tsIntroAgain: [['Back up the cabinet? Splendid. I\'ve dusted.'], ['Same cabinet, new questions. Nobody touch the sherry.']],
      tsPick: [['{name} is lowest, so {name} chooses. Every cloud.'], ['Down on the floor, {name}? Then you pick the bottle.'], ['{name} picks. The view from the bottom is very good for choosing.']],
      tsPickMe: [['You\'re lowest. Small comfort: you choose.'], ['Bottom of the cabinet. Pick a bottle, any bottle.']],
      tsQ: [['Quick ones climb two shelves. Ditherers climb one.'], ['First five seconds counts double. No pressure.'], ['Tap your answer. No conferring. Well, a bit.']],
      tsQ2: [['Same bottle, second pour.'], ['Another from the same shelf.']],
      tsAll: [['Every one of you. I\'m almost proud.'], ['A clean sweep. The cabinet is groaning.']],
      tsNone: [['Not one of you. I\'ll pretend I didn\'t see that.'], ['Nobody. The whole table slides. Steady on.']],
      tsSome: [['Up you go, the clever ones. Down you come, the rest.'], ['Some climbing, some slipping. Like any good party.'], ['The cabinet sorts the sheep from the shepherds.']],
      tsShield: [['Three in a row. Have a Steady Hand: your next slip is forgiven.']],
      tsSaved: [['Saved by the Steady Hand. Not a drop spilled.']],
      tsStealIntro: [['Steal round! Answer right and you swap shelves with the leader.', 'Fastest thief wins. Leader: get it right and you\'re safe.']],
      tsStole: [['{name} has swiped the top bottle. Bold. I like it.'], ['A heist! {name} swaps places with the leader.']],
      tsHeld: [['The leader held on. Hands off the cabinet.'], ['Steady nerves at the top. Nobody steals tonight.']],
      tsNobodyStole: [['Nobody nicked anything. Honest folk. Disappointing.']],
      tsPortIntro: [['Pass the Port! You choose who answers the next one alone.', 'Right, they climb two. Wrong, they slip two. Everyone else bets.']],
      tsPort: [['Who gets the port? Point the decanter.'], ['Pick someone. Pick a friend. Pick an enemy.']],
      tsPortRight: [['{name} gets it. The port is in safe hands.'], ['Right! {name} climbs two. The doubters weep.']],
      tsPortWrong: [['Oh dear, {name}. The port goes down, and so do you.'], ['Wrong, {name}. Two shelves down. The bettors cheer.']],
      tsFinalIntro: [['The Last Drop. One hard question. Bet one, two or three shelves.', 'Right, you climb that many. Wrong, you fall that many.']],
      tsWager: [['How brave are you feeling? Bet your shelves.'], ['One for the careful. Three for the reckless.']],
      tsSummit: [['{name} takes the top shelf. Pour yourself something nice.'], ['Top of the cabinet: {name}. The rest of you, mind the dust.']],
      tsSummitTie: [['A shared top shelf. Very civilised. Very rare.']],
    },
    adult: {
      tsIntro: [
        ['My drinks cabinet, after dark. The good stuff is on the top shelf, obviously.', 'Some of you will slide down. Like most of my evenings.'],
      ],
      tsPick: [['{name} is at the bottom. Again. You pick, darling.'], ['{name} is lowest. Choose your poison.']],
      tsPickMe: [['You\'re lowest. Choose your poison.']],
      tsNone: [['Nobody. Not one. Have you all been at the cooking sherry?']],
      tsStole: [['{name} has had their hands in the leader\'s cabinet. Scandalous.']],
      tsPortRight: [['{name} gets it. Handled the port beautifully. Ahem.']],
      tsPortWrong: [['Wrong, {name}. Down you go. Some people enjoy that.']],
      tsSummit: [['{name} reaches the top shelf. Everyone else: on your knees. To dust.']],
    },
  },
};
