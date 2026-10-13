/**
 * Region 7 — Mirrormaze Caves: the distributive law, a(x + b) = ax + ab, and using it for
 * mental maths: 7 × 12 = 7 × (10 + 2) = 70 + 14, and 7 × 9 = 7 × (10 − 1) = 70 − 7.
 *
 * Stumbling blocks targeted here (Halfcopy the Imp makes all of them on purpose):
 *  - "only copy the first thing": a(x + b) → ax + b.
 *  - adding instead of multiplying: 3(x + 4) → 3x + 7.
 *  - the round-down trap: 7 × (10 − 1) → 70 − 1 = 69.
 *  - thinking one check proves a fake rule true (we test with a number, x = 1 first).
 */
import type { Rng } from '../engine/rng';
import type { Generator, Problem } from './types';
import { choice, coef, numeric } from './util';

const r = String.raw;

/** a(x + b) or a(x − b) as LaTeX. */
const bracket = (a: number, b: number, k = 1) =>
  `${a}(${coef(k)} ${b < 0 ? '-' : '+'} ${Math.abs(b)})`;
/** ax + c as LaTeX, with the sign of c. */
const flat = (a: number, c: number) => `${coef(a)} ${c < 0 ? '-' : '+'} ${Math.abs(c)}`;

const HALFCOPY = (a: number) =>
  r`That's Halfcopy's trick! The ${a} multiplies **everything** in the bracket — the box *and* the coins.`;

// ---------------------------------------------------------------------------
// copy-groups — 3(x + 2) is three copies of the parcel (x + 2)

export const copyGroups: Generator = (rng, level) => {
  const templates: ((rng: Rng) => Problem)[] = [
    (rng) => {
      const n = rng.int(2, level === 1 ? 3 : 5);
      const c = rng.int(1, level === 1 ? 3 : 5);
      return {
        skill: 'copy-groups',
        atoms: ['coins'],
        prompt: r`The mirror makes $${n}$ copies of the parcel $(x + ${c})$. How many **coins** are there altogether?`,
        math: bracket(n, c),
        visual: { kind: 'groups', n, c },
        ...numeric(n * c, [
          [c, `You counted the coins in just one parcel. There are ${n} parcels!`],
          [n + c, r`Not plus — ${n} copies of ${c} coins is $${n} \times ${c}$.`],
        ]),
        hint: `Count the coins in one parcel, then count the parcels.`,
        explain: r`Each parcel has ${c} coins and there are ${n} parcels: $${n} \times ${c} = ${n * c}$ coins.`,
      };
    },
    (rng) => {
      const n = rng.int(2, level === 1 ? 4 : 6);
      const c = rng.int(1, 5);
      return {
        skill: 'copy-groups',
        atoms: ['boxes'],
        prompt: r`How many **mystery boxes** are in $${bracket(n, c)}$?`,
        visual: { kind: 'groups', n, c },
        ...numeric(n, [
          [1, `There's one box per parcel, but the mirror made ${n} parcels.`],
          [n * c, `That's the coins! How many boxes?`],
        ]),
        explain: r`$${bracket(n, c)}$ is ${n} parcels, each with one box: ${n} boxes, so $${n}x$.`,
      };
    },
    (rng) => {
      const n = rng.int(2, 4);
      const c = rng.int(1, 6);
      const sum = Array(n).fill(`(x + ${c})`).join(' + ');
      const ch = choice(rng, `$${sum}$`, [
        { text: `$${flat(n, c)}$`, nudge: HALFCOPY(n) },
        {
          text: `$x + ${c} + ${n}$`,
          nudge: r`The ${n} in front isn't a coin to add — it's how many **copies**.`,
        },
        `$${Array(n).fill('x').join(' + ')} + ${c}$`,
      ]);
      return {
        skill: 'copy-groups',
        atoms: ['copies'],
        prompt: `Which one means the same as $${bracket(n, c)}$?`,
        ...ch,
        explain: r`A number in front of a bracket means *that many copies* of the whole bracket: $${bracket(n, c)} = ${sum}$.`,
      };
    },
    (rng) => {
      const n = rng.int(2, 5);
      const c = rng.int(1, 6);
      const ch = choice(rng, `$${n}x + ${n * c}$`, [
        { text: `$${n}x + ${c}$`, nudge: HALFCOPY(n) },
        {
          text: `$${n}x + ${n + c}$`,
          nudge: r`${n} copies of ${c} coins is $${n} \times ${c}$, not $${n} + ${c}$.`,
        },
        {
          text: `$x + ${n * c}$`,
          nudge: `The boxes get copied too! ${n} parcels means ${n} boxes.`,
        },
      ]);
      return {
        skill: 'copy-groups',
        atoms: ['unpack'],
        prompt: `Unpack all the parcels and sort them: boxes in one pile, coins in the other. What do you get?`,
        math: bracket(n, c),
        visual: { kind: 'groups', n, c },
        ...ch,
        explain: r`${n} parcels give ${n} boxes ($${n}x$) and $${n} \times ${c} = ${n * c}$ coins: $${n}x + ${n * c}$.`,
      };
    },
  ];
  const pool = level === 1 ? templates.slice(0, 2) : level === 2 ? templates : templates.slice(1);
  return rng.pick(pool)(rng);
};

