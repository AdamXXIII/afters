# Odd Sock - game design

> AI-generated (Claude, Odd Sock builder, 2026-11-13). Module `src/games/oddsock/`. Read the box `DESIGN.md` and `ARCHITECTURE.md` first. Mechanic borrowed from Undercover / Spyfall-style "one of you has a different card"; name, look, words and copy are ours.

## How it plays (the three menu panels)
1. Everyone gets the same secret word. One of you gets a slightly different one, and doesn't know.
2. Take turns saying one word about your word, out loud. Then vote for the Odd Sock.
3. Caught? The Odd Sock gets one guess at everyone else's word to steal the round.

## Flow
| Phase | Layout | Timer | Ends early when |
|---|---|---|---|
| `oddsock-intro` | show | 10 s (host skip) | - |
| `oddsock-word` | split | 14 s | everyone taps "Got it" |
| `oddsock-clue` (one phase per turn) | split | 15 s | the speaker taps "I've said it" (or the host taps "X said it. Next.") |
| `oddsock-vote` | split | 45 s | everyone has voted (votes show live, changeable) |
| `oddsock-reveal` | show | ~6-9 s (votes one by one, ACCUSED stamp, then the truth) | - |
| (first wrong sock only) -> `oddsock-clue` x one lap of whoever is left -> `oddsock-vote` again | | | |
| `oddsock-guess` (only if caught) | input for the Odd Sock, split for the rest | 25 s | the Odd Sock guesses |
| `oddsock-round` | show | 9 s | - |
| -> `results` (box) | | | |

- Players 4-8. Rounds = players (7 at 8 players), so everyone is the Odd Sock once (nearly, at 8). Clue laps: 2 at 4-5 players, 1 at 6-8. Clue turns: 15 s, 12 s at 6, 11 s at 7-8. About 9 min at 4, 12-14 at 6, 15-16 at 8.
- Speaking order goes round the table, starting one seat further on each round, and never starts with the Odd Sock.
- Most votes = accused. Caught -> the guess. Wrong sock -> they drop off the line (can't vote or be voted for), the rest do one more lap and vote again, at most once: a second wrong pick (or fewer than three left) and the Odd Sock escapes and scores. A tie or no votes ends the round: the Odd Sock escapes.
- The reveal of a wrong sock says only "Not the Odd Sock": never who the sock is or anyone's word, so the hunt stays live.
- The guess is checked loosely (case, articles, a plural, one or two typos).

## Scoring
- Vote for the Odd Sock: **+500** (unless they steal).
- Odd Sock not accused: **+1500** to them.
- Odd Sock caught but guesses the table's word: **+1500** to them, nobody else scores.
- Last round pays double.

## Look (one idea: the laundry basket tipped out on the dinner table)
- The secret word is a **woven name tape** (claret Fraunces on cotton tape, stitched edges).
- Players hang on a **washing line** in speaking order with brass pegs; the current speaker swings, done ones get a sage tick.
- The matching pair are **teal-striped socks**; the Odd Sock is **tomato with spots**.
- Accent teal teapot (game colour) for the table, claret for the vote, tomato for the odd one.

## Messages (phone -> host)
`os-ready`, `os-said` (speaker, or the host for a quiet table), `os-vote {to|null}`, `os-guess {text}`.

## Content
`content/pairs.js`: 219 Family, 146 Adults 18+ pairs. Ids come from list position: **append only**. No food or drink; adult pairs are grown-up life (money, work, nights out, admin), never sexual.

## Menu dish
`dish: 'socks'` is not in `src/screens/menu-art.js` yet, so the menu falls back to the cloche. Art notes for whoever owns menu-art: two teal socks with white stripes lying crossed on a plate, and a third tomato-red sock with cream spots draped over the rim, ink outline `#3B1F18` like the other dishes.

## Critic loop
- Round 1 (blind A/B vs Undercover and Spyfall App Store screens): onboarding **ours**, core action **ours**, reveal **ours**.
- Content round 1: zero sexual pairs; family deck judged better than Undercover's; adult deck weak (unrelated joke pairs, repeated words) -> adult deck rebuilt around close siblings, repeats removed.
- Whole game round 1: better than Undercover at 4, worse at 8 (one vote, coin flip, no arc) -> wrong sock now knocks that player out and the table goes again (Undercover-style narrowing).
- Content round 2: zero sexual pairs; adult deck now judged better than Undercover's; synonyms, near-duplicates and borderline pairs (Hot tub, Tattoo/Piercing, Ex) swapped.
- Coordinator round (2026-11-13): rounds scale with players; wrong-pick cap of two.
- First-timer round 2: every screen YES except the escape rule (when does the Odd Sock get away?) -> intro, reveal and round now say "down to the last three"; guess screen says what a wrong guess means.
- First-timer round 1: wrong-accusation path confusing ("Accused: You", "Alex", "You voted out you"), "Can't be you" hint misleading, faint host link, lap counter unexplained -> all reworded; host nudge is a real button; lap moved into the header.
