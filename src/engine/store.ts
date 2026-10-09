/**
 * The live game state: the active profile plus a queue of reward effects for the UI.
 * Components read with `useProfile()` and change state only through `update()`, which
 * copies, mutates, saves and re-renders.
 */
import { useEffect, useState } from 'preact/hooks';
import type { Profile } from './profile';
import { loadProfile, saveProfile, setCurrentId, currentId } from './save';
import type { Fx } from './rewards';
import { rollDay, type DayRoll } from './daily';
import { tickPet } from './pet';
import { refreshWanderers } from './encounters';

let current: Profile | null = null;
const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());

/** Reward effects waiting to be shown (floating +XP, level-up, ...). */
export const fxQueue: Fx[] = [];
/** Streak news from the last day roll (shown once). */
export let dayNews: DayRoll = {};

export function getProfile(): Profile | null {
  return current;
}

/** Re-render on any state change; returns the active profile (or null). */
export function useProfile(): Profile | null {
  const [, setTick] = useState(0);
  useEffect(() => {
    const force = () => setTick((t) => t + 1);
    subs.add(force);
    return () => {
      subs.delete(force);
    };
  }, []);
  return current;
}

export function update(fn: (p: Profile) => Fx[] | void): Fx[] {
  if (!current) return [];
  const next = structuredClone(current);
  const fx = fn(next) || [];
  next.played = Date.now();
  current = next;
  saveProfile(next);
  fxQueue.push(...fx);
  notify();
  return fx;
}

/** Brings time-based systems up to date (day roll, pet, wanderers). */
function catchUp(p: Profile): void {
  const roll = rollDay(p);
  if (roll.lost || roll.shieldsUsed) dayNews = roll;
  if (p.pet) tickPet(p.pet);
  refreshWanderers(p);
}

export function activate(p: Profile): void {
  const next = structuredClone(p);
  catchUp(next);
  current = next;
  setCurrentId(next.id);
  saveProfile(next);
  notify();
}

export function logout(): void {
  current = null;
  setCurrentId(null);
  notify();
}

export function restore(): boolean {
  const id = currentId();
  const p = id ? loadProfile(id) : null;
  if (p) activate(p);
  return !!p;
}

/** Called every minute while the game is open. */
export function heartbeat(): void {
  if (!current) return;
  update((p) => catchUp(p));
}

export function clearDayNews(): void {
  dayNews = {};
}