// ---------------------------------------------------------------------------
// expand — a(x + b) = ax + ab

export const expand: Generator = (rng, level) => {
  const a = rng.int(2, level === 1 ? 5 : 9);
  const minus = level >= 2 && rng.chance(0.5);
  const b = (minus ? -1 : 1) * rng.int(1, level === 1 ? 6 : 9);
  const k = level === 3 && rng.chance(0.5) ? rng.int(2, 4) : 1;
  const left = bracket(a, b, k);
  const right = flat(a * k, a * b);
  const sign = b < 0 ? '-' : '+';
  const eAtoms = [b < 0 ? 'minus' : 'plus', ...(k > 1 ? ['coef'] : [])];

  if (rng.chance(0.5)) {
    // Fill in the missing number.
    const ab = Math.abs(a * b);
    return {
      skill: 'expand',
      atoms: eAtoms,
      prompt: `Bust the bracket! Fill in the missing number.`,
      math: r`${left} = ${coef(a * k)} ${sign} \box`,
      ...numeric(ab, [
        [Math.abs(b), HALFCOPY(a)],
        [
          a + Math.abs(b),
          r`Copying is **multiplying**: $${a} \times ${Math.abs(b)}$, not $${a} + ${Math.abs(b)}$.`,
        ],
      ]),
      hint: r`The ${a} multiplies the ${Math.abs(b)} too: $${a} \times ${Math.abs(b)}$.`,
      explain: r`Multiply **both** things inside by ${a}: $${a} \times ${coef(k)} = ${coef(a * k)}$ and $${a} \times ${Math.abs(b)} = ${ab}$. So $${left} = ${right}$.`,
    };
  }
  const ch = choice(rng, `$${right}$`, [
    { text: `$${flat(a * k, b)}$`, nudge: HALFCOPY(a) },
    {
      text: `$${flat(a * k, b < 0 ? b - a : a + b)}$`,
      nudge: r`Careful: the ${a} *multiplies* the ${Math.abs(b)}, it doesn't add to it.`,
    },
    ...(b < 0
      ? [
          {
            text: `$${flat(a * k, -a * b)}$`,
            nudge: `Keep the minus! Copies of a minus are still minuses.`,
          },
        ]
      : []),
    `$${coef(k + a)} ${sign} ${Math.abs(a * b)}$`,
  ]);
  return {
    skill: 'expand',
    atoms: eAtoms,
    prompt: `Which is the same as $${left}$?`,
    ...ch,
    explain: r`The ${a} multiplies everything inside: $${a} \times ${coef(k)} ${sign} ${a} \times ${Math.abs(b)} = ${right}$.`,
  };
};

// ---------------------------------------------------------------------------
// expand-check — test an expansion by putting in a number (x = 1 is the easiest spy)

