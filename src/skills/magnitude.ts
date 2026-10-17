/**
 * The Order of Magnitude — a feel for how big things are, and estimating fast:
 *   sizes on a powers-of-ten ladder → zoom levels (orders of magnitude) → units (mm … km),
 *   rounding before calculating → counting a crowd by sampling → Fermi chains,
 *   multiplying powers of ten → estimating in scientific notation → how many fit.
 *
 * Problems about real things use content/sizes.yaml and collect their cards for the
 * Scale Museum (`cards`).
 */
import type { ChainStep, GameSpec, Generator } from './types';
import type { Rng } from '../engine/rng';
import type { SizeCard } from '../content/schema';
import { sizes, sizeById } from '../content';
import { sizeExp, sizeText } from '../games';
import { choice, numeric, tex } from './util';

const game = (g: GameSpec) => ({ answer: { kind: 'game' as const, game: g } });
const chain = (steps: ChainStep[]) =>
  game({
    kind: 'chain',
    steps: steps.map((st) => ({ ...st, nudges: st.nudges?.filter((n) => n.value !== st.answer) })),
  });
const pow = (n: number) => `10^{${n}}`;
const log = (m: number) => Math.log10(m);

type Band = 'tiny' | 'human' | 'huge' | 'cosmic';
export function band(m: number): Band {
  return m < 1e-2 ? 'tiny' : m < 1e2 ? 'human' : m < 1e6 ? 'huge' : 'cosmic';
}

function pickSizes(rng: Rng, bands: Band[], n: number): SizeCard[] {
  const pool = sizes.filter((c) => bands.includes(band(c.m)));
  const out: SizeCard[] = [];
  for (const c of rng.shuffle(pool)) {
    // Keep them on different rungs, so each has its own place.
    if (out.some((o) => sizeExp(o.m) === sizeExp(c.m))) continue;
    out.push(c);
    if (out.length === n) break;
  }
  return out;
}

const lower = (c: SizeCard) => c.name.charAt(0).toLowerCase() + c.name.slice(1);
/** A number for plain text (outside maths): 24,000. */
const fmtN = (n: number) => n.toLocaleString('en-US');

/** "About how tall is a giraffe?", "About how far is it to the Moon?" */
function howBig(c: SizeCard): string {
  const w = c.what.split(' ')[0];
  if (w === 'away') return `About how far is it ${lower(c)}?`;
  return `About how ${w === 'across' ? 'wide' : w} is ${lower(c)}?`;
}

// ---------------------------------------------------------------------------

export const sizeSense: Generator = (rng, level) => {
  const bands: Band[] = level === 1 ? ['human'] : level === 2 ? ['tiny', 'human', 'huge'] : ['tiny', 'huge', 'cosmic'];
  const kind = rng.pick(level === 1 ? ['benchmark', 'ladder'] : level === 2 ? ['ladder', 'compare', 'benchmark'] : ['ladder', 'compare']);
  if (kind === 'ladder') {
    const items = pickSizes(rng, bands, level === 1 ? 2 : 3);
    return {
      skill: 'size-sense',
      atoms: ['ladder', ...new Set(items.map((c) => band(c.m)))],
      cards: items.map((c) => c.id),
      prompt: `Captain Tenfold is building a **Scale Ladder**: every rung is ten times the one below. Put each thing on its rung.`,
      ...game({ kind: 'sizeline', items: items.map((c) => c.id) }),
      explain: items.map((c) => `${c.icon} ${c.name}: about ${sizeText(c.m)}.`).join(' '),
    };
  }
  if (kind === 'compare') {
    // Two things whose sizes are a clear power of ten apart.
    for (let tries = 0; tries < 50; tries++) {
      const [a, b] = pickSizes(rng, bands, 2).sort((x, y) => y.m - x.m);
      if (!a || !b) break;
      const r = log(a.m / b.m);
      const k = Math.round(r);
      if (k < 1 || k > 6 || Math.abs(r - k) > 0.3) continue;
      const opts = [1, 2, 3, 4, 5, 6].filter((x) => x !== k && Math.abs(x - k) <= 2);
      return {
        skill: 'size-sense',
        atoms: ['compare', band(a.m)],
        cards: [a.id, b.id],
        prompt: `${a.icon} ${a.name} (${sizeText(a.m)}) and ${b.icon} ${lower(b)} (${sizeText(b.m)}). About **how many times bigger** is the first?`,
        ...choice(
          rng,
          `About $${tex(10 ** k)}$ times`,
          opts.map((x) => ({
            text: `About $${tex(10 ** x)}$ times`,
            nudge: x < k ? `Too few! Put them in the same unit first, then compare.` : `Too many — check the units again.`,
          })),
        ),
        explain: `${sizeText(a.m)} ÷ ${sizeText(b.m)} is about ${fmtN(10 ** k)}: ${k} rung${k > 1 ? 's' : ''} up the ladder.`,
      };
    }
  }
  // benchmark: a sensible size, not one off by a thousand
  const [c] = pickSizes(rng, level === 1 ? ['human'] : bands, 1);
  const right = sizeText(c.m);
  return {
    skill: 'size-sense',
    atoms: ['benchmark', band(c.m)],
    cards: [c.id],
    prompt: `${c.icon} ${howBig(c)}`,
    ...choice(rng, right, [
      { text: sizeText(c.m / 1000), nudge: `Far too small — a thousand times too small! Picture it next to you.` },
      { text: sizeText(c.m * 1000), nudge: `Way too big — a thousand times too big! Picture it next to something you know.` },
      { text: sizeText(c.m * 100), nudge: `Too big by a hundred times. Compare it with your own height (about 1.4 m).` },
      { text: sizeText(c.m / 100), nudge: `A hundred times too small. Think of something the same size that you know.` },
    ]),
    explain: `${c.name}: about ${right}. ${c.fact}`,
  };
};

