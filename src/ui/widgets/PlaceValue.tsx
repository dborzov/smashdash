/**
 * Place-value applets for the Long Count campaign:
 *  - PlaceChart:   columns for every place, grouped into periods; tap a column to see its worth.
 *  - Abacus:       the Reckoning Board — tokens per place, + and −, trade ten for one (and
 *                  break one into ten). Shows why 9 + 1 carries, and why zeros hold places.
 *  - NumberLineWidget: read or place numbers on a line.
 *  - LogLine:      every power of ten one equal step — a squad, a company, a battalion, a legion…
 *                  with a normal line underneath to show how big numbers dwarf small ones.
 *  - Rounder:      zoom in between two round numbers and pick the nearer one.
 *  - Shifter:      ×10 / ÷10 as digits sliding between fixed columns (the point stays put).
 *  - DecGrid:      a hundredths grid for decimals.
 *
 * The pure logic (board value, trades, log positions) is exported for tests.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import {
  digitAt,
  group,
  PLACE_NAMES,
  PLACE_ONE,
  PLACE_SHORT,
  periodOf,
  pow10,
  roundTo,
  topPlace,
  words,
} from '../../skills/place';
import { clean, fmt } from '../../skills/util';
import { renderMath } from '../math';
import { NumberLineSvg } from './NumberLine';
import { sfx } from '../../audio/sfx';

// ---------------------------------------------------------------------------
// Place chart

export function PlaceChart({
  value,
  dec = 0,
  top,
  hl,
  hide,
  tap,
  onDone,
}: {
  value?: number;
  dec?: number;
  top?: number;
  hl?: number;
  hide?: boolean;
  tap?: number;
  onDone?: () => void;
}) {
  const hi = top ?? Math.max(value !== undefined ? topPlace(value) : 2, 2);
  const places = Array.from({ length: hi + 1 + dec }, (_, i) => hi - i);
  const [tapped, setTapped] = useState<number[]>([]);
  const [shown, setShown] = useState<number | null>(null);
  const filled = (p: number) => value !== undefined && (p <= topPlace(value) || p < 0);
  useEffect(() => {
    if (!tap) onDone?.();
  }, []);
  const press = (p: number) => {
    if (!tap || value === undefined) return;
    sfx('click');
    setShown(p);
    const t = tapped.includes(p) ? tapped : [...tapped, p];
    setTapped(t);
    if ((hl !== undefined && p === hl) || (hl === undefined && t.length >= tap)) onDone?.();
  };
  // Period spans for the header row.
  const spans: { name: string; n: number }[] = [];
  for (const p of places) {
    const name = p < 0 ? 'after the point' : periodOf(p);
    const last = spans[spans.length - 1];
    if (last && last.name === name) last.n++;
    else spans.push({ name, n: 1 });
  }
  const d = shown !== null && value !== undefined ? digitAt(value, shown) : 0;
  return (
    <div class="placechart-wrap">
      <div
        class="placechart"
        style={{ gridTemplateColumns: `repeat(${places.length}, minmax(0, 1fr))` }}
      >
        {spans.map((s, i) => (
          <div
            key={`s${i}`}
            class={`pc-period ${s.name.replace(/\s/g, '-')}`}
            style={{ gridColumn: `span ${s.n}` }}
          >
            {s.name}
          </div>
        ))}
        {places.map((p) => (
          <div
            key={`h${p}`}
            class={`pc-head ${p === hl ? 'hl' : ''} ${p % 3 === 0 && p > 0 ? 'edge' : ''} ${p === 0 && dec ? 'point' : ''}`}
            title={PLACE_NAMES[p]}
          >
            {PLACE_SHORT[p]}
          </div>
        ))}
        {places.map((p) => (
          <button
            key={`d${p}`}
            class={`pc-cell ${p === hl ? 'hl' : ''} ${tapped.includes(p) ? 'tapped' : ''} ${p % 3 === 0 && p > 0 ? 'edge' : ''} ${p === 0 && dec ? 'point' : ''}`}
            disabled={!tap}
            onClick={() => press(p)}
            aria-label={PLACE_NAMES[p]}
          >
            {value === undefined || !filled(p) ? '' : p === hl && hide ? '?' : digitAt(value, p)}
          </button>
        ))}
      </div>
      {shown !== null && value !== undefined && (
        <div class="pc-note" key={shown}>
          {d === 0 ? (
            <>
              The <b>0</b> in the {PLACE_NAMES[shown]} place is worth nothing — but it holds the
              place open.
            </>
          ) : (
            <span
              dangerouslySetInnerHTML={{
                __html:
                  renderMath(
                    `${d} \\times ${group(pow10(shown)).replace(/,/g, '{,}')} = ${group(clean(d * pow10(shown))).replace(/,/g, '{,}')}`,
                  ) + ` &nbsp;— ${words(d)} ${d === 1 ? PLACE_ONE[shown] : PLACE_NAMES[shown]}`,
              }}
            />
          )}
        </div>
      )}
      {tap && shown === null && (
        <div class="pc-note muted">Tap a column to see what its digit is worth.</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The Reckoning Board

/** Board value: tokens × place values (columns may hold more than 9 before trading). */
export function boardValue(cols: number[]): number {
  return cols.reduce((a, n, i) => a + n * pow10(i), 0);
}

