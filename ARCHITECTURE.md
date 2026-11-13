# AFTERS - Architecture and module ownership

> **Game box update (2026-11-09, game-box team).** AFTERS is now a box of games. The engine is a
> *box* (`src/game/HostEngine.js`: lobby, menu, tonight's table, settings, reactions, phase clock)
> and every game is a module in `src/games/<id>/`. The original 3-round show is the first module,
> **Afters Classic** (`src/games/classic/`). Read **How to add a game** below before touching a game.

> AI-generated (Claude, lead engineer pass, 2026-11-09). Read `DESIGN.md` first: it is the source of truth for look, copy and rules. This file explains how the code is laid out so several agents can work in parallel without stepping on each other.

## Run it

```bash
npm install
npm run dev                 # http://localhost:5173  (phone on same wifi: use the Network URL)
npm run build               # icons + production build into dist/
npm run preview             # serve dist/ on :4173
npm run shoot -- --screens all --out shots          # PNG per screen (390x844 @2x), needs a build
npm run e2e                 # 3 phones, real PeerJS over a local signalling server, full game
node scripts/sim.mjs 5 50 [game]   # headless engine + 5 bots: lobby -> menu -> full game (default classic)
node scripts/test-shared.mjs       # shared draw pad + tilt helpers in a real browser
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
| `src/game/HostEngine.js` | the BOX: players, reconnects, rating, reactions, phase clock, menu, tonight's table, the `api` games use | box |
| `src/games/index.js` | **the registry: one line per game** (menu order) | box (one line per game team) |
| `src/games/<id>/` | one game: `index.js` (definition), host logic, `screens/`, css, `content/`, bot, demos | that game's team only |
| `src/games/classic/` | Afters Classic (host.js, bot.js, demos.js, content/, screens/) | classic |
| `src/games/example/` | "Call It", the smallest complete game (hidden from the menu). Copy it. | box |
| `src/games/{forehead,telephone,percentages}/index.js` | placeholder menu tiles (Bonce, Crossed Wires, Pie Chart) until those teams land | those teams |
| `src/shared/sensors.js` | tilt (forehead nod) with the iOS permission tap, vibrate + patterns, landscape lock | box |
| `src/shared/drawing.js` (+ `drawing-data.js`, `drawing.css`) | draw pad (touch, colours, sizes, undo, clear), compact stroke data, synced replay | box |
| `src/game/scoring.js`, `awards.js` | pure scoring + bill awards for Afters Classic | classic |
| `src/game/GameClient.js` | client mirror, clock sync, reconnect by token, action helpers | game |
| `src/game/hostRoom.js` | wires engine to transports + tick loop, retries taken codes | game |
| `src/content/lines.js`, `linesAdult.js` | Cyril's box-wide line bank (family + Adults 18+), variants | content |
| `src/content/botAnswers.js` | bot answers `{family, adult}` + names | content |
| `src/games/classic/content/*.js` | prompts, facts, last orders, each `{family:[...], adult:[...]}` | classic |
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
| `src/screens/<id>.js` | box screens: title, create, join, lobby, **menu** (dessert trolley), **results**, sandbox, overlays | box |
| `src/screens/menu-art.js` | the SVG dishes on the trolley (`dish` key per game) | box |
| `src/screens/common.js/.css` | small helpers used by first versions (intro/scores factories, timeline, wait card) | shared; screen owners may inline and diverge |
| `src/screens/index.js` | box screen registry (game screens register through their module) | box |
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

New ctx fields (game box): `game` (the current game's definition or null), `games` (all), `rating` (`'family'|'adult'`), `adult`, and `line(key, vars)` is rating-aware (adult bank first, then the game's `lines`, then the box bank; one variant picked by the phase seed so every phone shows the same one). `mine.game` is free per-phase scratch for a game's optimistic state (`client.act(type, data, mine)`).

### Which screen shows (App.resolveScreen)

Pre-game: `title` / `create` / `join` (local navigation). Once joined: `lobby`, `menu`, `results` for box phases; otherwise the game's `resolveScreen(state)` if it returns an id, else the phase id (Afters Classic swaps `r1-write` -> `r1-wait` and `r2-write` -> `r2-wait`). `reconnect` is an overlay driven by `client.state.status`.

## Landscape (2026-11-09, classic team)

Adam wants every screen to play in landscape too. The contract is small:
- **Test**: `@media (orientation: landscape) and (max-height: 600px)`. The same test sets `body.land` (in `Stage.resize()`) for JS and for `body.land ...` selectors. Shoot it with `node scripts/shoot.mjs --landscape` (844x390).
- **`split` and `input`**: the SHOW layer becomes the **left column** (`var(--land-l)`: 42% in split, 34% in input) and the INPUT sheet becomes a full-height card on the right. The writing strip fills the left column (status, Cyril, then timer and chips). Stage frames Cyril in that column on its own. Your sheet must fit about 390 px high, so compact it or let `.sheet-page` scroll, and keep the primary button visible. Your show-layer cards for split screens sit in the left column above Cyril.
- **`show`**: full width with a slimmer rail (`--rail-h: 58px`). Put your cards on one side (usually the right ~58%). The content-aware framer then puts Cyril in the free side column. Add your own `@media` block in your screen CSS.
- Shared rules live in `src/ui/landscape.css`; screen-specific ones go in each screen's CSS.

## Box phases

`lobby` -> (host: Wheel in the menu) -> `menu` -> host serves a game -> the game's phases -> `results` (via `api.finish`) or the game's own final phase -> host: **Back to the menu** or **Same again**.

- `menu` payload `{night, history, last}`; progress carries `{focus: gameId|null, fancy: {playerId: gameId}}` (host's finger, guests' votes). Messages: `focus`, `fancy`, `choose` (host).
- `results` payload `{gameId, title, rows:[{id, score, rank, cherries}], night:[{id, night, prev, delta, rank, prevRank}]}`, `final: true`.
- **Tonight's table**: each finished game gives cherries by place, `NIGHT_POINTS = [5, 3, 2]`, then 1 each (ties share a place). `players[].night` is the running total. `newTable` clears it.
- New players can join during `lobby`, `menu` and `results`. Phase messages now carry `game` (id or null) and `final`.
- Settings: `{rating: 'family'|'adult', adult: bool (mirror), speakerId}`. The host can switch rating in the lobby or on the menu.

## Afters Classic phases and payloads

Phase ids (in order): `intro, r1-intro, r1-write, (r1-vote, r1-reveal) x N, r1-scores, r2-intro, (r2-write, r2-pick, r2-reveal) x facts, r2-scores, r3-intro, r3-write, r3-swipe, r3-reveal, podium, end`.

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

Messages (client -> host): box: `hello, ping, profile, settings, start, choose, focus, fancy, skip, again, menu, newTable, kick, react, leave`; classic: `submit, vote, pick, swipe`. Host -> client: `welcome, refuse, pong, lobby, phase, progress, ack, reject, react, kick`. `state` snapshots exist as `engine.snapshot()` (not yet broadcast; see gaps).

## How to add a game

Three teams are adding games in parallel. Each team owns **only** `src/games/<id>/` (and the one line already in `src/games/index.js`). If you need a shared change, write it in your report.

**1. The module** - `src/games/<id>/index.js` default-exports a definition:

```js
export default {
  id: 'forehead',                  // folder name; prefix every phase + screen id with it ('forehead-turn')
  title: 'Bonce', dish: 'jelly',   // menu name + dish art key (src/screens/menu-art.js; 'cloche' fallback)
  course: 'A wobbly jelly...', tagline: '...', blurb: '...', tags: ['Acting'], colour: '#E2553B',
  players: [3, 8], minutes: 10,
  createHost: (api) => new MyHost(api),        // host logic (Node-safe: no DOM, no CSS imports)
  screens: () => import('./screens/index.js'), // lazy: default export = array of screen defs
  bot: (b) => { ... return true; },            // how bots/autopilot play a phase (return true if handled)
  demos: { 'forehead-turn': { match: (e) => e.phase.id === 'forehead-turn', me: 'idle', bots: 'some', t: 4000 } },
  lines: { family: { fhGo: [['Variant one'], ['Variant two']] }, adult: { fhGo: [['Ruder one']] } },
  resolveScreen: (state) => null,              // optional: per-phone screen id for a phase
  // comingSoon: true -> menu tile only (the current placeholders); hidden: true -> not on the menu
};
```

**2. Host logic** - an object with `start()`, `advance(phaseId)` (the phase timer ran out, everyone finished, or the host skipped an `*-intro`), `handle(player, msg, {fresh, isHost})` (messages from phones), optional `activeFor(phaseId, connected)` (who must act before the phase ends early), `onLeave(p)`, `onRejoin(p)`, `dispose()`. It talks to phones only through `api`:

| api | |
|---|---|
| `enter(id, ms, payload, {priv, progress, final, active})` | start a phase. `priv(player)` = that phone's private part; `progress()` -> `{done:{id:bool}, counts, ...extra}`; phase ends early once every active player is `done` |
| `progress()`, `ack(p, extra)`, `reject(p, reason)` | re-send progress (+ early end check), acknowledge/refuse a phone's action |
| `players`, `connected`, `player(id)`, `hostPlayer` | raw player objects (`p.score` is THIS game's score, reset at start) |
| `addScores({id: n})` | add to game scores |
| `take(deck, key, n, rng)`, `deck(deck)` | pick from a `{family, adult}` deck by the table's rating, no repeats tonight |
| `clean(text, max)` | trims input; family-safe filter unless the table is Adults 18+ |
| `rating`, `adult`, `settings`, `seed`, `rng`, `sub(salt)`, `dur(ms)`, `now()`, `speed`, `plays`, `history`, `phase`, `seq` | context. Use `dur()` for any timeline offsets you put in payloads |
| `finish(rows)` | **end of game**: `rows=[{id, score}]` -> cherries on tonight's table + the shared `results` screen |
| `record(rows)` + `enter(..., {final: true})` | end on your own final screen instead (Classic does this); give the host `client.toMenu()` / `client.again()` buttons |

**3. Screens** - same contract as above (`id, layout, shot, mount`). Phones send actions with `ctx.client.act('type', {data}, optimisticMine)` (arrives as `handle(p, {type, ...data, seq})`; don't reuse box message names). Read optimistic state from `ctx.mine.game`. Use `ctx.line(key)` for Cyril, `ctx.adult` for copy changes, `ctx.elapsed()` for every timeline. Put CSS next to your screens and scope it (`.fh-...`). Give every tap target a `data-e2e`.

**4. Shared helpers** (`src/shared/`):
- `sensors.js`: `tiltSensor({onTilt})` -> `start()` (call from a tap; asks the iOS motion permission), `calibrate()` once the phone is on the forehead, `'down'` = nod forward (correct), `'up'` = tip back (pass), hysteresis built in; `live` tells you if real samples arrive (else show tap buttons). `vibrate(BUZZ.correct)`, `lockLandscape()` (best effort).
- `drawing.js`: `drawPad({onChange, prompt})` (touch drawing, 8 colours incl. a rubber, 4 sizes, undo, clear) -> `.drawing`; `drawingView(d).frame(t)` replays stroke by stroke as a pure function of `t`. `encodeDrawing`/`decodeDrawing` (validates untrusted data, caps points) and `replayDuration` are in Node-safe `drawing-data.js` for host logic. Coordinates are a 1000x1000 board.
- Try them at `?demo=sandbox`; `node scripts/test-shared.mjs` checks them.

**5. Content** - `src/games/<id>/content/*.js` exporting `{family: [...], adult: [...]}` with stable ids (`api.take` remembers them all night). Adults 18+ = grown-up comedy with **uncensored swearing** (the filter is off; 'fuck', 'shit', 'bollocks' are fine in Cyril's lines and content). It is **not sexual**: no sex acts, no innuendo as the joke, no bedroom or body-part questions (Adam, 2026-11-13). No hate, nothing involving minors, never a real person as the butt of a joke. Famous people and titles are fine as answers in guessing games. Family = the same comedy without the swearing.

**6. Tests** - `node scripts/sim.mjs 4 50 <id>` (Node, bots play your game through the menu), `node scripts/shoot.mjs --screens <demo ids>` and an e2e that clicks `[data-e2e=dish-<id>]` then `[data-e2e=serve-game]` on the menu (see `scripts/e2e.mjs`).

### The example game (`src/games/example/`, ~70 lines)

```js
// host.js
export class ExampleHost {
  constructor(api) { this.api = api; this.round = 0; this.calls = {}; }
  start() { this.round = 0; this._call(); }
  advance(phaseId) {
    if (phaseId === 'example-call') return this._reveal();
    if (this.round + 1 < 3) { this.round += 1; return this._call(); }
    this.api.finish(this.api.players.map((p) => ({ id: p.id, score: p.score })));
  }
  handle(p, msg, { fresh }) {
    if (!fresh || msg.type !== 'call' || this.api.phase.id !== 'example-call') return;
    this.calls[p.id] = msg.side;
    this.api.progress();
  }
  _call() {
    this.calls = {};
    this.api.enter('example-call', 8000, { round: this.round + 1 }, {
      progress: () => ({ done: Object.fromEntries(this.api.players.map((p) => [p.id, !!this.calls[p.id]])), counts: {} }),
    });
  }
  _reveal() {
    const side = this.api.sub('coin')() < 0.5 ? 'heads' : 'tails';
    const deltas = Object.fromEntries(this.api.players.map((p) => [p.id, this.calls[p.id] === side ? 100 : 0]));
    this.api.addScores(deltas);
    this.api.enter('example-reveal', 3000, { side, deltas });
  }
}
// screens/index.js: example-call shows Heads/Tails buttons -> ctx.client.act('call', { side }, { side })
```

## URL parameters

| Param | Effect |
|---|---|
| `?demo=<screen-id>` | jump straight to that screen with bots and seeded content (`menu`, `menu-first`, `menu-adult`, `results`, `sandbox`, every game's `demos`) |
| `&adult=1` | demo table on the Adults 18+ rating |
| `&game=<id>` | which game the autopilot host serves from the menu (default `classic`) |
| `&freeze=1` | pause the engine and pin `ctx.elapsed()` at a good moment (per-screen default in `DEMOS`), or `&t=<ms>` |
| `&seed=<n>` | deterministic content/shuffles |
| `&players=3..8`, `&me=host|guest` | demo table size and whether this phone is the host |
| `?bots=N&autoplay=1` | open a table with N bots on one phone; local player plays itself; host auto-starts |
| `&autopilot=1` | local player plays itself once in-game (used by tests) |
| `&speed=<x>` | divide every duration (tests) |
| `?room=ABCD&name=X` | join screen prefilled (share links) |
| `&transport=local|peer|auto`, `&signal=host:port` | transport selection; `local` bridges tabs with BroadcastChannel; `signal` points PeerJS at a local server |
| `&quality=low|high`, `&nosw=1` | quality tier, skip service worker |
| `&fps=<n>` | cap the render rate (automation defaults to 4 so software GL never queues frames) |

## Tests and harnesses

- `scripts/shoot.mjs` - builds nothing; serves `dist/`, launches Chromium (SwiftShader WebGL), one fresh context per screen, `?demo=<id>&freeze=1&seed=7`, writes `<out>/<id>.png`, prints console errors, and fails a screen whose WebGL frame is blank (`__afters.stats()` reads back the drawing buffer).
- `scripts/e2e.mjs` - starts a local `peer` signalling server and a static server, opens 3 browser contexts (host plays through the real UI; 2 players on autopilot), plays to `end`, checks every phase screen appeared, then "Same again". Fails on any console error.
- `scripts/sim.mjs` - Node-only engine + bots full game (fast logic check).

## Performance rules (DESIGN 3.6)

Pixel ratio capped at 2 with auto step-down (2 -> 1.5 -> 1.25) when frames average > 20 ms (disabled under automation). Render loop stops when the tab is hidden, and runs at 30 fps in `input` layout. No shadow maps, no post-processing; glows are additive sprites, vignette and grain are CSS. Keep new meshes merged or instanced.

## Known gaps (foundation v1, for the polish agents)

- **Host migration** is not implemented. If the host phone drops, other phones show the `reconnect` overlay and retry for 90 s (token reconnect works when the host comes back). `engine.snapshot()` exists but no `state` broadcast or promotion yet.
- **Late reconnect into a running phase** restores the phase and private data, but optimistic `mine` (what you already typed) is not restored.
- **Bubbles** use simple placement (`above` in show layout, `side` elsewhere) and can briefly cover content; they clear after their hold.
- **Podium** framing is rough: Cyril is large on the left and the cake/avatars sit behind the bill. Confetti is CSS, not 3D napkins.
- **Avatar thumbnails** are rendered once offscreen (lobby); chips use flat SVG glyphs.
- **High quality tier** (half-res bloom) is not implemented; auto step-down of pixel ratio is.
- **Music** only plays on the speaker phone after the first tap (browser autoplay rules). The "Speaker" toggle in the lobby cycles through players.
- **Keyboard handling** (`kb-open`, strip collapse to 76 px) is implemented from `visualViewport` but untested on real iOS/Android.
- Bundle is ~830 kB JS (three + peerjs) before gzip (~226 kB gzip); no code splitting yet beyond `demo.js`.
- Under headless SwiftShader the app renders at 4 fps (automation cap); real phones are uncapped.
