/**
 * Region backdrops. Each is a layered SVG landscape (sky → far → mid → near), with soft glows,
 * fog and CSS-animated details, plus a particle overlay. Scenes are decorative: keep text and
 * UI on panels above them.
 *
 * To add a scene: write a component here and register it in SCENES with its particle kind.
 */
import type { ComponentType } from 'preact';
import { hills, ridge, snowCap } from '../paint';
import { Particles, type ParticleKind } from '../../ui/components/Particles';
import { AshRoad, Muster, Siege, Vault } from './dark';
import { Svg } from './kit';
import { Dungeon, GridRoom, SquareHall, Tavern } from './tables';
import { City, Cosmos, HQ } from './magnitude';
import { LostFound, RiddleMaze, Subzero, TwinScales } from './sequel';

function Cloud({
  x,
  y,
  s = 1,
  fill,
  dur = 60,
}: {
  x: number;
  y: number;
  s?: number;
  fill: string;
  dur?: number;
}) {
  return (
    <g style={{ animation: `cloud ${dur}s ease-in-out infinite alternate` }}>
      <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill}>
        <ellipse cx="0" cy="0" rx="70" ry="22" />
        <ellipse cx="-30" cy="-12" rx="34" ry="24" />
        <ellipse cx="22" cy="-18" rx="40" ry="30" />
      </g>
    </g>
  );
}

function Stars({ n = 60, seed = 1, maxY = 400 }: { n?: number; seed?: number; maxY?: number }) {
  const out = [];
  let s = seed * 9301;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < n; i++) {
    const x = rnd() * 1200;
    const y = rnd() * maxY;
    const r = rnd() * 1.6 + 0.4;
    out.push(
      <circle
        key={i}
        cx={x}
        cy={y}
        r={r}
        fill="#fff"
        opacity={0.4 + rnd() * 0.6}
        style={{
          animation: `twinkle ${2 + rnd() * 3}s ease-in-out ${-rnd() * 3}s infinite`,
          transformOrigin: `${x}px ${y}px`,
        }}
      />,
    );
  }
  return <g>{out}</g>;
}

// ---------------------------------------------------------------------------

function House({
  x,
  y,
  s = 1,
  wall = '#f3dfb8',
  roof = '#c98a3c',
}: {
  x: number;
  y: number;
  s?: number;
  wall?: string;
  roof?: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect
        x="38"
        y="-96"
        width="16"
        height="36"
        fill="#7a4a2b"
        stroke="#3a2214"
        stroke-width="3"
      />
      {[0, 1, 2].map((i) => (
        <circle
          key={i}
          cx="46"
          cy="-104"
          r={8 + i * 3}
          fill="#efe4ff"
          opacity=".5"
          style={{
            animation: `smoke 4.5s ease-out ${-i * 1.5}s infinite`,
            transformBox: 'fill-box',
            transformOrigin: 'center',
          }}
        />
      ))}
      <rect
        x="-50"
        y="-60"
        width="100"
        height="62"
        rx="4"
        fill={wall}
        stroke="#3a2214"
        stroke-width="3.5"
      />
      <path
        d="M-64 -56 L0 -112 L64 -56 Z"
        fill={roof}
        stroke="#3a2214"
        stroke-width="3.5"
        stroke-linejoin="round"
      />
      <path
        d="M-40 -66 L0 -100 M-20 -60 L10 -92 M10 -62 L30 -80"
        stroke="#a86b2a"
        stroke-width="3"
        opacity=".7"
      />
      <rect
        x="-12"
        y="-30"
        width="24"
        height="32"
        rx="10"
        fill="#7a4a2b"
        stroke="#3a2214"
        stroke-width="3"
      />
      <rect
        x="-40"
        y="-46"
        width="20"
        height="18"
        rx="3"
        fill="#ffd166"
        stroke="#3a2214"
        stroke-width="3"
        filter="url(#glow)"
      />
      <rect
        x="20"
        y="-46"
        width="20"
        height="18"
        rx="3"
        fill="#ffd166"
        stroke="#3a2214"
        stroke-width="3"
        filter="url(#glow)"
      />
    </g>
  );
}

