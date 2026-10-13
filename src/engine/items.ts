/** Using items from the bag: pet food, toys, potions, cosmetics. */
import type { Profile } from './profile';
import { itemById } from '../content';
import { addBond, clamp, feed } from './pet';
import { HOUR } from './dates';
import { Rng } from './rng';

export type UseResult = { ok: true; line?: string; sound?: string } | { ok: false; why: string };

export function canBuy(p: Profile, id: string): string | null {
  const it = itemById[id];
  if (!it) return 'Unknown item';
  if (p.hero.gold < it.price) return 'Not enough gold';
  if (it.max !== undefined && (p.inv[id] ?? 0) >= it.max) return `You can only carry ${it.max}`;
  if ((it.kind === 'hat' || it.kind === 'cape' || it.kind === 'decor') && (p.inv[id] ?? 0) >= 1)
    return 'Already owned';
  return null;
}

export function buy(p: Profile, id: string): string | null {
  const why = canBuy(p, id);
  if (why) return why;
  const it = itemById[id];
  p.hero.gold -= it.price;
  if (it.effect.egg) p.eggs += 1;
  else p.inv[id] = (p.inv[id] ?? 0) + 1;
  // Decorations go straight into the den.
  if (it.kind === 'decor' && !p.den.includes(id)) p.den.push(id);
  return null;
}

function take(p: Profile, id: string) {
  p.inv[id] = (p.inv[id] ?? 0) - 1;
  if (p.inv[id] <= 0) delete p.inv[id];
}

/** Use an item on the pet (food, toys, care). */
export function useOnPet(p: Profile, id: string, rng = new Rng(), now = Date.now()): UseResult {
  const it = itemById[id];
  const pet = p.pet;
  if (!it || !(p.inv[id] > 0)) return { ok: false, why: "You don't have that." };
  if (!pet || pet.dead) return { ok: false, why: 'No living pet to use it on.' };
  if (it.kind === 'hat') {
    pet.hat = pet.hat === id ? undefined : id;
    return {
      ok: true,
      line: pet.hat ? `${pet.name} looks fabulous.` : `${pet.name} is hatless again.`,
    };
  }
  const e = it.effect;
  if (
    e.hunger === undefined &&
    e.joy === undefined &&
    e.health === undefined &&
    e.bond === undefined &&
    !e.clean &&
    !e.poop
  )
    return { ok: false, why: "That doesn't work on pets." };
  if (e.bond) addBond(pet, e.bond);
  if (e.hunger) feed(pet, e.hunger, rng, now);
  if (e.joy) pet.joy = clamp(pet.joy + e.joy);
  if (e.health) pet.health = clamp(pet.health + e.health);
  if (e.clean) pet.poops = 0;
  if (e.poop) pet.poops = Math.min(6, pet.poops + e.poop);
  take(p, id);
  return { ok: true, line: it.use, sound: e.sound };
}

export function equip(p: Profile, id: string): void {
  const it = itemById[id];
  if (!it || !(p.inv[id] > 0)) return;
  if (it.kind === 'hat') p.hero.hat = p.hero.hat === id ? undefined : id;
  if (it.kind === 'cape') p.hero.cape = p.hero.cape === id ? undefined : id;
}

/** Consume one of an item (potions in battle). Returns false if none left. */
export function consume(p: Profile, id: string): boolean {
  if (!(p.inv[id] > 0)) return false;
  take(p, id);
  return true;
}

/** Use a timed boost from the bag (Focus Tonic: double XP; Lucky Crown: double gold next win). */
export function useBoost(p: Profile, id: string, now = Date.now()): UseResult {
  const it = itemById[id];
  if (!it || !(p.inv[id] > 0) || !it.effect.boost)
    return { ok: false, why: "You can't use that here." };
  if (it.effect.boost === 'xp2') {
    const from = Math.max(now, p.boosts.xp2Until ?? 0);
    p.boosts.xp2Until = from + (it.effect.minutes ?? 20) * 60_000;
  } else {
    if ((p.boosts.lucky ?? 0) >= 3)
      return { ok: false, why: 'Your luck is already as good as it gets (3 lucky wins queued).' };
    p.boosts.lucky = (p.boosts.lucky ?? 0) + 1;
  }
  take(p, id);
  return { ok: true, line: it.use, sound: 'level' };
}

export const BOOST_MAX_MS = 6 * HOUR;
