/**
 * The Muddler Strikes Back, part 1 — negative numbers, through one picture: a hot-air
 * balloon. Balloons lift (+1), sandbags pull down (−1), and the height is the number.
 *   below zero (reading, comparing, gaps) → adding and subtracting (balloons, sandbags and zero
 *   pairs: taking away a sandbag lifts you, so − (−3) = + 3) → multiplying (patterns: the signs
 *   rule isn't magic, it's the only way the pattern can carry on).
 */
import type { ChainStep, GameSpec, Generator } from './types';
import { choice, numeric } from './util';

const game = (g: GameSpec) => ({ answer: { kind: 'game' as const, game: g } });
const chain = (steps: ChainStep[]) =>
  game({
    kind: 'chain',
    steps: steps.map((st) => ({ ...st, nudges: st.nudges?.filter((n) => n.value !== st.answer) })),
  });
/** −3 written for maths: negatives in brackets when they follow an operation. */
const br = (n: number) => (n < 0 ? `(${n})` : `${n}`);

export const negNumbers: Generator = (rng, level) => {
  const kind = rng.pick(level === 1 ? ['read', 'place'] : level === 2 ? ['compare', 'order', 'read'] : ['gap', 'order', 'compare']);
  if (kind === 'read') {
    const v = -rng.int(1, 9);
    return {
      skill: 'neg-numbers',
      atoms: ['read'],
      prompt: `Admiral Waddles froze the springs. What temperature does the thermometer show (°C)?`,
      visual: { kind: 'numberline', min: -10, max: 10, step: 5, minor: 1, labels: 'all', arrow: v },
      ...numeric(v, [
        [-v, `It's **below** zero — on the cold side. That's minus ${-v}.`],
        [v - 2 >= -10 ? v - 2 : v + 2, `Count the little ticks from 0 again: each one is 1 degree.`],
      ]),
      explain: `The arrow is ${-v} ticks below zero: ${v} °C.`,
    };
  }
  if (kind === 'place') {
    const v = -rng.int(2, 9);
    return {
      skill: 'neg-numbers',
      atoms: ['read', 'opposites'],
      prompt: `Tap where **${v}** goes on the line.`,
      answer: { kind: 'line', min: -10, max: 10, step: 5, minor: 1, snap: 1, value: v, tolerance: 0, labels: 'all' },
      nudges: [{ match: -v, text: `That's ${-v}, its opposite. Negative numbers live on the **left** of zero.` }],
      explain: `${v} is ${-v} steps to the left of zero.`,
    };
  }
  if (kind === 'compare') {
    const a = -rng.int(5, 15);
    const b = -rng.int(1, 4);
    return {
      skill: 'neg-numbers',
      atoms: ['compare'],
      prompt: `Which is **colder**: ${a} °C or ${b} °C?`,
      ...choice(rng, `${a} °C`, [{ text: `${b} °C`, nudge: `${-b} is smaller than ${-a}, but ${a} is further **below** zero. Further below is colder.` }], 2),
      explain: `${a} is further left on the number line than ${b}: $${a} < ${b}$. Colder!`,
    };
  }
  if (kind === 'order') {
    const vals = rng.shuffle([-rng.int(6, 9), -rng.int(1, 5), 0, rng.int(1, 5), rng.int(6, 9)]).slice(0, 4);
    const sorted = [...vals].sort((x, y) => x - y);
    const byAbs = [...vals].sort((x, y) => Math.abs(x) - Math.abs(y) || x - y);
    const items = vals.map(String);
    return {
      skill: 'neg-numbers',
      atoms: ['compare', 'order'],
      prompt: `Put the depths in order, deepest (smallest) first.`,
      answer: {
        kind: 'order',
        items,
        correct: sorted.map((v) => vals.indexOf(v)),
        direction: 'smallest → largest',
        traps:
          byAbs.join() !== sorted.join()
            ? [{ order: byAbs.map((v) => vals.indexOf(v)), text: `You sorted by size ignoring the minus. ${Math.min(...vals)} is the **smallest** — furthest below zero.` }]
            : [],
      },
      explain: `On the number line: ${sorted.join(' < ')}.`,
    };
  }
  // gap
  const lo = -rng.int(2, 9);
  const hi = rng.int(2, 9);
  return {
    skill: 'neg-numbers',
    atoms: ['gap'],
    prompt: `At night it was ${lo} °C. By lunch it's ${hi} °C. How many degrees warmer?`,
    ...numeric(hi - lo, [
      [hi + lo, `That's ignoring the minus. From ${lo} up to 0 is ${-lo} degrees, then ${hi} more.`],
      [hi, `Don't forget the climb from ${lo} up to 0!`],
    ]),
    hint: `Up to zero first, then on to ${hi}.`,
    explain: `${-lo} degrees up to zero, ${hi} more after: ${-lo} + ${hi} = ${hi - lo}.`,
  };
};