function Tree({ x, y, s = 1, c = '#3f9e4f' }: { x: number; y: number; s?: number; c?: string }) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${s})`}
      class="anim-sway"
      style={{ transformBox: 'fill-box' }}
    >
      <rect
        x="-6"
        y="-40"
        width="12"
        height="42"
        fill="#6b4a2b"
        stroke="#3a2214"
        stroke-width="3"
      />
      <circle cx="0" cy="-62" r="36" fill={c} stroke="#1f5c2a" stroke-width="3.5" />
      <circle cx="-12" cy="-72" r="12" fill="#6fd17a" opacity=".55" />
    </g>
  );
}

function SmallCrate({ x, y, s = 1, r = 0 }: { x: number; y: number; s?: number; r?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <rect
        x="-26"
        y="-44"
        width="52"
        height="44"
        rx="6"
        fill="#e83e8c"
        stroke="#6d0f3a"
        stroke-width="3.5"
      />
      <rect
        x="-30"
        y="-52"
        width="60"
        height="12"
        rx="4"
        fill="#ff8cc6"
        stroke="#6d0f3a"
        stroke-width="3.5"
      />
      <text
        x="0"
        y="-12"
        text-anchor="middle"
        font-family="Fredoka"
        font-weight="700"
        font-size="26"
        fill="#fff"
        font-style="italic"
      >
        ?
      </text>
    </g>
  );
}

function Village() {
  return (
    <Svg>
      <defs>
        <linearGradient id="v-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#2d1f6e" />
          <stop offset=".42" stop-color="#8e4fd1" />
          <stop offset=".72" stop-color="#ff8a6b" />
          <stop offset="1" stop-color="#ffd08a" />
        </linearGradient>
        <radialGradient id="v-sun">
          <stop offset="0" stop-color="#fff3c4" />
          <stop offset=".3" stop-color="#ffd27a" stop-opacity=".8" />
          <stop offset="1" stop-color="#ff8a6b" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#v-sky)" />
      <Stars n={40} seed={3} maxY={220} />
      <circle cx="850" cy="470" r="260" fill="url(#v-sun)" />
      <circle cx="850" cy="470" r="78" fill="#fff1c1" />
      <Cloud x={220} y={190} s={1.3} fill="#ffc9e0" />
      <Cloud x={560} y={300} s={0.8} fill="#e8c4ff" dur={80} />
      <Cloud x={1040} y={240} s={1.1} fill="#ffd7c4" dur={70} />
      <path d={hills(11, 500, 46, 5)} fill="#8a5fc7" opacity=".85" />
      <path d={hills(12, 560, 40, 6)} fill="#5f9a62" />
      <Tree x={90} y={560} s={0.8} c="#4f9a55" />
      <House x={240} y={590} s={0.8} />
      <Tree x={380} y={575} s={0.7} />
      <House x={560} y={600} s={0.95} wall="#fbe8c8" roof="#d9542b" />
      <House x={800} y={585} s={0.75} roof="#b0702a" />
      <Tree x={930} y={590} s={0.9} />
      <House x={1080} y={605} s={0.85} wall="#f0d2a8" />
      <g style={{ animation: 'cloud 30s ease-in-out infinite alternate' }}>
        <path
          d="M-100 640 Q100 610 300 640 T700 640 T1100 640 T1400 640 L1400 700 L-100 700 Z"
          fill="#b98cff"
          opacity=".42"
          filter="url(#blur8)"
        />
      </g>
      <path d={hills(13, 680, 26, 5)} fill="#3f8a48" />
      <path d={hills(14, 740, 20, 4)} fill="#2f6e38" />
      {[90, 210, 470, 690, 880, 1130].map((x, i) => (
        <path
          key={i}
          d={`M${x} 760 l6 -18 l4 16 l6 -22 l4 24`}
          fill="none"
          stroke="#5fbf62"
          stroke-width="4"
          stroke-linecap="round"
        />
      ))}
      <SmallCrate x={150} y={752} s={1.1} r={-6} />
      <SmallCrate x={1010} y={748} s={0.9} r={8} />
      <SmallCrate x={1060} y={760} s={0.7} r={-4} />
    </Svg>
  );
}

// ---------------------------------------------------------------------------

function Forge() {
  const far = ridge(21, 420, 160, 6);
  const mid = ridge(22, 560, 130, 5);
  return (
    <Svg>
      <defs>
        <linearGradient id="f-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#1a0a1e" />
          <stop offset=".55" stop-color="#4a1630" />
          <stop offset="1" stop-color="#ff6a2b" />
        </linearGradient>
        <linearGradient id="f-lava" x1="0" x2="1">
          <stop offset="0" stop-color="#ff3d00" />
          <stop offset=".5" stop-color="#ffd166" />
          <stop offset="1" stop-color="#ff3d00" />
        </linearGradient>
        <linearGradient id="f-rock" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#3b1e2b" />
          <stop offset="1" stop-color="#1a0c14" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#f-sky)" />
      <Stars n={30} seed={8} maxY={260} />
      <ellipse
        cx="600"
        cy="760"
        rx="700"
        ry="260"
        fill="#ff7a3d"
        opacity=".35"
        filter="url(#blur20)"
      />
      <path d={far.d} fill="#3a1c2e" />
      {far.peaks.map((p, i) => (
        <circle
          key={i}
          cx={p[0]}
          cy={p[1] + 10}
          r="10"
          fill="#ff7a3d"
          opacity=".25"
          filter="url(#blur8)"
        />
      ))}
      <path d={mid.d} fill="url(#f-rock)" />
      {/* the dwarven gate */}
      <g transform="translate(600 610)">
        <path
          d="M-170 0 L-170 -190 Q0 -330 170 -190 L170 0 Z"
          fill="#2a1520"
          stroke="#ff9f43"
          stroke-width="4"
          opacity=".95"
        />
        <path
          d="M-110 0 L-110 -150 Q0 -250 110 -150 L110 0 Z"
          fill="#120810"
          stroke="#5a2a20"
          stroke-width="6"
        />
        <path
          d="M-110 -150 Q0 -250 110 -150"
          fill="none"
          stroke="#ffb347"
          stroke-width="3"
          filter="url(#glow)"
          opacity=".8"
        />
        {[-140, -95, -50, 0, 50, 95, 140].map((x, i) => (
          <text
            key={i}
            x={x}
            y={-215 + Math.abs(x) * 0.35}
            text-anchor="middle"
            font-size="22"
            fill="#ffd166"
            filter="url(#glow)"
            opacity=".9"
            style={{ animation: `flicker ${2 + (i % 3)}s ease-in-out ${-i}s infinite` }}
          >
            {['ᚠ', 'ᚢ', 'ᚦ', '⚖', 'ᚱ', 'ᚲ', 'ᚷ'][i]}
          </text>
        ))}
        {/* scale above the door */}
        <g
          transform="translate(0 -110)"
          stroke="#ffd166"
          stroke-width="5"
          fill="none"
          filter="url(#glow)"
        >
          <path d="M0 -40 L0 30 M-60 -30 L60 -30" />
          <path d="M-60 -30 L-80 10 L-40 10 Z M60 -30 L40 10 L80 10 Z" fill="#ffd16655" />
        </g>
      </g>
      {/* lava river */}
      <path d="M-50 700 Q200 660 420 700 T860 690 T1260 700 L1260 800 L-50 800 Z" fill="#2a1018" />
      <path
        d="M-50 730 Q200 700 420 735 T860 720 T1260 735 L1260 770 Q900 760 600 775 T-50 765 Z"
        fill="url(#f-lava)"
        filter="url(#glow)"
        style={{ animation: 'flicker 3s ease-in-out infinite' }}
      />
      <path d="M-50 780 Q300 760 600 790 T1260 780 L1260 800 L-50 800 Z" fill="#1a0a10" />
      {/* anvil */}
      <g transform="translate(180 700)">
        <path
          d="M-50 -40 L60 -40 Q80 -40 90 -54 L90 -30 Q70 -20 40 -20 L30 0 L-30 0 L-40 -20 Q-56 -24 -50 -40 Z"
          fill="#4a4f5e"
          stroke="#1a1c22"
          stroke-width="3"
        />
      </g>
    </Svg>
  );
}

// ---------------------------------------------------------------------------

function DeadTree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${s})`}
      fill="none"
      stroke="#0a1a20"
      stroke-width="12"
      stroke-linecap="round"
    >
      <path d="M0 0 Q-6 -120 10 -220" />
      <path d="M4 -120 Q-40 -150 -70 -190" stroke-width="8" />
      <path d="M8 -170 Q50 -190 80 -240" stroke-width="7" />
      <path d="M-40 -150 Q-40 -110 -46 -80" stroke="#2f6b4a" stroke-width="4" opacity=".7" />
      <path d="M50 -195 Q54 -160 50 -130" stroke="#2f6b4a" stroke-width="4" opacity=".7" />
    </g>
  );
}

