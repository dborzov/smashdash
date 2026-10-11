/**
 * Beamhook Bay's coordinate grid: the sea seen from the lighthouse at (0, 0).
 *
 * Static: dots (ships or lettered targets) and maybe the laser beam y = m x + b.
 * Interactive (`rule` + `targets`): for each target x, the player works out y with the aim
 * rule and taps that grid point; the laser fires. When every point is hit, the beam joins
 * them up into a straight line. Taps snap to the nearest grid crossing, so it's touch-friendly.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { PlotPoint } from '../../skills/types';
import { RichInline } from '../components/Rich';
import { ruleTex } from '../../skills/graphs';
import { sfx } from '../../audio/sfx';

const CELL = 36;
const PAD_L = 34;
const PAD_B = 46;
const PAD_T = 14;
const PAD_R = 16;

/** What a tap at grid point (gx, gy) means while aiming at the point (tx, ty). */
export function aimVerdict(
  gx: number,
  gy: number,
  tx: number,
  ty: number,
): 'hit' | 'swapped' | 'column' | 'along' {
  if (gx === tx && gy === ty) return 'hit';
  if (gx === ty && gy === tx) return 'swapped';
  if (gx === tx) return 'column';
  return 'along';
}

export function PlotWidget({
  size = 10,
  points = [],
  line,
  rule,
  targets,
  aim,
  onDone,
}: {
  size?: number;
  points?: PlotPoint[];
  line?: { m: number; b: number };
  rule?: { m: number; b: number };
  targets?: number[];
  aim?: PlotPoint[];
  onDone?: () => void;
}) {
  // The points to fire at: plain ones (`aim`), or one per target x worked out with the rule.
  const goals: PlotPoint[] = aim?.length
    ? aim
    : rule && targets?.length
      ? targets.map((x) => ({ x, y: rule.m * x + rule.b }))
      : [];
  const byRule = !aim?.length;
  const interactive = goals.length > 0;
  const [hits, setHits] = useState<number>(0);
  const [msg, setMsg] = useState<string>('');
  const [splash, setSplash] = useState<{ x: number; y: number; k: number } | null>(null);
  const [beam, setBeam] = useState<{ x: number; y: number; k: number } | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!interactive) onDone?.();
  }, []);

  const W = PAD_L + size * CELL + PAD_R;
  const H = PAD_T + size * CELL + PAD_B;
  const px = (x: number) => PAD_L + x * CELL;
  const py = (y: number) => PAD_T + (size - y) * CELL;
  const done = interactive && hits >= goals.length;
  const goal = interactive && !done ? goals[hits] : null;
  const tx = goal ? goal.x : null;

  const onTap = (e: MouseEvent) => {
    if (!interactive || done || !goal || !svg.current) return;
    const box = svg.current.getBoundingClientRect();
    const sx = ((e.clientX - box.left) / box.width) * W;
    const sy = ((e.clientY - box.top) / box.height) * H;
    const gx = Math.round((sx - PAD_L) / CELL);
    const gy = Math.round(size - (sy - PAD_T) / CELL);
    if (gx < 0 || gy < 0 || gx > size || gy > size) return;
    const v = aimVerdict(gx, gy, goal.x, goal.y);
    const k = Date.now();
    if (v === 'hit') {
      sfx('zap');
      setBeam({ x: gx, y: gy, k });
      setMsg('');
      const next = hits + 1;
      setHits(next);
      if (next >= goals.length) setTimeout(() => onDone?.(), 700);
      return;
    }
    sfx('splash');
    setSplash({ x: gx, y: gy, k });
    setMsg(
      v === 'swapped'
        ? `Splash! You aimed at $(${gx}, ${gy})$ — swapped! Go **along** to ${goal.x} first, then **up**.`
        : v === 'column'
          ? byRule && rule
            ? `Right column, wrong height! Work out $y = ${rule.m} \\times ${goal.x} ${rule.b < 0 ? '-' : '+'} ${Math.abs(rule.b)}$.`
            : `Right column, wrong height! Count **up** to ${goal.y}.`
          : `Splash! That's $x = ${gx}$. We're aiming at $x = ${goal.x}$ — count along the bottom.`,
    );
  };

  const hitPts: PlotPoint[] = goals.slice(0, hits);
  const drawLine = line ?? (done && byRule ? rule : undefined);
  const lineEnd = (l: { m: number; b: number }) => {
    // From x = 0 to wherever it leaves the grid.
    const x1 = l.m > 0 ? Math.min(size, (size - l.b) / l.m) : size;
    return { x0: 0, y0: l.b, x1, y1: l.m * x1 + l.b };
  };

  return (
    <div class="plot-widget">
      {interactive && byRule && rule && (
        <div class="plot-hud">
          <span class="chip">
            🎯 Aim rule: <RichInline text={`$${ruleTex(rule.m, rule.b)}$`} />
          </span>
          <span class="plot-table">
            {goals.map((g, i) => (
              <span key={i} class={`plot-cell ${i < hits ? 'done' : i === hits ? 'now' : ''}`}>
                <RichInline text={`$x = ${g.x}$`} />
                <b>
                  <RichInline text={i < hits ? `$y = ${g.y}$` : `$y = ?$`} />
                </b>
              </span>
            ))}
          </span>
        </div>
      )}
      {interactive && !byRule && (
        <div class="plot-hud">
          {goals.map((g, i) => (
            <span key={i} class={`plot-cell ${i < hits ? 'done' : i === hits ? 'now' : ''}`}>
              <RichInline text={`${i < hits ? '💥' : '🚢'} $(${g.x}, ${g.y})$`} />
            </span>
          ))}
        </div>
      )}
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        class={`plot-svg ${interactive && !done ? 'aiming' : ''}`}
        onClick={onTap}
        role="img"
        aria-label="coordinate grid"
      >
        <defs>
          <linearGradient id="plot-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#0d2d5a" />
            <stop offset="1" stop-color="#0a4a6e" />
          </linearGradient>
          <filter id="plot-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect x="0" y="0" width={W} height={H} rx="16" fill="url(#plot-sea)" />
        {Array.from({ length: size + 1 }, (_, i) => (
          <g key={i}>
            <line
              x1={px(i)}
              y1={py(0)}
              x2={px(i)}
              y2={py(size)}
              class={i === 0 ? 'axis' : 'gridline'}
            />
            <line
              x1={px(0)}
              y1={py(i)}
              x2={px(size)}
              y2={py(i)}
              class={i === 0 ? 'axis' : 'gridline'}
            />
            <text x={px(i)} y={py(0) + 20} class="tick" text-anchor="middle">
              {i}
            </text>
            {i > 0 && (
              <text x={px(0) - 10} y={py(i) + 5} class="tick" text-anchor="end">
                {i}
              </text>
            )}
          </g>
        ))}
        <text x={px(size)} y={py(0) + 40} class="axis-label" text-anchor="end">
          x →
        </text>
        <text x={px(0) + 8} y={py(size) + 14} class="axis-label">
          y ↑
        </text>
        {/* the lighthouse at the origin */}
        <text x={px(0) - 18} y={py(0) + 40} font-size="20" text-anchor="middle">
          🗼
        </text>
        {/* a guide column for the current target */}
        {tx !== null && (
          <rect
            x={px(tx) - CELL / 2}
            y={py(size)}
            width={CELL}
            height={size * CELL}
            class="aim-column"
          />
        )}
        {drawLine &&
          (() => {
            const e = lineEnd(drawLine);
            return (
              <line
                x1={px(e.x0)}
                y1={py(e.y0)}
                x2={px(e.x1)}
                y2={py(e.y1)}
                class="laser-line"
                filter="url(#plot-glow)"
              />
            );
          })()}
        {beam && (
          <line
            key={beam.k}
            x1={px(0)}
            y1={py(0)}
            x2={px(beam.x)}
            y2={py(beam.y)}
            class="laser-shot"
            filter="url(#plot-glow)"
          />
        )}
        {points.map((p, i) => (
          <g key={`p${i}`} transform={`translate(${px(p.x)} ${py(p.y)})`}>
            {p.label && p.label.length === 1 && /[A-Z]/.test(p.label) ? (
              <>
                <circle r="13" class="target" />
                <text y="5" text-anchor="middle" class="target-label">
                  {p.label}
                </text>
              </>
            ) : p.label ? (
              <text y="8" text-anchor="middle" font-size="24">
                {p.label}
              </text>
            ) : (
              <circle r="7" class="dot" />
            )}
          </g>
        ))}
        {hitPts.map((p, i) => (
          <g key={`h${i}`} transform={`translate(${px(p.x)} ${py(p.y)})`}>
            <circle r="9" class="hit-dot" filter="url(#plot-glow)" />
            <text y="-14" text-anchor="middle" class="hit-label">
              ({p.x}, {p.y})
            </text>
          </g>
        ))}
        {splash && (
          <text
            key={splash.k}
            x={px(splash.x)}
            y={py(splash.y) + 8}
            text-anchor="middle"
            font-size="22"
            class="splash"
          >
            💦
          </text>
        )}
      </svg>
      {interactive && (
        <div class="plot-msg">
          {done ? (
            <span class="good-text">
              {byRule
                ? 'ZAP! All targets hit — and look, they sit on a perfectly straight line!'
                : 'ZAP ZAP ZAP! Every fog ship hit!'}
            </span>
          ) : msg ? (
            <RichInline text={msg} />
          ) : byRule ? (
            <RichInline text={`Work out $y$ when $x = ${tx}$, then tap that spot on the sea.`} />
          ) : (
            <RichInline
              text={`Fire at $(${goal!.x}, ${goal!.y})$! Along ${goal!.x}, then up ${goal!.y}. Tap the spot.`}
            />
          )}
        </div>
      )}
    </div>
  );
}
