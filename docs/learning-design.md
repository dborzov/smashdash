# Learning design

The maths core of Smashdash. Read this before adding or changing skills, lessons or generators.

## Principles

1. **Depth over breadth.** One connected arc, done well: *what a variable is → evaluating
   expressions → equations as balance → undoing operations → solving → story problems*, plus
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
7. **Difficulty adapts.** Each generator has 3 levels; the level comes from the player's mastery
   of that skill (`levelFor` in `src/skills/index.ts`).
8. **Show why algebra is worth it.** The Bazaar explicitly contrasts guessing (fine for small
   numbers) with equations (fast for big ones), and Truth-or-Trap shows that you can always
   *check* an answer.

## The skill graph (38 skills, 9 regions)

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
| | `eval-one` | Substitute into one operation | $3x$ with $x=4$ → 34 (gluing); × vs + |
| | `eval-two` | Order: multiply before add | adding first; $10+2x$ treated left-to-right |
| | `eval-parens` | Brackets go first | $2(x+3)$ computed as $2x+3$; fraction bar as a bracket |
| | `words-to-expr` | Words → expressions | "3 less than x" → $3-x$; "twice" → $x+2$; triple-then-add vs add-then-triple |
| Ironhold | `balance-rule` | Same to both sides keeps balance | changing one side; different amounts |
| | `both-sides` | Apply a given move to both sides | changing only one side; legal-but-useless moves |
| | `inverse-ops` | What undoes what | repeating the operation instead of undoing |
| | `pick-move` | Which move isolates x | adding when you should subtract; subtracting the total |
| Gloomfen | `one-step-add` | Solve $x \pm a = b$ | same op instead of inverse; $x$ on the right |
| | `one-step-mul` | Solve $ax=b$, $x/a=b$ | subtracting instead of dividing; dividing instead of multiplying |
| | `check-solution` | Substitute to verify | trusting instead of checking |
| Dragonspine | `undo-order` | First move in two-step | dividing first; brackets flip the order |
| | `two-step` | Full two-step solve | wrong order ($c/a - b$); stopping at $ax$ |
| Bazaar | `name-unknown` | What is x in a story | picking a known number |
| | `story-to-equation` | Story → equation | swapped coefficients; + vs − (found vs spent) |
| | `story-solve` | Solve and answer the question | answering the total; stopping before dividing |
| Tower | `power-meaning` | $a^n$ = repeated multiplication | $2^3 = 6$ |
| | `pow10-up` | $10^n$, counting zeros | $10^3 = 30$; off-by-one zeros |
| | `pow10-down` | $10^0$, $10^{-n}$ | $10^{-3} = -1000$; $10^0 = 0$ |
| | `times-pow10` | Decimal point hops | wrong direction; off-by-one hops; gluing zeros |
| | `sci-notation` | Read/write/compare | front number ≥ 10; comparing front numbers before powers |
| Mirrormaze | `copy-groups` | $3(x+2)$ = three copies of the parcel | counting one parcel; adding the 3 as a coin; Halfcopy's $3x + 2$ |
| | `expand` | $a(x \pm b) = ax \pm ab$ | "copy only the first thing" ($ax + b$); $a + b$ instead of $ab$; losing the minus |
| | `expand-check` | Test a rule by substituting ($x = 1$ first) | trusting a fake rule; working out only one side |
| | `split-tens` | $7 \times 12 = 70 + 14$ | $70 + 2$ (not copying the 2); adding instead of multiplying |
| | `round-down` | $7 \times 9 = 7 \times (10 - 1) = 70 - 7$ | $70 - 1 = 69$; adding instead of taking away |
| Beamhook | `read-point` | Coordinates of a dot: along, then up | swapping $(x, y)$; counting squares from 1 instead of lines from 0 |
| | `plot-point` | Find $(x, y)$ on the grid | swapped point; off by one |
| | `table-rule` | Fill a table for $y = mx + b$ | forgetting $+b$; adding first; gluing digits |
| | `step-pattern` | Each step along, $y$ climbs $m$ | climb = $b$ (the start); climbing 1 per step |
| | `line-rule` | Read start and climb off a graph; is a point on it? | swapping $m$ and $b$; plugging in the wrong coordinate |
| Junkyard | `closed-loop` | Current needs a complete loop | one wire is enough; a far-away gap doesn't matter; both wires on one end |
| | `volts` | Push: AA = 1.5 V, cells in a row add | counting batteries not volts; a backwards cell just "stops" |
| | `current` | Amps = electrons per second, same all round | the bulb "uses up" current; push vs flow |
| | `resistance` | Ohms = squeeze; in a row they add | more ohms = more flow; resistors eat electrons |
| | `ohm-current` | $I = V \div R$ | $V \times R$; $R \div V$ |
| | `ohm-solve` | $V = I \times R$ as an equation | adding; dividing the wrong way; volts vs number of AAs |

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
  solid ones in weeks).
- Level 1 below 0.35, level 2 below 0.7, level 3 above.
- Spellbook stars = effective mastery × 5.

## Ideas for the next topics (keep the same depth)

- Variables on both sides ($3x + 2 = x + 10$), with the balance widget removing boxes.
- Negative numbers as a prerequisite mini-arc (debt, temperature) before negative solutions.
- Inequalities as "unbalanced scales".
- Simple patterns → expressions ("the n-th term"); graphs with negative numbers and slopes.
- Electricity, part two: parallel circuits and power ($P = V \times I$).
- Laws of exponents ($10^a \times 10^b$), multiplying in scientific notation.
