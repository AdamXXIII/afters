# Who Had Seconds? - build report

> AI-generated (Claude, Seconds builder, 2026-11-13). Branch `game/seconds`. Rules and screens: `DESIGN.md` in this folder.

## What it is
Everyone holds a napkin on their phone to read the same secret task, except the faker: their card says "You had seconds: you're the faker" and gives only the kind of task (hands, fingers, point, face). A synced 3, 2, 1, NOW! plays on every phone, with rising woodblock knocks, a buzz on each beat, and a chord, long buzz and camera shake on NOW. Then everyone points at a face, live. Each player is the faker once (4-5 fakers). One turn has two fakers. The faker gets a category peek from task 2. The game ends on Last call: double points, and half the time every phone is a faker, with a "We're all faking!" vote.

## Play-test (sim 3, 5 and 8 players: all pass; shots walked in order)
- **Fun:** The NOW beat is the best moment. Every phone flips to tomato together and the room acts at once. The live vote makes people argue out loud, because you see who points at whom. The verdict pays off. The accused's face shivers under a drumroll, then gets stamped. If they were innocent, the face slides away, the real faker's face lands, and the stamp turns to "Got away!". The faker then reads the tasks they missed, which gets a laugh. The "Right here, right now" category ("Point at the tallest person here") sets real traps for fakers.
- **Not fun / risks:** Number and hands tasks can sit in a safe middle, so a faker copying the room is hard to catch. Three players is thin, because two votes decide everything. The two-faker turn can feel chaotic.

## Critic verdicts (blind A/B, labels stripped, order randomised)
| Piece | Rounds | Verdict |
|---|---|---|
| Onboarding | 1 | **Ours.** Gap fixed: the faker card now says plainly "you're the faker" |
| Core action | 2 | Lost round 1 (faker card looked different at a glance, vague vote rule). Fixed: cards now match, plus a "3 votes needed" burst and stakes. **Ours** in round 2 |
| Reveal | 2 | Lost round 1 (stamp covered the face, too much at once). Rebuilt as one beat at a time. **Ours** in round 2 |
| Content | 1 | **Ours.** Gap: too many tasks have safe middle answers. Partly fixed with a verifiable category for each rating |
| Whole-game arc | 1 | **Ours.** Gap: the Last call twist is a coin flip, not earned |

## Gaps left
- Last call's "all fakers" is random. The critic suggested letting the last-place player trigger it. Not done.
- The verdict end state is still busy on a phone (points plus a task recap). The critic wanted a full-screen stamp hold and a colour flash.
- Content: more tasks with extreme or checkable answers are needed to catch copycat fakers.
- Landscape intro cards stack the place-card art vertically, which reads OK but not great.

## Content
180 family tasks (15 categories) and 168 Adults 18+ tasks (14 categories), in four types. No food or drink topics. Half a category is drawn at a time, so repeats are rare across "Same again".

## Shared changes needed (not made)
- Menu dish art: the game uses the `cloche` fallback. It needs its own dish in `src/screens/menu-art.js`, such as a plate with a second helping.
- Audio: the countdown is built from `audio.tone`/`audio.noise` inside this game. A shared `countdown` sfx in `src/audio/synth.js` would let other games reuse it.
- `npm run build` rewrites `public/icons/icon-512.png` on every build, which dirties every worktree. It should be stable or git-ignored.
