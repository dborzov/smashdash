/**
 * Pure logic behind the mini-games (their UI lives in src/ui/games). Every game judges each
 * move the moment it's made and says something useful about it — the point is to *see* why,
 * not to be marked. Tested in tests/games.test.ts; `validateGame` is used by the content and
 * generator tests to make sure every game can actually be won.
 */
import type { GameSpec, ChainStep } from '../skills/types';
import type { Widget } from '../content/schema';
import { sizeById } from '../content';
import { sameNumber } from '../engine/answer';
import { Rng } from '../engine/rng';
import { fmt } from '../skills/util';

export type Verdict = { ok: true; text?: string } | { ok: false; text: string; near?: boolean };

// ---------------------------------------------------------------------------
// Chain: a row of small steps, each with its own answer

export function stepVerdict(step: ChainStep, given: number): Verdict {
  if (step.options) {
    if (given === step.answer) return { ok: true, text: step.note };
    const n = step.nudges?.find((x) => x.value === given);
    return { ok: false, text: n?.text ?? 'Not that one — think about this step again.', near: !!n };
  }
  const tol = step.tolerance ?? 0;
  if (Math.abs(given - step.answer) <= tol + 1e-9 || sameNumber(given, step.answer))
    return { ok: true, text: step.note };
  const n = step.nudges?.find((x) => sameNumber(x.value, given));
  if (n) return { ok: false, text: n.text, near: true };
  if (step.answer !== 0 && sameNumber(given, -step.answer))
    return { ok: false, text: 'So close — check the **sign**!', near: true };
  if (step.answer !== 0 && given !== 0)
    for (const f of [10, 100, 1000, 0.1, 0.01, 0.001])
      if (sameNumber(given / step.answer, f))
        return { ok: false, text: 'Right digits — check the number of **zeros**.', near: true };
  return {
    ok: false,
    text: given > step.answer ? 'Too big — have another go.' : 'Too small — have another go.',
  };
}

// ---------------------------------------------------------------------------
// Arrays

export function arrayBuildVerdict(
  spec: Extract<Widget, { kind: 'array' }>,
  rows: number,
  cols: number,
): Verdict {
  const target = spec.target ?? spec.rows * spec.cols;
  const n = rows * cols;
  if (spec.fixRows && rows !== spec.rows)
    return { ok: false, text: `It has to be **${spec.rows} rows** — the gems go on ${spec.rows} shelves.` };
  if (n === target) return { ok: true, text: `$${rows} \\times ${cols} = ${n}$ — exactly ${target}!` };
  if (rows + cols === target)
    return {
      ok: false,
      text: `$${rows} + ${cols} = ${target}$, but an array is rows **times** columns: $${rows} \\times ${cols} = ${n}$ gems.`,
      near: true,
    };
  const per = spec.fixRows ? `Each extra column adds ${rows} gems.` : '';
  return {
    ok: false,
    text:
      n < target
        ? `$${rows} \\times ${cols} = ${n}$ — ${target - n} short. ${per}`
        : `$${rows} \\times ${cols} = ${n}$ — ${n - target} too many. ${per}`,
    near: Math.abs(n - target) <= rows,
  };
}

/** Every rows × cols (each 1–max) that makes `target`. */
export function factorPairs(target: number, max = 12): [number, number][] {
  const out: [number, number][] = [];
  for (let r = 1; r <= max; r++) if (target % r === 0 && target / r <= max) out.push([r, target / r]);
  return out;
}

// ---------------------------------------------------------------------------
// Skip-counting frog

export function hopVerdict(step: number, from: number, tapped: number): Verdict {
  const want = from + step;
  if (tapped === want) return { ok: true };
  if (tapped === from + 1)
    return { ok: false, text: `That's only 1 step. The frog jumps **${step}** at a time.`, near: true };
  if (Math.abs(tapped - want) <= 2)
    return { ok: false, text: `Nearly! From ${from}, count on exactly ${step}.`, near: true };
  return { ok: false, text: `The frog is on ${from} and jumps ${step}. Where does it land?` };
}

// ---------------------------------------------------------------------------
// Times-table grid

