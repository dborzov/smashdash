/**
 * A region's adventure path: story, lessons, encounters and the boss, Duolingo-style — with a
 * header of stats (progress, stars, time spent, accuracy) and the region's skills with their
 * tier and atom progress. Opening a region marks it as visited (it stops being "NEW").
 */
import { useEffect } from 'preact/hooks';
import type { PathNode, Region } from '../../content/schema';
import type { Profile } from '../../engine/profile';
import {
  nodeDone,
  nodeUnlocked,
  nextNodeIndex,
  nodeKey,
  regionUnlocked,
} from '../../engine/progress';
import { atomStatus, masteryStars, TIER_NAMES, type Tier } from '../../engine/mastery';
import { regionStats, formatTime } from '../../engine/regionStats';
import { update } from '../../engine/store';
import { Scene } from '../../art/scenes';
import { go } from '../router';
import { Stars } from '../components/Bits';
import { RichInline } from '../components/Rich';
import { campaignById, lessons, skillById, skills } from '../../content';
import { sfx } from '../../audio/sfx';

const GAME_ICON: Record<string, string> = {
  chest: '🧰',
  bridge: '🌉',
  siege: '🏰',
  vault: '🔐',
  battle: '⚔️',
};
const GAME_NAME: Record<string, string> = {
  chest: 'Treasure chest',
  bridge: 'Rickety bridge',
  siege: 'Hold the wall',
  vault: 'Crack the vault',
  battle: 'Battle',
};

export function nodeIcon(n: PathNode): string {
  if (n.type === 'story') return '📜';
  if (n.type === 'lesson') return skillById[lessons[n.lesson]?.skill ?? '']?.icon ?? '📖';
  if (n.type === 'boss') return '💀';
  return GAME_ICON[n.game] ?? '⚔️';
}

function nodeSub(n: PathNode): string {
  if (n.type === 'story') return 'Story';
  if (n.type === 'lesson') {
    const s = skillById[lessons[n.lesson]?.skill ?? ''];
    return s ? `Lesson · learn ${s.name}` : 'Lesson';
  }
  if (n.type === 'boss') return 'Boss fight!';
  return `${GAME_NAME[n.game] ?? 'Battle'} · about ${n.count} questions`;
}

export function RegionScreen({ p, region }: { p: Profile; region: Region }) {
  const unlocked = regionUnlocked(p, region);
  const next = nextNodeIndex(p, region);
  const st = regionStats(p, region);
  const dark = campaignById[region.campaign]?.mood === 'dark';
  const regionSkills = skills.filter((s) => s.region === region.id);

  useEffect(() => {
    if (unlocked && !p.visited[region.id])
      update((q) => {
        q.visited[region.id] = Date.now();
      });
  }, [region.id, unlocked]);

  return (
    <div class={`screen ${dark ? 'dark-mode' : ''}`}>
      <Scene id={region.scene} dim={dark ? 0.3 : 0.15} />
      <div class="screen-scroll" style={{ zIndex: 2 }}>
        <div class="content-col">
          <div class="panel">
            <div class="row" style={{ gap: '14px' }}>
              <button
                class="icon-btn"
                onClick={() => go('/map')}
                aria-label="Back to the adventure board"
              >
                ←
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ margin: 0, color: region.palette.accent }}>{region.name}</h2>
                <div class="muted">{region.tagline}</div>
              </div>
              <span class="chip">
                {st.done} / {st.total}
              </span>
            </div>
            <div class="region-topic">
              <b>What you'll learn:</b> <RichInline text={region.topic} />
            </div>
            <div class="row wrap region-stats">
              <span class="chip" title="Stars">
                ⭐ {st.stars}/{st.maxStars}
              </span>
              <span class="chip" title="Time spent here">
                ⏱ {formatTime(st.timeMs)}
              </span>
              <span class="chip" title="Accuracy on this region's skills">
                🎯 {st.accuracy === null ? '—' : `${Math.round(st.accuracy * 100)}%`}
              </span>
              <span class="chip" title="Tiny skills solid or mastered">
                🌳 {st.atomsSolid}/{st.atomsTotal} tiny skills solid
              </span>
              {st.needsReview && <span class="badge review">🔁 Needs review</span>}
            </div>
          </div>
          {!unlocked && (
            <div class="panel center" style={{ marginTop: '16px' }}>
              <h3>🔒 {dark ? 'The road is closed.' : 'The fog is too thick here.'}</h3>
              <p>
                Finish {st.waitingFor.map((r) => r.name).join(' and ') || 'the previous region'} to
                clear the way.
              </p>
            </div>
          )}
          <div class="path-wrap">
            {region.path.map((n, i) => {
              const open = nodeUnlocked(p, region, i);
              const isDone = nodeDone(p, region.id, n.id);
              const current = i === next;
              const offset = Math.sin(i * 1.1) * 90;
              const ns = p.nodes[nodeKey(region.id, n.id)];
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
                    {current && <span class="start-flag">START</span>}
                    <span>{open ? nodeIcon(n) : '🔒'}</span>
                    {isDone && n.type !== 'story' && <Stars n={ns?.stars ?? 1} />}
                  </div>
                  <div class="node-label">
                    {n.title}
                    <small>
                      {nodeSub(n)}
                      {ns && ns.plays > 1 ? ` · played ${ns.plays}×` : ''}
                    </small>
                  </div>
                </div>
              );
            })}
          </div>
          {regionSkills.some((s) => p.skills[s.id]) && (
            <div class="panel" style={{ marginBottom: '20px' }}>
              <div class="section-title" style={{ marginTop: 0 }}>
                ✨ Skills from {region.name}
              </div>
              <p class="muted" style={{ marginTop: 0 }}>
                Practise any skill to keep it sharp — skills fade if you don't use them. The tree
                shows every tiny piece.
              </p>
              <div class="stack">
                {regionSkills.map((s) => {
                  const sk = p.skills[s.id];
                  if (!sk) return null;
                  const solid = s.atoms.filter((a) => {
                    const x = atomStatus(p.atoms[`${s.id}/${a.id}`]);
                    return x === 'solid' || x === 'mastered';
                  }).length;
                  return (
                    <div key={s.id} class="row skill-row">
                      <span style={{ fontSize: '1.8rem' }}>{s.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <b>{s.name}</b> <Stars n={masteryStars(sk)} of={5} />{' '}
                        <span class={`tier-pill t${sk.tier ?? 1}`}>
                          {TIER_NAMES[(sk.tier ?? 1) as Tier]}
                        </span>
                        <div class="muted" style={{ fontSize: '.9rem' }}>
                          {s.summary}
                        </div>
                        <div
                          class="atom-dots"
                          title={`${solid} of ${s.atoms.length} tiny skills solid`}
                        >
                          {s.atoms.map((a) => (
                            <i key={a.id} class={`ad ${atomStatus(p.atoms[`${s.id}/${a.id}`])}`} />
                          ))}
                        </div>
                      </div>
                      <button class="btn small mint" onClick={() => go(`/practice/${s.id}`)}>
                        Practise
                      </button>
                    </div>
                  );
                })}
              </div>
              <button
                class="btn small ghost"
                style={{ marginTop: '10px' }}
                onClick={() => go('/skills')}
              >
                🌳 Open the Skill Tree
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
