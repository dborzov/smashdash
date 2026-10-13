/**
 * The Long Count, part 2 — the Siege of Thornwall: rounding, estimating, and places as
 * powers of ten.
 *
 * Why it matters in the story: during a siege nobody has time for exact sums. The Marshal
 * needs "about how many" — fast and honest. A scout who rounds 4,372,519 to "about 4,000,000"
 * when she was asked for the nearest hundred thousand sends the reserve to the wrong wall.
 *
 * Stumbling blocks targeted (each has a nudge):
 *  - looking at the wrong digit (the decider is the digit just right of the rounding place).
 *  - chopping instead of rounding (4,372 → 4,300 to the nearest hundred).
 *  - halfway rounds UP (4,350 → 4,400).
 *  - the ripple: 9,960 to the nearest hundred is 10,000, not 9,1000 or 9,900.
 *  - dropping the zeros (4,372 → "44").
 *  - reverse rounding: the smallest number that rounds to 5,000 is 4,500 (halfway counts),
 *    the largest is 5,499 (5,500 would round up).
 *  - estimating: round first, then add — and use estimates to catch a misplaced digit.
 *  - places as powers of ten: ten-thousands = 10⁴ (four zeros), not 10⁵.
 */
import type { Rng } from '../engine/rng';
import type { Generator } from './types';
import { choice, numeric } from './util';
import {
  digitAt,
  floorTo,
  group,
  PLACE_NAMES,
  PLACE_ONE,
  pow10,
  roundTo,
  texg,
  topPlace,
} from './place';
import { makeNum } from './placevalue';

const $ = (v: number) => `$${texg(v)}$`;

const ROUND_ATOM: Record<number, string> = {
  1: 'r10',
  2: 'r100',
  3: 'r1000',
  4: 'r10k',
  5: 'r100k',
  6: 'r1m',
};

/** A number to round to place p, shaped to hit a particular trap. */
function roundable(
  rng: Rng,
  p: number,
  digits: number,
  shape: 'any' | 'half' | 'nines' | 'down' | 'up',
): number {
  let v = makeNum(rng, Math.max(digits, p + 2));
  const set = (q: number, d: number) => (v = v - digitAt(v, q) * pow10(q) + d * pow10(q));
  if (shape === 'half') {
    set(p - 1, 5);
    for (let q = 0; q < p - 1; q++) set(q, 0);
  } else if (shape === 'nines') {
    set(p, 9);
    set(p - 1, rng.int(5, 9));
    if (p + 1 < topPlace(v)) set(p + 1, rng.chance(0.5) ? 9 : rng.int(0, 8));
  } else if (shape === 'down') set(p - 1, rng.int(1, 4));
  else if (shape === 'up') set(p - 1, rng.int(6, 9));
  if (v % pow10(p) === 0) set(p - 1, rng.int(1, 4));
  return v;
}

