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

/** Den decorations that make life easier (see items.yaml): multipliers on the drain rates. */
export function denPerks(den: string[] = []) {
  return {
    hunger: den.includes('feeder') ? 0.75 : 1,
    joy: den.includes('toy-chest') ? 0.75 : 1,
    poop: den.includes('poop-bucket') ? 0.5 : 1,
    heal: den.includes('pet-bed') ? 2 : 1,
  };
}

/** Advance the simulation to `now`. Mutates the pet. `den` = decorations owned. */
export function tickPet(pet: Pet, now = Date.now(), den: string[] = []): void {
  if (pet.dead) return;
  const k = denPerks(den);
  // Never simulate more than two weeks (and never backwards).
  let t = Math.max(pet.tick, now - 14 * DAY);
  while (t < now && !pet.dead) {
    // Away on an expedition: it feeds and amuses itself until it's back.
    if (pet.away && t < pet.away.until) {
      t = Math.min(now, pet.away.until);
      continue;
    }
    const step = Math.min(HOUR, now - t);
    const h = step / HOUR;
    t += step;
    if (pet.nextPoop !== null && t >= pet.nextPoop) {
      pet.poops = Math.min(RATES.maxPoops, pet.poops + 1);
      pet.nextPoop = null;
    }
    pet.hunger = clamp(pet.hunger - RATES.hungerPerHour * k.hunger * h);
    pet.joy = clamp(pet.joy - RATES.joyPerHour * k.joy * h);
    let dh = 0;
    if (pet.hunger <= 0) dh -= RATES.starvePerHour * h;
    if (pet.poops >= 3) dh -= RATES.poopSickPerHour * k.poop * (pet.poops - 2) * h;
    if (pet.joy <= 0) dh -= RATES.boredPerHour * h;
    if (dh === 0 && pet.hunger > 30) dh = RATES.healPerHour * k.heal * h;
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

// ---------------------------------------------------------------------------
// Bond and tricks

/** Raises the bond with the pet (0–100). */
export function addBond(pet: Pet, n: number): void {
  pet.bond = clamp((pet.bond ?? 0) + n);
}

export interface Trick {
  id: string;
  name: string;
  icon: string;
  /** Bond needed to learn it. */
  bond: number;
  line: string;
  sound: string;
  /** CSS animation class for the pet. */
  anim: string;
}

export const TRICKS: Trick[] = [
  {
    id: 'sit',
    name: 'Sit',
    icon: '🪑',
    bond: 10,
    line: 'sits. Then lies down. Close enough.',
    sound: 'pop',
    anim: 'trick-sit',
  },
  {
    id: 'spin',
    name: 'Spin',
    icon: '🌀',
    bond: 25,
    line: 'spins round three times and falls over, dizzy and delighted.',
    sound: 'whoosh',
    anim: 'trick-spin',
  },
  {
    id: 'play-dead',
    name: 'Play dead',
    icon: '💀',
    bond: 40,
    line: 'flops over, tongue out. Very convincing. A bit too convincing.',
    sound: 'death',
    anim: 'trick-dead',
  },
  {
    id: 'jump',
    name: 'Jump',
    icon: '🦘',
    bond: 55,
    line: 'jumps so high it bonks its head on the ceiling. Worth it.',
    sound: 'step',
    anim: 'trick-jump',
  },
  {
    id: 'fart',
    name: 'Fart on command',
    icon: '💨',
    bond: 70,
    line: 'concentrates very hard… *PFFFRT*. Takes a bow.',
    sound: 'fart',
    anim: 'trick-sit',
  },
  {
    id: 'sing',
    name: 'Sing',
    icon: '🎵',
    bond: 85,
    line: 'sings the song of its people. It is mostly gargling.',
    sound: 'squawk',
    anim: 'trick-sing',
  },
  {
    id: 'backflip',
    name: 'Backflip',
    icon: '🤸',
    bond: 100,
    line: 'does a perfect backflip. Even the Marshal would clap.',
    sound: 'level',
    anim: 'trick-flip',
  },
];

/**
 * Tricks a pet picks up by watching the hero clear a region's Heroic rank (bond 0 needed).
 * `bond` is unused for these; `region` says where they are learned.
 */
export const REGION_TRICKS: (Trick & { region: string })[] = [
  {
    id: 'unbox',
    region: 'bramblebottom',
    name: 'Unbox itself',
    icon: '📦',
    bond: 0,
    line: 'hides in a box. Pops out. "Ta-daaa!" It has learned nothing about variables, but it is proud.',
    sound: 'pop',
    anim: 'trick-jump',
  },
  {
    id: 'salute',
    region: 'greyhaven',
    name: 'Salute the Marshal',
    icon: '🫡',
    bond: 0,
    line: 'stands to attention and salutes. With the wrong paw. Voss would sigh, then salute back.',
    sound: 'step',
    anim: 'trick-sit',
  },
  {
    id: 'nat20',
    region: 'tavern',
    name: 'Roll a natural 20',
    icon: '🎲',
    bond: 0,
    line: 'rolls a d20 with its nose. It lands on 20. The Dungeon Master demands a re-roll. Denied.',
    sound: 'coin',
    anim: 'trick-spin',
  },
  {
    id: 'hydra',
    region: 'doubling',
    name: 'Double spin',
    icon: '🌀',
    bond: 0,
    line: 'spins once… then twice as fast… then twice as fast again. ×2 ×2 ×2. It is now a blur.',
    sound: 'whoosh',
    anim: 'trick-flip',
  },
  {
    id: 'zoom',
    region: 'hq',
    name: 'Tiny-huge',
    icon: '🔬',
    bond: 0,
    line: 'shrinks ten times smaller… then grows ten times bigger. Captain Tenfold would be SO proud.',
    sound: 'whoosh',
    anim: 'trick-zoom',
  },
  {
    id: 'float',
    region: 'subzero',
    name: 'Float',
    icon: '🎈',
    bond: 0,
    line: 'drops an imaginary sandbag and floats up. Minus a minus! It knows. It KNOWS.',
    sound: 'pop',
    anim: 'trick-float',
  },
];

export function knownTricks(pet: Pet, ranks: Record<string, { r: number }> = {}): Trick[] {
  return [
    ...TRICKS.filter((t) => (pet.bond ?? 0) >= t.bond),
    ...REGION_TRICKS.filter((t) => (ranks[t.region]?.r ?? 0) >= 2),
  ];
}

// ---------------------------------------------------------------------------
// Bond perks in fights

export interface PetPerks {
  /** Follows you into fights (cheers, digs up gold). */
  companion: boolean;
  /** Once per fight: sniffs out a hint for free. */
  sniff: boolean;
  /** Once per fight: jumps in front of a hit. */
  guard: boolean;
  /** Chance to dig up gold after a win. */
  findChance: number;
}

export const PERK_BOND = { companion: 30, sniff: 50, guard: 75, treasure: 90 };

export function petPerks(pet: Pet | null | undefined, relicPet = false): PetPerks {
  const b = pet && !pet.dead && !isAway(pet) ? (pet.bond ?? 0) : -1;
  return {
    companion: b >= PERK_BOND.companion,
    sniff: b >= PERK_BOND.sniff,
    guard: b >= PERK_BOND.guard,
    findChance: b < PERK_BOND.companion ? 0 : b >= PERK_BOND.treasure || relicPet ? 0.6 : 0.35,
  };
}

/** Out on an expedition right now (not back yet). */
export function isAway(pet: Pet, now = Date.now()): boolean {
  return !!pet.away && now < pet.away.until;
}

/** Pets sleep at night (local time), 21:00–07:00. */
export function isNight(now = Date.now()): boolean {
  const h = new Date(now).getHours();
  return h >= 21 || h < 7;
}

/** The bug-catching game can be played once every half hour. */
export const BUG_COOLDOWN = 30 * 60 * 1000;
export function bugsReady(pet: Pet, now = Date.now()): boolean {
  return !pet.dead && now - (pet.bugsAt ?? 0) >= BUG_COOLDOWN;
}

/** Rewards for catching `n` bugs: food, fun and a little bond. */
export function feedBugs(pet: Pet, n: number, now = Date.now()): void {
  pet.bugsAt = now;
  pet.hunger = clamp(pet.hunger + n * 3);
  pet.joy = clamp(pet.joy + 8 + n * 2);
  addBond(pet, Math.min(5, Math.ceil(n / 3)));
}