function Swamp() {
  return (
    <Svg>
      <defs>
        <linearGradient id="s-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#06121c" />
          <stop offset=".6" stop-color="#123a44" />
          <stop offset="1" stop-color="#2e7a6a" />
        </linearGradient>
        <radialGradient id="s-moon">
          <stop offset="0" stop-color="#f4fff0" />
          <stop offset=".25" stop-color="#cfffe8" stop-opacity=".6" />
          <stop offset="1" stop-color="#7cffc4" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="s-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0d2a30" />
          <stop offset="1" stop-color="#05141a" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#s-sky)" />
      <Stars n={70} seed={5} maxY={380} />
      <circle cx="300" cy="200" r="190" fill="url(#s-moon)" />
      <circle cx="300" cy="200" r="62" fill="#effff6" />
      <circle cx="282" cy="186" r="10" fill="#d4f0e0" />
      <circle cx="318" cy="220" r="7" fill="#d4f0e0" />
      <path d={hills(31, 520, 30, 8)} fill="#0e2a2e" />
      <DeadTree x={150} y={560} s={1.1} />
      <DeadTree x={980} y={540} s={0.9} />
      <DeadTree x={1120} y={570} s={1.2} />
      <path d={hills(32, 560, 16, 7)} fill="#0a2024" />
      <rect x="0" y="580" width="1200" height="220" fill="url(#s-water)" />
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={270 + i * 6}
          y={600 + i * 34}
          width={60 - i * 10}
          height="4"
          rx="2"
          fill="#cfffe8"
          opacity={0.5 - i * 0.1}
        />
      ))}
      {[
        [180, 640, 1],
        [420, 700, 1.3],
        [640, 650, 0.9],
        [860, 720, 1.4],
        [1040, 660, 1],
        [560, 760, 1.1],
      ].map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <path
            d="M0 0 m-40 0 a40 14 0 1 0 80 0 a40 14 0 1 0 -80 0 M0 0 L30 -10"
            fill="#2f8a5a"
            stroke="#0f3a24"
            stroke-width="3"
          />
          {i % 2 === 0 && (
            <ellipse
              cx="0"
              cy="0"
              rx="22"
              ry="6"
              fill="#7cffc4"
              opacity=".5"
              filter="url(#glow)"
              style={{ animation: `flicker ${2.5 + i * 0.4}s ease-in-out infinite` }}
            />
          )}
          {i === 3 && <circle cx="-10" cy="-8" r="6" fill="#ff9fd0" />}
        </g>
      ))}
      {[60, 120, 1150, 760].map((x, i) => (
        <g key={i} stroke="#1a3a2a" stroke-width="5" stroke-linecap="round">
          <path d={`M${x} 800 Q${x - 4} 700 ${x + 6} 620`} fill="none" />
          <ellipse cx={x + 6} cy={630} rx="7" ry="20" fill="#5a3a20" stroke="none" />
        </g>
      ))}
      {[0, 1].map((i) => (
        <g key={i} style={{ animation: `cloud ${40 + i * 15}s ease-in-out infinite alternate` }}>
          <path
            d={`M-100 ${600 + i * 90} Q200 ${570 + i * 90} 500 ${600 + i * 90} T1100 ${600 + i * 90} T1400 ${600 + i * 90} L1400 ${660 + i * 90} L-100 ${660 + i * 90} Z`}
            fill="#bfffe8"
            opacity={0.14 + i * 0.05}
            filter="url(#blur8)"
          />
        </g>
      ))}
    </Svg>
  );
}

// ---------------------------------------------------------------------------

function Pine({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-5" y="-14" width="10" height="16" fill="#3a2a20" />
      <path
        d="M0 -110 L-34 -40 L-18 -42 L-42 -10 L42 -10 L18 -42 L34 -40 Z"
        fill="#1d4a5a"
        stroke="#0a2030"
        stroke-width="3"
        stroke-linejoin="round"
      />
      <path d="M0 -110 L-14 -82 L0 -86 L14 -82 Z M-24 -46 L-8 -50 L-16 -40 Z" fill="#fff" />
    </g>
  );
}

