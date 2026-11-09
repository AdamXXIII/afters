# Front door team report (title, create, join, settings)

> AI-generated (Claude, front-door build team, 2026-11-09). Branch `afters/front-door`.

## Result: NOT PASSED after 6 rounds (the cap)
No screen reached WOWED / 9+ on every score. Scores rose from about 5-7 to 6-8. What holds them back is mostly outside this team's files (see "Shared changes needed").

## Final critic scores (round 6, fresh critic)
Order: polish / type / layout / readability / charm / motion / consistency.

| Screen | Scores | Verdict |
|---|---|---|
| title | 7 / 8 / 7 / 7 / 6 / 6 / 7 | NOT YET |
| create | 7 / 8 / 7 / 8 / 7 / 5 / 8 | NOT YET |
| join | 7 / 7 / 7 / 7 / 7 / 5 / 8 | NOT YET |
| settings | 7 / 8 / 7 / 7 / 6 / 4 / 7 | NOT YET |

Round 1 for comparison: title 7/8/7/6/6/5/7, create 6/7/6/6/5/3/7, join 6/7/5/6/6/3/6, settings 7/7/7/6/5/3/7.

## Rounds
1. Title lockup ("Cyril Waxley presents", letterpress AFTERS with a real flame and halo on the A, brass-ruled tagline, warm scrim, meta line). Create and join got a live place-card name preview, and join got raised code tiles. Settings became a grouped "menu" sheet with an icon and a dry line per row.
2. Readability pass (16 px floor), claret secondary button, claret toggles, warm scrim, Cyril's bubble hidden under settings. Blind A/B: new won 4/4.
3. The place card IS the name field (type straight onto it in Caveat), stamped code tiles, settings retitled "House rules" with a Cyril quote. Blind A/B: title lost (side bubble placement and the yellow "presents"), so those were reverted. The other 3 won.
4. Active code tile, name card staged until the code is complete, autofocus (not in screenshots), mini Cyril candle in settings, gear hidden under settings. Blind A/B: create lost (centred heading, darker placeholder), so it was reverted. The other 3 won.
5. Key icon, cleaner tiles, ruled section labels. Blind A/B: create's "????" code-preview panel and settings' full-width text-size row lost, so both were reverted. Join won.
6. Matched place cards on create and join, deeper card shadow, darker off-toggle track, heavier icons, stronger backdrop blur. Blind A/B: create and settings won. Join's underline caret lost, so the vertical caret was restored.

`node scripts/e2e.mjs` passes (full 3-phone game plus "Same again"). The e2e selectors (`start-table`, `name-input`, `open-table`, `take-seat`) are unchanged.

## Files
Edited: `src/screens/title.js/.css`, `create.js`, `join.js/.css`, `settings.js`. New: `src/screens/create.css`, `create-namecard.js` (shared by create and join), `settings.css`. `overlays.css` and `src/demo.js` are untouched.

## Left NOT YET (critic points this team could still do)
- Create and join still have empty space above the CTA at 390x844. A code-preview panel was tried and lost A/B.
- The "Back" link sits top-right. The critic wants it top-left.
- Settings "reads as iOS settings": a full menu-card treatment (deckle edge, brass switches) was not attempted.
- Keyboard-open layout is unverified on a real phone (it depends on `kb-open` in base.css).

## Shared changes needed (not ours; every critic ranked these top)
1. **Cyril's face and wax** (`src/stage/Cyril.js`): bigger eyes with lids and highlights, a real mouth shape, wax translucency near the flame, more drips. Every critic called this the biggest gap to Jackbox charm.
2. **The flame reads as a white blob** on title. Its bloom is clipped and it needs a warm core gradient (Cyril.js / Stage.js).
3. **Camera framing** (`src/stage/Stage.js` SHOTS `title`, `create`, `join`): props cropped at the edges (chocolate slab, a dark chair at left, plate arc at bottom-right). On title the buttons cut through Cyril's holder, so raise him or frame tighter. Create and join use an identical shot and pose; give join a lean-in or peering pose.
4. **Speech bubbles** (`src/ui/bubble.js`, `components.css`): DESIGN 3.4 says key words go in Fraunces italic; critics want Cyril's whole voice in Fraunces. The bubble tail touches the flame on title.
5. **Sheet grabber** (`base.css #sheet::before`) implies a drag that doesn't exist.
6. Headless shots don't show `backdrop-filter` blur over the WebGL canvas, so settings' backdrop looks like a flat wash in the PNGs.
