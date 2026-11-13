// Cyril's line bank (DESIGN 1.5). Max 90 chars per bubble, max 2 bubbles per beat.
// Values are arrays of bubbles, OR arrays of variants (arrays of bubbles): one variant is picked.
// Use {name} / {n} / {game} placeholders where noted. Adult overrides live in linesAdult.js.
import { LINES_ADULT } from './linesAdult.js';

export const LINES = {
  title: ['Good evening. Do sit. Not you, the cat.'],
  create: ['A new table! I\'ll fetch my good holder.'],
  join: ['Come in, come in. Mind the step. What\'s the code on the door?'],
  lobbyWaiting: ['Just you? Even I need company. One more, please.'],
  lobbyReady: ['That\'s a table. Whenever you\'re ready, host.'],
  lobbyFull: ['Eight. Splendid. Someone\'s going to get the wobbly chair.'],
  tableFull: ['Table\'s full. Pull up a pouffe and wait for the next game.'],
  intro: ['Good evening, the table. I\'m Cyril, your host for tonight.', 'Eleven thousand dinner parties. I\'ve survived them all, barring the birthday incident.'],
  introAgain: [
    ['Afters Classic, coming right up. Three courses, no dawdling.'],
    ['Back for the classic. Napkins up. Pens out.'],
  ],
  r1Intro: ['Course one: Plate Up. Two of you answer the same question.', 'The table decides who served it better.'],
  r1Write: ['Write something funny. Or something true. Ideally both.'],
  timer10: ['Ten seconds. Type like the oven\'s on fire.'],
  timer3: ['Pens down. Metaphorically.'],
  r1Vote: ['Only those who didn\'t write it may vote. Democracy, but rude.'],
  r1Clean: ['Every single vote. Frankly, a clean plate.'],
  r1Tie: ['A dead heat. I shall pretend I saw it coming.'],
  r1Empty: ['One of our chefs sent out an empty plate. Bold.'],
  r1Normal: ['Splendid. The table has spoken.'],
  r1NoVotes: ['Nobody voted. I\'ll assume you were all chewing.'],
  r1Scores: ['After course one, the standings. Steady on, everyone.'],
  r2Intro: ['Course two: Porkies. Every fact you\'ll see is true.', 'Every answer you\'ll see is not. Bar one.'],
  r2Write: ['Write a porky so convincing your own nan would believe it.'],
  r2TooHonest: ['That\'s actually the truth. Steady on. Write a lie.'],
  r2Pick: ['Find the real answer. Don\'t pick your own; I will know.'],
  r2FooledMany: ['You fooled {n} people. I\'m impressed and a bit frightened.'],
  r2Nobody: ['Not one of you. The truth sits here alone, like me at Christmas.'],
  r2NobodyFell: ['Nobody fell for these.'],
  r2Truth: ['And the truth...'],
  r2Scores: ['Two courses down. Who\'s still hungry?'],
  r3Intro: ['Last orders! One question. Write as many answers as you can. Then we swipe.', 'It\'s all to play for. Mathematically.'],
  r3Write: ['Quick as you like. Four answers each, no dawdling.'],
  r3Swipe: ['Right to raise a glass. Left to pass.', 'You\'ve only got five glasses, so pace yourselves.'],
  r3Toast: ['And the toast of the table is...'],
  podium: ['Third place. Second place.', 'And our winner, who will now be insufferable.'],
  end: ['Same again? I\'ve got wick for one more.'],
  endGuest: ['Same again? That\'s up to whoever\'s holding the table.'],
  disconnect: ['Someone\'s wandered off to the loo. We\'ll wait. Briefly.'],
  hostLeft: ['Oh dear. The person holding the table has gone. Let\'s move us to someone sensible.'],
  mindFlame: ['Mind the flame.'],
  wait: ['Plated. Now we wait, with dignity.'],
  r2Wait: ['Porky told. Keep a straight face.'],

  // ---- the game box (menu, results, tonight's table) ----
  menuHost: [
    ['Tonight\'s menu, freshly wheeled in. Pick a dish, host.'],
    ['The trolley, madam. Or sir. Or whoever\'s holding the phone.'],
    ['Something sweet? Something savage? Point at a dish.'],
  ],
  menuDuo: [
    ['Just the two of you. These are the ones made for a pair.'],
    ['A table for two. I\'ve put the right dishes at the top.'],
    ['Two of you, a candle and a menu. Romantic. Pick one.'],
  ],
  menuGuest: [
    ['Your host is choosing. Shout at them if you must.'],
    ['Tap the dish you fancy. The host may even listen.'],
    ['Lean over and point. That\'s how menus work.'],
  ],
  menuSoon: [
    ['Still in the oven, that one. Smells promising.'],
    ['Not ready yet. Chef\'s having a moment.'],
  ],
  menuServe: [
    ['{game}! Splendid choice. Napkins up.'],
    ['One {game}, coming right up. Mind, it\'s hot.'],
    ['{game}. Bold. I like it. Places, everyone.'],
  ],
  nightLead: [
    ['{name} leads tonight\'s table. Unbearable already.'],
    ['{name} is ahead tonight. Someone hide the cherries.'],
  ],
  resultsWin: [
    ['{name} takes it. Polite applause, then quiet resentment.'],
    ['{name} wins! Smug face loading.'],
  ],
  resultsLast: [
    ['{name}, last. But beautifully last.'],
    ['Chin up, {name}. Someone has to make the rest look good.'],
  ],
  // ---- banter ----
  everyoneDone: [
    ['All in already? Keen. Suspiciously keen.'],
    ['Everyone\'s done. Look at you, all efficient.'],
    ['Finished early. I\'ve not even sharpened my wick.'],
  ],
  slowpoke: [
    ['Waiting on {name}. No pressure. Everyone\'s staring.'],
    ['{name} is still typing. It had better be good.'],
  ],
  r1Landslide: [
    ['A landslide! Somebody fetch a stretcher.'],
    ['Every vote. That\'s not a win, that\'s a mugging.'],
  ],
  r1Close: [
    ['By a whisker. Recount? No. Moving on.'],
    ['Close! Tighter than my jeans after Christmas.'],
  ],
  r2TruthFound: [
    ['Too many of you knew that. Who\'s been reading?'],
    ['The truth, found. Disappointingly clever lot.'],
  ],
  scoresLeader: [
    ['{name} out in front. Enjoy it. It won\'t last.'],
    ['{name} leads. Somebody tread on their toe.'],
  ],
  scoresLast: [
    ['{name}, last. Chin up. It\'s a long night.'],
    ['{name} is last. Plenty of pudding left to play for.'],
  ],
  ratingAdult: [
    ['Adults only? Right. I\'ll take my cardigan off.'],
    ['Oh, it\'s THAT sort of party. Lovely.'],
  ],
  ratingFamily: [
    ['Family rules. Best behaviour. I\'ve put my good cardigan on.'],
  ],
};

const fill = (arr, vars) => arr.map((s) => String(s).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`)));
let vn = 0;

/** Pick one variant of a bank entry (array of bubbles, or array of variants). */
export function pickLine(entry, seed) {
  if (!entry) return null;
  if (!Array.isArray(entry[0])) return entry;
  const i = seed === undefined ? (vn++ % entry.length) : Math.abs(Math.floor(seed)) % entry.length;
  return entry[i];
}

/**
 * Cyril's bubbles for `key`. o.rating 'adult' uses LINES_ADULT first; o.extra = a game's own banks
 * ({family:{}, adult:{}}); o.seed picks a stable variant (same on every phone).
 */
export function line(key, vars = {}, o = {}) {
  const adult = o.rating === 'adult';
  const banks = [];
  if (adult && o.extra?.adult) banks.push(o.extra.adult);
  if (adult) banks.push(LINES_ADULT);
  if (o.extra?.family) banks.push(o.extra.family);
  banks.push(LINES);
  for (const b of banks) {
    if (b[key]) return fill(pickLine(b[key], o.seed), vars);
  }
  return [String(key)];
}
