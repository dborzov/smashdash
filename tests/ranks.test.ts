/** Ranks: paths, the two-sleep cooldown, payouts and treasures. */
import { describe, expect, it } from 'vitest';
import { newProfile } from '../src/engine/profile';
import {
  clearRank,
  clearStory,
  markRankNode,
  nextRank,
  opensIn,
  rankNodeOpen,
  rankOf,
  rankPath,
  rankReady,
} from '../src/engine/ranks';
import { regionById, regions } from '../src/content';
import { migrate } from '../src/engine/save';
import { DAY } from '../src/engine/dates';

const hero = () =>
  newProfile({ name: 'Test', cls: 'wizard', look: { skin: 0, hair: 0, hairStyle: 0, outfit: 0 }, goal: 100 });

/** Marks every node of a region's story path done. */
function finish(p: ReturnType<typeof hero>, id: string) {
  const r = regionById[id];
  for (const n of r.path) p.nodes[`${r.id}/${n.id}`] = { plays: 1, stars: 3 };
}

describe('rank paths', () => {
  it('every region has a playable rank 2 and 3 path ending in a tougher boss', () => {
    for (const r of regions)
      for (const rank of [2, 3, 4]) {
        const path = rankPath(r, rank);
        const boss = path[path.length - 1];
        expect(boss.type, `${r.id} rank ${rank}`).toBe('boss');
        if (boss.type !== 'boss') continue;
        const story = r.path.find((n) => n.type === 'boss');
        expect(boss.phases.length).toBe(story && story.type === 'boss' ? story.phases.length + 1 : 1);
        expect(boss.floor).toBe(Math.min(3, rank));
        expect(path.some((n) => n.id === 'hunt')).toBe(true);
        expect(new Set(path.map((n) => n.id)).size, `${r.id}: duplicate node ids`).toBe(path.length);
      }
  });
  it('fights get longer at higher ranks', () => {
    const r = regionById.tavern;
    const story = new Set(r.path.map((n) => n.id));
    const count = (rank: number) =>
      rankPath(r, rank).reduce((a, n) => a + (n.type === 'encounter' && story.has(n.id) ? n.count : 0), 0);
    expect(count(3)).toBeGreaterThan(count(2));
  });
});

describe('cooldown', () => {
  it('opens the next rank two calendar days after a clear', () => {
    const p = hero();
    const r = regionById.tavern;
    expect(nextRank(p, r)).toBeNull();
    finish(p, 'tavern');
    const t0 = new Date('2026-10-17T20:00:00').getTime();
    clearStory(p, r, t0);
    expect(rankOf(p, r)).toBe(1);
    expect(nextRank(p, r)).toBe(2);
    expect(rankReady(p, r, t0)).toBe(false);
    expect(opensIn(p, r, t0)).toBe('in 2 days');
    expect(rankReady(p, r, t0 + DAY)).toBe(false);
    expect(opensIn(p, r, t0 + DAY)).toBe('tomorrow');
    // Calendar days, not 48 hours: early on the second morning is fine.
    expect(rankReady(p, r, new Date('2026-10-19T07:00:00').getTime())).toBe(true);
  });
  it('rank nodes open in order once the rank is ready', () => {
    const p = hero();
    const r = regionById.tavern;
    finish(p, 'tavern');
    const t0 = new Date('2026-10-01T12:00:00').getTime();
    clearStory(p, r, t0);
    const now = t0 + 3 * DAY;
    const path = rankPath(r, 2);
    expect(rankNodeOpen(p, r, path, 0, now)).toBe(true);
    expect(rankNodeOpen(p, r, path, 1, now)).toBe(false);
    markRankNode(p, r, path[0].id, 3);
    expect(rankNodeOpen(p, r, path, 1, now)).toBe(true);
  });
  it('clearing a rank pays out once, hands over treasures and restarts the cooldown', () => {
    const p = hero();
    const r = regionById.subzero;
    finish(p, 'subzero');
    const t0 = new Date('2026-10-01T12:00:00').getTime();
    clearStory(p, r, t0);
    const xp = p.hero.xp;
    const fx = clearRank(p, r, 2, t0 + 3 * DAY);
    expect(fx.some((f) => f.kind === 'rank')).toBe(true);
    expect(p.hero.xp).toBeGreaterThan(xp);
    expect(p.inv['penguin-popsicle']).toBeGreaterThan(0);
    expect(clearRank(p, r, 2, t0 + 4 * DAY)).toEqual([]);
    expect(rankOf(p, r)).toBe(2);
    expect(rankReady(p, r, t0 + 3 * DAY)).toBe(false);
    expect(rankReady(p, r, t0 + 5 * DAY)).toBe(true);
  });
  it('players who finished regions before ranks existed can play Heroic straight away', () => {
    const p = hero() as unknown as Record<string, unknown>;
    finish(p as never, 'bramblebottom');
    delete p.ranks;
    p.v = 2;
    const m = migrate(JSON.parse(JSON.stringify(p)));
    expect(rankOf(m, regionById.bramblebottom)).toBe(1);
    expect(rankReady(m, regionById.bramblebottom)).toBe(true);
  });
});
