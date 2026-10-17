# AGENTS.md — working on Smashdash

Smashdash is a static web RPG that teaches algebra, equations and powers of ten to bright kids
(grades ~3–7). Live at https://dborzov.github.io/smashdash/. This is a long-lived project:
keep it organised, tested and documented.

## Read before changing things

- `docs/vision.md` — the owner's intent and tone. **Funny, alive, a bit naughty; never dry.**
  (The Long Count campaign is the grown-up, darker voice — still never dry, never "maths is fun".)
- `docs/learning-design.md` — the skill graph, atoms, stumbling blocks, mastery/tiers and
  adaptive runs.
- `docs/game-design.md` — campaigns, loop, economy, trophies, bounties, pet, streaks.
- `docs/architecture.md` — code layout, state, routing, commands.
- `docs/content-guide.md` — how to write lessons, skills, regions (YAML gotchas!).
- `docs/decisions.md` — why things are the way they are. Add entries for new decisions.

## Ground rules

1. **Content vs code.** Words go in `content/*.yaml`; logic in `src/`. Don't hard-code story
   text in components.
2. **Run the checks.** `npm run ci` (typecheck + content validation + tests + build) must pass
   before you push. `npm run validate` after any content edit.
3. **Atomic skills.** One idea per skill. Every skill: an entry in `content/skills.yaml` (with
   its atoms), a generator in `src/skills/` that tags every problem with its atoms, exactly
   one teaching lesson, and nudges for its classic mistakes.
   Never practise a skill before it is taught (tests enforce this).
4. **Maths rendering.** Always `$…$` LaTeX in content. Check new LaTeX renders (tests do).
5. **Saves are sacred.** If you change `Profile`, bump `SAVE_VERSION` and add a migration in
   `src/engine/save.ts`. Never break existing players' progress.
6. **Kid-first UI.** Works on iPad (touch, 768–1366 px) and desktop. Big tap targets, big
   maths, no hover-only interactions. Respect `prefers-reduced-motion`.
7. **Randomness goes through `Rng`** (`src/engine/rng.ts`) so problems are reproducible.
8. **Tone check.** Read new text out loud. If it sounds like a textbook, rewrite it.
9. **Update the docs** when you change behaviour, numbers, or structure.
10. **Teach the steps, don't quiz the answer.** Multi-step work (writing an equation, solving
    it) happens on the **EQcanvas** (`src/ui/eqcanvas/`, logic in `src/engine/eqcanvas.ts`),
    with feedback on every step — never a multiple-choice or keypad question about the final
    answer. Hints must be about the kid's current step, never generic ("use $x$"). New
    topics that involve equations should use or extend the slate. See `docs/vision.md`
    (*Teach, don't quiz*).
11. **Games, not quiz spam.** If an idea has a picture, make the problem a mini-game (logic in
    `src/games/index.ts`, UI in `src/ui/games/`, spec in the `Widget` schema) that judges every
    move with a reason. Multiple choice only for genuine "which one?" questions.
12. **Every region is replayable.** A new region ships with ranks 2–3 (twist stories, boss
    variants, one extra node), three treasures and its own trophies — see *Adding a region* in
    `docs/content-guide.md`. Tests enforce most of it.

## Handy

- `npm run dev` then open http://localhost:5173/smashdash/
- `#/preview` — play any lesson without saving, sample any generator.
- `#/skills` — the Skill Tree: every skill and atom, with the player's state.
- To try a change in a real browser (or with Playwright), see *Trying it in a browser* in
  `docs/architecture.md` — it explains how to skip the prologue and unlock skills for drills.
- Touch matters: anything draggable must work with a finger on an iPad, not only a mouse.
- Deploys automatically from `master` via `.github/workflows/deploy.yml`.