export const zoomLevels: Generator = (rng, level) => {
  const kind = rng.pick(level === 1 ? ['write', 'zeros', 'band'] : level === 2 ? ['band', 'steps', 'write'] : ['times', 'compare', 'steps']);
  if (kind === 'write' || kind === 'zeros') {
    const n = rng.int(2, level === 1 ? 5 : 7);
    if (kind === 'zeros')
      return {
        skill: 'zoom-levels',
        atoms: ['power'],
        prompt: `Captain Tenfold's zoom dial says $${pow(n)}$. That's a 1 followed by how many zeros?`,
        ...numeric(n, [
          [10 * n, `That's $10 \\times ${n}$. The little ${n} counts the tens multiplied together — one zero each.`],
          [n + 1, `Count again: $${pow(n)}$ = ${n} tens multiplied = ${n} zeros.`],
        ]),
        explain: `$${pow(n)} = ${tex(10 ** n)}$: ${n} zeros.`,
      };
    return {
      skill: 'zoom-levels',
      atoms: ['power'],
      prompt: `Write $${pow(n)}$ as an ordinary number.`,
      ...numeric(10 ** n, [
        [10 * n, `That's $10 \\times ${n}$. $${pow(n)}$ means ${n} tens multiplied together.`],
        [10 ** (n + 1), `One zero too many. ${n} tens multiplied: ${n} zeros.`],
        [10 ** (n - 1), `One zero short.`],
        [Number(`10${n}`), `That's 10 and ${n} glued. The little ${n} says how many tens to multiply.`],
      ]),
      explain: `$${pow(n)} = ${tex(10 ** n)}$.`,
    };
  }
  if (kind === 'band') {
    const d = rng.int(3, level === 1 ? 5 : 8);
    const v = rng.int(1, 9) * 10 ** (d - 1) + rng.int(0, 9) * 10 ** (d - 2);
    return {
      skill: 'zoom-levels',
      atoms: ['band'],
      prompt: `Ms Ballpark spots a crowd of **${fmtN(v)}** zombies. Between which two zoom levels is that?`,
      ...choice(rng, `$${pow(d - 1)}$ and $${pow(d)}$`, [
        { text: `$${pow(d)}$ and $${pow(d + 1)}$`, nudge: `Count its digits: ${d}. A ${d}-digit number is at least $${pow(d - 1)}$ but less than $${pow(d)}$.` },
        { text: `$${pow(d - 2)}$ and $${pow(d - 1)}$`, nudge: `Too low. ${fmtN(v)} is bigger than $${pow(d - 1)} = ${tex(10 ** (d - 1))}$.` },
      ]),
      explain: `$${pow(d - 1)} = ${tex(10 ** (d - 1))} \\le ${tex(v)} < ${tex(10 ** d)} = ${pow(d)}$.`,
    };
  }
  if (kind === 'steps') {
    const units: [string, number][] = [
      ['1 mm', -3],
      ['1 cm', -2],
      ['1 m', 0],
      ['1 km', 3],
      ['1,000 km', 6],
    ];
    const i = rng.int(0, units.length - 2);
    const j = rng.int(i + 1, units.length - 1);
    const k = units[j][1] - units[i][1];
    return {
      skill: 'zoom-levels',
      atoms: ['steps'],
      prompt: `Shrinking Kevin is ${units[i][0]} tall. Captain Tenfold makes him ten times bigger, again and again, until he's **${units[j][0]}**. How many times did he zoom?`,
      ...numeric(k, [
        [10 ** k, `That's how many times bigger he got. Each zoom is only ×10 — count the zooms.`],
        [k + 1, `Count the steps between: from $${pow(units[i][1])}$ to $${pow(units[j][1])}$.`],
      ]),
      hint: `Write both as powers of ten: $${pow(units[i][1])}$ m and $${pow(units[j][1])}$ m.`,
      explain: `$${pow(units[i][1])}$ m to $${pow(units[j][1])}$ m is ${k} zooms of ×10.`,
    };
  }
  if (kind === 'times') {
    const a = rng.int(5, 12);
    const b = rng.int(1, a - 2);
    return {
      skill: 'zoom-levels',
      atoms: ['times-bigger'],
      prompt: `How many times bigger is $${pow(a)}$ than $${pow(b)}$?`,
      ...choice(rng, `$${pow(a - b)}$`, [
        { text: `$${a - b}$`, nudge: `${a - b} zooms — but each zoom is ×10. That's ${a - b} tens multiplied.` },
        { text: `$${pow(a + b)}$`, nudge: `That's adding the powers. Bigger by how much? Count the steps from ${b} up to ${a}.` },
        { text: `$${pow(a * b)}$`, nudge: `Multiplying the little numbers doesn't do it. Count the zooms between them.` },
      ]),
      explain: `From $${pow(b)}$ to $${pow(a)}$ is ${a - b} steps of ×10: $${pow(a - b)}$ times bigger.`,
    };
  }
  // compare numbers in scientific form
  const e = rng.int(3, 8);
  const big = rng.int(1, 4);
  const small = rng.int(6, 9);
  return {
    skill: 'zoom-levels',
    atoms: ['compare'],
    prompt: `Which is bigger?`,
    ...choice(rng, `$${big} \\times ${pow(e)}$`, [
      { text: `$${small} \\times ${pow(e - 1)}$`, nudge: `${small} is a bigger front number, but check the zoom level first: $${pow(e)}$ beats $${pow(e - 1)}$.` },
      { text: `They're the same`, nudge: `Write them out: $${tex(big * 10 ** e)}$ and $${tex(small * 10 ** (e - 1))}$.` },
    ], 3),
    explain: `$${big} \\times ${pow(e)} = ${tex(big * 10 ** e)}$, but $${small} \\times ${pow(e - 1)} = ${tex(small * 10 ** (e - 1))}$. Compare the powers first.`,
  };
};

