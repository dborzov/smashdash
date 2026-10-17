/**
 * The Muddler Strikes Back, part 3 — x on both sides. First on the balance (take the same
 * number of boxes off both pans), then on the EQcanvas (subtract the smaller x-term from both
 * sides, then finish as usual), then equations with brackets.
 */
import type { ChainStep, GameSpec, Generator, Visual } from './types';
import type { Rng } from '../engine/rng';

const game = (g: GameSpec) => ({ answer: { kind: 'game' as const, game: g } });
const chain = (steps: ChainStep[], pics?: Visual[]) =>
  game({
    kind: 'chain',
    steps: steps.map((st) => ({ ...st, nudges: st.nudges?.filter((n) => n.value !== st.answer) })),
    pics,
  });
const xt = (c: number) => (c === 1 ? 'x' : `${c}x`);
const lin = (a: number, b: number) => (b === 0 ? xt(a) : b > 0 ? `${xt(a)} + ${b}` : `${xt(a)} - ${-b}`);
const linText = (a: number, b: number) => lin(a, b).replace(/ /g, '');

/** ax + b = cx + d with a > c ≥ 1 and whole-number solution x (b, d ≥ 0 when `pos`). */
function twoSided(rng: Rng, pos: boolean, negSolution = false) {
  for (;;) {
    const c = rng.int(1, 4);
    const a = c + rng.int(1, 4);
    const x = negSolution ? -rng.int(1, 6) : rng.int(1, 9);
    const b = pos ? rng.int(1, 12) : rng.int(-9, 12);
    const d = (a - c) * x + b;
    if (pos && d <= 0) continue;
    if (d === b) continue;
    return { a, b, c, d, x };
  }
}

export const boxesBoth: Generator = (rng, level) => {
  const { a, b, c, d, x } = twoSided(rng, true);
  const pan = (n: number, k: number) => ({ x: n, c: k });
  if (level === 1) {
    return {
      skill: 'boxes-both',
      atoms: ['remove-boxes', 'smaller-side'],
      prompt: `Bal and Ance's scales hold boxes on **both** pans. Take ${c} box${c > 1 ? 'es' : ''} off each pan. What's left on the left?`,
      visual: { kind: 'balance', left: pan(a, b), right: pan(c, d) },
      ...chain(
        [
          {
            tex: `${lin(a, b)} = ${lin(c, d)} \\;\\to\\; \\box x + ${b} = ${d}`,
            answer: a - c,
            nudges: [
              { value: a, text: `Take ${c} boxes off the left too — both pans!` },
              { value: a + c, text: `Take boxes **off**, don't add them.` },
            ],
          },
        ],
        [{ kind: 'balance', left: pan(a - c, b), right: pan(0, d) }],
      ),
      explain: `Taking ${c} boxes off both pans keeps the balance: $${lin(a - c, b)} = ${d}$.`,
    };
  }
  return {
    skill: 'boxes-both',
    atoms: ['remove-boxes', 'then-solve'],
    prompt: `Solve it on the scales: boxes off both pans first, then coins, then share out.`,
    visual: { kind: 'balance', left: pan(a, b), right: pan(c, d) },
    ...chain([
      { tex: `${lin(a, b)} = ${lin(c, d)} \\;\\to\\; ${xt(a - c)} + ${b} = \\box`, answer: d, say: `Take ${c} box${c > 1 ? 'es' : ''} off both pans.` },
      { tex: `${xt(a - c)} = ${d} - ${b} = \\box`, answer: d - b, nudges: [{ value: d + b, text: `Take the ${b} coins off both pans: subtract.` }] },
      {
        tex: `x = ${d - b} \\div ${a - c} = \\box`,
        answer: x,
        nudges: [{ value: (d - b) * (a - c), text: `Share the coins between the ${a - c} boxes: divide.` }],
        note: `Check: $${a} \\times ${x} + ${b} = ${a * x + b}$ and $${c} \\times ${x} + ${d} = ${c * x + d}$ ✓`,
      },
    ]),
    explain: `$${lin(a, b)} = ${lin(c, d)} \\Rightarrow ${lin(a - c, b)} = ${d} \\Rightarrow ${xt(a - c)} = ${d - b} \\Rightarrow x = ${x}$.`,
  };
};

