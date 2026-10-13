# Learning design

The maths core of Smashdash. Read this before adding or changing skills, lessons or generators.

## Principles

1. **Depth over breadth.** One connected arc, done well: _what a variable is → evaluating
   expressions → equations as balance → undoing operations → solving → story problems_, plus
   side arcs that branch off it: *powers of ten*, *the distributive law* (and mental maths),
   *coordinates and straight-line graphs*, and *electricity*, where Ohm's law is a real-world
   equation to solve.
2. **Atomic skills.** Each skill isolates one idea. Combining ideas is its own skill. Example:
   `both-sides` (apply a given move to both sides — even a useless one) is separate from
   `pick-move` (decide *which* move isolates x), which is separate from `one-step-add` (do both).
3. **Concrete before abstract.** Mystery boxes and coins → balance scale → symbols. The box and
   the letter $x$ are introduced as the same thing, and $x$ is always drawn in the same
   "mystery" magenta everywhere (`.var` in KaTeX output).
4. **Misconceptions are first-class.** Every generator predicts the classic wrong answers and
   attaches a *nudge* to each. A nudge is shown instead of "wrong", and the player retries for
   free (one nudge per problem). Generic near-misses (flipped sign, decimal point off by ×10)
   are also nudged (`src/engine/answer.ts`).
5. **Story explains, checks confirm.** Lessons are short dialogue beats with a quick check every
   2–3 beats, then a few generated practice problems. Lessons never cost hearts.
6. **Spaced review.** Mastery fades over time; wandering monsters on the world map choose the
   skills that need it most (`src/engine/mastery.ts`, `src/engine/encounters.ts`).
7. **Difficulty adapts — and so does the amount of practice.** Each generator has 3 levels
   (tiers *Novice → Adept → Master*). A skill moves up a tier only after a clean streak and
   drops back after repeated misses; struggling adds problems to the unit, doing well removes
   them (see *Adaptive runs* below).
