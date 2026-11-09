# AFTERS - Design Bible (single source of truth)

> AI-generated design document (Claude, creative director pass, 2026-11-09). Every build, art, audio and QA agent works from this file. If code and this file disagree, this file wins until it is updated here first.

---

## 0. One-paragraph pitch

**AFTERS** is the party game you play once the plates are cleared. Nobody gets up, nobody finds the remote: everyone already has a phone in their hand. One phone opens a room, everyone else types a 4-letter code, and the show begins *on every phone at once*. The host is **Cyril**, a self-important church candle who has presided over "eleven thousand dinner parties, and survived every one of them, barring the birthday incident." Three courses of comedy follow: **Plate Up** (write the funniest answer, head to head), **Porkies** (bluff a fake answer to a strange-but-true fact) and **Last Orders** (a quickfire finale you swipe through like a dessert trolley). It looks like a candle-lit tablecloth at 10:45pm: warm, rich, a bit tipsy, beautifully lit.

- **Players:** 3-8 (best at 4-6). Fewer than 3 cannot start; more than 8 are refused with a joke ("Table's full. Pull up a pouffe and wait for the next game.").
- **Session length:** ~20 minutes (measured budget per round in section 2).
- **Platform:** installable PWA, iOS Safari 16.4+ and Android Chrome 110+. Portrait only, designed at **390x844 CSS px**, must work 360x740 to 430x932.
- **Original IP rule:** no Jackbox names, characters, art, prompts, phrases, button labels or screen layouts. Genre mechanics (write + vote, bluff + pick) are fine; everything visible is ours.

---

## 1. The host: Cyril Waxley

### 1.1 Personality
- **Who:** a stout, slightly melted ivory church candle. Former maître d' of "a very good restaurant in Harrogate". Theatrical, dry, British, faintly snobbish but secretly delighted by every bad joke.
- **Voice rules:** short lines (max 90 characters per bubble, max 2 bubbles per beat). Understatement over shouting. Never mean to a player, always mean about himself or the situation. Favourite words: "splendid", "steady on", "frankly", "oh dear". He is terrified of draughts, open windows and birthday cakes.
- **Running gags:** (1) any loud reaction makes his flame gutter and he says "Mind the flame." (2) He keeps a wax-drip tally of the night. (3) He refers to the players as "the table".

### 1.2 Look (build with Three.js primitives; total < 6k triangles, 1 draw call for body via merged geometry + 1 for flame + 1 for eyes)
All units in metres; Cyril stands on the table at origin, total height 0.36 including flame.

| Part | Geometry | Size / position | Material |
|---|---|---|---|
| Body | `LatheGeometry` from a profile: slightly wider at base (r 0.085) tapering to r 0.078 at top, top edge rounded with 6 points, 48 segments | height 0.24, y 0 to 0.24 | `MeshStandardMaterial` colour `#F3E6CF` (Beeswax), roughness 0.55, `emissive #FFB866` intensity driven 0.05-0.18 by flame flicker (subsurface fake) |
| Melted top dish | `TorusGeometry(0.07, 0.012, 8, 32)` lying flat, slightly squashed y 0.6 | y 0.238 | same wax, emissive +0.1 |
| Wax drips (x5) | `CapsuleGeometry(0.008-0.012, 0.03-0.07)` stuck on outer surface at angles 20, 95, 160, 230, 300 deg, top flush with rim | from y 0.24 downward | same wax |
| Wick | `CylinderGeometry(0.003, 0.004, 0.025)`, slightly bent (rotate z 8 deg) | y 0.25 | `#2B1D18`, roughness 1 |
| Flame (his "hair" and mood meter) | custom `ShaderMaterial` on a vertically stretched `SphereGeometry(0.03, 16, 12)` scaled (1, 2.1, 1), additive blending, no depth write. Gradient: base `#FFF4D6` -> mid `#FFC86B` -> tip `#E2553B` with alpha falloff. Vertex shader sways the tip with 2 summed sines + simplex noise | y 0.30 | additive. Plus one `Sprite` halo (radial gradient canvas texture 64px) scale 0.22, opacity 0.35 |
| Eyes | two `SphereGeometry(0.014)` whites `#FFFDF7` with `SphereGeometry(0.007)` pupils `#2A1A17`, placed at y 0.17, x +-0.026, pushed 0.074 out on z | front face | whites `MeshBasicMaterial`; pupils track the active speaker/answer card with lerp 0.15 |
| Eyebrows | two `CapsuleGeometry(0.003, 0.018)` rotated to horizontal | y 0.195 | `#7A4A2A` (Toffee). Main acting tool |
| Mouth | a flat `ShapeGeometry` (rounded rect / D shape) on the front at y 0.125, inner colour `#7A1E2C` (Claret). Driven by morph: closed line (scale y 0.08), open (scale y 1), "O" (scale x 0.6, y 0.9), smile (curved shape swap) | front face | `MeshBasicMaterial` |
| Bow tie | two `ConeGeometry(0.018, 0.03, 4)` tips touching + small sphere knot | y 0.09, front | `#7A1E2C` Claret, roughness 0.4 |
| Brass holder | `CylinderGeometry(0.11, 0.12, 0.02, 40)` + `TorusGeometry` rim + small ring handle on the right (`TorusGeometry(0.03, 0.006)`) | y -0.01 | `#C89B3C` (Brass), metalness 0.85, roughness 0.3 |

Cyril owns **one PointLight** (`#FFB866`, intensity 1.6, distance 2.2, decay 2) parented to the flame; its intensity follows the flame flicker. This light is the key light of every scene.

### 1.3 Animations (procedural, all in a `CyrilRig` class with `setMood()` and `say(text)`)
- **Idle (always on):** breathing squash/stretch scale y 1 +- 0.012 at 0.25 Hz with x/z inverse; flame flicker = intensity noise (simplex, 7 Hz, amplitude 12%) and tip sway 1.3 Hz; blink every 2.5-6 s random (eye scale y to 0.1 over 60 ms, back over 90 ms); pupils drift to a random point every 3 s if nothing to look at.
- **Talking:** while a bubble types, mouth cycles open/closed driven by a syllable clock (each vowel in the line = 1 open pulse of 70-110 ms, consonant clusters = closed). Eyebrows lift 2 mm on stressed words (any word in *italics* or ending in "!"). Flame grows 10%. Body leans +-3 deg toward the camera on the first word.
- **Reactions (each 600-1200 ms, then ease back to idle):**
  - `delight`: hop 0.03 m (squash 0.9 on takeoff, stretch 1.08 in air, squash 0.92 on land), flame balloons to 1.6x and turns brighter (`#FFE7A8`), eyes become happy arcs (scale y 0.35, raised), mouth smile.
  - `shock`: flame gutters (shrinks to 0.5x, hue shifts to blue `#8FB8FF` for 250 ms), eyebrows shoot up, mouth "O", body stretch 1.06 then wobble damped spring.
  - `smug`: one eyebrow raised (left only), half-lidded eyes, slow 8 deg tilt, mouth smile offset.
  - `sad`: a new wax drip extends 0.02 m (persistent; this is the "tally"), flame dims 30%, eyebrows tilt inward.
  - `guffaw`: rapid shake +-2 deg at 14 Hz for 500 ms, flame flickers wildly, mouth open.
  - `drumroll`: eyes squeeze shut, body vibrates at 20 Hz amplitude 0.002, flame trembles; ends in a `delight` or `shock` on reveal.
