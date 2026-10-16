/**
 * What happens to the profile when a problem is answered — shared by lessons, encounters and
 * drills: mastery, atoms and tiers (mastery.ts), XP (rewards.ts), counters, bounties and
 * achievements (events.ts), plus the run's own events (grit, combos).
 */
import type { Profile } from './profile';
import { recordAnswer, type Outcome, type Tier } from './mastery';
import { grant, XP, type Fx } from './rewards';
import { track } from './events';
import { comboBonus, type RunEvent } from './adaptive';
import { recordFacts } from './facts';
import { collectCards } from './cards';

export interface AnswerOpts {
  /** XP for a right answer / after a nudge (lesson checks give less). */
  xp?: { right: number; nudged: number };
  /** Events from the adaptive run (redemptions, combos) to reward. */
  events?: RunEvent[];
  /** The problem is from the Long Count campaign. */
  dark?: boolean;
  /** Times-table facts and size cards the problem was about. */
  facts?: [number, number][];
  cards?: string[];
  now?: number;
}

export function answerEffects(
  p: Profile,
  skill: string,
  outcome: Outcome,
  atoms: string[],
  level: Tier | undefined,
  opts: AnswerOpts = {},
): Fx[] {
  const now = opts.now ?? Date.now();
  const fx: Fx[] = [];
  const change = skill ? recordAnswer(p, skill, outcome, now, atoms, level) : null;
  recordFacts(p, opts.facts, outcome, now);
  if (outcome !== 'wrong') fx.push(...collectCards(p, opts.cards, now));
  const base = opts.xp ?? { right: XP.right, nudged: XP.nudged };
  let xp = outcome === 'right' ? base.right : outcome === 'nudged' ? base.nudged : 0;
  for (const e of opts.events ?? []) {
    if (e.kind === 'redeem') {
      xp += XP.grit;
      fx.push(...track(p, 'grit', 1, now));
    }
    if (e.kind === 'combo') {
      xp += comboBonus(e.n);
      if (e.n === 5) fx.push(...track(p, 'combo5', 1, now));
      if (e.n === 10) fx.push(...track(p, 'combo10', 1, now));
    }
  }
  if (change) {
    fx.push({ kind: 'tier', skill: change.skill, to: change.to, up: change.to > change.from });
    if (change.to > change.from) {
      xp += XP.promote;
      fx.push(...track(p, 'promote', 1, now));
      if (change.to === 3) fx.push(...track(p, 'master', 1, now));
    }
  }
  if (xp) fx.unshift(...grant(p, { xp }));
  if (outcome === 'wrong') fx.push(...track(p, 'wrong', 1, now));
  else {
    fx.push(...track(p, 'right', 1, now));
    if (outcome === 'right') fx.push(...track(p, 'clean', 1, now));
    else fx.push(...track(p, 'nudged', 1, now));
    if (opts.dark) fx.push(...track(p, 'dark', 1, now));
  }
  return fx;
}
