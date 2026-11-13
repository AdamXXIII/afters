# Menu v2 design notes

Built 2026-11-13 so the menu can hold 23 games. Brief: `projects/afters/briefs/menu-v2.md` in the brain folder.

## Layout
- **Top band** (portrait, 158 px under the safe area): only Cyril and his bubble. Two invisible `.mn-shield` halves cover the bay. The stage framer and the bubble ignore any element bigger than half the screen, so without the shields they would put Cyril in a gap between menu lines and his bubble would cover a game.
- **Bay:** Invite (with the code) and the Family / 18+ switch on one row, tonight's scores, then one scrolling column: Same again / Something new (only after a game), mood chips (one row that scrolls sideways, with a linen arrow at whichever end has more), and the menu sheet. The chip row starts with a "For N of us" chip, which is on by default; games that don't fit drop into a labelled "Not for N of you" tail. Then one line per game: dish, name, hint, players, minutes, who fancies it, and "needs 4" when it doesn't fit.
- **Foot:** who serves, and where the host's finger is ("Sam is looking at X · See it"), or the most-fancied game for the host.
- **Game card:** slides up over the bay. It has the dish, name, tagline, players ("3–8 players: fine for 5"), minutes, rating, the three "How it plays" panels and one action: **Serve X** for the host, **I fancy this** for a guest. When the table is too small, the host gets Invite next to a disabled button.
- **Landscape:** Cyril takes the left 30%, with Same again / Something new under him. The bay starts at 30% because the framer's left column reaches 29.5%. The list shows two columns and the card lies on its side.

## Data
- `mood` in each game's `index.js`: loud, talky, sneaky, clever, drawing, rude. Rude only shows on Adults 18+. Games without it get moods from `tags`.
- `dish` keys: trifle, jelly, spaghetti, pie, tureen, seconds, gavel, cabinet, trumpet (`menu-art.js`). Cloche is the fallback.
- "Something new" comes from `suggestNext()`. It picks a game that fits the table, isn't the last one, preferably wasn't played tonight and has a different mood. The choice is worked out from the payload, so every phone shows the same one.

## Behaviour
- The host opening a card sends `focus` and closing it clears focus. A guest's tap only opens the card; their vote is the big button, and tapping Same again or Something new also counts as a vote. The host's Same again / Something new serves the game in one tap.
- There is no engine change.