export const unitHop: Generator = (rng, level) => {
  const kind = rng.pick(level === 1 ? ['cm-mm', 'm-cm'] : level === 2 ? ['km-m', 'which', 'm-cm'] : ['mixed', 'g-kg', 'blunder', 'which']);
  if (kind === 'cm-mm') {
    const n = rng.int(2, 30);
    return {
      skill: 'unit-hop',
      atoms: ['cm-mm'],
      prompt: `A beetle is **${n} cm** long. How many millimetres is that?`,
      ...numeric(10 * n, [
        [100 * n, `There are 10 mm in a centimetre, not 100.`],
        [n / 10, `Millimetres are smaller, so you need MORE of them.`],
      ]),
      hint: `Look at a ruler: every centimetre has 10 little millimetres.`,
      explain: `1 cm = 10 mm, so ${n} cm = ${10 * n} mm.`,
    };
  }
  if (kind === 'm-cm') {
    const n = rng.int(2, 9);
    return {
      skill: 'unit-hop',
      atoms: ['m-cm'],
      prompt: `Captain Tenfold's cape is **${n} m** long. How many centimetres?`,
      ...numeric(100 * n, [
        [10 * n, `There are 100 cm in a metre ("centi" means hundredth).`],
        [1000 * n, `That's millimetres! 100 cm in a metre.`],
      ]),
      explain: `1 m = 100 cm, so ${n} m = ${100 * n} cm.`,
    };
  }
  if (kind === 'km-m') {
    const n = rng.int(2, 15);
    return {
      skill: 'unit-hop',
      atoms: ['km-m'],
      prompt: `Ms Ballpark runs **${n} km** before breakfast. How many metres?`,
      ...numeric(1000 * n, [
        [100 * n, `"Kilo" means a thousand: 1 km = 1,000 m.`],
        [10 * n, `"Kilo" means a thousand: 1 km = 1,000 m.`],
      ]),
      explain: `1 km = 1,000 m, so ${n} km = ${fmtN(1000 * n)} m.`,
    };
  }
  if (kind === 'g-kg') {
    const kg = rng.pick([1.5, 2.5, 0.5, 3, 1.2, 4]);
    return {
      skill: 'unit-hop',
      atoms: ['g-kg'],
      prompt: `Doctor Exactly's lab cat weighs **${kg} kg**. How many grams?`,
      ...numeric(kg * 1000, [
        [kg * 100, `"Kilo" means a thousand: 1 kg = 1,000 g.`],
        [kg * 10, `1 kg = 1,000 g — three places, not one.`],
      ]),
      explain: `1 kg = 1,000 g, so ${kg} kg = ${fmtN(kg * 1000)} g.`,
    };
  }
  if (kind === 'mixed') {
    const cm = rng.pick([150, 250, 340, 75, 1200]);
    return {
      skill: 'unit-hop',
      atoms: ['m-cm'],
      prompt: `Shrinking Kevin's lab bench is **${cm} cm** long. How many metres?`,
      ...numeric(cm / 100, [
        [cm / 10, `100 cm make a metre, not 10.`],
        [cm * 100, `Metres are bigger, so you need FEWER of them.`],
      ]),
      explain: `${cm} cm ÷ 100 = ${cm / 100} m.`,
    };
  }
  if (kind === 'blunder') {
    const c = rng.pick(sizes.filter((x) => x.m >= 0.02 && x.m < 30));
    const v = c.m >= 1 ? Math.round(c.m * 10) / 10 : Math.round(c.m * 100);
    const unitRight = c.m >= 1 ? 'm' : 'cm';
    const unitWrong = c.m >= 1 ? 'km' : 'm';
    return {
      skill: 'unit-hop',
      atoms: ['which-unit'],
      cards: [c.id],
      prompt: `The Unit Confuser says ${lower(c)} is **${v} ${unitWrong}** long. What did he mean?`,
      ...choice(rng, `${v} ${unitRight}`, [
        { text: `${v} ${unitWrong} — he's right`, nudge: `${v} ${unitWrong}? Picture it! That's far too big.` },
        { text: `${v} mm`, nudge: `That's tiny! Smaller than a grain of rice for most of these.` },
      ]),
      explain: `${c.name} is about ${sizeText(c.m)}. ${c.fact}`,
    };
  }
  // which unit
  const items: [string, string, string[]][] = [
    ['the length of a ladybird', 'mm', ['km', 'm']],
    ['the height of a door', 'm', ['mm', 'km']],
    ['the distance to the next town', 'km', ['cm', 'mm']],
    ['the width of your thumb', 'cm', ['km', 'm']],
    ['the length of a swimming pool', 'm', ['mm', 'km']],
    ['how long a marathon is', 'km', ['cm', 'mm']],
  ];
  const [what, unit, wrong] = rng.pick(items);
  const NAME: Record<string, string> = { mm: 'millimetres', cm: 'centimetres', m: 'metres', km: 'kilometres' };
  return {
    skill: 'unit-hop',
    atoms: ['which-unit'],
    prompt: `Which unit would a sensible hero use for ${what}?`,
    ...choice(rng, NAME[unit], wrong.map((u) => ({ text: NAME[u], nudge: `You could, but the number would be silly — tiny or gigantic. Pick a unit that gives a handy number.` }))),
    explain: `${what.charAt(0).toUpperCase() + what.slice(1)}: ${NAME[unit]} give a handy-sized number.`,
  };
};

