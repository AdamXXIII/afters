// Who Had Seconds? tasks. Original, in Cyril's voice. No food or drink topics in anything players act on.
// Each category holds tasks of four types, done with the body on a synced "3, 2, 1, now":
//   hands  - raise a hand (or don't)
//   number - hold up 0 to 10 fingers
//   point  - point at someone at the table
//   face   - pull a face
// A faker turn draws its tasks from ONE category; the faker gets a peek at the category on task 2.
// Shape after flattening: {id, cat, type, t}. Ids are stable (api.take remembers them all night).

const FAMILY = {
  'Holidays': {
    hands: ['Hands up if you have ever lost your luggage.', 'Hands up if you have ever got sunburnt on the first day.', 'Hands up if you have ever missed a flight, train or coach.'],
    number: ['Fingers: how many countries have you been to? (10 if more)', 'Fingers: how much do you enjoy camping, 0 to 10?', 'Fingers: how many days before a holiday do you start packing?'],
    point: ['Point at whoever would get lost abroad first.', 'Point at whoever packs far too much.', 'Point at whoever would make friends with the hotel staff.'],
    face: ['Pull the face you make when the plane hits turbulence.', 'Pull the face you make stepping into a freezing sea.', 'Pull your passport photo face.'],
  },
  'School days': {
    hands: ['Hands up if you were ever sent out of a classroom.', 'Hands up if you ever forged a note from home.', 'Hands up if you were in a school play.'],
    number: ['Fingers: how good were you at maths, 0 to 10?', 'Fingers: how many schools did you go to?', 'Fingers: how cool were you at fourteen, 0 to 10?'],
    point: ['Point at whoever was the teacher\'s pet.', 'Point at whoever would still be in detention.', 'Point at whoever would have been head of the school.'],
    face: ['Pull the face of a teacher who has just heard a phone ring.', 'Pull your school photo face.', 'Pull the face you make when the test starts with a question you can\'t do.'],
  },
  'Phones': {
    hands: ['Hands up if your phone is on silent right now.', 'Hands up if you have ever dropped a phone down a toilet.', 'Hands up if you have more than a thousand unread emails.'],
    number: ['Fingers: how many hours a day are you on your phone?', 'Fingers: how cracked is your screen, 0 to 10?', 'Fingers: how many group chats are you muted in?'],
    point: ['Point at whoever replies to messages fastest.', 'Point at whoever has the most photos on their phone.', 'Point at whoever would survive longest with no phone.'],
    face: ['Pull the face you make when your phone is on one per cent.', 'Pull the face you make reading a message from your bank.', 'Pull the face you make when someone sends a voice note.'],
  },
  'Telly and films': {
    hands: ['Hands up if you have ever cried at a cartoon.', 'Hands up if you have watched a whole series in one weekend.', 'Hands up if you talk during films.'],
    number: ['Fingers: how many times have you seen your favourite film?', 'Fingers: how scared are you of horror films, 0 to 10?', 'Fingers: how many streaming services do you pay for?'],
    point: ['Point at whoever would win a reality show.', 'Point at whoever always spoils the ending.', 'Point at whoever falls asleep during films.'],
    face: ['Pull the face of a villain who has just been caught.', 'Pull the face you make at a soppy ending.', 'Pull the face of a contestant who has just lost a fortune.'],
  },
  'Pets and animals': {
    hands: ['Hands up if you talk to animals in a special voice.', 'Hands up if you have ever been bitten by a pet.', 'Hands up if you would rather have a cat than a dog.'],
    number: ['Fingers: how many pets have you had in your life?', 'Fingers: how much do you like spiders, 0 to 10?', 'Fingers: how many animal noises can you do well?'],
    point: ['Point at whoever is most like a cat.', 'Point at whoever would adopt every stray they met.', 'Point at whoever would win a fight with a goose.'],
    face: ['Pull the face of a dog that knows it has been naughty.', 'Pull the face you make when a wasp lands on you.', 'Pull the face of a cat being put in a bath.'],
  },
  'Home': {
    hands: ['Hands up if you make your bed every morning.', 'Hands up if you have a drawer full of random cables.', 'Hands up if you have ever been locked out of your own home.'],
    number: ['Fingers: how tidy is your bedroom right now, 0 to 10?', 'Fingers: how many houseplants have you killed?', 'Fingers: how good are you at DIY, 0 to 10?'],
    point: ['Point at whoever has the messiest home.', 'Point at whoever would hoover at midnight.', 'Point at whoever would build flat-pack without reading the instructions.'],
    face: ['Pull the face you make stepping on a plug.', 'Pull the face you make when the doorbell rings unexpectedly.', 'Pull the face you make finding a spider in the bath.'],
  },
  'Sport and games': {
    hands: ['Hands up if you have ever cheated at a board game.', 'Hands up if you have ever run a race.', 'Hands up if you have thrown a controller in anger.'],
    number: ['Fingers: how competitive are you, 0 to 10?', 'Fingers: how many press-ups could you do right now?', 'Fingers: how good are you at losing, 0 to 10?'],
    point: ['Point at whoever is the sorest loser.', 'Point at whoever would win an Olympic gold in napping.', 'Point at whoever would be the best team captain.'],
    face: ['Pull the face of a footballer pretending to be fouled.', 'Pull the face you make crossing a finish line.', 'Pull the face of someone who just lost at Monopoly.'],
  },
  'Childhood': {
    hands: ['Hands up if you had an imaginary friend.', 'Hands up if you ever cut your own hair as a child.', 'Hands up if you still have a childhood teddy.'],
    number: ['Fingers: how naughty were you as a child, 0 to 10?', 'Fingers: how old were you when you learned to ride a bike?', 'Fingers: how many times did you break a bone as a kid?'],
    point: ['Point at whoever was the cheekiest child.', 'Point at whoever would still believe in the tooth fairy.', 'Point at whoever had the best birthday parties.'],
    face: ['Pull the face of a toddler who has been told no.', 'Pull the face you made on your first day at school.', 'Pull the face of a child opening socks as a present.'],
  },
  'Work': {
    hands: ['Hands up if you have ever pretended to be busy.', 'Hands up if you have fallen asleep at work or school.', 'Hands up if you have ever replied all by mistake.'],
    number: ['Fingers: how much do you love Mondays, 0 to 10?', 'Fingers: how many jobs have you had?', 'Fingers: how good are you at meetings, 0 to 10?'],
    point: ['Point at whoever would be the best boss.', 'Point at whoever would get fired first.', 'Point at whoever would have the tidiest desk.'],
    face: ['Pull the face you make when a meeting could have been an email.', 'Pull the face you make when the boss says "quick word?"', 'Pull your job interview face.'],
  },
  'Weather and outdoors': {
    hands: ['Hands up if you have ever been caught out without a coat.', 'Hands up if you have climbed a mountain.', 'Hands up if you love a thunderstorm.'],
    number: ['Fingers: how much do you love snow, 0 to 10?', 'Fingers: how many umbrellas have you lost?', 'Fingers: how outdoorsy are you, 0 to 10?'],
    point: ['Point at whoever would survive longest in the wild.', 'Point at whoever moans most about the weather.', 'Point at whoever would wear shorts in winter.'],
    face: ['Pull the face you make walking into a howling wind.', 'Pull the face you make when it starts raining on a picnic blanket.', 'Pull the face of someone stepping in a deep puddle.'],
  },
  'Music': {
    hands: ['Hands up if you sing in the shower.', 'Hands up if you have ever been to a festival.', 'Hands up if you can play an instrument.'],
    number: ['Fingers: how good a singer are you, 0 to 10?', 'Fingers: how many concerts have you been to this year?', 'Fingers: how good a dancer are you, 0 to 10?'],
    point: ['Point at whoever would win a karaoke night.', 'Point at whoever has the worst taste in music.', 'Point at whoever would be in a boy band or girl band.'],
    face: ['Pull the face of a rock star hitting a high note.', 'Pull the face you make when your favourite song comes on.', 'Pull the face of an opera singer on the last note.'],
  },
  'Embarrassing moments': {
    hands: ['Hands up if you have ever waved back at someone who was waving at someone else.', 'Hands up if you have ever called a teacher "Mum" or "Dad".', 'Hands up if you have tripped over nothing in public.'],
    number: ['Fingers: how easily do you blush, 0 to 10?', 'Fingers: how many times have you walked into a glass door?', 'Fingers: how embarrassing are your baby photos, 0 to 10?'],
    point: ['Point at whoever is hardest to embarrass.', 'Point at whoever would laugh at the wrong moment.', 'Point at whoever would trip on a red carpet.'],
    face: ['Pull the face you make when you realise your zip is down.', 'Pull the face you make after saying "you too" to a waiter who said enjoy.', 'Pull the face of someone who just sent a message to the wrong person.'],
  },
  'Family and friends': {
    hands: ['Hands up if you have ever forgotten a close friend\'s birthday.', 'Hands up if you are the youngest in your family.', 'Hands up if you have ever been the last to leave a party.'],
    number: ['Fingers: how many cousins do you have? (10 if more)', 'Fingers: how good are you at keeping secrets, 0 to 10?', 'Fingers: how often do you ring your family each week?'],
    point: ['Point at whoever gives the best hugs.', 'Point at whoever would forget your name at a wedding.', 'Point at whoever is the best at giving presents.'],
    face: ['Pull the face you make when a relative asks when you are getting married.', 'Pull the face you make opening a present you hate.', 'Pull the face of a proud grandparent.'],
  },
  'Transport': {
    hands: ['Hands up if you have ever fallen asleep and missed your stop.', 'Hands up if you get travel sick.', 'Hands up if you have ever failed a driving test.'],
    number: ['Fingers: how good are you at parking, 0 to 10?', 'Fingers: how patient are you in traffic, 0 to 10?', 'Fingers: how many times have you got on the wrong bus or train?'],
    point: ['Point at whoever drives like they are in a film.', 'Point at whoever would sing loudest on a road trip.', 'Point at whoever would get a parking ticket on day one.'],
    face: ['Pull the face you make when the train is cancelled.', 'Pull the face you make when someone sits next to you on an empty bus.', 'Pull the face of a sat nav that has given up.'],
  },
  'Right here, right now': {
    hands: ['Hands up if you are wearing something blue.', 'Hands up if you have a pet waiting at home.', 'Hands up if you were the last to arrive tonight.'],
    number: ['Fingers: how many people at this table have you known for over five years?', 'Fingers: how many rings are you wearing right now?', 'Fingers: how many hours of sleep did you get last night?'],
    point: ['Point at the tallest person at this table.', 'Point at whoever is sitting nearest the door.', 'Point at whoever has the longest hair here.'],
    face: ['Pull the face you would make if the lights went out right now.', 'Pull the face of whoever is sitting opposite you.', 'Pull the face you make when you hear your own voice on a recording.'],
  },
};

