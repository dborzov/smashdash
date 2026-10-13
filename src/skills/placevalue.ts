/**
 * The Long Count, part 1 — Greyhaven and the Ashen Road: place value up to the millions.
 *
 * Why it matters in the story: the realm's ledgers burned, and every report about the Hollow
 * Host, every supply tally and every muster roll now has to be read, written and compared by
 * hand. Misread one place and you send 300 spears against 3,000. The Tallyman's forgers
 * know it: they slide digits, drop zeros and swap places.
 *
 * Stumbling blocks targeted (each has a nudge):
 *  - counting places from the LEFT instead of from the ones (right).
 *  - digit vs value: the 7 in 4,372,519 is worth 70,000, not 7.
 *  - zeros as placeholders: "two million, forty thousand, six" is 2,040,006 — not 2,406,
 *    240,006 or 2,000,040,006 (writing each part and gluing them).
 *  - commas count threes from the right; each period is read as its own little number.
 *  - comparing by the first digit only (98,000 vs 120,000) or sorting like words.
 *  - ×10 moves every digit one place left; each place is worth 10 × the one to its right.
 *  - "how many thousands are in 34,500?" (34) vs "the thousands digit" (4).
 *  - adding 10,000 to 3,995,000: the carry ripples through the nines.
 *  - number lines: work out what one jump is worth before counting jumps.
 */
import type { Rng } from '../engine/rng';
import type { Generator } from './types';
import { choice, clean, numeric } from './util';
import {
  digitAt,
  group,
  PLACE_NAMES,
  PLACE_ONE,
  periodOf,
  pow10,
  texg,
  topPlace,
  words,
} from './place';

const r = String.raw;
/** A number in LaTeX with thousands separators, as inline maths. */
const $ = (v: number) => `$${texg(v)}$`;

// ---------------------------------------------------------------------------
// Number makers

/** A whole number with `digits` digits; all different and non-zero when `distinct`. */
export function makeNum(
  rng: Rng,
  digits: number,
  opts: { distinct?: boolean; zeros?: number } = {},
): number {
  const ds: number[] = [];
  const pool = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  for (let i = 0; i < digits; i++) {
    if (opts.distinct && digits <= 9) ds.push(pool[i]);
    else ds.push(i === 0 ? rng.int(1, 9) : rng.int(0, 9));
  }
  if (opts.zeros) {
    const spots = rng
      .shuffle(Array.from({ length: digits - 1 }, (_, i) => i + 1))
      .slice(0, opts.zeros);
    for (const s of spots) ds[s] = 0;
  }
  return Number(ds.join(''));
}

/** A number with `digits` digits, none equal to `avoid`, all different, no zeros. */
function numAvoiding(rng: Rng, digits: number, avoid: number): number[] {
  const pool = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((x) => x !== avoid));
  return Array.from({ length: digits }, (_, i) => pool[i % pool.length]);
}

/** Digits (most significant first) → number. */
const fromDigits = (ds: number[]) => Number(ds.join(''));

/** Replace the digit in place p. */
function withDigit(v: number, p: number, d: number): number {
  return v - digitAt(v, p) * pow10(p) + d * pow10(p);
}

/** Things that get counted in a war. */
const THINGS = [
  'hollow soldiers',
  'arrows',
  'sacks of grain',
  'silver crowns',
  'spears',
  'horseshoes',
  'barrels of pitch',
  'refugees',
];

const SOURCES = [
  "Wren's scouting report",
  'The muster roll',
  'The granary ledger',
  "The quartermaster's tally",
  'A captured enemy tally',
  "Brother Anselm's copy of the old census",
];

const placeAtom = (p: number) =>
  p <= 2
    ? 'ones-tens-hundreds'
    : (['thousands', 'ten-thousands', 'hundred-thousands', 'millions', 'ten-millions'][p - 3] ??
      'ten-millions');

const LEFT_COUNT = `Count the places from the **right**, starting at the ones: ones, tens, hundreds, thousands…`;
const ONE_OFF = `One place off. Say them from the ones end: ones, tens, hundreds, thousands, ten-thousands, hundred-thousands, millions.`;

// ---------------------------------------------------------------------------
// pv-places — which place is a digit in?

export const pvPlaces: Generator = (rng, level) => {
  const digits = level === 1 ? rng.int(4, 5) : level === 2 ? rng.int(5, 7) : rng.int(6, 8);
  const v = makeNum(rng, digits, { distinct: true });
  const what = rng.pick(THINGS);
  const src = rng.pick(SOURCES);
  const kinds = level === 1 ? ['digit', 'place'] : ['digit', 'place', 'period'];
  const kind = rng.pick(kinds);
  const p = rng.int(level === 1 ? 1 : 2, digits - 1);
  const d = digitAt(v, p);
  if (kind === 'digit') {
    const fromLeft = digits - 1 - p;
    return {
      skill: 'pv-places',
      atoms: [placeAtom(p)],
      prompt: `${src}: ${$(v)} ${what}. Which digit sits in the **${PLACE_NAMES[p]}** place?`,
      visual: level === 1 ? { kind: 'placechart', value: v } : undefined,
      ...numeric(d, [
        [digitAt(v, fromLeft), LEFT_COUNT],
        [digitAt(v, p - 1), ONE_OFF],
        ...(p + 1 < digits ? [[digitAt(v, p + 1), ONE_OFF] as [number, string]] : []),
      ]),
      hint: `Start at the right-hand end: that's the ones. Step left one place at a time.`,
      explain: `From the right: ${Array.from({ length: p + 1 }, (_, i) => `${PLACE_NAMES[i]} (${digitAt(v, i)})`).join(', ')}. The ${PLACE_NAMES[p]} digit is **${d}**.`,
    };
  }
  if (kind === 'place') {
    const fromLeft = digits - 1 - p;
    const opts = [
      ...(fromLeft !== p
        ? [{ text: `the ${PLACE_NAMES[fromLeft]} place`, nudge: LEFT_COUNT }]
        : []),
      { text: `the ${PLACE_NAMES[p + 1]} place`, nudge: ONE_OFF },
      { text: `the ${PLACE_NAMES[p - 1]} place`, nudge: ONE_OFF },
      `the ${PLACE_NAMES[Math.max(0, p - 2)]} place`,
    ];
    return {
      skill: 'pv-places',
      atoms: [placeAtom(p)],
      prompt: `${src}: ${$(v)} ${what}. Which place is the **${d}** in?`,
      ...choice(rng, `the ${PLACE_NAMES[p]} place`, opts),
      hint: `Commas split the number into groups of three. Name the places from the right.`,
      explain: `Counting from the ones at the right, the ${d} is ${p} place${p > 1 ? 's' : ''} to the left: the **${PLACE_NAMES[p]}** place.`,
    };
  }
  // Which period (comma group)?
  const per = periodOf(p);
  const periods = (['millions', 'thousands', 'ones'] as const).filter(
    (x) => x !== 'millions' || digits > 6,
  );
  return {
    skill: 'pv-places',
    atoms: ['periods'],
    prompt: `Commas split ${$(v)} into **periods** of three digits: ${digits > 6 ? 'millions, ' : ''}thousands and ones. Which period is the **${d}** in?`,
    ...choice(
      rng,
      `the ${per} period`,
      periods
        .filter((x) => x !== per)
        .map((x) => ({
          text: `the ${x} period`,
          nudge: `Periods are counted from the right too: the last three digits are the ones period, the next three the thousands, then the millions.`,
        })),
    ),
    explain: `${group(v)}: from the right, the first three digits are the **ones** period, then **thousands**, then **millions**. The ${d} is in the **${per}** period.`,
  };
};

