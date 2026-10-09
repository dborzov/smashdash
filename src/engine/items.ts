/** Using items from the bag: pet food, toys, potions, cosmetics. */
import type { Profile } from './profile';
import { itemById } from '../content';
import { clamp, feed } from './pet';
import { Rng } from './rng';

export type UseResult = { ok: true; line?: string; sound?: string } | { ok: false; why: string };

export function canBuy(p: Profile, id: string): string | null {
  const it = itemById[id];
  if (!it) return 'Unknown item';
  if (p.hero.gold < it.price) return 'Not enough gold';
  if (it.max !== undefined && (p.inv[id] ?? 0) >= it.max) return `You can only carry ${it.max}`;
  if ((it.kind === 'hat' || it.kind === 'cape') && (p.inv[id] ?? 0) >= 1) return 'Already owned';
  return null;
}

export function buy(p: Profile, id: string): string | null {
  const why = canBuy(p, id);
  if (why) return why;
  const it = itemById[id];
  p.hero.gold -= it.price;
  if (it.effect.egg) p.eggs += 1;
  else p.inv[id] = (p.inv[id] ?? 0) + 1;
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
    !e.clean &&
    !e.poop
  )
    return { ok: false, why: "That doesn't work on pets." };
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
