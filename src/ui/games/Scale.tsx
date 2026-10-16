/**
 * Mini-games for The Order of Magnitude:
 *  - SizeLine (the Scale Ladder): put real things on a ladder where every rung is ten times
 *    the one below — from atoms to galaxies. Wrong rungs say how many times too big or small.
 *  - Sampler: a crowd of dots too big to count. Count one patch, multiply by the number of
 *    patches, then see how close the estimate was.
 */
import { useMemo, useState } from 'preact/hooks';
import type { Widget } from '../../content/schema';
import type { Outcome } from '../../engine/mastery';
import { sizeById } from '../../content';
import {
  samplerCounts,
  samplerDots,
  samplerSteps,
  sizeExp,
  sizeRange,
  sizeVerdict,
  stopLabel,
  type Verdict,
} from '../../games';
import { renderMath } from '../math';
import { sfx } from '../../audio/sfx';
import { ChainGame } from './Chain';
import { ding, Say, ShowMe, useScore, type GameProps } from './kit';

type SizeSpec = Extract<Widget, { kind: 'sizeline' }>;

export function SizeLine({ spec, onDone, still }: GameProps<SizeSpec>) {
  const [lo, hi] = useMemo(() => {
    const [a, b] = sizeRange(spec.items);
    return [spec.min ?? Math.min(a, b - 5), spec.max ?? b];
  }, [spec]);
  const score = useScore(onDone);
  const [placed, setPlaced] = useState<Record<string, number>>(() =>
    still ? Object.fromEntries(spec.items.map((id) => [id, sizeExp(sizeById[id].m)])) : {},
  );
  const [pick, setPick] = useState<string | null>(spec.items[0]);
  const [v, setV] = useState<Verdict | null>(null);
  const [misses, setMisses] = useState(0);
  const [shake, setShake] = useState<number | null>(null);
  const left = spec.items.filter((id) => placed[id] === undefined);

  const place = (id: string, e: number, shown = false) => {
    const next = { ...placed, [id]: e };
    setPlaced(next);
    setMisses(0);
    const rest = spec.items.filter((x) => next[x] === undefined);
    setPick(rest[0] ?? null);
    if (rest.length === 0) {
      sfx('win');
      score.finish();
    }
    return shown;
  };

  const tapRung = (e: number) => {
    if (still || score.over || !pick) return;
    const verdict = sizeVerdict(pick, e);
    ding(verdict.ok);
    setV(verdict);
    if (verdict.ok) place(pick, e);
    else {
      score.slip();
      setMisses(misses + 1);
      setShake(e);
      setTimeout(() => setShake(null), 500);
    }
  };

  const rungs = [];
  for (let e = hi; e >= lo; e--) rungs.push(e);
  return (
    <div class="sizeline">
      {!still && left.length > 0 && (
        <div class="size-tray">
          {left.map((id) => {
            const c = sizeById[id];
            return (
              <button
                key={id}
                class={`size-chip ${pick === id ? 'on' : ''}`}
                onClick={() => {
                  sfx('click');
                  setPick(id);
                }}
              >
                <span class="size-icon">{c.icon}</span> {c.name}
              </button>
            );
          })}
        </div>
      )}
      {!still && pick && (
        <div class="game-hud">
          Where does <b>{sizeById[pick].icon} {sizeById[pick].name}</b> go? <span class="muted">({sizeById[pick].what})</span>
        </div>
      )}
      <div class="size-ladder" role="list">
        {rungs.map((e) => {
          const here = spec.items.filter((id) => placed[id] === e);
          return (
            <button
              key={e}
              class={`rung ${shake === e ? 'shake' : ''} ${here.length ? 'filled' : ''}`}
              onClick={() => tapRung(e)}
              disabled={still || score.over}
              role="listitem"
            >
              <span
                class="rung-pow"
                dangerouslySetInnerHTML={{ __html: renderMath(`10^{${e}}\\,\\text{m}`) }}
              />
              <span class="rung-label">{stopLabel(e)}</span>
              <span class="rung-items">
                {here.map((id) => (
                  <span key={id} class="rung-item" title={sizeById[id].name}>
                    {sizeById[id].icon}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <Say v={v} />
      {!still && !score.over && pick && (
        <div class="row center-row">
          <ShowMe
            misses={misses}
            onClick={() => {
              score.showMe();
              const e = sizeExp(sizeById[pick].m);
              setV(sizeVerdict(pick, e));
              place(pick, e, true);
            }}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

type SamplerSpec = Extract<Widget, { kind: 'sampler' }>;

export function Sampler({ spec, onDone, still }: GameProps<SamplerSpec>) {
  const dots = useMemo(() => samplerDots(spec), [spec]);
  const counts = useMemo(() => samplerCounts(spec), [spec]);
  const [patch, setPatch] = useState<number | null>(null);
  const [result, setResult] = useState<{ o: Outcome; est: number } | null>(null);
  const g = spec.grid;
  const W = 600;
  const cw = W / g;
  const icon = spec.icon;
  return (
    <div class="sampler">
      <div class="game-hud">
        {patch === null
          ? `About how many? Way too many to count… Tap ONE patch to count just that.`
          : `This patch has ${counts[patch]}.`}
      </div>
      <svg viewBox={`0 0 ${W} ${W}`} class="sampler-svg">
        {Array.from({ length: g * g }, (_, i) => (
          <rect
            key={i}
            x={(i % g) * cw}
            y={Math.floor(i / g) * cw}
            width={cw}
            height={cw}
            class={`patch ${patch === i ? 'on' : ''}`}
            onClick={() => {
              if (still || patch !== null) return;
              sfx('pop');
              setPatch(i);
            }}
          />
        ))}
        {dots.map((d, i) => {
          const cx = (d.cell % g) * cw + d.x * cw;
          const cy = Math.floor(d.cell / g) * cw + d.y * cw;
          return icon ? (
            <text key={i} x={cx} y={cy} font-size={cw / 6} text-anchor="middle" class={`dot ${patch === d.cell ? 'counted' : ''}`}>
              {icon}
            </text>
          ) : (
            <circle key={i} cx={cx} cy={cy} r={Math.max(2.5, cw / 26)} class={`dot ${patch === d.cell ? 'counted' : ''}`} />
          );
        })}
      </svg>
      {patch !== null && !still && (
        <ChainGame
          spec={{ kind: 'chain', steps: samplerSteps(g, counts[patch]) }}
          onDone={(o) => {
            const est = counts[patch] * g * g;
            setResult({ o, est });
            setTimeout(() => onDone?.(o), 50);
          }}
        />
      )}
      {result && (
        <div class="feedback right">
          <div class="title">🎯 The real count: {spec.n}</div>
          Your estimate: {result.est} —{' '}
          {Math.round((Math.abs(result.est - spec.n) / spec.n) * 100) <= 2
            ? 'practically spot on!'
            : `only ${Math.round((Math.abs(result.est - spec.n) / spec.n) * 100)}% off, without counting ${spec.n - counts[patch!]} of them.`}
        </div>
      )}
    </div>
  );
}