// ---------------------------------------------------------------------------

/** Rounds to one significant figure: 389 → 400, 21 → 20. */
export function sig1(n: number): number {
  const p = 10 ** Math.floor(Math.log10(n));
  return Math.round(n / p) * p;
}

/** The rounding the other way (38 → 30 rather than 40), for the nudge. */
function other(n: number): number {
  const p = 10 ** Math.floor(Math.log10(n));
  const s = sig1(n);
  return s > n ? s - p : s + p;
}

export const roundEstimate: Generator = (rng, level) => {
  const kind = rng.pick(level === 1 ? ['mul'] : level === 2 ? ['mul', 'div'] : ['sanity', 'mul', 'div']);
  const pickNum = (lo: number, hi: number) => {
    for (;;) {
      const n = rng.int(lo, hi);
      const s = sig1(n);
      if (n !== s && Math.abs(n - s) / s < 0.2 && String(s)[0] !== '1') return n;
    }
  };
  if (kind === 'mul') {
    const a = pickNum(level === 1 ? 11 : 110, level === 1 ? 99 : 990);
    const b = pickNum(11, 99);
    const ra = sig1(a);
    const rb = sig1(b);
    return {
      skill: 'round-estimate',
      atoms: ['round-first', 'mul-est'],
      prompt: `Doctor Exactly is still working out $${a} \\times ${b}$ exactly. Ms Ballpark has an answer already. Round, then multiply!`,
      ...chain([
        { tex: `${a} \\approx \\box`, answer: ra, say: `Round ${a} to its first digit.`, nudges: [{ value: other(a), text: `Which is ${a} nearer to: ${fmtN(Math.min(ra, other(a)))} or ${fmtN(Math.max(ra, other(a)))}?` }] },
        { tex: `${b} \\approx \\box`, answer: rb },
        {
          tex: `${ra} \\times ${rb} = \\box`,
          answer: ra * rb,
          say: `Multiply the front digits, then count the zeros.`,
          nudges: [
            { value: (ra * rb) / 10, text: `Count the zeros again: ${ra} has ${String(ra).length - 1}, ${rb} has ${String(rb).length - 1}.` },
            { value: ra * rb * 10, text: `One zero too many.` },
          ],
          note: `So $${a} \\times ${b} \\approx ${tex(ra * rb)}$. (Exactly: ${fmtN(a * b)} — close!)`,
        },
      ]),
      explain: `$${a} \\times ${b} \\approx ${ra} \\times ${rb} = ${tex(ra * rb)}$.`,
    };
  }
  if (kind === 'div') {
    const b = pickNum(11, 99);
    const rb = sig1(b);
    const q = rng.pick([20, 30, 40, 50, 200, 300]);
    const a = rb * q + rng.int(-rb, rb);
    const ra = rb * q;
    return {
      skill: 'round-estimate',
      atoms: ['round-first', 'div-est'],
      prompt: `${fmtN(a)} people must share ${b} buses. About how many per bus? Pick friendly numbers!`,
      ...chain([
        { tex: `${b} \\approx \\box`, answer: rb },
        { tex: `${tex(a)} \\approx \\box`, answer: ra, say: `Pick a friendly number near ${fmtN(a)} that ${rb} divides into nicely.` },
        {
          tex: `${tex(ra)} \\div ${rb} = \\box`,
          answer: q,
          nudges: [{ value: q * 10, text: `Check it: $${rb} \\times ${q * 10}$ is far more than ${fmtN(ra)}.` }],
          note: `About ${q} per bus.`,
        },
      ]),
      explain: `$${tex(a)} \\div ${b} \\approx ${tex(ra)} \\div ${rb} = ${q}$.`,
    };
  }
  // sanity
  const a = pickNum(110, 990);
  const b = pickNum(11, 99);
  const est = sig1(a) * sig1(b);
  const claim = a * b * 10;
  return {
    skill: 'round-estimate',
    atoms: ['sanity'],
    prompt: `Doctor Exactly announces: "$${a} \\times ${b} = ${tex(claim)}$, EXACTLY!" Is that reasonable?`,
    ...choice(rng, `No — it should be about ${fmtN(est)}`, [
      { text: `Yes — he's a doctor`, nudge: `Doctors make mistakes too. Round and check: $${sig1(a)} \\times ${sig1(b)}$.` },
      { text: `No — it should be about ${fmtN(est / 10)}`, nudge: `Count the zeros: $${sig1(a)} \\times ${sig1(b)} = ${tex(est)}$.` },
      { text: `No — it should be about ${fmtN(est * 100)}`, nudge: `Too big. $${sig1(a)} \\times ${sig1(b)} = ${tex(est)}$.` },
    ]),
    explain: `$${a} \\times ${b} \\approx ${sig1(a)} \\times ${sig1(b)} = ${tex(est)}$. His answer has a zero too many — a classic.`,
  };
};

