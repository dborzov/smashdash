/**
 * Plays a lesson or story: a sequence of beats (dialogue, explanations, quick checks,
 * interactive widgets, inline practice). Checks never cost hearts — lessons are a safe place.
 */
import { useMemo, useState } from 'preact/hooks';
import type { Beat, Lesson, Widget } from '../../content/schema';
import type { Problem, Visual } from '../../skills/types';
import { Rng, hashString } from '../../engine/rng';
import { generateFor } from '../../skills';
import type { Outcome, Tier } from '../../engine/mastery';
import { getProfile, update } from '../../engine/store';
import { answerEffects } from '../../engine/play';
import { applyResult, isOver, newRun, pickNext, type RunEvent } from '../../engine/adaptive';
import { RunBar, RunNews } from '../components/RunBar';
import { Scene } from '../../art/scenes';
import { Dialogue, TypeText } from '../components/Dialogue';
import { ProblemCard } from '../components/ProblemCard';
import { Bar, Modal } from '../components/Bits';
import { MathBig, Rich } from '../components/Rich';
import { WidgetView } from '../widgets';
import { Portrait } from '../../art/Portrait';
import { Egg } from '../../art/Pet';
import { cast, itemById } from '../../content';
import { factWeights } from '../../engine/facts';
import { collectCards } from '../../engine/cards';
import { sfx } from '../../audio/sfx';

