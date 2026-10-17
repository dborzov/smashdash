# Content guide: adding lessons, skills, regions

Everything here is checked by `npm run validate` — run it after every content change.

## Writing style (read first)

- **The Muddled Kingdom** (regions 1–9): funny, warm, a bit naughty. Grimble is sarcastic but
  kind. Poop, burps and farts are welcome; meanness, scary gore and anything adult are not.
- **The Long Count** (regions 10–13): grown-up and grim, but kid-safe. Tired soldiers, dry
  humour, real stakes (a misread number sends the wrong patrol). No "maths is fun", no
  wizards hiding numbers in boxes. The *mistake* is the villain. Death is offstage; nobody
  is gory. Keep the beats just as short.
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
- Atom ids like `true`, `no`, `on` parse as booleans — pick another word (`honest`).
- Big numbers in maths: write `$4{,}372{,}519$` (the braces stop KaTeX adding a space after
  the comma). In plain text, `4,372,519` is fine.

## Lesson beats

```yaml
id: my-lesson # unique across the game
title: My Lesson
skill: eval-one # the skill this lesson teaches (omit for pure story)
beats:
  - type: say # speech with portrait; `who` is a key in content/cast.yaml
    who: grimble
    text: Hello!
  - type: narrate # italic narration
    text: The fog rolls in.
  - type: show # explanation panel: text and/or big maths and/or a static widget
    text: 'Subtract 5 from both sides:'
    math: '\begin{aligned} x + 5 \hl{\,- 5} &= 12 \hl{\,- 5} \\ x &= 7 \end{aligned}'
  - type: ask # multiple choice check (options are shuffled at runtime)
    text: What does $5x$ mean?
    options: ['$5 + x$', "$5 \\times x$"]
    correct: 1
    nudges: { '0': "There's an invisible **times**, not a plus." }
    explain: "$5x = 5 \\times x$."
  - type: input # number answer with keypad
    text: If $x = 5$, what is $2x$?
    answer: 10
    nudges: [{ value: 25, text: "Don't glue the digits!" }]
    hint: Swap the box for 5.
    explain: "$2 \\times 5 = 10$."
  - type: choose # choose-your-own-adventure flavour; every option is fine
    who: nettle
    text: Tea?
    options:
      - { text: Yes please!, reply: "It's mostly mud." }
      - { text: No thanks., reply: 'Smart.' }
  - type: play # interactive widget the player must complete
    text: Get the box alone!
    widget:
      {
        kind: balance,
        left: { x: 1, c: 4 },
        right: { x: 0, c: 9 },
        value: 5,
        goal: isolate,
        tools: [both],
      }
    done: 'So $x = 5$!'
  - type: input # number entered on place-value dials instead of the keypad
    text: Write two million, forty thousand and six.
    answer: 2040006
    dials: { int: 7 } # 7 whole-number dials (add `dec: 3` for decimals)
    atom: zero-inside # optional: which atom of the lesson's skill this check exercises
    explain: 'Zeros hold the empty places.'
  - type: order # tap items into order; traps are predicted wrong orders with a nudge
    text: Smallest threat first.
    items: ['$87{,}400$', '$102{,}300$', '$9{,}950$']
    correct: [2, 0, 1]
    direction: smallest → largest
    traps: [{ order: [1, 0, 2], text: 'You sorted by the first digit. Count the digits first!' }]
    explain: 'Fewer digits means smaller.'
  - type: practice # generated problems from a skill's generator (an adaptive run:
    skill: eval-one # misses add problems, see docs/learning-design.md)
    count: 4
  - type: reward # given only the first time the lesson is finished
    egg: true # or gold: 15, or item: cheese
    text: You found an egg!
```

### Widgets

