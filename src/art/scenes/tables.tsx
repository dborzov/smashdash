/**
 * Backdrops for Dungeons & Times Tables: the tavern, the Doubling Dungeon, the Hall of Squares
 * and the Grid of 144 Rooms. Indoor scenes, so they're built from walls, floors and lights.
 */
import { Svg } from './kit';

/** A flickering torch on a wall bracket. */
function Torch({ x, y, c = '#ffb347' }: { x: number; y: number; c?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="70" fill={c} opacity=".18" filter="url(#blur20)" />
      <rect x="-5" y="0" width="10" height="34" fill="#3a2414" />
      <path d="M-14 0 h28 l-4 10 h-20 Z" fill="#5a3a20" />
      <path
        d="M0 -38 Q16 -16 8 -2 Q0 4 -8 -2 Q-16 -16 0 -38 Z"
        fill={c}
        style={{ transformOrigin: '0 0', animation: 'flicker 0.9s ease-in-out infinite' }}
      />
      <path d="M0 -22 Q7 -10 3 -2 Q0 1 -3 -2 Q-7 -10 0 -22 Z" fill="#fff4c2" />
    </g>
  );
}

export function Tavern() {
  return (
    <Svg>
      <defs>
        <linearGradient id="tv-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#3a2210" />
          <stop offset="1" stop-color="#7a4a22" />
        </linearGradient>
        <radialGradient id="tv-fire" cx=".5" cy=".7" r=".6">
          <stop offset="0" stop-color="#ffd166" />
          <stop offset=".5" stop-color="#ff7a3d" />
          <stop offset="1" stop-color="#ff7a3d" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#tv-wall)" />
      {/* planks */}
      {Array.from({ length: 14 }, (_, i) => (
        <line key={i} x1={i * 90} y1="0" x2={i * 90} y2="560" stroke="#2a1608" stroke-width="3" opacity=".5" />
      ))}
      {/* beams */}
      <rect x="0" y="40" width="1200" height="34" fill="#4a2a12" />
      {[150, 600, 1050].map((x) => (
        <rect key={x} x={x - 18} y="0" width="36" height="560" fill="#4a2a12" />
      ))}
      {/* shelves of gems: an array behind the bar */}
      {[0, 1, 2].map((r) => (
        <g key={r}>
          <rect x="300" y={170 + r * 80} width="240" height="10" fill="#6b4a2b" />
          {Array.from({ length: 6 }, (_, c) => (
            <path
              key={c}
              d="M0 -18 L14 -6 L9 12 L-9 12 L-14 -6 Z"
              transform={`translate(${330 + c * 36} ${160 + r * 80})`}
              fill={['#ff5fa2', '#5ec8ff', '#5ee6a8', '#ffd166'][(r + c) % 4]}
              stroke="#2a1608"
              stroke-width="2"
            />
          ))}
        </g>
      ))}
      {/* fireplace */}
      <rect x="760" y="300" width="260" height="260" fill="#5a4a44" stroke="#2a1608" stroke-width="6" />
      <rect x="800" y="380" width="180" height="180" fill="#1a0e08" />
      <ellipse cx="890" cy="520" rx="110" ry="80" fill="url(#tv-fire)" style={{ animation: 'flicker 1.2s ease-in-out infinite' }} />
      <Torch x={210} y={260} />
      <Torch x={680} y={260} />
      {/* floor and bar */}
      <rect x="0" y="560" width="1200" height="240" fill="#5a3418" />
      {Array.from({ length: 10 }, (_, i) => (
        <line key={i} x1="0" y1={580 + i * 24} x2="1200" y2={580 + i * 24} stroke="#3a2210" stroke-width="2" opacity=".6" />
      ))}
      <rect x="240" y="470" width="420" height="110" rx="8" fill="#7a4a22" stroke="#2a1608" stroke-width="5" />
      <rect x="230" y="460" width="440" height="22" rx="6" fill="#9a6a3a" stroke="#2a1608" stroke-width="4" />
      {[300, 380, 560].map((x, i) => (
        <g key={x} transform={`translate(${x} 430)`}>
          <rect x="-12" y="0" width="24" height="32" rx="4" fill="#ffd166" opacity=".85" />
          <rect x="-12" y="-6" width="24" height="10" rx="4" fill="#fff4dc" style={{ animation: `bob ${2 + i * 0.4}s ease-in-out infinite` }} />
        </g>
      ))}
      {/* a sign */}
      <g transform="translate(420 100)">
        <rect x="-110" y="-26" width="220" height="52" rx="8" fill="#2a1608" stroke="#ffb347" stroke-width="3" />
        <text y="9" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="26" fill="#ffd166">
          GEM &amp; TONIC
        </text>
      </g>
    </Svg>
  );
}

