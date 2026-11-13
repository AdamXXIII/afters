// Character Witness: one of you is in the dock with a question about themselves. They answer
// truthfully; everyone else writes a fake in their voice; the table picks the real one.
// Finale: Cross-examination (last place takes the stand, one fake beside the truth, double points).
// Rules + screens: ./DESIGN.md. AI-generated (Claude, Character Witness builder, 2026-11-13).
import { WitnessHost } from './host.js';
import { HOUSE } from './content/questions.js';

const isDef = (e, me) => e.phase.payload?.defendant === me;
/** Demo helper: make this phone the cross-examination defendant once the standings are in. */
const meOnStand = (e, me) => {
  if (e.phase.id === 'witness-scores') {
    const h = e.game?.host;
    const last = h?.rounds?.[h.rounds.length - 1];
    if (last?.final) last.defendant = me;
  }
};
const stepAt = (kind, plus) => (p) => { const s = p.payload.steps.find((x) => x.kind === kind); return s ? s.at + plus : 2000; };
const normal = (e, me) => e.phase.id === 'witness-reveal' && e.phase.payload.outcome === 'normal' && !isDef(e, me) && !e.phase.payload.final;

export default {
  id: 'witness',
  title: 'Character Witness',
  dish: 'cloche',
  course: 'Something under the cloche. Nobody will say what.',
  hint: 'Bluff about each other',
  tagline: 'How well do you really know the people at this table?',
  blurb: 'One of you is in the dock with a question about yourself. Answer it honestly. Everyone else fakes your answer in your voice. The table has to find the real one.',
  players: [3, 8],
  minutes: 12,
  steps: [
    'One of you answers a question about yourself. Honestly.',
    'Everyone else writes a fake answer in that person’s voice.',
    'The table picks the real one. Fool them to score.',
  ],
  hasAdult: true,
  colour: '#2F5D7C',
  tags: ['Writing', 'Bluffing', 'About you'],
  createHost: (api) => new WitnessHost(api),
  screens: () => import('./screens/index.js'),

  bot({ ph, client, later, rand, rng, still }) {
    const me = client.state.me;
    const p = ph.payload || {};
    const mine = () => client.state.mine.game || {};
    const bank = client.state.settings?.rating === 'adult' ? HOUSE.adult : HOUSE.family;
    const say = () => { const list = bank[p.kind] || bank.thing; return list[Math.floor(rng() * list.length)]; };
    switch (ph.id) {
      case 'witness-write': {
        const fifth = p.defendant === me && p.fifthLeft && rng() < 0.15;
        later(rand(1500, 9000), () => { if (still() && !mine().sent) { const text = say(); client.act('wt-answer', { text, fifth }, { sent: text, fifth }); } });
        return true;
      }
      case 'witness-pick': {
        if (p.defendant === me) return true;
        const own = ph.private?.ownOptionId;
        const opts = p.options.filter((o) => o.id !== own);
        later(rand(1500, 7000), () => { if (still() && !mine().pick && opts.length) { const o = opts[Math.floor(rng() * opts.length)]; client.act('wt-pick', { optionId: o.id }, { pick: o.id }); } });
        return true;
      }
      case 'witness-choose': {
        if (p.defendant !== me) return true;
        later(rand(1500, 6000), () => { if (still() && !mine().kept && p.fakes.length) { const o = p.fakes[Math.floor(rng() * p.fakes.length)]; client.act('wt-keep', { optionId: o.id }, { kept: o.id }); } });
        return true;
      }
      default:
        return false; // intro, reveal, scores: let the box brain throw the odd bread roll
    }
  },

  resolveScreen(state) {
    const ph = state.phase;
    if (!ph || ph.game !== 'witness') return null;
    const def = ph.payload?.defendant === state.me;
    const sent = !!state.mine?.game?.sent || !!state.progress?.done?.[state.me];
    if (ph.id === 'witness-write') return sent ? 'witness-wait' : def ? 'witness-dock' : 'witness-write';
    if (ph.id === 'witness-pick') return def ? 'witness-sweat' : 'witness-pick';
    if (ph.id === 'witness-choose') return def ? 'witness-choose' : 'witness-recess';
    return null;
  },

  demos: {
    'witness-intro': { match: (e) => e.phase.id === 'witness-intro', t: 3200 },
    'witness-write': { match: (e, me) => e.phase.id === 'witness-write' && !isDef(e, me) && !e.phase.payload.final, me: 'idle', bots: 'some', t: 12000 },
    'witness-dock': { match: (e, me) => e.phase.id === 'witness-write' && isDef(e, me) && !e.phase.payload.final, me: 'idle', bots: 'some', t: 9000 },
    'witness-wait': { match: (e, me) => e.phase.id === 'witness-write' && !isDef(e, me) && !e.phase.payload.final, me: 'act', bots: 'some', t: 18000 },
    'witness-pick': { match: (e, me) => e.phase.id === 'witness-pick' && !isDef(e, me) && !e.phase.payload.final, me: 'idle', bots: 'some', t: 6000 },
    'witness-sweat': { match: (e, me) => e.phase.id === 'witness-pick' && isDef(e, me) && !e.phase.payload.final, me: 'idle', bots: 'some', t: 6000 },
    'witness-reveal-fake': { match: (e, me) => normal(e, me) && e.phase.payload.steps.some((s) => s.kind === 'fake'), t: stepAt('fake', 1500) },
    'witness-reveal': { match: normal, t: stepAt('truth', 1900) },
    'witness-verdict': { match: normal, t: stepAt('verdict', 1400) },
    'witness-scores': { match: (e) => e.phase.id === 'witness-scores', t: 2600 },
    'witness-cross-intro': { match: (e) => e.phase.id === 'witness-cross-intro', t: 3000 },
    'witness-choose': { match: (e, me) => { meOnStand(e, me); return e.phase.id === 'witness-choose'; }, me: 'idle', bots: 'some', t: 5000 },
    'witness-recess': { match: (e, me) => e.phase.id === 'witness-choose' && !isDef(e, me), me: 'idle', bots: 'idle', t: 5000 },
    'witness-cross-pick': { match: (e, me) => e.phase.id === 'witness-pick' && e.phase.payload.final && !isDef(e, me), me: 'idle', bots: 'some', t: 5000 },
    'witness-cross-reveal': { match: (e, me) => e.phase.id === 'witness-reveal' && e.phase.payload.final && !isDef(e, me), t: stepAt('truth', 1900) },
  },

  lines: {
    family: {
      wtIntro: [
        ['Character Witness. One of you takes the stand. The rest of you lie about them.', 'Under oath. Ish.'],
        ['Order at the table! One of you answers about yourself. The others make it up.'],
      ],
      wtIntroAgain: [['Back in court. The jury has had time to think. Worrying.'], ['Another sitting. I\'ve polished the gavel.']],
      wtDock: [['You\'re in the dock. Tell the truth. They\'re about to lie about you.'], ['The court asks about you. Honestly, please. I\'ll know.']],
      wtWrite: [
        ['{name} is in the dock. Write what {name} would say.'],
        ['Fake {name}\'s answer. Their voice, your lie.'],
        ['Think like {name}. Then lie like {name}.'],
      ],
      wtWait: [['Statement taken. Keep a straight face.'], ['Sworn and sealed. Look innocent.']],
      wtPick: [['Which one did {name} actually write?'], ['One of these is really {name}. The rest are impostors.']],
      wtSweat: [['They\'re judging you. Don\'t move your face.'], ['Poker face, please. The jury is watching.']],
      wtFooledMany: [['That fake fooled {n} of you. I\'m impressed and slightly frightened.']],
      wtFound: [['Found! Some of you know {name} rather well.'], ['The truth will out. It usually does.']],
      wtNobody: [['Nobody found the real {name}. Do any of you actually know each other?'], ['Not one of you. {name} is a stranger at their own table.']],
      wtFifth: [['{name} pleaded the fifth. That was a lie too. In their own handwriting.']],
      wtSilent: [['{name} said nothing. Contempt of court. Nobody scores.']],
      wtScores: [['The standings. Last place takes the stand for the final sitting.']],
      wtCross: [['Cross-examination! One truth, one lie, double points.'], ['The final sitting. Two answers. One is real. Everything doubles.']],
      wtChoose: [['Keep the lie you want beside your truth. Pick a convincing one.']],
      wtRecess: [['Short recess. {name} is choosing which lie to keep.']],
    },
    adult: {
      wtIntro: [
        ['Character Witness. One of you confesses. The rest of you make up something filthier.'],
        ['Order at the table. Someone\'s about to say something they can\'t take back.'],
      ],
      wtDock: [['You\'re in the dock. Tell the truth. Or plead the fifth, you coward.']],
      wtWrite: [['{name} is in the dock. Write what they\'d say. Be as rude as they are.'], ['Fake {name}\'s answer. Go on. You know them.']],
      wtSweat: [['They\'re judging you. Some people pay for that.']],
      wtNobody: [['Nobody found the real {name}. Clearly a dark horse.']],
      wtFifth: [['{name} pleaded the fifth. Very wise. Mind you, we can guess.']],
    },
  },
};
