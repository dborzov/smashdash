/**
 * Dungeons & Times Tables — the multiplication table, learnt as a set of patterns rather than
 * 144 separate facts to cram:
 *   arrays → turn it around (half the table for free) → skip counting,
 *   doubling (× 2, × 4, × 8) → × 10 and × 5 (half of × 10) → nines (× 10 minus one group),
 *   squares → breaking hard facts into easy ones → fact families (division),
 *   patterns (odd/even, last digits, rooms worth 24) → × 11 and × 12 → quick recall.
 *
 * Every problem says which facts it uses (`facts`), feeding the fact map; `quick-facts`
 * aims at the player's weakest facts (GenContext.factWeights).
 */
import type { ChainStep, GameSpec, Generator, Problem, Visual } from './types';
import type { Rng } from '../engine/rng';
import { choice, numeric } from './util';
import { factKey } from '../engine/facts';

const game = (g: GameSpec) => ({ answer: { kind: 'game' as const, game: g } });
/** A chain of steps; nudges that happen to equal a step's answer are dropped. */
const chain = (steps: ChainStep[], pics?: Visual[]) =>
  game({
    kind: 'chain',
    steps: steps.map((st) => ({ ...st, nudges: st.nudges?.filter((n) => n.value !== st.answer) })),
    pics,
  });
const arr = (rows: number, cols: number, at?: number): Visual => ({ kind: 'array', rows, cols, at });
const times = (a: number, b: number) => `${a} \\times ${b}`;

/** The usual slips with a times fact, as number nudges. */
function factNudges(a: number, b: number): [number, string][] {
  const n = a * b;
  return [
    [a + b, `That's $${a} + ${b}$. We need **${a} lots of ${b}**.`],
    [n - b, `One group short: that's $${a - 1} \\times ${b}$. Add one more ${b}.`],
    [n + b, `One group too many: that's $${a + 1} \\times ${b}$.`],
    [n - a, `One group short: that's $${a} \\times ${b - 1}$. Add one more ${a}.`],
    [n + a, `One group too many: that's $${a} \\times ${b + 1}$.`],
    [Number(`${a}${b}`), `Don't glue the numbers together — multiply them!`],
    [Number(String(n).split('').reverse().join('')), `The right digits, but swapped round!`],
  ].filter(([v]) => (v as number) > 0 && v !== n) as [number, string][];
}

// ---------------------------------------------------------------------------

export const arrays: Generator = (rng, level) => {
  const kind = rng.pick(level === 1 ? ['count', 'repeat'] : level === 2 ? ['words', 'build', 'count'] : ['missing', 'build-any', 'words']);
  if (kind === 'count') {
    const r = rng.int(2, level === 1 ? 5 : 6);
    const c = rng.int(3, level === 1 ? 6 : 9);
    return {
      skill: 'arrays',
      atoms: ['count', 'not-plus'],
      facts: [[r, c]],
      prompt: `The innkeeper keeps her gems on shelves. **How many gems** are there?`,
      visual: arr(r, c),
      ...numeric(r * c, [
        [r + c, `You added the rows and the columns. Count one row (${c}), then: how many rows of that?`],
        [c, `That's one row. There are ${r} rows just like it!`],
        [(r - 1) * c, `Count the rows again — there are ${r}.`],
      ]),
      hint: `${r} rows, ${c} gems in each row: $${times(r, c)}$.`,
      explain: `${r} rows of ${c}: $${times(r, c)} = ${r * c}$.`,
    };
  }
  if (kind === 'repeat') {
    const c = rng.int(3, 9);
    const r = rng.int(3, 5);
    const sum = Array(r).fill(c).join(' + ');
    return {
      skill: 'arrays',
      atoms: ['repeat'],
      facts: [[r, c]],
      prompt: `Thog adds up his loot: $${sum}$. Which multiplication is that?`,
      ...choice(rng, `$${times(r, c)}$`, [
        { text: `$${c} + ${r}$`, nudge: `There are ${r} lots of ${c} — that's times, not plus.` },
        { text: `$${times(c, c)}$`, nudge: `Count the ${c}s: there are ${r} of them, not ${c}.` },
        { text: `$${times(r + 1, c)}$`, nudge: `Count the ${c}s again!` },
      ]),
      explain: `${r} lots of ${c}: $${sum} = ${times(r, c)} = ${r * c}$.`,
    };
  }
  if (kind === 'words') {
    const r = rng.int(3, 8);
    const c = rng.int(3, 9);
    return {
      skill: 'arrays',
      atoms: ['count', 'not-plus'],
      facts: [[r, c]],
      prompt: `The tavern has **${r} tables**, and each table seats **${c} goblins**. How many goblins can sit down?`,
      ...numeric(r * c, factNudges(r, c)),
      hint: `${r} rows of ${c}.`,
      explain: `${r} tables of ${c}: $${times(r, c)} = ${r * c}$.`,
    };
  }
  if (kind === 'build') {
    const r = rng.int(2, 5);
    const c = rng.int(3, 8);
    return {
      skill: 'arrays',
      atoms: ['build'],
      facts: [[r, c]],
      prompt: `Put **${r * c} gems** on **${r} shelves**, the same number on each.`,
      ...game({ kind: 'array', mode: 'build', rows: r, cols: c, target: r * c, fixRows: true }),
      explain: `${r} rows of ${c}: $${times(r, c)} = ${r * c}$.`,
    };
  }
  if (kind === 'build-any') {
    const t = rng.pick([12, 18, 20, 24, 30, 36]);
    return {
      skill: 'arrays',
      atoms: ['build'],
      prompt: `Make a neat rectangle of exactly **${t} gems**. Any rectangle will do — find one!`,
      ...game({ kind: 'array', mode: 'build', rows: 1, cols: 1, target: t }),
      explain: `${t} can be a rectangle in several ways — like $${times(2, t / 2)}$ or $${times(t / 6, 6)}$.`,
    };
  }
  // missing rows
  const c = rng.int(4, 9);
  const r = rng.int(3, 9);
  return {
    skill: 'arrays',
    atoms: ['missing-rows'],
    facts: [[r, c]],
    prompt: `Some shelves with **${c} gems** on each make **${r * c} gems** altogether. How many shelves?`,
    math: `\\box \\times ${c} = ${r * c}`,
    ...numeric(r, [
      [r * c - c, `That's taking one shelf away. How many ${c}s make ${r * c}?`],
      [r * c * c, `That's multiplying. Here we know the total — how many ${c}s fit in it?`],
      [r + 1, `Check it: $${times(r + 1, c)} = ${(r + 1) * c}$. Too many!`],
      [r - 1, `Check it: $${times(r - 1, c)} = ${(r - 1) * c}$. Too few!`],
    ]),
    hint: `Count up in ${c}s until you reach ${r * c}.`,
    explain: `$${times(r, c)} = ${r * c}$, so there are ${r} shelves.`,
  };
};

