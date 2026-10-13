/**
 * The skill graph and progress reports, as pure data for the Skill Tree page (and tests).
 *
 * The graph: every skill in content/skills.yaml, with `requires` edges. Layout puts each
 * region in its own column band and stacks a region's skills by depth (how many of the
 * region's own prerequisites come before them).
 */
import type { Skill } from '../content/schema';
import type { AtomState, Profile } from './profile';
import { regions, skills, skillById } from '../content';
import { atomStatus, effectiveMastery, PROMOTE_RUN, type AtomStatus } from './mastery';

export interface GraphNode {
  skill: Skill;
  col: number;
  row: number;
}

/** Skills that list `id` as a prerequisite. */
export function dependents(id: string): Skill[] {
  return skills.filter((s) => s.requires.includes(id));
}

/** Depth of a skill inside its own region (0 = needs nothing from its region). */
function depthInRegion(s: Skill, memo: Map<string, number>): number {
  if (memo.has(s.id)) return memo.get(s.id)!;
  memo.set(s.id, 0);
  const inRegion = s.requires.map((id) => skillById[id]).filter((x) => x && x.region === s.region);
  const d = inRegion.length ? 1 + Math.max(...inRegion.map((x) => depthInRegion(x, memo))) : 0;
  memo.set(s.id, d);
  return d;
}

/** Column per region (in story order), row per depth; ties spread down the column. */
export function layoutGraph(campaign?: string): {
  nodes: GraphNode[];
  cols: string[];
  rows: number;
} {
  const rs = regions.filter((r) => !campaign || r.campaign === campaign);
  const memo = new Map<string, number>();
  const nodes: GraphNode[] = [];
  let rows = 0;
  rs.forEach((r, col) => {
    const own = skills.filter((s) => s.region === r.id);
    const used = new Set<number>();
    for (const s of own) {
      let row = depthInRegion(s, memo);
      while (used.has(row)) row++;
      used.add(row);
      nodes.push({ skill: s, col, row });
      rows = Math.max(rows, row + 1);
    }
  });
  return { nodes, cols: rs.map((r) => r.id), rows };
}

// ---------------------------------------------------------------------------
// Per-skill and per-atom progress

export interface AtomView {
  id: string;
  name: string;
  status: AtomStatus;
  state?: AtomState;
}

export function atomViews(p: Profile, s: Skill): AtomView[] {
  return s.atoms.map((a) => {
    const st = p.atoms[`${s.id}/${a.id}`];
    return { id: a.id, name: a.name, status: atomStatus(st), state: st };
  });
}

/** Clean answers in a row still needed at the current tier to move up (null at the top tier). */
export function toNextTier(p: Profile, id: string): number | null {
  const s = p.skills[id];
  if (!s) return null;
  if ((s.tier ?? 1) >= 3) return null;
  const th = s.th ?? '';
  let run = 0;
  for (let i = th.length - 1; i >= 0 && th[i] === 'R'; i--) run++;
  return Math.max(1, PROMOTE_RUN - run);
}

export interface Summary {
  skillsTotal: number;
  skillsLearned: number;
  masters: number;
  atomsTotal: number;
  atomsSolid: number;
  atomsMastered: number;
  atomsShaky: number;
}

export function summary(p: Profile): Summary {
  let atomsTotal = 0;
  let atomsSolid = 0;
  let atomsMastered = 0;
  let atomsShaky = 0;
  for (const s of skills)
    for (const a of s.atoms) {
      atomsTotal++;
      const st = atomStatus(p.atoms[`${s.id}/${a.id}`]);
      if (st === 'solid') atomsSolid++;
      if (st === 'mastered') atomsMastered++;
      if (st === 'shaky') atomsShaky++;
    }
  return {
    skillsTotal: skills.length,
    skillsLearned: skills.filter((s) => p.skills[s.id]).length,
    masters: skills.filter((s) => (p.skills[s.id]?.tier ?? 0) === 3).length,
    atomsTotal,
    atomsSolid,
    atomsMastered,
    atomsShaky,
  };
}

export interface Trouble {
  skill: Skill;
  atom: string;
  name: string;
  wrong: number;
  nudged: number;
  seen: number;
  status: AtomStatus;
}

/** Atoms that cause the most trouble (wrong or nudged), worst first. */
export function troubleAtoms(p: Profile, limit = 8): Trouble[] {
  const out: Trouble[] = [];
  for (const [k, a] of Object.entries(p.atoms)) {
    const [sid, aid] = k.split('/');
    const s = skillById[sid];
    const def = s?.atoms.find((x) => x.id === aid);
    if (!s || !def || a.w + a.u === 0) continue;
    out.push({
      skill: s,
      atom: aid,
      name: def.name,
      wrong: a.w,
      nudged: a.u,
      seen: a.n,
      status: atomStatus(a),
    });
  }
  // Still-shaky ones first, then by how often they went wrong.
  const weight = (t: Trouble) => (t.status === 'shaky' ? 100 : 0) + t.wrong * 2 + t.nudged;
  return out.sort((a, b) => weight(b) - weight(a)).slice(0, limit);
}

/** Learned skills that have faded the most (for "needs review"). */
export function fadingSkills(
  p: Profile,
  limit = 6,
  now = Date.now(),
): { skill: Skill; eff: number }[] {
  return skills
    .filter((s) => p.skills[s.id])
    .map((s) => ({ skill: s, eff: effectiveMastery(p.skills[s.id], now) }))
    .sort((a, b) => a.eff - b.eff)
    .slice(0, limit);
}
