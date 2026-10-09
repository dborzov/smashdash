/** Character creation: name, class, look and daily goal. Then the prologue. */
import { useState } from 'preact/hooks';
import { Scene } from '../../art/scenes';
import { Avatar, HAIRS, HAIR_STYLES, OUTFITS, SKINS } from '../../art/Avatar';
import { classes } from '../../content';
import type { Look } from '../../engine/profile';
import { newProfile } from '../../engine/profile';
import { activate } from '../../engine/store';
import { saveProfile } from '../../engine/save';
import { go } from '../router';
import { sfx } from '../../audio/sfx';

const GOALS = [
  { xp: 50, name: 'Chill', desc: 'About 5 minutes a day' },
  { xp: 100, name: 'Steady', desc: 'About 10 minutes a day' },
  { xp: 200, name: 'Hardcore', desc: 'About 20 minutes a day' },
  { xp: 300, name: 'Legendary', desc: 'For maniacs only' },
];

const NAMES = [
  'Zara the Bold',
  'Sir Pickles',
  'Moonbeam',
  'Captain Sock',
  'Pip',
  'Nova',
  'Bram',
  'Wiggles',
  'Juno',
  'Rex the Brave',
];

export function CreateHero() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [cls, setCls] = useState('wizard');
  const [look, setLook] = useState<Look>({ skin: 1, hair: 2, hairStyle: 0, outfit: 0 });
  const [goal, setGoal] = useState(100);

  const set = (k: keyof Look, v: number) => {
    sfx('click');
    setLook({ ...look, [k]: v });
  };

  const finish = () => {
    const p = newProfile({ name: name.trim() || 'Nameless Hero', cls, look, goal });
    saveProfile(p);
    activate(p);
    sfx('level');
    go('/story/prologue', true);
  };

  const steps = [
    // 0: name
    <div class="stack" key="name">
      <h2>What's your name, hero?</h2>
      <input
        class="text-input"
        maxLength={20}
        value={name}
        placeholder="Type a name…"
        onInput={(e) => setName((e.target as HTMLInputElement).value)}
        autoFocus
      />
      <button
        class="btn small ghost"
        onClick={() => setName(NAMES[Math.floor(Math.random() * NAMES.length)])}
      >
        🎲 Random name
      </button>
    </div>,
    // 1: class
    <div class="stack" key="class">
      <h2>Choose your class</h2>
      <div class="grid-cards">
        {Object.entries(classes).map(([id, c]) => (
          <button
            key={id}
            class={`pick ${cls === id ? 'on' : ''}`}
            onClick={() => {
              sfx('click');
              setCls(id);
            }}
            style={{ color: 'inherit' }}
          >
            <div style={{ height: '110px' }}>
              <Avatar look={look} cls={id} class="anim-bob" />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.2rem' }}>
              {c.icon} {c.name}
            </div>
            <div style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '.9rem' }}>{c.perk}</div>
            <div class="muted" style={{ fontSize: '.85rem' }}>
              {c.desc}
            </div>
          </button>
        ))}
      </div>
    </div>,
    // 2: look
    <div class="row wrap" key="look" style={{ alignItems: 'flex-start', gap: '20px' }}>
      <div style={{ width: '200px', height: '240px', margin: '0 auto' }}>
        <Avatar look={look} cls={cls} class="anim-bob" />
      </div>
      <div class="stack" style={{ flex: 1, minWidth: '260px' }}>
        <h2>Looking good!</h2>
        <div>
          <div class="muted">Skin</div>
          <div class="swatches">
            {SKINS.map((c, i) => (
              <button
                key={i}
                class={`swatch ${look.skin === i ? 'on' : ''}`}
                style={{ background: c }}
                onClick={() => set('skin', i)}
              />
            ))}
          </div>
        </div>
        <div>
          <div class="muted">Hair colour</div>
          <div class="swatches">
            {HAIRS.map((c, i) => (
              <button
                key={i}
                class={`swatch ${look.hair === i ? 'on' : ''}`}
                style={{ background: c }}
                onClick={() => set('hair', i)}
              />
            ))}
          </div>
        </div>
        <div>
          <div class="muted">Hair style</div>
          <div class="row wrap">
            {HAIR_STYLES.map((s, i) => (
              <button
                key={i}
                class={`btn small ${look.hairStyle === i ? 'gold' : 'ghost'}`}
                onClick={() => set('hairStyle', i)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div class="muted">Outfit</div>
          <div class="swatches">
            {OUTFITS.map((c, i) => (
              <button
                key={i}
                class={`swatch ${look.outfit === i ? 'on' : ''}`}
                style={{ background: c }}
                onClick={() => set('outfit', i)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>,
    // 3: goal
    <div class="stack" key="goal">
      <h2>Pick your daily goal</h2>
      <p class="muted">Hit it every day to build a streak 🔥. You can change it later.</p>
      <div class="grid-cards">
        {GOALS.map((g) => (
          <button
            key={g.xp}
            class={`pick ${goal === g.xp ? 'on' : ''}`}
            style={{ color: 'inherit' }}
            onClick={() => {
              sfx('click');
              setGoal(g.xp);
            }}
          >
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 600 }}>
              {g.name}
            </div>
            <div style={{ color: 'var(--gold)', fontWeight: 700 }}>{g.xp} XP / day</div>
            <div class="muted" style={{ fontSize: '.9rem' }}>
              {g.desc}
            </div>
          </button>
        ))}
      </div>
    </div>,
  ];

  return (
    <div class="screen">
      <Scene id="tower" dim={0.25} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflowY: 'auto',
          padding: '24px 16px 40px',
          zIndex: 2,
        }}
      >
        <div class="panel content-col" style={{ maxWidth: '760px' }}>
          <div class="row" style={{ marginBottom: '12px' }}>
            <button
              class="icon-btn"
              onClick={() => (step === 0 ? go('/', true) : setStep(step - 1))}
            >
              ←
            </button>
            <div class="spacer" />
            <span class="muted">
              Step {step + 1} of {steps.length}
            </span>
          </div>
          {steps[step]}
          <div class="row" style={{ marginTop: '20px', justifyContent: 'flex-end' }}>
            {step < steps.length - 1 ? (
              <button
                class="btn gold big"
                disabled={step === 0 && !name.trim()}
                onClick={() => {
                  sfx('page');
                  setStep(step + 1);
                }}
              >
                Next →
              </button>
            ) : (
              <button class="btn mint big" onClick={finish}>
                ⚔️ Begin the adventure!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