// ---------------------------------------------------------------------------
// pv-value — what is a digit worth?

const valueAtom = (p: number) => (p <= 2 ? 'small' : p <= 4 ? 'thousands' : 'big');

export const pvValue: Generator = (rng, level) => {
  const kinds =
    level === 1
      ? ['value', 'value', 'which']
      : level === 2
        ? ['value', 'which', 'zero', 'same']
        : ['value', 'same', 'zero', 'which'];
  const kind = rng.pick(kinds);
  const what = rng.pick(THINGS);
  const digits = level === 1 ? rng.int(4, 5) : rng.int(5, 7);

  if (kind === 'value') {
    const v = makeNum(rng, digits, { distinct: true });
    const p = rng.int(1, digits - 1);
    const d = digitAt(v, p);
    const val = d * pow10(p);
    return {
      skill: 'pv-value',
      atoms: [valueAtom(p)],
      prompt: `${rng.pick(SOURCES)} says ${$(v)} ${what}. What is the **${d}** worth?`,
      ...numeric(val, [
        [
          d,
          `That's the digit. But it sits in the ${PLACE_NAMES[p]} place, so it's worth ${d} ${PLACE_NAMES[p]}.`,
        ],
        [d * pow10(p + 1), ONE_OFF],
        [d * pow10(p - 1), ONE_OFF],
        [
          Math.floor(v / pow10(p)),
          `That's everything from the ${d} leftwards. We want just the ${d}: ${d} ${PLACE_ONE[p]}${d > 1 ? 's' : ''}.`,
        ],
      ]),
      hint: `Keep the ${d} and turn every digit to its right into a zero.`,
      explain: `The ${d} is in the ${PLACE_NAMES[p]} place: $${d} \\times ${texg(pow10(p))} = ${texg(val)}$.`,
    };
  }

  if (kind === 'which') {
    const d = rng.int(2, 9);
    const p = rng.int(2, digits - 1);
    const make = (pp: number) => {
      const ds = numAvoiding(rng, digits, d);
      ds[digits - 1 - pp] = d;
      return fromDigits(ds);
    };
    const others = [p + 1, p - 1, p - 2].filter((q) => q >= 0 && q < digits);
    return {
      skill: 'pv-value',
      atoms: [valueAtom(p)],
      prompt: `Which number has a **${d}** worth ${$(d * pow10(p))}?`,
      ...choice(
        rng,
        $(make(p)),
        others.map((q) => ({
          text: $(make(q)),
          nudge:
            q === p + 1 || q === p - 1
              ? `Close — in that one the ${d} is worth ${group(d * pow10(q))}. ${ONE_OFF}`
              : undefined,
        })),
      ),
      explain: `${group(d * pow10(p))} means the ${d} must be in the **${PLACE_NAMES[p]}** place.`,
    };
  }

  if (kind === 'zero') {
    let v = makeNum(rng, digits, { distinct: true });
    const p = rng.int(1, digits - 2);
    v = withDigit(v, p, 0);
    const s = String(v);
    const without = Number(s.slice(0, digits - 1 - p) + s.slice(digits - p));
    return {
      skill: 'pv-value',
      atoms: ['zero'],
      prompt: `A clerk asks: "What's the point of the **0** in ${$(v)}? It's worth nothing."`,
      ...choice(
        rng,
        `It holds the ${PLACE_NAMES[p]} place, so every other digit stays where it belongs`,
        [
          {
            text: `Nothing — you could rub it out`,
            nudge: `Rub it out and you get ${group(without)} — a far smaller number. Every digit to its left slides down a place.`,
          },
          {
            text: `It is worth 10`,
            nudge: `A zero is worth zero — its job is to keep a place open.`,
          },
          `It means that part of the count is unknown`,
        ],
      ),
      explain: `${group(v)} has no ${PLACE_NAMES[p]}, but the 0 still has to sit there. Without it, ${group(v)} would collapse into ${group(without)}.`,
    };
  }

  // same digit, two places: how many times more is the left one worth?
  const d = rng.int(2, 9);
  const gap = level === 2 ? rng.int(1, 2) : rng.int(2, 4);
  const len = Math.max(digits, gap + 2);
  const p2 = rng.int(0, len - 1 - gap);
  const p1 = p2 + gap;
  const ds = numAvoiding(rng, len, d);
  ds[len - 1 - p1] = d;
  ds[len - 1 - p2] = d;
  const v = fromDigits(ds);
  const ratio = pow10(gap);
  return {
    skill: 'pv-value',
    atoms: ['same-digit'],
    prompt: `${$(v)} has two ${d}s. The left ${d} is worth how many times as much as the right one?`,
    ...numeric(ratio, [
      [
        gap,
        `They are ${gap} place${gap > 1 ? 's' : ''} apart — but each place left is worth **ten times** more, so multiply by 10 for every step.`,
      ],
      [
        10 * gap,
        `Not ten per step added up — ten **times** ten for each step: $${Array(gap)
          .fill(10)
          .join(r` \times `)}$.`,
      ],
      [1, `Same digit, not the same worth! It's all about which place it's in.`],
    ]),
    hint: `Work out what each ${d} is worth, then divide.`,
    explain: `The left ${d} is worth ${group(d * pow10(p1))}, the right one ${group(d * pow10(p2))}. That's ${group(ratio)} times as much — one ×10 for each of the ${gap} places.`,
  };
};

