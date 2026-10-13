/**
 * Granting XP / gold / items. Returns a list of effects (Fx) for the UI to celebrate:
 * floating numbers, level-up fanfare, daily goal reached, etc.
 */
import type { Profile } from './profile';
import { levelFromXp } from './profile';
import { addDailyXp } from './daily';
import { petXpBonus } from './pet';
import { itemById } from '../content';
import { track } from './events';

export type Fx =
  | { kind: 'xp'; amount: number }
  | { kind: 'gold'; amount: number }
  | { kind: 'item'; item: string; count: number }
  | { kind: 'level'; level: number }
  | { kind: 'goal'; streak: number }
  | { kind: 'egg' }
  | { kind: 'ach'; id: string }
  | { kind: 'quest'; id: string }
  | { kind: 'tier'; skill: string; to: number; up: boolean };

export interface Reward {
  xp?: number;
  gold?: number;
  items?: Record<string, number>;
  egg?: boolean;
}

/** Is a timed double-XP boost running? */
export function xpBoostOn(p: Profile, now = Date.now()): boolean {
  return (p.boosts?.xp2Until ?? 0) > now;
}

export function xpMultiplier(p: Profile, now = Date.now()): number {
  return 1 + (p.hero.cls === 'bard' ? 0.15 : 0) + petXpBonus(p) + (xpBoostOn(p, now) ? 1 : 0);
}

export function goldMultiplier(p: Profile): number {
  return p.hero.cls === 'rogue' ? 1.25 : 1;
}

export function grant(p: Profile, r: Reward): Fx[] {
  const fx: Fx[] = [];
  if (r.xp) {
    const xp = Math.round(r.xp * xpMultiplier(p));
    const before = levelFromXp(p.hero.xp);
    p.hero.xp += xp;
    fx.push({ kind: 'xp', amount: xp });
    const after = levelFromXp(p.hero.xp);
    if (after > before) fx.push({ kind: 'level', level: after });
    if (addDailyXp(p, xp)) fx.push({ kind: 'goal', streak: p.daily.streak });
    fx.push(...track(p, 'xp', xp));
  }
  if (r.gold) {
    const gold = Math.round(r.gold * goldMultiplier(p));
    p.hero.gold += gold;
    fx.push({ kind: 'gold', amount: gold });
    fx.push(...track(p, 'goldEarned', gold));
  }
  for (const [item, count] of Object.entries(r.items ?? {})) {
    const max = itemById[item]?.max ?? 99;
    p.inv[item] = Math.min(max, (p.inv[item] ?? 0) + count);
    fx.push({ kind: 'item', item, count });
  }
  if (r.egg) {
    p.eggs += 1;
    fx.push({ kind: 'egg' });
  }
  return fx;
}

/** XP for one answer in practice. */
export const XP = {
  right: 10,
  nudged: 6,
  lessonFirst: 40,
  lessonReplay: 10,
  winBonus: 15,
  bossWin: 120,
  bossReplay: 40,
  /** Putting a mistake right in the same run. */
  grit: 4,
  /** A skill moving up a tier. */
  promote: 15,
};
