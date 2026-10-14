# Game design

How the game layer works: the world, the loop, the economy, the pet. Numbers live in code
(linked below) so they can be tuned in one place.

## Story & world

There are two **campaigns** (`content/campaigns.yaml`): the bright, silly *Muddled Kingdom*
(algebra, regions 1–9) and the grim *Long Count* (place value, regions 10–13). A region's
`campaign` sets its card, map and feedback voice.

### The Muddled Kingdom

The Kingdom of Smashdash has been "muddled": the **Muddler**, a pompous fog wizard, stuffed every
number into a box. The player is a new hero guided by **Grimble**, the former Royal
Mathematician, cursed into a sarcastic frog (monocle, mortarboard, eats flies). Every region has
its own characters, a story intro, lessons, encounters, a boss and an outro.

| Region | Scene | Topic | Guide | Boss |
| --- | --- | --- | --- | --- |
| Bramblebottom | sunset village | expressions | Mayor Plumpkin | Grub the Unboxable |
| Ironhold | dwarven forge | the balance | Brokka Ironbeard | Tipsy the Troll |
| Gloomfen Marsh | moonlit swamp | one-step equations | Old Ma Nettle | King Slurp (Grimble's toad rival) |
| Dragonspine Peaks | aurora mountains | two-step equations | Snowbert the Yeti | Smolderbutt the dragon |
| Bazaar of Whispers | night market | story problems | Ptolemeow the Sphinx | **The Muddler** |
| Tower of Tens | starry wizard tower | powers of ten | Professor Zoomwhistle | Gigantus Minimus |
| Mirrormaze Caves | crystal mirror cave | distributive law, mental maths | Lefty & Righty (two-headed ogre) | Halfcopy the Imp |
| Beamhook Bay | sunset lighthouse | coordinates & straight-line graphs | Captain Polly Gon (pirate parrot) | Inkbert the Kraken |
| Sparkwick Junkyard | stormy scrapyard | electricity & Ohm's law | Sprocket (goblin bot-builder), Little Zap (a baby electron) | Clankenstein (the Muddler's battlebot) |

The Tower of Tens, Mirrormaze Caves and Beamhook Bay open right after Bramblebottom, so kids
can alternate between the equations arc and the side arcs. The Sparkwick Junkyard opens after
Gloomfen Marsh, because Ohm's law is solved as a one-step equation. Players with older saves
keep all their progress; the new regions simply appear on the map (see `tests/compat.test.ts`).

### The Long Count

The Hollow Host — a silent army of the dead — marches south out of the frozen March, and the
realm's ledgers have burned. Without true counts nobody knows how many soldiers, crates,
miles or grams there are, and a misread number gets people killed. The player is a new
clerk-at-arms. Tone: grown-up fantasy war story (think a kid-safe *Black Company*): dry,
tired adults, real stakes, no "maths is fun". Humour is gallows humour, not slapstick.

| Region | Scene | Topic | Guides | Boss |
| --- | --- | --- | --- | --- |
| Greyhaven | night muster | reading & writing big numbers | Marshal Edda Voss, Brother Anselm (archivist), Wren (scout) | The Ledger Wraith (eats zeros) |
| The Ashen Road | burned road | comparing, ×10, regrouping, carries | Hobb Tallow (quartermaster) | Maul Vane the Forger (shifts digits) |
| The Siege of Thornwall | fortress under siege | rounding & estimating | Voss, Wren | Captain Sere of the Ash Riders |
| The Glass Vaults | alchemists' vault | decimals | The Glass Warden | The Tallyman (cheats with long decimals) |

Greyhaven is open from the start (a second way in, for older kids); each region after it
needs the previous one. Foes are drawn in `src/art/Dark.tsx` (Hollow, Wraith, Tallyman,
Forger, Golem, Rider), scenes in `src/art/scenes/dark.tsx`, with ash and mote particles.

## Core loop

1. **Adventure board** (`#/map`, the home screen) → pick an adventure. It shows a
   *Continue* card, today's bounties, a **Dispatches** feed of new content (`content/news.yaml`),
   wandering monsters, and every region as a card grouped by campaign, with what it teaches,
   status (new / in progress / needs review / done / locked and why), stars, time spent and
   accuracy. Filters and sorting keep the growing list manageable. The old painted map lives on
   as the **Atlas** (`#/atlas/<campaign>`), one per campaign.
2. **Region path** (Duolingo-style): story → lessons → encounters → boss. Each node unlocks the
   next. Finished nodes can be replayed for practice (smaller rewards).
3. **Lessons** teach one skill each with story beats, quick checks and a few practice problems.
   Finishing one "learns a spell" (the skill) for the Spellbook.
4. **Encounters** are practice as mini-games (`src/ui/screens/Encounter.tsx`):
   - *Battle* — right answer hits the monster; wrong answer, the monster hits you.
   - *Treasure chest* — each right answer opens a lock; wrong answer, the chest (a mimic) bites.
   - *Rickety bridge* — each right answer is a step; wrong answer cracks a plank.
   - *Hold the wall* (siege) — each right answer drops an attacker; a wrong one cracks the gate.
   - *Crack the vault* — each right answer sets a tumbler; a wrong one trips an alarm.
   - *Boss* — a battle in three phases with taunts.
     The number of questions adapts (see `docs/learning-design.md`, *Adaptive runs*): misses add
     reinforcement problems (shown as extra pips), clean streaks on mastered skills remove
     some. A wrong answer is retried on the same skill and atom, one level easier, with fresh
     numbers. Losing all hearts = knocked
     out: you drop a few coins and go back to safety.
5. **Wandering monsters** spawn on the world map every ~2 hours (max 3) and pick the skills
   that most need review. "Seek trouble" summons one on demand.
