/**
 * Skill mastery, difficulty tiers, atomic sub-skills and spaced review.
 *
 * - Each skill has a mastery m in [0, 1]. Answers move it up or down; time makes it fade
 *   (the "effective" mastery), faster for shaky skills. Random encounters prefer skills whose
 *   effective mastery is low — that is our spaced-repetition engine.
 * - Each skill also has a **tier** (1–3): the difficulty the player is working at. It only
 *   goes up after a clean run at the current tier (PROMOTE_RUN right answers in a row, with no
 *   shaky atoms), and goes down after repeated misses. So a struggling player stays on the
 *   current level until it is ironed out; a player who clearly gets it moves on quickly.
 * - Each skill is split into **atoms** (atomic sub-skills, e.g. "10² = 100"), declared in
 *   content/skills.yaml and tagged on every generated problem. Atoms are tracked separately so
 *   the game can drill exactly the thing that went wrong, and so the Skill Tree can show it.
 */
import type { AtomState, Profile, SkillState } from './profile';
import { DAY } from './dates';

export type Outcome = 'right' | 'nudged' | 'wrong';
export type Tier = 1 | 2 | 3;

/** Right answers in a row (no nudges) at the current tier needed to move up a tier. */
export const PROMOTE_RUN = 4;
/** Wrong answers among the last DEMOTE_WINDOW at the current tier that drop a tier. */
export const DEMOTE_MISSES = 2;
export const DEMOTE_WINDOW = 3;

export function skillState(p: Profile, id: string): SkillState {
  return (p.skills[id] ??= { m: 0, seen: 0, right: 0, last: 0, tier: 1 });
}

export const atomKey = (skill: string, atom: string) => `${skill}/${atom}`;

export function atomState(p: Profile, skill: string, atom: string): AtomState {
  return (p.atoms[atomKey(skill, atom)] ??= { n: 0, r: 0, u: 0, w: 0, last: 0, h: '' });
}

const CODE: Record<Outcome, string> = { right: 'R', nudged: 'N', wrong: 'W' };

export type TierChange = { skill: string; from: Tier; to: Tier };

/**
 * Records one answer. `level` is the difficulty the problem was generated at; only answers at
 * the player's current tier move the tier. Returns a tier change, if any.
 */
export function recordAnswer(
  p: Profile,
  skill: string,
  outcome: Outcome,
  now = Date.now(),
  atoms: string[] = [],
  level?: Tier,
): TierChange | null {
  const s = skillState(p, skill);
  s.seen++;
  s.last = now;
  if (outcome === 'right') {
    s.m += (1 - s.m) * 0.18;
    s.right++;
    p.stats.right++;
  } else if (outcome === 'nudged') {
    s.m += (1 - s.m) * 0.06;
    s.right++;
    p.stats.nudged++;
  } else {
    s.m *= 0.8;
    p.stats.wrong++;
  }
  s.m = Math.min(1, Math.max(0, s.m));

  for (const a of atoms) {
    const st = atomState(p, skill, a);
    st.n++;
    st.last = now;
    if (outcome === 'right') st.r++;
    else if (outcome === 'nudged') st.u++;
    else st.w++;
    st.h = (st.h + CODE[outcome]).slice(-8);
  }

  const tier = (s.tier ??= 1);
  if (level !== undefined && level !== tier) {
    // A wrong answer on an easier scaffold problem still counts against the tier.
    if (outcome !== 'wrong' || level > tier) return null;
  }
  s.th = ((s.th ?? '') + CODE[outcome]).slice(-8);
  const recent = s.th.slice(-DEMOTE_WINDOW);
  if (tier > 1 && [...recent].filter((c) => c === 'W').length >= DEMOTE_MISSES) {
    s.tier = (tier - 1) as Tier;
    s.th = '';
    return { skill, from: tier, to: s.tier };
  }
  if (
    tier < 3 &&
    s.th.length >= PROMOTE_RUN &&
    s.th.slice(-PROMOTE_RUN) === 'R'.repeat(PROMOTE_RUN) &&
    !hasShakyAtom(p, skill)
  ) {
    s.tier = (tier + 1) as Tier;
    s.th = '';
    return { skill, from: tier, to: s.tier };
  }
  return null;
}

/** Days for the effective mastery to halve: shaky skills fade in ~2 days, solid ones in weeks. */
function halfLifeDays(m: number): number {
  return 2 + 28 * m * m;
}

export function effectiveMastery(s: SkillState | undefined, now = Date.now()): number {
  if (!s || s.last === 0) return s?.m ?? 0;
  const days = Math.max(0, now - s.last) / DAY;
  return s.m * Math.pow(0.5, days / halfLifeDays(s.m));
}

/** How much a skill needs practice, in (0, 1]. */
export function need(p: Profile, skill: string, now = Date.now()): number {
  return 1 - effectiveMastery(p.skills[skill], now) * 0.95;
}

/** Skills the player has been taught (lesson finished). */
export function learnedSkills(p: Profile): string[] {
  return Object.keys(p.skills);
}

/** Mastery shown to the player as 0–5 stars. */
export function masteryStars(s: SkillState | undefined, now = Date.now()): number {
  return Math.round(effectiveMastery(s, now) * 5);
}

/** The tier the player is working at in a skill. */
export function tierOf(p: Profile, skill: string): Tier {
  return p.skills[skill]?.tier ?? 1;
}

/**
 * The level to start a practice run at: the tier, one lower if the skill has faded a lot since
 * it was last practised (a gentle warm-up after a long break).
 */
export function startLevel(p: Profile, skill: string, now = Date.now()): Tier {
  const s = p.skills[skill];
  const t = tierOf(p, skill);
  if (!s || t === 1) return t;
  const eff = effectiveMastery(s, now);
  return eff < s.m * 0.55 ? ((t - 1) as Tier) : t;
}

export const TIER_NAMES: Record<Tier, string> = { 1: 'Novice', 2: 'Adept', 3: 'Master' };

// ---------------------------------------------------------------------------
// Atoms

export type AtomStatus = 'unseen' | 'learning' | 'shaky' | 'solid' | 'mastered';

export function atomStatus(a: AtomState | undefined): AtomStatus {
  if (!a || a.n === 0) return 'unseen';
  if (a.h.slice(-2).includes('W')) return 'shaky';
  const firstTry = a.r / a.n;
  if (a.r >= 5 && a.h.endsWith('RRRR') && firstTry >= 0.75) return 'mastered';
  if (a.r >= 2 && a.h.endsWith('RR')) return 'solid';
  return 'learning';
}

/** An atom of this skill that went wrong recently and hasn't been put right since. */
export function hasShakyAtom(p: Profile, skill: string): boolean {
  const prefix = `${skill}/`;
  for (const [k, a] of Object.entries(p.atoms)) {
    if (k.startsWith(prefix) && atomStatus(a) === 'shaky') return true;
  }
  return false;
}

/** Shaky atoms of a skill (ids local to the skill), worst first. */
export function shakyAtoms(p: Profile, skill: string): string[] {
  const prefix = `${skill}/`;
  return Object.entries(p.atoms)
    .filter(([k, a]) => k.startsWith(prefix) && atomStatus(a) === 'shaky')
    .sort((a, b) => b[1].w - a[1].w)
    .map(([k]) => k.slice(prefix.length));
}

/** 0–1 score for an atom, for progress bars. */
export function atomScore(a: AtomState | undefined): number {
  const st = atomStatus(a);
  return { unseen: 0, learning: 0.35, shaky: 0.2, solid: 0.75, mastered: 1 }[st];
}
