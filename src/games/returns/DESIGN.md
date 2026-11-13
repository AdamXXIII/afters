# Many Happy Returns

> AI-generated (Claude, Many Happy Returns builder, 2026-11-13). The pitch Adam approved is in `projects/afters/games/pitches-next.md`. Mechanic borrowed from Exploding Kittens; names, cards, look and words are ours.

## How it plays (the three panels)
1. On your turn, draw a card. Draw a birthday cake and you're out.
2. A Big Breath blows the candles out and saves you. You start with one.
3. Before you draw, play cards to dodge, peek and stitch up your mates. Last one in wins.

## Rules (all of them)
- Deal: everyone gets a Big Breath and 4 action cards. The pile holds the rest of the action cards (about 3 per player + 4), one cake fewer than there are players, and 1-2 spare Big Breaths.
- Your turn (25 s): play any number of action cards, then draw one card (tap the pile or "Draw a card"). Time runs out = you draw.
- Cards: **Peek** (see the top three, privately), **Skip** (end your turn without drawing), **Shuffle**, **Pinch** (a random card from someone you pick), **Pass the Plate** (end your turn without drawing; the next player takes two turns), **Steady On** (cancel a card someone just played).
- Every played card opens a 3.6 s window on every phone. Anyone holding a Steady On (not the person who just played) can cancel it; a Steady On can be Steadied On back (the chain flips).
- Draw a cake: with a Big Breath, tap to blow it out (auto after 6.5 s), then secretly put it back: top, 2nd, 3rd, random or bottom. Without one: out. Out players watch and throw bread rolls.
- Scoring for tonight's table: places by survival (100 per place survived, +500 for the last one in).
- No stacking of Pass the Plate (keeps it one sentence). A disconnected player's turn times out in 3.5 s.

## Phases
`returns-intro` -> (`returns-turn` -> [`returns-play` (window) -> `returns-peek`?]* -> `returns-draw` | `returns-cake` -> `returns-tuck` | `returns-out`)* -> `returns-win` -> results.

## Screens
| Screen | Who | What |
|---|---|---|
| `returns-intro` | all | three panels with card art, "N cakes hidden in M cards" |
| `returns-myturn` | the turn player | claret banner "Your turn" + candle frame round the whole phone + haptic + chime; pile with cards-left, cakes-left and odds bar; hand row (tap to select, then "Play X"/target chips); big "Draw a card" |
| `returns-watch` | everyone else | banner in the turn player's colour, seat lit; "X is deciding", "You're next. Start sweating."; your hand with Steady On glowing |
| `returns-play` | all | the played card thrown on the table, "on you", any Steady Ons slammed on top with names; verdict pill; burning fuse; big Steady On button for holders |
| `returns-peek` / `-peekwatch` | player / others | three cards in order with a plain read ("The next card is a cake. Do something!") / fanned backs + eye |
| `returns-draw` | all | card flips; your phone shows the face, others see a back stamped Safe |
| `returns-cake` | all | the moment: screen washes claret and pulses, BIRTHDAY CAKE! shouts and shakes, flickering cake, whose birthday it is, Cyril keeps panicking, camera shake, "Happy Birthday" gone wrong sting, long buzz for the drawer. Drawer gets a huge teal "Big Breath!" button; on tap the candles snuff, smoke rises, wash turns teal, Cyril relaxes |
| `returns-tuck` / `-tuckwatch` | player / others | five slot buttons with a little pile diagram / "Watch their face" |
| `returns-out` | all | grey avatar with a smoke wisp, place, the cake's occasion |
| `returns-win` | all | last one in, the order everyone went out |

Demos: every screen above plus `returns-steadied`, `returns-drawwatch`, `returns-cake-doomed`, `returns-cake-watch`, `returns-blown`, `returns-out-me` (demos rig the host on the first turn to jump straight to the moment).

## Content
- 8 card kinds, each with a one-line rule on its face and 6 flavour lines per rating (shown on the big card).
- 60 family + 60 adult birthday occasions for the cakes (stable ids, `api.take` keeps them unique all night; a 6-player game uses 5). Adult = swearing and grown-up life, never sexual.
- Cyril lines (family + adult) for every beat; he is a candle, so cakes terrify him.

## Look
The box's linen/claret/candle world. Cards are linen stock with a colour band and a hand-drawn round medallion (one icon family: 2.6 px round strokes). The card back is claret with a linen hairline and a small candle. Danger is always claret; attention is candlelight; each card keeps its own colour (Peek willow, Skip sage, Shuffle mustard, Pinch damson, Pass the Plate tomato, Steady On mahogany, Big Breath teal, Cake claret).

## Gaps / shared asks
- Menu dish art: `dish: 'cake'` is not in `src/screens/menu-art.js` yet (falls back to the cloche). Notes for the box team are in `index.js`.
