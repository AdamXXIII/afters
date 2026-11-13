# Something in the Soup: build report

> AI-generated (Claude, Soup builder, 2026-11-13). Branch `game/soup`. Rules and screens: `DESIGN.md` in this folder.

## What's built
- The full game for 4-8 players (`players: [4, 8]`). Intro, then a private role card (press and hold to read). Three day tasks that rotate: Count the ..., Safe Hands and Pass the Parcel. A task result with that day's clue. A round table with a live "point the finger" tally and a "Ready to vote" button. A secret banish vote, then a banish reveal one vote at a time: stamp, a face-down card that flips to show the role. Night, which looks identical on every living phone. Morning. The final table (share the pot or banish again), its reveal, and an end screen showing every role. Then the box results screen.
- Twists:
  - Shield: won privately in a task, saves you from one poisoning.
  - Ghosts: banished and poisoned players see every screen and get one Séance vote per game, shown as "A ghost".
  - The table's hunch: Faithful taps at night become a hint the next morning.
  - The daily clue: for spoons, every hand anonymously; for the code, whose digit most people got wrong; for the parcel, who dropped it.
- Bots play every phase. Parcel bots play live, and a Poisoner bot sometimes hangs on to the parcel. There is a demo for every screen (17).
- Content: 234 items. 30+30 counting items, 20+20 safe rooms, 30+30 morning reports and 74 Cyril line variants, including landslide and tie reactions. Every line has family and Adults 18+ versions. There are no food topics in anything players answer.
- `hidden` is removed.

## Tests
- `node scripts/sim.mjs 4|5|6|8 50 soup` passes. The game refuses 3 players by design (the roster says 4-8), so 4 players replaces the brief's 3-player sim.
- Bot stats (24 seeded games, bots vote almost at random):
  - 6-8 players: 2-3 days, about 7-10 minutes.
  - 4-5 players: usually 1 day, about 4-5 minutes.
  - The Poisoners won about 15 of 16 games, because random voters rarely find them.

## What's fun
- The night. Every phone goes dark together, everyone taps, and nobody can tell who is acting. It is the best moment, and only phones can do it.
- The banish reveal. Votes land one at a time with names, then a stamp, then a face-down card that trembles and flips to "Faithful" or "a Poisoner". It gets a groan.
- Safe Hands. A Poisoner can say the wrong digit out loud, and the result names whose digit most people got wrong. It starts an argument straight away.
- Pass the Parcel is loud and daft, and names whoever dropped it.

## What isn't
- 4-5 players is short: one day, then the final table. It works, but there is barely an arc.
- Count the ... is the weakest task, because its clue (the anonymous hands) is hard to accuse anyone from.
- Balance is unknown with real people. The bots say the Poisoners are strong.

## Critic verdicts
Blind A/B against Push The Button's Steam screenshots. For onboarding, content and arc, the critic compared against Traitors-at-home and Push The Button from what it knows of them.

| Piece | Round 1 | Fix | Round 2 |
|---|---|---|---|
| Core action (tasks, round table) | **Ours** (medium-high). Gap: the top was crowded, the bubble covered the tally, and the gear overlapped the pot | Cut-out for the gear, compact 2.4 s bubbles on split screens | Stopped: won |
| Reveal (banish, morning, night) | Bar (about 65%). Gap: no build-up beat before the role | The role card is held face-down and trembling, then flips with a shake, haptic and sound | see reply |
| Onboarding | Bar. Gap: rule 3 was a conditional sentence, a blank icon, the wrong minutes | Rule 3 now says "If any are left at the end, they take the pot"; icon and minutes fixed | Bar. Gap: the intro card is still dense. Stopped (two rounds lost) |
| Content | Mixed. Gap: lines don't react to play | Landslide and tie lines, more intro lines | **Ours** on voice. Remaining gap: more event-keyed lines, fewer near-identical mornings |
| Whole-game arc | Bar. Gap: the Faithful have nothing to deduce from | Daily public clue | Bar. Clues are real but weak. Stopped (two rounds lost) |

## Gaps left
- Onboarding: fold the day, night and final rules into first-time in-context hints, and cut the intro card to one line.
- Arc: make every task's clue accusable (spoons is weak). Make 4-5 player games longer, for example no poisoning on the first night.
- Recruit (a roster twist) is not built. It needs a night control that only the Poisoners see, which would break the identical night screen.
- Content: about 15 lines keyed to events (who dropped the parcel, a lying digit, a Shield save).

## Shared changes needed
- None required.
- Nice to have: a `below` placement for Cyril's bubble, so split screens can keep their top cards clear.
