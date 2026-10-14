/**
 * EQcanvas — the logic behind the equation slate (src/ui/eqcanvas/EqCanvas.tsx).
 *
 * Pure and tested (tests/eqcanvas.test.ts). It knows how to:
 *  - read an equation from tiles the player dragged onto the slate (`parseEquation`), with
 *    kid-friendly syntax errors that point at the offending tile;
 *  - decide whether the player's equation tells the story (`checkBuild`): equivalent to the
 *    target, a predicted trap, a decoy number, an unused number, or which pieces are off;
 *  - say an equation back in words (`readEquation`), using what each number means;
 *  - apply a move to both sides (`applyMove`), tidy the result (`tidy`), judge whether the
 *    move helped (`assessMove`) and suggest the next one (`bestMove`, `solveSteps`).
 *
 * Numbers are exact fractions so that a "bad" move (dividing too early) shows honest
 * fractions instead of floating point noise.
 */
import { fmt, tex as texNum } from '../skills/util';

// ---------------------------------------------------------------------------
// Fractions

export interface Frac {
  n: number;
  d: number;
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

export function frac(n: number, d = 1): Frac {
  if (d === 0) throw new Error('division by zero');
  if (!Number.isInteger(n) || !Number.isInteger(d)) {
    // Decimals like 1.5: scale up to whole numbers first.
    let s = 1;
    while ((!Number.isInteger(n * s) || !Number.isInteger(d * s)) && s < 1e6) s *= 10;
    n = Math.round(n * s);
    d = Math.round(d * s);
  }
  const g = gcd(n, d);
  const sign = d < 0 ? -1 : 1;
  return { n: (sign * n) / g || 0, d: (sign * d) / g };
}

export const fAdd = (a: Frac, b: Frac) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
export const fSub = (a: Frac, b: Frac) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
export const fMul = (a: Frac, b: Frac) => frac(a.n * b.n, a.d * b.d);
export const fDiv = (a: Frac, b: Frac) => frac(a.n * b.d, a.d * b.n);
export const fEq = (a: Frac, b: Frac) => a.n === b.n && a.d === b.d;
export const fZero = (a: Frac) => a.n === 0;
export const fInt = (a: Frac) => a.d === 1;
export const fVal = (a: Frac) => a.n / a.d;
const ONE = frac(1);

/** LaTeX for a fraction: 51, -3, \frac{51}{8}. */
export function fracTex(f: Frac): string {
  if (f.d === 1) return texNum(f.n);
  const s = `\\frac{${texNum(Math.abs(f.n))}}{${texNum(f.d)}}`;
  return f.n < 0 ? `-${s}` : s;
}

// ---------------------------------------------------------------------------
// Tokens (what the player drags) and the expression tree

export type OpSym = '+' | '-' | '*' | '/';

export type Tok =
  | { k: 'num'; v: number; tile?: number }
  | { k: 'x' }
  | { k: 'op'; op: OpSym }
  | { k: '=' }
  | { k: '(' }
  | { k: ')' };

export type Expr =
  | { t: 'num'; v: Frac; span?: [number, number] }
  | { t: 'x'; span?: [number, number] }
  | {
      t: OpSym;
      a: Expr;
      b: Expr;
      span?: [number, number];
      /** Written without a sign (8x, 3(x + 2)). */
      implicit?: boolean;
      /** The player put brackets round it. */
      paren?: boolean;
      /** The move just applied to both sides: drawn highlighted. */
      hl?: boolean;
    };

export interface Equation {
  l: Expr;
  r: Expr;
}

export const num = (v: Frac | number): Expr => ({
  t: 'num',
  v: typeof v === 'number' ? frac(v) : v,
});
export const X: Expr = { t: 'x' };
const bin = (t: OpSym, a: Expr, b: Expr, extra: Partial<Expr> = {}): Expr =>
  ({ t, a, b, ...extra }) as Expr;

const isNum = (e: Expr): e is Extract<Expr, { t: 'num' }> => e.t === 'num';
export const hasX = (e: Expr): boolean =>
  e.t === 'x' ? true : e.t === 'num' ? false : hasX(e.a) || hasX(e.b);

/** Text equations used by generators and content: "8x+3=51", "x/4=6", "3(x+2)=21". */
export function lex(s: string): Tok[] {
  const out: Tok[] = [];
  const src = s.replace(/\s+/g, '').replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/');
  for (let i = 0; i < src.length;) {
    const c = src[i];
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      out.push({ k: 'num', v: Number(src.slice(i, j)) });
      i = j;
      continue;
    }
    if (c === 'x') out.push({ k: 'x' });
    else if (c === '=') out.push({ k: '=' });
    else if (c === '(' || c === ')') out.push({ k: c });
    else if ('+-*/'.includes(c)) out.push({ k: 'op', op: c as OpSym });
    else throw new Error(`bad character "${c}" in equation "${s}"`);
    i++;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Parsing what is on the slate

export type SyntaxCode =
  | 'empty'
  | 'no-equals'
  | 'two-equals'
  | 'left-empty'
  | 'right-empty'
  | 'op-start'
  | 'two-ops'
  | 'dangling'
  | 'glued'
  | 'num-after-x'
  | 'x-times-x'
  | 'unclosed'
  | 'stray-close'
  | 'empty-brackets';

export interface SyntaxError {
  code: SyntaxCode;
  /** Index of the tile to point at (-1: none in particular). */
  at: number;
}

export type ParseResult = { ok: true; eq: Equation } | { ok: false; err: SyntaxError };

class Fail {
  constructor(public err: SyntaxError) {}
}

function parseSide(toks: Tok[], from: number, to: number): Expr {
  let pos = from;
  const peek = () => (pos < to ? toks[pos] : undefined);
  const fail = (code: SyntaxCode, at = pos): never => {
    throw new Fail({ code, at });
  };

  const factor = (): Expr => {
    const t = peek();
    const at = pos;
    if (!t) return fail('dangling', pos - 1);
    if (t.k === 'num') {
      pos++;
      return { t: 'num', v: frac(t.v), span: [at, at + 1] };
    }
    if (t.k === 'x') {
      pos++;
      return { t: 'x', span: [at, at + 1] };
    }
    if (t.k === '(') {
      pos++;
      if (peek()?.k === ')') fail('empty-brackets', at);
      const e = expr();
      if (peek()?.k !== ')') fail('unclosed', at);
      pos++;
      if (e.t === 'num' || e.t === 'x') return { ...e, span: [at, pos] };
      return { ...e, paren: true, span: [at, pos] };
    }
    if (t.k === ')') return fail('stray-close');
    if (t.k === 'op') return fail(pos === from ? 'op-start' : 'two-ops');
    return fail('dangling', pos - 1);
  };

  const term = (): Expr => {
    let e = factor();
    for (;;) {
      const t = peek();
      if (!t) return e;
      if (t.k === 'op' && (t.op === '*' || t.op === '/')) {
        const opAt = pos;
        pos++;
        if (!peek()) fail('dangling', opAt);
        const b = factor();
        e = bin(t.op, e, b, { span: [e.span![0], b.span![1]] });
        continue;
      }
      if (t.k === 'num' || t.k === 'x' || t.k === '(') {
        // Implicit multiplication: 8x, 3(x + 2). Catch the ones kids trip over.
        const last = toks[pos - 1];
        if (t.k === 'num' && last.k === 'num') fail('glued');
        if (t.k === 'num') fail('num-after-x');
        if (t.k === 'x' && hasX(e)) fail('x-times-x');
        const b = factor();
        e = bin('*', e, b, { implicit: true, span: [e.span![0], b.span![1]] });
        continue;
      }
      return e;
    }
  };

  const expr = (): Expr => {
    let e = term();
    for (;;) {
      const t = peek();
      if (!t || t.k !== 'op' || (t.op !== '+' && t.op !== '-')) return e;
      const opAt = pos;
      pos++;
      if (!peek()) fail('dangling', opAt);
      const b = term();
      e = bin(t.op, e, b, { span: [e.span![0], b.span![1]] });
    }
  };

  const e = expr();
  if (pos < to) fail(toks[pos].k === ')' ? 'stray-close' : 'two-ops');
  return e;
}

export function parseEquation(toks: Tok[]): ParseResult {
  if (toks.length === 0) return { ok: false, err: { code: 'empty', at: -1 } };
  const eqs = toks.map((t, i) => (t.k === '=' ? i : -1)).filter((i) => i >= 0);
  if (eqs.length === 0) return { ok: false, err: { code: 'no-equals', at: -1 } };
  if (eqs.length > 1) return { ok: false, err: { code: 'two-equals', at: eqs[1] } };
  const m = eqs[0];
  if (m === 0) return { ok: false, err: { code: 'left-empty', at: m } };
  if (m === toks.length - 1) return { ok: false, err: { code: 'right-empty', at: m } };
  try {
    return { ok: true, eq: { l: parseSide(toks, 0, m), r: parseSide(toks, m + 1, toks.length) } };
  } catch (e) {
    if (e instanceof Fail) return { ok: false, err: e.err };
    throw e;
  }
}

/** Parses a text equation from a generator; throws if it is malformed. */
export function eqFrom(s: string): Equation {
  const p = parseEquation(lex(s));
  if (!p.ok) throw new Error(`bad equation "${s}": ${p.err.code}`);
  return p.eq;
}

export function syntaxMessage(err: SyntaxError, toks: Tok[]): string {
  const t = toks[err.at];
  const show = (k?: Tok) =>
    !k
      ? ''
      : k.k === 'num'
        ? `$${texNum(k.v)}$`
        : k.k === 'x'
          ? '$x$'
          : k.k === 'op'
            ? `$${{ '+': '+', '-': '-', '*': '\\times', '/': '\\div' }[k.op]}$`
            : `$${k.k}$`;
  switch (err.code) {
    case 'empty':
      return 'The slate is empty. Drag the numbers from the story onto it — or tap them.';
    case 'no-equals':
      return 'An equation needs an $=$ sign. It says: *these two amounts are the same.*';
    case 'two-equals':
      return 'Two $=$ signs! One equation has one balance point.';
    case 'left-empty':
      return 'Nothing on the left of the $=$ yet.';
    case 'right-empty':
      return 'Nothing on the right of the $=$ yet.';
    case 'op-start':
      return `A side can't start with ${show(t)} — put a number or $x$ first.`;
    case 'two-ops':
      return `Two signs in a row near ${show(t)}. Put a number or $x$ between them.`;
    case 'dangling':
      return `${show(t) || 'That sign'} has nothing after it.`;
    case 'glued':
      return `Two numbers stuck together read as one big number. Put a sign between them.`;
    case 'num-after-x':
      return `We write the number in front of $x$: $8x$, not $x8$.`;
    case 'x-times-x':
      return `Two $x$'s side by side means $x \\times x$ — that's not what this story says.`;
    case 'unclosed':
      return 'A bracket is opened but never closed.';
    case 'stray-close':
      return 'A closing bracket with no opening one.';
    case 'empty-brackets':
      return 'Empty brackets — put something inside or take them away.';
  }
}

// ---------------------------------------------------------------------------
// Linear forms: every side is a·x + b (or not linear at all)

export interface Lin {
  a: Frac;
  b: Frac;
}

export function linear(e: Expr): Lin | null {
  switch (e.t) {
    case 'num':
      return { a: frac(0), b: e.v };
    case 'x':
      return { a: ONE, b: frac(0) };
    case '+':
    case '-': {
      const p = linear(e.a),
        q = linear(e.b);
      if (!p || !q) return null;
      const f = e.t === '+' ? fAdd : fSub;
      return { a: f(p.a, q.a), b: f(p.b, q.b) };
    }
    case '*': {
      const p = linear(e.a),
        q = linear(e.b);
      if (!p || !q) return null;
      if (!fZero(p.a) && !fZero(q.a)) return null;
      if (fZero(p.a)) return { a: fMul(p.b, q.a), b: fMul(p.b, q.b) };
      return { a: fMul(q.b, p.a), b: fMul(q.b, p.b) };
    }
    case '/': {
      const p = linear(e.a),
        q = linear(e.b);
      if (!p || !q || !fZero(q.a) || fZero(q.b)) return null;
      return { a: fDiv(p.a, q.b), b: fDiv(p.b, q.b) };
    }
  }
}

/** The equation as A·x + B = 0 (left minus right). */
function normal(eq: Equation): Lin | null {
  const l = linear(eq.l),
    r = linear(eq.r);
  if (!l || !r) return null;
  return { a: fSub(l.a, r.a), b: fSub(l.b, r.b) };
}

/** Do two equations have the same solutions (and both actually involve x)? */
export function sameEquation(p: Equation, q: Equation): boolean {
  const m = normal(p),
    n = normal(q);
  if (!m || !n || fZero(m.a) || fZero(n.a)) return false;
  return fEq(fMul(m.a, n.b), fMul(n.a, m.b));
}

/** The value of x that solves the equation (null if none or not linear). */
export function solutionOf(eq: Equation): Frac | null {
  const m = normal(eq);
  if (!m || fZero(m.a)) return null;
  return fDiv(frac(-m.b.n, m.b.d), m.a);
}

export function evalAt(e: Expr, x: Frac): Frac | null {
  const l = linear(e);
  return l ? fAdd(fMul(l.a, x), l.b) : null;
}

// ---------------------------------------------------------------------------
// Drawing equations in LaTeX

function prec(e: Expr): number {
  return e.t === '+' || e.t === '-' ? 1 : e.t === 'num' && e.v.n < 0 ? 1 : 2;
}

export function toTex(e: Expr): string {
  const wrap = (s: string) => `\\left(${s}\\right)`;
  switch (e.t) {
    case 'num':
      return fracTex(e.v);
    case 'x':
      return 'x';
    case '+':
    case '-': {
      const a = toTex(e.a);
      let b = toTex(e.b);
      // Brackets the player wrote (or that the meaning needs) stay visible.
      if (e.b.t === '+' || e.b.t === '-' || (isNum(e.b) && e.b.v.n < 0)) b = wrap(b);
      const s = e.t === '+' ? '+' : '-';
      return e.hl ? `${a} \\hl{${s} ${b}}` : `${a} ${s} ${b}`;
    }
    case '*': {
      let a = toTex(e.a);
      let b = toTex(e.b);
      if (e.hl) {
        if (prec(e.a) < 2) a = wrap(a);
        return `${a} \\hl{\\times ${prec(e.b) < 2 ? wrap(b) : b}}`;
      }
      const whole = isNum(e.a) && e.a.v.d === 1;
      if (whole && e.a.t === 'num' && e.a.v.n === -1 && e.b.t === 'x') return '-x';
      if (e.a.t === '+' || e.a.t === '-') a = wrap(a);
      if (prec(e.b) < 2) b = wrap(b);
      // A number written in front, no sign: 8x, 3(x + 2).
      if (e.implicit && whole && (e.b.t === 'x' || e.b.t === '+' || e.b.t === '-'))
        return `${a}${b}`;
      return `${a} \\times ${b}`;
    }
    case '/': {
      const a = toTex(e.a);
      const b = toTex(e.b);
      return e.hl ? `\\frac{${a}}{\\hl{${b}}}` : `\\frac{${a}}{${b}}`;
    }
  }
}

export const eqTex = (eq: Equation) => `${toTex(eq.l)} = ${toTex(eq.r)}`;

// ---------------------------------------------------------------------------
// Tidying a side after a move

/** a·x + b written the usual way: 8x + 3, \frac{x}{4} - 2, x, 48. */
export function canon(l: Lin): Expr {
  let m: Expr | null = null;
  const a = l.a;
  if (!fZero(a)) {
    if (a.d === 1) m = a.n === 1 ? X : bin('*', num(a.n), X, { implicit: true });
    else if (a.n === 1) m = bin('/', X, num(a.d));
    else m = bin('/', bin('*', num(a.n), X, { implicit: true }), num(a.d));
  }
  if (!m) return num(l.b);
  if (fZero(l.b)) return m;
  // 51 − x reads better than −x + 51.
  if (a.n < 0 && l.b.n > 0) return bin('-', num(l.b), canon({ a: frac(-a.n, a.d), b: frac(0) }));
  return l.b.n > 0 ? bin('+', m, num(l.b)) : bin('-', m, num(frac(-l.b.n, l.b.d)));
}

/** True when the side is a plain sum of x-terms and numbers (no bracket or fraction groups). */
function flat(e: Expr): boolean {
  const mono = (q: Expr) => {
    const l = linear(q);
    return !!l && fZero(l.b) && flat(q);
  };
  switch (e.t) {
    case 'num':
    case 'x':
      return true;
    case '+':
    case '-':
      return flat(e.a) && flat(e.b);
    case '*':
      if (isNum(e.a) && isNum(e.b)) return true;
      if (isNum(e.a)) return mono(e.b);
      if (isNum(e.b)) return mono(e.a);
      return false;
    case '/':
      return isNum(e.b) && !fZero(e.b.v) && (isNum(e.a) || mono(e.a));
  }
}

function splitConst(e: Expr): [Expr, Frac] {
  if (e.t === '+' && isNum(e.b)) return [e.a, e.b.v];
  if (e.t === '-' && isNum(e.b)) return [e.a, frac(-e.b.v.n, e.b.v.d)];
  return [e, frac(0)];
}

function withConst(g: Expr, c: Frac): Expr {
  if (fZero(c)) return g;
  return c.n > 0 ? bin('+', g, num(c)) : bin('-', g, num(frac(-c.n, c.d)));
}

/** Simplifies a side the way you would on paper: cancel what cancels, work out the numbers. */
export function tidy(e: Expr): Expr {
  switch (e.t) {
    case 'num':
      return num(e.v);
    case 'x':
      return X;
    case '+':
    case '-': {
      const a = tidy(e.a),
        b = tidy(e.b);
      const n = bin(e.t, a, b);
      const l = linear(n);
      if (l && flat(n)) return canon(l);
      if (isNum(b)) {
        const [g, c] = splitConst(a);
        return withConst(g, e.t === '+' ? fAdd(c, b.v) : fSub(c, b.v));
      }
      if (isNum(a) && e.t === '+') {
        const [g, c] = splitConst(b);
        return withConst(g, fAdd(c, a.v));
      }
      return n;
    }
    case '*': {
      const a = tidy(e.a),
        b = tidy(e.b);
      if (isNum(a) && isNum(b)) return num(fMul(a.v, b.v));
      const k = isNum(a) ? a.v : isNum(b) ? b.v : null;
      const g = isNum(a) ? b : a;
      if (!k) return bin('*', a, b);
      if (fZero(k)) return num(0);
      if (fEq(k, ONE)) return g;
      const n = bin('*', num(k), g, { implicit: true });
      const l = linear(n);
      if (l && flat(n)) return canon(l);
      if (g.t === '/' && isNum(g.b)) {
        const r = fDiv(k, g.b.v);
        if (fEq(r, ONE)) return g.a;
        if (fInt(r)) return tidy(bin('*', num(r), g.a));
        const s = fDiv(g.b.v, k);
        if (fInt(s)) return tidy(bin('/', g.a, num(s)));
      }
      if (g.t === '*' && isNum(g.a)) return tidy(bin('*', num(fMul(k, g.a.v)), g.b));
      return n;
    }
    case '/': {
      const a = tidy(e.a),
        b = tidy(e.b);
      if (!isNum(b) || fZero(b.v)) return bin('/', a, b);
      if (isNum(a)) return num(fDiv(a.v, b.v));
      if (fEq(b.v, ONE)) return a;
      const n = bin('/', a, b);
      const l = linear(a);
      if (l && flat(n)) return canon(linear(n)!);
      // (8x + 16) ÷ 8 shares out evenly: x + 2. (8x + 3) ÷ 8 stays stuck under the bar.
      if (l && flat(a) && fInt(fDiv(l.a, b.v)) && fInt(fDiv(l.b, b.v)))
        return canon({ a: fDiv(l.a, b.v), b: fDiv(l.b, b.v) });
      if (a.t === '*' && isNum(a.a)) {
        const r = fDiv(a.a.v, b.v);
        if (fEq(r, ONE)) return a.b;
        if (fInt(r)) return tidy(bin('*', num(r), a.b));
      }
      if (a.t === '/' && isNum(a.b)) return tidy(bin('/', a.a, num(fMul(a.b.v, b.v))));
      return n;
    }
  }
}

export const tidyEq = (eq: Equation): Equation => ({ l: tidy(eq.l), r: tidy(eq.r) });

// ---------------------------------------------------------------------------
// Moves: do the same thing to both sides

export interface Move {
  op: OpSym;
  /** A number, or x itself ("subtract x from both sides"). */
  k: Frac | 'x';
}

const kExpr = (m: Move): Expr => (m.k === 'x' ? X : num(m.k));

export function moveTex(m: Move): string {
  const k = m.k === 'x' ? 'x' : fracTex(m.k);
  const kk = m.k !== 'x' && m.k.n < 0 ? `(${k})` : k;
  return { '+': `+ ${kk}`, '-': `- ${kk}`, '*': `\\times ${kk}`, '/': `\\div ${kk}` }[m.op];
}

/** In words, for buttons and the work log: "subtract 3 from both sides". */
export function moveWords(m: Move): string {
  const k = m.k === 'x' ? '$x$' : `$${fracTex(m.k)}$`;
  return {
    '+': `add ${k} to both sides`,
    '-': `subtract ${k} from both sides`,
    '*': `multiply both sides by ${k}`,
    '/': `divide both sides by ${k}`,
  }[m.op];
}

/** Why a move can't be made at all (null if it can). */
export function blocked(m: Move): string | null {
  if (m.k === 'x' && (m.op === '*' || m.op === '/'))
    return `Multiplying or dividing by $x$ is a trick for much later. Today: add, subtract, multiply or divide by **numbers** (or add/subtract $x$).`;
  if (m.k !== 'x' && fZero(m.k)) {
    if (m.op === '/')
      return `Nobody can divide by zero. Not even dragons. *Especially* not dragons.`;
    if (m.op === '*')
      return `Times zero turns both sides into $0$: $0 = 0$. True, but the whole equation vanishes — and $x$ with it!`;
    return `Adding or taking away $0$ changes nothing at all. Pick a number that does something!`;
  }
  return null;
}

/** Both sides with the move written in (highlighted), before tidying. */
export function applyMove(eq: Equation, m: Move): Equation {
  const k = kExpr(m);
  return { l: bin(m.op, eq.l, k, { hl: true }), r: bin(m.op, eq.r, k, { hl: true }) };
}

/** How many layers of operations are wrapped around x (99 = tangled, e.g. x on both sides). */
export function layers(e: Expr): number {
  switch (e.t) {
    case 'x':
      return 0;
    case 'num':
      return 0;
    case '+':
    case '-':
      if (hasX(e.a) && hasX(e.b)) return 99;
      return 1 + layers(hasX(e.a) ? e.a : e.b);
    case '*':
      if (hasX(e.a) && hasX(e.b)) return 99;
      return 1 + layers(hasX(e.a) ? e.a : e.b);
    case '/':
      if (hasX(e.b)) return 99;
      return 1 + layers(e.a);
  }
}

/** Distance from solved: layers round x, and x on both sides counts as very far. */
export function tangle(eq: Equation): number {
  const lx = hasX(eq.l),
    rx = hasX(eq.r);
  if (lx && rx) return 50 + layers(eq.l) + layers(eq.r);
  if (!lx && !rx) return 100;
  return layers(lx ? eq.l : eq.r);
}

/** x = 6 (or 6 = x): the value; otherwise null. */
export function solvedValue(eq: Equation): Frac | null {
  if (eq.l.t === 'x' && isNum(eq.r)) return eq.r.v;
  if (eq.r.t === 'x' && isNum(eq.l)) return eq.l.v;
  return null;
}

export interface Layer {
  /** The operation stuck to the outside of x's side. */
  op: OpSym;
  k: Frac;
  /** The number comes first: k − (…) or k + (…). */
  before?: boolean;
}

/** The outermost layer round x (null when x is alone or tangled). */
export function outerLayer(eq: Equation): Layer | null {
  const lx = hasX(eq.l),
    rx = hasX(eq.r);
  if (lx === rx) return null;
  const e = lx ? eq.l : eq.r;
  if (e.t === 'x' || e.t === 'num') return null;
  if (e.t === '/') return isNum(e.b) ? { op: '/', k: e.b.v } : null;
  if (isNum(e.b)) return { op: e.t, k: e.b.v };
  if (isNum(e.a)) return { op: e.t, k: e.a.v, before: true };
  return null;
}

const INVERSE: Record<OpSym, OpSym> = { '+': '-', '-': '+', '*': '/', '/': '*' };

/** The move that peels off the outermost layer (null if there isn't an obvious one). */
export function bestMove(eq: Equation): Move | null {
  if (solvedValue(eq)) return null;
  const lx = hasX(eq.l),
    rx = hasX(eq.r);
  if (lx && rx) {
    // x on both sides: take the x-term away from the side with the smaller coefficient.
    const l = linear(eq.l),
      r = linear(eq.r);
    if (!l || !r) return null;
    const side = fVal(l.a) <= fVal(r.a) ? l : r;
    if (!fEq(side.a, ONE)) return null;
    return { op: '-', k: 'x' };
  }
  const o = outerLayer(eq);
  if (!o) return null;
  if (o.before && o.op === '-') return null; // k − x: needs negative numbers, not in this game yet
  return { op: INVERSE[o.op], k: o.k };
}

/** The moves that solve the equation by peeling layers (null if it gets stuck). */
export function solveSteps(eq: Equation, max = 6): Move[] | null {
  const out: Move[] = [];
  let cur = eq;
  for (let i = 0; i < max; i++) {
    if (solvedValue(cur)) return out;
    const m = bestMove(cur);
    if (!m) return null;
    out.push(m);
    cur = tidyEq(applyMove(cur, m));
  }
  return solvedValue(cur) ? out : null;
}

const OP_WORD: Record<OpSym, string> = {
  '+': 'adding',
  '-': 'taking away',
  '*': 'multiplying',
  '/': 'dividing',
};
const FAMILY = (op: OpSym) => (op === '+' || op === '-' ? 'pm' : 'md');

export function layerTex(o: Layer): string {
  const k = fracTex(o.k);
  if (o.op === '/') return `\\div ${k}`;
  if (o.op === '*') return `\\times ${k}`;
  return o.before ? `${k} ${o.op}` : `${o.op} ${k}`;
}

export interface Assessment {
  /** good: x is freer; solved: x is alone; meh: no progress; worse: more tangled. */
  kind: 'good' | 'solved' | 'meh' | 'worse';
  text: string;
}

/** Was this move a step towards x on its own? Feedback is about *this* equation. */
export function assessMove(before: Equation, m: Move): Assessment {
  const after = tidyEq(applyMove(before, m));
  const o = outerLayer(before);
  const v = solvedValue(after);
  if (v) return { kind: 'solved', text: `That's the last layer — $x$ is free!` };
  const tb = tangle(before),
    ta = tangle(after);
  const kTex = m.k === 'x' ? 'x' : fracTex(m.k);
  if (m.k === 'x' || ta >= 50) {
    if (ta < tb) return { kind: 'good', text: `Now $x$ is only on one side. Much better!` };
    return {
      kind: 'worse',
      text: `Still balanced — but now there's $x$ on **both** sides. That's harder, not easier. Undo it?`,
    };
  }
  if (ta < tb) {
    const peeled = o && m.op === INVERSE[o.op] && fEq(m.k, o.k);
    return {
      kind: 'good',
      text: peeled
        ? `The $${layerTex(o!)}$ is gone — one layer off $x$!`
        : `Nice — $x$ has one layer fewer round it.`,
    };
  }
  if (!o) return { kind: 'meh', text: `Still balanced, but $x$ isn't any freer. Undo it?` };
  const stuck = `$${layerTex(o)}$`;
  if (FAMILY(m.op) === FAMILY(o.op)) {
    if (m.op === o.op && !o.before)
      return {
        kind: 'worse',
        text: `That's ${OP_WORD[m.op]} **again**! $x$ is buried deeper. To undo ${stuck}, do the opposite.`,
      };
    if (o.before && o.op === '-')
      return { kind: 'meh', text: `Still balanced, but $x$ isn't any freer. Undo it?` };
    return {
      kind: 'meh',
      text: `Right kind of move — but ${stuck} is stuck to $x$, and you used $${kTex}$. Use exactly what's stuck on.`,
    };
  }
  if (FAMILY(o.op) === 'pm')
    return {
      kind: 'worse',
      text: `Legal, and still balanced — but ${OP_WORD[m.op]} hits the $${fracTex(o.k)}$ too, so now it's tangled up with $x$. **Last on, first off:** deal with the ${stuck} first.`,
    };
  return {
    kind: 'meh',
    text: `Still balanced, but ${OP_WORD[m.op]} can't undo ${stuck}. ${o.op === '*' ? 'Undo times with divide.' : 'Undo divide with times.'}`,
  };
}

/** What happened to a side when tidying, in words (for the work log). */
export function tidyNote(applied: Expr, tidied: Expr, m: Move): string | null {
  if (applied.t === 'num' || applied.t === 'x') return null;
  const inner = applied.a;
  if (m.k === 'x' || !hasX(inner)) return null;
  const k = fracTex(m.k);
  if ((m.op === '+' || m.op === '-') && (inner.t === '+' || inner.t === '-')) {
    const [g, c] = splitConst(inner);
    const delta = m.op === '+' ? m.k : frac(-m.k.n, m.k.d);
    if (!fZero(c) && fZero(fAdd(c, delta)) && toTex(g) === toTex(tidied))
      return `$${c.n > 0 ? '+' : '-'} ${fracTex(frac(Math.abs(c.n), c.d))}$ and $${m.op} ${k}$ cancel out — poof!`;
  }
  if (m.op === '/' && inner.t === '*' && isNum(inner.a) && fEq(inner.a.v, m.k))
    return `$${k}$ lots of $x$ shared into $${k}$ piles: one $x$ each.`;
  if (m.op === '*' && inner.t === '/' && isNum(inner.b) && fEq(inner.b.v, m.k))
    return `$x$ was cut into $${k}$ pieces; $\\times ${k}$ glues them back together.`;
  if (m.op === '/' && (inner.t === '+' || inner.t === '-') && tidied.t !== '/')
    return `$\\div ${k}$ shares out to **every** part.`;
  return null;
}

// ---------------------------------------------------------------------------
// Story tiles

export interface Tile {
  v: number;
  /** What the number is in the story, written to follow it: "legs on each spider". */
  means: string;
  /** A number the question doesn't need. */
  decoy?: boolean;
}

export type StoryPart = string | { tile: number };

/** Story text with tile markers: "spiders with [[8|legs each]] … [[4|cousins|decoy]]". */
export function parseStory(story: string): { parts: StoryPart[]; tiles: Tile[] } {
  const parts: StoryPart[] = [];
  const tiles: Tile[] = [];
  const re = /\[\[([^|\]]+)\|([^|\]]+)(\|decoy)?\]\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(story))) {
    if (m.index > last) parts.push(story.slice(last, m.index));
    tiles.push({ v: Number(m[1]), means: m[2].trim(), decoy: !!m[3] || undefined });
    parts.push({ tile: tiles.length - 1 });
    last = re.lastIndex;
  }
  if (last < story.length) parts.push(story.slice(last));
  return { parts, tiles };
}

