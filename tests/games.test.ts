/** Mini-game logic (src/games): every verdict should steer, not just say "wrong". */
import { describe, expect, it } from 'vitest';
import {
  arrayBuildVerdict,
  balloonVerdict,
  binVerdict,
  factorPairs,
  fruitVerdict,
  ineqVerdict,
  parseTerm,
  solvableNext,
  sizeText,
  sortTotals,
  stepVerdict,
  sticks,
  totalsTex,
  validateGame,
} from '../src/games';

describe('chain steps', () => {
  const step = { tex: '7 \\times 8 = \\box', answer: 56, nudges: [{ value: 54, text: 'Count again.' }] };
  it('accepts the answer and catches the classic slips', () => {
    expect(stepVerdict(step, 56).ok).toBe(true);
    expect(stepVerdict(step, 54)).toMatchObject({ ok: false, near: true, text: 'Count again.' });
    expect(stepVerdict(step, -56)).toMatchObject({ ok: false, text: expect.stringMatching(/sign/) });
    expect(stepVerdict(step, 560)).toMatchObject({ ok: false, text: expect.stringMatching(/zeros/) });
    expect(stepVerdict(step, 60)).toMatchObject({ ok: false, text: expect.stringMatching(/big/) });
  });
  it('respects tolerance for estimates', () => {
    expect(stepVerdict({ tex: '', answer: 100, tolerance: 10 }, 108).ok).toBe(true);
    expect(stepVerdict({ tex: '', answer: 100, tolerance: 10 }, 120).ok).toBe(false);
  });
});

describe('arrays', () => {
  it('spots rows + columns instead of rows × columns', () => {
    const spec = { kind: 'array' as const, rows: 3, cols: 4, mode: 'build' as const, target: 12 };
    expect(arrayBuildVerdict(spec as never, 3, 4).ok).toBe(true);
    expect(arrayBuildVerdict(spec as never, 2, 6).ok).toBe(true);
    expect(arrayBuildVerdict(spec as never, 5, 7)).toMatchObject({ ok: false, near: true });
  });
  it('lists factor pairs', () => {
    expect(factorPairs(12)).toEqual([
      [1, 12],
      [2, 6],
      [3, 4],
      [4, 3],
      [6, 2],
      [12, 1],
    ]);
  });
});

describe('balloons and sandbags', () => {
  it('explains why taking away sandbags lifts you', () => {
    const spec = { kind: 'balloon' as const, start: 1, op: 'sub' as const, k: -3 };
    expect(balloonVerdict(spec, 4, { b: 1, s: 0 })).toMatchObject({ ok: true });
    // Went down instead of up: subtracting a negative treated as subtracting.
    expect(balloonVerdict(spec, -2, { b: 1, s: 3 })).toMatchObject({ ok: false, near: true });
  });
});

describe('the sorter', () => {
  it('reads terms and totals each pile', () => {
    expect(parseTerm('-x')).toMatchObject({ kind: 'x', coef: -1 });
    expect(parseTerm('3x^2')).toMatchObject({ kind: 'x2', coef: 3 });
    expect(parseTerm('7')).toMatchObject({ kind: 'n', coef: 7 });
    const t = sortTotals(['3x', '2', 'x', '5', 'x^2']);
    expect(totalsTex(t)).toBe('x^{2} + 4x + 7');
    expect(totalsTex(sortTotals(['5x', '-2x', '6', '-7']))).toBe('3x - 1');
  });
  it('keeps x² out of the x pile', () => {
    expect(binVerdict(parseTerm('x^2'), 'x')).toMatchObject({ ok: false });
    expect(binVerdict(parseTerm('x^2'), 'x2').ok).toBe(true);
  });
});

describe('fruit puzzles', () => {
  const spec = {
    kind: 'fruit' as const,
    rows: [
      { items: ['🍎', '🍎', '🍎'], total: 30 },
      { items: ['🍎', '🍌', '🍌'], total: 18 },
    ],
    values: { '🍎': 10, '🍌': 4 },
  };
  it('knows which fruit can be worked out next', () => {
    expect(solvableNext(spec, '🍎', [])).toBe(true);
    expect(solvableNext(spec, '🍌', [])).toBe(false);
    expect(solvableNext(spec, '🍌', ['🍎'])).toBe(true);
  });
  it('nudges the classic slips', () => {
    expect(fruitVerdict(spec, '🍎', 10, []).ok).toBe(true);
    expect(fruitVerdict(spec, '🍎', 30, [])).toMatchObject({ ok: false, near: true });
    expect(fruitVerdict(spec, '🍌', 8, ['🍎'])).toMatchObject({ ok: false, near: true });
  });
  it('compares two rows when no row has a single fruit', () => {
    const cmp = {
      kind: 'fruit' as const,
      rows: [
        { items: ['🍓', '🍇'], total: 11 },
        { items: ['🍓', '🍇', '🍇'], total: 15 },
      ],
      values: { '🍓': 7, '🍇': 4 },
    };
    expect(solvableNext(cmp, '🍇', [])).toBe(true);
    expect(solvableNext(cmp, '🍓', [])).toBe(false);
    expect(fruitVerdict(cmp, '🍇', 15, [])).toMatchObject({ ok: false, near: true });
  });
});

describe('inequalities and patterns', () => {
  it('checks the dot and the shading', () => {
    const spec = { kind: 'ineqline' as const, min: -2, max: 10, value: 4, op: '>' as const };
    expect(ineqVerdict(spec, { at: 4, closed: false, right: true }).ok).toBe(true);
    expect(ineqVerdict(spec, { at: 4, closed: true, right: true })).toMatchObject({ ok: false, near: true });
    expect(ineqVerdict(spec, { at: 4, closed: false, right: false })).toMatchObject({ ok: false, near: true });
    expect(ineqVerdict(spec, { at: 6, closed: false, right: true }).ok).toBe(false);
  });
  it('counts matchsticks with shared walls', () => {
    expect([1, 2, 3].map((n) => sticks('squares', n))).toEqual([4, 7, 10]);
    expect([1, 2, 3].map((n) => sticks('triangles', n))).toEqual([3, 5, 7]);
  });
});

describe('validateGame', () => {
  it('rejects a chain whose nudge is the answer', () => {
    expect(validateGame({ kind: 'chain', steps: [{ tex: '\\box', answer: 3, nudges: [{ value: 3, text: '' }] }] })).not.toBeNull();
    expect(validateGame({ kind: 'chain', steps: [{ tex: '\\box', answer: 3 }] })).toBeNull();
  });
  it('rejects a fruit puzzle that cannot be cracked', () => {
    const stuck = {
      kind: 'fruit' as const,
      rows: [{ items: ['🍎', '🍌'], total: 9 }],
      values: { '🍎': 4, '🍌': 5 },
    };
    expect(validateGame(stuck)).not.toBeNull();
  });
});

describe('sizes in words', () => {
  it('says rough sizes roughly', () => {
    expect(sizeText(828)).toBe('828 m');
    expect(sizeText(1.27e7)).toBe('12,700 km');
    expect(sizeText(1.5e11)).toBe('150 million km');
    expect(sizeText(9.461e15 * 2.537e6)).toBe('2.5 million light years');
    expect(sizeText(8.8e26)).toBe('93 billion light years');
    expect(sizeText(1.7e-15)).toBe('1.7 femtometres');
  });
});