export const negAdd: Generator = (rng, level) => {
  const kind = rng.pick(level === 1 ? ['balloon-add', 'add'] : level === 2 ? ['balloon-sub', 'sub', 'add'] : ['balloon-subneg', 'subneg', 'sub']);
  if (kind === 'balloon-add') {
    const start = rng.int(-4, 4);
    const k = rng.pick([-1, 1]) * rng.int(2, 5);
    return {
      skill: 'neg-add',
      atoms: [k > 0 ? 'add-pos' : 'add-neg'],
      prompt: `Fly the balloon: work out $${start} + ${br(k)}$.`,
      ...game({ kind: 'balloon', start, op: 'add', k }),
      explain: `$${start} + ${br(k)} = ${start + k}$.`,
    };
  }
  if (kind === 'balloon-sub') {
    const start = rng.int(0, 3);
    const k = rng.int(start + 1, 7);
    return {
      skill: 'neg-add',
      atoms: ['sub-pos', 'zero-pairs'],
      prompt: `Work out $${start} - ${k}$ with the balloon. (Not enough balloons to pop? Add some zero pairs first!)`,
      ...game({ kind: 'balloon', start, op: 'sub', k }),
      explain: `$${start} - ${k} = ${start - k}$.`,
    };
  }
  if (kind === 'balloon-subneg') {
    const start = rng.int(-4, 3);
    const k = -rng.int(2, 5);
    return {
      skill: 'neg-add',
      atoms: ['sub-neg', 'zero-pairs'],
      prompt: `The big one: $${start} - ${br(k)}$. Subtracting a negative means taking sandbags **away**.`,
      ...game({ kind: 'balloon', start, op: 'sub', k }),
      explain: `Taking away ${-k} sandbags lifts you ${-k}: $${start} - ${br(k)} = ${start - k}$.`,
    };
  }
  const a = rng.int(-9, 6);
  const b = kind === 'add' ? rng.pick([-1, 1]) * rng.int(2, 9) : kind === 'sub' ? rng.int(2, 9) : -rng.int(2, 9);
  const op = kind === 'add' ? '+' : '-';
  const ans = op === '+' ? a + b : a - b;
  const atom = kind === 'add' ? (b > 0 ? 'add-pos' : 'add-neg') : kind === 'sub' ? 'sub-pos' : 'sub-neg';
  const nudges: [number, string][] =
    kind === 'subneg'
      ? [
          [a + b, `Careful: subtracting **minus** ${-b} means taking ${-b} sandbags away — you go UP.`],
          [-(a - b), `Right size, wrong side of zero. Check the sign.`],
        ]
      : kind === 'sub'
        ? [
            [a + b, `That's adding. Taking away ${b} balloons takes you DOWN.`],
            [Math.abs(a) - b, `Start at ${a} — on the number line — then go ${b} down.`],
          ]
        : [
            [a - b, `Adding ${br(b)} — ${b < 0 ? 'sandbags pull you down' : 'balloons lift you up'}.`],
            [Math.abs(a) + Math.abs(b), `Watch the signs: start at ${a}.`],
          ];
  return {
    skill: 'neg-add',
    atoms: [atom],
    prompt: `Admiral Waddles stole the answer. Work it out:`,
    math: `${a} ${op} ${br(b)}`,
    ...numeric(ans, nudges),
    hint:
      kind === 'subneg'
        ? `Minus a minus: take away sandbags. Which way does the balloon go?`
        : `Start at ${a} on the number line and move ${Math.abs(b)} ${(op === '+') === b > 0 ? 'up' : 'down'}.`,
    explain: `$${a} ${op} ${br(b)} = ${ans}$.`,
  };
};

