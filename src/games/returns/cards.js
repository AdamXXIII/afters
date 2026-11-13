// Many Happy Returns: the cards. Node-safe (no DOM), shared by host logic, bots and screens.
// Every card says what it does on its face, in one line, so nobody needs a rulebook.
// AI-generated (Claude, Many Happy Returns builder, 2026-11-13).

/** Card kinds. `act`: playable on your own turn. `steady`: only in someone else's window. */
export const KINDS = {
  peek: { name: 'Peek', rule: 'Look at the top three cards of the pile.', colour: '#2F5D7C', lip: '#21445C', act: true },
  skip: { name: 'Skip', rule: 'End your turn without drawing.', colour: '#5E7F52', lip: '#45603C', act: true },
  shuffle: { name: 'Shuffle', rule: 'Shuffle the pile.', colour: '#B07F14', lip: '#86600C', act: true },
  pinch: { name: 'Pinch', rule: 'Take a random card from someone.', colour: '#B5527E', lip: '#8A3A5E', act: true, target: true },
  plate: { name: 'Pass the Plate', rule: 'End your turn without drawing. The next player takes two turns.', colour: '#C8452D', lip: '#9A3220', act: true },
  steady: { name: 'Steady On', rule: 'Cancel a card someone just played.', colour: '#3B1F18', lip: '#22110C', act: false },
  breath: { name: 'Big Breath', rule: 'Blows out a cake and saves you. Then hide the cake back in the pile.', colour: '#3E8E8A', lip: '#2B6A67', act: false },
  cake: { name: 'Birthday Cake', rule: 'You’re out. Unless you’ve got a Big Breath.', colour: '#7A1E2C', lip: '#561320', act: false },
};

export const ACTION_KINDS = ['peek', 'skip', 'shuffle', 'pinch', 'plate', 'steady'];

/** One flavour line per card, picked by the card's number so every phone shows the same one. */
export const FLAVOUR = {
  family: {
    peek: ['Just a little look. Nobody saw.', 'Lifting the corner of the tea towel.', 'Reading the birthday card before it’s opened.', 'A good host checks the oven.', 'Squinting through the frosted glass.', 'Looking at the last page of the book.'],
    skip: ['Pop to the loo at exactly the right moment.', 'Pretend to take an important phone call.', 'Hide behind the big coats.', 'Remember you left the iron on.', 'Go and check on the car.', 'Busy loading the dishwasher, sorry.'],
    shuffle: ['Rearrange the chairs and hope.', 'Mix up the place cards.', 'Swap the presents round.', 'Give the tablecloth a good shake.', 'Turn it off and on again.', 'Move the furniture like it’s Christmas.'],
    pinch: ['Borrow it. Permanently.', 'Light fingers, warm heart.', 'It was in your coat pocket. Somehow.', 'Ask nicely, then take it anyway.', 'Finders keepers.', 'Grab it while they’re pouring.'],
    plate: ['Your turn to carry it in, love.', 'Hand them the knife and the lighter.', 'Hot plate! Mind your fingers!', 'You do the speech. I’ll hold the coats.', 'Here, hold this a sec.', 'After you. No, I insist.'],
    steady: ['Woah, woah. Hang on.', 'Not so fast, sunshine.', 'I don’t think so.', 'Put that down.', 'Let’s all calm down.', 'Absolutely not, thank you.'],
    breath: ['Fill your cheeks like a hamster.', 'Thirty years of trumpet lessons. Finally.', 'One big puff. Make a wish.', 'Blow like you’re cooling a cup of tea.', 'Lungs of a lifeguard.', 'Huff, puff, done.'],
  },
  adult: {
    peek: ['Have a sneaky look. Nobody’s watching.', 'Reading their texts over their shoulder.', 'Checking the bill before you offer to split it.', 'Stalking the guest list.', 'Looking at the answers. No shame.', 'Peeking at the Secret Santa list.'],
    skip: ['Fake a phone call from your mum.', 'Hide in the garden with a cigarette you don’t even smoke.', 'Go to the bar. Stay at the bar.', 'Leave without saying goodbye. Classic.', 'Sorry, got the kids tomorrow.', 'Pretend to be asleep on the sofa.'],
    shuffle: ['Fuck it. Mix it all up.', 'Move the seating plan when nobody’s looking.', 'Shake it like it owes you money.', 'Chaos. Lovely chaos.', 'Scramble it like your Saturday night.', 'Nobody knows anything now. Cheers.'],
    pinch: ['Nicked it. Sorry not sorry.', 'Like borrowing a lighter. Gone forever.', 'Swipe it while they’re at the bar.', 'Mine now, dickhead.', 'Pickpocket of the year.', 'Took it. Said nothing. Legend.'],
    plate: ['Your problem now, mate.', 'Hand them the bill and run.', 'Here. You do the best man speech.', 'Pass the buck. And the cake.', 'Not my circus, not my cake.', 'Off you pop. Good luck, you bastard.'],
    steady: ['Oi. No you fucking don’t.', 'Calm down, Judas.', 'Steady on, you absolute weapon.', 'Not tonight, sunshine.', 'Bollocks to that.', 'Nice try, you sneaky sod.'],
    breath: ['Thirty years of vaping. Finally useful.', 'Blow like it’s last orders.', 'Huge lungs. Tiny dignity.', 'Puff like you’re sobering up in the cold.', 'Fill your cheeks and pray.', 'Blow. Then pretend you meant to.'],
  },
};

