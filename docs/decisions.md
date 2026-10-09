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