// ---------------------------------------------------------------------------
// pv-read — commas, periods and number words

export const pvRead: Generator = (rng, level) => {
  const kinds =
    level === 1
      ? ['commas', 'gap']
      : level === 2
        ? ['commas', 'words', 'gap']
        : ['words', 'gap', 'words'];
  const kind = rng.pick(kinds);
  if (kind === 'commas') {
    const digits = level === 1 ? rng.int(5, 6) : 7;
    const v = makeNum(rng, digits);
    const s = String(v);
    const fromLeft = s.replace(/(\d{3})(?=\d)/g, '$1,');
    const opts = [
      {
        text: `$${fromLeft.replace(/,/g, '{,}')}$`,
        nudge: `Commas count off threes from the **right** — the ones end — not from the left.`,
      },
      {
        text: `$${s[0]}{,}${s.slice(1)}$`,
        nudge: `Every three digits gets a comma, counting from the right.`,
      },
      `$${s.slice(0, -1)}{,}${s.slice(-1)}$`,
    ];
    return {
      skill: 'pv-read',
      atoms: ['commas'],
      prompt: `A tally scratched on a door reads **${s}**. Where do the commas go?`,
      ...choice(rng, $(v), opts),
      explain: `Start at the ones and count three digits to the left, comma, three more, comma: **${group(v)}**.`,
    };
  }
  if (kind === 'gap') {
    const digits = level === 1 ? 6 : 7;
    let v = makeNum(rng, digits);
    if (digits === 7 && rng.chance(0.4)) v = withDigit(v, 5, 0);
    const mid = Math.floor(v / 1000) % 1000;
    const top = Math.floor(v / 1e6);
    const low = v % 1000;
    const said =
      (top ? `${words(top)} million, ` : '') + `___ thousand` + (low ? `, ${words(low)}` : '');
    return {
      skill: 'pv-read',
      atoms: ['period-name'],
      prompt: `The herald reads ${$(v)} aloud: *"${said}."* What number goes in the gap?`,
      ...numeric(mid, [
        [
          digitAt(v, 3),
          `That's only the thousands digit. The whole thousands **period** — all three digits between the commas — is read together.`,
        ],
        [
          Math.floor(v / 1000),
          `The millions are read separately. Just the three digits between the two commas.`,
        ],
      ]),
      explain: `Between the commas sit the digits **${String(mid).padStart(3, '0')}**, read as "${words(mid)} thousand".`,
    };
  }
  // words
  const digits = level === 2 ? 6 : 7;
  let v = makeNum(rng, digits);
  if (rng.chance(0.7)) v = withDigit(v, rng.pick(digits === 7 ? [5, 4, 2, 1] : [4, 2, 1]), 0);
  const s = String(v);
  const hasZero = s.slice(1).includes('0');
  const zi = s.indexOf('0', 1);
  const dropZero = hasZero ? Number(s.slice(0, zi) + s.slice(zi + 1)) : v * 10;
  // Swap two neighbours in the thousands period.
  const sw = s.split('');
  const i = digits - 5;
  [sw[i], sw[i + 1]] = [sw[i + 1], sw[i]];
  const swapped = Number(sw.join(''));
  return {
    skill: 'pv-read',
    atoms: [hasZero ? 'zeros-words' : 'to-words'],
    prompt: `How do you read ${$(v)} out loud?`,
    ...choice(rng, words(v), [
      {
        text: words(dropZero),
        nudge: hasZero
          ? `That reading has lost the zero — it's ${group(dropZero)}. Read each comma group as its own number.`
          : `That's ten times too big — check how many digits there are.`,
      },
      ...(swapped !== v
        ? [
            {
              text: words(swapped),
              nudge: `Two digits got swapped. Read each period exactly as written.`,
            },
          ]
        : []),
      words(Math.floor(v / 10)),
    ]),
    explain: `Read each period as a small number, then its name: **${words(v)}**.`,
  };
};

// ---------------------------------------------------------------------------
// pv-write — words to digits, with placeholder zeros

/** Gluing each spoken part as if it were the whole number: "4,000" + "72" → 400072. */
function glued(v: number): number | null {
  const parts = [Math.floor(v / 1e6) * 1e6, (Math.floor(v / 1e3) % 1000) * 1e3, v % 1000].filter(
    (x) => x > 0,
  );
  if (parts.length < 2) return null;
  const s = parts.map(String).join('');
  return s.length <= 12 ? Number(s) : null;
}

/** Writing the periods without their zeros: two million, forty thousand, six → 2406. */
function unpadded(v: number): number {
  const parts = [Math.floor(v / 1e6), Math.floor(v / 1e3) % 1000, v % 1000];
  return Number(
    parts
      .filter((x) => x > 0)
      .map(String)
      .join(''),
  );
}

/** Which zero gotcha a number exercises, judged from its digits. */
function writeAtom(v: number): string {
  const d = group(v).split(',');
  if (d.slice(1).some((p) => p === '000')) return 'empty-period';
  const s = String(v);
  if (/0[1-9]/.test(s)) return 'zero-inside';
  if (s.endsWith('0')) return 'zero-tail';
  return 'no-zeros';
}

