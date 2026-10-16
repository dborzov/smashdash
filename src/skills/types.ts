import type { Rng } from '../engine/rng';
import type { Widget } from '../content/schema';

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
  | { kind: 'number'; value: number }
  | { kind: 'choice'; options: string[]; correct: number }
  | OrderAnswer
  | LineAnswer
  | CanvasAnswer
  | GameAnswer;

/**
 * Played as a mini-game (src/ui/games): build an array, place things on the Scale Ladder,
 * fly the balloon, sort terms, crack the fruit puzzle, work a chain of steps… The game gives
 * feedback on every move and reports right (no slips), nudged (slips put right) or wrong
 * ("show me").
 */
export interface GameAnswer {
  kind: 'game';
  game: GameSpec;
}

/** A mini-game, as used in practice problems. The same shapes are content widgets. */
export type GameSpec = Extract<
  Widget,
  {
    kind:
      | 'array'
      | 'skipjump'
      | 'tablegrid'
      | 'squaregrow'
      | 'chain'
      | 'sizeline'
      | 'sampler'
      | 'balloon'
      | 'sorter'
      | 'fruit'
      | 'ineqline';
  }
>;

export type ChainSpec = Extract<Widget, { kind: 'chain' }>;
export type ChainStep = ChainSpec['steps'][number];

/**
 * Worked on the EQcanvas slate (src/ui/eqcanvas): build an equation from story tiles, then
 * solve it one move at a time on both sides, with feedback on every step.
 *  - build: write the equation that tells the story;
 *  - solve: solve a given equation, showing each move;
 *  - full:  build it, solve it, then answer the question that was asked;
 *  - move:  make just the first move (which move frees x?).
 */
export interface CanvasAnswer {
  kind: 'canvas';
  mode: 'build' | 'solve' | 'full' | 'move';
  /** The equation to build, or the one to solve, as text: '8x+3=51', 'x/4=6', '3(x+2)=21'. */
  equation: string;
  /** The value of x. */
  x: number;
  /** build/full: the story, numbers marked as tiles: 'bags of [[6|apples in each bag]]'. */
  story?: string;
  /** The question the story asks, shown in bold after it. */
  question?: string;
  /** What x stands for: 'the number of bags'. */
  unknown?: string;
  /** The answer's unit, for the final line: 'bags'. */
  unit?: string;
  /** The equation in words, offered as a pattern to follow. */
  words?: string;
  /** Show the words pattern from the start (otherwise after the first miss). */
  scaffold?: boolean;
  /** Predicted wrong equations, each with a nudge. */
  traps?: { eq: string; text: string }[];
  /** Hints for writing the equation, gentlest first. */
  hints?: string[];
}

/**
 * Put the items in order (tap them one by one). `correct` lists item indices in the right
 * order. `traps` are predicted wrong orders (e.g. sorted by first digit) with a nudge each.
 */
export interface OrderAnswer {
  kind: 'order';
  items: string[];
  correct: number[];
  /** Shown above the slots, e.g. "smallest → largest". */
  direction: string;
  traps?: { order: number[]; text: string }[];
}

/**
 * Tap a spot on a number line. The tap snaps to `snap`; anything within `tolerance` of
 * `value` counts as right. Number nudges (Problem.nudges) also match within the tolerance.
 */
export interface LineAnswer {
  kind: 'line';
  min: number;
  max: number;
  /** Distance between labelled ticks. */
  step: number;
  /** Distance between minor ticks (default: step / 10 when that is a whole number). */
  minor?: number;
  snap: number;
  value: number;
  tolerance: number;
  /** Label the ticks? (default: only the ends) */
  labels?: 'ends' | 'all';
}

/**
 * How a number answer is typed. `dials` shows one dial per place (a combination lock), so the
 * player sees which place each digit goes in. `int` = whole-number places, `dec` = decimal places.
 */
export interface DialsEntry {
  kind: 'dials';
  int: number;
  dec?: number;
}

/** Optional picture shown with a problem. */
export type Visual =
  | Extract<Widget, { kind: 'array' | 'matchsticks' | 'tablegrid' | 'balloon' }>
  | { kind: 'boxes'; a: number; b: number; reveal?: number }
  | { kind: 'balance'; left: Pan; right: Pan }
  | { kind: 'power'; base: number; exp: number }
  | GroupsPic
  | AreaPic
  | PlotPic
  | CircuitPic
  | PlaceChartPic
  | NumberLinePic
  | DecimalGridPic;

/** A place-value chart: one column per place, grouped into periods (millions, thousands, ones). */
export interface PlaceChartPic {
  kind: 'placechart';
  /** The number shown (digits fill the columns). Omit for an empty chart. */
  value?: number;
  /** Number of decimal places shown (0 = whole numbers only). */
  dec?: number;
  /** Highest place shown, as a power of ten (default: the number's own top place). */
  top?: number;
  /** Place to highlight, as a power of ten (2 = hundreds, -1 = tenths). */
  hl?: number;
  /** Hide the digit in the highlighted place (a "?" instead). */
  hide?: boolean;
}

/** A number line with ticks, optional marked points and an arrow. */
export interface NumberLinePic {
  kind: 'numberline';
  min: number;
  max: number;
  step: number;
  minor?: number;
  labels?: 'ends' | 'all';
  /** An arrow pointing at this value (the "what number is here?" question). */
  arrow?: number;
  /** Lettered marks (for "which letter is 350,000?"). */
  marks?: { at: number; label: string }[];
  /** Shade the half-way point (for rounding). */
  mid?: boolean;
}

/** A 10 × 10 grid of hundredths (or a strip of tenths) with some cells shaded. */
export interface DecimalGridPic {
  kind: 'decgrid';
  /** Shaded amount, e.g. 0.37. */
  value: number;
}

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
  /**
   * The atomic sub-skills this problem exercises (ids local to the skill, declared under
   * `atoms:` in content/skills.yaml). Used for fine-grained progress and adaptive practice.
   */
  atoms: string[];
  /** How the player enters a number answer (default: keypad). */
  entry?: DialsEntry;
  /** Times-table facts this problem uses ([7, 8] for 7 × 8), for the fact map. */
  facts?: [number, number][];
  /** Size cards (content/sizes.yaml) collected by answering this right. */
  cards?: string[];
}

/** What a generator may know about the player (to aim practice at weak spots). */
export interface GenContext {
  /** How much each times-table fact needs practice, keyed `a×b` (see engine/facts.ts). */
  factWeights?: Record<string, number>;
}

export type Generator = (rng: Rng, level: Level, ctx?: GenContext) => Problem;
