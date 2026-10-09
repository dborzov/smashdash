import type { Rng } from '../engine/rng';

/** Difficulty tier inside one skill. Chosen from the player's mastery of that skill. */
export type Level = 1 | 2 | 3;

/**
 * A predicted mistake. When the player's answer matches, we do not mark it wrong right away:
 * we show `text` ("Close! ...") and let them try again once.
 * For number answers `match` is the wrong value; for choice answers it is the option index.
 */
export interface Nudge {
  match: number;
  text: string;
}

export type Answer =
  { kind: 'number'; value: number } | { kind: 'choice'; options: string[]; correct: number };

/** Optional picture shown with a problem. */
export type Visual =
  | { kind: 'boxes'; a: number; b: number; reveal?: number }
  | { kind: 'balance'; left: Pan; right: Pan }
  | { kind: 'power'; base: number; exp: number };

/** One side of a balance scale: `x` mystery boxes plus `c` coins. */
export interface Pan {
  x: number;
  c: number;
}

export interface Problem {
  skill: string;
  /** Rich text (supports $LaTeX$ and **bold**). */
  prompt: string;
  /** Big, centred LaTeX shown under the prompt. */
  math?: string;
  visual?: Visual;
  answer: Answer;
  nudges?: Nudge[];
  /** A gentle hint (unlocked by a hint scroll in battles; free in lessons). */
  hint?: string;
  /** Worked solution shown after a wrong answer. Rich text. */
  explain: string;
}

export type Generator = (rng: Rng, level: Level) => Problem;
