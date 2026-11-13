# Bad Taste - game design

> AI-generated (Claude, Bad Taste builder, 2026-11-13). Module `src/games/badtaste/`. Read the box `DESIGN.md` and `ARCHITECTURE.md` first. Mechanic borrowed from Cards Against Humanity (rotating judge, private hands, a blank card) and Quiplash (anonymous answers turned over on a shared screen). Name, cards, copy and look are ours.

## How it plays (the three menu panels)
1. Each round, one of you is the Critic.
2. Everyone else plays their funniest card, or writes one.
3. The Critic reads them out and crowns the winner.

## Flow
| Phase | Screens | Timer | Ends early when |
|---|---|---|---|
| `badtaste-intro` | `badtaste-intro` (show) | 10 s, host skip | - |
| `badtaste-play` | `badtaste-hand` (split), `badtaste-critic` (show, the Critic), `badtaste-played` (split; also the "sit out" view in a decider) | 45 s, +15 s when playing two | every answering player is in |
| `badtaste-judge` | `badtaste-judge` (split; Critic and watchers) | 14 s + 10 s a card, max 100 s | the Critic crowns |
| `badtaste-win` | `badtaste-win` (show) | 9.5 s + 0.7 s a card | - |
| -> `results` (box) after the last round | | | |

Everyone is the Critic once (twice at 3 or 4 players). The last regular round is worth two crowns (the round pill says so, Cyril says so). A tie for first plays a decider: only the tied players play, judged by a random player who isn't tied (at most two deciders).

## Rules in the engine
- Hand of seven, topped up each round (`api.take`, no repeats tonight). A written card is always available; playing one still uses up your oldest card so hands keep moving.
- Only two people answering (a table of three, or a two-way decider): each plays two cards, and Cyril slips one of his own in for cover. Fewer than three cards in any other round: Cyril tops up to three. If Cyril's card is crowned nobody scores.
- No card played, no chance: nothing is played for an idle player. Phones send a chosen card or typed words at the buzzer.
- Judging: the Critic turns cards in order (`bt-flip`), can go back to any turned card (`bt-focus`), and once all are turned crowns one (`bt-crown`). Card texts travel in `progress.texts` only as they turn, so nobody can read ahead. If the Critic runs out of time, Cyril picks among the cards that were turned.
- Messages: `bt-play {cardId | text}`, `bt-flip`, `bt-focus {index}`, `bt-crown {index}`.

## Look (one idea: the cheese course of cards)
- The prompt is a **claret menu card** with a hairline frame and a mustard blank. While you choose, the blank previews your card in place, so you read the joke before you play it.
- Answers are **printed linen cards** in Fraunces, identical whether dealt or written (anonymity). Card backs are claret with a brass flame.
- The Critic carries a **brass pen** badge. While judging, the whole line with the card in the blank is the hero on every phone; numbered tabs show what's still face down. Choosing turns the sheet into a list and a brass **Crown** button.
- The winner gets a **brass rosette** ("Critic's pick" / "Cyril's pick"), then a big panel with the player and their card, then who played the rest and the crown tally, with a "Next round in N" countdown.
- Dish for the menu: `dish: 'cheeseboard'` (not drawn yet, falls back to the cloche). Art notes: a claret board with linen crackers and one dubious blue cheese with a little brass flag stuck in it reading "pick".

## Content
`content/family.js` 145 prompts / 608 answers, `content/adult.js` 141 prompts / 482 answers, stable ids. Adults 18+ swears and goes darker (work, money, family, death, bad decisions), never sexual; three critic sweeps for innuendo, the last found six risk items, all rewritten. No food.

## Critic loop (blind A/B against Quiplash 3 Steam stills and CAH product photos)
| Piece | R1 | R2 | R3 | Status |
|---|---|---|---|---|
| Onboarding | ours 8 v 5 | - | first-timer YES | won |
| Core action (judge screen) | lost 6 v 8 | lost 6 v 7, 6 v 8 | won 7 v 5, lost 6 v 8 | split; gap: on a phone the prompt still prints twice (claret card up top + the filled line in the hero) |
| Reveal | lost 6 v 8 | lost 4 v 8 | won 7 v 4, lost 7 v 8 | split; gap: the winning moment shares the screen with the rest list and tally |
| Content | adult 5 v 8, family 6 v 7 | 6 v 8, 6.5 v 7 | 6 v 8, 6 v 7 | stopped (no progress twice); gap: our answers are finished mini-jokes (~35 chars), CAH's are short blunt nouns that only land in combination; family repeats Dad/Nan/animals |
| Whole game, 3 players | 5 (Quiplash 7, CAH 4) | 5 | 5 (beats CAH 3, Quiplash 6) | stopped; gap: the Critic is kingmaking between two known rivals |
| Whole game, 8 players | 6 (CAH 7) | 7 (CAH 7) | 7 (CAH 6, Quiplash 8) | beats CAH; gap: one crown a round makes the standings close to luck (double last round and deciders help) |
| Tired first-timer | 3 NO of 8 | 3 NO | 2 NO (win panel, two-card pill), both fixed after | |

## Lead's fix round (2026-11-13)
- Judging: the prompt shows once. The card up top is a header (Critic, round, clock); the line with the card in the blank lives in the hero below. Blind vs Quiplash 3: **ours 8 v 5**.
- Reveal in two beats: the crowned answer alone and big, with "<Critic> crowned", the rosette and the player; then the whole line, who played the rest and the crowns so far. Blind vs Quiplash 3: **ours 8 v 7** (gap: some empty space above the moment).
- `dish: 'badtaste'` (art on box-v2).
