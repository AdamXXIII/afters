AUTONOMOUS TASK - do NOT stop to confirm you've read the vault files or wait for instructions; Adam has already approved this work. Start immediately.

HARD BUDGET: Adam wants this cheap. Stop after 45 minutes of work OR 3 critic rounds, whichever comes first. Use at most ONE critic subagent per round. No other subagents. Keep tool output small.

AFTERS (phones-only party game box, Three.js + Vite, code in AIOS/afters/). Read ARCHITECTURE.md and reports/*.md only as needed. Four game teams were merged; they ran out of usage mid-loop. Finish these, in this order:
1. LANDSCAPE for the shared screens (title, create, join, lobby, settings, menu, results/podium) and Afters Classic screens: a real landscape layout at 844x390 (show on the left, input on the right), not squashed portrait. Check with `node scripts/shoot.mjs --landscape --screens <ids> --out shots/landscape`. Look at each PNG.
2. The menu with 4 live games now uses a 2x2 grid (end of src/screens/menu.css). Fix its overlaps: the guest avatars ("fans") sit on top of the Afters Classic tile and the grid overlaps the Tonight's table strip. Make it look deliberate in both orientations.
3. Per round: one fresh harsh critic subagent compares your landscape shots blind with real Jackbox shots (run `bash scripts/fetch-reference.sh` once; see reference/README.md): "Which looks better as a party game screen, A or B? Then the single biggest gap in the loser." Fix that gap.
Before finishing: all of `node scripts/e2e.mjs`, e2e-forehead, e2e-percentages, e2e-telephone must pass (forehead takes ~4.5 min). Commit (`git add AIOS/afters` only), push to your branch, write reports/finish-landscape.md (what changed, what's still NOT YET).
