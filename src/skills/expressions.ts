/**
 * Region 1 — Bramblebottom: reading and evaluating expressions.
 *
 * Stumbling blocks targeted here:
 *  - "3x" read as the digits 3 and x glued together (x = 4 → 34).
 *  - invisible multiplication sign; x + x + x vs x³.
 *  - order of operations: in 3x + 7 the multiplying happens first.
 *  - brackets: 2(x + 3) is not 2x + 3.
 *  - "3 less than x" written as 3 − x.
 */
import type { Rng } from '../engine/rng';
import type { Generator, Problem } from './types';
import { choice, numeric } from './util';

const r = String.raw;

const GLUE = (a: number, v: number) => Number(`${a}${v}`);
const glueNudge = (a: number) =>
  r`Close, but $${a}x$ is not two digits glued together! There's an invisible times sign: $${a}x = ${a} \times x$.`;

// ---------------------------------------------------------------------------
// notation — what do the symbols even mean?

export const notation: Generator = (rng, level) => {
  const templates: ((rng: Rng) => Problem)[] = [
    (rng) => {
      const a = rng.int(2, 9);
      const c = choice(rng, r`$${a}$ times $x$`, [
        {
          text: r`$${a}$ plus $x$`,
          nudge: r`Sneaky one! When a number sits right next to $x$ there's an invisible **times** sign.`,
        },
        {
          text: r`a two-digit number that starts with $${a}$`,
          nudge: r`$x$ is a mystery box, not a digit! $${a}x$ means $${a}$ boxes: $${a} \times x$.`,
        },
        r`$x$ minus $${a}$`,
        r`$${a}$ divided by $x$`,
      ]);
      return {
        skill: 'notation',
        atoms: ['times'],
        prompt: r`What does $${a}x$ mean?`,
        ...c,
        explain: r`A number stuck to the front of $x$ means **multiply**: $${a}x = ${a} \times x$ — ${a} mystery boxes.`,
      };
    },
    (rng) => {
      const a = rng.int(2, 5);
      const b = rng.int(1, 9);
      const c = choice(rng, r`$${a}x + ${b}$`, [
        {
          text: r`$${b}x + ${a}$`,
          nudge: `Count again: the boxes are the mystery part, the coins are the plain number.`,
        },
        r`$x + ${a + b}$`,
        r`$${a + b}x$`,
      ]);
      return {
        skill: 'notation',
        atoms: ['boxes'],
        prompt: `${a} mystery boxes and ${b} coins. Each box hides the same number $x$. Which expression shows the total?`,
        visual: { kind: 'boxes', a, b },
        ...c,
        explain: r`${a} boxes is $${a}x$, plus ${b} coins: $${a}x + ${b}$.`,
      };
    },
    (rng) => {
      const n = rng.int(3, 5);
      const sum = Array(n).fill('x').join(' + ');
      const c = choice(rng, r`$${n}x$`, [
        {
          text: r`$x^{${n}}$`,
          nudge: r`Hmm! $x^{${n}}$ means **multiplying** $x$ by itself. We are **adding** boxes here.`,
        },
        r`$x + ${n}$`,
        r`$${n} + x$`,
      ]);
      return {
        skill: 'notation',
        atoms: ['repeat-add'],
        prompt: `Which is the same as $${sum}$?`,
        ...c,
        explain: r`${n} boxes added together is ${n} lots of $x$: $${sum} = ${n}x$.`,
      };
    },
    (rng) => {
      const a = rng.int(2, 9);
      const c = choice(rng, r`$\frac{x}{${a}}$`, [
        {
          text: r`$\frac{${a}}{x}$`,
          nudge: `Upside down! The box goes on top — it's the thing being split.`,
        },
        r`$${a}x$`,
        r`$x - ${a}$`,
      ]);
      return {
        skill: 'notation',
        atoms: ['divide'],
        prompt: `Which means "$x$ split into ${a} equal piles" ($x$ divided by ${a})?`,
        ...c,
        explain: r`Divided-by is written as a fraction: the box on top, ${a} below: $\frac{x}{${a}}$.`,
      };
    },
    (rng) => {
      const a = rng.int(2, 9);
      const b = rng.int(1, 9);
      const ask = rng.pick(['times', 'plus'] as const);
      return {
        skill: 'notation',
        atoms: ['parts'],
        prompt:
          ask === 'times'
            ? `In $${a}x + ${b}$, what number is the box **multiplied** by?`
            : `In $${a}x + ${b}$, what number is **added**?`,
        ...numeric(ask === 'times' ? a : b, [
          [
            ask === 'times' ? b : a,
            `Look again: the number glued to $x$ multiplies it; the one after the $+$ is added.`,
          ],
        ]),
        explain: r`$${a}x + ${b}$ means: take the box, multiply by **${a}**, then add **${b}**.`,
      };
    },
    (rng) => {
      const a = rng.int(2, 6);
      const b = rng.int(1, 9);
      const c = choice(rng, r`$${a}x + ${b}$`, [
        {
          text: r`$${a}(x + ${b})$`,
          nudge: r`Brackets would mean "add first". The recipe says multiply first, then add.`,
        },
        r`$${b}x + ${a}$`,
        r`$x + ${a + b}$`,
      ]);
      return {
        skill: 'notation',
        atoms: ['recipe'],
        prompt: `Which means "multiply $x$ by ${a}, **then** add ${b}"?`,
        ...c,
        explain: r`Multiply first: $${a}x$. Then add ${b}: $${a}x + ${b}$.`,
      };
    },
  ];
  const pool =
    level === 1 ? templates.slice(0, 3) : level === 2 ? templates.slice(0, 5) : templates.slice(2);
  return rng.pick(pool)(rng);
};

