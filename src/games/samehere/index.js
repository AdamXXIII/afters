// Same Here: a plain question, everyone writes one answer in secret, and you score for matching
// the most popular answer. Alone with your answer? You get the Wobbly Chair, and you can't win
// while you're sitting on it. Answers that mean the same thing are grouped: obvious ones on their
// own, close calls by a live table vote. Rules + screens: ./DESIGN.md.
// AI-generated (Claude, Same Here builder, 2026-11-13).
import { SameHereHost } from './host.js';
import { QUESTIONS } from './content/questions.js';
import { close } from './group.js';

const STEPS = [
  'A question. Everyone secretly writes one answer.',
  'Match the most popular answer to score a point.',
  'Alone with your answer? Wobbly Chair. You can’t win while you’re on it.',
];

/** A bot's answer: the likely answers, weighted to the top, sometimes spelt differently. */
function botAnswer(q, rating, rng) {
  const list = [...(QUESTIONS[rating] || []), ...QUESTIONS.family, ...QUESTIONS.adult];
  const item = list.find((x) => x.q === q);
  const pool = item?.answers?.length ? item.answers : ['Dunno', 'Something', 'Pass'];
  const w = pool.map((_, i) => 1 / (i + 1.2));
  let r = rng() * w.reduce((a, b) => a + b, 0);
  let pick = pool[0];
  for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) { pick = pool[i]; break; } }
  const words = pick.split(' ');
  const roll = rng();
  if (words.length > 1 && roll < 0.22) return words[words.length - 1]; // "Holmes"
  if (roll < 0.35) return pick.toLowerCase();
  return pick;
}
/** Demo helper: seed a close call ("Sherlock Holmes" vs "Holmes") so the sort screen shows up. */
const sortDemo = (e) => {
  const h = e.game?.host; const r = h?.cur;
  if (e.phase.id === 'samehere-write' && r && !r.seeded) {
    const multi = (r.q.answers || []).find((a) => a.includes(' '));
    const ps = e.players.slice(-2);
    if (multi && ps.length === 2) {
      r.answers[ps[0].id] = multi;
      r.answers[ps[1].id] = multi.split(' ').pop();
      r.fixed = new Set(ps.map((x) => x.id));
      r.seeded = true;
    }
    return false;
  }
  return e.phase.id === 'samehere-sort';
};
const stepAt = (kind, plus, fallback = 2000) => (p) => {
  const s = p.payload.steps.filter((x) => x.kind === kind);
  return s.length ? s[s.length - 1].at + plus : fallback;
};

