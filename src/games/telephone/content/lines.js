// Cyril's lines for Crossed Wires. Each key: list of variants (each variant = list of bubbles,
// max 90 chars each). ctx.line(key, vars) picks one by phase seed so every phone hears the same.
export const TP_LINES = {
  family: {
    tpIntro: [
      ['Crossed Wires. You write a rumour, it goes down the table.', 'Draw it, guess it, draw it again. Then we watch it fall apart.'],
      ['Write something daft. The next person draws it. The next guesses it.', 'By the end it\'ll be unrecognisable. Like my Christmas jumper.'],
    ],
    tpModeClassic: [['Classic. Draw, guess, draw, guess. Civilised.']],
    tpModeSpeedy: [['Speedy! Half the time, twice the mess. Splendid.']],
    tpModeFlip: [['Flipbook. Each of you draws the next frame. Very arty.']],
    tpWrite: [
      ['Write a rumour. Something daft. It\'ll be unrecognisable by pudding.'],
      ['One sentence. Make it something you\'d love to see drawn badly.'],
      ['Stuck? Take a card. I wrote them myself. In wax.'],
    ],
    tpDraw: [
      ['Draw it. No letters, no numbers. I\'m watching. I\'m a candle, I\'m *glowing*.'],
      ['Draw what it says. Not what you wish it said.'],
      ['Stick figures are fine. Stick figures built this country.'],
    ],
    tpDrawFlip: [['Next frame! Move it on a little. Animation is just patience.']],
    tpGuess: [
      ['What on earth is that? Write what you see. Be kind. Or don\'t.'],
      ['Squint. Tilt your head. Then write the first thing that comes.'],
      ['It\'s either a horse or a sofa. It\'s always a horse or a sofa.'],
    ],
    tpWait: [
      ['Passed on. Now nudge the slowcoaches. Gently. Or not.'],
      ['Done already? Pop the kettle on. Metaphorically.'],
    ],
    tpNudged: [['{name} is tapping their watch at you.'], ['{name} says hurry up. Rude, but fair.']],
    tpRevealStart: [
      ['Line {n}. This started as something sensible. Probably.'],
      ['Line {n}. Hold on to your napkins.'],
      ['Line {n}. Let\'s see where this one went.'],
    ],
    tpNailed: [['Nailed it! Frankly, a miracle.'], ['Spot on. Somebody can draw.'], ['Got it! I may weep wax.']],
    tpLost: [['And that\'s where it went wrong. Thank you, {name}.'], ['{name} has crossed the wires. Bravo.'], ['Oh dear. {name} has taken us somewhere new.']],
    tpBlank: [['A blank page. Avant-garde.'], ['Nothing. Not a dot. Bold.']],
    tpStraight: [['Straight through! The line held. I\'m genuinely moved.']],
    tpCrossed: [
      ['From that to *this*. Crossed wires, everyone.'],
      ['It started so well. It ended in a hedge.'],
      ['That is not what was said. That is not what was said at all.'],
    ],
    tpFlip: [['Roll the film! A masterpiece of sorts.'], ['Animated! Disney\'s lawyers can relax.']],
    tpVote: [['Best bit of that line? Tap it. Not your own, I\'ll know.'], ['Pick the bit that made you snort.']],
    tpAwards: [['And the moment of the night...'], ['The bit we\'ll still be talking about at breakfast...']],
    tpAwardsDone: [['Splendid. Frame it. Burn it. Either.']],
  },
  adult: {
    tpIntro: [
      ['Crossed Wires. Write something filthy, it goes down the table.', 'Someone draws it. Someone guesses it. Everyone regrets it.'],
      ['You write it, they draw it, we all pretend we didn\'t see it.', 'Adults only. Draw responsibly. Or don\'t.'],
    ],
    tpWrite: [
      ['Write a rumour. The ruder the better. Your nan isn\'t here.'],
      ['One saucy sentence. Somebody has to draw it. Think of them.'],
      ['Stuck? Take a card. I wrote them after the sherry.'],
    ],
    tpDraw: [
      ['Draw it exactly as described. Yes, *exactly*. We\'re all adults.'],
      ['Draw what it says. Size isn\'t everything. Except here.'],
      ['Two circles and a line can mean *anything*. Remember that.'],
    ],
    tpGuess: [
      ['What on earth is that? Say what you see. All of it.'],
      ['It\'s either very rude or a giraffe. Possibly both.'],
    ],
    tpWait: [['Done? Nudge the slow ones. They love a nudge.'], ['Top up your glass. This could take a while.']],
    tpNailed: [['Nailed it! Well, someone did.'], ['Spot on. You\'ve drawn that before, haven\'t you?']],
    tpLost: [['And that\'s where it went wrong. Thank you, {name}. Filthy.'], ['{name} has crossed the wires. And the line.']],
    tpCrossed: [['From that to *this*. I need a lie down.'], ['That is not what was said. Thank heavens.']],
    tpVote: [['Best bit? Tap it. Don\'t pick your own, you exhibitionist.']],
  },
};