- **Mood colour:** flame tip colour is a state light: gold = calm, tomato = hurry (last 10 s of any timer), blue flash = shock, white-gold = celebration.

### 1.4 Speech bubbles
Cyril's lines render as HTML (not WebGL) bubbles anchored to his screen position (project his head to screen each frame). Typewriter at 38 chars/s, punctuation pauses (comma 120 ms, full stop 260 ms). Tap anywhere on the show layer to finish the line instantly (on the speaker phone only it also skips to the next line). Bubble spec in section 3.4.

### 1.5 Line bank (seed; build agents may add, never in a different voice)
- Title: "Good evening. Do sit. Not you, the cat."
- Create: "A new table! I'll fetch my good holder."
- Lobby waiting: "We need at least three. Two is a date, and I'm not a chaperone."
- Lobby full: "Eight. Splendid. Someone's going to get the wobbly chair."
- Round 1 intro: "Course one: Plate Up. Two of you answer the same question. The table decides who served it better."
- R1 write start: "Write something funny. Or something true. Ideally both."
- Timer 10 s: "Ten seconds. Type like the oven's on fire."
- Timer 3 s: "Pens down. Metaphorically."
- R1 vote start: "Only those who didn't write it may vote. Democracy, but rude."
- R1 clean sweep: "Every single vote. Frankly, a clean plate."
- R1 tie: "A dead heat. I shall pretend I saw it coming."
- R1 no answer: "One of our chefs sent out an empty plate. Bold."
- Round 2 intro: "Course two: Porkies. Every fact you'll see is true. Every answer you'll see is not. Bar one."
- R2 write: "Write a porky so convincing your own nan would believe it."
- R2 too honest: "That's actually the truth. Steady on. Write a lie."
- R2 pick: "Find the real answer. Don't pick your own; I will know."
- R2 fooled many: "You fooled three people. I'm impressed and a bit frightened."
- R2 nobody right: "Not one of you. The truth sits here alone, like me at Christmas."
- Round 3 intro: "Last orders! One question. Write as many answers as you can. Then we swipe."
- R3 swipe: "Right to raise a glass. Left to pass. You've only got five glasses, so pace yourselves."
- R3 toast: "And the toast of the table is..."
- Podium: "Third place. Second place. And our winner, who will now be insufferable."
- End: "Same again? I've got wick for one more."
- Disconnect: "Someone's wandered off to the loo. We'll wait. Briefly."
- Host left: "Oh dear. The person holding the table has gone. Let's move us to someone sensible."

---

## 2. Show flow, rounds, content

### 2.1 Flow
`title` -> `create` (host) or `join` -> `lobby` (name + avatar) -> `intro` (Cyril welcome, 6 s) -> Round 1 Plate Up -> `r1-scores` -> Round 2 Porkies -> `r2-scores` -> Round 3 Last Orders -> `podium` -> `end` (Play again / New table / Home).

**Time budget (6 players):** intro 0:20, R1 6:30, R2 6:30, R3 4:30, podium 1:00 = ~19 min. 8 players ~22 min, 3 players ~14 min.

