// Cyril's lines for Crossed Wires. Each key: list of variants (each variant = list of bubbles,
// max 90 chars each). ctx.line(key, vars) picks one by phase seed so every phone hears the same.
export const TP_LINES = {
  family: {
    tpIntro: [
      ['Crossed Wires. Everyone writes a sentence, and it goes all the way round the table.', 'Draw it, describe it, draw that. Then we turn the pages and watch it drift.'],
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
      ['Rumour {n}. This started as something sensible. Probably.'],
      ['Rumour {n}. Hold on to your napkins.'],
      ['Rumour {n}. Let\'s turn the pages.'],
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
    tpVote: [['Best bit of that one? Tap it. Not your own, I\'ll know.'], ['Pick the bit that made you snort.']],
    tpAwards: [['And the moment of the night...'], ['The bit we\'ll still be talking about at breakfast...']],
    tpAwardsDone: [['Splendid. Frame it. Burn it. Either.']],
  },
  adult: {
    tpIntro: [
      ['Crossed Wires. Write a sentence, it goes round the table.', 'Someone draws it, someone describes it, and by the end it\'s bollocks.'],
      ['You write it, they draw it, the next one guesses what the hell that is.', 'Then we turn the pages and watch it all go to shit.'],
    ],
    tpWrite: [
      ['Write something from real life. The worse your week, the better.'],
      ['One sentence. Hangovers, bosses, bad decisions. Go.'],
      ['Stuck? Take a card. I wrote them after the third sherry.'],
    ],
    tpDraw: [
      ['Draw it. No words. Yes, it\'s hard. Welcome to adulthood.'],
      ['Draw what it says, not what you wish it said. Christ.'],
      ['Stick figures are fine. Nobody here can draw for shit anyway.'],
    ],
    tpGuess: [
      ['What the hell is that? Write what you see.'],
      ['Squint. Have a sip. Squint again. Now write something.'],
      ['It\'s either a dog or a sofa. It is always a bloody dog or a sofa.'],
    ],
    tpWait: [['Done? Nudge the slow ones. They\'re probably on their phone.'], ['Top up your glass. This could take a while.']],
    tpRevealStart: [
      ['Rumour {n}. This started as something sensible. Allegedly.'],
      ['Rumour {n}. Brace yourselves.'],
      ['Rumour {n}. Let\'s see who fucked this one up.'],
    ],
    tpNailed: [['Nailed it! Bloody hell.'], ['Spot on. Somebody here can actually draw.']],
    tpLost: [['And that\'s where it went to shit. Cheers, {name}.'], ['{name} has crossed the wires. Absolute scenes.'], ['Oh, {name}. What the fuck was that?']],
    tpBlank: [['A blank page. Bold. Lazy, but bold.'], ['Nothing. Not a dot. Were you in the loo?']],
    tpStraight: [['Straight through! The line held. I\'m genuinely moved. Pass the tissues.']],
    tpCrossed: [
      ['From that to *this*. Crossed wires, everyone.'],
      ['It started so well. It ended in a skip.'],
      ['That is not what was said. That is not what was fucking said at all.'],
    ],
    tpVote: [['Best bit? Tap it. Not your own, you shameless bastard.'], ['Pick the page that made you snort your drink.']],
  },
};
