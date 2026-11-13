// Bad Taste: a rotating Critic, a private hand of seven answer cards (plus a blank to write your
// own), anonymous cards turned over one at a time, and the Critic crowns the one they like.
// Rules + screens: ./DESIGN.md. AI-generated (Claude, Bad Taste builder, 2026-11-13).
import { BadTasteHost } from './host.js';
import { STEPS } from './screens/steps.js';

const isCritic = (e, me) => e.phase.payload?.critic === me;
/** Demo helper: seat this phone in (or out of) the Critic's chair before round one is dealt. */
const seat = (critic) => (e, me) => {
  if (e.phase.id === 'badtaste-intro') e.game?.host?._demoCritic(me, critic);
};
/** Demo helper: turn some cards over on the judging table. */
const turn = (e, n) => {
  const h = e.game?.host;
  if (h?.r && h.r.flipped !== Math.min(n, h.r.cards.length)) h._demoJudge(n);
};

export default {
  id: 'badtaste',
  title: 'Bad Taste',
  dish: 'cheeseboard',    // menu illustration (src/screens/menu-art.js; falls back to the cloche until drawn)
  dishNotes: 'A cheeseboard with one dubious blue cheese and a little brass flag stuck in it reading "pick". Claret board, linen crackers.',
  mood: ['talky', 'rude'], // menu filters: loud, talky, sneaky, clever, drawing, rude (18+)
  course: 'The cheeseboard. Some of it is questionable.',
  hint: 'Play cards, one judges',
  tagline: 'Play your worst card. Please one person.',
  blurb: 'Each round one of you is the Critic. Everyone else plays the funniest answer from their hand to fill the blank. The Critic reads them out and crowns one.',
  players: [3, 8],
  minutes: 12,
  steps: STEPS,
  hasAdult: true,
  colour: '#7A1E2C',
  tags: ['Cards', 'Judging', 'Rude'],
  createHost: (api) => new BadTasteHost(api),
  screens: () => import('./screens/index.js'),

  bot({ ph, client, later, rand, rng, still }) {
    const me = client.state.me;
    const p = ph.payload || {};
    const mine = () => client.state.mine.game || {};
    switch (ph.id) {
      case 'badtaste-play': {
        if (p.critic === me) return true;
        const hand = ph.private?.hand || [];
        later(rand(1500, 9000), () => {
          if (!still() || mine().played || !hand.length) return;
          const c = hand[Math.floor(rng() * hand.length)];
          client.act('bt-play', { cardId: c.id }, { played: c.text });
        });
        return true;
      }
      case 'badtaste-judge': {
        if (p.critic !== me) return true;
        const n = p.cards?.length || 0;
        let t = 0;
        for (let k = 0; k < n; k++) { t += rand(1800, 3000); later(t, () => { if (still()) client.act('bt-flip', {}, {}); }); }
        t += rand(1200, 2600);
        const pick = Math.floor(rng() * n);
        later(t, () => { if (still()) client.act('bt-focus', { index: pick }, {}); });
        later(t + 900, () => { if (still() && n) client.act('bt-crown', { index: pick }, { crowned: pick }); });
        return true;
      }
      default:
        return false; // intro, win: let the box brain throw the odd bread roll
    }
  },

  resolveScreen(state) {
    const ph = state.phase;
    if (!ph || ph.game !== 'badtaste') return null;
    if (ph.id === 'badtaste-play') {
      if (ph.payload?.critic === state.me) return 'badtaste-critic';
      return state.mine?.game?.played || state.progress?.done?.[state.me] ? 'badtaste-played' : 'badtaste-hand';
    }
    return null;
  },

  demos: {
    'badtaste-intro': { match: (e) => e.phase.id === 'badtaste-intro', t: 3500 },
    'badtaste-hand': { match: (e, me) => { seat(false)(e, me); return e.phase.id === 'badtaste-play' && !isCritic(e, me); }, me: 'idle', bots: 'some', t: 9000 },
    'badtaste-played': { match: (e, me) => { seat(false)(e, me); return e.phase.id === 'badtaste-play' && !isCritic(e, me); }, me: 'act', bots: 'some', t: 16000 },
    'badtaste-critic': { match: (e, me) => { seat(true)(e, me); return e.phase.id === 'badtaste-play' && isCritic(e, me); }, me: 'idle', bots: 'some', t: 12000 },
    'badtaste-judge': { match: (e, me) => { seat(true)(e, me); if (e.phase.id === 'badtaste-judge') turn(e, 2); return e.phase.id === 'badtaste-judge' && isCritic(e, me); }, me: 'idle', bots: 'idle', t: 9000 },
    'badtaste-judge-crown': { match: (e, me) => { seat(true)(e, me); if (e.phase.id === 'badtaste-judge') turn(e, 99); return e.phase.id === 'badtaste-judge' && isCritic(e, me); }, me: 'idle', bots: 'idle', t: 20000 },
    'badtaste-judge-watch': { match: (e, me) => { seat(false)(e, me); if (e.phase.id === 'badtaste-judge') turn(e, 3); return e.phase.id === 'badtaste-judge' && !isCritic(e, me); }, me: 'idle', bots: 'idle', t: 12000 },
    'badtaste-win': { match: (e) => e.phase.id === 'badtaste-win', t: 6500 },
    'badtaste-win-owner': { match: (e) => e.phase.id === 'badtaste-win', t: 2600 },
  },

  lines: {
    family: {
      btIntro: [
        ['Bad Taste. Play the worst card you own. Proudly.'],
        ['One of you judges. The rest of you grovel. Lovely.'],
      ],
      btIntroAgain: [['Back for more. Your taste hasn’t improved.'], ['Another hand. Same terrible people.']],
      btHand: [
        ['Play to {name}. Not to me. I have standards.'],
        ['Think about what makes {name} laugh. Then lower it.'],
        ['Pick one. Try it in the blank. Commit.'],
      ],
      btLast: [['Last round. Play the card you’ve been saving.']],
      btCritic: [['You’re the Critic. Look unimpressed. It helps.'], ['Sit back. Let them work for it.']],
      btPlayed: [['Face down. Deny everything.'], ['In the pile. Nobody knows it’s yours. Yet.']],
      btJudge: [['Read every one out loud. Do the voices.'], ['Turn them over. Slowly. Make them sweat.']],
      btWatch: [['Straight face. {name} is watching.'], ['Don’t laugh at your own. Dead giveaway.']],
      btWin: [['{name}! Shameless. Brilliant.'], ['That was {name}. Of course it was.'], ['{name} takes the crown. {critic} has questionable taste.']],
      btHouse: [['That was mine. I win. Nobody scores. Marvellous.'], ['My card! The Critic has taste after all.']],
      btCyrilChose: [['Too slow. I picked. {name} gets the crown.']],
    },
    adult: {
      btIntro: [
        ['Bad Taste. Play the worst thing in your hand. I mean it.'],
        ['One of you judges. The rest of you suck up. Shamelessly.'],
        ['Cards out. Dignity in the bin.'],
      ],
      btHand: [
        ['Play to {name}’s sense of humour. God help you.'],
        ['What would make {name} snort? Play that. Fuck subtlety.'],
        ['Pick the one you’d be ashamed to explain to your mum.'],
      ],
      btCritic: [['You’re the Critic. Be a bastard about it.'], ['Sit back. Judge them. You’ve earned it.']],
      btPlayed: [['Face down. Nobody needs to know it was you.']],
      btJudge: [['Read them out properly. Pause before the punchline.'], ['Turn them over. Do a voice. A bad one.']],
      btWatch: [['Don’t laugh at your own card, you absolute amateur.']],
      btWin: [['{name}! Disgusting. Well done.'], ['That was {name}. Nobody’s surprised.'], ['{name} wins. {critic}, have a word with yourself.']],
      btHouse: [['That was my card, you lot. Nobody scores. Get fucked.'], ['Mine! Beaten by a candle. Shameful.']],
      btCyrilChose: [['Took too bloody long. I picked. {name}, lucky you.']],
    },
  },
};
