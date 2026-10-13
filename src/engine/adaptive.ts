/**
 * Adaptive practice runs: how many problems a unit (an encounter, a boss phase, a lesson's
 * practice beat) takes, which skill and atom comes next, and at what difficulty.
 *
 * The rules, in plain words:
 *  - A unit starts with a quota of problems (the node's `count`), shared between its skills
 *    (skills that need more practice get more).
 *  - **Struggling extends the unit.** A wrong answer adds a reinforcement problem for that
 *    skill (up to a cap), and the next problem drills the same atom one level easier. The unit
 *    is not over while a missed atom hasn't been answered right again ("ironed out").
 *  - **Doing well shortens it.** Three clean answers in a row on a skill the player has
 *    already mastered (tier 3) knock one problem off its quota ("Swift strike").
 *  - The difficulty comes from the skill's tier (see mastery.ts), which moves up only after a
 *    clean streak at the current tier and down after repeated misses.
 *  - Progress never goes backwards on screen: answered problems stay answered; reinforcements
 *    are shown as extra pips, and putting a mistake right ("redeeming" it) earns Grit.
 *
 * Everything here is pure (no UI), so it is tested directly in tests/adaptive.test.ts.
 */
import type { Profile } from './profile';
import type { Rng } from './rng';
import { need, startLevel, tierOf, type Outcome, type Tier } from './mastery';

export interface RunSkill {
  /** Right answers still needed from this skill. */
  quota: number;
  /** Levels to scaffold down from the tier after a miss (0 or 1). */
  drop: number;
  /** Right answers since the last scaffold drop. */
  since: number;
  /** Clean right answers in a row on this skill. */
  streak: number;
  /** Atoms answered wrong in this run and not yet answered right again. */
  misses: string[];
  /** Atom to drill next (after a miss or a nudge). */
  target?: string;
  /** Atom this whole run focuses on (a drill from the Skill Tree). */
  focus?: string;
}

export interface Run {
  skills: string[];
  s: Record<string, RunSkill>;
  /** Problems answered (right or nudged). */
  done: number;
  /** Planned size at the start. */
  base: number;
  /** Reinforcement problems added so far, and the cap. */
  extra: number;
  maxExtra: number;
  /** Problems removed by swift strikes, and the floor for the run's size. */
  saved: number;
  min: number;
  /** Clean right answers in a row across the whole run (the combo). */
  combo: number;
  best: number;
  /** Mistakes redeemed (answered right after a miss). */
  grit: number;
  wrong: number;
  /** Skill of the last problem, and whether it was answered wrong. */
  last?: string;
  lastWrong?: boolean;
}

export type RunEvent =
  | { kind: 'reinforce'; skill: string }
  | { kind: 'iron'; skill: string; atom: string }
  | { kind: 'redeem'; skill: string; atom: string }
  | { kind: 'swift'; skill: string }
  | { kind: 'combo'; n: number };

export interface Next {
  skill: string;
  level: Tier;
  atom?: string;
}

export function newRun(
  p: Profile,
  skills: string[],
  count: number,
  rng: Rng,
  focus?: { skill: string; atom: string },
): Run {
  const uniq = [...new Set(skills)];
  const base = Math.max(count, 1);
  const s: Record<string, RunSkill> = {};
  for (const id of uniq) s[id] = { quota: 0, drop: 0, since: 0, streak: 0, misses: [] };
  // Everyone gets at least one (when there is room); the rest goes by need.
  const order = rng.shuffle(uniq);
  let left = base;
  for (const id of order) {
    if (left <= 0) break;
    s[id].quota++;
    left--;
  }
  while (left-- > 0) s[rng.weighted(uniq, (id) => need(p, id) + 0.15)].quota++;
  if (focus && s[focus.skill]) s[focus.skill].focus = focus.atom;
  return {
    skills: uniq,
    s,
    done: 0,
    base,
    extra: 0,
    maxExtra: Math.max(3, Math.ceil(base * 0.75)),
    saved: 0,
    min: Math.max(1, Math.ceil(base * 0.6)),
    combo: 0,
    best: 0,
    grit: 0,
    wrong: 0,
  };
}

