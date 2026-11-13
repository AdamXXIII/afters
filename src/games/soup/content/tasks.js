// Something in the Soup content. Original, in Cyril's voice. Players never answer anything about
// food here: they count, remember digits and pass a parcel. AI-generated (Claude, Soup team, 2026-11-13).

// Count the ...: what the table counts out together (the task title is "Count the <t>").
const ITEMS_FAMILY = [
  'Spoons', 'Napkins', 'Candles', 'Coasters', 'Chairs', 'Corks', 'Doilies', 'Teaspoons', 'Place cards', 'Forks',
  'Wine glasses', 'Saucers', 'Egg cups', 'Toothpicks', 'Party hats', 'Crackers', 'Serviette rings', 'Ladles',
  'Doorstops', 'Umbrellas', 'Odd socks', 'Coat hooks', 'Thimbles', 'Clothes pegs', 'Buttons', 'Paperclips',
  'Rubber ducks', 'Tea lights', 'Biros', 'Sugar tongs',
].map((t, i) => ({ id: `if${i}`, t }));
const ITEMS_ADULT = [
  'Empties', 'Corkscrews', 'Hip flasks', 'Love bites', 'Ex-partners', 'Bad decisions', 'Shot glasses', 'Hangovers',
  'Hen-do sashes', 'Garters', 'Fake tans', 'Unanswered texts', 'Lipstick marks', 'Lost earrings', 'Cheeky winks',
  'Regrets', 'Walks of shame', 'Stag-do photos', 'Feather boas', 'Fluffy handcuffs', 'Spare keys', 'Hot tubs',
  'Strained zips', 'Saucy postcards', 'Whoopee cushions', 'Pairs of pants', 'Party poppers', 'Thongs',
  'Bottles of fizz', 'Questionable tattoos',
].map((t, i) => ({ id: `ia${i}`, t }));
export const ITEMS = { family: ITEMS_FAMILY, adult: ITEMS_ADULT };

// Safe Hands: whose safe the code opens (shown as "The safe in the <t>").
const ROOMS_FAMILY = [
  'study', 'wine cellar', 'attic', 'potting shed', 'drawing room', 'boot room', 'billiard room', 'library',
  'conservatory', 'butler\'s pantry', 'map room', 'chapel', 'cloakroom', 'garage',
  'airing cupboard', 'summer house', 'music room', 'vestry', 'box room', 'greenhouse',
].map((t, i) => ({ id: `rf${i}`, t }));
const ROOMS_ADULT = [
  'master bedroom', 'hot tub cabana', 'bathroom (lock broken)', 'red room', 'champagne cellar', 'boudoir',
  'stag-do suite', 'honeymoon suite', 'walk-in wardrobe', 'four-poster', 'sauna', 'drinks cabinet',
  'dressing room', 'bedside drawer', 'mirrored ceiling room', 'pool house', 'karaoke booth', 'second bedroom',
  'nightclub coat check', 'hen-do minibus',
].map((t, i) => ({ id: `ra${i}`, t }));
export const ROOMS = { family: ROOMS_FAMILY, adult: ROOMS_ADULT };

