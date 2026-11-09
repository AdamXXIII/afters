// Round 3 - Last Orders prompts (DESIGN 2.10).
export const R3_PROMPTS = [
  'Things you should never say while carving the roast',
  'Signs the dinner party is going badly',
  'Excuses to get out of the washing up',
  'Rejected names for a village pub',
  'Things the cat is definitely plotting',
  'Unpopular new flavours of jelly baby',
  'Things you don\'t want to hear from the pilot',
  'Worst things to write in a wedding card',
  'New rules that would ruin Christmas Day',
  'Things a garden gnome would complain about',
  'Terrible things to put in a time capsule',
  'Rubbish prizes for winning this game',
  'Things you\'d say to a ghost who won\'t leave your kitchen',
  'Bad names for a new British coin',
  'Rejected baking challenges',
  'Things you shouldn\'t shout in a library',
].map((text, i) => ({ id: `l${i + 1}`, text }));