| kind | fields | notes |
| --- | --- | --- |
| `boxes` | `a`, `b`, `reveal?` | a mystery boxes + b coins; with `reveal`, tap to open |
| `balance` | `left`, `right` (`{x, c}`), `value`, `goal` (`none`/`tip`/`isolate`), `tools` (`both`/`left`/`right`/`divide`/`boxes`) | `value` = what's in a box; must start balanced for `isolate`; `boxes` = take a box off both pans |
| `unwrap` | `layers` (inside → out, e.g. `['\times 3', '+ 5']`), `value?` | tap the outer layer first |
| `tower` | `base`, `exp` | build $base^{exp}$ floor by floor |
| `powers` | `min`, `max`, `start` | slider over $10^n$ with real-world sizes |
| `hop` | `mantissa`, `exp` | decimal point hops |
| `groups` | `n`, `c`, `x?`, `sort?` | $n(x + c)$ as n parcels; with `sort`, tap to unpack into piles |
| `area` | `rows`, `tens`, `extra`, `tap?` | rows × (tens ± extra) crystals; negative `extra` = a bat eats columns |
| `plot` | `size?`, `points?`, `line?`, `rule?` + `targets?`, `aim?` | coordinate grid; `aim` = fire at given points; `rule` + `targets` = work out each y, then fire |
| `circuit` | `cells`, `flipped?`, `load?`, `ohms?`, `mud?`, `mudOhms?`, `gap?`, `sameEnd?`, `readout?`, `tools?`, `goal?`, `target?`, `fuse?` | battery loop; `tools`: `cells`/`mud`/`flip`/`close`; `goal`: `close`/`volts`/`amps` |
| `pipe` | `height`, `squeeze`, `target?` | water analogy: flow = height ÷ squeeze |
| `placechart` | `value?`, `dec?`, `top?`, `hl?`, `hide?`, `tap?` | place-value columns; `hl` highlights a place (power of ten); `tap` = tap that many columns to see their worth |
| `abacus` | `places`, `start?`, `target?` | the Reckoning Board: tokens per place, trade ten for one / break one into ten; done when it shows `target` with no column over 9 |
| `numberline` | `min`, `max`, `step`, `minor?`, `labels?` (`ends`/`all`), `arrow?`, `marks?`, `band?`, `target?`, `tolerance?` | `band` shades a range (what rounds to a value); with `target`, tap to place it |
| `logline` | `min`, `max` (powers of ten), `target?`, `linear?` | log scale: every ×10 is one step; drag `target` into its stretch; `linear` adds a normal line underneath |
| `rounder` | `value`, `place` (power of ten, −2…7) | pick the nearer round number on a zoomed line |
| `shifter` | `value`, `times` (−4…4) | ×10 / ÷10 as digits sliding past a fixed point |
| `decgrid` | `value` (0–1) | tenths/hundredths shaded on a grid |
| `eqcanvas` | `mode` (`build`/`solve`/`full`/`move`), `equation`, `story?`, `question?`, `unknown?`, `unit?`, `words?`, `scaffold?`, `traps?`, `hints?`, `demo?` | the equation slate (see below) |

**Mini-games** are widgets too (logic in `src/games/index.ts`; every spec is checked by
`validateGame` in the tests). Generators use the same specs as `game` answers.

| kind | fields | notes |
| --- | --- | --- |
| `array` | `rows`, `cols`, `mode?` (`show`/`build`/`turn`/`split`/`double`), `target?`, `fixRows?`, `at?` | gem grids: rows × columns; build at most 8 rows |
| `skipjump` | `step`, `jumps`, `start?` | a frog hops along a line; tap where each hop lands |
| `tablegrid` | `mode` (`show`/`find`/`squares`/`mirror`/`row`), `size?`, `target?`, `row?` | the times-table grid |
| `squaregrow` | `upto` (2–8) | grow a square one L-shaped layer at a time |
| `chain` | `steps` (`tex` with `\box`, `answer`, `say?`, `options?`, `nudges?`, `hint?`, `note?`, `tolerance?`), `pics?` | a row of small steps, each with its own box and feedback |
| `sizeline` | `items` (ids in `content/sizes.yaml`), `min?`, `max?` | the Scale Ladder |
| `sampler` | `n`, `grid`, `seed`, `icon?` | count one patch, scale up |
| `balloon` | `start`, `op?` (`add`/`sub`), `k?` | balloons +1, sandbags −1; without `op` it's a sandbox |
| `sorter` | `terms` (e.g. `['3x', '-2', 'x^2']`) | sort into piles, total each pile |
| `fruit` | `rows` (`items`, `total`), `values`, `ask?` | picture equations; `ask` = the order to find them |
| `ineqline` | `min`, `max`, `value`, `op` (`<`/`>`/`<=`/`>=`) | pick the dot and the side |
| `matchsticks` | `shape` (`squares`/`triangles`/`houses`), `stages` | a growing pattern (show it in a `show` beat) |

Jump straight to a beat while writing: `#/preview/lesson/<id>/<beat index>`.

### The EQcanvas slate

Use it wherever a kid writes or solves an equation — never ask for just the final number of
a multi-step problem. `equation` is plain text: `'8x+3=51'`, `'x/4=6'`, `'3(x+2)=21'`,
`'12=x+3'`. `x` is worked out from it.

```yaml
  - type: play
    who: pib
    text: Watch me crack it. Tap **Next step**.
    widget:
      kind: eqcanvas
      mode: full          # build: write it · solve: solve it · full: both + answer · move: first move only
      demo: true          # plays itself (a worked example); leave out to let the kid do it
      equation: '6x+2=20'
      story: >-
        I sell apples in bags of [[6|apples in each bag]]. The troll bought some bags plus
        [[2|loose apples]] loose ones — [[20|apples in all]] apples.
      question: How many bags did the troll buy?
      unknown: the number of bags
      unit: bags
      words: apples in the bags + loose apples = all the apples
      scaffold: true      # show `words` from the start (else after the first miss)
      traps:              # predicted wrong equations, each with a nudge
        - { eq: '2x+6=20', text: "Swapped! **Each** bag holds 6, so the 6 goes with $x$." }
      hints: ["Say it in words first: …", "$x$ bags of 6 is $6x$.", "…"]
```