/** Fills `{region}`, `{boss}`… in a lesson's text (for stories shared by many regions). */
export function fillLesson(lesson: Lesson, vars: Record<string, string>): Lesson {
  let json = JSON.stringify(lesson);
  for (const [k, v] of Object.entries(vars)) json = json.split(`{${k}}`).join(v.replace(/"/g, '\\"'));
  return JSON.parse(json);
}

/** XP for quick checks inside lessons (smaller than practice). */
const CHECK_XP = { right: 5, nudged: 3, wrong: 0 };
const PRACTICE_XP = { right: 10, nudged: 6, wrong: 0 };

export interface LessonResult {
  right: number;
  wrong: number;
  rewards: Extract<Beat, { type: 'reward' }>[];
}

/** Widgets that work as a still picture next to a question. */
const PICTURES = new Set([
  'boxes',
  'balance',
  'groups',
  'area',
  'plot',
  'circuit',
  'placechart',
  'numberline',
  'decgrid',
  'array',
  'matchsticks',
  'tablegrid',
  'balloon',
]);
function asVisual(w: Widget | undefined): Visual | undefined {
  return w && PICTURES.has(w.kind) ? ({ ...w } as Visual) : undefined;
}

function beatToProblem(
  b: Extract<Beat, { type: 'ask' | 'input' | 'order' }>,
  skill: string,
  seed: number,
): Problem {
  const atoms = b.atom ? [b.atom] : [];
  if (b.type === 'input') {
    return {
      skill,
      atoms,
      prompt: b.text,
      math: b.math,
      visual: asVisual(b.widget),
      answer: { kind: 'number', value: b.answer },
      entry: b.dials ? { kind: 'dials', int: b.dials.int, dec: b.dials.dec } : undefined,
      nudges: (b.nudges ?? []).map((n) => ({ match: n.value, text: n.text })),
      hint: b.hint,
      explain: b.explain,
    };
  }
  if (b.type === 'order') {
    // Shuffle the items so they don't start in the right order.
    const rng = new Rng(seed);
    let perm = rng.shuffle(b.items.map((_, i) => i));
    if (perm.every((x, i) => x === b.correct[i])) perm = perm.reverse();
    const at = (orig: number) => perm.indexOf(orig);
    return {
      skill,
      atoms,
      prompt: b.text,
      answer: {
        kind: 'order',
        items: perm.map((i) => b.items[i]),
        correct: b.correct.map(at),
        direction: b.direction,
        traps: b.traps?.map((t) => ({ order: t.order.map(at), text: t.text })),
      },
      explain: b.explain,
    };
  }
  // Shuffle options so the right answer isn't always where the author wrote it.
  const order = new Rng(seed).shuffle(b.options.map((_, i) => i));
  return {
    skill,
    atoms,
    prompt: b.text,
    math: b.math,
    visual: asVisual(b.widget),
    answer: {
      kind: 'choice',
      options: order.map((i) => b.options[i]),
      correct: order.indexOf(b.correct),
    },
    nudges: Object.entries(b.nudges ?? {}).map(([k, text]) => ({
      match: order.indexOf(Number(k)),
      text,
    })),
    explain: b.explain,
  };
}

function Speaker({ who }: { who?: string }) {
  if (!who) return null;
  const c = cast[who];
  return (
    <div class="row" style={{ marginBottom: '8px' }}>
      <div
        class="portrait"
        style={
          {
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            animation: 'none',
            '--who': c?.color,
          } as Record<string, string>
        }
      >
        <Portrait who={who} profile={getProfile()} />
      </div>
      <b style={{ fontFamily: 'var(--font-display)', color: c?.color ?? 'var(--gold)' }}>
        {who === 'hero' ? getProfile()?.hero.name : c?.name}
      </b>
    </div>
  );
}

function Continue({
  onClick,
  label = 'Continue →',
  disabled,
}: {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <div class="row" style={{ justifyContent: 'flex-end', marginTop: '14px' }}>
      <button
        class="btn gold big"
        disabled={disabled}
        onClick={() => {
          sfx('page');
          onClick();
        }}
      >
        {label}
      </button>
    </div>
  );
}

type OnAnswer = (
  skill: string,
  o: Outcome,
  practice: boolean,
  atoms: string[],
  level?: Tier,
  events?: RunEvent[],
  about?: Pick<Problem, 'facts' | 'cards'>,
) => void;

/** Generated practice inside a lesson: an adaptive run (mistakes add extra practice). */
function PracticeBeat({
  beat,
  onAnswer,
  onDone,
  tone,
}: {
  beat: Extract<Beat, { type: 'practice' }>;
  onAnswer: OnAnswer;
  onDone: () => void;
  tone: 'bright' | 'dark';
}) {
  const [rng] = useState(() => new Rng(Math.floor(Math.random() * 1e9)));
  const [run] = useState(() => newRun(getProfile()!, [beat.skill], beat.count, rng));
  const [n, setN] = useState(0);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const q = useMemo(() => {
    const p = getProfile()!;
    const nx = pickNext(p, run, rng);
    const level = (beat.level as Tier | undefined) ?? nx.level;
    return {
      level,
      problem: generateFor(nx.skill, level, rng, nx.atom, { factWeights: factWeights(p) }),
    };
  }, [n]);
  return (
    <div>
      <div class="row wrap" style={{ marginBottom: '8px' }}>
        <RunBar run={run} icon="🏋️" />
        {beat.text && n === 0 && <span class="muted">{beat.text}</span>}
      </div>
      <RunNews events={events} dark={tone === 'dark'} />
      <ProblemCard
        key={n}
        tone={tone}
        problem={q.problem}
        onResult={(o) => {
          const ev = applyResult(getProfile()!, run, beat.skill, q.problem.atoms, o);
          onAnswer(beat.skill, o, true, q.problem.atoms, q.level, ev, q.problem);
          setEvents(ev);
          if (isOver(run)) onDone();
          else setN(n + 1);
        }}
      />
    </div>
  );
}

function BeatView({
  beat,
  index,
  lessonSkill,
  firstTime,
  onNext,
  onAnswer,
  onPlayed,
  tone,
}: {
  beat: Beat;
  index: number;
  lessonSkill?: string;
  firstTime: boolean;
  onNext: () => void;
  onAnswer: OnAnswer;
  onPlayed: (w: Widget) => void;
  tone: 'bright' | 'dark';
}) {
  const [chosen, setChosen] = useState<number | null>(null);
  const [widgetDone, setWidgetDone] = useState(false);

  switch (beat.type) {
    case 'say':
      return (
        <>
          <Dialogue who={beat.who} text={beat.text} />
          <Continue onClick={onNext} />
        </>
      );
    case 'narrate':
      return (
        <>
          <div class="panel">
            <TypeText text={beat.text} class="narration" />
          </div>
          <Continue onClick={onNext} />
        </>
      );
    case 'show':
      return (
        <>
          <div class="panel">
            <Speaker who={beat.who} />
            {beat.text && <Rich text={beat.text} />}
            {beat.math && <MathBig tex={beat.math} />}
            {beat.widget && <WidgetView w={beat.widget} interactive={false} />}
          </div>
          <Continue onClick={onNext} />
        </>
      );
    case 'ask':
    case 'input':
    case 'order': {
      const problem = beatToProblem(
        beat,
        lessonSkill ?? 'lesson',
        hashString(`${index}${beat.text}`),
      );
      return (
        <>
          <Speaker who={beat.who} />
          <ProblemCard
            problem={problem}
            tone={tone}
            hint={beat.type === 'input' && beat.hint ? 'free' : 'none'}
            onResult={(o) => {
              onAnswer(lessonSkill ?? '', o, false, problem.atoms);
              onNext();
            }}
          />
        </>
      );
    }
    case 'choose':
      return (
        <>
          <Dialogue who={beat.who} text={beat.text} />
          {chosen === null ? (
            <div class="choices">
              {beat.options.map((o, i) => (
                <button
                  key={i}
                  class="choice"
                  onClick={() => {
                    sfx('click');
                    setChosen(i);
                  }}
                >
                  <span class="letter">{'ABCD'[i]}</span>
                  <Rich text={o.text} />
                </button>
              ))}
            </div>
          ) : (
            <>
              <div style={{ marginTop: '12px' }}>
                <Dialogue who="hero" text={beat.options[chosen].text} />
              </div>
              <div style={{ marginTop: '12px' }}>
                <Dialogue
                  who={beat.options[chosen].who ?? beat.who}
                  text={beat.options[chosen].reply}
                />
              </div>
              <Continue onClick={onNext} />
            </>
          )}
        </>
      );
    case 'play':
      return (
        <>
          <Dialogue who={beat.who} text={beat.text} />
          <div class="panel" style={{ marginTop: '12px' }}>
            <WidgetView
              w={beat.widget}
              onDone={() => {
                if (!widgetDone) onPlayed(beat.widget);
                setWidgetDone(true);
              }}
            />
            {widgetDone && beat.done && (
              <div class="feedback right" style={{ marginTop: '12px' }}>
                <Rich text={beat.done} />
              </div>
            )}
          </div>
          <Continue
            onClick={onNext}
            disabled={!widgetDone}
            label={widgetDone ? 'Continue →' : 'Try it first!'}
          />
        </>
      );
    case 'practice':
      return <PracticeBeat beat={beat} onAnswer={onAnswer} onDone={onNext} tone={tone} />;
    case 'reward':
      return (
        <>
          <div class="panel center" style={{ animation: 'pop-in .4s' }}>
            {beat.egg && (
              <div style={{ width: '120px', height: '150px', margin: '0 auto' }}>
                <Egg class="anim-wobble" />
              </div>
            )}
            {beat.gold && <div style={{ fontSize: '4rem' }}>🪙</div>}
            {beat.item && <div style={{ fontSize: '4rem' }}>{itemById[beat.item]?.icon}</div>}
            {beat.text && <h3>{beat.text}</h3>}
            {beat.gold ? (
              <p style={{ color: 'var(--gold)', fontWeight: 700 }}>+{beat.gold} gold</p>
            ) : null}
            {!firstTime && <p class="muted">(You already collected this one.)</p>}
          </div>
          <Continue onClick={onNext} />
        </>
      );
  }
}

export function LessonPlayer({
  lesson,
  scene,
  firstTime,
  onFinish,
  onQuit,
  dry,
  start = 0,
  tone = 'bright',
}: {
  lesson: Lesson;
  scene: string;
  firstTime: boolean;
  /** The campaign's voice (affects feedback lines). */
  tone?: 'bright' | 'dark';
  /** Preview mode: nothing is saved. */
  dry?: boolean;
  /** Beat to start at (preview only: `#/preview/lesson/<id>/<beat>`). */
  start?: number;
  onFinish: (r: LessonResult) => void;
  onQuit: () => void;
}) {
  const [i, setI] = useState(Math.max(0, Math.min(start, lesson.beats.length - 1)));
  const [stats] = useState({ right: 0, wrong: 0 });
  const [quitAsk, setQuitAsk] = useState(false);
  const beat = lesson.beats[i];

  const onAnswer: OnAnswer = (skill, o, practice, atoms, level, events, about) => {
    if (o === 'wrong') stats.wrong++;
    else stats.right++;
    if (dry) return;
    update((p) =>
      answerEffects(p, skill, o, atoms, level, {
        xp: practice ? PRACTICE_XP : CHECK_XP,
        events,
        dark: tone === 'dark',
        facts: about?.facts,
        cards: about?.cards,
      }),
    );
  };

  /** A Scale Ladder played in a lesson collects its cards for the Scale Museum. */
  const onPlayed = (w: Widget) => {
    if (dry || w.kind !== 'sizeline') return;
    update((p) => collectCards(p, w.items));
  };

  const next = () => {
    if (i + 1 >= lesson.beats.length) {
      onFinish({
        ...stats,
        rewards: lesson.beats.filter(
          (b): b is Extract<Beat, { type: 'reward' }> => b.type === 'reward',
        ),
      });
    } else setI(i + 1);
  };

  return (
    <div class="screen">
      <Scene id={scene} dim={0.35} />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 5,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'linear-gradient(rgba(10,6,30,.85), rgba(10,6,30,0))',
        }}
      >
        <button class="icon-btn" onClick={() => setQuitAsk(true)} aria-label="Quit lesson">
          ✕
        </button>
        <div style={{ flex: 1 }}>
          <Bar value={i} max={lesson.beats.length} kind="good" lg />
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>{lesson.title}</span>
      </div>
      <div
        style={{
          position: 'absolute',
          inset: '64px 0 0 0',
          overflowY: 'auto',
          zIndex: 4,
          padding: '12px 16px 28px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div class="content-col" style={{ width: '100%', marginTop: 'auto' }} key={i}>
          <div style={{ animation: 'pop-in .25s ease-out' }}>
            <BeatView
              beat={beat}
              index={i}
              lessonSkill={lesson.skill}
              firstTime={firstTime}
              onNext={next}
              onAnswer={onAnswer}
              onPlayed={onPlayed}
              tone={tone}
            />
          </div>
        </div>
      </div>
      {quitAsk && (
        <Modal onClose={() => setQuitAsk(false)}>
          <h2>Leave the lesson?</h2>
          <p>You'll keep the XP you earned, but you'll have to start the lesson again.</p>
          <div class="row" style={{ justifyContent: 'center' }}>
            <button class="btn ghost" onClick={() => setQuitAsk(false)}>
              Stay
            </button>
            <button class="btn danger" onClick={onQuit}>
              Leave
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
