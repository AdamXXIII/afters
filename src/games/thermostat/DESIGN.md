# Thermostat - game design

> AI-generated (Claude, Thermostat builder, 2026-11-13). Module `src/games/thermostat/`. Read the box `DESIGN.md` and `ARCHITECTURE.md` first. Mechanic borrowed from Wavelength (one clue, a dial, the room argues); the name, scales, look and copy are ours.

## The pitch
One of you secretly sees a spot on a scale ("Tacky ... Classy") and says one clue out loud ("A gold-plated toilet seat"). Everyone else drags the same dial on their phones, all at once, live, arguing as they go. Closer scores more. The laugh is the table fighting over where a gold-plated toilet seat sits.

## How it plays (the three menu panels)
1. One of you secretly sees a spot on a scale, like Cold to Hot.
2. They say one clue out loud. Everyone else drags the same dial to it.
3. Closer scores more. The Clue-giver scores double.

## Flow
| Phase | Screens | Layout | Timer | Ends early when |
|---|---|---|---|---|
| `thermostat-intro` | intro | show | 9 s (host skip after 2 s) | - |
| `thermostat-clue` | `thermostat-give` (Clue-giver) / `thermostat-listen` | input / split | 45 s | the Clue-giver taps "I've said my clue" |
| `thermostat-dial` | `thermostat-dial` / `thermostat-squirm` (Clue-giver) | split | 60 s | every guesser is locked in |
| `thermostat-reveal` | reveal | show | 8.4 s (bands bloom 1.4 s, verdict 3.2 s, points 4.5 s) | - |
| `thermostat-scores` (once) | standings + who takes the hot seat | show | 7 s | - |
| `thermostat-hot` | the hot seat card | show | 7.5 s | - |
| final clue / dial / reveal, then `results` (box) | | | | |

Everyone gives a clue once (twice each at 3-4 players, so small tables still get a proper game). Then the standings, then the **hot seat**.

## The live dial
- Each phone sends `th-dial {v, up}` while dragging (throttled to ~15 a second). The host keeps one value, who moved it last (`by`) and who is touching it now (`holding`, last 0.9 s), and rebroadcasts on progress. Phones ease the needle towards the host value; your own finger wins while you drag.
- Whoever is touching it rides the needle as an avatar; the pill above says "Sam is turning it" / "Sam and Priya are fighting over it" / "4 of you are fighting over it".
- **Lock it in** stores where the dial was. If anyone moves it more than 1.5 after you locked, your lock drops and your button turns tomato: "It moved. Lock it again". The round ends when every guesser is locked on the same spot (or time runs out: the dial stands where it is).
- The Clue-giver can't touch it. Their phone shows the same live dial with their secret bands faded underneath ("Not a word").
- The Clue-giver may swap the scale once (re-enters the phase with the time left, new target).

## Scoring
Dial runs 0 to 100; the target sits between 6 and 94.
- Within 4: **Spot on**, 300. Within 9: **Warm**, 200. Within 14: **Lukewarm**, 100. Further: **Stone cold**, 0.
- Everyone at the table gets that. The Clue-giver gets double. So the winner is whoever gives the best clues; guessers matter because they score for everyone, including the Clue-giver.
- **Hot seat (final):** last place gives the clue (ties by seed), the bands are half as wide, every point x3 (Clue-giver x6). A real comeback.

## Look
An old brass-rimmed room thermostat on a walnut mount, at the dinner table. Half-moon linen face, willow-to-tomato rim (cold to hot), tick marks, an ink needle with a linen outline on a knurled brass hub on a brass plinth. The hidden bands are candle / tomato / claret (lukewarm / warm / spot on: closer is hotter) and bloom out from the hub at the reveal. Clues are in Caveat on the clue card ("handwritten"), scale ends in Fraunces. The intro card is walnut with a brass hairline; the hot seat card is tomato.

## Content
`content/scales.js`: 150 family scales, 54 adult-only sweary ones (the adult deck is those plus the family 150 = 204). A 6-player game uses 16 (two a round for the swap), so three games a night for three nights stays under 150. Each scale carries one example clue and its spot, for bots and demos. Rules: argue-able, concrete, no physical-fact scales, no food-prone ends, never sexual.

## Dish art (needs a shared change)
`dish: 'thermostat'` isn't in `src/screens/menu-art.js`, so the menu falls back to the cloche. Art note: a brass thermostat dial lying on a side plate: half-moon linen face with ticks, willow-to-tomato rim, an ink needle on a brass hub.

## Changes from the critic loop
- Round 1 (blind vs the official app's store screenshots): ours won onboarding, core dial, reveal and whole game; content lost (physical-fact scales with one right answer, food-prone ends like Cold/Hot, a Soft/Hard scale that invites innuendo, duplicates). Fixes: 27 scales rewritten or replaced; a "last hand on the dial" bonus cut (every critic found it confusing); the "You: +300" pill cut; needle changed from claret to ink because it vanished on the claret bullseye; the verdict stamp moved below the dial so it doesn't hide the result; Cyril stays quiet on scoring reveals so his bubble doesn't sit on the points.