// Morning: Cyril's report of the night. {name} is the poisoned player.
const MORNINGS_FAMILY = [
  '{name} was found face-down in the soup. Peacefully, I\'m told.',
  '{name} went to bed early and has decided to stay there. Forever.',
  'Someone slipped something in {name}\'s cocoa. {name} has left the table.',
  '{name} took a sip, said "that\'s odd", and that was that.',
  '{name} has been poisoned. The soup has been sent back.',
  'We found {name} under the tablecloth. Not hiding. Poisoned.',
  '{name} is no longer with us. They\'re with the coats.',
  'A sad morning. {name} is out. The cat seems unbothered.',
  '{name} has been poisoned. Their chair is still warm. Don\'t sit in it.',
  '{name} woke up dead. Their words, not mine.',
  'The housekeeper found {name} in the conservatory. With a ladle. Poisoned.',
  '{name} is gone. Somebody here is sleeping very soundly.',
  '{name} drank from the wrong glass. Every glass was the wrong glass.',
  'I regret to say {name} has been poisoned. I regret it more than they do. They\'re past regret.',
  '{name} has left us. The rest of you, check your cups.',
  'Overnight, {name} was poisoned. A note was left. It just said "oops".',
  '{name} has gone to the great dinner party in the sky. Smart casual.',
  'Bad news. {name}. Good news: more pudding for everyone.',
  '{name} said they felt funny, and now they feel nothing at all.',
  'Someone stirred the pot, and {name} paid for it.',
  '{name} won\'t be joining us for breakfast. Or anything.',
  'The gong went, and {name} didn\'t come down. They won\'t.',
  'Poisoned in the night: {name}. Sleep tight, everybody.',
  '{name} is out. I\'ve put a little candle in the window. It\'s me. I\'m the candle.',
  'We\'ve lost {name}. Not lost-lost. Poisoned-lost.',
  '{name} has been poisoned. Their napkin was folded into a swan. Chilling.',
  'A tragedy. {name}. A plot twist. Also {name}.',
  'The doctor has been and gone. {name} has just gone.',
  '{name} has been taken from us by a very rude soup.',
  'Morning, all. Nearly all. Not {name}.',
].map((t, i) => ({ id: `mf${i}`, t }));
const MORNINGS_ADULT = [
  '{name} was found face-down in the soup. Nobody noticed for an hour. Rude.',
  '{name} has been poisoned. Their last words were "is this decaf?"',
  '{name} went upstairs with a nightcap and came down in a body bag. Metaphorically. Mostly.',
  'Someone spiked {name}. Not the fun way.',
  '{name} is dead. Their browser history is now a family matter.',
  '{name} has been poisoned. They died as they lived: three sheets to the wind.',
  'We found {name} in the hot tub. Still bubbling. Not breathing.',
  '{name} drank something they shouldn\'t have. For once, it wasn\'t tequila.',
  '{name} has left the table. Feet first. In their good shoes.',
  'Overnight, {name} kicked the bucket. And the bedside table. And the cat.',
  '{name} is out. They went to bed with a stranger called Hemlock.',
  '{name} won\'t be coming down for breakfast. Or coming at all, sadly.',
  'Poisoned: {name}. Their phone has had nine missed calls from someone saved as "Do Not Answer".',
  '{name} has died. I\'d say "tragically", but did you hear them sing last night?',
  'Someone slipped {name} a little something. {name} slipped off this mortal coil.',
  '{name} is gone. Who\'s having their room? It has the good bath.',
  '{name} has been poisoned. On the upside, the hangover\'s gone.',
  '{name} drank the poison and, frankly, asked for a top-up.',
  'We have lost {name}. They were found wearing someone else\'s dressing gown. Questions remain.',
  '{name} is out. Somebody in this room is a cold, cold minx.',
  '{name}\'s been poisoned. Lipstick on the glass. Not theirs.',
  'Grim news. {name}. Grimmer news: they owed me a tenner.',
  '{name} died in the night. Most action that bed\'s had in years.',
  '{name} has been poisoned, and their last text just said "worth it".',
  'We found {name} under the duvet. Alone, surprisingly. And poisoned, unsurprisingly.',
  '{name} has gone to meet their maker. Their maker is not impressed.',
  'Someone put something in {name}\'s nightcap. It wasn\'t affection.',
  '{name} is dead. If anyone asks, they were "very tired".',
  '{name} won\'t be at breakfast. Their walk of shame was a short one: straight into the afterlife.',
  'Morning, sinners. One fewer of you. Goodbye, {name}.',
].map((t, i) => ({ id: `ma${i}`, t }));
export const MORNINGS = { family: MORNINGS_FAMILY, adult: MORNINGS_ADULT };
