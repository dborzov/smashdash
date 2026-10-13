/**
 * Persistence in localStorage. Several profiles can live side by side:
 *   smashdash:index      -> ProfileSummary[]
 *   smashdash:p:<id>     -> Profile JSON
 *   smashdash:current    -> id of the active profile
 */
import type { Profile } from './profile';
import { SAVE_VERSION, levelFromXp } from './profile';

const INDEX = 'smashdash:index';
const CURRENT = 'smashdash:current';
const key = (id: string) => `smashdash:p:${id}`;

export interface ProfileSummary {
  id: string;
  name: string;
  cls: string;
  level: number;
  look: Profile['hero']['look'];
  played: number;
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function readJson<T>(k: string, fallback: T): T {
  try {
    const s = storage()?.getItem(k);
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(k: string, v: unknown): void {
  try {
    storage()?.setItem(k, JSON.stringify(v));
  } catch {
    // Storage full or blocked (private mode): the game still works for this session.
  }
}

export function listProfiles(): ProfileSummary[] {
  return readJson<ProfileSummary[]>(INDEX, []).sort((a, b) => b.played - a.played);
}

export function summary(p: Profile): ProfileSummary {
  return {
    id: p.id,
    name: p.hero.name,
    cls: p.hero.cls,
    level: levelFromXp(p.hero.xp),
    look: p.hero.look,
    played: p.played,
  };
}

export function saveProfile(p: Profile): void {
  writeJson(key(p.id), p);
  const idx = readJson<ProfileSummary[]>(INDEX, []).filter((s) => s.id !== p.id);
  idx.push(summary(p));
  writeJson(INDEX, idx);
}

/** Mastery → starting tier, used when upgrading v1 saves (same thresholds as v1's levelFor). */
const tierFromMastery = (m: number): 1 | 2 | 3 => (m < 0.35 ? 1 : m < 0.7 ? 2 : 3);

/**
 * Upgrades older saves to the current shape. Add a step for every SAVE_VERSION bump.
 * Every step must be idempotent and must only ADD things: never drop a player's progress.
 */
export function migrate(p: Profile): Profile {
  p.wanderers ??= [];
  p.graves ??= [];
  p.daily.history ??= {};
  p.inv ??= {};
  p.nodes ??= {};
  p.skills ??= {};
  p.seen ??= [];
  p.stats ??= { right: 0, wrong: 0, nudged: 0, wins: 0, losses: 0, bosses: 0 };
  if ((p.v ?? 1) < 2) {
    // v2: atoms, tiers, achievements, bounties, time tracking, den, boosts.
    for (const s of Object.values(p.skills)) s.tier ??= tierFromMastery(s.m);
    // Regions the player already played are not "new" to them.
    p.visited ??= {};
    for (const k of Object.keys(p.nodes)) {
      const region = k.split('/')[0];
      p.visited[region] ??= p.created ?? Date.now();
    }
  }
  p.atoms ??= {};
  p.ach ??= {};
  p.counters ??= {};
  p.time ??= {};
  p.visited ??= {};
  p.quests ??= null;
  p.boosts ??= {};
  p.den ??= [];
  p.newsSeen ??= '';
  p.v = SAVE_VERSION;
  return p;
}

export function loadProfile(id: string): Profile | null {
  const p = readJson<Profile | null>(key(id), null);
  return p ? migrate(p) : null;
}

export function deleteProfile(id: string): void {
  try {
    storage()?.removeItem(key(id));
  } catch {
    /* ignore */
  }
  writeJson(
    INDEX,
    readJson<ProfileSummary[]>(INDEX, []).filter((s) => s.id !== id),
  );
  if (currentId() === id) setCurrentId(null);
}

export function currentId(): string | null {
  return readJson<string | null>(CURRENT, null);
}

export function setCurrentId(id: string | null): void {
  if (id === null) {
    try {
      storage()?.removeItem(CURRENT);
    } catch {
      /* ignore */
    }
  } else writeJson(CURRENT, id);
}

/** For the "export save" button. */
export function exportProfile(p: Profile): string {
  return JSON.stringify({ smashdash: SAVE_VERSION, profile: p });
}

export function importProfile(json: string): Profile {
  const data = JSON.parse(json);
  const p = (data?.profile ?? data) as Profile;
  if (!p || typeof p !== 'object' || !p.hero || !p.id)
    throw new Error('This does not look like a Smashdash save.');
  return migrate(p);
}
