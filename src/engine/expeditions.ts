/**
 * Pet expeditions: send the pet to a region the hero has cleared; it comes back hours later
 * with loot from there. Higher ranks in that region mean better loot, so finishing Heroic and
 * Legendary runs pays off in the den too. While away, the pet doesn't get hungry or bored.
 */
import type { Pet, Profile } from './profile';
import type { Region } from '../content/schema';
import { items, regionById } from '../content';
import { Rng } from './rng';
import { HOUR } from './dates';
import { addBond, clamp, isAway } from './pet';
import { rankOf } from './ranks';
import { track } from './events';
import type { Fx } from './rewards';

export interface Trip {
  hours: number;
  name: string;
  icon: string;
}

export const TRIPS: Trip[] = [
  { hours: 1, name: 'A quick sniff around', icon: '🐾' },
  { hours: 4, name: 'An afternoon out', icon: '🎒' },
  { hours: 12, name: 'An overnight quest', icon: '⛺' },
];

/** Why the pet can't go right now (null if it can). */
export function cantGo(p: Profile, region: Region | undefined, now = Date.now()): string | null {
  const pet = p.pet;
  if (!pet || pet.dead) return 'No pet to send.';
  if (isAway(pet, now)) return `${pet.name} is already out.`;
  if (pet.away) return `Open ${pet.name}'s backpack first!`;
  if (!region || rankOf(p, region) < 1) return 'Pets only go where you have cleared the story first.';
  if (pet.health < 50) return `${pet.name} is too poorly to travel. Make it better first.`;
  if (pet.hunger < 30) return `${pet.name} won't go anywhere on an empty tummy.`;
  return null;
}

export function sendPet(p: Profile, regionId: string, hours: number, now = Date.now()): string | null {
  const region = regionById[regionId];
  const why = cantGo(p, region, now);
  if (why) return why;
  p.pet!.away = { region: regionId, rank: rankOf(p, region), started: now, until: now + hours * HOUR };
  return null;
}

/** Things a pet can bring back from a region: its souvenirs, else ordinary loot. */
export function souvenirPool(regionId: string) {
  const own = items.filter((i) => i.from === regionId && ['food', 'toy', 'care'].includes(i.kind));
  const common = items.filter((i) => i.drop > 0 && !i.from && ['food', 'toy', 'care'].includes(i.kind));
  return { own, common };
}

export interface Haul {
  gold: number;
  items: Record<string, number>;
  region: string;
}

/** What the pet found (pure: same seed, same haul). */
export function rollHaul(away: NonNullable<Pet['away']>, rng: Rng): Haul {
  const hours = Math.max(1, Math.round((away.until - away.started) / HOUR));
  const rolls = (hours >= 12 ? 3 : hours >= 4 ? 2 : 1) + (away.rank >= 3 ? 1 : 0);
  const { own, common } = souvenirPool(away.region);
  const out: Haul = { gold: 0, items: {}, region: away.region };
  out.gold = Math.round(rng.int(4, 9) * Math.sqrt(hours) * (1 + 0.25 * (away.rank - 1)));
  for (let i = 0; i < rolls; i++) {
    const pool = own.length && rng.chance(0.4 + 0.1 * away.rank) ? own : common;
    if (!pool.length) continue;
    const it = rng.weighted(pool, (x) => Math.max(0.5, x.drop));
    out.items[it.id] = (out.items[it.id] ?? 0) + 1;
  }
  return out;
}

/** The pet is home: open the backpack. */
export function openBackpack(p: Profile, now = Date.now(), rng = new Rng()): Haul | null {
  const pet = p.pet;
  if (!pet?.away || isAway(pet, now)) return null;
  const haul = rollHaul(pet.away, rng);
  p.hero.gold += haul.gold;
  for (const [id, n] of Object.entries(haul.items)) p.inv[id] = (p.inv[id] ?? 0) + n;
  pet.joy = clamp(pet.joy + 15);
  addBond(pet, 3);
  pet.away = undefined;
  return haul;
}

export function backpackFx(p: Profile, haul: Haul, now = Date.now()): Fx[] {
  return [{ kind: 'gold', amount: haul.gold }, ...track(p, 'expedition', 1, now)];
}
