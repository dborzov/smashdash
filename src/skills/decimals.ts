/**
 * The Long Count, part 3 — the Glass Vaults: place value after the point (tenths, hundredths,
 * thousandths), reading and writing decimals, comparing them, ×/÷ 10, 100, 1000, and rounding.
 *
 * Why it matters in the story: the alchemists of the Glass Vaults weigh everything — gold
 * dust, quicksilver, the Tallyman's phylactery powder — to the thousandth of a gram. The
 * Tallyman's glass golems guard the vault doors, and the locks are set by weight.
 *
 * Stumbling blocks targeted (each has a nudge):
 *  - "longer is bigger": 0.45 is NOT bigger than 0.5.
 *  - trailing zeros change nothing: 0.3 = 0.30.
 *  - tenths vs tens (and hundredths vs hundreds): the -ths are after the point.
 *  - five hundredths is 0.05, not 0.5; twenty-seven thousandths is 0.027, not 0.27.
 *  - "×10 adds a zero" fails for decimals: 2.5 × 10 is 25, not 2.50.
 *  - rounding: the ripple (2.96 → 3.0) and halfway rounds up (2.45 → 2.5).
 */
import type { Rng } from '../engine/rng';
import type { Generator } from './types';
import { choice, clean, fmt, numeric } from './util';
import { decimalWords, digitAt, PLACE_NAMES, PLACE_ONE, pow10, roundTo, texg } from './place';

const r = String.raw;
const $ = (v: number) => `$${texg(v)}$`;

/** A decimal with `whole` whole digits (0 = "0.") and `dec` decimal places, digits distinct and non-zero. */
function dec(rng: Rng, whole: number, places: number): number {
  const pool = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  let w = 0;
  for (let i = 0; i < whole; i++) w = w * 10 + pool[i];
  let f = 0;
  for (let i = 0; i < places; i++) f = f * 10 + pool[whole + i];
  return clean(w + f / pow10(places));
}

const STUFF = [
  'gold dust',
  'quicksilver',
  'salt of iron',
  'ground moonstone',
  'bone ash',
  'dragon pepper',
];
const DEC_ATOM: Record<number, string> = {
  [-1]: 'tenths',
  [-2]: 'hundredths',
  [-3]: 'thousandths',
};

// ---------------------------------------------------------------------------
// dec-places

