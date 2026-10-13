/**
 * Number lines. `NumberLineSvg` draws a linear line with ticks, labels, an arrow, lettered
 * marks and (optionally) a tap-to-place banner; it is shared by number-line questions
 * (LineAnswer), the `numberline` widget and the rounding widget.
 */
import { useRef, useState } from 'preact/hooks';
import { group } from '../../skills/place';
import { clean } from '../../skills/util';
import { sfx } from '../../audio/sfx';

const W = 1000;
const PAD = 50;

export interface NumberLineProps {
  min: number;
  max: number;
  step: number;
  minor?: number;
  labels?: 'ends' | 'all';
  arrow?: number;
  marks?: { at: number; label: string }[];
  mid?: boolean;
  /** Where the player's banner is planted. */
  pick?: number | null;
  /** Show the right spot (after a wrong answer). */
  correct?: number;
  /** Extra highlighted segment, e.g. the range that rounds to a value. */
  band?: [number, number];
  snap?: number;
  onPick?: (v: number) => void;
  /** Tone of the picked banner. */
  pickState?: 'right' | 'wrong' | 'nudge' | '';
}

export function snapTo(v: number, snap: number, min: number, max: number): number {
  return clean(Math.min(max, Math.max(min, Math.round((v - min) / snap) * snap + min)));
}

export function NumberLineSvg(props: NumberLineProps) {
  const { min, max, step, labels = 'ends', arrow, marks, mid, pick, correct, band } = props;
  const span = max - min;
  const x = (v: number) => PAD + ((v - min) / span) * (W - 2 * PAD);
  const majors: number[] = [];
  for (let v = min, i = 0; v <= max + 1e-9 && i < 200; v = clean(v + step), i++) majors.push(v);
  let minor = props.minor;
  if (minor === undefined) {
    const m = step / 10;
    minor = span / m <= 200 ? m : undefined;
  }
  const minors: number[] = [];
  if (minor)
    for (let v = min, i = 0; v <= max + 1e-9 && i < 400; v = clean(v + minor), i++)
      if (!majors.some((m) => Math.abs(m - v) < minor! / 2)) minors.push(v);
  const many = majors.length > 11;
  const svg = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState(false);

  const valueAt = (clientX: number) => {
    const el = svg.current;
    if (!el) return min;
    const r = el.getBoundingClientRect();
    const sx = ((clientX - r.left) / r.width) * W;
    const v = min + ((sx - PAD) / (W - 2 * PAD)) * span;
    return snapTo(v, props.snap ?? minor ?? step, min, max);
  };
  const put = (clientX: number) => {
    if (!props.onPick) return;
    const v = valueAt(clientX);
    if (v !== pick) sfx('click');
    props.onPick(v);
  };

  const fs = many ? 22 : 26;
  return (
    <svg
      ref={svg}
      class={`numberline ${props.onPick ? 'pickable' : ''}`}
      viewBox={`0 0 ${W} 170`}
      role="img"
      aria-label={`Number line from ${group(min)} to ${group(max)}`}
      onPointerDown={(e) => {
        if (!props.onPick) return;
        (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
        setDrag(true);
        put(e.clientX);
      }}
      onPointerMove={(e) => drag && put(e.clientX)}
      onPointerUp={() => setDrag(false)}
      onPointerCancel={() => setDrag(false)}
    >
      <rect x="0" y="0" width={W} height="170" fill="transparent" />
      {band && (
        <rect
          class="nl-band"
          x={x(band[0])}
          y="82"
          width={Math.max(4, x(band[1]) - x(band[0]))}
          height="22"
          rx="6"
        />
      )}
      <line class="nl-axis" x1={PAD - 20} y1="93" x2={W - PAD + 20} y2="93" />
      <path class="nl-axis-end" d={`M${W - PAD + 26} 93 l-14 -9 v18 Z`} />
      {minors.map((v) => (
        <line key={`m${v}`} class="nl-minor" x1={x(v)} y1="84" x2={x(v)} y2="102" />
      ))}
      {majors.map((v, i) => (
        <g key={`M${v}`}>
          <line class="nl-major" x1={x(v)} y1="74" x2={x(v)} y2="112" />
          {(labels === 'all'
            ? !many || i % 2 === 0 || i === majors.length - 1
            : i === 0 || i === majors.length - 1) && (
            <text class="nl-label" x={x(v)} y="145" text-anchor="middle" font-size={fs}>
              {group(v)}
            </text>
          )}
        </g>
      ))}
      {mid && (
        <g>
          <line class="nl-mid" x1={x((min + max) / 2)} y1="66" x2={x((min + max) / 2)} y2="120" />
          <text
            class="nl-mid-label"
            x={x((min + max) / 2)}
            y="58"
            text-anchor="middle"
            font-size="20"
          >
            halfway {group(clean((min + max) / 2))}
          </text>
        </g>
      )}
      {marks?.map((m) => (
        <g key={m.label}>
          <circle class="nl-mark" cx={x(m.at)} cy="93" r="9" />
          <text class="nl-mark-label" x={x(m.at)} y="56" text-anchor="middle" font-size="30">
            {m.label}
          </text>
        </g>
      ))}
      {arrow !== undefined && (
        <g class="nl-arrow">
          <path d={`M${x(arrow)} 80 l-13 -26 h26 Z`} />
          <rect x={x(arrow) - 4} y="22" width="8" height="34" rx="3" />
        </g>
      )}
      {correct !== undefined && (
        <g class="nl-correct">
          <line x1={x(correct)} y1="50" x2={x(correct)} y2="112" />
          <text x={x(correct)} y="40" text-anchor="middle" font-size="24">
            {group(correct)}
          </text>
        </g>
      )}
      {pick !== undefined && pick !== null && (
        <g class={`nl-pick ${props.pickState ?? ''}`} style={{ transition: 'transform .1s' }}>
          <line x1={x(pick)} y1="20" x2={x(pick)} y2="93" />
          <path d={`M${x(pick)} 20 l34 10 l-34 10 Z`} />
          <circle cx={x(pick)} cy="93" r="8" />
        </g>
      )}
    </svg>
  );
}