/** The story as plain text (numbers without markers). */
export const plainStory = (story: string) => story.replace(/\[\[([^|\]]+)\|[^\]]*\]\]/g, '$1');

// ---------------------------------------------------------------------------
// Reading an equation back in words

export function readExpr(e: Expr, toks: Tok[], tiles: Tile[], unknown: string): string {
  const r = (q: Expr) => readExpr(q, toks, tiles, unknown);
  const br = (q: Expr) => (q.t === '+' || q.t === '-' ? `(${r(q)})` : r(q));
  switch (e.t) {
    case 'num': {
      const tok = e.span ? toks[e.span[0]] : undefined;
      const tile = tok && tok.k === 'num' && tok.tile !== undefined ? tiles[tok.tile] : undefined;
      return tile ? `**${fmt(fVal(e.v))}** ${tile.means}` : `**${fracTex(e.v)}**`;
    }
    case 'x':
      return `**$x$** (${unknown})`;
    case '+':
      return `${r(e.a)} + ${br(e.b)}`;
    case '-':
      return `${r(e.a)} − ${br(e.b)}`;
    case '*':
      return `${br(e.a)} × ${br(e.b)}`;
    case '/':
      return `${br(e.a)} ÷ ${br(e.b)}`;
  }
}

export function readEquation(eq: Equation, toks: Tok[], tiles: Tile[], unknown: string): string {
  return `${readExpr(eq.l, toks, tiles, unknown)} **is the same as** ${readExpr(eq.r, toks, tiles, unknown)}`;
}