// ---------------------------------------------------------------------------
// eval-one — x = 4, what is 3x? (one operation)

export const evalOne: Generator = (rng, level) => {
  const kinds =
    level === 1
      ? ['add', 'mul']
      : level === 2
        ? ['add', 'sub', 'mul', 'div']
        : ['sub', 'mul', 'div', 'rsub'];
  const kind = rng.pick(kinds);
  const big = level === 3;
  let v: number,
    expr: string,
    value: number,
    nudges: [number, string][] = [],
    explain: string;
  let boxes = 0;
  switch (kind) {
    case 'add': {
      v = rng.int(1, big ? 20 : 9);
      const a = rng.int(1, 12);
      expr = `x + ${a}`;
      value = v + a;
      nudges = [[GLUE(v, a), `Don't glue the digits! $x + ${a}$ means ${v} plus ${a}.`]];
      explain = r`Swap the box for ${v}: $${v} + ${a} = ${value}$.`;
      break;
    }
    case 'sub': {
      const a = rng.int(1, 9);
      v = rng.int(a + 1, a + (big ? 20 : 10));
      expr = `x - ${a}`;
      value = v - a;
      nudges = [[v + a, `Look at the sign: it's a **minus**!`]];
      explain = r`Swap the box for ${v}: $${v} - ${a} = ${value}$.`;
      break;
    }
    case 'mul': {
      v = rng.int(1, big ? 12 : 9);
      const a = rng.int(2, big ? 12 : 6);
      expr = `${a}x`;
      boxes = a;
      value = a * v;
      nudges = [
        [GLUE(a, v), glueNudge(a)],
        [a + v, r`Not plus! $${a}x$ means $${a} \times x$.`],
      ];
      explain = r`$${a}x$ means $${a} \times x$, so $${a} \times ${v} = ${value}$.`;
      break;
    }
    case 'div': {
      const a = rng.int(2, big ? 10 : 5);
      value = rng.int(1, big ? 12 : 8);
      v = a * value;
      expr = r`\frac{x}{${a}}`;
      nudges = [[v * a, r`The fraction bar means **divide**, not multiply.`]];
      explain = r`$\frac{x}{${a}}$ means $x \div ${a}$, so $${v} \div ${a} = ${value}$.`;
      break;
    }
    default: {
      // rsub: a - x
      v = rng.int(1, 9);
      const a = rng.int(v + 1, 20);
      expr = `${a} - x`;
      value = a - v;
      nudges = [[v - a, `Order matters in subtraction: it's ${a} take away ${v}.`]];
      explain = r`Swap the box for ${v}: $${a} - ${v} = ${value}$.`;
    }
  }
  return {
    skill: 'eval-one',
    atoms: [kind],
    prompt: `If $x = ${v}$, what is $${expr}$?`,
    math: expr,
    visual: level === 1 && boxes ? { kind: 'boxes', a: boxes, b: 0, reveal: v } : undefined,
    ...numeric(value, nudges),
    hint: `Replace the box $x$ with ${v}, then do the arithmetic.`,
    explain,
  };
};