export const expandCheck: Generator = (rng, level) => {
  const a = rng.int(2, level === 1 ? 5 : 9);
  const b = rng.int(1, 9);
  const left = bracket(a, b);
  const v = level === 1 ? 1 : level === 2 ? rng.pick([1, 2]) : rng.int(2, 5);
  const L = a * (v + b);

  if (rng.chance(0.45)) {
    // Both sides of a TRUE rule give the same number.
    return {
      skill: 'expand-check',
      atoms: ['spy'],
      prompt: r`Spy test! Put $x = ${v}$ into **both** sides. What number does each side make?`,
      math: `${left} = ${flat(a, a * b)}`,
      ...numeric(L, [
        [
          a * v + b,
          r`That's what Halfcopy's fake $${flat(a, b)}$ would give! Try the real sides again.`,
        ],
        [a + v + b, r`$${a}(\ldots)$ means **times** the bracket.`],
      ]),
      hint: r`Left: $${v} + ${b}$ first, then times ${a}. Right: $${a} \times ${v}$, then add ${a * b}.`,
      explain: r`Left: $${a}(${v} + ${b}) = ${a} \times ${v + b} = ${L}$. Right: $${a} \times ${v} + ${a * b} = ${L}$. Same number — the rule passes the test.`,
    };
  }
  // Halfcopy (or an honest dwarf) claims an expansion. True or fake?
  const fake = rng.chance(0.6);
  // a + b is only a fake when it differs from ab (2(x + 2) = 2x + 4 is true!).
  const claimC = fake ? rng.pick([b, a + b === a * b ? b : a + b]) : a * b;
  const R = a * v + claimC;
  const claim = `${left} = ${flat(a, claimC)}`;
  const correct = fake
    ? `Fake! Left makes $${L}$ but right makes $${R}$.`
    : `True! Both sides make $${L}$.`;
  const ch = choice(rng, correct, [
    fake
      ? {
          text: `True! Both sides make $${L}$.`,
          nudge: r`Work out the right side too: $${a} \times ${v} + ${claimC} = ${R}$. Is that ${L}?`,
        }
      : {
          text: `Fake! Left makes $${L}$ but right makes $${R + a}$.`,
          nudge: r`Check the right side again: $${a} \times ${v} + ${a * b} = ${R}$.`,
        },
    fake
      ? `Fake! Left makes $${a * v + b}$ but right makes $${R + 1}$.`
      : `Fake! Left makes $${a * v + b}$ but right makes $${R}$.`,
  ]);
  return {
    skill: 'expand-check',
    atoms: [fake ? 'fake' : 'honest'],
    prompt: r`${fake ? 'Halfcopy the Imp' : 'A cave dwarf'} says: "$${claim}$". Test it with $x = ${v}$!`,
    ...ch,
    explain: fake
      ? r`Left: $${a}(${v} + ${b}) = ${L}$. Right: $${a} \times ${v} + ${claimC} = ${R}$. They don't match — fake! The real one is $${flat(a, a * b)}$.`
      : r`Left: $${a}(${v} + ${b}) = ${L}$. Right: $${a} \times ${v} + ${a * b} = ${R}$. They match — true!`,
  };
};

// ---------------------------------------------------------------------------
// split-tens — 7 × 12 = 7 × 10 + 7 × 2

export const splitTens: Generator = (rng, level) => {
  const a = rng.int(level === 1 ? 2 : 3, 9);
  const tens = level === 3 ? rng.pick([20, 30, 40, 100]) : level === 2 ? rng.pick([10, 20]) : 10;
  const u = rng.int(1, 9);
  const n = tens + u;
  const total = a * n;
  const size = tens === 10 ? 'teens' : tens === 100 ? 'hundred' : 'tens';
  const kind = rng.int(0, 2);
  if (kind === 0) {
    return {
      skill: 'split-tens',
      atoms: [size],
      prompt: r`Split the ${n} into $${tens} + ${u}$ and fill in the gap.`,
      math: r`${a} \times ${n} = ${a * tens} + \box`,
      ...numeric(a * u, [
        [u, HALFCOPY(a)],
        [a + u, r`Multiply, don't add: $${a} \times ${u}$.`],
      ]),
      hint: r`$${a} \times (${tens} + ${u}) = ${a} \times ${tens} + ${a} \times ${u}$.`,
      explain: r`$${a} \times ${n} = ${a} \times ${tens} + ${a} \times ${u} = ${a * tens} + ${a * u}$.`,
    };
  }
  if (kind === 1) {
    const ch = choice(rng, r`$${a} \times ${tens} + ${a} \times ${u}$`, [
      { text: r`$${a} \times ${tens} + ${u}$`, nudge: HALFCOPY(a) },
      {
        text: r`$${a} \times ${tens} \times ${u}$`,
        nudge: `Two pieces get *added* back together, not multiplied.`,
      },
      r`$${a} + ${tens} + ${u}$`,
    ]);
    return {
      skill: 'split-tens',
      atoms: [size, 'method'],
      prompt: r`Which is a smart way to work out $${a} \times ${n}$ in your head?`,
      ...ch,
      explain: r`$${n} = ${tens} + ${u}$, and the ${a} copies both pieces: $${a} \times ${tens} + ${a} \times ${u} = ${total}$.`,
    };
  }
  return {
    skill: 'split-tens',
    atoms: [size],
    prompt: r`Work out $${a} \times ${n}$ in your head. (Split the ${n} first!)`,
    math: r`${a} \times ${n}`,
    ...numeric(total, [
      [a * tens + u, HALFCOPY(a)],
      [a * tens + a + u, r`$${a} \times ${u}$ is ${a * u}, not ${a + u}.`],
    ]),
    hint: r`$${a} \times ${tens} = ${a * tens}$ and $${a} \times ${u} = ${a * u}$. Add them!`,
    explain: r`$${a} \times ${n} = ${a} \times ${tens} + ${a} \times ${u} = ${a * tens} + ${a * u} = ${total}$.`,
  };
};