export const pvWrite: Generator = (rng, level) => {
  const kinds =
    level === 1
      ? ['plain', 'inside', 'tail']
      : level === 2
        ? ['inside', 'tail', 'empty', 'empty']
        : ['empty', 'units', 'inside', 'empty'];
  const kind = rng.pick(kinds);
  let v: number;
  if (kind === 'plain') v = makeNum(rng, rng.int(4, 5), { distinct: true });
  else if (kind === 'inside') {
    // A zero with a non-zero digit somewhere to its right (not just a trailing zero).
    let tries = 0;
    do v = makeNum(rng, level === 1 ? rng.int(4, 5) : rng.int(6, 7), { distinct: true, zeros: 1 });
    while (!/0[1-9]/.test(String(v)) && ++tries < 30);
    if (!/0[1-9]/.test(String(v))) v = withDigit(v + (v % 10 === 0 ? 1 : 0), 1, 0);
  } else if (kind === 'tail') {
    v = makeNum(rng, level === 1 ? 5 : 6, { distinct: true });
    v = Math.floor(v / 100) * 100;
    if (rng.chance(0.5)) v = withDigit(v, 3, 0);
  } else if (kind === 'empty') {
    // A whole period (or most of it) is empty: 2,040,006 or 5,000,312.
    const m = rng.int(1, 9);
    const t = rng.pick([0, rng.int(1, 9) * 10, rng.int(1, 9)]);
    const o = rng.pick([
      rng.int(1, 9),
      rng.int(1, 9) * 10 + rng.int(1, 9),
      rng.int(1, 9) * 100 + rng.int(0, 9),
    ]);
    v = m * 1e6 + t * 1e3 + o;
  } else {
    // unit form: 3 millions, 4 ten-thousands and 6 ones
    const places = rng
      .shuffle([6, 5, 4, 3, 2, 1, 0])
      .slice(0, 3)
      .sort((a, b) => b - a);
    v = places.reduce((a, p) => a + rng.int(1, 9) * pow10(p), 0);
    const parts = places.map(
      (p) => `${digitAt(v, p)} ${digitAt(v, p) === 1 ? PLACE_ONE[p] : PLACE_NAMES[p]}`,
    );
    const gluedDigits = Number(places.map((p) => digitAt(v, p)).join(''));
    return {
      skill: 'pv-write',
      atoms: ['unit-form'],
      prompt: `Hobb's tally marks say: **${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}**. Write the number in digits.`,
      entry: { kind: 'dials', int: 7 },
      ...numeric(v, [
        [
          gluedDigits,
          `Those digits need their places! Put each one in its own column and fill the empty columns with zeros.`,
        ],
      ]),
      hint: `Set each named place on its dial. Every other dial stays at 0.`,
      explain: `${parts.join(' + ')} = **${group(v)}**. The empty places are zeros.`,
    };
  }
  const nudges: [number, string][] = [];
  const g = glued(v);
  if (g !== null)
    nudges.push([
      g,
      `You wrote each part on its own and stuck them together. The smaller part goes **inside** the bigger one: the zeros make room for it.`,
    ]);
  nudges.push([
    unpadded(v),
    `The zeros went missing! Each period after the first needs **three** digits — pad with zeros.`,
  ]);
  const dial = level >= 2 && rng.chance(0.5);
  return {
    skill: 'pv-write',
    atoms: [writeAtom(v)],
    prompt: dial
      ? `Set the ledger wheels to Wren's count: **"${words(v)}"**.`
      : `Wren's report, in words: **"${words(v)}."** Write it in digits.`,
    entry: dial ? { kind: 'dials', int: 7 } : undefined,
    ...numeric(v, nudges),
    hint: `Every comma group has exactly three digits (except the first). Fill gaps with zeros.`,
    explain: `"${words(v)}" → **${group(v)}**. ${String(v).includes('0') ? 'The zeros hold the empty places.' : ''}`,
  };
};

// ---------------------------------------------------------------------------
// pv-expanded — breakdowns

function terms(v: number): number[] {
  const out: number[] = [];
  for (let p = topPlace(v); p >= 0; p--) if (digitAt(v, p)) out.push(digitAt(v, p) * pow10(p));
  return out;
}
const sumTex = (ts: number[]) => ts.map(texg).join(' + ');

export const pvExpanded: Generator = (rng, level) => {
  const kinds =
    level === 1
      ? ['to', 'to', 'from']
      : level === 2
        ? ['to', 'missing', 'from']
        : ['to', 'missing', 'from', 'to'];
  const kind = rng.pick(kinds);
  const digits = level === 1 ? rng.int(4, 5) : level === 2 ? rng.int(5, 7) : 7;
  const zeros = level === 1 ? rng.int(0, 1) : rng.int(1, 3);
  const v = makeNum(rng, digits, { distinct: true, zeros });
  const ts = terms(v);
  if (kind === 'to') {
    const shuffled = level === 3 && rng.chance(0.6);
    const shown = shuffled ? rng.shuffle(ts) : ts;
    const gluedDigits = Number(ts.map((t) => String(t)[0]).join(''));
    const hasGap = ts.length < digits;
    return {
      skill: 'pv-expanded',
      atoms: [hasGap ? 'gaps' : 'to-standard', ...(shuffled ? ['shuffled'] : [])],
      prompt: `The quartermaster's breakdown: $${sumTex(shown)}$. What is the total?`,
      ...numeric(v, [
        [
          gluedDigits,
          `Just the digits glued together loses their places. Line them up in columns, with zeros where a place is empty.`,
        ],
      ]),
      hint: `Line the parts up in place columns and add.`,
      explain: `${sumTex(ts).replace(/{,}/g, ',')} = **${group(v)}**${hasGap ? ' — the missing places become zeros' : ''}.`,
    };
  }
  if (kind === 'missing' && ts.length >= 3) {
    const k = rng.int(1, ts.length - 1);
    const miss = ts[k];
    const shown = ts.map((t, i) => (i === k ? r`\box` : texg(t))).join(' + ');
    const d = Number(String(miss)[0]);
    const p = topPlace(miss);
    return {
      skill: 'pv-expanded',
      atoms: ['missing-term'],
      prompt: `What's missing from this breakdown?`,
      math: `${texg(v)} = ${shown}`,
      ...numeric(miss, [
        [d, `The missing part isn't just the digit ${d} — it's what the ${d} is worth.`],
        [d * pow10(p + 1), ONE_OFF],
        [d * pow10(Math.max(0, p - 1)), ONE_OFF],
      ]),
      explain: `The ${d} in ${group(v)} is in the ${PLACE_NAMES[p]} place, so the missing part is **${group(miss)}**.`,
    };
  }
  // from standard: which breakdown is right?
  const shiftUp = ts.map((t) => t * 10);
  const digitsOnly = ts.map((t) => (t >= 10 ? t / 10 : t));
  const dropLast = ts.slice(0, -1);
  return {
    skill: 'pv-expanded',
    atoms: ['from-standard'],
    prompt: `Which breakdown matches ${$(v)}?`,
    ...choice(rng, `$${sumTex(ts)}$`, [
      {
        text: `$${sumTex(shiftUp)}$`,
        nudge: `Each part there is ten times too big — check which place each digit is really in.`,
      },
      ...(dropLast.length
        ? [
            {
              text: `$${sumTex(dropLast)}$`,
              nudge: `One of the digits went missing from that breakdown.`,
            },
          ]
        : []),
      `$${sumTex(digitsOnly)}$`,
    ]),
    explain: `Each non-zero digit times its place: ${sumTex(ts).replace(/{,}/g, ',')}.`,
  };
};

