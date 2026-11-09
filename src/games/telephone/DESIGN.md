# Crossed Wires - game design

> AI-generated (Claude, telephone team, 2026-11-09). Brief: `AIOS/afters/briefs/telephone.md`.
> AFTERS look and voice rules live in `AIOS/afters/DESIGN.md`; this file only covers this game.

**One line:** everyone writes a daft sentence, the phones pass it down the table (draw it, guess the
drawing, draw the guess...), then the whole table watches every line fall apart, stroke by stroke, in sync.

Genre: draw-and-pass telephone. Everything visible is ours: the name, the phone-cord-and-spaghetti
theme, the "line" metaphor ("the line's gone fuzzy"), Cyril, the cards and the reveal layout.

## Why it's fun (the bar Adam set: "kind of boring" is not allowed)
- **The reveal is the show.** Every phone plays the same line at the same moment, so the sofa laughs together.
  Drawings redraw themselves stroke by stroke (the suspense of "what IS that?"), then the next guess types
  itself out. Cyril calls the exact moment it went wrong *by name*.
- **Short turns, always moving.** Nobody waits more than one step. Speedy mode halves every timer.
- **Something on every phone, every second.** Finished early? You get the *Nudge* button (buzzes the slowest
  phone and shows "Pip is tapping their watch at you") and a live view of who's still scribbling.
- **Adult deck** turns it into innuendo bingo: sentences like "The vicar's melons won first prize" were
  made for terrible drawings.

## Players and length
3-8 players. Chain length = players. Classic, 6 players: write 0:40, 5 steps (~45 s avg) ~4:00,
reveal 6 lines x ~30 s + votes ~4:00 => about 9-10 minutes. 8 players about 13 minutes. Speedy about 7.

## Modes (host picks on the intro card; guests see the host's finger)
| Mode | What changes | Timers (write / draw / guess) |
|---|---|---|
| **Classic** | write, then draw / guess alternate | 30 s / 50 s / 22 s |
| **Speedy** | same, everything faster, Cyril heckles more | 25 s / 30 s / 15 s |
| **Flipbook** | write, then *every* step draws the next frame of an animation of that sentence (you see the last frame faintly under your pen); the reveal plays it as a flipbook | 30 s / 45 s / - |

## Phases (phase ids are prefixed `telephone-`)
| Phase | Layout | Time | Payload / private |
|---|---|---|---|
| `telephone-intro` | show | 12 s (host taps **Start** any time after 1.5 s) | `{modes}`; progress `{mode}` |
| `telephone-write` | input | write timer | `{step:0, steps, mode, max}`; private `{chain}` |
| `telephone-draw` | input | draw timer | `{step, steps, mode}`; private `{chain, text, prev?, from}` (`prev` = flipbook onion skin) |
| `telephone-guess` | input | guess timer | `{step, steps, mode, max}`; private `{chain, drawing, from}` |
| `telephone-wait` | input | (screen only) | shown on your phone once you've sent this step |
| `telephone-reveal` | show | per line, sum of beats | `{index, count, mode, chain:{id, steps:[{kind, text|drawing, authorId, auto, match}]}, beats:[{at, dur, step}], end:{at, verdict, crossedAt}}` |
| `telephone-vote` | split | 9 s, ends when all voted | `{index, count, moments:[{key, kind, text|drawing, authorId}]}` |
| `telephone-awards` | show | 9 s | `{moment, straight, crossed, rows}` then `api.finish` -> shared results |

Rotation: line *c* is started by seat *c*; at step *s* it is held by seat *(c + s) mod N*. Every player
touches every line exactly once and never sees their own line until the reveal.

### What each phone shows
- **Intro** (show): the "Crossed Wires" card (willow blue, phone-cord border), three mode tiles; host taps one,
  every phone sees the tile light up. Cyril explains in 2 bubbles.
- **Write** (input): strip with timer + who's done. Sheet: "Start a rumour" card, a field (70 chars), and
  the **Stuck? card**: a starter sentence on a tilted card with **Deal another** / **Use this**.
  Primary button: **Pass it on**.
- **Draw** (input): "Draw this:" + the sentence in Fraunces on a brass-edged slip, "from <name>" chip.
  The shared draw pad (8 colours incl. rubber, 4 sizes, undo, clear), then **Done drawing**. Drawing
  is sent on every stroke (debounced), so the timer running out never loses work.
- **Guess** (input): "What on earth is this?" + the drawing big on paper, "drawn by <name>", the field and
  **Pass it on**. Empty drawing: "They drew nothing. Make something up."