function roundProblem(
  rng: Rng,
  level: number,
  places: number[],
  skill: string,
  things: string[],
  who: string[],
) {
  const p = rng.pick(places);
  const kinds =
    level === 1
      ? ['round', 'round', 'between']
      : level === 2
        ? ['round', 'round', 'between', 'half']
        : ['round', 'nines', 'half', 'round'];
  const kind = rng.pick(kinds);
  const digits = Math.min(8, p + rng.int(2, 3));
  const unit = pow10(p);
  if (kind === 'between') {
    const v = roundable(rng, p, digits, 'any');
    const lo = floorTo(v, p);
    const hi = lo + unit;
    return {
      skill,
      atoms: ['between'],
      prompt: `${$(v)} lies between which two ${PLACE_NAMES[p]}?`,
      visual:
        level === 1
          ? {
              kind: 'numberline' as const,
              min: lo,
              max: hi,
              step: unit,
              minor: unit / 10,
              labels: 'ends' as const,
              arrow: v,
              mid: true,
            }
          : undefined,
      ...choice(rng, `${group(lo)} and ${group(hi)}`, [
        {
          text: `${group(floorTo(v, p + 1))} and ${group(floorTo(v, p + 1) + unit * 10)}`,
          nudge: `Those are ${PLACE_NAMES[p + 1]}. We want the ${PLACE_NAMES[p]} just below and just above.`,
        },
        ...(p > 1
          ? [
              {
                text: `${group(floorTo(v, p - 1))} and ${group(floorTo(v, p - 1) + unit / 10)}`,
                nudge: `Those are ${PLACE_NAMES[p - 1]} — too fine. We want ${PLACE_NAMES[p]}.`,
              },
            ]
          : []),
        `${group(hi)} and ${group(hi + unit)}`,
      ]),
      explain: `Chop off everything after the ${PLACE_NAMES[p]} digit: ${group(lo)}. The next ${PLACE_ONE[p]} up is ${group(hi)}.`,
    };
  }
  const shape =
    kind === 'half'
      ? 'half'
      : kind === 'nines'
        ? 'nines'
        : rng.pick(['up', 'down', 'any'] as const);
  const v = roundable(rng, p, digits, shape);
  const ans = roundTo(v, p);
  const decider = digitAt(v, p - 1);
  const atoms = [
    ROUND_ATOM[p] ?? 'r10',
    ...(kind === 'half' ? ['half'] : []),
    ...(kind === 'nines' ? ['nines'] : []),
  ];
  const chopped = floorTo(v, p);
  const nudges: [number, string][] = [
    [
      ans === chopped ? chopped + unit : chopped,
      decider >= 5
        ? `The digit after the ${PLACE_NAMES[p]} place is ${decider} — 5 or more, so round **up**.${kind === 'half' ? ' Exactly halfway counts as up.' : ''}`
        : `The digit after the ${PLACE_NAMES[p]} place is ${decider} — less than 5, so round **down** (keep the ${PLACE_NAMES[p]} digit).`,
    ],
    [
      ans / unit,
      `Keep the zeros! Rounding gives a number of the same size: ${group(ans)}, not ${group(ans / unit)}.`,
    ],
    [
      roundTo(v, p + 1),
      `That's rounded to the nearest ${PLACE_ONE[p + 1]}. We want the nearest ${PLACE_ONE[p]}.`,
    ],
    [
      roundTo(v, p - 1),
      `That's rounded to the nearest ${PLACE_ONE[p - 1]}. We want the nearest ${PLACE_ONE[p]}.`,
    ],
  ];
  if (kind === 'nines') {
    // The ripple slip: 9 + 1 written as 10 in the place, or the carry forgotten.
    nudges.push([
      chopped - 9 * unit,
      `9 ${PLACE_NAMES[p]} + 1 more makes ten of them — that carries into the next place left.`,
    ]);
  }
  return {
    skill,
    atoms,
    prompt: rng.pick([
      `Round ${$(v)} to the nearest **${PLACE_ONE[p]}**.`,
      `${rng.pick(who)} counts ${$(v)} ${rng.pick(things)}. The Marshal wants it to the nearest **${PLACE_ONE[p]}**. What should be reported?`,
    ]),
    ...numeric(ans, nudges),
    hint: `Find the ${PLACE_NAMES[p]} digit. Look only at the digit to its right: 5 or more rounds up.`,
    explain: `The ${PLACE_NAMES[p]} digit is ${digitAt(v, p)}; the next digit is **${decider}**${decider >= 5 ? ' (5 or more: up)' : ' (less than 5: down)'}. ${group(v)} → **${group(ans)}**.${kind === 'nines' && decider >= 5 ? ' The 9 rolls over and carries one into the place to its left.' : ''}`,
  };
}

const WHO = ['Wren', 'A wall sentry', 'The tower lookout', 'Corvin the scout'];
const THINGS = [
  'hollow soldiers',
  'arrows',
  'sacks of grain',
  'crossbow bolts',
  'refugees at the gate',
];

export const roundSmall: Generator = (rng, level) =>
  roundProblem(rng, level, level === 1 ? [1, 2] : [1, 2, 3], 'round-small', THINGS, WHO);