export const decPlaces: Generator = (rng, level) => {
  const kinds =
    level === 1
      ? ['digit', 'digit', 'value']
      : level === 2
        ? ['digit', 'value', 'fraction', 'tens']
        : ['value', 'fraction', 'tens', 'digit'];
  const kind = rng.pick(kinds);
  const places = level === 1 ? 2 : 3;
  const stuff = rng.pick(STUFF);
  if (kind === 'tens') {
    // tens vs tenths, hundreds vs hundredths
    const v = dec(rng, rng.int(2, 3), places);
    const big = rng.pick([1, 2].filter((p) => p < String(Math.floor(v)).length));
    const ask = rng.chance(0.5) ? -big : big;
    const other = -ask;
    return {
      skill: 'dec-places',
      atoms: ['ths-vs-s'],
      prompt: `The scale reads ${$(v)} g of ${stuff}. Which digit is in the **${PLACE_NAMES[ask]}** place?`,
      ...numeric(digitAt(v, ask), [
        [
          digitAt(v, other),
          ask < 0
            ? `That's the ${PLACE_NAMES[other]} digit. Listen to the ending: ${PLACE_NAMES[ask]} (with **-ths**) live **after** the point.`
            : `That's the ${PLACE_NAMES[other]} digit. ${PLACE_NAMES[ask]} (no -ths) are whole: **before** the point.`,
        ],
      ]),
      explain: `Before the point: ones, tens, hundreds. After it: tenths, hundredths, thousandths. In ${fmt(v)} the ${PLACE_NAMES[ask]} digit is **${digitAt(v, ask)}**.`,
    };
  }
  const v = dec(rng, 1, places);
  const p = -rng.int(1, places);
  const d = digitAt(v, p);
  if (kind === 'digit') {
    return {
      skill: 'dec-places',
      atoms: [DEC_ATOM[p]],
      prompt: `The scale reads ${$(v)} g of ${stuff}. Which digit is in the **${PLACE_NAMES[p]}** place?`,
      visual: level === 1 ? { kind: 'placechart', value: v, dec: places } : undefined,
      ...numeric(d, [
        ...(p < -1
          ? [
              [
                digitAt(v, p + 1),
                `Count from the point: tenths first, then hundredths, then thousandths.`,
              ] as [number, string],
            ]
          : []),
        ...(p > -places
          ? [
              [
                digitAt(v, p - 1),
                `Count from the point: tenths first, then hundredths, then thousandths.`,
              ] as [number, string],
            ]
          : []),
      ]),
      explain: `After the point: tenths (${digitAt(v, -1)}), hundredths (${digitAt(v, -2)})${places > 2 ? `, thousandths (${digitAt(v, -3)})` : ''}.`,
    };
  }
  const val = clean(d / pow10(-p));
  if (kind === 'value') {
    return {
      skill: 'dec-places',
      atoms: ['value', DEC_ATOM[p]],
      prompt: `In ${$(v)} g, what is the **${d}** worth?`,
      ...numeric(val, [
        [
          d,
          `That's the digit. It's in the ${PLACE_NAMES[p]} place, so it's worth ${d} ${PLACE_NAMES[p]}.`,
        ],
        [clean(val * 10), `One place off: count from the point — tenths, hundredths, thousandths.`],
        [clean(val / 10), `One place off: count from the point — tenths, hundredths, thousandths.`],
      ]),
      hint: `Keep the ${d}; every other digit becomes 0 (and drop the zeros at the end).`,
      explain: `The ${d} is in the ${PLACE_NAMES[p]} place: it's worth **${fmt(val)}** (${d} ${d === 1 ? PLACE_ONE[p] : PLACE_NAMES[p]}).`,
    };
  }
  const frac = (n: number, q: number) => r`$\frac{${n}}{${texg(pow10(q))}}$`;
  return {
    skill: 'dec-places',
    atoms: ['fraction', DEC_ATOM[p]],
    prompt: `In ${$(v)}, the ${d} is worth…`,
    ...choice(rng, frac(d, -p), [
      ...[1, 2, 3]
        .filter((q) => q !== -p)
        .map((q) => ({
          text: frac(d, q),
          nudge:
            q === -p + 1 || q === -p - 1
              ? `One place off: tenths are $\\frac{1}{10}$, hundredths $\\frac{1}{100}$, thousandths $\\frac{1}{1000}$.`
              : undefined,
        })),
      `$${d}$`,
    ]),
    explain: `The ${d} is in the ${PLACE_NAMES[p]} place: ${d} ${PLACE_NAMES[p]} = ${frac(d, -p)} = ${fmt(val)}.`,
  };
};

// ---------------------------------------------------------------------------
// dec-write — words and fractions to decimals

