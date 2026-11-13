# Pardon? - game design

> AI-generated (Claude, Pardon? builder, 2026-11-13). Game module `src/games/pardon/`. Read the box `DESIGN.md` and `ARCHITECTURE.md` first. Genre: say-it-aloud gibberish, name-that-tune, misheard lyrics. Every card, tune encoding, line and word on screen is ours; tunes and lyrics are public domain only.

## How it plays (the three menu panels)
1. The reader says nonsense out loud. Shout what you hear.
2. Cyril plays a tune. Tap its name, fast.
3. Mishear a famous line. Vote for the funniest.

## Flow
| Phase | Layout | Timer | Ends early when |
|---|---|---|---|
| `pardon-intro` | show | 7 s (skippable) | - |
| `pardon-round` (x3) | show | 5 s (skippable) | - |
| `pardon-read` (reader: `pardon-read`, others: `pardon-listen`) | split | 45 s | the reader taps who got it |
| `pardon-said` | show | 5.5 s | - |
| `pardon-tune` | split | lead 1.6 s + tune + 9 s (max 34 s) | everyone answered |
| `pardon-tune-reveal` | show | 6.5 s | - |
| `pardon-write` | input | 55 s | everyone sent one |
| `pardon-vote` | split | 25 s | every voter voted |
| `pardon-verdict` | show | 9.5 s | - |
| -> `results` via `api.finish` | | | |

Round 1: everyone reads once (twice each with 3 players). Round 2: 5 tunes (4 at 7-8 players); the second-last is **Wonky** (notes thrown into the wrong octave), the last is **Backwards**, both double points. Round 3: one line. About 9-12 minutes.

## Round 1, Say What?
- The reader's phone shows the gibberish big, word by word, on a linen card, plus "Hold to see the answer" (press and hold; so the reader knows when someone's said it). The sheet is a big grid of everyone else: tap who said it first, or "Nobody got it".
- Everyone else sees the reader's avatar with listening rings, "Shout what you hear". The category clue (A saying, A place...) unlocks at 10 s.
- **Steal:** at 30 s the card appears on every phone. Anyone can now read it themselves; a steal scores 500.
- **Wrong accent:** every third card the reader must do a voice (newsreader, pirate, your nan...). Every phone shows it, so the table knows.
- Scores: guesser 1000 (500 on a steal). Reader 500 if it's got within 10 s, 200 if later (before the steal).

## Round 2, Hum Along
- The speaker phone plays the melody on the house electric piano (with a soft octave below), and hushes the music bed while it plays. Every other phone has "Play here too". A music-box strip (punched paper under a brass comb) runs on every phone in time with the notes.
- Four titles: the answer, two of the same kind (nursery / carol / folk / classical), one wildcard. One tap, no changing.
- Scores: `max(300, 1000 - 45 x seconds)` from when the tune starts, +200 for the first right answer, x2 on Wonky and Backwards. The reveal plays a backwards or wonky tune the right way round on the speaker phone.

## Round 3, Mishearing
- Everyone writes their own misheard version of one public-domain line (max 70 chars; the real line is refused).
- Anonymous vote (not your own; duplicates merge and credit both). If fewer than 3 entries, Cyril adds his own mishearings (worth nothing).
- Verdict: cards land from fewest votes to most, author stamps, the top one gets "Funniest". 300 a vote, +500 for the funniest.

## Content (`content/`)
- `gib-family.js` 227 cards, `gib-adult.js` 200 cards `{id, say, real, hint}`. Written, read aloud by a critic, second pass so no word of the answer is on the card.
- `tunes.js` 45 public-domain melodies `{id, title, by, kind, bpm, notes}`; `node src/games/pardon/content/check-tunes.mjs [-v]` parses them and prints length, range and interval fingerprints.
- `lines.js` 66 public-domain lines `{id, line, from, eg:[3 bot mishearings]}`.

## Messages (phone -> host)
`pd-got {id|'none'}` (reader only), `pd-tune {id}`, `pd-write {text}`, `pd-vote {key}`. Progress extras: `got` (read), `order` (tune: who's in, fastest first).
