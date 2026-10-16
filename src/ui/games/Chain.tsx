/**
 * A chain of small steps: mental maths with the working shown. Each step has its own box to
 * fill (or options to pick), its own feedback, a hint after a miss and "Show me" after two.
 * Finished steps stay on screen, so the whole method is written out at the end:
 *
 *   7 × 9 = 7 × 10 − 7   →   70 − 7   →   63
 */
import { useState } from 'preact/hooks';
import type { ChainSpec } from '../../skills/types';
import type { Visual } from '../../skills/types';
import { stepVerdict, type Verdict } from '../../games';
import { parseNumber } from '../../engine/answer';
import { fmt } from '../../skills/util';
import { renderMath } from '../math';
import { Rich, RichInline } from '../components/Rich';
import { MiniPad } from '../components/MiniPad';
import { WidgetView } from '../widgets';
import { ding, Say, ShowMe, useScore, type GameProps } from './kit';

const fill = (tex: string, v: string) => tex.replace(/\\box/g, v);

export function ChainGame({ spec, onDone, still }: GameProps<ChainSpec>) {
  const score = useScore(onDone);
  const [at, setAt] = useState(still ? spec.steps.length : 0);
  const [val, setVal] = useState('');
  const [v, setV] = useState<Verdict | null>(null);
  const [misses, setMisses] = useState(0);
  const [hint, setHint] = useState(false);
  const step = spec.steps[at];
  const pic = (spec.pics?.[Math.min(at, (spec.pics?.length ?? 1) - 1)] ?? null) as Visual | null;

  const next = (verdict: Verdict) => {
    setV(verdict);
    setVal('');
    setMisses(0);
    setHint(false);
    if (at + 1 >= spec.steps.length) {
      setAt(at + 1);
      score.finish();
    } else setAt(at + 1);
  };

  const submit = (given: number) => {
    if (!step) return;
    const verdict = stepVerdict(step, given);
    ding(verdict.ok);
    if (verdict.ok) next(verdict);
    else {
      score.slip();
      setMisses(misses + 1);
      setV(verdict);
      setVal('');
    }
  };

  const showMe = () => {
    if (!step) return;
    score.showMe();
    next({
      ok: true,
      text: `It's ${step.options ? step.options[step.answer] : `$${fmt(step.answer)}$`}. ${step.note ?? ''}`,
    });
  };

  return (
    <div class="chain-game">
      {pic && (
        <div class="chain-pic">
          <WidgetView w={pic} interactive={false} />
        </div>
      )}
      <div class="chain-steps">
        {spec.steps.map((s, i) => {
          if (i > at) return null;
          const done = i < at;
          const box = done
            ? `\\good{${s.options ? '\\checkmark' : fmt(s.answer)}}`
            : `\\hl{\\boxed{${val === '' ? '\;?\;' : val.replace('-', '−')}}}`;
          return (
            <div key={i} class={`chain-step ${done ? 'done' : 'now'}`}>
              {s.say && !done && <Rich text={s.say} class="chain-say" />}
              <div
                class="math-big chain-math"
                dangerouslySetInnerHTML={{ __html: renderMath(fill(s.tex, box), true) }}
              />
              {done && s.options && (
                <div class="chain-picked">
                  <RichInline text={s.options[s.answer]} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {step && !still && (
        <div class="chain-input">
          {step.options ? (
            <div class="choices">
              {step.options.map((o, i) => (
                <button key={i} class="choice" onClick={() => submit(i)}>
                  <span class="letter">{'ABCD'[i]}</span>
                  <RichInline text={o} />
                </button>
              ))}
            </div>
          ) : (
            <MiniPad
              value={val}
              set={(x) => {
                setVal(x);
                if (v && !v.ok) setV(null);
              }}
              onGo={(x) => {
                const n = parseNumber(x);
                if (!Number.isNaN(n)) submit(n);
              }}
            />
          )}
        </div>
      )}
      <Say v={v} />
      {step && !still && (
        <div class="row" style={{ justifyContent: 'flex-end', gap: '8px' }}>
          {misses > 0 && step.hint && !hint && (
            <button class="btn small ghost" onClick={() => setHint(true)}>
              📜 Hint
            </button>
          )}
          <ShowMe misses={misses} onClick={showMe} />
        </div>
      )}
      {hint && step?.hint && (
        <div class="feedback hint">
          <Rich text={step.hint} />
        </div>
      )}
    </div>
  );
}
