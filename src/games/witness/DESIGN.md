# Character Witness - game design

> AI-generated (Claude, Character Witness builder, 2026-11-13). Module `src/games/witness/`. Read the box `DESIGN.md` and `ARCHITECTURE.md` first. Genre: bluff-and-pick about the people at the table. Everything visible (name, look, questions, copy) is ours.

## The pitch
One of you is in the dock with a question about yourself ("The first thing Priya would save in a fire"). You answer honestly. Everyone else writes a fake answer *in your voice*. The table then has to find the real you among the forgeries. It is a party game about how well you know each other, so the laughs come from the people, not the cards.

## How it plays (the three menu panels)
1. One of you answers a question about yourself. Honestly.
2. Everyone else writes a fake answer in that person's voice.
3. The table picks the real one. Fool them to score.

## Flow
| Phase | Layout | Timer | Ends early when |
|---|---|---|---|
| `witness-intro` | show | 9 s (host skip after 2 s) | - |
| `witness-write` (per round; screens `witness-dock` / `witness-write` / `witness-wait`) | input | 40 s | everyone has written |
| `witness-pick` (screens `witness-pick` / `witness-sweat` for the defendant) | split | 15 s, +1.5 s per option over 4, max 24 s | every juror picked |
| `witness-reveal` | show | ~10-22 s (duds 2.4, each fake 2.9, truth 3.8, verdict 3.4) | - |
| `witness-scores` (once) | show | 7 s | - |
| `witness-cross-intro` | show | 7.5 s | - |
| final `witness-write`, `witness-choose` (`witness-choose` / `witness-recess`), `witness-pick`, `witness-reveal` | | 40 / 15 / 14 s | |
| -> `results` (box) | | | |

Everyone is in the dock once (shuffled order). Then the standings, and the last-placed player takes the stand for **Cross-examination**.

## Scoring
- Pick the defendant's answer: **+1000**. Fastest to find it ("Expert witness", shown as *Fastest*): **+250**.
- Your fake fools someone: **+500 per person**.
- The defendant: **+250 per juror who picked a fake**.
- Your fake is the defendant's answer word for word (give or take a typo): it merges into the real one, you get **+750** ("You wrote exactly what they wrote") and you can't pick it.
- Cross-examination doubles everything. The defendant keeps one fake beside the truth (if they dither, Cyril keeps a player's fake for them).
- If the defendant writes nothing: "No comment. Contempt of court." Nobody scores that round.
- Fewer than three answers: Cyril adds house fakes from a bank keyed by the question's kind (thing, place, person, number...), so even three players get three cards.

## Twists (depth)
- **Plead the fifth** (once a game, not in the final): the defendant writes a lie instead. It still counts as "their" answer; the reveal seals it *Fifth* and says so. A comfort valve for Adults 18+ questions and a bluff in its own right.
- **Cross-examination**: last place takes the stand, chooses the lie, double points. Catch-up and a different decision (the defendant picks the most convincing forgery).
- **Expert witness**: speed matters when picking.

## Look (one idea: the court sits at the dinner table)
- Answers are **handwritten witness statements** (Caveat, ink blue) on ruled card with a claret margin line.
- The person on the stand sits behind a **brass dock rail** drawn round their avatar.
- The truth gets a **claret wax seal** ("Sworn" / "Fifth"); fakes get a **tomato rubber stamp** ("Fake").
- Accent willow (the game's dish colour) for the jury, claret for the stand and the final.

## Messages (phone -> host)
`wt-answer {text, fifth}`, `wt-pick {optionId}` (changeable until time), `wt-keep {optionId}` (final, defendant only).

## Content
`content/questions.js`: 160 family, 155 Adults 18+, `kind|question` with `{name}` (the defendant) and `{other}` (another player). House fakes per kind and rating. No food or drink topics.
