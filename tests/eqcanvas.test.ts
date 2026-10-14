/** The EQcanvas engine: reading the slate, checking equations, moves on both sides. */
import { describe, expect, it } from 'vitest';
import {
  applyMove,
  assessMove,
  bestMove,
  checkBuild,
  eqFrom,
  eqTex,
  frac,
  lex,
  parseEquation,
  parseStory,
  plainStory,
  readEquation,
  sameEquation,
  solutionOf,
  solveSteps,
  solvedValue,
  tidyEq,
  tidyNote,
  tokensFor,
  type Move,
  type Tok,
} from '../src/engine/eqcanvas';
import { renderMath } from '../src/ui/math';

const mv = (op: Move['op'], k: number | 'x'): Move => ({ op, k: k === 'x' ? 'x' : frac(k) });
const after = (eq: string, m: Move) => eqTex(tidyEq(applyMove(eqFrom(eq), m)));

describe('reading the slate', () => {
  it('parses what kids write', () => {
    expect(eqTex(eqFrom('8x+3=51'))).toBe('8x + 3 = 51');
    expect(eqTex(eqFrom('51=3+8x'))).toBe('51 = 3 + 8x');
    expect(eqTex(eqFrom('x/4=6'))).toBe('\\frac{x}{4} = 6');
    expect(eqTex(eqFrom('3(x+2)=21'))).toBe('3\\left(x + 2\\right) = 21');
    expect(eqTex(eqFrom('8*x+3=51'))).toBe('8 \\times x + 3 = 51');
    expect(eqTex(eqFrom('x-7=10'))).toBe('x - 7 = 10');
  });
  it('points at syntax mistakes', () => {
    const code = (s: string) => {
      const p = parseEquation(lex(s));
      return p.ok ? 'ok' : `${p.err.code}@${p.err.at}`;
    };
    expect(code('')).toBe('empty@-1');
    expect(code('8x+3')).toBe('no-equals@-1');
    expect(code('8x=3=5')).toBe('two-equals@4');
    expect(code('=5')).toBe('left-empty@0');
    expect(code('8x+=5')).toBe('dangling@2');
    expect(code('8x+*3=5')).toBe('two-ops@3');
    expect(code('8x+3+')).toBe('no-equals@-1');
    expect(code('8x+3=51+')).toBe('dangling@6');
    expect(code('+8x=5')).toBe('op-start@0');
    expect(parseEquation([{ k: 'num', v: 8 }, { k: 'num', v: 3 }, { k: '=' }, { k: 'x' }]).ok).toBe(
      false,
    );
    expect(code('x8=5')).toBe('num-after-x@1');
    expect(code('xx=5')).toBe('x-times-x@1');
    expect(code('3(x+2=5')).toBe('unclosed@1');
    expect(code('3x)=5')).toBe('stray-close@2');
  });
  it('knows when two equations say the same thing', () => {
    const t = eqFrom('8x+3=51');
    for (const s of ['3+8x=51', '51=8x+3', '8x=51-3', 'x*8+3=51', '51-3=8x'])
      expect(sameEquation(eqFrom(s), t), s).toBe(true);
    for (const s of ['3x+8=51', 'x+8+3=51', '8x-3=51', '8x+51=3', '8+3=51'])
      expect(sameEquation(eqFrom(s), t), s).toBe(false);
    expect(solutionOf(t)).toEqual(frac(6));
  });
});

describe('story tiles', () => {
  const story =
    'Spiders with [[8|legs each]], a stool with [[3|legs]], [[51|legs in all]]. [[4|cousins|decoy]]';
  const { tiles, parts } = parseStory(story);
  const spec = { target: eqFrom('8x+3=51'), tiles, unknown: 'the number of spiders' };
  const toks = (s: string) => tokensFor(s, tiles);

  it('finds the tiles in the story', () => {
    expect(tiles.map((t) => t.v)).toEqual([8, 3, 51, 4]);
    expect(tiles[3].decoy).toBe(true);
    expect(parts.filter((p) => typeof p !== 'string')).toHaveLength(4);
    expect(plainStory(story)).toBe('Spiders with 8, a stool with 3, 51. 4');
  });
  it('accepts any honest way of writing it', () => {
    expect(checkBuild(toks('8x+3=51'), spec).kind).toBe('right');
    expect(checkBuild(toks('51=3+8x'), spec)).toMatchObject({ kind: 'right' });
    expect(checkBuild(toks('8*x+3=51'), spec).kind).toBe('right');
  });
  it('explains what is wrong, and where', () => {
    const swapped = checkBuild(toks('3x+8=51'), spec);
    expect(swapped.kind).toBe('wrong');
    if (swapped.kind === 'wrong') expect(swapped.bad).toEqual([0, 1, 3]);
    const sides = checkBuild(toks('8x+51=3'), spec);
    expect(sides.kind === 'wrong' && sides.text).toMatch(/wrong side/);
    const unused = checkBuild(toks('8x=51'), spec);
    expect(unused.kind === 'wrong' && unused.tiles).toEqual([1]);
    const decoy: Tok[] = [...toks('8x+3=51')];
    decoy.splice(4, 0, { k: 'op', op: '+' }, { k: 'num', v: 4, tile: 3 });
    expect(checkBuild(decoy, spec)).toMatchObject({ kind: 'wrong', bad: [5] });
    expect(checkBuild(toks('8+3=51'), spec).kind === 'wrong').toBe(true);
    expect(checkBuild(toks('8x+3'), spec).kind).toBe('syntax');
  });
  it('uses traps when the generator predicted the mistake', () => {
    const v = checkBuild(toks('x+8+3=51'), {
      ...spec,
      traps: [{ eq: eqFrom('x+11=51'), text: 'Each spider has 8 legs!' }],
    });
    expect(v).toMatchObject({ kind: 'wrong', text: 'Each spider has 8 legs!', trap: true });
  });
  it('reads the equation back in words', () => {
    const t = toks('8x+3=51');
    const p = parseEquation(t);
    if (!p.ok) throw new Error();
    const w = readEquation(p.eq, t, tiles, 'the number of spiders');
    expect(w).toContain('**8** legs each × **$x$** (the number of spiders)');
    expect(w).toContain('**51** legs in all');
  });
});

