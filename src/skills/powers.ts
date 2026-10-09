/**
 * Region 6 — the Tower of Tens: powers and powers of ten.
 *
 * Stumbling blocks targeted here:
 *  - 2³ read as 2 × 3.
 *  - 10ⁿ: counting zeros; 10⁰ = 1 (not 0).
 *  - negative powers make things TINY, not negative (10⁻³ = 0.001, not −1000).
 *  - multiplying by 10ⁿ moves the decimal point; which way, how far.
 *  - scientific notation: reading it, writing it, comparing sizes (exponent first!).
 */
import type { Generator } from './types';
import { choice, clean, numeric, tex } from './util';

const r = String.raw;

const pow10 = (n: number) => clean(Math.pow(10, n));

// ---------------------------------------------------------------------------

export const powerMeaning: Generator = (rng, level) => {
  const base = rng.int(2, level === 1 ? 5 : 9);
  const exp = rng.int(2, level === 1 ? 3 : 4);
  const val = Math.pow(base, exp);
  const mult = Array(exp)
    .fill(base)
    .join(r` \times `);
  const t = rng.int(0, level === 1 ? 1 : level === 2 ? 2 : 3);
  if (t === 0) {
    return {
      skill: 'power-meaning',
      prompt: `What does $${base}^{${exp}}$ mean?`,
      ...choice(rng, `$${mult}$`, [
        {
          text: r`$${base} \times ${exp}$`,
          nudge: `The little number counts **how many times** ${base} is multiplied — it isn't multiplied itself.`,
        },
        `$${Array(exp).fill(base).join(' + ')}$`,
        `$${Array(base > 4 ? 2 : base)
          .fill(exp)
          .join(r` \times `)}$`,
      ]),
      explain: `The little number (the exponent) says how many ${base}s to multiply: $${base}^{${exp}} = ${mult}$.`,
    };
  }
  if (t === 1 || (t === 3 && val > 200)) {
    const b = Math.min(base, exp === 2 ? 12 : 5);
    const v2 = Math.pow(b, exp);
    const m2 = Array(exp)
      .fill(b)
      .join(r` \times `);
    return {
      skill: 'power-meaning',
      prompt: `What is $${b}^{${exp}}$?`,
      math: `${b}^{${exp}}`,
      visual: exp <= 3 && b <= 5 ? { kind: 'power', base: b, exp } : undefined,
      ...numeric(v2, [
        [b * exp, `Sneaky trap! $${b}^{${exp}}$ is not $${b} \\times ${exp}$. It's $${m2}$.`],
        [b + exp, `It's repeated **multiplying**: $${m2}$.`],
        [Math.pow(exp, b), `Other way round: the big number is multiplied, the small one counts.`],
      ]),
      hint: `Write it out: $${m2}$.`,
      explain: `$${b}^{${exp}} = ${m2} = ${v2}$.`,
    };
  }
  if (t === 2) {
    const b = rng.int(2, 5);
    const e = rng.int(2, 4);
    const v = Math.pow(b, e);
    return {
      skill: 'power-meaning',
      prompt: `$${b}^{?} = ${v}$. What is the missing exponent?`,
      ...numeric(e, [
        [
          v / b,
          `That's how big it is divided by ${b}. Count how many ${b}s multiply to make ${v}.`,
        ],
      ]),
      explain: `$${Array(e)
        .fill(b)
        .join(r` \times `)} = ${v}$ — that's ${e} of them, so $${b}^{${e}} = ${v}$.`,
    };
  }
  // compare a^b vs b^a
  const p = rng.pick([
    [2, 5],
    [2, 3],
    [3, 4],
    [2, 6],
    [3, 5],
  ] as const);
  const [x, y] = rng.chance(0.5) ? p : [p[1], p[0]];
  const v1 = Math.pow(x, y),
    v2 = Math.pow(y, x);
  const big = v1 > v2 ? `$${x}^{${y}}$` : `$${y}^{${x}}$`;
  const small = v1 > v2 ? `$${y}^{${x}}$` : `$${x}^{${y}}$`;
  return {
    skill: 'power-meaning',
    prompt: `Which is bigger: $${x}^{${y}}$ or $${y}^{${x}}$?`,
    ...choice(rng, big, [
      small,
      { text: 'They are equal', nudge: `Work them both out — they're different!` },
    ]),
    explain: `$${x}^{${y}} = ${v1}$ and $${y}^{${x}} = ${v2}$.`,
  };
};