function Peaks() {
  const far = ridge(41, 430, 220, 5);
  const mid = ridge(42, 560, 170, 4);
  return (
    <Svg>
      <defs>
        <linearGradient id="p-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#050b24" />
          <stop offset=".6" stop-color="#14306a" />
          <stop offset="1" stop-color="#4f8fd6" />
        </linearGradient>
        <linearGradient id="p-aurora" x1="0" x2="1">
          <stop offset="0" stop-color="#5ee6a8" stop-opacity="0" />
          <stop offset=".3" stop-color="#5ee6a8" />
          <stop offset=".6" stop-color="#7dd3fc" />
          <stop offset=".85" stop-color="#b98cff" />
          <stop offset="1" stop-color="#b98cff" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="p-mtn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#9fb8e0" />
          <stop offset="1" stop-color="#4a6aa0" />
        </linearGradient>
        <linearGradient id="p-mtn2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#e8f2ff" />
          <stop offset="1" stop-color="#8aa8d6" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#p-sky)" />
      <Stars n={110} seed={9} maxY={450} />
      <g filter="url(#blur20)" opacity=".75">
        <path
          d="M-100 220 Q200 120 450 200 T900 160 T1300 210"
          fill="none"
          stroke="url(#p-aurora)"
          stroke-width="70"
          style={{ animation: 'cloud 14s ease-in-out infinite alternate' }}
        />
        <path
          d="M-100 300 Q250 220 520 290 T1000 250 T1300 300"
          fill="none"
          stroke="url(#p-aurora)"
          stroke-width="40"
          opacity=".7"
          style={{ animation: 'cloud 18s ease-in-out infinite alternate-reverse' }}
        />
      </g>
      <path d={far.d} fill="url(#p-mtn)" opacity=".85" />
      {far.peaks.map((p, i) => (
        <path key={i} d={snowCap(p, 60, i)} fill="#f4f8ff" opacity=".9" />
      ))}
      <path d={mid.d} fill="url(#p-mtn2)" />
      {mid.peaks.map((p, i) => (
        <path key={i} d={snowCap(p, 50, i + 9)} fill="#fff" />
      ))}
      <path d={hills(43, 650, 24, 6)} fill="#dfeaf8" />
      {[80, 160, 260, 900, 1000, 1110].map((x, i) => (
        <Pine key={i} x={x} y={660 + (i % 3) * 14} s={0.9 + (i % 2) * 0.3} />
      ))}
      <path d={hills(44, 720, 18, 5)} fill="#f4f8ff" />
      <path d={hills(45, 770, 10, 4)} fill="#ffffff" />
    </Svg>
  );
}

// ---------------------------------------------------------------------------

function Tent({
  x,
  y,
  s = 1,
  a = '#ff5fa2',
  b = '#ffd166',
}: {
  x: number;
  y: number;
  s?: number;
  a?: string;
  b?: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-80" y="-70" width="160" height="70" fill="#3a1a3a" />
      <rect x="-70" y="-60" width="140" height="56" fill="#ffcf8a" opacity=".25" />
      <path d="M-100 -70 L0 -150 L100 -70 Z" fill={a} stroke="#2a0a2a" stroke-width="3" />
      {[-60, -20, 20, 60].map((sx, i) => (
        <path key={i} d={`M${sx - 12} -70 L0 -150 L${sx + 12} -70 Z`} fill={b} opacity=".85" />
      ))}
      <path
        d="M-100 -70 Q-75 -54 -50 -70 Q-25 -54 0 -70 Q25 -54 50 -70 Q75 -54 100 -70"
        fill={a}
        stroke="#2a0a2a"
        stroke-width="3"
      />
      <rect x="-86" y="-70" width="8" height="70" fill="#6b3a1a" />
      <rect x="78" y="-70" width="8" height="70" fill="#6b3a1a" />
      <rect x="-60" y="-24" width="120" height="16" rx="4" fill="#c98a3c" />
      {[-40, -10, 20, 45].map((px, i) => (
        <circle
          key={i}
          cx={px}
          cy={-30}
          r="8"
          fill={['#ff7a3d', '#5ee6a8', '#ffd166', '#b98cff'][i]}
        />
      ))}
    </g>
  );
}

