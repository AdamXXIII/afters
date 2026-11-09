# Round 3 team report: Last Orders (r3-intro, r3-write, r3-swipe, r3-reveal)

> AI-generated (Claude, Round 3 build team, 2026-11-09). Branch `afters/round3`.

## Result: NOT passed after 6 rounds (honest verdict)

The fresh critic gave **no screen WOWED**, and no screen reached 9 on every score. All six rounds ran (the brief's maximum). The scores rose from roughly 5-7 in round 1 to 7-8 in rounds 4-6, but the bar is 9+ everywhere with a WOWED verdict.

### Final critic scores (round 6, fresh critic)

| Screen | Polish | Type | Layout | Readability | Charm | Motion | Consistency | Verdict |
|---|---|---|---|---|---|---|---|---|
| r3-intro | 8 | 8 | 8 | 7 | 8 | 7 | 8 | NOT YET |
| r3-write | 7 | 7 | 6 | 6 | 5 | 5 | 7 | NOT YET |
| r3-swipe | 8 | 8 | 7 | 8 | 6 | 7 | 8 | NOT YET |
| r3-reveal | 8 | 7 | 7 | 7 | 8 | 8 | 8 | NOT YET |

The final shipped intro and swipe are the round 5 versions, because those won the last blind A/B. Their round 5 critic scores were intro 8/8/7/7/7/7/8 and swipe 8/8/7/8/7/7/6.

### Blind A/B history (new vs previous, neutral file names)

| Round | Intro | Write | Swipe | Reveal | Action |
|---|---|---|---|---|---|
| 2 | new | new | new | **old** | Reverted the reveal ladder avatars (they caused truncation) and the over-dense confetti. Kept the "=1" tie marks. |
| 3 | **old** | new | new | new | Moved the intro countdown into the card. |
| 4 | **old (round 2)** | new | new | new | Restored the round 2 intro layout in round 5. |
| 5 | new | new | new | new | None. |
| 6 | **old** | new | **old** | new | Reverted the intro fuse and restored the swipe in-card pass/cheers hints. |

## What changed

- **r3-intro:** a bespoke menu card replaces the shared round card.
  - A brass pub bell swings and dings twice on the bell SFX, with a haptic and a camera nudge.
  - "The finale" ribbon, an ornamental rule and a big "Last Orders" title.
  - A linen menu inset gives the three beats (Write / Swipe / Toast) with drawn icons, plus a "+200 a glass · +1000 the toast" price line.
  - Cyril does a smug beat with a celebration flame. Skip is a pill.
  - A custom camera shot keeps Cyril fully in view.
- **r3-write:**
  - Prompt card with "Sends when time's up".
  - Pen-icon field and "Another!", which stays disabled until you type. The keyboard still never loses focus.
  - An "order pad" of four numbered tickets. Filled tickets drop in, the next slot pulses with "Next up", and empty slots have jokey ruled placeholders.
  - Cyril quips on each submit ("Two! Steady on.").
  - An "Order in" stamp when all four are in, and a tip line.
  - The demo now shows two answers already served.
- **r3-swipe:**
  - The prompt sits on a menu slip with "Card n of N" and a segmented deck rail (this replaces the floating dots).
  - A brass glass tray shows the glasses with wine levels and drains with a wobble. Wit lines change as glasses run out.
  - The ticket-style card has a burning fuse timer along its top edge that turns hot in the last quarter.
  - A fanned deck sits behind the card. The drag shows a "Cheers!" or "Pass" stamp, with a rubber-band when you are out of glasses.
  - "Glass raised" / "Passed" after-states, and a "Yours, I'll look away" state for your own cards.
  - Cyril quips on your first cheers and first pass, and on your last glass.
- **r3-reveal:**
  - A hero card plus a ladder: each card lands, glasses clink in one by one at rising pitch, then the author chip and points stamp hit with a camera nudge and a count-up. Earlier cards step down onto the ladder, which shows rank, glasses, an avatar, the name and points.
  - Tie-aware ranks ("=3"). A joint toast gets a split hero ("Joint 1st"), with both winners side by side at matched sizes and each with +1600.
  - A drumroll and "And the toast of the table is..." come before the toast. Then the gold-foil frame, the ribbon, +1000 counting up and the fanfare.
  - Napkin-and-foil confetti in palette colours, seeded and kept off Cyril's face.
  - Cyril names the winners ("Martha and Gus! Insufferable, both.").
  - A dark scrim under the title for contrast.
- **Engineering:**
  - New `src/screens/r3-art.js` holds the SVG props, a lateness-aware timeline and `sayIfFresh`. Reconnects and frozen screenshots jump to end states, with no replayed SFX and no stale bubbles.
  - Custom camera shots are added to `SHOTS` at runtime, so Stage.js is untouched.
  - All classes are `r3*`-prefixed, so nothing leaks into other screens.
  - Bug fixed: Cyril lines due later were shown immediately in frozen mode.
- `src/demo.js`: only the `r3-write` entry changed (`me: 'act'`).
- `node scripts/e2e.mjs`: PASS, run after the final change.

## Still NOT YET, per the critics

- **Write** is the weakest screen (charm 5, motion 5). Cyril is a cropped head in the shared strip during the longest phase. Critics also want the disabled button hidden or made inline, and less empty space below the pad.
- **Swipe:** Cyril is small and doesn't react per card. Critics want Cheers to dominate over Pass, and the time fuse and the deck rail to be more visually distinct.
- **Reveal:** the hero is "boxes in boxes" (too many nested frames). The right-hand row metadata is cramped, and long answers wrap to two lines.
- **Intro:** critics want a visible auto-advance countdown. Two attempts lost the blind A/B because they pushed the card up over Cyril.

## Shared-file changes needed (not made; frozen files)

1. **Strip (`src/ui/strip.js` / base.css):** on r3-write the third player chip is clipped off the right edge, and Cyril is cut in half at x=0. Fixing this would lift every input screen.
2. **Reaction rail icons (`src/ui/icons.js`):** two critics said the applause and groan icons look like stock emoji. Table-prop versions (napkin, spoon) would fit the art bible.
3. **Cyril (`src/stage/Cyril.js`):** a per-phase "pose" API (lean in, wink) would answer the most common critique ("host is static or absent"). Screens can only trigger short `react()` beats today.
4. **Bubble (`src/ui/bubble.js`):** side bubbles can sit within 16px of show-layer titles. An exclusion rect or a `top` floor option would help.
5. **Stage (`SHOTS` in Stage.js):** please adopt the `r3-intro`, `r3-swipe` and `r3-reveal` shots that r3-art.js currently injects at runtime.
