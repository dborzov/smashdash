/**
 * Everything the adventure board shows about a region, computed from the profile: progress,
 * stars, time spent, accuracy, mastery, whether it's new to this player, and what's next.
 */
import type { PathNode, Region } from '../content/schema';
import type { Profile } from './profile';
import { regionById, skills } from '../content';
import { nextNodeIndex, nodeDone, nodeKey, regionDone, regionUnlocked } from './progress';
import { atomStatus, effectiveMastery } from './mastery';
import { DAY } from './dates';

export type RegionStatus = 'locked' | 'new' | 'started' | 'done';

export interface RegionStats {
  status: RegionStatus;
  /** Added to the game after this hero was created, and not opened yet. */
  isNew: boolean;
  done: number;
  total: number;
  stars: number;
  maxStars: number;
  timeMs: number;
  /** Answers given on this region's skills (anywhere in the game). */
  answered: number;
  /** Share right (including after a nudge), or null when nothing answered yet. */
  accuracy: number | null;
  /** Average tier of the region's skills, 0 when none learned. */
  tierAvg: number;
  /** Atoms of the region's skills that are solid or mastered / all atoms. */
  atomsSolid: number;
  atomsTotal: number;
  /** Finished, but its skills have faded: time for review. */
  needsReview: boolean;
  next: PathNode | null;
  /** Regions that must be finished first (for locked regions). */
  waitingFor: Region[];
  lastAt: number;
}

export function regionStats(p: Profile, r: Region, now = Date.now()): RegionStats {
  const unlocked = regionUnlocked(p, r);
  const done = r.path.filter((n) => nodeDone(p, r.id, n.id)).length;
  const scored = r.path.filter((n) => n.type !== 'story');
  const stars = scored.reduce((a, n) => a + (p.nodes[nodeKey(r.id, n.id)]?.stars ?? 0), 0);
  const rs = skills.filter((s) => s.region === r.id);
  let seen = 0;
  let right = 0;
  let tiers = 0;
  let learned = 0;
  let eff = 0;
  let atomsSolid = 0;
  let atomsTotal = 0;
  for (const s of rs) {
    const st = p.skills[s.id];
    atomsTotal += s.atoms.length;
    for (const a of s.atoms) {
      const as = atomStatus(p.atoms[`${s.id}/${a.id}`]);
      if (as === 'solid' || as === 'mastered') atomsSolid++;
    }
    if (!st) continue;
    learned++;
    seen += st.seen;
    right += st.right;
    tiers += st.tier ?? 1;
    eff += effectiveMastery(st, now);
  }
  const finished = regionDone(p, r);
  const added = Date.parse(r.added + 'T00:00:00');
  const isNew = unlocked && !p.visited[r.id] && !finished && added > (p.created ?? 0) - DAY;
  const status: RegionStatus = !unlocked
    ? 'locked'
    : finished
      ? 'done'
      : done > 0 || p.visited[r.id]
        ? 'started'
        : 'new';
  const ni = nextNodeIndex(p, r);
  return {
    status,
    isNew,
    done,
    total: r.path.length,
    stars,
    maxStars: scored.length * 3,
    timeMs: p.time[r.id] ?? 0,
    answered: seen,
    accuracy: seen ? right / seen : null,
    tierAvg: learned ? tiers / learned : 0,
    atomsSolid,
    atomsTotal,
    needsReview: finished && learned > 0 && eff / learned < 0.45,
    next: ni >= 0 ? r.path[ni] : null,
    waitingFor: r.requires.map((id) => regionById[id]).filter((x) => x && !regionDone(p, x)),
    lastAt: p.lastAt[r.id] ?? 0,
  };
}

/** "3 h 12 min", "25 min", "under a minute". */
export function formatTime(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 1) return ms > 0 ? 'under a minute' : '—';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${min % 60} min`;
}
