/**
 * Ranks: every region can be played again at higher ranks after its story path.
 *
 *   I Story → II Heroic → III Legendary → IV Mythic → V Ridiculous
 *
 * - A rank is a path of its own: an optional twist story, the region's fights again (bigger,
 *   and never easier than the rank's difficulty floor), a Mistake Hunt (someone else answers
 *   first, the player checks them), any extra nodes the region adds for that rank, and the boss
 *   with one more phase that mixes every skill of the region. Mythic and above also mix in
 *   skills from the rest of the campaign.
 * - **Cooldown.** The next rank opens two calendar days after the last one was cleared ("two
 *   sleeps"). It's spaced practice: coming back to a topic after a gap is one of the best-tested
 *   ways to make it stick. Each campaign gives an in-story reason (content/campaigns.yaml).
 * - Clearing a rank pays XP and gold, and the region's treasures for that rank.
 *
 * Pure (no UI); tested in tests/ranks.test.ts.
 */
import type { EncounterNode, Monster, Region } from '../content/schema';
import type { Profile, RankState } from './profile';
import type { Fx } from './rewards';
import { campaignById, itemById, regions, skills as allSkills } from '../content';
import { regionDone } from './progress';
import { addDays, dayKey, daysBetween } from './dates';
import { grant } from './rewards';
import { track } from './events';
import { giveTreasure } from './relics';

export const MAX_RANK = 5;
export const COOLDOWN_DAYS = 2;

export interface RankInfo {
  n: number;
  name: string;
  icon: string;
  /** Crest colour. */
  color: string;
}

export const RANKS: RankInfo[] = [
  { n: 1, name: 'Story', icon: '📜', color: '#cd8a4a' },
  { n: 2, name: 'Heroic', icon: '🛡️', color: '#c9d3e6' },
  { n: 3, name: 'Legendary', icon: '👑', color: '#ffd166' },
  { n: 4, name: 'Mythic', icon: '🔮', color: '#b47cff' },
  { n: 5, name: 'Ridiculous', icon: '🤪', color: '#ff5fa2' },
];
export const rankInfo = (n: number): RankInfo => RANKS[Math.max(0, Math.min(MAX_RANK, n) - 1)];

/** A node on a rank's path. Encounters and the boss carry the rank's difficulty floor. */
export type RankNode =
  | { id: string; type: 'story'; title: string; lesson: string }
  | (Omit<EncounterNode, 'count'> & { count: number; floor: number; review: boolean })
  | {
      id: 'boss';
      type: 'boss';
      title: string;
      monster: Monster;
      intro: string[];
      phases: { skills: string[]; count: number; taunt: string }[];
      defeat: string;
      floor: number;
      review: boolean;
    };

/** Skills taught in a region, in teaching order. */
export function regionSkills(region: Region): string[] {
  return allSkills.filter((s) => s.region === region.id).map((s) => s.id);
}

/** The path of one rank (2…5) of a region. */
export function rankPath(region: Region, rank: number): RankNode[] {
  const def = region.ranks.find((d) => d.rank === rank);
  const floor = Math.min(3, rank);
  const review = rank >= 4;
  const grow = 1 + 0.15 * (rank - 1);
  const out: RankNode[] = [];
  if (def?.story) out.push({ id: 'story', type: 'story', title: 'A twist!', lesson: def.story });
  for (const n of region.path) {
    if (n.type !== 'encounter') continue;
    out.push({ ...n, count: Math.min(12, Math.round(n.count * grow)), floor, review });
  }
  const camp = campaignById[region.campaign];
  const skills = regionSkills(region);
  out.push({
    id: 'hunt',
    type: 'encounter',
    title: camp?.critic.hunt ?? 'Mistake Hunt',
    game: 'battle',
    skills,
    count: 4 + Math.min(3, rank - 1),
    twist: 'critic',
    monster: region.monsters[0],
    floor,
    review,
  });
  for (const n of def?.nodes ?? []) out.push({ ...n, count: n.count ?? 5, floor, review });
  const boss = region.path.find((n) => n.type === 'boss');
  if (boss && boss.type === 'boss') {
    const b = def?.boss ?? {};
    const phases = boss.phases.map((ph, i) => ({
      skills: ph.skills,
      count: ph.count + 1,
      taunt: b.taunts?.[i] ?? ph.taunt,
    }));
    phases.push({
      skills,
      count: 2 + rank,
      taunt: b.taunts?.[boss.phases.length] ?? 'Everything at once! See how YOU like it!',
    });
    out.push({
      id: 'boss',
      type: 'boss',
      title: b.name ?? boss.title,
      monster: {
        ...boss.monster,
        name: b.name ?? boss.monster.name,
        seed: b.seed ?? boss.monster.seed,
        hue: b.hue ?? boss.monster.hue,
      },
      intro: b.intro ?? boss.intro,
      phases,
      defeat: b.defeat ?? boss.defeat,
      floor,
      review,
    });
  }
  return out;
}