export const jarCount: Generator = (rng, level) => {
  const kind = rng.pick(level === 1 ? ['sampler'] : level === 2 ? ['sampler', 'scale'] : ['sample', 'average', 'sampler']);
  if (kind === 'sampler') {
    const grid = level === 1 ? rng.int(3, 4) : 5;
    const n = level === 1 ? rng.int(60, 150) : rng.int(250, 600);
    return {
      skill: 'jar-count',
      atoms: ['patches', 'scale-up'],
      prompt: `A crowd of fans fills the stadium. Doctor Exactly wants an exact count by Tuesday. You have ten seconds. Estimate!`,
      ...game({ kind: 'sampler', n, grid, seed: rng.int(1, 1e6) }),
      explain: `Count one patch, then multiply by the number of patches.`,
    };
  }
  if (kind === 'scale') {
    const g = rng.pick([5, 10]);
    const c = rng.int(12, 40);
    return {
      skill: 'jar-count',
      atoms: ['scale-up', 'patches'],
      prompt: `Ms Ballpark lays a ${g} by ${g} grid over a photo of a jellybean jar. She counts **${c} beans** in one square. About how many beans in the jar?`,
      ...numeric(c * g * g, [
        [c * g, `That's one row of squares. There are ${g} rows of ${g}: ${g * g} squares.`],
        [c, `That's just one square!`],
        [c + g * g, `Times, not plus: ${c} beans in **each** of ${g * g} squares.`],
      ]),
      explain: `${g} × ${g} = ${g * g} squares, about ${c} each: ${c} × ${g * g} = ${fmtN(c * g * g)}.`,
    };
  }
  if (kind === 'average') {
    const counts = [rng.int(16, 24), rng.int(16, 24), rng.int(16, 24)];
    const sum = counts.reduce((a, b) => a + b, 0);
    const tot = sum + (3 - (sum % 3)) % 3;
    counts[2] += tot - sum;
    const avg = tot / 3;
    const patches = rng.pick([50, 100, 200]);
    return {
      skill: 'jar-count',
      atoms: ['sample', 'scale-up'],
      prompt: `One patch might be unusual, so Ms Ballpark counts three: **${counts.join(', ')}**. The field has ${patches} patches. Estimate the crowd.`,
      ...chain([
        { tex: `${counts.join(' + ')} = \\box`, answer: tot },
        { tex: `${tot} \\div 3 = \\box`, answer: avg, say: `That's three patches. Share it out for an average patch.` },
        {
          tex: `${avg} \\times ${patches} = \\box`,
          answer: avg * patches,
          nudges: [{ value: tot * patches, text: `Use one average patch, not all three added up.` }],
        },
      ]),
      explain: `Average patch: ${avg}. Times ${patches} patches: about ${fmtN(avg * patches)} people.`,
    };
  }
  // which patch to count
  return {
    skill: 'jar-count',
    atoms: ['sample'],
    prompt: `To estimate a concert crowd, which patch should Ms Ballpark count?`,
    ...choice(rng, `A patch in the middle of the crowd`, [
      { text: `The patch right in front of the stage`, nudge: `Everyone squashes up at the front — that patch is extra-packed. Your estimate would be way too big.` },
      { text: `The patch by the toilets`, nudge: `People keep leaving that patch (for obvious reasons). Too few to be typical.` },
      { text: `An empty corner, because it's quick`, nudge: `Quick, but the estimate would be "about zero". Pick a typical patch!` },
    ]),
    explain: `A typical patch gives a fair estimate. The front is packed; the edges are thin. Even better: count a few and take the average.`,
  };
};

interface FermiQ {
  q: string;
  steps: ChainStep[];
  result: string;
}

