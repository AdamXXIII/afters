# Who Had Seconds? - game design

> AI-generated (Claude, Seconds team, 2026-11-13). Game module `src/games/seconds/`. Read the box `DESIGN.md` and `ARCHITECTURE.md` ("How to add a game") first. Genre: odd one out, played with bodies. Everything visible (name, place cards, copy, tasks) is ours.

## 1. The pitch
Every phone shows the same secret task ("Point at whoever would get lost abroad first"), except the faker's, which says **"You had seconds."** and only what kind of task it is (point, hands, fingers or a face). On a synced **3, 2, 1, now!** everyone does it at once. Then everyone points at the faker on their phone, live.

## 2. How it plays (the three panels)
1. Everyone reads the same secret task. One faker gets nothing and bluffs.
2. On three, everyone does it at once.
3. Point at the faker. Catch them early for more points.

## 3. Flow
Fakers: everyone is the faker at most once. 3 players = 3 fakers, 4 = 4, 5 = 4 (one turn has two fakers), 6-8 = 5 (one turn with two). Each faker gets up to 3 tasks from one category, all different types.

| Phase | Layout | Timer | Ends early |
|---|---|---|---|
| `seconds-intro` | show | 12 s (skip) | |
| `seconds-turn` | show | 5 s (skip) | |
| `seconds-task` | split | 16 s | everyone tapped Got it |
| `seconds-count` | show | 9 s: beats 3/2/1/NOW at 0.3/1.3/2.3/3.3 s, "Freeze" at 7.6 s | |
| `seconds-vote` | split | 20 s | everyone pointed |
| `seconds-reveal` | show | 5 s (no majority) / 12.5 s (verdict) (skip) | |
| `seconds-scores` | show | 7 s (skip), once before last call | |
| `seconds-final-intro` | show | 7 s (skip) | |
| last call: task, count, vote, reveal | | | |
| -> `results` (box) via `api.finish` | | | |

About 9-11 minutes at 5 players.

**Vote.** Live: everyone sees who points at whom. Tasks 1-2: a strict majority on one person accuses them; "Not sure yet" is allowed. Task 3: no "Not sure"; the single most-pointed person (2+ votes) is accused, a tie means the faker got away. An accusation ends the turn either way.

**Twists.** Two fakers (they don't know each other; catching either ends the turn). The Peek: from task 2 the faker's card shows the category. **Last call**: one task, double points, and half the time *every* phone says "You had seconds". The vote adds **We're all faking!**.

## 4. Scoring
- Catch the faker: everyone who pointed at them gets 1000 (task 1), 750 (task 2), 500 (task 3).
- Pointed at the faker but the table didn't follow: 250.
- Faker: 250 per task with no majority, plus 1000 if they framed someone or were never caught. In a two-faker turn the uncaught faker gets the 1000.
- Last call: 2000 for each right call (the faker, or "We're all faking" when everyone was); a faker who gets away scores 2000.

## 5. Screens
- **Task**: top card (timer, "Faker 2 of 5 · Task 1 of 3", type badge, "Read your secret task"), ready discs. Sheet: a linen place card under a damson **napkin**: hold to read, let go to hide (privacy at a table). Faker and table cards are the same shape: type badge + category (faker: "Category: ?" then "Peek: Holidays"), then the line. **Got it** unlocks after a peek.
- **Count**: a willow-rimmed plate; a giant claret 3, 2, 1 with a draining damson ring, woodblock knocks rising in pitch, a buzz each beat; NOW turns the plate tomato with the type icon and "Point!", a bright chord, long buzz and camera shake; "Freeze. Look around the table." turns it willow.
- **Vote**: suspect tiles (avatar, name, live pointer discs, count); your pick gets a pointing-finger badge; tiles one vote short glow. "Not sure yet" or "We're all faking!" below.
- **Reveal**: no majority = tally card. Verdict = drumroll on the accused (shivering), stamp (Had seconds! / Innocent! / Got away! / All faking!), the faker unmasked, the real tasks (the faker finally sees them), points chips.
- Landscape: split screens put the show layer left and the sheet right; show screens go two columns.

## 6. Content
`content/tasks.js`: 14 family categories (168 tasks) and 13 Adults 18+ categories (156), 3 of each type per category. No food or drink topics. Half a category is drawn at a time, so a category that comes round again brings new tasks.