// ---------------------------------------------------------------------------

export const pow10Up: Generator = (rng, level) => {
  const n = rng.int(1, level === 1 ? 4 : 7);
  const v = pow10(n);
  const t = rng.int(0, level === 1 ? 1 : 2);
  if (t === 0) {
    return {
      skill: 'pow10-up',
      prompt: `What is $10^{${n}}$?`,
      math: `10^{${n}}`,
      ...numeric(v, [
        [10 * n, r`$10^{${n}}$ isn't $10 \times ${n}$ — it's ${n} tens multiplied together!`],
        [pow10(n + 1), `Count the zeros: $10^{${n}}$ has exactly ${n} zeros.`],
        [pow10(n - 1), `Count the zeros: $10^{${n}}$ has exactly ${n} zeros.`],
      ]),
      hint: `A 1 followed by ${n} zero${n > 1 ? 's' : ''}.`,
      explain:
        n === 1
          ? `$10^{1} = 10$ — a 1 with one zero.`
          : `$10^{${n}} = ${Array(n)
              .fill(10)
              .join(r` \times `)} = ${tex(v)}$ — a 1 with ${n} zeros.`,
    };
  }
  if (t === 1) {
    return {
      skill: 'pow10-up',
      prompt: `$${tex(v)} = 10^{?}$`,
      ...numeric(n, [
        [n + 1, `Count only the zeros, not the 1!`],
        [v / 10, `We want the **exponent** — just count the zeros.`],
      ]),
      explain: `$${tex(v)}$ has ${n} zero${n > 1 ? 's' : ''}, so it's $10^{${n}}$.`,
    };
  }
  const m = rng.int(1, 5);
  return {
    skill: 'pow10-up',
    prompt: r`What is $10^{${n}} \times 10^{${m}}$? Give the answer as a power: $10^{?}$`,
    ...numeric(n + m, [
      [n * m, `Multiplying tens just stacks the zeros: ${n} zeros and ${m} zeros. Add them!`],
    ]),
    explain: r`${n} zeros and ${m} more zeros: $10^{${n}} \times 10^{${m}} = 10^{${n + m}}$.`,
  };
};

// ---------------------------------------------------------------------------

