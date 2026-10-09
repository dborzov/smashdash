/**
 * Practice as a mini-game. Three flavours share the same mechanics:
 *  - battle: each right answer hits the monster; a wrong one and the monster hits you.
 *  - chest:  each right answer opens a lock; a wrong one and the chest (a mimic!) bites.
 *  - bridge: each right answer is a step across; a wrong one breaks a plank.
 * Bosses are battles in phases, with taunts in between.
 * A wrong answer is retried with fresh numbers for the same skill.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Game, Monster } from '../../content/schema';
import { Rng } from '../../engine/rng';
import { generate, levelFor } from '../../skills';
import type { Problem } from '../../skills/types';
import { effectiveMastery, recordAnswer, type Outcome } from '../../engine/mastery';
import { getProfile, update } from '../../engine/store';
import { maxHearts, levelFromXp } from '../../engine/profile';
import { grant, XP, type Reward } from '../../engine/rewards';
import { consume } from '../../engine/items';
import { planProblems, rollLoot, type Loot } from '../../engine/encounters';
import type { Verdict } from '../../engine/answer';
import { Scene } from '../../art/scenes';
import { Avatar } from '../../art/Avatar';
import { MonsterArt } from '../../art/Monster';
import { Muddler } from '../../art/Portrait';
import { ProblemCard } from '../components/ProblemCard';
import { Bar, Hearts, Modal } from '../components/Bits';
import { Confetti } from '../components/Confetti';
import { itemById } from '../../content';
import { sfx } from '../../audio/sfx';

export interface Round {
  skill: string;
  phase: number;
}

export interface EncounterSpec {
  title: string;
  game: Game;
  scene: string;
  monster?: Monster;
  boss?: { intro: string[]; taunts: string[]; defeat: string };
  /** Rounds grouped by phase (bosses have several phases). */
  rounds: Round[];
  /** Loot tier: 1 path fight, 2 wanderer, 3 boss. */
  tier: number;
  /** Extra reward for winning (first-time boss bonus etc). */
  winReward: Reward;
}

export interface EncounterResult {
  won: boolean;
  wrong: number;
  loot?: Loot;
}

/** Builds rounds for a set of skills, chosen by need. */
export function roundsFor(skills: string[], count: number, phase = 0): Round[] {
  const p = getProfile();
  if (!p) return [];
  return planProblems(p, skills, count).map((x) => ({ skill: x.skill, phase }));
}

// --- Opponent art for each game -------------------------------------------------

