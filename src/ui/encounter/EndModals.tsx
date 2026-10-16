/** The end of a fight: victory (loot, grit, combos), knocked out, or running away. */
import type { Game } from '../../content/schema';
import type { Loot } from '../../engine/encounters';
import type { EncounterSpec } from './spec';
import { itemById } from '../../content';
import { Modal } from '../components/Bits';
import { Confetti } from '../components/Confetti';

const WIN_TEXT: Record<Game, [string, string]> = {
  battle: ['🏆', 'Victory!'],
  chest: ['💰', 'Chest unlocked!'],
  bridge: ['🏁', 'You made it across!'],
  siege: ['🏰', 'The wall holds!'],
  vault: ['🔓', 'The vault is open!'],
  duel: ['🎲', 'Duel won!'],
  rescue: ['🦸', 'Everyone is safe!'],
};

export function WonModal({
  spec,
  wrong,
  grit,
  best,
  loot,
  petFind,
  petName,
  quick,
  caught,
  onCollect,
}: {
  spec: EncounterSpec;
  wrong: number;
  grit: number;
  best: number;
  loot: Loot | null;
  petFind: number;
  petName?: string;
  quick: number;
  caught: number;
  onCollect: () => void;
}) {
  const dark = spec.tone === 'dark';
  return (
    <Modal>
      <Confetti />
      <div style={{ fontSize: '3.5rem' }}>{WIN_TEXT[spec.game][0]}</div>
      <h2>{WIN_TEXT[spec.game][1]}</h2>
      {spec.boss && <p style={{ fontStyle: 'italic' }}>"{spec.boss.defeat}"</p>}
      <p>
        {wrong === 0
          ? 'Flawless! Not a single mistake. ⭐⭐⭐'
          : wrong <= 2
            ? 'Nicely done! ⭐⭐'
            : 'You made it! ⭐'}
      </p>
      {(grit > 0 || best >= 5 || quick > 0 || caught > 0) && (
        <div class="row wrap" style={{ justifyContent: 'center' }}>
          {grit > 0 && (
            <span class="chip" title="Mistakes you went back and got right">
              🪨 Grit: {grit} mistake{grit > 1 ? 's' : ''} put right
            </span>
          )}
          {best >= 5 && <span class="chip">🔥 Best combo ×{best}</span>}
          {quick > 0 && <span class="chip">⚡ {quick} quick draw{quick > 1 ? 's' : ''}</span>}
          {caught > 0 && (
            <span class="chip">
              🔎 {caught} mistake{caught > 1 ? 's' : ''} caught
            </span>
          )}
        </div>
      )}
      {grit > 0 && (
        <p class="muted" style={{ fontSize: '.95rem' }}>
          {dark
            ? 'Struggling and then getting it right is how soldiers are made. That counted for more than an easy win.'
            : 'Getting stuck and then getting it is exactly how brains grow. That was the good stuff.'}
        </p>
      )}
      {loot && (
        <div class="row wrap" style={{ justifyContent: 'center', margin: '10px 0' }}>
          <span class="chip gold" style={{ fontSize: '1.2rem' }}>
            🪙 +{loot.gold}
          </span>
          {Object.entries({ ...loot.items, ...(spec.winReward.items ?? {}) }).map(([id, n]) => (
            <span key={id} class="chip" style={{ fontSize: '1.2rem' }}>
              {itemById[id]?.icon} {itemById[id]?.name} ×{n}
            </span>
          ))}
          {spec.winReward.egg && (
            <span class="chip" style={{ fontSize: '1.2rem' }}>
              🥚 Mystery Egg
            </span>
          )}
        </div>
      )}
      {petFind > 0 && petName && (
        <p class="muted">
          🐾 {petName} sniffed out {petFind} extra gold.
        </p>
      )}
      <button class="btn gold big" onClick={onCollect}>
        Collect loot →
      </button>
    </Modal>
  );
}

export function LostModal({
  spec,
  grit,
  onBack,
}: {
  spec: EncounterSpec;
  grit: number;
  onBack: () => void;
}) {
  return (
    <Modal>
      <div style={{ fontSize: '3.5rem' }}>😵</div>
      <h2>Knocked out!</h2>
      {spec.tone === 'dark' ? (
        <p>
          The line breaks. Wren drags you back behind the wall by your collar. You lost a few coins
          in the mud. The {spec.monster?.name ?? 'enemy'} does not gloat. It just waits.
        </p>
      ) : (
        <p>
          Grimble drags you back to safety by your boot. You dropped a few coins on the way. The{' '}
          {spec.game === 'chest' ? 'chest' : (spec.monster?.name ?? 'monster')} looks very smug.
        </p>
      )}
      <p class="muted">
        {grit > 0
          ? `You still put ${grit} mistake${grit > 1 ? 's' : ''} right — that sticks. Go again.`
          : 'Every mistake makes your brain stronger. Try again — you have got this.'}
      </p>
      <button class="btn gold big" onClick={onBack}>
        Back to safety
      </button>
    </Modal>
  );
}

export function QuitModal({
  spec,
  onStay,
  onRun,
}: {
  spec: EncounterSpec;
  onStay: () => void;
  onRun: () => void;
}) {
  return (
    <Modal onClose={onStay}>
      <h2>Run away?</h2>
      <p>
        You'll keep the XP you earned, but no loot.{' '}
        {spec.tone === 'dark'
          ? 'Nobody will blame you. Nobody will forget, either.'
          : `The ${spec.monster?.name ?? 'monster'} will call you a scaredy-cat.`}
      </p>
      <div class="row" style={{ justifyContent: 'center' }}>
        <button class="btn ghost" onClick={onStay}>
          Keep fighting
        </button>
        <button class="btn danger" onClick={onRun}>
          Run!
        </button>
      </div>
    </Modal>
  );
}

export function BossTalk({
  name,
  line,
  last,
  onNext,
}: {
  name?: string;
  line: string;
  last: boolean;
  onNext: () => void;
}) {
  return (
    <div class="panel" style={{ animation: 'pop-in .3s' }}>
      <div style={{ fontFamily: 'var(--font-display)', color: 'var(--danger)', fontWeight: 600 }}>
        {name}
      </div>
      <p style={{ fontSize: '1.25rem', margin: '6px 0 12px' }}>"{line}"</p>
      <div class="row" style={{ justifyContent: 'flex-end' }}>
        <button class="btn gold big" onClick={onNext}>
          {last ? '⚔️ Fight!' : 'Continue →'}
        </button>
      </div>
    </div>
  );
}
