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
