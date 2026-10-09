/**
 * Runs whatever the route asks for: a path node (lesson / story / encounter / boss),
 * a wandering monster, a spell practice fight, or a standalone story.
 * Handles progress, rewards and what comes next.
 */
import { useState } from 'preact/hooks';
import type { Region } from '../../content/schema';
import { lessons, regionById, skillById, regions } from '../../content';
import { getProfile, update } from '../../engine/store';
import { markNode, nodeDone, nodeUnlocked, starsFor } from '../../engine/progress';
import { grant, XP } from '../../engine/rewards';
import { skillState } from '../../engine/mastery';
import { makeWanderer } from '../../engine/encounters';
import { Rng } from '../../engine/rng';
import { LessonPlayer, type LessonResult } from './Lesson';
import { EncounterScreen, roundsFor, specFor } from './Encounter';
import { Scene } from '../../art/scenes';
import { Stars } from '../components/Bits';
import { Confetti } from '../components/Confetti';
import { go, Redirect } from '../router';
import { sfx } from '../../audio/sfx';

function Summary({
  scene,
  title,
  stars,
  lines,
  onDone,
}: {
  scene: string;
  title: string;
  stars?: number;
  lines: string[];
  onDone: () => void;
}) {
  return (
    <div class="screen">
      <Scene id={scene} dim={0.4} />
      <Confetti />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          padding: '16px',
          zIndex: 3,
        }}
      >
        <div
          class="panel center"
          style={{ maxWidth: '520px', width: '100%', animation: 'pop-in .35s' }}
        >
          <div style={{ fontSize: '3.5rem' }}>🎉</div>
          <h2>{title}</h2>
          {stars !== undefined && (
            <div style={{ fontSize: '2rem' }}>
              <Stars n={stars} />
            </div>
          )}
          {lines.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
          <button class="btn gold big" onClick={onDone}>
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}

export function PlayNode({ regionId, nodeId }: { regionId: string; nodeId: string }) {
  const region = regionById[regionId];
  const index = region ? region.path.findIndex((n) => n.id === nodeId) : -1;
  const node = index >= 0 ? region.path[index] : undefined;
  const p = getProfile();
  const [first] = useState(() => !!(p && region && node && !nodeDone(p, region.id, node.id)));
  const [stage, setStage] = useState<'play' | 'summary' | 'outro'>('play');
  const [summary, setSummary] = useState<{ title: string; stars?: number; lines: string[] }>({
    title: '',
    lines: [],
  });
  const [rounds] = useState(() => {
    if (!node) return [];
    if (node.type === 'encounter') return roundsFor(node.skills, node.count);
    if (node.type === 'boss')
      return node.phases.flatMap((ph, k) => roundsFor(ph.skills, ph.count, k));
    return [];
  });
  const [monster] = useState(() =>
    region && node?.type === 'encounter'
      ? (node.monster ?? new Rng().pick(region.monsters))
      : undefined,
  );

  if (!p || !region || !node || !nodeUnlocked(p, region, index))
    return <Redirect to={region ? `/region/${region.id}` : '/map'} />;
  const backToRegion = () => go(`/region/${region.id}`, true);

  if (stage === 'outro') {
    return (
      <LessonPlayer
        lesson={lessons[region.outro]}
        scene={region.scene}
        firstTime
        onQuit={() => go('/map', true)}
        onFinish={() => go('/map', true)}
      />
    );
  }
  if (stage === 'summary') {
    return <Summary scene={region.scene} {...summary} onDone={backToRegion} />;
  }

  if (node.type === 'lesson' || node.type === 'story') {
    const lesson = lessons[node.lesson];
    return (
      <LessonPlayer
        lesson={lesson}
        scene={region.scene}
        firstTime={first}
        onQuit={backToRegion}
        onFinish={(r: LessonResult) => {
          const stars = starsFor(r.wrong);
          update((q) => {
            markNode(q, region.id, node.id, stars);
            if (lesson.skill) {
              const s = skillState(q, lesson.skill);
              s.m = Math.max(s.m, 0.12);
              if (!s.last) s.last = Date.now();
            }
            const fx = grant(q, {
              xp:
                node.type === 'story' ? (first ? 10 : 0) : first ? XP.lessonFirst : XP.lessonReplay,
            });
            if (first)
              for (const rw of r.rewards)
                fx.push(
                  ...grant(q, {
                    gold: rw.gold,
                    items: rw.item ? { [rw.item]: 1 } : undefined,
                    egg: rw.egg,
                  }),
                );
            return fx;
          });
          if (node.type === 'story') {
            backToRegion();
            return;
          }
          sfx('win');
          const skill = lesson.skill ? skillById[lesson.skill] : undefined;
          setSummary({
            title: 'Lesson complete!',
            stars,
            lines: [
              ...(skill && first ? [`New spell learned: ${skill.icon} ${skill.name}`] : []),
              r.wrong === 0
                ? 'Not a single mistake. Grimble is speechless. (He is never speechless.)'
                : 'Mistakes are how brains grow. Yours is getting huge.',
            ],
          });
          setStage('summary');
        }}
      />
    );
  }

  const isBoss = node.type === 'boss';
  const spec = specFor({
    title: node.title,
    game: isBoss ? 'battle' : node.game,
    scene: region.scene,
    monster: isBoss ? node.monster : monster,
    rounds,
    tier: isBoss ? 3 : 1,
    winReward: isBoss ? { xp: first ? XP.bossWin : XP.bossReplay } : {},
    boss: isBoss
      ? { intro: node.intro, taunts: node.phases.map((ph) => ph.taunt), defeat: node.defeat }
      : undefined,
  });
  return (
    <EncounterScreen
      spec={spec}
      onEnd={(res) => {
        if (!res.won) {
          backToRegion();
          return;
        }
        update((q) => {
          markNode(q, region.id, node.id, starsFor(res.wrong));
          if (isBoss && first) q.stats.bosses++;
        });
        if (isBoss && first) setStage('outro');
        else backToRegion();
      }}
    />
  );
}