export const decWrite: Generator = (rng, level) => {
  const kinds =
    level === 1
      ? ['tenths', 'hundredths', 'fraction']
      : level === 2
        ? ['hundredths', 'thousandths', 'fraction', 'mixed']
        : ['thousandths', 'mixed', 'fraction', 'thousandths'];
  const kind = rng.pick(kinds);
  const a = rng.chance(0.3) ? 0 : rng.int(1, 9);
  const dials =
    level >= 2 && rng.chance(0.4) ? { kind: 'dials' as const, int: 1, dec: 3 } : undefined;
  let v: number;
  let nudges: [number, string][];
  let atom: string;
  if (kind === 'tenths') {
    const b = rng.int(1, 9);
    v = clean(a + b / 10);
    nudges = [
      [clean(a + b / 100), `Tenths are the **first** place after the point.`],
      [a * 10 + b, `The ${b} tenths go after the decimal point.`],
    ];
    atom = 'tenths';
  } else if (kind === 'hundredths') {
    const b = rng.int(1, 9);
    v = clean(a + b / 100);
    nudges = [
      [
        clean(a + b / 10),
        `${b} hundredths, not ${b} tenths: hundredths are the **second** place, so the tenths place needs a 0.`,
      ],
      [
        clean(a + b / 1000),
        `Hundredths are the second place after the point — one zero, then the ${b}.`,
      ],
    ];
    atom = 'hundredths-zero';
  } else if (kind === 'thousandths') {
    const n = rng.pick([rng.int(11, 99), rng.int(1, 9)]);
    v = clean(a + n / 1000);
    nudges = [
      [
        clean(a + n / 100),
        `${n} thousandths: the last digit must land in the **third** place after the point. Pad with zero${n < 10 ? 's' : ''}.`,
      ],
      [
        clean(a + n / 10000),
        `Too many zeros — the last digit goes in the third place, the thousandths.`,
      ],
    ];
    atom = 'thousandths';
  } else if (kind === 'fraction') {
    const q = level === 1 ? rng.int(1, 2) : rng.int(2, 3);
    let n = q === 1 ? rng.int(1, 9) : rng.pick([rng.int(1, 9), rng.int(11, 99)]);
    if (n % 10 === 0) n += 1;
    v = clean(n / pow10(q));
    return {
      skill: 'dec-write',
      atoms: ['fraction'],
      prompt: `Write $\\frac{${n}}{${texg(pow10(q))}}$ as a decimal.`,
      entry: dials,
      ...numeric(v, [
        [
          clean(n / pow10(q - 1)),
          `Dividing by ${texg(pow10(q))} moves the digits ${q} places right of the point — count the zeros.`,
        ],
        [
          clean(n / pow10(q + 1)),
          `Dividing by ${texg(pow10(q))} moves the digits exactly ${q} places — count the zeros.`,
        ],
        [n, `That's the top number. The bottom says how many places after the point.`],
      ]),
      explain: `$\\frac{${n}}{${texg(pow10(q))}}$ means ${n} ${PLACE_NAMES[-q]}: the last digit sits in the ${PLACE_NAMES[-q]} place → **${fmt(v)}**.`,
    };
  } else {
    // mixed: 4 + 0.3 + 0.007
    const b = rng.int(1, 9);
    const c = rng.int(1, 9);
    const w = rng.int(1, 9);
    v = clean(w + b / 10 + c / 1000);
    return {
      skill: 'dec-write',
      atoms: ['mixed'],
      prompt: `The alchemist's breakdown: $${w} + ${fmt(b / 10)} + ${fmt(c / 1000)}$ g. Write it as one decimal.`,
      entry: dials,
      ...numeric(v, [
        [
          clean(w + b / 10 + c / 100),
          `There are no hundredths, so the hundredths place needs a **0**.`,
        ],
        [Number(`${w}${b}${c}`), `The point matters! ${w} is the whole part.`],
      ]),
      explain: `${w} ones, ${b} tenths, 0 hundredths, ${c} thousandths: **${fmt(v)}**.`,
    };
  }
  return {
    skill: 'dec-write',
    atoms: [atom],
    prompt: `The weigh-master calls out: **"${decimalWords(v)}"**. Write it as a decimal.`,
    entry: dials,
    ...numeric(v, nudges),
    hint: `Tenths, hundredths, thousandths: the name tells you where the **last** digit goes.`,
    explain: `"${decimalWords(v)}" → **${fmt(v)}**.`,
  };
};

// ---------------------------------------------------------------------------
// dec-compare