export const turnaround: Generator = (rng, level) => {
  const kind = rng.pick(level === 1 ? ['swap', 'swap', 'turn'] : level === 2 ? ['easier', 'mirror', 'swap'] : ['not-minus', 'same', 'mirror']);
  if (kind === 'swap' || kind === 'turn') {
    const a = rng.int(2, 9);
    const b = rng.intExcept(2, 9, [a]);
    if (kind === 'turn')
      return {
        skill: 'turnaround',
        atoms: ['swap'],
        facts: [[a, b]],
        prompt: `${a} rows of ${b} gems. Turn the tray round — what happens to the number of gems?`,
        ...game({ kind: 'array', mode: 'turn', rows: a, cols: b }),
        explain: `Turning it round changes nothing: $${times(a, b)} = ${times(b, a)} = ${a * b}$.`,
      };
    return {
      skill: 'turnaround',
      atoms: ['swap'],
      facts: [[a, b]],
      prompt: `The Dungeon Master says $${times(a, b)} = ${a * b}$. So what is $${times(b, a)}$?`,
      visual: arr(a, b),
      ...numeric(a * b, [
        [a + b, `Times, not plus! Turn the array round — same gems.`],
        [Number(`${b}${a}`), `Don't glue them! Turn the array round: same number of gems.`],
      ]),
      explain: `Turn the array round: ${b} rows of ${a} is the same gems. $${times(b, a)} = ${a * b}$.`,
    };
  }
  if (kind === 'easier') {
    const n = rng.pick([7, 8, 9, 6]);
    const k = rng.pick([2, 5, 10]);
    const quick = k === 2 ? `Double ${n}` : k === 10 ? `${n} tens` : `Half of ${n} tens`;
    return {
      skill: 'turnaround',
      atoms: ['easier'],
      facts: [[n, k]],
      prompt: `Thog must work out $${times(n, k)}$. He starts counting in ${n}s on his fingers… Which is the **quick** way?`,
      ...choice(rng, `${quick}: turn it round, $${times(k, n)}$`, [
        { text: `Count up in ${k}s, ${n} times`, nudge: `That works — but it's slow. Turn it round: $${times(k, n)}$ is easy!` },
        { text: `Add ${n} and ${k}`, nudge: `That's adding. We need ${n} lots of ${k}.` },
        { text: `It can't be done without fingers`, nudge: `Thog's fingers are tired. Turn the sum round!` },
      ]),
      explain: `$${times(n, k)} = ${times(k, n)} = ${n * k}$ — ${quick.toLowerCase()}.`,
    };
  }
  if (kind === 'mirror') {
    const r = rng.int(2, 9);
    const c = rng.intExcept(2, 9, [r]);
    return {
      skill: 'turnaround',
      atoms: ['mirror'],
      facts: [[r, c]],
      prompt: `In the times-table dungeon, the room at **row ${r}, column ${c}** holds ${r * c} gold. Which other room is sure to hold ${r * c} gold too?`,
      ...choice(rng, `Row ${c}, column ${r}`, [
        { text: `Row ${r}, column ${r}`, nudge: `That's $${times(r, r)}$. Swap the row and the column!` },
        { text: `Row ${c}, column ${c}`, nudge: `That's $${times(c, c)}$. Swap them: row ${c}, column ${r}.` },
        { text: `Row ${r + 1}, column ${c}`, nudge: `That's $${times(r + 1, c)}$ — one more row.` },
      ]),
      explain: `$${times(r, c)} = ${times(c, r)}$: the table is a mirror image across its diagonal.`,
    };
  }
  if (kind === 'same') {
    const a = rng.int(3, 9);
    const b = rng.intExcept(3, 9, [a]);
    return {
      skill: 'turnaround',
      atoms: ['swap'],
      facts: [[a, b]],
      prompt: `Which of these is the same as $${times(a, b)}$?`,
      ...choice(rng, `$${times(b, a)}$`, [
        { text: `$${a} + ${b}$`, nudge: `That's plus. Turn the times round instead.` },
        { text: `$${a}${b}$`, nudge: `That's the two digits glued together — a different number.` },
        { text: `$${times(a, a)}$`, nudge: `That's $${a}$ times itself.` },
      ]),
      explain: `Turn it around: $${times(a, b)} = ${times(b, a)} = ${a * b}$.`,
    };
  }
  // not-minus
  const big = rng.int(7, 12);
  const small = rng.int(2, 5);
  return {
    skill: 'turnaround',
    atoms: ['not-minus'],
    prompt: `Thog: "Turnaround works for EVERYTHING! So $${big} - ${small} = ${small} - ${big}$!" Which operations really can be turned around?`,
    ...choice(rng, `$\\times$ and $+$ only`, [
      { text: `All four: $\\times$, $+$, $-$ and $\\div$`, nudge: `Try it: $${big} - ${small} = ${big - small}$, but $${small} - ${big}$ goes below zero! Not the same.` },
      { text: `Only $\\times$`, nudge: `Adding turns around too: $3 + 5 = 5 + 3$.` },
      { text: `$-$ and $\\div$`, nudge: `Those are exactly the ones that DON'T! $${big} \\div ${small}$ isn't $${small} \\div ${big}$.` },
    ]),
    explain: `$a \\times b = b \\times a$ and $a + b = b + a$. But $${big} - ${small} = ${big - small}$ while $${small} - ${big}$ is below zero. Sorry, Thog.`,
  };
};

