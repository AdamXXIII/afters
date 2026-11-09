# Pie Chart - game design

> AI-generated (Claude, Percentages team, 2026-11-09). Game module `src/games/percentages/`. Read the box `DESIGN.md` (art bible) and `ARCHITECTURE.md` ("How to add a game") first. Genre: percentage guessing with higher/lower side bets. Everything visible (name, pie, copy, questions) is ours.

## 1. The pitch (one breath)
"Of 100 British adults asked, how many said they've weed in the sea?" One player holds the **cake knife** and cuts the pie to their guess while the whole table shouts "HIGHER!" at them from their phones. Then everyone else bets on the cut: **Way lower, Lower, Higher, Way higher**. Cyril cuts the real slice with a drumroll. Halfway through, a **Table poll** asks the table about *itself* ("What % of this table has been sick in a taxi?"), answered anonymously on the phones. It ends on **The Last Slice**: pick the top 3 of nine.

Why it's fun after dinner (Adam: first version was "kind of boring"):
- **Loud by design**: heckle buttons make the room shout at the knife-holder; their phone buzzes with every heckle and the heckles fly across every phone with names on them.
- **Confessional**: questions are things people at the table have done. The reveal makes people confess ("...I have, actually").
- **Table poll**: the answer is *this room*. Anonymous, but everyone looks at Dave.
- **Fast**: nothing waits longer than 25 s, every phase ends early when everyone's done, no typing at all.

## 2. Flow, phases, timers
Players 3-8. Rounds = number of players, minimum 4, maximum 8 (with 3 players one person cuts twice). **Every round has a knife-holder, Table polls included**, so everyone cuts at least once. One round in the middle is a **Table poll** (two with 7-8 players): everyone first answers the question secretly (Yes/No), then it plays exactly like a normal round, except the real number is *this table's* % of yeses. Knife order: shuffled, everyone cuts once before anyone cuts twice.

