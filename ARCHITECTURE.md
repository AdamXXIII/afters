# AFTERS - Architecture and module ownership

> AI-generated (Claude, lead engineer pass, 2026-11-09). Read `DESIGN.md` first: it is the source of truth for look, copy and rules. This file explains how the code is laid out so several agents can work in parallel without stepping on each other.

## Run it

```bash
npm install
npm run dev                 # http://localhost:5173  (phone on same wifi: use the Network URL)
npm run build               # icons + production build into dist/
npm run preview             # serve dist/ on :4173
npm run shoot -- --screens all --out shots          # PNG per screen (390x844 @2x), needs a build
npm run e2e                 # 3 phones, real PeerJS over a local signalling server, full game
node scripts/sim.mjs 5 50   # headless engine + 5 bots full game in Node (no browser)
```

## The big idea

Every phone is both the TV show and the controller. One phone **hosts**: it runs the `HostEngine` (authoritative state machine). Every phone, including the host's own UI, is a `GameClient` that mirrors state and sends actions. The engine sends `phase` messages stamped in host-clock ms (`startsAt`, `endsAt`); clients estimate a clock offset (ping/pong) and render timers and reveal timelines from `ctx.elapsed()`, so reveals play in lockstep on every phone.

```
host phone                                   other phones
+---------------------------------------+    +-------------------+
| HostEngine <- MultiHostTransport -----|----|-> PeerTransport   |
|   ^  LocalTransport (own client, bots)|    |   GameClient      |
|   GameClient (host UI)  Bots          |    |   App + screens   |
|   App + Router + Stage + screens      |    +-------------------+
+---------------------------------------+
```

## Directory map and owners

| Path | What | Owner |
|---|---|---|
| `index.html` | DOM shell: `#stage` canvas, `#fx`, `#show`, `#bubbles`, `#strip`, `#sheet > #sheet-body`, `#rail`, `#topbar`, `#overlay`, `#toasts` | lead |
| `src/main.js` | fonts + CSS imports, boots `App`, registers service worker | lead |
| `src/app.js` | hosting/joining, screen resolution, per-screen `ctx`, reactions, overlays, keyboard/viewport, wake lock, `window.__afters` | lead |
| `src/demo.js` | `?demo=<screen>` fast-forward specs (`DEMOS`): which phase, who acts, frozen time `t` | lead (screen agents may tune their own entry) |
| `src/net/Transport.js` | Transport interface + `MultiHostTransport` | net |
| `src/net/LocalTransport.js` | in-memory hub (+ BroadcastChannel bridge across tabs) | net |
| `src/net/PeerTransport.js` | PeerJS WebRTC; host id `afters-<CODE>-host`; `signal` option for a local server | net |
| `src/net/roomCode.js` | 4 consonant codes, blocklist | net |
| `src/game/constants.js` | durations, limits, palette, avatars, phase + screen ids | game |
| `src/game/HostEngine.js` | pure state machine (inject `send`, `now`, `seed`, `speed`) | game |
| `src/game/scoring.js` | pure scoring for R1/R2/R3 | game |
| `src/game/awards.js` | bill awards | game |
| `src/game/GameClient.js` | client mirror, clock sync, reconnect by token, action helpers | game |
| `src/game/hostRoom.js` | wires engine to transports + tick loop, retries taken codes | game |
| `src/content/*.js` | prompts (48), facts (28), last orders (16), bot answers, Cyril's line bank | content |
| `src/bots.js` | `attachBrain(client)` and `createBot()`; instant or realtime; `gate` for demos | game |
| `src/stage/Stage.js` | renderer, camera shots + tweens, layout framing, avatars at seats, podium cake, thrown reactions, quality step-down, `snapshotStats()` | stage |
| `src/stage/Cyril.js` | the host candle: build + `react()`, `setMood()`, `pulse()`, `setTalking()`, `lookAt()` | stage/Cyril |
| `src/stage/avatars.js` | 8 avatars, idle animation, offscreen thumbnails | stage/avatars |
| `src/stage/props.js` | table, cloth, room, chairs, props, cake, throwables | stage/scene |
| `src/stage/textures.js` | procedural canvas textures | stage/scene |
| `src/ui/tokens.css` | design tokens (palette, type, radii, shadows, easing) | design system |
| `src/ui/base.css` | dual-layer layout (`body[data-layout]`), sheet, strip, rail, choreography | design system |
| `src/ui/components.css` + `components.js` | buttons, choice, cards, chips, timer ring, inputs, leaderboard, code tiles, toasts, toggles, `h()` helper | design system |
| `src/ui/icons.js` | hand-made SVG icons, 8 avatar glyphs | design system |
| `src/ui/bubble.js` | Cyril's speech bubbles (typewriter, babble, anchored to his head) | design system |
| `src/ui/router.js` | screen registry + transitions | lead |
| `src/ui/strip.js`, `rail.js`, `haptics.js` | input-mode strip, reaction rail, haptics | design system |
| `src/audio/synth.js`, `music.js` | WebAudio SFX + "Late Supper" music bed | audio |
| `src/screens/<id>.js` (+ `<id>.css` or a shared round css) | **one file per screen** | one agent per screen |
| `src/screens/common.js/.css` | small helpers used by first versions (intro/scores factories, timeline, wait card) | shared; screen owners may inline and diverge |
| `src/screens/index.js` | registry: add your screen here | lead |
| `public/` | manifest, `sw.js`, icons (`icon.svg` -> PNGs by `scripts/make-icons.mjs`) | lead |
| `scripts/` | `shoot.mjs`, `e2e.mjs`, `sim.mjs`, `serve.mjs`, `make-icons.mjs` | lead/QA |

