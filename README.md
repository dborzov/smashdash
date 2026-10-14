# Smashdash 🗡️📦

**Unbox the kingdom. Outsmart the Muddler. Become an algebra legend.**

Smashdash is a story-driven fantasy RPG for curious kids (about grades 3–7) that teaches the
*point* of algebra — variables, expressions, balancing and solving equations, story problems —
plus powers of ten, the distributive law and mental maths, coordinates and straight-line
graphs, and an intuitive first taste of electricity and Ohm's law. Create a hero, explore nine
regions, learn spells (skills) from a sarcastic frog, battle monsters with maths, keep your
streak alive, and try not to let your pet die of poop.

Older kids can march north instead: **The Long Count** is a darker campaign about place value
up to the millions — reading, writing, comparing, rounding and estimating big numbers, and
decimals — where the realm's ledgers have burned and a misread digit costs a battle.

▶ **Play:** https://dborzov.github.io/smashdash/

- 58 skills broken into 273 named "tiny skills" (atoms), each skill with a story lesson,
  interactive checks and a problem generator that predicts common mistakes and nudges
  instead of punishing. A **Skill Tree** page shows the state of every atom.
- **Show your work on the EQcanvas**: story problems and equations are never a multiple-choice
  question about the answer. Kids drag the story's numbers onto a slate to write the
  equation (it reads their equation back in words and marks the pieces that don't fit),
  then solve it one move at a time on both sides, with feedback, undo and a check on every
  step. Lessons play worked examples on the same slate first.
- Adaptive practice: struggle with something and you get more of exactly that, a bit easier,
  until it holds; breeze through and you move up faster.
- Visual applets: place-value chart, a counting board, number lines, a log-scale line,
  rounding, sliding digits, decimal grids, balances, circuits and more.
- Battles, treasure chests, rickety bridges, sieges, vaults, bosses, wandering monsters for
  spaced review.
- XP, levels, gold, loot, a shop, hats and capes, trophies and titles, daily bounties, a
  daily goal with streaks, and a tamagotchi-style pet with tricks, a den to decorate, and a
  habit of following you into fights.
- Beautiful maths with KaTeX; all art is procedural SVG; all sounds are synthesised.
- 100% static: progress is saved in the browser, with multiple heroes per device.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173/smashdash/
npm test           # generators, content, engine, EQcanvas, adaptive and save-compat tests
npm run ci         # what CI runs
```

Start with [`AGENTS.md`](AGENTS.md) and the [`docs/`](docs) folder.
