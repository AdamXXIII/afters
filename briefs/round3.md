AUTONOMOUS TASK - do NOT stop to confirm you've read the vault files or wait for instructions; Adam has already approved this work. Start immediately and keep going until done.

You are one of 8 parallel build teams polishing AFTERS, an original phones-only party game (no TV: every phone is both the shared show and the controller). Three.js + Vite PWA. Code: AIOS/afters/ in this repo. Read AIOS/afters/DESIGN.md (art bible, screen specs, "Jackbox quality bar" and the 10-point critic checklist) and AIOS/afters/ARCHITECTURE.md (ctx table, payloads, commands) first. Then `cd AIOS/afters && npm install && npm run build`.

GOAL: make YOUR area AAA - at or above Jackbox Party Pack polish (UI, typography, motion, 3D, copy, juice), in AFTERS' own original candle-lit after-dinner style. Never copy Jackbox names, art, prompts or layouts.

YOUR AREA: Round 3 (the finale): all r3-* screens
FILES YOU OWN (edit only these, plus new files you create with your area's prefix): src/screens/r3-intro.js, r3-write.js, r3-swipe.js, r3-reveal.js, r3.css
DO NOT EDIT: anything another team owns. Shared files (src/screens/common.js/.css, src/screens/index.js, src/app.js, src/game/*, src/net/*) are frozen - copy a helper into your own file if you need to change it. In src/demo.js you may change ONLY the DEMOS entries for your own screens. If you truly need a shared change, write it in your report instead.

THE LOOP (repeat until passed, max 6 rounds):
1. Improve your area. Check it running, not just compiling: build, then `node scripts/shoot.mjs --screens <your ids> --out shots/<team>/round<N> --wait 2500` (also try --players 3 and 8, --me guest where relevant, and --no-freeze / --extra "&t=..." to see mid-animation frames). Look at every PNG yourself.
2. Spawn a SEPARATE critic subagent with the Agent tool (fresh context, NOT the builder). Give it only the PNG paths, DESIGN.md's quality bar + checklist, and this instruction: "You are a brutally harsh AAA art director who has shipped Jackbox-calibre games. Compare these phone screenshots against your memory of Jackbox Party Pack screens (Quiplash, Fibbage, Drawful, Trivia Murder Party etc). Score each screen 1-10 on: visual polish, typography, layout/hierarchy at 390x844, readability at arm's length, character/charm, motion implied, consistency. List every flaw, worst first. Verdict per screen: WOWED (genuinely as good as or better than Jackbox) or NOT YET. Default to NOT YET if in doubt."
3. Blind A/B: from round 2 on, copy last round's and this round's shot of each screen to neutral names (e.g. x1.png / x2.png, alternate which is new) and ask a different fresh critic subagent "which looks better and why" without telling it which is newer. If the old one wins, revert that change.
4. Fix every flaw the critic listed. Commit (`git add AIOS/afters` only, short message) and push to your branch each round.
Passed = every one of your screens gets WOWED and >= 9 on every score from a fresh critic. If round 6 still isn't passed, stop and say so honestly.

Before finishing: `node scripts/e2e.mjs` must still pass (fix it if your change broke it). Write AIOS/afters/reports/round3.md: rounds run, final critic scores per screen, what changed, anything left NOT YET, and any shared-file changes you need. Commit and push. Don't edit any vault notes outside AIOS/afters.