export function cellsEqual(target: number, size: number): [number, number][] {
  const out: [number, number][] = [];
  for (let r = 1; r <= size; r++)
    for (let c = 1; c <= size; c++) if (r * c === target) out.push([r, c]);
  return out;
}

export function findVerdict(target: number, r: number, c: number): Verdict {
  if (r * c === target) return { ok: true, text: `$${r} \\times ${c} = ${target}$ ✓` };
  if (r + c === target)
    return { ok: false, text: `$${r} + ${c} = ${target}$, but this table is **times**: $${r} \\times ${c} = ${r * c}$.`, near: true };
  return { ok: false, text: `That room is $${r} \\times ${c} = ${r * c}$, not ${target}.` };
}

// ---------------------------------------------------------------------------
// Scale Ladder (powers of ten)

/** Log-distance allowed between a thing's size and the stop it is put on. */
export const SIZE_TOL = 0.6;

export function sizeVerdict(id: string, exp: number): Verdict {
  const c = sizeById[id];
  if (!c) return { ok: false, text: 'Unknown thing.' };
  const d = Math.log10(c.m) - exp;
  if (Math.abs(d) <= SIZE_TOL) return { ok: true, text: `${c.icon} ${c.name}: ${sizeText(c.m)}. ${c.fact}` };
  const steps = Math.round(Math.abs(d));
  const times = steps <= 0 ? '' : `about ${fmtPow(steps)} times`;
  return {
    ok: false,
    text:
      d > 0
        ? `Too small — ${c.name.toLowerCase()} is ${times} bigger than that.`
        : `Too big — ${c.name.toLowerCase()} is ${times} smaller than that.`,
    near: steps <= 1,
  };
}

const fmtPow = (k: number) => ['one', 'ten', 'a hundred', 'a thousand', 'ten thousand', 'a hundred thousand', 'a million'][k] ?? `$10^{${k}}$`;

/** The stop a thing belongs on. */
export const sizeExp = (m: number) => Math.round(Math.log10(m));

/** "5 mm", "1.4 m", "12,742 km", "about 100,000 light years". */
export function sizeText(m: number): string {
  const nice = (v: number) => {
    const s = v >= 100 ? Math.round(v).toLocaleString('en-US') : fmt(parseFloat(v.toPrecision(2)));
    return s;
  };
  const LY = 9.461e15;
  if (m >= LY / 10) return `${nice(m / LY)} light years`;
  if (m >= 1e9) return `${nice(m / 1e9)} million km`;
  if (m >= 1000) return `${nice(m / 1000)} km`;
  if (m >= 1) return `${nice(m)} m`;
  if (m >= 0.01) return `${nice(m * 100)} cm`;
  if (m >= 0.001) return `${nice(m * 1000)} mm`;
  if (m >= 1e-6) return `${nice(m * 1e6)} micrometres`;
  if (m >= 1e-9) return `${nice(m * 1e9)} nanometres`;
  return `${nice(m * 1e12)} picometres`;
}

/** Label for a stop on the Scale Ladder: "1 mm", "10 km", … */
export function stopLabel(e: number): string {
  const named: Record<number, string> = {
    [-15]: 'a femtometre', [-12]: '1 picometre', [-9]: '1 nanometre', [-6]: '1 micrometre',
    [-3]: '1 mm', [-2]: '1 cm', [-1]: '10 cm', 0: '1 m', 1: '10 m', 2: '100 m', 3: '1 km',
    4: '10 km', 5: '100 km', 6: '1,000 km', 7: '10,000 km', 9: 'a million km',
    16: '1 light year',
  };
  return named[e] ?? '';
}

export function sizeRange(items: string[]): [number, number] {
  const es = items.map((id) => sizeExp(sizeById[id]?.m ?? 1));
  return [Math.min(...es) - 1, Math.max(...es) + 1];
}

// ---------------------------------------------------------------------------
// Sampler: count one patch, scale up