// ===========================================================================
// The Ashen Road

// pv-compare — which is more?

/** Two numbers where the shorter one has the bigger leading digit. */
function lengthTrap(rng: Rng, k: number): [number, number] {
  const a = rng.int(7, 9) * pow10(k - 1) + rng.int(0, pow10(k - 1) - 1);
  const b = rng.int(1, 3) * pow10(k) + rng.int(0, pow10(k) - 1);
  return [a, b];
}

export const pvCompare: Generator = (rng, level) => {
  const kinds =
    level === 1
      ? ['length', 'first', 'symbol']
      : level === 2
        ? ['length', 'deep', 'order', 'symbol', 'nines']
        : ['deep', 'order', 'nines', 'order'];
  const kind = rng.pick(kinds);
  const k = level === 1 ? rng.int(4, 5) : rng.int(5, 6);

  if (kind === 'order') {
    const n = level === 3 ? 4 : rng.int(3, 4);
    let nums: number[] = [];
    for (let tries = 0; tries < 50; tries++) {
      nums = Array.from({ length: n }, (_, i) => makeNum(rng, k + (i % 2)));
      const lex = [...nums].sort((a, b) => (String(a) < String(b) ? -1 : 1));
      const num = [...nums].sort((a, b) => a - b);
      if (new Set(nums).size === n && lex.join() !== num.join()) break;
    }
    const sorted = [...nums].sort((a, b) => a - b);
    const lex = [...nums].sort((a, b) => (String(a) < String(b) ? -1 : 1));
    return {
      skill: 'pv-compare',
      atoms: ['order'],
      prompt:
        `Four scouting parties report enemy numbers. Put them in order so the Marshal sees the smallest threat first.`.replace(
          'Four',
          ['Two', 'Three', 'Four'][n - 2],
        ),
      answer: {
        kind: 'order',
        items: nums.map($),
        correct: sorted.map((x) => nums.indexOf(x)),
        direction: 'smallest → largest',
        traps: [
          {
            order: lex.map((x) => nums.indexOf(x)),
            text: `That's sorted by the first digit, like words in a dictionary. Numbers don't work like that: **count the digits first** — more digits, bigger number.`,
          },
        ],
      },
      explain: `Count digits first, then compare from the left: ${sorted.map(group).join(' < ')}.`,
    };
  }

  let a: number, b: number, atom: string;
  if (kind === 'length') {
    [a, b] = lengthTrap(rng, k);
    atom = 'length';
  } else if (kind === 'nines') {
    const big = pow10(k);
    a = big - rng.int(1, 9) * (rng.chance(0.5) ? 1 : 10);
    b = big + rng.int(0, 9) * (rng.chance(0.5) ? 1 : 10);
    atom = 'nines';
  } else if (kind === 'first') {
    // Same length; the first difference is near the front.
    a = makeNum(rng, k);
    b = withDigit(a, k - 2, (digitAt(a, k - 2) + rng.int(1, 8)) % 10);
    b = withDigit(b, 0, 9);
    a = withDigit(a, 0, 1);
    atom = 'first-diff';
  } else {
    // deep: same leading digits, difference in the last three places.
    a = makeNum(rng, k + 1);
    const p = rng.int(0, 2);
    b = withDigit(a, p, (digitAt(a, p) + rng.int(1, 8)) % 10);
    atom = 'deep-diff';
  }
  if (a === b) b = b + 1;
  const bigger = Math.max(a, b);
  const smaller = Math.min(a, b);
  if (kind === 'symbol') {
    const left = rng.chance(0.5) ? a : b;
    const right = left === a ? b : a;
    const sym = left > right ? '>' : '<';
    return {
      skill: 'pv-compare',
      atoms: ['symbol'],
      prompt: `Which sign goes in the box?`,
      math: r`${texg(left)} \;\box\; ${texg(right)}`,
      ...choice(rng, `$${sym}$`, [
        {
          text: `$${sym === '>' ? '<' : '>'}$`,
          nudge: `The wide, open end faces the **bigger** number.`,
        },
        { text: `$=$`, nudge: `They're not the same number — look again from the left.` },
      ]),
      explain: `${group(left)} is ${left > right ? 'bigger' : 'smaller'} than ${group(right)}, so $${texg(left)} ${sym} ${texg(right)}$.`,
    };
  }
  const lenNote =
    String(bigger).length !== String(smaller).length
      ? `${group(bigger)} has ${String(bigger).length} digits and ${group(smaller)} only ${String(smaller).length}. More digits wins, whatever the first digit is.`
      : `Same number of digits, so compare from the left: the first place that differs decides.`;
  const first = rng.chance(0.5);
  return {
    skill: 'pv-compare',
    atoms: [atom],
    prompt: `Wren counts ${$(first ? a : b)} hollow soldiers at the ford. Corvin counts ${$(first ? b : a)} at the bridge. Where is the bigger host?`,
    ...choice(rng, `The one with ${group(bigger)}`, [
      {
        text: `The one with ${group(smaller)}`,
        nudge:
          kind === 'length' || kind === 'nines'
            ? `Don't judge by the first digit or by how many 9s there are — **count the digits** first.`
            : `Compare from the left: find the first place where they differ.`,
      },
      `They are the same size`,
    ]),
    explain: lenNote,
  };
};

// ---------------------------------------------------------------------------
// pv-times-ten — each place is worth ten times the one to its right

