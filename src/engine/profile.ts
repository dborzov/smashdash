/**
 * The player profile: everything that is saved in the browser (localStorage).
 * Bump SAVE_VERSION and add a step in `migrate` (save.ts) when changing this shape.
 */
import type { Game, Monster } from '../content/schema';

export const SAVE_VERSION = 1;

export interface Look {
  skin: number;
  hair: number;
  hairStyle: number;
  outfit: number;
}

export interface SkillState {
  /** Mastery in [0, 1]. */
  m: number;
  seen: number;
  right: number;
  /** Last practised (ms since epoch). */
  last: number;
}

export interface NodeState {
  plays: number;
  /** Best result: 1–3 stars. */
  stars: number;
}

export interface Pet {
  species: string;
  name: string;
  born: number;
  /** Last time the simulation was advanced. */
  tick: number;
  hunger: number;
  joy: number;
  health: number;
  poops: number;
  nextPoop: number | null;
  hat?: string;
  dead?: { at: number; cause: string };
}

export interface Grave {
  name: string;
  species: string;
  born: number;
  died: number;
  cause: string;
  epitaph: string;
}

export interface Wanderer {
  id: string;
  region: string;
  skills: string[];
  game: Game;
  monster: Monster;
  /** Position on the world map, percent. */
  x: number;
  y: number;
  expires: number;
}

export interface Daily {
  /** XP goal per day. */
  goal: number;
  /** Local date (YYYY-MM-DD) the counters below refer to. */
  day: string;
  xp: number;
  streak: number;
  best: number;
  /** Last day the goal was met. */
  lastMet: string | null;
  /** XP earned per past day (last ~60 days). */
  history: Record<string, number>;
}

export interface Profile {
  v: number;
  id: string;
  created: number;
  played: number;
  hero: {
    name: string;
    cls: string;
    look: Look;
    xp: number;
    gold: number;
    hat?: string;
    cape?: string;
  };
  inv: Record<string, number>;
  /** Path node progress keyed by `${regionId}/${nodeId}`. */
  nodes: Record<string, NodeState>;
  /** Story ids already shown (region intros etc). */
  seen: string[];
  skills: Record<string, SkillState>;
  daily: Daily;
  pet: Pet | null;
  eggs: number;
  graves: Grave[];
  wanderers: Wanderer[];
  wanderAt: number;
  stats: {
    right: number;
    wrong: number;
    nudged: number;
    wins: number;
    losses: number;
    bosses: number;
  };
  sound: boolean;
}

export function newProfile(
  init: { name: string; cls: string; look: Look; goal: number },
  now = Date.now(),
): Profile {
  return {
    v: SAVE_VERSION,
    id: `p${now.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`,
    created: now,
    played: now,
    hero: { name: init.name, cls: init.cls, look: init.look, xp: 0, gold: 20 },
    inv: { 'heart-potion': 1, 'hint-scroll': 2 },
    nodes: {},
    seen: [],
    skills: {},
    daily: { goal: init.goal, day: '', xp: 0, streak: 0, best: 0, lastMet: null, history: {} },
    pet: null,
    eggs: 0,
    graves: [],
    wanderers: [],
    wanderAt: 0,
    stats: { right: 0, wrong: 0, nudged: 0, wins: 0, losses: 0, bosses: 0 },
    sound: true,
  };
}

// ---------------------------------------------------------------------------
// Levels

/** Total XP needed to reach `level` (level 1 = 0 XP). */
export function xpForLevel(level: number): number {
  const n = level - 1;
  return 100 * n + 25 * n * (n - 1);
}

export function levelFromXp(xp: number): number {
  let l = 1;
  while (xpForLevel(l + 1) <= xp) l++;
  return l;
}

export const TITLES = [
  'Box Poker',
  'Apprentice Unboxer',
  'Coin Counter',
  'Scale Whisperer',
  'Goblin Bother-er',
  'Equation Wrangler',
  'Swamp Survivor',
  'Dragon Tickler',
  'Riddle Cracker',
  'Power Tower Climber',
  'Master Unboxer',
  'Legend of Smashdash',
];

export function titleFor(level: number): string {
  return TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 2))];
}

export function maxHearts(p: Profile): number {
  const level = levelFromXp(p.hero.xp);
  return 3 + (p.hero.cls === 'knight' ? 1 : 0) + (level >= 5 ? 1 : 0) + (level >= 10 ? 1 : 0);
}