/** Fermi questions: a chain of friendly estimates. */
function fermiQuestions(level: number): FermiQ[] {
  const easy: FermiQ[] = [
    {
      q: `How many slices of pizza do 300 kids eat in a school year, if each eats 2 slices a week?`,
      steps: [
        { tex: `300 \\times 2 = \\box \\text{ slices a week}`, answer: 600 },
        { tex: `600 \\times 40 = \\box \\text{ slices}`, answer: 24000, say: `A school year has about 40 weeks.`, nudges: [{ value: 2400, text: `Count the zeros: 600 has two, 40 has one.` }] },
      ],
      result: `about 24,000 slices`,
    },
    {
      q: `How many times does a dog wag its tail in an hour, at 2 wags a second?`,
      steps: [
        { tex: `2 \\times 60 = \\box \\text{ wags a minute}`, answer: 120 },
        { tex: `120 \\times 60 = \\box \\text{ wags an hour}`, answer: 7200, nudges: [{ value: 720, text: `Count the zeros: 120 × 60 = 12 × 6, then two zeros.` }] },
      ],
      result: `about 7,200 wags`,
    },
  ];
  const mid: FermiQ[] = [
    {
      q: `How many loos does Ballpark City flush in a day? (Yes, really. Heroes need to know.)`,
      steps: [
        { tex: `\\text{People in Ballpark City}`, options: ['$20$', '$20{,}000$', '$20{,}000{,}000{,}000$'], answer: 1, nudges: [{ value: 0, text: `That's a family, not a city!` }, { value: 2, text: `That's more than everyone on Earth!` }] },
        { tex: `\\text{Flushes per person per day}`, options: ['$5$', '$500$'], answer: 0, nudges: [{ value: 1, text: `500 flushes a day? Something has gone VERY wrong.` }] },
        { tex: `20{,}000 \\times 5 = \\box`, answer: 100000 },
      ],
      result: `about 100,000 flushes`,
    },
    {
      q: `How many school days will you have between now and finishing school (about 8 more years)?`,
      steps: [
        { tex: `\\text{School days in a year}`, options: ['$20$', '$200$', '$2{,}000$'], answer: 1, nudges: [{ value: 0, text: `That's about a month of school.` }, { value: 2, text: `There are only 365 days in a year!` }] },
        { tex: `200 \\times 8 = \\box`, answer: 1600 },
      ],
      result: `about 1,600 school days`,
    },
  ];
  const hard: FermiQ[] = [
    {
      q: `About how many times does your heart beat in a day?`,
      steps: [
        { tex: `\\text{What do you need?}`, options: ['Beats a minute, and minutes in a day', 'Beats a day, and days in a year', 'How tall you are'], answer: 0, nudges: [{ value: 1, text: `That would give beats in a year. We want a day.` }, { value: 2, text: `Your height doesn't change your heartbeat much!` }] },
        { tex: `60 \\times 60 = \\box \\text{ beats an hour}`, answer: 3600, say: `Say your heart beats about 60 times a minute, and an hour has 60 minutes.` },
        { tex: `3{,}600 \\times 24 \\approx 4{,}000 \\times 25 = \\box`, answer: 100000, say: `Round to friendly numbers: 3,600 ≈ 4,000 and 24 ≈ 25.` },
      ],
      result: `about 100,000 beats`,
    },
    {
      q: `How many seconds old are you, roughly, at 10 years old?`,
      steps: [
        { tex: `60 \\times 60 = \\box \\text{ seconds in an hour}`, answer: 3600 },
        { tex: `3{,}600 \\times 24 \\approx 4{,}000 \\times 25 = \\box`, answer: 100000, say: `Seconds in a day: round to friendly numbers.` },
        { tex: `100{,}000 \\times 365 \\approx 100{,}000 \\times 400 = \\box`, answer: 40000000, say: `That's one year. Round 365 to 400.` },
        { tex: `40{,}000{,}000 \\times 10 = \\box`, answer: 400000000, note: `About 400 million seconds. (Really: a bit over 300 million — the rounding made it bigger. Still the right zoom level!)` },
      ],
      result: `about 300–400 million seconds`,
    },
  ];
  return level === 1 ? easy : level === 2 ? [...easy, ...mid] : [...mid, ...hard];
}

export const fermi: Generator = (rng, level) => {
  const f = rng.pick(fermiQuestions(level));
  const atoms = ['multiply-round'];
  if (f.steps.some((s) => s.options && s.tex.includes('need'))) atoms.push('break-down');
  if (f.steps.some((s) => s.options && !s.tex.includes('need'))) atoms.push('sensible');
  return {
    skill: 'fermi',
    atoms,
    prompt: `**Fermi question:** ${f.q} Nobody knows exactly — so break it into easy guesses.`,
    ...chain(f.steps),
    explain: `Chain of friendly guesses: ${f.result}. Being right to the nearest zoom level is the goal.`,
  };
};

// ---------------------------------------------------------------------------

