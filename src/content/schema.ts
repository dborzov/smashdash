/**
 * Content schema. All YAML under content/ is validated against these in tests
 * (tests/content.test.ts), and the TypeScript types the game uses are inferred from them.
 * Runtime code only imports *types* from here, so zod never ships to players.
 */
import { z } from 'zod';

const Rich = z.string().min(1);
const Pan = z.object({ x: z.number().int().min(0), c: z.number().int().min(0) });

export const Widget = z.discriminatedUnion('kind', [
  /** a mystery boxes and b coins; `reveal` lets the player tap boxes open to show the value. */
  z.object({ kind: z.literal('boxes'), a: z.number().int().min(0), b: z.number().int().min(0), reveal: z.number().optional() }),
  /** Interactive balance scale. With `goal: isolate` the beat finishes when one box is alone. */
  z.object({
    kind: z.literal('balance'),
    left: Pan,
    right: Pan,
    value: z.number().int().min(0).optional(),
    goal: z.enum(['isolate', 'tip', 'none']).default('none'),
    /** Which tools are available. */
    tools: z.array(z.enum(['both', 'left', 'right', 'divide', 'boxes'])).default(['both']),
  }),
  /** Slider over powers of ten. */
  z.object({ kind: z.literal('powers'), min: z.number().int(), max: z.number().int(), start: z.number().int().default(0) }),
  /** Decimal point hopping: mantissa × 10^exp. */
  z.object({ kind: z.literal('hop'), mantissa: z.number(), exp: z.number().int() }),
  /** Repeated multiplication tower: base^exp. */
  z.object({ kind: z.literal('tower'), base: z.number().int(), exp: z.number().int().min(1).max(5) }),
  /** A box wrapped in layers of operations; tap the outermost layer to unwrap. */
  z.object({ kind: z.literal('unwrap'), layers: z.array(z.string()).min(1), value: z.number().optional() }),
  /** n copies of a parcel (x boxes + c coins): n(x + c). With `sort`, tap to unpack and sort. */
  z.object({
    kind: z.literal('groups'),
    n: z.number().int().min(1).max(6),
    x: z.number().int().min(0).max(3).optional(),
    c: z.number().int().min(0).max(6),
    sort: z.boolean().optional(),
  }),
  /** rows × (tens ± extra) crystal grid: 7 × 12 = 7 × 10 + 7 × 2, or 7 × 9 = 7 × 10 − 7. */
  z.object({
    kind: z.literal('area'),
    rows: z.number().int().min(1).max(12),
    tens: z.number().int().min(1).max(30),
    extra: z.number().int().min(-5).max(9),
    tap: z.boolean().optional(),
  }),
  /** Coordinate grid. With `rule` + `targets`, the player fires the laser at each point. */
  z.object({
    kind: z.literal('plot'),
    size: z.number().int().min(4).max(20).optional(),
    points: z.array(z.object({ x: z.number(), y: z.number(), label: z.string().optional() })).optional(),
    line: z.object({ m: z.number(), b: z.number() }).optional(),
    rule: z.object({ m: z.number(), b: z.number() }).optional(),
    targets: z.array(z.number().int().min(0)).optional(),
    aim: z.array(z.object({ x: z.number().int().min(0), y: z.number().int().min(0) })).optional(),
  }),
  /** Battery, wires and a bulb or motor. Tools make it a little workshop. */
  z.object({
    kind: z.literal('circuit'),
    cells: z.number().int().min(0).max(8),
    flipped: z.number().int().min(0).optional(),
    volts: z.number().positive().optional(),
    load: z.enum(['bulb', 'motor']).optional(),
    ohms: z.number().positive().optional(),
    mud: z.number().int().min(0).max(6).optional(),
    mudOhms: z.number().positive().optional(),
    gap: z.boolean().optional(),
    sameEnd: z.boolean().optional(),
    readout: z.boolean().optional(),
    tools: z.array(z.enum(['cells', 'mud', 'flip', 'close'])).optional(),
    goal: z.enum(['close', 'volts', 'amps']).optional(),
    target: z.number().positive().optional(),
    fuse: z.number().positive().optional(),
  }),
  /** Water-tank analogy: tank height = push (volts), pipe squeeze = ohms, flow = amps. */
  z.object({
    kind: z.literal('pipe'),
    height: z.number().int().min(1).max(6),
    squeeze: z.number().int().min(1).max(4),
    target: z.number().positive().optional(),
  }),
  /**
   * Place-value chart (periods: millions, thousands, ones; decimals after the point).
   * `hl` highlights a place (power of ten). With `tap`, the player taps columns to see what
   * each digit is worth; the beat finishes after `tap` columns (or the highlighted one).
   */
  z.object({
    kind: z.literal('placechart'),
    value: z.number().min(0).optional(),
    dec: z.number().int().min(0).max(3).optional(),
    top: z.number().int().min(0).max(9).optional(),
    hl: z.number().int().min(-3).max(9).optional(),
    hide: z.boolean().optional(),
    tap: z.number().int().min(1).max(10).optional(),
  }),
  /**
   * The Reckoning Board: a counting table with one column of tokens per place. + and − per
   * column; ten tokens in a column can be traded for one token in the next column left.
   * With `target`, the beat finishes when the board shows exactly that number.
   */
  z.object({
    kind: z.literal('abacus'),
    places: z.number().int().min(2).max(7),
    start: z.number().int().min(0).optional(),
    target: z.number().int().min(0).optional(),
    /** Trading mode: the target must be reached by trading, not by adding tokens. */
    trade: z.boolean().optional(),
  }),
  /** A number line. With `target`, the player taps to place it (within `tolerance`). */
  z.object({
    kind: z.literal('numberline'),
    min: z.number(),
    max: z.number(),
    step: z.number().positive(),
    minor: z.number().positive().optional(),
    labels: z.enum(['ends', 'all']).optional(),
    arrow: z.number().optional(),
    marks: z.array(z.object({ at: z.number(), label: z.string() })).optional(),
    mid: z.boolean().optional(),
    /** Shade the stretch from band[0] to band[1] (e.g. everything that rounds to a value). */
    band: z.tuple([z.number(), z.number()]).optional(),
    target: z.number().optional(),
    tolerance: z.number().min(0).optional(),
  }),
  /**
   * Log-scale line: every power of ten is one equal step (ones, tens, hundreds, …). Drag the
   * marker; with `target`, place the number in the right stretch (between the right powers).
   */
  z.object({
    kind: z.literal('logline'),
    min: z.number().int().min(-3).max(0),
    max: z.number().int().min(1).max(12),
    target: z.number().positive().optional(),
    /** Show a normal (linear) line underneath for comparison. */
    linear: z.boolean().optional(),
  }),
  /** Rounding on a zoomed number line: pick the nearer round number. */
  z.object({
    kind: z.literal('rounder'),
    value: z.number(),
    /** Round to this place, as a power of ten (3 = nearest thousand, -1 = nearest tenth). */
    place: z.number().int().min(-2).max(7),
  }),
  /** ×10 / ÷10 as digits sliding between fixed place columns (the point stays put). */
  z.object({
    kind: z.literal('shifter'),
    value: z.number().min(0),
    /** Number of ×10 steps (negative = ÷10 steps). */
    times: z.number().int().min(-4).max(4),
  }),
  /** A grid of hundredths (or thousandths strip) with `value` shaded. */
  z.object({ kind: z.literal('decgrid'), value: z.number().min(0).max(1) }),
  /**
   * Rows × columns of gems. `show` is a picture; `build` asks for an array of `target` gems
   * (with `fixRows`, the rows are given); `turn` rotates it (a × b = b × a); `split` cuts it
   * between two rows (7 × 6 = 5 × 6 + 2 × 6); `double` copies it (× 2, × 4, × 8).
   */
  z.object({
    kind: z.literal('array'),
    rows: z.number().int().min(1).max(12),
    cols: z.number().int().min(1).max(12),
    mode: z.enum(['show', 'build', 'turn', 'split', 'double']).optional(),
    target: z.number().int().min(1).max(144).optional(),
    fixRows: z.boolean().optional(),
    /** Split mode: the row to cut after (any row if left out). */
    at: z.number().int().min(1).optional(),
    /** Double mode: how many doublings (1–3). */
    times: z.number().int().min(1).max(3).optional(),
  }),
  /** A frog skip-counting along a number line: tap where it lands on each jump. */
  z.object({
    kind: z.literal('skipjump'),
    step: z.number().int().min(1).max(12),
    jumps: z.number().int().min(1).max(12),
    start: z.number().int().min(0).optional(),
  }),
  /**
   * The times table as a grid. `show`: just the table. `find`: tap every cell equal to
   * `target`. `squares`: tap the diagonal. `mirror`: tap a cell, its mirror image lights up.
   * `row`: fill row `row` cell by cell (skip counting).
   */
  z.object({
    kind: z.literal('tablegrid'),
    size: z.number().int().min(5).max(12).optional(),
    mode: z.enum(['show', 'find', 'squares', 'mirror', 'row']),
    target: z.number().int().min(1).max(144).optional(),
    row: z.number().int().min(1).max(12).optional(),
  }),
  /** Grow a square one L-shaped layer at a time: 1, 4, 9, 16… (each layer is an odd number). */
  z.object({ kind: z.literal('squaregrow'), upto: z.number().int().min(2).max(8) }),
  /**
   * A chain of small steps, each with its own answer and feedback (show your work for mental
   * maths): `7 \times 9 = 7 \times 10 - \box`. A step may offer `options` instead of a number.
   * `pics[i]` (optional) is the picture shown once i steps are done.
   */
  z.object({
    kind: z.literal('chain'),
    steps: z
      .array(
        z.object({
          tex: z.string(),
          say: Rich.optional(),
          answer: z.number(),
          options: z.array(Rich).min(2).optional(),
          nudges: z.array(z.object({ value: z.number(), text: Rich })).optional(),
          hint: Rich.optional(),
          note: Rich.optional(),
          /** Accept anything within this distance (estimates). */
          tolerance: z.number().min(0).optional(),
        }),
      )
      .min(1),
    pics: z.array(z.any()).optional(),
  }),
  /** The Scale Ladder: put things (ids in content/sizes.yaml) on a powers-of-ten line. */
  z.object({
    kind: z.literal('sizeline'),
    items: z.array(z.string()).min(1).max(6),
    min: z.number().int().min(-16).max(26).optional(),
    max: z.number().int().min(-15).max(27).optional(),
  }),
  /** A field of `n` dots on a grid × grid board: count one patch, scale up, estimate. */
  z.object({
    kind: z.literal('sampler'),
    n: z.number().int().min(20).max(5000),
    grid: z.number().int().min(2).max(10),
    seed: z.number().int(),
    icon: z.string().optional(),
  }),
  /**
   * Hot-air balloon for negative numbers: balloons lift (+1), sandbags pull down (−1).
   * With `op` and `k`, the player does `start op k` with the balloon (zero pairs and all).
   */
  z.object({
    kind: z.literal('balloon'),
    start: z.number().int().min(-10).max(10),
    op: z.enum(['add', 'sub']).optional(),
    k: z.number().int().min(-10).max(10).optional(),
  }),
  /** Sort terms into piles of like terms, then total each pile. */
  z.object({
    kind: z.literal('sorter'),
    terms: z.array(z.string()).min(2).max(10),
  }),
  /** Picture puzzles: rows of fruit that add up; work out what each fruit is worth. */
  z.object({
    kind: z.literal('fruit'),
    rows: z.array(z.object({ items: z.array(z.string()).min(1).max(5), total: z.number() })).min(1),
    values: z.record(z.string(), z.number()),
    /** Fruit to find, in order (default: all). */
    ask: z.array(z.string()).optional(),
  }),
  /** Show an inequality on a number line: pick the dot (open/closed) and shade a direction. */
  z.object({
    kind: z.literal('ineqline'),
    min: z.number().int(),
    max: z.number().int(),
    value: z.number().int(),
    op: z.enum(['<', '>', '<=', '>=']),
  }),
  /** A growing matchstick pattern: stage 1, 2, 3… (squares, triangles or houses in a row). */
  z.object({
    kind: z.literal('matchsticks'),
    shape: z.enum(['squares', 'triangles', 'houses']),
    stages: z.number().int().min(1).max(5),
  }),
  /**
   * The EQcanvas slate: write an equation from story tiles and/or solve it move by move on both
   * sides. `story` marks its numbers as tiles: '[[51|legs in all]]' ('[[4|bats|decoy]]' for a
   * number the question doesn't need). With `demo`, it plays itself one "Next step" at a time.
   */
  z.object({
    kind: z.literal('eqcanvas'),
    mode: z.enum(['build', 'solve', 'full', 'move']),
    /** As text: '8x+3=51', 'x/4=6', '3(x+2)=21'. */
    equation: z.string().regex(/^[0-9x+\-*/()=.]+$/),
    story: z.string().optional(),
    question: z.string().optional(),
    unknown: z.string().optional(),
    unit: z.string().optional(),
    words: z.string().optional(),
    scaffold: z.boolean().optional(),
    traps: z.array(z.object({ eq: z.string(), text: Rich })).optional(),
    hints: z.array(Rich).optional(),
    demo: z.boolean().optional(),
  }),
]);
export type Widget = z.infer<typeof Widget>;