// ---------------------------------------------------------------------------
// eval-two — x = 4, what is 3x + 7?

export const evalTwo: Generator = (rng, level) => {
  const kinds =
    level === 1
      ? ['axpb']
      : level === 2
        ? ['axpb', 'axmb', 'bpax']
        : ['axmb', 'bpax', 'divpb', 'bmax'];
  const kind = rng.pick(kinds);
  const a = rng.int(2, level === 1 ? 5 : 9);
  let v = rng.int(1, level === 1 ? 6 : 10);
  const b = rng.int(1, level === 1 ? 10 : 20);
  let expr: string, value: number, nudges: [number, string][], explain: string;
  const addFirst = r`Careful with the order! Multiply first, then add.`;
  switch (kind) {
    case 'axpb':
      expr = `${a}x + ${b}`;
      value = a * v + b;
      nudges = [
        [a * (v + b), addFirst],
        [GLUE(a, v) + b, glueNudge(a)],
        [a + v + b, r`$${a}x$ means $${a} \times x$, not $${a} + x$.`],
      ];
      explain = r`$${a} \times ${v} = ${a * v}$, then $${a * v} + ${b} = ${value}$.`;
      break;
    case 'axmb': {
      const bb = rng.int(1, a * v - 1 > 0 ? a * v - 1 : 1);
      expr = `${a}x - ${bb}`;
      value = a * v - bb;
      nudges = [
        [GLUE(a, v) - bb, glueNudge(a)],
        [a * (v - bb), r`Multiply first, then subtract.`],
      ];
      explain = r`$${a} \times ${v} = ${a * v}$, then $${a * v} - ${bb} = ${value}$.`;
      break;
    }
    case 'bpax':
      expr = `${b} + ${a}x`;
      value = b + a * v;
      nudges = [
        [
          (b + a) * v,
          r`Multiplying beats adding — even when the adding is written first! Do $${a}x$ first.`,
        ],
        [b + GLUE(a, v), glueNudge(a)],
      ];
      explain = r`Multiplication first: $${a} \times ${v} = ${a * v}$. Then $${b} + ${a * v} = ${value}$.`;
      break;
    case 'divpb': {
      const q = rng.int(1, 9);
      v = a * q;
      expr = r`\frac{x}{${a}} + ${b}`;
      value = q + b;
      nudges = [[v + b, r`Don't forget to divide $x$ by ${a}!`]];
      explain = r`$${v} \div ${a} = ${q}$, then $${q} + ${b} = ${value}$.`;
      break;
    }
    default: {
      // b - ax, keep positive
      const big = a * v + rng.int(1, 15);
      expr = `${big} - ${a}x`;
      value = big - a * v;
      nudges = [[(big - a) * v, r`Multiply first! $${a}x$ is a single chunk: $${a} \times ${v}$.`]];
      explain = r`$${a} \times ${v} = ${a * v}$, then $${big} - ${a * v} = ${value}$.`;
    }
  }
  return {
    skill: 'eval-two',
    atoms: [kind],
    prompt: `If $x = ${v}$, what is $${expr}$?`,
    math: expr,
    ...numeric(value, nudges),
    hint: `Put ${v} in the box. Do the multiplying (or dividing) first, the adding last.`,
    explain,
  };
};

// ---------------------------------------------------------------------------
// eval-parens — brackets change the order

