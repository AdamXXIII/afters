# Round 2 (Porkies) team report

> AI-generated (Claude, Round 2 build team, 2026-11-09). Branch: `afters/round2`.

## Result: NOT PASSED after 6 rounds (honest verdict)

Every round had a fresh critic and, from round 2 on, a blind A/B test. The pass bar was WOWED and 9+ on every score. No screen reached it in the final review. The porky reveal was rated WOWED (9/9/8/9/9/9/8) in round 3 but fell back to NOT YET in later reviews. Final scores sit at 6-9, mostly 7-8.

## Final critic scores (round 6)

Scores are polish / type / layout / readability / charm / motion / consistency.

| Screen | Scores | Verdict |
|---|---|---|
| r2-intro | 8/8/7/8/8/7/8 | NOT YET |
| r2-write | 7/8/6/8/7/5/7 | NOT YET |
| r2-wait | 7/8/7/8/8/6/8 | NOT YET |
| r2-pick (5p and 8p) | 8/8/7/8/7/6/7 | NOT YET |
| r2-reveal, truth beat | 8/8/7/8/8/7/6 | NOT YET |
| r2-reveal, porky beat | 8/7/6/8/9/7/6 | NOT YET |
| r2-reveal, nobody beat | 6/7/5/7/8/6/5 | NOT YET |
| r2-scores | 8/8/7/8/7/6/7 | NOT YET |

The round-1 baseline was 4-8, with 0 WOWED.

## Rounds run

1. **Full redesign of all six screens.**
2. **Critic fixes:** Cyril kept visible, a 16 px type floor, a lock-in state, rank moves. The new version won the A/B on all 6 screens.
3. **Two-column 8-player pick, bigger truth card, "nobody" label, stronger stamp.** The A/B lost on write, scores and the 8-player pick, so those were reverted.
4. **Sent-back stamp, cleaner truth payoff, pick count pill.** The A/B lost on write and wait, so those were reverted.
5. **One blank style, Caveat in the input field, stamp moved clear of Cyril.** The A/B lost on pick, 8-player pick, scores and nobody, so those were reverted.
6. **Personal "you" copy on reveals, the lie written into the gap crossed out, a gag in the intro rules, clearer scores.** The A/B won 7 of 8; wait lost, so the boop and dot size changes were reverted.

The blind A/B judges were often inconsistent between rounds (the write-screen blank style flipped twice). I followed the "revert if the old one wins" rule anyway.

## What changed (files: `src/screens/r2-*.js`, `r2.css`, new `r2-kit.js`)

- **r2-kit.js** (new): Round 2's own helpers.
  - The fact with a fillable gap.
  - Wax seal and pig-snout SVGs.
  - Avatar discs and name tags, which show "You" on your own phone.
  - Host skip, a count-up helper and seeded tilt.
- **r2-intro:** a claret menu card for "Course Two: Porkies".
  - A wax seal stamps on with a sound and haptic, then the steps slide in.
  - Three numbered steps, then the scoring set out as menu prices (+1000 / +500) with dotted leaders.
  - The reaction rail is hidden, and Skip is a pill.
- **r2-write:**
  - A hero fact card; your lie writes itself into the gap in handwriting as you type.
  - A Caveat input field.
  - A Cyril tip with seeded rotation (fact 1 uses his line-bank line instead of a bubble that covered the timer).
  - The scoring line above "Tell a porky".
  - An inline "Too honest" note on reject.
- **r2-wait:**
  - "Porky told. Keep a straight face."
  - Your lie sealed on a tilted place card.
  - Large wobbling avatars for the players still fibbing.
  - A claret-and-brass boop-the-snout fidget (oinks every 4th boop, with rotating Cyril quips).
- **r2-pick:**
  - The fact card plus timer at the top, and a solid "N of M picked" pill with avatar states.
  - Lettered option rows in Caveat with your own lie dashed and marked YOURS.
  - A "1 of N is real" pill, and a "Locked in" status with the letter once you pick.
  - A "More below" plate above 6 options.
  - The 3D letter tiles were tried and removed (they hid Cyril).
- **r2-reveal:**
  - A fact card with a letter tracker (dud, porky, truth, current).
  - **Nobody beat:** a claret label, struck-through place cards with a SENT BACK stamp and author chips.
  - **Porky beat:**
    - A tilted card with a big PORKY! rubber stamp and Told-by and Fooled chips (which hop on and shake).
    - The points count up, and "You fell for Sam's porky" shows on the fooled player's phone.
    - The lie appears crossed out inside the fact's gap.
  - **Truth beat:**
    - A gold-foil card with a sweeping sheen, a claret "The truth" ribbon and sparkles kept off the numbers.
    - The answer fills the fact's gap in glowing gold, then "+1000 to Dev".
  - Cyril's reactions are held while time is frozen, so screenshots show the faces.
- **r2-scores:** "The bill so far".
  - Rows animate from the old order to the new and count up, each with its round-2 points.
  - The leader row is brass and taller with a wax seal, and your own row has a claret outline.
  - A rank-move pill shows only for moves of 2 or more, or for the new leader.
  - One summary line about the best porky teller.
- **demo.js:** the `r2-pick` demo now has `me: 'act'`, so the screenshot shows the selected and locked state.

`node scripts/e2e.mjs`: **PASS** (full 3-phone game, no console errors).

## Still NOT YET (critic's top remaining asks)

1. The letter tracker's colours need a legend, or a single meaning per state.
2. Some 13-14 px eyebrow labels (the shared `.t-eyebrow` style) are below the critic's 16 px floor.
3. The nobody beat's card is narrower than the other reveal cards, and Cyril needs a smug face there.
4. The write screen has a dead band when the keyboard is closed; it is fine with the keyboard open.
5. The truth card's gold reads as a gradient, not brass.

## Shared-file changes needed (not made; owned by other teams)

- **Strip (`src/ui/strip.js`):** the player chips run off the right edge. It needs a "+N" overflow chip. Every critic flagged this on write and wait.
- **Bubble (`src/ui/bubble.js`):** on show screens where Cyril is low in the frame (r2-scores), the side bubble's tail points sideways at nothing. It needs a "below the bubble, tail down" placement.
- **Camera (`src/stage/Stage.js` SHOTS):**
  - The intro shot is so tight that any round card covers Cyril's mouth. A slightly wider `intro` shot (or a dedicated `roundCard` shot) would fix it.
  - The `scores` shot puts Cyril behind the reaction rail.
- **Cyril (`src/stage/Cyril.js`):** reactions can't be held. I pass a long `duration` under freeze. A `hold` option, or `setExpression()`, would let screens keep a face.
- **Scoring (`src/game/scoring.js`):** the round 1 House half-vote produces totals like 4666 and 4334, which critics read as bugs. Consider rounding.
- **Eyebrow style (`.t-eyebrow`):** DESIGN says 13 px, which conflicts with the 16 px floor critics keep applying. Decide in DESIGN.md.
