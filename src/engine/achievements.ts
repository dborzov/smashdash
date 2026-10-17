/**
 * Achievements (trophies). Definitions live in content/achievements.yaml; each has a `stat`
 * and a `goal`. A stat is either a counter bumped by `track()` (events.ts) or one of the
 * derived stats below. Unlocking pays out gold / an item and may grant a title.
 */
import type { Profile } from './profile';
import type { Fx } from './rewards';
import { achievements, itemById, regions } from '../content';
import { regionDone } from './progress';
import { atomStatus } from './mastery';
import { levelFromXp } from './profile';
import { DAY } from './dates';
import { factsKnown, rowKnown } from './facts';
import { cardsCollected } from './cards';

/** Stats worked out from the profile (everything else is a counter, see GAME_EVENTS). */
export const DERIVED_STATS = [
  'level',
  'streak',
  'regions',
  'skills',
  'masters',
  'atomsMastered',
  'atomsSolid',
  'bosses',
  'wins',
  'graves',
  'petAge',
  'bond',
  'gold',
  'hats',
  'decor',
  'hours',
  'heroics',
  'legendaries',
  'mythics',
  'facts',
  'rows',
  'cards',
  'relics',
] as const;

/** Stat prefixes that take an id: `region:<id>`, `campaign:<id>`, `rank:<region>`, … */
export const STAT_PREFIXES = ['region', 'campaign', 'rank', 'win', 'flawless', 'boss', 'hunt'] as const;

const rankAtLeast = (p: Profile, n: number) =>
  regions.filter((r) => Math.max(p.ranks?.[r.id]?.r ?? 0, regionDone(p, r) ? 1 : 0) >= n).length;

/** Value of a stat for a player: derived stats first, then counters. */
export function statValue(p: Profile, stat: string, now = Date.now()): number {
  switch (stat) {
    case 'level':
      return levelFromXp(p.hero.xp);
    case 'streak':
      return Math.max(p.daily.best, p.daily.streak);
    case 'regions':
      return regions.filter((r) => regionDone(p, r)).length;
    case 'skills':
      return Object.keys(p.skills).length;
    case 'masters':
      return Object.values(p.skills).filter((s) => (s.tier ?? 1) === 3).length;
    case 'atomsMastered':
      return Object.values(p.atoms).filter((a) => atomStatus(a) === 'mastered').length;
    case 'atomsSolid':
      return Object.values(p.atoms).filter((a) => {
        const st = atomStatus(a);
        return st === 'solid' || st === 'mastered';
      }).length;
    case 'bosses':
      return p.stats.bosses;
    case 'wins':
      return p.stats.wins;
    case 'graves':
      return p.graves.length;
    case 'petAge':
      return p.pet && !p.pet.dead ? Math.floor((now - p.pet.born) / DAY) : 0;
    case 'bond':
      return p.pet && !p.pet.dead ? Math.floor(p.pet.bond ?? 0) : 0;
    case 'gold':
      return p.hero.gold;
    case 'hats':
      return Object.keys(p.inv).filter((id) => itemById[id]?.kind === 'hat').length;
    case 'decor':
      return p.den.length;
    case 'hours':
      return Math.floor(Object.values(p.time).reduce((a, b) => a + b, 0) / 3_600_000);
    case 'heroics':
      return rankAtLeast(p, 2);
    case 'legendaries':
      return rankAtLeast(p, 3);
    case 'mythics':
      return rankAtLeast(p, 4);
    case 'facts':
      return factsKnown(p);
    case 'rows': {
      let n = 0;
      for (let k = 1; k <= 12; k++) if (rowKnown(p, k)) n++;
      return n;
    }
    case 'cards':
      return cardsCollected(p);
    case 'relics':
      return Object.keys(p.inv).filter((id) => itemById[id]?.kind === 'relic').length;
  }
  if (stat.startsWith('rank:')) {
    const r = regions.find((x) => x.id === stat.slice(5));
    return r ? Math.max(p.ranks?.[r.id]?.r ?? 0, regionDone(p, r) ? 1 : 0) : 0;
  }
  if (stat.startsWith('campaign:')) {
    const c = stat.slice(9);
    const rs = regions.filter((r) => r.campaign === c);
    return rs.length > 0 && rs.every((r) => regionDone(p, r)) ? 1 : 0;
  }
  if (stat.startsWith('region:')) {
    const r = regions.find((x) => x.id === stat.slice(7));
    return r && regionDone(p, r) ? 1 : 0;
  }
  return p.counters[stat] ?? 0;
}

/** Unlocks every achievement whose goal is met. Mutates the profile; returns effects. */
export function checkAchievements(p: Profile, now = Date.now()): Fx[] {
  const fx: Fx[] = [];
  for (const a of achievements) {
    if (p.ach[a.id]) continue;
    if (statValue(p, a.stat, now) < a.goal) continue;
    p.ach[a.id] = now;
    if (a.gold) {
      p.hero.gold += a.gold;
      fx.push({ kind: 'gold', amount: a.gold });
    }
    if (a.item && itemById[a.item]) {
      const it = itemById[a.item];
      if (it.effect.egg) p.eggs += 1;
      else p.inv[a.item] = Math.min(it.max ?? 99, (p.inv[a.item] ?? 0) + 1);
    }
    fx.push({ kind: 'ach', id: a.id });
  }
  return fx;
}

/** Progress towards an achievement, 0–1. */
export function achProgress(p: Profile, id: string, now = Date.now()): number {
  const a = achievements.find((x) => x.id === id);
  if (!a) return 0;
  if (p.ach[id]) return 1;
  return Math.min(1, statValue(p, a.stat, now) / a.goal);
}

/** Titles the player has earned (from achievements), plus the level title. */
export function earnedTitles(p: Profile): { id: string; title: string }[] {
  return achievements
    .filter((a) => a.title && p.ach[a.id])
    .map((a) => ({ id: a.id, title: a.title! }));
}