export const skipCount: Generator = (rng, level) => {
  const steps = level === 1 ? [2, 5, 10, 3] : level === 2 ? [3, 4, 6] : [6, 7, 8, 9];
  const step = rng.pick(steps);
  const kind = rng.pick(level === 1 ? ['next', 'next', 'hop'] : level === 2 ? ['nth', 'hop', 'next'] : ['missing', 'on-path', 'nth']);
  if (kind === 'next') {
    const k = rng.int(2, level === 1 ? 6 : 8);
    const seq = [k, k + 1, k + 2].map((i) => i * step);
    return {
      skill: 'skip-count',
      atoms: ['next'],
      facts: [[k + 3, step]],
      prompt: `The frog hops in ${step}s: ${seq.join(', ')}, … Where does it land next?`,
      ...numeric((k + 3) * step, [
        [seq[2] + 1, `That's one step. The frog jumps ${step} at a time!`],
        [seq[2] + 2 * step, `Whoa — that skipped a landing. Just one hop of ${step}.`],
      ]),
      explain: `$${seq[2]} + ${step} = ${(k + 3) * step}$.`,
    };
  }
  if (kind === 'hop')
    return {
      skill: 'skip-count',
      atoms: ['next', 'nth'],
      prompt: `Help the frog hop in ${step}s. Tap where it lands each time.`,
      ...game({ kind: 'skipjump', step, jumps: level === 1 ? 4 : 5 }),
      explain: `Hops of ${step}: ${Array.from({ length: 5 }, (_, i) => (i + 1) * step).join(', ')} — the ${step} times table.`,
    };
  if (kind === 'nth') {
    const n = rng.int(3, level === 2 ? 6 : 9);
    const max = step * (n + 2);
    return {
      skill: 'skip-count',
      atoms: ['nth'],
      facts: [[n, step]],
      prompt: `The frog starts at 0 and makes **${n} hops of ${step}**. Tap where it ends up.`,
      answer: { kind: 'line', min: 0, max, step: max <= 40 ? 5 : 10, minor: 1, snap: 1, value: n * step, tolerance: 0 },
      nudges: [
        { match: n + step, text: `That's ${n} + ${step}. It's ${n} hops, each ${step} long: $${times(n, step)}$.` },
        { match: (n - 1) * step, text: `That's only ${n - 1} hops. Count them again!` },
        { match: (n + 1) * step, text: `That's ${n + 1} hops — one too many.` },
      ].filter((x) => x.match >= 0 && x.match <= max && x.match !== n * step),
      explain: `${n} hops of ${step}: $${times(n, step)} = ${n * step}$.`,
    };
  }
  if (kind === 'missing') {
    const k = rng.int(2, 6);
    const seq = [k, k + 1, k + 2, k + 3].map((i) => i * step);
    return {
      skill: 'skip-count',
      atoms: ['missing'],
      facts: [[k + 2, step]],
      prompt: `A page of the frog's diary is torn: ${seq[0]}, ${seq[1]}, ?, ${seq[3]}. Which number is missing?`,
      math: `${seq[0]},\\ ${seq[1]},\\ \\box,\\ ${seq[3]}`,
      ...numeric(seq[2], [
        [seq[1] + 1, `The hops are ${step} long, not 1.`],
        [seq[1] + step + 1, `Check it: from ${seq[1]}, one hop of ${step}.`],
      ]),
      explain: `${seq[1]} + ${step} = ${seq[2]}, and ${seq[2]} + ${step} = ${seq[3]} ✓.`,
    };
  }
  // on-path
  const k = rng.int(4, 9);
  const yes = k * step;
  const near = [yes + 1, yes - 2, yes + 3, yes - 1].filter((x) => x % step !== 0);
  const tail = 10 * Math.floor(yes / 10) + step;
  const trap = tail % step !== 0 && tail !== yes ? tail : near[2];
  return {
    skill: 'skip-count',
    atoms: ['on-path'],
    facts: [[k, step]],
    prompt: `Which number is on the frog's path when it hops in ${step}s from 0?`,
    ...choice(rng, String(yes), [
      { text: String(trap), nudge: `It ends in ${step % 10}, but that doesn't make it a landing! Check: hops of ${step} go ${(k - 1) * step}, ${k * step}, ${(k + 1) * step}…` },
      { text: String(near[0]), nudge: `Hops of ${step}: …${(k - 1) * step}, ${k * step}, ${(k + 1) * step}… Is it there?` },
      { text: String(near[1]), nudge: `Not a landing — it falls between two hops.` },
    ]),
    explain: `$${times(k, step)} = ${yes}$, so ${yes} is on the path.`,
  };
};

// ---------------------------------------------------------------------------

