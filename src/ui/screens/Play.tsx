/**
 * Runs whatever the route asks for: a path node (lesson / story / encounter / boss),
 * a wandering monster, a spell practice fight, an atom drill, or a standalone story.
 * Handles progress, rewards and what comes next.
 */
import { useEffect, useState } from 'preact/hooks';
import type { Region } from '../../content/schema';
import { campaignById, itemById, lessons, regionById, skillById, regions } from '../../content';
import { getProfile, update } from '../../engine/store';
import { markNode, nodeDone, nodeUnlocked, starsFor } from '../../engine/progress';
import {
  clearRank,
  clearStory,
  COOLDOWN_DAYS,
  markRankNode,
  nextRank,
  rankGold,
  rankInfo,
  rankNodeOpen,
  rankPath,
  rankXp,
  reviewSkills,
} from '../../engine/ranks';
import { grant, XP } from '../../engine/rewards';
import { skillState } from '../../engine/mastery';
import { makeWanderer } from '../../engine/encounters';
import { track } from '../../engine/events';
import { Rng } from '../../engine/rng';
import { fillLesson, LessonPlayer, type LessonResult } from './Lesson';
import { EncounterScreen } from '../encounter/EncounterScreen';
import { specFor } from '../encounter/spec';
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
  useEffect(() => {
    if (region)
      update((q) => {
        q.lastAt[region.id] = Date.now();
        q.visited[region.id] ??= Date.now();
      });
  }, []);
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
        key={region.outro}
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
        key={`${region.id}/${node.id}`}
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
    campaign: region.campaign,
  });
  return (
    <EncounterScreen
      key={`${region.id}/${node.id}`}
      spec={spec}
      onEnd={(res) => {
        if (!res.won) {
          backToRegion();
          return;
        }
        update((q) => {
          markNode(q, region.id, node.id, starsFor(res.wrong));
          if (isBoss) {
            const fx = track(q, 'boss', 1, Date.now(), region.id);
            if (first) {
              q.stats.bosses++;
              clearStory(q, region);
            }
            return fx;
          }
        });
        if (isBoss && first) setStage('outro');
        else backToRegion();
      }}
    />
  );
}

/**
 * A node of a region's next rank (Heroic, Legendary, …): a twist story, a harder fight, a
 * Mistake Hunt, or the boss — whose defeat clears the rank (src/engine/ranks.ts).
 */
export function PlayRank({ regionId, nodeId }: { regionId: string; nodeId: string }) {
  const region = regionById[regionId];
  const p = getProfile();
  const [rank] = useState(() => (p && region ? nextRank(p, region) : null));
  const path = region && rank ? rankPath(region, rank) : [];
  const index = path.findIndex((n) => n.id === nodeId);
  const node = path[index];
  const [summary, setSummary] = useState<{ title: string; lines: string[] } | null>(null);
  const [monster] = useState(() =>
    region && node?.type === 'encounter' ? (node.monster ?? new Rng().pick(region.monsters)) : undefined,
  );
  const [review] = useState(() => {
    if (!p || !region || !node || node.type === 'story' || !node.review) return [];
    return new Rng().shuffle(reviewSkills(p, region)).slice(0, 2);
  });
  useTimeTracker(node?.type === 'story' ? regionId : undefined);
  if (summary && region) return <Summary scene={region.scene} {...summary} onDone={() => go(`/region/${region.id}`, true)} />;
  if (!p || !region || !rank || !node || !rankNodeOpen(p, region, path, index))
    return <Redirect to={region ? `/region/${region.id}` : '/map'} />;
  const back = () => go(`/region/${region.id}`, true);
  const tone = toneOf(region);
  const camp = campaignById[region.campaign];
  const info = rankInfo(rank);
  const boss = path.find((n) => n.type === 'boss');

  if (node.type === 'story') {
    const lesson = fillLesson(lessons[node.lesson], {
      region: region.name,
      boss: boss?.type === 'boss' ? boss.monster.name : 'the boss',
      rank: info.name,
    });
    return (
      <LessonPlayer
        key={node.id}
        lesson={lesson}
        scene={region.scene}
        tone={tone}
        firstTime
        onQuit={back}
        onFinish={() => {
          update((q) => markRankNode(q, region, node.id, 3));
          back();
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
      ? node.phases.map((ph, i) => ({
          skills: i === node.phases.length - 1 ? [...ph.skills, ...review] : ph.skills,
          count: ph.count,
        }))
      : [{ skills: [...node.skills, ...review], count: node.count }],
    tier: isBoss ? 3 : 2,
    winReward: isBoss ? { xp: XP.bossReplay } : {},
    boss: isBoss
      ? { intro: node.intro, taunts: node.phases.map((ph) => ph.taunt), defeat: node.defeat }
      : undefined,
    tone,
    region: region.id,
    campaign: region.campaign,
    floor: node.floor as 1 | 2 | 3,
    rank,
    critic: node.type === 'encounter' && node.twist === 'critic' ? camp?.critic : undefined,
  });
  return (
    <EncounterScreen
      key={`${region.id}/r${rank}/${node.id}`}
      spec={spec}
      onEnd={(res) => {
        if (!res.won) return back();
        let gave: string[] = [];
        update((q) => {
          markRankNode(q, region, node.id, starsFor(res.wrong));
          if (!isBoss) return;
          const fx = [...track(q, 'boss', 1, Date.now(), region.id), ...clearRank(q, region, rank)];
          gave = fx.filter((f) => f.kind === 'item').map((f) => (f.kind === 'item' ? f.item : ''));
          return fx;
        });
        if (!isBoss) return back();
        sfx('level');
        const next = rank < 5 ? rankInfo(rank + 1) : null;
        setSummary({
          title: `${info.icon} ${info.name} rank cleared!`,
          lines: [
            `${region.name} is yours — at ${info.name} level. +${rankXp(rank)} XP, +${rankGold(rank)} gold.`,
            ...gave.map((id) => `Treasure: ${itemById[id]?.icon} ${itemById[id]?.name}!`),
            next
              ? `${next.icon} ${next.name} opens in ${COOLDOWN_DAYS} days. ${camp?.cooldown ?? ''}`
              : 'That was the last rank. There is nothing harder. Probably. Go outside?',
          ],
        });
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
        campaign: region.campaign,
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
        campaign: region.campaign,
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
  return (
    <LessonPlayer
      key={lesson.id}
      lesson={lesson}
      scene="village"
      firstTime
      onQuit={done}
      onFinish={done}
    />
  );
}