### 2.2 The dual-layer rule (every phone is TV + controller)
Each phone has two layers stacked:
- **SHOW layer:** full-bleed WebGL stage + HTML overlays (Cyril's bubble, revealed cards, scores). Identical and time-synchronised on every phone (within 80 ms; see 2.7).
- **INPUT layer:** a bottom sheet that is personal to this player (their prompt, their keyboard, their vote buttons).

Three layout modes (`data-layout` on `<body>`):
| Mode | Show layer | Input layer | Used in |
|---|---|---|---|
| `show` | 100% height; a 72 px **reaction rail** at bottom (safe-area aware) | hidden | intros, reveals, scores, podium |
| `split` | top 40% | bottom sheet 60%, radius 28 px top corners | voting, picking, swiping |
| `input` | compact **show strip** 132 px: Cyril's head (rendered in the strip), timer ring, "who's done" chips | sheet fills the rest | writing phases |

When the on-screen keyboard is open (`visualViewport.height` < 0.75 x window height) the show strip collapses to 76 px (timer + chips only, Cyril as a 40 px badge) and the sheet sits directly above the keyboard. Never let the input field be hidden by the keyboard.

**Reaction rail:** 4 buttons, 56x56 px, during `show` phases: **Bread roll** (throw), **Rose** (throw), **Applause**, **Groan**. A tap sends a reaction; every phone shows it: rolls and roses are 3D props tossed from the bottom edge onto the stage in an arc (max 12 alive at once, pooled, 1.2 s life), applause/groan show a small player-coloured emoji-free SVG burst at the sender's chip. Rate limit 1 per 400 ms per player. Reactions never affect score. Cyril reacts to bursts: 5+ groans in 2 s -> `shock` + "Mind the flame."

### 2.3 Round 1 - PLATE UP (head-to-head, write + vote)
**Rules:** Every prompt goes to two players, who each write an answer. Everyone else votes for the one they like more; votes become points.

- **Assignment:** N players, N prompts. Prompt *i* goes to players *i* and *(i+1) mod N* (shuffled seat order). Each player answers exactly 2 prompts, never against the same opponent twice when N >= 4.
- **Phase sequence:**
  1. `r1-intro` (show, 7 s): round card flips in ("Course One - Plate Up"), Cyril explains in 2 bubbles. Skippable by host after 3 s.
  2. `r1-write` (input, **80 s**): sheet shows prompt 1 of 2, a text field (max 60 chars), "Serve it" button; after submit, prompt 2 of 2. Show strip: timer, done chips (a chip gets a gold tick when that player has submitted both). Ends early when everyone has submitted both. Empty answers are auto-filled with "[sent out an empty plate]" and score 0 if they get no votes.
  3. `r1-wait` (input, variable): if you finished early, the sheet shows a waiting card: "Plated. Waiting on: Sam, Priya" + a fidget: tap the plate to spin it (pure fun, haptic tick).
  4. For each matchup (seeded random order):
     - `r1-vote` (split, **15 s**): show layer: Cyril + prompt card in big type, both answers as two cards ("A" left tilted -2 deg, "B" right tilted +2 deg). Input: the two answers as big buttons (full width, min 88 px tall) for voters; for the two authors the sheet says "This is yours. Look innocent." with no buttons. Ends early when all voters have voted. A voter's choice is changeable until the timer ends.
     - `r1-reveal` (show, **7 s** fixed timeline): t0 drumroll; t0.6 s votes fly as player-coloured tokens from each voter's chip into the cards (staggered 90 ms); t2.2 s author names stamp on (rubber-stamp scale 1.6 -> 1, 160 ms, rotation -6 deg); t3.0 s points count up on each card; t3.6 s Cyril reacts (clean plate -> `delight`, tie -> `smug`, empty answer -> `sad`); t5 s cards slide out.
  5. `r1-scores` (show, 8 s): leaderboard (see 3.4) animates rank changes.
- **Scoring:** each matchup is worth **1000 points** split by vote share (winner of 3 of 4 votes gets 750, other 250). **Clean Plate bonus +250** when one answer gets every vote and there are at least 2 voters. If nobody votes, both get 0. If one answer is empty, the other gets 1000 + no bonus. Ties split 500/500.
- **3 players:** 1 voter per matchup (fine). Cyril also casts a **"House vote"** worth half a vote when there is exactly one voter, picked by a seeded random so the reveal is still dramatic; the House vote token is gold with a flame icon.

### 2.4 Round 2 - PORKIES (bluff)
**Rules:** You see a strange but true fact with a blank. Write a believable fake answer; then everyone picks which answer they think is real.

- **Facts per game:** 4 for N <= 5, 3 for N >= 6 (keeps round at ~6.5 min).
- **Phase sequence (per fact):**
  1. `r2-intro` (show, 8 s, first fact only): "Course Two - Porkies" card, Cyril explains in 2 bubbles.
  2. `r2-write` (input, **45 s**): sheet shows the fact with the blank as an underlined gap, text field (max 40 chars), "Tell a porky" button. Show strip: timer + done chips. **Too-honest check:** normalise (lowercase, strip punctuation and leading "a/an/the", collapse spaces, number words to digits) and compare against the answer + aliases with Levenshtein distance <= 1 (or <= 2 if answer length > 8). If it matches, reject with Cyril's "too honest" line, the field shakes, and the player must rewrite. Duplicate porkies (same normalised text) merge into one card that credits both authors.
  3. `r2-pick` (split, **20 s**): show layer: the fact in large type plus all answers as a fanned stack of "place cards". Options = all porkies + the truth + house porkies until there are at least 4 options (for N >= 4 none needed). Input: list of option buttons (64 px tall each, scrolls if > 6), your own porky is greyed with "yours" tag and not tappable. Order shuffled with a shared seed so every phone shows the same order.
  4. `r2-reveal` (show, **3 s per porky + 4 s truth**, max 28 s): porkies are revealed one by one in ascending number of pickers (zero-pick ones are batched in one 2 s beat at the start: "Nobody fell for these."). Each: card lifts, pickers' avatars hop onto it, the author is revealed with "PORKY by Priya +1000", pig-snout stamp. Finally the truth: card turns over in gold foil, "THE TRUTH", pickers' avatars hop on, +1000 each, Cyril `delight` (or `sad` if nobody). Then a one-line Cyril aside about the fact (stored per fact as `aside`).
  5. `r2-scores` (show, 8 s) after the last fact only. Between facts a 2 s "Next fact" wipe.
- **Scoring:** pick the truth **+1000**. Each player who picks your porky **+500** to you. Picking a house porky gives nothing. You cannot pick your own. If you submit nothing, you simply have no card in the options and can still pick.

### 2.5 Round 3 - LAST ORDERS (quickfire write, then swipe)
**Rules:** One prompt for the whole table; write as many short answers as you can in 60 seconds. Then swipe through everyone's anonymous answers: right to raise a glass, left to pass, with only 5 glasses each.

Why it suits phones: rapid-fire typing, then a one-thumb swipe deck, which is the most natural phone gesture there is. It also feels completely different from R1/R2 (volume and speed instead of one perfect answer).

- **Phase sequence:**
  1. `r3-intro` (show, 8 s): "Last Orders" card with a brass bell ring; Cyril explains.
  2. `r3-write` (input, **60 s**): the single prompt at top. Field (max 45 chars) stays focused after each submit (Enter key or "Another!" button): submitted answers drop into a stack of mini tickets below the field (newest on top, little drop animation). Max **4 answers per player**. Field never loses focus, so the keyboard stays up.
  3. `r3-swipe` (split, **4 s per card, auto-advance**, total capped at 80 s): everyone sees a deck of all answers, shuffled, each phone receives the same order but skips its own cards (you see a "yours, skip" flash 0.4 s instead). Swipe right or tap the glass button = Cheers (uses a glass; glass counter of 5 in the corner, glasses visibly empty); left or tap the "Pass" button = pass; no action = pass. When glasses run out, the right swipe is disabled and the card shows "Out of glasses". Show layer: a live "Clink-o-meter" per card is NOT shown (no herd voting); show layer shows Cyril and a progress rail of the deck.
     - If total cards > 20, the deck is a seeded random subset: every player gets at least 2 cards in, rest random, cap 20.
  4. `r3-reveal` (show, ~20 s): top 5 cards are revealed in reverse order (5 to 1): card slides in, glasses clink onto it one by one (one clink SFX per glass, rising pitch), author stamp, points. The #1 gets "TOAST OF THE TABLE" with confetti made of tiny 3D paper napkins and gold foil.
- **Scoring:** each Cheers on your card **+200**. Toast of the Table (most glasses; ties both win) **+1000**. This round can swing the podium; Cyril says so at the intro ("It's all to play for. Mathematically.").

### 2.6 Podium and end
- `podium` (show, ~14 s): the camera dollies down the table; the top 3 players' avatars rise on stacked cake tiers (3rd small tier, 2nd medium, 1st top tier with a candle). Names and scores in large type. Everyone else is listed below with scores on a "bill" (a receipt-style card, perforated edge), each with one comedic award computed from stats (see 2.6.1). Cyril `delight` + final line.
- `end` (split): input sheet shows **Same again** (host only; same players, new content, no repeats), **New table** (host only), **Leave** (everyone). Non-hosts see "Waiting for <host> to pour another round."

#### 2.6.1 Awards (one per player, priority order, no duplicates)
- "Clean Plate" - most clean plate bonuses
- "Silver Tongue" - fooled the most people in Porkies
- "Bloodhound" - found the truth the most
- "Chatterbox" - most Last Orders answers
- "The Diplomat" - most ties
- "Fashionably Late" - submitted last most often
- "Heckler" - most reactions thrown
- "Quietly Brilliant" - fallback for anyone left

### 2.7 Multiplayer and sync rules (needed for the dual-layer show)
- Host phone is authoritative. Every phase message: `{type:'phase', id, seq, startsAt, endsAt, seed, payload}` in **host clock** ms.
- Clients estimate offset with 5 ping/pong samples on join (take the median of the 3 lowest RTTs), refresh every 20 s. All timers and reveal timelines render from `startsAt + offset`, so reveals play in lockstep.
- Late join is refused after the lobby. Reconnect within 90 s restores a player by a `playerToken` in `localStorage`. If the host disconnects for 10 s, the longest-connected player is promoted (state is mirrored to all clients every phase change).
- **Speaker phone:** only the host phone plays music and Cyril's babble by default (8 phones playing music out of sync is awful). Every phone plays its own UI SFX at 60% volume. Lobby toggle "Speaker: <name>" lets the table move it.
- Room codes: 4 letters from `BCDFGHJKLMNPQRSTVWXZ` (no vowels, so no accidental words), avoiding a small blocklist.
- Profanity: a lightweight family-safe filter on names and answers (masks with a cutlery glyph string "++++" ). Toggle "Adult table" in the lobby disables the filter only; content stays family-safe.

### 2.8 Content - Round 1 prompts (48, original, family-safe, British-friendly)
1. The worst thing to say when meeting your partner's parents for the first time
2. A terrible name for a seaside B&B
3. What the satnav says when it has completely given up
4. The most British way to start a riot
5. Rejected flavour of crisps
6. A sign above a shop that would make you keep walking
7. What the pigeons are actually planning
8. The worst possible thing to find inside a Christmas cracker
9. A bad name for a racehorse
10. The real reason the kettle takes so long to boil
11. A new rule that would make Monopoly even longer
12. What your houseplant would say if it could talk
13. An awkward thing to shout during a quiet bit at the theatre
14. The least relaxing spa treatment
15. A suspicious item on a pub menu
16. The worst thing to write on a birthday cake
17. A rejected name for a new chocolate bar
18. What a seagull would put on its CV
19. The worst superpower to get on a Tuesday
20. A strange thing to bring to a picnic
21. What the dog says about you when you leave the room
22. The worst advice a driving instructor could give
23. A camping holiday goes wrong when you hear...
24. A slogan for a terrible new airline
25. The worst thing to say while carving the roast
26. What the Loch Ness Monster does on its day off
27. A tourist attraction nobody asked for
28. The worst possible password
29. A rejected ride at a theme park
30. An unhelpful thing to say to someone doing a jigsaw
31. The secret ingredient that should stay a secret
32. A terrible thing to name a boat
33. What really happens to all the odd socks
34. The worst excuse for being late to your own wedding
35. A fact your nan swears is true
36. A bad thing to hear from the person cutting your hair
37. The least popular episode of a cookery show: "How to cook..."
38. A rubbish item to win at a village fete
39. What the moon thinks about all night
40. A new Olympic event for people who hate exercise
41. The worst thing to find in your pocket at airport security
42. An unconvincing reason to call in sick
43. A motto for the world's laziest knight
44. A thing you should never say to a ghost
45. A very British complaint to the manager of heaven
46. The worst flavour of jelly
47. What the snowman is thinking as the sun comes out
48. The opening line of the most boring autobiography ever written

Demo/bot answers (used by `?demo=` and LocalTransport bots; generic so they fit any prompt, cycle without repeats): "A lukewarm sausage roll", "Gary from accounts", "Three geese in a trench coat", "The vibes are off", "Beige", "A strongly worded letter", "Mild disappointment", "Biscuits, but damp", "My cousin's ferret", "A traffic cone with ambitions", "Soup", "Whatever's in the loft", "Absolutely not, Brenda", "A small cheese", "Tuesday", "Quite a lot of pigeons", "Free parking", "A suspicious amount of glitter", "Grandad's karaoke", "Fourteen spoons".

### 2.9 Content - Round 2 facts (28, all true; blank shown as "_____")
Each fact: `text`, `answer` (shown on the truth card), `aliases` (for the too-honest check), `house` (2 decoy porkies used when options < 4), `aside` (Cyril's line after the reveal).

| # | Fact | Answer | Aliases | House porkies | Cyril's aside |
|---|---|---|---|---|---|
| 1 | Wombats produce poo shaped like _____. | cubes | cube, cubic, dice, squares | tiny hearts; question marks | "Nature, showing off again." |
| 2 | A group of flamingos is called a _____. | flamboyance | a flamboyance | pinkening; fandango | "Fair. They are very extra." |
| 3 | The official national animal of Scotland is the _____. | unicorn | unicorns | haggis; Highland cow | "Chained up on the royal coat of arms, in case it wanders." |
| 4 | An octopus has _____ hearts. | three | 3 | nine; seven | "Three hearts and still no one to text." |
| 5 | In 1386, a court in France put a _____ on trial for murder and dressed it in clothes for the execution. | pig | sow, a pig, hog, swine | goose; donkey | "The Middle Ages were a lot." |
| 6 | Sea otters _____ while they sleep, so they don't drift apart. | hold hands | holding hands, link paws, hold paws | snore in unison; tie knots in seaweed | "I'm not crying, it's the wax." |
| 7 | The University of Oxford is older than the _____ Empire. | Aztec | aztecs | Ottoman; Mughal | "And it's still finishing its essays." |
| 8 | Sharks have existed on Earth for longer than _____. | trees | tree | the Moon; oxygen | "Sharks: older than wood. Think about it." |
| 9 | The shortest war in recorded history, Britain versus Zanzibar in 1896, lasted about _____. | 38 minutes | 38 mins, 40 minutes, 45 minutes, under an hour, 38 | 3 days; 9 hours | "Barely time for a cup of tea." |
| 10 | The dot over a lowercase letter i is called a _____. | tittle | a tittle, tittles | jot; pip | "Say it with a straight face. I dare you." |
| 11 | In the 1830s, ketchup was sold in America as a medicine for _____. | indigestion | upset stomach, diarrhoea, stomach ache, digestion | baldness; heartbreak | "Tomato pills. Doctors hated them." |
| 12 | Fredric Baur, who designed the Pringles tube, had some of his ashes buried in a _____. | Pringles tube | pringles can, pringle tube, crisp tube, pringles | gravy boat; lunchbox | "Once you pop, you really can't stop." |
| 13 | Nintendo was founded in 1889 to make _____. | playing cards | cards, card games, hanafuda | umbrellas; sewing machines | "From cards to plumbers. Quite the career." |
| 14 | The Hundred Years' War actually lasted _____ years. | 116 | one hundred and sixteen | 99; 103 | "Nobody wanted to be the one to call it." |
| 15 | Big Ben isn't the clock tower. It's the name of the _____. | bell | the bell, great bell, the great bell | clock's hour hand; architect's dog | "The tower is called Elizabeth. Keep up." |
| 16 | Wales has roughly three times as many _____ as people. | sheep | sheeps | daffodils; castles | "And they all sing beautifully." |
| 17 | Tug of war was an _____ sport until 1920. | Olympic | olympics, olympic games | army; royal | "Britain won gold. Naturally." |
| 18 | During the Second World War, the young Princess Elizabeth trained as a _____. | mechanic | lorry driver, driver, army mechanic, truck driver, motor mechanic | ballerina; codebreaker | "Could change a tyre. In pearls." |
| 19 | The first fax machine was patented before the invention of the _____. | telephone | phone, telephones | postage stamp; light switch | "1843. Someone was in a hurry to send a form." |
| 20 | Cleopatra lived closer in time to the _____ than to the building of the Great Pyramid. | Moon landing | moon landings, first moon landing, apollo 11 | iPhone; invention of the toaster | "The pyramids were already antiques to her." |
| 21 | Under all that white fur, polar bears have _____ skin. | black | dark, black skin | pink; blue | "Dressed for a funeral underneath. Respect." |
| 22 | A day on Venus is longer than its _____. | year | a year, venus year | winter; century | "Imagine a Monday that long." |
| 23 | Botanically, bananas are berries, but _____ are not. | strawberries | strawberry | blueberries; cranberries | "Strawberries: living a lie in plain sight." |
| 24 | Honey found in ancient Egyptian tombs, thousands of years old, was still _____. | edible | safe to eat, eatable, good to eat | warm; sticky enough to glue a door | "Best before: never." |
| 25 | On hot summer days the Eiffel Tower can grow about 15 _____ taller. | centimetres | cm, centimeters, 15cm | metres; inches of paint | "Iron expands. Unlike my patience." |
| 26 | A lobster's blood turns _____ when it meets oxygen. | blue | light blue, bluish | gold; green | "Blue-blooded. Posher than all of us." |
| 27 | Legend says that if the _____ ever leave the Tower of London, the kingdom will fall. | ravens | raven, the ravens | beefeaters' hats; crown jewels | "There's a Ravenmaster. Real job. I've applied." |
| 28 | Woolly mammoths were still alive when the _____ was being built. | Great Pyramid | pyramids, great pyramid of giza, pyramid of giza | Great Wall of China; Colosseum | "A small herd on an Arctic island. Unbothered." |

(Fact 25 phrasing note: show "about 15 _____ taller" so "centimetres" is the unit gap.)

### 2.10 Content - Round 3 Last Orders prompts (16)
1. Things you should never say while carving the roast
2. Signs the dinner party is going badly
3. Excuses to get out of the washing up
4. Rejected names for a village pub
5. Things the cat is definitely plotting
6. Unpopular new flavours of jelly baby
7. Things you don't want to hear from the pilot
8. Worst things to write in a wedding card
9. New rules that would ruin Christmas Day
10. Things a garden gnome would complain about
11. Terrible things to put in a time capsule
12. Rubbish prizes for winning this game
13. Things you'd say to a ghost who won't leave your kitchen
14. Bad names for a new British coin
15. Rejected baking challenges
16. Things you shouldn't shout in a library

Bots for R3 use 2 answers each from the R1 generic pool.

---

## 3. Art bible

### 3.1 Mood
**"The table at 10:45pm."** Plates cleared, a few crumbs, one glass of red left, candlelight pooling on a linen tablecloth, the warm room fading into darkness at the edges. Rich, warm and cosy; the UI is *light* (cream paper, letterpress, menu cards, place cards) sitting on top of a *warm, low-lit* 3D tabletop. References in spirit: a good restaurant menu, a letterpress invitation, a pub quiz sheet, British willow-pattern china. Not: neon, purple gradients, glassmorphism, sci-fi, generic "AI" glow.

### 3.2 Palette (tokens; use these names in CSS variables `--c-<name>` and in JS `PALETTE.<name>`)
| Token | Hex | Use |
|---|---|---|
| `linen` | `#FBF4EA` | card surfaces, sheet background |
| `tablecloth` | `#F3E6D3` | secondary surfaces, input fields |
| `beeswax` | `#F3E6CF` | Cyril body |
| `crumb` | `#E6D3B8` | borders, dividers, disabled |
| `candle` | `#FFC86B` | highlights, timers, glow |
| `mustard` | `#E0A526` | primary accent, Round 1 colour |
| `brass` | `#C89B3C` | metal, gold foil, podium |
| `tomato` | `#E2553B` | urgency, errors, Round 3 colour |
| `claret` | `#7A1E2C` | primary button, headings accent, Round 2 colour |
| `willow` | `#2F5D7C` | secondary button, links, info |
| `sage` | `#7F9A74` | success, "done" ticks |
| `toffee` | `#7A4A2A` | secondary text on linen |
| `ink` | `#2A1A17` | primary text (warm near-black, never pure black) |
| `mahogany` | `#3B1F18` | 3D room shadows, dark backdrop, `body` background |
| `oak` | `#5A3424` | table wood edges, chairs |

Rules: text on `linen` uses `ink` (contrast 15.5:1) or `toffee` (7.6:1). Text on `claret` uses `linen`. Never put `candle` text on `linen`. Max 3 accent colours per screen.

**Player colours (8, colour-blind safe in pairs, always paired with avatar shape so colour is never the only cue):** `#E2553B` Tomato, `#2F5D7C` Willow, `#E0A526` Mustard, `#7F9A74` Sage, `#B5527E` Damson, `#3E8E8A` Teal Teapot, `#8C5A3C` Gravy, `#5B6ABF` Cornflower.

### 3.3 Typography (all via npm @fontsource; import CSS in `main.js`)
- **Display: Fraunces** - `@fontsource-variable/fraunces/full.css` (family `"Fraunces Variable"`; axes wght 100-900, opsz 9-144, SOFT 0-100, WONK 0-1). Use for titles, prompts, round cards, scores. Settings: `font-variation-settings: "SOFT" 100, "WONK" 1` for titles (soft, characterful), `"SOFT" 50, "WONK" 0` for prompts (readable).
- **UI / body: Bricolage Grotesque** - `@fontsource-variable/bricolage-grotesque` (family `"Bricolage Grotesque Variable"`, wght 200-800, wdth 75-100). Buttons, labels, chips, body copy, timers (with `font-variant-numeric: tabular-nums`).
- **Player handwriting: Caveat** - `@fontsource-variable/caveat` (family `"Caveat Variable"`, wght 400-700). Used ONLY for player-written answers on reveal cards, so their words feel handwritten on a place card.

| Style | Family | Size / line-height | Weight | Notes |
|---|---|---|---|---|
| `title-xl` (logo, podium winner) | Fraunces | 64/60 | 800 | SOFT 100, WONK 1, letter-spacing -0.02em |
| `round-card` | Fraunces | 44/46 | 700 italic for "Course One" eyebrow, 800 for name | |
| `prompt` | Fraunces | 28/34 (min 22 when text > 70 chars; auto-fit) | 600 | opsz 48 |
| `answer` | Caveat | 34/36 (auto-fit down to 24) | 600 | ink on linen card |
| `heading` | Bricolage | 22/28 | 700 | |
| `body` | Bricolage | 17/24 | 450 | never below 16 (avoids iOS zoom on inputs) |
| `button` | Bricolage | 19/24 | 700 | letter-spacing 0.01em, no all-caps except `eyebrow` |
| `eyebrow` | Bricolage | 13/16 | 700 | uppercase, letter-spacing 0.12em, `toffee` |
| `timer` | Bricolage | 30/30 | 800 | tabular nums |
| `room-code` | Fraunces | 56/56 | 900 | letter-spacing 0.18em, WONK 0 |

### 3.4 UI components
Global: border radius scale 10 / 16 / 22 / 28 / 999. Shadow scale (warm, never grey):
- `sh-1`: `0 1px 0 rgba(42,26,23,.08), 0 2px 6px rgba(59,31,24,.12)`
- `sh-2`: `0 2px 0 rgba(42,26,23,.10), 0 8px 20px rgba(59,31,24,.20)`
- `sh-3`: `0 3px 0 rgba(42,26,23,.12), 0 18px 40px rgba(59,31,24,.32)`
Paper texture: every `linen` surface gets a 2% opacity procedural noise (CSS SVG `feTurbulence` data URI, baseFrequency 0.9) so it reads as card stock, not flat plastic.

- **Primary button** (`.btn-primary`): height 60 px, min width 200, radius 999, fill `claret`, text `linen` `button` style, inner top highlight `inset 0 1px 0 rgba(255,255,255,.18)`, bottom "lip" `0 4px 0 #561320` + `sh-2`. States: hover (desktop only) brightness 1.06; **pressed** translateY(3px), lip shrinks to 1 px, 80 ms, haptic `tap`; disabled fill `crumb`, text `toffee` 60%, no lip; loading: label replaced by 3 bouncing dots. Full-width on phones inside the sheet with 20 px side gutter.
- **Secondary button**: same geometry, fill `linen`, 2 px border `willow`, text `willow`, lip `#21445C`.
- **Ghost button**: text only, `toffee`, 48 px tall hit area, underline on press.
- **Choice button** (vote/pick lists): min height 72 px (R1: 88), radius 22, fill `linen`, border 2 px `crumb`, `answer`-adjacent text in Bricolage 19/24 600, left 6 px stripe in round colour. Selected: border 3 px round colour, fill round colour at 12%, a brass tick badge 28 px pops in top-right (scale 0 -> 1.15 -> 1, 220 ms spring). Your own option: dashed border, 55% opacity, "yours" eyebrow tag.
- **Cards** (prompt / answer / place card): radius 16, fill `linen`, `sh-2`, 1 px inner border `rgba(122,74,42,.12)`, padding 20. Answer cards on the show layer are "place cards": a folded tent shape (a 6 px darker band at the top edge and a subtle centre crease gradient), random tilt -3..+3 deg (seeded so all phones match).
- **Round card** (intros): 320x420, radius 22, fill round colour, linen text, a 3 px inset linen hairline frame 10 px from the edge (menu-card look), eyebrow "COURSE ONE", title, 2-line rules in Bricolage 17/24.
- **Timer**: ring 64 px (strip) / 96 px (show), 6 px stroke, track `crumb`, progress `mustard`, last 10 s `tomato` and the ring pulses (scale 1 -> 1.06 each second, 120 ms), number in `timer` style. Last 3 s: tick SFX + haptic `tick` each second. A drawn candle-stub icon in the centre burns down with the ring (SVG rect height).
- **Player chip**: height 44, radius 999, avatar bubble 36 px (player colour fill + white avatar icon SVG) + name (Bricolage 15/18 700, max 10 chars, ellipsis). States: `waiting` (60% opacity, 3-dot typing indicator), `done` (sage ring + tick), `disconnected` (greyscale + plug icon), `host` (tiny brass crown), `speaker` (tiny speaker glyph). Chips row is horizontally scrollable if > 6, snap.
- **Text input**: height 64 (single line) / auto-grow to 3 lines, radius 16, fill `tablecloth`, 2 px border `crumb`, focus border `mustard` + 4 px `rgba(224,165,38,.25)` ring, font Bricolage 20/26 (>= 16 to stop iOS zoom), char counter bottom-right `toffee` 13 px turning `tomato` at 90%. `enterkeyhint="send"`, `autocapitalize="sentences"`, `autocomplete="off"`. Error: shake (x +-8 px, 3 cycles, 300 ms) + `tomato` border + Cyril line.
- **Speech bubble**: max width 280, radius 22 with a tail pointing at Cyril, fill `linen`, `sh-2`, text Bricolage 18/24 500 `ink`; key words in Fraunces italic. Enter: scale 0.85 -> 1 from the tail origin, 260 ms `ease-out-back`.
- **Leaderboard row**: 56 px, rank number in Fraunces 24 800, chip, score right-aligned tabular; rows FLIP-animate to new positions (420 ms `ease-in-out-quint`), score counts up (600 ms), a "+750" delta flag slides in from the right in `sage`.
- **Bottom sheet**: radius 28 top, fill `linen` + paper noise, `sh-3`, a 40x5 px `crumb` grabber (decorative), padding 20 px sides, bottom padding `max(20px, env(safe-area-inset-bottom))`.
- **Room code display**: 4 letter tiles 64x76 px, radius 12, fill `linen`, `sh-2`, letters `room-code` style in `claret`, slight alternating tilt; tap to copy, plus a "Share" button using `navigator.share` with a URL `?room=ABCD`.
- **Toasts / errors**: top, below safe area, `ink` fill, `linen` text, radius 16, auto-dismiss 3 s. Errors are plain: what happened, then the fix ("Lost connection. Reconnecting... (tap to retry)").

Touch targets: minimum 48x48 px, primary actions 60 px tall, all primary actions in the bottom 45% of the screen (thumb zone). Safe areas via `env(safe-area-inset-*)` everywhere. `viewport-fit=cover`.

### 3.5 Avatars (8, each a 3D after-dinner object + matching flat SVG icon for chips)
Each is < 1.5k triangles, built from primitives, in the player's colour as the accent, with two dot eyes (same style as Cyril's pupils) so they read as characters. Idle: gentle bob 0.5 Hz, phase offset per player.
1. **Jelly** - `LatheGeometry` fluted dome; wobble via vertex shader (sine on y); translucent `MeshPhysicalMaterial` transmission 0 (cheap: opacity 0.85, high specular).
2. **Sprout** - sphere with 5 overlapping squashed sphere "leaves", sage-tinted.
3. **Teacup** - lathe cup + torus handle + saucer cylinder.
4. **Cheese Wedge** - extruded triangle with 4 hole indents (small spheres, darker).
5. **Pepper Mill** - lathe profile + small sphere knob, wood + accent band.
6. **Pudding** - sphere with dark top, white "custard" drip cap (lathe), sprig of holly (2 flat leaves + 3 red berries).
7. **Egg** - egg in an egg cup (scaled sphere + lathe cup), with a tiny knitted cosy band (torus in accent colour).
8. **Bourbon** - rounded box biscuit with 6 dimples, two layers with cream between.
Player picks avatar + name in the lobby; avatar is unique per room (taken ones dimmed). Player colour is assigned with the avatar (fixed pairing, list order above = colour order in 3.2).

### 3.6 3D stage per screen
One persistent `Stage` scene. Screens change camera, props visibility and light mood, never reload.
- **Scene contents:** a round dining table (`CylinderGeometry` r 1.2, wood `oak` top under a linen tablecloth: a `CylinderGeometry` r 1.28 with a subdivided skirt edge displaced with sine folds, fabric `MeshStandardMaterial` `#F3E6D3` roughness 0.95 with a procedural weave normal map from a 256 px canvas). Props (instanced where repeated): 2 wine glasses (lathe, `MeshPhysicalMaterial` with low-cost settings: transmission off, opacity 0.35, high specular, one with claret wine), a cheese board with 3 wedges, 1 willow-pattern plate (canvas texture drawn procedurally: blue rim pattern + tree silhouette), cutlery, ~40 crumbs (one InstancedMesh), napkin (folded plane). Background: darkness falling off to `mahogany` via scene fog (`FogExp2`, colour `#3B1F18`, density 0.35) and a large back-plane with a soft radial gradient (warm wall, hint of a framed picture and a window with night blue `#1B2A3A` and a single star). Chairs: 8 silhouettes at the table edge, each player's avatar sits at their place.
- **Lighting:** Key = Cyril's candle PointLight (see 1.2). Fill = `HemisphereLight` sky `#FFD9A8` ground `#3B1F18` intensity 0.35. Rim = one `DirectionalLight` `#9FB6D9` (cool moonlight from the window) intensity 0.25 for edge separation. Shadows: **no realtime shadow maps**; use blob shadows (one radial-gradient plane under each prop/avatar, 1 InstancedMesh). Renderer: `ACESFilmicToneMapping`, exposure 1.05, `SRGBColorSpace`, antialias true at DPR <= 2.
- **Post-processing budget:** none by default (EffectComposer is too expensive on mid phones). Fakes: additive sprite glows on flames, CSS vignette overlay (radial gradient to `rgba(59,31,24,.55)` at edges), CSS film grain (animated noise SVG at 3% opacity, `mix-blend-mode: overlay`), warm colour grading baked in materials. Optional "High" quality tier (auto-enabled when the first 120 frames average < 10 ms frame time): `UnrealBloomPass` at half resolution, strength 0.45, threshold 0.85.
- **Camera per screen** (PerspectiveCamera fov 40 portrait; positions given as [x,y,z] looking at target):
  - `title`: [0, 0.55, 1.1] -> target [0, 0.22, 0]; slow orbit +-6 deg over 14 s; Cyril centre, logo above in HTML.
  - `create`/`join`: dolly in to [0, 0.42, 0.75], Cyril on the left third (target [0.12, 0.2, 0]).
  - `lobby`: high angle [0, 1.6, 1.4] -> table centre; each joined player's avatar drops into its chair with a bounce.
  - intros/round cards: [0, 0.4, 0.8] tight on Cyril; round card in HTML front.
  - writing (`input` layout): the show strip renders a separate 132 px tall viewport (scissor) of Cyril's head [0, 0.2, 0.42]; rest of the stage hidden by the sheet (render at reduced rate 30 fps in this mode).
  - voting/picking (`split`): [0, 0.7, 1.0], cards in HTML over the top 40%.
  - reveals: [0, 0.5, 0.9] with small camera shake on stamps (amplitude 0.004, 150 ms).
  - `podium`: dolly from [0, 0.6, 1.4] to [0, 0.35, 0.7] over 3 s; a 3-tier cake (3 cylinders, icing drip lathe, a small candle on top that is Cyril's "cousin") rises from the table centre.
- **Performance budget:** <= 60 draw calls, <= 150k triangles, <= 6 materials that need per-frame updates, textures <= 512 px procedurally generated at startup, `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`, render loop stops on `visibilitychange` hidden and when the tab is idle in `input` layout behind the keyboard (strip only). Target 60 fps on a 2021 mid-range Android (e.g. Pixel 5a class); auto quality step-down (DPR 2 -> 1.5 -> 1.25) if average frame time > 20 ms over 2 s.

### 3.7 Motion language
- **Easing tokens** (CSS variables + JS equivalents):
  - `ease-out-quint` `cubic-bezier(.22,1,.36,1)` - default entrances
  - `ease-in-quint` `cubic-bezier(.64,0,.78,0)` - exits
  - `ease-in-out-quint` `cubic-bezier(.83,0,.17,1)` - camera moves, reorders
  - `ease-out-back` `cubic-bezier(.34,1.56,.64,1)` - pops, bubbles, ticks
  - spring for physical props: stiffness 260, damping 18 (JS)
- **Durations:** micro (press, tick) 80-140 ms; small (chip, bubble, toast) 220-280 ms; medium (card, sheet) 360-420 ms; large (round card, camera) 600-900 ms. Nothing in the UI over 900 ms except camera dollies (up to 3 s).
- **Entrance choreography:** show layer first (Cyril reacts / camera moves, 0 ms), then the prompt card (120 ms later, slide up 24 px + fade, 380 ms), then the input sheet (240 ms later, slides up from below 100%, 420 ms `ease-out-quint`), then buttons stagger 50 ms each. Exit is the reverse at 70% duration with `ease-in-quint`. Never animate more than 3 groups at once.
- **Juice rules:** every score change counts up; every stamp has a camera nudge + haptic; every submit sends something visible flying (your answer card flips and slides up into the show strip); every list reorders with FLIP, never jumps.
- **Reduced motion** (`prefers-reduced-motion`): camera moves become cuts with 200 ms crossfades, no shake, no confetti, bob and flicker amplitudes halved. All information still delivered.

### 3.8 Haptics (`navigator.vibrate`, Android; wrapped in `haptic(name)`)
| Name | Pattern (ms) | When |
|---|---|---|
| `tap` | `[8]` | any button press |
| `select` | `[12]` | choosing a vote/pick option |
| `submit` | `[18, 40, 12]` | answer sent |
| `tick` | `[6]` | each of the last 3 timer seconds |
| `stamp` | `[30]` | author/points stamp on reveal |
| `win` | `[20, 60, 20, 60, 60]` | your answer wins / you find the truth |
| `fooled` | `[50, 30, 50]` | someone fell for your porky (fires on the author's phone) |
| `error` | `[40, 40, 40]` | rejected input |
iOS Safari has no `navigator.vibrate`; there is no fallback required (feature-detect, never error). Optional iOS 18+ trick: toggling a hidden `<input type="checkbox" switch>` via its `<label>` inside a user gesture gives a light system haptic; implement behind a capability check for `tap` and `submit` only.

### 3.9 Sound design (all synthesized in WebAudio; one `AudioContext` unlocked on first tap; master bus -> `DynamicsCompressor` (threshold -18 dB, ratio 4) -> destination)
Volumes relative to master 1.0. Music only on the speaker phone; SFX on every phone.
- **Music bed "Late Supper"** (loop, 92 BPM, swing 58%): Rhodes-ish electric piano = FM pair (carrier sine, modulator sine ratio 1:14 at low index 0.8 decaying over 1.2 s for the bell attack + a second modulator 1:1 index 1.5) playing a ii-V-I-vi in F major (Gm9 - C13 - Fmaj9 - Dm9), 2 bars each; upright bass = triangle + sine sub, lowpass 600 Hz, short pluck envelope (A 5 ms, D 250 ms, S 0.3), walking quarter notes; brushed snare = white noise -> bandpass 3 kHz Q 0.7, long swishy envelope on 2 and 4 + soft ticks; ride = noise -> highpass 7 kHz, very short, 30% volume. Master music level 0.32, ducks to 0.18 under Cyril babble and during reveals (sidechain-style gain automation, 120 ms). Intensity layers: writing phases add a ticking shaker (noise 8 kHz, 16ths); last 10 s raises the bass to the dominant pedal note and adds a heartbeat kick (sine 55 Hz pitch-drop from 120 Hz, 140 ms).
- **Cyril babble:** per syllable (from the talking syllable clock), a short "mumble" grain: two formant bandpass filters (F1 600-800 Hz, F2 1000-1600 Hz random per syllable) on a sawtooth at 140 Hz with +-30 Hz random pitch, 60-110 ms, A 8 ms R 40 ms, level 0.22. Questions end with a pitch rise of 3 semitones. Never real speech.
- **UI tap:** sine 880 Hz -> 660 Hz over 40 ms + 2 kHz click (noise 5 ms), level 0.25. Two variants (pitch +-2 semitones) randomised.
- **Submit "plated":** porcelain clink = 3 sines at 2093, 3136, 4186 Hz with fast exponential decay (D 0.6 s, 0.4 s, 0.25 s) + a soft wood thump (sine 180 Hz, 60 ms), level 0.4.
- **Vote select:** soft "pop" = sine 520 Hz with pitch up to 780 Hz in 60 ms, level 0.3.
- **Timer tick (last 3 s):** woodblock = sine 1200 Hz, bandpass Q 8, 50 ms decay; the last one (0) is a lower 600 Hz knock + a short cymbal noise burst.
- **Drumroll:** snare noise (bandpass 2.5 kHz) retriggered at 22 Hz with rising gain over the drumroll duration, ending on a crash (noise highpass 4 kHz, D 1.2 s) synced to the reveal stamp.
- **Stamp:** low thud sine 90 Hz pitch-drop + paper slap (noise lowpass 1.5 kHz, 40 ms), level 0.5.
- **Points count-up:** rapid soft ticks (sine 1500 Hz, 15 ms) at 25/s, pitch rising 1 semitone every 4 ticks, ending in a bright "ding" (sine 1760 + 2637 Hz, D 0.5 s).
- **Clean Plate / Toast sting:** brass fanfare: 3 detuned sawtooths (+-7 cents) through lowpass 2.4 kHz with filter envelope, notes F4-A4-C5-F5 (110 ms each, last held 600 ms), plus glass clinks.
- **Porky reveal:** comedic "oink" = sawtooth 220 Hz with fast vibrato 25 Hz depth 40 Hz, formant bandpass 900 Hz, pitch bend down 4 semitones, 280 ms.
- **Truth reveal:** warm major chord swell (Fmaj9 on the EP patch) + celesta sparkle (sines 2-4 kHz random arpeggio, 8 notes).
- **Glass clink (R3 cheers):** 2 sines 2400 Hz and 3600 Hz +-3% random, D 0.8 s, each successive clink +1 semitone.
- **Swipe:** whoosh = noise -> bandpass sweeping 600 Hz -> 2.5 kHz (right) or 2.5 kHz -> 600 Hz (left) over 180 ms.
- **Reaction throw (bread roll):** soft "fwump" (noise lowpass 400 Hz, 80 ms) on land; rose = paper flutter (noise bandpass 3 kHz amplitude-modulated at 30 Hz, 200 ms).
- **Join chime (lobby):** two-note doorbell F5 -> D5 on the EP patch.
- **Error:** two descending soft square notes A3 -> F3, 90 ms each, lowpass 1.2 kHz, level 0.25.
- **Round start bell (R3 "Last Orders"):** pub bell = 4 inharmonic sines (ratios 1, 2.76, 5.4, 8.93 at base 520 Hz), D 2.2 s, struck twice.
Settings: Music on/off, SFX on/off, all persisted in `localStorage`. Audio pauses on `visibilitychange`.

---

## 4. Screen list (IDs used for `?demo=<id>`)
Each demo ID boots the game into that exact state with LocalTransport bots (default 5 players: you + 4 bots; `&players=3..8`, `&me=host|guest`) and seeded content (`&seed=`). `&freeze=1` stops timers for screenshots.

| ID | Layout | Show layer | Input layer |
|---|---|---|---|
| `title` | show | Orbiting table, Cyril idle, logo "AFTERS" (Fraunces 800, SOFT 100; the first "A" has a small animated flame above its apex), tagline "A party game for after dinner." | Two buttons in thumb zone: **Start a table** (primary), **Join a table** (secondary). Settings gear top-right. |
| `create` | split | Cyril says create line, camera dolly | Name field + "Open the table" |
| `join` | split | Cyril beckons | 4 large letter boxes (auto-advance, uppercase, paste-aware), name field, "Take a seat". Prefilled from `?room=` |
| `lobby` | split | Table from above, avatars drop into chairs, room code tiles large at top | Avatar picker (2x4 grid of 3D-rendered avatar thumbnails, 80 px), name edit, player list chips; host sees **Start the show** (enabled at 3+), "Adult table" + "Speaker" toggles |
| `intro` | show | Cyril welcome, 2 bubbles | reaction rail |
| `r1-intro` | show | Round card "Course One - Plate Up" | reaction rail |
| `r1-write` | input | strip: Cyril head, timer, done chips | prompt card "1 of 2", field, **Serve it** |
| `r1-wait` | input | same strip | "Plated. Waiting on: ..." + spin-the-plate fidget |
| `r1-vote` | split | prompt + A/B place cards | two choice buttons (authors: "This is yours. Look innocent.") |
| `r1-reveal` | show | votes fly, stamps, points | reaction rail |
| `r1-scores` | show | leaderboard | reaction rail |
| `r2-intro` | show | Round card "Course Two - Porkies" | reaction rail |
| `r2-write` | input | strip | fact card with blank, field, **Tell a porky** |
| `r2-wait` | input | strip | "Porky told. Keep a straight face." + fidget |
| `r2-pick` | split | fact + fanned options | option list |
| `r2-reveal` | show | porkies then truth | reaction rail |
| `r2-scores` | show | leaderboard | reaction rail |
| `r3-intro` | show | Round card "Last Orders" + bell | reaction rail |
| `r3-write` | input | strip | prompt, field (stays focused), ticket stack, **Another!** |
| `r3-swipe` | split | Cyril + deck progress | swipe card deck + Pass / Cheers buttons + glasses counter |
| `r3-reveal` | show | top 5 countdown, Toast of the Table | reaction rail |
| `podium` | show | cake-tier podium, bill with awards | reaction rail |
| `end` | split | table, Cyril end line | Same again / New table / Leave |
| `reconnect` | show (overlay) | dimmed stage, Cyril "wandered off" line | "Reconnecting..." + Retry |
| `settings` | sheet over anything | - | Music, SFX, Haptics, Reduced motion, Text size (100/115/130%), Leave table |

---

## 5. The quality bar (what makes the best party games look AAA, and how AFTERS beats it in its own style)

| What the genre leader does well | How AFTERS meets or beats it, in its own way |
|---|---|
| **Bold, flat-colour art direction** with one strong idea per game | One idea: *the candle-lit dinner table*. Every surface is a real object from that table (menu cards, place cards, willow plate, brass, tablecloth). Light UI paper on a warm 3D scene, a strict 15-token palette, no stray colours. |
| **A characterful host with a voice** | Cyril: a fully animated 3D candle whose flame is his mood meter, with a consistent dry British voice, 1-line jokes in every state, babble audio and running gags (the drip tally). He reacts to the table's live reactions, which a TV host can't. |
| **Juicy animation** (things bounce, stamp, fly) | Section 3.7 juice rules: every submit flies, every score counts up, every stamp shakes the camera and buzzes the phone, reorders FLIP. Real-time 3D props (thrown bread rolls) instead of 2D sprites. Haptics, which a TV can never do. |
| **Strong typography hierarchy** | Three families with fixed jobs: Fraunces (the show's voice), Bricolage (the interface), Caveat (the players' handwriting). Strict type scale, auto-fit for long prompts, nothing under 16 px. |
| **Comedic copy everywhere** (loading, errors, buttons) | No neutral copy: buttons say "Serve it", "Tell a porky", "Take a seat", "Same again"; errors and waits have Cyril lines; awards on the bill. Every string goes through Cyril's voice rules (1.1). |
| **Clear state at all times** (whose turn, how long, what to do) | Every screen has the timer ring + done chips + a single primary action in the thumb zone. The sheet always says what *you* do now; the show layer says what *the table* is doing. Test: a player who looks up from their drink can tell the phase in 1 second. |
| **Big screen as a shared focal point** | We have no TV, so the shared moment is *synchronised* across every phone (host-clock timelines), so the table gasps together; music lives on one speaker phone so it feels like one room, not 8 radios. |
| **Content quality** (prompts that are actually funny) | Original, British, family-safe prompts written for this table (section 2.8-2.10), facts verified as true with Cyril asides, no repeats in "Same again". |

**Blind-comparison checklist (QA critics use this, scored 1-10 each; ship bar is 9+ on all):** art direction coherence, host charm, motion juice, type hierarchy, copy wit, state clarity, performance smoothness (no dropped frames visible), one-handed usability, readability at arm's length (~50 cm), polish details (paper texture, shadows, safe areas, loading states, empty states, error states).

---

## 6. Engineering contracts (short, so agents build compatible pieces)
- **Structure:** `index.html`, `src/main.js`, `src/net/` (`Transport.js` interface: `connect(code)`, `send(msg, to?)`, `onMessage(fn)`, `onPeer(fn)`, `close()`; `PeerTransport.js` (PeerJS, peer id = `afters-<CODE>-host`), `LocalTransport.js` (in-memory bus + bots)), `src/game/` (`HostEngine.js` pure state machine with injected clock + RNG, `content.js` from section 2), `src/stage/` (Three.js: `Stage.js`, `Cyril.js`, `avatars.js`, `props.js`), `src/ui/` (one module per screen ID, `components.css`, `tokens.css`), `src/audio/` (`synth.js`, `music.js`), `public/manifest.webmanifest` + icons (SVG candle on `claret`, generated PNGs 192/512 at build time from SVG), `sw.js` (cache app shell; offline Local demo works).
- **Message types:** `hello`, `welcome`, `ping`/`pong`, `lobby`, `phase`, `submit`, `vote`, `pick`, `swipe`, `react`, `kick`, `state` (full snapshot for reconnect/host migration).
- **Determinism:** all shuffles and tilts use a seeded RNG (mulberry32) from `phase.seed`, so every phone draws the same layout.
- **Text:** British English everywhere ("colour", "favourite", "centimetres").
- `.gitignore` contains `node_modules` and `dist`.
