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
    tools: z.array(z.enum(['both', 'left', 'right', 'divide'])).default(['both']),
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
  art: z.enum(['muddler']).optional(),
});
export type Monster = z.infer<typeof Monster>;

export const Game = z.enum(['battle', 'chest', 'bridge']);
export type Game = z.infer<typeof Game>;

const NodeBase = { id: z.string(), title: z.string() };
export const PathNode = z.discriminatedUnion('type', [
  z.object({ ...NodeBase, type: z.literal('lesson'), lesson: z.string() }),
  z.object({ ...NodeBase, type: z.literal('story'), lesson: z.string() }),
  z.object({
    ...NodeBase,
    type: z.literal('encounter'),
    game: Game,
    skills: z.array(z.string()).min(1),
    count: z.number().int().min(1).max(15).default(5),
    monster: Monster.optional(),
  }),
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

export const Region = z.object({
  id: z.string(),
  order: z.number().int(),
  name: z.string(),
  tagline: z.string(),
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
});
export type Region = z.infer<typeof Region>;

export const Skill = z.object({
  id: z.string(),
  name: z.string(),
  region: z.string(),
  summary: z.string(),
  icon: z.string(),
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
});

export const Item = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['food', 'toy', 'care', 'potion', 'hat', 'cape', 'special']),
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
  art: z.enum(['grimble', 'hero', 'muddler', 'monster', 'npc']),
  color: z.string(),
  seed: z.number().int().optional(),
  hue: z.number().optional(),
});
export type CastMember = z.infer<typeof CastMember>;

export const Classes = z.record(
  z.string(),
  z.object({ name: z.string(), icon: z.string(), perk: z.string(), desc: z.string() }),
);
