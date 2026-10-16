/**
 * The top (or, on a landscape tablet, the left) half of a fight: the hero, the pet, the foe and
 * the game's own art — the chest's locks, the bridge's planks, the siege, the vault, the tower.
 */
import type { ComponentChildren } from 'preact';
import type { Profile } from '../../engine/profile';
import type { EncounterSpec } from './spec';
import { Avatar } from '../../art/Avatar';
import { MonsterArt } from '../../art/Monster';
import { Muddler } from '../../art/Portrait';
import { DarkFoeArt, type DarkFoe } from '../../art/Dark';
import { PetArt } from '../../art/Pet';
import { petMood } from '../../engine/pet';
import { Bar } from '../components/Bits';
import { BridgeArt, ChestArt, RescueArt, SiegeArt, VaultArt } from './GameArt';

const DARK_ARTS = ['hollow', 'wraith', 'tallyman', 'forger', 'golem', 'rider'];

export interface FloatFx {
  id: number;
  text: string;
  side: 'hero' | 'foe';
  color: string;
}

export function Arena({
  spec,
  p,
  stage,
  done,
  total,
  hearts,
  hp,
  heroAnim,
  foeAnim,
  floats,
  broken,
  biting,
  cheer,
  pet,
}: {
  spec: EncounterSpec;
  p: Profile;
  stage: string;
  done: number;
  total: number;
  hearts: number;
  hp: number;
  heroAnim: string;
  foeAnim: string;
  floats: FloatFx[];
  broken: number[];
  biting: boolean;
  cheer: boolean;
  pet: Profile['pet'];
}) {
  const art = spec.monster?.art;
  const hurt = stage === 'won';
  const foe =
    spec.game === 'chest' ? (
      <ChestArt locks={total} open={done} biting={biting} />
    ) : spec.game === 'vault' ? (
      <VaultArt total={total} done={done} alarms={hp - hearts} ring={foeAnim === 'anim-hit'} />
    ) : spec.game === 'rescue' ? (
      <RescueArt total={total} done={done} zap={heroAnim === 'anim-hit'} />
    ) : art === 'muddler' ? (
      <Muddler />
    ) : art && DARK_ARTS.includes(art) ? (
      <DarkFoeArt art={art as DarkFoe} seed={spec.monster!.seed} hue={spec.monster!.hue} boss={!!spec.boss} hurt={hurt} />
    ) : spec.monster ? (
      <MonsterArt seed={spec.monster.seed} hue={spec.monster.hue} boss={!!spec.boss} hurt={hurt} />
    ) : null;

  const heroArt = (
    <Avatar
      look={p.hero.look}
      cls={p.hero.cls}
      hat={p.hero.hat}
      cape={p.hero.cape}
      mood={stage === 'lost' ? 'ko' : heroAnim === 'anim-hit' ? 'hurt' : 'happy'}
    />
  );
  const petArt = pet && (
    <div class={`companion ${cheer ? 'cheer' : ''}`}>
      <PetArt species={pet.species} mood={petMood(pet)} hat={pet.hat} />
    </div>
  );
  const fly = (left: (f: FloatFx) => string, top: string) =>
    floats.map((f) => (
      <div key={f.id} class="float-num" style={{ left: left(f), top, color: f.color }}>
        {f.text}
      </div>
    ));

  let body: ComponentChildren;
  if (spec.game === 'bridge') {
    const at = `${4 + (done / (total + 1)) * 82}%`;
    body = (
      <div class="arena-wide">
        <BridgeArt planks={total} at={done} broken={broken} />
        <div class={`bridge-hero ${heroAnim}`} style={{ left: at }}>
          {heroArt}
        </div>
        {fly(() => `${10 + (done / (total + 1)) * 82}%`, '10%')}
      </div>
    );
  } else if (spec.game === 'siege') {
    body = (
      <div class="arena-wide">
        <SiegeArt total={total} done={done} cracks={hp - hearts} hit={foeAnim === 'anim-hit'} />
        <div class={`siege-hero ${heroAnim}`}>{heroArt}</div>
        {fly((f) => (f.side === 'foe' ? '45%' : '12%'), '15%')}
      </div>
    );
  } else {
    const battle = spec.game === 'battle' || spec.game === 'duel';
    body = (
      <div class="enc-duel">
        <div class={`duel-hero ${heroAnim}`}>
          {heroArt}
          {petArt}
        </div>
        <div class={`duel-foe ${spec.boss ? 'boss' : ''}`}>
          {battle && (
            <div style={{ marginBottom: '6px' }}>
              <div class="foe-name">{spec.monster?.name}</div>
              <Bar value={total - done} max={total} kind="hp" />
            </div>
          )}
          <div
            class={`${foeAnim} ${stage === 'fight' && battle ? 'anim-bob' : ''}`}
            style={{ flex: 1, minHeight: 0, opacity: hurt && battle ? 0.35 : 1, transition: 'opacity 1s' }}
          >
            {foe}
          </div>
        </div>
        {fly((f) => (f.side === 'foe' ? '78%' : '16%'), '20%')}
      </div>
    );
  }
  return <div class="enc-arena">{body}</div>;
}
