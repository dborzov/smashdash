/**
 * Practice as a mini-game. Seven flavours share the same mechanics:
 *  - battle: each right answer hits the monster; a wrong one and the monster hits you.
 *  - duel:   a battle with a quick-draw bonus for fast answers (never a penalty for slow ones).
 *  - chest:  each right answer opens a lock; a wrong one and the chest (a mimic!) bites.
 *  - bridge: each right answer is a step across; a wrong one breaks a plank.
 *  - siege:  hold the wall — each right answer drops a soldier; a wrong one cracks the gate.
 *  - vault:  crack the vault — each right answer sets a tumbler; a wrong one trips an alarm.
 *  - rescue: each right answer flies someone out of the burning tower.
 * Bosses are battles in phases, with taunts in between.
 *
 * Every phase is an adaptive run (src/engine/adaptive.ts): mistakes add reinforcement problems
 * on exactly what went wrong, at an easier level, until it is put right; clean streaks on
 * mastered skills finish early. Higher region ranks raise the starting level (`floor`).
 * Relics and a loyal pet change the odds a little (src/engine/relics.ts, pet.ts).
 *
 * Layout: the arena on top and the problem below — or, on a landscape screen (an iPad held
 * sideways), the arena on the left and the problem on the right, so nothing needs scrolling.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Rng } from '../../engine/rng';
import { generateFor } from '../../skills';
import type { Problem } from '../../skills/types';
import type { Outcome, Tier } from '../../engine/mastery';
import { getProfile, update } from '../../engine/store';
import { maxHearts, levelFromXp } from '../../engine/profile';
import { grant, XP } from '../../engine/rewards';
import { consume } from '../../engine/items';
import { rollLoot, type Loot } from '../../engine/encounters';
import { applyResult, isOver, newRun, pickNext, remaining, type Run, type RunEvent } from '../../engine/adaptive';
import { answerEffects } from '../../engine/play';
import { track } from '../../engine/events';
import type { Verdict } from '../../engine/answer';
import { petPerks } from '../../engine/pet';
import { relicBonus, flawlessTreasures } from '../../engine/relics';
import { factWeights } from '../../engine/facts';
import { criticClaim, type Claim } from '../../engine/critic';
import { rankInfo } from '../../engine/ranks';
import { Scene } from '../../art/scenes';
import { ProblemCard } from '../components/ProblemCard';
import { Hearts } from '../components/Bits';
import { RunBar, RunNews } from '../components/RunBar';
import { sfx } from '../../audio/sfx';
import { useTimeTracker } from '../useTimeTracker';
import { Arena, type FloatFx } from './Arena';
import { BossTalk, LostModal, QuitModal, WonModal } from './EndModals';
import type { EncounterResult, EncounterSpec } from './spec';

const ROUND_ICON: Record<string, string> = {
  battle: '⚔️',
  chest: '🔒',
  bridge: '🪵',
  siege: '🏹',
  vault: '⚙️',
  duel: '🎲',
  rescue: '🦸',
};

/** Seconds for a quick-draw bonus in a duel, by level. */
const QUICK_S: Record<number, number> = { 1: 9, 2: 7, 3: 6 };

interface Current {
  skill: string;
  level: Tier;
  problem: Problem;
  claim: Claim | null;
  shown: number;
}

