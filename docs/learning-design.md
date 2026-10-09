# Learning design

The maths core of Smashdash. Read this before adding or changing skills, lessons or generators.

## Principles

1. **Depth over breadth.** One connected arc, done well: *what a variable is → evaluating
   expressions → equations as balance → undoing operations → solving → story problems*, plus a
   parallel arc on *powers of ten and scientific notation*.
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

## The skill graph (v1: 22 skills, 6 regions)

```
Bramblebottom (expressions)            Tower of Tens (powers)  ← needs Bramblebottom
  notation ─┬─ eval-one ── eval-two ── eval-parens     power-meaning ── pow10-up ── pow10-down
            └─ words-to-expr                                              └── times-pow10 ── sci-notation
        │
Ironhold (the balance)
  balance-rule ── both-sides ── inverse-ops ── pick-move
        │
Gloomfen Marsh (one-step)
  one-step-add ── one-step-mul ── check-solution (uses eval-two)
        │
Dragonspine Peaks (two-step)
  undo-order ── two-step
        │
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
- Simple patterns → expressions ("the n-th term"), and graphs of $y = ax + b$.
- Laws of exponents ($10^a \times 10^b$), multiplying in scientific notation.
