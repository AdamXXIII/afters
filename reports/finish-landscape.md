# Finish: landscape + menu grid (2026-11-10)

Brief: `briefs/finish-landscape.md`. Branch `afters/landscape`. 2 critic rounds used (of 3), one critic each.

## What changed
1. **Menu, landscape (844x390)**: rebuilt as a real two-column layout. Cyril and the table on the left, one full-height claret panel on the right holding a one-line header ("What's for afters?", room code plaque, Family/Adults switch), the 2x2 game grid, then the hero card lying on its side (plate | name | Serve button). The settings gear moves to the left column's edge, like split screens. `src/screens/menu.css`, end of file.
2. **Menu, 2x2 grid overlaps (both orientations)**:
   - Guests' avatars ("fans") now clip onto the top edge of a tile like place-card pins. They no longer sit over the game name.
   - The picks keep their natural height and the hero card shrinks instead, so the grid no longer rides up over Tonight's table.
   - The hero plate has real sizing now (`.mn-hero-art` / `.mn-hero-plate` had no CSS).
   - The "Most fancied" line is dark ink on the cream card (it was linen on cream, so you couldn't read it).
3. **Menu, critic round 1** (our menu lost: "phone density, nothing reads"): in landscape, removed the tiny Tonight's-table chips, tile hints and meta chips. Game names are now 24px, the hero title 28px.
4. **Podium, landscape**: the bill sits on the right above the reaction rail, with single-line rows and no footer. The winner's name moves to the left column, so nothing is clipped at the top or covers the Skip button. `podium.css`, end of file.
5. **Last Orders swipe, landscape** (critic round 2): the Pass / Cheers buttons were cut off at the bottom. The mat now shrinks to fit. `r3.css`, end of file.

Checked by eye (landscape): title, create, join, lobby, settings, menu, menu-first, results, podium, end, intro, r1-write, r1-vote, r1-reveal, r2-write, r3-swipe. Title, create, join, lobby, settings, results, end, intro and r1-vote were already fine.

## Critic verdicts (blind, vs Jackbox Steam shots)
- Round 1: we won 3 of 4 (lobby, results, r1-vote). The menu lost; fixed (item 3).
- Round 2: we lost 4 of 4. The main complaint was structural: "every screen is half decorative candle, half phone-app panel; reads as a mobile app, not a TV party game". That is the brief's own layout (show left, input right) judged against TV screenshots, so it was not "fixed". The one concrete bug it found (r3-swipe buttons cut off) is fixed.

## NOT YET
- r2-write / r1-write landscape: the timer and player chips at the bottom of the left column overlap Cyril's bow tie, and the Cyril tip card at the bottom of the sheet is clipped (the sheet scrolls, but nothing shows that it does).
- r1-reveal landscape: the answer cards run under the reaction rail at the bottom.
- Menu landscape: Tonight's table is hidden (Cyril's line and the results screen still show the leader). If Adam wants it on the menu, it needs a single big "leader" chip, not the full row.
- Critics compare phone screens with TV screens. A fairer bar would be phone controller shots (Jackbox's phone UI), which we don't have.
- Not checked in landscape: r1-scores, r2-pick, r2-reveal, r3-reveal, reconnect, and the other three games' screens (they have their own landscape blocks).

## Tests (2026-11-10, after all changes)
All pass with no console errors: `e2e` (Afters Classic, full game + second helping), `e2e-percentages`, `e2e-telephone`, and `e2e-forehead` (Bonce + Gravy vs Custard, 251 s).
