/**
 * The Pet Den: hatch eggs, feed, play, clean up poop, decorate. Neglected pets get sick and can
 * die (flies, tombstone, the works). Pets grow a bond with you: pats, treats and play raise it,
 * and a stronger bond unlocks tricks. Pets sleep at night. Once every half hour there's a bug
 * hunt: tap the bugs before they escape, and your pet eats them.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Profile } from '../../engine/profile';
import { itemById, items, petById, petSpecies } from '../../content';
import {
  addBond,
  bugsReady,
  BUG_COOLDOWN,
  causeText,
  clamp,
  feedBugs,
  isNight,
  knownTricks,
  newPet,
  petMood,
  petStage,
  tickPet,
  TRICKS,
  type Trick,
} from '../../engine/pet';
import { useOnPet, type UseResult } from '../../engine/items';
import { update } from '../../engine/store';
import { track } from '../../engine/events';
import { Rng } from '../../engine/rng';
import { PetArt, Poop, Flies, Egg, Tombstone } from '../../art/Pet';
import { Bar, Modal } from '../components/Bits';
import { go } from '../router';
import { sfx } from '../../audio/sfx';
import { DAY, dayKey } from '../../engine/dates';

const MOOD_TEXT: Record<string, string> = {
  happy: 'is having the BEST day. (+10% XP while happy!)',
  ok: 'is doing fine. Could be happier.',
  hungry: 'is starving. Its tummy is making whale noises.',
  bored: 'is SO bored it is counting its own toes.',
  grumpy: 'is grumpy. There is poop. Nobody likes poop.',
  sick: 'is sick! Clean up, feed it, or give it medicine — fast!',
  dead: 'is dead.',
};

const BOND_NAMES: [number, string][] = [
  [0, 'Stranger'],
  [10, 'Acquaintance'],
  [25, 'Friend'],
  [50, 'Best friend'],
  [80, 'Soulmate'],
  [100, 'Inseparable'],
];
export const bondName = (b: number) => [...BOND_NAMES].reverse().find(([t]) => b >= t)![1];

/** Where each decoration sits in the den (percent). */
const DECOR_SPOTS: Record<string, { left: string; top?: string; bottom?: string; size: string }> = {
  rug: { left: '50%', bottom: '2%', size: '0' },
  candles: { left: '86%', bottom: '30%', size: '2.2rem' },
  painting: { left: '84%', top: '10%', size: '2.4rem' },
  'fish-tank': { left: '12%', bottom: '30%', size: '2.4rem' },
  banner: { left: '42%', top: '6%', size: '2.2rem' },
  'disco-ball': { left: '60%', top: '2%', size: '2rem' },
  'pet-bed': { left: '20%', bottom: '8%', size: '2.6rem' },
  feeder: { left: '78%', bottom: '8%', size: '2rem' },
  'toy-chest': { left: '92%', bottom: '8%', size: '2.2rem' },
  'poop-bucket': { left: '6%', bottom: '8%', size: '2rem' },
};

function Den({
  den,
  children,
  night,
}: {
  den: string[];
  children: preact.ComponentChildren;
  night: boolean;
}) {
  return (
    <div class={`den ${night ? 'night' : ''}`}>
      <div class="den-window">
        <div class="den-moon" />
      </div>
      {den.includes('rug') ? <div class="den-rug fancy" /> : <div class="den-rug" />}
      {den
        .filter((d) => d !== 'rug' && DECOR_SPOTS[d])
        .map((d) => {
          const s = DECOR_SPOTS[d];
          return (
            <div
              key={d}
              class={`decor decor-${d}`}
              style={{ left: s.left, top: s.top, bottom: s.bottom, fontSize: s.size }}
              title={itemById[d]?.name}
            >
              {itemById[d]?.icon}
            </div>
          );
        })}
      {den.includes('disco-ball') && <div class="disco-lights" />}
      {children}
    </div>
  );
}