// ---------------------------------------------------------------------------
// Checking an equation the player built

export interface BuildSpec {
  target: Equation;
  tiles: Tile[];
  unknown: string;
  traps?: { eq: Equation; text: string }[];
}

export type BuildVerdict =
  | { kind: 'syntax'; text: string; at: number }
  | { kind: 'right'; eq: Equation; note?: string }
  | { kind: 'wrong'; text: string; bad: number[]; tiles?: number[]; trap?: boolean };

interface Term {
  lin: Lin;
  span: [number, number];
}

/** Top-level terms of a side, with signs (8x + 3 − 1 → [8x, 3, −1]). */
function terms(e: Expr, sign = 1): Term[] {
  if ((e.t === '+' || e.t === '-') && !e.paren) {
    return [...terms(e.a, sign), ...terms(e.b, e.t === '-' ? -sign : sign)];
  }
  const l = linear(e) ?? { a: frac(0), b: frac(0) };
  return [
    { lin: { a: frac(sign * l.a.n, l.a.d), b: frac(sign * l.b.n, l.b.d) }, span: e.span ?? [0, 0] },
  ];
}

const sameLin = (p: Lin, q: Lin) => fEq(p.a, q.a) && fEq(p.b, q.b);
const negLin = (p: Lin): Lin => ({ a: frac(-p.a.n, p.a.d), b: frac(-p.b.n, p.b.d) });

