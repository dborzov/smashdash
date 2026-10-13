/**
 * Practice as a mini-game. Five flavours share the same mechanics:
 *  - battle: each right answer hits the monster; a wrong one and the monster hits you.
 *  - chest:  each right answer opens a lock; a wrong one and the chest (a mimic!) bites.
 *  - bridge: each right answer is a step across; a wrong one breaks a plank.
 *  - siege:  hold the wall — each right answer drops a soldier; a wrong one cracks the gate.
 *  - vault:  crack the vault — each right answer sets a tumbler; a wrong one trips an alarm.
 * Bosses are battles in phases, with taunts in between.
 *
 * Every phase is an adaptive run (src/engine/adaptive.ts): mistakes add reinforcement problems
 * (one more lock / plank / soldier) on exactly what went wrong, at an easier level, until it is
 * put right; clean streaks on mastered skills finish early. Hearts still matter.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Game, Monster } from '../../content/schema';
import { Rng } from '../../engine/rng';
import { generateFor } from '../../skills';
import type { Problem } from '../../skills/types';
import type { Outcome, Tier } from '../../engine/mastery';
import { getProfile, update } from '../../engine/store';
import { maxHearts, levelFromXp } from '../../engine/profile';
import { grant, XP, type Reward } from '../../engine/rewards';
import { consume } from '../../engine/items';
import { rollLoot, type Loot } from '../../engine/encounters';
import {
  applyResult,
  isOver,
  newRun,
  pickNext,
  remaining,
  type Run,
  type RunEvent,
} from '../../engine/adaptive';
import { answerEffects } from '../../engine/play';
import { track } from '../../engine/events';
import type { Verdict } from '../../engine/answer';
import { petMood } from '../../engine/pet';
import { Scene } from '../../art/scenes';
import { Avatar } from '../../art/Avatar';
import { MonsterArt } from '../../art/Monster';
import { Muddler } from '../../art/Portrait';
import { DarkFoeArt, type DarkFoe } from '../../art/Dark';
import { PetArt } from '../../art/Pet';
import { ProblemCard } from '../components/ProblemCard';
import { Bar, Hearts, Modal } from '../components/Bits';
import { RunBar, RunNews } from '../components/RunBar';
import { Confetti } from '../components/Confetti';
import { itemById } from '../../content';
import { sfx } from '../../audio/sfx';
import { BridgeArt, ChestArt, SiegeArt, VaultArt } from './GameArt';
import { useTimeTracker } from '../useTimeTracker';

export interface Phase {
  skills: string[];
  count: number;
}

export interface EncounterSpec {
  title: string;
  game: Game;
  scene: string;
  monster?: Monster;
  boss?: { intro: string[]; taunts: string[]; defeat: string };
  phases: Phase[];
  /** Loot tier: 1 path fight, 2 wanderer, 3 boss. */
  tier: number;
  /** Extra reward for winning (first-time boss bonus etc). */
  winReward: Reward;
  /** Voice and look: the bright kingdom or the grim North. */
  tone: 'bright' | 'dark';
  /** Region the time is counted towards. */
  region?: string;
  /** A drill on one atom (from the Skill Tree). */
  focus?: { skill: string; atom: string };
}

export interface EncounterResult {
  won: boolean;
  wrong: number;
  loot?: Loot;
  grit: number;
}

const DARK_ARTS = ['hollow', 'wraith', 'tallyman', 'forger', 'golem', 'rider'];

const WIN_TEXT: Record<Game, [string, string]> = {
  battle: ['🏆', 'Victory!'],
  chest: ['💰', 'Chest unlocked!'],
  bridge: ['🏁', 'You made it across!'],
  siege: ['🏰', 'The wall holds!'],
  vault: ['🔓', 'The vault is open!'],
};

const ROUND_ICON: Record<Game, string> = {
  battle: '⚔️',
  chest: '🔒',
  bridge: '🪵',
  siege: '🏹',
  vault: '⚙️',
};

