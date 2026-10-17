/**
 * Backdrops for The Muddler Strikes Back: Subzero Springs (frozen hot springs and a pirate ship
 * stuck in the ice), the Lost & Found Hall (shelves to the ceiling), the Twin Scales (a marble
 * hall with two giant balances) and the Riddle Maze (hedges, pyramids and a sphinx at dusk).
 */
import { Svg } from './kit';
import { Rng } from '../../engine/rng';

export function Subzero() {
  return (
    <Svg>
      <defs>
        <linearGradient id="sz-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0a2a4a" />
          <stop offset=".7" stop-color="#4fa3d9" />
          <stop offset="1" stop-color="#bfe6ff" />
        </linearGradient>
        <linearGradient id="sz-ice" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#e8f8ff" />
          <stop offset="1" stop-color="#9fd8ff" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#sz-sky)" />
      {/* aurora */}
      <path d="M0 140 Q300 40 600 150 T1200 110" fill="none" stroke="#5ee6a8" stroke-width="40" opacity=".22" filter="url(#blur20)" style={{ animation: 'sway 9s ease-in-out infinite alternate', transformOrigin: '600px 120px' }} />
      <path d="M0 200 Q400 110 800 210 T1200 170" fill="none" stroke="#c08cff" stroke-width="30" opacity=".18" filter="url(#blur20)" />
      {/* icy peaks */}
      <path d="M0 520 L140 300 L250 430 L380 250 L520 460 L660 280 L800 470 L930 300 L1060 440 L1200 320 L1200 800 L0 800 Z" fill="#7fb8e0" />
      <path d="M140 300 L175 355 L120 360 Z M380 250 L420 315 L350 320 Z M660 280 L700 340 L630 345 Z M930 300 L965 352 L900 356 Z" fill="#fff" />
      {/* the frozen springs */}
      <ellipse cx="600" cy="660" rx="560" ry="120" fill="url(#sz-ice)" />
      <ellipse cx="360" cy="650" rx="140" ry="34" fill="#cfefff" stroke="#fff" stroke-width="4" />
      <ellipse cx="820" cy="690" rx="180" ry="40" fill="#cfefff" stroke="#fff" stroke-width="4" />
      {[330, 380, 800, 860].map((x, i) => (
        <path key={x} d={`M${x} ${640 + (i % 2) * 40} q-10 -40 6 -70 q14 -30 -4 -60`} fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".5" style={{ animation: `smoke ${4 + i}s ease-in-out infinite` }} />
      ))}
      {/* the pirate ship, stuck in the ice */}
      <g transform="translate(980 600) rotate(-6)">
        <path d="M-120 0 L120 0 L90 50 L-90 50 Z" fill="#6a3a1a" stroke="#2a140a" stroke-width="5" />
        <rect x="-4" y="-170" width="8" height="170" fill="#2a140a" />
        <path d="M4 -160 L80 -120 L4 -80 Z" fill="#f4f4f4" stroke="#2a140a" stroke-width="3" />
        <path d="M-4 -160 L-60 -60 L-4 -60 Z" fill="#e8e8e8" stroke="#2a140a" stroke-width="3" />
        <rect x="-26" y="-196" width="52" height="30" fill="#111" />
        <text x="0" y="-174" text-anchor="middle" font-family="Fredoka" font-size="22" fill="#fff">
          −
        </text>
        <path d="M-130 46 Q0 70 130 46 L130 70 L-130 70 Z" fill="#dff2ff" />
      </g>
      {/* a giant thermometer */}
      <g transform="translate(120 560)">
        <rect x="-14" y="-200" width="28" height="210" rx="14" fill="#fff" stroke="#14306a" stroke-width="5" />
        <circle cx="0" cy="20" r="24" fill="#5ec8ff" stroke="#14306a" stroke-width="5" />
        <rect x="-6" y="-30" width="12" height="50" fill="#5ec8ff" />
        {[-180, -140, -100, -60].map((y) => (
          <line key={y} x1="14" y1={y} x2="26" y2={y} stroke="#14306a" stroke-width="3" />
        ))}
        <text x="34" y="-94" font-family="Fredoka" font-weight="700" font-size="22" fill="#14306a">
          0
        </text>
        <text x="34" y="-14" font-family="Fredoka" font-weight="700" font-size="22" fill="#14306a">
          −18
        </text>
      </g>
      {/* penguins */}
      {[520, 580, 640].map((x, i) => (
        <g key={x} transform={`translate(${x} ${612 - i * 4})`} style={{ animation: `waddle ${1.2 + i * 0.2}s ease-in-out infinite alternate`, transformOrigin: `${x}px 640px` }}>
          <ellipse cx="0" cy="0" rx="16" ry="24" fill="#1a1a2a" />
          <ellipse cx="0" cy="5" rx="10" ry="17" fill="#fff" />
          <circle cx="-4" cy="-12" r="2" fill="#fff" />
          <path d="M0 -6 l7 3 l-7 3 Z" fill="#ffb347" />
        </g>
      ))}
    </Svg>
  );
}

