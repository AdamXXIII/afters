# Same Here - game design

> AI-generated (Claude, Same Here builder, 2026-11-13). Module `src/games/samehere/`. Read the box `DESIGN.md` and `ARCHITECTURE.md` first. Mechanic borrowed from match-the-majority games; every name, question, look and phrase is ours.

## The pitch
A plain question ("Name a TV detective"). Everyone secretly writes one answer. You score if you match the most popular answer. Whoever is the only person with their answer gets the **Wobbly Chair**, and you can't win while you're sitting on it. The fun is "how did nobody else say Columbo?" and the arguments about what counts as the same answer.

## How it plays (the three menu panels)
1. A question. Everyone secretly writes one answer.
2. Match the most popular answer to score a point.
3. Alone with your answer? Wobbly Chair. You can't win while you're on it.

## Flow
| Phase | Layout | Timer | Ends early when |
|---|---|---|---|
| `samehere-intro` | show | 10 s (host skip after 2 s) | - |
| `samehere-write` (screens `samehere-write` / `samehere-wait`) | input | 30 s | everyone has written |
| `samehere-sort` (only when Cyril spots a close call) | split | 25 s | everyone taps "I'm ready" |
| `samehere-reveal` | show | ~7-16 s: groups smallest first, the herd last, verdict, the chair, the standings | - |
| ...repeat until someone wins (cap 14 questions) | | | |
| `samehere-crown` | show | 9 s | - |
| -> `results` (box bill) | | | |

## Rules
- **Grouping.** Obvious matches merge on their own: case, punctuation, "the", plurals, small typos, titles ("Inspector Morse" = "Morse"), a short synonym list (telly/TV, mum/mom, loo/toilet...). See `group.js`.
- **Close calls go to the table.** "Sherlock" vs "Sherlock Holmes", one answer inside another, a shared surname: Cyril puts up to three on the sort screen as **Same answer?** cards. Anyone can raise another pair (up to five) by tapping two answers. Live vote by **whoever didn't write either answer** (everyone, if that's nobody), so at 3 players the third person is the judge: more "Same" than "Not the same" merges them. No votes = kept apart.
- **Scoring.** Everyone in the single biggest group (two or more people) scores **1 point**. A tie for biggest, or everyone different: nobody scores.
- **Wobbly Chair.** If exactly one person is on their own, they take the chair. It stays with them until someone else is the only one on their own. Two or more on their own: the chair doesn't move.
- **Winning.** First to **5** without the chair. A tie at the top keeps playing (sudden death). After 14 questions the best score off the chair wins. If the chair holder has the top score, the bill shows them one point behind the winner (the engine ranks by score; noted below).

## Look (one idea: place cards on the table)
- Every answer is a **handwritten place card** (Caveat, ink blue) with a folded band.
- Matching answers **stack into one pile**; the herd is a teal tray with a claret "Same here! +1" stamp, and the answers hop in by name.
- The **Wobbly Chair** is a drawn bentwood café chair with one short leg that rocks (still under reduced motion).
- Points are brass place settings (pips) toward the target. Accent teal (the game colour), claret for the chair, brass for points.

## Messages (phone -> host)
`sh-answer {text}`, `sh-vote {id, same: true|false|null}`, `sh-propose {a, b}` (two group ids), `sh-done {done}`.

## Content
`content/questions.js`: 182 Family, 166 Adults 18+. Mostly concrete "Name a..." recall questions with many plausible answers, plus about 35 opinion questions ("Best day of the week", "Pick a number from 1 to 10") that split a table and still let a majority form. Each line carries 2-5 likely answers for bots and demos. No food or drink topics; adult = swearing, work, money, hangovers, family; never sexual. About 20 questions a game, so three nights at 6 players need ~60-120 per rating.

## Critic loop (blind A/B vs Big Potato's Herd Mentality photos + how-to page, Jackbox Survey Scramble / Fibbage 3 Steam stills)
- Round 1: onboarding **ours**, core action **ours**, reveal **ours**. Gaps fixed: intro became a worked example (3 said Telly, 1 said Tablet -> chair); sort screen cut to one instruction (the "tap two answers" picker hides behind a link once Cyril has a close call up); merged groups show both answers ("Paul McCartney / McCartney") with "The table voted these the same"; verdict explains when nobody gets the chair; standings show +1 and who can't win; crown says "X wins, N points".
- Content round 1: 0 sexual; 11 food-adjacent, 2 borderline "morning after/bed" lines, 12 weak (one-answer or unmatchable) -> all rewritten, opinion cards added.
- Round 2 (sides swapped): core **ours**, reveal **ours**. First-timer: sort screen unclear -> one line ("Argue out loud. Whoever didn't write them votes."), "I'm ready" with "Answers show when everyone's ready (2 of 5)"; the chair now lands on the lone player's own row; labels capitalised; standings say "Total points", show +1 and who can't win; compact at 6+.
- Whole game: at 3 **about equal** (Herd says 4+), at 8 **worse**. Fixed: the sort phase now only appears when there's a real close call (it was nearly every round), and authors can't vote on their own answers (at 3 they were rubber-stamping merges). Left: easy questions where all 8 match, trailing players have no catch-up, all-different rounds are dead.

## Gaps
- Bill ranking: when the chair holder has the most points, `results` shows them one behind the winner (the box ranks by score only). A box option to pass explicit ranks to `api.finish` would fix it.
- Grouping is string-based: true synonyms outside the short list ("Hoover" vs "Dyson") rely on a player raising them on the sort screen.
- Raising your own pair is only possible on rounds where Cyril found a close call (so most rounds have no phone time between write and reveal); a box-level "object!" button on the reveal would cover the rest.
- No catch-up for trailing players; 8-player rounds with easy questions can be all-match.
- Cyril's speech bubble can be clipped at the top of the input strip (box bubble placement).