Shared CSS per round (`r1.css`, `r2.css`, `r3.css`) is imported by that round's screens. If two agents own screens of the same round, the first to need a change should move their rules into their own `<id>.css`.

## Screen contract

Each `src/screens/<id>.js` default-exports:

```js
export default {
  id: 'r1-vote',
  layout: 'split',        // 'show' | 'split' | 'input' (or ctx => layout). Sets body[data-layout].
  shot: 'vote',           // Stage camera shot from SHOTS in Stage.js (or ctx => shot)
  rail: true,             // reaction rail (default: true for 'show')
  strip: true,            // auto timer+chips strip in 'input' layout (default true)
  mount({ show, sheet }, ctx) {
    // build DOM into show (over the WebGL stage) and sheet (bottom input sheet)
    return { update(ctx) {}, frame(ctx, dt) {}, unmount() {} };  // all optional
  },
};
```

- `mount` runs once per screen instance. The router remounts when the screen id **or phase seq** changes (e.g. each R1 matchup is a fresh `r1-vote`).
- `update(ctx)` runs on every client state change (progress, votes, roster). Keep it cheap.
- `frame(ctx, dt)` runs every rendered frame. Drive timelines from `ctx.elapsed()`, never from wall-clock in the screen, so screenshots (`&freeze=1&t=`) and sync both work.
- Overlays (`settings`, `reconnect`) use `{ id, overlay: true, mount({ overlay }, ctx) }` and live in `OVERLAYS`.

### ctx (built fresh by `App.ctx()`)

| Field | Meaning |
|---|---|
| `phase`, `payload`, `priv` | current phase message; `priv` is this player's private part |
| `progress` | `{done:{id:bool}, counts:{id:n}}` for "who's done" chips |
| `mine` | this phone's optimistic actions this phase: `submitted{slot:text}`, `r3[]`, `vote`, `pick`, `swipes{cardId:bool}` |
| `players`, `player(id)`, `me`, `meId`, `isHost`, `isSpeaker`, `room`, `settings` | roster |
| `duration`, `elapsed()`, `remaining()`, `now()` | host-clock time; frozen in screenshot mode |
| `client` | actions: `submit(text, slot?)`, `vote('A'|'B')`, `pick(optionId)`, `swipe(cardId, cheers)`, `react(kind)`, `start()`, `skip()`, `again()`, `newTable()`, `setProfile()`, `setSettings()` |
| `stage`, `cyril` | Three.js stage and the host rig (`cyril.react('delight'|'shock'|'smug'|'sad'|'guffaw'|'drumroll')`) |
| `say(lines, {hold, compact, placement:'above'|'side'})`, `line(key, vars)` | Cyril's bubbles + line bank |
| `audio.sfx(name)`, `haptic(name)`, `toast(msg)` | juice |
| `frozen`, `demo`, `reduced` | screenshot mode, demo id, reduced motion |
| `go(id)`, `actions` | pre-game navigation; `createTable`, `joinTable`, `leave`, `openSettings`, `closeOverlay`, `addBot` |

### Which screen shows (App.resolveScreen)

Pre-game: `title` / `create` / `join` (local navigation). Once joined, the screen is the phase id, except `r1-write` -> `r1-wait` when this phone has served both plates, and `r2-write` -> `r2-wait` after a porky is accepted. `reconnect` is an overlay driven by `client.state.status`.