8. **Atoms: every tiny skill is named.** Each skill is broken into 2–7 *atoms* (e.g.
   `pow10-up/zeros` "$10^n$ has $n$ zeros", `round-small/nines` "rounding 9,960 to the nearest
   hundred carries"). Every generated problem says which atoms it exercises, and the player's
   record is kept per atom. The Skill Tree page (`#/skills`) shows all of them.
9. **Show why algebra is worth it.** The Bazaar explicitly contrasts guessing (fine for small
   numbers) with equations (fast for big ones), and Truth-or-Trap shows that you can always
   *check* an answer.

## The skill graph (58 skills, 13 regions, 273 atoms)

The Muddled Kingdom campaign (regions 1–9):

```
Bramblebottom (expressions)            Tower of Tens (powers)  ← needs Bramblebottom
  notation ─┬─ eval-one ── eval-two ── eval-parens     power-meaning ── pow10-up ── pow10-down
            └─ words-to-expr                                              └── times-pow10 ── sci-notation
        │                              Mirrormaze Caves (distributive law)  ← needs Bramblebottom
        │                                copy-groups ── expand ── expand-check
        │                                                  └── split-tens ── round-down
        │                              Beamhook Bay (graphs)  ← needs Bramblebottom
        │                                read-point ── plot-point ── table-rule ── step-pattern ── line-rule
Ironhold (the balance)
  balance-rule ── both-sides ── inverse-ops ── pick-move
        │
Gloomfen Marsh (one-step)
  one-step-add ── one-step-mul ── check-solution (uses eval-two)
        │                     └──────────────┐
Dragonspine Peaks (two-step)             Sparkwick Junkyard (electricity)  ← needs Gloomfen
  undo-order ── two-step                   closed-loop ── volts ── current ── resistance
        │                                    └── ohm-current ── ohm-solve (a one-step equation!)
Bazaar of Whispers (story problems)
  name-unknown ── story-to-equation ── story-solve
```

| Region | Skill id | What it isolates | Stumbling blocks targeted (nudged) |
| --- | --- | --- | --- |
| Bramblebottom | `notation` | Reading $3x$, $x/4$, $x+x$ | $3x$ read as digits "3x"; $x+x+x$ vs $x^3$; $\frac{4}{x}$ vs $\frac{x}{4}$ |
|  | `eval-one` | Substitute into one operation | $3x$ with $x=4$ → 34 (gluing); × vs + |
|  | `eval-two` | Order: multiply before add | adding first; $10+2x$ treated left-to-right |
|  | `eval-parens` | Brackets go first | $2(x+3)$ computed as $2x+3$; fraction bar as a bracket |
|  | `words-to-expr` | Words → expressions | "3 less than x" → $3-x$; "twice" → $x+2$; triple-then-add vs add-then-triple |
| Ironhold | `balance-rule` | Same to both sides keeps balance | changing one side; different amounts |
|  | `both-sides` | Apply a given move to both sides | changing only one side; legal-but-useless moves |
|  | `inverse-ops` | What undoes what | repeating the operation instead of undoing |
|  | `pick-move` | Which move isolates x | adding when you should subtract; subtracting the total |
| Gloomfen | `one-step-add` | Solve $x \pm a = b$ | same op instead of inverse; $x$ on the right |
|  | `one-step-mul` | Solve $ax=b$, $x/a=b$ | subtracting instead of dividing; dividing instead of multiplying |
|  | `check-solution` | Substitute to verify | trusting instead of checking |
| Dragonspine | `undo-order` | First move in two-step | dividing first; brackets flip the order |
|  | `two-step` | Full two-step solve | wrong order ($c/a - b$); stopping at $ax$ |
| Bazaar | `name-unknown` | What is x in a story | picking a known number |
|  | `story-to-equation` | Story → equation | swapped coefficients; + vs − (found vs spent) |
|  | `story-solve` | Solve and answer the question | answering the total; stopping before dividing |
| Tower | `power-meaning` | $a^n$ = repeated multiplication | $2^3 = 6$ |
|  | `pow10-up` | $10^n$, counting zeros | $10^3 = 30$; off-by-one zeros |
|  | `pow10-down` | $10^0$, $10^{-n}$ | $10^{-3} = -1000$; $10^0 = 0$ |
|  | `times-pow10` | Decimal point hops | wrong direction; off-by-one hops; gluing zeros |
|  | `sci-notation` | Read/write/compare | front number ≥ 10; comparing front numbers before powers |
| Mirrormaze | `copy-groups` | $3(x+2)$ = three copies of the parcel | counting one parcel; adding the 3 as a coin; Halfcopy's $3x + 2$ |
|  | `expand` | $a(x \pm b) = ax \pm ab$ | "copy only the first thing" ($ax + b$); $a + b$ instead of $ab$; losing the minus |
|  | `expand-check` | Test a rule by substituting ($x = 1$ first) | trusting a fake rule; working out only one side |
|  | `split-tens` | $7 \times 12 = 70 + 14$ | $70 + 2$ (not copying the 2); adding instead of multiplying |
|  | `round-down` | $7 \times 9 = 7 \times (10 - 1) = 70 - 7$ | $70 - 1 = 69$; adding instead of taking away |
| Beamhook | `read-point` | Coordinates of a dot: along, then up | swapping $(x, y)$; counting squares from 1 instead of lines from 0 |
|  | `plot-point` | Find $(x, y)$ on the grid | swapped point; off by one |
|  | `table-rule` | Fill a table for $y = mx + b$ | forgetting $+b$; adding first; gluing digits |
|  | `step-pattern` | Each step along, $y$ climbs $m$ | climb = $b$ (the start); climbing 1 per step |
|  | `line-rule` | Read start and climb off a graph; is a point on it? | swapping $m$ and $b$; plugging in the wrong coordinate |
| Junkyard | `closed-loop` | Current needs a complete loop | one wire is enough; a far-away gap doesn't matter; both wires on one end |
|  | `volts` | Push: AA = 1.5 V, cells in a row add | counting batteries not volts; a backwards cell just "stops" |
|  | `current` | Amps = electrons per second, same all round | the bulb "uses up" current; push vs flow |
|  | `resistance` | Ohms = squeeze; in a row they add | more ohms = more flow; resistors eat electrons |
|  | `ohm-current` | $I = V \div R$ | $V \times R$; $R \div V$ |
|  | `ohm-solve` | $V = I \times R$ as an equation | adding; dividing the wrong way; volts vs number of AAs |

### The Long Count campaign (regions 10–13): place value up to the millions

A second, darker campaign (grades ~5–6). It is open from the start and needs nothing from the
Kingdom, so older kids can begin here. Each region opens after the previous one.

```
Greyhaven (reading big numbers)        The Ashen Road (comparing, ×10, regrouping)
  pv-places ── pv-value ──┬─ pv-read     pv-compare   pv-times-ten ── pv-regroup
                          └─ pv-write       pv-shift (carries through nines) ── pv-numberline
                pv-expanded
The Siege of Thornwall (rounding)      The Glass Vaults (decimals)
  round-small ── round-big ── round-range   dec-places ── dec-write ── dec-compare
  estimate        pow10-places (links to the Tower of Tens)   dec-shift ── dec-round
```

| Region | Skill id | What it isolates | Gotchas taught, tested and nudged |
| --- | --- | --- | --- |
| Greyhaven | `pv-places` | Naming places from ones to ten-millions | counting places from the left; off-by-one (ten-thousands vs thousands); periods (ones / thousands / millions) |
|  | `pv-value` | A digit's worth depends on its place | answering the digit instead of its value; the same digit worth different amounts; zero is worth nothing but holds the place |
|  | `pv-read` | Commas and reading aloud | commas grouped from the left; saying "thousand" in the wrong period; reading zeros aloud ("two million zero forty…") |
|  | `pv-write` | Words → digits | *2,406* for "two million, forty thousand, six" (missing placeholder zeros); gluing periods together; a whole empty period |
|  | `pv-expanded` | Break up / put back | dropped gaps; shuffled terms; the missing term |
| Ashen Road | `pv-compare` | Comparing big numbers | comparing first digits before counting digits (*98,000 > 120,000*); sorting like words; symbol direction |
|  | `pv-times-ten` | Each place is ten times the next | "add a zero" thinking; ×100 vs ×10; ÷ going the wrong way |
|  | `pv-regroup` | 34 hundreds = 3,400; how many full thousands | answering the thousands *digit* (4) instead of the count (34); a million = 1,000 thousands |
|  | `pv-shift` | 10,000 more / less | carry slip; cascade through nines (*3,995,000 + 10,000*); borrow slip |
|  | `pv-numberline` | Reading/placing on big number lines | assuming each tick is 1; offset lines that don't start at 0 |
| Thornwall | `round-small` | Nearest 10 / 100 / 1,000 | looking at the wrong digit; the 5 rule; carries (*9,960 → 10,000*); "between" which two round numbers |
|  | `round-big` | Nearest 10,000 / 100,000 / million | same, at scale |
|  | `round-range` | What could the true number have been? | 5,500 counted in the range of 5,000; the largest possible value |
|  | `estimate` | Round, then add/subtract; catch slips | estimating with unrounded numbers; using an estimate to spot a digit slip |
|  | `pow10-places` | Places as powers of ten | ten-thousands $= 10^5$ (counting digits, not zeros); a digit's value as $d \times 10^n$; a thousand thousands = a million |
| Glass Vaults | `dec-places` | Tenths, hundredths, thousandths | "tenths" vs "tens"; place values shrinking to the right |
|  | `dec-write` | Writing decimals | five hundredths as *0.5*; twenty-seven thousandths as *0.27* |
|  | `dec-compare` | Comparing decimals | longer is bigger (*0.45 > 0.5*); trailing zeros change the value |
|  | `dec-shift` | ×/÷ 10, 100, 1000 with decimals | *2.5 × 10 = 2.50* (adding a zero) |
|  | `dec-round` | Round to a whole / tenth / hundredth | carries (*2.96 → 3.0*); the half |

**Why place value has a plot.** The realm's ledgers burned; the Hollow Host is counted in
hundreds of thousands, supplies in crates of a hundred, distances in tens of miles. A misread
digit sends twelve soldiers where twelve thousand were needed. Every lesson starts from a
consequence of a wrong number, never from "maths is fun". The guides are adults who count for
a living (a marshal, a quartermaster, an archivist monk, a scout); the villains are _the
mistakes_ — the Ledger Wraith eats zeros, Maul Vane forges numbers by shifting digits,
Captain Sere's riders exploit rough counts, the Tallyman cheats with long decimals.

**Visual applets.** The place-value widgets make the structure visible:
`placechart` (tap a column to see a digit's worth), `abacus` (the Reckoning Board: tokens per
place, trade ten for one), `numberline` (with bands and targets), `logline` (a log-scale line
where every ×10 is one equal step, with a linear line underneath for comparison), `rounder`
(the nearer round number on a zoomed line), `shifter` (×10 slides digits past a fixed point)
and `decgrid` (tenths and hundredths shaded on a grid).

## The newer arcs, and why they're shaped this way

- **Mirrormaze Caves — distributive law.** Halfcopy the Imp *is* the classic misconception
  ($2(x + 3) = 2x + 3$), so every nudge can blame him. Order: copies of a parcel (concrete,
  `groups` widget) → busting brackets → catching fakes by substituting $x = 1$ (the
  "number spy", which also teaches that one agreeing value is evidence, not proof) → the
  payoff, mental maths: $7 \times 12 = 70 + 14$ (`area` widget, a slab plus a strip) and
  $7 \times 9 = 7 \times (10 - 1) = 70 - 7$ (a bat eats a whole column — the picture makes
  "take off 7, not 1" obvious).
- **Beamhook Bay — graphs.** Coordinates first, as aiming a lighthouse laser (along, then up),
  then rules as an *aiming table*: kids calculate $y = 2x + 3$ for $x = 0, 1, 2, 3$ by hand and
  fire at each point in the `plot` widget; when all are hit, the beam joins them into a line.
  Only then do we name the climb and the start, and read rules off graphs.
- **Sparkwick Junkyard — electricity.** One metaphor all the way through: electrons are crying
  babies crawling from the − end of the battery round the wire to the Nanny Ions at +; the
  water tank (`pipe` widget) backs it up. Push (volts), flow (amps) and squeeze (ohms) are
  each taught alone with their own misconceptions, then Ohm's law combines them, and finally
  $V = I \times R$ is solved like a Gloomfen one-step equation. The `circuit` widget turns it
  into a battlebot workshop: add AAs and "mud tunnels" until Nugget gets exactly the right
  amps without blowing the fuse. (Honest physics note: electrons really do flow from − to +
  outside the battery; "conventional current" arrows point the other way — we skip that.)

## Pacing inside a region

`lesson → lesson → encounter → lesson → encounter → … → boss`. Encounters mix the skills taught
so far in the region (and sometimes earlier regions) — never untaught skills (enforced by
`tests/content.test.ts`). The boss has 3 phases that walk up the region's skills.

## Mastery model (`src/engine/mastery.ts`)

- Mastery $m \in [0,1]$ per skill. Right: $m += (1-m)\cdot0.18$. Nudged-then-right:
  $m += (1-m)\cdot0.06$. Wrong: $m \times= 0.8$.
- Effective mastery fades with a half-life of $2 + 28m^2$ days (shaky skills fade in days,
  solid ones in weeks). Spellbook stars = effective mastery × 5.
- **Tiers** (the problem level, 1–3: Novice, Adept, Master) are stored per skill and move by
  evidence, not by the mastery number:
  - *Promote* after `PROMOTE_RUN` = 4 right-first-time answers in a row at the current tier,
    and only if none of the skill's atoms is shaky.
  - *Demote* after 2 wrong answers among the last 3 at the current tier.
  - If a skill has faded badly (effective mastery below 55% of $m$), practice starts one tier
    lower until it is warmed up again.
- **Atoms** keep counts (seen, right first time, nudged, wrong) and a short history. Status:
  *unseen*; *shaky* (a miss in the last two); *solid* (2+ right, last two right); *mastered*
  (5+ right, last four right, ≥ 75% first time); otherwise *learning*.

## Adaptive runs (`src/engine/adaptive.ts`)

Every encounter, boss phase and lesson practice is a *run*. The node's `count` is the base
quota, shared out between the skills by need.

- **Struggle → more practice, same level.** A wrong answer adds one reinforcement problem
  (up to `max(3, ⌈0.75 × base⌉)` extras), and the next problem on that skill targets _the
  same atom_, one tier easier. The run isn't over while a missed atom hasn't been answered
  right again ("ironed out"), as long as extras remain. The tier doesn't rise meanwhile,
  because a shaky atom blocks promotion.
- **…but it still feels like progress.** Extra problems are shown as extra pips, never as
  lost ones. Putting a mistake right earns **Grit** (+4 XP and a counter for trophies);
  getting back on track after losing hearts earns a **Rally** (a heart back after 3 clean
  answers, once a fight). The summary at the end celebrates grit, not just accuracy.
- **Doing well → move on.** Three clean answers in a row on a skill already at tier 3 is a
  *Swift strike*: one problem comes off the quota (down to 60% of the base). Combos of clean
  answers give bonus XP, and promotions give +15 XP and a toast.
- **Drills.** The Skill Tree can start a run on one skill or one atom (`#/drill/<skill>/<atom>`).

Everything is pure and tested in `tests/adaptive.test.ts`.

## Ideas for the next topics (keep the same depth)

- Variables on both sides ($3x + 2 = x + 10$), with the balance widget removing boxes.
- Negative numbers as a prerequisite mini-arc (debt, temperature) before negative solutions.
- Inequalities as "unbalanced scales".
- Simple patterns → expressions ("the n-th term"); graphs with negative numbers and slopes.
- Electricity, part two: parallel circuits and power ($P = V \times I$).
- Laws of exponents ($10^a \times 10^b$), multiplying in scientific notation.
- The Long Count, part two: multiplying and dividing big numbers by multiples of ten,
  negative numbers on the frozen thermometer, fractions ↔ decimals.
