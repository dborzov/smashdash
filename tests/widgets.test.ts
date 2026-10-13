/** Pure logic behind the interactive widgets. */
import { describe, expect, it } from 'vitest';
import { aimVerdict } from '../src/ui/widgets/Plot';
import { circuitState } from '../src/skills/electricity';
import { ruleTex } from '../src/skills/graphs';

describe('laser aiming', () => {
  it('hits, swaps and near-misses', () => {
    expect(aimVerdict(2, 7, 2, 7)).toBe('hit');
    expect(aimVerdict(7, 2, 2, 7)).toBe('swapped');
    expect(aimVerdict(2, 6, 2, 7)).toBe('column');
    expect(aimVerdict(3, 7, 2, 7)).toBe('along');
  });
  it('writes rules nicely', () => {
    expect(ruleTex(2, 3)).toBe('y = 2x + 3');
    expect(ruleTex(1, -2)).toBe('y = x - 2');
    expect(ruleTex(3, 0)).toBe('y = 3x');
  });
});

describe('circuits', () => {
  it('Ohm: 4 AAs through a 3 ohm motor is 2 amps', () => {
    expect(circuitState({ kind: 'circuit', cells: 4, ohms: 3 })).toMatchObject({
      volts: 6,
      ohms: 3,
      amps: 2,
      closed: true,
    });
  });
  it('mud tunnels add resistance', () => {
    expect(circuitState({ kind: 'circuit', cells: 4, ohms: 3, mud: 1, mudOhms: 3 }).amps).toBe(1);
  });
  it('a backwards cell cancels a forwards one', () => {
    expect(circuitState({ kind: 'circuit', cells: 2, flipped: 1 }).amps).toBe(0);
    expect(circuitState({ kind: 'circuit', cells: 3, flipped: 1 }).volts).toBe(1.5);
    expect(circuitState({ kind: 'circuit', cells: 3, flipped: 2 }).reversed).toBe(true);
  });
  it('gaps and same-end wiring stop the flow', () => {
    expect(circuitState({ kind: 'circuit', cells: 2, gap: true }).amps).toBe(0);
    expect(circuitState({ kind: 'circuit', cells: 2, sameEnd: true }).amps).toBe(0);
  });
});

import {
  boardValue,
  breakToken,
  logPos,
  logValue,
  shiftDigits,
  trade,
} from '../src/ui/widgets/PlaceValue';
import { decimalWords, digitAt, group, roundTo, topPlace, words } from '../src/skills/place';
import { judge } from '../src/engine/answer';
import type { Problem } from '../src/skills/types';

describe('the Reckoning Board', () => {
  it('counts tokens by place, even before trading', () => {
    expect(boardValue([3, 12, 0, 4])).toBe(4123);
  });
  it('trading ten for one keeps the value; breaking one into ten too', () => {
    const c = [5, 12, 9, 0];
    expect(boardValue(trade(c, 1))).toBe(boardValue(c));
    expect(trade(c, 1)).toEqual([5, 2, 10, 0]);
    expect(boardValue(breakToken(c, 2))).toBe(boardValue(c));
    expect(trade(c, 0)).toEqual(c); // nothing to trade
  });
});

describe('log line', () => {
  it('every power of ten is one equal step', () => {
    expect(logPos(1, 0, 6)).toBe(0);
    expect(logPos(1000, 0, 6)).toBeCloseTo(0.5);
    expect(logPos(1e6, 0, 6)).toBe(1);
  });
  it('reads friendly values', () => {
    expect(logValue(0.5, 0, 6)).toBe(1000);
    expect(logValue(0, 0, 6)).toBe(1);
  });
});

describe('shifter', () => {
  it('lays digits out by place', () => {
    expect(shiftDigits(35.2, 2, -2).map((c) => c.digit)).toEqual([null, 3, 5, 2, null]);
  });
});

describe('place helpers', () => {
  it('digits, groups and rounding', () => {
    expect(digitAt(4372519, 4)).toBe(7);
    expect(digitAt(3.472, -2)).toBe(7);
    expect(topPlace(4372519)).toBe(6);
    expect(group(2040006)).toBe('2,040,006');
    expect(group(0.045)).toBe('0.045');
    expect(roundTo(9960, 2)).toBe(10000);
    expect(roundTo(4350, 2)).toBe(4400);
    expect(roundTo(2.45, -1)).toBe(2.5);
    expect(roundTo(2.96, -1)).toBe(3);
  });
  it('number words', () => {
    expect(words(2040006)).toBe('two million, forty thousand, six');
    expect(words(4372519)).toBe(
      'four million, three hundred seventy-two thousand, five hundred nineteen',
    );
    expect(words(100000)).toBe('one hundred thousand');
    expect(decimalWords(4.027)).toBe('four and twenty-seven thousandths');
    expect(decimalWords(0.05)).toBe('five hundredths');
    expect(decimalWords(0.1)).toBe('one tenth');
  });
});

describe('new answer formats', () => {
  const order: Problem = {
    skill: 't',
    atoms: [],
    prompt: 'p',
    explain: 'e',
    answer: {
      kind: 'order',
      items: ['a', 'b', 'c'],
      correct: [2, 0, 1],
      direction: 'small → big',
      traps: [{ order: [0, 1, 2], text: 'trap' }],
    },
  };
  it('orders: right, trap nudge, reversed nudge, wrong', () => {
    expect(judge(order, [2, 0, 1], false).kind).toBe('right');
    expect(judge(order, [0, 1, 2], false)).toEqual({ kind: 'nudge', text: 'trap' });
    expect(judge(order, [1, 0, 2], false).kind).toBe('nudge');
    expect(judge(order, [1, 2, 0], false).kind).toBe('wrong');
    expect(judge(order, [0, 1, 2], true).kind).toBe('wrong');
  });
  const line: Problem = {
    skill: 't',
    atoms: [],
    prompt: 'p',
    explain: 'e',
    answer: { kind: 'line', min: 0, max: 1000, step: 100, snap: 10, value: 350, tolerance: 10 },
    nudges: [{ match: 35, text: 'too small' }],
  };
  it('number lines: within tolerance is right; predicted spots nudge', () => {
    expect(judge(line, 360, false).kind).toBe('right');
    expect(judge(line, 340, false).kind).toBe('right');
    expect(judge(line, 30, false)).toEqual({ kind: 'nudge', text: 'too small' });
    expect(judge(line, 500, false).kind).toBe('wrong');
  });
});
