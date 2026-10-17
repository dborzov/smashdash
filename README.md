# Smashdash 🗡️📦

**Unbox the kingdom. Outsmart the Muddler. Become an algebra legend.**

Smashdash is a story-driven fantasy RPG for curious kids (about grades 3–7) that teaches the
*point* of algebra — variables, expressions, balancing and solving equations, story problems —
plus powers of ten, the distributive law and mental maths, coordinates and straight-line
graphs, and an intuitive first taste of electricity and Ohm's law. Create a hero, explore nine
regions, learn spells (skills) from a sarcastic frog, battle monsters with maths, keep your
streak alive, and try not to let your pet die of poop.

Five campaigns, each a different way in:

- **The Muddled Kingdom** — the algebra adventure above (9 regions).
- **The Long Count** — a darker campaign for older kids about place value up to the millions,
  rounding, estimating and decimals, where the realm's ledgers have burned.
- **Dungeons & Times Tables** — a D&D parody for the youngest: arrays, doubling, the nine
  trick, square numbers and the patterns in the 12 × 12 table, with a Fact Map of all 78 facts.
- **The Order of Magnitude** — superhero school for estimators: from atoms to galaxies on the
  Scale Ladder, Fermi chains, crowd counting and powers of ten.
- **The Muddler Strikes Back** — the sequel: negative numbers, like terms, $x$ on both sides,
  matchstick patterns, fruit puzzles and inequalities. (He has two hats now.)

▶ **Play:** https://dborzov.github.io/smashdash/

- 90 skills broken into 406 named "tiny skills" (atoms), each skill with a story lesson,
  interactive checks and a problem generator that predicts common mistakes and nudges
  instead of punishing. A **Skill Tree** page shows the state of every atom.
- **Show your work on the EQcanvas**: story problems and equations are never a multiple-choice
  question about the answer. Kids drag the story's numbers onto a slate to write the
  equation (it reads their equation back in words and marks the pieces that don't fit),
  then solve it one move at a time on both sides, with feedback, undo and a check on every
  step. Lessons play worked examples on the same slate first.
- Adaptive practice: struggle with something and you get more of exactly that, a bit easier,
  until it holds; breeze through and you move up faster.
- Mini-games instead of multiple-choice spam: gem grids, a skip-counting frog, chains of small
  steps, the Scale Ladder, a hot-air balloon for negative numbers, a lost-property sorter for
  like terms, fruit puzzles, matchstick patterns — plus place-value charts, number lines,
  balances, circuits and more.
- **Ranks**: every region can be replayed at Heroic, Legendary, Mythic and Ridiculous, two
  days apart, with harder problems, plot twists, Mistake Hunts and treasure only that region
  gives.
- Battles, treasure chests, rickety bridges, sieges, vaults, bosses, wandering monsters for
  spaced review.
- XP, levels, gold, loot, a shop, hats and capes, relics, a Trophy Room (with trophies only
  one adventure can give), daily bounties, a daily goal with streaks, and a tamagotchi-style
  pet with tricks, expeditions, a den to decorate, and a habit of following you into fights.
- Made for iPad: in landscape, fights put the characters on the left and the maths on the right.
- Beautiful maths with KaTeX; all art is procedural SVG; all sounds are synthesised.
- 100% static: progress is saved in the browser, with multiple heroes per device.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173/smashdash/
npm test           # generators, content, engine, ranks, mini-games, EQcanvas, adaptive, save compat
npm run ci         # what CI runs
```

Start with [`AGENTS.md`](AGENTS.md) and the [`docs/`](docs) folder.