describe('moves on both sides', () => {
  it('tidies the way you would on paper', () => {
    expect(after('8x+3=51', mv('-', 3))).toBe('8x = 48');
    expect(after('8x=48', mv('/', 8))).toBe('x = 6');
    expect(after('x/4=6', mv('*', 4))).toBe('x = 24');
    expect(after('x-7=10', mv('+', 7))).toBe('x = 17');
    expect(after('3+x=10', mv('-', 3))).toBe('x = 7');
    expect(after('51=8x+3', mv('-', 3))).toBe('48 = 8x');
    expect(after('3(x+2)=21', mv('/', 3))).toBe('x + 2 = 7');
    expect(after('x/3+2=7', mv('-', 2))).toBe('\\frac{x}{3} = 5');
  });
  it('shows honestly what a bad move does', () => {
    // Dividing first leaves the 3 stuck under the bar, with ugly fractions.
    expect(after('8x+3=51', mv('/', 8))).toBe('\\frac{8x + 3}{8} = \\frac{51}{8}');
    // Dividing first is fine when it shares out evenly.
    expect(after('8x+16=64', mv('/', 8))).toBe('x + 2 = 8');
    expect(after('8x+3=51', mv('+', 3))).toBe('8x + 6 = 54');
    expect(after('8x+3=51', mv('-', 51))).toBe('8x - 48 = 0');
    expect(after('x/4+1=6', mv('*', 4))).toBe('4\\left(\\frac{x}{4} + 1\\right) = 24');
    expect(after('8x+3=51', mv('-', 'x'))).toBe('7x + 3 = 51 - x');
  });
  it('judges each move', () => {
    const eq = eqFrom('8x+3=51');
    expect(assessMove(eq, mv('-', 3)).kind).toBe('good');
    expect(assessMove(eq, mv('+', 3)).kind).toBe('worse');
    expect(assessMove(eq, mv('-', 51)).kind).toBe('meh');
    expect(assessMove(eq, mv('/', 8))).toMatchObject({ kind: 'worse' });
    expect(assessMove(eq, mv('/', 8)).text).toMatch(/Last on, first off/);
    expect(assessMove(eq, mv('-', 'x')).kind).toBe('worse');
    expect(assessMove(eqFrom('8x=48'), mv('/', 8)).kind).toBe('solved');
    expect(assessMove(eqFrom('8x=48'), mv('-', 8)).kind).toBe('meh');
  });
  it('explains the tidying', () => {
    const e = eqFrom('8x+3=51');
    const m = mv('-', 3);
    const a = applyMove(e, m);
    expect(tidyNote(a.l, tidyEq(a).l, m)).toMatch(/cancel/);
    const d = applyMove(eqFrom('8x=48'), mv('/', 8));
    expect(tidyNote(d.l, tidyEq(d).l, mv('/', 8))).toMatch(/shared/);
  });
  it('finds the next move and solves', () => {
    expect(bestMove(eqFrom('8x+3=51'))).toEqual(mv('-', 3));
    expect(bestMove(eqFrom('51=3+8x'))).toEqual(mv('-', 3));
    expect(bestMove(eqFrom('3(x+2)=21'))).toEqual(mv('/', 3));
    expect(solveSteps(eqFrom('x/4+5=9'))).toEqual([mv('-', 5), mv('*', 4)]);
    expect(solveSteps(eqFrom('3x+2=x+10'))).toEqual([mv('-', 'x'), mv('-', 2), mv('/', 2)]);
    const end = solveSteps(eqFrom('(x+3)/2=5'))!.reduce(
      (e, m) => tidyEq(applyMove(e, m)),
      eqFrom('(x+3)/2=5'),
    );
    expect(solvedValue(end)).toEqual(frac(7));
  });
  it('draws moves as valid LaTeX', () => {
    for (const [s, m] of [
      ['8x+3=51', mv('-', 3)],
      ['8x+3=51', mv('/', 8)],
      ['x/4=6', mv('*', 4)],
      ['3(x+2)=21', mv('/', 3)],
    ] as const) {
      renderMath(eqTex(applyMove(eqFrom(s), m)), true, true);
      renderMath(eqTex(tidyEq(applyMove(eqFrom(s), m))), true, true);
    }
    expect(eqTex(applyMove(eqFrom('8x+3=51'), mv('-', 3)))).toBe('8x + 3 \\hl{- 3} = 51 \\hl{- 3}');
  });
});

describe('checking the answer', () => {
  it('puts x back in', async () => {
    const { checkTex } = await import('../src/engine/eqcanvas');
    expect(checkTex(eqFrom('8x+3=51'), frac(6))).toEqual({
      tex: '8 \\times \\good{6} + 3 = 51',
      ok: true,
    });
    expect(checkTex(eqFrom('8x+3=51'), frac(5)).ok).toBe(false);
    expect(checkTex(eqFrom('51=8x+3'), frac(6)).tex).toBe('51 = 8 \\times \\good{6} + 3');
    expect(checkTex(eqFrom('8x+3=51'), frac(5)).tex).toBe('8 \\times \\good{5} + 3 = 43 \\ne 51');
    for (const s of ['x/4=6', '3(x+2)=21', '20=x+4'])
      renderMath(checkTex(eqFrom(s), solutionOf(eqFrom(s))!).tex, true, true);
  });
});
