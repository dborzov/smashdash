/**
 * Mini-games for The Muddler Strikes Back:
 *  - Balloon: negative numbers as a hot-air balloon. Balloons lift (+1), sandbags pull (−1).
 *    Taking away a sandbag lifts you: − (−3) = + 3, and you can *see* it. A balloon tied to a
 *    sandbag is a zero pair — it changes nothing, but it lets you take away what you didn't have.
 *  - Sorter: sort terms into piles of like terms, then total each pile.
 *  - Fruit: picture puzzles (simultaneous equations). Every fruit you work out is swapped for its
 *    number in every row — substitution, made visible.
 *  - IneqLine: show an inequality on a number line (dot, open or filled, and which way).
 *  - Matchsticks: a growing pattern, stage by stage.
 */
import { useEffect, useState } from 'preact/hooks';
import type { Widget } from '../../content/schema';
import {
  altitude,
  balloonStart,
  balloonTarget,
  balloonTex,
  balloonVerdict,
  BIN_NAME,
  binVerdict,
  fruitVerdict,
  fruitsIn,
  ineqVerdict,
  parseTerm,
  sortTotals,
  sticks,
  totalsTex,
  type BalloonState,
  type IneqPick,
  type TermKind,
  type Verdict,
} from '../../games';
import { parseNumber } from '../../engine/answer';
import { renderMath } from '../math';
import { RichInline } from '../components/Rich';
import { MiniPad } from '../components/MiniPad';
import { sfx } from '../../audio/sfx';
import { ChainGame } from './Chain';
import { ding, Say, ShowMe, useScore, type GameProps } from './kit';

function Mathy({ tex, class: cls = '' }: { tex: string; class?: string }) {
  return <div class={`math-big game-math ${cls}`} dangerouslySetInnerHTML={{ __html: renderMath(tex, true) }} />;
}

// ---------------------------------------------------------------------------
// Balloon

type BalloonSpec = Extract<Widget, { kind: 'balloon' }>;