/** A wandering monster from the world map, or "seek trouble" when id = 'seek'. */
export function PlayWanderer({ id }: { id: string }) {
  const p = getProfile();
  const [w] = useState(() =>
    p ? (id === 'seek' ? makeWanderer(p, new Rng()) : p.wanderers.find((x) => x.id === id)) : null,
  );
  const [rounds] = useState(() => (w ? roundsFor(w.skills, 5) : []));
  if (!p || !w) return <Redirect to="/map" />;
  const region: Region = regionById[w.region] ?? regions[0];
  return (
    <EncounterScreen
      spec={specFor({
        title: `${w.monster.name} appears!`,
        game: w.game,
        scene: region.scene,
        monster: w.monster,
        rounds,
        tier: 2,
      })}
      onEnd={(res) => {
        if (res.won)
          update((q) => {
            q.wanderers = q.wanderers.filter((x) => x.id !== w.id);
          });
        go('/map', true);
      }}
    />
  );
}

/** Focused practice of one spell. */
export function PlaySkill({ skillId }: { skillId: string }) {
  const skill = skillById[skillId];
  const p = getProfile();
  const [rounds] = useState(() => (skill ? roundsFor([skill.id], 6) : []));
  const region = skill ? regionById[skill.region] : undefined;
  const [monster] = useState(() => (region ? new Rng().pick(region.monsters) : undefined));
  if (!p || !skill || !region || !p.skills[skill.id]) return <Redirect to="/map" />;
  return (
    <EncounterScreen
      spec={specFor({
        title: `Practice: ${skill.icon} ${skill.name}`,
        game: 'battle',
        scene: region.scene,
        monster,
        rounds,
        tier: 1,
      })}
      onEnd={() => go(`/region/${region.id}`, true)}
    />
  );
}

/** A standalone story (the prologue). */
export function PlayStory({ id }: { id: string }) {
  const lesson = lessons[id];
  if (!lesson) return <Redirect to="/map" />;
  const done = () => {
    update((q) => {
      if (!q.seen.includes(id)) q.seen.push(id);
    });
    go('/map', true);
  };
  return <LessonPlayer lesson={lesson} scene="village" firstTime onQuit={done} onFinish={done} />;
}
