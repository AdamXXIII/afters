# Crossed Wires (telephone) - team report

> AI-generated (Claude, telephone team, 2026-11-09). Branch `afters/telephone`. Brief: `briefs/telephone.md`.
> Game design: `src/games/telephone/DESIGN.md`.

## What now works (and how to see it)
- **Crossed Wires** is playable from the menu (the spaghetti dish). Everyone writes a rumour, the phones pass it
  down the table (draw it, guess the drawing, draw the guess...), chain length = players (3-8). Then every line plays
  back on every phone in sync: sentences type out, drawings redraw stroke by stroke, each guess lands as a caption on
  the finished drawing with a **NAILED IT! / LOST IT!** stamp, and the line ends on a "It started as / It ended as"
  card stamped **STRAIGHT THROUGH!** or **CROSSED WIRES!** (Cyril names whoever crossed them). After each line the
  table votes "Best bit?" head-to-head; the game ends on **Best bit of the night!** and the box's shared results screen
  (cherries on tonight's table).
- **Modes** (host picks on the intro card, guests see it light up): Classic, Speedy (half the timers), Flipbook
  (every step draws the next frame over a faint onion skin of the last; the reveal loops it as a flipbook).
- **Something on every phone every second:** finished early -> the wait screen shows your slip travelling down a
  phone cord to the next seat, the "party line" of who's done, and a **Nudge** button per slowcoach (their phone
  buzzes, shakes and toasts "Pip is tapping their watch at you"). The write screen shows where your rumour will go.
- **Content:** 96 Family + 96 Adults 18+ starter sentences (the "Stuck? Take a card" deck; also used by bots and to
  fill empty steps), Cyril lines for every beat in both decks (`content/lines.js`).
- **Scoring:** +500 per vote; +250 to guesser and drawer when a guess keeps half the key words ("kept the thread");
  +300 to everyone on a line that comes out straight through. Empty steps are filled by Cyril and score nothing.
- See it: `npm run build && npm run preview`, menu -> spaghetti -> Serve. Demos: `?demo=telephone-intro`,
  `telephone-write`, `telephone-draw`, `telephone-guess`, `telephone-wait`, `telephone-reveal`,
  `telephone-reveal-guess`, `telephone-reveal-end`, `telephone-vote`, `telephone-awards`, `telephone-flip`
  (add `&players=3..8`, `&adult=1`).

## Tests (all pass)
- `node scripts/e2e-telephone.mjs`: **PASS**. 3 phones over real PeerJS; the host picks Speedy (synced to a guest),
  uses the Stuck? card, draws real pointer strokes, guesses, nudges, votes, reaches results, goes back to the menu
  (cherries checked). No console errors.
- `node scripts/e2e.mjs` (Afters Classic): **PASS** (unchanged by this work).
- `node scripts/sim.mjs 3|4|5|8 50 telephone`: pass. `node scripts/test-shared.mjs`: pass.
- `node scripts/shoot.mjs` for all 11 telephone demos at 3, 5 and 8 players: no blank frames, no console errors.

## Blind A/B loop against real Jackbox screenshots
Each round: our 390x844 shot and a real Steam screenshot letterboxed into identical 1500 px squares, named a/b with
the side alternated, one fresh harsh critic subagent per pair ("Which looks better as a party game screen: A or B?").
A screen passes when it wins against two different reference shots in a row. **All 11 screens pass** (9 rounds, 58 critic verdicts).

| Screen | Result | Rounds |
|---|---|---|
| intro | PASS | won r1 (Dirty Drawful title), r2 (Civic Doodle title) |
| write | PASS | won r1, lost r2 (Fibbage-style prompt), louder rebuild, won r3 + r4 (Quiplash prompt) |
| draw | PASS | lost r1 (Bidiots "draw now"), prompt banner + taped paper, won r2 + r3 (Dirty Drawful "time to draw") |
| guess | PASS | won r1 + r2 (both Drawful "what is it?") |
| wait | PASS | won r1, lost r2, party line + nudge rows, won r3 + r4 |
| reveal (drawing) | PASS | won r1, lost r2 + r3 (small scribble in a big card), cropped + finished frame, won r4 + r5 |
| reveal (guess) | PASS | lost r1-r5 (punchline buried), rebuilt as drawing + gold backdrop + caption + big stamp, won r6 + r7 |
| reveal (end of line) | PASS | lost r1 (cluttered), one clean card + stamp, won r2 + r3 |
| vote | PASS | won r1, lost r2-r6 to a head-to-head T-shirt screen, rebuilt as stacked VS pairs, won r7 (Tee K.O.), lost r8 (two identical bot snails), bots vary doodles, won r9 (Quiplash 3 vote) |
| awards | PASS | lost r1-r6 (no winner moment), giant headline + spotlight + rays + cropped drawing, won r7 + r8 |
| flipbook | PASS | lost r1, frame authors strip, won r2 + r3 |

The paper play-test (6 players, Classic) said: reveal too long and passive, dead air waiting for the slowest,
blank-page freeze on write, per-line vote tax. Fixed: reveal beats cut ~20% and the host can skip a line, timers cut
(write 30 s, draw 50 s, guess 22 s, vote 9 s), the Stuck? card is on screen from second one, drawings carry their
prompt in the reveal. Kept on purpose: the per-line vote (it's short and happens while the line is still funny).

## For the box / lead (shared changes I did not make)
- **Early end for the slowcoach:** the play-tester's #2 problem is waiting on the slowest phone. A box-level option
  to shorten a phase once all but one are done (e.g. `api.shorten(ms)` that re-sends `endsAt`) would help every game.
- **Message size:** drawings are capped at 2,200 points (~13 KB) and a reveal phase carries one whole line (up to 4
  drawings for 8 players, ~50 KB). Fine over PeerJS JSON in Chrome; worth a real-iPhone check (Safari's data-channel
  message limit is lower).
- **Banter hook:** `App._banterTick` only fires for phase ids matching `write|vote|pick`, so Cyril's "slowpoke"
  line runs on `telephone-write` and `telephone-vote` but not on draw/guess. A per-game list would fix it.
- `scripts/e2e-telephone.mjs` is new (lead/QA own `scripts/`); it mirrors `e2e.mjs`.

## Known gaps
- Critics judge our portrait phone against landscape TV shots; several said so. All passes are visual verdicts only.
- One flipbook reference (Champ'd Up promo art) was weak; the flipbook also beat a real Civic Doodle reveal first.
- Bots draw from 10 stock doodles, so demo lines repeat images; real players won't.
- Untested on real phones (touch drawing feel, iOS keyboard over the guess field).
