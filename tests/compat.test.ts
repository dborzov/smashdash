/**
 * Saves are sacred. Players who started before new regions were added must keep every bit
 * of their progress, and the new regions must slot in without a reset.
 *
 * V1_NODES and V1_SKILLS are a frozen snapshot of the ids that existed in the first release
 * (6 regions, 22 skills). Saves store progress under these ids, so they must never be
 * renamed or removed. If you really have to, add a migration in src/engine/save.ts.
 */
import { describe, expect, it } from 'vitest';
import { newProfile, SAVE_VERSION, type Profile } from '../src/engine/profile';
import { exportProfile, importProfile, migrate } from '../src/engine/save';
import {
  currentRegion,
  markNode,
  nodeKey,
  regionDone,
  regionUnlocked,
} from '../src/engine/progress';
import { learnedSkills, recordAnswer } from '../src/engine/mastery';
import { planProblems, refreshWanderers } from '../src/engine/encounters';
import { regionById, regions, skillById } from '../src/content';
import { generate } from '../src/skills';
import { Rng } from '../src/engine/rng';

const V1_NODES: Record<string, string[]> = {
  bramblebottom: [
    'intro',
    'box-talk',
    'open-the-box',
    'goblin-scuffle',
    'two-locks',
    'bakery-chest',
    'bracket-trap',
    'rickety-bridge',
    'goblin-gibberish',
    'market-mayhem',
    'boss',
  ],
  ironhold: [
    'intro',
    'scales-of-truth',
    'same-to-both',
    'soot-sprites',
    'undo-spells',
    'forge-vault',
    'right-hammer',
    'lava-bridge',
    'boss',
  ],
  gloomfen: [
    'intro',
    'lilypad-hop',
    'imp-ambush',
    'split-the-swarm',
    'sunken-chest',
    'truth-or-trap',
    'lilypad-path',
    'boss',
  ],
  dragonspine: [
    'intro',
    'last-on-first-off',
    'kobold-camp',
    'dragon-locks',
    'ice-bridge',
    'frozen-chest',
    'boss',
  ],
  bazaar: [
    'intro',
    'whats-x',
    'riddle-to-equation',
    'rat-riddles',
    'solve-the-riddle',
    'merchant-chest',
    'rope-bridge',
    'boss',
  ],
  tower: [
    'intro',
    'repeat-spell',
    'growing-potion',
    'gremlin-gang',
    'shrinking-potion',
    'potion-cabinet',
    'decimal-hop',
    'staircase',
    'giant-numbers',
    'observatory',
    'boss',
  ],
};
const V1_SKILLS = [
  'notation',
  'eval-one',
  'eval-two',
  'eval-parens',
  'words-to-expr',
  'balance-rule',
  'both-sides',
  'inverse-ops',
  'pick-move',
  'one-step-add',
  'one-step-mul',
  'check-solution',
  'undo-order',
  'two-step',
  'name-unknown',
  'story-to-equation',
  'story-solve',
  'power-meaning',
  'pow10-up',
  'pow10-down',
  'times-pow10',
  'sci-notation',
];
const NEW_REGIONS = ['mirrors', 'bay', 'junkyard'];

const look = { skin: 0, hair: 0, hairStyle: 0, outfit: 0 };

/** A v1 save as it sits in localStorage: plain JSON, no fields added since. */
function v1Save(done: string[], skills: string[]): Profile {
  const p = newProfile({ name: 'Old Timer', cls: 'knight', look, goal: 100 }, 1_700_000_000_000);
  for (const r of done) for (const n of V1_NODES[r]) markNode(p, r, n, 3);
  for (const s of skills) recordAnswer(p, s, 'right', 1_700_000_000_000);
  p.hero.xp = 1234;
  p.hero.gold = 321;
  p.inv['hint-scroll'] = 4;
  p.seen = ['prologue'];
  // Strip everything added in save v2, so this really looks like an old save.
  const old = JSON.parse(JSON.stringify(p));
  old.v = 1;
  for (const k of [
    'atoms',
    'ach',
    'counters',
    'time',
    'visited',
    'quests',
    'boosts',
    'den',
    'newsSeen',
    'title',
  ])
    delete old[k];
  for (const sk of Object.values(old.skills) as Record<string, unknown>[]) {
    delete sk.tier;
    delete sk.th;
  }
  return old;
}

describe('v1 ids are still there', () => {
  it('every v1 region and path node still exists', () => {
    for (const [rid, nodes] of Object.entries(V1_NODES)) {
      const r = regionById[rid];
      expect(r, `region ${rid}`).toBeDefined();
      const ids = r.path.map((n) => n.id);
      for (const n of nodes) expect(ids, `${rid}/${n}`).toContain(n);
      // Nothing was inserted into an old path: that would lock players out of the boss.
      expect(ids, `${rid} path`).toEqual(nodes);
    }
  });
  it('every v1 skill still exists with a generator', () => {
    for (const s of V1_SKILLS) {
      expect(skillById[s], s).toBeDefined();
      expect(() => generate(s, 1, new Rng(1))).not.toThrow();
    }
  });
  it('the save version is known, and v1 saves migrate to it', () => {
    // Bumping SAVE_VERSION needs a migration step in save.ts and a test here.
    expect(SAVE_VERSION).toBe(2);
  });
});