export const evalParens: Generator = (rng, level) => {
  const kinds =
    level === 1
      ? ['apxb']
      : level === 2
        ? ['apxb', 'apxmb', 'xpbdiv']
        : ['apxmb', 'xpbdiv', 'compare'];
  const kind = rng.pick(kinds);
  const a = rng.int(2, level === 1 ? 5 : 9);
  const b = rng.int(1, 9);
  if (kind === 'compare') {
    const v = rng.int(1, 9);
    const p = a * (v + b);
    const q = a * v + b;
    const c = choice(rng, r`$${a}(x + ${b})$ — it's ${p - q} bigger`, [
      {
        text: r`$${a}x + ${b}$ — it's bigger`,
        nudge: r`Work each one out: brackets first in $${a}(x + ${b})$!`,
      },
      {
        text: `They're equal`,
        nudge: r`Try it: $${a}(${v} + ${b})$ and $${a} \times ${v} + ${b}$ are different numbers.`,
      },
    ]);
    return {
      skill: 'eval-parens',
      atoms: ['compare'],
      prompt: r`If $x = ${v}$, which is bigger: $${a}(x + ${b})$ or $${a}x + ${b}$?`,
      ...c,
      explain: r`$${a}(${v} + ${b}) = ${a} \times ${v + b} = ${p}$ but $${a} \times ${v} + ${b} = ${q}$. The bracket multiplies the ${b} too!`,
    };
  }
  let v: number, expr: string, value: number, nudges: [number, string][], explain: string;
  if (kind === 'apxb') {
    v = rng.int(1, 9);
    expr = `${a}(x + ${b})`;
    value = a * (v + b);
    nudges = [
      [
        a * v + b,
        r`So close! The brackets say: **add first**, then multiply. $${v} + ${b}$ first.`,
      ],
      [GLUE(a, v + b), r`A number before a bracket means **times**!`],
    ];
    explain = r`Brackets first: $${v} + ${b} = ${v + b}$. Then $${a} \times ${v + b} = ${value}$.`;
  } else if (kind === 'apxmb') {
    v = rng.int(b + 1, b + 9);
    expr = `${a}(x - ${b})`;
    value = a * (v - b);
    nudges = [[a * v - b, r`Brackets first! $${v} - ${b}$, and only then multiply.`]];
    explain = r`Brackets first: $${v} - ${b} = ${v - b}$. Then $${a} \times ${v - b} = ${value}$.`;
  } else {
    const q = rng.int(1, 9);
    v = a * q - b;
    while (v < 1) v += a;
    value = (v + b) / a;
    expr = r`\frac{x + ${b}}{${a}}`;
    nudges = [[v / a + b, r`The whole top gets divided — add first, then divide.`]];
    explain = r`Top first: $${v} + ${b} = ${v + b}$. Then $${v + b} \div ${a} = ${value}$.`;
  }
  return {
    skill: 'eval-parens',
    atoms: [kind === 'xpbdiv' ? 'fracbar' : kind],
    prompt: `If $x = ${v}$, what is $${expr}$?`,
    math: expr,
    ...numeric(value, nudges),
    hint: `Brackets are a VIP room: whatever is inside gets done first.`,
    explain,
  };
};

// ---------------------------------------------------------------------------
// words-to-expr — goblin gibberish into maths

const nouns = [
  'a mystery number $x$',
  'the number of goblins $x$',
  'the number of socks $x$',
  "the frog's age $x$",
];

