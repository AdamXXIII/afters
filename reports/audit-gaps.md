# Afters audit: gaps and next games

AI-generated (lead designer pass, 2026-11-10). Source: blind critic verdicts against the real bar in `reference/bar/` (Jackbox Party Pack 7, Jackbox Naughty Pack, Heads Up!, Psych!, Gartic Phone).

**Do first:** fix host migration and add the audience seat (about 20 hours), then build "Who Had Seconds?" (about 14 hours). Those three close the biggest gaps the critics found.

## 1. Verdict per piece

| Piece | Result | Biggest gap |
|---|---|---|
| Game variety, adult content, replay | **Lost** (blind pick went to the bar) | No hidden-role game. Lying to friends' faces is the best format for adults on a sofa, and Afters has none. |
| Menu, onboarding, joining, settings, accessibility | **Lost** | Hard 3-8 cap with no audience seat, and the host's phone is a single point of failure. Player 9 or a latecomer gets nothing, and one dropped host loses the night. |
| Each existing game (Classic, Bonce, Crossed Wires, Pie Chart) | **Lost** | No "about us" content. Every bluff and poll is about strangers, not the people on the sofa. Thin decks come a close second. |

What the critics did credit: phones-only fits "no TV" exactly, the pick-your-poison deck vote, rule cards, a points table that carries across games, and a warm, original look. Real strengths, but they did not win any piece.

## 2. Gaps by severity

Effort is rough build time in hours for one developer with Claude.

### Critical (5)

1. **No hidden-role or social deduction game.** Fix: build "Who Had Seconds?" (game 1 below). About 14 hours.
2. **No "about us" content.** Fix: add a "Truth Comes Out" deck to Classic round 2 that fills in real player names (about 60 prompts each for family and adult, 6 hours). Then build "Character Witness" (game 2), about 10 hours.
3. **Content runs out in 2-3 nights.** Fix: grow each deck to at least 150 prompts, at least 80 cards per Bonce deck, about 200 adult prompts and 15+ adult Bonce decks. Keep card history on the host phone across nights so a regular group rarely sees repeats. About 15 hours of writing plus 2 hours for history.
4. **Hard 3-8 cap, no audience, late joiners refused.** Fix: add a "Watching" seat with no cap. Spectators use the same code, see the public screens and vote for an audience pick (bonus points). Mid-game joiners watch until the next game, then get a seat. About 9 hours.
5. **Host phone is a single point of failure, and drafts are lost on reconnect.** Fix: send a state snapshot to every phone each phase and hand the host role to the longest-connected player after 15 seconds. Save half-typed answers to sessionStorage per phase. About 12 hours for migration, 1 hour for drafts.

### Major (10)