export const Beat = z.discriminatedUnion('type', [
  z.object({ type: z.literal('say'), who: z.string(), text: Rich, mood: z.string().optional() }),
  z.object({ type: z.literal('narrate'), text: Rich }),
  z.object({ type: z.literal('show'), who: z.string().optional(), text: Rich.optional(), math: z.string().optional(), widget: Widget.optional() }),
  z.object({
    type: z.literal('ask'),
    who: z.string().optional(),
    text: Rich,
    math: z.string().optional(),
    widget: Widget.optional(),
    options: z.array(Rich).min(2),
    correct: z.number().int().min(0),
    explain: Rich,
    /** Nudges for specific wrong options, keyed by option index. */
    nudges: z.record(z.string(), Rich).optional(),
    /** The atom (of the lesson's skill) this check is about. */
    atom: z.string().optional(),
  }),
  z.object({
    type: z.literal('input'),
    who: z.string().optional(),
    text: Rich,
    math: z.string().optional(),
    widget: Widget.optional(),
    answer: z.number(),
    explain: Rich,
    hint: Rich.optional(),
    nudges: z.array(z.object({ value: z.number(), text: Rich })).optional(),
    atom: z.string().optional(),
    /** Enter the answer on place-value dials instead of the keypad. */
    dials: z.object({ int: z.number().int().min(1).max(10), dec: z.number().int().min(0).max(3).optional() }).optional(),
  }),
  /** Put things in order (tap them one by one). `correct` lists item indices in order. */
  z.object({
    type: z.literal('order'),
    who: z.string().optional(),
    text: Rich,
    items: z.array(Rich).min(2).max(6),
    correct: z.array(z.number().int().min(0)),
    direction: z.string(),
    explain: Rich,
    traps: z.array(z.object({ order: z.array(z.number().int()), text: Rich })).optional(),
    atom: z.string().optional(),
  }),
  /** Choose-your-own-adventure flavour: every option is fine, each gets its own reply. */
  z.object({
    type: z.literal('choose'),
    who: z.string().optional(),
    text: Rich,
    options: z.array(z.object({ text: Rich, reply: Rich, who: z.string().optional() })).min(2),
  }),
  /** An interactive widget the player must work through. */
  z.object({ type: z.literal('play'), who: z.string().optional(), text: Rich, widget: Widget, done: Rich.optional() }),
  /** A few generated problems inline. */
  z.object({ type: z.literal('practice'), skill: z.string(), count: z.number().int().min(1).max(10), level: z.number().int().min(1).max(3).optional(), text: Rich.optional() }),
  z.object({ type: z.literal('reward'), text: Rich.optional(), item: z.string().optional(), gold: z.number().int().optional(), egg: z.boolean().optional() }),
]);
export type Beat = z.infer<typeof Beat>;

