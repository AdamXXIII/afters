// Odd Sock: everyone gets the same secret word except one player, who gets a close one and
// doesn't know it. One word each, out loud, round the table. Then a live vote. Caught? The Odd
// Sock gets one guess at the table's word to steal the round.
// Rules + screens: ./DESIGN.md. AI-generated (Claude, Odd Sock builder, 2026-11-13).
import { OddSockHost } from './host.js';
import { PAIRS } from './content/pairs.js';

const host = (e) => e.game?.host;
/** Demo rigging: make this phone (or someone else) the Odd Sock, and/or force the verdict. */
const rig = (e, spec) => { const h = host(e); if (h && e.phase.id === 'oddsock-intro') h.rig = { ...(h.rig || {}), ...spec }; };
const other = (e, me) => e.players.find((p) => p.id !== me)?.id;
const atFlip = (extra) => (p) => (p.payload.flipAt || 2000) + extra;

/** Bots can't hear, so a caught bot guesses the other word of whichever pair its word is in. */
function botGuess(word, rng) {
  const all = [...PAIRS.family, ...PAIRS.adult];
  const pair = all.find((p) => p.a === word || p.b === word);
  if (pair && rng() < 0.45) return pair.a === word ? pair.b : pair.a;
  return word;
}

export default {
  id: 'oddsock',
  title: 'Odd Sock',
  dish: 'socks',            // menu illustration key; not in menu-art.js yet (falls back to the cloche). See DESIGN.md.
  mood: ['talky', 'sneaky'],
  course: 'A pair of socks on the tablecloth. One of them isn\'t.',
  hint: 'One of you has a different word',
  tagline: 'Everyone has the same word. Almost everyone.',
  blurb: 'Everyone gets the same secret word, except the Odd Sock, who gets a close one and doesn\'t know. One word each, out loud. Then vote out the Odd Sock.',
  players: [4, 8],
  minutes: 14,
  steps: [
    'Everyone gets the same secret word. One of you gets a slightly different one, and doesn’t know.',
    'Take turns saying one word about your word, out loud. Then vote for the Odd Sock.',
    'Caught? The Odd Sock gets one guess at everyone else’s word to steal the round.',
  ],
  hasAdult: true,
  colour: '#3E8E8A',
  tags: ['Talking', 'Bluffing', 'Voting'],
  createHost: (api) => new OddSockHost(api),
  screens: () => import('./screens/index.js'),

  bot({ ph, client, later, rand, rng, still }) {
    const me = client.state.me;
    const p = ph.payload || {};
    const mine = () => client.state.mine.game || {};
    switch (ph.id) {
      case 'oddsock-word':
        later(rand(1200, 5000), () => { if (still() && !mine().ready) client.act('os-ready', {}, { ready: true }); });
        return true;
      case 'oddsock-clue':
        if (p.speaker === me) later(rand(1800, 4500), () => { if (still() && !mine().said) client.act('os-said', {}, { said: true }); });
        return true;
      case 'oddsock-vote': {
        const others = (p.order || []).filter((id) => id !== me);
        later(rand(2500, 14000), () => {
          if (!still() || mine().vote || !others.length) return;
          const to = others[Math.floor(rng() * others.length)];
          client.act('os-vote', { to }, { vote: to });
        });
        return true;
      }
      case 'oddsock-guess':
        if (p.sock === me) later(rand(3000, 9000), () => { if (still() && !mine().guess) { const text = botGuess(p.oddWord, rng); client.act('os-guess', { text }, { guess: text }); } });
        return true;
      default:
        return false;
    }
  },

  demos: {
    'oddsock-intro': { match: (e) => e.phase.id === 'oddsock-intro', t: 3600 },
    'oddsock-word': { match: (e) => e.phase.id === 'oddsock-word', me: 'idle', bots: 'some', t: 5000 },
    'oddsock-clue-you': { match: (e, me) => e.phase.id === 'oddsock-clue' && e.phase.payload.speaker === me && e.phase.payload.turn > 0, me: 'idle', bots: 'some', t: 4000 },
    'oddsock-clue': { match: (e, me) => e.phase.id === 'oddsock-clue' && e.phase.payload.speaker !== me && e.phase.payload.turn >= 2, me: 'idle', bots: 'idle', t: 6000 },
    'oddsock-vote': { match: (e) => e.phase.id === 'oddsock-vote', me: 'idle', bots: 'some', t: 16000 },
    'oddsock-reveal': { match: (e, me) => { rig(e, { catch: true, sock: other(e, me) }); return e.phase.id === 'oddsock-reveal'; }, t: atFlip(900) },
    'oddsock-vote-again': { match: (e, me) => { rig(e, { miss: true, sock: other(e, me) }); return e.phase.id === 'oddsock-vote' && (e.phase.payload.out || []).length > 0; }, me: 'idle', bots: 'some', t: 12000 },
    'oddsock-reveal-again': { match: (e, me) => { rig(e, { miss: true, sock: other(e, me) }); return e.phase.id === 'oddsock-reveal' && e.phase.payload.again; }, t: atFlip(900) },
    'oddsock-reveal-escaped': { match: (e, me) => { rig(e, { miss: true, sock: other(e, me) }); return e.phase.id === 'oddsock-reveal' && !e.phase.payload.again && !e.phase.payload.caught; }, t: atFlip(900) },
    'oddsock-guess': { match: (e, me) => { rig(e, { catch: true, sock: me }); return e.phase.id === 'oddsock-guess'; }, me: 'idle', t: 6000 },
    'oddsock-guess-wait': { match: (e, me) => { rig(e, { catch: true, sock: other(e, me) }); return e.phase.id === 'oddsock-guess'; }, me: 'idle', bots: 'idle', t: 6000 },
    'oddsock-round': { match: (e, me) => { rig(e, { catch: true, sock: other(e, me) }); return e.phase.id === 'oddsock-round'; }, t: 2600 },
    'oddsock-round-escaped': { match: (e, me) => { rig(e, { miss: true, sock: other(e, me) }); return e.phase.id === 'oddsock-round'; }, t: 2600 },
  },

  lines: {
    family: {
      osIntro: [['Odd Sock. You all have the same word. Nearly all of you.'], ['Same word for everyone. Bar one. Bar who? Exactly.']],
      osIntroAgain: [['Back to the laundry. Somebody doesn’t match.'], ['Another wash. One of you is the odd one out.']],
      osWord: [['Remember your word. Don’t say it. Don’t even think it loudly.'], ['Your word. Keep it to yourself. One of you has a different one.']],
      osYou: [['Your turn. One word. Not too obvious, not too odd.'], ['One word about yours. Out loud. Steady.']],
      osClue: [['Listen to {name}. Does that fit your word?'], ['{name} has the floor. One word, please.'], ['Over to {name}. No pressure. Some pressure.']],
      osVote: [['Who doesn’t match? Argue it out. Change your vote all you like.'], ['Point at the odd sock. Out loud is fine. Encouraged, even.']],
      osCaught: [['Caught! {name} was the Odd Sock.'], ['There it is. {name}, you don’t match.']],
      osWrong: [['Wrong sock. {name} was perfectly normal. Rude.'], ['Not {name}. The real Odd Sock is still sitting there, smiling.']],
      osWrongYou: [['They picked you. You were perfectly normal. Rude.'], ['Wrong sock. You were innocent all along.']],
      osAgainYou: [['Wrong sock. You’re out. Sit back and judge them.']],
      osAgain: [['Wrong sock. {name} is out. Round again, the rest of you.'], ['Not {name}. The Odd Sock is still in there. Another lap.']],
      osTie: [['A tie. Nobody leaves the wash.']],
      osGuess: [['{name} gets one guess at your word. Faces like stone, please.'], ['Quiet. {name} is working it out.']],
      osGuessYou: [['You’re the Odd Sock. Guess their word and the round is yours.']],
      osStolen: [['{name} guessed it! Daylight robbery.'], ['Stolen! {name} worked out the word. Disgraceful. Brilliant.']],
      osMissed: [['Wrong guess. The table keeps the round.']],
      osEscaped: [['{name} got away with it. Nobody suspected a thing.'], ['The Odd Sock escapes. {name}, take a bow.']],
      osFinal: [['Last wash. Double points. Do concentrate.']],
    },
    adult: {
      osIntro: [['Odd Sock. One of you has the wrong word and no bloody idea.'], ['Same word for everyone. Except one poor sod.']],
      osWord: [['Your word. Don’t say it. Don’t even look smug about it.'], ['Memorise it. One of you is about to bullshit for their life.']],
      osYou: [['Your turn. One word. Don’t fuck it up.'], ['One word, out loud. Make it sound like you know what you’re on about.']],
      osClue: [['{name}’s turn. Watch their face.'], ['Listen to {name}. Does that sound right to you? Hmm.']],
      osVote: [['Who’s the odd one? Shout about it. Nobody’s neighbours are listening.'], ['Vote. Change your mind. Accuse your mates. It’s healthy.']],
      osCaught: [['Caught! {name}, you absolute fraud.'], ['Got you, {name}. Wrong word, the whole time.']],
      osWrongYou: [['They picked you. Wrong sock. You’re allowed to be furious.']],
      osWrong: [['Wrong sock. You’ve just accused {name} for nothing. Lovely.'], ['Not {name}. The real Odd Sock is laughing their arse off.']],
      osAgain: [['Wrong sock. {name}’s out. Go round again and do better this time.']],
      osGuess: [['{name} gets one guess at your word. Nobody fucking help them.']],
      osStolen: [['{name} guessed it. Absolute daylight robbery.']],
      osEscaped: [['{name} got away with it. Shameless. Respect.']],
      osFinal: [['Last wash. Double points. Sober up.']],
    },
  },
};