export const roundBig: Generator = (rng, level) =>
  roundProblem(rng, level, level === 1 ? [4, 5] : [4, 5, 6], 'round-big', THINGS, WHO);

// ---------------------------------------------------------------------------
// round-range — what could the true number have been?

export const roundRange: Generator = (rng, level) => {
  const p = level === 1 ? rng.int(1, 2) : level === 2 ? rng.int(2, 3) : rng.int(3, 5);
  const unit = pow10(p);
  const X =
    rng.int(2, 9) * unit * (rng.chance(0.5) ? 1 : 10) +
    (rng.chance(0.5) ? rng.int(1, 9) * unit : 0);
  const kinds =
    level === 1 ? ['could', 'could', 'smallest'] : ['could', 'smallest', 'largest', 'place'];
  const kind = rng.pick(kinds);
  const half = unit / 2;
  const said = `rounded to the nearest ${PLACE_ONE[p]}`;
  if (kind === 'smallest') {
    const ans = X - half;
    return {
      skill: 'round-range',
      atoms: ['smallest'],
      prompt: `A scout reports **about ${group(X)}** riders, ${said}. What is the **smallest** whole number of riders that could be?`,
      ...numeric(ans, [
        [
          ans + 1,
          `${group(ans)} is exactly halfway — and halfway rounds **up**, to ${group(X)}. So ${group(ans)} itself counts.`,
        ],
        [X - unit, `${group(X - unit)} rounds to itself, not to ${group(X)}.`],
        [
          ans - 1,
          `${group(ans - 1)} is just below halfway, so it rounds down to ${group(X - unit)}.`,
        ],
        [X, `${group(X)} works, but smaller numbers round to it too. How low can you go?`],
      ]),
      hint: `Halfway between ${group(X - unit)} and ${group(X)} is ${group(X - half)}. Which way does halfway round?`,
      explain: `Everything from ${group(X - half)} (halfway, rounds up) to ${group(X + half - 1)} rounds to ${group(X)}. The smallest is **${group(ans)}**.`,
    };
  }
  if (kind === 'largest') {
    const ans = X + half - 1;
    return {
      skill: 'round-range',
      atoms: ['largest'],
      prompt: `The tally says **${group(X)}** arrows, ${said}. What is the **largest** whole number of arrows that could be?`,
      ...numeric(ans, [
        [
          ans + 1,
          `${group(ans + 1)} is exactly halfway, and halfway rounds **up** — to ${group(X + unit)}. Go one lower.`,
        ],
        [
          X + unit - 1,
          `${group(X + unit - 1)} is much closer to ${group(X + unit)}, so it rounds up.`,
        ],
        [X, `${group(X)} works, but bigger numbers round to it too.`],
      ]),
      hint: `Halfway up to the next ${PLACE_ONE[p]} is ${group(X + half)}, which rounds up. Just below it?`,
      explain: `${group(X + half)} would round up to ${group(X + unit)}, so the largest is one less: **${group(ans)}**.`,
    };
  }
  if (kind === 'place') {
    const q = Math.max(1, p);
    const v = makeNum(rng, q + 3);
    const shown = roundTo(v, q);
    // make sure no other place rounds to the same value
    const others = [q - 1, q + 1, q + 2].filter((x) => x >= 1 && roundTo(v, x) !== shown);
    return {
      skill: 'round-range',
      atoms: ['place-used'],
      prompt: `Hobb rounded ${$(v)} to ${$(shown)}. To which place did he round?`,
      ...choice(
        rng,
        `the nearest ${PLACE_ONE[q]}`,
        others.map((x) => ({
          text: `the nearest ${PLACE_ONE[x]}`,
          nudge: `Rounded to the nearest ${PLACE_ONE[x]}, it would be ${group(roundTo(v, x))}.`,
        })),
      ),
      explain: `${group(shown)} keeps every digit down to the ${PLACE_NAMES[q]} place and has zeros after it: rounded to the nearest **${PLACE_ONE[q]}**.`,
    };
  }
  // could-be
  const good = X + rng.int(-half, half - 1);
  const up = X + half;
  const down = X - half - rng.int(1, Math.max(1, half / 2));
  const far = X + unit + rng.int(1, half - 1);
  return {
    skill: 'round-range',
    atoms: ['could-be'],
    prompt: `"About ${group(X)} of them," says the scout — ${said}. Which could be the **true** count?`,
    ...choice(rng, $(good), [
      {
        text: $(up),
        nudge: `${group(up)} is exactly halfway, and halfway rounds **up** — to ${group(X + unit)}.`,
      },
      {
        text: $(down),
        nudge: `${group(down)} is closer to ${group(X - unit)}, so it would round down to that.`,
      },
      $(far),
    ]),
    explain: `Anything from ${group(X - half)} up to ${group(X + half - 1)} rounds to ${group(X)}. ${group(good)} is in that range.`,
  };
};