export const Lesson = z.object({
  id: z.string(),
  title: z.string(),
  /** The skill this lesson teaches; finishing the lesson unlocks it for practice. */
  skill: z.string().optional(),
  beats: z.array(Beat).min(1),
});
export type Lesson = z.infer<typeof Lesson>;

export const Monster = z.object({
  name: z.string(),
  /** Seed for the procedural monster art. */
  seed: z.number().int(),
  hue: z.number().min(0).max(360).optional(),
  taunts: z.array(z.string()).optional(),
  /** Special hand-drawn art instead of the procedural monster. */
  art: z.enum(['muddler', 'hollow', 'wraith', 'tallyman', 'forger', 'golem', 'rider']).optional(),
});
export type Monster = z.infer<typeof Monster>;

export const Game = z.enum(['battle', 'chest', 'bridge', 'siege', 'vault', 'duel', 'rescue']);
export type Game = z.infer<typeof Game>;

const NodeBase = { id: z.string(), title: z.string() };
export const EncounterNode = z.object({
  ...NodeBase,
  type: z.literal('encounter'),
  game: Game,
  skills: z.array(z.string()).min(1),
  count: z.number().int().min(1).max(15).default(5),
  monster: Monster.optional(),
  /** `critic`: someone else answers first and the player checks them (a Mistake Hunt). */
  twist: z.enum(['critic']).optional(),
});
export type EncounterNode = z.infer<typeof EncounterNode>;
export const PathNode = z.discriminatedUnion('type', [
  z.object({ ...NodeBase, type: z.literal('lesson'), lesson: z.string() }),
  z.object({ ...NodeBase, type: z.literal('story'), lesson: z.string() }),
  EncounterNode,
  z.object({
    ...NodeBase,
    type: z.literal('boss'),
    monster: Monster,
    intro: z.array(z.string()).min(1),
    phases: z.array(z.object({ skills: z.array(z.string()).min(1), count: z.number().int().min(1), taunt: z.string() })).min(1),
    defeat: z.string(),
  }),
]);
export type PathNode = z.infer<typeof PathNode>;

