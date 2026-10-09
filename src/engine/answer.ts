/**
 * Checking answers. A wrong answer that matches a predicted mistake (or a generic
 * near-miss like a flipped sign or a slipped decimal point) earns a nudge and a retry.
 */
import type { Problem } from '../skills/types';

export type Verdict = { kind: 'right' } | { kind: 'nudge'; text: string } | { kind: 'wrong' };

/** Parses keypad input like "-3", ".5", "1,000". Returns NaN when not a number. */
export function parseNumber(s: string): number {
  const t = s.replace(/[,\s]/g, '').replace(/−/g, '-');
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(t)) return NaN;
  return Number(t);
}

export function sameNumber(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
}

/** Generic near-misses for numbers. */
function genericNudge(given: number, want: number): string | null {
  if (want !== 0 && sameNumber(given, -want))
    return 'So close — check the **sign**! Is it positive or negative?';
  if (want !== 0 && given !== 0) {
    const r = given / want;
    for (const f of [10, 100, 1000, 0.1, 0.01, 0.001]) {
      if (sameNumber(r, f))
        return 'The digits are right, but check where the **decimal point** goes (or the number of zeros).';
    }
  }
  return null;
}

/**
 * @param given  number typed, or option index picked
 * @param nudged whether this problem already used its nudge (only one per problem)
 */
export function judge(p: Problem, given: number, nudged: boolean): Verdict {
  if (p.answer.kind === 'number') {
    if (sameNumber(given, p.answer.value)) return { kind: 'right' };
    if (!nudged) {
      const n = p.nudges?.find((x) => sameNumber(x.match, given));
      if (n) return { kind: 'nudge', text: n.text };
      const g = genericNudge(given, p.answer.value);
      if (g) return { kind: 'nudge', text: g };
    }
    return { kind: 'wrong' };
  }
  if (given === p.answer.correct) return { kind: 'right' };
  if (!nudged) {
    const n = p.nudges?.find((x) => x.match === given);
    if (n) return { kind: 'nudge', text: n.text };
  }
  return { kind: 'wrong' };
}
