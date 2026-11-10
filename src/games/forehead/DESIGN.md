# BONCE - forehead guessing (design)

> AI-generated (Claude, forehead team, 2026-11-09). Brief: `AIOS/afters/briefs/forehead.md`. The box art bible (`AIOS/afters/DESIGN.md`) still rules look, palette, type and Cyril's voice; this file covers only Bonce.

## 0. The pitch
One of you sticks a phone on your **bonce** (forehead), screen facing out. The word is on that phone *and on every other phone*, so the whole sofa can shout, mime, hum and do terrible accents at you. **Tip the phone down** when you get it, **tip it up** to pass. 60 seconds, then the next bonce. Loud, fast, nobody sits out.

Menu tile: **Bonce** - "A wobbly jelly, worn on the head". 3-8 players, ~8-12 minutes.

## 1. Rules
- **Turns.** Everyone takes a turn as the guesser (seeded running order). Goes each: **2** when 3-4 players, **1** when 5-8 (host can change it on the intro screen). In Teams the order alternates teams.
- **Modes** (host picks on the intro screen):
  - **Everyone for themselves** (default). Everyone except the guesser gives clues.
  - **Gravy vs Custard** (4+ players). Two teams, seats alternate. Only the guesser's team gives clues; the other team watches for cheats and can hit **FOUL!** (someone said the word) which bins the current card.
- **The deck.** Before each turn the *table* (not the guesser) votes one of 3 offered decks for the guesser: "Pick their poison". Most votes wins, ties broken by the phase seed. No votes: random.
- **Modifiers.** From turn 2, about 1 turn in 3 gets a rule card (never two in a row): **Mime only** (no talking, no sounds), **One word clues** (one word at a time, no "sounds like"), **Posh voices** (every clue in your best Downton). Shown on every phone all turn.
- **Marking.** The guesser tips (down = got it, up = pass). Anyone giving clues can also tap **Got it** / **Pass** on their phone (fallback for no sensor, and it's fun to slam). First mark for a card wins; marks during the countdown are ignored. In Teams the other team can only tap **FOUL!**.
- **End of turn.** The card on screen when time runs out is a miss. If the deck (30 cards) runs out, the turn ends early.

## 2. Scoring
| Event | Points |
|---|---|
| Card guessed | **+100** to the guesser (Teams: to the team) |
| Hat-trick: every 3rd hit in a row | **+50** bonus |
| Pass / foul / time-out card | 0 |
| **Top shouter** (the guesser picks the clue-giver who helped most, on the recap) | **+150** to that player (Teams: to the team) |

Teams: every member's final score is the team total, so the whole winning team shares first place on tonight's table. Game ends with `api.finish(rows)` -> the box results screen and cherries.

## 3. Phases, timers, what each phone shows
| Phase | Time | Every clue-giver's phone | The guesser's phone |
|---|---|---|---|
| `forehead-intro` | up to 30 s (host taps **Bonces up!**) | Show: the Bonce card (3 picture rules). Sheet: the running order chips; "Alex is setting the table" | Host sheet: mode switch, goes each, **Bonces up!** (everyone else sees the host's choices live) |
| `forehead-pick` | 10 s (ends once every clue-giver voted and the guesser is ready) | Show: "Sam's bonce" + 3 deck cards with voters' avatars landing on them, modifier stamp. Sheet: 3 big deck buttons "Pick Sam's poison" | Sheet: how to hold it (picture), **I'm ready** (asks iOS motion permission); show: votes landing "They're choosing your fate" |
| `forehead-turn` | 3.5 s countdown + 60 s | Full screen: timer ring, guesser chip, score, modifier banner, the card BIG (flips in on every new card), **Got it** / **Pass** slabs (Teams, other side: **FOUL!**), a tray of the last results | Landscape card: the word huge on the deck colour, edge-to-edge, time bar; full-screen green "GOT IT" / blue "PASS" flash + buzz; left half = pass, right half = got it tap fallback |
| `forehead-recap` | 10 s | Show: "Sam got 7!" counter, every card flips into a hit/miss grid, points count up, Cyril's verdict, standings strip; "Top shouter: Pip +150" stamp | Same, plus "Who shouted best?" avatar buttons |
| -> next `forehead-pick`, or `results` (box) after the last turn | | | |

Timelines are driven by `ctx.elapsed()`; every phone shows the same card at the same moment (host progress carries `idx` and `results`).

## 4. Sensors
`src/shared/sensors.js`: `tiltSensor().start()` on the **I'm ready** tap (iOS permission), `calibrate()` at the end of the countdown (phone already on the head), down = got it, up = pass, hysteresis built in. If no sample arrives within ~1.2 s the tap halves are labelled bigger. `lockLandscape()` best effort; if the viewport stays portrait the card is rotated 90 deg in CSS so it still reads landscape on the forehead. `vibrate(BUZZ.correct|pass|timeUp)`.

## 5. Cyril (keys in `index.js` `lines`, family + adult)
`fhIntro`, `fhPick`, `fhPickMe`, `fhMod_mime|oneword|posh`, `fhGo`, `fhStreak`, `fhFoul`, `fhTimeUp`, `fhRecap0|Low|Mid|High`, `fhShout`, `fhLast`. Examples: "Phone on your forehead, screen out. Yes, you'll look daft. That's the point." / "Three on the bounce! Mind the flame." / "Nought. A clean sheet. Of shame." / Adult: "Phone on your forehead. Not anywhere else. I've seen hen dos."

## 6. Content
`content/family.js` 10 decks x 40 (Silver Screen films, roles-not-real-people, 90s/00s nostalgia, things you shout at the telly, odd jobs, accents & impressions, act it out, beasts, Christmas at Nan's, sports day). `content/adult.js` 6 decks x 40 (first date don'ts, hen & stag, innuendo, after midnight, saucy acting, behind closed doors). Family table: offers 3 family decks. Adults 18+ table: 2 adult decks + 1 family deck per offer. Cards never repeat tonight (`api.take`, keyed per deck).

## 7. Look
Bonce colour is **tomato** (the jelly). The turn card is a fat linen "place card" on the deck's colour; deck icons are hand-drawn SVG (film, monocle, cassette, megaphone, spanner, mask, theatre, paw, cracker, trophy, heart, tiara, banana, moon, lips, cocktail). Got it = sage, Pass = willow, Foul = tomato. Fonts per the bible: Fraunces for the card, Bricolage for UI, Caveat for nothing (no player writing here).