/** Changes to the boss at a higher rank (a plot twist). Unset fields keep the original. */
export const RankBoss = z.object({
  name: z.string().optional(),
  seed: z.number().int().optional(),
  hue: z.number().min(0).max(360).optional(),
  intro: z.array(z.string()).min(1).optional(),
  /** One per phase, including the extra final phase every rank adds. */
  taunts: z.array(z.string()).optional(),
  defeat: z.string().optional(),
});

/** A higher rank of a region (Heroic = 2, Legendary = 3, …). See src/engine/ranks.ts. */
export const RankDef = z.object({
  rank: z.number().int().min(2).max(5),
  /** A short twist story played first. */
  story: z.string().optional(),
  boss: RankBoss.optional(),
  /** Extra nodes for this rank only (new problem types), played before the boss. */
  nodes: z.array(z.lazy(() => EncounterNode)).optional(),
});
export type RankDef = z.infer<typeof RankDef>;

/** Something only this region gives: for clearing a rank, or for flawless fights here. */
export const Treasure = z.object({
  item: z.string(),
  rank: z.number().int().min(1).max(5).optional(),
  flawless: z.number().int().min(1).optional(),
});
export type Treasure = z.infer<typeof Treasure>;

export const Region = z.object({
  id: z.string(),
  order: z.number().int(),
  name: z.string(),
  tagline: z.string(),
  /** Campaign (story arc) the region belongs to: an id in content/campaigns.yaml. */
  campaign: z.string().default('kingdom'),
  /** What the region teaches, in plain words, for the adventure board. */
  topic: z.string(),
  /** When the region was added to the game (YYYY-MM-DD), for "NEW" markers. */
  added: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Key of the scene painter in src/art/scenes. */
  scene: z.string(),
  /** Position on the world map, in percent. */
  map: z.object({ x: z.number(), y: z.number() }),
  requires: z.array(z.string()).default([]),
  palette: z.object({ sky: z.tuple([z.string(), z.string()]), accent: z.string(), ground: z.string() }),
  outro: z.string(),
  path: z.array(PathNode).min(1),
  /** Monsters for random encounters around this region. */
  monsters: z.array(Monster).min(1),
  ranks: z.array(RankDef).default([]),
  treasures: z.array(Treasure).default([]),
});
export type Region = z.infer<typeof Region>;

