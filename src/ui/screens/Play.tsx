/**
 * Runs whatever the route asks for: a path node (lesson / story / encounter / boss),
 * a wandering monster, a spell practice fight, an atom drill, or a standalone story.
 * Handles progress, rewards and what comes next.
 */
import { useState } from 'preact/hooks';
import type { Region } from '../../content/schema';
import { campaignById, lessons, regionById, skillById, regions } from '../../content';
import { getProfile, update } from '../../engine/store';
import { markNode, nodeDone, nodeUnlocked, starsFor } from '../../engine/progress';
import { grant, XP } from '../../engine/rewards';
import { skillState } from '../../engine/mastery';
import { makeWanderer } from '../../engine/encounters';
import { track } from '../../engine/events';
import { Rng } from '../../engine/rng';
import { LessonPlayer, type LessonResult } from './Lesson';
import { EncounterScreen, specFor } from './Encounter';
import { useTimeTracker } from '../useTimeTracker';
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

/** The campaign voice of a region. */
export function toneOf(region: Region | undefined): 'bright' | 'dark' {
  return region && campaignById[region.campaign]?.mood === 'dark' ? 'dark' : 'bright';
}

export function PlayNode({ regionId, nodeId }: { regionId: string; nodeId: string }) {
  const region = regionById[regionId];
  const index = region ? region.path.findIndex((n) => n.id === nodeId) : -1;
  const node = index >= 0 ? region.path[index] : undefined;
  const p = getProfile();
  useTimeTracker(node && (node.type === 'lesson' || node.type === 'story') ? regionId : undefined);
  const [first] = useState(() => !!(p && region && node && !nodeDone(p, region.id, node.id)));
  const [stage, setStage] = useState<'play' | 'summary' | 'outro'>('play');
  const [summary, setSummary] = useState<{ title: string; stars?: number; lines: string[] }>({
    title: '',
    lines: [],
  });
  const [monster] = useState(() =>
    region && node?.type === 'encounter'
      ? (node.monster ?? new Rng().pick(region.monsters))
      : undefined,
  );

  if (!p || !region || !node || !nodeUnlocked(p, region, index))
    return <Redirect to={region ? `/region/${region.id}` : '/map'} />;
  const backToRegion = () => go(`/region/${region.id}`, true);
  const tone = toneOf(region);

  if (stage === 'outro') {
    return (
      <LessonPlayer
        lesson={lessons[region.outro]}
        scene={region.scene}
        tone={tone}
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
        tone={tone}
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
            if (first && node.type === 'lesson') fx.push(...track(q, 'lesson'));
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
                ? tone === 'dark'
                  ? 'Not a single mistake. Hobb wrote it down twice, just to be sure.'
                  : 'Not a single mistake. Grimble is speechless. (He is never speechless.)'
                : tone === 'dark'
                  ? 'Mistakes in training cost nothing. On the wall they cost everything. Good that you made them here.'
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
    phases: isBoss
      ? node.phases.map((ph) => ({ skills: ph.skills, count: ph.count }))
      : [{ skills: node.skills, count: node.count }],
    tier: isBoss ? 3 : 1,
    winReward: isBoss ? { xp: first ? XP.bossWin : XP.bossReplay } : {},
    boss: isBoss
      ? { intro: node.intro, taunts: node.phases.map((ph) => ph.taunt), defeat: node.defeat }
      : undefined,
    tone,
    region: region.id,
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
          if (isBoss && first) {
            q.stats.bosses++;
            return track(q, 'boss');
          }
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
  if (!p || !w) return <Redirect to="/map" />;
  const region: Region = regionById[w.region] ?? regions[0];
  return (
    <EncounterScreen
      spec={specFor({
        title: `${w.monster.name} appears!`,
        game: w.game,
        scene: region.scene,
        monster: w.monster,
        phases: [{ skills: w.skills, count: 5 }],
        tier: 2,
        tone: toneOf(region),
        region: region.id,
      })}
      onEnd={(res) => {
        if (res.won)
          update((q) => {
            q.wanderers = q.wanderers.filter((x) => x.id !== w.id);
            return track(q, 'wander');
          });
        go('/map', true);
      }}
    />
  );
}

/** Focused practice of one spell — or, with `atom`, a drill on one atomic sub-skill. */
export function PlaySkill({
  skillId,
  atom,
  back,
}: {
  skillId: string;
  atom?: string;
  /** Where to go afterwards (default: the skill's region). */
  back?: string;
}) {
  const skill = skillById[skillId];
  const p = getProfile();
  const region = skill ? regionById[skill.region] : undefined;
  const [monster] = useState(() => (region ? new Rng().pick(region.monsters) : undefined));
  if (!p || !skill || !region || !p.skills[skill.id]) return <Redirect to="/map" />;
  const atomOk = atom && skill.atoms.some((a) => a.id === atom);
  return (
    <EncounterScreen
      spec={specFor({
        title: atomOk
          ? `Drill: ${skill.icon} ${skill.name}`
          : `Practice: ${skill.icon} ${skill.name}`,
        game: toneOf(region) === 'dark' ? 'siege' : 'battle',
        scene: region.scene,
        monster,
        phases: [{ skills: [skill.id], count: atomOk ? 5 : 6 }],
        tier: 1,
        tone: toneOf(region),
        region: region.id,
        focus: atomOk ? { skill: skill.id, atom: atom! } : undefined,
      })}
      onEnd={() => go(back ?? `/region/${region.id}`, true)}
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
