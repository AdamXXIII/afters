// Who Had Seconds? Everyone gets the same secret task, except the faker, who had seconds and must
// blend in. Act it out on a synced "3, 2, 1, now!", then point at the faker.
// Rules + screens: ./DESIGN.md. AI-generated (Claude, Seconds team, 2026-11-13).
import { SecondsHost } from './host.js';

const isFaker = (e, me) => {
  const host = e.game?.host;
  return !!host?.turn?.fakers?.includes(me);
};

export default {
  id: 'seconds',
  title: 'Who Had Seconds?',
  dish: 'cloche',
  course: 'Somebody went back for more',
  hint: 'Spot the faker',
  tagline: 'Same secret task. One faker. Act it out on three.',
  blurb: 'Everyone gets the same secret task, except one of you, who had seconds and has to blend in. Hands, fingers, points and faces on three, then point at the faker.',
  players: [3, 8],
  minutes: 10,
  steps: [
    'Everyone reads the same secret task. One faker gets nothing and bluffs.',
    'On three, everyone does it at once: a hand, fingers, a point or a face.',
    'Point at the faker. Catch them early for more points.',
  ],
  hasAdult: true,
  colour: '#B5527E',
  tags: ['Bluffing', 'Acting', 'No typing'],
  createHost: (api) => new SecondsHost(api),
  screens: () => import('./screens/index.js'),

  bot({ ph, client, later, rand, rng, still }) {
    const me = client.state.me;
    const p = ph.payload || {};
    const priv = client.state.phase?.private || {};
    const mine = () => client.state.mine.game || {};
    switch (ph.id) {
      case 'seconds-task':
        later(rand(1200, 5000), () => { if (still() && !mine().ready) client.act('sc-ready', {}, { ready: true, peeked: true }); });
        return true;
      case 'seconds-vote': {
        const others = (client.state.players || []).filter((x) => x.id !== me).map((x) => x.id);
        const pickPerson = () => others[Math.floor(rng() * others.length)];
        let target;
        if (p.final) target = rng() < (priv.faker ? 0.45 : 0.2) ? 'all' : pickPerson();
        else if (p.options?.includes('none') && rng() < 0.45 - p.task * 0.15) target = 'none';
        else target = pickPerson();
        later(rand(1500, 7000), () => { if (still() && !mine().target) client.act('sc-vote', { target }, { target }); });
        return true;
      }
      default:
        return false;
    }
  },

  demos: {
    'seconds-intro': { match: (e) => e.phase.id === 'seconds-intro', t: 3000 },
    'seconds-turn': { match: (e) => e.phase.id === 'seconds-turn', t: 1800 },
    'seconds-turn-two': { match: (e) => e.phase.id === 'seconds-turn' && e.phase.payload.two, t: 1800 },
    'seconds-task': { match: (e, me) => e.phase.id === 'seconds-task' && !isFaker(e, me), me: 'idle', bots: 'some', t: 4000 },
    'seconds-task-faker': { match: (e, me) => e.phase.id === 'seconds-task' && isFaker(e, me), me: 'idle', bots: 'some', t: 4000 },
    'seconds-count': { match: (e) => e.phase.id === 'seconds-count', t: (ph) => ph.payload.beats.two + 200 },
    'seconds-count-now': { match: (e) => e.phase.id === 'seconds-count', t: (ph) => ph.payload.beats.now + 500 },
    'seconds-vote': { match: (e, me) => e.phase.id === 'seconds-vote' && !isFaker(e, me), me: 'idle', bots: 'some', t: 6000 },
    'seconds-reveal-hung': { match: (e) => e.phase.id === 'seconds-reveal' && e.phase.payload.kind === 'hung', t: 2500 },
    'seconds-reveal': { match: (e) => e.phase.id === 'seconds-reveal' && e.phase.payload.kind !== 'hung', t: (ph) => ph.payload.at.points + 800 },
    'seconds-scores': { match: (e) => e.phase.id === 'seconds-scores', t: 2500 },
    'seconds-final-intro': { match: (e) => e.phase.id === 'seconds-final-intro', t: 2500 },
    'seconds-final-vote': { match: (e) => e.phase.id === 'seconds-vote' && e.phase.payload.final, me: 'idle', bots: 'some', t: 6000 },
  },

  lines: {
    family: {
      scIntro: [['Somebody at this table had seconds. Greedy. Find them.'], ['One of you went back for more. The rest of you, act natural.']],
      scIntroAgain: [['Back for more? How fitting.'], ['Same again. Somebody always has seconds.']],
      scTurn: [['Somebody had seconds. Everyone look innocent.'], ['A fresh faker. Nobody blink.'], ['New faker. Same table. Same suspicious faces.']],
      scTwo: [['Two of you had seconds this time. Disgraceful.'], ['Two fakers. They don\'t know each other. Lovely.']],
      scTask: [['Read it. Hide it. Look normal.'], ['Secret task. Keep your face still.']],
      scVote: [['Point at the faker. Or wait and watch.'], ['Who looked shifty? Be honest.']],
      scVoteLast: [['Last chance. Someone has to go.'], ['Final say. Point with conviction.']],
      scHung: [['No majority. The faker breathes again.'], ['Undecided. I\'ve seen juries move faster.']],
      scCaught: [['Caught with a full plate.'], ['Got them. Gravy on the chin, frankly.']],
      scFramed: [['Innocent! Oh dear. Apologise later.'], ['Wrong person. The faker is having a lovely time.']],
      scEscaped: [['Nobody caught them. Seconds, and away.'], ['They got clean away. I\'m almost proud.']],
      scAll: [['You were ALL faking. Every last one of you.'], ['Nobody had the task. Not one. I made it up.']],
      scScores: [['Before last call. Who\'s ahead.'], ['The standings. One task left. Double points.']],
      scFinal: [['Last call. One task. Double points.', 'Someone had seconds. Maybe more than someone.']],
    },
    adult: {
      scIntro: [['Somebody here had seconds. Greedy. Typical.'], ['One of you is faking it. Not for the first time, I suspect.']],
      scTurn: [['A fresh faker. Look innocent. You\'ve had practice.'], ['Somebody\'s faking. Rings a bell for some of you.']],
      scCaught: [['Caught red-handed. Not the first time, is it.']],
      scFramed: [['Innocent! Buy them something nice.']],
      scAll: [['You were ALL faking. Like a wedding night.']],
    },
  },
};