export const decCompare: Generator = (rng, level) => {
  const kinds =
    level === 1
      ? ['longer', 'trailing', 'whole']
      : level === 2
        ? ['longer', 'deep', 'order', 'trailing']
        : ['deep', 'order', 'longer', 'order'];
  const kind = rng.pick(kinds);
  if (kind === 'order') {
    // 0.5, 0.45, 0.405, 0.054 style
    const d1 = rng.int(3, 8);
    const d2 = rng.int(1, d1 - 1);
    const pool = [
      clean(d1 / 10),
      clean(d2 / 10 + d1 / 100),
      clean(d2 / 10 + d1 / 1000),
      clean(d2 / 100 + d1 / 1000),
      clean(d1 / 100),
    ];
    const items = rng.shuffle([...new Set(pool)]).slice(0, level === 3 ? 4 : 3);
    const sorted = [...items].sort((a, b) => a - b);
    // The trap: ordering by the digits as if they were whole numbers (longer = bigger).
    const asWhole = [...items].sort(
      (a, b) => Number(String(a).replace('0.', '')) - Number(String(b).replace('0.', '')),
    );
    return {
      skill: 'dec-compare',
      atoms: ['order'],
      prompt: `Line up the vials from lightest to heaviest (grams).`,
      answer: {
        kind: 'order',
        items: items.map((x) => $(x)),
        correct: sorted.map((x) => items.indexOf(x)),
        direction: 'lightest → heaviest',
        traps:
          asWhole.join() !== sorted.join()
            ? [
                {
                  order: asWhole.map((x) => items.indexOf(x)),
                  text: `Looks like you read the digits as whole numbers (longer = bigger). Compare **place by place** from the point: tenths first.`,
                },
              ]
            : [],
      },
      explain: `Compare tenths first, then hundredths, then thousandths: ${sorted.map(fmt).join(' < ')}.`,
    };
  }
  let a: number, b: number, atom: string, nudge: string;
  if (kind === 'longer') {
    const t = rng.int(3, 9);
    a = clean(t / 10);
    b = clean((t - 1) / 10 + rng.int(1, 9) / 100 + (rng.chance(0.5) ? rng.int(1, 9) / 1000 : 0));
    atom = 'longer-trap';
    nudge = `More digits doesn't mean heavier! Compare the **tenths** first: ${digitAt(a, -1)} tenths beats ${digitAt(b, -1)} tenths.`;
  } else if (kind === 'whole') {
    const w = rng.int(2, 8);
    a = clean(w + rng.int(1, 9) / 100);
    b = clean(w - 1 + rng.int(51, 99) / 100);
    atom = 'whole-first';
    nudge = `Look at the whole grams first: ${Math.floor(a)} beats ${Math.floor(b)}, whatever comes after the point.`;
  } else if (kind === 'deep') {
    const t = rng.int(1, 8);
    const h = rng.int(3, 8);
    a = clean(t / 10 + h / 100);
    b = clean(t / 10 + (h - rng.int(1, 2)) / 100 + rng.int(1, 9) / 1000);
    atom = 'deep';
    nudge = `Same tenths, so compare the **hundredths**: ${digitAt(a, -2)} beats ${digitAt(b, -2)}. The extra digit at the end can't make up for it.`;
  } else {
    // trailing zeros
    const x = dec(rng, rng.int(0, 1), rng.int(1, 2));
    const zeros = Math.max(1, Math.min(rng.int(1, 2), 3 - (fmt(x).split('.')[1]?.length ?? 0)));
    const padded = fmt(x) + '0'.repeat(zeros);
    return {
      skill: 'dec-compare',
      atoms: ['trailing'],
      prompt: `One vial is labelled $${fmt(x)}$ g, the other $${padded}$ g. Which is heavier?`,
      ...choice(rng, `Neither — they weigh the same`, [
        {
          text: `The $${padded}$ g vial`,
          nudge: `Zeros on the end after the point add nothing: $${padded}$ is the same as $${fmt(x)}$.`,
        },
        `The $${fmt(x)}$ g vial`,
      ]),
      explain: `$${fmt(x)} = ${padded}$: a zero at the very end of a decimal changes nothing (it's 0 ${PLACE_NAMES[-String(padded).split('.')[1].length]}).`,
    };
  }
  const first = rng.chance(0.5);
  const x = first ? a : b;
  const y = first ? b : a;
  return {
    skill: 'dec-compare',
    atoms: [atom],
    prompt: `Two vials of ${rng.pick(STUFF)}: ${$(x)} g and ${$(y)} g. Which is heavier?`,
    ...choice(rng, `The ${fmt(a)} g vial`, [
      { text: `The ${fmt(b)} g vial`, nudge },
      `They weigh the same`,
    ]),
    explain: `Compare place by place from the left. ${fmt(a)} > ${fmt(b)}.`,
  };
};

// ---------------------------------------------------------------------------
// dec-shift — × and ÷ by 10, 100, 1000

export const decShift: Generator = (rng, level) => {
  const kinds =
    level === 1
      ? ['x10', 'x100', 'div10']
      : level === 2
        ? ['x10', 'x100', 'div10', 'div100']
        : ['x1000', 'div100', 'div1000', 'x100'];
  const kind = rng.pick(kinds);
  const mul = kind.startsWith('x');
  const k = kind.endsWith('1000') ? 3 : kind.endsWith('100') ? 2 : 1;
  const f = pow10(k);
  const v = mul ? dec(rng, rng.int(0, 1), rng.int(1, 2)) : dec(rng, rng.int(1, 2), rng.int(0, 1));
  const ans = clean(mul ? v * f : v / f);
  const zeroTrap = mul && !Number.isInteger(v);
  return {
    skill: 'dec-shift',
    atoms: [kind, ...(zeroTrap ? ['zero-trap'] : [])],
    prompt: mul
      ? rng.pick([
          `What is $${fmt(v)} \\times ${texg(f)}$?`,
          `A pinch of ${rng.pick(STUFF)} weighs ${$(v)} g. How much do ${group3(f)} pinches weigh?`,
        ])
      : rng.pick([
          `What is $${fmt(v)} \\div ${texg(f)}$?`,
          `${$(v)} g of ${rng.pick(STUFF)} is split into ${group3(f)} equal doses. How much is one dose?`,
        ]),
    ...numeric(ans, [
      ...(zeroTrap
        ? [
            [
              v,
              `"Add a zero" doesn't work with decimals: ${fmt(v)}0 is still ${fmt(v)}! The digits must slide ${k} place${k > 1 ? 's' : ''} left.`,
            ] as [number, string],
          ]
        : []),
      [
        clean(mul ? v / f : v * f),
        mul
          ? `That's dividing. Multiplying makes it bigger.`
          : `That's multiplying. Sharing out makes it smaller.`,
      ],
      [
        clean(mul ? v * f * 10 : v / f / 10),
        `One place too far — ${group3(f)} has ${k} zero${k > 1 ? 's' : ''}, so slide ${k} place${k > 1 ? 's' : ''}.`,
      ],
      ...(k > 1
        ? [
            [clean(mul ? (v * f) / 10 : (v / f) * 10), `One place short — slide ${k} places.`] as [
              number,
              string,
            ],
          ]
        : []),
    ]),
    hint: `${mul ? '×' : '÷'}${group3(f)}: every digit slides ${k} place${k > 1 ? 's' : ''} to the ${mul ? 'left' : 'right'}; the point stays put.`,
    explain: `Slide the digits ${k} place${k > 1 ? 's' : ''} ${mul ? 'left' : 'right'}: $${fmt(v)} ${mul ? r`\times` : r`\div`} ${texg(f)} = ${texg(ans)}$.`,
  };
};

