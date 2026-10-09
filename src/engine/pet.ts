/**
 * Tamagotchi-style pet simulation. Stats decay in real time while the game is closed;
 * `tickPet` replays the elapsed time hour by hour.
 *
 * Neglect timeline (from fully fed): hungry after ~2 days, dead after ~3.5 days.
 * Poop piles up after meals; three or more poops make the pet sick.
 * Death is real (with flies and a tombstone) — then the player can get a new egg.
 */
import type { Pet, Profile } from './profile';
import { HOUR, DAY } from './dates';
import { Rng } from './rng';

export const RATES = {
  hungerPerHour: 2,
  joyPerHour: 1.6,
  starvePerHour: 3,
  poopSickPerHour: 1.2,
  boredPerHour: 0.6,
  healPerHour: 2,
  maxPoops: 6,
};

export function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, v));
}

export function newPet(species: string, name: string, now = Date.now()): Pet {
  return {
    species,
    name,
    born: now,
    tick: now,
    hunger: 70,
    joy: 70,
    health: 100,
    poops: 0,
    nextPoop: null,
  };
}

/** Advance the simulation to `now`. Mutates the pet. */
export function tickPet(pet: Pet, now = Date.now()): void {
  if (pet.dead) return;
  // Never simulate more than two weeks (and never backwards).
  let t = Math.max(pet.tick, now - 14 * DAY);
  while (t < now && !pet.dead) {
    const step = Math.min(HOUR, now - t);
    const h = step / HOUR;
    t += step;
    if (pet.nextPoop !== null && t >= pet.nextPoop) {
      pet.poops = Math.min(RATES.maxPoops, pet.poops + 1);
      pet.nextPoop = null;
    }
    pet.hunger = clamp(pet.hunger - RATES.hungerPerHour * h);
    pet.joy = clamp(pet.joy - RATES.joyPerHour * h);
    let dh = 0;
    if (pet.hunger <= 0) dh -= RATES.starvePerHour * h;
    if (pet.poops >= 3) dh -= RATES.poopSickPerHour * (pet.poops - 2) * h;
    if (pet.joy <= 0) dh -= RATES.boredPerHour * h;
    if (dh === 0 && pet.hunger > 30) dh = RATES.healPerHour * h;
    pet.health = clamp(pet.health + dh);
    if (pet.health <= 0) {
      pet.dead = {
        at: t,
        cause: pet.hunger <= 0 ? 'starved' : pet.poops >= 3 ? 'poop' : 'boredom',
      };
    }
  }
  pet.tick = Math.max(pet.tick, now);
}

export type Mood = 'dead' | 'sick' | 'hungry' | 'grumpy' | 'bored' | 'happy' | 'ok';

export function petMood(pet: Pet): Mood {
  if (pet.dead) return 'dead';
  if (pet.health < 35 || pet.poops >= 3) return 'sick';
  if (pet.hunger < 25) return 'hungry';
  if (pet.joy < 25) return 'bored';
  if (pet.poops > 0) return 'grumpy';
  if (pet.hunger > 60 && pet.joy > 60 && pet.health > 70) return 'happy';
  return 'ok';
}

/** A happy pet gives +10% XP. */
export function petXpBonus(p: Profile): number {
  return p.pet && petMood(p.pet) === 'happy' ? 0.1 : 0;
}

export type Stage = 'baby' | 'kid' | 'adult';
export function petStage(pet: Pet, now = Date.now()): Stage {
  const age = (pet.dead?.at ?? now) - pet.born;
  return age < DAY ? 'baby' : age < 4 * DAY ? 'kid' : 'adult';
}

/** Applies food to the pet and schedules the inevitable consequence. */
export function feed(pet: Pet, amount: number, rng = new Rng(), now = Date.now()): void {
  pet.hunger = clamp(pet.hunger + amount);
  if (pet.nextPoop === null) pet.nextPoop = now + rng.int(40, 150) * 60 * 1000;
}

export function causeText(cause: string): string {
  switch (cause) {
    case 'starved':
      return 'Starved. Its last words were "snack?"';
    case 'poop':
      return 'Buried under its own poop. Tragic. Smelly.';
    case 'boredom':
      return 'Died of boredom. Literally.';
    default:
      return cause;
  }
}