export function samplerCounts(spec: Extract<Widget, { kind: 'sampler' }>): number[] {
  const cells = spec.grid * spec.grid;
  const rng = new Rng(spec.seed);
  const base = spec.n / cells;
  const counts = Array.from({ length: cells }, () => Math.max(1, Math.round(base * (0.88 + rng.next() * 0.24))));
  // Make them add up to n exactly, a dot at a time, spread out.
  let diff = spec.n - counts.reduce((a, b) => a + b, 0);
  for (let i = 0; diff !== 0 && i < 100000; i++) {
    const k = rng.int(0, cells - 1);
    if (diff > 0) {
      counts[k]++;
      diff--;
    } else if (counts[k] > 1) {
      counts[k]--;
      diff++;
    }
  }
  return counts;
}

/** Dot positions (0–1 inside their cell), stable for a seed. */
export function samplerDots(spec: Extract<Widget, { kind: 'sampler' }>): { cell: number; x: number; y: number }[] {
  const rng = new Rng(spec.seed + 7);
  const out: { cell: number; x: number; y: number }[] = [];
  samplerCounts(spec).forEach((n, cell) => {
    for (let i = 0; i < n; i++) out.push({ cell, x: 0.08 + rng.next() * 0.84, y: 0.08 + rng.next() * 0.84 });
  });
  return out;
}