export default {
  id: 'samehere',
  title: 'Same Here',
  dish: 'teacups',        // menu illustration (src/screens/menu-art.js)
  dishArt: 'Four matching teacups in a row on a doily, a fifth odd one (a chipped willow-pattern cup) perched on a tiny wobbly bentwood chair, one leg short, tilted.',
  mood: ['loud', 'talky', 'clever'],
  course: 'Seconds all round. Everyone has what they’re having.',
  hint: 'Think like the table',
  tagline: 'Don’t be clever. Be everyone else.',
  blurb: 'A plain question, one secret answer each. Match the most popular answer to score. The one person on their own gets the Wobbly Chair, and nobody wins from the Wobbly Chair.',
  players: [3, 8],
  minutes: 10,
  steps: STEPS,
  hasAdult: true,
  colour: '#3E8E8A',
  tags: ['Writing', 'Arguing', 'Quick'],
  createHost: (api) => new SameHereHost(api),
  screens: () => import('./screens/index.js'),

  bot({ ph, client, later, rand, rng, still }) {
    const p = ph.payload || {};
    const mine = () => client.state.mine.game || {};
    const rating = client.state.settings?.rating === 'adult' ? 'adult' : 'family';
    switch (ph.id) {
      case 'samehere-write': {
        later(rand(1500, 9000), () => {
          if (!still() || mine().sent) return;
          const text = botAnswer(p.q, rating, rng);
          client.act('sh-answer', { text }, { sent: text });
        });
        return true;
      }
      case 'samehere-sort': {
        later(rand(1200, 4000), () => {
          if (!still()) return;
          const ds = client.state.progress?.disputes || [];
          const votes = { ...(mine().votes || {}) };
          for (const d of ds) {
            if (votes[d.id] !== undefined || (d.judges && !d.judges.includes(client.state.me))) continue;
            const ta = p.groups.find((g) => g.gid === d.a)?.text; const tb = p.groups.find((g) => g.gid === d.b)?.text;
            votes[d.id] = rng() < (close(ta, tb) ? 0.75 : 0.15);
            client.act('sh-vote', { id: d.id, same: votes[d.id] }, { votes: { ...votes } });
          }
          // now and then a bot claims two answers are the same
          if (p.groups.length >= 3 && ds.length < 2 && rng() < 0.1) {
            const [a, b] = p.groups.slice().sort(() => rng() - 0.5);
            client.act('sh-propose', { a: a.gid, b: b.gid }, { votes });
          }
        });
        later(rand(5000, 9000), () => { if (still()) client.act('sh-done', { done: true }, { done: true }); });
        return true;
      }
      default:
        return false;
    }
  },

  resolveScreen(state) {
    const ph = state.phase;
    if (!ph || ph.game !== 'samehere') return null;
    if (ph.id === 'samehere-write') return (state.mine?.game?.sent || state.progress?.done?.[state.me]) ? 'samehere-wait' : 'samehere-write';
    return null;
  },

  demos: {
    'samehere-intro': { match: (e) => e.phase.id === 'samehere-intro', t: 3200 },
    'samehere-write': { match: (e) => e.phase.id === 'samehere-write', me: 'idle', bots: 'some', t: 9000 },
    'samehere-wait': { match: (e) => e.phase.id === 'samehere-write', me: 'act', bots: 'some', t: 14000 },
    'samehere-sort': { match: sortDemo, me: 'idle', bots: 'some', t: 8000 },
    'samehere-reveal': { match: (e) => e.phase.id === 'samehere-reveal' && e.phase.payload.outcome === 'herd' && e.phase.payload.groups.length >= 2, t: stepAt('group', 700) },
    'samehere-chair': { match: (e) => e.phase.id === 'samehere-reveal' && !!e.phase.payload.lone && e.phase.payload.outcome === 'herd', t: stepAt('chair', 1900) },
    'samehere-standings': { match: (e) => e.phase.id === 'samehere-reveal' && e.phase.payload.round >= 3, t: stepAt('standings', 1600) },
    'samehere-crown': { match: (e) => e.phase.id === 'samehere-crown', t: 3000 },
  },

  lines: {
    family: {
      shIntro: [
        ['Same Here. Don’t be clever. Be everyone else.'],
        ['Tonight we find out who thinks like the table. And who doesn’t.'],
      ],
      shIntroAgain: [['Back for more agreeing. How very British.'], ['Same again? Of course. That’s rather the point.']],
      shWrite: [['First thing that comes into your head. Not the second.'], ['Think what the table would say. Then say that.'], ['Obvious is good. Obvious is lovely.']],
      shWait: [['In. Now hope everyone else is as predictable as you.'], ['Sealed. No changing it.']],
      shSort: [['Same thing or not? Argue it out. Loudly.'], ['Do these count as the same? You decide. I’m only a candle.']],
      shHerd: [['The herd has spoken. {answer}. Of course it was.'], ['{answer}! Great minds. Or very average ones.']],
      shSplit: [['A split table. Nobody scores. Frankly, chaos.'], ['Dead heat at the top. No points. Disgraceful.']],
      shScattered: [['Every answer different. Do you even know each other?']],
      shChair: [['{name}, the Wobbly Chair is yours. Sit carefully.'], ['On your own with that one, {name}. Have a wobble.']],
      shFinal: [['{name} thinks like the table. I don’t know if that’s a compliment.']],
      shRobbed: [['{chair} had the points. But you can’t win from the Wobbly Chair.']],
    },
    adult: {
      shIntro: [
        ['Same Here. Don’t be clever. Clever gets you the Wobbly Chair.'],
        ['Think like the table. God help you.'],
      ],
      shWrite: [['First thing in your head. Don’t overthink it, for fuck’s sake.'], ['What would this lot say? Say that.']],
      shSort: [['Same answer or not? Fight about it. Politely. Ish.'], ['Is that the same thing? Argue. I’ll hold the coats.']],
      shHerd: [['{answer}. Of course it bloody was.'], ['{answer}! You absolute sheep.']],
      shSplit: [['A split table. Nobody scores. Shambles.']],
      shScattered: [['Every answer different. What the hell is wrong with you all?']],
      shChair: [['{name}, Wobbly Chair. Nobody else said that. Nobody.'], ['On your own, {name}. Sit down and think about what you’ve done.']],
      shRobbed: [['{chair} had the points. Shame about the bloody chair.']],
    },
  },
};
