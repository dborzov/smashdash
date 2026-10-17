/**
 * Pet Den extras: expeditions (send the pet to a region you've cleared; it comes back with that
 * region's souvenirs — better hauls from regions cleared at higher ranks) and the bond perks.
 * Logic lives in src/engine/expeditions.ts and pet.ts.
 */
import { useState } from 'preact/hooks';
import type { Profile } from '../../engine/profile';
import { itemById, regionById, regions } from '../../content';
import { backpackFx, cantGo, openBackpack, sendPet, souvenirPool, TRIPS, type Haul } from '../../engine/expeditions';
import { isAway, PERK_BOND } from '../../engine/pet';
import { rankInfo, rankOf } from '../../engine/ranks';
import { update } from '../../engine/store';
import { Modal } from '../components/Bits';
import { sfx } from '../../audio/sfx';

function timeLeft(ms: number): string {
  const m = Math.max(1, Math.ceil(ms / 60000));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim();
}

export function Expeditions({ p, now, say }: { p: Profile; now: number; say: (s: string) => void }) {
  const pet = p.pet!;
  const cleared = regions.filter((r) => rankOf(p, r) >= 1);
  const [pick, setPick] = useState(cleared[cleared.length - 1]?.id ?? '');
  const [haul, setHaul] = useState<Haul | null>(null);
  const region = regionById[pick];

  const open = () => {
    let h: Haul | null = null;
    update((q) => {
      h = openBackpack(q, Date.now());
      return h ? backpackFx(q, h) : [];
    });
    if (h) {
      sfx('unlock');
      setHaul(h);
    }
  };

  const send = (hours: number) => {
    let why: string | null = null;
    update((q) => {
      why = sendPet(q, pick, hours, Date.now());
    });
    if (why) say(why);
    else {
      sfx('whoosh');
      say(`${pet.name} grabs a tiny backpack and sets off for ${region?.name}. Back in ${hours} h!`);
    }
  };

  let body;
  if (pet.away && isAway(pet, now)) {
    const r = regionById[pet.away.region];
    body = (
      <p style={{ margin: 0 }}>
        🧭 <b>{pet.name}</b> is exploring <b>{r?.name}</b>. Back in{' '}
        <b>{timeLeft(pet.away.until - now)}</b>. (Pets don't get hungry or bored while they're out.)
      </p>
    );
  } else if (pet.away) {
    body = (
      <button class="btn gold big" onClick={open}>
        🎒 {pet.name} is back from {regionById[pet.away.region]?.name}! Open the backpack
      </button>
    );
  } else if (cleared.length === 0) {
    body = <p class="muted">Clear a region's story and {pet.name} can go exploring there.</p>;
  } else {
    const why = cantGo(p, region, now);
    const { own } = souvenirPool(pick);
    const rank = region ? rankOf(p, region) : 0;
    body = (
      <>
        <div class="row wrap">
          {cleared.map((r) => (
            <button key={r.id} class={`btn small ${r.id === pick ? '' : 'ghost'}`} onClick={() => setPick(r.id)}>
              {rankInfo(rankOf(p, r)).icon} {r.name}
            </button>
          ))}
        </div>
        {region && (
          <p class="muted" style={{ margin: '6px 0', fontSize: '.9rem' }}>
            {own.length ? (
              <>
                Souvenirs only found here: {own.map((i) => `${i.icon} ${i.name}`).join(', ')}.{' '}
              </>
            ) : (
              'Ordinary loot here. '
            )}
            Cleared at <b>{rankInfo(rank).name}</b>
            {rank < 3 ? ' — clear it at a higher rank and pets find more.' : ' — pets bring back extra loot!'}
          </p>
        )}
        <div class="row wrap">
          {TRIPS.map((t) => (
            <button key={t.hours} class="btn small mint" disabled={!!why} onClick={() => send(t.hours)}>
              {t.icon} {t.name} · {t.hours} h
            </button>
          ))}
        </div>
        {why && (
          <div class="muted" style={{ fontSize: '.85rem', marginTop: '4px' }}>
            {why}
          </div>
        )}
      </>
    );
  }

  return (
    <div class="panel stack">
      <div class="section-title" style={{ margin: 0 }}>
        🗺️ Expeditions
      </div>
      {body}
      {haul && (
        <Modal onClose={() => setHaul(null)}>
          <h2 style={{ marginTop: 0 }}>🎒 The backpack!</h2>
          <p class="muted">
            {pet.name} went to {regionById[haul.region]?.name} and came back with:
          </p>
          <div class="row wrap center" style={{ justifyContent: 'center', fontSize: '1.1rem' }}>
            <span class="pill">🪙 {haul.gold} gold</span>
            {Object.entries(haul.items).map(([id, n]) => (
              <span key={id} class="pill" title={itemById[id]?.desc}>
                {itemById[id]?.icon} {itemById[id]?.name}
                {n > 1 ? ` ×${n}` : ''}
              </span>
            ))}
          </div>
          <p class="muted" style={{ fontSize: '.85rem' }}>
            It also smells faintly of {regionById[haul.region]?.name}. Pets love that.
          </p>
          <button class="btn mint" onClick={() => setHaul(null)}>
            Good pet!
          </button>
        </Modal>
      )}
    </div>
  );
}

const PERKS: { bond: number; icon: string; name: string; text: string }[] = [
  { bond: PERK_BOND.companion, icon: '🐾', name: 'Sidekick', text: 'follows you into fights and digs up gold' },
  { bond: PERK_BOND.sniff, icon: '👃', name: 'Hint sniffer', text: 'sniffs out one free hint every fight' },
  { bond: PERK_BOND.guard, icon: '🛡️', name: 'Bodyguard', text: 'jumps in front of one hit every fight' },
  { bond: PERK_BOND.treasure, icon: '💰', name: 'Treasure nose', text: 'finds gold in fights far more often' },
];

/** What a stronger bond does in fights. */
export function Perks({ bond, name }: { bond: number; name: string }) {
  return (
    <div class="perks">
      {PERKS.map((k) => (
        <div key={k.name} class={`perk ${bond >= k.bond ? 'on' : ''}`}>
          <span class="perk-icon">{bond >= k.bond ? k.icon : '🔒'}</span>
          <span>
            <b>{k.name}</b> <span class="muted">· bond {k.bond}</span>
            <br />
            <span style={{ fontSize: '.85rem' }}>
              {name} {k.text}.
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