function Bazaar() {
  const lights = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const x = t * 1200;
    const y = 330 + Math.sin(t * Math.PI) * 70 + Math.sin(t * Math.PI * 4) * 6;
    lights.push(
      <circle
        key={i}
        cx={x}
        cy={y}
        r="7"
        fill={['#ffd166', '#ff5fa2', '#7dd3fc', '#5ee6a8'][i % 4]}
        filter="url(#glow)"
        style={{ animation: `flicker ${1.6 + (i % 5) * 0.4}s ease-in-out ${-i * 0.3}s infinite` }}
      />,
    );
  }
  return (
    <Svg>
      <defs>
        <linearGradient id="b-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#140630" />
          <stop offset=".55" stop-color="#5a1f6e" />
          <stop offset="1" stop-color="#ff6fa8" />
        </linearGradient>
        <linearGradient id="b-sand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#e8a060" />
          <stop offset="1" stop-color="#a8603a" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#b-sky)" />
      <Stars n={80} seed={12} maxY={360} />
      <g transform="translate(960 150)">
        <circle r="56" fill="#fff3c4" filter="url(#glow)" />
        <circle cx="22" cy="-14" r="50" fill="#2a0d45" />
      </g>
      {/* far city: domes and minarets */}
      <g fill="#3a1450" opacity=".9">
        <path d={hills(51, 520, 26, 5)} fill="#c9707a" opacity=".55" />
        {[120, 300, 470, 720, 880, 1060].map((x, i) => (
          <g key={i} transform={`translate(${x} ${500 - (i % 2) * 20})`}>
            <rect x="-40" y="-60" width="80" height="80" />
            <path d="M-40 -60 Q0 -130 40 -60 Z" />
            <rect x="46" y="-120" width="16" height="140" />
            <path d="M44 -120 L54 -150 L64 -120 Z" />
            <rect x="-24" y="-30" width="10" height="16" fill="#ffcf5a" opacity=".8" />
            <rect x="12" y="-30" width="10" height="16" fill="#ffcf5a" opacity=".8" />
          </g>
        ))}
      </g>
      <path d="M-20 310 Q600 470 1220 310" fill="none" stroke="#2a0a2a" stroke-width="2" />
      {lights}
      <path d={hills(52, 600, 18, 5)} fill="url(#b-sand)" />
      <Tent x={220} y={640} s={1} />
      <Tent x={600} y={620} s={1.15} a="#5ec8ff" b="#fff4dc" />
      <Tent x={980} y={645} s={1} a="#9b7bff" b="#ffd166" />
      {[400, 800].map((x, i) => (
        <g
          key={i}
          transform={`translate(${x} 520)`}
          style={{
            animation: `sway ${3 + i}s ease-in-out infinite`,
            transformOrigin: `${x}px 480px`,
          }}
        >
          <path d="M0 -40 L0 0" stroke="#2a0a2a" stroke-width="2" />
          <path
            d="M-14 0 L14 0 L10 30 L-10 30 Z"
            fill="#ff9f43"
            stroke="#6b2a0a"
            stroke-width="2"
            filter="url(#glow)"
          />
        </g>
      ))}
      <path d={hills(53, 720, 16, 4)} fill="#c98a4b" />
      <path d={hills(54, 770, 12, 4)} fill="#a8603a" />
    </Svg>
  );
}

// ---------------------------------------------------------------------------

function Tower() {
  const stairs = [];
  for (let i = 0; i < 9; i++) {
    const a = i * 0.8;
    const x = 600 + Math.cos(a) * 170;
    const y = 690 - i * 62;
    stairs.push(
      <g
        key={i}
        transform={`translate(${x} ${y})`}
        style={{ animation: `bob ${2.5 + (i % 3) * 0.5}s ease-in-out ${-i * 0.4}s infinite` }}
      >
        <rect
          x={-34 + i * 2}
          y="-10"
          width={68 - i * 4}
          height="18"
          rx="4"
          fill="#8f7ae0"
          stroke="#2a2370"
          stroke-width="3"
        />
        <rect x={-34 + i * 2} y="-10" width={68 - i * 4} height="6" rx="3" fill="#c6b8ff" />
      </g>,
    );
  }
  return (
    <Svg>
      <defs>
        <linearGradient id="t-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#05061c" />
          <stop offset=".6" stop-color="#1e1460" />
          <stop offset="1" stop-color="#5a3bd6" />
        </linearGradient>
        <linearGradient id="t-stone" x1="0" x2="1">
          <stop offset="0" stop-color="#3a3380" />
          <stop offset=".45" stop-color="#7a6ad6" />
          <stop offset="1" stop-color="#2a2366" />
        </linearGradient>
        <radialGradient id="t-neb1">
          <stop offset="0" stop-color="#ff5fa2" stop-opacity=".55" />
          <stop offset="1" stop-color="#ff5fa2" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="t-neb2">
          <stop offset="0" stop-color="#5ec8ff" stop-opacity=".45" />
          <stop offset="1" stop-color="#5ec8ff" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#t-sky)" />
      <ellipse cx="260" cy="220" rx="320" ry="160" fill="url(#t-neb1)" />
      <ellipse cx="980" cy="300" rx="300" ry="200" fill="url(#t-neb2)" />
      <Stars n={140} seed={21} maxY={800} />
      {/* ringed planet */}
      <g transform="translate(1000 160)">
        <circle r="54" fill="#ffb36b" />
        <path d="M-54 0 A54 54 0 0 0 54 0" fill="#e8784a" />
        <ellipse
          rx="96"
          ry="18"
          fill="none"
          stroke="#ffe0b3"
          stroke-width="7"
          transform="rotate(-18)"
          opacity=".85"
        />
      </g>
      {/* floating islands */}
      {[
        [180, 560, 1],
        [1020, 600, 0.8],
      ].map(([x, y, s], i) => (
        <g
          key={i}
          transform={`translate(${x} ${y}) scale(${s})`}
          style={{ animation: `bob ${4 + i}s ease-in-out infinite` }}
        >
          <path
            d="M-120 0 Q0 -30 120 0 L60 60 L10 130 L-30 70 L-80 40 Z"
            fill="#3a2a6a"
            stroke="#1a1240"
            stroke-width="3"
          />
          <path d="M-120 0 Q0 -30 120 0 Q0 18 -120 0 Z" fill="#5ee6a8" />
          <circle cx="-40" cy="-30" r="24" fill="#3fbf7f" />
          <rect x="-43" y="-12" width="6" height="14" fill="#5a3a20" />
        </g>
      ))}
      {/* the tower */}
      <g transform="translate(600 0)">
        <path
          d="M-90 800 L-70 200 L70 200 L90 800 Z"
          fill="url(#t-stone)"
          stroke="#1a1450"
          stroke-width="4"
        />
        {[300, 420, 540, 660].map((y) => (
          <path
            key={y}
            d={`M${-70 - (y - 200) * 0.03} ${y} L${70 + (y - 200) * 0.03} ${y}`}
            stroke="#2a2370"
            stroke-width="5"
          />
        ))}
        {[260, 380, 500, 620].map((y, i) => (
          <rect
            key={y}
            x={i % 2 ? 14 : -34}
            y={y}
            width="20"
            height="30"
            rx="10"
            fill="#ffd166"
            filter="url(#glow)"
            style={{ animation: `flicker ${2 + i * 0.6}s ease-in-out infinite` }}
          />
        ))}
        <path
          d="M-100 210 L0 40 L100 210 Z"
          fill="#6c3fc9"
          stroke="#2a1466"
          stroke-width="4"
          stroke-linejoin="round"
        />
        <path
          d="M-30 160 Q0 130 30 160"
          fill="none"
          stroke="#c6a8ff"
          stroke-width="4"
          opacity=".6"
        />
        <g transform="translate(0 36)" filter="url(#glow)">
          <path
            d="M0 -26 l7 16 17 2 -13 11 4 17 -15 -9 -15 9 4 -17 -13 -11 17 -2 Z"
            fill="#ffd166"
            style={{ animation: 'twinkle 2s ease-in-out infinite', transformOrigin: '0 0' }}
          />
        </g>
        <text
          x="0"
          y="350"
          text-anchor="middle"
          font-family="Fredoka"
          font-weight="700"
          font-size="40"
          fill="#c6a8ff"
          opacity=".55"
        >
          10ⁿ
        </text>
      </g>
      {stairs}
      <path d={hills(61, 760, 14, 4)} fill="#2a2370" />
    </Svg>
  );
}

