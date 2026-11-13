// BONCE: forehead guessing. Phone on your bonce, the sofa shouts. See ./DESIGN.md.
import { ForeheadHost, FH } from './host.js';

const turnOf = (e) => e.game?.host?.turn;
const isGuesser = (e, me) => turnOf(e)?.guesserId === me;
const fill = (e) => e.game?.host?._demoFill?.();

/** Bots and autopilot phones. */
function foreheadBot({ ph, client, later, rand, rng, still, mode }) {
  const me = client.state.me;
  const p = ph.payload || {};
  switch (ph.id) {
    case 'forehead-intro':
      if (client.isHost) later(rand(2500, 4000), () => { if (still()) client.act('fh-go', {}, { go: true }); });
      return true;
    case 'forehead-pick': {
      if (p.guesserId === me) { later(rand(800, 2500), () => { if (still()) client.act('fh-ready', {}, { ready: true }); }); return true; }
      if (p.team && p.teams && !p.teams[p.team]?.includes(me)) return true;
      const d = p.decks[Math.floor(rng() * p.decks.length)];
      later(rand(900, 4500), () => { if (still()) client.act('fh-vote', { deck: d.id }, { vote: d.id }); });
      return true;
    }
    case 'forehead-turn': {
      if (p.guesserId !== me || mode === 'instant') return true; // demos fill results themselves
      const step = () => {
        if (!still()) return;
        const idx = client.state.progress?.idx ?? 0;
        if (idx >= p.cards.length) return;
        client.act('fh-mark', { idx, r: rng() < 0.72 ? 'hit' : 'pass' });
        later(rand(2200, 6500), step);
      };
      later(FH.countdown + rand(2500, 5000), step);
      return true;
    }
    case 'forehead-recap':
      if (p.guesserId === me && p.shoutable?.length) {
        later(rand(3500, 6000), () => { if (still()) client.act('fh-shout', { id: p.shoutable[Math.floor(rng() * p.shoutable.length)] }, { shout: true }); });
      }
      return true;
    default:
      return false;
  }
}