export const doubles: Generator = (rng, level) => {
  const kind = rng.pick(level === 1 ? ['double', 'halve'] : level === 2 ? ['x4', 'x4', 'halve'] : ['x8', 'x8', 'double-big']);
  if (kind === 'double') {
    const n = rng.int(6, 19);
    return {
      skill: 'doubles',
      atoms: ['double'],
      facts: n <= 12 ? [[2, n]] : [],
      prompt: `The Hydra grows two heads for every one you cut. Double **${n}**!`,
      math: `2 \\times ${n}`,
      ...numeric(2 * n, [
        [n + 2, `That's adding 2. Double means **two lots** of ${n}: $${n} + ${n}$.`],
        [Number(`${n}${n}`), `That's ${n} written twice. Add them: $${n} + ${n}$.`],
      ]),
      explain: `$${n} + ${n} = ${2 * n}$.`,
    };
  }
  if (kind === 'halve') {
    const n = 2 * rng.int(level === 1 ? 4 : 12, level === 1 ? 20 : 45);
    return {
      skill: 'doubles',
      atoms: ['halve'],
      prompt: `Share **${n}** gold fairly between two heads of the Hydra. How much does each head get?`,
      math: `${n} \\div 2`,
      ...numeric(n / 2, [
        [n - 2, `That's taking 2 away. Halving splits it into two equal piles.`],
        [n * 2, `That's doubling! Halving is the opposite.`],
      ]),
      hint: `Half of the tens, then half of the ones.`,
      explain: `${n / 2} + ${n / 2} = ${n}, so half of ${n} is ${n / 2}.`,
    };
  }
  if (kind === 'x4') {
    const n = rng.int(3, 12);
    return {
      skill: 'doubles',
      atoms: ['x4'],
      facts: [[4, n]],
      prompt: `Work out $${times(4, n)}$ the Hydra way: double, then double again.`,
      ...chain(
        [
          { tex: `${times(2, n)} = \\box`, answer: 2 * n, nudges: [{ value: n + 2, text: `Double ${n} is ${n} + ${n}.` }] },
          {
            tex: `${2 * n} \\times 2 = \\box`,
            answer: 4 * n,
            say: `That's ${n} doubled. Now double **that**.`,
            nudges: [{ value: 2 * n + 2, text: `Double ${2 * n}: $${2 * n} + ${2 * n}$.` }],
            note: `Double-double: $${times(4, n)} = ${4 * n}$.`,
          },
        ],
        [arr(1, n), arr(2, n), arr(4, n)],
      ),
      explain: `$${n} \\to ${2 * n} \\to ${4 * n}$. Times 4 is double-double.`,
    };
  }
  if (kind === 'x8') {
    const n = rng.int(3, 12);
    return {
      skill: 'doubles',
      atoms: ['x8', 'x4'],
      facts: [[8, n]],
      prompt: `$${times(8, n)}$: double it three times. (Two, four, EIGHT heads!)`,
      ...chain(
        [
          { tex: `${times(2, n)} = \\box`, answer: 2 * n },
          { tex: `${times(4, n)} = ${2 * n} \\times 2 = \\box`, answer: 4 * n },
          {
            tex: `${times(8, n)} = ${4 * n} \\times 2 = \\box`,
            answer: 8 * n,
            nudges: [{ value: 6 * n, text: `That's ${4 * n} + ${2 * n}. Double ${4 * n}: $${4 * n} + ${4 * n}$.` }],
            note: `× 2, × 2, × 2 is × 8.`,
          },
        ],
        [arr(1, n), arr(2, n), arr(4, n), arr(8, n)],
      ),
      explain: `$${n} \\to ${2 * n} \\to ${4 * n} \\to ${8 * n}$: three doublings make × 8.`,
    };
  }
  // double-big (with a carry)
  const n = rng.pick([16, 17, 18, 19, 25, 26, 27, 28, 35, 36, 37, 38, 45, 46, 47, 48]);
  const t = Math.floor(n / 10) * 10;
  const o = n % 10;
  return {
    skill: 'doubles',
    atoms: ['double'],
    prompt: `Double **${n}**. Split it: double the tens, double the ones, put them together.`,
    ...chain([
      { tex: `${t} + ${t} = \\box`, answer: 2 * t },
      { tex: `${o} + ${o} = \\box`, answer: 2 * o },
      {
        tex: `${2 * t} + ${2 * o} = \\box`,
        answer: 2 * n,
        nudges: [{ value: Number(`${(2 * t) / 10}${2 * o}`), text: `${2 * o} is more than 9 — it carries into the tens!` }],
      },
    ]),
    explain: `Double ${n} = ${2 * t} + ${2 * o} = ${2 * n}.`,
  };
};

export const fivesTens: Generator = (rng, level) => {
  const kind = rng.pick(level === 1 ? ['x10', 'x10', 'ends'] : level === 2 ? ['x5', 'x5', 'ends'] : ['odd', 'odd', 'x10-big']);
  if (kind === 'x10' || kind === 'x10-big') {
    const n = kind === 'x10' ? rng.int(2, 12) : rng.int(13, 99);
    return {
      skill: 'fives-tens',
      atoms: ['x10'],
      facts: n <= 12 ? [[10, n]] : [],
      prompt: `Captain Tenfold's mirror makes everything **ten times** bigger. What is $${times(n, 10)}$?`,
      ...numeric(10 * n, [
        [n + 10, `That's adding 10. Times 10 makes it TEN TIMES bigger.`],
        [n, `That's the same number. Every digit moves up one place!`],
        [100 * n, `One zero too many — that's × 100.`],
      ]),
      explain: `Every digit moves up a place, and a zero holds the ones place: $${times(n, 10)} = ${10 * n}$.`,
    };
  }
  if (kind === 'x5' || kind === 'odd') {
    const n = kind === 'x5' ? 2 * rng.int(1, 6) : 2 * rng.int(1, 6) + 1;
    return {
      skill: 'fives-tens',
      atoms: kind === 'x5' ? ['x5-half'] : ['odd', 'x5-half'],
      facts: [[5, n]],
      prompt: `$${times(n, 5)}$: five is half of ten. So do $\\times 10$, then halve it.`,
      ...chain([
        { tex: `${times(n, 10)} = \\box`, answer: 10 * n, nudges: [{ value: n + 10, text: `Times 10, not plus 10.` }] },
        {
          tex: `${10 * n} \\div 2 = \\box`,
          answer: 5 * n,
          say: `Five is half of ten, so $${times(n, 5)}$ is half of that.`,
          nudges: [
            { value: 5 * n + 5, text: `Half of ${10 * n}: what plus itself makes ${10 * n}?` },
            { value: 20 * n, text: `That's doubling. Halve it!` },
          ],
          note: `$${times(n, 5)} = ${5 * n}$.`,
        },
      ]),
      explain: `$${times(n, 10)} = ${10 * n}$, and half of that is $${5 * n}$.`,
    };
  }
  // ends
  const yes = [5 * rng.int(3, 12), 5 * rng.int(3, 12)];
  const no = rng.pick([52, 37, 43, 58, 26, 64, 71]);
  return {
    skill: 'fives-tens',
    atoms: ['ends'],
    prompt: `Bard Barry is selling "genuine 5-times-table numbers". Which one is a **fake**?`,
    ...choice(rng, String(no), [
      { text: String(yes[0]), nudge: `It ends in ${yes[0] % 10} — the 5s always end in 5 or 0. That one's real.` },
      { text: String(yes[1] === yes[0] ? yes[1] + 5 : yes[1]), nudge: `Ends in 5 or 0: that's a real 5s number.` },
      { text: String(5 * rng.int(13, 19)), nudge: `Ends in 5 or 0 — real, even if it's big.` },
    ]),
    explain: `Every number in the 5 times table ends in 5 or 0. ${no} ends in ${no % 10}: fake!`,
  };
};

