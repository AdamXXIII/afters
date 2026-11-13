// Cyril's adult (18+) line bank. Same rules as LINES: max 90 chars per bubble, max 2 bubbles.
// A key maps to bubbles (strings) or to variants (arrays of bubbles); one variant is picked at random.
// Adults 18+ = uncensored swearing and grown-up comedy (booze, work, money, exes, regret). Never sexual:
// no innuendo, no bedroom jokes, no body parts (Adam, 2026-11-13).
export const LINES_ADULT = {
  introAgain: [
    ['The classic again? Christ. Same seats, same grudges, then.'],
    ['Three courses, no mercy. Pens out, phones up.'],
  ],
  title: [
    ['Good evening. Sit down. Not on the coats, you animal.'],
    ['Evening. I\'m lit, and judging by the empties, so are you.'],
    ['Welcome. Somebody turn the big light off. It\'s not a fucking interrogation.'],
  ],
  create: [
    ['A new table! I\'ll fetch my good holder. The one nobody\'s been sick in.'],
    ['Oh, a fresh table. Light me, pour something, and nobody mention work.'],
    ['New table. I\'ve had a trim and a stiff sherry. Let\'s go.'],
  ],
  join: [
    ['Come in. Mind the step, and the recycling. What\'s the code?'],
    ['Let yourself in, darling. Code on the door. No, it\'s not 1234. Christ.'],
    ['In you come. Shoes off, coat on the bed, code in the box.'],
  ],
  lobbyWaiting: [
    ['Just you. Drinking alone is a cry for help. Get one more.'],
    ['Not enough of you yet. Text the flaky one. You know who.'],
    ['Waiting for more. Somebody\'s "five minutes away". They\'re in the shower.'],
  ],
  lobbyReady: [
    ['That\'s a table. Whenever you\'re ready, host. Today, ideally.'],
    ['Enough of you. Host, press the bloody button. It\'s the big one.'],
    ['Right, we\'re all here. Host, crack on before someone orders a taxi.'],
  ],
  lobbyFull: [
    ['Eight. Splendid. Somebody\'s sitting on a bloody stepladder.'],
    ['A full house. Eight of you and one bottle opener. Good luck.'],
    ['Eight! The neighbours are going to fucking love us.'],
  ],
  tableFull: [
    ['Table\'s full. Grab a drink and heckle until the next game.'],
    ['No room, darling. Stand at the back and be smug about it.'],
  ],
  intro: [
    ['Good evening, you shower. I\'m Cyril, your host and your lighting.', 'Eleven thousand dinner parties. I\'ve watched three marriages end over Monopoly.'],
    ['Evening. I\'m Cyril. I burn at both ends, like your overdraft.', 'I\'ve seen it all. Divorces, fist fights, the vicar on tequila. Let\'s play.'],
    ['I\'m Cyril. Tonight, nothing\'s off the table. Except the good wine.', 'Somebody hid it. I saw. Let\'s begin.'],
  ],
  r1Intro: [
    ['Course one: Plate Up. Two of you answer the same question.', 'The table decides whose answer was less shit.'],
    ['Plate Up. Two of you, one prompt. Make it sting.', 'Everyone else votes. Anonymously. Cowards.'],
  ],
  r1Write: [
    ['Write something brutal. Or something true. Usually both.'],
    ['Go on. Say what you\'d only say three drinks in.'],
    ['Be rude. Be clever. Be quick. Pick two.'],
  ],
  timer10: [
    ['Ten seconds. Type like your boss is behind you.'],
    ['Ten seconds left. Stop fannying about with full stops.'],
    ['Ten seconds. Panic now. Proper panic.'],
  ],
  timer3: [
    ['Pens down. Mouths shut.'],
    ['Time. Whatever you\'ve got, you\'re stuck with it.'],
    ['Done. Ready or bloody not.'],
  ],
  r1Vote: [
    ['Only those who didn\'t write it may vote. Don\'t vote for yourself, you sad act.'],
    ['Vote for the best. If you wrote it, hands off.'],
    ['Pick a winner. Be honest. You\'ve had enough wine for it.'],
  ],
  r1Clean: [
    ['Every single vote. Licked the plate clean.'],
    ['A clean sweep. Unanimous. You lot can\'t agree on a takeaway.'],
    ['Every vote! Somebody frame that.'],
  ],
  r1Tie: [
    ['A dead heat. Lovely. Nobody\'s happy.'],
    ['A tie. Like a divorce: everyone gets half and everyone\'s furious.'],
  ],
  r1Empty: [
    ['One of our chefs sent out nothing. Absolute shambles.'],
    ['An empty plate. Bold. Lazy, but bold.'],
  ],
  r1Normal: [
    ['Splendid. The table has spoken. Harshly.'],
    ['There we are. One of you can be smug now.'],
    ['Delicious. Shit. Nearly blew myself out.'],
  ],
  r1NoVotes: [
    ['Nobody voted. Too busy topping up, I assume.'],
    ['No votes. Shy? You weren\'t shy at the bar.'],
  ],
  r1Scores: [
    ['After course one, the standings. Somebody\'s already gloating.'],
    ['Scores so far. Don\'t get cocky. It\'s early and you\'re pissed.'],
  ],
  r2Intro: [
    ['Course two: Porkies. Every fact you\'ll see is true. Grim, but true.', 'Every answer you\'ll see is a lie. Bar one. Like a CV.'],
    ['Porkies! Real facts, all true, mostly horrible.', 'Your job: lie through your teeth and fool your friends.'],
  ],
  r2Write: [
    ['Write a porky so convincing HMRC would believe it.'],
    ['Lie to them. Lie like you did about your Dry January.'],
    ['Invent something. You\'ve blagged worse in a job interview.'],
  ],
  r2TooHonest: [
    ['That\'s actually the truth. Well, shit. Write a lie.'],
    ['Oops, that\'s the real answer. Try again, Einstein.'],
  ],
  r2Pick: [
    ['Find the real answer. Don\'t pick your own; that\'s just sad.'],
    ['Which one\'s true? Choose carefully. Not your own, you egomaniac.'],
  ],
  r2FooledMany: [
    ['You fooled {n} people. Smooth. Remind me never to lend you money.'],
    ['{n} people fell for it. You absolute charlatan. I\'m impressed.'],
    ['{n} of them believed that. Christ alive. You could sell houses.'],
  ],
  r2Nobody: [
    ['Not one of you. The truth sits alone, like me on Valentine\'s.'],
    ['Nobody found it. Like the TV remote, really.'],
  ],
  r2NobodyFell: [
    ['Nobody fell for these. You\'re all shit liars. Good to know.'],
    ['Nobody bit. Not even a nibble.'],
  ],
  r2Truth: [
    ['And the horrible truth...'],
    ['Brace yourselves. The truth...'],
    ['And, God help us, the truth...'],
  ],
  r2Scores: [
    ['Two courses down. Who\'s still standing?'],
    ['Two down. Someone\'s climbing. Someone\'s crying into the cheeseboard.'],
  ],
  r3Intro: [
    ['Last orders! One question. As many answers as you can. Then we swipe.', 'The last round of the night. Like the pub, it gets ugly.'],
    ['Last orders, you animals. One prompt, lots of answers, then swiping.', 'Still all to play for. Mathematically, if not morally.'],
  ],
  r3Write: [
    ['Quick as you like. Four answers each. No holding back.'],
    ['Four answers each. Empty the tank. Spelling optional.'],
  ],
  r3Swipe: [
    ['Right to raise a glass. Left to pass.', 'Only five glasses, so don\'t piss them away on everyone.'],
    ['Swipe right if it\'s good. Left if it\'s shit.', 'Five glasses each. Spend them like it\'s payday.'],
  ],
  r3Toast: [
    ['And the toast of the table is...'],
    ['And the sharpest tongue of the night belongs to...'],
  ],
  podium: [
    ['Third place. Second place. Always the bloody bridesmaid.', 'And our winner, who will now be unbearable until Christmas.'],
    ['Third. Second. Close, but no cigar.', 'And our winner. Take a bow. Not that far, you\'ll fall over.'],
  ],
  end: [
    ['Same again? I\'ve got an inch of wax left. Fuck it, go on.'],
    ['Another round? I\'m knackered, but go on.'],
    ['Again? Fuck it. Why not. Nobody\'s driving.'],
  ],
  endGuest: [
    ['Same again? That\'s up to the host. Bribe them.'],
    ['Another? Ask the host. They\'re in charge, God help us.'],
  ],
  disconnect: [
    ['Someone\'s wandered off. Probably being sick. We\'ll wait. Briefly.'],
    ['We\'ve lost someone. Gone for a cheeky fag, no doubt.'],
  ],
  hostLeft: [
    ['The host has buggered off. Let\'s move us to someone more sober.'],
    ['Our host has left us. Very rude. Handing over to someone else.'],
  ],
  mindFlame: [
    ['Mind the flame. And the curtains.'],
    ['Careful. Open flame, drunk people. What could go wrong?'],
    ['Oi. Hands off. I\'m a centrepiece, not a fucking lighter.'],
  ],
  wait: [
    ['Plated. Now we wait. Top up while you\'re at it.'],
    ['Done? Sit back. Look smug. You\'ve earned it, maybe.'],
    ['Sent. Now the delicious agony of waiting.'],
  ],
  r2Wait: [
    ['Porky told. Straight face, you beautiful lying bastard.'],
    ['Lie submitted. Poker face, darling.'],
  ],

  // Menu and results
  menuHost: [
    ['Pick your poison, host. Everything on this trolley is bad for you.'],
    ['Choose a game, darling. Quickly. The ice is melting.'],
    ['Host, take your pick. Nothing with a rulebook longer than a Tesco receipt.'],
  ],
  menuGuest: [
    ['The host is choosing. Top up your glass and try to behave.'],
    ['Patience. The host is dithering. Shout at them. It helps.'],
    ['Waiting on the host. They\'re reading every bloody word.'],
  ],
  menuSoon: [
    ['Not ready yet, darling. Chef\'s having a fag break.'],
    ['Coming soon. Like your train. Which is to say, who fucking knows.'],
    ['That one\'s not out yet. Don\'t rush it. Good things take time.'],
  ],
  menuServe: [
    ['{game} it is. Somebody top me up. I\'m running on fumes.'],
    ['Ooh, {game}. Somebody\'s feeling brave. Or drunk.'],
    ['{game}. Good choice. Fuck it, let\'s go.'],
  ],
  nightLead: [
    ['{name} is winning tonight. Insufferable already.'],
    ['{name} leads the night. Somebody knock their drink over.'],
    ['Tonight\'s big winner so far: {name}. Hide their phone before they post about it.'],
  ],
  resultsWin: [
    ['{name} wins! Smug, sweaty and very pleased with themselves.'],
    ['Victory to {name}. We\'ll never hear the end of it.'],
    ['{name} takes it. Didn\'t see that coming. Neither did {name}, by the look of it.'],
  ],
  resultsLast: [
    ['{name} came last. Proper last. Spectacularly last.'],
    ['Bottom of the pile: {name}. No shame, darling. Well, some shame.'],
    ['{name}, dead last. Still, it\'s the taking part. That\'s what losers say.'],
  ],

  // Banter
  everyoneDone: [
    ['Everyone\'s finished early. Keen. Or you just didn\'t try.'],
    ['All done already? Did any of you actually read it?'],
    ['Everyone\'s in. That was quick. Suspiciously quick.'],
  ],
  slowpoke: [
    ['Still waiting on {name}. Take your time, darling. Actually, don\'t.'],
    ['{name} is still going. Writing a novel, are we?'],
    ['Come on, {name}. Some of us have work in the morning.'],
  ],
  r1Landslide: [
    ['A landslide. Every vote. Somebody call an ambulance.'],
    ['All the votes. That\'s not a win, that\'s a fucking mugging.'],
  ],
  r1Close: [
    ['Ooh, close. A whisker in it. Recount? No. Can\'t be arsed.'],
    ['Tight. Very tight. Like the Christmas budget.'],
    ['Neck and neck. Somebody\'s going to sulk.'],
  ],
  r2TruthFound: [
    ['Lots of you found the truth. Too much time on Wikipedia.'],
    ['Most of you knew that. I won\'t ask how.'],
    ['Plenty spotted the truth. Smart-arses, the lot of you.'],
  ],
  scoresLeader: [
    ['{name} is winning. Enjoy it. I\'ve seen leads blow out faster than me in a draught.'],
    ['{name} leads. Everyone else, pull your fingers out.'],
    ['{name} in front. Insufferable, but fair play.'],
  ],
  scoresLast: [
    ['{name} is last. Absolute shitshow. Lovely to watch.'],
    ['{name} is last. Don\'t worry, there\'s always the next game.'],
    ['Poor {name}. Bottom again. Someone get them a drink.'],
  ],
  ratingAdult: [
    ['Adults only. Thank Christ. I\'ve been biting my wick all evening.'],
    ['Eighteen plus! Somebody put the kids to bed and open the good gin.'],
    ['Ooh, adult mode. I\'ve been holding that in since the kids went up.'],
  ],
};