export default {
  id: 'forehead',
  title: 'Bonce',
  dish: 'jelly',          // menu illustration (src/screens/menu-art.js)
  mood: ['loud', 'rude'], // menu filters: loud, talky, sneaky, clever, drawing, rude (18+)
  course: 'A wobbly jelly, worn on the head',
  hint: 'Phone on head, table shouts',
  tagline: 'Phone on your forehead. Everyone else shouts.',
  blurb: 'Hold your phone to your bonce while the sofa acts, hums and yells clues. Tip down if you got it, up to pass.',
  players: [2, 8],
  minutes: 10,
  duo: 'One wears the phone, the other describes, and you swap every go.',
  steps: ['Hold your phone to your forehead.', 'Everyone shouts and acts out clues.', 'Tip down if you got it, up to pass.'], // menu "How it plays"
  hasAdult: true, // has 18+ content when the table picks Adults
  colour: '#E2553B',
  tags: ['Shouting', 'Acting', 'Tilt'],
  createHost: (api) => new ForeheadHost(api),
  bot: foreheadBot,
  screens: () => import('./screens/index.js'),
  demos: {
    'forehead-intro': { match: (e) => e.phase.id === 'forehead-intro', me: 'idle', bots: 'idle', t: 2600 },
    'forehead-pick': { match: (e, me) => e.phase.id === 'forehead-pick' && !isGuesser(e, me), me: 'idle', bots: 'some', t: 4200 },
    'forehead-pick-adult': { adult: true, match: (e, me) => e.phase.id === 'forehead-pick' && !isGuesser(e, me), me: 'idle', bots: 'some', t: 4200 },
    'forehead-pick-guesser': { match: (e, me) => e.phase.id === 'forehead-pick' && isGuesser(e, me), me: 'idle', bots: 'act', t: 4200 },
    'forehead-countdown': { match: (e, me) => e.phase.id === 'forehead-turn' && !isGuesser(e, me), me: 'idle', bots: 'idle', t: 1400 },
    'forehead-turn': {
      match: (e, me) => { const ok = e.phase.id === 'forehead-turn' && !isGuesser(e, me); if (ok) fill(e); return ok; },
      me: 'idle', bots: 'idle', t: (ph) => ph.payload.countdown + 21000,
    },
    'forehead-turn-guesser': {
      match: (e, me) => { const ok = e.phase.id === 'forehead-turn' && isGuesser(e, me); if (ok) fill(e); return ok; },
      me: 'idle', bots: 'idle', t: (ph) => ph.payload.countdown + 21000,
    },
    'forehead-turn-adult': {
      adult: true,
      match: (e, me) => { const ok = e.phase.id === 'forehead-turn' && !isGuesser(e, me); if (ok) fill(e); return ok; },
      me: 'idle', bots: 'idle', t: (ph) => ph.payload.countdown + 21000,
    },
    'forehead-turn-teams': {
      match: (e, me) => {
        if (e.phase.id === 'forehead-intro') { e.game.host.setup.mode = 'teams'; return false; }
        const t = turnOf(e);
        const ok = e.phase.id === 'forehead-turn' && t && t.guesserId !== me && e.game.host._teamOf(me) !== t.team;
        if (ok) fill(e);
        return ok;
      },
      me: 'idle', bots: 'idle', t: (ph) => ph.payload.countdown + 21000,
    },
    'forehead-recap': {
      match: (e, me) => { if (e.phase.id === 'forehead-turn') { fill(e); return false; } return e.phase.id === 'forehead-recap' && !isGuesser(e, me); },
      me: 'idle', bots: 'idle', t: 7600,
    },
    // two of you: only the screens that read differently at 2 (shoot with --players 2)
    'forehead-duo-intro': { match: (e) => e.phase.id === 'forehead-intro', me: 'idle', bots: 'idle', t: 2600 },
    'forehead-duo-pick': { match: (e, me) => e.phase.id === 'forehead-pick' && !isGuesser(e, me), me: 'idle', bots: 'some', t: 4200 },
    'forehead-duo-turn': {
      match: (e, me) => { const ok = e.phase.id === 'forehead-turn' && !isGuesser(e, me); if (ok) fill(e); return ok; },
      me: 'idle', bots: 'idle', t: (ph) => ph.payload.countdown + 21000,
    },
    'forehead-duo-recap': {
      match: (e, me) => { if (e.phase.id === 'forehead-turn') { fill(e); return false; } return e.phase.id === 'forehead-recap' && !isGuesser(e, me); },
      me: 'idle', bots: 'idle', t: 7600,
    },
    'forehead-recap-guesser': {
      match: (e, me) => { if (e.phase.id === 'forehead-turn') { fill(e); return false; } return e.phase.id === 'forehead-recap' && isGuesser(e, me); },
      me: 'idle', bots: 'idle', t: 7600,
    },
  },
  lines: {
    family: {
      fhIntro: [
        ['Bonce! One of you wears the phone. Screen out. Everyone else shouts.', 'Tip it down if you got it. Tip it up to pass. Sixty seconds.'],
        ['Phone on your forehead, screen facing out. Yes, you\'ll look daft.', 'That\'s rather the point.'],
      ],
      fhPick: [['Pick {name}\'s poison. Be cruel. Be quick.'], ['The table chooses {name}\'s deck. Choose wisely. Or badly. Funnier.']],
      fhPickDuo: [['Pick {name}\'s deck. You\'re doing the describing, so choose wisely.'], ['Choose {name}\'s poison. Something you can explain. Or something they can\'t guess.']],
      fhPickMe: [['They\'re choosing your deck. Turn sideways. Look brave.'], ['Phone sideways, screen out, on the bonce. Ready when you are.']],
      fhMod_mime: [['House rule: mime only. Not a peep. I\'m watching.']],
      fhMod_oneword: [['House rule: one word clues. Choose them like you\'re paying by the word.']],
      fhMod_posh: [['House rule: posh voices. Every clue as if you own a horse.']],
      fhGoDuo: [['Bonce on! Describe away!'], ['And... talk!'], ['Off you pop. Words, please.']],
      fhGo: [['Bonce on! Go go go!'], ['And... shout!'], ['Off you pop!']],
      fhStreak: [['Three on the bounce! Mind the flame.'], ['A hat-trick! Steady on.'], ['On fire. Not literally. That\'s my job.']],
      fhFoul: [['FOUL! You said it. I heard you. Everyone heard you.']],
      fhTimeUp: [['Time! Phones down, dignity back on.']],
      fhRecap0: [['Nought. A clean sheet. Of shame.'], ['Not one. I\'ve seen napkins do better.']],
      fhRecapLow: [['{n}. Respectable. In a quiet sort of way.'], ['{n}. The table did its best. Mostly shouting.']],
      fhRecapMid: [['{n}! That\'s a proper bonce.'], ['{n}. Lovely work. Somebody fetch a towel.']],
      fhRecapHigh: [['{n}! Extraordinary. Is your forehead psychic?'], ['{n}! I need a sit down. And I don\'t have legs.']],
      fhShout: [['Top shouter: {name}. Hoarse, but worth it.'], ['{name} gets the shouting medal. Lozenges are in the drawer.']],
      fhNext: [['Next bonce: {name}. Hand it over.'], ['{name}, you\'re up. Find your forehead.']],
    },
    adult: {
      fhIntro: [
        ['Bonce! Phone on your forehead, screen out. Yes, you look a twat. Everyone does.', 'Tip down if you got it, up to pass. Sixty seconds. Go on.'],
        ['Phone on the bonce. Everyone else, shout like the pub\'s on fire.', 'Down for got it, up to pass. Don\'t overthink it. You\'re not capable tonight.'],
      ],
      fhPick: [['Pick {name}\'s poison. Make it hurt.'], ['Choose {name}\'s deck. Something they\'ll be shit at.']],
      fhPickDuo: [['Pick {name}\'s deck. You\'re the one describing it, genius.'], ['Choose {name}\'s poison. Make it hurt. You still have to explain it.']],
      fhPickMe: [['They\'re choosing your deck. Brace yourself, sunshine.'], ['They\'re picking for you. They don\'t like you. Phone up.']],
      fhMod_mime: [['Mime only. Not a fucking peep.']],
      fhMod_oneword: [['One word clues. One. Count it on one finger.']],
      fhMod_posh: [['Posh voices. Swear like a duchess at a gymkhana.']],
      fhGoDuo: [['Go on then! Talk, you bastard!'], ['Bonce on! Words. Now.']],
      fhGo: [['Go on then!'], ['Bonce on! Shout, you bastards!']],
      fhStreak: [['Three on the bounce! Who are you and what have you done with the idiot?'], ['Hat-trick! Bloody hell.']],
      fhTimeUp: [['Time! Put the phone down and have a drink.']],
      fhRecap0: [['Nought. Not one. Absolutely fuck all.'], ['None. Shit for everyone. Mostly you.']],
      fhRecapLow: [['{n}. Bollocks, but honest bollocks.']],
      fhRecapHigh: [['{n}! Steady. Somebody check that phone for cheats.'], ['{n}! Fucking hell. Have a crisp.']],
      fhShout: [['Top shouter: {name}. Lost their voice, gained my respect.']],
      fhFoul: [['FOUL! You said it. Out loud. You absolute melon.']],
    },
  },
};
