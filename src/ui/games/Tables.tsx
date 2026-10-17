/**
 * Mini-games for Dungeons & Times Tables:
 *  - ArrayGame: rows × columns of gems. Build one for a number, turn it round (a × b = b × a),
 *    split it into two easy facts, or double it (× 2, × 4, × 8).
 *  - SkipJump: a frog skip-counts along a number line; tap where it lands.
 *  - TableGrid: the times table as a dungeon map. Find every room worth 24, light up the squares,
 *    see the mirror, fill a row.
 *  - SquareGrow: a square grows one L-shaped layer at a time — 1, 4, 9, 16 — each layer odd.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Widget } from '../../content/schema';
import {
  arrayBuildVerdict,
  cellsEqual,
  findVerdict,
  hopVerdict,
  type Verdict,
} from '../../games';
import { renderMath } from '../math';
import { sfx } from '../../audio/sfx';
import { ding, Say, ShowMe, useScore, type GameProps } from './kit';

type ArraySpec = Extract<Widget, { kind: 'array' }>;

/** Rows offered when building an array freely (enough for every target up to 12 × 8). */
const BUILD_ROWS = 8;

function Mathy({ tex }: { tex: string }) {
  return <div class="math-big game-math" dangerouslySetInnerHTML={{ __html: renderMath(tex, true) }} />;
}

