/**
 * Building practice runs: which problems to ask, random "wandering monster" encounters on
 * the world map (the spaced-review engine), and loot.
 */
import type { Game, Monster } from '../content/schema';
import type { Profile, Wanderer } from './profile';
import { Rng } from './rng';
import { effectiveMastery, learnedSkills, need } from './mastery';
import { levelFor } from '../skills';
import type { Level } from '../skills/types';
import { items, regionById, regions, skillById } from '../content';
import { regionUnlocked } from './progress';
import { HOUR } from './dates';

export interface PlannedProblem {
  skill: string;
  level: Level;
}

/**
 * Chooses `count` problems over `skills`, favouring the ones that need practice
 * but making sure each skill shows up at least once when possible.
 */
export function planProblems(
  p: Profile,
  skills: string[],
  count: number,
  rng = new Rng(),
): PlannedProblem[] {
  const out: PlannedProblem[] = [];
  const order = rng.shuffle(skills);
  for (let i = 0; i < count; i++) {
    const skill = i < order.length ? order[i] : rng.weighted(skills, (s) => need(p, s) + 0.15);
    out.push({ skill, level: levelFor(effectiveMastery(p.skills[skill])) });
  }
  return rng.shuffle(out);
}

const GAMES: Game[] = ['battle', 'battle', 'chest', 'bridge'];

/** Picks 1–3 learned skills, weighted by need. */
export function pickReviewSkills(p: Profile, rng: Rng, n = rng.int(1, 3)): string[] {
  const pool = learnedSkills(p).filter((s) => skillById[s]);
  const chosen: string[] = [];
  while (chosen.length < Math.min(n, pool.length)) {
    const s = rng.weighted(
      pool.filter((x) => !chosen.includes(x)),
      (x) => Math.pow(need(p, x), 2) + 0.05,
    );
    chosen.push(s);
  }
  return chosen;
}

export function makeWanderer(p: Profile, rng: Rng, now = Date.now()): Wanderer | null {
  const skills = pickReviewSkills(p, rng);
  if (skills.length === 0) return null;
  const region = regionById[skillById[skills[0]].region] ?? regions[0];
  const monster: Monster = rng.pick(region.monsters);
  return {
    id: `w${now.toString(36)}${rng.int(0, 1e6).toString(36)}`,
    region: region.id,
    skills,
    game: rng.pick(GAMES),
    monster,
    x: Math.max(6, Math.min(94, region.map.x + rng.int(-12, 12))),
    y: Math.max(10, Math.min(90, region.map.y + rng.int(-10, 10))),
    expires: now + 20 * HOUR,
  };
}

export const MAX_WANDERERS = 3;
export const WANDER_EVERY = 2 * HOUR;

/** Removes expired wanderers and spawns new ones every couple of hours. */
export function refreshWanderers(p: Profile, now = Date.now(), rng = new Rng()): void {
  p.wanderers = p.wanderers.filter((w) => w.expires > now && regionById[w.region]);
  if (learnedSkills(p).length === 0) return;
  // Catch up on spawns while the game was closed (at most the cap).
  let spawns = p.wanderAt === 0 ? 2 : Math.floor((now - p.wanderAt) / WANDER_EVERY);
  while (spawns-- > 0 && p.wanderers.length < MAX_WANDERERS) {
    const w = makeWanderer(p, rng, now);
    if (!w || !regionUnlocked(p, regionById[w.region])) break;
    p.wanderers.push(w);
    p.wanderAt = now;
  }
  if (p.wanderAt === 0) p.wanderAt = now;
}

// ---------------------------------------------------------------------------
// Loot

export interface Loot {
  gold: number;
  items: Record<string, number>;
}

/** tier 1 = normal fight, 2 = wanderer, 3 = boss. */
export function rollLoot(rng: Rng, tier: number, level = 1): Loot {
  const gold = rng.int(5, 10) * tier + rng.int(0, 3);
  const out: Loot = { gold, items: {} };
  // Region souvenirs (`from`) only come from that region (expeditions), never from random loot.
  const pool = items.filter((i) => i.drop > 0 && !i.from && i.level <= level + 2);
  const rolls = tier >= 3 ? 2 : 1;
  for (let i = 0; i < rolls; i++) {
    if (!rng.chance(tier >= 3 ? 1 : 0.45)) continue;
    const it = rng.weighted(pool, (x) => x.drop);
    out.items[it.id] = (out.items[it.id] ?? 0) + 1;
  }
  return out;
}
