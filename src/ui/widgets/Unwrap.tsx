/**
 * A box wrapped in layers of operations, like a present. `layers` go from the inside out:
 * ['\\times 3', '+ 5'] is 3x + 5. Only the outermost layer can be removed.
 */
import { useState } from 'preact/hooks';
import { renderMath } from '../math';
import { Crate } from './Boxes';
import { sfx } from '../../audio/sfx';

type Op = { op: '+' | '-' | '*' | '/'; k: number };

function parse(layer: string): Op {
  const t = layer
    .replace(/\\times/, '*')
    .replace(/\\div/, '/')
    .replace(/\s+/g, '');
  const op = t[0] as Op['op'];
  return { op, k: Number(t.slice(1)) };
}

/** Builds the LaTeX expression for the first n layers around x. */
export function wrapExpr(layers: string[], n = layers.length): string {
  let e = 'x';
  let compound = false;
  for (const l of layers.slice(0, n)) {
    const { op, k } = parse(l);
    if (op === '+' || op === '-') {
      e = `${e} ${op} ${k}`;
      compound = true;
    } else if (op === '*') {
      e = compound ? `${k}(${e})` : `${k}${e}`;
      compound = false;
    } else {
      e = `\\frac{${e}}{${k}}`;
      compound = false;
    }
  }
  return e;
}

function apply(v: number, { op, k }: Op): number {
  return op === '+' ? v + k : op === '-' ? v - k : op === '*' ? v * k : v / k;
}

const undoText = ({ op, k }: Op) =>
  op === '+' ? `− ${k}` : op === '-' ? `+ ${k}` : op === '*' ? `÷ ${k}` : `× ${k}`;
const COLORS = ['#ffd166', '#5ee6a8', '#7dd3fc', '#ff9f43'];

export function UnwrapWidget({
  layers,
  value,
  onDone,
}: {
  layers: string[];
  value?: number;
  onDone?: () => void;
}) {
  const [left, setLeft] = useState(layers.length);
  const [oops, setOops] = useState<number | null>(null);
  const ops = layers.map(parse);
  const v = value ?? 4;
  const totals = ops.reduce<number[]>((acc, o) => [...acc, apply(acc[acc.length - 1], o)], [v]);

  const tap = (i: number) => {
    if (i !== left - 1) {
      setOops(i);
      sfx('wrong');
      setTimeout(() => setOops(null), 900);
      return;
    }
    sfx('whoosh');
    setLeft(left - 1);
    if (left - 1 === 0) setTimeout(() => onDone?.(), 500);
  };

  const eq = left === 0 ? `x = ${v}` : `${wrapExpr(layers, left)} = ${totals[left]}`;
  // Nested boxes: outermost first.
  let inner = (
    <div style={{ padding: '8px' }}>
      <Crate open={left === 0} value={v} size={70} />
    </div>
  );
  for (let i = 0; i < left; i++) {
    const o = ops[i];
    inner = (
      <button
        onClick={(e) => {
          e.stopPropagation();
          tap(i);
        }}
        style={{
          border: `4px dashed ${COLORS[i % COLORS.length]}`,
          background: `${COLORS[i % COLORS.length]}22`,
          borderRadius: '20px',
          padding: '6px 10px 10px',
          cursor: 'pointer',
          animation: oops === i ? 'shake .4s' : undefined,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          color: '#fff',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '1.2rem',
            color: COLORS[i % COLORS.length],
          }}
        >
          {o.op === '*' ? '×' : o.op === '/' ? '÷' : o.op === '-' ? '−' : '+'} {o.k}
        </span>
        {inner}
      </button>
    );
  }
  return (
    <div class="unwrap-widget" style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>{inner}</div>
      <div class="math-big" dangerouslySetInnerHTML={{ __html: renderMath(eq, true) }} />
      {oops !== null && (
        <div style={{ color: 'var(--danger)', fontWeight: 700 }}>
          That layer is still wrapped inside another one! Outside first.
        </div>
      )}
      {left > 0 && oops === null && (
        <div class="muted">
          Tap the outer layer to undo it with{' '}
          <b style={{ color: 'var(--gold)' }}>{undoText(ops[left - 1])}</b>
        </div>
      )}
    </div>
  );
}