/** Token indices covered by the terms of the player's equation that the story doesn't have. */
function oddTerms(mine: Equation, target: Equation): { bad: Term[]; flipped: Term[] } {
  const side = (eq: Equation) => [
    ...terms(eq.l),
    ...terms(eq.r).map((t) => ({ ...t, lin: negLin(t.lin) })),
  ];
  const m = side(mine);
  const best = [side(target), side(target).map((t) => ({ ...t, lin: negLin(t.lin) }))]
    .map((tt) => {
      const pool = tt.map((t) => t.lin);
      const bad: Term[] = [];
      const flipped: Term[] = [];
      for (const t of m) {
        const i = pool.findIndex((p) => sameLin(p, t.lin));
        if (i >= 0) pool.splice(i, 1);
        else {
          const j = pool.findIndex((p) => sameLin(p, negLin(t.lin)));
          if (j >= 0) {
            pool.splice(j, 1);
            flipped.push(t);
          } else bad.push(t);
        }
      }
      return { bad, flipped };
    })
    .sort((p, q) => p.bad.length + p.flipped.length - (q.bad.length + q.flipped.length))[0];
  return best;
}

const range = ([a, b]: [number, number]) => Array.from({ length: b - a }, (_, i) => a + i);

export function checkBuild(toks: Tok[], spec: BuildSpec): BuildVerdict {
  const p = parseEquation(toks);
  if (!p.ok) return { kind: 'syntax', text: syntaxMessage(p.err, toks), at: p.err.at };
  const eq = p.eq;
  const usedTiles = new Set(
    toks.flatMap((t) => (t.k === 'num' && t.tile !== undefined ? [t.tile] : [])),
  );
  const tileTok = (i: number) => toks.findIndex((t) => t.k === 'num' && t.tile === i);
  if (!hasX(eq.l) && !hasX(eq.r))
    return {
      kind: 'wrong',
      text: `Where's the mystery? Your equation needs $x$ — ${spec.unknown}.`,
      bad: [],
    };
  if (!normal(eq))
    return { kind: 'wrong', text: `That puts $x$ somewhere it can't go in this story.`, bad: [] };
  if (sameEquation(eq, spec.target)) {
    const note = !hasX(eq.l)
      ? `$x$ on the right-hand side — totally fine. A balance doesn't care which pan is which.`
      : undefined;
    return { kind: 'right', eq, note };
  }
  const decoy = [...usedTiles].find((i) => spec.tiles[i]?.decoy);
  if (decoy !== undefined) {
    const t = spec.tiles[decoy];
    return {
      kind: 'wrong',
      text: `The $${texNum(t.v)}$ (${t.means}) has nothing to do with the question. Some numbers are just there to muddle you!`,
      bad: [tileTok(decoy)],
    };
  }
  for (const trap of spec.traps ?? []) {
    if (sameEquation(eq, trap.eq)) {
      const { bad, flipped } = oddTerms(eq, spec.target);
      return {
        kind: 'wrong',
        text: trap.text,
        bad: [...bad, ...flipped].flatMap((t) => range(t.span)),
        trap: true,
      };
    }
  }
  const unused = spec.tiles
    .map((t, i) => (!t.decoy && !usedTiles.has(i) ? i : -1))
    .filter((i) => i >= 0);
  if (unused.length) {
    const t = spec.tiles[unused[0]];
    return {
      kind: 'wrong',
      text: `You haven't used the $${texNum(t.v)}$ (${t.means}) yet. Every number in this story has a job.`,
      bad: [],
      tiles: unused,
    };
  }
  const { bad, flipped } = oddTerms(eq, spec.target);
  if (bad.length === 0 && flipped.length) {
    const f = flipped[0];
    return {
      kind: 'wrong',
      text: `The pieces are right, but something is on the wrong side of the $=$. Ask: which amounts make up the total, and which amount **is** the total?`,
      bad: flipped.flatMap((t) => range(t.span)).concat(range(f.span)),
    };
  }
  return {
    kind: 'wrong',
    text: `The marked pieces don't tell this story yet. Read your equation out loud — does the story say that?`,
    bad: [...bad, ...flipped].flatMap((t) => range(t.span)),
  };
}

