# Content guide: adding lessons, skills, regions

Everything here is checked by `npm run validate` — run it after every content change.

## Writing style (read first)

- Funny, warm, a bit naughty. Grimble is sarcastic but kind. Poop, burps and farts are welcome;
  meanness, scary gore and anything adult are not.
- Short beats. One idea per beat, one or two sentences. **A check every 2–3 beats.**
- Explain with the story's objects: boxes, coins, scales, layers of wrapping, potions.
- Every wrong option in a check should be a *real* misconception with a nudge explaining it.
- Use `$…$` for all maths, even single numbers in equations. Put `x` in maths so it gets the
  mystery colour.

## YAML gotchas

- Text containing `: ` or starting with a quote → use a block scalar (`text: >-`) or quotes.
- Inside **double** quotes, backslashes must be doubled: `"$3 \\times 4$"`. Inside single quotes
  or block scalars, write LaTeX normally: `'\frac{x}{2}'`.
- Nudges for `ask` beats are keyed by option index as strings: `"1": "…"`.

## Lesson beats

```yaml
id: my-lesson          # unique across the game
title: My Lesson
skill: eval-one        # the skill this lesson teaches (omit for pure story)
beats:
  - type: say          # speech with portrait; `who` is a key in content/cast.yaml
    who: grimble
    text: Hello!
  - type: narrate      # italic narration
    text: The fog rolls in.
  - type: show         # explanation panel: text and/or big maths and/or a static widget
    text: "Subtract 5 from both sides:"
    math: '\begin{aligned} x + 5 \hl{\,- 5} &= 12 \hl{\,- 5} \\ x &= 7 \end{aligned}'
  - type: ask          # multiple choice check (options are shuffled at runtime)
    text: What does $5x$ mean?
    options: ["$5 + x$", "$5 \\times x$"]
    correct: 1
    nudges: { "0": "There's an invisible **times**, not a plus." }
    explain: "$5x = 5 \\times x$."
  - type: input        # number answer with keypad
    text: If $x = 5$, what is $2x$?
    answer: 10
    nudges: [{ value: 25, text: "Don't glue the digits!" }]
    hint: Swap the box for 5.
    explain: "$2 \\times 5 = 10$."
  - type: choose       # choose-your-own-adventure flavour; every option is fine
    who: nettle
    text: Tea?
    options:
      - { text: Yes please!, reply: "It's mostly mud." }
      - { text: No thanks., reply: "Smart." }
  - type: play         # interactive widget the player must complete
    text: Get the box alone!
    widget: { kind: balance, left: { x: 1, c: 4 }, right: { x: 0, c: 9 }, value: 5, goal: isolate, tools: [both] }
    done: "So $x = 5$!"
  - type: practice     # generated problems from a skill's generator
    skill: eval-one
    count: 4
  - type: reward       # given only the first time the lesson is finished
    egg: true          # or gold: 15, or item: cheese
    text: You found an egg!
```

### Widgets

| kind | fields | notes |
| --- | --- | --- |
| `boxes` | `a`, `b`, `reveal?` | a mystery boxes + b coins; with `reveal`, tap to open |
| `balance` | `left`, `right` (`{x, c}`), `value`, `goal` (`none`/`tip`/`isolate`), `tools` (`both`/`left`/`right`/`divide`) | `value` = what's in a box; must start balanced for `isolate` |
| `unwrap` | `layers` (inside → out, e.g. `['\times 3', '+ 5']`), `value?` | tap the outer layer first |
| `tower` | `base`, `exp` | build $base^{exp}$ floor by floor |
| `powers` | `min`, `max`, `start` | slider over $10^n$ with real-world sizes |
| `hop` | `mantissa`, `exp` | decimal point hops |

## Adding a skill

1. Add the entry to `content/skills.yaml` (id, name, region, icon, summary).
2. Write a generator in `src/skills/<topic>.ts`: `(rng, level) => Problem`. Use `choice()` and
   `numeric()` from `src/skills/util.ts`; give every predicted mistake a nudge; keep answers
   clean (integers or short decimals); add a hint and a worked `explain`.
3. Register it in `src/skills/index.ts`.
4. Write exactly one lesson that teaches it (`skill: <id>`), and use it in encounters after that.
5. Add a row to the table in `docs/learning-design.md`.
6. `npm test`, then look at it in `#/preview/skill/<id>`.

## Adding a region

1. `content/regions/<order>-<id>/region.yaml` — copy an existing one. Pick a `scene` from
   `src/art/scenes/index.tsx` (or add a new scene there and a landmark in `WorldMap.tsx`).
2. Path: start with a `story` node, alternate lessons and encounters, end with a `boss`.
3. Write the intro/outro stories and the lessons in `lessons/`.
4. Add speakers to `content/cast.yaml` (and a portrait in `src/art/Portrait.tsx` if needed).
5. `requires:` the region(s) that must be finished first. Position it on the map with `map`.
