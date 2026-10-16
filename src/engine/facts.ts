/**
 * The times-table fact map (Dungeons & Times Tables): every fact a × b up to 12 × 12 has its own
 * little record, like an atom. Generators tag problems with the facts they use
 * (`Problem.facts`); answering updates the map. The Grid shows it as a heat map, and the
 * fluency drill (`quick-facts`) aims at the weakest facts.
 */
import type { AtomState, Profile } from './profile';
import type { Outcome } from './mastery';
import { atomStatus, type AtomStatus } from './mastery';

export const FACT_MAX = 12;

/** `3×7` — the smaller factor first, so 7 × 3 and 3 × 7 are one fact (turn it around!). */
export const factKey = (a: number, b: number) => `${Math.min(a, b)}×${Math.max(a, b)}`;

const CODE: Record<Outcome, string> = { right: 'R', nudged: 'N', wrong: 'W' };

export function recordFacts(
  p: Profile,
  facts: [number, number][] | undefined,
  outcome: Outcome,
  now = Date.now(),
): void {
  for (const [a, b] of facts ?? []) {
    if (a < 1 || b < 1 || a > FACT_MAX || b > FACT_MAX) continue;
    const st: AtomState = (p.facts[factKey(a, b)] ??= { n: 0, r: 0, u: 0, w: 0, last: 0, h: '' });
    st.n++;
    st.last = now;
    if (outcome === 'right') st.r++;
    else if (outcome === 'nudged') st.u++;
    else st.w++;
    st.h = (st.h + CODE[outcome]).slice(-8);
  }
}

export function factStatus(p: Profile, a: number, b: number): AtomStatus {
  return atomStatus(p.facts[factKey(a, b)]);
}

/** Facts (with a ≤ b) that are solid or mastered. */
export function factsKnown(p: Profile): number {
  return Object.values(p.facts).filter((f) => {
    const s = atomStatus(f);
    return s === 'solid' || s === 'mastered';
  }).length;
}

/** All 78 facts from 1×1 to 12×12 (a ≤ b). */
export const ALL_FACTS: [number, number][] = [];
for (let a = 1; a <= FACT_MAX; a++) for (let b = a; b <= FACT_MAX; b++) ALL_FACTS.push([a, b]);

/**
 * How much each fact needs practice, for the fluency drill: unseen and shaky facts first,
 * mastered ones rarely. Keyed like `factKey`.
 */
export function factWeights(p: Profile): Record<string, number> {
  const w: Record<string, number> = {};
  for (const [a, b] of ALL_FACTS) {
    const s = atomStatus(p.facts[factKey(a, b)]);
    w[factKey(a, b)] = { unseen: 3, shaky: 5, learning: 3, solid: 1.2, mastered: 0.4 }[s];
  }
  return w;
}

/** Is a whole row (the n times table, 1–12) solid or mastered? */
export function rowKnown(p: Profile, n: number): boolean {
  for (let k = 1; k <= FACT_MAX; k++) {
    const s = factStatus(p, n, k);
    if (s !== 'solid' && s !== 'mastered') return false;
  }
  return true;
}