export function Balloon({ spec, onDone, still }: GameProps<BalloonSpec>) {
  const score = useScore(onDone);
  const [st, setSt] = useState<BalloonState>(() => balloonStart(spec.start));
  const [log, setLog] = useState<string[]>([]);
  const [v, setV] = useState<Verdict | null>(null);
  const [misses, setMisses] = useState(0);
  const at = altitude(st);
  const target = balloonTarget(spec);
  const H = 360;
  const y = (n: number) => H / 2 - n * 15;

  useEffect(() => {
    if (still) onDone?.('right');
  }, []);

  const act = (db: number, ds: number, what: string) => {
    if (score.over) return;
    const next = { b: st.b + db, s: st.s + ds };
    if (next.b < 0 || next.s < 0 || next.b > 16 || next.s > 16) return;
    sfx(db > 0 || ds < 0 ? 'pop' : 'thud');
    setSt(next);
    setLog([...log, what]);
    if (v && !v.ok) setV(null);
    if (target === null && log.length + 1 >= 4) score.finish();
  };

  const land = () => {
    const verdict = balloonVerdict(spec, at, st);
    ding(verdict.ok);
    setV(verdict.ok ? { ok: true, text: verdict.text ?? `$${balloonTex(spec)} = ${at}$ ✓` } : verdict);
    if (verdict.ok) score.finish();
    else {
      score.slip();
      setMisses(misses + 1);
    }
  };

  return (
    <div class="balloon-game">
      {target !== null && (
        <div class="game-hud">
          Work out <span dangerouslySetInnerHTML={{ __html: renderMath(balloonTex(spec)) }} /> with the balloon. Start at{' '}
          <b>{spec.start}</b>.
        </div>
      )}
      <div class="balloon-stage">
        <svg viewBox={`0 0 260 ${H}`} class="balloon-svg">
          <rect x="0" y={y(0)} width="260" height={H - y(0)} class="canyon" />
          {Array.from({ length: 21 }, (_, i) => {
            const n = i - 10;
            return (
              <g key={n}>
                <line x1="30" x2={n % 5 === 0 ? 50 : 42} y1={y(n)} y2={y(n)} class="tick" />
                {n % 2 === 0 && (
                  <text x="24" y={y(n) + 5} text-anchor="end" class={`tick-label ${n === 0 ? 'zero' : ''}`}>
                    {n}
                  </text>
                )}
              </g>
            );
          })}
          <line x1="36" x2="36" y1={y(10)} y2={y(-10)} class="axis" />
          <g class="balloon-craft" style={{ transform: `translateY(${y(Math.max(-10, Math.min(10, at))) - y(0)}px)` }}>
            {Array.from({ length: st.b }, (_, i) => {
              const cx = 150 + ((i % 5) - 2) * 18;
              const cy = y(0) - 70 - Math.floor(i / 5) * 22;
              return (
                <g key={`b${i}`}>
                  <line x1={cx} y1={cy + 10} x2="150" y2={y(0) - 22} class="string" />
                  <ellipse cx={cx} cy={cy} rx="10" ry="12" class={`bln c${i % 4}`} />
                </g>
              );
            })}
            <path d={`M130 ${y(0) - 22} L170 ${y(0) - 22} L164 ${y(0)} L136 ${y(0)} Z`} class="basket" />
            {Array.from({ length: st.s }, (_, i) => {
              const cx = 138 + (i % 4) * 8;
              const cy = y(0) + 12 + Math.floor(i / 4) * 16;
              return <rect key={`s${i}`} x={cx - 6} y={cy} width="12" height="13" rx="3" class="sandbag" />;
            })}
          </g>
          <text x="250" y={y(at) + 6} text-anchor="end" class="alt-label">
            {at > 0 ? `+${at}` : at}
          </text>
        </svg>
        {!still && (
          <div class="balloon-tools">
            <button class="btn small mint" onClick={() => act(1, 0, '+🎈')}>
              + 🎈 balloon
            </button>
            <button class="btn small" disabled={st.b === 0} onClick={() => act(-1, 0, 'pop 🎈')}>
              − 🎈 pop one
            </button>
            <button class="btn small" onClick={() => act(0, 1, '+🧱')}>
              + 🧱 sandbag
            </button>
            <button class="btn small mint" disabled={st.s === 0} onClick={() => act(0, -1, 'drop 🧱')}>
              − 🧱 drop one
            </button>
            <button class="btn small ghost" onClick={() => act(1, 1, '+🎈🧱')}>
              + 🎈🧱 zero pair
            </button>
            <div class="balloon-count">
              🎈 {st.b} − 🧱 {st.s} = <b>{at}</b>
            </div>
            {target !== null && !score.over && (
              <button class="btn gold" onClick={land}>
                📍 Land at {at}
              </button>
            )}
          </div>
        )}
      </div>
      <Say v={v} />
      {target !== null && !score.over && (
        <div class="row center-row">
          <ShowMe
            misses={misses}
            onClick={() => {
              score.showMe();
              const k = spec.k ?? 0;
              const ns =
                spec.op === 'sub' && k < 0
                  ? { b: st.b, s: Math.max(0, balloonStart(spec.start).s + k) }
                  : balloonStart(target);
              setSt(altitude(ns) === target ? ns : balloonStart(target));
              setV({ ok: true, text: `$${balloonTex(spec)} = ${target}$` });
              score.finish();
            }}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sorter

type SorterSpec = Extract<Widget, { kind: 'sorter' }>;

const joinTerms = (ts: string[]) =>
  ts
    .map((t, i) => {
      const tex = parseTerm(t).tex;
      if (i === 0) return tex;
      return tex.startsWith('-') ? `- ${tex.slice(1)}` : `+ ${tex}`;
    })
    .join(' ');

export function Sorter({ spec, onDone, still }: GameProps<SorterSpec>) {
  const score = useScore(onDone);
  const terms = spec.terms.map(parseTerm);
  const kinds = sortTotals(spec.terms).map((t) => t.kind);
  const [bins, setBins] = useState<Record<number, TermKind>>(() =>
    still ? Object.fromEntries(terms.map((t, i) => [i, t.kind])) : {},
  );
  const [pick, setPick] = useState<number | null>(null);
  const [v, setV] = useState<Verdict | null>(null);
  const [misses, setMisses] = useState(0);
  const left = terms.map((_, i) => i).filter((i) => bins[i] === undefined);
  const sorted = left.length === 0;

  const drop = (k: TermKind) => {
    if (pick === null) return;
    const verdict = binVerdict(terms[pick], k);
    ding(verdict.ok);
    setV(verdict.ok ? null : verdict);
    if (verdict.ok) {
      setBins({ ...bins, [pick]: k });
      const rest = left.filter((i) => i !== pick);
      setPick(rest[0] ?? null);
    } else {
      score.slip();
      setMisses(misses + 1);
    }
  };

  const steps = kinds.map((k) => {
    const inBin = spec.terms.filter((_, i) => terms[i].kind === k);
    const total = sortTotals(spec.terms).find((t) => t.kind === k)!.total;
    const unit = k === 'x2' ? 'x^{2}' : k === 'n' ? '' : k;
    return {
      tex: `${joinTerms(inBin)} = \\box${unit}`,
      answer: total,
      say: `Total up the ${BIN_NAME[k]}.`,
      nudges:
        k !== 'n' && inBin.length > 1
          ? [{ value: inBin.length, text: `Not how many terms — add up how many ${unit === 'x^{2}' ? '$x^2$' : `$${unit}$`}s there are (watch the minuses!).` }]
          : [],
    };
  });

  return (
    <div class="sorter">
      {!sorted && !still && (
        <>
          <div class="game-hud">Tap a term, then the pile it belongs in.</div>
          <div class="term-tray">
            {left.map((i) => (
              <button
                key={i}
                class={`term-chip ${pick === i ? 'on' : ''}`}
                onClick={() => {
                  sfx('click');
                  setPick(i);
                }}
                dangerouslySetInnerHTML={{ __html: renderMath(terms[i].tex) }}
              />
            ))}
          </div>
        </>
      )}
      <div class="bins">
        {kinds.map((k) => (
          <button key={k} class={`bin bin-${k}`} onClick={() => drop(k)} disabled={sorted || still}>
            <div class="bin-name">
              <RichInline text={BIN_NAME[k]} />
            </div>
            <div class="bin-items">
              {terms.map((t, i) =>
                bins[i] === k ? <span key={i} dangerouslySetInnerHTML={{ __html: renderMath(t.tex) }} /> : null,
              )}
            </div>
          </button>
        ))}
      </div>
      <Say v={v} />
      {!sorted && !still && (
        <div class="row center-row">
          <ShowMe
            misses={misses}
            onClick={() => {
              score.showMe();
              setBins(Object.fromEntries(terms.map((t, i) => [i, t.kind])));
              setV(null);
            }}
          />
        </div>
      )}
      {sorted && !still && (
        <ChainGame
          spec={{ kind: 'chain', steps }}
          onDone={(o) => {
            if (o !== 'right') score.slip();
            if (o === 'wrong') score.showMe();
            score.finish();
          }}
        />
      )}
      {(score.over || still) && <Mathy tex={`${joinTerms(spec.terms)} = \\good{${totalsTex(sortTotals(spec.terms))}}`} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fruit puzzles

type FruitSpec = Extract<Widget, { kind: 'fruit' }>;

export function Fruit({ spec, onDone, still }: GameProps<FruitSpec>) {
  const score = useScore(onDone);
  const ask = spec.ask ?? fruitsIn(spec);
  const [known, setKnown] = useState<string[]>(still ? ask : []);
  const [val, setVal] = useState('');
  const [v, setV] = useState<Verdict | null>(null);
  const [misses, setMisses] = useState(0);
  const cur = ask.find((f) => !known.includes(f));

  const solve = (f: string, verdict: Verdict) => {
    const k = [...known, f];
    setKnown(k);
    setVal('');
    setMisses(0);
    setV(verdict);
    if (ask.every((x) => k.includes(x))) {
      sfx('win');
      score.finish();
    }
  };

  const submit = (n: number) => {
    if (!cur) return;
    const verdict = fruitVerdict(spec, cur, n, known);
    ding(verdict.ok);
    if (verdict.ok) solve(cur, { ok: true, text: `${cur} = ${n}. Swap it in everywhere!` });
    else {
      score.slip();
      setMisses(misses + 1);
      setV(verdict);
      setVal('');
    }
  };

  return (
    <div class="fruit-game">
      <div class="fruit-rows">
        {spec.rows.map((r, i) => (
          <div key={i} class="fruit-row">
            {r.items.map((f, j) => (
              <span key={j} class="fruit-term">
                {j > 0 && <span class="fruit-op">+</span>}
                {known.includes(f) ? (
                  <span class="fruit-num">{spec.values[f]}</span>
                ) : (
                  <span class={`fruit ${f === cur ? 'hunt' : ''}`}>{f}</span>
                )}
              </span>
            ))}
            <span class="fruit-op">=</span>
            <b class="fruit-total">{r.total}</b>
          </div>
        ))}
      </div>
      {cur && !still && (
        <>
          <div class="fruit-ask">
            <span class="fruit hunt">{cur}</span> = <span class={`answer-box small ${val === '' ? 'empty' : ''}`}>{val}</span>
          </div>
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
        </>
      )}
      <Say v={v} />
      {cur && !still && (
        <div class="row center-row">
          <ShowMe
            misses={misses}
            onClick={() => {
              score.showMe();
              solve(cur, { ok: true, text: `${cur} = ${spec.values[cur]}.` });
            }}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inequalities on a number line

type IneqSpec = Extract<Widget, { kind: 'ineqline' }>;
const SYM = { '<': '<', '>': '>', '<=': '\\le', '>=': '\\ge' };

export function IneqLine({ spec, onDone, still }: GameProps<IneqSpec>) {
  const score = useScore(onDone);
  const solved: IneqPick = {
    at: spec.value,
    closed: spec.op === '<=' || spec.op === '>=',
    right: spec.op === '>' || spec.op === '>=',
  };
  const [pick, setPick] = useState<IneqPick>(still ? solved : { at: spec.min + 1, closed: true, right: true });
  const [placed, setPlaced] = useState(!!still);
  const [v, setV] = useState<Verdict | null>(null);
  const [misses, setMisses] = useState(0);
  const W = 1000;
  const PAD = 50;
  const x = (n: number) => PAD + ((n - spec.min) / (spec.max - spec.min)) * (W - 2 * PAD);
  const check = () => {
    const verdict = ineqVerdict(spec, pick);
    ding(verdict.ok);
    setV(verdict.ok ? { ok: true, text: `Every number on the shaded side makes $x ${SYM[spec.op]} ${spec.value}$ true.` } : verdict);
    if (verdict.ok) score.finish();
    else {
      score.slip();
      setMisses(misses + 1);
    }
  };
  return (
    <div class="ineqline">
      <Mathy tex={`x ${SYM[spec.op]} ${spec.value}`} />
      <svg
        viewBox={`0 0 ${W} 150`}
        class="ineq-svg"
        onPointerDown={(e) => {
          if (still || score.over) return;
          const b = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const vx = ((e.clientX - b.left) / b.width) * W;
          const n = Math.round(spec.min + ((vx - PAD) / (W - 2 * PAD)) * (spec.max - spec.min));
          if (n < spec.min || n > spec.max) return;
          sfx('click');
          setPick({ ...pick, at: n });
          setPlaced(true);
          if (v && !v.ok) setV(null);
        }}
      >
        <line x1={PAD - 30} x2={W - PAD + 30} y1="80" y2="80" class="axis" />
        {placed && (
          <line x1={x(pick.at)} x2={pick.right ? W - PAD + 26 : PAD - 26} y1="80" y2="80" class="ineq-shade" />
        )}
        {placed && (
          <path
            d={pick.right ? `M${W - PAD + 34} 80 l-18 -12 v24 Z` : `M${PAD - 34} 80 l18 -12 v24 Z`}
            class="ineq-arrow"
          />
        )}
        {Array.from({ length: spec.max - spec.min + 1 }, (_, i) => {
          const n = spec.min + i;
          return (
            <g key={n}>
              <line x1={x(n)} x2={x(n)} y1="68" y2="92" class="tick" />
              <text x={x(n)} y="125" text-anchor="middle" class={`tick-label ${n === 0 ? 'zero' : ''}`}>
                {n}
              </text>
            </g>
          );
        })}
        {placed && <circle cx={x(pick.at)} cy="80" r="13" class={`ineq-dot ${pick.closed ? 'closed' : 'open'}`} />}
      </svg>
      {!still && !score.over && (
        <div class="row center-row wrap">
          <span class="muted">{placed ? `Dot at ${pick.at}` : 'Tap the line to put the dot.'}</span>
          <button class={`btn small ${pick.closed ? 'gold' : 'ghost'}`} onClick={() => setPick({ ...pick, closed: true })}>
            ● filled
          </button>
          <button class={`btn small ${!pick.closed ? 'gold' : 'ghost'}`} onClick={() => setPick({ ...pick, closed: false })}>
            ○ open
          </button>
          <button class={`btn small ${!pick.right ? 'gold' : 'ghost'}`} onClick={() => setPick({ ...pick, right: false })}>
            ← smaller
          </button>
          <button class={`btn small ${pick.right ? 'gold' : 'ghost'}`} onClick={() => setPick({ ...pick, right: true })}>
            bigger →
          </button>
          <button class="btn mint" disabled={!placed} onClick={check}>
            ✓ Check
          </button>
          <ShowMe
            misses={misses}
            onClick={() => {
              score.showMe();
              setPick(solved);
              setPlaced(true);
              setV({ ok: true, text: 'Like this.' });
              score.finish();
            }}
          />
        </div>
      )}
      <Say v={v} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Matchsticks (a picture)

type MatchSpec = Extract<Widget, { kind: 'matchsticks' }>;

function stickLines(shape: MatchSpec['shape'], n: number): [number, number, number, number][] {
  const L: [number, number, number, number][] = [];
  const s = 30;
  if (shape === 'squares') {
    for (let i = 0; i <= n; i++) L.push([i * s, 0, i * s, s]);
    for (let i = 0; i < n; i++) L.push([i * s, 0, (i + 1) * s, 0], [i * s, s, (i + 1) * s, s]);
  } else if (shape === 'triangles') {
    const h = s * 0.87;
    for (let i = 0; i < n; i++) {
      const up = i % 2 === 0;
      const x0 = (i * s) / 2;
      if (up) L.push([x0, h, x0 + s, h]);
      else L.push([x0, 0, x0 + s, 0]);
    }
    for (let i = 0; i <= n; i++) {
      const x0 = (i * s) / 2;
      L.push(i % 2 === 0 ? [x0, h, x0 + s / 2, 0] : [x0, 0, x0 + s / 2, h]);
    }
  } else {
    for (let i = 0; i <= n; i++) L.push([i * s, s * 0.6, i * s, s * 1.6]);
    for (let i = 0; i < n; i++)
      L.push(
        [i * s, s * 1.6, (i + 1) * s, s * 1.6],
        [i * s, s * 0.6, (i + 1) * s, s * 0.6],
        [i * s, s * 0.6, i * s + s / 2, 0],
        [i * s + s / 2, 0, (i + 1) * s, s * 0.6],
      );
  }
  return L;
}

export function Matchsticks({ spec }: GameProps<MatchSpec>) {
  return (
    <div class="matchsticks">
      {Array.from({ length: spec.stages }, (_, k) => {
        const n = k + 1;
        const lines = stickLines(spec.shape, n);
        const w = Math.max(...lines.map((l) => Math.max(l[0], l[2]))) + 10;
        return (
          <div key={n} class="stage">
            <svg viewBox={`-5 -5 ${w + 5} 60`} style={{ width: `${Math.min(220, (w + 10) * 1.4)}px` }}>
              {lines.map((l, i) => (
                <g key={i}>
                  <line x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} class="stick" />
                  <circle cx={l[2]} cy={l[3]} r="2.4" class="stick-head" />
                </g>
              ))}
            </svg>
            <div class="stage-label">
              Stage {n} · <b>{sticks(spec.shape, n)}</b> sticks
            </div>
          </div>
        );
      })}
    </div>
  );
}
