# Round 1 (Plate Up) polish report

> AI-generated (Claude, r1 build team, 2026-11-09). Branch `afters/round1`.

## Result: NOT PASSED after 6 rounds

No screen reached WOWED with >= 9 on every score. The final fresh critic (round 6) still says NOT YET on all of them. The reveal and standings come closest. Scores rose from mostly 5-7 in round 1 to mostly 7-8 in round 6, and the type/palette/copy are now rated "at Jackbox level". What still holds the screens back is mostly framing, which lives in shared code (see "Shared changes needed").

## Rounds run

| Round | Critic verdict | Blind A/B (new vs old) |
|---|---|---|
| 1 | 0/7 WOWED | (baseline) |
| 2 | 0/10 WOWED | new won 6/7; write screen reverted |
| 3 | 0/10 WOWED | new won 6/8, 1 tie; reveal prompt-card accent reverted |
| 4 | 0/10 WOWED | mixed; reverted write eyebrow, vote line, scores deltas, tie-badge move |
| 5 | 0/10 WOWED | gold gear ring, inner stamp and new vote hint lost and were reverted |
| 6 | 0/7 WOWED (final) | new won 4/4 |

## Final critic scores (round 6)
Polish / Type / Layout / Readability / Charm / Motion / Consistency

| Screen | Scores | Verdict |
|---|---|---|
| r1-intro | 7 / 7 / 6 / 7 / 7 / 5 / 7 | NOT YET |
| r1-write | 7 / 8 / 6 / 8 / 6 / 5 / 7 | NOT YET |
| r1-wait | 7 / 7 / 7 / 7 / 7 / 6 / 7 | NOT YET |
| r1-vote (voter) | 7 / 8 / 7 / 8 / 7 / 6 / 6 | NOT YET |
| r1-vote (author) | 7 / 8 / 7 / 7 / 8 / 5 / 6 | NOT YET |
| r1-reveal (3/5/8 players) | 8 / 8 / 7 / 8 / 8 / 7 / 7 | NOT YET (closest) |
| r1-scores (5/8 players) | 7 / 8 / 6 / 8 / 5 / 5 / 7 | NOT YET |

Critics only see still frames, so "motion" is scored from implied motion. The live screens animate: the card flip, menu lines staggering in, tokens flying, stamps, count-ups, FLIP reorders and the plate spin.

## What changed (all in r1 files)

