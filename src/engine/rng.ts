/**
 * Small seeded random number generator (mulberry32) with helpers.
 * Everything that is random in the game (problems, loot, monsters) goes through an Rng
 * so that tests can reproduce any problem from its seed.
 */
export class Rng {
  private state: number;

  constructor(seed: number = Date.now() ^ (Math.random() * 0x7fffffff)) {
    this.state = seed >>> 0;
  }

  /** Float in [0, 1). */
  next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Integer in [min, max] that is not in `exclude`. */
  intExcept(min: number, max: number, exclude: number[]): number {
    for (let i = 0; i < 100; i++) {
      const v = this.int(min, max);
      if (!exclude.includes(v)) return v;
    }
    return min;
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }

  /** Picks an item with probability proportional to its weight. */
  weighted<T>(items: readonly T[], weight: (item: T) => number): T {
    const total = items.reduce((s, it) => s + Math.max(0, weight(it)), 0);
    let r = this.next() * total;
    for (const it of items) {
      r -= Math.max(0, weight(it));
      if (r < 0) return it;
    }
    return items[items.length - 1];
  }

  shuffle<T>(items: readonly T[]): T[] {
    const a = items.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

/** Stable 32-bit hash of a string, handy for deriving seeds from ids. */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