export const bothSidesSolve: Generator = (rng, level) => {
  const { a, b, c, d, x } = twoSided(rng, level < 3, level === 3 && rng.chance(0.5));
  // Sometimes the x ends up on the right: write the bigger x-term on the right.
  const flip = level >= 2 && rng.chance(0.35);
  const eq = flip ? `${linText(c, d)}=${linText(a, b)}` : `${linText(a, b)}=${linText(c, d)}`;
  const atoms = ['collect-x', 'collect-n'];
  if (flip) atoms.push('x-right');
  if (x < 0 || b < 0) atoms.push('negative');
  if (level === 1 && rng.chance(0.4))
    return {
      skill: 'both-sides-solve',
      atoms: ['collect-x'],
      prompt: `There's $x$ on both sides. What's the best **first** move?`,
      answer: { kind: 'canvas', mode: 'move', equation: eq, x },
      hint: `Take the smaller $x$-term away from both sides.`,
      explain: `Subtract $${xt(c)}$ from both sides first: then $x$ is only on one side.`,
    };
  return {
    skill: 'both-sides-solve',
    atoms,
    prompt: `Solve it on the slate. First get $x$ onto one side only.`,
    answer: { kind: 'canvas', mode: 'solve', equation: eq, x },
    hint: `Subtract $${xt(c)}$ from both sides.`,
    explain: `$${lin(a, b)} = ${lin(c, d)}$: subtract $${xt(c)}$, then ${b > 0 ? `subtract ${b}` : `add ${-b}`}, then divide by ${a - c}: $x = ${x}$.`,
  };
};

export const bracketEq: Generator = (rng, level) => {
  const kind = rng.pick(level === 1 ? ['plus'] : level === 2 ? ['minus', 'plus'] : ['both', 'minus']);
  if (kind === 'both') {
    // a(x + b) = cx + d, with a > c
    for (;;) {
      const c = rng.int(1, 3);
      const a = c + rng.int(1, 3);
      const b = rng.int(1, 6);
      const x = rng.int(1, 8);
      const d = a * (x + b) - c * x;
      if (d <= a * b) continue;
      return {
        skill: 'bracket-eq',
        atoms: ['brackets-both'],
        prompt: `A bracket AND $x$ on both sides. Take the $${xt(c)}$ off both sides first — the slate will tidy the bracket.`,
        answer: { kind: 'canvas', mode: 'solve', equation: `${a}(x+${b})=${linText(c, d)}`, x },
        hint: `Subtract $${xt(c)}$ from both sides.`,
        explain: `$${a}(x + ${b}) - ${xt(c)} = ${xt(a - c)} + ${a * b}$, so $${lin(a - c, a * b)} = ${d}$ and $x = ${x}$.`,
      };
    }
  }
  const a = rng.int(2, 6);
  const b = rng.int(1, 9);
  const x = kind === 'minus' ? rng.int(b + 1, b + 9) : rng.int(1, 9);
  const inner = kind === 'minus' ? x - b : x + b;
  return {
    skill: 'bracket-eq',
    atoms: [kind === 'minus' ? 'bracket-minus' : 'divide-first'],
    prompt: `Unwrap it on the slate: the ${a} is on the outside of the bracket.`,
    answer: { kind: 'canvas', mode: 'solve', equation: `${a}(x${kind === 'minus' ? '-' : '+'}${b})=${a * inner}`, x },
    hint: `What's on the outside? The ×${a}. Divide both sides by ${a}.`,
    explain: `Divide by ${a}: $x ${kind === 'minus' ? '-' : '+'} ${b} = ${inner}$, so $x = ${x}$.`,
  };
};