export const nines: Generator = (rng, level) => {
  const kind = rng.pick(level === 1 ? ['ten-minus'] : level === 2 ? ['digits', 'ten-minus', 'tens'] : ['spot', 'big', 'digits']);
  if (kind === 'ten-minus' || kind === 'big') {
    const n = kind === 'big' ? rng.int(11, 12) : rng.int(3, 9);
    return {
      skill: 'nines',
      atoms: ['ten-minus'],
      facts: [[9, n]],
      prompt: `$${times(9, n)}$: nine lots is ten lots, take away one lot.`,
      ...chain([
        { tex: `${times(10, n)} = \\box`, answer: 10 * n },
        {
          tex: `${10 * n} - ${n} = \\box`,
          answer: 9 * n,
          say: `Ten ${n}s is one ${n} too many. Take **one ${n}** away.`,
          nudges: [
            { value: 10 * n - 1, text: `Take away a whole ${n} — one group — not just 1.` },
            { value: 10 * n - 9, text: `Take away one **${n}** (we had 10 lots of ${n}, we want 9).` },
          ],
          note: `$${times(9, n)} = ${9 * n}$.`,
        },
      ]),
      explain: `$${times(9, n)} = ${times(10, n)} - ${n} = ${10 * n} - ${n} = ${9 * n}$.`,
    };
  }
  if (kind === 'tens') {
    const n = rng.int(2, 9);
    return {
      skill: 'nines',
      atoms: ['tens-digit'],
      facts: [[9, n]],
      prompt: `The nine trick: in $${times(9, n)}$ the **tens digit** is one less than ${n}. What is the tens digit?`,
      ...numeric(n - 1, [
        [n, `One **less** than ${n}.`],
        [9 - n + 1, `That's the ones digit! The tens digit is one less than ${n}.`],
      ]),
      explain: `$${times(9, n)} = ${9 * n}$: tens digit ${n - 1}, and ${n - 1} + ${10 - n} = 9.`,
    };
  }
  if (kind === 'digits') {
    const n = rng.int(2, 9);
    const ans = 9 * n;
    const t = Math.floor(ans / 10);
    return {
      skill: 'nines',
      atoms: ['digit-sum', 'tens-digit'],
      facts: [[9, n]],
      prompt: `The digits of a nines answer always add up to 9. Use that to fill the gap: $${times(9, n)} = ${t}\\box$`,
      ...numeric(ans % 10, [
        [9 - t + 1, `Check: ${t} + ${9 - t + 1} = ${10}. They must add to **9**.`],
        [t, `${t} + ${t} isn't 9 — what goes with ${t} to make 9?`],
      ]),
      explain: `${t} + ${ans % 10} = 9, so $${times(9, n)} = ${ans}$.`,
    };
  }
  // spot a fake
  const real = rng.shuffle([3, 4, 5, 6, 7, 8]).slice(0, 4);
  const fakeN = real[3];
  const fake = 9 * fakeN + rng.pick([10, -10, 1, -1]);
  return {
    skill: 'nines',
    atoms: ['spot', 'digit-sum'],
    facts: real.map((n) => [9, n] as [number, number]),
    prompt: `Bard Barry wrote a song about the nines. One line is wrong. Which one?`,
    ...choice(rng, `$${times(9, fakeN)} = ${fake}$`, [
      ...real.slice(0, 3).map((n) => ({
        text: `$${times(9, n)} = ${9 * n}$`,
        nudge: `Check the digits: ${Math.floor((9 * n) / 10)} + ${(9 * n) % 10} = 9 ✓. That line is fine.`,
      })),
    ]),
    explain: `$${times(9, fakeN)}$ is $${9 * fakeN}$, not ${fake} — and ${String(fake).split('').join(' + ')} doesn't make 9. Nice ears.`,
  };
};

// ---------------------------------------------------------------------------

export const squareNums: Generator = (rng, level) => {
  const kind = rng.pick(level === 1 ? ['shape', 'know'] : level === 2 ? ['layers', 'know', 'grow'] : ['is-square', 'not-double', 'layers']);
  const n = rng.int(level === 1 ? 2 : 4, level === 1 ? 6 : 12);
  if (kind === 'shape')
    return {
      skill: 'square-nums',
      atoms: ['shape'],
      facts: [[n, n]],
      prompt: `The Squareholder has eyes in a perfect square. **How many eyes?**`,
      visual: arr(n, n),
      ...numeric(n * n, [
        [2 * n, `That's two rows. There are ${n} rows of ${n}!`],
        [4 * n, `That's just the eyes round the edge. Count them all: ${n} rows of ${n}.`],
      ]),
      explain: `${n} rows of ${n}: $${times(n, n)} = ${n * n}$, a square number.`,
    };
  if (kind === 'know')
    return {
      skill: 'square-nums',
      atoms: ['know'],
      facts: [[n, n]],
      prompt: `A square room, ${n} tiles by ${n} tiles. How many tiles?`,
      math: times(n, n),
      ...numeric(n * n, factNudges(n, n)),
      explain: `$${times(n, n)} = ${n * n}$.`,
    };
  if (kind === 'grow')
    return {
      skill: 'square-nums',
      atoms: ['odd-layers', 'shape'],
      prompt: `Grow a square, one layer at a time. Watch how many tiles each new layer needs.`,
      ...game({ kind: 'squaregrow', upto: rng.int(4, 6) }),
      explain: `Each new layer is the next odd number: 1, 3, 5, 7… and the totals are the squares 1, 4, 9, 16…`,
    };
  if (kind === 'layers') {
    const m = rng.int(3, 10);
    return {
      skill: 'square-nums',
      atoms: ['odd-layers'],
      facts: [[m, m]],
      prompt: `$${times(m, m)} = ${m * m}$. To grow it into $${times(m + 1, m + 1)}$, how many new tiles do you add?`,
      ...numeric(2 * m + 1, [
        [m + 1, `The new layer goes round **two** sides: ${m} + ${m} + 1 corner.`],
        [2 * m, `Don't forget the corner tile! ${m} + ${m} + 1.`],
        [4 * m, `It only wraps round two sides, not all four.`],
      ]),
      explain: `${m} + ${m} + 1 = ${2 * m + 1}, and $${m * m} + ${2 * m + 1} = ${(m + 1) ** 2}$ ✓.`,
    };
  }
  if (kind === 'is-square') {
    const sq = rng.pick([16, 25, 36, 49, 64, 81, 100, 121]);
    return {
      skill: 'square-nums',
      atoms: ['is-square'],
      prompt: `Only one of these numbers of eyes can make a perfect square. Which?`,
      ...choice(rng, String(sq), [
        { text: String(sq + 1), nudge: `${sq + 1} is between two squares — it can't be a square.` },
        { text: String(sq + Math.sqrt(sq)), nudge: `That's $${times(Math.sqrt(sq), Math.sqrt(sq) + 1)}$ — a rectangle, not a square.` },
        { text: String(sq - 2), nudge: `Just short of a square — so not one.` },
      ]),
      explain: `$${times(Math.sqrt(sq), Math.sqrt(sq))} = ${sq}$.`,
    };
  }
  // not-double: n squared
  return {
    skill: 'square-nums',
    atoms: ['not-double', 'know'],
    facts: [[n, n]],
    prompt: `"${n} squared", written $${n}^2$, means $${times(n, n)}$. What is $${n}^2$?`,
    ...numeric(n * n, [
      [2 * n, `That's $${times(n, 2)}$. Squared means ${n} times **itself**.`],
      [n + 2, `That's ${n} + 2. The little 2 means: ${n} times ${n}.`],
    ]),
    explain: `$${n}^2 = ${times(n, n)} = ${n * n}$.`,
  };
};

