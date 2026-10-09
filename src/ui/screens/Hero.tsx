/** The hero sheet: level, stats, spellbook (skill mastery), bag and settings. */
import { useState } from 'preact/hooks';
import type { Profile } from '../../engine/profile';
import { levelFromXp, maxHearts, titleFor, xpForLevel } from '../../engine/profile';
import { Avatar } from '../../art/Avatar';
import { classes, itemById, regions, skills } from '../../content';
import { masteryStars } from '../../engine/mastery';
import { Bar, Modal, Stars } from '../components/Bits';
import { update, logout } from '../../engine/store';
import { equip } from '../../engine/items';
import { exportProfile } from '../../engine/save';
import { go } from '../router';
import { sfx } from '../../audio/sfx';

export function HeroScreen({ p }: { p: Profile }) {
  const [confirmSwitch, setConfirmSwitch] = useState(false);
  const level = levelFromXp(p.hero.xp);
  const lo = xpForLevel(level);
  const hi = xpForLevel(level + 1);
  const total = p.stats.right + p.stats.wrong;
  const accuracy = total ? Math.round((p.stats.right / total) * 100) : 0;
  const bag = Object.entries(p.inv).filter(([, n]) => n > 0);

  const download = () => {
    const blob = new Blob([exportProfile(p)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `smashdash-${p.hero.name.replace(/\W+/g, '-').toLowerCase()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <div
      class="screen"
      style={{ background: 'radial-gradient(ellipse at 30% 0%, #3b2a8f, #120a2e 70%)' }}
    >
      <div class="screen-scroll">
        <div class="content-col">
          <div class="panel row wrap" style={{ gap: '20px', alignItems: 'center' }}>
            <div style={{ width: '170px', height: '210px', margin: '0 auto' }}>
              <Avatar
                look={p.hero.look}
                cls={p.hero.cls}
                hat={p.hero.hat}
                cape={p.hero.cape}
                class="anim-bob"
              />
            </div>
            <div style={{ flex: 1, minWidth: '240px' }}>
              <h1 style={{ marginBottom: '2px' }}>{p.hero.name}</h1>
              <div
                style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)', fontWeight: 600 }}
              >
                Level {level} {titleFor(level)} · {classes[p.hero.cls]?.icon}{' '}
                {classes[p.hero.cls]?.name}
              </div>
              <div class="muted" style={{ fontSize: '.9rem', margin: '4px 0 10px' }}>
                Perk: {classes[p.hero.cls]?.perk}
              </div>
              <Bar value={p.hero.xp - lo} max={hi - lo} kind="xp" lg />
              <div class="muted" style={{ fontSize: '.85rem', marginTop: '4px' }}>
                {p.hero.xp - lo} / {hi - lo} XP to level {level + 1}
              </div>
              <div class="row wrap" style={{ marginTop: '12px' }}>
                <span class="chip">❤️ {maxHearts(p)} hearts</span>
                <span class="chip">🎯 {accuracy}% accuracy</span>
                <span class="chip">⚔️ {p.stats.wins} wins</span>
                <span class="chip">💀 {p.stats.bosses} bosses</span>
                <span class="chip fire">🔥 best streak {p.daily.best}</span>
              </div>
            </div>
          </div>

          <div class="section-title">📖 Spellbook</div>
          <div class="stack">
            {regions.map((r) => {
              const rs = skills.filter((s) => s.region === r.id);
              return (
                <div key={r.id} class="panel">
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 600,
                      color: r.palette.accent,
                      marginBottom: '6px',
                    }}
                  >
                    {r.name}
                  </div>
                  <div
                    class="grid-cards"
                    style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}
                  >
                    {rs.map((s) => {
                      const st = p.skills[s.id];
                      return st ? (
                        <button
                          key={s.id}
                          class="pick"
                          style={{ color: 'inherit', textAlign: 'left' }}
                          onClick={() => go(`/practice/${s.id}`)}
                        >
                          <div class="row">
                            <span style={{ fontSize: '1.8rem' }}>{s.icon}</span>
                            <div>
                              <b>{s.name}</b>
                              <div>
                                <Stars n={masteryStars(st)} of={5} />
                              </div>
                            </div>
                          </div>
                          <div class="muted" style={{ fontSize: '.85rem', marginTop: '4px' }}>
                            {s.summary}
                          </div>
                        </button>
                      ) : (
                        <div key={s.id} class="pick" style={{ opacity: 0.45, textAlign: 'left' }}>
                          <div class="row">
                            <span style={{ fontSize: '1.8rem' }}>❔</span>
                            <b>Unknown spell</b>
                          </div>
                          <div class="muted" style={{ fontSize: '.85rem' }}>
                            Learn it in {r.name}.
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div class="section-title">🎒 Bag</div>
          <div class="panel">
            {bag.length === 0 && <p class="muted">Empty. Even the moths left.</p>}
            <div class="grid-cards">
              {bag.map(([id, n]) => {
                const it = itemById[id];
                if (!it) return null;
                const wearable = it.kind === 'hat' || it.kind === 'cape';
                const worn = p.hero.hat === id || p.hero.cape === id;
                return (
                  <div key={id} class={`pick ${worn ? 'on' : ''}`}>
                    <div style={{ fontSize: '2rem' }}>{it.icon}</div>
                    <b>{it.name}</b> {n > 1 && <span class="muted">×{n}</span>}
                    <div class="muted" style={{ fontSize: '.8rem' }}>
                      {it.desc}
                    </div>
                    {wearable && (
                      <button
                        class={`btn small ${worn ? 'ghost' : 'gold'}`}
                        style={{ marginTop: '6px' }}
                        onClick={() => {
                          sfx('pop');
                          update((q) => equip(q, id));
                        }}
                      >
                        {worn ? 'Take off' : 'Wear'}
                      </button>
                    )}
                    {(it.kind === 'food' || it.kind === 'toy' || it.kind === 'care') && (
                      <div class="muted" style={{ fontSize: '.8rem', marginTop: '4px' }}>
                        Use it in the Pet Den
                      </div>
                    )}
                    {it.kind === 'potion' && (
                      <div class="muted" style={{ fontSize: '.8rem', marginTop: '4px' }}>
                        Use it during fights
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div class="section-title">⚙️ Settings</div>
          <div class="panel stack">
            <div class="row wrap">
              <span>Daily goal:</span>
              {[50, 100, 200, 300].map((g) => (
                <button
                  key={g}
                  class={`btn small ${p.daily.goal === g ? 'gold' : 'ghost'}`}
                  onClick={() => update((q) => void (q.daily.goal = g))}
                >
                  {g} XP
                </button>
              ))}
            </div>
            <div class="row wrap">
              <button class="btn small ghost" onClick={download}>
                💾 Export save
              </button>
              <button class="btn small ghost" onClick={() => setConfirmSwitch(true)}>
                👥 Switch hero
              </button>
            </div>
          </div>
          <div style={{ height: '20px' }} />
        </div>
      </div>
      {confirmSwitch && (
        <Modal onClose={() => setConfirmSwitch(false)}>
          <h2>Switch hero?</h2>
          <p>{p.hero.name} will wait for you right here. Progress is saved.</p>
          <div class="row" style={{ justifyContent: 'center' }}>
            <button class="btn ghost" onClick={() => setConfirmSwitch(false)}>
              Stay
            </button>
            <button
              class="btn gold"
              onClick={() => {
                logout();
                go('/', true);
              }}
            >
              Switch
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