- **Wait** (input): your slip flies off down a curly phone cord to the next person's avatar ("Off to Sam").
  Below: who's still going (live), and **Nudge** under each slowcoach (one per 4 s): their phone buzzes and
  shows a toast + the strip shakes. Cyril's waiting line.
- **Reveal** (show): header "Line 2 of 5 · Pip's rumour". One big card at a time: the sentence on a place card
  (Caveat handwriting, typed out), drawings on paper replaying stroke by stroke with the drawer's stamp, guesses
  typing out on a slip. A cord track along the bottom links every avatar of the line; the current one glows.
  The previous step shrinks into a "was:" thumbnail above. End beat: **original vs final** side by side and a
  stamp: **STRAIGHT THROUGH** (kept it) or **CROSSED WIRES** (it fell apart). Reaction rail stays live.
- **Vote** (split): show: "Best bit of line 2?" + Cyril. Sheet: every step of that line as tiles (drawings and
  slips), yours greyed "yours". One tap, changeable until the timer ends.
- **Awards** (show): "Moment of the night" (most votes overall, big), "Straightest line" and "Most crossed
  wires", then the box's shared results screen (cherries on tonight's table).

## Scoring
- **+500** per vote your step gets (vote phase after each line; you can't vote for your own).
- **Kept the thread:** a guess that shares at least half the key words with the sentence the drawing was
  drawn from (stop words dropped, plurals folded) gives **+250 to the guesser and +250 to the drawer**.
- **Straight through:** the final step of a line still matches the first sentence: **+300 to everyone** on it.
- Flipbook: votes only (+500 each), plus +250 to everyone on the most-voted line.
- Empty steps are filled so the line never breaks: a missing sentence or guess is replaced by a starter card
  ("Cyril filled in"), a missing drawing by one of Cyril's doodles. Filled steps score nothing.

## Cyril (game lines in `content/lines.js`, family + adult, variants picked by phase seed)
Intro, write, draw, guess, wait, nudge, reveal start, "nailed it", "lost it", blank drawing, straight through,
crossed wires (with the name of whoever crossed them), vote, moment of the night. Samples:
- "Write a rumour. Something daft. It'll be unrecognisable by pudding."
- "Draw it. No letters, no numbers. I'm watching. Well, I'm a candle. I'm *glowing*."
- "And that's where it went wrong. Thank you, {name}."
- Adult: "Draw it exactly as described. Yes, *exactly*. We're all adults."

## Content
`content/starters.js`: **Family 96, Adults 18+ 96** starter sentences (stable ids). Family = absurd, visual,
drawable ("A pigeon running a car boot sale"). Adults = cheeky innuendo, nothing hateful, no real people,
nothing involving minors ("The vicar's prize-winning marrow"). Bots and empty steps use the same decks.

## Bots
Write a starter sentence; draw one of 10 hand-shaped doodles (cat, house, ghost, fish, rocket, cake, snail,
sun, pig, stick person) with wobble; guess from their answer bank, or ~40% of the time keep a word from the
real sentence so "kept the thread" happens; vote at random (never their own).

## Tests
- `node scripts/sim.mjs 4 50 telephone` (and 3 / 8 players): bots play a full game.
- `node scripts/e2e-telephone.mjs`: 3 phones over real PeerJS; the host writes, draws (real pointer strokes on
  the canvas), guesses and votes through the UI; players on autopilot; reaches results, then back to the menu.
- `node scripts/shoot.mjs --screens telephone-intro,...` for every screen at 3, 5 and 8 players.

## Changes after the paper play-test (round 1)
The play-tester (6 players, Classic, on paper) said: the reveal drags, quick finishers wait on the slowest,
the write step is a blank-page freeze, and voting after every line is a tax. What changed:
- Reveal beats cut ~20% (sentence 2.3 s, guess 2.7 s, drawing replay max 3.4 s + 1 s hold, end 3.2 s), typing
  sped up; the host's **Next line** skips a line any time.
- Write 40 -> 30 s, draw 60 -> 50 s, guess 25 -> 22 s, vote 12 -> 9 s (ends as soon as everyone has voted).
- The Stuck? card is on screen from the first second (one tap to use it, one to deal another).
- In the reveal each drawing now carries the sentence it was drawn from, and each guess appears as a caption on
  the finished drawing, so nobody has to remember the previous step.
- Not changed (on purpose): the per-line vote stays, because it happens while the line is still funny; it is short.
