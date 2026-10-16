/**
 * The Mistake Hunt twist (higher ranks): before the player answers, someone else does — often
 * with one of the classic mistakes the generator predicts (its nudges), sometimes correctly.
 * The player first decides whether the claim is right, then (if it isn't) gives the real
 * answer. Checking someone else's work is a different skill from doing your own, and the
 * predicted mistakes are exactly the ones worth learning to spot.
 */
import type { Problem } from '../skills/types';
import type { Rng } from './rng';

export interface Claim {
  /** The claimed number, or option index. */
  value: number;
  right: boolean;
  /** Why it's wrong (the nudge text), for after the player catches it. */
  why?: string;
}

/** A claim to check, or null when the problem doesn't suit the twist. */
export function criticClaim(p: Problem, rng: Rng): Claim | null {
  const a = p.answer;
  if (a.kind !== 'number' && a.kind !== 'choice') return null;
  const nudges = p.nudges ?? [];
  const correct = a.kind === 'number' ? a.value : a.correct;
  if (nudges.length > 0 && rng.chance(0.7)) {
    const n = rng.pick(nudges);
    return { value: n.match, right: false, why: n.text };
  }
  if (rng.chance(nudges.length > 0 ? 1 : 0.5)) return { value: correct, right: true };
  if (a.kind === 'choice') {
    const wrong = a.options.map((_, i) => i).filter((i) => i !== a.correct);
    return { value: rng.pick(wrong), right: false };
  }
  const v = a.value;
  const off = Number.isInteger(v) ? rng.pick([1, -1, 2, 10]) : rng.pick([0.1, -0.1]);
  const value = off === 10 && v !== 0 ? v * 10 : v + off;
  return { value, right: false, why: off === 10 ? 'One zero too many — the place value slipped.' : undefined };
}