export const powMul: Generator = (rng, level) => {
  const kind = rng.pick(level === 1 ? ['mul', 'zeros'] : level === 2 ? ['mul', 'div', 'zeros'] : ['story', 'div', 'mul']);
  const a = rng.int(2, level === 1 ? 4 : 9);
  const b = rng.int(1, level === 1 ? 3 : 8);
  if (kind === 'zeros')
    return {
      skill: 'pow-mul',
      atoms: ['zeros', 'add-powers'],
      prompt: `$${pow(a)} \\times ${pow(b)}$: write it out — $${tex(10 ** a)} \\times ${tex(10 ** b)}$. How many zeros does the answer have?`,
      ...numeric(a + b, [
        [a * b, `Count them: ${a} zeros from the first, ${b} from the second.`],
        [Math.abs(a - b), `Multiplying stacks the zeros up — add them.`],
      ]),
      explain: `${a} + ${b} = ${a + b} zeros: $${pow(a)} \\times ${pow(b)} = ${pow(a + b)}$.`,
    };
  if (kind === 'mul')
    return {
      skill: 'pow-mul',
      atoms: ['add-powers', 'not-multiply'],
      prompt: `Captain Tenfold zooms in ×$${pow(a)}$, then ×$${pow(b)}$ more. Altogether?`,
      math: `${pow(a)} \\times ${pow(b)} = 10^{\\box}`,
      ...numeric(a + b, [
        [a * b, `Don't multiply the little numbers! $${pow(a)}$ is ${a} zooms, $${pow(b)}$ is ${b} more zooms.`],
        [Math.abs(a - b), `That's dividing. Zooming more adds zooms.`],
      ]),
      explain: `${a} zooms then ${b} zooms is ${a + b} zooms: $${pow(a + b)}$.`,
    };
  if (kind === 'div') {
    const hi = Math.max(a, b) + 2;
    const lo = Math.min(a, b);
    return {
      skill: 'pow-mul',
      atoms: ['sub-powers'],
      prompt: `Shrinking Kevin starts at $${pow(hi)}$ and shrinks by $${pow(lo)}$ (that's ÷ $${pow(lo)}$). Where does he end up?`,
      math: `${pow(hi)} \\div ${pow(lo)} = 10^{\\box}`,
      ...numeric(hi - lo, [
        [hi + lo, `Shrinking takes zooms away — subtract.`],
        [hi / lo, `Divide the numbers? No — subtract the zooms.`],
      ]),
      explain: `${hi} zooms take away ${lo} zooms: $${pow(hi - lo)}$.`,
    };
  }
  return {
    skill: 'pow-mul',
    atoms: ['add-powers', 'not-multiply'],
    prompt: `Kevin shrinks ten times smaller, ${a} times in a row. Then ${b} more times. How many times smaller is he now?`,
    ...choice(rng, `$${pow(a + b)}$`, [
      { text: `$${pow(a * b)}$`, nudge: `Each shrink is one ×10. ${a} shrinks and ${b} shrinks is ${a + b} shrinks.` },
      { text: `$${a + b}$`, nudge: `${a + b} shrinks of ×10 each — that's ten multiplied ${a + b} times.` },
      { text: `$${10 * (a + b)}$`, nudge: `That's adding the tens. Each shrink MULTIPLIES by 10.` },
    ]),
    explain: `${a} + ${b} = ${a + b} shrinks of ×10: $${pow(a + b)}$ times smaller.`,
  };
};

export const sciEstimate: Generator = (rng, level) => {
  const kind = rng.pick(level === 1 ? ['simple'] : level === 2 ? ['fix', 'simple'] : ['divide', 'fix']);
  if (kind === 'simple') {
    let f1 = rng.int(1, 4);
    let f2 = rng.int(2, 3);
    if (f1 * f2 > 9) [f1, f2] = [2, 3];
    const e1 = rng.int(2, 6);
    const e2 = rng.int(1, 5);
    return {
      skill: 'sci-estimate',
      atoms: ['front-times', 'powers-add'],
      prompt: `Multiply big numbers the hero way: front numbers together, zoom levels together.`,
      math: `(${f1} \\times ${pow(e1)}) \\times (${f2} \\times ${pow(e2)})`,
      ...chain([
        { tex: `${f1} \\times ${f2} = \\box`, answer: f1 * f2, nudges: [{ value: f1 + f2, text: `Multiply the front numbers.` }] },
        { tex: `${pow(e1)} \\times ${pow(e2)} = 10^{\\box}`, answer: e1 + e2, nudges: [{ value: e1 * e2, text: `Add the zooms: ${e1} + ${e2}.` }] },
      ]),
      explain: `$${f1 * f2} \\times ${pow(e1 + e2)}$.`,
    };
  }
  if (kind === 'fix') {
    const [f1, f2] = rng.pick([
      [5, 4],
      [5, 6],
      [4, 5],
      [2, 5],
      [5, 8],
    ]);
    const e1 = rng.int(2, 6);
    const e2 = rng.int(1, 5);
    const prod = f1 * f2;
    return {
      skill: 'sci-estimate',
      atoms: ['front-times', 'powers-add', 'fix-front'],
      prompt: `Doctor Exactly's machine makes $${f1} \\times ${pow(e1)}$ robots a day for $${f2} \\times ${pow(e2)}$ days. How many robots? (Front number must be under 10!)`,
      ...chain([
        { tex: `${f1} \\times ${f2} = \\box`, answer: prod },
        { tex: `${pow(e1)} \\times ${pow(e2)} = 10^{\\box}`, answer: e1 + e2 },
        {
          tex: `${prod} \\times ${pow(e1 + e2)} = ${prod / 10} \\times 10^{\\box}`,
          answer: e1 + e2 + 1,
          say: `${prod} is too big for the front: ${prod} = ${prod / 10} × 10. That ×10 joins the zooms.`,
          nudges: [{ value: e1 + e2, text: `The extra ×10 from ${prod} = ${prod / 10} × 10 adds one more zoom.` }],
        },
      ]),
      explain: `$${prod} \\times ${pow(e1 + e2)} = ${prod / 10} \\times ${pow(e1 + e2 + 1)}$.`,
    };
  }
  const [f1, f2] = rng.pick([
    [8, 2],
    [6, 3],
    [9, 3],
    [8, 4],
    [6, 2],
  ]);
  const e1 = rng.int(7, 10);
  const e2 = rng.int(2, 5);
  return {
    skill: 'sci-estimate',
    atoms: ['divide'],
    prompt: `$${f1} \\times ${pow(e1)}$ grains of sand are shared between $${f2} \\times ${pow(e2)}$ sandcastles. How many grains each?`,
    ...chain([
      { tex: `${f1} \\div ${f2} = \\box`, answer: f1 / f2 },
      { tex: `${pow(e1)} \\div ${pow(e2)} = 10^{\\box}`, answer: e1 - e2, nudges: [{ value: e1 + e2, text: `Dividing takes zooms away — subtract.` }] },
    ]),
    explain: `$${f1 / f2} \\times ${pow(e1 - e2)}$ grains each.`,
  };
};

