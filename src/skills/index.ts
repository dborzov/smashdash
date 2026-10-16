/**
 * Registry of problem generators, keyed by skill id.
 * Skill metadata (names, descriptions) lives in content/skills.yaml; every id there must
 * have a generator here (enforced by tests/content.test.ts).
 */
import type { GenContext, Generator, Level, Problem } from './types';
import { Rng } from '../engine/rng';
import { evalOne, evalParens, evalTwo, notation, wordsToExpr } from './expressions';
import { balanceRule, bothSides, inverseOps, pickMove } from './balance';
import { checkSolution, oneStepAdd, oneStepMul, twoStep, undoOrder } from './equations';
import { nameUnknown, storySolve, storyToEquation } from './words';
import { pow10Down, pow10Up, powerMeaning, sciNotation, timesPow10 } from './powers';
import { copyGroups, expand, expandCheck, roundDown, splitTens } from './distribute';
import { lineRule, plotPoint, readPoint, stepPattern, tableRule } from './graphs';
import { closedLoop, current, ohmCurrent, ohmSolve, resistance, volts } from './electricity';
import {
  pvCompare,
  pvExpanded,
  pvNumberline,
  pvPlaces,
  pvRead,
  pvRegroup,
  pvShift,
  pvTimesTen,
  pvValue,
  pvWrite,
} from './placevalue';
import { estimate, pow10Places, roundBig, roundRange, roundSmall } from './rounding';
import { decCompare, decPlaces, decRound, decShift, decWrite } from './decimals';

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
  'copy-groups': copyGroups,
  expand,
  'expand-check': expandCheck,
  'split-tens': splitTens,
  'round-down': roundDown,
  'read-point': readPoint,
  'plot-point': plotPoint,
  'table-rule': tableRule,
  'step-pattern': stepPattern,
  'line-rule': lineRule,
  'closed-loop': closedLoop,
  volts,
  current,
  resistance,
  'ohm-current': ohmCurrent,
  'ohm-solve': ohmSolve,
  // The Long Count
  'pv-places': pvPlaces,
  'pv-value': pvValue,
  'pv-read': pvRead,
  'pv-write': pvWrite,
  'pv-expanded': pvExpanded,
  'pv-compare': pvCompare,
  'pv-times-ten': pvTimesTen,
  'pv-regroup': pvRegroup,
  'pv-shift': pvShift,
  'pv-numberline': pvNumberline,
  'round-small': roundSmall,
  'round-big': roundBig,
  'round-range': roundRange,
  estimate,
  'pow10-places': pow10Places,
  'dec-places': decPlaces,
  'dec-write': decWrite,
  'dec-compare': decCompare,
  'dec-shift': decShift,
  'dec-round': decRound,
};

/** Difficulty tier from mastery in [0, 1]. */
export function levelFor(mastery: number): Level {
  return mastery < 0.35 ? 1 : mastery < 0.7 ? 2 : 3;
}

export function generate(
  skill: string,
  level: Level,
  rng: Rng = new Rng(),
  ctx?: GenContext,
): Problem {
  const g = generators[skill];
  if (!g) throw new Error(`No generator for skill "${skill}"`);
  return g(rng, level, ctx);
}

/**
 * Like `generate`, but tries to produce a problem that exercises `atom` (to drill a
 * mistake). Generators aren't told the atom; we sample until one matches, first at the
 * requested level, then at easier levels, then harder ones. Deterministic for a given rng.
 */
export function generateFor(
  skill: string,
  level: Level,
  rng: Rng = new Rng(),
  atom?: string,
  ctx?: GenContext,
): Problem {
  const first = generate(skill, level, rng, ctx);
  if (!atom || first.atoms.includes(atom)) return first;
  const levels: Level[] = [
    level,
    ...([1, 2, 3] as Level[]).filter((l) => l < level).reverse(),
    ...([1, 2, 3] as Level[]).filter((l) => l > level),
  ];
  for (const l of levels) {
    for (let i = 0; i < 40; i++) {
      const p = generate(skill, l, rng, ctx);
      if (p.atoms.includes(atom)) return p;
    }
  }
  return first;
}

export type { GenContext, Generator, Level, Problem } from './types';
