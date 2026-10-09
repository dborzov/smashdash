/** Mystery boxes and coins: "3x + 7" as a picture. Tap boxes to open them when `reveal` is set. */
import { useEffect, useState } from 'preact/hooks';
import { sfx } from '../../audio/sfx';

export function Crate({
  open,
  value,
  size = 64,
}: {
  open?: boolean;
  value?: number;
  size?: number;
}) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} class="crate">
      <defs>
        <linearGradient id="crate-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ff7ab8" />
          <stop offset="1" stop-color="#c2185b" />
        </linearGradient>
      </defs>
      <rect
        x="6"
        y="14"
        width="52"
        height="44"
        rx="8"
        fill="url(#crate-g)"
        stroke="#6d0f3a"
        stroke-width="3"
      />
      <rect
        x="10"
        y="18"
        width="44"
        height="36"
        rx="5"
        fill="none"
        stroke="#ffb3d6"
        stroke-width="2"
        opacity=".6"
      />
      {open ? (
        <>
          <rect
            x="2"
            y="2"
            width="60"
            height="12"
            rx="5"
            fill="#ff8cc6"
            stroke="#6d0f3a"
            stroke-width="3"
            transform="rotate(-18 8 14)"
          />
          <text
            x="32"
            y="47"
            text-anchor="middle"
            font-family="Fredoka, sans-serif"
            font-weight="700"
            font-size={value !== undefined && String(value).length > 2 ? 18 : 26}
            fill="#ffe27a"
            stroke="#6d0f3a"
            stroke-width="1"
          >
            {value}
          </text>
        </>
      ) : (
        <>
          <rect
            x="3"
            y="8"
            width="58"
            height="12"
            rx="5"
            fill="#ff8cc6"
            stroke="#6d0f3a"
            stroke-width="3"
          />
          <text
            x="32"
            y="49"
            text-anchor="middle"
            font-family="Fredoka, sans-serif"
            font-weight="700"
            font-size="26"
            fill="#fff"
            font-style="italic"
          >
            x
          </text>
        </>
      )}
    </svg>
  );
}

export function Coin({ size = 34 }: { size?: number }) {
  return (
    <svg viewBox="0 0 34 34" width={size} height={size}>
      <circle cx="17" cy="17" r="15" fill="#ffd166" stroke="#a86b00" stroke-width="2.5" />
      <circle cx="17" cy="17" r="10" fill="none" stroke="#e0a526" stroke-width="2" />
      <path
        d="M11 11 Q14 8 18 8"
        stroke="#fff6c8"
        stroke-width="2.5"
        fill="none"
        stroke-linecap="round"
      />
    </svg>
  );
}

export function BoxesWidget({
  a,
  b,
  reveal,
  onDone,
}: {
  a: number;
  b: number;
  reveal?: number;
  onDone?: () => void;
}) {
  const [opened, setOpened] = useState<boolean[]>(() => Array(a).fill(false));
  const all = opened.every(Boolean);
  useEffect(() => {
    if (reveal === undefined) onDone?.();
  }, []);
  const tap = (i: number) => {
    if (reveal === undefined || opened[i]) return;
    sfx('pop');
    const next = opened.slice();
    next[i] = true;
    setOpened(next);
    if (next.every(Boolean)) setTimeout(() => onDone?.(), 300);
  };
  return (
    <div
      class="boxes-widget"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '6px 0',
      }}
    >
      {opened.map((o, i) => (
        <button
          key={`b${i}`}
          onClick={() => tap(i)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: reveal !== undefined && !o ? 'pointer' : 'default',
          }}
          class={reveal !== undefined && !o ? 'anim-bob' : ''}
          aria-label={o ? `box with ${reveal}` : 'mystery box'}
        >
          <Crate open={o} value={reveal} />
        </button>
      ))}
      {b > 0 && a > 0 && (
        <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--gold)', margin: '0 4px' }}>
          +
        </span>
      )}
      {b > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '2px',
            maxWidth: '260px',
            justifyContent: 'center',
          }}
        >
          {b <= 12 ? (
            Array.from({ length: b }, (_, i) => <Coin key={i} />)
          ) : (
            <span class="row">
              <Coin size={44} />
              <b style={{ fontSize: '1.6rem', color: 'var(--gold)' }}>× {b}</b>
            </span>
          )}
        </div>
      )}
      {reveal !== undefined && all && a > 0 && (
        <div
          style={{
            width: '100%',
            textAlign: 'center',
            fontFamily: 'var(--font-display)',
            fontSize: '1.3rem',
            color: 'var(--gold)',
          }}
        >
          {a} × {reveal}
          {b ? ` + ${b}` : ''} = {a * reveal + b}
        </div>
      )}
    </div>
  );
}
