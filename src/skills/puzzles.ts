/**
 * The Muddler Strikes Back, part 4 — puzzles that need algebra:
 *  - growing patterns: find the rule (3n + 1), then ask "which stage uses 100 sticks?" and solve
 *    it as an equation on the EQcanvas;
 *  - fruit puzzles (simultaneous equations in pictures): solve one fruit, swap it in everywhere,
 *    and compare two rows when one has an extra fruit;
 *  - inequalities: tipping scales and number lines, including the flip when you divide by a
 *    negative.
 */
import type { ChainStep, GameSpec, Generator } from './types';
import type { Rng } from '../engine/rng';
import { choice, numeric } from './util';
import { sticks } from '../games';

const game = (g: GameSpec) => ({ answer: { kind: 'game' as const, game: g } });
const chain = (steps: ChainStep[]) =>
  game({
    kind: 'chain',
    steps: steps.map((st) => ({ ...st, nudges: st.nudges?.filter((n) => n.value !== st.answer) })),
  });

const SHAPES = [
  { shape: 'squares' as const, k: 3, name: 'squares in a row' },
  { shape: 'triangles' as const, k: 2, name: 'triangles in a row' },
  { shape: 'houses' as const, k: 5, name: 'houses in a row' },
];

export const patternRule: Generator = (rng, level) => {
  const s = rng.pick(SHAPES);
  const vis = { kind: 'matchsticks' as const, shape: s.shape, stages: 3 };
  const kind = rng.pick(level === 1 ? ['next', 'step'] : level === 2 ? ['rule', 'far'] : ['which', 'far', 'rule']);
  if (kind === 'next') {
    return {
      skill: 'pattern-rule',
      atoms: ['next-term'],
      prompt: `Ptolemeow lays out matchsticks: ${s.name}. How many sticks will stage 4 need?`,
      visual: vis,
      ...numeric(sticks(s.shape, 4), [
        [sticks(s.shape, 3) + 1, `Each stage adds the same number of sticks — count how many.`],
        [4 * (s.k + 1), `Neighbouring shapes share a stick! Count how many each new stage adds.`],
      ]),
      explain: `Each stage adds ${s.k}: ${[1, 2, 3, 4].map((n) => sticks(s.shape, n)).join(', ')}.`,
    };
  }
  if (kind === 'step') {
    return {
      skill: 'pattern-rule',
      atoms: ['step'],
      prompt: `How many sticks does each new stage add?`,
      visual: vis,
      ...numeric(s.k, [
        [s.k + 1, `A new shape shares one stick with its neighbour, so it needs one fewer.`],
        [sticks(s.shape, 1), `That's the whole first stage. How many **more** each time?`],
      ]),
      explain: `${sticks(s.shape, 1)}, ${sticks(s.shape, 2)}, ${sticks(s.shape, 3)}: up ${s.k} each time.`,
    };
  }
  if (kind === 'rule') {
    const start = sticks(s.shape, 1) - s.k;
    return {
      skill: 'pattern-rule',
      atoms: ['nth-rule'],
      prompt: `Which rule gives the number of sticks in stage $n$?`,
      visual: vis,
      ...choice(rng, `$${s.k}n + ${start}$`, [
        { text: `$n + ${s.k}$`, nudge: `Test it on stage 2: $2 + ${s.k} = ${2 + s.k}$, but there are ${sticks(s.shape, 2)} sticks.` },
        { text: `$${s.k + start}n$`, nudge: `Test it on stage 2: $${s.k + start} \\times 2 = ${2 * (s.k + start)}$, not ${sticks(s.shape, 2)}.` },
        { text: `$${start}n + ${s.k}$`, nudge: `Swapped! The number you multiply by is the step (${s.k} each time).` },
      ]),
      explain: `Up ${s.k} each stage, so ${s.k}n; stage 1 has ${sticks(s.shape, 1)}, which is $${s.k} + ${start}$. Rule: $${s.k}n + ${start}$.`,
    };
  }
  if (kind === 'far') {
    const n = rng.pick([10, 20, 50, 100]);
    const start = sticks(s.shape, 1) - s.k;
    return {
      skill: 'pattern-rule',
      atoms: ['nth-rule'],
      prompt: `The rule is $${s.k}n + ${start}$. How many sticks in stage ${n}?`,
      visual: vis,
      ...numeric(s.k * n + start, [
        [s.k * n, `Don't forget the $+ ${start}$!`],
        [s.k + n + start, `$${s.k}n$ means ${s.k} times ${n}.`],
      ]),
      explain: `$${s.k} \\times ${n} + ${start} = ${s.k * n + start}$.`,
    };
  }
  // which stage uses N sticks? Solve it on the slate.
  const start = sticks(s.shape, 1) - s.k;
  const n = rng.int(12, 40);
  const N = s.k * n + start;
  return {
    skill: 'pattern-rule',
    atoms: ['which-term'],
    prompt: `The rule is $${s.k}n + ${start}$ sticks. Which stage uses exactly **${N}** sticks? Write $x$ for the stage and solve $${s.k}x + ${start} = ${N}$.`,
    answer: { kind: 'canvas', mode: 'solve', equation: `${s.k}x+${start}=${N}`, x: n },
    hint: `Subtract ${start}, then divide by ${s.k}.`,
    explain: `$${s.k}x + ${start} = ${N} \\Rightarrow ${s.k}x = ${N - start} \\Rightarrow x = ${n}$: stage ${n}.`,
  };
};