export function Dungeon() {
  return (
    <Svg>
      <defs>
        <linearGradient id="dg-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0a1014" />
          <stop offset="1" stop-color="#26343a" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#dg-bg)" />
      {/* stone blocks */}
      {Array.from({ length: 12 }, (_, r) =>
        Array.from({ length: 11 }, (_, c) => (
          <rect
            key={`${r}-${c}`}
            x={c * 120 - (r % 2) * 60}
            y={r * 52}
            width="116"
            height="48"
            rx="4"
            fill={['#2e3a40', '#33424a', '#2a343a'][(r * 3 + c) % 3]}
          />
        )),
      )}
      {/* a corridor of arches that double into the distance */}
      {[1, 2, 4, 8].map((k, i) => {
        const w = 520 / (i + 1);
        const h = 520 / (i + 1);
        return (
          <path
            key={k}
            d={`M${600 - w / 2} ${600} L${600 - w / 2} ${600 - h * 0.6} Q600 ${600 - h * 1.05} ${600 + w / 2} ${600 - h * 0.6} L${600 + w / 2} 600`}
            fill="none"
            stroke="#5a6a72"
            stroke-width={14 / (i + 1)}
          />
        );
      })}
      <ellipse cx="600" cy="420" rx="60" ry="80" fill="#5ee6a8" opacity=".15" filter="url(#blur20)" />
      <Torch x={220} y={330} c="#5ee6a8" />
      <Torch x={980} y={330} c="#5ee6a8" />
      {/* chains */}
      {[120, 1080].map((x) => (
        <g key={x}>
          {Array.from({ length: 8 }, (_, i) => (
            <ellipse key={i} cx={x} cy={20 + i * 26} rx="9" ry="14" fill="none" stroke="#7a868c" stroke-width="5" />
          ))}
        </g>
      ))}
      <rect x="0" y="600" width="1200" height="200" fill="#1a2226" />
      {Array.from({ length: 9 }, (_, i) => (
        <line key={i} x1={i * 150} y1="600" x2={600 + (i * 150 - 600) * 2} y2="800" stroke="#2e3a40" stroke-width="3" />
      ))}
    </Svg>
  );
}

export function SquareHall() {
  return (
    <Svg>
      <defs>
        <linearGradient id="sq-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#1a0a2e" />
          <stop offset="1" stop-color="#5a2a7a" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#sq-bg)" />
      {/* square windows: 1, 4, 9, 16 panes */}
      {[1, 2, 3, 4].map((n, i) => {
        const x = 170 + i * 280;
        const s = 150;
        return (
          <g key={n} transform={`translate(${x - s / 2} 130)`}>
            <rect width={s} height={s} fill="#ff7ab8" opacity=".25" filter="url(#blur8)" />
            <rect width={s} height={s} fill="#2a1046" stroke="#ffd1ea" stroke-width="5" />
            {Array.from({ length: n * n }, (_, k) => (
              <rect
                key={k}
                x={4 + (k % n) * ((s - 8) / n)}
                y={4 + Math.floor(k / n) * ((s - 8) / n)}
                width={(s - 8) / n - 4}
                height={(s - 8) / n - 4}
                fill="#ffb3d9"
                opacity=".55"
                style={{ animation: `twinkle ${2 + ((k * 7) % 5) * 0.3}s ease-in-out infinite` }}
              />
            ))}
          </g>
        );
      })}
      {/* pillars */}
      {[40, 1160].map((x) => (
        <rect key={x} x={x - 30} y="0" width="60" height="600" fill="#3a1a5a" stroke="#1a0a2e" stroke-width="4" />
      ))}
      {/* chequered floor in perspective */}
      <rect x="0" y="560" width="1200" height="240" fill="#2e1a46" />
      {Array.from({ length: 6 }, (_, r) =>
        Array.from({ length: 12 }, (_, c) => {
          const y0 = 560 + r * 40;
          const y1 = y0 + 40;
          const sx = (y: number) => 1 + (y - 560) / 300;
          const xa = (cx: number, y: number) => 600 + (cx - 600) * sx(y);
          const xl = c * 100;
          return (
            <path
              key={`${r}-${c}`}
              d={`M${xa(xl, y0)} ${y0} L${xa(xl + 100, y0)} ${y0} L${xa(xl + 100, y1)} ${y1} L${xa(xl, y1)} ${y1} Z`}
              fill={(r + c) % 2 ? '#ff7ab8' : '#3a1a5a'}
              opacity=".85"
            />
          );
        }),
      )}
    </Svg>
  );
}

export function GridRoom() {
  return (
    <Svg>
      <defs>
        <linearGradient id="gr-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#030a14" />
          <stop offset="1" stop-color="#0e2a4a" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#gr-bg)" />
      {/* the table as a glowing map on the back wall */}
      <g transform="translate(330 70)" opacity=".9">
        {Array.from({ length: 13 }, (_, i) => (
          <g key={i}>
            <line x1={i * 45} y1="0" x2={i * 45} y2="540" stroke="#7dd3fc" stroke-width="2" opacity=".5" />
            <line x1="0" y1={i * 45} x2="540" y2={i * 45} stroke="#7dd3fc" stroke-width="2" opacity=".5" />
          </g>
        ))}
        {Array.from({ length: 12 }, (_, r) =>
          Array.from({ length: 12 }, (_, c) =>
            (r * 5 + c * 3) % 7 === 0 ? (
              <text
                key={`${r}-${c}`}
                x={c * 45 + 22}
                y={r * 45 + 30}
                text-anchor="middle"
                font-family="Fredoka"
                font-weight="700"
                font-size="18"
                fill={r === c ? '#ff7ab8' : '#ffd166'}
                style={{ animation: `twinkle ${2 + ((r + c) % 4) * 0.5}s ease-in-out infinite` }}
              >
                {(r + 1) * (c + 1)}
              </text>
            ) : null,
          ),
        )}
      </g>
      <rect x="0" y="620" width="1200" height="180" fill="#06121f" />
      {Array.from({ length: 14 }, (_, i) => (
        <line key={i} x1={i * 100 - 100} y1="620" x2={600 + (i * 100 - 700) * 2.2} y2="800" stroke="#1a4a7a" stroke-width="2" />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <line key={i} x1="0" y1={640 + i * i * 9} x2="1200" y2={640 + i * i * 9} stroke="#1a4a7a" stroke-width="2" />
      ))}
      {/* saloon doors on the side */}
      <g transform="translate(110 470)">
        <rect x="-60" y="0" width="56" height="110" rx="6" fill="#8a5a2a" stroke="#2a1608" stroke-width="4" />
        <rect x="4" y="0" width="56" height="110" rx="6" fill="#8a5a2a" stroke="#2a1608" stroke-width="4" />
      </g>
    </Svg>
  );
}
