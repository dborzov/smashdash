/**
 * The Pet Den: hatch eggs, feed, play, clean up poop. Neglected pets get sick and can die
 * (flies, tombstone, the works). Then you can hatch a new one.
 */
import { useEffect, useState } from 'preact/hooks';
import type { Profile } from '../../engine/profile';
import { items, petById, petSpecies } from '../../content';
import { petMood, petStage, newPet, causeText, clamp, tickPet } from '../../engine/pet';
import { useOnPet, type UseResult } from '../../engine/items';
import { update } from '../../engine/store';
import { Rng } from '../../engine/rng';
import { PetArt, Poop, Flies, Egg, Tombstone } from '../../art/Pet';
import { Bar, Modal } from '../components/Bits';
import { go } from '../router';
import { sfx } from '../../audio/sfx';
import { DAY } from '../../engine/dates';

const MOOD_TEXT: Record<string, string> = {
  happy: 'is having the BEST day. (+10% XP while happy!)',
  ok: 'is doing fine. Could be happier.',
  hungry: 'is starving. Its tummy is making whale noises.',
  bored: 'is SO bored it is counting its own toes.',
  grumpy: 'is grumpy. There is poop. Nobody likes poop.',
  sick: 'is sick! Clean up, feed it, or give it medicine — fast!',
  dead: 'is dead.',
};

function Den({ children }: { children: preact.ComponentChildren }) {
  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '24px',
        overflow: 'hidden',
        height: 'clamp(260px, 42vh, 380px)',
        background: 'linear-gradient(#5a3a7a 0%, #7a4f9a 58%, #8a5a3a 58%, #6b4428 100%)',
        boxShadow: 'inset 0 0 60px rgba(0,0,0,.5)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '8%',
          top: '10%',
          width: '22%',
          height: '30%',
          borderRadius: '12px 12px 4px 4px',
          background: 'linear-gradient(#1b2a6e, #3a5ad6)',
          border: '6px solid #c98a3c',
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: '18%',
            top: '18%',
            width: '22%',
            aspectRatio: '1',
            borderRadius: '50%',
            background: '#fff3c4',
            boxShadow: '0 0 16px #fff3c4',
          }}
        />
      </div>
      <div style={{ position: 'absolute', right: '8%', top: '14%', fontSize: '2.4rem' }}>🖼️</div>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: '6%',
          width: '60%',
          height: '16%',
          transform: 'translateX(-50%)',
          borderRadius: '50%',
          background: 'radial-gradient(#e0475b, #a02a3a)',
          opacity: 0.85,
        }}
      />
      {children}
    </div>
  );
}

