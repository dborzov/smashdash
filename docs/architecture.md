# Architecture

A static single-page app: **Vite + TypeScript + Preact**, maths by **KaTeX**, content in **YAML**,
deployed to **GitHub Pages** by GitHub Actions. No backend.

## Layout

```
content/                 ← all words: story, lessons, items, pets, cast (YAML)
  skills.yaml              skill ids, names, summaries, `requires`, atoms (generators live in src/skills)
  items.yaml, pets.yaml, cast.yaml, classes.yaml
  campaigns.yaml           story arcs that group regions (kingdom, march, tables, magnitude, sequel),
                           with what opens them, the rank cooldown's in-story reason and the critic
  achievements.yaml        trophies: stat + goal + reward, a shelf (`cat`) and, for region trophies, a region
  sizes.yaml               real things and their sizes (the Scale Ladder and the Scale Museum)
  news.yaml                "Dispatches" feed on the adventure board
  story/prologue.yaml
  regions/<n>-<id>/region.yaml       region: map position, palette, path, boss, ranks, treasures
  regions/<n>-<id>/lessons/*.yaml    lessons & stories (beats), including rank twists (<id>-r2, -r3)
src/
  content/   schema.ts (zod schemas = the content contract), index.ts (loads YAML via Vite)
  skills/    problem generators, one file per topic, registry in index.ts
  games/     pure mini-game logic: verdicts (what each wrong move means), checks, summaries
  engine/    pure game logic: profile, save, store, mastery (tiers, atoms), adaptive (runs),
             eqcanvas (equations: parse, check, read aloud, moves on both sides, tidy),
             play (what an answer does), events + achievements + quests (bounties), daily,
             ranks (region ranks and cooldowns), relics (treasures and relic effects),
             facts (the times-table fact map), cards (Scale Museum), critic (Mistake Hunts),
             pet + expeditions, rewards, encounters, progress, regionStats, skillTree, items,
             answer checking, rng, dates
  ui/        App.tsx (routes), router.tsx, math.ts (KaTeX + rich text),
             useTimeTracker.ts (time spent per region),
             components/ (ProblemCard, RunBar, Bounties, Dialogue, Hud, Fx, MiniPad, …),
             widgets/ (interactive maths; PlaceValue.tsx and NumberLine.tsx for place value),
             games/ (the mini-games: Chain, Tables, Scale, Algebra; kit.tsx = shared scoring),
             eqcanvas/EqCanvas.tsx (the equation slate: write it, solve it, answer it),
             encounter/ (EncounterScreen = the fight loop, Arena = the left/top picture,
             EndModals, GameArt, spec.ts = what a fight is),
             screens/ (Title, CreateHero, Adventures, WorldMap (the atlas), Region (+ RegionRanks),
             SkillTree, Lesson, Play, Hero (+ Collections), Trophies, Pet (+ PetTrips), Shop,
             Preview)
  art/       procedural SVG art: Avatar, Monster, Dark (Long Count foes and portraits), Bosses
             (one-off boss art), Npcs, Foe, Pet, Portrait, Landmarks, scenes/ (one file per
             campaign: dark, tables, magnitude, sequel; kit.tsx = the shared SVG frame)
  audio/     sfx.ts — WebAudio-synthesised sound effects (no audio files)
  styles/    main.css imports one file per area (base, shell, problems, region, effects,
             widgets, encounter, placevalue, board, skilltree, pet, eqcanvas, games, ranks)
tests/       vitest: generators, content validation, engine, ranks, mini-games, EQcanvas,
             widget logic, adaptive runs, save compatibility
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
  tap items into order, `line` — tap a point on a number line, `canvas` — write and/or
  solve an equation step by step on the EQcanvas, or `game` — one of the mini-games, with
  its spec as data), an optional `entry`
  (place-value dials instead of the keypad), the `atoms` it exercises, predicted mistakes
  with **nudges**, a hint, and a worked explanation. `generateFor(skill, level, rng, atom?)`
  can aim at one atom (rejection sampling). `tests/generators.test.ts` runs every generator
  hundreds of times per level and checks the answers, options, nudges, atoms and LaTeX.
- **Mini-games are widgets with a score.** A game answer (`{ kind: 'game', game }`) uses the
  same specs as lesson widgets (`play` beats), so a game written once works in lessons and
  fights. The logic (is this move right? what does this wrong move mean?) is pure and lives in
  `src/games/index.ts`; the components in `src/ui/games/` only draw and collect moves. A game
  reports *right*, *nudged* (got there after a nudge) or *wrong* (gave up / "Show me"), which
  feeds mastery like any other answer. `validateGame` makes sure every game can be won.
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
  bounties, boosts, the pet den and bond. Version 3 added region ranks (regions already
  finished count as rank I, with Heroic open straight away), relics, the times-table fact map
  and Scale Museum cards. `migrate()` only ever *adds* fields, so it is safe to run twice;
  `tests/compat.test.ts` loads frozen v1 and v2 saves.
- **Ranks** (`src/engine/ranks.ts`). A region's higher ranks are built from its own content:
  `rankPath(region, rank)` = the twist story + its encounters (longer, with a difficulty
  floor) + a Mistake Hunt + extra nodes from `region.yaml` + the boss with one more phase.
  The next rank opens two calendar days after the last clear (`COOLDOWN_DAYS`).
- **Rich text.** Everywhere in content: `$inline$`, `$$display$$`, `**bold**`, `*italic*`, blank
  line = paragraph. `x` and `y` are auto-coloured (`.var`), and `\hl{…}`, `\good{…}`,
  `\bad{…}`, `\muted{…}`, `\box` are available as KaTeX macros. Inline maths is rendered in
  display style so fractions stay readable.
- **Routing.** Hash routes (`#/map` — the adventure board, `#/atlas/<campaign>`,
  `#/region/<id>`, `#/play/<region>/<node>`, `#/rank/<region>/<node>` (a node of the next
  rank), `#/wander/<id|seek>`, `#/practice/<skill>`, `#/drill/<skill>/<atom?>`, `#/skills`,
  `#/story/<id>`, `#/hero/<sheet|bag|relics|collections>`, `#/trophies`, `#/pet`, `#/shop`,
  `#/preview/...`). Hash routing works on GitHub Pages without server config.