export const Atom = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  /** Rich text: what this one tiny idea is, e.g. "$10^2 = 100$". */
  name: z.string(),
});
export type Atom = z.infer<typeof Atom>;

export const Skill = z.object({
  id: z.string(),
  name: z.string(),
  region: z.string(),
  summary: z.string(),
  icon: z.string(),
  /** Skills that must be understood first (edges of the skill graph). */
  requires: z.array(z.string()).default([]),
  /** Atomic sub-skills. Every generated problem is tagged with one or more of these. */
  atoms: z.array(Atom).min(2),
});
export type Skill = z.infer<typeof Skill>;

export const ItemEffect = z.object({
  hunger: z.number().optional(),
  joy: z.number().optional(),
  health: z.number().optional(),
  clean: z.boolean().optional(),
  poop: z.number().optional(),
  heart: z.number().optional(),
  hint: z.boolean().optional(),
  shield: z.boolean().optional(),
  egg: z.boolean().optional(),
  sound: z.string().optional(),
  /** Battle: blocks the next lost heart. */
  ward: z.boolean().optional(),
  /** Battle: rules out two wrong options in a multiple-choice question. */
  lens: z.boolean().optional(),
  /** A timed boost: double XP or double gold from the next victory. */
  boost: z.enum(['xp2', 'lucky']).optional(),
  minutes: z.number().optional(),
  /** Pet: bond points. */
  bond: z.number().optional(),
});

/**
 * What a relic does while worn (see src/engine/relics.ts). `campaign` limits it to fights in
 * one campaign, so the best relic for a campaign is earned there.
 */