describe('save v1 → v2 migration', () => {
  it('adds every new field with safe defaults and keeps all progress', () => {
    const old = v1Save(['bramblebottom'], ['notation', 'eval-one', 'eval-two']);
    // Mastery that would have been level 3 in v1 starts at tier 3.
    old.skills['eval-one'].m = 0.8;
    const p = migrate(JSON.parse(JSON.stringify(old)));
    expect(p.v).toBe(SAVE_VERSION);
    expect(p.atoms).toEqual({});
    expect(p.ach).toEqual({});
    expect(p.counters).toEqual({});
    expect(p.time).toEqual({});
    expect(p.den).toEqual([]);
    expect(p.boosts).toEqual({});
    expect(p.quests).toBeNull();
    expect(p.skills['eval-one'].tier).toBe(3);
    expect(p.skills['notation'].tier).toBe(1);
    // Regions the player already played are not marked NEW.
    expect(Object.keys(p.visited)).toEqual(['bramblebottom']);
    expect(p.hero.xp).toBe(1234);
    expect(p.nodes[nodeKey('bramblebottom', 'boss')].stars).toBe(3);
  });
  it('is idempotent', () => {
    const once = migrate(v1Save(['bramblebottom'], ['notation']));
    const twice = migrate(JSON.parse(JSON.stringify(once)));
    expect(twice).toEqual(once);
  });
  it('an old save gets the new campaign as new, locked behind its requirements', () => {
    const p = migrate(v1Save(Object.keys(V1_NODES), V1_SKILLS));
    const march = regions.filter((r) => r.campaign === 'march');
    expect(march.length).toBeGreaterThanOrEqual(4);
    for (const r of march) expect(p.visited[r.id], r.id).toBeUndefined();
  });
});

describe('old saves with the new regions', () => {
  it('a player who finished everything keeps it all, and the new regions open up', () => {
    const p = migrate(v1Save(Object.keys(V1_NODES), V1_SKILLS));
    for (const rid of Object.keys(V1_NODES)) expect(regionDone(p, regionById[rid]), rid).toBe(true);
    for (const rid of NEW_REGIONS) {
      expect(regionUnlocked(p, regionById[rid]), `${rid} unlocked`).toBe(true);
      expect(regionDone(p, regionById[rid]), `${rid} not done`).toBe(false);
    }
    // The hero now stands at the first new region instead of at a finished one.
    expect(NEW_REGIONS).toContain(currentRegion(p).id);
    expect(p.hero.xp).toBe(1234);
    expect(p.hero.gold).toBe(321);
    expect(p.inv['hint-scroll']).toBe(4);
    expect(learnedSkills(p).sort()).toEqual([...V1_SKILLS].sort());
  });

  it('a player halfway through keeps their place; new regions wait behind their requirements', () => {
    const p = migrate(
      v1Save(
        ['bramblebottom'],
        ['notation', 'eval-one', 'eval-two', 'eval-parens', 'words-to-expr'],
      ),
    );
    markNode(p, 'ironhold', 'intro', 3);
    expect(regionDone(p, regionById.bramblebottom)).toBe(true);
    expect(currentRegion(p).id).toBe('ironhold');
    // Mirrormaze and Beamhook only need Bramblebottom; the Junkyard needs Gloomfen.
    expect(regionUnlocked(p, regionById.mirrors)).toBe(true);
    expect(regionUnlocked(p, regionById.bay)).toBe(true);
    expect(regionUnlocked(p, regionById.junkyard)).toBe(false);
  });

  it('a brand-new player starts in Bramblebottom; only the two campaign gates are open', () => {
    const p = migrate(v1Save([], []));
    expect(currentRegion(p).id).toBe('bramblebottom');
    // Each campaign has its own first region (Greyhaven opens the Long Count from day one).
    const open = new Set(['bramblebottom', 'greyhaven']);
    for (const r of regions) expect(regionUnlocked(p, r), r.id).toBe(open.has(r.id));
  });

  it('an exported v1 save imports, and spaced review keeps working', () => {
    const old = v1Save(Object.keys(V1_NODES), V1_SKILLS);
    const p = importProfile(exportProfile(old));
    expect(p.nodes[nodeKey('tower', 'boss')].stars).toBe(3);
    const now = 1_700_000_000_000 + 3 * 86_400_000;
    refreshWanderers(p, now, new Rng(5));
    expect(p.wanderers.length).toBeGreaterThan(0);
    // Wanderers only review skills the player has actually learned.
    for (const w of p.wanderers) for (const s of w.skills) expect(V1_SKILLS).toContain(s);
    // New skills can be planned even with no mastery recorded yet.
    const plan = planProblems(p, ['expand', 'volts', 'table-rule'], 5, new Rng(2));
    expect(plan.every((q) => q.level === 1)).toBe(true);
  });
});