export function LostFound() {
  const rng = new Rng(22);
  const things = ['🧦', '☂️', '🎺', '🧤', '🎩', '📦', '🧸', '🥾', '🎒', '🔑', '🧦', '🪀'];
  return (
    <Svg>
      <defs>
        <linearGradient id="lf-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#2a1a3a" />
          <stop offset="1" stop-color="#6a4a5a" />
        </linearGradient>
        <radialGradient id="lf-lamp">
          <stop offset="0" stop-color="#ffe08a" stop-opacity=".7" />
          <stop offset="1" stop-color="#ffe08a" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#lf-wall)" />
      {/* shelves to the ceiling */}
      {[0, 1, 2, 3].map((col) => (
        <g key={col} transform={`translate(${40 + col * 300} 0)`}>
          <rect x="0" y="40" width="250" height="620" fill="#4a2e1e" stroke="#2a140a" stroke-width="6" />
          {[0, 1, 2, 3, 4].map((row) => (
            <g key={row}>
              <rect x="0" y={150 + row * 110} width="250" height="12" fill="#7a4e2e" />
              {Array.from({ length: 4 }, (_, k) => {
                const t = things[(col * 5 + row * 3 + k) % things.length];
                return (
                  <text key={k} x={20 + k * 58} y={142 + row * 110} font-size={rng.int(34, 48)} opacity=".9">
                    {t}
                  </text>
                );
              })}
            </g>
          ))}
        </g>
      ))}
      {/* hanging lamps */}
      {[190, 600, 1010].map((x, i) => (
        <g key={x} style={{ animation: `sway ${3 + i}s ease-in-out infinite alternate`, transformOrigin: `${x}px 0px` }}>
          <line x1={x} y1="0" x2={x} y2="90" stroke="#1a0e0a" stroke-width="3" />
          <circle cx={x} cy="140" r="140" fill="url(#lf-lamp)" />
          <path d={`M${x - 30} 110 L${x + 30} 110 L${x + 18} 90 L${x - 18} 90 Z`} fill="#c9a26a" stroke="#1a0e0a" stroke-width="3" />
        </g>
      ))}
      {/* the counter and Marge's sign */}
      <rect x="0" y="660" width="1200" height="140" fill="#3a2414" />
      <rect x="380" y="610" width="440" height="80" rx="8" fill="#8a5a3a" stroke="#2a140a" stroke-width="6" />
      <rect x="440" y="560" width="320" height="56" rx="6" fill="#fff4dc" stroke="#2a140a" stroke-width="4" />
      <text x="600" y="598" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="30" fill="#3a2414">
        LOST &amp; FOUND
      </text>
      <text x="600" y="664" text-anchor="middle" font-family="Fredoka" font-size="20" fill="#fff4dc">
        LIKE WITH LIKE · SHHH
      </text>
      {/* the mountain of socks */}
      <path d="M40 800 Q140 640 260 700 Q330 620 420 800 Z" fill="#c9a26a" opacity=".6" />
      {[90, 160, 230, 300, 360].map((x, i) => (
        <text key={x} x={x} y={760 - (i % 2) * 40} font-size="40" style={{ animation: `bob ${3 + i * 0.3}s ease-in-out infinite` }}>
          🧦
        </text>
      ))}
    </Svg>
  );
}

function Scales({ x, y, tilt }: { x: number; y: number; tilt: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-14" y="0" width="28" height="300" fill="#e8dcc0" stroke="#6a5a3a" stroke-width="4" />
      <rect x="-60" y="290" width="120" height="30" rx="6" fill="#d9c9a0" stroke="#6a5a3a" stroke-width="4" />
      <g style={{ animation: `sway ${4 + tilt}s ease-in-out infinite alternate`, transformOrigin: `${x}px ${y}px` }}>
        <rect x="-170" y="-8" width="340" height="16" rx="8" fill="#ffd166" stroke="#8a6a1a" stroke-width="4" />
        {[-160, 160].map((px) => (
          <g key={px}>
            <line x1={px} y1="0" x2={px - 40} y2="110" stroke="#8a6a1a" stroke-width="3" />
            <line x1={px} y1="0" x2={px + 40} y2="110" stroke="#8a6a1a" stroke-width="3" />
            <path d={`M${px - 60} 110 Q${px} 150 ${px + 60} 110 Z`} fill="#ffd166" stroke="#8a6a1a" stroke-width="4" />
            <rect x={px - 30} y="80" width="26" height="26" rx="4" fill="#c98a3c" stroke="#5a3a1a" stroke-width="3" />
            <text x={px - 17} y="100" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="18" fill="#fff">
              x
            </text>
            <circle cx={px + 18} cy="96" r="11" fill="#ffd166" stroke="#8a6a1a" stroke-width="3" />
          </g>
        ))}
      </g>
      <circle cx="0" cy="0" r="18" fill="#ffd166" stroke="#8a6a1a" stroke-width="4" />
    </g>
  );
}