export const pvTimesTen: Generator = (rng, level) => {
  const kinds =
    level === 1
      ? ['x10', 'div10', 'relation']
      : level === 2
        ? ['x10', 'x100', 'div10', 'div100', 'relation']
        : ['x100', 'x1000', 'div100', 'div1000', 'relation'];
  const kind = rng.pick(kinds);
  if (kind === 'relation') {
    const d = rng.int(2, 9);
    const gap = level === 1 ? 1 : level === 2 ? rng.int(1, 2) : rng.int(2, 4);
    const p2 = rng.int(0, 3);
    const p1 = p2 + gap;
    const A = d * pow10(p1);
    const B = d * pow10(p2);
    const ratio = pow10(gap);
    return {
      skill: 'pv-times-ten',
      atoms: ['relation'],
      prompt: `The forger slid a ${d} from the ${PLACE_NAMES[p2]} place to the ${PLACE_NAMES[p1]} place: ${$(B)} became ${$(A)}. How many times bigger is the forged number?`,
      ...numeric(ratio, [
        [
          gap,
          `It moved ${gap} place${gap > 1 ? 's' : ''} — but every place is worth **ten times** the one to its right.`,
        ],
        [10 * gap, `Each place multiplies by 10 again: ${Array(gap).fill('×10').join(' ')}.`],
        [A - B, `That's how much **more**. We want how many **times** as big.`],
      ]),
      explain: `${gap} place${gap > 1 ? 's' : ''} left = ${Array(gap).fill('×10').join(' ')} = **×${group(ratio)}**.`,
    };
  }
  const isMul = kind.startsWith('x');
  const k = kind.endsWith('1000') ? 3 : kind.endsWith('100') ? 2 : 1;
  const f = pow10(k);
  let v: number;
  if (isMul)
    v = makeNum(rng, level === 1 ? rng.int(2, 3) : rng.int(3, 4), { zeros: level >= 2 ? 1 : 0 });
  else v = makeNum(rng, rng.int(2, 3)) * pow10(k + rng.int(0, 1));
  const ans = isMul ? v * f : clean(v / f);
  const thing = rng.pick(['arrows', 'spears', 'sacks of grain', 'horseshoes']);
  const prompt = isMul
    ? rng.pick([
        `One cart carries ${$(v)} ${thing}. How many do ${group(f)} carts carry?`,
        `What is $${texg(v)} \\times ${texg(f)}$?`,
        `The forger slid every digit of ${$(v)} ${['one', 'two', 'three'][k - 1]} place${k > 1 ? 's' : ''} to the left. What does the ledger say now?`,
      ])
    : rng.pick([
        `${$(v)} ${thing} are shared equally between ${group(f)} companies. How many does each company get?`,
        `What is $${texg(v)} \\div ${texg(f)}$?`,
      ]);
  return {
    skill: 'pv-times-ten',
    atoms: [kind],
    prompt,
    ...numeric(ans, [
      [
        isMul ? clean(v / f) : v * f,
        isMul
          ? `That's dividing! Multiplying by ${group(f)} makes it bigger.`
          : `That's multiplying! Sharing out makes each share smaller.`,
      ],
      [
        isMul ? v * f * 10 : clean(v / f / 10),
        `One place too far: ×${group(f)} moves every digit exactly ${k} place${k > 1 ? 's' : ''}.`,
      ],
      ...(k > 1
        ? [
            [
              isMul ? (v * f) / 10 : clean((v / f) * 10),
              `One place short: ${group(f)} has ${k} zeros, so the digits move ${k} places.`,
            ] as [number, string],
          ]
        : []),
    ]),
    hint: `${isMul ? '×' : '÷'}${group(f)} slides every digit ${k} place${k > 1 ? 's' : ''} to the ${isMul ? 'left' : 'right'}.`,
    explain: `Every digit slides ${k} place${k > 1 ? 's' : ''} ${isMul ? 'left' : 'right'}: $${texg(v)} ${isMul ? r`\times` : r`\div`} ${texg(f)} = ${texg(ans)}$.`,
  };
};

// ---------------------------------------------------------------------------
// pv-regroup — the same amount in different units

