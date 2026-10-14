# Architecture

A static single-page app: **Vite + TypeScript + Preact**, maths by **KaTeX**, content in **YAML**,
deployed to **GitHub Pages** by GitHub Actions. No backend.

## Layout

```
content/                 ← all words: story, lessons, items, pets, cast (YAML)
  skills.yaml              skill ids, names, summaries, `requires`, atoms (generators live in src/skills)
  items.yaml, pets.yaml, cast.yaml, classes.yaml
  campaigns.yaml           story arcs that group regions (kingdom, march)
  achievements.yaml        trophies: stat + goal + reward
  news.yaml                "Dispatches" feed on the adventure board
  story/prologue.yaml
  regions/<n>-<id>/region.yaml       region: map position, palette, path of nodes, boss
  regions/<n>-<id>/lessons/*.yaml    lessons & stories (beats)
src/
  content/   schema.ts (zod schemas = the content contract), index.ts (loads YAML via Vite)
  skills/    problem generators, one file per topic, registry in index.ts
  engine/    pure game logic: profile, save, store, mastery (tiers, atoms), adaptive (runs),
             eqcanvas (equations: parse, check, read aloud, moves on both sides, tidy),
             play (what an answer does), events + achievements + quests (bounties), daily,
             pet, rewards, encounters, progress, regionStats, skillTree, items, answer
             checking, rng, dates
  ui/        App.tsx (routes), router.tsx, math.ts (KaTeX + rich text),
             useTimeTracker.ts (time spent per region),
             components/ (ProblemCard, RunBar, Bounties, Dialogue, Hud, Fx, …),
             widgets/ (interactive maths; PlaceValue.tsx and NumberLine.tsx for place value),
             eqcanvas/EqCanvas.tsx (the equation slate: write it, solve it, answer it),
             screens/ (Title, CreateHero, Adventures, WorldMap (the atlas), Region, SkillTree,
             Lesson, Encounter, Play, Hero, Pet, Shop, Preview)
  art/       procedural SVG art: Avatar, Monster, Dark (Long Count foes and portraits), Foe,
             Pet, Portrait, scenes/ (scenes/dark.tsx for the Long Count), paint.ts helpers
  audio/     sfx.ts — WebAudio-synthesised sound effects (no audio files)
  styles/    main.css — design tokens + all styles
tests/       vitest: generators, content validation, engine, EQcanvas, widget logic, save compatibility
docs/        you are here
```

## Key ideas

- **Content is data.** The game reads YAML through `src/content/index.ts` only. The schema in
  `src/content/schema.ts` is the contract; `tests/content.test.ts` validates every file,
  every cross-reference (lessons, skills, speakers, items), that every skill has exactly one
  lesson, that nothing is practised before it is taught, and that every bit of LaTeX renders.
  Zod is only used in tests, so it never ships to players.
- **Generators are code.** `src/skills/*.ts` export `(rng, level) => Problem`. A `Problem` has a
  prompt (rich text), optional big maths and picture, an answer (number, choice, `order` —
  tap items into order, `line` — tap a point on a number line, or `canvas` — write and/or
  solve an equation step by step on the EQcanvas), an optional `entry`
  (place-value dials instead of the keypad), the `atoms` it exercises, predicted mistakes
  with **nudges**, a hint, and a worked explanation. `generateFor(skill, level, rng, atom?)`
  can aim at one atom (rejection sampling). `tests/generators.test.ts` runs every generator
  hundreds of times per level and checks the answers, options, nudges, atoms and LaTeX.
- **What an answer does** lives in one place, `answerEffects` (`src/engine/play.ts`): it
  records mastery, atoms and tiers, grants XP (grit, combos, promotions) and calls
  `track()`, which bumps counters, advances bounties and unlocks trophies. Lessons,
  encounters and drills all go through it. Practice units are adaptive runs
  (`src/engine/adaptive.ts`, see `docs/learning-design.md`).
- **Seeded randomness.** Everything random goes through `Rng` (`src/engine/rng.ts`), so any
  problem can be reproduced from a seed.
- **State.** One `Profile` object per hero (`src/engine/profile.ts`) stored in localStorage
  (`src/engine/save.ts`). The store (`src/engine/store.ts`) holds the active profile; UI
  changes it only via `update(fn)`, which clones, mutates, saves and re-renders, and collects
  reward effects (`Fx`) for the celebration layer. Time-based systems (day roll, pet, wandering
  monsters) catch up on load and every minute.
- **Save versioning.** `SAVE_VERSION` + `migrate()` in `save.ts`. Bump and add a migration step
  whenever the `Profile` shape changes. Never break existing saves. Version 2 added atoms,
  tiers (derived from old mastery), trophies, counters, time per region, visited regions,
  bounties, boosts, the pet den and bond. `migrate()` only ever *adds* fields, so it is safe
  to run twice; `tests/compat.test.ts` loads a frozen v1 save.
- **Rich text.** Everywhere in content: `$inline$`, `$$display$$`, `**bold**`, `*italic*`, blank
  line = paragraph. `x` and `y` are auto-coloured (`.var`), and `\hl{…}`, `\good{…}`,
  `\bad{…}`, `\muted{…}`, `\box` are available as KaTeX macros. Inline maths is rendered in
  display style so fractions stay readable.
- **Routing.** Hash routes (`#/map` — the adventure board, `#/atlas/<campaign>`,
  `#/region/<id>`, `#/play/<region>/<node>`, `#/wander/<id|seek>`, `#/practice/<skill>`,
  `#/drill/<skill>/<atom?>`, `#/skills`, `#/story/<id>`, `#/hero`, `#/pet`, `#/shop`,
  `#/preview/...`). Hash routing works on GitHub Pages without server config.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload (http://localhost:5173/smashdash/) |
| `npm test` | All tests (generators, content, engine, adaptive runs, widgets, save compat) |
| `npm run validate` | Content validation only |
| `npm run check` | Typecheck + content validation |
| `npm run build` | Check, then build to `dist/` |
| `npm run ci` | What CI runs: check + tests + build |
| `npm run format` | Prettier |

## Deployment

`.github/workflows/deploy.yml` builds and deploys on every push to `master`.
`.github/workflows/ci.yml` checks pull requests and other branches. The Vite `base` is
`/smashdash/` (see `vite.config.ts`); for a custom domain set `base: '/'` and add
`public/CNAME`.

## Content preview (for authors)

Open `#/preview` (with any hero loaded) to play any lesson without saving progress, or to see
samples from any generator at all three levels.
