/** Procedural painting helpers: smooth hills, jagged ridges and blobs as SVG paths. */
import { Rng } from '../engine/rng';

type Pt = [number, number];

/** Catmull-Rom spline through points, as cubic Bézier path commands (no initial M). */
function smooth(pts: Pt[], closed = false): string {
  const p = closed
    ? [pts[pts.length - 1], ...pts, pts[0], pts[1]]
    : [pts[0], ...pts, pts[pts.length - 1]];
  let d = '';
  for (let i = 1; i < p.length - 2; i++) {
    const [x0, y0] = p[i - 1];
    const [x1, y1] = p[i];
    const [x2, y2] = p[i + 1];
    const [x3, y3] = p[i + 2];
    const c1x = x1 + (x2 - x0) / 6;
    const c1y = y1 + (y2 - y0) / 6;
    const c2x = x2 - (x3 - x1) / 6;
    const c2y = y2 - (y3 - y1) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }
  return d;
}

/** Rolling hills along y with amplitude amp, closed to the bottom of a w×h canvas. */
export function hills(seed: number, y: number, amp: number, n = 6, w = 1200, h = 800): string {
  const rng = new Rng(seed);
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++)
    pts.push([(i / n) * (w + 200) - 100, y + (rng.next() - 0.5) * 2 * amp]);
  return `M${pts[0][0]} ${h + 10} L${pts[0][0]} ${pts[0][1]}${smooth(pts)} L${pts[n][0]} ${h + 10} Z`;
}

/** Jagged mountain ridge. Returns the path and the peak points (for snow caps). */
export function ridge(
  seed: number,
  y: number,
  amp: number,
  n = 7,
  w = 1200,
  h = 800,
): { d: string; peaks: Pt[] } {
  const rng = new Rng(seed);
  const pts: Pt[] = [];
  const peaks: Pt[] = [];
  for (let i = 0; i <= n * 2; i++) {
    const x = (i / (n * 2)) * (w + 200) - 100 + (rng.next() - 0.5) * 30;
    const up = i % 2 === 1;
    const py = up ? y - amp * (0.5 + rng.next() * 0.6) : y + amp * (rng.next() * 0.25);
    pts.push([x, py]);
    if (up) peaks.push([x, py]);
  }
  const d =
    `M${pts[0][0]} ${h + 10} ` +
    pts.map(([x, py]) => `L${x.toFixed(1)} ${py.toFixed(1)}`).join(' ') +
    ` L${pts[pts.length - 1][0]} ${h + 10} Z`;
  return { d, peaks };
}

/** Snow cap polygon for a peak at (x, y) with slope widths. */
export function snowCap([x, y]: Pt, depth = 40, seed = 1): string {
  const rng = new Rng(seed + Math.round(x));
  const w = depth * 0.9;
  return `M${x} ${y} L${x + w} ${y + depth} L${x + w * 0.45} ${y + depth * (0.75 + rng.next() * 0.2)} L${x} ${y + depth * 1.05} L${x - w * 0.5} ${y + depth * 0.8} L${x - w} ${y + depth} Z`;
}

/** A closed wobbly blob around (cx, cy). */
export function blob(
  seed: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  bumps = 5,
  wobble = 0.12,
  points = 16,
): string {
  const rng = new Rng(seed);
  const phase = rng.next() * Math.PI * 2;
  const pts: Pt[] = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const k = 1 + Math.sin(a * bumps + phase) * wobble + (rng.next() - 0.5) * wobble * 0.6;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}${smooth(pts, true)} Z`;
}

export const hsl = (h: number, s: number, l: number, a = 1) =>
  `hsla(${Math.round(h)}, ${s}%, ${l}%, ${a})`;