- **iPad landscape.** Fights put the picture (hero, pet, foe) in a column on the left and the
  problem on the right, so the maths never scrolls under the arena
  (`@media (min-aspect-ratio: 5/4) and (min-width: 700px)` in `encounter.css`). Portrait
  and phones stack them.

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

## Trying it in a browser

`npm run dev`, then open http://localhost:5173/smashdash/. Useful routes:
`#/preview/lesson/<id>` (any lesson, nothing saved), `#/preview/lesson/<id>/<beat>` (jump to a
beat, e.g. a mini-game), `#/preview/skill/<id>` (samples from a generator), `#/drill/<skill>`
(a practice fight on one skill).

For scripted checks (Playwright; Chromium is preinstalled in cloud sessions):
- Make a hero through `#/new` (fill *Type a name…*, click *Next →* until *Begin the
  adventure!*).
- New heroes are sent to the prologue first, and drills only open for skills the hero has
  been taught. To skip both, edit the saved profile in `localStorage` and reload: push
  `'prologue'` into `seen`, and give each skill to drill an entry in `skills`
  (`{ m: 0.2, seen: 1, right: 1, last: Date.now(), tier: 2 }`; `tier` 1–3 picks the level).
- To open ranks, mark a region's path nodes played (`nodes['<region>/<node>'] = { plays: 1,
  stars: 3 }`) and set `ranks['<region>'] = { r: 1, at: 0, run: {} }` (`at: 0` = no cooldown).
- Use `hasTouch: true` and try tablet (768 × 1024, 1024 × 768, 1366 × 1024) and phone
  (390 × 844) sizes.
- A `<Redirect>` rendered on the first frame still lands (the router catches up), but a
  screenshot taken straight after load may still show the toasts from trophies unlocked on
  load — wait ~3 s.
- KaTeX writes hidden MathML next to what you see, so `textContent` of maths repeats
  itself (`44` for a rendered `4`): select by element or position, not by maths text.
- Emulated touch isn't a real iPad: drag-and-drop still needs checking on a device.

## Content preview (for authors)

Open `#/preview` (with any hero loaded) to play any lesson without saving progress, or to see
samples from any generator at all three levels.
