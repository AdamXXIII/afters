// Pardon?: say gibberish aloud until the table hears the real phrase, name a tune Cyril plays on
// the synth, then write your own mishearing of a famous line. Rules + screens: ./DESIGN.md.
import { PardonHost } from './host.js';
import { LINES } from './content/lines.js';
import { TUNES } from './content/tunes.js';

const readerIsMe = (e, me) => e.phase.payload?.reader === me;

export default {
  id: 'pardon',
  title: 'Pardon?',
  dish: 'cloche',
  course: 'Something mumbled under a cloche',
  hint: 'Say it, hear it',
  tagline: 'Read nonsense aloud. Hear sense.',
  blurb: 'Read gibberish out loud until someone hears the real phrase. Mishear a famous line on purpose. Then name Cyril’s tunes, the last one backwards.',
  players: [3, 8],
  minutes: 10,
  steps: [
    'The reader says nonsense out loud. Shout what you hear.',
    'Mishear a famous line. Vote for the funniest.',
    'Cyril plays a tune. Tap its name, fast.',
  ],
  hasAdult: true,
  colour: '#2F5D7C',
  tags: ['Loud', 'Music', 'Words'],
  createHost: (api) => new PardonHost(api),
  screens: () => import('./screens/index.js'),

  bot({ ph, client, later, rand, rng, still, mode, answer }) {
    const me = client.state.me;
    const p = ph.payload || {};
    const mine = () => client.state.mine.game || {};
    switch (ph.id) {
      case 'pardon-read': {
        if (p.reader !== me) return true; // guessers shout; nothing to tap
        const others = client.state.players.filter((x) => x.id !== me);
        const who = rng() < 0.15 || !others.length ? 'none' : others[Math.floor(rng() * others.length)].id;
        later(rand(3500, 16000), () => { if (still() && !mine().sent) client.act('pd-got', { id: who }, { sent: true, id: who }); });
        return true;
      }
      case 'pardon-tune': {
        const opts = p.options || [];
        const known = TUNES.find((t) => t.notes === p.notes); // a bot "recognises" it 60% of the time
        const right = opts.find((o) => o.id === known?.id) || null;
        const pick = rng() < (p.mode === 'normal' ? 0.65 : 0.45) && right ? right : opts[Math.floor(rng() * opts.length)];
        later((p.playAt || 0) + rand(1800, 9000), () => { if (still() && !mine().id && pick) client.act('pd-tune', { id: pick.id }, { id: pick.id }); });
        return true;
      }
      case 'pardon-write': {
        const line = LINES.find((l) => l.line === p.line);
        const eg = (line?.eg || []).slice(1); // eg[0] is the on-screen example
        const text = rng() < 0.7 && eg.length ? eg[Math.floor(rng() * eg.length)] : answer();
        later(rand(4000, 20000), () => { if (still() && !mine().text) client.act('pd-write', { text }, { text }); });
        return true;
      }
      case 'pardon-vote': {
        const mineKeys = client.state.phase.private?.mine || [];
        const opts = (p.entries || []).filter((e) => !mineKeys.includes(e.key));
        if (!opts.length) return true;
        const key = opts[Math.floor(rng() * opts.length)].key;
        later(rand(2500, 12000), () => { if (still() && !mine().key) client.act('pd-vote', { key }, { key }); });
        return true;
      }
      default:
        return false; // intros and reveals: the box brain throws the odd bread roll
    }
  },

  resolveScreen(state) {
    const ph = state.phase;
    if (!ph || ph.game !== 'pardon') return null;
    if (ph.id === 'pardon-read') return ph.payload?.reader === state.me ? 'pardon-read' : 'pardon-listen';
    return null;
  },

  demos: {
    'pardon-intro': { match: (e) => e.phase.id === 'pardon-intro', t: 2600 },
    'pardon-round': { match: (e) => e.phase.id === 'pardon-round' && e.phase.payload.round === 1, t: 1800 },
    'pardon-round-2': { match: (e) => e.phase.id === 'pardon-round' && e.phase.payload.round === 2, t: 1800 },
    'pardon-round-3': { match: (e) => e.phase.id === 'pardon-round' && e.phase.payload.round === 3, t: 1800 },
    'pardon-read': { match: (e, me) => e.phase.id === 'pardon-read' && readerIsMe(e, me), me: 'idle', bots: 'idle', t: 6000 },
    'pardon-listen': { match: (e, me) => e.phase.id === 'pardon-read' && !readerIsMe(e, me), me: 'idle', bots: 'idle', t: 8000 },
    'pardon-steal': { match: (e, me) => e.phase.id === 'pardon-read' && !readerIsMe(e, me), me: 'idle', bots: 'idle', t: (p) => p.payload.stealAt + 2500 },
    'pardon-said': { match: (e) => e.phase.id === 'pardon-said' && !!e.phase.payload.got, t: 2600 },
    'pardon-tune': { match: (e) => e.phase.id === 'pardon-tune', me: 'idle', bots: 'some', t: (p) => p.payload.playAt + 4000 },
    'pardon-tune-weird': { match: (e) => e.phase.id === 'pardon-tune' && e.phase.payload.mode !== 'normal', me: 'idle', bots: 'some', t: (p) => p.payload.playAt + 3000 },
    'pardon-tune-reveal': { match: (e) => e.phase.id === 'pardon-tune-reveal', t: 3200 },
    'pardon-write': { match: (e) => e.phase.id === 'pardon-write', me: 'idle', bots: 'some', t: 9000 },
    'pardon-vote': { match: (e) => e.phase.id === 'pardon-vote', me: 'idle', bots: 'some', t: 6000 },
    'pardon-verdict': { match: (e) => e.phase.id === 'pardon-verdict', t: (p) => p.payload.start + p.payload.per * p.payload.entries.length + 900 },
  },

  lines: {
    family: {
      pdIntro: [
        ['Pardon? A game of saying things badly and hearing them worse.', 'Speak up. I’m a candle, not a mind reader.'],
        ['Pardon? Read nonsense, hear sense.', 'Shout over each other. It’s encouraged. For once.'],
      ],
      pdIntroAgain: [['Back for more mumbling. Splendid.'], ['Again? My wick can take it. My ears, less so.']],
      pdRead: [['Read it straight. No helping. The table will get there.'], ['Say it like you mean it. You don’t, but say it anyway.']],
      pdListen: [['{name} is reading. Shout whatever you hear.'], ['Ears open, everyone. {name} has nonsense to share.'], ['Listen to {name}. Then shout. Loudly.']],
      pdSteal: [['Still nothing? Fine. Everyone gets a look.'], ['Here it is. Read it yourselves. Mutter away.']],
      pdGot: [['Got it! The ears have it.'], ['Splendid. Somebody was listening.'], ['There it is. Took you long enough. Lovely.']],
      pdQuick: [['Under ten seconds. Frankly, show-offs.'], ['That was quick. Suspiciously quick.']],
      pdNobody: [['Nobody. Not one ear between you.'], ['Oh dear. It meant something. Honestly.']],
      pdTune: [['I shall play. You shall name it. Fast.'], ['A little tune. Name it before your neighbour does.']],
      pdTuneWonky: [['Same tune, wrong octaves. I’ve had a sherry.'], ['A familiar tune, badly dressed. Double points.']],
      pdTuneBack: [['Now backwards. Like my career.'], ['Back to front. Double points if you can stand it.']],
      pdTuneAll: [['All of you! I’m touched.'], ['Every ear in the room. Splendid.']],
      pdTuneNone: [['Nobody? It’s a classic. I’m wounded.'], ['Not one of you. I’ll play it at my own funeral.']],
      pdWrite: [['Mishear it on purpose. The sillier the better.'], ['That’s what they sang. What did you hear?']],
      pdVote: [['Vote for the funniest mishearing. Not your own. I’m watching.']],
      pdVerdict: [['And the ear of the evening goes to...'], ['The funniest mishearing tonight...']],
    },
    adult: {
      pdIntro: [
        ['Pardon? Read filth that looks like nonsense.', 'Straight face, please. That’s the hard part.'],
        ['Pardon? after dark. Say it out loud. Regret it later.'],
      ],
      pdRead: [['Read it exactly as written. Innocently. Ha.'], ['Straight face. Do not look at your mother.']],
      pdGot: [['Got it! Filthy. Well done.'], ['There it is. I’m blushing. Through the wax.']],
      pdNobody: [['Nobody? You’re all far too innocent. Or drunk.']],
      pdWrite: [['Mishear it. Make it rude. Make your nan blush.'], ['Go on. Ruin a classic. That’s the game.']],
      pdVerdict: [['And the filthiest ear in the house...']],
    },
  },
};