export const pow10Down: Generator = (rng, level) => {
  const n = rng.int(level === 1 ? 0 : 1, level === 1 ? 2 : level === 2 ? 3 : 5);
  const v = pow10(-n);
  const t = level === 1 ? rng.int(0, 1) : rng.int(0, 3);
  if (n === 0 || t === 0) {
    return {
      skill: 'pow10-down',
      prompt: n === 0 ? `What is $10^{0}$?` : `What is $10^{${-n}}$? (Use a decimal.)`,
      math: `10^{${-n}}`,
      ...numeric(
        v,
        n === 0
          ? [
              [0, `$10^{0}$ is the starting point: exactly 1. No growing, no shrinking.`],
              [10, `$10^{1}$ is 10. With a power of 0 we haven't multiplied by any tens yet.`],
            ]
          : [
              [
                -pow10(n),
                `A negative power doesn't make it negative — it makes it **tiny**! Divide 1 by 10, ${n} time${n > 1 ? 's' : ''}.`,
              ],
              [
                -10 * n,
                `A negative power means **shrink** by 10, ${n} times. Start at 1 and divide.`,
              ],
              [
                pow10(-n - 1),
                `One too many hops! The 1 lands ${n} place${n > 1 ? 's' : ''} after the point.`,
              ],
              [pow10(-n + 1), `One hop short! Divide by 10 exactly ${n} times.`],
            ],
      ),
      hint:
        n === 0
          ? `Before any growing or shrinking you're at 1.`
          : `Start at 1 and divide by 10, ${n} times.`,
      explain:
        n === 0
          ? `$10^{0} = 1$ — no growing, no shrinking.`
          : `Start at 1 and divide by 10, ${n} time${n > 1 ? 's' : ''}: $10^{${-n}} = ${tex(v)}$.`,
    };
  }
  if (t === 1) {
    return {
      skill: 'pow10-down',
      prompt: r`$${tex(v)} = 10^{?}$`,
      ...numeric(-n, [
        [n, `${tex(v)} is **smaller** than 1, so the exponent is negative.`],
        [-(n + 1), `Count the hops: the 1 is ${n} place${n > 1 ? 's' : ''} after the point.`],
      ]),
      explain: `The 1 sits ${n} place${n > 1 ? 's' : ''} after the decimal point, so it's $10^{${-n}}$.`,
    };
  }
  if (t === 2) {
    return {
      skill: 'pow10-down',
      prompt: `Which is the same as $10^{${-n}}$?`,
      ...choice(rng, r`$\frac{1}{${tex(pow10(n))}}$`, [
        { text: `$-${tex(pow10(n))}$`, nudge: `Negative exponent = tiny, not negative!` },
        `$-${10 * n}$`,
        r`$\frac{1}{${10 * n}}$`,
      ]),
      explain: r`$10^{${-n}}$ means 1 divided by $10^{${n}}$: $\frac{1}{${tex(pow10(n))}} = ${tex(v)}$.`,
    };
  }
  // order sizes
  const a = rng.int(-4, 3);
  let b = rng.int(-4, 3);
  if (b === a) b = a + 2;
  const bigger = a > b ? a : b;
  return {
    skill: 'pow10-down',
    prompt: `Which is bigger: $10^{${a}}$ or $10^{${b}}$?`,
    ...choice(rng, `$10^{${bigger}}$`, [
      {
        text: `$10^{${a + b - bigger}}$`,
        nudge: `On the number line, ${a + b - bigger} is to the left of ${bigger}. Bigger exponent, bigger number.`,
      },
    ]),
    explain: r`$10^{${a}} = ${tex(pow10(a))}$ and $10^{${b}} = ${tex(pow10(b))}$.`,
  };
};

// ---------------------------------------------------------------------------

export const timesPow10: Generator = (rng, level) => {
  const ms = level === 1 ? [3, 7, 25, 4, 12] : [3.2, 4.5, 1.25, 7, 0.6, 25, 8.08, 52];
  const m = rng.pick(ms);
  const n =
    level === 1
      ? rng.int(1, 3)
      : level === 2
        ? rng.pick([1, 2, 3, 4, -1, -2])
        : rng.pick([2, 3, 5, -1, -2, -3]);
  const v = clean(m * pow10(n));
  const dir = n > 0 ? 'right' : 'left';
  return {
    skill: 'times-pow10',
    prompt: r`What is $${tex(m)} \times 10^{${n}}$?`,
    math: r`${tex(m)} \times 10^{${n}}`,
    ...numeric(v, [
      [
        clean(m * pow10(-n)),
        `Wrong way! ${n > 0 ? 'Multiplying by a positive power makes it bigger' : 'A negative power makes it smaller'}: hop the point to the ${dir}.`,
      ],
      [clean(m * pow10(n + 1)), `One hop too many — hop exactly ${Math.abs(n)}.`],
      [clean(m * pow10(n - 1)), `One hop short — hop exactly ${Math.abs(n)}.`],
      [
        clean(m * 10 * n),
        r`It's not $\times ${10 * n}$! $10^{${n}}$ means hop the decimal point ${Math.abs(n)} places.`,
      ],
    ]),
    hint: `Hop the decimal point ${Math.abs(n)} place${Math.abs(n) > 1 ? 's' : ''} to the ${dir}.`,
    explain: `The decimal point hops ${Math.abs(n)} place${Math.abs(n) > 1 ? 's' : ''} to the ${dir}: $${tex(m)} \\times 10^{${n}} = ${tex(v)}$.`,
  };
};

// ---------------------------------------------------------------------------