/** Steps after counting a patch of `count`: how many patches, then the estimate. */
export function samplerSteps(grid: number, count: number): ChainStep[] {
  const cells = grid * grid;
  return [
    {
      tex: `${grid} \\times ${grid} = \\box \\text{ patches}`,
      answer: cells,
      nudges: [{ value: grid * 2, text: `The board is ${grid} patches **by** ${grid} patches: that's ${grid} times ${grid}.` }],
    },
    {
      tex: `${count} \\times ${cells} \\approx \\box`,
      answer: count * cells,
      say: `Every patch has about ${count}.`,
      nudges: [
        { value: count, text: "That's just one patch! There are lots of them." },
        { value: count * grid, text: `That's one row of patches. There are ${grid} rows!` },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Balloon: balloons lift (+1), sandbags pull (−1)

export interface BalloonState {
  b: number;
  s: number;
}
export const altitude = (st: BalloonState) => st.b - st.s;

export function balloonStart(start: number): BalloonState {
  return start >= 0 ? { b: start, s: 0 } : { b: 0, s: -start };
}

export function balloonTarget(spec: Extract<Widget, { kind: 'balloon' }>): number | null {
  if (!spec.op || spec.k === undefined) return null;
  return spec.op === 'add' ? spec.start + spec.k : spec.start - spec.k;
}

export function balloonTex(spec: Extract<Widget, { kind: 'balloon' }>): string {
  const k = spec.k ?? 0;
  const kk = k < 0 ? `(${k})` : `${k}`;
  return `${spec.start} ${spec.op === 'sub' ? '-' : '+'} ${kk}`;
}

/** Judges where the balloon ended up. */
export function balloonVerdict(spec: Extract<Widget, { kind: 'balloon' }>, at: number, st: BalloonState): Verdict {
  const want = balloonTarget(spec);
  if (want === null) return { ok: true };
  const k = spec.k ?? 0;
  const start = balloonStart(spec.start);
  if (at === want) {
    // Right height. Say *why* when it went up by taking sandbags away, or down by popping.
    if (spec.op === 'sub' && k < 0)
      return {
        ok: true,
        text:
          st.s < start.s
            ? `Taking away ${-k} sandbag${k < -1 ? 's' : ''} lifts you ${-k}: $- (${k}) = + ${-k}$.`
            : `Same height as taking away ${-k} sandbags would give: $- (${k}) = + ${-k}$!`,
      };
    if (spec.op === 'add' && k < 0) return { ok: true, text: `Adding ${-k} sandbag${k < -1 ? 's' : ''} pulls you down: $+ (${k}) = - ${-k}$.` };
    return { ok: true };
  }
  if (spec.op === 'sub' && k < 0 && at === spec.start + k)
    return {
      ok: false,
      near: true,
      text: `Subtracting $${k}$ means taking **away** ${-k} sandbag${k < -1 ? 's' : ''}. Fewer sandbags — which way do you go?`,
    };
  if (spec.op === 'add' && k < 0 && at === spec.start - k)
    return { ok: false, near: true, text: `Adding $${k}$ means adding ${-k} **sandbags**. More weight — which way?` };
  if (spec.op === 'sub' && k > 0 && at === spec.start + k)
    return { ok: false, near: true, text: `Subtracting ${k} means ${k} balloons **gone**. Down you go.` };
  return { ok: false, text: `You're at ${at}. The sum is $${balloonTex(spec)}$ — try it again, one change at a time.` };
}

// ---------------------------------------------------------------------------
// Sorter: like terms

export type TermKind = 'x' | 'x2' | 'y' | 'n';
export interface Term {
  kind: TermKind;
  coef: number;
  tex: string;
}

/** '3x' → 3x, '-x' → −1x, 'x^2' → x², '5' → 5, '-2y' → −2y. */
export function parseTerm(t: string): Term {
  const m = /^([+-]?)(\d*)(x\^2|x|y)?$/.exec(t.replace(/\s+/g, ''));
  if (!m) throw new Error(`bad term ${t}`);
  const sign = m[1] === '-' ? -1 : 1;
  const kind: TermKind = m[3] === 'x^2' ? 'x2' : m[3] === 'x' ? 'x' : m[3] === 'y' ? 'y' : 'n';
  const coef = sign * (m[2] ? Number(m[2]) : kind === 'n' ? NaN : 1);
  if (Number.isNaN(coef)) throw new Error(`bad term ${t}`);
  return { kind, coef, tex: t.replace('x^2', 'x^{2}') };
}

export const BIN_NAME: Record<TermKind, string> = { x2: '$x^2$ pile', x: '$x$ pile', y: '$y$ pile', n: 'number pile' };

export function binVerdict(term: Term, bin: TermKind): Verdict {
  if (term.kind === bin) return { ok: true };
  const t = `$${term.tex}$`;
  if (term.kind === 'x2' && bin === 'x')
    return { ok: false, near: true, text: `${t} is $x \\times x$ — a box full of boxes. Not the same kind as $x$.` };
  if (term.kind === 'x' && bin === 'x2')
    return { ok: false, near: true, text: `${t} is plain boxes, not $x^2$ (that's $x \\times x$).` };
  if (term.kind === 'n')
    return { ok: false, text: `${t} has no letter: it's just coins. It goes with the numbers.` };
  if (bin === 'n') return { ok: false, text: `${t} has a letter in it — it's not a plain number.` };
  return { ok: false, text: `${t} is ${term.kind === 'y' ? 'a $y$' : 'an $x$'} term. $x$ and $y$ are different mystery boxes!` };
}

/** Total of each kind, in pile order. */
export function sortTotals(terms: string[]): { kind: TermKind; total: number }[] {
  const order: TermKind[] = ['x2', 'x', 'y', 'n'];
  const ts = terms.map(parseTerm);
  return order
    .filter((k) => ts.some((t) => t.kind === k))
    .map((k) => ({ kind: k, total: ts.filter((t) => t.kind === k).reduce((a, t) => a + t.coef, 0) }));
}

const KIND_TEX: Record<TermKind, string> = { x2: 'x^{2}', x: 'x', y: 'y', n: '' };

/** 3x² + 2x − 5, from the pile totals. */
export function totalsTex(totals: { kind: TermKind; total: number }[]): string {
  let s = '';
  for (const { kind, total } of totals) {
    if (total === 0) continue;
    const mag = Math.abs(total);
    const body = kind === 'n' ? `${mag}` : `${mag === 1 ? '' : mag}${KIND_TEX[kind]}`;
    s += s === '' ? (total < 0 ? `-${body}` : body) : total < 0 ? ` - ${body}` : ` + ${body}`;
  }
  return s || '0';
}

// ---------------------------------------------------------------------------
// Fruit puzzles (simultaneous equations in pictures)

type FruitSpec = Extract<Widget, { kind: 'fruit' }>;

export function fruitsIn(spec: FruitSpec): string[] {
  const seen: string[] = [];
  for (const r of spec.rows) for (const f of r.items) if (!seen.includes(f)) seen.push(f);
  return seen;
}

/** A row reads true with these values. */
export const rowHolds = (row: FruitSpec['rows'][number], v: Record<string, number>) =>
  sameNumber(row.items.reduce((a, f) => a + (v[f] ?? NaN), 0), row.total);

/** Could this fruit be worked out once `known` fruit are known? (a row where it's the only unknown) */
export function solvableNext(spec: FruitSpec, fruit: string, known: string[]): boolean {
  return spec.rows.some((r) => r.items.includes(fruit) && r.items.every((f) => f === fruit || known.includes(f)));
}

export function fruitVerdict(spec: FruitSpec, fruit: string, given: number, known: string[]): Verdict {
  const want = spec.values[fruit];
  if (sameNumber(given, want)) return { ok: true };
  // A row where this fruit is the only unknown left: the classic slips there.
  const row = spec.rows.find((r) => r.items.includes(fruit) && r.items.every((f) => f === fruit || known.includes(f)));
  if (row) {
    const n = row.items.filter((f) => f === fruit).length;
    const rest = row.items.filter((f) => f !== fruit).reduce((a, f) => a + spec.values[f], 0);
    if (sameNumber(given, row.total))
      return { ok: false, near: true, text: `${row.total} is the whole row. Take away what you know, then share between the ${fruit}.` };
    if (n > 1 && sameNumber(given, row.total - rest))
      return { ok: false, near: true, text: `That's what all ${n} ${fruit} are worth together. One ${fruit} is…` };
    if (rest > 0 && sameNumber(given, (row.total + rest) / n))
      return { ok: false, near: true, text: `Take the other fruit **away** from the total, don't add them.` };
  }
  return { ok: false, text: `Check it: put ${given} in for ${fruit} — does a row still add up?` };
}

// ---------------------------------------------------------------------------
// Inequalities on a number line

export interface IneqPick {
  at: number;
  closed: boolean;
  /** Shade to the right (bigger numbers)? */
  right: boolean;
}

export function ineqVerdict(spec: Extract<Widget, { kind: 'ineqline' }>, pick: IneqPick): Verdict {
  const closed = spec.op === '<=' || spec.op === '>=';
  const right = spec.op === '>' || spec.op === '>=';
  const sym = { '<': '<', '>': '>', '<=': '\\le', '>=': '\\ge' }[spec.op];
  if (pick.at !== spec.value)
    return { ok: false, text: `The edge of $x ${sym} ${spec.value}$ is at ${spec.value}. Put the dot there.`, near: Math.abs(pick.at - spec.value) <= 1 };
  if (pick.right !== right)
    return {
      ok: false,
      near: true,
      text: right
        ? `$x ${sym} ${spec.value}$: $x$ is **bigger** — bigger numbers are to the right.`
        : `$x ${sym} ${spec.value}$: $x$ is **smaller** — smaller numbers are to the left.`,
    };
  if (pick.closed !== closed)
    return {
      ok: false,
      near: true,
      text: closed
        ? `${spec.value} itself counts here ($${sym}$ has the "or equal" line), so the dot is **filled in**.`
        : `${spec.value} itself doesn't count ($${spec.value} ${sym} ${spec.value}$ is false!), so the dot is **open**.`,
    };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Matchsticks: growing patterns

/** Sticks in stage n: squares 3n + 1, triangles 2n + 1, houses 5n + 1 (walls are shared). */
export function sticks(shape: 'squares' | 'triangles' | 'houses', n: number): number {
  return shape === 'squares' ? 3 * n + 1 : shape === 'triangles' ? 2 * n + 1 : 5 * n + 1;
}

// ---------------------------------------------------------------------------
// Checks and summaries

/** Why a game can't be won as written (null when it's fine). */
export function validateGame(g: GameSpec | Widget): string | null {
  switch (g.kind) {
    case 'chain':
      for (const [i, st] of g.steps.entries()) {
        if (st.options && (st.answer < 0 || st.answer >= st.options.length || !Number.isInteger(st.answer)))
          return `step ${i}: answer is not an option index`;
        for (const n of st.nudges ?? [])
          if (sameNumber(n.value, st.answer)) return `step ${i}: a nudge equals the answer`;
        if (!st.tex.includes('\\box') && !st.options) return `step ${i}: no \\box to fill`;
      }
      return null;
    case 'array':
      if (g.mode === 'build') {
        const t = g.target ?? g.rows * g.cols;
        if (g.fixRows ? t % g.rows !== 0 || t / g.rows > 12 : factorPairs(t).length === 0)
          return `array: can't build ${t}`;
      }
      if (g.mode === 'split' && g.rows < 2) return 'array: nothing to split';
      return null;
    case 'skipjump':
      return (g.start ?? 0) + g.step * g.jumps > 150 ? 'skipjump: too long' : null;
    case 'tablegrid':
      if (g.mode === 'find' && (!g.target || cellsEqual(g.target, g.size ?? 10).length === 0))
        return `tablegrid: ${g.target} isn't in the table`;
      if (g.mode === 'row' && (!g.row || g.row > (g.size ?? 10))) return 'tablegrid: bad row';
      return null;
    case 'sizeline': {
      for (const id of g.items) if (!sizeById[id]) return `sizeline: unknown size ${id}`;
      const [lo, hi] = [g.min, g.max];
      if (lo !== undefined && hi !== undefined)
        for (const id of g.items) {
          const e = sizeExp(sizeById[id].m);
          if (e < lo || e > hi) return `sizeline: ${id} off the ladder`;
        }
      return null;
    }
    case 'sampler':
      return g.n / (g.grid * g.grid) > 40 ? 'sampler: too many dots per patch' : null;
    case 'balloon': {
      const t = balloonTarget(g);
      return t !== null && Math.abs(t) > 12 ? 'balloon: target off the scale' : null;
    }
    case 'sorter':
      try {
        g.terms.forEach(parseTerm);
      } catch (e) {
        return (e as Error).message;
      }
      return null;
    case 'fruit': {
      for (const [i, r] of g.rows.entries()) if (!rowHolds(r, g.values)) return `fruit: row ${i} doesn't add up`;
      const ask = g.ask ?? fruitsIn(g);
      const known: string[] = [];
      for (const f of ask) {
        if (g.values[f] === undefined) return `fruit: no value for ${f}`;
        if (!solvableNext(g, f, known)) return `fruit: ${f} can't be worked out yet`;
        known.push(f);
      }
      return null;
    }
    case 'ineqline':
      return g.value <= g.min || g.value >= g.max ? 'ineqline: edge not on the line' : null;
  }
  return null;
}

/** The answer in words, for the content preview. */
export function gameAnswerText(g: GameSpec): string {
  switch (g.kind) {
    case 'chain':
      return g.steps.map((s) => (s.options ? s.options[s.answer] : `$${fmt(s.answer)}$`)).join(' → ');
    case 'array':
      return g.mode === 'build' ? `make ${g.target ?? g.rows * g.cols}` : `${g.rows} × ${g.cols}`;
    case 'skipjump':
      return `hops of ${g.step}: ${Array.from({ length: g.jumps }, (_, i) => (g.start ?? 0) + g.step * (i + 1)).join(', ')}`;
    case 'tablegrid':
      return g.mode === 'find' ? `${g.target}: ${cellsEqual(g.target!, g.size ?? 10).map(([r, c]) => `${r}×${c}`).join(', ')}` : g.mode;
    case 'sizeline':
      return g.items.map((id) => `${sizeById[id]?.icon} $10^{${sizeExp(sizeById[id]?.m ?? 1)}}$`).join(', ');
    case 'sampler':
      return `about ${g.n}`;
    case 'balloon':
      return `$${balloonTex(g)} = ${balloonTarget(g)}$`;
    case 'sorter':
      return `$${totalsTex(sortTotals(g.terms))}$`;
    case 'fruit':
      return Object.entries(g.values).map(([f, v]) => `${f} = ${v}`).join(', ');
    case 'ineqline':
      return `$x ${{ '<': '<', '>': '>', '<=': '\\le', '>=': '\\ge' }[g.op]} ${g.value}$`;
    case 'squaregrow':
      return `up to ${g.upto * g.upto}`;
  }
}