interface Current {
  skill: string;
  level: Tier;
  problem: Problem;
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
  const hp = maxHearts(p0);
  const dark = spec.tone === 'dark';
  const rng = useRef(new Rng(Math.floor(Math.random() * 1e9))).current;
  const [phase, setPhase] = useState(0);
  const [runs] = useState<Run[]>(() => [
    newRun(p0, spec.phases[0].skills, spec.phases[0].count, rng, spec.focus),
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
  const [floats, setFloats] = useState<
    { id: number; text: string; side: 'hero' | 'foe'; color: string }[]
  >([]);
  const [freeHint, setFreeHint] = useState(p0.hero.cls === 'wizard');
  const [loot, setLoot] = useState<Loot | null>(null);
  const [petFind, setPetFind] = useState(0);
  const [broken, setBroken] = useState<number[]>([]);
  const [biting, setBiting] = useState(false);
  const [quitAsk, setQuitAsk] = useState(false);
  const [ward, setWard] = useState(false);
  const [rallied, setRallied] = useState(false);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [eliminated, setEliminated] = useState<number[]>([]);
  const fid = useRef(1);

  const current: Current = useMemo(() => {
    const nx = pickNext(getProfile()!, run, rng);
    return {
      skill: nx.skill,
      level: nx.level,
      problem: generateFor(nx.skill, nx.level, rng, nx.atom),
    };
  }, [qn, phase]);

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

  const onVerdict = (v: Verdict) => {
    if (v.kind === 'right') {
      sfx(
        spec.game === 'chest' || spec.game === 'vault'
          ? 'unlock'
          : spec.game === 'bridge'
            ? 'step'
            : 'hit',
      );
      if (spec.game === 'battle') {
        pulse(setHeroAnim, 'anim-lunge-right');
        setTimeout(() => pulse(setFoeAnim, 'anim-hit'), 160);
        float(
          dark
            ? ['⚔️', 'Hit!', 'Strike!', '💥'][doneAll % 4]
            : ['💥', 'POW!', 'BONK!', 'ZAP!', 'WHAM!'][doneAll % 5],
          'foe',
          '#ffd166',
        );
      } else if (spec.game === 'chest') float('🔓 click!', 'foe', '#5ee6a8');
      else if (spec.game === 'vault') float('⚙️ click', 'foe', '#ffd166');
      else if (spec.game === 'siege') float('🏹 Down!', 'foe', '#ffd166');
      else float('👣', 'hero', '#5ee6a8');
    } else if (v.kind === 'wrong') {
      sfx('hurt');
      if (spec.game === 'battle') {
        pulse(setFoeAnim, 'anim-lunge-left');
        setTimeout(() => pulse(setHeroAnim, 'anim-hit'), 160);
      } else if (spec.game === 'chest') {
        setBiting(true);
        pulse(setFoeAnim, 'anim-lunge-left');
        setTimeout(() => setBiting(false), 900);
      } else if (spec.game === 'bridge') {
        setBroken([doneAll]);
        setTimeout(() => setBroken([]), 1200);
        pulse(setHeroAnim, 'anim-hit');
      } else pulse(setFoeAnim, 'anim-hit');
      float(ward ? '🛡️ Blocked!' : '−❤️', 'hero', ward ? '#7dd3fc' : '#ff6b6b');
    }
  };

  const finishWin = () => {
    const p = getProfile()!;
    const l = rollLoot(new Rng(), spec.tier, levelFromXp(p.hero.xp));
    const companion = p.pet && !p.pet.dead && (p.pet.bond ?? 0) >= 30;
    const found = companion && rng.chance(0.35) ? rng.int(3, 8) : 0;
    const lucky = (p.boosts.lucky ?? 0) > 0;
    const gold = (l.gold + (spec.winReward.gold ?? 0)) * (lucky ? 2 : 1) + found;
    setLoot({ ...l, gold });
    setPetFind(found);
    update((q) => {
      q.stats.wins++;
      if (lucky) q.boosts.lucky = Math.max(0, (q.boosts.lucky ?? 1) - 1);
      const fx = grant(q, {
        xp: XP.winBonus + (spec.winReward.xp ?? 0),
        gold,
        items: { ...l.items, ...(spec.winReward.items ?? {}) },
        egg: spec.winReward.egg,
      });
      fx.push(...track(q, 'win'));
      if (wrongAll === 0) fx.push(...track(q, 'flawless'));
      if (lost >= 2) fx.push(...track(q, 'comeback'));
      if (spec.focus) fx.push(...track(q, 'drill'));
      return fx;
    });
    sfx('win');
    setStage('won');
  };

  const onResult = (o: Outcome) => {
    const { skill, problem, level } = current;
    const ev = applyResult(getProfile()!, run, skill, problem.atoms, o);
    update((q) => answerEffects(q, skill, o, problem.atoms, level, { events: ev, dark }));
    setEvents(ev);
    setEliminated([]);
    let h = hearts;
    if (o === 'wrong') {
      if (ward) setWard(false);
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
    } else if (!rallied && lost > 0 && run.combo >= 3 && h < hp) {
      // Rally: three clean answers in a row after taking a hit win a heart back (once a fight).
      setRallied(true);
      setHearts(h + 1);
      sfx('heal');
      float('Rally! +❤️', 'hero', '#5ee6a8');
    }
    if (isOver(run)) {
      if (phase + 1 < spec.phases.length) {
        const ph = spec.phases[phase + 1];
        runs.push(newRun(getProfile()!, ph.skills, ph.count, rng));
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
    if (freeHint) {
      setFreeHint(false);
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

  const p = getProfile()!;
  const inv = (id: string) => p.inv[id] ?? 0;
  const scrolls = inv('hint-scroll');
  const pet = p.pet && !p.pet.dead && (p.pet.bond ?? 0) >= 30 ? p.pet : null;

  useEffect(() => {
    if (stage === 'intro' || stage === 'taunt') sfx('whoosh');
  }, [stage]);

  const art = spec.monster?.art;
  const foe =
    spec.game === 'chest' ? (
      <ChestArt locks={totalAll} open={doneAll} biting={biting} />
    ) : spec.game === 'vault' ? (
      <VaultArt
        total={totalAll}
        done={doneAll}
        alarms={hp - hearts}
        ring={foeAnim === 'anim-hit'}
      />
    ) : art === 'muddler' ? (
      <Muddler />
    ) : art && DARK_ARTS.includes(art) ? (
      <DarkFoeArt
        art={art as DarkFoe}
        seed={spec.monster!.seed}
        hue={spec.monster!.hue}
        boss={!!spec.boss}
        hurt={stage === 'won'}
      />
    ) : spec.monster ? (
      <MonsterArt
        seed={spec.monster.seed}
        hue={spec.monster.hue}
        boss={!!spec.boss}
        hurt={stage === 'won'}
      />
    ) : null;

  const heroArt = (
    <Avatar
      look={p.hero.look}
      cls={p.hero.cls}
      hat={p.hero.hat}
      cape={p.hero.cape}
      mood={stage === 'lost' ? 'ko' : heroAnim === 'anim-hit' ? 'hurt' : 'happy'}
    />
  );
  const petArt = pet && (
    <div class={`companion ${events.some((e) => e.kind === 'combo') ? 'cheer' : ''}`}>
      <PetArt species={pet.species} mood={petMood(pet)} hat={pet.hat} />
    </div>
  );

  return (
    <div class={`screen ${dark ? 'dark-mode' : ''}`}>
      <Scene id={spec.scene} dim={dark ? 0.35 : 0.2} />
      {/* top bar */}
      <div class="enc-top">
        <button class="icon-btn" onClick={() => setQuitAsk(true)} aria-label="Run away">
          🏃
        </button>
        <div class="enc-title">{spec.title}</div>
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
        {inv('ward-rune') > 0 && (
          <button
            class={`btn small ${ward ? 'mint' : 'ghost'}`}
            disabled={ward || stage !== 'fight'}
            onClick={() =>
              useItem('ward-rune', () => {
                sfx('heal');
                setWard(true);
              })
            }
            title="Ward Rune: blocks the next lost heart"
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
          {freeHint ? ' +1' : ''}
        </span>
      </div>

      {/* arena */}
      <div class="enc-arena">
        {spec.game === 'bridge' ? (
          <div style={{ position: 'relative', width: '100%', maxWidth: '760px', height: '100%' }}>
            <BridgeArt planks={totalAll} at={doneAll} broken={broken} />
            <div
              class={heroAnim}
              style={{
                position: 'absolute',
                bottom: '38%',
                left: `${4 + (doneAll / (totalAll + 1)) * 82}%`,
                width: '14%',
                maxWidth: '90px',
                transition: 'left .5s cubic-bezier(.3,1.4,.5,1)',
              }}
            >
              {heroArt}
            </div>
            {floats.map((f) => (
              <div
                key={f.id}
                class="float-num"
                style={{
                  left: `${10 + (doneAll / (totalAll + 1)) * 82}%`,
                  top: '10%',
                  color: f.color,
                }}
              >
                {f.text}
              </div>
            ))}
          </div>
        ) : spec.game === 'siege' ? (
          <div style={{ position: 'relative', width: '100%', maxWidth: '760px', height: '100%' }}>
            <SiegeArt
              total={totalAll}
              done={doneAll}
              cracks={hp - hearts}
              hit={foeAnim === 'anim-hit'}
            />
            <div
              class={heroAnim}
              style={{
                position: 'absolute',
                bottom: '58%',
                left: '3%',
                width: '11%',
                maxWidth: '80px',
              }}
            >
              {heroArt}
            </div>
            {floats.map((f) => (
              <div
                key={f.id}
                class="float-num"
                style={{ left: f.side === 'foe' ? '45%' : '12%', top: '15%', color: f.color }}
              >
                {f.text}
              </div>
            ))}
          </div>
        ) : (
          <div class="enc-duel">
            <div
              class={heroAnim}
              style={{ width: '26%', maxWidth: '170px', height: '92%', position: 'relative' }}
            >
              {heroArt}
              {petArt}
            </div>
            <div
              style={{
                width: spec.boss ? '38%' : '32%',
                maxWidth: spec.boss ? '280px' : '220px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
              }}
            >
              {spec.game === 'battle' && (
                <div style={{ marginBottom: '6px' }}>
                  <div class="foe-name">{spec.monster?.name}</div>
                  <Bar value={totalAll - doneAll} max={totalAll} kind="hp" />
                </div>
              )}
              <div
                class={`${foeAnim} ${stage === 'fight' && spec.game === 'battle' ? 'anim-bob' : ''}`}
                style={{
                  flex: 1,
                  minHeight: 0,
                  opacity: stage === 'won' && spec.game === 'battle' ? 0.35 : 1,
                  transition: 'opacity 1s',
                }}
              >
                {foe}
              </div>
            </div>
            {floats.map((f) => (
              <div
                key={f.id}
                class="float-num"
                style={{ left: f.side === 'foe' ? '78%' : '16%', top: '20%', color: f.color }}
              >
                {f.text}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* problem area */}
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
                {spec.monster?.taunts &&
                  spec.game === 'battle' &&
                  doneAll > 0 &&
                  doneAll % 3 === 2 && (
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
                hint={freeHint || scrolls > 0 ? 'paid' : 'none'}
                onHint={tryHint}
                hintLabel={freeHint ? '🧙 Free wizard hint' : `📜 Use a hint scroll (${scrolls})`}
              />
            </>
          )}
          {(stage === 'intro' || stage === 'taunt') && spec.boss && (
            <div class="panel" style={{ animation: 'pop-in .3s' }}>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  color: 'var(--danger)',
                  fontWeight: 600,
                }}
              >
                {spec.monster?.name}
              </div>
              <p style={{ fontSize: '1.25rem', margin: '6px 0 12px' }}>
                "{stage === 'intro' ? spec.boss.intro[introLine] : (spec.boss.taunts[phase] ?? '…')}
                "
              </p>
              <div class="row" style={{ justifyContent: 'flex-end' }}>
                <button
                  class="btn gold big"
                  onClick={() => {
                    sfx('page');
                    if (stage === 'intro' && introLine + 1 < spec.boss!.intro.length)
                      setIntroLine(introLine + 1);
                    else setStage('fight');
                  }}
                >
                  {stage === 'intro' && introLine + 1 < spec.boss.intro.length
                    ? 'Continue →'
                    : '⚔️ Fight!'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {stage === 'won' && (
        <Modal>
          <Confetti />
          <div style={{ fontSize: '3.5rem' }}>{WIN_TEXT[spec.game][0]}</div>
          <h2>{WIN_TEXT[spec.game][1]}</h2>
          {spec.boss && <p style={{ fontStyle: 'italic' }}>"{spec.boss.defeat}"</p>}
          <p>
            {wrongAll === 0
              ? 'Flawless! Not a single mistake. ⭐⭐⭐'
              : wrongAll <= 2
                ? 'Nicely done! ⭐⭐'
                : 'You made it! ⭐'}
          </p>
          {(gritAll > 0 || runs.some((r) => r.best >= 5)) && (
            <div class="row wrap" style={{ justifyContent: 'center' }}>
              {gritAll > 0 && (
                <span class="chip" title="Mistakes you went back and got right">
                  🪨 Grit: {gritAll} mistake{gritAll > 1 ? 's' : ''} put right
                </span>
              )}
              {runs.some((r) => r.best >= 5) && (
                <span class="chip">🔥 Best combo ×{Math.max(...runs.map((r) => r.best))}</span>
              )}
            </div>
          )}
          {gritAll > 0 && (
            <p class="muted" style={{ fontSize: '.95rem' }}>
              {dark
                ? 'Struggling and then getting it right is how soldiers are made. That counted for more than an easy win.'
                : 'Getting stuck and then getting it is exactly how brains grow. That was the good stuff.'}
            </p>
          )}
          {loot && (
            <div class="row wrap" style={{ justifyContent: 'center', margin: '10px 0' }}>
              <span class="chip gold" style={{ fontSize: '1.2rem' }}>
                🪙 +{loot.gold}
              </span>
              {Object.entries({ ...loot.items, ...(spec.winReward.items ?? {}) }).map(([id, n]) => (
                <span key={id} class="chip" style={{ fontSize: '1.2rem' }}>
                  {itemById[id]?.icon} {itemById[id]?.name} ×{n}
                </span>
              ))}
              {spec.winReward.egg && (
                <span class="chip" style={{ fontSize: '1.2rem' }}>
                  🥚 Mystery Egg
                </span>
              )}
            </div>
          )}
          {petFind > 0 && pet && (
            <p class="muted">
              🐾 {pet.name} sniffed out {petFind} extra gold.
            </p>
          )}
          <button
            class="btn gold big"
            onClick={() =>
              onEnd({ won: true, wrong: wrongAll, loot: loot ?? undefined, grit: gritAll })
            }
          >
            Collect loot →
          </button>
        </Modal>
      )}
      {stage === 'lost' && (
        <Modal>
          <div style={{ fontSize: '3.5rem' }}>😵</div>
          <h2>Knocked out!</h2>
          {dark ? (
            <p>
              The line breaks. Wren drags you back behind the wall by your collar. You lost a few
              coins in the mud. The {spec.monster?.name ?? 'enemy'} does not gloat. It just waits.
            </p>
          ) : (
            <p>
              Grimble drags you back to safety by your boot. You dropped a few coins on the way. The{' '}
              {spec.game === 'chest' ? 'chest' : (spec.monster?.name ?? 'monster')} looks very smug.
            </p>
          )}
          <p class="muted">
            {gritAll > 0
              ? `You still put ${gritAll} mistake${gritAll > 1 ? 's' : ''} right — that sticks. Go again.`
              : 'Every mistake makes your brain stronger. Try again — you have got this.'}
          </p>
          <button
            class="btn gold big"
            onClick={() => onEnd({ won: false, wrong: wrongAll, grit: gritAll })}
          >
            Back to safety
          </button>
        </Modal>
      )}
      {quitAsk && (
        <Modal onClose={() => setQuitAsk(false)}>
          <h2>Run away?</h2>
          <p>
            You'll keep the XP you earned, but no loot.{' '}
            {dark
              ? 'Nobody will blame you. Nobody will forget, either.'
              : `The ${spec.monster?.name ?? 'monster'} will call you a scaredy-cat.`}
          </p>
          <div class="row" style={{ justifyContent: 'center' }}>
            <button class="btn ghost" onClick={() => setQuitAsk(false)}>
              Keep fighting
            </button>
            <button
              class="btn danger"
              onClick={() => onEnd({ won: false, wrong: wrongAll, grit: gritAll })}
            >
              Run!
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/** Spec for a regular path encounter or boss node. */
export function specFor(
  opts: Omit<EncounterSpec, 'winReward' | 'tone'> & {
    winReward?: Reward;
    tone?: 'bright' | 'dark';
  },
): EncounterSpec {
  return { ...opts, winReward: opts.winReward ?? {}, tone: opts.tone ?? 'bright' };
}