1. **Adult content is one timid switch.** Fix: 3 tiers (Family / Cheeky / Filthy) with a one-line warning each, plus topic toggles (sex, drink, bodily, exes) and one game only shown at Filthy ("Life Drawing", game 4). About 7 hours, not counting the game.
2. **Nothing to keep or share.** Fix: "Save the chain" GIF or image strip for Crossed Wires (7 hours), an optional front-camera clip of the Bonce guesser's last 10 seconds (7 hours), and a "Hall of Fame" of winners and best moments on the host phone (3 hours).
3. **No player-made content.** Fix: "House specials". The host types up to 20 names, in-jokes or prompts before a game, mixed into Classic and Bonce, and saved for next time. About 6 hours.
4. **No talking or performing game.** Fix: build "Toast" (game 3). About 11 hours.
5. **No onboarding before you commit.** Fix: a 3-panel "How it plays" flip on each hero card (one sentence and one picture per panel, skippable), plus a practice-round toggle for the first game of the night. About 5 hours.
6. **No room tuning.** Fix: a host-only "Table settings" panel with presets (Quick / Standard / Long), time per turn (Relaxed x1.5 / Normal / Fast), rounds (2-5) and scores on/off. Add a per-player "Extra time" toggle under Comfort, which also helps slow typers and dyslexic players. About 6 hours.
7. **No QR join.** Fix: tap the room code to show a full-screen QR of the join link at full brightness, with the 4 letters huge underneath. About 2 hours.
8. **Bonce plays worse than Heads Up!** Small side buttons while the phone is on your forehead. Fix: tilt down for "Got it" and up for "Pass" (buttons stay as a fallback), with a full-screen green or orange flash. About 4 hours. The video clip is in Major 2.
9. **Crossed Wires is a cut-down Gartic Phone.** Fix: fill bucket and redo, raise the cap to 12, and add 2 modes: Knock-Off (copy the last drawing from memory in 10 seconds) and Secret (you can't see the previous step). About 10 hours.
10. **Reveals feel small, and type is small at arm's length.** Fix: a "hero phone" reveal where one phone goes full screen with big type and no chrome, propped up or passed round, while the others only vote. Set a 20pt minimum on vote and reveal screens and collapse the top card during reveals. About 6 hours.

### Minor (8)

1. **Landscape menu is broken.** Tiles overlap the Family/18+ toggle and Serve falls below the fold. Fix: a 2-column landscape layout, or lock the menu to portrait. About 2 hours.
2. **No 2-player or single-phone play.** Fix: Bonce pass-and-play on one phone, and "Two's Company" (game 7). About 4 hours for Bonce.
3. **Thin accessibility.** Fix: an icon and pattern on every game tile and team colour, a high-contrast theme, and phase changes announced in a live region. About 4 hours.
4. **No co-op game.** Fix: build "Washing Up" (game 5). About 9 hours.
5. **Pie Chart is shallow** (about 5.5 minutes, one action per turn). Fix: the dial setter may lie, and the others bet on their honesty as well as higher or lower. About 4 hours.
6. **Classic has no player-written prompts.** Fix: a "write your own prompt" round where the box picks 3 and the table answers them. About 3 hours.
7. **English only.** Fix: say "English only" in the menu meta line for now. Translation is not worth it for Adam's sofa. About 30 minutes.
8. **Copy slips.** The title says "20 minutes" but the card says "15 MIN". The join hint says "no vowels" but the demo code DMMO has an O. Fix both. About 30 minutes.

## 3. Next games to add (ranked)

Every game fills a gap named above. Formats Afters lacks: hidden role, about-us bluffing, performing, adult-only drawing, co-op, big-group audience, 2-player and debate.

### 1. Who Had Seconds? (hidden role, played with bodies)
- **Pitch:** Every phone shows the same secret table task ("touch your nose if you've lied on a dating app"), except one, which says "You had seconds. Blend in." Do three tasks, then everyone points on three.
- **Fills:** Critical 1 (no hidden-role game). It is the bar's flagship adult format and it is all faces and hands, which suits no TV.
- **Closest real game:** Fakin' It All Night Long (Jackbox Naughty Pack).
- **Family / adult:** Family tasks are "point at who'd survive a zombie film". Filthy tasks are "raise a hand if you've had sex in a car".
- **Effort:** About 14 hours.

### 2. Character Witness (bluffing about the people at the table)
- **Pitch:** One player is on trial with a question about themselves ("the first thing you notice on a date"). Everyone else writes a fake in their voice, the table bets on the real one, and the defendant scores for every fake that fools the room.
- **Fills:** Critical 2 (no "about us" game). It reuses the Classic bluff engine.
- **Closest real game:** Psych! "The Truth Comes Out".
- **Family / adult:** Family is "your most-used emoji". Adult is "the worst thing you've said in bed".
- **Effort:** About 10 hours.

### 3. Toast (60-second speech, phones as prompter and heckle pad)
- **Pitch:** One guest gives a 60-second wedding toast to someone on the sofa. Their phone drip-feeds compulsory words and plot twists ("mention their ex", "you're crying now") while everyone else taps applause or heckles, then scores it.
- **Fills:** Major 4 (no talking or performing game). The voice is the show, so no TV is needed.
- **Closest real game:** Talking Points (Jackbox Party Pack 7).
- **Family / adult:** Family is a retirement speech for the dog. Adult is a best-man speech with "the stag do" twists.
- **Effort:** About 11 hours.

### 4. Life Drawing (Filthy tier only)
- **Pitch:** Draw the filthy prompt, then everyone writes a fake title for each drawing and votes for the real one. Shown only at the Filthy tier.
- **Fills:** Major 1 (no game made only for adults). It reuses the Crossed Wires canvas.
- **Closest real game:** Dirty Drawful (Jackbox Naughty Pack).
- **Family / adult:** Adult only by design. "Still Life" could be a tame version later, but don't build it yet.
- **Effort:** About 9 hours.

### 5. Washing Up (co-op against the clock)
- **Pitch:** Each phone shows one piece of a shared rule ("the blue plate goes left of the glass"). The table has 90 seconds to talk the full layout out loud before the candle burns down. Everyone wins or loses together.
- **Fills:** Minor 4 (no co-op game). It is a palate cleanser between competitive games.
- **Closest real game:** The Devils and the Details (Jackbox Party Pack 7).
- **Family / adult:** Family is laying the table. Adult is "tidy the flat before your partner's parents arrive", with mess to hide.
- **Effort:** About 9 hours.

### 6. Peanut Gallery (built for 9+ people)
- **Pitch:** Two players are on stage answering the same prompt, one truthfully and one lying. Everyone else, any number, votes live on who is telling the truth, so a big group or a watching partner is the game itself.
- **Fills:** Critical 4 (hard cap, no audience). It shows off the Watching seat.
- **Closest real game:** The Jackbox audience mode, crossed with Psych!.
- **Family / adult:** Family is "I once met a celebrity". Adult is "I've slept with someone in this postcode".
- **Effort:** About 8 hours, after the audience seat is built.

### 7. Two's Company (2 players, one phone)
- **Pitch:** Pass one phone between you. Each of you secretly predicts the other's answer ("their dream holiday"), and you score streaks of matches.
- **Fills:** Minor 2 (no 2-player or single-phone play). It is good for couples once the guests have gone.
- **Closest real game:** The Newlywed Game, with Heads Up!'s one-device play.
- **Family / adult:** Family is "their guilty-pleasure film". Adult is "their biggest turn-off".
- **Effort:** About 5 hours.

### 8. Hot Plate (2-person debate, table judges)
- **Pitch:** Two players argue a stupid motion ("socks with sandals are fine") for 45 seconds each. Each speaker's phone feeds them a surprise rebuttal halfway, and the table votes on the winner.
- **Fills:** Major 4 as well, with a different shape to Toast (head-to-head, not solo).
- **Closest real game:** Let Me Finish (Jackbox Naughty Pack).
- **Family / adult:** Family is "cats or dogs". Adult is "is it cheating if it's on holiday?".
- **Effort:** About 8 hours. Build it only if Toast lands well, since both are talking games.

## Suggested order
1. Content and safety first: Critical 3, 4 and 5 (about 39 hours).
2. Then games 1 and 2 (about 24 hours).
3. Then the adult tiers plus game 4 (about 16 hours).
4. Then QR, settings and onboarding (about 13 hours).
5. Then the rest, by rank.
