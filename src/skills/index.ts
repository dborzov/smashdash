/**
 * Registry of problem generators, keyed by skill id.
 * Skill metadata (names, descriptions) lives in content/skills.yaml; every id there must
 * have a generator here (enforced by tests/content.test.ts).
 */
import type { Generator, Level, Problem } from './types';
import { Rng } from '../engine/rng';
import { evalOne, evalParens, evalTwo, notation, wordsToExpr } from './expressions';
import { balanceRule, bothSides, inverseOps, pickMove } from './balance';
import { checkSolution, oneStepAdd, oneStepMul, twoStep, undoOrder } from './equations';
import { nameUnknown, storySolve, storyToEquation } from './words';
import { pow10Down, pow10Up, powerMeaning, sciNotation, timesPow10 } from './powers';

export const generators: Record<string, Generator> = {
  notation,
  'eval-one': evalOne,
  'eval-two': evalTwo,
  'eval-parens': evalParens,
  'words-to-expr': wordsToExpr,
  'balance-rule': balanceRule,
  'both-sides': bothSides,
  'inverse-ops': inverseOps,
  'pick-move': pickMove,
  'one-step-add': oneStepAdd,
  'one-step-mul': oneStepMul,
  'check-solution': checkSolution,
  'undo-order': undoOrder,
  'two-step': twoStep,
  'name-unknown': nameUnknown,
  'story-to-equation': storyToEquation,
  'story-solve': storySolve,
  'power-meaning': powerMeaning,
  'pow10-up': pow10Up,
  'pow10-down': pow10Down,
  'times-pow10': timesPow10,
  'sci-notation': sciNotation,
};

/** Difficulty tier from mastery in [0, 1]. */
export function levelFor(mastery: number): Level {
  return mastery < 0.35 ? 1 : mastery < 0.7 ? 2 : 3;
}

export function generate(skill: string, level: Level, rng: Rng = new Rng()): Problem {
  const g = generators[skill];
  if (!g) throw new Error(`No generator for skill "${skill}"`);
  return g(rng, level);
}

export type { Generator, Level, Problem } from './types';
