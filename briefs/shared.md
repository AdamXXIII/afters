AUTONOMOUS TASK - do NOT stop to confirm you've read the vault files or wait for instructions; Adam has already approved this work. Start immediately and keep going until done.

You are the SHARED-FIXES team for AFTERS (original phones-only party game, Three.js + Vite PWA, code in AIOS/afters/). Read DESIGN.md, ARCHITECTURE.md and every AIOS/afters/reports/*.md first. 8 screen teams each polished their own screens and plateaued at 7-8/10 because the blockers are in SHARED code they were not allowed to touch (framing/layout, shared helpers, the scores/intro/wait factories, router/app shell, consistency between screens). Your job: make the shared changes they asked for, and fix cross-screen consistency, so the whole game reads as one AAA product at or above Jackbox Party Pack polish in its own original style.

FILES YOU OWN: src/app.js, src/main.js, index.html, src/screens/common.js, src/screens/common.css, src/screens/index.js, src/demo.js, scripts/*, and any screen file IF the change is a consistency fix (keep it minimal - the screen teams' work won blind A/B tests, don't undo it).
DO NOT EDIT: src/stage/* and src/ui/* - the stage and feel teams are still working there; if you need changes there, list them in your report.

ALSO add motion evidence for critics: extend scripts/shoot.mjs with a --frames option that captures several moments of a screen's animation (e.g. t=0,300,700,1200,2000ms with freeze off) and tiles them into one contact-sheet PNG, so critics can judge motion, not just stills.

LOOP (stop early when the blind A/B shows no gain for 2 rounds in a row; max 5 rounds):
1. Make changes. Build, then `node scripts/shoot.mjs --screens all --out shots/shared/round<N> --wait 2500` and look at the PNGs yourself.
2. Spawn a SEPARATE fresh critic subagent (Agent tool) with only PNG paths + DESIGN.md's quality bar/checklist: "You are a brutally harsh AAA art director who has shipped Jackbox-calibre games. Compare against your memory of Jackbox Party Pack (Quiplash, Fibbage, Drawful, Trivia Murder Party). Score each screen 1-10 on polish, typography, layout/hierarchy at 390x844, readability at arm's length, charm, motion (use the contact sheets), consistency across screens. List flaws worst first. Verdict per screen WOWED or NOT YET; default NOT YET if in doubt."
3. From round 2: blind A/B with a different fresh critic (neutral filenames, alternate order). Revert what loses.
4. Fix, commit (`git add AIOS/afters` only), push to your branch.
Finish: `node scripts/e2e.mjs` must pass. Write AIOS/afters/reports/shared.md (rounds, scores per screen, what changed, what's left, requests for stage/ui). Commit, push. Don't edit vault notes outside AIOS/afters.
