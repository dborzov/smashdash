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
  | { kind: 'power'; base: number; exp: number }
  | GroupsPic
  | AreaPic
  | PlotPic
  | CircuitPic;

/** `n` identical parcels, each holding `x` mystery boxes and `c` coins: n(x + c). */
export interface GroupsPic {
  kind: 'groups';
  n: number;
  x?: number;
  c: number;
  /** Interactive: tap each parcel to unpack it, then everything sorts into two piles. */
  sort?: boolean;
}

/** A rows × (tens + extra) grid of crystals, split into a round part and a small strip. */
export interface AreaPic {
  kind: 'area';
  rows: number;
  /** Width of the round part (10, 20…). */
  tens: number;
  /** Positive: extra columns added on. Negative: columns a bat eats away. */
  extra: number;
  /** Interactive: tap the parts to count them. */
  tap?: boolean;
}

export interface PlotPoint {
  x: number;
  y: number;
  label?: string;
}

/** A coordinate grid from 0 to `size` with dots and maybe a laser line y = m x + b. */
export interface PlotPic {
  kind: 'plot';
  size?: number;
  points?: PlotPoint[];
  line?: { m: number; b: number };
  /** Interactive: the rule to aim with, and the x values to fire at, in order. */
  rule?: { m: number; b: number };
  targets?: number[];
  /** Interactive: plain points to fire at, in order (no rule needed). */
  aim?: PlotPoint[];
}

/** A battery-and-wire loop. */
export interface CircuitPic {
  kind: 'circuit';
  /** AA cells in the battery pack. */
  cells: number;
  /** How many of those cells are put in backwards. */
  flipped?: number;
  /** Volts per cell (AA = 1.5). */
  volts?: number;
  load?: 'bulb' | 'motor';
  /** Resistance of the bulb or motor, ohms. */
  ohms?: number;
  /** Extra "mud tunnel" resistors in the loop. */
  mud?: number;
  /** Ohms per mud tunnel. */
  mudOhms?: number;
  /** A break in the wire. */
  gap?: boolean;
  /** Both wires on the same end of the battery. */
  sameEnd?: boolean;
  /** Show the V, R and I readout. */
  readout?: boolean;
  /** Interactive controls. */
  tools?: ('cells' | 'mud' | 'flip' | 'close')[];
  /** Interactive goal: close the gap, or reach `target` volts or amps. */
  goal?: 'close' | 'volts' | 'amps';
  target?: number;
  /** The load pops above this many amps. */
  fuse?: number;
}

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
