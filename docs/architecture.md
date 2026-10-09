# Architecture

A static single-page app: **Vite + TypeScript + Preact**, maths by **KaTeX**, content in **YAML**,
deployed to **GitHub Pages** by GitHub Actions. No backend.

## Layout

```
content/                 ← all words: story, lessons, items, pets, cast (YAML)
  skills.yaml              skill ids, names, summaries (generators live in src/skills)
  items.yaml, pets.yaml, cast.yaml, classes.yaml
  story/prologue.yaml
  regions/<n>-<id>/region.yaml       region: map position, palette, path of nodes, boss
  regions/<n>-<id>/lessons/*.yaml    lessons & stories (beats)
src/
  content/   schema.ts (zod schemas = the content contract), index.ts (loads YAML via Vite)
  skills/    problem generators, one file per topic, registry in index.ts
  engine/    pure game logic: profile, save, store, mastery, daily, pet, rewards,
             encounters, progress, items, answer checking, rng, dates
  ui/        App.tsx (routes), router.tsx, math.ts (KaTeX + rich text),
             components/ (ProblemCard, Dialogue, Hud, Fx, …), widgets/ (interactive maths),
             screens/ (Title, CreateHero, WorldMap, Region, Lesson, Encounter, Play, Hero, Pet,
             Shop, Preview)
  art/       procedural SVG art: Avatar, Monster, Pet, Portrait, scenes/, paint.ts helpers
  audio/     sfx.ts — WebAudio-synthesised sound effects (no audio files)
  styles/    main.css — design tokens + all styles
tests/       vitest: generators, content validation, engine
docs/        you are here
```

## Key ideas

- **Content is data.** The game reads YAML through `src/content/index.ts` only. The schema in
  `src/content/schema.ts` is the contract; `tests/content.test.ts` validates every file,
  every cross-reference (lessons, skills, speakers, items), that every skill has exactly one
  lesson, that nothing is practised before it is taught, and that every bit of LaTeX renders.
  Zod is only used in tests, so it never ships to players.
- **Generators are code.** `src/skills/*.ts` export `(rng, level) => Problem`. A `Problem` has a
  prompt (rich text), optional big maths and picture, an answer (number or choice), predicted
  mistakes with **nudges**, a hint, and a worked explanation. `tests/generators.test.ts` runs
  every generator 400× per level and checks the answers, options, nudges and LaTeX.
- **Seeded randomness.** Everything random goes through `Rng` (`src/engine/rng.ts`), so any
  problem can be reproduced from a seed.
- **State.** One `Profile` object per hero (`src/engine/profile.ts`) stored in localStorage
  (`src/engine/save.ts`). The store (`src/engine/store.ts`) holds the active profile; UI
  changes it only via `update(fn)`, which clones, mutates, saves and re-renders, and collects
  reward effects (`Fx`) for the celebration layer. Time-based systems (day roll, pet, wandering
  monsters) catch up on load and every minute.
- **Save versioning.** `SAVE_VERSION` + `migrate()` in `save.ts`. Bump and add a migration step
  whenever the `Profile` shape changes. Never break existing saves.
- **Rich text.** Everywhere in content: `$inline$`, `$$display$$`, `**bold**`, `*italic*`, blank
  line = paragraph. `x` and `y` are auto-coloured (`.var`), and `\hl{…}`, `\good{…}`,
  `\bad{…}`, `\muted{…}`, `\box` are available as KaTeX macros. Inline maths is rendered in
  display style so fractions stay readable.
- **Routing.** Hash routes (`#/map`, `#/region/<id>`, `#/play/<region>/<node>`,
  `#/wander/<id|seek>`, `#/practice/<skill>`, `#/story/<id>`, `#/hero`, `#/pet`, `#/shop`,
  `#/preview/...`). Hash routing works on GitHub Pages without server config.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload (http://localhost:5173/smashdash/) |
| `npm test` | All tests (generators, content, engine) |
| `npm run validate` | Content validation only |
| `npm run check` | Typecheck + content validation |
| `npm run build` | Check, then build to `dist/` |
| `npm run ci` | What CI runs: check + tests + build |
| `npm run format` | Prettier |

## Deployment

`.github/workflows/deploy.yml` builds and deploys on every push to `master` (if it is not there yet, install it from `docs/github-workflows/`).
`.github/workflows/ci.yml` checks pull requests and other branches. The Vite `base` is
`/smashdash/` (see `vite.config.ts`); for a custom domain set `base: '/'` and add
`public/CNAME`.

## Content preview (for authors)

Open `#/preview` (with any hero loaded) to play any lesson without saving progress, or to see
samples from any generator at all three levels.
