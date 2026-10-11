/**
 * Region 8 — Beamhook Bay: coordinates, rule tables and straight-line graphs.
 * The story: Captain Polly Gon's lighthouse laser fires at grid points (x, y) to zap the
 * Kraken's fog ships. The aim rule y = 2x + 3 turns "how far along" into "how high up".
 *
 * Stumbling blocks targeted here:
 *  - swapping the coordinates: (3, 5) plotted at (5, 3). "Along the beach, THEN up the tower."
 *  - counting squares instead of lines (off by one), and starting at 1 instead of 0.
 *  - in y = 2x + 3, thinking the line climbs by 3 per step (mixing up step and start).
 *  - evaluating the rule wrongly in a table (gluing digits, adding first, forgetting + b).
 */
import type { Rng } from '../engine/rng';
import type { Answer, Generator, Nudge, PlotPoint } from './types';
import { choice, coef, numeric } from './util';

const r = String.raw;

const SWAP = `Swapped! The **first** number is how far *along* (x), the **second** is how far *up* (y).`;

/** y = mx + b as LaTeX. */
export const ruleTex = (m: number, b: number) =>
  b === 0 ? `y = ${coef(m)}` : `y = ${coef(m)} ${b < 0 ? '-' : '+'} ${Math.abs(b)}`;

const pt = (x: number, y: number) => `(${x}, ${y})`;

/** A table of x and y values with the last y hidden. */
function table(xs: number[], ys: (number | null)[]): string {
  const cols = 'c|' + xs.map(() => 'c').join('');
  const row = (vals: (number | null)[]) =>
    vals.map((v) => (v === null ? r`\box` : String(v))).join(' & ');
  return r`\begin{array}{${cols}} x & ${row(xs)} \\ \hline y & ${row(ys)} \end{array}`;
}

/** Common wrong answers when working out y = mx + b at x. */
function ruleNudges(m: number, b: number, x: number): [number, string][] {
  return [
    [m * x, `Don't forget the $${b < 0 ? '-' : '+'} ${Math.abs(b)}$ at the end!`],
    [m * (x + b), `Multiply first, then add — there are no brackets here.`],
    [Number(`${m}${x}`) + b, r`$${coef(m)}$ isn't glued digits: it means $${m} \times x$.`],
    [x + b, r`The $x$ gets multiplied by ${m} first.`],
  ];
}

// ---------------------------------------------------------------------------
// read-point — what are the coordinates of this dot?

export const readPoint: Generator = (rng, level) => {
  const size = level === 1 ? 6 : 10;
  let x = rng.int(1, size - 1);
  let y = rng.int(1, size - 1);
  while (y === x) y = rng.int(1, size - 1);
  if (level === 3 && rng.chance(0.4)) {
    // On an axis: (0, y) or (x, 0).
    if (rng.chance(0.5)) x = 0;
    else y = 0;
  }
  const visual = { kind: 'plot' as const, size, points: [{ x, y, label: '🚢' }] };
  if (level >= 2 && rng.chance(0.4)) {
    const ask = rng.pick(['x', 'y'] as const);
    return {
      skill: 'read-point',
      prompt:
        ask === 'x'
          ? `How far **along** the beach is the fog ship? (That's its $x$.)`
          : `How far **up** is the fog ship? (That's its $y$.)`,
      visual,
      ...numeric(ask === 'x' ? x : y, [
        [
          ask === 'x' ? y : x,
          ask === 'x'
            ? `That's how far *up*. Along means sideways →.`
            : `That's how far *along*. Up means ↑.`,
        ],
        [(ask === 'x' ? x : y) + 1, `Count the lines from $0$, not the squares from 1.`],
      ]),
      explain: `The ship is at $${pt(x, y)}$: ${x} along, ${y} up.`,
    };
  }
  const ch = choice(rng, `$${pt(x, y)}$`, [
    ...(x !== y ? [{ text: `$${pt(y, x)}$`, nudge: SWAP }] : []),
    { text: `$${pt(x + 1, y + 1)}$`, nudge: `Count from the corner, which is $0$ — not 1.` },
    `$${pt(x, y + 1)}$`,
    `$${pt(x - 1 < 0 ? x + 2 : x - 1, y)}$`,
  ]);
  return {
    skill: 'read-point',
    prompt: `A fog ship! What are its coordinates? (Along first, then up.)`,
    visual,
    ...ch,
    hint: `Walk along the bottom from $0$ until you're under the ship. Then climb up.`,
    explain: `Along ${x}, up ${y}: the ship is at $${pt(x, y)}$.`,
  };
};

// ---------------------------------------------------------------------------
// plot-point — which target is at (a, b)?

const LETTERS = ['A', 'B', 'C', 'D'];

