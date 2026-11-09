# Game-box team report

> AI-generated (Claude, game-box team, 2026-11-09). Branch `afters/gamebox`. Brief: `briefs/gamebox.md`.

## What now works (and how to see it)
- **AFTERS is a box of games.** Lobby -> "Ring the bell" -> **the menu**: Cyril wheels in a brass dessert trolley, one dish per game. The host taps a dish (the glow shows on every phone), guests tap the dish they fancy (their avatar pops onto it, "2 fancy this"), the host taps **Serve**.
  - See it: `npm run build && npm run preview`, or `?demo=menu`, `?demo=menu-first`, `?demo=menu-adult&me=guest`.
- **Tonight's table**: every finished game gives cherries by place (5 / 3 / 2, then 1 each, ties share). The running board sits on the menu, the results screen and the Classic end screen ("+3 cherries on tonight's table"). Players can join at the menu between games.
- **Afters Classic** is the first game module (`src/games/classic/`), with all the 8 teams' screens untouched apart from the end screen buttons (**Back to the menu** / Same again).
- **Content rating**: Family / Adults 18+ (lobby switch and a menu toggle for the host; guests see a badge). Adult decks: 66 Plate Up prompts, 43 true Porkies facts, 34 Last Orders prompts, 43 bot answers, an adult Cyril line for every key (`src/content/linesAdult.js`).
- **Placeholder tiles**: **Bonce** (forehead guessing, a wobbly jelly), **Crossed Wires** (write-draw-guess, spaghetti turning into a phone cord), **Pie Chart** (percentages, a pie with a slice out). Each has its own folder with a placeholder `index.js` and its line already in `src/games/index.js`, so the three teams never touch the same line.
- **Shared helpers** for those games: `src/shared/sensors.js` (tilt with the iOS permission tap, hysteresis, vibrate patterns, landscape lock) and `src/shared/drawing.js` (touch draw pad: 8 colours incl. a rubber, 4 sizes, undo, clear; compact delta-encoded strokes; validated decode for the host; stroke-by-stroke replay as a pure function of time). Try them at `?demo=sandbox`.
- **"How to add a game"** in `ARCHITECTURE.md`, plus a working tiny example game (`src/games/example/`, "Call It", hidden from the menu).

## Less boring (Adam: "right now it's kind of boring")
- **Tighter timers**: write 80 -> 60 s, vote 15 -> 12 s, porky 45 -> 35 s, pick 20 -> 15 s, last orders 60 -> 45 s, scoreboards 8 -> 6 s, intros 7-8 -> 5.5-6 s, early end 1.2 -> 0.8 s after everyone's done, host can skip intros after 1.5 s.
- **Fewer, faster Porkies facts**: 3 (or 2 with 6+ players) instead of 4/3; reveal beats shortened (fakes 3.0 -> 2.4 s, truth 4.0 -> 3.4 s).
- **More Cyril**: lines now have variants (picked by phase seed so every phone hears the same one). New banter: everyone done early, calling out the last person still typing by name, digs at the leader / last place on every scoreboard, close-call votes, "too many of you knew that", fooled-2+ now triggers (was 3+), a different intro on second helpings, menu greetings and a dig at whoever leads tonight.

## Tests
- `node scripts/e2e.mjs`: **PASS**. 3 phones over real PeerJS: lobby -> menu (host focus syncs to a guest) -> serve Classic -> full game -> end -> back to the menu (cherries checked) -> serve again.
- `node scripts/sim.mjs 5 50`, `3 50`, `8 50` (Classic) and `4 50 example`: pass.
- `node scripts/test-shared.mjs`: draw two strokes, undo, replay updates; fake tilts give down/up with hysteresis: pass.
- `node scripts/shoot.mjs`: all 29 screens (incl. menu, menu-first, menu-adult, results), no blank frames, no console errors.

## Critic loop (menu + results)
Fresh harsh critic each round ("AAA art director, compare against Jackbox Party Pack menus"); blind A/B against the previous round from round 2 (neutral file names, order swapped). Stopped at the 4-round cap.

| Round | Polish | Type | Layout | Readability | Fun/charm | Consistency | A/B vs previous | Verdict |
|---|---|---|---|---|---|---|---|---|
| 1 | 6 | 6 | 5 | 6 | 7 | 5 | - | NOT YET |
| 2 | 6 | 7 | 6 | 6 | 8 | 6 | new won menu, first visit, results | NOT YET |
| 3 | 7 | 7 | 5 | 6 | 7 | 7 | new won menu + guest, results a tie | NOT YET |
| 4 | 7 | 7 | 5 | 6 | 8 | 7 | new won menu; guest's outlined "Adults only" label lost -> reverted to the solid chip | NOT YET |

What changed because of it: "In the oven" stamps -> small "Coming soon" paper tags; a brass room-code plaque; Cyril framed in his own clear space (the header moved right); "N fancy this" chip explains guests' avatars; the selected dish lifts, glows and dims the rest; guest button is a full primary; results got a headline ("Alex takes it"), a taller winner row ("Toast of the table"), side-by-side buttons, compact rows for 6-8 players and the full cherry board; dish hints ("Draw it, pass it on").

Still NOT YET (round 4 critic, worst first): the top 40% of the menu is busy (Cyril's bubble, plaque, title, toggle, cherry strip); shelves are tight (trifle cream near its label, Pie Chart's % flag); the bottom detail card repeats the selected dish. The critic also wanted the three locked domes smaller than the playable dish; that fixes itself as the three teams land their games.

## For the three new-game teams
- Own only `src/games/<id>/`. Replace your placeholder `index.js` (drop `comingSoon`, add `createHost`, `screens`, `bot`, `demos`). Prefix phase and screen ids with your id.
- End with `api.finish(rows)` to get the shared results screen and cherries for free.
- Draw a better dish if you like: dish art is keyed by `dish` in `src/screens/menu-art.js` (box-owned; ask in your report, or use the `cloche` fallback).
- Phones send actions with `ctx.client.act(type, data, optimisticMine)`; don't reuse box message names (`choose, focus, fancy, menu, again, ...`).

## Known gaps
- Menu dishes are flat SVG on a 3D table; a lit/3D trolley would be the next step up.
- The Classic intro card still lists "Tonight's table" for the guest list (the classic team's term), which now also names the cherry board.
- Host migration still not implemented (unchanged).
- Bundle grew to ~915 kB (adult content); game screens are now a lazy chunk.