export const negMul: Generator = (rng, level) => {
  const kind = rng.pick(level === 1 ? ['pos-neg'] : level === 2 ? ['pattern', 'pos-neg'] : ['neg-neg', 'divide', 'pattern']);
  if (kind === 'pos-neg') {
    const a = rng.int(2, 9);
    const b = -rng.int(2, 9);
    return {
      skill: 'neg-mul',
      atoms: ['pos-neg'],
      prompt: `Waddles drops ${a} bundles of sandbags, each bundle worth ${b}. What do they add up to?`,
      math: `${a} \\times ${br(b)}`,
      ...numeric(a * b, [
        [-a * b, `${a} lots of ${br(b)} — that's ${a} bundles of sandbags. It goes **down**: negative.`],
        [a + b, `That's adding. We need ${a} **lots** of ${br(b)}.`],
      ]),
      explain: `$${a} \\times ${br(b)} = ${a * b}$: ${a} lots of ${b}.`,
    };
  }
  if (kind === 'pattern') {
    const b = rng.int(2, 6);
    return {
      skill: 'neg-mul',
      atoms: ['pattern', 'neg-neg'],
      prompt: `Follow the pattern down past zero. Each answer goes up by ${b}…`,
      ...chain([
        { tex: `2 \\times ${br(-b)} = \\box`, answer: -2 * b },
        { tex: `1 \\times ${br(-b)} = \\box`, answer: -b, say: `Each line is ${b} more than the line before.` },
        { tex: `0 \\times ${br(-b)} = \\box`, answer: 0 },
        {
          tex: `(-1) \\times ${br(-b)} = \\box`,
          answer: b,
          nudges: [{ value: -b, text: `The pattern goes up by ${b} each time: ${-2 * b}, ${-b}, 0, … next?` }],
          note: `So a negative times a negative is **positive**. Not a rule to memorise — it's the only way the pattern can carry on.`,
        },
      ]),
      explain: `${-2 * b}, ${-b}, 0, ${b}: each step adds ${b}, so $(-1) \\times ${br(-b)} = ${b}$.`,
    };
  }
  if (kind === 'neg-neg') {
    const a = -rng.int(2, 9);
    const b = -rng.int(2, 9);
    return {
      skill: 'neg-mul',
      atoms: ['neg-neg'],
      prompt: `What is this?`,
      math: `${br(a)} \\times ${br(b)}`,
      ...numeric(a * b, [
        [-a * b, `Two negatives multiplied make a **positive**. (Take away sandbags, lots of times: up!)`],
        [a + b, `That's adding them. Multiply!`],
      ]),
      explain: `$${br(a)} \\times ${br(b)} = ${a * b}$: negative × negative = positive.`,
    };
  }
  const q = rng.pick([-1, 1]) * rng.int(2, 9);
  const d = rng.pick([-1, 1]) * rng.int(2, 9);
  const n = q * d;
  return {
    skill: 'neg-mul',
    atoms: ['divide'],
    prompt: `Division follows the same sign rules. What is this?`,
    math: `${br(n)} \\div ${br(d)}`,
    ...numeric(q, [[-q, `Right number, wrong sign. Same signs → positive; different signs → negative.`]]),
    explain: `$${br(d)} \\times ${br(q)} = ${n}$, so $${br(n)} \\div ${br(d)} = ${q}$.`,
  };
};