export const plotPoint: Generator = (rng, level) => {
  const size = level === 1 ? 6 : 10;
  let x = rng.int(level === 3 ? 0 : 1, size - 1);
  let y = rng.int(1, size - 1);
  while (y === x) y = rng.int(1, size - 1);
  const pts: { x: number; y: number; nudge?: string }[] = [{ x, y }];
  const add = (p: { x: number; y: number; nudge?: string }) => {
    if (p.x < 0 || p.y < 0 || p.x > size || p.y > size) return;
    if (pts.some((q) => q.x === p.x && q.y === p.y)) return;
    pts.push(p);
  };
  add({ x: y, y: x, nudge: SWAP });
  add({ x: x + 1, y: y + 1, nudge: `Off by one! Start counting at the corner, which is $0$.` });
  add({ x, y: y + 2 });
  add({ x: x + 2, y });
  add({ x: Math.max(0, x - 1), y: Math.min(size, y + 1) });
  for (let i = 0; pts.length < 4 && i < 30; i++) add({ x: rng.int(0, size), y: rng.int(0, size) });
  const chosen = pts.slice(0, 4);
  // Letters go to shuffled points so A isn't always the answer.
  const order = rng.shuffle(chosen.map((_, i) => i));
  const points: PlotPoint[] = order.map((k, i) => ({
    x: chosen[k].x,
    y: chosen[k].y,
    label: LETTERS[i],
  }));
  const answer: Answer = {
    kind: 'choice',
    options: order.map((_, i) => `Target ${LETTERS[i]}`),
    correct: order.indexOf(0),
  };
  const nudges: Nudge[] = [];
  order.forEach((k, i) => {
    const n = chosen[k].nudge;
    if (n && k !== 0) nudges.push({ match: i, text: n });
  });
  return {
    skill: 'plot-point',
    prompt: `Fire the laser at $${pt(x, y)}$! Which target gets zapped?`,
    visual: { kind: 'plot', size, points },
    answer,
    nudges,
    hint: `Go ${x} along the bottom first, then ${y} up.`,
    explain: `$${pt(x, y)}$ means ${x} along, then ${y} up — that's target ${LETTERS[order.indexOf(0)]}.`,
  };
};

// ---------------------------------------------------------------------------
// table-rule — fill in the table for y = mx + b

function pickRule(rng: Rng, level: number): { m: number; b: number } {
  const m = rng.int(level === 1 ? 2 : 1, level === 1 ? 3 : level === 2 ? 4 : 6);
  let b = rng.int(1, level === 1 ? 5 : 9);
  if (level >= 2 && rng.chance(0.3)) b = -rng.int(1, Math.min(m, 3));
  if (m === b) b++;
  return { m, b };
}

export const tableRule: Generator = (rng, level) => {
  const { m, b } = pickRule(rng, level);
  // x = 0 is allowed at level 3 (it shows where the beam starts), but not with a minus.
  const start = level === 3 ? rng.int(b < 0 ? 1 : 0, 3) : rng.int(1, 2);
  const hide = level === 1 ? 3 : rng.int(1, 3);
  const xs = Array.from({ length: hide + 1 }, (_, i) => start + i);
  const ys = xs.map((x, i) => (i < hide ? m * x + b : null));
  const x = xs[hide];
  const y = m * x + b;
  return {
    skill: 'table-rule',
    prompt: `The laser's aim rule is $${ruleTex(m, b)}$. Fill in the gap in the aiming table.`,
    math: table(xs, ys),
    ...numeric(y, ruleNudges(m, b, x)),
    hint: r`Put $x = ${x}$ into the rule: $${m} \times ${x}$, then ${b < 0 ? 'take away' : 'add'} ${Math.abs(b)}.`,
    explain: r`$y = ${m} \times ${x} ${b < 0 ? '-' : '+'} ${Math.abs(b)} = ${m * x} ${b < 0 ? '-' : '+'} ${Math.abs(b)} = ${y}$.`,
  };
};

// ---------------------------------------------------------------------------
// step-pattern — each step along, y climbs by m