export const splitFacts: Generator = (rng, level) => {
  const kind = rng.pick(level === 1 ? ['five', 'five'] : level === 2 ? ['more', 'less', 'five'] : ['choose', 'ten', 'more']);
  if (kind === 'five') {
    const a = rng.int(6, 9);
    const b = rng.int(3, 9);
    return {
      skill: 'split-facts',
      atoms: ['split-five'],
      facts: [[a, b], [5, b]],
      prompt: `$${times(a, b)}$ looks hard. Break the ${a} into 5 and ${a - 5}: two easy facts!`,
      ...chain(
        [
          { tex: `${times(5, b)} = \\box`, answer: 5 * b },
          { tex: `${times(a - 5, b)} = \\box`, answer: (a - 5) * b },
          {
            tex: `${5 * b} + ${(a - 5) * b} = \\box`,
            answer: a * b,
            note: `$${times(a, b)} = ${a * b}$ — no hard fact needed.`,
          },
        ],
        [arr(a, b, 5)],
      ),
      explain: `$${times(a, b)} = ${times(5, b)} + ${times(a - 5, b)} = ${5 * b} + ${(a - 5) * b} = ${a * b}$.`,
    };
  }
  if (kind === 'more') {
    const a = rng.int(4, 9);
    return {
      skill: 'split-facts',
      atoms: ['one-more'],
      facts: [[a, a + 1], [a, a]],
      prompt: `$${times(a, a + 1)}$ is a square plus one more group. Use $${times(a, a)}$!`,
      ...chain(
        [
          { tex: `${times(a, a)} = \\box`, answer: a * a },
          {
            tex: `${a * a} + ${a} = \\box`,
            answer: a * (a + 1),
            say: `$${times(a, a + 1)}$ is one more ${a} than $${times(a, a)}$.`,
            nudges: [{ value: a * a + 1, text: `One more **group of ${a}**, not one more.` }],
          },
        ],
        [arr(a + 1, a, a)],
      ),
      explain: `$${times(a, a + 1)} = ${times(a, a)} + ${a} = ${a * a} + ${a} = ${a * (a + 1)}$.`,
    };
  }
  if (kind === 'less') {
    const a = rng.int(3, 9);
    return {
      skill: 'split-facts',
      atoms: ['one-less'],
      facts: [[a, 9]],
      prompt: `$${times(a, 9)}$: that's $${times(a, 10)}$, minus one group of ${a}.`,
      ...chain([
        { tex: `${times(a, 10)} = \\box`, answer: 10 * a },
        {
          tex: `${10 * a} - ${a} = \\box`,
          answer: 9 * a,
          nudges: [{ value: 10 * a - 1, text: `Take away a whole group of ${a}, not 1.` }],
        },
      ]),
      explain: `$${times(a, 9)} = ${10 * a} - ${a} = ${9 * a}$.`,
    };
  }
  if (kind === 'ten') {
    const b = rng.int(3, 9);
    return {
      skill: 'split-facts',
      atoms: ['split-ten'],
      facts: [[12, b]],
      prompt: `$${times(12, b)}$: split the 12 into 10 and 2.`,
      ...chain([
        { tex: `${times(10, b)} = \\box`, answer: 10 * b },
        { tex: `${times(2, b)} = \\box`, answer: 2 * b },
        { tex: `${10 * b} + ${2 * b} = \\box`, answer: 12 * b, nudges: [{ value: 10 * b + 2, text: `The 2 multiplies the ${b} too: $${times(2, b)}$.` }] },
      ]),
      explain: `$${times(12, b)} = ${10 * b} + ${2 * b} = ${12 * b}$.`,
    };
  }
  // choose a smart split, then do it
  const a = rng.int(6, 9);
  const b = rng.int(6, 9);
  return {
    skill: 'split-facts',
    atoms: ['split-five'],
    facts: [[a, b]],
    prompt: `Pick a smart way to break up $${times(a, b)}$, then finish it.`,
    ...chain([
      {
        tex: `${times(a, b)} = \\;?`,
        options: [
          `$${times(5, b)} + ${times(a - 5, b)}$`,
          `$${times(5, b)} + ${a - 5}$`,
          `$${a} + ${b}$`,
        ],
        answer: 0,
        nudges: [
          { value: 1, text: `Halfcopy alert! The ${a - 5} needs to multiply the ${b} too.` },
          { value: 2, text: `That's adding. We need ${a} lots of ${b}.` },
        ],
      },
      { tex: `${5 * b} + ${(a - 5) * b} = \\box`, answer: a * b, say: `$${times(5, b)} = ${5 * b}$ and $${times(a - 5, b)} = ${(a - 5) * b}$.` },
    ]),
    explain: `$${times(a, b)} = ${5 * b} + ${(a - 5) * b} = ${a * b}$.`,
  };
};

