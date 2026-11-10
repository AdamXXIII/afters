AUTONOMOUS TASK - do NOT stop to confirm you've read the vault files or wait for instructions; Adam has already approved this work. Start immediately.

HARD BUDGET: stop after 45 minutes of work OR 3 critic rounds, whichever comes first. At most ONE critic subagent per round, no other subagents. Keep tool output small.

AFTERS: phones-only party game box (no TV), Three.js + Vite, code in AIOS/afters/. Your job: make the GAME MENU (src/screens/menu.js, menu.css, menu-art.js and the menu-related parts of the scoreboard strip) genuinely user-friendly for a sofa of 30-somethings picking a game, in portrait AND landscape, host AND guest view (`node scripts/shoot.mjs --screens menu [--landscape] [--me guest] --out shots/menu/r<N>`). Keep the warm candle-lit dinner look and Cyril; keep the food-themed decor (Adam only banned food TOPICS in prompts).

Fix these (from Adam's review, worst first):
1. No "how to play": replace the huge dessert picture in the detail card with a compact "How it plays" card: 3 short steps, player count, length, and an 18+ badge where the game has adult content. Keep a small dish illustration.
2. Jargon: "2 dishes down", "Most fancied", "I fancy", "Serve", "3 of 4 guests", "X is pointing at" -> plain words with light charm ("Games played: 2", "Vote for a game", "3 of 4 voted", "Start game"). Make it obvious guests are voting and the host starts.
3. Tiles: show player count + length (and 18+ where relevant) on each tile; keep the one-line hint in landscape too.
4. Invite: a clear "Invite" button that opens a big room code + QR code (generate the QR in-page, no network; a tiny QR encoder in JS is fine) + "Join at <this URL>" so late arrivals can get in.
5. Clutter: the pointing-hand and avatar bubbles overlap the selected tile; the scoreboard rank badges (1,1,3,3,5) are unexplained. Clean both.
Also fix the flaky test scripts/e2e-telephone.mjs: it sometimes fails "host never showed: telephone-wait" when bots finish fast - treat telephone-wait as optional.

Bar: real Jackbox menu screenshots (run `bash scripts/fetch-reference.sh`; see reference/README.md, also reference/bar/*.jpg if present). Each round one fresh harsh critic subagent sees our menu and a real Jackbox menu blind (neutral names a.png/b.png): "Which menu would a group of friends find easier and nicer to pick a game from, A or B? Then the single biggest gap in the loser." Fix that gap.
Before finishing: all of node scripts/e2e.mjs, e2e-forehead (~5 min), e2e-percentages, e2e-telephone must pass (update selectors if you rename buttons; keep data-e2e attributes). Commit (`git add AIOS/afters` only), push to your branch, write reports/menu.md (what changed, critic verdicts, what's still NOT YET).
