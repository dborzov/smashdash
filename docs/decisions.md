# Decision log

Short records of decisions and why. Newest at the bottom. Add an entry for anything a future
contributor might want to reverse.

1. **Static site, no LLM at runtime.** Owner's call: "AI" means content authored by AI in
   advance plus RNG. Keeps hosting free, private and fast.
2. **Vite + TypeScript + Preact.** Small runtime, JSX components, fast builds. Pinned to
   well-known majors (Vite 7, TS 5, Preact 10, Vitest 3) for stability.
3. **KaTeX over MathJax.** Faster, synchronous, smaller; covers everything we need.
4. **Content in YAML, generators in TypeScript.** Words are data (easy to edit and review);
   problem logic needs code. Zod schemas give one contract checked by tests only.
5. **Hash routing.** Works on GitHub Pages with no 404 tricks.
6. **localStorage, multiple profiles, export/import.** No accounts. Export/import guards
   against cleared storage and moves heroes between devices.
7. **Atomic skills + nudges.** From the owner's brief: isolate stumbling blocks (e.g. "do the
   same to both sides" before "choose the move"); forgiving retry for near-misses.
8. **Depth over breadth.** One arc (expressions → balance → one-step → two-step → stories) plus
   powers of ten. No attempt to follow a formal curriculum.
9. **Pets can die.** Owner wants consequences and black humour. Tuned so a pet survives about
   3.5 days of neglect; death is funny (flies, funeral, epitaph), and a new egg costs 60 gold.
10. **Streak shields limited.** Max 2, 150 gold, level 3+, so streaks stay meaningful.
11. **Procedural SVG art.** No asset pipeline yet; all art is code (scenes, monsters, avatar,
    pets). Painted art can be layered in later.
12. **Lessons never cost hearts.** Lessons are a safe place to learn; encounters carry the risk.
13. **Inline maths in display style.** Fractions and exponents stay full-size for young readers.
14. **Default branch `master` deploys.** GitHub Actions builds and deploys Pages on push.
15. **New topics are side regions, not insertions.** The distributive law, graphs and
    electricity got their own regions (7–9) instead of new nodes inside old paths. Inserting a
    node into an old region would re-lock its boss for existing players. `tests/compat.test.ts`
    freezes every v1 region/node/skill id and checks old saves keep their progress.
16. **No save migration for the expansion.** The `Profile` shape didn't change (skills and
    nodes are keyed by id, and missing keys mean "not started"), so `SAVE_VERSION` stays 1.
17. **Electricity through one silly metaphor.** Baby electrons crawling to the Nanny Ions,
    backed by a water tank. Physics stays honest (electrons do go − to +; the same current
    flows all round a loop) while skipping conventional-current arrows. Ohm's law is taught as
    an equation to solve, which ties the science back to the algebra arc.
18. **Halfcopy the Imp personifies the distributive misconception** ($a(x + b) = ax + b$), and
    the same mistake is reused for mental maths ($7 \times 9 = 70 - 1$), so one nudge voice
    covers both.
19. **Save version 2 (the place-value release).** Atoms, tiers, trophies, bounties, time
    tracking and the pet den needed new `Profile` fields, so `SAVE_VERSION` went to 2.
    `migrate()` only adds fields, and derives each skill's tier from its old mastery
    (< 0.35 → Novice, < 0.7 → Adept, else Master) so nobody is sent back to easy problems.
    Regions with progress count as visited, so old players don't see them as NEW. Trophies an
    old save already deserves are awarded on first load, in one summary card.
20. **A second, darker campaign instead of more Kingdom regions.** The owner asked for a
    grown-up D&D tone for older kids, without "maths is fun" or numbers hiding in boxes. The
    Long Count is its own campaign with its own voice (`tone: dark` in feedback), and the
    villains are mistakes (eating zeros, shifting digits). It is open from day one: it needs
    nothing from the algebra arc, and a 6th grader shouldn't have to clear Bramblebottom first.
21. **Adaptive runs: struggle adds practice; success skips it.** Fixed-length units either
    bored strong kids or moved struggling ones on too early. Now a miss adds a problem on the
    same atom one tier easier, and the unit can't end with a missed atom un-fixed (within a
    cap, so a bad day can't trap a kid). Tiers rise only after 4 clean in a row with no shaky
    atom; 3 clean on a mastered skill trims the unit. Struggle is rewarded (Grit XP, Rally
    hearts, extra pips shown as "training", never as failure), because a kid who struggles
    and keeps going is learning the most.
22. **Atoms are declared in content, tagged in code.** Every skill lists its tiny skills in
    `skills.yaml`; every generated problem lists the atoms it uses. Tests check both ways
    (no undeclared atoms; every declared atom actually comes up), so the Skill Tree can't
    drift from what is really practised.
23. **The adventure board replaced the map as home.** With 13 regions and more coming, a
    painted map no longer answered "where was I, what is this about, what's new?". The
    board (continue card, bounties, dispatches, region cards with topic, status, time and
    accuracy, filters) is the home screen; the painted maps live on as per-campaign atlases.
    New regions carry an `added` date and a dispatch in `news.yaml`.
24. **Place-value maths uses `{,}` in LaTeX** (`$4{,}372{,}519$`) so KaTeX doesn't add a
    space after the comma, and `words()` writes US-style number names without "and"
    ("two million forty thousand six"), matching most grade 5–6 curricula.
25. **Bond can't be farmed.** Pats give a few bond points a day; feeding, play and the bug
    hunt give the rest. Tricks and the fight companion are rewards for looking after the
    pet over days, not for tapping it a hundred times.
26. **Multi-step problems are worked on the EQcanvas, not answered.** The owner: story
    problems ended in "an idiotic multiple choice question for the final answer", the hint
    was "use x", and the app never showed or let the kid try the intermediate steps — writing
    the equation, checking it, then the moves on both sides. Now `story-to-equation`,
    `story-solve`, the one- and two-step solves, `pick-move` and `undo-order` happen on a
    slate with feedback on every step, and lessons show a worked example on the same slate
    before the kid tries. Bad moves are allowed and shown honestly (with undo) rather than
    blocked, because seeing $\frac{8x + 3}{8}$ teaches "last on, first off" better than being
    told. Any equivalent equation is accepted. "Show me" counts as a miss (it costs a heart
    in a battle); fixed slips count as *nudged*, like the old one-retry nudge.
27. **Equation logic uses exact fractions and a small expression tree** (`src/engine/eqcanvas.ts`),
    not floats or a CAS. It only needs linear equations, it must show honest fractions after
    a bad move, and it has to say *why* in kid words — a general algebra library can't.
