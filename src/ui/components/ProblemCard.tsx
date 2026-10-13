/**
 * The universal problem card used by lessons, battles, chests, bridges, sieges and vaults.
 *
 * Answer formats: multiple choice, number (keypad, or place-value dials), put-in-order, and
 * tap-on-the-number-line.
 *
 * Flow: answer → right (celebrate, auto-continue) | nudge (a "close, check this" hint, try
 * again, no penalty) | wrong (show the worked explanation, then continue).
 * Give it a `key` per problem so its state resets.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { DialsEntry, Problem } from '../../skills/types';
import { judge, parseNumber, type Verdict } from '../../engine/answer';
import type { Outcome } from '../../engine/mastery';
import { MathBig, Rich, RichInline } from './Rich';
import { WidgetView } from '../widgets';
import { NumberLineSvg } from '../widgets/NumberLine';
import { sfx } from '../../audio/sfx';
import { group, PLACE_SHORT, pow10 } from '../../skills/place';

const PRAISE_BRIGHT = [
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
const OOPS_BRIGHT = ['Not quite!', 'Oof — not this time.', 'The goblins snicker…', 'Whoops!'];
const PRAISE_DARK = [
  'Clean hit.',
  'Exactly right.',
  'Sharp.',
  'Nailed it!',
  'Correct.',
  'That is how it is done.',
  'Spot on.',
  'Well reckoned.',
  'Perfect!',
];
const OOPS_DARK = ['Not quite.', 'Missed.', 'Not this time.', 'Wide of the mark.'];

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
  /** Multiple-choice options ruled out (a Scout's Lens). */
  eliminated?: number[];
  /** Voice of the feedback: the bright kingdom or the grim North. */
  tone?: 'bright' | 'dark';
}

/** Keypad input shown with thousands separators: "2040006" → "2,040,006". */
export function displayInput(s: string): string {
  const neg = s.startsWith('-');
  const body = neg ? s.slice(1) : s;
  const [int, frac] = body.split('.');
  const g = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (neg ? '−' : '') + g + (body.includes('.') ? '.' + (frac ?? '') : '');
}

function dialsValue(d: number[], e: DialsEntry): number {
  let v = 0;
  d.forEach((digit, i) => (v += digit * pow10(e.int - 1 - i)));
  return Math.round(v * 1000) / 1000;
}

function Dials({
  entry,
  digits,
  set,
  locked,
  state,
}: {
  entry: DialsEntry;
  digits: number[];
  set: (d: number[]) => void;
  locked: boolean;
  state: string;
}) {
  const places = Array.from({ length: digits.length }, (_, i) => entry.int - 1 - i);
  const turn = (i: number, by: number) => {
    if (locked) return;
    sfx('click');
    const n = digits.slice();
    n[i] = (n[i] + by + 10) % 10;
    set(n);
  };
  return (
    <div class={`dials ${state}`}>
      {places.map((p, i) => (
        <div key={p} class={`dial ${p < 0 ? 'dec' : ''} ${p % 3 === 2 && p > 0 ? 'period' : ''}`}>
          {p === -1 && <span class="dial-point">.</span>}
          <div class="dial-head">{PLACE_SHORT[p]}</div>
          <button
            class="dial-btn"
            aria-label={`up ${PLACE_SHORT[p]}`}
            onClick={() => turn(i, 1)}
            disabled={locked}
          >
            ▲
          </button>
          <div class="dial-digit">{digits[i]}</div>
          <button
            class="dial-btn"
            aria-label={`down ${PLACE_SHORT[p]}`}
            onClick={() => turn(i, -1)}
            disabled={locked}
          >
            ▼
          </button>
        </div>
      ))}
    </div>
  );
}

