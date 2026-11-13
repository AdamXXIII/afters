# Something in the Soup - game design

> AI-generated (Claude, Soup team, 2026-11-13). Module `src/games/soup/`. Read the box `DESIGN.md` and `ARCHITECTURE.md` first. Genre: hidden traitors (social deduction). Everything visible is ours.

## Pitch
One or two of you are secretly **Poisoners**. Each day the table plays a small task to grow a shared **pot** (a willow-pattern tureen), argues out loud at the **round table**, and votes someone away. Each **night** every living phone shows the same dark screen and everyone taps a name; only the Poisoners' taps count. At three players left, the **final table**: everyone shares the pot, or you banish again. If a Poisoner is still at the table when everyone shares, the Poisoners take the lot.

How it plays (menu, three panels):
1. One or two of you are secretly Poisoners. The rest are Faithful.
2. By day, grow the pot, argue, then vote someone away from the table.
3. By night, the Poisoners strike. Last ones standing share the pot, unless a Poisoner is among them.

## Players and roles
4-8 players. 1 Poisoner at 4-5, 2 at 6-8. Poisoners see each other on their card. Roles are only ever sent in each phone's private part (`priv`), never in a payload or progress message.

## Phases
| Phase | Layout | Timer | Ends early when |
|---|---|---|---|
| `soup-intro` | show | 13 s (host can skip) | - |
| `soup-roles` | split | 15 s | everyone tapped "Got it" |
| `soup-task` | split | 30 / 35 / 22 s | every living player entered (Parcel always runs its clock) |
| `soup-result` | show | 7.5 s | - |
| `soup-table` | split | 80 s | every living player tapped "Ready to vote" |
| `soup-vote` | split | 22 s | every living player voted |
| `soup-banish` | show | 1.6 s + 1.1 s per vote + 6.6 s | - |
| `soup-night` | split | 16 s | every living player tapped |
| `soup-morning` | show | 9 s | - |
| `soup-final` | split | 22 s | every finalist chose |
| `soup-final-reveal` | show | ~1.3 s per finalist + 6 s | - |
| `soup-end` | show | 16 s | then the box `results` screen |

Flow: intro, roles, then days of task, result, round table, vote, banish, night, morning. After a banish: no Poisoners left, the Faithful win; three or fewer left, the final table; otherwise night. After a morning: three or fewer left, the final table. Final table: all share ends the game; anyone choosing "Banish again" runs another vote and banish, then the final table again while more than two remain.

## Day tasks (rotate; the first one changes with "Same again")
- **Count the ...** (Spoons, Napkins, Candles...): a target of 2n to 3n. Each living player secretly puts in 0-5. Only the total is shown. Exact: +£1,000. One off: +£400. A Poisoner nudges the total quietly.
- **Safe Hands**: each living player privately gets one digit of the code, in seat order. They say it aloud, then everyone types the whole code. Pot grows by £1,000 x the share who typed it right. A Poisoner can say the wrong digit.
- **Pass the Parcel**: the parcel lands on one phone; tap within 2.4 s to pass it on (+£60). Too slow: dropped (-£120, everyone sees who). Tapping when it isn't yours: a fumble (-£40, everyone sees who).

## Twists
- **Shield**: after a task that grew the pot, one contributor privately finds a Shield. It saves them from one poisoning ("Nobody died. A Shield took the poison.").
- **Ghosts**: banished and poisoned players stay at the table as ghosts: they see everything, get "you're a ghost" copy, and get one **Séance** vote per game in a banish vote, shown as "A ghost".
- **The table's hunch**: what the Faithful tap at night is not wasted. If two or more agree on one name (and it isn't the victim), the morning says "3 of you lay awake thinking about Ben."
- **Final table**: share or banish again.

## Night: identical on every phone
The night screen never reads `priv`. Every living phone shows the same heading, the same line ("Everyone taps a name. Only the Poisoners' taps count."), the same list (everyone alive but you), the same tick and the same haptic. If two Poisoners disagree, one of their picks is chosen at random. If no Poisoner taps, a random Faithful is poisoned.

## Scoring
Winners split the pot (rounded to £10). Ghosts on the winning side get a tenth of a share. That score goes to `api.finish` and tonight's cherries.

## Messages (phone -> host)
`sp-seen`, `sp-spoons {n}`, `sp-code {code}`, `sp-pass {n}` (n = hand-off number, stale taps ignored), `sp-point {to|null}`, `sp-ready {on}`, `sp-vote {to}`, `sp-seance {to|null}`, `sp-night {to}`, `sp-final {choice}`.

## Look
The tureen is the pot (willow-blue on bone china, brass label with the amount). Place cards for roles: a willow-pattern back, press and hold to read. Faithful = linen with a sage border; Poisoner = claret with a brass vial. Night: the stage goes to a starry dark, the sheet turns near-black, names on dark cards. Morning: a dawn wash and a stamped portrait. Accents: willow, claret, brass.

## Changes from the roster
- **Recruit** is not built: a Poisoner choosing "recruit" at night would need a control that only Poisoners see, which breaks the identical night screen. The Shield, the Séance, the hunch and the final table give the depth instead.
- The Séance is a ghost vote in the banish vote (once per game), not a separate hint phase.