/** The bug hunt: 15 seconds, bugs zip around, tap to catch. */
function BugHunt({ onEnd }: { onEnd: (n: number) => void }) {
  const [bugs, setBugs] = useState(() => {
    const rng = new Rng();
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      left: rng.int(8, 88),
      top: rng.int(10, 70),
      dur: 1.6 + rng.next() * 1.8,
      delay: -rng.next() * 3,
      dx: rng.int(-60, 60),
      dy: rng.int(-40, 40),
      icon: rng.pick(['🦟', '🪰', '🐞', '🦗', '🪲']),
    }));
  });
  const [caught, setCaught] = useState(0);
  const [left, setLeft] = useState(15);
  const done = useRef(false);
  useEffect(() => {
    const t = setInterval(() => setLeft((x) => x - 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if ((left <= 0 || bugs.length === 0) && !done.current) {
      done.current = true;
      onEnd(caught);
    }
  }, [left, bugs.length]);
  return (
    <div class="bughunt">
      <div class="bughunt-hud">
        🦟 {caught} caught · ⏱ {Math.max(0, left)}s
      </div>
      {bugs.map((b) => (
        <button
          key={b.id}
          class="bug"
          style={
            {
              left: `${b.left}%`,
              top: `${b.top}%`,
              animationDuration: `${b.dur}s`,
              animationDelay: `${b.delay}s`,
              '--dx': `${b.dx}px`,
              '--dy': `${b.dy}px`,
            } as Record<string, string>
          }
          onPointerDown={(e) => {
            e.preventDefault();
            sfx('pop');
            setCaught((c) => c + 1);
            setBugs((bs) => bs.filter((x) => x.id !== b.id));
          }}
          aria-label="bug"
        >
          {b.icon}
        </button>
      ))}
    </div>
  );
}

export function PetScreen({ p }: { p: Profile }) {
  const [taps, setTaps] = useState(0);
  const [naming, setNaming] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [line, setLine] = useState('');
  const [bounce, setBounce] = useState(false);
  const [anim, setAnim] = useState('');
  const [flying, setFlying] = useState<string | null>(null);
  const [awake, setAwake] = useState(0);
  const [hunt, setHunt] = useState(false);
  const tickles = useRef<number[]>([]);
  const now = Date.now();

  // Keep the simulation fresh while the den is open.
  useEffect(() => {
    const t = setInterval(
      () =>
        update((q) => {
          if (q.pet) tickPet(q.pet, Date.now(), q.den);
        }),
      30000,
    );
    return () => clearInterval(t);
  }, []);

  const pet = p.pet;
  const sleeping = !!pet && !pet.dead && isNight(now) && now > awake && !hunt;
  const say = (s: string) => {
    setLine(s);
    setBounce(true);
    setTimeout(() => setBounce(false), 500);
  };
  const play = (cls: string) => {
    setAnim('');
    requestAnimationFrame(() => setAnim(cls));
    setTimeout(() => setAnim(''), 1600);
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
      return track(q, 'hatch');
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
      return track(q, 'funeral');
    });
  };

  const useItem = (id: string) => {
    let res = { ok: false, why: '' } as UseResult;
    const it = itemById[id];
    update((q) => {
      res = useOnPet(q, id);
      if (!res.ok) return;
      if (it?.kind === 'food') return track(q, 'feed');
    });
    if (res.ok) {
      setAwake(Date.now() + 2 * 60_000);
      setFlying(it?.icon ?? '✨');
      setTimeout(() => setFlying(null), 900);
      sfx(res.sound ?? 'pop');
      say(res.line ?? 'Yum!');
      play(it?.kind === 'food' ? 'eat' : 'happy-jump');
    } else say(res.why);
  };

  const pat = () => {
    if (!pet || pet.dead) return;
    if (sleeping) {
      say(`Shh! ${pet.name} is asleep. (Tap again to wake it up — it won't be pleased.)`);
      setAwake(Date.now() + 60_000);
      return;
    }
    const t = Date.now();
    tickles.current = [...tickles.current.filter((x) => t - x < 1200), t];
    const tickle = tickles.current.length >= 4;
    if (tickle) tickles.current = [];
    sfx(tickle ? 'squawk' : 'pop');
    update((q) => {
      if (!q.pet) return;
      q.pet.joy = clamp(q.pet.joy + (tickle ? 6 : 3));
      // A few bond points a day from pats, so it can't be farmed.
      const day = dayKey();
      const pd = (q.counters[`patday:${day}`] ?? 0) + 1;
      for (const k of Object.keys(q.counters))
        if (k.startsWith('patday:') && k !== `patday:${day}`) delete q.counters[k];
      q.counters[`patday:${day}`] = pd;
      if (pd <= 20) addBond(q.pet, 0.5);
      return track(q, 'pat');
    });
    if (tickle) {
      play('trick-spin');
      say(`${pet.name} giggles uncontrollably. Tickle attack!`);
    } else say(new Rng().pick(petById[pet.species]?.lines ?? ['...']));
  };

  const clean = () => {
    sfx('poop');
    update((q) => {
      if (q.pet) {
        q.pet.poops = Math.max(0, q.pet.poops - 1);
        q.pet.joy = clamp(q.pet.joy + 2);
      }
      return track(q, 'scoop');
    });
    say('*squelch* You scoop up the poop. Heroic.');
  };

  const doTrick = (t: Trick) => {
    if (!pet || pet.dead) return;
    sfx(t.sound);
    play(t.anim);
    setAwake(Date.now() + 2 * 60_000);
    update((q) => {
      if (!q.pet) return;
      q.pet.joy = clamp(q.pet.joy + 4);
      return track(q, 'trick');
    });
    say(`${pet.name} ${t.line}`);
  };

  const endHunt = (n: number) => {
    setHunt(false);
    update((q) => {
      if (!q.pet) return;
      feedBugs(q.pet, n);
      return n > 0 ? track(q, 'bugs', n) : [];
    });
    sfx(n > 0 ? 'eat' : 'wrong');
    say(
      n > 0
        ? `${pet?.name} crunches all ${n} bugs. Delicious. Disgusting. Delicious.`
        : `They all got away. ${pet?.name} looks at you, disappointed.`,
    );
    if (n > 0) play('eat');
  };

  const usable = items.filter(
    (i) => ['food', 'toy', 'care', 'hat'].includes(i.kind) && (p.inv[i.id] ?? 0) > 0,
  );
  const mood = pet ? petMood(pet) : 'ok';
  const ageDays = pet ? Math.floor(((pet.dead?.at ?? now) - pet.born) / DAY) : 0;
  const bond = Math.floor(pet?.bond ?? 0);
  const tricks = pet ? knownTricks(pet) : [];
  const nextTrick = TRICKS.find((t) => t.bond > bond);
  const dancing = p.den.includes('disco-ball') && mood === 'happy' && !sleeping;

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
                <b>{pet.name}</b> the {petById[pet.species]?.name ?? 'creature'}{' '}
                {sleeping
                  ? 'is fast asleep. Pets sleep from 9 at night to 7 in the morning.'
                  : MOOD_TEXT[mood]}
                {!pet.dead && (
                  <span class="muted">
                    {' '}
                    · {petStage(pet)}, {ageDays} day{ageDays === 1 ? '' : 's'} old ·{' '}
                    {bondName(bond)}
                  </span>
                )}
              </p>
            )}
          </div>

          <Den den={p.den} night={sleeping}>
            {!pet && p.eggs > 0 && (
              <button onClick={tapEgg} class="anim-wobble den-egg">
                <Egg cracks={taps} />
              </button>
            )}
            {pet && (
              <>
                <button
                  onClick={pat}
                  class={`den-pet ${pet.dead ? '' : anim || (dancing ? 'dance' : mood === 'happy' ? 'anim-wobble' : 'anim-bob')}`}
                  style={{
                    width: `${petStage(pet) === 'baby' ? 26 : petStage(pet) === 'kid' ? 32 : 38}%`,
                    transform: `translateX(-50%) ${bounce ? 'scale(1.08)' : ''}`,
                  }}
                  aria-label={`Pat ${pet.name}`}
                >
                  <PetArt species={pet.species} mood={mood} hat={pet.hat} sleep={sleeping} />
                  {(pet.dead || mood === 'sick') && <Flies n={pet.dead ? 5 : 2} size={120} />}
                </button>
                {flying && <div class="flying-item">{flying}</div>}
                {!pet.dead &&
                  Array.from({ length: pet.poops }, (_, i) => (
                    <button
                      key={i}
                      onClick={clean}
                      title="Clean it up"
                      class="den-poop"
                      style={{
                        bottom: `${6 + (i % 2) * 8}%`,
                        left: `${[12, 74, 20, 80, 8, 66][i]}%`,
                      }}
                    >
                      <Poop size={52} />
                      <Flies n={2} size={50} />
                    </button>
                  ))}
                {hunt && <BugHunt onEnd={endHunt} />}
                {line && (
                  <div class="panel den-line" key={line}>
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
              <div class="row">
                <span style={{ width: '90px' }}>💞 Bond</span>
                <div style={{ flex: 1 }}>
                  <Bar value={bond} max={100} kind="xp" lg />
                </div>
                <span class="muted" style={{ fontSize: '.85rem', minWidth: '80px' }}>
                  {bondName(bond)}
                </span>
              </div>
              {pet.poops > 0 && (
                <div class="muted">
                  💩 Tap the poop to clean it up. Three or more poops make pets sick!
                </div>
              )}
              <div class="muted" style={{ fontSize: '.85rem' }}>
                Bond grows with pats (a few a day), treats like 🦴 and 🧸, tricks and bug hunts. A
                pet with a bond of 30+ follows you into fights — and sometimes sniffs out extra
                gold.
              </div>

              <div class="section-title" style={{ margin: '6px 0 0' }}>
                🎪 Tricks
              </div>
              <div class="row wrap">
                {TRICKS.map((t) => {
                  const known = tricks.includes(t);
                  return (
                    <button
                      key={t.id}
                      class={`btn small ${known ? '' : 'ghost'}`}
                      disabled={!known || sleeping}
                      onClick={() => doTrick(t)}
                      title={known ? t.name : `Needs bond ${t.bond}`}
                    >
                      {known ? t.icon : '🔒'} {t.name}
                      {!known && <span class="muted"> · {t.bond}</span>}
                    </button>
                  );
                })}
              </div>
              {nextTrick && (
                <div class="muted" style={{ fontSize: '.85rem' }}>
                  Next trick at bond {nextTrick.bond}: {nextTrick.name}.
                </div>
              )}

              <div class="row wrap" style={{ marginTop: '6px' }}>
                <button
                  class="btn small gold"
                  disabled={!bugsReady(pet, now) || sleeping || hunt}
                  onClick={() => {
                    sfx('whoosh');
                    setHunt(true);
                    setLine('');
                    document
                      .querySelector('.den')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                >
                  🦟 Bug hunt!
                </button>
                {!bugsReady(pet, now) && (
                  <span class="muted" style={{ fontSize: '.85rem' }}>
                    More bugs in {Math.ceil((BUG_COOLDOWN - (now - (pet.bugsAt ?? 0))) / 60000)}{' '}
                    min.
                  </span>
                )}
              </div>

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

          {p.den.length === 0 && pet && !pet.dead && (
            <div class="panel">
              <b>🏠 Your den is bare.</b>{' '}
              <span class="muted">
                Decorations from the shop make it cosier — and some make pet care easier.
              </span>{' '}
              <button class="btn small ghost" onClick={() => go('/shop')}>
                Visit the shop
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