const ADULT = {
  'Dating': {
    hands: ['Hands up if you have ever been stood up.', 'Hands up if you have ever faked a phone call to leave a date.', 'Hands up if you have ever dated two people at once.'],
    number: ['Fingers: how many first dates have you been on this year?', 'Fingers: how good a flirt are you, 0 to 10?', 'Fingers: how many dating apps have you tried?'],
    point: ['Point at whoever has the worst taste in partners.', 'Point at whoever would kiss on a first date.', 'Point at whoever would fall in love on holiday.'],
    face: ['Pull the face you make when your date says they still live with their ex.', 'Pull your dating profile photo face.', 'Pull the face of someone who just got a "you up?" text.'],
  },
  'The bedroom': {
    hands: ['Hands up if you have ever been caught in the act.', 'Hands up if you sleep naked.', 'Hands up if you have ever faked it.'],
    number: ['Fingers: how adventurous are you in bed, 0 to 10?', 'Fingers: how loud are you, 0 to 10?', 'Fingers: how many times this week? (be brave)'],
    point: ['Point at whoever is the kinkiest.', 'Point at whoever would be terrible at a sex scene.', 'Point at whoever has the most toys in a drawer.'],
    face: ['Pull your bedroom eyes.', 'Pull the face you make when the neighbours bang on the wall.', 'Pull the face of someone whose parents just walked in.'],
  },
  'Exes': {
    hands: ['Hands up if you still follow an ex online.', 'Hands up if you have ever got back with an ex.', 'Hands up if you have ever broken up by text.'],
    number: ['Fingers: how many exes would you still talk to?', 'Fingers: how messy was your worst break-up, 0 to 10?', 'Fingers: how often do you think about an ex, 0 to 10?'],
    point: ['Point at whoever has the most exes.', 'Point at whoever would text an ex at 2am.', 'Point at whoever would key an ex\'s car.'],
    face: ['Pull the face you make bumping into an ex who looks great.', 'Pull the face you make when your ex gets engaged.', 'Pull the face you make reading your old love letters.'],
  },
  'Bad habits': {
    hands: ['Hands up if you have ever peed in a swimming pool.', 'Hands up if you have ever pretended not to see someone you know.', 'Hands up if you have ever read someone else\'s messages.'],
    number: ['Fingers: how many times did you hit snooze today?', 'Fingers: how much of a gossip are you, 0 to 10?', 'Fingers: how often do you lie about being on your way, 0 to 10?'],
    point: ['Point at whoever is the biggest gossip.', 'Point at whoever would sniff their own pants to check.', 'Point at whoever has the dirtiest phone history.'],
    face: ['Pull the face of someone pretending they didn\'t just fart.', 'Pull the face you make when you get caught picking your nose.', 'Pull the face you make lying to your boss about being ill.'],
  },
  'The office': {
    hands: ['Hands up if you have ever fancied a colleague.', 'Hands up if you have ever cried in the work toilets.', 'Hands up if you have ever been on a call with no trousers on.'],
    number: ['Fingers: how much do you hate your job, 0 to 10?', 'Fingers: how many office romances have you seen?', 'Fingers: how many sick days were actually lie-ins?'],
    point: ['Point at whoever would sleep with the boss.', 'Point at whoever would get sacked at the Christmas party.', 'Point at whoever would steal all the stationery.'],
    face: ['Pull the face you make when your camera turns on by accident.', 'Pull the face you make when HR wants a chat.', 'Pull the face of someone reading their own performance review.'],
  },
  'Secrets': {
    hands: ['Hands up if you have a secret nobody at this table knows.', 'Hands up if you have ever been somewhere you told someone you weren\'t.', 'Hands up if you have ever kept a secret from a partner.'],
    number: ['Fingers: how many people know your phone passcode?', 'Fingers: how good a liar are you, 0 to 10?', 'Fingers: how many secrets could you sink this table with?'],
    point: ['Point at whoever has the darkest secret.', 'Point at whoever would crack first in an interrogation.', 'Point at whoever has a secret social media account.'],
    face: ['Pull the face of someone whose browser history is being read out.', 'Pull your poker face.', 'Pull the face you make when someone says "we need to talk".'],
  },
  'Bodies': {
    hands: ['Hands up if you have a tattoo you regret.', 'Hands up if you have ever been skinny-dipping.', 'Hands up if you have ever flashed someone by accident.'],
    number: ['Fingers: how hairy are you, 0 to 10?', 'Fingers: how ticklish are you, 0 to 10?', 'Fingers: how many piercings have you had?'],
    point: ['Point at whoever has the best bum at this table.', 'Point at whoever would get naked first at a party.', 'Point at whoever has a secret tattoo.'],
    face: ['Pull the face you make seeing yourself in a changing-room mirror.', 'Pull the face you make getting a bikini wax.', 'Pull the face you make when the doctor says "this might be cold".'],
  },
  'Flirting': {
    hands: ['Hands up if you have ever flirted your way out of a fine.', 'Hands up if you have ever been chatted up by someone much older.', 'Hands up if you have a crush on someone right now.'],
    number: ['Fingers: how obvious are you when you fancy someone, 0 to 10?', 'Fingers: how many times have you been chatted up this year?', 'Fingers: how good is your best chat-up line, 0 to 10?'],
    point: ['Point at whoever would flirt with a lamppost.', 'Point at whoever has the best chat-up line.', 'Point at whoever is the worst at taking a hint.'],
    face: ['Pull the face you make when someone attractive walks in.', 'Pull your most seductive wink.', 'Pull the face of someone getting a cheesy chat-up line.'],
  },
  'Holidays after dark': {
    hands: ['Hands up if you have ever had a holiday romance.', 'Hands up if you have ever woken up somewhere and not known where you were.', 'Hands up if you have ever been to a nudist beach.'],
    number: ['Fingers: how wild do your holidays get, 0 to 10?', 'Fingers: how many holiday flings have you had?', 'Fingers: how much of your last holiday do you remember, 0 to 10?'],
    point: ['Point at whoever would get a tattoo on holiday.', 'Point at whoever would end up in a foreign jail.', 'Point at whoever would go topless first.'],
    face: ['Pull the face you make when the hotel walls are very thin.', 'Pull the face you make seeing your holiday photos the next morning.', 'Pull the face of someone whose fling turns up at the airport.'],
  },
  'Parties': {
    hands: ['Hands up if you have ever left a party without saying goodbye.', 'Hands up if you have ever snogged someone at a wedding.', 'Hands up if you have ever been sick in a taxi.'],
    number: ['Fingers: how messy is your typical Saturday night, 0 to 10?', 'Fingers: what time did you get in last weekend? (fingers for the hour)', 'Fingers: how good are you on a dance floor, 0 to 10?'],
    point: ['Point at whoever would end up on a table dancing.', 'Point at whoever would get thrown out first.', 'Point at whoever would go home with a stranger.'],
    face: ['Pull the face you make when the lights come on at the end of the night.', 'Pull your dance-floor face.', 'Pull the face of someone reading their messages from last night.'],
  },
  'Fibs': {
    hands: ['Hands up if you have lied about your age.', 'Hands up if you have ever lied to get out of tonight\'s plans.', 'Hands up if you have ever lied about how many people you have slept with.'],
    number: ['Fingers: how many lies have you told today?', 'Fingers: how believable is your fake laugh, 0 to 10?', 'Fingers: how good is your poker face, 0 to 10?'],
    point: ['Point at whoever is lying right now.', 'Point at whoever would lie to a judge.', 'Point at whoever would talk their way out of anything.'],
    face: ['Pull the face of someone pretending to love a present.', 'Pull your innocent face.', 'Pull the face you make when your lie is about to be found out.'],
  },
  'Money': {
    hands: ['Hands up if you have ever hidden a shopping parcel from a partner.', 'Hands up if you have ever done a runner from a taxi.', 'Hands up if you have ever been in your overdraft this month.'],
    number: ['Fingers: how bad is your online shopping habit, 0 to 10?', 'Fingers: how stingy are you, 0 to 10?', 'Fingers: how many unused gym memberships have you had?'],
    point: ['Point at whoever would marry for money.', 'Point at whoever would spend a lottery win in a week.', 'Point at whoever always forgets their wallet.'],
    face: ['Pull the face you make checking your bank balance after a weekend.', 'Pull the face of someone who just tapped the wrong card.', 'Pull the face you make when the bill is split evenly and you had the least.'],
  },
  'Online': {
    hands: ['Hands up if you have ever liked an old photo by accident while stalking.', 'Hands up if you have sent a text to the person it was about.', 'Hands up if you have ever sent a naughty photo.'],
    number: ['Fingers: how many times have you looked up an ex this month?', 'Fingers: how much do you edit your selfies, 0 to 10?', 'Fingers: how many filthy messages are in your phone, 0 to 10?'],
    point: ['Point at whoever posts the most thirst traps.', 'Point at whoever would go viral for the wrong reasons.', 'Point at whoever has the most embarrassing search history.'],
    face: ['Pull the face you make when an unexpected naughty photo arrives.', 'Pull your selfie face.', 'Pull the face of someone whose mum just commented on their post.'],
  },
  'This very table': {
    hands: ['Hands up if you have kissed someone at this table.', 'Hands up if you have ever fancied someone at this table.', 'Hands up if you are wearing matching underwear right now.'],
    number: ['Fingers: how many people at this table have seen you naked?', 'Fingers: how many people here have you messaged this week?', 'Fingers: how many people here know your worst secret?'],
    point: ['Point at the person here you would trust with your phone unlocked.', 'Point at whoever here you have known the longest.', 'Point at whoever here would be the worst person to be stuck in a lift with.'],
    face: ['Pull the face you would make if your ex walked in right now.', 'Pull the face of whoever is sitting opposite you.', 'Pull the face you make when you hear your own voice on a recording.'],
  },
};

const slug = (s) => s.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');

function flatten(src, prefix) {
  const out = [];
  for (const [cat, types] of Object.entries(src)) {
    for (const [type, list] of Object.entries(types)) {
      list.forEach((t, i) => out.push({ id: `${prefix}-${slug(cat)}-${type}${i}`, cat, type, t }));
    }
  }
  return out;
}

export const TASKS = { family: flatten(FAMILY, 'f'), adult: flatten(ADULT, 'a') };
export const CATEGORIES = { family: Object.keys(FAMILY), adult: Object.keys(ADULT) };

/** What the faker is told for each type: enough to move their body, nothing more. */
export const FAKE_HINT = {
  hands: { act: 'Hand up, or keep it down?', kind: 'Hands up' },
  number: { act: 'Hold up 0 to 10 fingers.', kind: 'Fingers' },
  point: { act: 'Point at someone. Anyone.', kind: 'Point' },
  face: { act: 'Pull a face. Commit to it.', kind: 'Face' },
};