export function EncounterScreen({
  spec,
  onEnd,
}: {
  spec: EncounterSpec;
  onEnd: (r: EncounterResult) => void;
}) {
  useTimeTracker(spec.region);
  const p0 = getProfile()!;
  const relic = useMemo(() => relicBonus(p0, spec.campaign), []);
  const perks = useMemo(() => petPerks(p0.pet, relic.pet), []);
  const hp = maxHearts(p0) + relic.hearts;
  const dark = spec.tone === 'dark';
  const rng = useRef(new Rng(Math.floor(Math.random() * 1e9))).current;
  const [phase, setPhase] = useState(0);
  const [runs] = useState<Run[]>(() => [
    newRun(p0, spec.phases[0].skills, spec.phases[0].count, rng, spec.focus, spec.floor),
  ]);
  const run = runs[phase];
  const [, setTick] = useState(0);
  const [qn, setQn] = useState(0);
  const [hearts, setHearts] = useState(hp);
  const [lost, setLost] = useState(0);
  const [stage, setStage] = useState<'intro' | 'taunt' | 'fight' | 'won' | 'lost'>(
    spec.boss ? 'intro' : 'fight',
  );
  const [introLine, setIntroLine] = useState(0);
  const [heroAnim, setHeroAnim] = useState('');
  const [foeAnim, setFoeAnim] = useState('');
  const [floats, setFloats] = useState<FloatFx[]>([]);
  const [freeHints, setFreeHints] = useState(
    (p0.hero.cls === 'wizard' ? 1 : 0) + relic.hints + (perks.sniff ? 1 : 0),
  );
  const [loot, setLoot] = useState<Loot | null>(null);
  const [petFind, setPetFind] = useState(0);
  const [broken, setBroken] = useState<number[]>([]);
  const [biting, setBiting] = useState(false);
  const [quitAsk, setQuitAsk] = useState(false);
  const [ward, setWard] = useState(relic.ward);
  const [guard, setGuard] = useState(perks.guard);
  const [rallied, setRallied] = useState(false);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [eliminated, setEliminated] = useState<number[]>([]);
  const [quick, setQuick] = useState(0);
  const [caught, setCaught] = useState(0);
  const [clock, setClock] = useState(0);
  const fid = useRef(1);

  const current: Current = useMemo(() => {
    const p = getProfile()!;
    const nx = pickNext(p, run, rng);
    const problem = generateFor(nx.skill, nx.level, rng, nx.atom, { factWeights: factWeights(p) });
    return {
      skill: nx.skill,
      level: nx.level,
      problem,
      claim: spec.critic ? criticClaim(problem, rng) : null,
      shown: Date.now(),
    };
  }, [qn, phase]);

  // The quick-draw clock in a duel.
  const quickS = QUICK_S[current.level] ?? 7;
  useEffect(() => {
    if (spec.game !== 'duel' || stage !== 'fight') return;
    setClock(quickS);
    const t = setInterval(() => setClock((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [qn, phase, stage]);

  // Progress across all phases (later phases count with their planned size).
  const doneBefore = runs.slice(0, phase).reduce((a, r) => a + r.done, 0);
  const doneAll = doneBefore + run.done;
  const future = spec.phases.slice(phase + 1).reduce((a, ph) => a + ph.count, 0);
  const totalAll = doneAll + remaining(run) + future;
  const gritAll = runs.reduce((a, r) => a + r.grit, 0);
  const wrongAll = runs.reduce((a, r) => a + r.wrong, 0);

  const float = (text: string, side: 'hero' | 'foe', color: string) => {
    const id = fid.current++;
    setFloats((f) => [...f, { id, text, side, color }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1100);
  };

  const pulse = (set: (s: string) => void, cls: string) => {
    set('');
    requestAnimationFrame(() => set(cls));
    setTimeout(() => set(''), 520);
  };

  const p = getProfile()!;
  const pet = perks.companion && p.pet && !p.pet.dead ? p.pet : null;

  const onVerdict = (v: Verdict) => {
    if (v.kind === 'right') {
      const g = spec.game;
      sfx(g === 'chest' || g === 'vault' ? 'unlock' : g === 'bridge' ? 'step' : 'hit');
      if (g === 'battle' || g === 'duel') {
        pulse(setHeroAnim, 'anim-lunge-right');
        setTimeout(() => pulse(setFoeAnim, 'anim-hit'), 160);
        float(
          dark
            ? ['⚔️', 'Hit!', 'Strike!', '💥'][doneAll % 4]
            : ['💥', 'POW!', 'BONK!', 'ZAP!', 'WHAM!'][doneAll % 5],
          'foe',
          '#ffd166',
        );
      } else if (g === 'chest') float('🔓 click!', 'foe', '#5ee6a8');
      else if (g === 'vault') float('⚙️ click', 'foe', '#ffd166');
      else if (g === 'siege') float('🏹 Down!', 'foe', '#ffd166');
      else if (g === 'rescue') float('🦸 Saved!', 'foe', '#5ee6a8');
      else float('👣', 'hero', '#5ee6a8');
    } else if (v.kind === 'wrong') {
      sfx('hurt');
      const g = spec.game;
      if (g === 'battle' || g === 'duel') {
        pulse(setFoeAnim, 'anim-lunge-left');
        setTimeout(() => pulse(setHeroAnim, 'anim-hit'), 160);
      } else if (g === 'chest') {
        setBiting(true);
        pulse(setFoeAnim, 'anim-lunge-left');
        setTimeout(() => setBiting(false), 900);
      } else if (g === 'bridge') {
        setBroken([doneAll]);
        setTimeout(() => setBroken([]), 1200);
        pulse(setHeroAnim, 'anim-hit');
      } else if (g === 'rescue') pulse(setHeroAnim, 'anim-hit');
      else pulse(setFoeAnim, 'anim-hit');
      const blocked = ward || guard;
      float(
        ward ? '🛡️ Blocked!' : guard ? `🐾 ${pet?.name ?? 'Pet'} jumps in!` : '−❤️',
        'hero',
        blocked ? '#7dd3fc' : '#ff6b6b',
      );
    }
  };

  const finishWin = () => {
    const q0 = getProfile()!;
    const l = rollLoot(new Rng(), spec.tier, levelFromXp(q0.hero.xp));
    const found = pet && rng.chance(perks.findChance) ? rng.int(3, 8) : 0;
    const lucky = (q0.boosts.lucky ?? 0) > 0;
    const gold =
      Math.round((l.gold + (spec.winReward.gold ?? 0)) * (lucky ? 2 : 1) * (1 + relic.gold / 100)) + found;
    setLoot({ ...l, gold });
    setPetFind(found);
    update((q) => {
      q.stats.wins++;
      if (lucky) q.boosts.lucky = Math.max(0, (q.boosts.lucky ?? 1) - 1);
      const fx = grant(q, {
        xp: Math.round((XP.winBonus + (spec.winReward.xp ?? 0)) * (1 + relic.xp / 100)),
        gold,
        items: { ...l.items, ...(spec.winReward.items ?? {}) },
        egg: spec.winReward.egg,
      });
      const now = Date.now();
      fx.push(...track(q, 'win', 1, now, spec.region));
      if (wrongAll === 0) {
        fx.push(...track(q, 'flawless', 1, now, spec.region));
        if (spec.region) fx.push(...flawlessTreasures(q, spec.region));
      }
      if (lost >= 2) fx.push(...track(q, 'comeback'));
      if (spec.focus) fx.push(...track(q, 'drill'));
      return fx;
    });
    sfx('win');
    setStage('won');
  };

  const onResult = (o: Outcome, critic?: { caught: boolean }) => {
    const { skill, problem, level } = current;
    const ev = applyResult(getProfile()!, run, skill, problem.atoms, o);
    const fast = spec.game === 'duel' && o === 'right' && Date.now() - current.shown <= quickS * 1000;
    update((q) => {
      const fx = answerEffects(q, skill, o, problem.atoms, level, {
        events: ev,
        dark,
        facts: problem.facts,
        cards: problem.cards,
      });
      if (fast) fx.push(...grant(q, { xp: 2 }), ...track(q, 'quick'));
      if (critic?.caught) fx.push(...track(q, 'hunt', 1, Date.now(), spec.region));
      return fx;
    });
    if (fast) {
      setQuick(quick + 1);
      float('⚡ Quick draw!', 'hero', '#ffd166');
    }
    if (critic?.caught) setCaught(caught + 1);
    setEvents(ev);
    setEliminated([]);
    let h = hearts;
    if (o === 'wrong') {
      if (ward) setWard(false);
      else if (guard) setGuard(false);
      else {
        h = hearts - 1;
        setHearts(h);
        setLost(lost + 1);
      }
      if (h <= 0) {
        sfx('lose');
        update((q) => {
          q.stats.losses++;
          q.hero.gold -= Math.min(q.hero.gold, 5 + Math.floor(q.hero.gold * 0.1));
        });
        setStage('lost');
        return;
      }
    } else if (!rallied && lost > 0 && run.combo >= relic.rally && h < hp) {
      // Rally: clean answers in a row after taking a hit win a heart back (once a fight).
      setRallied(true);
      setHearts(h + 1);
      sfx('heal');
      float('Rally! +❤️', 'hero', '#5ee6a8');
    }
    if (isOver(run)) {
      if (phase + 1 < spec.phases.length) {
        const ph = spec.phases[phase + 1];
        runs.push(newRun(getProfile()!, ph.skills, ph.count, rng, undefined, spec.floor));
        setPhase(phase + 1);
        setQn(0);
        if (spec.boss) setStage('taunt');
        return;
      }
      finishWin();
      return;
    }
    setQn(qn + 1);
    setTick((t) => t + 1);
  };

  const useItem = (id: string, then: () => void) => {
    let ok = false;
    update((q) => {
      ok = consume(q, id);
    });
    if (ok) then();
  };

  const tryHint = (): boolean => {
    if (freeHints > 0) {
      setFreeHints(freeHints - 1);
      return true;
    }
    let ok = false;
    update((q) => {
      ok = consume(q, 'hint-scroll');
    });
    return ok;
  };

  const useLens = () => {
    const a = current.problem.answer;
    if (a.kind !== 'choice') return;
    useItem('scout-lens', () => {
      sfx('page');
      const wrongs = a.options.map((_, i) => i).filter((i) => i !== a.correct);
      setEliminated(rng.shuffle(wrongs).slice(0, Math.max(0, Math.min(2, wrongs.length - 1))));
    });
  };

  const inv = (id: string) => p.inv[id] ?? 0;
  const scrolls = inv('hint-scroll');

  useEffect(() => {
    if (stage === 'intro' || stage === 'taunt') sfx('whoosh');
  }, [stage]);

  const hintLabel =
    freeHints <= 0
      ? `📜 Use a hint scroll (${scrolls})`
      : perks.sniff && pet && freeHints === 1
        ? `🐾 ${pet.name} sniffs out a hint`
        : `${p0.hero.cls === 'wizard' ? '🧙' : '✨'} Free hint (${freeHints})`;
  const rank = spec.rank ? rankInfo(spec.rank) : null;

  return (
    <div class={`screen enc ${dark ? 'dark-mode' : ''}`}>
      <Scene id={spec.scene} dim={dark ? 0.35 : 0.2} />
      <div class="enc-top">
        <button class="icon-btn" onClick={() => setQuitAsk(true)} aria-label="Run away">
          🏃
        </button>
        <div class="enc-title">
          {rank && (
            <span class="rank-tag" style={{ '--rank': rank.color } as Record<string, string>}>
              {rank.icon} {rank.name}
            </span>
          )}
          {spec.title}
        </div>
        {relic.active.length > 0 && (
          <span class="chip relic-chip" title="Relics at work in this fight">
            {relic.active.join('')}
          </span>
        )}
        <Hearts n={hearts} max={hp} />
        <button
          class="btn small ghost"
          disabled={inv('heart-potion') === 0 || hearts >= hp || stage !== 'fight'}
          onClick={() =>
            useItem('heart-potion', () => {
              sfx('heal');
              setHearts(hearts + 1);
              float('+❤️', 'hero', '#5ee6a8');
            })
          }
          title="Drink a heart potion"
        >
          ❤️‍🩹 {inv('heart-potion')}
        </button>
        {(inv('ward-rune') > 0 || ward) && (
          <button
            class={`btn small ${ward ? 'mint' : 'ghost'}`}
            disabled={ward || stage !== 'fight'}
            onClick={() =>
              useItem('ward-rune', () => {
                sfx('heal');
                setWard(true);
              })
            }
            title="Ward: blocks the next lost heart"
          >
            🛡️ {ward ? 'on' : inv('ward-rune')}
          </button>
        )}
        {inv('scout-lens') > 0 &&
          current.problem.answer.kind === 'choice' &&
          current.problem.answer.options.length >= 3 && (
            <button
              class="btn small ghost"
              disabled={stage !== 'fight' || eliminated.length > 0}
              onClick={useLens}
              title="Scout's Lens: rules out two wrong answers"
            >
              🔍 {inv('scout-lens')}
            </button>
          )}
        <span class="chip" title="Hint scrolls (use the hint button on a question)">
          📜 {scrolls}
          {freeHints > 0 ? ` +${freeHints}` : ''}
        </span>
      </div>

      <Arena
        spec={spec}
        p={p}
        stage={stage}
        done={doneAll}
        total={totalAll}
        hearts={hearts}
        hp={hp}
        heroAnim={heroAnim}
        foeAnim={foeAnim}
        floats={floats}
        broken={broken}
        biting={biting}
        cheer={events.some((e) => e.kind === 'combo')}
        pet={pet}
      />

      <div class="enc-problems">
        <div class="content-col">
          {stage === 'fight' && (
            <>
              <div class="row wrap" style={{ marginBottom: '6px' }}>
                <RunBar run={run} icon={ROUND_ICON[spec.game]} />
                {spec.boss && spec.phases.length > 1 && (
                  <span class="chip">
                    Phase {phase + 1} / {spec.phases.length}
                  </span>
                )}
                {spec.game === 'duel' && (
                  <span class={`chip quick ${clock > 0 ? 'on' : ''}`} title="Answer before the sand runs out for a quick-draw bonus">
                    ⏳ {clock > 0 ? `${clock}s` : 'take your time'}
                  </span>
                )}
                {guard && pet && (
                  <span class="chip" title={`${pet.name} will jump in front of one hit`}>
                    🐾 on guard
                  </span>
                )}
                {spec.monster?.taunts && spec.game === 'battle' && doneAll > 0 && doneAll % 3 === 2 && (
                  <span class="muted" style={{ fontStyle: 'italic' }}>
                    "{spec.monster.taunts[doneAll % spec.monster.taunts.length]}"
                  </span>
                )}
              </div>
              <RunNews events={events} dark={dark} />
              <ProblemCard
                key={`${phase}-${qn}`}
                tone={spec.tone}
                problem={current.problem}
                onResult={onResult}
                onVerdict={onVerdict}
                eliminated={eliminated}
                hint={freeHints > 0 || scrolls > 0 ? 'paid' : 'none'}
                onHint={tryHint}
                hintLabel={hintLabel}
                critic={spec.critic && current.claim ? { ...spec.critic, claim: current.claim } : undefined}
              />
            </>
          )}
          {(stage === 'intro' || stage === 'taunt') && spec.boss && (
            <BossTalk
              name={spec.monster?.name}
              line={stage === 'intro' ? spec.boss.intro[introLine] : (spec.boss.taunts[phase] ?? '…')}
              last={!(stage === 'intro' && introLine + 1 < spec.boss.intro.length)}
              onNext={() => {
                sfx('page');
                if (stage === 'intro' && introLine + 1 < spec.boss!.intro.length) setIntroLine(introLine + 1);
                else setStage('fight');
              }}
            />
          )}
        </div>
      </div>

      {stage === 'won' && (
        <WonModal
          spec={spec}
          wrong={wrongAll}
          grit={gritAll}
          best={Math.max(...runs.map((r) => r.best))}
          loot={loot}
          petFind={petFind}
          petName={pet?.name}
          quick={quick}
          caught={caught}
          onCollect={() => onEnd({ won: true, wrong: wrongAll, loot: loot ?? undefined, grit: gritAll })}
        />
      )}
      {stage === 'lost' && (
        <LostModal spec={spec} grit={gritAll} onBack={() => onEnd({ won: false, wrong: wrongAll, grit: gritAll })} />
      )}
      {quitAsk && (
        <QuitModal
          spec={spec}
          onStay={() => setQuitAsk(false)}
          onRun={() => onEnd({ won: false, wrong: wrongAll, grit: gritAll })}
        />
      )}
    </div>
  );
}
