/**
 * Interactive balance scale. Pans hold mystery boxes (x) and coins. The beam tilts when the
 * two sides weigh different amounts — the core picture behind "do the same to both sides".
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Pan } from '../../skills/types';
import { renderMath } from '../math';
import { lin } from '../../skills/balance';
import { sfx } from '../../audio/sfx';

/** Springy animation of a number towards `target` (for the swinging beam). */
function useSpring(target: number): number {
  const [v, setV] = useState(target);
  const st = useRef({ x: target, vel: 0 });
  useEffect(() => {
    let raf = 0;
    const step = () => {
      const s = st.current;
      s.vel = (s.vel + (target - s.x) * 0.08) * 0.82;
      s.x += s.vel;
      setV(s.x);
      if (Math.abs(s.vel) > 0.01 || Math.abs(target - s.x) > 0.01)
        raf = requestAnimationFrame(step);
      else setV((s.x = target));
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}

type Tool = 'both' | 'left' | 'right' | 'divide' | 'boxes';
type Goal = 'isolate' | 'tip' | 'none';

function side(p: Pan): string {
  if (p.x === 0) return String(p.c);
  return lin(p.x, p.c);
}

function PanContents({ pan, cx, y }: { pan: Pan; cx: number; y: number }) {
  // Lay out boxes first, then coins, in rows on the pan.
  const items: ('x' | 'c')[] = [...Array(pan.x).fill('x'), ...Array(Math.min(pan.c, 14)).fill('c')];
  const perRow = 5;
  const out = [];
  const rows = Math.ceil(items.length / perRow);
  for (let i = 0; i < items.length; i++) {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const inRow = Math.min(perRow, items.length - row * perRow);
    const x = cx + (col - (inRow - 1) / 2) * 26;
    const ry = y - 14 - row * 24;
    out.push(
      items[i] === 'x' ? (
        <g key={i} transform={`translate(${x - 12} ${ry - 12})`}>
          <rect width="24" height="22" rx="4" fill="#e83e8c" stroke="#6d0f3a" stroke-width="2" />
          <rect
            y="-3"
            width="24"
            height="6"
            rx="2"
            fill="#ff8cc6"
            stroke="#6d0f3a"
            stroke-width="2"
          />
          <text
            x="12"
            y="17"
            text-anchor="middle"
            font-family="Fredoka"
            font-weight="700"
            font-size="14"
            fill="#fff"
            font-style="italic"
          >
            x
          </text>
        </g>
      ) : (
        <g key={i} transform={`translate(${x} ${ry})`}>
          <ellipse rx="11" ry="10" fill="#ffd166" stroke="#a86b00" stroke-width="2" />
          <ellipse rx="6" ry="5" fill="none" stroke="#e0a526" stroke-width="1.5" />
        </g>
      ),
    );
  }
  return (
    <g>
      {out}
      {pan.c > 14 && (
        <text
          x={cx}
          y={y - 14 - rows * 24}
          text-anchor="middle"
          font-family="Fredoka"
          font-weight="700"
          font-size="16"
          fill="#ffd166"
        >
          {pan.c} coins
        </text>
      )}
    </g>
  );
}

export function BalanceWidget({
  left: l0,
  right: r0,
  value,
  goal = 'none',
  tools = [],
  onDone,
}: {
  left: Pan;
  right: Pan;
  value?: number;
  goal?: Goal;
  tools?: Tool[];
  onDone?: () => void;
}) {
  const v = useMemo(
    () => value ?? (l0.x > 0 ? (r0.c - l0.c) / (l0.x - r0.x || 1) : 1),
    [value, l0, r0],
  );
  const [L, setL] = useState<Pan>(l0);
  const [R, setR] = useState<Pan>(r0);
  const [done, setDone] = useState(false);
  const wl = L.x * v + L.c;
  const wr = R.x * v + R.c;
  const diff = wl - wr;
  const angle = useSpring(Math.max(-16, Math.min(16, -diff * 3)));
  const balanced = Math.abs(diff) < 1e-9;

  useEffect(() => {
    if (done) return;
    const isolated =
      balanced && ((L.x === 1 && L.c === 0 && R.x === 0) || (R.x === 1 && R.c === 0 && L.x === 0));
    if (goal === 'none' || (goal === 'tip' && !balanced) || (goal === 'isolate' && isolated)) {
      setDone(true);
      if (goal !== 'none') setTimeout(() => onDone?.(), goal === 'tip' ? 700 : 400);
      else onDone?.();
    }
  }, [L, R]);

  const change = (which: 'left' | 'right' | 'both', d: number) => {
    sfx(d > 0 ? 'coin' : 'click');
    if (which !== 'right') setL((p) => ({ ...p, c: Math.max(0, p.c + d) }));
    if (which !== 'left') setR((p) => ({ ...p, c: Math.max(0, p.c + d) }));
    if (goal === 'tip' && which !== 'both') sfx('hit');
  };
  const n = L.x > 1 ? L.x : R.x > 1 ? R.x : 0;
  const canDivide = n > 1 && L.x % n === 0 && R.x % n === 0 && L.c % n === 0 && R.c % n === 0;
  const divide = () => {
    sfx('whoosh');
    setL((p) => ({ x: p.x / n, c: p.c / n }));
    setR((p) => ({ x: p.x / n, c: p.c / n }));
  };

  const eq = `${side(L)} ${balanced ? '=' : '\\neq'} ${side(R)}`;
  const W = 460;
  const cx = W / 2;
  const beamY = 70;
  const arm = 150;
  const rad = (angle * Math.PI) / 180;
  const lx = cx - arm * Math.cos(rad);
  const ly = beamY - arm * Math.sin(rad);
  const rx = cx + arm * Math.cos(rad);
  const ry = beamY + arm * Math.sin(rad);
  const panDrop = 110;

  return (
    <div class="balance-widget">
      <svg
        viewBox={`0 0 ${W} 250`}
        style={{ width: '100%', maxWidth: '520px', display: 'block', margin: '0 auto' }}
      >
        <defs>
          <linearGradient id="brass" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stop-color="#ffe08a" />
            <stop offset="1" stop-color="#c98b14" />
          </linearGradient>
        </defs>
        {/* stand */}
        <path
          d={`M${cx - 60} 240 L${cx + 60} 240 L${cx + 14} 214 L${cx - 14} 214 Z`}
          fill="#6b4a2b"
          stroke="#3a2614"
          stroke-width="3"
        />
        <rect
          x={cx - 8}
          y={beamY}
          width="16"
          height="148"
          fill="url(#brass)"
          stroke="#7a5200"
          stroke-width="2"
        />
        {/* beam */}
        <g transform={`rotate(${angle} ${cx} ${beamY})`}>
          <rect
            x={cx - arm - 6}
            y={beamY - 6}
            width={arm * 2 + 12}
            height="12"
            rx="6"
            fill="url(#brass)"
            stroke="#7a5200"
            stroke-width="2"
          />
        </g>
        <circle cx={cx} cy={beamY} r="13" fill="#ffd166" stroke="#7a5200" stroke-width="3" />
        <text
          x={cx}
          y={beamY + 5}
          text-anchor="middle"
          font-family="Fredoka"
          font-weight="700"
          font-size="15"
          fill="#7a5200"
        >
          {balanced ? '=' : '≠'}
        </text>
        {/* pans */}
        {[
          { x: lx, y: ly, pan: L },
          { x: rx, y: ry, pan: R },
        ].map((p, i) => (
          <g key={i}>
            <line
              x1={p.x}
              y1={p.y}
              x2={p.x - 60}
              y2={p.y + panDrop}
              stroke="#c9a24a"
              stroke-width="2"
            />
            <line
              x1={p.x}
              y1={p.y}
              x2={p.x + 60}
              y2={p.y + panDrop}
              stroke="#c9a24a"
              stroke-width="2"
            />
            <PanContents pan={p.pan} cx={p.x} y={p.y + panDrop} />
            <path
              d={`M${p.x - 72} ${p.y + panDrop} Q${p.x} ${p.y + panDrop + 34} ${p.x + 72} ${p.y + panDrop} Z`}
              fill="url(#brass)"
              stroke="#7a5200"
              stroke-width="3"
            />
          </g>
        ))}
      </svg>
      <div
        class="math-big"
        style={{ fontSize: '1.8rem', color: balanced ? 'inherit' : 'var(--danger)' }}
        dangerouslySetInnerHTML={{ __html: renderMath(eq, true) }}
      />
      {tools.length > 0 && (
        <div class="row wrap" style={{ justifyContent: 'center', gap: '8px' }}>
          {tools.includes('both') && (
            <>
              <button class="btn small mint" onClick={() => change('both', 1)}>
                +1 coin to both
              </button>
              <button
                class="btn small"
                disabled={L.c === 0 || R.c === 0}
                onClick={() => change('both', -1)}
              >
                −1 coin from both
              </button>
            </>
          )}
          {tools.includes('left') && (
            <button class="btn small ghost" disabled={L.c === 0} onClick={() => change('left', -1)}>
              −1 coin from left
            </button>
          )}
          {tools.includes('right') && (
            <button
              class="btn small ghost"
              disabled={R.c === 0}
              onClick={() => change('right', -1)}
            >
              −1 coin from right
            </button>
          )}
          {tools.includes('divide') && (
            <button class="btn small gold" disabled={!canDivide} onClick={divide}>
              Split both into {n || '…'} equal groups
            </button>
          )}
          {(goal !== 'tip' || !balanced) && (L.c !== l0.c || R.c !== r0.c || L.x !== l0.x) && (
            <button
              class="btn small ghost"
              onClick={() => {
                setL(l0);
                setR(r0);
                setDone(goal === 'none');
              }}
            >
              ↺ Reset
            </button>
          )}
        </div>
      )}
    </div>
  );
}
