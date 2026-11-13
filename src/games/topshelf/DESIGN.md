# Top Shelf - game design

> AI-generated (Claude, Top Shelf builder, 2026-11-13). Module `src/games/topshelf/`. Read the box `DESIGN.md` and `ARCHITECTURE.md` first. Genre: category trivia climb (mechanics borrowed: visible climb, loser picks, final wager). Everything visible (name, cabinet, bottles, copy, questions) is ours.

## Pitch
Cyril's walnut drinks cabinet has fifteen shelves. Every player is a bottle on the floor. Answer on your phone: right climbs one shelf, right inside five seconds climbs two, wrong slips one. Whoever is lowest picks the next category. Two twists mid-game, then the Last Drop: bet one, two or three shelves on one hard question. Highest bottle wins.

## How it plays (menu, three panels)
1. Answer each question on your phone. Right climbs a shelf.
2. Answer right in the first five seconds to climb two. Wrong slips one.
3. Whoever is lowest picks the category, and the last question is a bet.

## Rounds (8)
| # | Round | Questions |
|---|---|---|
| 1-3 | Normal: lowest picks a category from three, two questions from it | 2 each |
| 4 | **Steal!** One question. The quickest right answer from below swaps shelves with the leader, unless the leader also gets it right. | 1 |
| 5 | Normal | 2 |
| 6 | **Pass the Port**: everyone votes who answers alone (+2 / -2); everyone else bets "Gets it / Fluffs it" (right call +1) | 1 |
| 7 | Normal | 2 |
| 8 | **The Last Drop**: lowest picks the category, everyone bets 1-3 shelves, one hard question (no shields, no speed bonus, no answer counts as wrong) | 1 |

Depth: streaks (three right in a row = a **Steady Hand**, a brass collar on your bottle that forgives the next slip), the steal, the port vote, the final wager. Phone superpowers: private answers with a speed clock, live port vote, synced reveal with the climb animated on every phone, sound + haptics.

## Phases
| Phase | Layout | Timer | Ends early |
|---|---|---|---|
| `topshelf-intro` | show | 8 s (skip after 1.5 s) | - |
| `topshelf-round-intro` (steal, port, final) | show | 5 s (skippable) | - |
| `topshelf-pick` | split | 12 s (random if no pick) | picker chose |
| `topshelf-port` | split | 12 s | all voted |
| `topshelf-wager` | split | 12 s (default 1) | all bet |
| `topshelf-q` | split | 15 s (Last Drop 20 s) | all answered / bet |
| `topshelf-reveal` | show | 7.6 s: answer 0.9 s, picks 1.5 s, climb 2.7 s, Cyril 4.3 s | - |
| `topshelf-summit` | show | 9 s, then `api.finish` (score = shelf) | - |

## Content
`content/*.js`: nine categories (Pop culture, Music, Telly, Film, Odd facts, Sport, Words, Science and nature, History) with 517 questions (55-62 each), plus **Bedroom** (28, Adults 18+ tables only). Family and adult share the questions; the adult table adds the Bedroom bottle and ruder Cyril lines. Evergreen facts only: no current holders, records, prices or ages; no food topics. `!` marks hard questions (used only for the Last Drop, 6-9 per category).

## Known gaps (2026-11-13)
- Content is still easier than the bar in places (about a third are gimmes); rewriting easy items into half-known ones would help most.
- No catch-up beyond lowest-picks and the Steal; a runaway leader can settle rounds 3-6. Idea: a "floor bonus" (+1 extra for the lowest bottle's right answer).
- Ties at the top share the win: the box results only see whole shelves. Needs an `api.finish` rank/tiebreak (shared change).
- Menu tile uses the fallback `cloche` dish; a drinks-cabinet dish in `src/screens/menu-art.js` is a shared change.

## Critic verdicts (blind A/B vs Mount Cleverest app + Party Pack 6 stills, 2026-11-13)
- Onboarding: lost r1 (no win condition up front), **won r2** after the goal line.
- Core question screen: lost r1 and r2 (weak time pressure), **won r3** after the big fuse and larger question.
- Reveal / standings: lost r1 (tiny unnamed bottles), **won r2** after the shelf window, name tags and crowns.
- Content: **won r1**, lost r2 on a different sample (too many gimmes); 30 half-known questions added and 11 give-aways swapped, then stopped.
- Whole-game arc: **won r1**.
- Fact-check: 60 random questions, 56 clean; 2 doubtful dropped, 2 reworded.

## Two of you (2026-11-13)
- Head to head. Pass the Port becomes **Make Them Answer**: no vote (it would always tie), the leader answers alone (+2 / -2) and the one below calls it, Gets it / Fluffs it (+1). A catch-up shot, not a coin flip. `topshelf-port` is skipped.
- Steal at 2: get it right while the leader gets it wrong and you swap shelves (banner and round card say so).
- Demos: `topshelf-duo-port-intro`, `topshelf-duo-q-bet`, `topshelf-duo-q-alone`, `topshelf-duo-reveal-port`.
- Blind critic (2026-11-13) vs the port vote played as-is at 2: ours won 8 v 4.
