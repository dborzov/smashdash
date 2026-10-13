/** The hero sheet: level, stats, spellbook (skill mastery), bag and settings. */
import { useState } from 'preact/hooks';
import type { Profile } from '../../engine/profile';
import { levelFromXp, maxHearts, titleFor, xpForLevel } from '../../engine/profile';
import { Avatar } from '../../art/Avatar';
import { achievementById, achievements, classes, itemById } from '../../content';
import { achProgress, earnedTitles } from '../../engine/achievements';
import { summary } from '../../engine/skillTree';
import { xpBoostOn } from '../../engine/rewards';
import { Bar, Modal } from '../components/Bits';
import { update, logout } from '../../engine/store';
import { equip, useBoost, type UseResult } from '../../engine/items';
import { exportProfile } from '../../engine/save';
import { go } from '../router';
import { sfx } from '../../audio/sfx';

export function HeroScreen({ p }: { p: Profile }) {
  const [confirmSwitch, setConfirmSwitch] = useState(false);
  const [pickTitle, setPickTitle] = useState(false);
  const [note, setNote] = useState('');
  const sum = summary(p);
  const titles = earnedTitles(p);
  const earned = achievements.filter((a) => p.ach[a.id]).length;
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
              <div class="row" style={{ gap: '6px', margin: '2px 0' }}>
                <span class="hero-title">
                  {p.title && achievementById[p.title]?.title
                    ? `"${p.hero.name} ${achievementById[p.title].title}"`
                    : 'No title worn'}
                </span>
                {titles.length > 0 && (
                  <button class="btn small ghost" onClick={() => setPickTitle(true)}>
                    Titles ({titles.length})
                  </button>
                )}
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
                {xpBoostOn(p) && (
                  <span class="chip gold">
                    🧉 Double XP until{' '}
                    {new Date(p.boosts.xp2Until!).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
                {(p.boosts.lucky ?? 0) > 0 && (
                  <span class="chip gold">🪙 Lucky ×{p.boosts.lucky}</span>
                )}
              </div>
            </div>
          </div>

          <div class="section-title">🌳 Skills</div>
          <div class="panel row wrap" style={{ justifyContent: 'space-between' }}>
            <div>
              <b>
                {sum.skillsLearned}/{sum.skillsTotal}
              </b>{' '}
              skills learned · <b>{sum.masters}</b> at Master tier ·{' '}
              <b>
                {sum.atomsSolid + sum.atomsMastered}/{sum.atomsTotal}
              </b>{' '}
              tiny skills solid
            </div>
            <button class="btn small gold" onClick={() => go('/skills')}>
              Open the Skill Tree
            </button>
          </div>

          <div class="section-title">
            🏆 Trophies{' '}
            <span class="muted" style={{ fontSize: '.9rem' }}>
              {earned}/{achievements.length}
            </span>
          </div>
          <div class="panel">
            <div class="trophies">
              {achievements.map((a) => {
                const got = !!p.ach[a.id];
                const hidden = a.secret && !got;
                const prog = achProgress(p, a.id);
                return (
                  <div
                    key={a.id}
                    class={`trophy ${got ? 'got' : ''}`}
                    title={hidden ? 'A secret trophy' : a.desc}
                  >
                    <div class="trophy-icon">{hidden ? '❔' : a.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b>{hidden ? '???' : a.name}</b>
                      <div class="muted" style={{ fontSize: '.8rem' }}>
                        {hidden ? 'Keep playing to find out.' : a.desc}
                      </div>
                      {!got && !hidden && (
                        <div class="bar good" style={{ marginTop: '4px', height: '6px' }}>
                          <i style={{ width: `${prog * 100}%` }} />
                        </div>
                      )}
                      {(a.gold > 0 || a.title) && !hidden && (
                        <div class="muted" style={{ fontSize: '.75rem', marginTop: '2px' }}>
                          {a.gold > 0 && `🪙 ${a.gold}`} {a.title && `· title: "${a.title}"`}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
                    {it.effect.boost && (
                      <button
                        class="btn small gold"
                        style={{ marginTop: '6px' }}
                        onClick={() => {
                          let res = { ok: false, why: '' } as UseResult;
                          update((q) => {
                            res = useBoost(q, id);
                          });
                          if (res.ok) sfx('level');
                          setNote(res.ok ? (res.line ?? 'Done!') : res.why);
                        }}
                      >
                        Use
                      </button>
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

          {note && (
            <div class="panel" style={{ marginTop: '10px' }}>
              {note}
            </div>
          )}

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
      {pickTitle && (
        <Modal onClose={() => setPickTitle(false)}>
          <h2>Choose a title</h2>
          <div class="stack">
            <button
              class={`btn ${!p.title ? 'gold' : 'ghost'} wide`}
              onClick={() => {
                update((q) => void (q.title = undefined));
                setPickTitle(false);
              }}
            >
              No title
            </button>
            {titles.map((t) => (
              <button
                key={t.id}
                class={`btn ${p.title === t.id ? 'gold' : 'ghost'} wide`}
                onClick={() => {
                  update((q) => void (q.title = t.id));
                  setPickTitle(false);
                }}
              >
                {p.hero.name} {t.title}
              </button>
            ))}
          </div>
        </Modal>
      )}
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