/** A gem grid as SVG. `sel` = the rows × cols block that is lit; `split` = cut after row k. */
function Gems({
  rows,
  cols,
  gridRows = rows,
  gridCols = cols,
  sel,
  split,
  ghost,
  onCell,
  extraRows = 0,
}: {
  rows: number;
  cols: number;
  gridRows?: number;
  gridCols?: number;
  sel?: [number, number];
  split?: number;
  ghost?: boolean;
  onCell?: (r: number, c: number, drag: boolean) => void;
  /** Rows just added by doubling (drawn in a different colour). */
  extraRows?: number;
}) {
  const cell = 34;
  const gap = split ? 18 : 0;
  const W = gridCols * cell + 8;
  const H = gridRows * cell + 8 + gap;
  const svg = useRef<SVGSVGElement>(null);
  const down = useRef(false);
  const at = (e: PointerEvent): [number, number] | null => {
    const el = svg.current;
    if (!el) return null;
    const b = el.getBoundingClientRect();
    const x = ((e.clientX - b.left) / b.width) * W - 4;
    const y = ((e.clientY - b.top) / b.height) * H - 4;
    const c = Math.floor(x / cell) + 1;
    const r = Math.floor(y / cell) + 1;
    if (r < 1 || c < 1 || r > gridRows || c > gridCols) return null;
    return [r, c];
  };
  const items = [];
  for (let r = 1; r <= gridRows; r++)
    for (let c = 1; c <= gridCols; c++) {
      const lit = sel ? r <= sel[0] && c <= sel[1] : r <= rows && c <= cols;
      const y = 4 + (r - 1) * cell + (split && r > split ? gap : 0);
      const fresh = extraRows > 0 && r > rows - extraRows && lit;
      items.push(
        lit ? (
          <g key={`${r}-${c}`} transform={`translate(${4 + (c - 1) * cell + cell / 2} ${y + cell / 2})`}>
            <path
              d="M0 -13 L11 -4 L7 11 L-7 11 L-11 -4 Z"
              class={`gem ${split && r > split ? 'b' : ''} ${fresh ? 'fresh' : ''}`}
            />
            <path d="M-5 -5 L0 -10 L4 -5" fill="none" stroke="#fff" stroke-width="2" opacity=".7" />
          </g>
        ) : ghost ? (
          <circle key={`${r}-${c}`} cx={4 + (c - 1) * cell + cell / 2} cy={y + cell / 2} r="4" class="gem-ghost" />
        ) : null,
      );
    }
  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${W} ${H}`}
      class={`gems ${onCell ? 'tappable' : ''}`}
      style={{ maxWidth: `${Math.min(520, W * 1.3)}px` }}
      onPointerDown={(e) => {
        if (!onCell) return;
        down.current = true;
        (e.target as Element).setPointerCapture?.(e.pointerId);
        const rc = at(e);
        if (rc) onCell(rc[0], rc[1], false);
      }}
      onPointerMove={(e) => {
        if (!onCell || !down.current) return;
        const rc = at(e);
        if (rc) onCell(rc[0], rc[1], true);
      }}
      onPointerUp={() => (down.current = false)}
    >
      {items}
      {split && (
        <line x1="0" x2={W} y1={4 + split * cell + gap / 2} y2={4 + split * cell + gap / 2} class="gem-cut" />
      )}
    </svg>
  );
}

export function ArrayGame({ spec, onDone, still }: GameProps<ArraySpec>) {
  const mode = still ? 'show' : (spec.mode ?? 'show');
  const score = useScore(onDone);
  const [sel, setSel] = useState<[number, number]>(spec.fixRows ? [spec.rows, 1] : [1, 1]);
  const [v, setV] = useState<Verdict | null>(null);
  const [misses, setMisses] = useState(0);
  const [turned, setTurned] = useState(false);
  const [cut, setCut] = useState<number | null>(null);
  const [doubled, setDoubled] = useState(0);
  const { rows, cols } = spec;
  const n = rows * cols;

  useEffect(() => {
    if (mode === 'show') onDone?.('right');
  }, []);

  if (mode === 'build') {
    const target = spec.target ?? n;
    const check = () => {
      const verdict = arrayBuildVerdict(spec, sel[0], sel[1]);
      ding(verdict.ok);
      setV(verdict);
      if (verdict.ok) score.finish();
      else {
        score.slip();
        setMisses(misses + 1);
      }
    };
    return (
      <div class="array-game">
        <div class="game-hud">
          {spec.fixRows ? `${spec.rows} rows. ` : ''}Drag across the grid to make <b>{target}</b> gems.
        </div>
        <Gems
          rows={sel[0]}
          cols={sel[1]}
          gridRows={spec.fixRows ? spec.rows : BUILD_ROWS}
          gridCols={12}
          sel={sel}
          ghost
          onCell={
            score.over
              ? undefined
              : (r, c) => {
                  const next: [number, number] = [spec.fixRows ? spec.rows : r, c];
                  if (next[0] !== sel[0] || next[1] !== sel[1]) sfx('click');
                  setSel(next);
                  if (v && !v.ok) setV(null);
                }
          }
        />
        <Mathy tex={`${sel[0]} \\times ${sel[1]} = ${sel[0] * sel[1]}`} />
        {!score.over && (
          <div class="row center-row">
            <button class="btn mint" onClick={check}>
              ✓ That's {target}!
            </button>
            <ShowMe
              misses={misses}
              onClick={() => {
                score.showMe();
                const r = spec.fixRows ? spec.rows : spec.target ? bestRows(target) : rows;
                setSel([r, target / r]);
                setV({ ok: true, text: `Like this: $${r} \\times ${target / r} = ${target}$.` });
                score.finish();
              }}
            />
          </div>
        )}
        <Say v={v} />
      </div>
    );
  }

  if (mode === 'turn') {
    return (
      <div class="array-game">
        <div class={`turner ${turned ? 'turned' : ''}`}>
          <Gems rows={rows} cols={cols} />
        </div>
        <Mathy tex={turned ? `${cols} \\times ${rows} = ${n}` : `${rows} \\times ${cols} = ${n}`} />
        <div class="game-hud">
          {turned ? `${cols} rows of ${rows}.` : `${rows} rows of ${cols}.`} Same gems either way.
        </div>
        {!turned && (
          <div class="row center-row">
            <button
              class="btn gold"
              onClick={() => {
                sfx('whoosh');
                setTurned(true);
                setTimeout(() => score.finish(), 900);
              }}
            >
              ↻ Turn it round
            </button>
          </div>
        )}
      </div>
    );
  }

  if (mode === 'split') {
    const top = cut ?? 0;
    return (
      <div class="array-game">
        <div class="game-hud">
          {cut === null ? 'Tap between two rows to cut the slab in two.' : 'Two easy pieces!'}
        </div>
        <div class="splitter">
          <Gems rows={rows} cols={cols} split={cut ?? undefined} />
          {cut === null && (
            <div class="cut-lines" style={{ gridTemplateRows: `repeat(${rows}, 1fr)` }}>
              {Array.from({ length: rows - 1 }, (_, i) => (
                <button
                  key={i}
                  class={`cut-line ${spec.at === i + 1 ? 'suggest' : ''}`}
                  style={{ top: `${((i + 1) / rows) * 100}%` }}
                  aria-label={`cut after row ${i + 1}`}
                  onClick={() => {
                    sfx('hit');
                    setCut(i + 1);
                    setTimeout(() => score.finish(), 600);
                  }}
                />
              ))}
            </div>
          )}
        </div>
        {cut !== null && (
          <Mathy
            tex={`${rows} \\times ${cols} = \\hl{${top} \\times ${cols}} + \\good{${rows - top} \\times ${cols}} = ${top * cols} + ${(rows - top) * cols} = ${n}`}
          />
        )}
      </div>
    );
  }

  if (mode === 'double') {
    const times = spec.times ?? 3;
    const r = rows * 2 ** doubled;
    return (
      <div class="array-game">
        <Gems rows={r} cols={cols} extraRows={doubled ? r / 2 : 0} />
        <Mathy tex={`${2 ** doubled === 1 ? '' : `${2 ** doubled} \\times `}${rows === 1 ? '' : `${rows} \\times `}${cols} = ${r * cols}`} />
        {doubled < times ? (
          <div class="row center-row">
            <button
              class="btn gold"
              onClick={() => {
                sfx('whoosh');
                const d = doubled + 1;
                setDoubled(d);
                if (d >= times) setTimeout(() => score.finish(), 700);
              }}
            >
              ✖️2 Double it!
            </button>
          </div>
        ) : (
          <div class="game-hud">× 2, × 2, × 2 is × 8 — three doublings.</div>
        )}
      </div>
    );
  }

  // show (a picture; `at` draws the cut of a split)
  return (
    <div class="array-game">
      <Gems rows={rows} cols={cols} split={spec.at} />
      {!still && <div class="game-hud">{rows} rows of {cols}</div>}
    </div>
  );
}

/** Rows for the "show me" array: the squarest factor pair. */
function bestRows(t: number): number {
  let best = 1;
  for (let r = 1; r <= BUILD_ROWS; r++) if (t % r === 0 && t / r <= 12 && r <= t / r) best = r;
  return best;
}

// ---------------------------------------------------------------------------

type SkipSpec = Extract<Widget, { kind: 'skipjump' }>;

export function SkipJump({ spec, onDone, still }: GameProps<SkipSpec>) {
  const start = spec.start ?? 0;
  const max = start + spec.step * (spec.jumps + 1);
  const score = useScore(onDone);
  const [hops, setHops] = useState(still ? spec.jumps : 0);
  const [v, setV] = useState<Verdict | null>(null);
  const [misses, setMisses] = useState(0);
  const [miss, setMiss] = useState<number | null>(null);
  const W = 1000;
  const PAD = 40;
  const x = (n: number) => PAD + ((n - start) / (max - start)) * (W - 2 * PAD);
  const from = start + hops * spec.step;
  const labelEvery = max - start <= 30 ? 5 : max - start <= 80 ? 10 : 20;
  const ticks = [];
  for (let n = start; n <= max; n++) {
    const big = n % labelEvery === 0;
    if (max - start > 120 && !big && n % 2) continue;
    ticks.push(
      <g key={n}>
        <line x1={x(n)} x2={x(n)} y1={big ? 118 : 124} y2={140} class="tick" />
        {big && (
          <text x={x(n)} y={168} text-anchor="middle" class="tick-label">
            {n}
          </text>
        )}
      </g>,
    );
  }
  const tap = (e: PointerEvent) => {
    if (still || score.over) return;
    const svg = e.currentTarget as SVGSVGElement;
    const b = svg.getBoundingClientRect();
    const vx = ((e.clientX - b.left) / b.width) * W;
    const n = Math.round(start + ((vx - PAD) / (W - 2 * PAD)) * (max - start));
    if (n < start || n > max) return;
    const verdict = hopVerdict(spec.step, from, n);
    ding(verdict.ok);
    if (verdict.ok) {
      setV(null);
      setMiss(null);
      const h = hops + 1;
      setHops(h);
      if (h >= spec.jumps) {
        setV({ ok: true, text: `Every landing is in the ${spec.step} times table: ${Array.from({ length: h }, (_, i) => start + spec.step * (i + 1)).join(', ')}.` });
        score.finish();
      }
    } else {
      score.slip();
      setMisses(misses + 1);
      setMiss(n);
      setV(verdict);
    }
  };
  return (
    <div class="skipjump">
      <div class="game-hud">
        🐸 Hops of <b>{spec.step}</b> · jump {Math.min(hops + 1, spec.jumps)} of {spec.jumps}
        {!still && !score.over && ' — tap where it lands!'}
      </div>
      <svg viewBox={`0 0 ${W} 190`} class="skip-svg" onPointerDown={tap}>
        <line x1={PAD - 10} x2={W - PAD + 10} y1="140" y2="140" class="axis" />
        {ticks}
        {Array.from({ length: hops }, (_, i) => {
          const a = x(start + i * spec.step);
          const b = x(start + (i + 1) * spec.step);
          return (
            <g key={i}>
              <path d={`M${a} 136 Q${(a + b) / 2} ${70} ${b} 136`} class="hop-arc" />
              <text x={(a + b) / 2} y="92" text-anchor="middle" class="hop-label">
                +{spec.step}
              </text>
              <circle cx={b} cy="140" r="7" class="landing" />
            </g>
          );
        })}
        {miss !== null && <circle cx={x(miss)} cy="140" r="9" class="miss" />}
        <text x={x(from)} y="128" text-anchor="middle" font-size="44" class="frog">
          🐸
        </text>
      </svg>
      <Say v={v} />
      {!still && !score.over && (
        <div class="row center-row">
          <ShowMe
            misses={misses}
            onClick={() => {
              score.showMe();
              setHops(hops + 1);
              setV({ ok: true, text: `${from} + ${spec.step} = ${from + spec.step}.` });
              if (hops + 1 >= spec.jumps) score.finish();
            }}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

type GridSpec = Extract<Widget, { kind: 'tablegrid' }>;

export function TableGrid({
  spec,
  onDone,
  still,
  heat,
}: GameProps<GridSpec> & {
  /** Fact-map colouring: status per cell (`r×c` → class). */
  heat?: (r: number, c: number) => string;
}) {
  const size = spec.size ?? 10;
  const score = useScore(onDone);
  const [found, setFound] = useState<string[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [lit, setLit] = useState<string[]>([]);
  const [v, setV] = useState<Verdict | null>(null);
  const [misses, setMisses] = useState(0);
  const mode = still ? 'show' : spec.mode;
  const goal =
    mode === 'find'
      ? cellsEqual(spec.target ?? 0, size).map(([r, c]) => `${r}-${c}`)
      : mode === 'squares'
        ? Array.from({ length: size }, (_, i) => `${i + 1}-${i + 1}`)
        : mode === 'row'
          ? Array.from({ length: size }, (_, i) => `${spec.row}-${i + 1}`)
          : [];

  useEffect(() => {
    if (mode === 'show' && !heat) onDone?.('right');
  }, []);

  const win = (f: string[]) => {
    if (goal.length && goal.every((g) => f.includes(g))) {
      sfx('win');
      score.finish();
    }
  };

  const tap = (r: number, c: number) => {
    if (score.over || mode === 'show') return;
    const k = `${r}-${c}`;
    if (mode === 'mirror') {
      sfx('pop');
      const next = [...lit, k, `${c}-${r}`];
      setLit(next);
      setV({
        ok: true,
        text:
          r === c
            ? `$${r} \\times ${c}$ sits on the diagonal — it's its own mirror image.`
            : `$${r} \\times ${c} = ${c} \\times ${r} = ${r * c}$: mirror images across the diagonal.`,
      });
      if (new Set(next).size >= 6) score.finish();
      return;
    }
    if (found.includes(k)) return;
    let verdict: Verdict;
    if (mode === 'find') verdict = findVerdict(spec.target!, r, c);
    else if (mode === 'squares')
      verdict =
        r === c
          ? { ok: true, text: `$${r} \\times ${r} = ${r * r}$ — a square number.` }
          : { ok: false, text: `$${r} \\times ${c}$ makes a rectangle, ${r} by ${c}. A square has the same number of rows and columns.` };
    else {
      const nextC = found.length + 1;
      verdict =
        r === spec.row && c === nextC
          ? { ok: true, text: c > 1 ? `${(c - 1) * r} + ${r} = ${c * r}` : `$${r} \\times 1 = ${r}$` }
          : { ok: false, text: `Fill row ${spec.row} in order: the next room is column ${nextC}.` };
    }
    ding(verdict.ok);
    setV(verdict);
    if (verdict.ok) {
      const f = [...found, k];
      setFound(f);
      win(f);
    } else {
      score.slip();
      setMisses(misses + 1);
      setFlash(k);
      setTimeout(() => setFlash((x) => (x === k ? null : x)), 900);
    }
  };

  const hidden = (r: number, c: number) =>
    (mode === 'find' || mode === 'row') && !found.includes(`${r}-${c}`) && flash !== `${r}-${c}`;

  return (
    <div class="tablegrid">
      {mode === 'find' && (
        <div class="game-hud">
          Find every room worth <b>{spec.target}</b> · {found.length} of {goal.length} found
        </div>
      )}
      {mode === 'squares' && <div class="game-hud">Tap every square room: same rows as columns.</div>}
      {mode === 'mirror' && <div class="game-hud">Tap any room — watch its mirror image.</div>}
      {mode === 'row' && (
        <div class="game-hud">
          Fill the {spec.row}s row, room by room: each one is {spec.row} more.
        </div>
      )}
      <div class="tg" style={{ gridTemplateColumns: `repeat(${size + 1}, 1fr)` }}>
        <div class="tg-corner">×</div>
        {Array.from({ length: size }, (_, i) => (
          <div key={`h${i}`} class="tg-head">
            {i + 1}
          </div>
        ))}
        {Array.from({ length: size }, (_, ri) => {
          const r = ri + 1;
          return [
            <div key={`r${r}`} class="tg-head">
              {r}
            </div>,
            ...Array.from({ length: size }, (_, ci) => {
              const c = ci + 1;
              const k = `${r}-${c}`;
              const cls = [
                'tg-cell',
                found.includes(k) ? 'found' : '',
                flash === k ? 'flash' : '',
                lit.includes(k) ? 'lit' : '',
                mode === 'squares' && r === c && !found.includes(k) ? '' : '',
                heat ? heat(r, c) : '',
                mode === 'row' && r === spec.row ? 'row-on' : '',
              ].join(' ');
              return (
                <button key={k} class={cls} onClick={() => tap(r, c)} disabled={mode === 'show'}>
                  {hidden(r, c) ? '' : r * c}
                </button>
              );
            }),
          ];
        })}
      </div>
      <Say v={v} />
      {!still && !score.over && mode !== 'show' && mode !== 'mirror' && (
        <div class="row center-row">
          <ShowMe
            misses={misses}
            onClick={() => {
              score.showMe();
              setFound(goal);
              setV({ ok: true, text: 'Here they all are. Look for the pattern!' });
              score.finish();
            }}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

type SquareSpec = Extract<Widget, { kind: 'squaregrow' }>;

export function SquareGrow({ spec, onDone, still }: GameProps<SquareSpec>) {
  const [n, setN] = useState(still ? spec.upto : 1);
  const score = useScore(onDone);
  const cell = 30;
  const W = spec.upto * cell + 8;
  const odds = Array.from({ length: n }, (_, i) => 2 * i + 1);
  return (
    <div class="squaregrow">
      <svg viewBox={`0 0 ${W} ${W}`} class="square-svg">
        {Array.from({ length: n * n }, (_, i) => {
          const r = Math.floor(i / n);
          const c = i % n;
          const layer = Math.max(r, c);
          return (
            <rect
              key={`${r}-${c}`}
              x={4 + c * cell + 2}
              y={W - 4 - (r + 1) * cell + 2}
              width={cell - 4}
              height={cell - 4}
              rx="5"
              class={`sq l${layer % 4} ${layer === n - 1 && n > 1 ? 'new' : ''}`}
            />
          );
        })}
      </svg>
      <div
        class="math-big game-math"
        dangerouslySetInnerHTML={{
          __html: renderMath(`${odds.join(' + ')} = ${n * n} = ${n} \\times ${n}`, true),
        }}
      />
      {!still && n < spec.upto && (
        <div class="row center-row">
          <button
            class="btn gold"
            onClick={() => {
              sfx('pop');
              const m = n + 1;
              setN(m);
              if (m >= spec.upto) setTimeout(() => score.finish(), 500);
            }}
          >
            ➕ Add a layer of {2 * n + 1}
          </button>
        </div>
      )}
    </div>
  );
}