const FRUIT = ['🍎', '🍌', '🍇', '🍓', '🍍', '🥝'];

export const fruitPuzzles: Generator = (rng, level) => {
  const [f1, f2, f3] = rng.shuffle(FRUIT);
  const v1 = rng.int(2, level === 1 ? 10 : 15);
  const v2 = rng.int(1, 12);
  const v3 = rng.int(1, 9);
  const k = rng.int(2, 3);
  const kind = rng.pick(level === 1 ? ['two'] : level === 2 ? ['three', 'compare'] : ['compare', 'three', 'combo']);
  if (kind === 'two')
    return {
      skill: 'fruit-puzzles',
      atoms: ['one-fruit', 'substitute'],
      prompt: `Ptolemeow's riddle: what is each fruit worth?`,
      ...game({
        kind: 'fruit',
        rows: [
          { items: Array(k).fill(f1), total: k * v1 },
          { items: [f1, f2, f2], total: v1 + 2 * v2 },
        ],
        values: { [f1]: v1, [f2]: v2 },
      }),
      explain: `${f1} = ${k * v1} ÷ ${k} = ${v1}. Then ${f2} + ${f2} = ${v1 + 2 * v2} − ${v1} = ${2 * v2}, so ${f2} = ${v2}.`,
    };
  if (kind === 'three')
    return {
      skill: 'fruit-puzzles',
      atoms: ['one-fruit', 'substitute', 'three-fruit'],
      prompt: `Three fruit, three rows. Crack them one at a time.`,
      ...game({
        kind: 'fruit',
        rows: [
          { items: Array(k).fill(f1), total: k * v1 },
          { items: [f1, f2], total: v1 + v2 },
          { items: [f2, f3, f3], total: v2 + 2 * v3 },
        ],
        values: { [f1]: v1, [f2]: v2, [f3]: v3 },
      }),
      explain: `${f1} = ${v1}, so ${f2} = ${v1 + v2} − ${v1} = ${v2}, so ${f3} + ${f3} = ${v2 + 2 * v3} − ${v2}, ${f3} = ${v3}.`,
    };
  if (kind === 'compare')
    return {
      skill: 'fruit-puzzles',
      atoms: ['compare-rows', 'substitute'],
      prompt: `No row has just one kind of fruit… but look at the difference between the rows!`,
      ...game({
        kind: 'fruit',
        rows: [
          { items: [f1, f2], total: v1 + v2 },
          { items: [f1, f2, f2], total: v1 + 2 * v2 },
        ],
        values: { [f1]: v1, [f2]: v2 },
        ask: [f2, f1],
      }),
      explain: `The second row has one extra ${f2} and is ${v2} more: ${f2} = ${v2}. Then ${f1} = ${v1 + v2} − ${v2} = ${v1}.`,
    };
  // combo: the viral one — the last row mixes in a multiplication
  return {
    skill: 'fruit-puzzles',
    atoms: ['three-fruit', 'substitute'],
    prompt: `The final riddle. Find every fruit, then work out the last line (careful: times before plus!).`,
    ...chain([
      { tex: `${f1} + ${f1} + ${f1} = ${3 * v1} \\;\\Rightarrow\\; ${f1} = \\box`, answer: v1, nudges: [{ value: 3 * v1, text: `That's all three ${f1} together. One is a third of that.` }] },
      { tex: `${f1} + ${f2} + ${f2} = ${v1 + 2 * v2} \\;\\Rightarrow\\; ${f2} = \\box`, answer: v2 },
      {
        tex: `${f2} + ${f1} \\times ${f2} = \\box`,
        answer: v2 + v1 * v2,
        say: `Swap in the numbers: $${v2} + ${v1} \\times ${v2}$. Times first!`,
        nudges: [{ value: (v2 + v1) * v2, text: `Times before plus! $${v1} \\times ${v2}$ first, then add ${v2}.` }],
      },
    ]),
    explain: `${f1} = ${v1}, ${f2} = ${v2}, and $${v2} + ${v1} \\times ${v2} = ${v2 + v1 * v2}$ (times first).`,
  };
};

function ineqTex(op: '<' | '>' | '<=' | '>=') {
  return { '<': '<', '>': '>', '<=': '\\le', '>=': '\\ge' }[op];
}