const group3 = (n: number) => n.toLocaleString('en-US');

// ---------------------------------------------------------------------------
// dec-round

export const decRound: Generator = (rng, level) => {
  const kinds =
    level === 1
      ? ['whole', 'tenth', 'whole']
      : level === 2
        ? ['tenth', 'hundredth', 'half', 'whole']
        : ['hundredth', 'nines', 'half', 'tenth'];
  const kind = rng.pick(kinds);
  let v: number;
  let p: number;
  if (kind === 'whole') {
    p = 0;
    v = dec(rng, 1, 2);
  } else if (kind === 'tenth') {
    p = -1;
    v = dec(rng, 1, level === 1 ? 2 : 3);
  } else if (kind === 'hundredth') {
    p = -2;
    v = dec(rng, 1, 3);
  } else if (kind === 'half') {
    p = rng.pick([-1, -2]);
    const w = rng.int(1, 9);
    v =
      p === -1
        ? clean(w + rng.int(0, 9) / 10 + 0.05)
        : clean(w + rng.int(0, 9) / 10 + rng.int(0, 9) / 100 + 0.005);
  } else {
    p = rng.pick([-1, -2]);
    const w = rng.int(1, 8);
    v = p === -1 ? clean(w + 0.9 + rng.int(5, 9) / 100) : clean(w + 0.99 + rng.int(5, 9) / 1000);
  }
  const ans = roundTo(v, p);
  const u = pow10(p);
  const chopped = clean(Math.floor(v / u + 1e-9) * u);
  const decider = digitAt(v, p - 1);
  const placeName = p === 0 ? 'whole number' : PLACE_ONE[p];
  return {
    skill: 'dec-round',
    atoms: [
      kind === 'whole'
        ? 'whole'
        : kind === 'tenth'
          ? 'tenth'
          : kind === 'hundredth'
            ? 'hundredth'
            : kind,
    ],
    prompt: rng.pick([
      `Round ${$(v)} to the nearest **${placeName}**.`,
      `The vault lock takes weights to the nearest **${placeName}**. The ${rng.pick(STUFF)} weighs ${$(v)} g. What do you set?`,
    ]),
    ...numeric(ans, [
      [
        ans === chopped ? clean(chopped + u) : chopped,
        decider >= 5
          ? `The next digit is ${decider} — 5 or more, so round **up**.`
          : `The next digit is ${decider} — less than 5, so round **down**.`,
      ],
      [
        roundTo(v, p + 1),
        p === 0
          ? `That's rounded to the nearest ten.`
          : `That's rounded to the nearest ${p + 1 === 0 ? 'whole number' : PLACE_ONE[p + 1]}. Keep one more place.`,
      ],
      ...(p - 1 >= -3
        ? [
            [
              roundTo(v, p - 1),
              `That's one place too fine. Round to the nearest ${placeName}.`,
            ] as [number, string],
          ]
        : []),
      ...(kind === 'nines'
        ? [
            [clean(chopped - 9 * u), `9 + 1 makes ten — carry one into the place to the left.`] as [
              number,
              string,
            ],
          ]
        : []),
    ]),
    hint: `Find the ${placeName === 'whole number' ? 'ones' : PLACE_NAMES[p]} digit, then look at the very next digit.`,
    explain: `The digit after the ${p === 0 ? 'ones' : PLACE_NAMES[p]} place is **${decider}**${decider >= 5 ? ' (5 or more: up)' : ' (less than 5: down)'}. ${fmt(v)} → **${fmt(ans)}**${kind === 'nines' ? ` (written ${ans.toFixed(-p)} to show the ${placeName}s)` : ''}.`,
  };
};
