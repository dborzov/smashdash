/**
 * Daily XP goal and streak. A streak counts consecutive days on which the goal was met.
 * Missing a day breaks it — unless the player owns Streak Shields, which are consumed
 * one per missed day. Shields are expensive and limited, so streaks stay meaningful.
 */
import type { Profile } from './profile';
import { addDays, dayKey, daysBetween } from './dates';

export const SHIELD = 'streak-shield';

export interface DayRoll {
  lost?: number;
  shieldsUsed?: number;
}

/** Moves the daily counters to `today`. Call on load and before granting XP. */
export function rollDay(p: Profile, today = dayKey()): DayRoll {
  const d = p.daily;
  if (d.day === today) return {};
  if (d.day) d.history[d.day] = d.xp;
  // Keep history small.
  const keys = Object.keys(d.history).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - 60))) delete d.history[k];
  d.day = today;
  d.xp = 0;

  const out: DayRoll = {};
  if (d.streak > 0 && d.lastMet) {
    const missed = daysBetween(d.lastMet, today) - 1;
    if (missed > 0) {
      const shields = p.inv[SHIELD] ?? 0;
      if (shields >= missed) {
        p.inv[SHIELD] = shields - missed;
        d.lastMet = addDays(today, -1);
        out.shieldsUsed = missed;
      } else {
        out.lost = d.streak;
        d.streak = 0;
      }
    }
  }
  return out;
}

/** Adds XP to today's total. Returns true if this pushed the player over the goal. */
export function addDailyXp(p: Profile, xp: number, today = dayKey()): boolean {
  rollDay(p, today);
  const d = p.daily;
  const before = d.xp;
  d.xp += xp;
  if (before < d.goal && d.xp >= d.goal && d.lastMet !== today) {
    d.streak += 1;
    d.best = Math.max(d.best, d.streak);
    d.lastMet = today;
    return true;
  }
  return false;
}
