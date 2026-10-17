# Roadmap

## v1 (this release)

- 6 regions, 22 skills, 22 lessons + 13 story scenes, 6 bosses.
- Battles, chests, bridges, bosses; wandering monsters for spaced review; "seek trouble".
- Hero creation (4 classes), levels, gold, loot, shop, cosmetics.
- Daily goal, streaks, streak shields.
- Pets: hatch, feed, play, poop, sickness, death, cemetery.
- Multiple profiles, export/import, content preview, tests and CI/CD.

## v1.1 — three new regions

- **Mirrormaze Caves** (distributive law, $7 \times 9 = 7 \times (10 - 1)$), **Beamhook Bay**
  (coordinates → tables → plotting $y = 2x + 3$ with a laser), **Sparkwick Junkyard**
  (electricity intuition and Ohm's law, with a battlebot).
- 16 new skills (38 total), 5 new widgets (`groups`, `area`, `plot`, `circuit`, `pipe`).
- Old saves keep all progress; no migration needed.

## v2 — The Long Count (place value), adaptive practice, the Skill Tree

- A second, darker campaign: **Greyhaven**, **The Ashen Road**, **The Siege of Thornwall**,
  **The Glass Vaults** — 20 new skills from place names to the millions through rounding
  and decimals, 28 lessons and stories, 4 bosses, new foes and scenes.
- Place-value applets: place chart, Reckoning Board (abacus), number lines, a log-scale line,
  rounder, digit shifter, decimal grid. New answer formats: place-value dials, put-in-order,
  tap-the-number-line. New games: Hold the Wall (siege) and Crack the Vault.
- Adaptive runs (struggle adds practice, success trims it), tiers, 273 named atoms, and the
  **Skill Tree** page (tree, graph, report, drills).
- Adventure board as the home screen: continue, bounties, dispatches, filters, time and
  accuracy per region. Per-campaign atlases.
- ~50 trophies with titles; daily bounties and chests; new battle items (ward rune, scout's
  lens, focus tonic, lucky coin), hats, capes and den decor; pet bond, tricks, sleep, bug
  hunt, companions; two new species (Bone Pup, Mimic).
- Save version 2 with a migration; all old progress kept.

## v2.1 — the EQcanvas

- Story problems and equations are worked on a slate instead of answered: drag the story's
  numbers into an equation that is read back in words, get told which pieces are wrong,
  then solve it move by move on both sides (bad moves shown honestly, with undo), work out
  the sums, and check the answer. Worked examples play on the same slate in lessons.
- **To check:** dragging tiles with a finger on a real iPad (tested with a mouse and with
  emulated touch taps only). Watch whether 4–5 taps per one-step equation feels slow at the
  Master tier; if so, consider letting some Master problems skip the slate.

## v3 — three campaigns, ranks, treasures and the Trophy Room

- **Dungeons & Times Tables** (4 regions, 12 skills): arrays, doubling, the nine trick, square
  numbers, splitting hard facts, fact families, table patterns, ×11/×12 and quick facts, with
  a 78-fact **Fact Map**.
- **The Order of Magnitude** (3 regions, 9 skills): the Scale Ladder from atoms to the
  observable universe, units, estimating, crowd counting, Fermi chains, powers of ten and
  scientific-notation estimates, with a **Scale Museum** of cards.
- **The Muddler Strikes Back** (4 regions, 10 skills): negative numbers (balloons and
  sandbags), like terms (the sorter), $x$ on both sides (balance and slate), bracket
  equations, matchstick patterns, fruit puzzles, inequalities.
- 12 mini-games (array, skip jumps, table grid, square grow, chain, Scale Ladder, sampler,
  balloon, sorter, fruit, inequality line, matchsticks) and two new encounter types (duel,
  rescue). The EQcanvas handles $x$-terms with coefficients and collects like terms.
- **Ranks** for every region (Heroic → Legendary → Mythic → Ridiculous), two days apart, with
  twist stories, boss variants, extra nodes and Mistake Hunts.
- **Treasures** (3 per region), **relics** (2 slots), **region trophies** (48), the **Trophy
  Room**, a tabbed Hero page (bag, relics, collections), campaign tabs and "ready to rank up"
  on the board, rank track on region pages.
- Pet: expeditions, bond perks in fights, tricks learned on adventures, hats that sit on heads.
- iPad landscape fights side by side; CSS split per area; encounter screen split up.
- Save version 3 with a migration; all old progress kept (finished regions = rank I).
- **To check on a real iPad:** dragging in the sorter and the Scale Ladder with a finger.

## Next ideas (roughly in priority order)

- Fractions as numbers on a line; fraction ↔ decimal ↔ percentage; ratio.
- More rank twists: hand-written rank 4–5 stories for the regions kids replay most.
- A third Muddler film: quadratics as areas, factorising as un-busting brackets.
- EQcanvas everywhere it fits: Ohm's law ($V = I \times R$ for $R$) and `both-sides` drills.
- Pet evolution visuals per stage.
- The Long Count, part two: multiplying/dividing by multiples of ten, long multiplication
  with estimates as the check.
- Parent view of the Skill Tree report (printable; per-week trends).
- Optional music per region; PWA/offline install for iPad home screen.
- Code-split the bundle per campaign (it is ~1.2 MB before gzip).
- Painted background art layered into scenes.
- Custom domain on `borzov.ca`.