export const howManyFit: Generator = (rng, level) => {
  const kind = rng.pick(level === 1 ? ['units'] : level === 2 ? ['units', 'powers'] : ['powers', 'sense']);
  if (kind === 'units') {
    const [what, mm, icon, card] = rng.pick([
      ['ants', 5, '🐜', 'ant'],
      ['fleas', 2.5, '🦟', 'flea'],
      ['paper clips', 25, '📎', ''],
    ] as [string, number, string, string][]);
    const metres = rng.pick([1, 2, 10]);
    const n = (metres * 1000) / mm;
    return {
      skill: 'how-many-fit',
      atoms: ['same-units', 'ratio'],
      cards: card ? [card] : [],
      prompt: `${icon} How many ${what} (${mm} mm each) nose to tail would stretch **${metres} m**?`,
      ...chain([
        { tex: `${metres} \\text{ m} = \\box \\text{ mm}`, answer: metres * 1000, nudges: [{ value: metres * 100, text: `1 m = 1,000 mm.` }] },
        { tex: `${tex(metres * 1000)} \\div ${mm} = \\box`, answer: n },
      ]),
      explain: `Same units first: ${metres} m = ${fmtN(metres * 1000)} mm. Then ${fmtN(metres * 1000)} ÷ ${mm} = ${fmtN(n)} ${what}.`,
    };
  }
  const pairs: [string, string][] = [
    ['earth', 'sun'],
    ['atom', 'hair'],
    ['kid', 'everest'],
    ['ant', 'pitch'],
    ['moon', 'earth-moon'],
    ['bacterium', 'hair'],
  ];
  const [s, b] = rng.pick(pairs).map((id) => sizeById[id]);
  const k = Math.round(log(b.m / s.m));
  if (kind === 'sense')
    return {
      skill: 'how-many-fit',
      atoms: ['sense', 'powers'],
      cards: [s.id, b.id],
      prompt: `Doctor Exactly claims that exactly ${fmtN(10 ** (k + 3))} of ${lower(s)} would fit across ${lower(b)}. Sensible?`,
      ...choice(rng, `No — more like $${pow(k)}$`, [
        { text: `Yes — Doctor Exactly is never wrong`, nudge: `He's wrong about half the time. Compare: about $${pow(sizeExp(s.m))}$ m and $${pow(sizeExp(b.m))}$ m.` },
        { text: `No — more like $${pow(k + 6)}$`, nudge: `Even bigger? Subtract the zoom levels: about $${pow(sizeExp(b.m))} \\div ${pow(sizeExp(s.m))}$.` },
      ]),
      explain: `${s.name}: about ${sizeText(s.m)}. ${b.name}: about ${sizeText(b.m)}. That's about $${pow(k)}$ times bigger — he's out by a factor of a thousand.`,
    };
  return {
    skill: 'how-many-fit',
    atoms: ['powers', 'ratio'],
    cards: [s.id, b.id],
    prompt: `${s.icon} ${s.name} is about $${pow(sizeExp(s.m))}$ m. ${b.icon} ${b.name} is about $${pow(sizeExp(b.m))}$ m. About how many of the first fit across the second?`,
    ...choice(rng, `$${pow(sizeExp(b.m) - sizeExp(s.m))}$`, [
      { text: `$${sizeExp(b.m) - sizeExp(s.m)}$`, nudge: `That's how many ZOOMS apart they are. Each zoom is ×10.` },
      { text: `$${pow(sizeExp(b.m) + sizeExp(s.m))}$`, nudge: `How many fit is a division: subtract the zoom levels.` },
    ]),
    explain: `$${pow(sizeExp(b.m))} \\div ${pow(sizeExp(s.m))} = ${pow(sizeExp(b.m) - sizeExp(s.m))}$.`,
  };
};
