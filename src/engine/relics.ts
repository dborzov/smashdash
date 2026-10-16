/**
 * Relics and treasures.
 *
 * - **Treasures** are items only one region gives (content: `treasures` in region.yaml): for
 *   clearing one of its ranks, or for flawless fights there. Each is given once; the counter
 *   `treasure:<item>` remembers it.
 * - **Relics** are treasures you wear (item kind `relic`, two slots). Their effects
 *   (`relic:` in items.yaml) work in fights — some only in one campaign, so the best relic for a
 *   campaign is earned in that campaign.
 */
import type { RelicEffect } from '../content/schema';
import type { Profile } from './profile';
import type { Fx } from './rewards';
import { itemById, regionById } from '../content';

export const RELIC_SLOTS = 2;

/** Gives a region treasure once. Returns false if it was already given. */
export function giveTreasure(p: Profile, id: string): boolean {
  const it = itemById[id];
  if (!it || p.counters[`treasure:${id}`]) return false;
  p.counters[`treasure:${id}`] = 1;
  if (it.effect.egg) p.eggs += 1;
  else p.inv[id] = Math.min(it.max ?? 99, (p.inv[id] ?? 0) + 1);
  if (it.kind === 'decor' && !p.den.includes(id)) p.den.push(id);
  if (it.kind === 'relic' && p.relics.length < RELIC_SLOTS) p.relics.push(id);
  return true;
}

/** Flawless-fight treasures of a region whose goal is now met. */
export function flawlessTreasures(p: Profile, regionId: string): Fx[] {
  const r = regionById[regionId];
  if (!r) return [];
  const have = p.counters[`flawless:${regionId}`] ?? 0;
  const fx: Fx[] = [];
  for (const t of r.treasures)
    if (t.flawless && have >= t.flawless && giveTreasure(p, t.item))
      fx.push({ kind: 'item', item: t.item, count: 1 });
  return fx;
}

/** Wear or take off a relic. Returns a reason when it can't be worn. */
export function toggleRelic(p: Profile, id: string): string | null {
  const it = itemById[id];
  if (!it || it.kind !== 'relic' || !(p.inv[id] > 0)) return "You don't have that relic.";
  if (p.relics.includes(id)) {
    p.relics = p.relics.filter((x) => x !== id);
    return null;
  }
  if (p.relics.length >= RELIC_SLOTS) return `You can wear ${RELIC_SLOTS} relics. Take one off first.`;
  p.relics.push(id);
  return null;
}

export interface RelicBonus {
  hearts: number;
  hints: number;
  ward: boolean;
  gold: number;
  xp: number;
  rally: number;
  pet: boolean;
  /** Names of the relics that are working here (for the fight's top bar). */
  active: string[];
}

/** What the worn relics do in a fight of this campaign. */
export function relicBonus(p: Profile, campaign: string | undefined): RelicBonus {
  const b: RelicBonus = { hearts: 0, hints: 0, ward: false, gold: 0, xp: 0, rally: 3, pet: false, active: [] };
  for (const id of p.relics ?? []) {
    const it = itemById[id];
    const e: RelicEffect | undefined = it?.relic;
    if (!e || !(p.inv[id] > 0)) continue;
    if (e.campaign && e.campaign !== campaign) continue;
    b.active.push(it.icon);
    b.hearts += e.hearts ?? 0;
    b.hints += e.hints ?? 0;
    b.ward ||= !!e.ward;
    b.gold += e.gold ?? 0;
    b.xp += e.xp ?? 0;
    if (e.rally) b.rally = Math.min(b.rally, e.rally);
    b.pet ||= !!e.pet;
  }
  return b;
}

/** One line about a relic's effect, for the bag and the shop. */
export function relicText(e: RelicEffect | undefined): string {
  if (!e) return '';
  const bits: string[] = [];
  if (e.hearts) bits.push(`+${e.hearts} heart${e.hearts > 1 ? 's' : ''}`);
  if (e.hints) bits.push(`${e.hints} free hint${e.hints > 1 ? 's' : ''} per fight`);
  if (e.ward) bits.push('start every fight with a ward');
  if (e.gold) bits.push(`+${e.gold}% loot gold`);
  if (e.xp) bits.push(`+${e.xp}% victory XP`);
  if (e.rally) bits.push(`rally after ${e.rally} clean answers`);
  if (e.pet) bits.push('your pet finds gold more often');
  return bits.join(', ');
}