/**
 * Whose birthday each cake is for. Concrete, British, no food topics in what anyone answers (these
 * are only read). Stable ids: api.take remembers them all night so cakes don't repeat.
 */
const occ = (prefix, list) => list.map((t, i) => ({ id: `${prefix}${i + 1}`, t }));

export const CAKES = {
  family: occ('rf', [
    'Nan’s 90th. She’s had enough of candles.', 'Uncle Pete’s 50th. He hired a DJ.', 'The twins’ 8th. Two cakes, one fire.',
    'Dave from Accounts. Nobody knows how old.', 'The dog’s birthday. He doesn’t understand.', 'Your 30th. Again.',
    'Grandad’s 80th. He wants to do the candles himself.', 'Auntie Sue’s 60th. Fancy dress: the 80s.', 'The neighbour’s 40th. You weren’t meant to hear it.',
    'Mum’s 65th. She said no fuss.', 'The office birthday. Card signed by people you’ve never met.', 'A surprise 50th. It’s not a surprise.',
    'Your boss’s birthday. Sing nicely.', 'Your cousin’s 21st. Key on the cake and everything.', 'The school caretaker’s retirement.',
    'Dad’s 70th. He wants to give a speech.', 'Your sister’s 40th. Eighty candles. Somehow.', 'Great-Grandma’s 100th. Telegram from the King.',
    'The football coach’s birthday. Whistle on top.', 'Your best mate’s 30th. In a bowling alley.', 'The vicar’s birthday. Choir’s already singing.',
    'The cat’s 18th. She’s furious.', 'Your brother’s birthday. He’s 12 at heart.', 'The postman’s 50th. He’s in shorts.',
    'Little Archie’s 5th. Bouncy castle out the back.', 'Your landlord’s birthday. Be nice, rent’s due.', 'Auntie Pat’s 75th. She’s doing karaoke after.',
    'The new baby’s first. Cake bigger than the baby.', 'Your driving instructor’s birthday. Mirror, signal, candles.', 'Grandma’s 85th. She’s brought her own lighter.',
    'The lollipop lady’s retirement.', 'Your dentist’s birthday. Awkward.', 'A double 40th. Two couples, one hall.',
    'The quiz master’s birthday. Bonus round.', 'Your in-laws’ ruby anniversary. Forty candles.', 'The vet’s birthday. Three dogs in party hats.',
    'Your old teacher’s 60th. You still call her Miss.', 'The milkman’s 70th. Up since four.', 'Your neighbour’s 50th. Gazebo in the rain.',
    'Your godson’s 10th. He wants a fire engine.', 'The bus driver’s birthday. Bell rung twice.', 'Your hairdresser’s 30th. Glitter everywhere.',
    'Uncle Ken’s 60th. Model railway themed.', 'The swimming teacher’s birthday. Armbands on.', 'Your piano teacher’s 80th. She’s playing.',
    'A 50th at the golf club. Dress code.', 'Your mum’s friend’s 60th. You’ve been dragged along.', 'Your grandad’s 90th. Spitfire on the cake.',
    'The scout leader’s birthday. Woggles on.', 'Your flatmate’s 25th. Fairy lights indoors.', 'The lifeguard’s 40th. Whistle, cake, candles.',
    'Your nephew’s 7th. Dinosaurs. Loads of dinosaurs.', 'The church warden’s 70th. Bunting up.', 'Your auntie’s 50th. She cried at the speech.',
    'The plumber’s birthday. He’s late.', 'Your mate’s 40th. A curry house upstairs room.', 'Your gran’s 95th. Still beats you at cards.',
    'Your boss’s boss’s birthday. Everyone’s nervous.', 'The tortoise’s 60th. He’s not bothered.', 'Your grandma’s twin’s 80th. Two of them, both bossy.',
  ]),
  adult: occ('ra', [
    'Your ex’s 30th. You weren’t invited.', 'Gary’s 50th. He’s booked a DJ who only plays Phil Collins.', 'Dave from Accounts. Nobody fucking likes Dave.',
    'Your boss’s birthday. Smile, you coward.', 'Your 40th. Pretend you’re fine.', 'Your mate’s 30th. Third one this month.',
    'Nan’s 90th. She’s already had four sherries.', 'Your brother-in-law’s 50th. He’s doing a speech. God help us.', 'The office birthday. Whip-round was £3.20.',
    'Your landlord’s 60th. He still won’t fix the boiler.', 'A surprise 40th. You’re the one who blabbed.', 'Your cousin’s 21st. Already sick in a plant pot.',
    'Your neighbour’s 50th. They’re playing Oasis. Loudly.', 'Uncle Pete’s 60th. He’s pissed by six.', 'Your sister’s 30th. Her husband’s a knob.',
    'The dog’s birthday. Better party than yours.', 'Your old housemate’s 35th. Still owes you £40.', 'Your work nemesis’s 40th. Sing. Sing, you bastard.',
    'The stag-do best man’s birthday. He knows things.', 'Your dad’s 70th. He’s going to cry. Again.', 'Your 29th. For the sixth year running.',
    'Your mum’s 60th. She invited your ex.', 'Your mate’s divorce party. With a cake.', 'Your boss’s retirement. Finally.',
    'Your manager’s 50th. Mandatory fun.', 'Your mate’s 40th. Paintballing. You’re bruised.', 'The pub landlord’s birthday. Lock-in.',
    'Your auntie’s 50th. Fancy dress, nobody else bothered.', 'Your gran’s 85th. She swore at the vicar.', 'Your best mate’s 30th. In a Wetherspoons.',
    'Your in-laws’ anniversary. Smile through it.', 'The neighbours’ joint 40th. Gazebo’s collapsed.', 'Your brother’s 25th. Bailed out by Mum, again.',
    'Your work Christmas do doubles as Sandra’s birthday.', 'Your flatmate’s 28th. You’re cleaning up. Obviously.', 'Your uncle’s 65th. He’s brought his metal detector.',
    'Your ex’s mum’s 60th. Why are you here?', 'The quiz team captain’s birthday. Nobody can spell.', 'Your mate’s 50th. Ibiza, apparently. In Margate.',
    'Your boss’s kid’s 18th. Why were you invited?', 'Your mate’s 40th. Karaoke till 2am. Your voice is gone.', 'Your 35th. You’re hungover at your own party.',
    'Your godmother’s 70th. She’s three wines in.', 'Your old PE teacher’s 60th. Still a bastard.', 'Your neighbour’s 50th. The police came.',
    'Your mate’s 30th. Escape room. You didn’t escape.', 'Steve’s 40th. Steve’s gone missing.', 'Your colleague’s leaving do. Good riddance.',
    'Your cousin’s 30th. Prosecco fountain. Grim.', 'Your stepdad’s 60th. Awkward speeches all round.', 'The golf club captain’s 70th. Dickheads in visors.',
    'Your sister-in-law’s 40th. Matching T-shirts. Kill me.', 'Your mate’s 30th. He cried in the taxi.', 'Your dentist’s 50th. Don’t ask.',
    'Your boss’s 60th. He thinks he’s still 30.', 'Your mate’s housewarming. Somebody brought a cake. Why.', 'Your grandad’s 90th. He’s louder than the band.',
    'Your ex’s new partner’s birthday. Bloody hell.', 'Your mate’s 45th. A midlife crisis with balloons.', 'Your auntie’s 75th. She’s on the tequila.',
  ]),
};

/** How many of each card. Draw pile ends at roughly 3n+4 safe cards plus the cakes. */
export function deckPlan(n) {
  const total = 7 * n + 4; // 4 dealt per player + about 3n+4 left in the pile
  const w = { peek: 0.17, skip: 0.18, shuffle: 0.12, pinch: 0.16, plate: 0.15, steady: 0.22 };
  const counts = {};
  let sum = 0;
  for (const k of ACTION_KINDS) { counts[k] = Math.max(2, Math.round(total * w[k])); sum += counts[k]; }
  counts.steady += total - sum; // round-off lands on Steady On
  return { counts, cakes: n - 1, spareBreaths: n <= 4 ? 2 : 1, hand: 4 };
}