export const factFamilies: Generator = (rng, level) => {
  const a = rng.int(level === 1 ? 2 : 3, level === 1 ? 6 : 9);
  const b = rng.int(3, 9);
  const n = a * b;
  const kind = rng.pick(level === 1 ? ['missing'] : level === 2 ? ['divide', 'family', 'missing'] : ['share', 'family', 'divide']);
  const off: [number, string][] = [
    [n - b, `That's ${n} − ${b}. How many ${b}s make ${n}?`],
    [n + b, `That's ${n} + ${b}. How many ${b}s make ${n}?`],
    [n * b, `That's multiplying. Division asks: how many ${b}s fit in ${n}?`],
  ];
  if (kind === 'missing')
    return {
      skill: 'fact-families',
      atoms: ['missing'],
      facts: [[a, b]],
      prompt: `A smudge on the map: what number goes in the box?`,
      math: `\\box \\times ${b} = ${n}`,
      ...numeric(a, off),
      hint: `Count up in ${b}s until you hit ${n}.`,
      explain: `$${times(a, b)} = ${n}$.`,
    };
  if (kind === 'divide')
    return {
      skill: 'fact-families',
      atoms: ['divide'],
      facts: [[a, b]],
      prompt: `How many ${b}s fit in ${n}?`,
      math: `${n} \\div ${b}`,
      visual: arr(a, b),
      ...numeric(a, off),
      explain: `$${times(a, b)} = ${n}$, so $${n} \\div ${b} = ${a}$.`,
    };
  if (kind === 'share')
    return {
      skill: 'fact-families',
      atoms: ['share', 'divide'],
      facts: [[a, b]],
      prompt: `${n} gold coins are shared fairly between ${b} goblins. How many coins does each goblin get?`,
      ...numeric(a, off),
      explain: `$${n} \\div ${b} = ${a}$, because $${times(b, a)} = ${n}$.`,
    };
  const c = a === b ? a + 1 : b;
  const m = a * c;
  return {
    skill: 'fact-families',
    atoms: ['family'],
    facts: [[a, c]],
    prompt: `The family of $${times(a, c)} = ${m}$ has four members. Which one is an **impostor**?`,
    ...choice(rng, `$${m} - ${c} = ${m - c}$`, [
      { text: `$${times(c, a)} = ${m}$`, nudge: `That's the turnaround — a real family member.` },
      { text: `$${m} \\div ${a} = ${c}$`, nudge: `That's a real member: ${m} split into ${a}s gives ${c}.` },
      { text: `$${m} \\div ${c} = ${a}$`, nudge: `Real member: ${m} split into ${c}s gives ${a}.` },
    ]),
    explain: `The family: $${times(a, c)}$, $${times(c, a)}$, $${m} \\div ${a}$, $${m} \\div ${c}$. Taking away isn't in it.`,
  };
};

// ---------------------------------------------------------------------------

export const tablePatterns: Generator = (rng, level) => {
  const kind = rng.pick(level === 1 ? ['odd-even'] : level === 2 ? ['impossible', 'rooms', 'odd-even'] : ['count-rooms', 'why', 'rooms']);
  if (kind === 'odd-even') {
    const a = rng.int(3, 12);
    const b = rng.int(3, 12);
    const odd = (a * b) % 2 === 1;
    return {
      skill: 'table-patterns',
      atoms: ['odd-even'],
      facts: [[a, b]],
      prompt: `Without working it out: is $${times(a, b)}$ odd or even?`,
      ...choice(rng, odd ? 'Odd' : 'Even', [
        {
          text: odd ? 'Even' : 'Odd',
          nudge: odd
            ? `${a} and ${b} are both odd. Odd groups of an odd number always leave one over: odd.`
            : `One of them is even — even groups (or groups of an even number) pair up perfectly: even.`,
        },
      ], 2),
      explain: `$${times(a, b)} = ${a * b}$, which is ${odd ? 'odd' : 'even'}. Odd × odd is odd; anything × even is even.`,
    };
  }
  if (kind === 'rooms') {
    const t = rng.pick([12, 16, 18, 20, 24, 36]);
    return {
      skill: 'table-patterns',
      atoms: ['rooms'],
      prompt: `The treasure is ${t} gold, and every room worth ${t} has some. Find them all!`,
      ...game({ kind: 'tablegrid', mode: 'find', size: 10, target: t }),
      explain: `${t} hides wherever row × column = ${t} — and every room has a mirror twin.`,
    };
  }
  if (kind === 'count-rooms') {
    const t = rng.pick([12, 16, 18, 24, 36]);
    const count = [...Array(10)].reduce((acc, _, r) => acc + [...Array(10)].filter((__, c) => (r + 1) * (c + 1) === t).length, 0);
    return {
      skill: 'table-patterns',
      atoms: ['rooms'],
      prompt: `In the 10 × 10 dungeon, how many rooms are worth exactly **${t}**?`,
      ...numeric(count, [
        [Math.ceil(count / 2), `Don't forget the mirror twins: $${times(3, 4)}$ and $${times(4, 3)}$ are different rooms!`],
        [count + 1, `Only count rooms inside the 10 × 10 map.`],
      ]),
      hint: `List the pairs that multiply to ${t}, then count both ways round.`,
      explain: `Every pair of numbers up to 10 that multiplies to ${t}, both ways round: ${count} rooms.`,
    };
  }
  const k = rng.pick([2, 4, 6, 8]);
  const odd = 2 * rng.int(6, 20) + 1;
  if (kind === 'why')
    return {
      skill: 'table-patterns',
      atoms: ['impossible', 'odd-even'],
      prompt: `Why can ${odd} **never** be in the ${k} times table?`,
      ...choice(rng, `The ${k}s are all even, and ${odd} is odd`, [
        { text: `${odd} is too big`, nudge: `Size isn't it — the ${k}s go on forever. Is ${odd} odd or even?` },
        { text: `${odd} ends in ${odd % 10}`, nudge: `Getting warm! Why does ending in ${odd % 10} matter? Because it makes ${odd} odd…` },
        { text: `It could be, if you count far enough`, nudge: `Every ${k}s number is even. ${odd} is odd. No amount of counting fixes that!` },
      ]),
      explain: `${k} is even, so every number in the ${k} times table is even. ${odd} is odd: never.`,
    };
  // impossible: which can't be in the k table
  const ins = rng.shuffle([3, 4, 5, 6, 7, 8, 9]).slice(0, 3).map((i) => i * k);
  return {
    skill: 'table-patterns',
    atoms: ['last-digit', 'impossible'],
    facts: ins.map((x) => [k, x / k] as [number, number]),
    prompt: `Three of these are in the ${k} times table. Which one **can't** be?`,
    ...choice(rng, String(odd), ins.map((x) => ({ text: String(x), nudge: `$${times(x / k, k)} = ${x}$ — it's in.` }))),
    explain: `Every ${k}s number is even (they end in ${[1, 2, 3, 4, 5].map((i) => (i * k) % 10).join(', ')}…). ${odd} is odd.`,
  };
};