// ---------------------------------------------------------------------------

function Crystal({
  x,
  y,
  s = 1,
  c = '#8ff0ff',
  r = 0,
}: {
  x: number;
  y: number;
  s?: number;
  c?: string;
  r?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <path
        d="M0 0 L-22 -70 L0 -130 L22 -70 Z"
        fill={c}
        opacity=".85"
        stroke="#1a1040"
        stroke-width="3"
      />
      <path d="M0 0 L0 -130 L22 -70 Z" fill="#fff" opacity=".25" />
      <path
        d="M-30 0 L-44 -46 L-30 -80 L-18 -44 Z"
        fill={c}
        opacity=".7"
        stroke="#1a1040"
        stroke-width="3"
      />
      <path
        d="M26 0 L40 -36 L30 -64 L18 -34 Z"
        fill={c}
        opacity=".7"
        stroke="#1a1040"
        stroke-width="3"
      />
    </g>
  );
}

function Caves() {
  return (
    <Svg>
      <defs>
        <radialGradient id="c-bg" cx=".5" cy=".55" r=".75">
          <stop offset="0" stop-color="#3a2a8a" />
          <stop offset=".55" stop-color="#1c1250" />
          <stop offset="1" stop-color="#07041a" />
        </radialGradient>
        <radialGradient id="c-pool">
          <stop offset="0" stop-color="#8ff0ff" stop-opacity=".8" />
          <stop offset="1" stop-color="#8ff0ff" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="c-mirror" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#dff8ff" />
          <stop offset=".5" stop-color="#7ab8e0" />
          <stop offset="1" stop-color="#c9b3ff" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#c-bg)" />
      {/* mirrors on the back wall, each with a little reflected crystal */}
      {[
        [300, 330, -6],
        [600, 300, 0],
        [900, 330, 6],
      ].map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
          <ellipse rx="92" ry="140" fill="#2a1c10" />
          <ellipse rx="80" ry="128" fill="url(#c-mirror)" opacity=".85" />
          <path
            d="M-40 -80 Q-10 -110 30 -96"
            stroke="#fff"
            stroke-width="8"
            fill="none"
            opacity=".5"
            stroke-linecap="round"
          />
          <g opacity=".5" transform="translate(0 60) scale(.6)">
            <path d="M0 0 L-22 -70 L0 -130 L22 -70 Z" fill={i === 1 ? '#ff8ac4' : '#8ff0ff'} />
          </g>
          <ellipse
            rx="80"
            ry="128"
            fill="#fff"
            opacity=".0"
            style={{ animation: `flicker ${3 + i}s ease-in-out infinite` }}
          />
        </g>
      ))}
      {/* stalactites */}
      {Array.from({ length: 14 }, (_, i) => {
        const x = i * 90 + 20;
        const h = 60 + ((i * 53) % 90);
        return <path key={i} d={`M${x - 26} 0 L${x} ${h} L${x + 26} 0 Z`} fill="#140c38" />;
      })}
      <path d={hills(71, 600, 26, 7)} fill="#1a1248" />
      <ellipse cx="600" cy="690" rx="330" ry="60" fill="url(#c-pool)" filter="url(#blur8)" />
      <ellipse cx="600" cy="690" rx="250" ry="34" fill="#5ad0f0" opacity=".55" />
      <Crystal x={140} y={640} s={1.2} c="#8ff0ff" r={-8} />
      <Crystal x={330} y={700} s={0.8} c="#ff8ac4" r={6} />
      <Crystal x={900} y={690} s={1} c="#c6a8ff" r={-4} />
      <Crystal x={1080} y={650} s={1.3} c="#8ff0ff" r={10} />
      <path d={hills(72, 740, 14, 6)} fill="#0d0828" />
      {[180, 520, 760, 1010].map((x, i) => (
        <circle
          key={i}
          cx={x}
          cy={420 + (i % 2) * 60}
          r="5"
          fill="#fff"
          filter="url(#glow)"
          style={{ animation: `twinkle ${1.8 + i * 0.5}s ease-in-out infinite` }}
        />
      ))}
    </Svg>
  );
}