export function remaining(run: Run): number {
  return Object.values(run.s).reduce((a, x) => a + x.quota, 0);
}

export function total(run: Run): number {
  return run.done + remaining(run);
}

export function isOver(run: Run): boolean {
  return remaining(run) === 0;
}

/** What to ask next. Call only while the run is not over. */
export function pickNext(p: Profile, run: Run, rng: Rng): Next {
  const open = run.skills.filter((id) => run.s[id].quota > 0);
  let skill: string;
  if (run.last && run.lastWrong && run.s[run.last]?.quota > 0) {
    // Straight back at the thing that went wrong, with fresh numbers.
    skill = run.last;
  } else {
    // Prefer skills with something to iron out, but don't ask the same skill forever.
    skill = rng.weighted(open, (id) => {
      const r = run.s[id];
      let w = r.quota * (need(p, id) + 0.3);
      if (r.misses.length) w *= 3;
      if (id === run.last && open.length > 1) w *= 0.35;
      return w;
    });
  }
  const r = run.s[skill];
  const level = Math.max(1, startLevel(p, skill) - r.drop) as Tier;
  return { skill, level, atom: r.target ?? r.misses[0] ?? r.focus };
}

/**
 * Applies the result of one problem. `atoms` are the atoms the problem exercised.
 * Returns events for the UI to celebrate (or explain).
 */
export function applyResult(
  p: Profile,
  run: Run,
  skill: string,
  atoms: string[],
  outcome: Outcome,
): RunEvent[] {
  const ev: RunEvent[] = [];
  const r = run.s[skill];
  if (!r) return ev;
  run.last = skill;
  run.lastWrong = outcome === 'wrong';

  if (outcome === 'wrong') {
    run.wrong++;
    run.combo = 0;
    r.streak = 0;
    r.since = 0;
    if (tierOf(p, skill) > 1 || startLevel(p, skill) > 1) r.drop = 1;
    for (const a of atoms) if (!r.misses.includes(a)) r.misses.push(a);
    r.target = atoms[0];
    if (run.extra < run.maxExtra) {
      r.quota++;
      run.extra++;
      ev.push({ kind: 'reinforce', skill });
    }
    // The wrong problem itself still has to be answered: the quota didn't go down.
    return ev;
  }

  run.done++;
  r.quota = Math.max(0, r.quota - 1);
  r.since++;
  if (r.drop && r.since >= 2) r.drop = 0;
  r.target = undefined;
  for (const a of atoms) {
    const k = r.misses.indexOf(a);
    if (k >= 0) {
      r.misses.splice(k, 1);
      run.grit++;
      ev.push({ kind: 'redeem', skill, atom: a });
    }
  }

  if (outcome === 'nudged') {
    // Saved by a nudge: counts as progress, but drill the same atom next time.
    run.combo = 0;
    r.streak = 0;
    r.target = atoms[0];
  } else {
    run.combo++;
    run.best = Math.max(run.best, run.combo);
    r.streak++;
    if (run.combo >= 3) ev.push({ kind: 'combo', n: run.combo });
    if (
      r.streak >= 3 &&
      tierOf(p, skill) === 3 &&
      r.quota > 0 &&
      r.misses.length === 0 &&
      total(run) > run.min
    ) {
      r.quota--;
      run.saved++;
      r.streak = 0;
      ev.push({ kind: 'swift', skill });
    }
  }

  // Don't finish with a mistake still un-ironed: add one more try for it, within the cap.
  if (isOver(run)) {
    for (const id of run.skills) {
      const x = run.s[id];
      if (x.misses.length && run.extra < run.maxExtra) {
        x.quota++;
        x.target = x.misses[0];
        run.extra++;
        ev.push({ kind: 'iron', skill: id, atom: x.misses[0] });
        break;
      }
    }
  }
  return ev;
}

/** Extra XP for a combo of `n` clean answers in a row. */
export function comboBonus(n: number): number {
  return n >= 8 ? 6 : n >= 5 ? 4 : n >= 3 ? 2 : 0;
}

/** XP for putting a mistake right. */
export const GRIT_XP = 4;
