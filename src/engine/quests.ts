/**
 * Daily bounties: three small goals a day, picked from a pool (seeded by hero + date, so they
 * don't change on reload). Claim each for gold; claim all three for a bounty chest.
 */
import type { Profile, Quest } from './profile';
import type { Fx } from './rewards';
import type { GameEvent } from './events';
import { Rng, hashString } from './rng';
import { dayKey } from './dates';
import { items, regions } from '../content';
import { regionUnlocked } from './progress';

export interface QuestDef {
  id: string;
  ev: GameEvent;
  goals: number[];
  gold: number;
  icon: string;
  text: (n: number) => string;
  /** Only offered when this is true. */
  when?: (p: Profile) => boolean;
}

const hasPet = (p: Profile) => !!p.pet && !p.pet.dead;
const learned = (p: Profile) => Object.keys(p.skills).length > 0;

export const QUESTS: QuestDef[] = [
  {
    id: 'answers',
    ev: 'right',
    goals: [15, 25, 40],
    gold: 20,
    icon: '✅',
    text: (n) => `Answer ${n} questions right`,
  },
  {
    id: 'clean',
    ev: 'clean',
    goals: [10, 20],
    gold: 25,
    icon: '🎯',
    text: (n) => `Get ${n} right on the first try`,
  },
  {
    id: 'grit',
    ev: 'grit',
    goals: [2, 3],
    gold: 25,
    icon: '🪨',
    text: (n) => `Put ${n} mistakes right (answer them right on the next go)`,
    when: learned,
  },
  {
    id: 'win',
    ev: 'win',
    goals: [2, 3],
    gold: 20,
    icon: '⚔️',
    text: (n) => `Win ${n} fights`,
    when: learned,
  },
  {
    id: 'flawless',
    ev: 'flawless',
    goals: [1],
    gold: 30,
    icon: '💎',
    text: () => `Win a fight without a single mistake`,
    when: learned,
  },
  {
    id: 'wander',
    ev: 'wander',
    goals: [1, 2],
    gold: 25,
    icon: '👹',
    text: (n) => `Beat ${n} wandering monster${n > 1 ? 's' : ''}`,
    when: learned,
  },
  {
    id: 'combo',
    ev: 'combo5',
    goals: [1],
    gold: 20,
    icon: '🔥',
    text: () => `Get 5 right in a row`,
  },
  {
    id: 'lesson',
    ev: 'lesson',
    goals: [1],
    gold: 20,
    icon: '📖',
    text: () => `Finish a new lesson`,
  },
  {
    id: 'drill',
    ev: 'drill',
    goals: [1],
    gold: 25,
    icon: '🌳',
    text: () => `Finish a drill from the Skill Tree`,
    when: learned,
  },
  {
    id: 'feed',
    ev: 'feed',
    goals: [2, 3],
    gold: 15,
    icon: '🍖',
    text: (n) => `Feed your pet ${n} times`,
    when: hasPet,
  },
  {
    id: 'pat',
    ev: 'pat',
    goals: [5, 8],
    gold: 10,
    icon: '🤚',
    text: (n) => `Pat your pet ${n} times`,
    when: hasPet,
  },
  {
    id: 'dark',
    ev: 'dark',
    goals: [10, 15],
    gold: 30,
    icon: '🗡️',
    text: (n) => `Answer ${n} questions right in the Long Count`,
    when: (p) => regions.some((r) => r.campaign === 'march' && regionUnlocked(p, r)),
  },
];

export const questById: Record<string, QuestDef> = Object.fromEntries(QUESTS.map((q) => [q.id, q]));

/** Makes sure today's bounties exist. */
export function ensureQuests(p: Profile, today = dayKey()): void {
  if (p.quests?.day === today) return;
  const rng = new Rng(hashString(`${p.id}:${today}`));
  const pool = QUESTS.filter((q) => !q.when || q.when(p));
  const picked = rng.shuffle(pool).slice(0, 3);
  p.quests = {
    day: today,
    list: picked.map((q) => ({ id: q.id, goal: rng.pick(q.goals), have: 0, claimed: false })),
    chest: false,
  };
}

export function advanceQuests(p: Profile, ev: GameEvent, n: number, now = Date.now()): Fx[] {
  ensureQuests(p, dayKey(now));
  const fx: Fx[] = [];
  for (const q of p.quests!.list) {
    const def = questById[q.id];
    if (!def || def.ev !== ev || q.have >= q.goal) continue;
    q.have = Math.min(q.goal, q.have + n);
    if (q.have >= q.goal) fx.push({ kind: 'quest', id: q.id });
  }
  return fx;
}

export const questReady = (q: Quest) => q.have >= q.goal && !q.claimed;

/** Claims a finished bounty. Returns the gold paid, or 0. */
export function claimQuest(p: Profile, id: string): number {
  const q = p.quests?.list.find((x) => x.id === id);
  if (!q || !questReady(q)) return 0;
  q.claimed = true;
  const gold = questById[id]?.gold ?? 15;
  p.hero.gold += gold;
  p.counters.quest = (p.counters.quest ?? 0) + 1;
  return gold;
}

/** All three claimed: open the bounty chest (gold plus one random useful item). */
export function claimChest(p: Profile, rng = new Rng()): { gold: number; item: string } | null {
  const qd = p.quests;
  if (!qd || qd.chest || !qd.list.every((q) => q.claimed)) return null;
  qd.chest = true;
  const pool = items.filter(
    (i) => i.drop > 0 && !i.from && ['food', 'toy', 'care', 'potion'].includes(i.kind),
  );
  const it = rng.weighted(pool, (x) => x.drop);
  const gold = rng.int(30, 50);
  p.hero.gold += gold;
  p.inv[it.id] = Math.min(it.max ?? 99, (p.inv[it.id] ?? 0) + 1);
  p.counters.chests = (p.counters.chests ?? 0) + 1;
  return { gold, item: it.id };
}