/** Trade ten tokens in column i for one in column i + 1. */
export function trade(cols: number[], i: number): number[] {
  if (cols[i] < 10 || i + 1 >= cols.length) return cols;
  const c = cols.slice();
  c[i] -= 10;
  c[i + 1] += 1;
  return c;
}

/** Break one token in column i into ten in column i − 1. */
export function breakToken(cols: number[], i: number): number[] {
  if (cols[i] < 1 || i < 1) return cols;
  const c = cols.slice();
  c[i] -= 1;
  c[i - 1] += 10;
  return c;
}

export function Abacus({
  places,
  start = 0,
  target,
  onDone,
}: {
  places: number;
  start?: number;
  target?: number;
  onDone?: () => void;
}) {
  // cols[i] = tokens in place i (ones first).
  const [cols, setCols] = useState<number[]>(() =>
    Array.from({ length: places }, (_, i) => digitAt(start, i)),
  );
  const [done, setDone] = useState(false);
  const v = boardValue(cols);
  const tidy = cols.every((n) => n <= 9);
  useEffect(() => {
    if (target === undefined) {
      onDone?.();
      return;
    }
    if (!done && v === target && tidy) {
      setDone(true);
      sfx('unlock');
      setTimeout(() => onDone?.(), 300);
    }
  }, [v, tidy]);
  const set = (c: number[], sound = 'pop') => {
    if (done) return;
    sfx(sound);
    setCols(c);
  };
  const order = Array.from({ length: places }, (_, i) => places - 1 - i);
  return (
    <div class="abacus">
      <div
        class="abacus-board"
        style={{ gridTemplateColumns: `repeat(${places}, minmax(0, 1fr))` }}
      >
        {order.map((i) => (
          <div
            key={`h${i}`}
            class={`ab-head ${i % 3 === 2 && i > 2 ? 'edge' : ''}`}
            title={PLACE_NAMES[i]}
          >
            {PLACE_SHORT[i]}
          </div>
        ))}
        {order.map((i) => {
          const n = cols[i];
          const over = n >= 10;
          return (
            <div key={`c${i}`} class={`ab-col ${over ? 'over' : ''}`}>
              <div class="ab-tokens" aria-label={`${n} in the ${PLACE_NAMES[i]}`}>
                {n <= 12 ? (
                  Array.from({ length: n }, (_, k) => (
                    <button
                      key={k}
                      class="ab-token"
                      title={i > 0 ? `Break into ten ${PLACE_NAMES[i - 1]}` : undefined}
                      onClick={() => i > 0 && set(breakToken(cols, i), 'crack')}
                      style={{ animationDelay: `${k * 20}ms` }}
                    />
                  ))
                ) : (
                  <span class="ab-many">×{n}</span>
                )}
              </div>
              <div class="ab-count">{n}</div>
              {over && i + 1 < places && (
                <button class="btn small gold ab-trade" onClick={() => set(trade(cols, i), 'coin')}>
                  10 → 1 ⬅
                </button>
              )}
              <div class="ab-btns">
                <button
                  class="ab-btn"
                  onClick={() => set(cols.map((x, j) => (j === i ? x + 1 : x)))}
                  aria-label={`add one ${PLACE_ONE[i]}`}
                >
                  +
                </button>
                <button
                  class="ab-btn"
                  disabled={n === 0}
                  onClick={() => set(cols.map((x, j) => (j === i ? Math.max(0, x - 1) : x)))}
                  aria-label={`take one ${PLACE_ONE[i]}`}
                >
                  −
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div class={`ab-readout ${done ? 'good-text' : ''}`}>
        {tidy ? group(v) : <>{group(v)} — but a column has 10 or more: trade ten for one!</>}
        {target !== undefined && !done && <span class="muted"> · goal {group(target)}</span>}
        {done && ' ✓'}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Number line (widget form)

export function NumberLineWidget(props: {
  min: number;
  max: number;
  step: number;
  minor?: number;
  labels?: 'ends' | 'all';
  arrow?: number;
  marks?: { at: number; label: string }[];
  mid?: boolean;
  band?: [number, number];
  target?: number;
  tolerance?: number;
  onDone?: () => void;
}) {
  const [pick, setPick] = useState<number | null>(null);
  const [state, setState] = useState<'' | 'right' | 'wrong'>('');
  useEffect(() => {
    if (props.target === undefined) props.onDone?.();
  }, []);
  const tol = props.tolerance ?? 0;
  return (
    <div>
      <NumberLineSvg
        {...props}
        pick={pick}
        pickState={state}
        snap={props.minor ?? props.step / 10}
        onPick={
          props.target === undefined || state === 'right'
            ? undefined
            : (v) => {
                setPick(v);
                setState('');
              }
        }
      />
      {props.target !== undefined && (
        <div class="row" style={{ justifyContent: 'center', gap: '12px' }}>
          <span class="muted">
            {pick === null
              ? `Tap to plant the banner at ${group(props.target)}.`
              : `Banner at ${group(pick)}`}
          </span>
          {state !== 'right' && (
            <button
              class="btn small mint"
              disabled={pick === null}
              onClick={() => {
                if (pick === null) return;
                if (Math.abs(pick - props.target!) <= tol + 1e-9) {
                  sfx('right');
                  setState('right');
                  props.onDone?.();
                } else {
                  sfx('wrong');
                  setState('wrong');
                }
              }}
            >
              🚩 Plant it
            </button>
          )}
          {state === 'wrong' && <span class="bad-text">Not there — count the jumps again.</span>}
          {state === 'right' && <span class="good-text">Right on the mark.</span>}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Log-scale line

const SCALE: Record<number, [string, string]> = {
  [-3]: ['🌫️', 'a thousandth of a gram of gold dust'],
  [-2]: ['✨', 'a hundredth'],
  [-1]: ['🪶', 'a tenth'],
  0: ['🗡️', 'one soldier'],
  1: ['🛡️', 'a squad (10)'],
  2: ['🏕️', 'a company (100)'],
  3: ['🚩', 'a battalion (1,000)'],
  4: ['🏰', 'a legion (10,000)'],
  5: ['⚔️', 'an army (100,000)'],
  6: ['💀', 'the Hollow Host (1,000,000)'],
  7: ['🌍', 'every soul in the realm (10,000,000)'],
  8: ['🌌', 'a hundred million'],
  9: ['✴️', 'a billion'],
};

/** Position of a value on a log line from 10^min to 10^max, in [0, 1]. */
export function logPos(v: number, min: number, max: number): number {
  return Math.min(1, Math.max(0, (Math.log10(v) - min) / (max - min)));
}

/** A friendly rounding of a log-line value (2 significant digits). */
export function logValue(t: number, min: number, max: number): number {
  const raw = Math.pow(10, min + t * (max - min));
  const mag = Math.floor(Math.log10(raw));
  const unit = Math.pow(10, mag - 1);
  return clean(Math.round(raw / unit) * unit);
}

export function LogLine({
  min,
  max,
  target,
  linear,
  onDone,
}: {
  min: number;
  max: number;
  target?: number;
  linear?: boolean;
  onDone?: () => void;
}) {
  const [t, setT] = useState(() =>
    logPos(target ? pow10(min) * 3 : pow10(Math.round((min + max) / 2)), min, max),
  );
  const [done, setDone] = useState(false);
  const svg = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState(false);
  const W = 1000;
  const PAD = 50;
  const x = (u: number) => PAD + u * (W - 2 * PAD);
  const v = logValue(t, min, max);
  const decade = Math.floor(Math.log10(v) + 1e-9);
  useEffect(() => {
    if (target === undefined) onDone?.();
  }, []);
  const inTarget = target !== undefined && decade === Math.floor(Math.log10(target) + 1e-9);
  useEffect(() => {
    if (inTarget && !done && !drag) {
      setDone(true);
      sfx('right');
      onDone?.();
    }
  }, [inTarget, drag]);
  const move = (clientX: number) => {
    const r = svg.current?.getBoundingClientRect();
    if (!r) return;
    const u = ((clientX - r.left) / r.width) * W;
    setT(Math.min(1, Math.max(0, (u - PAD) / (W - 2 * PAD))));
  };
  const powers = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const digits = decade >= 0 ? decade + 1 : 0;
  return (
    <div class="logline">
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${linear ? 250 : 170}`}
        class="logline-svg"
        onPointerDown={(e) => {
          (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
          setDrag(true);
          move(e.clientX);
        }}
        onPointerMove={(e) => drag && move(e.clientX)}
        onPointerUp={() => setDrag(false)}
        onPointerCancel={() => setDrag(false)}
      >
        <rect x="0" y="0" width={W} height="250" fill="transparent" />
        <line class="nl-axis" x1={PAD} y1="96" x2={W - PAD} y2="96" />
        {powers.slice(0, -1).map((p, i) => {
          const a = x(i / (max - min));
          const b = x((i + 1) / (max - min));
          return (
            <g key={`arc${p}`}>
              <path class="log-arc" d={`M${a + 6} 84 Q${(a + b) / 2} 50 ${b - 6} 84`} />
              <text
                class="log-arc-label"
                x={(a + b) / 2}
                y="58"
                text-anchor="middle"
                font-size="20"
              >
                ×10
              </text>
            </g>
          );
        })}
        {powers.map((p, i) => (
          <g key={p}>
            <line
              class="nl-major"
              x1={x(i / (max - min))}
              y1="80"
              x2={x(i / (max - min))}
              y2="112"
            />
            <text
              class="nl-label"
              x={x(i / (max - min))}
              y="138"
              text-anchor="middle"
              font-size={powers.length > 9 ? 17 : 21}
            >
              {group(pow10(p))}
            </text>
            <text x={x(i / (max - min))} y="30" text-anchor="middle" font-size="26">
              {SCALE[p]?.[0]}
            </text>
          </g>
        ))}
        <g class="log-marker">
          <line x1={x(t)} y1="70" x2={x(t)} y2="122" />
          <circle cx={x(t)} cy="96" r="13" />
        </g>
        {linear && (
          <g>
            <text x={PAD} y="178" font-size="20" class="nl-label" text-anchor="start">
              The same numbers on a normal line:
            </text>
            <line class="nl-axis" x1={PAD} y1="210" x2={W - PAD} y2="210" />
            {powers.map((p) => (
              <line
                key={`lin${p}`}
                class="nl-minor"
                x1={PAD + (pow10(p) / pow10(max)) * (W - 2 * PAD)}
                y1="200"
                x2={PAD + (pow10(p) / pow10(max)) * (W - 2 * PAD)}
                y2="220"
              />
            ))}
            <text class="nl-label" x={PAD} y="242" font-size="18" text-anchor="middle">
              0
            </text>
            <text class="nl-label" x={W - PAD} y="242" font-size="18" text-anchor="middle">
              {group(pow10(max))}
            </text>
            <circle
              class="log-marker-lin"
              cx={PAD + Math.min(1, v / pow10(max)) * (W - 2 * PAD)}
              cy="210"
              r="10"
            />
          </g>
        )}
      </svg>
      <div class="log-readout">
        <b>≈ {group(v)}</b>
        {decade >= 0 ? (
          <>
            {' '}
            — a {digits}-digit number, in the <b>{PLACE_NAMES[decade]}</b>.{' '}
            {SCALE[decade]
              ? `About ${SCALE[decade][1]}${v / pow10(decade) >= 2 ? `, ×${Math.round(v / pow10(decade))}` : ''}.`
              : ''}
          </>
        ) : (
          <>
            {' '}
            — less than one: down in the <b>{PLACE_NAMES[decade]}</b>.
          </>
        )}
      </div>
      {linear && (
        <div class="muted log-note">
          On the normal line, everything below {group(pow10(max - 2))} is squashed against the 0.
          The log line gives every ×10 the same room.
        </div>
      )}
      {target !== undefined && (
        <div class={`log-goal ${done ? 'good-text' : ''}`}>
          {done
            ? `✓ ${group(target)} lives between ${group(pow10(decade))} and ${group(pow10(decade + 1))}.`
            : `Drag the marker to where ${group(target)} lives.`}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rounder: zoom in and pick the nearer round number

export function Rounder({
  value,
  place,
  onDone,
}: {
  value: number;
  place: number;
  onDone?: () => void;
}) {
  const u = pow10(place);
  const lo = clean(Math.floor(value / u + 1e-9) * u);
  const hi = clean(lo + u);
  const ans = roundTo(value, place);
  const [pick, setPick] = useState<number | null>(null);
  const decider = digitAt(value, place - 1);
  const choose = (x: number) => {
    setPick(x);
    if (x === ans) {
      sfx('right');
      onDone?.();
    } else sfx('nudge');
  };
  return (
    <div class="rounder">
      <NumberLineSvg
        min={lo}
        max={hi}
        step={u}
        minor={u / 10}
        labels="ends"
        arrow={value}
        mid
        pick={pick}
        pickState={pick === null ? '' : pick === ans ? 'right' : 'nudge'}
      />
      <div class="row" style={{ justifyContent: 'space-between', gap: '10px' }}>
        <button
          class={`btn ${pick === lo ? (lo === ans ? 'mint' : 'danger') : 'ghost'}`}
          onClick={() => choose(lo)}
          disabled={pick === ans}
        >
          ⬅ Round down to {group(lo)}
        </button>
        <button
          class={`btn ${pick === hi ? (hi === ans ? 'mint' : 'danger') : 'ghost'}`}
          onClick={() => choose(hi)}
          disabled={pick === ans}
        >
          Round up to {group(hi)} ➡
        </button>
      </div>
      {pick !== null && (
        <div
          class={pick === ans ? 'good-text center' : 'bad-text center'}
          style={{ marginTop: '8px' }}
        >
          {pick === ans
            ? `${group(value)} is ${value - lo >= u / 2 ? 'at or past' : 'before'} the halfway mark (${group(lo + u / 2)}): it rounds to ${group(ans)}. The decider digit was ${decider}.`
            : `Look where the arrow is compared with the halfway mark. The digit after the ${place > 0 ? PLACE_NAMES[place] : place === 0 ? 'ones' : PLACE_NAMES[place]} place is ${decider}.`}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shifter: ×10 slides digits left past a fixed point

/** Digits of v by place, from `hi` down to `lo`. */
export function shiftDigits(
  v: number,
  hi: number,
  lo: number,
): { place: number; digit: number | null }[] {
  const top = topPlace(v);
  const decs = (fmt(v).split('.')[1] ?? '').length;
  return Array.from({ length: hi - lo + 1 }, (_, i) => {
    const p = hi - i;
    const inside = p <= top && p >= -decs;
    return { place: p, digit: inside ? digitAt(v, p) : null };
  });
}

export function Shifter({
  value,
  times,
  onDone,
}: {
  value: number;
  times: number;
  onDone?: () => void;
}) {
  const [k, setK] = useState(0);
  const steps = Math.abs(times);
  const dir = Math.sign(times) || 1;
  const cur = clean(value * pow10(dir * k));
  const curTop = topPlace(value) + (dir > 0 ? steps : 0);
  const hi = Math.max(curTop, 1);
  const lo = -Math.max(3, (fmt(value).split('.')[1] ?? '').length + (dir < 0 ? steps : 0));
  const cells = shiftDigits(cur, hi, Math.max(lo, -3));
  const finished = k >= steps;
  const press = () => {
    if (finished) return;
    sfx('whoosh');
    const n = k + 1;
    setK(n);
    if (n >= steps) setTimeout(() => onDone?.(), 400);
  };
  const shiftedFrom = (p: number) => p - dir * k;
  return (
    <div class="shifter">
      <div
        class="shift-row"
        style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
      >
        {cells.map((c) => (
          <div key={`h${c.place}`} class={`sh-head ${c.place === 0 ? 'ones' : ''}`}>
            {PLACE_SHORT[c.place]}
          </div>
        ))}
        {cells.map((c) => {
          const orig = shiftedFrom(c.place);
          const decs = (fmt(value).split('.')[1] ?? '').length;
          const original = orig <= topPlace(value) && orig >= -decs;
          const filler = c.digit === 0 && !original;
          return (
            <div
              key={`d${c.place}`}
              class={`sh-cell ${c.place === 0 ? 'ones' : ''} ${filler ? 'filler' : ''}`}
            >
              <span
                class="sh-digit"
                key={`${c.place}-${k}`}
                style={{
                  animation:
                    k > 0 && c.digit !== null
                      ? `${dir > 0 ? 'slide-left' : 'slide-right'} .45s ease-out`
                      : undefined,
                }}
              >
                {c.digit ?? ''}
              </span>
              {c.place === 0 && <span class="sh-point">.</span>}
            </div>
          );
        })}
      </div>
      <div
        class="math-big"
        dangerouslySetInnerHTML={{
          __html: renderMath(
            `${group(value).replace(/,/g, '{,}')} ${dir > 0 ? '\\times' : '\\div'} ${group(pow10(k)).replace(/,/g, '{,}')} = ${group(cur).replace(/,/g, '{,}')}`,
            true,
          ),
        }}
      />
      <div class="row" style={{ justifyContent: 'center' }}>
        <button class="btn gold" disabled={finished} onClick={press}>
          {dir > 0 ? '×10 — slide left' : '÷10 — slide right'} ({k}/{steps})
        </button>
      </div>
      <p class="muted center" style={{ marginTop: '6px' }}>
        The point never moves. The digits slide; empty places fill with zeros (shown in blue).
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Decimal grid

export function DecGrid({ value }: { value: number }) {
  const n = Math.round(value * 100);
  const tenths = Math.floor(n / 10);
  const hund = n % 10;
  return (
    <div class="decgrid-wrap">
      <div class="decgrid" role="img" aria-label={`${fmt(value)} of the square shaded`}>
        {Array.from({ length: 100 }, (_, i) => {
          // The grid flows column by column (CSS grid-auto-flow: column).
          const col = Math.floor(i / 10);
          const row = i % 10;
          const on = col < tenths || (col === tenths && row < hund);
          return <i key={i} class={on ? (col < tenths ? 'on' : 'on2') : ''} />;
        })}
      </div>
      <div class="muted center">
        {fmt(value)} = {tenths} tenth{tenths === 1 ? '' : 's'} (full columns) + {hund} hundredth
        {hund === 1 ? '' : 's'} (single squares)
      </div>
    </div>
  );
}
