/**
 * The universal problem card used by lessons, battles, chests and bridges.
 *
 * Flow: answer → right (celebrate, auto-continue) | nudge (a "close, check this" hint, try
 * again, no penalty) | wrong (show the worked explanation, then continue).
 * Give it a `key` per problem so its state resets.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Problem } from '../../skills/types';
import { judge, parseNumber, type Verdict } from '../../engine/answer';
import type { Outcome } from '../../engine/mastery';
import { MathBig, Rich, RichInline } from './Rich';
import { WidgetView } from '../widgets';
import { sfx } from '../../audio/sfx';
import { fmt } from '../../skills/util';

const PRAISE = [
  'Boom!',
  'Nailed it!',
  'Smashing!',
  'Correct-o-mundo!',
  'Yes! Yes! YES!',
  'Grimble is impressed.',
  'Unboxed!',
  'Big brain energy!',
  'Perfect!',
];
const OOPS = ['Not quite!', 'Oof — not this time.', 'The goblins snicker…', 'Whoops!'];

export interface ProblemCardProps {
  problem: Problem;
  /** Called once the player is done with this problem. */
  onResult: (outcome: Outcome) => void;
  /** Called the moment an answer is judged (for battle animations). */
  onVerdict?: (v: Verdict) => void;
  /** 'free': hint button always works. 'paid': calls onHint, which may refuse. */
  hint?: 'free' | 'paid' | 'none';
  onHint?: () => boolean;
  hintLabel?: string;
}