6. Spend gold in the **shop**; look after the **pet**; dress up the hero.
7. The **Skill Tree** (`#/skills`) shows every skill and its atoms as a tree, a dependency
   graph, or a report (trouble spots, fading skills, time per region), with drill buttons.

## Answers: forgiving but consequential

- One **nudge** per problem: a predicted mistake gets a hint and a free retry.
- In lessons, mistakes cost nothing (but show the worked solution).
- In encounters, a final wrong answer costs a heart.
- Hint scrolls (items) reveal a hint; wizards get one free hint per fight.
- **On the EQcanvas** (equations and story problems) every step is judged on its own: a wrong
  equation, a move that doesn't help, or a wrong sum gets an explanation and a fix-it, as
  often as needed. Fixed slips count as *nudged*; "Show me" counts as wrong (a heart in a
  fight). In a fight, the first hint on a problem uses a hint scroll; the step-by-step
  feedback is always free. See `learning-design.md`.

## Progression & economy (`src/engine/rewards.ts`, `src/engine/profile.ts`)

| Thing | Value |
| --- | --- |
| Right answer (practice/encounter) | 10 XP (6 if after a nudge) |
| Lesson quick check | 5 XP (3 after nudge) |
| Lesson finished | 40 XP first time, 10 on replay |
| Encounter won | +15 XP, 5–10 gold × tier, 45% item drop |
| Boss won | +120 XP first time (40 replay), tier-3 loot (2 guaranteed items) |
| Grit (a mistake put right in the same run) | +4 XP |
| Combo of clean answers | bonus XP (`comboBonus` in `adaptive.ts`) |
| Skill promoted a tier | +15 XP |
| Daily bounty | 15–40 gold each; all three = a bounty chest (gold + a useful item) |
| Trophy | 0–150 gold, sometimes an item and a title |
| Level curve | XP to reach level L: $100(L-1) + 25(L-1)(L-2)$ |
| Hearts | 3, +1 at level 5, +1 at level 10, knights +1 |
| Knock-out penalty | lose 5 gold + 10% of gold |

Class perks: Wizard (free hint per fight), Knight (+1 heart), Rogue (+25% gold), Bard (+15% XP).

## Bounties and trophies

- **Daily bounties** (`src/engine/quests.ts`): three small goals a day ("answer 25 right",
  "put 3 mistakes right", "feed your pet"…), seeded by hero and date. Claim each on the
  board; claiming all three opens a chest.
- **Trophies** (`content/achievements.yaml`, `src/engine/achievements.ts`): ~50, each a
  `stat` and a `goal`. Stats are event counters bumped by `track()` (`src/engine/events.ts`)
  or derived from the profile (level, regions done, atoms mastered, pet bond…). Some are
  secret; some grant a **title** the hero can wear (chosen on the Hero screen). Trophies
  earned by old saves are awarded on the first load, in one summary card.

## Daily goal & streak (`src/engine/daily.ts`)

- Goal options: 50 / 100 / 200 / 300 XP per day.
- Meeting the goal extends the streak 🔥. Missing a day resets it to zero —
  unless you own **Streak Shields** (150 gold, carry max 2, unlocked at level 3), which are
  consumed one per missed day.

## The pet (`src/engine/pet.ts`)

- The first egg is found in the oven at the end of the *Open the Box* lesson. More eggs: the
  shop (60 gold).
- Tap the egg 5 times to hatch a random species: Slime, Dragonling, Mushling, Owlbear Cub.
- Stats: Food, Fun, Health (0–100). Food and Fun drain in real time (also while the game is
  closed). Eating schedules a poop 40–150 minutes later. Three or more poops make the pet sick.
- Starving, poop and boredom drain Health; Health at 0 = **death** (cause recorded). Dead pets
  get flies and a funeral; graves go to the Pet Cemetery with an epitaph.
- From fully fed, neglect kills a pet in roughly **3.5 days**.
- Pets grow: baby (< 1 day), kid (< 4 days), adult. A **happy** pet gives **+10% XP**.
- Items: food, toys (whoopee cushion, burp in a jar, rubber chicken…), care (bubble bath,
  medicine), hats. Tapping the pet pats it; tapping poop cleans it.
- **Species**: Slime, Dragonling, Mushling, Owlbear Cub, Bone Pup, Mimic.
- **Bond** (0–100) grows with pats, feeding, play and the bug hunt. Bond unlocks **tricks**
  at 10/25/40/55/70/85/100 (sit, spin, play dead…), performed on request. At bond 30 the pet
  joins fights as a **companion**: it cheers, and sometimes digs up gold.
- **Sleep**: 21:00–07:00 the pet sleeps (Zzz) and can't do tricks; a second tap wakes it
  for a minute, grumpily.
- **Tickles**: four quick taps in a row is a tickle (more joy, a squawk). Pats give a few
  bond points a day, so bond can't be farmed by tapping.
- **Bug hunt**: every 30 minutes, bugs crawl through the den; tap them to feed the pet.
- **The den** is decorated with **decor** items bought in the shop (one of each). Some have
  perks: feeder (hunger drains ×0.75), toy chest (joy drains ×0.75), poop bucket (poop ×0.5),
  pet bed (healing ×2); the disco ball makes it a party.

## Battle items

Hint scroll and potions, plus: **ward rune** (blocks the next hit), **scout's lens**
(fades two wrong options), **focus tonic** (double XP for 20 minutes) and **lucky coin**
(the next win pays double gold). Boosts are used from the Hero screen.

## Cosmetics

Hats (party hat, propeller cap, viking helmet, chicken hat, crown, warden helm, raven hood,
tricorn, antlers, jester hat, iron crown — a trophy reward) and capes (red, midnight, gold,
rainbow, ash cloak, March mantle, blood moon) are drawn on the hero; hats also fit pets.