// ---------------------------------------------------------------------------

function Bay() {
  return (
    <Svg>
      <defs>
        <linearGradient id="b-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0a1a3a" />
          <stop offset=".55" stop-color="#7a3a7a" />
          <stop offset="1" stop-color="#ff8a5c" />
        </linearGradient>
        <linearGradient id="b-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#1f6f8b" />
          <stop offset="1" stop-color="#0a2a4a" />
        </linearGradient>
        <linearGradient id="b-beam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#ff6fa8" stop-opacity="0" />
          <stop offset="1" stop-color="#ff6fa8" stop-opacity=".9" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#b-sky)" />
      <Stars n={50} seed={81} maxY={260} />
      <circle cx="420" cy="470" r="90" fill="#ffd166" opacity=".95" />
      <rect x="0" y="470" width="1200" height="330" fill="url(#b-sea)" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={360 + i * 8}
          y={490 + i * 28}
          width={120 - i * 18}
          height="5"
          rx="2"
          fill="#ffd166"
          opacity={0.6 - i * 0.1}
        />
      ))}
      {/* fog ships on the horizon */}
      {[
        [180, 470],
        [640, 476],
      ].map(([x, y], i) => (
        <g
          key={i}
          transform={`translate(${x} ${y})`}
          opacity=".7"
          style={{ animation: `bob ${3 + i}s ease-in-out infinite` }}
        >
          <path d="M-40 0 L40 0 L30 14 L-30 14 Z" fill="#5a4a7a" />
          <path d="M0 0 L0 -50 L30 -10 Z" fill="#d8ccf0" />
          <path d="M-60 6 Q0 -20 60 6" fill="#c9b3ff" opacity=".35" filter="url(#blur8)" />
        </g>
      ))}
      {/* the laser beam, sweeping the bay */}
      <path
        d="M1010 235 L110 160 L110 230 Z"
        fill="url(#b-beam)"
        opacity=".75"
        style={{ animation: 'sway 6s ease-in-out infinite', transformOrigin: '1010px 235px' }}
      />
      {/* cliff and lighthouse */}
      <path
        d="M820 800 L860 520 Q930 470 1010 480 L1060 440 Q1140 450 1200 470 L1200 800 Z"
        fill="#3a2a2a"
      />
      <path
        d="M860 520 Q930 470 1010 480 L1060 440 Q1140 450 1200 470 L1200 500 Q1100 480 1060 470 L1010 505 Q930 495 870 540 Z"
        fill="#3f8a4a"
      />
      <g transform="translate(1010 480)">
        <path
          d="M-34 0 L-24 -230 L24 -230 L34 0 Z"
          fill="#fff4e6"
          stroke="#2a1c10"
          stroke-width="4"
        />
        {[-40, -110, -180].map((y) => {
          // The tower tapers from 34 wide (half) at the base to 24 at the top.
          const hw = (v: number) => 34 + (v * 10) / 230;
          return (
            <path
              key={y}
              d={`M${-hw(y)} ${y} L${hw(y)} ${y} L${hw(y - 34)} ${y - 34} L${-hw(y - 34)} ${y - 34} Z`}
              fill="#e0334d"
            />
          );
        })}
        <rect
          x="-30"
          y="-262"
          width="60"
          height="34"
          rx="6"
          fill="#ffd166"
          stroke="#2a1c10"
          stroke-width="4"
          filter="url(#glow)"
        />
        <path
          d="M-36 -262 L0 -300 L36 -262 Z"
          fill="#e0334d"
          stroke="#2a1c10"
          stroke-width="4"
          stroke-linejoin="round"
        />
        {/* Polly on the rail */}
        <text x="34" y="-266" font-size="34">
          🦜
        </text>
      </g>
      {/* Inkbert's tentacles */}
      {[
        [90, 640, 1],
        [250, 690, -1],
      ].map(([x, y, d], i) => (
        <path
          key={i}
          d={`M${x} ${y + 60} Q${x + 30 * d} ${y - 40} ${x - 10 * d} ${y - 110} Q${x - 30 * d} ${y - 140} ${x + 10 * d} ${y - 150}`}
          fill="none"
          stroke="#7a4ac9"
          stroke-width="26"
          stroke-linecap="round"
          style={{
            animation: `sway ${4 + i}s ease-in-out infinite`,
            transformOrigin: `${x}px ${y + 60}px`,
          }}
        />
      ))}
      <path d={hills(91, 760, 10, 9)} fill="#0a2a4a" opacity=".8" />
    </Svg>
  );
}

// ---------------------------------------------------------------------------

