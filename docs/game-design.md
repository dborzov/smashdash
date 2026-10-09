# Game design

How the game layer works: the world, the loop, the economy, the pet. Numbers live in code
(linked below) so they can be tuned in one place.

## Story & world

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

The Tower of Tens opens right after Bramblebottom, so kids can alternate between the equations
arc and the powers arc.

## Core loop

1. **World map** → pick a region (locked ones are under the Muddler's fog).
2. **Region path** (Duolingo-style): story → lessons → encounters → boss. Each node unlocks the
   next. Finished nodes can be replayed for practice (smaller rewards).
3. **Lessons** teach one skill each with story beats, quick checks and a few practice problems.
   Finishing one "learns a spell" (the skill) for the Spellbook.
4. **Encounters** are practice as mini-games (`src/ui/screens/Encounter.tsx`):
   - *Battle* — right answer hits the monster; wrong answer, the monster hits you.
   - *Treasure chest* — each right answer opens a lock; wrong answer, the chest (a mimic) bites.
   - *Rickety bridge* — each right answer is a step; wrong answer cracks a plank.
   - *Boss* — a battle in three phases with taunts.
   A wrong answer is retried on the same skill with fresh numbers. Losing all hearts = knocked
   out: you drop a few coins and go back to safety.
5. **Wandering monsters** spawn on the world map every ~2 hours (max 3) and pick the skills
   that most need review. "Seek trouble" summons one on demand.
6. Spend gold in the **shop**; look after the **pet**; dress up the hero.

## Answers: forgiving but consequential

- One **nudge** per problem: a predicted mistake gets a hint and a free retry.
- In lessons, mistakes cost nothing (but show the worked solution).
- In encounters, a final wrong answer costs a heart.
- Hint scrolls (items) reveal a hint; wizards get one free hint per fight.

## Progression & economy (`src/engine/rewards.ts`, `src/engine/profile.ts`)

| Thing | Value |
| --- | --- |
| Right answer (practice/encounter) | 10 XP (6 if after a nudge) |
| Lesson quick check | 5 XP (3 after nudge) |
| Lesson finished | 40 XP first time, 10 on replay |
| Encounter won | +15 XP, 5–10 gold × tier, 45% item drop |
| Boss won | +120 XP first time (40 replay), tier-3 loot (2 guaranteed items) |
| Level curve | XP to reach level L: $100(L-1) + 25(L-1)(L-2)$ |
| Hearts | 3, +1 at level 5, +1 at level 10, knights +1 |
| Knock-out penalty | lose 5 gold + 10% of gold |

Class perks: Wizard (free hint per fight), Knight (+1 heart), Rogue (+25% gold), Bard (+15% XP).

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

## Cosmetics

Hats (party hat, propeller cap, viking helmet, chicken hat, crown) and capes (red, midnight,
gold, rainbow) are drawn on the hero; hats also fit pets.