export const pvRegroup: Generator = (rng, level) => {
  const kinds =
    level === 1
      ? ['units', 'count', 'million']
      : level === 2
        ? ['units', 'count', 'leftover', 'trade']
        : ['count', 'trade', 'million', 'leftover'];
  const kind = rng.pick(kinds);
  if (kind === 'million') {
    const unit = rng.pick([3, 4, 5]);
    const ans = pow10(6 - unit);
    return {
      skill: 'pv-regroup',
      atoms: ['million'],
      prompt: `How many **${PLACE_NAMES[unit]}** make one million?`,
      ...numeric(ans, [
        [
          ans / 10,
          `${group(ans / 10)} ${PLACE_NAMES[unit]} only make ${group((ans / 10) * pow10(unit))}. Count the zeros: a million has 6, a ${PLACE_ONE[unit]} has ${unit}.`,
        ],
        [ans * 10, `${group(ans * 10)} ${PLACE_NAMES[unit]} would be ten million!`],
      ]),
      hint: `$1{,}000{,}000 \\div ${texg(pow10(unit))}$: take away ${unit} zeros.`,
      explain: `$1{,}000{,}000 \\div ${texg(pow10(unit))} = ${texg(ans)}$ — a million is ${group(ans)} ${PLACE_NAMES[unit]}.`,
    };
  }
  if (kind === 'units') {
    const unit = level === 1 ? rng.pick([2, 3]) : rng.pick([2, 3, 4]);
    const k = rng.int(11, level === 1 ? 99 : 999);
    const v = k * pow10(unit);
    return {
      skill: 'pv-regroup',
      atoms: ['units-to-number'],
      prompt: `Hobb's note says: **${k} ${PLACE_NAMES[unit]}** of arrows. How many arrows is that?`,
      ...numeric(v, [
        [k * pow10(unit - 1), `One zero short: a ${PLACE_ONE[unit]} has ${unit} zeros.`],
        [k * pow10(unit + 1), `One zero too many: a ${PLACE_ONE[unit]} has ${unit} zeros.`],
        [
          k + pow10(unit),
          `"${k} ${PLACE_NAMES[unit]}" means ${k} **lots of** ${group(pow10(unit))} — multiply.`,
        ],
      ]),
      explain: `$${k} \\times ${texg(pow10(unit))} = ${texg(v)}$.`,
    };
  }
  if (kind === 'count' || kind === 'leftover') {
    const unit = level === 1 ? rng.pick([2, 3]) : rng.pick([2, 3, 4]);
    const digits = unit + rng.int(2, 3);
    let v = makeNum(rng, digits);
    if (v % pow10(unit) === 0) v += rng.int(1, 9) * pow10(unit - 1);
    const full = Math.floor(v / pow10(unit));
    const left = v - full * pow10(unit);
    const crate = pow10(unit);
    if (kind === 'leftover') {
      return {
        skill: 'pv-regroup',
        atoms: ['leftover'],
        prompt: `${$(v)} arrows are packed into crates of ${$(crate)}. How many arrows are left over, not filling a crate?`,
        ...numeric(left, [
          [full, `That's how many full crates. The question is how many arrows are left loose.`],
          [crate - left, `That's how many more you'd need to fill another crate.`],
        ]),
        explain: `${group(full)} full crates use ${group(full * crate)} arrows; ${group(v)} − ${group(full * crate)} = **${group(left)}** left over.`,
      };
    }
    return {
      skill: 'pv-regroup',
      atoms: ['count-units'],
      prompt: rng.pick([
        `${$(v)} arrows are packed into crates of ${$(crate)}. How many crates can be **filled**?`,
        `How many full **${PLACE_NAMES[unit]}** are there in ${$(v)}?`,
      ]),
      ...numeric(full, [
        [
          digitAt(v, unit),
          `That's just the ${PLACE_NAMES[unit]} **digit**. The digits further left are ${PLACE_NAMES[unit]} too — ${group(full)} of them in all.`,
        ],
        [
          full + 1,
          `Only **full** ones count — the ${group(left)} left over isn't enough for another.`,
        ],
        [
          Math.floor(v / pow10(unit - 1)),
          `Those are ${PLACE_NAMES[unit - 1]}, not ${PLACE_NAMES[unit]}.`,
        ],
      ]),
      hint: `Cover up the last ${unit} digits. What's left?`,
      explain: `Cover the last ${unit} digits of ${group(v)}: **${group(full)}** full ${PLACE_NAMES[unit]} (and ${group(left)} left over).`,
    };
  }
  // trade: 3 thousands + 14 hundreds
  const big = level === 2 ? 3 : rng.pick([3, 4]);
  const a = rng.int(1, 9);
  const b = rng.int(11, 29);
  const v = a * pow10(big) + b * pow10(big - 1);
  const gluedV = Number(`${a}${b}`) * pow10(big - 1);
  return {
    skill: 'pv-regroup',
    atoms: ['trade'],
    prompt: `A wagon brings **${a} ${PLACE_NAMES[big]}** and **${b} ${PLACE_NAMES[big - 1]}** horseshoes. How many horseshoes is that?`,
    ...numeric(v, [
      [
        gluedV,
        `${b} ${PLACE_NAMES[big - 1]} is more than ten of them: it's ${group(b * pow10(big - 1))}, so it spills into the ${PLACE_NAMES[big]}. Trade ten ${PLACE_NAMES[big - 1]} for one ${PLACE_ONE[big]}.`,
      ],
      [a * pow10(big) + b, `The ${b} is ${b} **${PLACE_NAMES[big - 1]}**, not ${b} ones.`],
    ]),
    hint: `${b} ${PLACE_NAMES[big - 1]} = ${group(b * pow10(big - 1))}.`,
    explain: `${group(a * pow10(big))} + ${group(b * pow10(big - 1))} = **${group(v)}**. (Ten ${PLACE_NAMES[big - 1]} make one ${PLACE_ONE[big]}.)`,
  };
};

// ---------------------------------------------------------------------------
// pv-shift — 10,000 more, 1,000 less (and the ripple through the nines)

export const pvShift: Generator = (rng, level) => {
  const kinds =
    level === 1
      ? ['plain', 'plain', 'carry']
      : level === 2
        ? ['plain', 'carry', 'borrow', 'which']
        : ['carry', 'cascade', 'borrow', 'which'];
  const kind = rng.pick(kinds);
  const digits = level === 1 ? rng.int(5, 6) : 7;
  let p = level === 1 ? rng.int(2, 3) : rng.int(3, Math.min(5, digits - 2));
  let v = makeNum(rng, digits);
  if (kind === 'which') {
    const step = pow10(p);
    if (digitAt(v, p) === 9) v = withDigit(v, p, 4);
    const after = v + step;
    return {
      skill: 'pv-shift',
      atoms: ['which-place'],
      prompt: `The stores ledger went from ${$(v)} to ${$(after)} after one wagon arrived. How many sacks did the wagon bring?`,
      ...numeric(step, [
        [
          1,
          `Only one digit went up by one — but it's in the ${PLACE_NAMES[p]} place, so it's worth ${group(step)}.`,
        ],
        [p, `Not the number of the place — what one of that place is worth.`],
      ]),
      explain: `Only the ${PLACE_NAMES[p]} digit changed, by 1: the wagon brought **${group(step)}**.`,
    };
  }
  let more = true;
  if (kind === 'plain') {
    more = rng.chance(0.5);
    v = withDigit(v, p, more ? rng.int(0, 8) : rng.int(1, 9));
  } else if (kind === 'carry') {
    v = withDigit(withDigit(v, p, 9), p + 1, rng.int(p + 1 === digits - 1 ? 1 : 0, 8));
  } else if (kind === 'cascade') {
    p = Math.min(p, digits - 3);
    v = withDigit(
      withDigit(withDigit(v, p, 9), p + 1, 9),
      p + 2,
      rng.int(p + 2 === digits - 1 ? 1 : 0, 8),
    );
  } else {
    more = false;
    v = withDigit(withDigit(v, p, 0), p + 1, rng.chance(0.5) ? 0 : rng.int(1, 9));
    if (digitAt(v, digits - 1) === 0) v = withDigit(v, digits - 1, 1);
  }
  const step = pow10(p);
  const ans = more ? v + step : v - step;
  // The classic slip: change only that one digit (9 → 0 with no carry, 0 → 9 with no borrow).
  const slip = withDigit(v, p, (digitAt(v, p) + (more ? 1 : 9)) % 10);
  const story = more
    ? rng.pick([
        `A supply wagon brings ${$(step)} more arrows. The tally was ${$(v)}. What is it now?`,
        `What is ${$(step)} more than ${$(v)}?`,
      ])
    : rng.pick([
        `The Hollow Host burns ${$(step)} sacks of grain. The store held ${$(v)}. How many are left?`,
        `What is ${$(step)} less than ${$(v)}?`,
      ]);
  return {
    skill: 'pv-shift',
    atoms: [kind === 'plain' ? (more ? 'plain' : 'less') : kind],
    prompt: story,
    ...numeric(ans, [
      [
        slip,
        more
          ? `The ${PLACE_NAMES[p]} digit was a 9: 9 + 1 makes ten ${PLACE_NAMES[p]}, which is one ${PLACE_ONE[p + 1]} — carry it into the next place.`
          : `The ${PLACE_NAMES[p]} digit was a 0: you have to borrow one from the next place left first.`,
      ],
      [more ? v + step * 10 : v - step * 10, ONE_OFF],
      [more ? v + step / 10 : v - step / 10, ONE_OFF],
      [more ? v - step : v + step, more ? `More means add!` : `Less means take away!`],
    ]),
    hint: `Find the ${PLACE_NAMES[p]} digit. Change it by one${kind !== 'plain' ? ' — and watch for a carry or a borrow' : ''}.`,
    explain: `Add or take away one in the ${PLACE_NAMES[p]} place: ${group(v)} ${more ? '+' : '−'} ${group(step)} = **${group(ans)}**.${kind === 'carry' || kind === 'cascade' ? ' The 9 rolls over to 0 and carries one to the left.' : kind === 'borrow' ? ' The 0 has to borrow from the left.' : ''}`,
  };
};

