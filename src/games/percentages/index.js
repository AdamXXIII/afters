// Pie Chart: guess the percentage (one player cuts the pie, the table bets higher/lower),
// a live Table poll about the players themselves, and The Last Slice (pick the top 3).
// Rules + screens: ./DESIGN.md. AI-generated (Claude, Percentages team, 2026-11-09).
import { PercentagesHost, BETS } from './host.js';

const knifeIsMe = (e, me) => e.phase.payload?.knife === me;

export default {
  id: 'percentages',
  title: 'Pie Chart',
  dish: 'pie',
  course: 'A slice of pie, cut by the nation',
  hint: 'Guess the percent',
  tagline: 'What percent of people have... really?',
  blurb: 'One of you cuts the pie to a guess while the table heckles, then everyone bets higher or lower. Plus a live poll of this very table.',
  players: [3, 8],
  minutes: 6,
  colour: '#7F9A74',
  tags: ['Guessing', 'Betting', 'Polls'],
  createHost: (api) => new PercentagesHost(api),
  screens: () => import('./screens/index.js'),

  bot({ ph, client, later, rand, rng, still, mode }) {
    const me = client.state.me;
    const p = ph.payload || {};
    const mine = () => client.state.mine.game || {};
    switch (ph.id) {
      case 'percentages-poll':
        later(rand(800, 4000), () => { if (still() && mine().yes === undefined) client.act('pc-poll', { yes: rng() < 0.5 }, { yes: true }); });
        return true;
      case 'percentages-dial': {
        if (p.knife === me) {
          const target = Math.round(5 + rng() * 90);
          const steps = 5;
          for (let i = 1; i <= steps; i++) {
            const v = Math.round(50 + ((target - 50) * i) / steps + (i < steps ? (rng() - 0.5) * 16 : 0));
            later(mode === 'instant' ? 0 : 900 + i * rand(250, 600), () => { if (still()) client.act('pc-dial', { v }, { v }); });
          }
          if (mode !== 'instant') later(rand(4500, 9000), () => { if (still() && !mine().locked) client.act('pc-lock', { v: target }, { v: target, locked: true }); });
        } else {
          const n = mode === 'instant' ? 1 : 2 + Math.floor(rng() * 4);
          const dir = rng() < 0.5 ? 'up' : 'down';
          for (let i = 0; i < n; i++) later(mode === 'instant' ? 0 : rand(1000, 6000) + i * 400, () => { if (still()) client.act('pc-heckle', { dir: rng() < 0.8 ? dir : (dir === 'up' ? 'down' : 'up') }); });
        }
        return true;
      }
      case 'percentages-bet':
        if (p.knife !== me) later(rand(900, 5000), () => { if (still() && !mine().bet) { const bet = BETS[Math.floor(rng() * 4)]; client.act('pc-bet', { bet }, { bet }); } });
        return true;
      case 'percentages-final': {
        const ids = p.options.map((o) => o.id).sort(() => rng() - 0.5).slice(0, 3);
        later(rand(2000, 9000), () => { if (still() && !mine().sent) client.act('pc-top3', { ids }, { picks: ids, sent: true }); });
        return true;
      }
      case 'percentages-intro': case 'percentages-reveal': case 'percentages-scores': case 'percentages-final-intro': case 'percentages-final-reveal':
        return false; // let the box brain throw the odd bread roll
      default:
        return false;
    }
  },

  resolveScreen(state) {
    const ph = state.phase;
    if (!ph || ph.game !== 'percentages') return null;
    const knife = ph.payload?.knife === state.me;
    if (ph.id === 'percentages-dial') return knife ? 'percentages-dial' : 'percentages-watch';
    if (ph.id === 'percentages-bet') return knife ? 'percentages-sweat' : 'percentages-bet';
    return null;
  },

  demos: {
    'percentages-intro': { match: (e) => e.phase.id === 'percentages-intro', t: 2600 },
    'percentages-poll': { match: (e) => e.phase.id === 'percentages-poll', me: 'idle', bots: 'some', t: 4000 },
    'percentages-dial': { match: (e, me) => e.phase.id === 'percentages-dial' && knifeIsMe(e, me), me: 'idle', bots: 'act', t: 7000 },
    'percentages-watch': { match: (e, me) => e.phase.id === 'percentages-dial' && !knifeIsMe(e, me), me: 'idle', bots: 'act', t: 7000 },
    'percentages-bet': { match: (e, me) => e.phase.id === 'percentages-bet' && !knifeIsMe(e, me), me: 'idle', bots: 'some', t: 5000 },
    'percentages-sweat': { match: (e, me) => e.phase.id === 'percentages-bet' && knifeIsMe(e, me), me: 'idle', bots: 'some', t: 5000 },
    'percentages-reveal': { match: (e, me) => e.phase.id === 'percentages-reveal' && !knifeIsMe(e, me) && e.phase.payload.kind === 'nation', t: (p) => p.payload.at.bets + 900 },
    'percentages-reveal-poll': { match: (e) => e.phase.id === 'percentages-reveal' && e.phase.payload.kind === 'poll', t: (p) => p.payload.at.bets + 900 },
    'percentages-scores': { match: (e) => e.phase.id === 'percentages-scores', t: 2600 },
    'percentages-final-intro': { match: (e) => e.phase.id === 'percentages-final-intro', t: 2400 },
    'percentages-final': { match: (e) => e.phase.id === 'percentages-final', me: 'idle', bots: 'some', t: 9000 },
    'percentages-final-reveal': { match: (e) => e.phase.id === 'percentages-final-reveal', t: (p) => p.payload.pointsAt + 600 },
  },

  lines: {
    family: {
      pcIntro: [
        ['Pie Chart. I asked the nation some questions.', 'One of you cuts the pie to a guess. The rest of you bet on how badly.'],
        ['Pie Chart. Questions for the nation, slices for you.', 'One holds the knife. Everyone else heckles. Very British.'],
      ],
      pcIntroAgain: [['More pie? Splendid. I\'ll fetch a bigger knife.'], ['Second slice. Nobody\'s counting. I am, actually.']],
      pcDial: [
        ['{name} holds the knife. The rest of you: heckle.'],
        ['Knife to {name}. Shout higher or lower. It never helps. Do it anyway.'],
        ['{name}, cut the pie. The table will be no help whatsoever.'],
      ],
      pcDialMe: [['You hold the knife. Drag round the pie. Ignore the shouting.'], ['Your cut. Steady hand. Don\'t listen to them.']],
      pcHeckled: [['They\'re shouting at you. Charming.'], ['Heckles incoming. Mind the flame.']],
      pcBet: [
        ['Higher or lower than {name}\'s cut? Bet like you mean it.'],
        ['{name} has cut. Now judge them. Higher or lower?'],
      ],
      pcSweat: [['They\'re betting on you. Look confident.'], ['Sit tight. The table is judging your knife work.']],
      pcBullseye: [['Bullseye! I\'ve had sharper knives, but not many.'], ['Spot on. Frankly, unsettling.']],
      pcClose: [['Close. Crumbs, but close.'], ['Near enough to smell it.']],
      pcOff: [['Off. Not a disaster. A small disaster.'], ['A wobbly cut. We\'ve all been there.']],
      pcMiles: [['Miles off. That\'s not a slice, that\'s a crime scene.'], ['Oh dear. Wrong pie entirely.']],
      pcPoll: [
        ['Table poll! Not the nation this time. You lot.', 'Answer honestly. It\'s anonymous. Mostly.'],
        ['A question about this very table. Nobody will know. Except me.'],
      ],
      pcPollReveal: [['That\'s this table. I\'m not looking at anyone. I\'m looking at everyone.'], ['Well. Some of you have explaining to do.']],
      pcScores: [['Who\'s had the most pie so far. Before the last slice.'], ['The standings. All to play for. Mostly.']],
      pcFinalIntro: [['The last slice. Nine answers, pick the top three.'], ['Last slice! Find the three the nation said most.']],
      pcFinal: [['Three picks. The nation\'s favourites. No pressure.']],
      pcFinalReveal: [['And the nation\'s favourite is...'], ['Lowest first. Drumroll, please. Not too loud.']],
    },
    adult: {
      pcIntro: [
        ['Pie Chart. I asked the nation some filthy questions.', 'One of you holds the knife. The rest of you shout at them. Lovely.'],
        ['Pie Chart, after dark. The nation confessed. Now guess how many.'],
      ],
      pcDial: [
        ['{name} holds the knife. Everyone else: heckle like it\'s a hen do.'],
        ['{name}, cut the pie. Honestly, how hard can it be? Don\'t answer that.'],
      ],
      pcHeckled: [['They\'re shouting at you. Some people pay for that.']],
      pcBullseye: [['Bullseye! You\'ve done this before, haven\'t you.']],
      pcMiles: [['Miles off. Like a stag do sat nav.'], ['Wrong pie. Wrong kitchen. Wrong house.']],
      pcPoll: [['Table poll. About you lot. Anonymous, so be filthy.'], ['A question for the table. Honesty, please. I can smell a lie.']],
      pcPollReveal: [['That\'s this table. I\'ll be keeping my wick to myself.'], ['Interesting. Somebody here needs a long bath.']],
      pcFinalReveal: [['And the nation\'s naughtiest is...']],
    },
  },
};
