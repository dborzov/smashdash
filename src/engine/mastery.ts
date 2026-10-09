/**
 * Skill mastery and spaced review.
 *
 * Each skill has a mastery m in [0, 1]. Answers move it up or down; time makes it fade
 * (the "effective" mastery), faster for shaky skills. Random encounters prefer skills whose
 * effective mastery is low — that is our spaced-repetition engine.
 */
import type { Profile, SkillState } from './profile';
import { DAY } from './dates';

export type Outcome = 'right' | 'nudged' | 'wrong';

export function skillState(p: Profile, id: string): SkillState {
  return (p.skills[id] ??= { m: 0, seen: 0, right: 0, last: 0 });
}

export function recordAnswer(p: Profile, skill: string, outcome: Outcome, now = Date.now()): void {
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