function ChestArt({ locks, open, biting }: { locks: number; open: number; biting: boolean }) {
  const all = open >= locks;
  return (
    <svg viewBox="0 0 220 180" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      <ellipse cx="110" cy="170" rx="90" ry="10" fill="rgba(0,0,0,.3)" />
      <g
        style={{
          transformOrigin: '110px 70px',
          transform: all ? 'rotate(-18deg) translateY(-14px)' : biting ? 'rotate(-10deg)' : 'none',
          transition: 'transform .3s',
        }}
      >
        <path
          d="M20 70 Q20 20 110 20 Q200 20 200 70 Z"
          fill="#a0602b"
          stroke="#4a2a10"
          stroke-width="5"
        />
        <path
          d="M20 70 Q20 20 110 20 Q200 20 200 70"
          fill="none"
          stroke="#ffd166"
          stroke-width="8"
          opacity=".85"
        />
        {biting && (
          <path
            d="M30 70 L40 84 L50 70 L60 84 L70 70 L80 84 L90 70 L100 84 L110 70 L120 84 L130 70 L140 84 L150 70 L160 84 L170 70 L180 84 L190 70"
            fill="#fff"
            stroke="#4a2a10"
            stroke-width="2"
          />
        )}
      </g>
      {all && (
        <g filter="url(#glowc)">
          <ellipse cx="110" cy="74" rx="70" ry="16" fill="#ffd166" opacity=".9" />
          {[0, 1, 2, 3, 4].map((i) => (
            <circle
              key={i}
              cx={70 + i * 20}
              cy={66 - (i % 2) * 8}
              r="9"
              fill="#ffe27a"
              stroke="#a86b00"
              stroke-width="2"
            />
          ))}
        </g>
      )}
      <rect
        x="20"
        y="70"
        width="180"
        height="90"
        rx="6"
        fill="#b8733a"
        stroke="#4a2a10"
        stroke-width="5"
      />
      {biting && (
        <path
          d="M30 70 L40 58 L50 70 L60 58 L70 70 L80 58 L90 70 L100 58 L110 70 L120 58 L130 70 L140 58 L150 70 L160 58 L170 70 L180 58 L190 70"
          fill="#fff"
          stroke="#4a2a10"
          stroke-width="2"
        />
      )}
      <rect x="20" y="96" width="180" height="10" fill="#ffd166" opacity=".8" />
      {biting && (
        <g>
          <circle cx="70" cy="40" r="10" fill="#fff" stroke="#4a2a10" stroke-width="3" />
          <circle cx="150" cy="40" r="10" fill="#fff" stroke="#4a2a10" stroke-width="3" />
          <circle cx="72" cy="42" r="5" fill="#c2185b" />
          <circle cx="152" cy="42" r="5" fill="#c2185b" />
        </g>
      )}
      {Array.from({ length: locks }, (_, i) => {
        const x = 110 + (i - (locks - 1) / 2) * Math.min(34, 160 / locks);
        const isOpen = i < open;
        return (
          <g key={i} transform={`translate(${x} 128)`} style={{ transition: 'transform .3s' }}>
            <path
              d={
                isOpen
                  ? 'M-7 -8 L-7 -18 Q-7 -26 0 -26 Q7 -26 7 -18 L7 -22'
                  : 'M-7 -8 L-7 -16 Q-7 -24 0 -24 Q7 -24 7 -16 L7 -8'
              }
              fill="none"
              stroke="#9aa4b5"
              stroke-width="4"
            />
            <rect
              x="-11"
              y="-9"
              width="22"
              height="20"
              rx="4"
              fill={isOpen ? '#5ee6a8' : '#ffd166'}
              stroke="#4a2a10"
              stroke-width="2.5"
            />
            <circle cx="0" cy="0" r="3" fill="#4a2a10" />
          </g>
        );
      })}
      <defs>
        <filter id="glowc">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
    </svg>
  );
}

function BridgeArt({ planks, at, broken }: { planks: number; at: number; broken: number[] }) {
  const w = 600;
  const step = w / (planks + 1);
  return (
    <svg
      viewBox={`0 0 ${w + 120} 200`}
      style={{ width: '100%', height: '100%' }}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="chasm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#1a1030" stop-opacity=".2" />
          <stop offset="1" stop-color="#05020f" />
        </linearGradient>
      </defs>
      <rect x="40" y="110" width={w + 40} height="90" fill="url(#chasm)" />
      <path d="M0 110 L60 110 L60 200 L0 200 Z" fill="#4a3a6a" stroke="#1a1030" stroke-width="3" />
      <path
        d={`M${w + 60} 110 L${w + 120} 110 L${w + 120} 200 L${w + 60} 200 Z`}
        fill="#4a3a6a"
        stroke="#1a1030"
        stroke-width="3"
      />
      <path
        d={`M40 92 Q${w / 2 + 60} 140 ${w + 80} 92`}
        fill="none"
        stroke="#c9a24a"
        stroke-width="4"
      />
      {Array.from({ length: planks }, (_, i) => {
        const x = 60 + step * (i + 0.5) + step / 2 - 14;
        const sag = Math.sin(((i + 1) / (planks + 1)) * Math.PI) * 28;
        const isBroken = broken.includes(i);
        return (
          <g
            key={i}
            style={{
              transition: 'transform .5s',
              transform: isBroken ? 'translateY(60px) rotate(25deg)' : 'none',
              transformBox: 'fill-box',
              transformOrigin: 'center',
              opacity: isBroken ? 0.4 : 1,
            }}
          >
            <rect
              x={x}
              y={104 + sag}
              width="28"
              height="14"
              rx="3"
              fill={i < at ? '#5ee6a8' : '#a0703a'}
              stroke="#3a2210"
              stroke-width="2.5"
            />
          </g>
        );
      })}
      <text x={w + 90} y="96" text-anchor="middle" font-size="34">
        🏁
      </text>
    </svg>
  );
}