function pickOp(rng: Rng): '<' | '>' | '<=' | '>=' {
  return rng.pick(['<', '>', '<=', '>='] as const);
}

export const inequalities: Generator = (rng, level) => {
  const kind = rng.pick(level === 1 ? ['line', 'which'] : level === 2 ? ['solve', 'line'] : ['flip', 'solve', 'integers']);
  const v = rng.int(-4, 6);
  const op = pickOp(rng);
  if (kind === 'line')
    return {
      skill: 'inequalities',
      atoms: ['line', 'read'],
      prompt: `Show every $x$ that makes this true on the number line.`,
      ...game({ kind: 'ineqline', min: -8, max: 10, value: v, op }),
      explain: `The edge is ${v}: ${op.includes('=') ? 'a filled dot (it counts)' : 'an open dot (it doesn’t count)'}, shading ${op.startsWith('>') ? 'right' : 'left'}.`,
    };
  if (kind === 'which') {
    const big = op.startsWith('>');
    const yes = big ? v + rng.int(1, 4) : v - rng.int(1, 4);
    const edge = v;
    return {
      skill: 'inequalities',
      atoms: ['read'],
      prompt: `Which number makes $x ${ineqTex(op)} ${v}$ true?`,
      ...choice(rng, String(yes), [
        ...(op.includes('=')
          ? []
          : [{ text: String(edge), nudge: `$${edge} ${ineqTex(op)} ${edge}$? Is ${edge} really ${big ? 'bigger' : 'smaller'} than itself? No — the edge doesn't count without the "or equal" line.` }]),
        { text: String(big ? v - 2 : v + 2), nudge: `That's on the wrong side: it's ${big ? 'smaller' : 'bigger'} than ${v}.` },
        { text: String(big ? v - 5 : v + 5), nudge: `Way over on the wrong side.` },
      ]),
      explain: `$${yes} ${ineqTex(op)} ${v}$ ✓.`,
    };
  }
  if (kind === 'solve') {
    const b = rng.int(2, 9);
    const sOp = rng.pick(['<', '>'] as const);
    return {
      skill: 'inequalities',
      atoms: ['solve'],
      prompt: `Solve it like an equation — the scale is just tipped. Same move on both sides!`,
      math: `x + ${b} ${sOp} ${v + b}`,
      ...chain([
        {
          tex: `x + ${b} - ${b} ${sOp} ${v + b} - ${b}`,
          options: ['Take $' + b + '$ off both sides', 'Take $' + b + '$ off the left only'],
          answer: 0,
          nudges: [{ value: 1, text: `Do it to both sides — a tipped scale stays tipped the same way.` }],
        },
        { tex: `x ${sOp} \\box`, answer: v, nudges: [{ value: v + 2 * b, text: `Subtract ${b}, don't add it.` }] },
      ]),
      explain: `$x + ${b} ${sOp} ${v + b} \\Rightarrow x ${sOp} ${v}$.`,
    };
  }
  if (kind === 'integers') {
    const lo = rng.int(-5, 0);
    const hi = lo + rng.int(2, 5);
    const count = hi - lo; // lo < x <= hi
    return {
      skill: 'inequalities',
      atoms: ['integers', 'read'],
      prompt: `How many **whole numbers** make $${lo} < x \\le ${hi}$ true?`,
      ...numeric(count, [
        [count + 1, `$${lo}$ itself doesn't count (it's $<$, not $\\le$).`],
        [count - 1, `$${hi}$ counts — it's $\\le$, "or equal to".`],
      ]),
      explain: `The whole numbers from ${lo + 1} to ${hi}: ${count} of them.`,
    };
  }
  // flip: dividing by a negative turns the sign round
  const a = rng.int(2, 5);
  const x = rng.int(-4, 4);
  const sOp = rng.pick(['<', '>'] as const);
  const flipped = sOp === '<' ? '>' : '<';
  return {
    skill: 'inequalities',
    atoms: ['flip', 'solve'],
    prompt: `Divide both sides by $-${a}$. Careful — something happens to the sign!`,
    math: `-${a}x ${sOp} ${-a * x}`,
    ...choice(rng, `$x ${flipped} ${x}$`, [
      { text: `$x ${sOp} ${x}$`, nudge: `Test it: put in $x = ${sOp === '<' ? x - 1 : x + 1}$. Is $-${a} \\times ${sOp === '<' ? x - 1 : x + 1} ${sOp} ${-a * x}$? Dividing by a negative **flips** the sign.` },
      { text: `$x ${flipped} ${-x}$`, nudge: `The sign flips, but $${-a * x} \\div (-${a}) = ${x}$.` },
      { text: `$x ${sOp} ${-x}$`, nudge: `Two slips: check the division, and dividing by a negative flips the sign.` },
    ]),
    explain: `Dividing both sides by a negative flips the sign: $x ${flipped} ${x}$. (Bigger negatives are smaller numbers!)`,
  };
};
