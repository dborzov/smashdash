/** Draws any Monster from content: the Muddler, a dark foe, or a procedural monster. */
import type { Monster } from '../content/schema';
import { MonsterArt } from './Monster';
import { Muddler } from './Portrait';
import { DarkFoeArt, type DarkFoe } from './Dark';

const DARK = ['hollow', 'wraith', 'tallyman', 'forger', 'golem', 'rider'];

export function FoeArt({
  m,
  boss,
  hurt,
  class: cls,
}: {
  m: Monster;
  boss?: boolean;
  hurt?: boolean;
  class?: string;
}) {
  if (m.art === 'muddler') return <Muddler class={cls} />;
  if (m.art && DARK.includes(m.art))
    return (
      <DarkFoeArt
        art={m.art as DarkFoe}
        seed={m.seed}
        hue={m.hue}
        boss={boss}
        hurt={hurt}
        class={cls}
      />
    );
  return <MonsterArt seed={m.seed} hue={m.hue} boss={boss} hurt={hurt} class={cls} />;
}