// ---------------------------------------------------------------------------
// round-down — 7 × 9 = 7 × (10 − 1) = 70 − 7

export const roundDown: Generator = (rng, level) => {
  const a = rng.int(level === 1 ? 2 : 3, 9);
  const round = level === 1 ? 10 : level === 2 ? rng.pick([10, 20, 30]) : rng.pick([50, 100, 100]);
  const d = level === 3 ? rng.int(1, 2) : 1;
  const n = round - d;
  const total = a * n;
  const size = round === 10 ? 'nine' : round >= 50 ? 'big' : 'tens';
  const kind = rng.int(0, 2);
  if (kind === 0) {
    return {
      skill: 'round-down',
      atoms: [size],
      prompt: r`${n} is nearly ${round}! Fill in the gap.`,
      math: r`${a} \times ${n} = ${a} \times (${round} - ${d}) = ${a * round} - \box`,
      ...numeric(a * d, [
        [
          d,
          r`That's the classic trap! You took ${d} off just once, but you have ${a} copies of ($${round} - ${d}$) — so take off $${a} \times ${d}$.`,
        ],
        [a + d, r`Multiply: $${a} \times ${d}$.`],
      ]),
      hint: r`The ${a} copies the $- ${d}$ too.`,
      explain: r`$${a} \times (${round} - ${d}) = ${a * round} - ${a} \times ${d} = ${a * round} - ${a * d} = ${total}$.`,
    };
  }
  if (kind === 1) {
    const ch = choice(rng, r`$${a} \times ${round} - ${a} \times ${d}$`, [
      { text: r`$${a} \times ${round} - ${d}$`, nudge: HALFCOPY(a) },
      {
        text: r`$${a} \times ${round} + ${a} \times ${d}$`,
        nudge: `${n} is *less* than ${round}, so we take some away.`,
      },
      r`$${a} \times ${round} \times ${d}$`,
    ]);
    return {
      skill: 'round-down',
      atoms: [size, 'method'],
      prompt: r`Which is the same as $${a} \times ${n}$?`,
      ...ch,
      explain: r`$${n} = ${round} - ${d}$, so $${a} \times ${n} = ${a} \times ${round} - ${a} \times ${d} = ${total}$.`,
    };
  }
  return {
    skill: 'round-down',
    atoms: [size],
    prompt: r`Quick! What is $${a} \times ${n}$? (Think $${a} \times ${round}$, then fix it.)`,
    math: r`${a} \times ${n}`,
    ...numeric(total, [
      [a * round - d, r`Halfcopy strikes! You need to take away ${a} lots of ${d}, not just ${d}.`],
      [a * round + a * d, `Wrong way! ${n} is less than ${round}, so take away.`],
      [a * round, `That's $${a} \\times ${round}$. Now take off the extra.`],
    ]),
    hint: r`$${a} \times ${round} = ${a * round}$. Then take away $${a} \times ${d} = ${a * d}$.`,
    explain: r`$${a} \times ${n} = ${a} \times ${round} - ${a} \times ${d} = ${a * round} - ${a * d} = ${total}$.`,
  };
};