function Junkyard() {
  const junk = [];
  for (let i = 0; i < 26; i++) {
    const x = (i * 97) % 1200;
    const y = 540 + ((i * 61) % 120);
    const k = i % 4;
    junk.push(
      k === 0 ? (
        <circle key={i} cx={x} cy={y} r="26" fill="#2a2a2a" stroke="#555" stroke-width="10" />
      ) : k === 1 ? (
        <rect
          key={i}
          x={x - 40}
          y={y - 20}
          width="80"
          height="40"
          rx="4"
          fill="#8a6a4a"
          stroke="#3a2a1a"
          stroke-width="3"
          transform={`rotate(${((i * 23) % 40) - 20} ${x} ${y})`}
        />
      ) : k === 2 ? (
        <path
          key={i}
          d={`M${x - 50} ${y + 10} L${x + 40} ${y - 30} L${x + 50} ${y - 16} L${x - 40} ${y + 24} Z`}
          fill="#9aa4b8"
          stroke="#3a4050"
          stroke-width="3"
        />
      ) : (
        <g key={i} transform={`translate(${x} ${y})`}>
          <circle r="22" fill="#c98a4b" stroke="#5a3a20" stroke-width="3" />
          <circle r="8" fill="#5a3a20" />
        </g>
      ),
    );
  }
  return (
    <Svg>
      <defs>
        <linearGradient id="j-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#1a0f2e" />
          <stop offset=".6" stop-color="#7a3a3a" />
          <stop offset="1" stop-color="#ff9a3c" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#j-sky)" />
      {/* storm clouds and lightning */}
      {[0, 1, 2].map((i) => (
        <ellipse
          key={i}
          cx={200 + i * 400}
          cy={90 + (i % 2) * 40}
          rx="260"
          ry="70"
          fill="#2a1a3a"
          opacity=".85"
          filter="url(#blur8)"
        />
      ))}
      <path
        d="M760 110 L720 220 L760 220 L700 360"
        fill="none"
        stroke="#bfe6ff"
        stroke-width="7"
        stroke-linejoin="round"
        filter="url(#glow)"
        style={{ animation: 'flicker 3.5s steps(2) infinite' }}
      />
      <path d={hills(101, 520, 60, 5)} fill="#4a3a3a" />
      {/* tesla coil */}
      <g transform="translate(940 520)">
        <path
          d="M-30 0 L-14 -200 L14 -200 L30 0 Z"
          fill="#7a6a5a"
          stroke="#2a1c10"
          stroke-width="4"
        />
        {[-40, -80, -120, -160].map((y) => (
          <rect key={y} x="-22" y={y} width="44" height="8" rx="3" fill="#e0a526" />
        ))}
        <ellipse cy="-214" rx="44" ry="20" fill="#c9c9c9" stroke="#2a1c10" stroke-width="4" />
        {[-1, 1].map((d) => (
          <path
            key={d}
            d={`M${d * 40} -214 l${d * 30} -20 l${d * -10} -10 l${d * 40} -26`}
            fill="none"
            stroke="#7dd3fc"
            stroke-width="4"
            filter="url(#glow)"
            style={{ animation: `flicker ${1.2 + (d + 1) * 0.3}s steps(2) infinite` }}
          />
        ))}
      </g>
      <path d={hills(102, 600, 40, 7)} fill="#5a4a3a" />
      {junk}
      {/* Nugget the battlebot */}
      <g transform="translate(360 650)" style={{ animation: 'bob 1.4s ease-in-out infinite' }}>
        <rect
          x="-50"
          y="-40"
          width="100"
          height="44"
          rx="10"
          fill="#e0a526"
          stroke="#2a1c10"
          stroke-width="4"
        />
        <path d="M50 -36 L84 -18 L50 0 Z" fill="#9aa4b8" stroke="#2a1c10" stroke-width="4" />
        <circle cx="-30" cy="8" r="14" fill="#2a2a2a" />
        <circle cx="30" cy="8" r="14" fill="#2a2a2a" />
        <circle cx="10" cy="-22" r="8" fill="#7dd3fc" stroke="#2a1c10" stroke-width="3" />
        <rect x="-38" y="-34" width="12" height="22" rx="3" fill="#2a2a2a" />
        <rect x="-22" y="-34" width="12" height="22" rx="3" fill="#2a2a2a" />
      </g>
      <path d={hills(103, 740, 16, 8)} fill="#3a2a22" />
    </Svg>
  );
}

// ---------------------------------------------------------------------------

export const SCENES: Record<
  string,
  { Art: ComponentType; particles?: ParticleKind; count?: number }
> = {
  village: { Art: Village, particles: 'firefly', count: 18 },
  forge: { Art: Forge, particles: 'ember', count: 28 },
  swamp: { Art: Swamp, particles: 'firefly', count: 30 },
  peaks: { Art: Peaks, particles: 'snow', count: 50 },
  bazaar: { Art: Bazaar, particles: 'spark', count: 18 },
  tower: { Art: Tower, particles: 'spark', count: 30 },
  caves: { Art: Caves, particles: 'spark', count: 22 },
  bay: { Art: Bay, particles: 'star', count: 16 },
  junkyard: { Art: Junkyard, particles: 'ember', count: 30 },
  muster: { Art: Muster, particles: 'snow', count: 40 },
  ashroad: { Art: AshRoad, particles: 'ash', count: 40 },
  siege: { Art: Siege, particles: 'ember', count: 34 },
  vault: { Art: Vault, particles: 'mote', count: 30 },
  tavern: { Art: Tavern, particles: 'ember', count: 14 },
  dungeon: { Art: Dungeon, particles: 'mote', count: 24 },
  squarehall: { Art: SquareHall, particles: 'spark', count: 20 },
  gridroom: { Art: GridRoom, particles: 'star', count: 24 },
  hq: { Art: HQ, particles: 'spark', count: 18 },
  city: { Art: City, particles: 'mote', count: 20 },
  cosmos: { Art: Cosmos, particles: 'star', count: 30 },
  subzero: { Art: Subzero, particles: 'snow', count: 44 },
  lostfound: { Art: LostFound, particles: 'mote', count: 26 },
  twinscales: { Art: TwinScales, particles: 'spark', count: 18 },
  riddlemaze: { Art: RiddleMaze, particles: 'firefly', count: 20 },
};

export function Scene({ id, dim = 0 }: { id: string; dim?: number }) {
  const s = SCENES[id] ?? SCENES.village;
  return (
    <div class="scene-bg">
      <s.Art />
      {s.particles && <Particles kind={s.particles} count={s.count} seed={id} />}
      {dim > 0 && (
        <div style={{ position: 'absolute', inset: 0, background: `rgba(10, 6, 30, ${dim})` }} />
      )}
    </div>
  );
}