// ---------------------------------------------------------------------------
// estimate — round first, then calculate; use it to catch mistakes

export const estimate: Generator = (rng, level) => {
  const kinds =
    level === 1
      ? ['sum', 'sum', 'check']
      : level === 2
        ? ['sum', 'difference', 'check', 'compare']
        : ['difference', 'check', 'compare', 'sum'];
  const kind = rng.pick(kinds);
  const p = level === 1 ? 2 : level === 2 ? 3 : rng.int(3, 4);
  const unit = pow10(p);
  const digits = p + rng.int(1, 2);
  const mk = () => {
    let v = makeNum(rng, digits, { distinct: true });
    // Keep it away from exact halves, so the estimate is unambiguous.
    if (digitAt(v, p - 1) === 5) v += unit / 10;
    return v;
  };
  if (kind === 'sum' || kind === 'difference') {
    const n = kind === 'sum' ? (level === 1 ? 2 : 3) : 2;
    let nums = Array.from({ length: n }, mk);
    if (kind === 'difference') nums = nums.sort((a, b) => b - a);
    if (kind === 'difference' && roundTo(nums[0], p) === roundTo(nums[1], p)) nums[0] += unit * 3;
    const rounded = nums.map((x) => roundTo(x, p));
    const exact = kind === 'sum' ? nums.reduce((a, b) => a + b, 0) : nums[0] - nums[1];
    const est = kind === 'sum' ? rounded.reduce((a, b) => a + b, 0) : rounded[0] - rounded[1];
    const chopped =
      kind === 'sum'
        ? nums.map((x) => floorTo(x, p)).reduce((a, b) => a + b, 0)
        : floorTo(nums[0], p) - floorTo(nums[1], p);
    const op = kind === 'sum' ? ' + ' : ' - ';
    return {
      skill: 'estimate',
      atoms: [kind],
      prompt:
        kind === 'sum'
          ? `${n === 2 ? 'Two' : 'Three'} supply carts carry ${nums
              .slice(0, -1)
              .map((x) => $(x))
              .join(
                ', ',
              )} and ${$(nums[n - 1])} bolts. **Estimate** the total by rounding each to the nearest ${PLACE_ONE[p]} first.`
          : `The Host had ${$(nums[0])} soldiers; ${$(nums[1])} fell at the ford. **Estimate** how many are left, rounding each to the nearest ${PLACE_ONE[p]} first.`,
      ...numeric(est, [
        [
          exact,
          `That's the exact answer. An estimate rounds first: ${rounded.map(group).join(op.trim() === '+' ? ' + ' : ' − ')}.`,
        ],
        [chopped, `Round, don't chop: look at the digit after the ${PLACE_NAMES[p]} place.`],
        [
          roundTo(exact, p + 1),
          `Round each number to the nearest ${PLACE_ONE[p]} — not the answer to the nearest ${PLACE_ONE[p + 1]}.`,
        ],
      ]),
      hint: `Round each: ${nums.map((x) => `${group(x)} → ?`).join(', ')}.`,
      explain: `${nums.map((x, i) => `${group(x)} ≈ ${group(rounded[i])}`).join(', ')}. Estimate: $${rounded.map(texg).join(op)} = ${texg(est)}$. (Exact: ${group(exact)} — close!)`,
    };
  }
  if (kind === 'check') {
    const nums = Array.from({ length: 3 }, mk);
    const exact = nums.reduce((a, b) => a + b, 0);
    const est = nums.map((x) => roundTo(x, p)).reduce((a, b) => a + b, 0);
    const mistake = rng.pick(['small', 'big', 'ok'] as const);
    const claimed =
      mistake === 'small' ? Math.round(exact / 10) : mistake === 'big' ? exact * 10 : exact;
    const ok = `Yes — it's close to the estimate of about ${group(est)}`;
    const tooSmall = `No — the estimate is about ${group(est)}, so it's far too small`;
    const tooBig = `No — the estimate is about ${group(est)}, so it's far too big`;
    const right = mistake === 'small' ? tooSmall : mistake === 'big' ? tooBig : ok;
    return {
      skill: 'estimate',
      atoms: ['check'],
      prompt: `A clerk added ${nums.map((x) => $(x)).join(' + ')} and wrote ${$(claimed)}. Could that be right? (Estimate — no need to add exactly.)`,
      ...choice(
        rng,
        right,
        [ok, tooSmall, tooBig]
          .filter((x) => x !== right)
          .map((x) =>
            x === ok
              ? {
                  text: x,
                  nudge: `Estimate first: ${nums.map((y) => group(roundTo(y, p))).join(' + ')} ≈ ${group(est)}. Is ${group(claimed)} anywhere near?`,
                }
              : x,
          ),
      ),
      explain: `Rounded: ${nums.map((y) => group(roundTo(y, p))).join(' + ')} = ${group(est)}. The clerk wrote ${group(claimed)}${mistake === 'ok' ? ', which is close — believable.' : ` — a whole place ${mistake === 'small' ? 'too small' : 'too big'}. Someone slipped a digit.`}`,
    };
  }
  // compare: is the total more or less than a target?
  const nums = Array.from({ length: 2 }, mk);
  const est = nums.map((x) => roundTo(x, p)).reduce((a, b) => a + b, 0);
  const exact = nums[0] + nums[1];
  const off = rng.chance(0.5) ? 1 : -1;
  let target = roundTo(est + off * 2 * unit, p);
  if (exact > target !== est > target) target = roundTo(est + off * 4 * unit, p);
  const more = exact > target;
  return {
    skill: 'estimate',
    atoms: ['compare-est'],
    prompt: `The gate can hold off ${$(target)} attackers. Two companies of ${$(nums[0])} and ${$(nums[1])} are coming. Is that **more** or **less** than the gate can hold?`,
    ...choice(rng, more ? 'More — the gate needs help' : 'Less — the gate will hold', [
      {
        text: more ? 'Less — the gate will hold' : 'More — the gate needs help',
        nudge: `Estimate: ${group(roundTo(nums[0], p))} + ${group(roundTo(nums[1], p))} ≈ ${group(est)}. Compare that with ${group(target)}.`,
      },
      'Exactly the same',
    ]),
    explain: `About ${group(roundTo(nums[0], p))} + ${group(roundTo(nums[1], p))} = ${group(est)}, which is ${more ? 'more' : 'less'} than ${group(target)}. (Exactly: ${group(exact)}.)`,
  };
};

