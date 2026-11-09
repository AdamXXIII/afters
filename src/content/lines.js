// Cyril's line bank (DESIGN 1.5). Max 90 chars per bubble, max 2 bubbles per beat.
// Values are arrays of bubbles. Use {name} / {n} placeholders where noted.
export const LINES = {
  title: ['Good evening. Do sit. Not you, the cat.'],
  create: ['A new table! I\'ll fetch my good holder.'],
  join: ['Come in, come in. Mind the step. What\'s the code on the door?'],
  lobbyWaiting: ['We need at least three. Two is a date, and I\'m not a chaperone.'],
  lobbyReady: ['That\'s a table. Whenever you\'re ready, host.'],
  lobbyFull: ['Eight. Splendid. Someone\'s going to get the wobbly chair.'],
  tableFull: ['Table\'s full. Pull up a pouffe and wait for the next game.'],
  intro: ['Good evening, the table. I\'m Cyril, your host for tonight.', 'Eleven thousand dinner parties. I\'ve survived them all, barring the birthday incident.'],
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
};

export function line(key, vars = {}) {
  const l = LINES[key];
  if (!l) return [String(key)];
  return l.map((s) => s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`)));
}