/** Tokens for a text equation, linking numbers to story tiles (first unused tile with that value). */
export function tokensFor(eqText: string, tiles: Tile[]): Tok[] {
  const used = new Set<number>();
  return lex(eqText).map((t) => {
    if (t.k !== 'num') return t;
    const i = tiles.findIndex((tl, j) => !used.has(j) && !tl.decoy && tl.v === t.v);
    if (i < 0) return t;
    used.add(i);
    return { ...t, tile: i };
  });
}

// ---------------------------------------------------------------------------
// Checking an answer by putting it back in

/** One side with x replaced by its value: 8x + 3 → 8 × 6 + 3. */
export function substTex(e: Expr, v: Frac): string {
  const wrap = (s: string) => `\\left(${s}\\right)`;
  const val = `\\good{${v.n < 0 ? wrap(fracTex(v)) : fracTex(v)}}`;
  switch (e.t) {
    case 'num':
      return fracTex(e.v);
    case 'x':
      return val;
    case '+':
    case '-': {
      const b = e.b.t === '+' || e.b.t === '-' ? wrap(substTex(e.b, v)) : substTex(e.b, v);
      return `${substTex(e.a, v)} ${e.t} ${b}`;
    }
    case '*': {
      const a = e.a.t === '+' || e.a.t === '-' ? wrap(substTex(e.a, v)) : substTex(e.a, v);
      const b = e.b.t === '+' || e.b.t === '-' ? wrap(substTex(e.b, v)) : substTex(e.b, v);
      return `${a} \\times ${b}`;
    }
    case '/':
      return `\\frac{${substTex(e.a, v)}}{${substTex(e.b, v)}}`;
  }
}

/** "8 × 6 + 3 = 51": the solution put back into the equation, worked out. */
export function checkTex(eq: Equation, v: Frac): { tex: string; ok: boolean } {
  const l = evalAt(eq.l, v),
    r = evalAt(eq.r, v);
  const ok = !!l && !!r && fEq(l, r);
  const show = (e: Expr, n: Frac | null) =>
    e.t === 'num' || !n ? substTex(e, v) : `${substTex(e, v)} \\to ${fracTex(n)}`;
  if (!hasX(eq.l) || !hasX(eq.r)) {
    const xl = hasX(eq.l);
    const sub = `${substTex(xl ? eq.l : eq.r, v)}`;
    const got = fracTex((xl ? l : r) ?? frac(0));
    const want = fracTex((xl ? r : l) ?? frac(0));
    if (ok) return { tex: xl ? `${sub} = ${got}` : `${got} = ${sub}`, ok };
    return { tex: xl ? `${sub} = ${got} \\ne ${want}` : `${want} \\ne ${got} = ${sub}`, ok };
  }
  return { tex: `${show(eq.l, l)} \\quad\\text{and}\\quad ${show(eq.r, r)}`, ok };
}