// ---------------------------------------------------------------------------
// pow10-places — every place is a power of ten

export const pow10Places: Generator = (rng, level) => {
  const kinds =
    level === 1
      ? ['to-power', 'zeros', 'to-place']
      : level === 2
        ? ['to-power', 'to-place', 'digit', 'zeros']
        : ['digit', 'thousand', 'to-place', 'digit'];
  const kind = rng.pick(kinds);
  if (kind === 'to-power') {
    const p = rng.int(2, level === 1 ? 4 : 6);
    return {
      skill: 'pow10-places',
      atoms: ['place-to-power'],
      prompt: `One ${PLACE_ONE[p]} is ${$(pow10(p))}. As a power of ten, that is $10^{?}$`,
      ...numeric(p, [
        [
          p + 1,
          `Count only the **zeros** in ${group(pow10(p))}, not the 1. (Or: the ${PLACE_NAMES[p]} place is ${p} steps left of the ones.)`,
        ],
        [p - 1, `Count the zeros again: ${group(pow10(p))}.`],
      ]),
      explain: `${group(pow10(p))} has ${p} zero${p > 1 ? 's' : ''}: it is $10^{${p}}$.`,
    };
  }
  if (kind === 'to-place') {
    const p = rng.int(2, 6);
    return {
      skill: 'pow10-places',
      atoms: ['power-to-place'],
      prompt: `$10^{${p}}$ is the value of one of which place?`,
      ...choice(rng, `the ${PLACE_NAMES[p]}`, [
        {
          text: `the ${PLACE_NAMES[p + 1]}`,
          nudge: `$10^{${p}}$ has ${p} zeros: ${group(pow10(p))}. Which place is that?`,
        },
        {
          text: `the ${PLACE_NAMES[p - 1]}`,
          nudge: `$10^{${p}}$ has ${p} zeros: ${group(pow10(p))}. Which place is that?`,
        },
        `the ${PLACE_NAMES[Math.max(0, p - 2)]}`,
      ]),
      explain: `$10^{${p}} = ${texg(pow10(p))}$ — one ${PLACE_ONE[p]}.`,
    };
  }
  if (kind === 'zeros') {
    const p = rng.pick([3, 5, 6, 7]);
    const name = p === 7 ? 'ten million' : `one ${PLACE_ONE[p]}`;
    return {
      skill: 'pow10-places',
      atoms: ['zeros'],
      prompt: `How many zeros are there in ${name}?`,
      ...numeric(p, [
        [p - 1, `Write it out: ${group(pow10(p))}. Count again.`],
        [p + 1, `Write it out: ${group(pow10(p))}. Count again.`],
      ]),
      explain: `${name.replace(/^one /, 'One ')} = ${group(pow10(p))}: ${p} zeros, so it's $10^{${p}}$.`,
    };
  }
  if (kind === 'thousand') {
    const pairs: [number, number][] = [
      [3, 3],
      [2, 4],
      [1, 5],
      [3, 4],
      [2, 3],
    ];
    const [a, b] = rng.pick(pairs);
    return {
      skill: 'pow10-places',
      atoms: ['thousand-thousands'],
      prompt: `$${texg(pow10(a))} \\times ${texg(pow10(b))} = 10^{?}$`,
      ...numeric(a + b, [
        [a * b, `Multiplying by a power of ten **adds** zeros: ${a} zeros and ${b} more.`],
        [a + b + 1, `Count only zeros: ${a} + ${b}.`],
      ]),
      explain: `${a} zeros and ${b} zeros: $10^{${a}} \\times 10^{${b}} = 10^{${a + b}} = ${texg(pow10(a + b))}$.${a + b === 6 ? ' A thousand thousands is a million!' : ''}`,
    };
  }
  // digit value as d × 10^n
  const digits = rng.int(5, 7);
  const v = makeNum(rng, digits, { distinct: true });
  const p = rng.int(2, digits - 1);
  const d = digitAt(v, p);
  return {
    skill: 'pow10-places',
    atoms: ['digit-value'],
    prompt: `In ${$(v)}, the ${d} is worth $${d} \\times 10^{?}$`,
    ...numeric(p, [
      [
        p + 1,
        `Counting places starting from 1 at the ones? The ones place is $10^0$, so start from 0.`,
      ],
      [
        d * pow10(p),
        `That's its value. We want the power: how many zeros does ${group(d * pow10(p))} have after the ${d}?`,
      ],
      [p - 1, `Count again: the ${d} is in the ${PLACE_NAMES[p]} place.`],
    ]),
    explain: `The ${d} is in the ${PLACE_NAMES[p]} place, worth $${d} \\times ${texg(pow10(p))} = ${d} \\times 10^{${p}}$.`,
  };
};