export const RelicEffect = z.object({
  campaign: z.string().optional(),
  /** Extra hearts in fights. */
  hearts: z.number().int().min(1).max(2).optional(),
  /** Free hints per fight. */
  hints: z.number().int().min(1).max(2).optional(),
  /** Start every fight with a ward up (blocks one lost heart). */
  ward: z.boolean().optional(),
  /** Extra loot gold, percent. */
  gold: z.number().int().min(5).max(100).optional(),
  /** Extra XP for winning, percent. */
  xp: z.number().int().min(5).max(100).optional(),
  /** Rally (a heart back) after this many clean answers instead of 3. */
  rally: z.number().int().min(2).max(3).optional(),
  /** The pet companion finds gold more often. */
  pet: z.boolean().optional(),
});
export type RelicEffect = z.infer<typeof RelicEffect>;

export const Item = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['food', 'toy', 'care', 'potion', 'hat', 'cape', 'special', 'decor', 'relic']),
  icon: z.string(),
  price: z.number().int().min(0),
  desc: z.string(),
  /** Funny line when used. */
  use: z.string().optional(),
  effect: ItemEffect.default({}),
  inShop: z.boolean().default(true),
  /** Drop weight in loot tables (0 = never drops). */
  drop: z.number().min(0).default(0),
  /** Maximum you can hold. */
  max: z.number().int().optional(),
  /** Hero level needed to buy. */
  level: z.number().int().default(1),
  relic: RelicEffect.optional(),
  /** Where it comes from, for items that aren't sold: a region id (shown on the item). */
  from: z.string().optional(),
});
export type Item = z.infer<typeof Item>;

export const PetSpecies = z.object({
  id: z.string(),
  name: z.string(),
  desc: z.string(),
  color: z.string(),
  favorite: z.string(),
  lines: z.array(z.string()).min(3),
  epitaphs: z.array(z.string()).min(1),
});
export type PetSpecies = z.infer<typeof PetSpecies>;

export const CastMember = z.object({
  name: z.string(),
  art: z.enum(['grimble', 'hero', 'muddler', 'monster', 'npc', 'dark', 'foe']),
  color: z.string(),
  seed: z.number().int().optional(),
  hue: z.number().optional(),
  /** For art: foe — which dark foe to draw. */
  foe: z.enum(['hollow', 'wraith', 'tallyman', 'forger', 'golem', 'rider']).optional(),
});
export type CastMember = z.infer<typeof CastMember>;

export const Campaign = z.object({
  id: z.string(),
  name: z.string(),
  tagline: z.string(),
  order: z.number().int(),
  /** Visual mood of the campaign's map and cards. */
  mood: z.enum(['bright', 'dark']),
  icon: z.string(),
  /** Regions (from other campaigns) that must be finished before this campaign opens. */
  requires: z.array(z.string()).default([]),
  /** Grades it suits, for the board ("Grades 3–5"). */
  grades: z.string().optional(),
  /** In-story reason for the two-day wait between ranks. */
  cooldown: z.string(),
  /** Who answers first in a Mistake Hunt, and the hunt's name. */
  critic: z.object({ name: z.string(), icon: z.string(), hunt: z.string() }),
  /** Background for the atlas and region cards of this campaign. */
  scene: z.string().optional(),
});
export type Campaign = z.infer<typeof Campaign>;

export const Achievement = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  desc: z.string(),
  /** A counter in Profile.counters, or a derived stat (see src/engine/achievements.ts). */
  stat: z.string(),
  goal: z.number().int().min(1),
  gold: z.number().int().min(0).default(0),
  item: z.string().optional(),
  /** Unlocks a title the hero can wear. */
  title: z.string().optional(),
  /** Hidden until unlocked. */
  secret: z.boolean().optional(),
  /** Shelf in the Trophy Room. */
  cat: z.enum(['learning', 'fighting', 'journey', 'streaks', 'pet', 'stuff', 'region']),
  /** The region it belongs to (Trophy Room groups by it and links there). */
  region: z.string().optional(),
});
export type Achievement = z.infer<typeof Achievement>;

export const News = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string(),
  text: z.string(),
  region: z.string().optional(),
  icon: z.string(),
});
export type News = z.infer<typeof News>;

export const Classes = z.record(
  z.string(),
  z.object({ name: z.string(), icon: z.string(), perk: z.string(), desc: z.string() }),
);

/** A real thing with a real size, for the Scale Ladder and the Scale Museum. */
export const SizeCard = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  icon: z.string(),
  /** Size in metres (length, height or width — `what` says which). */
  m: z.number().positive(),
  what: z.string(),
  fact: z.string(),
});
export type SizeCard = z.infer<typeof SizeCard>;
