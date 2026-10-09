# AGENTS.md — working on Smashdash

Smashdash is a static web RPG that teaches algebra, equations and powers of ten to bright kids
(grades ~3–7). Live at https://dborzov.github.io/smashdash/. This is a long-lived project:
keep it organised, tested and documented.

## Read before changing things

- `docs/vision.md` — the owner's intent and tone. **Funny, alive, a bit naughty; never dry.**
- `docs/learning-design.md` — the skill graph, stumbling blocks and mastery model.
- `docs/game-design.md` — loop, economy, pet, streaks.
- `docs/architecture.md` — code layout, state, routing, commands.
- `docs/content-guide.md` — how to write lessons, skills, regions (YAML gotchas!).
- `docs/decisions.md` — why things are the way they are. Add entries for new decisions.

## Ground rules

1. **Content vs code.** Words go in `content/*.yaml`; logic in `src/`. Don't hard-code story
   text in components.
2. **Run the checks.** `npm run ci` (typecheck + content validation + tests + build) must pass
   before you push. `npm run validate` after any content edit.
3. **Atomic skills.** One idea per skill. Every skill: an entry in `content/skills.yaml`, a
   generator in `src/skills/`, exactly one teaching lesson, and nudges for its classic mistakes.
   Never practise a skill before it is taught (tests enforce this).
4. **Maths rendering.** Always `$…$` LaTeX in content. Check new LaTeX renders (tests do).
5. **Saves are sacred.** If you change `Profile`, bump `SAVE_VERSION` and add a migration in
   `src/engine/save.ts`. Never break existing players' progress.
6. **Kid-first UI.** Works on iPad (touch, 768–1366 px) and desktop. Big tap targets, big
   maths, no hover-only interactions. Respect `prefers-reduced-motion`.
7. **Randomness goes through `Rng`** (`src/engine/rng.ts`) so problems are reproducible.
8. **Tone check.** Read new text out loud. If it sounds like a textbook, rewrite it.
9. **Update the docs** when you change behaviour, numbers, or structure.

## Handy

- `npm run dev` then open http://localhost:5173/smashdash/
- `#/preview` — play any lesson without saving, sample any generator.
- Deploys automatically from `master` via `.github/workflows/deploy.yml`.