export function TwinScales() {
  return (
    <Svg>
      <defs>
        <linearGradient id="ts-hall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#1a2a5a" />
          <stop offset=".6" stop-color="#4a5a9a" />
          <stop offset="1" stop-color="#d9c9a0" />
        </linearGradient>
        <radialGradient id="ts-light" cx=".5" cy="0" r=".8">
          <stop offset="0" stop-color="#ffe08a" stop-opacity=".6" />
          <stop offset="1" stop-color="#ffe08a" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#ts-hall)" />
      <rect width="1200" height="800" fill="url(#ts-light)" />
      {/* columns */}
      {[60, 300, 900, 1140].map((x) => (
        <g key={x}>
          <rect x={x - 34} y="60" width="68" height="620" fill="#e8dcc0" opacity=".85" />
          {[0, 1, 2, 3].map((k) => (
            <line key={k} x1={x - 20 + k * 13} y1="70" x2={x - 20 + k * 13} y2="670" stroke="#b8a880" stroke-width="3" />
          ))}
          <rect x={x - 48} y="40" width="96" height="26" fill="#d9c9a0" />
        </g>
      ))}
      {/* the round window with an equals sign */}
      <circle cx="600" cy="150" r="90" fill="#ffe08a" opacity=".85" stroke="#e8dcc0" stroke-width="16" />
      <rect x="550" y="122" width="100" height="18" rx="6" fill="#8a6a1a" />
      <rect x="550" y="160" width="100" height="18" rx="6" fill="#8a6a1a" />
      <Scales x={380} y={360} tilt={0} />
      <Scales x={820} y={360} tilt={1} />
      {/* chequered marble floor */}
      <rect x="0" y="680" width="1200" height="120" fill="#e8dcc0" />
      {Array.from({ length: 24 }, (_, i) => (
        <rect key={i} x={i * 100 - (i >= 12 ? 1150 : 0)} y={i >= 12 ? 740 : 680} width="50" height="60" fill="#b8a880" opacity=".7" />
      ))}
    </Svg>
  );
}

export function RiddleMaze() {
  return (
    <Svg>
      <defs>
        <linearGradient id="rm-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#2a1a3a" />
          <stop offset=".55" stop-color="#e0603a" />
          <stop offset="1" stop-color="#ffcf5a" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#rm-sky)" />
      <circle cx="260" cy="300" r="90" fill="#ffe08a" opacity=".85" />
      {/* pyramids */}
      <path d="M700 460 L860 220 L1020 460 Z" fill="#c98a3c" />
      <path d="M860 220 L1020 460 L900 460 Z" fill="#a06a2a" />
      <path d="M960 460 L1060 300 L1160 460 Z" fill="#b87a34" />
      <path d="M1060 300 L1160 460 L1090 460 Z" fill="#8a5a24" />
      {/* the sphinx */}
      <g transform="translate(220 470)">
        <path d="M0 0 L240 0 L240 -40 Q200 -60 160 -50 L120 -50 L110 -110 Q100 -150 70 -150 Q40 -150 30 -110 L20 -50 L0 -40 Z" fill="#d9a85a" stroke="#6a4a1a" stroke-width="4" />
        <path d="M30 -110 L20 -70 L40 -60 M110 -110 L120 -70 L100 -60" fill="none" stroke="#6a4a1a" stroke-width="4" />
        <circle cx="58" cy="-112" r="5" fill="#2a1a0a" />
        <circle cx="84" cy="-112" r="5" fill="#2a1a0a" />
        <circle cx="58" cy="-112" r="12" fill="none" stroke="#2a1a0a" stroke-width="2.5" />
        <circle cx="84" cy="-112" r="12" fill="none" stroke="#2a1a0a" stroke-width="2.5" />
        <path d="M200 -40 q30 -30 40 10" fill="none" stroke="#6a4a1a" stroke-width="6" stroke-linecap="round" style={{ animation: 'wag 2s ease-in-out infinite alternate', transformOrigin: '200px -40px' }} />
      </g>
      {/* the hedge maze, in perspective */}
      <path d="M0 480 L1200 480 L1200 800 L0 800 Z" fill="#3a7a2a" />
      {[0, 1, 2, 3].map((r) => {
        const y = 500 + r * 70 + r * r * 6;
        const h = 22 + r * 10;
        return (
          <g key={r}>
            {Array.from({ length: 6 }, (_, k) => {
              const gap = (r * 2 + k) % 3 === 0;
              return gap ? null : (
                <rect key={k} x={k * 200 + (r % 2) * 80 - 40} y={y} width={170} height={h} rx="6" fill={r % 2 ? '#2a6a1e' : '#3a8a2a'} stroke="#1a4a10" stroke-width="3" />
              );
            })}
          </g>
        );
      })}
      {/* fruit on the hedges */}
      {['🍎', '🍌', '🍇', '🍓', '🍍'].map((f, i) => (
        <text key={f} x={140 + i * 220} y={520 + (i % 3) * 80} font-size="38" style={{ animation: `bob ${2.6 + i * 0.4}s ease-in-out infinite` }}>
          {f}
        </text>
      ))}
    </Svg>
  );
}