export const bigTables: Generator = (rng, level) => {
  const kind = rng.pick(level === 1 ? ['x11'] : level === 2 ? ['x12', 'x11'] : ['x11-big', 'x12']);
  if (kind === 'x11') {
    const n = rng.int(2, 9);
    return {
      skill: 'big-tables',
      atoms: ['x11'],
      facts: [[11, n]],
      prompt: `The eleven trick works up to 9. What is $${times(11, n)}$?`,
      ...numeric(11 * n, [
        [11 + n, `That's adding. Eleven lots of ${n}!`],
        [Number(`11${n}`), `Don't glue 11 and ${n}. It's ${n} written twice: ${n}${n}.`],
        [10 * n, `That's ten ${n}s. One more ${n}!`],
      ]),
      explain: `$${times(11, n)} = ${times(10, n)} + ${n} = ${11 * n}$ — the digit twice.`,
    };
  }
  if (kind === 'x12') {
    const b = rng.int(3, 12);
    return {
      skill: 'big-tables',
      atoms: ['x12'],
      facts: [[12, b]],
      prompt: `$${times(12, b)}$: twelve is ten and two.`,
      ...chain([
        { tex: `${times(10, b)} = \\box`, answer: 10 * b },
        { tex: `${times(2, b)} = \\box`, answer: 2 * b },
        { tex: `${10 * b} + ${2 * b} = \\box`, answer: 12 * b, nudges: [{ value: 10 * b + 2, text: `The 2 multiplies the ${b}: $${times(2, b)} = ${2 * b}$.` }] },
      ]),
      explain: `$${times(12, b)} = ${10 * b} + ${2 * b} = ${12 * b}$.`,
    };
  }
  const n = rng.int(10, 12);
  return {
    skill: 'big-tables',
    atoms: ['x11-big'],
    facts: [[11, n]],
    prompt: `The eleven trick breaks after 9. Do $${times(11, n)}$ properly: ten ${n}s and one more.`,
    ...chain([
      { tex: `${times(10, n)} = \\box`, answer: 10 * n },
      {
        tex: `${10 * n} + ${n} = \\box`,
        answer: 11 * n,
        nudges: [{ value: Number(`${n}${n}`), text: `The "digit twice" trick only works up to 9! Add: ${10 * n} + ${n}.` }],
      },
    ]),
    explain: `$${times(11, n)} = ${10 * n} + ${n} = ${11 * n}$.`,
  };
};

const EASY = [1, 2, 5, 10];
const MIDDLE = [3, 4, 9, 11];
const INFAMOUS = new Set(['6×7', '6×8', '7×8', '7×9', '8×9', '6×9']);

/** Which atom a fact belongs to. */
export function factAtom(a: number, b: number): 'easy' | 'middle' | 'tricky' | 'infamous' {
  if (INFAMOUS.has(factKey(a, b))) return 'infamous';
  if (EASY.includes(a) || EASY.includes(b)) return 'easy';
  if (MIDDLE.includes(a) || MIDDLE.includes(b)) return 'middle';
  return 'tricky';
}

const QUIPS = [
  'The skeleton reaches for its holster…',
  'Quick! Before the Dungeon Master rolls!',
  'The door creaks. A number is written on it:',
  'Thog holds up his fingers. He runs out of fingers.',
  'Bard Barry starts a song. The next line is:',
];

/** Picks a fact for the level, weighted towards the weakest ones. */
function pickFact(rng: Rng, level: number, w?: Record<string, number>): [number, number] {
  const allowed = level === 1 ? EASY : level === 2 ? [...EASY, ...MIDDLE] : null;
  const pool: [number, number][] = [];
  for (let a = 2; a <= 12; a++)
    for (let b = 2; b <= 12; b++) {
      if (level < 3 && !allowed!.includes(a) && !allowed!.includes(b)) continue;
      if (level === 3 && (EASY.includes(a) || EASY.includes(b))) continue;
      pool.push([a, b]);
    }
  return rng.weighted(pool, ([a, b]) => (w?.[factKey(a, b)] ?? 1) * (INFAMOUS.has(factKey(a, b)) ? 1.5 : 1));
}

export const quickFacts: Generator = (rng, level, ctx) => {
  const [a, b] = pickFact(rng, level, ctx?.factWeights);
  const p: Problem = {
    skill: 'quick-facts',
    atoms: [factAtom(a, b)],
    facts: [[a, b]],
    prompt: rng.pick(QUIPS),
    math: times(a, b),
    ...numeric(a * b, factNudges(a, b)),
    hint: a === 9 || b === 9 ? `Ten lots, minus one lot.` : `Split one number into two easy pieces.`,
    explain: `$${times(a, b)} = ${a * b}$.`,
  };
  return p;
};