export const stepPattern: Generator = (rng, level) => {
  const { m, b } = pickRule(rng, level);
  const kind = level === 1 ? rng.int(0, 1) : rng.int(0, 2);
  if (kind === 0) {
    const xs = [1, 2, 3];
    const ys = xs.map((x) => m * x + b);
    return {
      skill: 'step-pattern',
      prompt: `Look at the laser's y numbers. What comes next, at $x = 4$?`,
      math: table([...xs, 4], [...ys, null]),
      ...numeric(4 * m + b, [
        [ys[2] + 1, `The y numbers don't go up by 1 — look how much they jump each time.`],
        [ys[2] + b, `They jump by ${m} each time, not ${b}.`],
      ]),
      hint: `How much bigger is each y than the one before?`,
      explain: `Each step along, y jumps up by ${m}: $${ys[2]} + ${m} = ${4 * m + b}$.`,
    };
  }
  if (kind === 1) {
    return {
      skill: 'step-pattern',
      prompt: `With the rule $${ruleTex(m, b)}$, every time $x$ goes up by 1, how much does $y$ go up?`,
      ...numeric(m, [
        [
          b,
          `The $${b < 0 ? '-' : '+'} ${Math.abs(b)}$ is where the beam *starts*. The climb comes from the number stuck to $x$.`,
        ],
        [m + b, `Just the climb! Only the $${coef(m)}$ part changes when $x$ changes.`],
      ]),
      hint: `Try $x = 1$ and $x = 2$. How much did $y$ change?`,
      explain: r`$${coef(m)}$ means $${m} \times x$: one more $x$ adds ${m} more. So each step along, y climbs ${m}.`,
    };
  }
  const x1 = rng.int(1, 3);
  const far = x1 + rng.int(2, 4);
  const y1 = m * x1 + b;
  return {
    skill: 'step-pattern',
    prompt: r`The beam passes $${pt(x1, y1)}$ and $${pt(x1 + 1, y1 + m)}$. Where is it at $x = ${far}$?`,
    ...numeric(m * far + b, [
      [y1 + m + (far - x1 - 1), `It climbs ${m} for **every** step, not 1.`],
      [y1 + m, `That's at $x = ${x1 + 1}$. Keep stepping until $x = ${far}$!`],
    ]),
    hint: `From $x = ${x1}$ to $x = ${far}$ is ${far - x1} steps. Each step climbs ${m}.`,
    explain: r`${far - x1} steps of ${m}: $${y1} + ${far - x1} \times ${m} = ${m * far + b}$.`,
  };
};

// ---------------------------------------------------------------------------
// line-rule — read the rule off a graph: start (x = 0) and step

export const lineRule: Generator = (rng, level) => {
  const m = rng.int(1, 3);
  let b = rng.int(level === 1 ? 1 : 0, 4);
  if (b === m) b = m === 4 ? 1 : b + 1;
  const xsOn = [0, 1, 2, 3].filter((x) => m * x + b <= 10);
  const visual = {
    kind: 'plot' as const,
    size: 10,
    line: { m, b },
    points: xsOn.map((x) => ({ x, y: m * x + b })),
  };
  const kind = level === 1 ? rng.int(0, 1) : rng.int(0, 2);
  if (kind === 0) {
    return {
      skill: 'line-rule',
      prompt: `Where does the laser beam start — at $x = 0$, how high is it?`,
      visual,
      ...numeric(b, [
        [m, `That's how much it *climbs* each step. Look where it touches the up-line at $x = 0$.`],
      ]),
      explain: `At $x = 0$ the beam is at height ${b}. That's the $+ ${b}$ in the rule $${ruleTex(m, b)}$.`,
    };
  }
  if (kind === 1) {
    const ch = choice(rng, `$${ruleTex(m, b)}$`, [
      {
        text: `$${ruleTex(b === 0 ? m + 1 : b, m)}$`,
        nudge: `Swapped! The climb per step goes with $x$; the start is the number added on.`,
      },
      { text: `$${ruleTex(m, 0)}$`, nudge: `This beam doesn't start at $0$ — look at $x = 0$.` },
      `$${ruleTex(1, b + m)}$`,
      `$${ruleTex(m + 1, b)}$`,
    ]);
    return {
      skill: 'line-rule',
      prompt: `Which aim rule makes this laser beam?`,
      visual,
      ...ch,
      hint: `Where does it start at $x = 0$? How much does it climb each step?`,
      explain: `It starts at ${b} and climbs ${m} each step: $${ruleTex(m, b)}$.`,
    };
  }
  // Is a point on the beam?
  const x0 = rng.int(1, 4);
  const y0 = m * x0 + b;
  const variant = rng.int(0, 2);
  const [px, py] = variant === 0 ? [x0, y0] : variant === 1 && y0 !== x0 ? [y0, x0] : [x0, y0 + 1];
  const on = m * px + b === py;
  const yes = `Yes — the beam hits it`;
  const no = `No — the beam misses`;
  return {
    skill: 'line-rule',
    prompt: r`The beam follows $${ruleTex(m, b)}$. Will it zap a ship at $${pt(px, py)}$?`,
    answer: { kind: 'choice', options: [yes, no], correct: on ? 0 : 1 },
    nudges: [
      {
        match: on ? 1 : 0,
        text:
          variant === 1 && !on
            ? `Careful which number is $x$! Put the **first** number, ${px}, into the rule.`
            : r`Put $x = ${px}$ into the rule: $${m} \times ${px} + ${b} = ${m * px + b}$. Is that ${py}?`,
      },
    ],
    explain: r`At $x = ${px}$: $y = ${m} \times ${px} + ${b} = ${m * px + b}$. ${on ? `That's ${py} — zap!` : `Not ${py}, so it misses.`}`,
  };
};
