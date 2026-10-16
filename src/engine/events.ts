/**
 * Game events: one call per notable thing the player does. Each event bumps a counter in
 * `Profile.counters`, advances today's bounties, and unlocks any achievements it completes.
 * Returns reward effects (Fx) for the celebration layer.
 *
 * Counter names are the `stat` keys used in content/achievements.yaml.
 */
import type { Profile } from './profile';
import type { Fx } from './rewards';
import { checkAchievements } from './achievements';
import { advanceQuests } from './quests';

/** Every event, in one list (achievements and bounties may only count these). */
export const GAME_EVENTS = [
  'right', // a problem answered right (or after a nudge)
  'clean', // right first time
  'wrong',
  'nudged',
  'grit', // a mistake put right in the same run
  'combo5', // a combo of 5 reached
  'combo10',
  'lesson', // a lesson finished (first time)
  'win', // an encounter won
  'flawless', // an encounter won with no mistakes
  'boss', // a boss beaten (replays and higher ranks too)
  'wander', // a wandering monster beaten
  'comeback', // won after losing at least 2 hearts
  'promote', // a skill moved up a tier
  'master', // a skill reached tier 3
  'drill', // finished a focused drill on one skill
  'feed',
  'scoop', // poop cleaned up
  'pat',
  'trick',
  'bugs', // bugs caught in the den game
  'hatch',
  'funeral',
  'buy',
  'goldEarned',
  'goldSpent',
  'quest', // a bounty claimed
  'xp',
  'dark', // a problem answered right in the Long Count campaign
  'rank', // a region rank cleared (Heroic, Legendary, …)
  'hunt', // a mistake caught in a Mistake Hunt
  'expedition', // the pet came back from an expedition
  'card', // a size card collected for the Scale Museum
  'quick', // a quick-draw answer in a duel
] as const;

export type GameEvent = (typeof GAME_EVENTS)[number];

/**
 * Events that are also counted per region (`win:<region>` …), for region trophies and
 * flawless-fight treasures.
 */
export const REGION_EVENTS = ['win', 'flawless', 'boss', 'rank'] as const;

export function track(
  p: Profile,
  ev: GameEvent,
  n = 1,
  now = Date.now(),
  region?: string,
): Fx[] {
  if (n <= 0) return [];
  p.counters[ev] = (p.counters[ev] ?? 0) + n;
  if (region) p.counters[`${ev}:${region}`] = (p.counters[`${ev}:${region}`] ?? 0) + n;
  const fx: Fx[] = [];
  fx.push(...advanceQuests(p, ev, n, now));
  fx.push(...checkAchievements(p, now));
  return fx;
}