## Engine phases and payloads

Phase ids (in order): `lobby, intro, r1-intro, r1-write, (r1-vote, r1-reveal) x N, r1-scores, r2-intro, (r2-write, r2-pick, r2-reveal) x facts, r2-scores, r3-intro, r3-write, r3-swipe, r3-reveal, podium, end`.

Every phase message: `{type:'phase', id, seq, startsAt, endsAt, duration, seed, speed, payload, players, private}`. Timeline offsets inside payloads (`steps[].at`, `perCard`, `toastAt`) are already divided by `speed`.

| Phase | payload | private |
|---|---|---|
| `r1-write` | `{assignments, max}` | `{prompts:[{matchupId, prompt}]}` |
| `r1-vote` | `{index, count, matchupId, prompt, answers:[{key,text}], voterIds}` | `{role:'author'|'voter', mine}` |
| `r1-reveal` | `{index, count, prompt, answers:[{key,text,authorId,empty,votes,house,points,bonus}], outcome:'clean'|'tie'|'empty'|'novotes'|'normal', deltas}` | - |
| `r1-scores`, `r2-scores` | `{rows:[{id,score,prev,delta,prevRank}], round}` | - |
| `r2-write` | `{index, count, fact:{id,text}, max}` | - |
| `r2-pick` | `{index, count, fact, options:[{id,text}]}` | `{ownOptionId}` |
| `r2-reveal` | `{fact, aside, options:[{id,text,kind,authors,pickers}], steps:[{kind:'nobody'|'porky'|'truth'|'aside', at, dur, optionId|optionIds}], deltas}` | - |
| `r3-write` | `{prompt, max, maxAnswers}` | - |
| `r3-swipe` | `{prompt, deck:[{id,text}], perCard, glasses}` | `{ownCardIds}` |
| `r3-reveal` | `{prompt, top:[{id,text,authorId,rank,glasses,points,toast}], steps:[{cardId,at}], toastIds, toastAt, deltas}` | - |
| `podium` | `{rows:[{id,score,rank,award:{title,blurb}}]}` | - |
| `end` | `{rows, hostId}` | - |

Messages (client -> host): `hello, ping, profile, settings, start, skip, again, newTable, kick, react, leave, submit, vote, pick, swipe`. Host -> client: `welcome, refuse, pong, lobby, phase, progress, ack, reject, react, kick`. `state` snapshots exist as `engine.snapshot()` (not yet broadcast; see gaps).

## URL parameters

| Param | Effect |
|---|---|
| `?demo=<screen-id>` | jump straight to that screen with bots and seeded content |
| `&freeze=1` | pause the engine and pin `ctx.elapsed()` at a good moment (per-screen default in `DEMOS`), or `&t=<ms>` |
| `&seed=<n>` | deterministic content/shuffles |
| `&players=3..8`, `&me=host|guest` | demo table size and whether this phone is the host |
| `?bots=N&autoplay=1` | open a table with N bots on one phone; local player plays itself; host auto-starts |
| `&autopilot=1` | local player plays itself once in-game (used by tests) |
| `&speed=<x>` | divide every duration (tests) |
| `?room=ABCD&name=X` | join screen prefilled (share links) |
| `&transport=local|peer|auto`, `&signal=host:port` | transport selection; `local` bridges tabs with BroadcastChannel; `signal` points PeerJS at a local server |
| `&quality=low|high`, `&nosw=1` | quality tier, skip service worker |

## Tests and harnesses

- `scripts/shoot.mjs` - builds nothing; serves `dist/`, launches Chromium (SwiftShader WebGL), one fresh context per screen, `?demo=<id>&freeze=1&seed=7`, writes `<out>/<id>.png`, prints console errors, and fails a screen whose WebGL frame is blank (`__afters.stats()` reads back the drawing buffer).
- `scripts/e2e.mjs` - starts a local `peer` signalling server and a static server, opens 3 browser contexts (host plays through the real UI; 2 players on autopilot), plays to `end`, checks every phase screen appeared, then "Same again". Fails on any console error.
- `scripts/sim.mjs` - Node-only engine + bots full game (fast logic check).

## Performance rules (DESIGN 3.6)

Pixel ratio capped at 2 with auto step-down (2 -> 1.5 -> 1.25) when frames average > 20 ms (disabled under automation). Render loop stops when the tab is hidden, and runs at 30 fps in `input` layout. No shadow maps, no post-processing; glows are additive sprites, vignette and grain are CSS. Keep new meshes merged or instanced.