| Phase id | Layout | Timer | Ends early when |
|---|---|---|---|
| `percentages-intro` | show | 6 s (host can skip after 1.5 s) | - |
| `percentages-poll` (Table poll rounds only) | split | 12 s | everyone answered |
| `percentages-dial` | split | 25 s | the knife-holder locks in |
| `percentages-bet` | split | 12 s | every non-knife player bet |
| `percentages-reveal` | show | 10.5 s (Cyril's aside lands at 5.4 s, leaving ~5 s for the table to confess) | - |
| `percentages-scores` (once, before the finale) | show | 6 s | - |
| `percentages-final-intro` | show | 5 s (skippable) | - |
| `percentages-final` | input | 25 s | everyone picked 3 |
| `percentages-final-reveal` | show | 11 s | - |
| -> `results` (box) via `api.finish` | | | |

Budget (6 players): 6 + 12 + 6 x ~42 + 6 + 5 + 20 + 11 = **~5.5 min**. Short and punchy on purpose: it's one dish on the trolley, and "Same again" is one tap.

If the knife-holder never locks in, their last live position counts (or 50 if they never touched it). Phones that never bet just score nothing.

## 3. Scoring
- **Knife-holder** (diff = |cut - real|): diff <= 2 is a **Bullseye**: 2000. Otherwise `max(0, 1500 - 75 x diff)`, rounded to 50 (10 off = 750, 20+ off = 0).
- **Bets** (compare the real number with the cut):
  - Higher / Lower right: **500**.
  - Way higher / Way lower right *and* the real number is 15+ away from the cut: **1000**. Right way but less than 15 away: **250** ("right direction, wrong confidence").
  - Wrong way: 0. A Bullseye burns every bet (nobody's right).
- **Last Slice**: each pick in the real top 3: **1000**, plus **500** if you picked the number one.
- Game score -> `api.finish` -> tonight's cherries (5/3/2/1).

## 4. What each phone shows (the dual-layer rule: always something to look at)

| Phase | Knife-holder | Everyone else |
|---|---|---|
| intro | Round card "Pie Chart", 3 rule lines, Cyril | same |
| poll | Table-poll card (question, "anonymous") + two big buttons with the question's own labels ("Guilty" / "Never") | same |
| dial | Show: question card + "You hold the knife" + incoming heckles. Sheet: **the pie** (drag anywhere round it; the slice and the big % follow the finger), -1/+1 nudges, **Cut it here**. Phone buzzes on each heckle. | Show: question card + "{name} holds the knife". Sheet: the **same pie, live**, moving as the knife-holder drags, and two big heckle buttons **Higher!** / **Lower!** (each tap flies a named heckle tag across every phone). |
| bet | Show: question + their locked cut. Sheet: "The table is betting on you": four lanes filling live with avatars. | Show: question + "{name} cut it at 42%". Sheet: 4 stacked bet buttons around the cut (Much higher / Higher / [42%] / Lower / Much lower) with the payouts shown. Bets are visible live (herding is half the fun). |
| reveal | Big pie on the table. Knife line at the cut, then a drumroll and the real slice sweeps round, number counting up; stamp BULLSEYE / CLOSE / MILES OFF; bet lanes resolve (winners hop, +points); Cyril's aside. | same |
| scores | Leaderboard ("Who's had the most pie") | same |
| final | Header "Pick the top 3" + 9 options (3 taps, tap again to un-pick), **Serve my 3** | same |
| final-reveal | The 9 options as pie-filling bars, filling from lowest to highest; the top 3 get stamped 3rd, 2nd, 1st; chips of who picked each; points. | same |

## 5. Look (box art bible, one strong idea: **the pie**)
- A real pie in a willow-pattern dish, drawn as one SVG: golden crimped crust ring, lattice top, glossy cherry filling where the slice is cut out. The percentage IS the cut slice. The knife-holder's guess is a brass cake-knife line; the real answer is the claret filling wedge.
- Numbers in Fraunces 900 with tabular figures; question in Fraunces 600 on a linen menu card; labels Bricolage. Accent colour sage `#7F9A74` (the dish colour on the menu) + claret + brass. Max 3 accents per screen.
- Labels everywhere say **"Roughly, from surveys"** under the number. Questions are framed as polls ("Of 100 British adults asked, how many said they..."), never as precise fact.
- Motion: the real slice sweeps with an ease-out over 2.4 s while the number ticks; stamps shake the camera; winners hop; heckle tags fly up from the bottom with a wobble.

## 6. Cyril (game lines, family + adult variants, in `index.js` `lines`)
- Intro: "Pie Chart. I ask the nation, you guess the slice." / "One of you holds the knife. The rest of you bet on how badly they cut."
- Dial: "{name}, you hold the knife. The rest of you: heckle." / "Higher! Lower! Nobody's ever helped by this. Carry on."
- Bet: "Higher or lower than {name}'s cut? Bet like you mean it."
- Bullseye: "Bullseye. I've had sharper knives, but not many."; Close: "Close. Crumbs, but close."; Miles: "Miles off. That's not a slice, that's a crime scene."
- Poll intro: "Table poll. No nation this time. Just you lot. Anonymous. Mostly."
- Poll reveal: "That's this table. I'm not looking at anyone. I'm looking at everyone."
- Scores, final intro ("The last slice. Nine answers, pick the top three."), final reveal ("And the nation's favourite...").
- Every question carries its own Cyril aside, said after the reveal.

## 7. Content (`content/`)
- `questions.js`: 64+ family, 64+ adult. `{id, q, pct, aside}`. pct is a rough, plausible survey-style figure; shown as "roughly, from surveys".
- `polls.js`: 16+ family, 16+ adult Table polls `{id, q, yes, no}`.
- `finals.js`: 10+ family, 10+ adult Last Slice sets `{id, q, options: [{t, pct} x 9]}` with a clear gap between 3rd and 4th.
- Adults 18+: cheeky, rude, innuendo-heavy; no hate, no real people, nothing involving minors.

## 8. Messages (phone -> host)
`pc-dial {v}` (live, throttled ~8/s), `pc-lock {v}`, `pc-heckle {dir: 'up'|'down'}` (rate limited 300 ms), `pc-bet {bet: 'mlower'|'lower'|'higher'|'mhigher'}`, `pc-poll {yes}`, `pc-top3 {ids}`. Progress extras: `dial`, `locked`, `heckles: [{n, id, dir}]` (last 12), `bets: {id: bet}`.

## 9. Changes from the critic loop
- Round 1 paper play-test: Table poll rules spelled out (answer secretly, then cut + bet on the table's own %); reveal 8.5 -> 10.5 s so the "...I have, actually" moment gets air. Kept the separate bet phase and "Much" bets: they're what makes the knife-holder sweat.
- Round 1 blind A/B (reveal won, 10 lost): every screen now has one hero (the question on top, the number in the sheet); Cyril's bubble no longer repeats the sheet copy; heckles fly beside Cyril, never over the number; a tug-of-war meter shows which way the table is shouting; bets are four chunky coloured tiles around a giant cut number; standings are a podium; the finale options are colour tiles; the final reveal makes No. 1 the biggest thing on screen.
