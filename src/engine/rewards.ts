/**
 * Granting XP / gold / items. Returns a list of effects (Fx) for the UI to celebrate:
 * floating numbers, level-up fanfare, daily goal reached, etc.
 */
import type { Profile } from './profile';
import { levelFromXp } from './profile';
import { addDailyXp } from './daily';
import { petXpBonus } from './pet';
import { itemById } from '../content';

export type Fx =
  | { kind: 'xp'; amount: number }
  | { kind: 'gold'; amount: number }
  | { kind: 'item'; item: string; count: number }
  | { kind: 'level'; level: number }
  | { kind: 'goal'; streak: number }
  | { kind: 'egg' };

export interface Reward {
  xp?: number;
  gold?: number;
  items?: Record<string, number>;
  egg?: boolean;
}

export function xpMultiplier(p: Profile): number {
  return 1 + (p.hero.cls === 'bard' ? 0.15 : 0) + petXpBonus(p);
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
  }
  if (r.gold) {
    const gold = Math.round(r.gold * goldMultiplier(p));
    p.hero.gold += gold;
    fx.push({ kind: 'gold', amount: gold });
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
};