- Every number of the story is a tile: `[[value|what it means]]`. Write the meaning so it
  reads after the number ("legs on each spider", "gold in total") — the slate reads the
  kid's equation back with it. `[[4|cousins|decoy]]` is a number the question doesn't need.
- Tests check that the equation can be built from the story's tiles, every non-decoy tile
  is used, traps really are wrong, and the equation can be solved by peeling layers.
- Generators return `answer: { kind: 'canvas', … }` with the same fields (`src/skills/words.ts`).

`boxes`, `balance`, `groups`, `area`, `plot` and `circuit` also work as still pictures in `ask`
and `input` beats. Tests check that every interactive goal can actually be reached (plot
targets on the grid, circuit and pipe targets reachable with the tools given, abacus targets
that fit the board, number-line and log-line targets on the line and not already solved).

## Adding a skill

1. Add the entry to `content/skills.yaml` (id, name, region, icon, summary, `requires` — the
   skills it builds on, drawn as the Skill Tree graph — and `atoms`: 2–7 tiny skills, each
   `{ id, name }` where `name` is rich text with an example, e.g. `'$10^2 = 100$'`).
2. Write a generator in `src/skills/<topic>.ts`: `(rng, level) => Problem`. Use `choice()` and
   `numeric()` from `src/skills/util.ts` (or an `order` / `line` answer — see
   `src/skills/placevalue.ts`); give every predicted mistake a
   nudge; keep answers clean (integers or short decimals); add a hint and a worked `explain`.
   Set `atoms` on every problem to the atom ids it exercises. Tests check every atom used is
   declared, and that every declared atom actually comes up.
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
5. `requires:` the region(s) that must be finished first (same campaign). Position it on the
   campaign's atlas with `map`.
6. Set `campaign:` (an id in `content/campaigns.yaml`, or add a campaign there with its
   `cooldown` excuse, `critic` and what `requires` it), `topic:`
   (one line of what it teaches — shown on its card) and `added:` (the date it ships; it is
   marked NEW on the adventure board for a while and until visited).
7. Add a dispatch to `content/news.yaml` so players notice it.
8. Never insert nodes into an existing region's path (it would re-lock bosses for existing
   players); add a new region instead. See `docs/decisions.md`.
9. **Ranks.** Add `ranks:` for rank 2 and 3: a twist `story` (a lesson file named
   `<region>-r2` / `-r3`), a `boss` variant (`name`, `hue?`, `intro`, `taunts` — one per phase
   *plus one for the extra phase*, `defeat`) and, for rank 2, one extra `nodes` encounter using
   the region's own skills (tests enforce that). Ranks 4–5 reuse rank 3's path, harder.
10. **Treasures.** Add three items to `content/items.yaml` with `from: <region>` and
   `inShop: false` (they then never drop as ordinary loot): a souvenir (food/toy, `rank: 2`), a
   relic (`kind: relic` + `relic:` effect, usually `campaign:`-scoped, `rank: 3`), and a hat,
   cape or decor (`flawless: 5`). New capes need a colour in `CAPES` (`src/art/Avatar.tsx`),
   new hats a `HatArt` case, new decor a spot in `DECOR_SPOTS` (`src/ui/screens/Pet.tsx`).
11. **Region trophies.** At least two in `content/achievements.yaml` with `cat: region` and
   `region: <id>` (e.g. `rank:<id>` goal 3, `flawless:<id>` goal 10). Tests check every region
   has some.

## Achievements, bounties, items

- Trophies live in `content/achievements.yaml`: `{ id, name, icon, desc, stat, goal, gold,
item?, title?, secret?, cat, region? }`. `cat` is the Trophy Room shelf. `stat` is an event
  counter (see `GAME_EVENTS` in `src/engine/events.ts`), a derived stat (`DERIVED_STATS` /
  `statValue` in `src/engine/achievements.ts`), or a per-id stat: `region:<id>`,
  `campaign:<id>`, `rank:<region>`, `win:<region>`, `flawless:<region>`, `boss:<region>`,
  `hunt:<region>`. Tests reject unknown stats and trophies a new hero would already have.
- Bounties are code (`QUESTS` in `src/engine/quests.ts`) because their goals and conditions
  are logic.
- Items: `kind` is `food`, `toy`, `care`, `potion`, `hat`, `cape`, `special`, `decor` (goes in
  the pet den, one of each) or `relic` (worn in a relic slot; `relic:` says what it does —
  `hearts`, `hints`, `ward`, `gold`, `xp`, `rally`, `pet` — and `campaign:` limits it to one
  campaign). `from: <region>` marks a region treasure.
  Effects include `ward`, `lens`, `boost` (`xp2`/`lucky` + `minutes`), `bond`.