export function rankState(p: Profile, region: Region): RankState {
  const s = p.ranks[region.id];
  if (s) return s;
  return { r: regionDone(p, region) ? 1 : 0, at: 0, run: {} };
}

/** Highest rank cleared: 0 (story not finished) … 5. */
export function rankOf(p: Profile, region: Region): number {
  const s = p.ranks[region.id];
  return Math.max(s?.r ?? 0, regionDone(p, region) ? 1 : 0);
}

/** The rank the player would play next (2…5), or null (story not done, or all ranks cleared). */
export function nextRank(p: Profile, region: Region): number | null {
  const r = rankOf(p, region);
  return r >= 1 && r < MAX_RANK ? r + 1 : null;
}

/** Day (YYYY-MM-DD) the next rank opens; null when there is no next rank. */
export function rankOpensOn(p: Profile, region: Region): string | null {
  if (nextRank(p, region) === null) return null;
  const at = rankState(p, region).at;
  return at ? addDays(dayKey(at), COOLDOWN_DAYS) : '0000-00-00';
}

export function rankReady(p: Profile, region: Region, now = Date.now()): boolean {
  const day = rankOpensOn(p, region);
  return day !== null && dayKey(now) >= day;
}

/** "tomorrow", "in 2 days" — for the cooldown label. */
export function opensIn(p: Profile, region: Region, now = Date.now()): string {
  const day = rankOpensOn(p, region);
  if (!day) return '';
  const d = daysBetween(dayKey(now), day);
  return d <= 0 ? 'now' : d === 1 ? 'tomorrow' : `in ${d} days`;
}

/** A node of the next rank is open when the rank is ready and every node before it is done. */
export function rankNodeOpen(
  p: Profile,
  region: Region,
  path: RankNode[],
  index: number,
  now = Date.now(),
): boolean {
  if (!rankReady(p, region, now)) return false;
  const run = rankState(p, region).run;
  return path.slice(0, index).every((n) => run[n.id] !== undefined);
}

export function markRankNode(p: Profile, region: Region, nodeId: string, stars: number): void {
  const s = (p.ranks[region.id] ??= { ...rankState(p, region), run: {} });
  s.run[nodeId] = Math.max(s.run[nodeId] ?? 0, stars);
}

/** Records the story path's first clear as rank 1 (starts the cooldown to Heroic). */
export function clearStory(p: Profile, region: Region, now = Date.now()): void {
  const s = p.ranks[region.id];
  if (!s || s.r < 1) p.ranks[region.id] = { r: 1, at: now, run: {} };
  for (const t of region.treasures) if (t.rank === 1) giveTreasure(p, t.item);
}

export const rankXp = (rank: number) => 100 + 60 * rank;
export const rankGold = (rank: number) => 40 * rank;

/** The boss of rank `rank` is beaten: pay out, start the cooldown, reset the run. */
export function clearRank(p: Profile, region: Region, rank: number, now = Date.now()): Fx[] {
  const s = (p.ranks[region.id] ??= rankState(p, region));
  if (rank <= s.r) return [];
  s.r = rank;
  s.at = now;
  s.run = {};
  const fx: Fx[] = [{ kind: 'rank', region: region.id, rank }];
  fx.push(...grant(p, { xp: rankXp(rank), gold: rankGold(rank) }));
  for (const t of region.treasures)
    if (t.rank === rank && giveTreasure(p, t.item)) fx.push({ kind: 'item', item: t.item, count: 1 });
  p.counters[`rank:${region.id}`] = Math.max(p.counters[`rank:${region.id}`] ?? 0, rank);
  fx.push(...track(p, 'rank', 1, now));
  return fx;
}

/** Skills from the rest of the campaign the player has learned (Mythic+ mixes them in). */
export function reviewSkills(p: Profile, region: Region): string[] {
  const here = new Set(regionSkills(region));
  return allSkills
    .filter((s) => !here.has(s.id) && p.skills[s.id])
    .filter((s) => regions.find((r) => r.id === s.region)?.campaign === region.campaign)
    .map((s) => s.id);
}

/** Treasures of a region that the player hasn't got yet. */
export function treasuresLeft(p: Profile, region: Region): string[] {
  return region.treasures
    .map((t) => t.item)
    .filter((id) => itemById[id] && !p.counters[`treasure:${id}`]);
}

/** Regions whose next rank is open right now. */
export function readyRanks(p: Profile, now = Date.now()): Region[] {
  return regions.filter((r) => rankReady(p, r, now));
}
