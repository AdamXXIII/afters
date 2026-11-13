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
- **Stakes rise:** the first half of the docks pay x1, from halfway every point is x2 (Cyril announces it), and Cross-examination is x3.
- **Cross-examination:** last place takes the stand and keeps **two** fakes beside their answer (three cards, not a coin flip; if they dither, Cyril tops up with players' fakes). Writers of the kept fakes earn 500 x3 per juror fooled; the defendant earns a flat **1000 per juror fooled** (a real comeback, not a coronation).
- If the defendant writes nothing: "No comment. Contempt of court." Nobody scores that round.
- Fewer than three answers (only when someone doesn't write): Cyril adds house fakes from a bank keyed by the question's kind (thing, place, person, game, app, award, story, advice...).

## Changes from the critic loop
- Content round 1 (worse): too many stock icebreakers and bare counts -> 37 prompts rewritten to concrete, odd-detail ones; food slipped out of house fakes.
- Content round 2 (worse): hypotheticals have no true answer; house fakes didn't fit -> "would" prompts swapped for real facts, new house kinds (story, advice).
- Content round 3 (worse): same gap (house fakes fit) -> more kinds (game, app, award); stopped here (two rounds on the same gap).
- Arc round 1 (worse): flat, final a coin flip -> stakes double halfway, x3 final, two kept fakes.
- Arc round 2 (worse): final overpaid last place -> writers paid again in the final.
- Arc round 3 (worse): final underpaid last place -> defendant flat 1000 per fooled juror; stopped (critics flip-flopped).

## Look (one idea: the court sits at the dinner table)
- Answers are **handwritten witness statements** (Caveat, ink blue) on ruled card with a claret margin line.
- The person on the stand sits behind a **brass dock rail** drawn round their avatar.
- The truth gets a **claret wax seal** ("Sworn" / "Fifth"); fakes get a **tomato rubber stamp** ("Fake").
- Accent willow (the game's dish colour) for the jury, claret for the stand and the final.

## Messages (phone -> host)
`wt-answer {text, fifth}`, `wt-pick {optionId}` (changeable until time), `wt-keep {ids}` (final, defendant only, up to two).

## Content
`content/questions.js`: 160 family, 155 Adults 18+ (re-sharpened by three critic rounds), `kind|question` with `{name}` (the defendant) and `{other}` (another player). House fakes per kind and rating. No food or drink topics.

## Builder report (2026-11-13)
The subagent tool guard blocked creating `REPORT.md`, so the report lives here; the lead can move it.
- **Done:** sim passes at 3/5/8; bots play every phase (write incl. the fifth, pick, choose two); a demo for every screen (`witness-intro, -dock, -write, -wait, -pick, -sweat, -reveal-fake, -reveal, -verdict, -scores, -cross-intro, -choose, -recess, -cross-pick, -cross-reveal`); portrait and landscape shot; 160 Family + 155 Adults prompts; `hidden` removed.
- **Blind A/B verdicts** (vs Fibbage 3 "Enough About You" Steam stills and Psych! App Store shots): onboarding, core action and reveal: **ours picked** in round 1. Content (3 rounds) and whole-game arc (3 rounds): still judged worse; stopped (same gap twice / critics flip-flopping). Content and arc were not truly blind.
- **Fun:** questions about the people at the table; writing in someone's voice, shown as handwriting; FAKE stamp with forger and fooled named; claret seal on the truth; pleading the fifth; the verdict card says why everyone scored.
- **Not fun yet:** at 8 players docks 3-6 are the same loop (x2 helps, middle still sags); 3 players is near a coin flip; reveal is calm (one card per beat); house fakes can look wrong when used.
- **Gaps:** landscape reveal truncates the question; long fakes wrap tightly in the 2-column landscape pick; content kinds could be tighter.
- **Shared changes:** none required. Nice: a box "Ready" tap on timed intro cards. `npm run build` rewrites `public/icons/icon-512.png` (restored each time).
