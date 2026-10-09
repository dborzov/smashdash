/** A region's adventure path: story, lessons, encounters and the boss, Duolingo-style. */
import type { PathNode, Region } from '../../content/schema';
import type { Profile } from '../../engine/profile';
import {
  nodeDone,
  nodeUnlocked,
  nextNodeIndex,
  nodeKey,
  regionUnlocked,
} from '../../engine/progress';
import { masteryStars } from '../../engine/mastery';
import { Scene } from '../../art/scenes';
import { go } from '../router';
import { Stars } from '../components/Bits';
import { lessons, skillById, skills } from '../../content';
import { sfx } from '../../audio/sfx';

export function nodeIcon(n: PathNode): string {
  if (n.type === 'story') return '📜';
  if (n.type === 'lesson') return skillById[lessons[n.lesson]?.skill ?? '']?.icon ?? '📖';
  if (n.type === 'boss') return '💀';
  return n.game === 'chest' ? '🧰' : n.game === 'bridge' ? '🌉' : '⚔️';
}

function nodeSub(n: PathNode): string {
  if (n.type === 'story') return 'Story';
  if (n.type === 'lesson') {
    const s = skillById[lessons[n.lesson]?.skill ?? ''];
    return s ? `Lesson · learn the ${s.name} spell` : 'Lesson';
  }
  if (n.type === 'boss') return 'Boss fight!';
  const what =
    n.game === 'chest' ? 'Treasure chest' : n.game === 'bridge' ? 'Rickety bridge' : 'Battle';
  return `${what} · ${n.count} questions`;
}

export function RegionScreen({ p, region }: { p: Profile; region: Region }) {
  const unlocked = regionUnlocked(p, region);
  const next = nextNodeIndex(p, region);
  const done = region.path.filter((n) => nodeDone(p, region.id, n.id)).length;
  const regionSkills = skills.filter((s) => s.region === region.id && p.skills[s.id]);
  return (
    <div class="screen">
      <Scene id={region.scene} dim={0.15} />
      <div class="screen-scroll" style={{ zIndex: 2 }}>
        <div class="content-col">
          <div class="panel row" style={{ gap: '14px' }}>
            <button class="icon-btn" onClick={() => go('/map')} aria-label="Back to the map">
              ←
            </button>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, color: region.palette.accent }}>{region.name}</h2>
              <div class="muted">{region.tagline}</div>
            </div>
            <span class="chip">
              {done} / {region.path.length}
            </span>
          </div>
          {!unlocked && (
            <div class="panel center" style={{ marginTop: '16px' }}>
              <h3>🔒 The fog is too thick here.</h3>
              <p>Finish the boss of the previous region to clear the way.</p>
            </div>
          )}
          <div class="path-wrap">
            {region.path.map((n, i) => {
              const open = nodeUnlocked(p, region, i);
              const isDone = nodeDone(p, region.id, n.id);
              const current = i === next;
              const offset = Math.sin(i * 1.1) * 90;
              const st = p.nodes[nodeKey(region.id, n.id)];
              return (
                <div
                  key={n.id}
                  class={`path-node ${open ? '' : 'locked'}`}
                  style={{ transform: `translateX(${offset}px)` }}
                  onClick={() => {
                    if (!open) return;
                    sfx('click');
                    go(`/play/${region.id}/${n.id}`);
                  }}
                >
                  <div
                    class={`medal ${n.type === 'boss' ? 'boss' : ''} ${isDone ? 'done' : ''} ${open ? '' : 'locked'} ${current ? 'current' : ''}`}
                  >
                    {current && <span class="start-flag">{isDone ? 'AGAIN?' : 'START'}</span>}
                    <span>{open ? nodeIcon(n) : '🔒'}</span>
                    {isDone && n.type !== 'story' && <Stars n={st?.stars ?? 1} />}
                  </div>
                  <div class="node-label">
                    {n.title}
                    <small>{nodeSub(n)}</small>
                  </div>
                </div>
              );
            })}
          </div>
          {regionSkills.length > 0 && (
            <div class="panel" style={{ marginBottom: '20px' }}>
              <div class="section-title" style={{ marginTop: 0 }}>
                ✨ Spells from {region.name}
              </div>
              <p class="muted" style={{ marginTop: 0 }}>
                Practise any spell to keep it sharp. Spells fade if you don't use them!
              </p>
              <div class="stack">
                {regionSkills.map((s) => (
                  <div
                    key={s.id}
                    class="row"
                    style={{
                      background: 'rgba(255,255,255,.06)',
                      borderRadius: '14px',
                      padding: '8px 12px',
                    }}
                  >
                    <span style={{ fontSize: '1.8rem' }}>{s.icon}</span>
                    <div style={{ flex: 1 }}>
                      <b>{s.name}</b> <Stars n={masteryStars(p.skills[s.id])} of={5} />
                      <div class="muted" style={{ fontSize: '.9rem' }}>
                        {s.summary}
                      </div>
                    </div>
                    <button class="btn small mint" onClick={() => go(`/practice/${s.id}`)}>
                      Practise
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
