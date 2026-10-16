/** What an encounter is: the game, the foe, the phases, the rewards, any twist. */
import type { Game, Monster } from '../../content/schema';
import type { Reward } from '../../engine/rewards';
import type { Loot } from '../../engine/encounters';
import type { Tier } from '../../engine/mastery';

export interface Phase {
  skills: string[];
  count: number;
}

export interface EncounterSpec {
  title: string;
  game: Game;
  scene: string;
  monster?: Monster;
  boss?: { intro: string[]; taunts: string[]; defeat: string };
  phases: Phase[];
  /** Loot tier: 1 path fight, 2 wanderer, 3 boss. */
  tier: number;
  /** Extra reward for winning (first-time boss bonus etc). */
  winReward: Reward;
  /** Voice and look: the bright kingdom or the grim North. */
  tone: 'bright' | 'dark';
  /** Region the time (and region trophies) are counted towards. */
  region?: string;
  /** Campaign of the region (relics can work in one campaign only). */
  campaign?: string;
  /** A drill on one atom (from the Skill Tree). */
  focus?: { skill: string; atom: string };
  /** Problems start at least this hard (a region's higher ranks). */
  floor?: Tier;
  /** The region rank being played (2 = Heroic …), for the title bar. */
  rank?: number;
  /** Mistake Hunt: someone answers first and the player checks them. */
  critic?: { name: string; icon: string };
}

export interface EncounterResult {
  won: boolean;
  wrong: number;
  loot?: Loot;
  grit: number;
}

/** Spec with defaults filled in. */
export function specFor(
  opts: Omit<EncounterSpec, 'winReward' | 'tone'> & {
    winReward?: Reward;
    tone?: 'bright' | 'dark';
  },
): EncounterSpec {
  return { ...opts, winReward: opts.winReward ?? {}, tone: opts.tone ?? 'bright' };
}