export const wordsToExpr: Generator = (rng, level) => {
  const n = rng.int(2, 9);
  const m = rng.int(2, 9);
  const what = rng.pick(nouns);
  type T = {
    atom: string;
    say: string;
    right: string;
    wrong: (string | { text: string; nudge: string })[];
    why: string;
  };
  const L1: T[] = [
    {
      atom: 'more',
      say: `${n} more than ${what}`,
      right: `$x + ${n}$`,
      wrong: [
        `$${n}x$`,
        `$x - ${n}$`,
        { text: `$${n}$`, nudge: 'Where did the mystery number go?' },
      ],
      why: `"${n} more than $x$" means start at $x$ and add ${n}: $x + ${n}$.`,
    },
    {
      atom: 'less',
      say: `${n} less than ${what}`,
      right: `$x - ${n}$`,
      wrong: [
        {
          text: `$${n} - x$`,
          nudge: `Tricky! "${n} less than $x$" means start with $x$ and take ${n} **away**: $x - ${n}$.`,
        },
        `$x + ${n}$`,
        `$\\frac{x}{${n}}$`,
      ],
      why: `"${n} less than $x$": start with $x$, take ${n} away: $x - ${n}$.`,
    },
    {
      atom: 'twice',
      say: `twice ${what}`,
      right: `$2x$`,
      wrong: [
        { text: `$x + 2$`, nudge: `"Twice" means two **times** — double it!` },
        `$x^2$`,
        `$\\frac{x}{2}$`,
      ],
      why: `"Twice" means two times: $2x$.`,
    },
    {
      atom: 'times',
      say: `${what} times ${n}`,
      right: `$${n}x$`,
      wrong: [`$x + ${n}$`, `$x^{${n}}$`, `$\\frac{x}{${n}}$`],
      why: `$x$ times ${n} is written $${n}x$ — the number goes in front.`,
    },
  ];
  const L2: T[] = [
    {
      atom: 'split',
      say: `${what} split into ${n} equal piles`,
      right: `$\\frac{x}{${n}}$`,
      wrong: [
        { text: `$\\frac{${n}}{x}$`, nudge: `Upside down! The thing being split goes on top.` },
        `$${n}x$`,
        `$x - ${n}$`,
      ],
      why: `Splitting $x$ into ${n} piles: $\\frac{x}{${n}}$.`,
    },
    {
      atom: 'two-step',
      say: `half of ${what}, minus ${n}`,
      right: `$\\frac{x}{2} - ${n}$`,
      wrong: [`$2x - ${n}$`, `$\\frac{x - ${n}}{2}$`, `$${n} - \\frac{x}{2}$`],
      why: `Half of $x$ is $\\frac{x}{2}$, then take away ${n}.`,
    },
    {
      atom: 'less',
      say: `${n} taken away from ${what}`,
      right: `$x - ${n}$`,
      wrong: [
        { text: `$${n} - x$`, nudge: `You start with $x$ and take ${n} away from it.` },
        `$x + ${n}$`,
        `$${n}x$`,
      ],
      why: `Start with $x$, take ${n} away: $x - ${n}$.`,
    },
  ];
  const L3: T[] = [
    {
      atom: 'two-step',
      say: `triple ${what}, then add ${n}`,
      right: `$3x + ${n}$`,
      wrong: [
        {
          text: `$3(x + ${n})$`,
          nudge: `The brackets would mean "add first". Here we triple first!`,
        },
        `$${n}x + 3$`,
        `$x + ${n + 3}$`,
      ],
      why: `Triple first ($3x$), then add ${n}: $3x + ${n}$.`,
    },
    {
      atom: 'brackets',
      say: `add ${n} to ${what}, then multiply everything by ${m}`,
      right: `$${m}(x + ${n})$`,
      wrong: [
        {
          text: `$${m}x + ${n}$`,
          nudge: `Here the adding happens **first** — that needs brackets!`,
        },
        `$${n}x + ${m}$`,
        `$x + ${n * m}$`,
      ],
      why: `Add first — brackets: $(x + ${n})$. Then multiply by ${m}: $${m}(x + ${n})$.`,
    },
    {
      atom: 'two-step',
      say: `${n} less than double ${what}`,
      right: `$2x - ${n}$`,
      wrong: [
        {
          text: `$${n} - 2x$`,
          nudge: `"Less than" flips the order: start with $2x$, take ${n} away.`,
        },
        `$2(x - ${n})$`,
        `$x - ${n * 2}$`,
      ],
      why: `Double $x$ is $2x$; ${n} less than that: $2x - ${n}$.`,
    },
  ];
  const pool = level === 1 ? L1 : level === 2 ? [...L1.slice(1), ...L2] : [...L2, ...L3, ...L3];
  const t = rng.pick(pool);
  return {
    skill: 'words-to-expr',
    atoms: [t.atom],
    prompt: `Translate the goblin gibberish into maths: **"${t.say}"**`,
    ...choice(rng, t.right, t.wrong),
    explain: t.why,
  };
};
