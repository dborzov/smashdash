/**
 * The Scale Museum (The Order of Magnitude): a card for every real thing in content/sizes.yaml.
 * A card is collected the first time the player puts that thing in the right place on the
 * Scale Ladder (or answers a problem about it right).
 */
import type { Profile } from './profile';
import type { Fx } from './rewards';
import { sizeById } from '../content';

export function collectCards(p: Profile, ids: string[] | undefined, now = Date.now()): Fx[] {
  const fx: Fx[] = [];
  for (const id of ids ?? []) {
    if (!sizeById[id] || p.cards[id]) continue;
    p.cards[id] = now;
    fx.push({ kind: 'card', id });
  }
  return fx;
}

export const cardsCollected = (p: Profile) => Object.keys(p.cards ?? {}).filter((id) => sizeById[id]).length;