export function PetScreen({ p }: { p: Profile }) {
  const [taps, setTaps] = useState(0);
  const [naming, setNaming] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [line, setLine] = useState('');
  const [bounce, setBounce] = useState(false);

  // Keep the simulation fresh while the den is open.
  useEffect(() => {
    const t = setInterval(
      () =>
        update((q) => {
          if (q.pet) tickPet(q.pet);
        }),
      30000,
    );
    return () => clearInterval(t);
  }, []);

  const pet = p.pet;
  const say = (s: string) => {
    setLine(s);
    setBounce(true);
    setTimeout(() => setBounce(false), 500);
  };

  const tapEgg = () => {
    sfx('crack');
    const t = taps + 1;
    setTaps(t);
    if (t >= 5) {
      sfx('hatch');
      setNaming(new Rng().pick(petSpecies).id);
      setTaps(0);
    }
  };

  const hatch = () => {
    if (!naming) return;
    const species = naming;
    update((q) => {
      q.eggs = Math.max(0, q.eggs - 1);
      q.pet = newPet(species, name.trim() || petById[species].name);
    });
    setNaming(null);
    setName('');
    say(`${petById[species].lines[0]}`);
  };

  const bury = () => {
    if (!pet?.dead) return;
    sfx('death');
    update((q) => {
      const sp = petById[pet.species];
      q.graves.unshift({
        name: pet.name,
        species: pet.species,
        born: pet.born,
        died: pet.dead!.at,
        cause: pet.dead!.cause,
        epitaph: new Rng().pick(sp?.epitaphs ?? ['Gone but not forgotten.']),
      });
      q.pet = null;
    });
  };

  const useItem = (id: string) => {
    let res = { ok: false, why: '' } as UseResult;
    update((q) => {
      res = useOnPet(q, id);
    });
    if (res.ok) {
      sfx(res.sound ?? 'pop');
      say(res.line ?? 'Yum!');
    } else say(res.why);
  };

  const pat = () => {
    if (!pet || pet.dead) return;
    sfx('pop');
    update((q) => {
      if (q.pet) q.pet.joy = clamp(q.pet.joy + 3);
    });
    say(new Rng().pick(petById[pet.species]?.lines ?? ['...']));
  };

  const clean = () => {
    sfx('poop');
    update((q) => {
      if (q.pet) {
        q.pet.poops = Math.max(0, q.pet.poops - 1);
        q.pet.joy = clamp(q.pet.joy + 2);
      }
    });
    say('*squelch* You scoop up the poop. Heroic.');
  };

  const usable = items.filter(
    (i) => ['food', 'toy', 'care', 'hat'].includes(i.kind) && (p.inv[i.id] ?? 0) > 0,
  );
  const mood = pet ? petMood(pet) : 'ok';
  const ageDays = pet ? Math.floor(((pet.dead?.at ?? Date.now()) - pet.born) / DAY) : 0;

  return (
    <div
      class="screen"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #4a2a6e, #140a2e 70%)' }}
    >
      <div class="screen-scroll">
        <div class="content-col stack">
          <div class="panel">
            <h2 style={{ margin: 0 }}>🐾 Pet Den</h2>
            {!pet && p.eggs === 0 && (
              <p>
                No pet yet. Pets hatch from eggs — you'll find one in Bramblebottom, or buy a
                Mystery Egg in the shop.
              </p>
            )}
            {!pet && p.eggs > 0 && (
              <p>You have {p.eggs === 1 ? 'an egg' : `${p.eggs} eggs`}! Tap it to help it hatch.</p>
            )}
            {pet && (
              <p style={{ margin: '4px 0 0' }}>
                <b>{pet.name}</b> the {petById[pet.species]?.name ?? 'creature'} {MOOD_TEXT[mood]}
                {!pet.dead && (
                  <span class="muted">
                    {' '}
                    · {petStage(pet)}, {ageDays} day{ageDays === 1 ? '' : 's'} old
                  </span>
                )}
              </p>
            )}
          </div>

          <Den>
            {!pet && p.eggs > 0 && (
              <button
                onClick={tapEgg}
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: '10%',
                  width: '26%',
                  maxWidth: '150px',
                  transform: 'translateX(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
                class="anim-wobble"
              >
                <Egg cracks={taps} />
              </button>
            )}
            {pet && (
              <>
                <button
                  onClick={pat}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    bottom: '8%',
                    width: `${petStage(pet) === 'baby' ? 26 : petStage(pet) === 'kid' ? 32 : 38}%`,
                    maxWidth: '240px',
                    transform: `translateX(-50%) ${bounce ? 'scale(1.08)' : ''}`,
                    transition: 'transform .2s',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                  class={pet.dead ? '' : mood === 'happy' ? 'anim-wobble' : 'anim-bob'}
                  aria-label={`Pat ${pet.name}`}
                >
                  <PetArt species={pet.species} mood={mood} hat={pet.hat} />
                  {(pet.dead || mood === 'sick') && <Flies n={pet.dead ? 5 : 2} size={120} />}
                </button>
                {!pet.dead &&
                  Array.from({ length: pet.poops }, (_, i) => (
                    <button
                      key={i}
                      onClick={clean}
                      title="Clean it up"
                      style={{
                        position: 'absolute',
                        bottom: `${6 + (i % 2) * 8}%`,
                        left: `${[12, 74, 20, 80, 8, 66][i]}%`,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      <Poop size={52} />
                      <Flies n={2} size={50} />
                    </button>
                  ))}
                {line && (
                  <div
                    class="panel"
                    style={{
                      position: 'absolute',
                      top: '8%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      maxWidth: '80%',
                      padding: '8px 14px',
                      fontWeight: 700,
                      animation: 'pop-in .2s',
                    }}
                    key={line}
                  >
                    {line}
                  </div>
                )}
              </>
            )}
          </Den>

          {pet && !pet.dead && (
            <div class="panel stack">
              <div class="row">
                <span style={{ width: '90px' }}>🍖 Food</span>
                <div style={{ flex: 1 }}>
                  <Bar value={pet.hunger} max={100} kind="good" lg />
                </div>
              </div>
              <div class="row">
                <span style={{ width: '90px' }}>🎉 Fun</span>
                <div style={{ flex: 1 }}>
                  <Bar value={pet.joy} max={100} lg />
                </div>
              </div>
              <div class="row">
                <span style={{ width: '90px' }}>❤️ Health</span>
                <div style={{ flex: 1 }}>
                  <Bar value={pet.health} max={100} kind="hp" lg />
                </div>
              </div>
              {pet.poops > 0 && (
                <div class="muted">
                  💩 Tap the poop to clean it up. Three or more poops make pets sick!
                </div>
              )}
              <div class="section-title" style={{ margin: '6px 0 0' }}>
                Use an item
              </div>
              {usable.length === 0 && (
                <p class="muted">
                  Nothing to give. Win fights for loot or visit the{' '}
                  <a href="#/shop" style={{ color: 'var(--gold)' }}>
                    shop
                  </a>
                  .
                </p>
              )}
              <div class="row wrap">
                {usable.map((i) => (
                  <button
                    key={i.id}
                    class="btn small ghost"
                    onClick={() => useItem(i.id)}
                    title={i.desc}
                  >
                    {i.icon} {i.name} ×{p.inv[i.id]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {pet?.dead && (
            <div class="panel center">
              <h3>💀 {pet.name} has died.</h3>
              <p>Cause of death: {causeText(pet.dead.cause)}</p>
              <p class="muted">
                The flies are having a party. Grimble has prepared a short, tasteful speech:
                "Ribbit."
              </p>
              <button class="btn" onClick={bury}>
                ⚰️ Hold a funeral
              </button>
            </div>
          )}

          {p.graves.length > 0 && (
            <div class="panel">
              <div class="section-title" style={{ marginTop: 0 }}>
                🪦 Pet Cemetery
              </div>
              <div class="grid-cards">
                {p.graves.map((g, i) => (
                  <div key={i} class="center">
                    <div style={{ width: '90px', height: '105px', margin: '0 auto' }}>
                      <Tombstone name={g.name} />
                    </div>
                    <div style={{ fontSize: '.85rem' }}>{g.epitaph}</div>
                    <div class="muted" style={{ fontSize: '.75rem' }}>
                      {causeText(g.cause)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!pet && p.eggs === 0 && (
            <button class="btn gold" onClick={() => go('/shop')}>
              🥚 Buy a Mystery Egg
            </button>
          )}
        </div>
      </div>
      {naming && (
        <Modal>
          <div style={{ width: '180px', height: '180px', margin: '0 auto' }} class="anim-wobble">
            <PetArt species={naming} mood="happy" />
          </div>
          <h2>It's a {petById[naming].name}!</h2>
          <p class="muted">{petById[naming].desc}</p>
          <input
            class="text-input"
            maxLength={16}
            placeholder="Name your pet…"
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
          />
          <p class="muted" style={{ fontSize: '.85rem' }}>
            Feed it, play with it and clean up after it. Neglected pets get sick… and worse.
          </p>
          <button class="btn mint big" onClick={hatch}>
            Welcome to the family!
          </button>
        </Modal>
      )}
    </div>
  );
}