export function ProblemCard({
  problem,
  onResult,
  onVerdict,
  hint = 'free',
  onHint,
  hintLabel,
}: ProblemCardProps) {
  const [phase, setPhase] = useState<'ask' | 'nudge' | 'right' | 'wrong'>('ask');
  const [nudged, setNudged] = useState(false);
  const [nudgeText, setNudgeText] = useState('');
  const [input, setInput] = useState('');
  const [picked, setPicked] = useState<Record<number, 'nudge' | 'wrong' | 'right'>>({});
  const [showHint, setShowHint] = useState(false);
  const praise = useMemo(() => PRAISE[Math.floor(Math.random() * PRAISE.length)], [problem]);
  const oops = useMemo(() => OOPS[Math.floor(Math.random() * OOPS.length)], [problem]);
  const done = phase === 'right' || phase === 'wrong';

  const finish = () => onResult(phase === 'right' ? (nudged ? 'nudged' : 'right') : 'wrong');

  const apply = (v: Verdict, pickedIndex?: number) => {
    onVerdict?.(v);
    if (v.kind === 'right') {
      sfx('right');
      setPhase('right');
      if (pickedIndex !== undefined) setPicked((p) => ({ ...p, [pickedIndex]: 'right' }));
    } else if (v.kind === 'nudge') {
      sfx('nudge');
      setNudged(true);
      setNudgeText(v.text);
      setPhase('nudge');
      if (pickedIndex !== undefined) setPicked((p) => ({ ...p, [pickedIndex]: 'nudge' }));
    } else {
      sfx('wrong');
      setPhase('wrong');
      if (pickedIndex !== undefined) setPicked((p) => ({ ...p, [pickedIndex]: 'wrong' }));
    }
  };

  // Auto-advance after a right answer.
  useEffect(() => {
    if (phase !== 'right') return;
    const t = setTimeout(finish, 1300);
    return () => clearTimeout(t);
  }, [phase]);

  const submitNumber = () => {
    if (done) return;
    const n = parseNumber(input);
    if (Number.isNaN(n)) return;
    apply(judge(problem, n, nudged));
  };

  const pick = (i: number) => {
    if (done || picked[i]) return;
    apply(judge(problem, i, nudged), i);
  };

  const press = (k: string) => {
    if (done) return;
    sfx('click');
    if (phase === 'nudge') setPhase('ask');
    setInput((s) => {
      if (k === '⌫') return s.slice(0, -1);
      if (k === '−') return s.startsWith('-') ? s.slice(1) : '-' + s;
      if (k === '.') return s.includes('.') ? s : s === '' || s === '-' ? s + '0.' : s + '.';
      if (s.replace(/[-.]/g, '').length >= 12) return s;
      return s === '0' ? k : s === '-0' ? '-' + k : s + k;
    });
  };

  // Physical keyboard support.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (done) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          finish();
        }
        return;
      }
      if (problem.answer.kind === 'number') {
        if (/^[0-9]$/.test(e.key)) press(e.key);
        else if (e.key === '.' || e.key === ',') press('.');
        else if (e.key === '-') press('−');
        else if (e.key === 'Backspace') press('⌫');
        else if (e.key === 'Enter') submitNumber();
      } else {
        const idx = 'abcd1234'.indexOf(e.key.toLowerCase()) % 4;
        if (idx >= 0 && idx < problem.answer.options.length) pick(idx);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const useHint = () => {
    if (showHint) return;
    if (hint === 'paid' && onHint && !onHint()) return;
    sfx('page');
    setShowHint(true);
  };

  const rightAnswerText =
    problem.answer.kind === 'number'
      ? `$${fmt(problem.answer.value)}$`
      : problem.answer.options[problem.answer.correct];

  const boxState =
    phase === 'right' ? 'right' : phase === 'wrong' ? 'wrong' : phase === 'nudge' ? 'nudge' : '';

  return (
    <div class="card problem-card" style={{ animation: 'pop-in .25s ease-out' }}>
      <Rich text={problem.prompt} class="problem-prompt" />
      {problem.math && <MathBig tex={problem.math} />}
      {problem.visual && (
        <div style={{ margin: '6px 0' }}>
          <WidgetView w={problem.visual} interactive={false} quiz />
        </div>
      )}

      {problem.answer.kind === 'choice' ? (
        <div class="choices">
          {problem.answer.options.map((o, i) => {
            const st = picked[i];
            const reveal =
              phase === 'wrong' && problem.answer.kind === 'choice' && i === problem.answer.correct;
            return (
              <button
                key={i}
                class={`choice ${st ? `picked-${st}` : ''} ${reveal ? 'reveal' : ''}`}
                disabled={done || !!st}
                onClick={() => pick(i)}
              >
                <span class="letter">{'ABCD'[i]}</span>
                <span>
                  <RichInline text={o} />
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <div class="answer-row">
            <div class={`answer-box ${input === '' ? 'empty' : ''} ${boxState}`}>
              {input.replace('-', '−')}
              {!done && input !== '' && <span class="caret" />}
            </div>
          </div>
          {!done && (
            <div class="keypad">
              {['7', '8', '9', '⌫', '4', '5', '6', '−', '1', '2', '3', '.', '0'].map((k) => (
                <button
                  key={k}
                  class={`key ${/[0-9]/.test(k) ? '' : 'fn'}`}
                  onClick={() => press(k)}
                  style={k === '0' ? { gridColumn: 'span 3' } : undefined}
                >
                  {k}
                </button>
              ))}
              <button
                class="key go"
                style={{ gridRow: 'auto' }}
                onClick={submitNumber}
                disabled={input === '' || input === '-'}
              >
                ✓
              </button>
            </div>
          )}
        </>
      )}

      {phase === 'nudge' && (
        <div class="feedback nudge">
          <div class="title">🤔 Hmm, almost!</div>
          <Rich text={nudgeText} />
          <div style={{ marginTop: '4px', fontSize: '.95rem', opacity: 0.8 }}>
            Try again — no penalty!
          </div>
        </div>
      )}
      {showHint && problem.hint && phase !== 'right' && phase !== 'wrong' && (
        <div class="feedback hint">
          <div class="title">📜 Hint</div>
          <Rich text={problem.hint} />
        </div>
      )}
      {phase === 'right' && (
        <div class="feedback right" onClick={finish}>
          <div class="title">✨ {praise}</div>
          {nudged && <div>Good save!</div>}
        </div>
      )}
      {phase === 'wrong' && (
        <div class="feedback wrong">
          <div class="title">
            {oops} The answer is <RichInline text={rightAnswerText} />
          </div>
          <Rich text={problem.explain} />
        </div>
      )}

      <div class="row" style={{ marginTop: '12px', justifyContent: 'flex-end' }}>
        {!done && hint !== 'none' && problem.hint && !showHint && (
          <button
            class="btn small ghost"
            style={{ color: 'var(--card-ink)', background: '#efe4c6' }}
            onClick={useHint}
          >
            {hintLabel ?? '📜 Hint'}
          </button>
        )}
        {phase === 'wrong' && (
          <button class="btn mint" onClick={finish}>
            Got it →
          </button>
        )}
        {phase === 'right' && (
          <button class="btn mint" onClick={finish}>
            Continue →
          </button>
        )}
      </div>
    </div>
  );
}
