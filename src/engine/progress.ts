/** Where the player is on the map: which regions and path nodes are open or finished. */
import type { Region } from '../content/schema';
import type { Profile } from './profile';
import { regions, regionById } from '../content';

export const nodeKey = (regionId: string, nodeId: string) => `${regionId}/${nodeId}`;

export function nodeDone(p: Profile, regionId: string, nodeId: string): boolean {
  return (p.nodes[nodeKey(regionId, nodeId)]?.plays ?? 0) > 0;
}

export function regionDone(p: Profile, region: Region): boolean {
  return region.path.every((n) => nodeDone(p, region.id, n.id));
}

export function regionUnlocked(p: Profile, region: Region): boolean {
  return region.requires.every((id) => regionById[id] && regionDone(p, regionById[id]));
}

/** A node is open when every node before it in the path is done. */
export function nodeUnlocked(p: Profile, region: Region, index: number): boolean {
  if (!regionUnlocked(p, region)) return false;
  return region.path.slice(0, index).every((n) => nodeDone(p, region.id, n.id));
}

/** Index of the first unfinished node, or -1 when the region is complete. */
export function nextNodeIndex(p: Profile, region: Region): number {
  return region.path.findIndex((n) => !nodeDone(p, region.id, n.id));
}

export function unlockedRegions(p: Profile): Region[] {
  return regions.filter((r) => regionUnlocked(p, r));
}

/** The region the hero is "at": the most recent unlocked region that is not finished. */
export function currentRegion(p: Profile): Region {
  const open = unlockedRegions(p);
  return open.find((r) => !regionDone(p, r)) ?? open[open.length - 1] ?? regions[0];
}

/** Stars from mistakes in a run. */
export function starsFor(wrong: number): number {
  return wrong === 0 ? 3 : wrong <= 2 ? 2 : 1;
}

export function markNode(p: Profile, regionId: string, nodeId: string, stars: number): boolean {
  const k = nodeKey(regionId, nodeId);
  const first = !p.nodes[k];
  const s = (p.nodes[k] ??= { plays: 0, stars: 0 });
  s.plays++;
  s.stars = Math.max(s.stars, stars);
  return first;
}