export function ProblemCard({
  problem,
  onResult,
  onVerdict,
  hint = 'free',
  onHint,
  hintLabel,
  eliminated = [],
  tone = 'bright',
}: ProblemCardProps) {
  const PRAISE = tone === 'dark' ? PRAISE_DARK : PRAISE_BRIGHT;
  const OOPS = tone === 'dark' ? OOPS_DARK : OOPS_BRIGHT;
  const [phase, setPhase] = useState<'ask' | 'nudge' | 'right' | 'wrong'>('ask');
  const [nudged, setNudged] = useState(false);
  const [nudgeText, setNudgeText] = useState('');
  const [input, setInput] = useState('');
  const [picked, setPicked] = useState<Record<number, 'nudge' | 'wrong' | 'right'>>({});
  const [showHint, setShowHint] = useState(false);
  const entry = problem.answer.kind === 'number' ? problem.entry : undefined;
  const [dials, setDials] = useState<number[]>(() =>
    entry ? Array(entry.int + (entry.dec ?? 0)).fill(0) : [],
  );
  const [order, setOrder] = useState<number[]>([]);
  const [linePick, setLinePick] = useState<number | null>(null);
  const praise = useMemo(() => PRAISE[Math.floor(Math.random() * PRAISE.length)], [problem]);
  const oops = useMemo(() => OOPS[Math.floor(Math.random() * OOPS.length)], [problem]);
  const done = phase === 'right' || phase === 'wrong';
  const a = problem.answer;

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
    const n = entry ? dialsValue(dials, entry) : parseNumber(input);
    if (Number.isNaN(n)) return;
    apply(judge(problem, n, nudged));
  };

  const submitOrder = () => {
    if (done || a.kind !== 'order' || order.length < a.items.length) return;
    const v = judge(problem, order, nudged);
    apply(v);
    if (v.kind === 'nudge') setOrder([]);
  };

  const submitLine = () => {
    if (done || linePick === null) return;
    apply(judge(problem, linePick, nudged));
  };

  const pick = (i: number) => {
    if (done || picked[i] || eliminated.includes(i)) return;
    apply(judge(problem, i, nudged), i);
  };

  const press = (k: string) => {
    if (done) return;
    sfx('click');
    if (phase === 'nudge') setPhase('ask');
    if (entry) {
      // Calculator style: digits slide in from the right.
      if (/^[0-9]$/.test(k)) setDials((d) => [...d.slice(1), Number(k)]);
      else if (k === '⌫') setDials((d) => [0, ...d.slice(0, -1)]);
      return;
    }
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
      if (a.kind === 'number') {
        if (/^[0-9]$/.test(e.key)) press(e.key);
        else if (e.key === '.' || e.key === ',') press('.');
        else if (e.key === '-') press('−');
        else if (e.key === 'Backspace') press('⌫');
        else if (e.key === 'Enter') submitNumber();
      } else if (a.kind === 'choice') {
        const idx = 'abcd1234'.indexOf(e.key.toLowerCase()) % 4;
        if (idx >= 0 && idx < a.options.length) pick(idx);
      } else if (a.kind === 'order' && e.key === 'Enter') submitOrder();
      else if (a.kind === 'line' && e.key === 'Enter') submitLine();
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
    a.kind === 'number'
      ? `$${group(a.value).replace(/,/g, '{,}')}$`
      : a.kind === 'choice'
        ? a.options[a.correct]
        : a.kind === 'line'
          ? `$${group(a.value).replace(/,/g, '{,}')}$`
          : '';

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

      {a.kind === 'choice' && (
        <div class="choices">
          {a.options.map((o, i) => {
            const st = picked[i];
            const gone = eliminated.includes(i);
            const reveal = phase === 'wrong' && i === a.correct;
            return (
              <button
                key={i}
                class={`choice ${st ? `picked-${st}` : ''} ${reveal ? 'reveal' : ''} ${gone ? 'gone' : ''}`}
                disabled={done || !!st || gone}
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
      )}

      {a.kind === 'number' && (
        <>
          {entry ? (
            <>
              <Dials
                entry={entry}
                digits={dials}
                set={(d) => {
                  if (phase === 'nudge') setPhase('ask');
                  setDials(d);
                }}
                locked={done}
                state={boxState}
              />
              <div class="dials-readout">{group(dialsValue(dials, entry))}</div>
              {!done && (
                <div class="row" style={{ justifyContent: 'center', marginTop: '8px' }}>
                  <button class="btn mint" onClick={submitNumber}>
                    🔒 Lock it in
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <div class="answer-row">
                <div class={`answer-box ${input === '' ? 'empty' : ''} ${boxState}`}>
                  {displayInput(input)}
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
        </>
      )}

      {a.kind === 'order' && (
        <div class="order-q">
          <div class="order-dir">{a.direction}</div>
          <div class="order-slots">
            {a.items.map((_, k) => {
              const item = order[k];
              return (
                <button
                  key={k}
                  class={`order-slot ${item === undefined ? 'empty' : ''} ${boxState}`}
                  disabled={done || item === undefined}
                  onClick={() => {
                    sfx('click');
                    if (phase === 'nudge') setPhase('ask');
                    setOrder(order.filter((_, j) => j !== k));
                  }}
                >
                  <span class="order-n">{k + 1}</span>
                  {item !== undefined ? <RichInline text={a.items[item]} /> : '…'}
                </button>
              );
            })}
          </div>
          {!done && (
            <div class="order-pool">
              {a.items.map((it, i) =>
                order.includes(i) ? null : (
                  <button
                    key={i}
                    class="choice order-item"
                    onClick={() => {
                      sfx('click');
                      if (phase === 'nudge') setPhase('ask');
                      setOrder([...order, i]);
                    }}
                  >
                    <RichInline text={it} />
                  </button>
                ),
              )}
            </div>
          )}
          {!done && (
            <div class="row" style={{ justifyContent: 'center', marginTop: '10px' }}>
              <button
                class="btn mint"
                disabled={order.length < a.items.length}
                onClick={submitOrder}
              >
                ✓ Check the order
              </button>
            </div>
          )}
          {phase === 'wrong' && (
            <div class="order-right">
              Right order:{' '}
              {a.correct.map((i, k) => (
                <span key={k}>
                  {k > 0 && <b> → </b>}
                  <RichInline text={a.items[i]} />
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {a.kind === 'line' && (
        <div class="line-q">
          <NumberLineSvg
            min={a.min}
            max={a.max}
            step={a.step}
            minor={a.minor}
            labels={a.labels}
            snap={a.snap}
            pick={linePick}
            pickState={boxState as 'right'}
            correct={phase === 'wrong' ? a.value : undefined}
            onPick={
              done
                ? undefined
                : (v) => {
                    if (phase === 'nudge') setPhase('ask');
                    setLinePick(v);
                  }
            }
          />
          <div class="line-readout">
            {linePick === null ? (
              'Tap the line to plant your banner.'
            ) : (
              <>
                Banner at <b>{group(linePick)}</b>
              </>
            )}
          </div>
          {!done && (
            <div class="row" style={{ justifyContent: 'center' }}>
              <button class="btn mint" disabled={linePick === null} onClick={submitLine}>
                🚩 Plant it here
              </button>
            </div>
          )}
        </div>
      )}

      {phase === 'nudge' && (
        <div class="feedback nudge">
          <div class="title">{tone === 'dark' ? '🤔 Close — check this' : '🤔 Hmm, almost!'}</div>
          <Rich text={nudgeText} />
          <div style={{ marginTop: '4px', fontSize: '.95rem', opacity: 0.8 }}>
            {tone === 'dark' ? 'Try again — no penalty.' : 'Try again — no penalty!'}
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
            {oops}
            {rightAnswerText && (
              <>
                {' '}
                The answer is <RichInline text={rightAnswerText} />
              </>
            )}
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