// ---------------------------------------------------------------------------
// pv-numberline — reading and placing big numbers on a line

export const pvNumberline: Generator = (rng, level) => {
  const kinds =
    level === 1
      ? ['tick', 'tick', 'place', 'mark']
      : level === 2
        ? ['tick', 'half', 'place', 'mark']
        : ['half', 'offset', 'place', 'minor'];
  const kind = rng.pick(kinds);
  const k = level === 1 ? rng.int(3, 4) : rng.int(4, 6);
  const max = pow10(k + 1);
  const step = pow10(k);
  if (kind === 'place') {
    const fine = level >= 2;
    const snap = fine ? step / 10 : step / 2;
    const target = rng.int(1, fine ? 98 : 18) * snap;
    const t = target % step === 0 ? target + snap : target;
    return {
      skill: 'pv-numberline',
      atoms: ['place'],
      prompt: `Mark the road: plant the banner at ${$(t)}.`,
      answer: {
        kind: 'line',
        min: 0,
        max,
        step,
        minor: fine ? step / 10 : step / 2,
        snap,
        value: t,
        tolerance: fine ? snap : 0,
        labels: 'all',
      },
      nudges: [
        ...(Math.abs(t / 10 - t) > snap * 1.5
          ? [
              {
                match: clean(Math.round(t / 10 / snap) * snap),
                text: `That spot is ${group(Math.round(t / 10 / snap) * snap)} — ten times too small. Check what one big jump is worth.`,
              },
            ]
          : []),
      ],
      hint: `Each labelled jump is ${group(step)}. How many jumps to ${group(t)}?`,
      explain: `${group(t)} is ${group(t / step)} jumps of ${group(step)} along the line.`,
    };
  }
  if (kind === 'mark') {
    const ms = rng.shuffle(Array.from({ length: 9 }, (_, i) => (i + 1) * step)).slice(0, 4);
    const target = ms[0];
    const letters = ['A', 'B', 'C', 'D'];
    const marks = rng.shuffle(ms).map((at, i) => ({ at, label: letters[i] }));
    const right = marks.find((m) => m.at === target)!.label;
    const mirror = marks.find((m) => m.at === max - target);
    return {
      skill: 'pv-numberline',
      atoms: ['which-mark'],
      prompt: `Which flag marks ${$(target)}?`,
      visual: { kind: 'numberline', min: 0, max, step, labels: 'ends', marks },
      ...choice(
        rng,
        `Flag ${right}`,
        marks
          .filter((m) => m.label !== right)
          .map((m) =>
            m === mirror
              ? {
                  text: `Flag ${m.label}`,
                  nudge: `That's ${group(m.at)} — you counted from the wrong end.`,
                }
              : `Flag ${m.label}`,
          ),
      ),
      hint: `The line goes from 0 to ${group(max)} in ten jumps. What is one jump worth?`,
      explain: `Ten jumps make ${group(max)}, so one jump is ${group(step)}. ${group(target)} is ${target / step} jumps along: flag ${right}.`,
    };
  }
  let min = 0;
  let mx = max;
  let st = step;
  let minor: number | undefined;
  let at: number;
  let atom: string;
  if (kind === 'tick') {
    at = rng.int(1, 9) * step;
    atom = 'read-tick';
  } else if (kind === 'half') {
    at = rng.int(0, 9) * step + step / 2;
    atom = 'between';
  } else if (kind === 'minor') {
    minor = step / 10;
    at = rng.int(0, 9) * step + rng.int(1, 9) * minor;
    atom = 'between';
  } else {
    // offset: a stretch of road far from zero
    min = makeNum(rng, 2) * pow10(k + 1);
    mx = min + max;
    at = min + rng.int(1, 9) * step;
    st = step;
    atom = 'offset';
  }
  const jumps = (at - min) / st;
  return {
    skill: 'pv-numberline',
    atoms: [atom],
    prompt: `What number is the arrow pointing to?`,
    visual: {
      kind: 'numberline',
      min,
      max: mx,
      step: st,
      minor,
      labels: kind === 'offset' ? 'all' : 'ends',
      arrow: at,
    },
    ...numeric(at, [
      [clean(jumps), `That's how many jumps. What is each jump worth?`],
      [
        clean(at - min),
        kind === 'offset'
          ? `The line doesn't start at 0 — it starts at ${group(min)}.`
          : `Check the jump size.`,
      ],
      [
        clean(min + jumps * st * 10),
        `Check what one jump is worth: the line has ten jumps from ${group(min)} to ${group(mx)}.`,
      ],
      [
        clean(min + (jumps * st) / 10),
        `Check what one jump is worth: the line has ten jumps from ${group(min)} to ${group(mx)}.`,
      ],
    ]),
    hint: `From ${group(min)} to ${group(mx)} in ten big jumps: each is ${group(st)}.`,
    explain: `Each big jump is ${group(st)}${minor ? ` and each small one ${group(minor)}` : ''}. The arrow is at **${group(at)}**.`,
  };
};