- **New `src/screens/r1-kit.js`**: round-private helpers forked from `common.js` (timeline, sayLater, seeded tilt, avatar discs, in-sheet Cyril note, host Skip pill, fitText, countTo, procedural willow plate, icons) plus an extra Round 1 line bank in Cyril's voice, picked by seed so every phone matches.
- **r1-intro**: the round card is now a restaurant menu card. It has a mustard band, "Plate Up" in claret Fraunces, rules as dotted-leader "prices" (80 sec / 1 on 1 / 1000 pts) and a "Win every vote? Bonus +250" footer. It flips in and the lines stagger. The reaction rail is off so Cyril's face shows above the card. The Skip pill is styled.
- **r1-write**: a menu-card prompt (auto-fit 23-32px) with a "secret rival" line. A plate rack below shows "Cooking now / Up next / Served". Cyril's tips sit in the sheet, so nothing covers the strip's timer. The 10-second warning turns the tip tomato. The serve button has a cloche icon and the card flies up on serve.
- **r1-wait**: "Plated." headline. Your two answers show as tilted handwritten place cards with the full prompt. A bigger, bolder willow plate spins, with a spin counter and Cyril quips. Live "Still in the kitchen" chips have a served tally.
- **r1-vote**: the show layer has a full-width prompt card with the timer and live "who has voted" discs. Its top-right corner is notched for the gear. The camera shot changed to `scores` so Cyril is whole and visible. The sheet has two big handwritten place-card buttons with A/B brass coins, an "or" medallion, a claret selected state with a tick, and a Cyril note. In the author view both cards are inert, yours has a gold "Yours" tag, and the line is "You sit this vote out. Look innocent."
- **r1-reveal**: taller place cards. Voters' avatar tokens fly in, Cyril's house vote is a glowing candle token with a ½ tag, and each card shows "n votes". Name stamps slam on. Points sit in solid pills (claret plus laurel for the winner). The winner gets a "Best plate" seal stamp on its outer edge, lifts and glows, and the loser dims. Clean plate gets a ribbon, and a tie gets a "Dead heat / Points shared" banner. Cyril's normal-outcome lines vary by seed, and he has a special line when his half-vote decides it.
- **r1-scores**: a custom board with ordinal ranks (1st, 2nd...) and "joint" tags for ties. Each row has a thin player-colour progress bar, a brass crown and gold glow for the leader, and a "you" tag. Rows FLIP from the old order, count up, and show delta flags (only from course two on, because in course one the delta equals the total). Cyril's quip sits in the header with a "— Cyril" credit, so no bubble covers the board.
- **`src/demo.js`**: added one DEMOS entry, `r1-vote-author` (the author's view of a vote), for screenshots.
- `node scripts/e2e.mjs` passes. I last ran it on the final code: 3 phones, full game and "Same again", no console errors.

## Still NOT YET (and why)

Inside r1 files (next steps if another pass happens):
1. **Write and wait**: the 60-110px dead band between the Cyril tip and the plate rack and button. With the keyboard up it is hidden, but stills read as unfinished.
2. **Tie and house vote**: the "Dead heat" banner still sits over Cyril's face. Both tied cards use the grey loser pill, so a tie needs its own celebratory style. The house token is still small.
3. **Vote**: the voter discs are greyed and overlapping, and "0/3 voted" has no label.
4. **Author view**: the opponent's card is dimmed, which reads as "disabled".
5. **Scores**: no rank-change arrows in course one, because every prevRank is equal.

## Shared changes needed (I could not make these; files are frozen)

1. **Scoring rounding (`src/game/scoring.js`)**: a 2-1 split pays 667/333, which leads to totals like 1334/666 and 1166 vs 1167. Every critic flagged these as looking like bugs. Suggest rounding R1 matchup points to the nearest 50 (e.g. 650/350, or a fixed 700/300 for a 2-1 split).
2. **Settings gear (`#topbar`, `src/ui/base.css`)**: on show screens it sits over the top card. I notched my cards around it, but critics still call it a collision every round. Suggest hiding the gear during vote and reveal, or giving it a solid linen disc so it reads as a button on any background.
3. **Input strip (`src/ui/strip.js` + `components.css`)**: with 5+ players the chips overflow past the right edge (the 4th chip is cut). The waiting chip's typing dots collide with the next chip. Cyril's wick is cropped at the top of the 132px slot. Suggest compact chips (avatar only) whenever chips would overflow, plus a "+2" overflow badge.
4. **Stage framing (`src/stage/Stage.js` SHOTS / props)**: half-cut props at the screen edges (a dark block on the left, a brass ring and plate on the right) appear in intro, reveal and scores. On the scores shot, the rows cover Cyril so only his eyes show with 8 players. Suggest a tighter `scores` shot that puts Cyril bottom-right, and nudging the side props inward.
5. **Base eyebrow size (`components.css` `.t-eyebrow` 13px)**: critics repeatedly cite the 16px floor. I raised r1 eyebrows to 14px locally, but the token should change globally if it changes at all.
6. **`DESIGN.md` 2.3 / 4**: r1-vote now puts the answers in the sheet as big handwritten cards, and the show layer carries prompt, timer and voters, instead of duplicating A/B cards on the show layer. The show layer is still identical on every phone. Worth updating the spec if the lead agrees.

## Screenshots
`node scripts/shoot.mjs --screens r1-intro,r1-write,r1-wait,r1-vote,r1-vote-author,r1-reveal,r1-scores --out shots/r1/check` (add `--players 8` or `--players 3 --me guest` for variants). `shots/` is git-ignored.