// --- The encounter ----------------------------------------------------------------

export function EncounterScreen({
  spec,
  onEnd,
}: {
  spec: EncounterSpec;
  onEnd: (r: EncounterResult) => void;
}) {
  const p0 = getProfile()!;
  const hp = maxHearts(p0);
  const rounds = spec.rounds;
  const [i, setI] = useState(0);
  const [hearts, setHearts] = useState(hp);
  const [wrong, setWrong] = useState(0);
  const [phaseShown, setPhaseShown] = useState(0);
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
  const [broken, setBroken] = useState<number[]>([]);
  const [biting, setBiting] = useState(false);
  const [quitAsk, setQuitAsk] = useState(false);
  const seed = useRef(Math.floor(Math.random() * 1e9));
  const fid = useRef(1);

  const total = spec.rounds.length;
  const round = rounds[i];
  const problem: Problem | null = useMemo(() => {
    if (!round) return null;
    const p = getProfile();
    // A wrong answer bumps `wrong`, which gives the same skill again with fresh numbers.
    return generate(
      round.skill,
      levelFor(effectiveMastery(p?.skills[round.skill])),
      new Rng(seed.current + i * 7919 + wrong * 104729),
    );
  }, [i, wrong]);

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
      sfx(spec.game === 'chest' ? 'unlock' : spec.game === 'bridge' ? 'step' : 'hit');
      if (spec.game === 'battle') {
        pulse(setHeroAnim, 'anim-lunge-right');
        setTimeout(() => pulse(setFoeAnim, 'anim-hit'), 160);
        float(['💥', 'POW!', 'BONK!', 'ZAP!', 'WHAM!'][i % 5], 'foe', '#ffd166');
      } else if (spec.game === 'chest') float('🔓 click!', 'foe', '#5ee6a8');
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
      } else {
        setBroken([i]);
        setTimeout(() => setBroken([]), 1200);
        pulse(setHeroAnim, 'anim-hit');
      }
      float('−❤️', 'hero', '#ff6b6b');
    }
  };

  const finishWin = () => {
    const p = getProfile()!;
    const l = rollLoot(new Rng(), spec.tier, levelFromXp(p.hero.xp));
    setLoot(l);
    update((q) => {
      q.stats.wins++;
      return grant(q, {
        xp: XP.winBonus + (spec.winReward.xp ?? 0),
        gold: l.gold + (spec.winReward.gold ?? 0),
        items: { ...l.items, ...(spec.winReward.items ?? {}) },
        egg: spec.winReward.egg,
      });
    });
    sfx('win');
    setStage('won');
  };

  const onResult = (o: Outcome) => {
    update((q) => {
      recordAnswer(q, round.skill, o);
      return grant(q, { xp: o === 'right' ? XP.right : o === 'nudged' ? XP.nudged : 0 });
    });
    if (o === 'wrong') {
      setWrong(wrong + 1);
      const h = hearts - 1;
      setHearts(h);
      if (h <= 0) {
        sfx('lose');
        update((q) => {
          q.stats.losses++;
          q.hero.gold -= Math.min(q.hero.gold, 5 + Math.floor(q.hero.gold * 0.1));
        });
        setStage('lost');
        return;
      }
      return;
    }
    const nextI = i + 1;
    if (nextI >= rounds.length) {
      finishWin();
      return;
    }
    setI(nextI);
    if (spec.boss && rounds[nextI].phase !== round.phase) {
      setPhaseShown(rounds[nextI].phase);
      setStage('taunt');
    }
  };

  const useHeart = () => {
    if (hearts >= hp) return;
    let ok = false;
    update((q) => {
      ok = consume(q, 'heart-potion');
    });
    if (ok) {
      sfx('heal');
      setHearts(hearts + 1);
      float('+❤️', 'hero', '#5ee6a8');
    }
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

  const p = getProfile()!;
  const potions = p.inv['heart-potion'] ?? 0;
  const scrolls = p.inv['hint-scroll'] ?? 0;
  const foeHp = total - i;
  const isMuddler = spec.monster?.art === 'muddler';

  useEffect(() => {
    if (stage === 'intro' || stage === 'taunt') sfx('whoosh');
  }, [stage]);

  const foe =
    spec.game === 'chest' ? (
      <ChestArt locks={total} open={i} biting={biting} />
    ) : isMuddler ? (
      <Muddler />
    ) : spec.monster ? (
      <MonsterArt
        seed={spec.monster.seed}
        hue={spec.monster.hue}
        boss={!!spec.boss}
        hurt={stage === 'won'}
      />
    ) : null;

  return (
    <div class="screen">
      <Scene id={spec.scene} dim={0.2} />
      {/* top bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 6,
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'linear-gradient(rgba(10,6,30,.9), rgba(10,6,30,0))',
        }}
      >
        <button class="icon-btn" onClick={() => setQuitAsk(true)} aria-label="Run away">
          🏃
        </button>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            flex: 1,
            minWidth: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {spec.title}
        </div>
        <Hearts n={hearts} max={hp} />
        <button
          class="btn small ghost"
          disabled={potions === 0 || hearts >= hp || stage !== 'fight'}
          onClick={useHeart}
          title="Drink a heart potion"
        >
          ❤️‍🩹 {potions}
        </button>
        <span class="chip" title="Hint scrolls (use the hint button on a question)">
          📜 {scrolls}
          {freeHint ? ' +1' : ''}
        </span>
      </div>

      {/* arena */}
      <div
        style={{
          position: 'absolute',
          top: '56px',
          left: 0,
          right: 0,
          height: 'clamp(150px, 32vh, 300px)',
          zIndex: 3,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          padding: '0 4vw',
        }}
      >
        {spec.game === 'bridge' ? (
          <div style={{ position: 'relative', width: '100%', maxWidth: '760px', height: '100%' }}>
            <BridgeArt planks={total} at={i} broken={broken} />
            <div
              class={heroAnim}
              style={{
                position: 'absolute',
                bottom: '38%',
                left: `${4 + (i / (total + 1)) * 82}%`,
                width: '14%',
                maxWidth: '90px',
                transition: 'left .5s cubic-bezier(.3,1.4,.5,1)',
              }}
            >
              <Avatar
                look={p.hero.look}
                cls={p.hero.cls}
                hat={p.hero.hat}
                cape={p.hero.cape}
                mood={stage === 'lost' ? 'ko' : 'happy'}
              />
            </div>
            {floats.map((f) => (
              <div
                key={f.id}
                class="float-num"
                style={{ left: `${10 + (i / (total + 1)) * 82}%`, top: '10%', color: f.color }}
              >
                {f.text}
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '760px',
              height: '100%',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
            }}
          >
            <div class={heroAnim} style={{ width: '26%', maxWidth: '170px', height: '92%' }}>
              <Avatar
                look={p.hero.look}
                cls={p.hero.cls}
                hat={p.hero.hat}
                cape={p.hero.cape}
                mood={stage === 'lost' ? 'ko' : heroAnim === 'anim-hit' ? 'hurt' : 'happy'}
              />
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
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 600,
                      fontSize: '.9rem',
                      textAlign: 'center',
                      textShadow: '0 2px 4px #000',
                    }}
                  >
                    {spec.monster?.name}
                  </div>
                  <Bar value={foeHp} max={total} kind="hp" />
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
      <div
        style={{
          position: 'absolute',
          top: 'calc(56px + clamp(150px, 32vh, 300px))',
          left: 0,
          right: 0,
          bottom: 0,
          overflowY: 'auto',
          zIndex: 4,
          padding: '10px 14px 24px',
        }}
      >
        <div class="content-col">
          {stage === 'fight' && problem && (
            <>
              <div class="row" style={{ marginBottom: '6px' }}>
                <span class="chip">
                  {spec.game === 'chest' ? '🔒' : spec.game === 'bridge' ? '🪵' : '⚔️'} {i + 1} /{' '}
                  {total}
                </span>
                {spec.monster?.taunts && spec.game === 'battle' && i > 0 && i % 2 === 0 && (
                  <span class="muted" style={{ fontStyle: 'italic' }}>
                    "{spec.monster.taunts[i % spec.monster.taunts.length]}"
                  </span>
                )}
              </div>
              <ProblemCard
                key={`${i}-${wrong}`}
                problem={problem}
                onResult={onResult}
                onVerdict={onVerdict}
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
                "
                {stage === 'intro'
                  ? spec.boss.intro[introLine]
                  : (spec.boss.taunts[phaseShown] ?? '…')}
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
          <div style={{ fontSize: '3.5rem' }}>
            {spec.game === 'chest' ? '💰' : spec.game === 'bridge' ? '🏁' : '🏆'}
          </div>
          <h2>
            {spec.game === 'chest'
              ? 'Chest unlocked!'
              : spec.game === 'bridge'
                ? 'You made it across!'
                : 'Victory!'}
          </h2>
          {spec.boss && <p style={{ fontStyle: 'italic' }}>"{spec.boss.defeat}"</p>}
          <p>
            {wrong === 0
              ? 'Flawless! Not a single mistake. ⭐⭐⭐'
              : wrong <= 2
                ? 'Nicely done! ⭐⭐'
                : 'You made it! ⭐'}
          </p>
          {loot && (
            <div class="row wrap" style={{ justifyContent: 'center', margin: '10px 0' }}>
              <span class="chip gold" style={{ fontSize: '1.2rem' }}>
                🪙 +{loot.gold + (spec.winReward.gold ?? 0)}
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
          <button
            class="btn gold big"
            onClick={() => onEnd({ won: true, wrong, loot: loot ?? undefined })}
          >
            Collect loot →
          </button>
        </Modal>
      )}
      {stage === 'lost' && (
        <Modal>
          <div style={{ fontSize: '3.5rem' }}>😵</div>
          <h2>Knocked out!</h2>
          <p>
            Grimble drags you back to safety by your boot. You dropped a few coins on the way. The{' '}
            {spec.game === 'chest' ? 'chest' : (spec.monster?.name ?? 'monster')} looks very smug.
          </p>
          <p class="muted">Every mistake makes your brain stronger. Try again — you've got this!</p>
          <button class="btn gold big" onClick={() => onEnd({ won: false, wrong })}>
            Back to safety
          </button>
        </Modal>
      )}
      {quitAsk && (
        <Modal onClose={() => setQuitAsk(false)}>
          <h2>Run away?</h2>
          <p>
            You'll keep the XP you earned, but no loot. The {spec.monster?.name ?? 'monster'} will
            call you a scaredy-cat.
          </p>
          <div class="row" style={{ justifyContent: 'center' }}>
            <button class="btn ghost" onClick={() => setQuitAsk(false)}>
              Keep fighting
            </button>
            <button class="btn danger" onClick={() => onEnd({ won: false, wrong })}>
              Run!
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/** Spec for a regular path encounter or boss node. */
export function specFor(opts: {
  title: string;
  game: Game;
  scene: string;
  monster?: Monster;
  rounds: Round[];
  tier: number;
  winReward?: Reward;
  boss?: EncounterSpec['boss'];
}): EncounterSpec {
  return { ...opts, winReward: opts.winReward ?? {} };
}