export const sciNotation: Generator = (rng, level) => {
  const mant = rng.pick([1.5, 2, 3.4, 4.5, 6, 7.2, 9.1, 5, 2.5, 8]);
  const t = level === 1 ? rng.int(0, 1) : level === 2 ? rng.int(0, 3) : rng.int(1, 4);
  if (t === 0) {
    const n = rng.int(2, 6);
    const v = clean(mant * pow10(n));
    return {
      skill: 'sci-notation',
      prompt: r`A giant's shoe is $${tex(mant)} \times 10^{${n}}$ millimetres long. Write that as a normal number.`,
      math: r`${tex(mant)} \times 10^{${n}}`,
      ...numeric(v, [
        [clean(mant * pow10(n + 1)), `One hop too many — hop exactly ${n} places.`],
        [clean(mant * pow10(n - 1)), `One hop short — hop exactly ${n} places.`],
        [
          Number(String(mant).replace('.', '') + '0'.repeat(n)),
          `Careful: hop the decimal point ${n} places, don't just glue ${n} zeros on the end.`,
        ],
      ]),
      hint: `Hop the decimal point ${n} places right.`,
      explain: r`Hop the point ${n} places right: $${tex(mant)} \times 10^{${n}} = ${tex(v)}$.`,
    };
  }
  if (t === 1) {
    const n = rng.int(3, 8);
    const v = clean(mant * pow10(n));
    return {
      skill: 'sci-notation',
      prompt: r`$${tex(v)} = ${tex(mant)} \times 10^{?}$`,
      ...numeric(n, [
        [
          n + 1,
          `Count the hops from where the point is now back to just after the ${String(mant)[0]}.`,
        ],
        [String(v).length, `Count the hops of the decimal point, not the digits.`],
      ]),
      explain: r`From $${tex(mant)}$ the point hops ${n} places right to make $${tex(v)}$, so the power is ${n}.`,
    };
  }
  if (t === 2) {
    const n = rng.int(2, 5);
    const m = rng.pick([2, 3, 5, 7, 4.5, 1.5]);
    const v = clean(m * pow10(-n));
    return {
      skill: 'sci-notation',
      prompt: r`A flea's sneeze lasts $${tex(v)}$ seconds. Write it as $${tex(m)} \times 10^{?}$`,
      ...numeric(-n, [
        [n, `The number is smaller than 1 — so the power is **negative**.`],
        [-(n + 1), `Count the hops carefully: from $${tex(m)}$, the point hops left ${n} places.`],
        [-(n - 1), `Count the hops carefully: from $${tex(m)}$, the point hops left ${n} places.`],
      ]),
      explain: r`$${tex(m)}$ with the point hopped ${n} places **left** is $${tex(v)}$, so it's $${tex(m)} \times 10^{${-n}}$.`,
    };
  }
  if (t === 3) {
    const n = rng.int(2, 6);
    const good = r`$${tex(mant)} \times 10^{${n}}$`;
    return {
      skill: 'sci-notation',
      prompt: `Scientific notation needs a front number from 1 up to (but not including) 10. Which one is written properly?`,
      ...choice(rng, good, [
        {
          text: r`$${tex(clean(mant * 10))} \times 10^{${n - 1}}$`,
          nudge: `Same size, but the front number is ${tex(clean(mant * 10))} — too big!`,
        },
        r`$${tex(clean(mant / 10))} \times 10^{${n + 1}}$`,
        r`$${tex(clean(mant * 100))} \times 10^{${n - 2}}$`,
      ]),
      explain: `Proper scientific notation has the front number between 1 and 10: ${good}.`,
    };
  }
  // compare: exponent first
  const e1 = rng.int(2, 8);
  const e2 = e1 + rng.pick([-1, 1]);
  const m1 = rng.pick([2, 3, 4]);
  const m2 = rng.pick([7, 8, 9]);
  const A = r`$${m1} \times 10^{${e1}}$`;
  const B = r`$${m2} \times 10^{${e2}}$`;
  const bigger = e1 > e2 ? A : B;
  return {
    skill: 'sci-notation',
    prompt: `A troll has ${A} smelly socks. A giant has ${B}. Who has more socks?`,
    ...choice(rng, bigger, [
      {
        text: bigger === A ? B : A,
        nudge: `Look at the power of ten first — it matters way more than the front number!`,
      },
      `They have the same`,
    ]),
    explain: r`Compare the powers first: $10^{${Math.max(e1, e2)}}$ beats $10^{${Math.min(e1, e2)}}$ — that's ten times bigger, more than the front numbers can make up.`,
  };
};
