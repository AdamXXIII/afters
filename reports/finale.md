# Finale team report: podium + end

> AI-generated (Claude, finale build team, 2026-11-09). Branch `afters/finale`.

## Result: NOT YET (stopped after round 5 of 6)
No screen got WOWED from a fresh critic, so the brief's pass bar was not met. Scores rose every round. The session was interrupted after round 5, so a sixth round was not run.

| Screen | R1 | R2 | R3 | R4 | R5 (final critic) |
|---|---|---|---|---|---|
| podium | 5-8 | 6-8 | 6-7 | 7-8 | polish 7, type 8, layout 7, readability 7, charm 8, motion 7, consistency 7 |
| end | 4-7 | 4-7 | 5-7 | 5-7 | polish 7, type 8, layout 6, readability 7, charm 7, motion 5, consistency 6 |

Blind A/B every round from round 2. Changes that lost were reverted:
- **Round 4:** the drumroll blackout and the 8-player footer.
- **Round 5:** Cyril moved forward on the end screen (he hid 3rd place).

## What changed
- **3D set piece** (`src/stage/podium-set.js`, new):
  - Three layer cakes on a doily'd brass board, with prize rosettes 1/2/3.
  - The top three avatars drop onto the cakes with squash and bounce. The winner gets a paper crown, sparklers, a spotlight cone and a halo.
  - A brass cloche covers the winner's spot. It rattles under a dimmed drumroll, then flies off for the reveal.
  - 240-piece napkin and gold-foil confetti (one InstancedMesh, closed-form physics, so frozen frames are exact).
  - Brass matcap material.
  - Cyril presides from a brass candlestick so the cakes never hide him.
  - Runners-up go half-lidded, side-eye the winner and slump; the winner beams.
  - Everything is a pure function of `ctx.elapsed()`, so it stays synced and works with freeze and reduced motion. It is reused by the end screen.
- **Podium screen** (`podium.js`, `podium.css`):
  - "Who takes the cake?" build-up, then the winner's name slams in with a count-up score pill.
  - Place cards under each cake.
  - Cyril lines for each beat, plus a winner quip.
  - The bill slides up as a receipt. It has every player with an award, "=N" ties and a YOU row; the footer reads "Tip for Cyril: Applause" and "Wax drips".
  - The header compacts and the camera cranes up so the podium stays visible.
- **Awards:** repeated fallback awards get unique spare titles in the same order on every phone (`dedupeAwards`).
- **End screen** (`end.js`):
  - The winner stays crowned on the cake, with a "<name> takes the cake" chip.
  - Cyril's line is set as a quote.
  - Your ticket stub shows rank badge, score and award, with a "See the bill" pop-up.
  - Host gets "Same again" (with a sheen and a hint line), a flat "New table" and "Leave the table".
  - Guests get a "<host> is deciding" card plus four heckle buttons that send real reactions.
- **Demo:** `src/demo.js` podium frozen time is now 11000 ms, so the default shot shows the bill.
- **Tests:** `node scripts/e2e.mjs` passes (full game, Same again, no console errors).

## Still NOT YET (from the round 5 critic)
1. The drumroll still reads close to the build-up. A darker version lost the A/B, so a middle ground is needed.
2. The cloche still overlaps 2nd place a little at 5 players. The 8-player 3rd-place avatar can look tipped behind Cyril.
3. The 8-player bill uses one-line rows at about 15-16 px and drops the "Wax drips" line.
4. On the end screen, "See the bill" is a small text link, and the open bill pop-up shows the buttons behind it through the dim.
5. Some eyebrow and caption text is still 13-15 px (design-system eyebrow size).

## Shared changes needed (not made; files are frozen)
- **`src/game/HostEngine.js` `_end()`:** include `award` in the end rows, so a phone that reconnects into `end` shows its award. Today `end.js` falls back to the host engine or the podium memo.
- **`src/game/awards.js`:** more than one fallback award, and the stat count in each blurb (for example "Sniffed out 4 truths"), so the bill can say why.
- **`src/stage/Cyril.js`:** the `celebrate` flame blows out to white at podium framing. Cap the flame sprite brightness. Podium now drops back to `calm` after 1.6 s as a workaround.
- **`src/ui/rail.js` / reaction rail:** critics flagged the flat beige tray and the off-palette green groan icon. The end screen re-uses `ICONS` with labels.
- **`src/stage/avatars.js`:** the sprout or pear avatar reads as a hand grenade at phone size. Lighten it or add a highlight.
- **Shared sheet `#sheet::before` drag handle:** the end screen hides it via `body.end-nohandle`. Consider a per-screen flag.
