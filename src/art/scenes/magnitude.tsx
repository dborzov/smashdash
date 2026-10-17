/**
 * Backdrops for The Order of Magnitude: Hero HQ (a skyline round a magnifying-glass tower),
 * Ballpark City (a frozen city at sunset, with a stadium), and the Edge of Everything (space).
 */
import { Svg } from './kit';
import { Rng } from '../../engine/rng';

function Skyline({ y, seed, fill, windows }: { y: number; seed: number; fill: string; windows?: string }) {
  const rng = new Rng(seed);
  const out = [];
  let x = -20;
  while (x < 1220) {
    const w = rng.int(50, 110);
    const h = rng.int(80, 260);
    out.push(
      <g key={x}>
        <rect x={x} y={y - h} width={w} height={h + 200} fill={fill} />
        {windows &&
          Array.from({ length: Math.floor(h / 30) }, (_, r) =>
            Array.from({ length: Math.floor(w / 22) }, (_, c) =>
              rng.chance(0.55) ? (
                <rect key={`${r}-${c}`} x={x + 8 + c * 22} y={y - h + 12 + r * 30} width="10" height="14" fill={windows} opacity=".8" />
              ) : null,
            ),
          )}
      </g>,
    );
    x += w + rng.int(4, 18);
  }
  return <g>{out}</g>;
}

export function HQ() {
  return (
    <Svg>
      <defs>
        <linearGradient id="hq-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#06123a" />
          <stop offset=".6" stop-color="#1f5ab8" />
          <stop offset="1" stop-color="#5ec8ff" />
        </linearGradient>
        <radialGradient id="hq-lens" cx=".4" cy=".35" r=".7">
          <stop offset="0" stop-color="#e8f8ff" />
          <stop offset=".6" stop-color="#7dd3fc" stop-opacity=".7" />
          <stop offset="1" stop-color="#2b6ad6" stop-opacity=".5" />
        </radialGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#hq-sky)" />
      {Array.from({ length: 40 }, (_, i) => (
        <circle key={i} cx={(i * 197) % 1200} cy={(i * 89) % 300} r={1 + (i % 3)} fill="#fff" opacity=".7" style={{ animation: `twinkle ${2 + (i % 5) * 0.4}s ease-in-out infinite` }} />
      ))}
      <Skyline y={600} seed={18} fill="#14306a" windows="#ffd166" />
      {/* the magnifying-glass tower */}
      <rect x="570" y="300" width="60" height="400" fill="#2b4fd6" stroke="#0a1a4a" stroke-width="6" />
      <circle cx="600" cy="220" r="130" fill="url(#hq-lens)" stroke="#ffd166" stroke-width="22" />
      <path d="M520 160 Q560 110 620 110" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" opacity=".7" />
      <text x="600" y="250" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="90" fill="#e0334d" opacity=".9">
        ×10
      </text>
      {/* searchlights */}
      <path d="M400 700 L250 0 L330 0 Z" fill="#fff" opacity=".07" style={{ transformOrigin: '400px 700px', animation: 'sway 6s ease-in-out infinite alternate' }} />
      <path d="M800 700 L870 0 L950 0 Z" fill="#fff" opacity=".07" style={{ transformOrigin: '800px 700px', animation: 'sway 7s ease-in-out infinite alternate' }} />
      <Skyline y={720} seed={81} fill="#0a1a3a" windows="#5ec8ff" />
      <rect x="0" y="700" width="1200" height="100" fill="#081428" />
    </Svg>
  );
}

export function City() {
  return (
    <Svg>
      <defs>
        <linearGradient id="ct-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#2a0a2a" />
          <stop offset=".55" stop-color="#e0603a" />
          <stop offset="1" stop-color="#ffd166" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#ct-sky)" />
      <circle cx="900" cy="420" r="120" fill="#ffe08a" opacity=".85" />
      <Skyline y={560} seed={19} fill="#6a2a3a" windows="#ffe08a" />
      {/* the stadium */}
      <ellipse cx="380" cy="600" rx="300" ry="90" fill="#8a3a2a" stroke="#3a0e0e" stroke-width="6" />
      <ellipse cx="380" cy="590" rx="250" ry="62" fill="#3a9a3a" />
      <path d="M220 590 Q380 520 540 590" fill="none" stroke="#fff" stroke-width="5" />
      {[120, 200, 560, 640].map((x) => (
        <g key={x}>
          <rect x={x - 4} y="420" width="8" height="160" fill="#3a0e0e" />
          <rect x={x - 22} y="410" width="44" height="20" rx="4" fill="#fff4c2" style={{ animation: 'flicker 3s ease-in-out infinite' }} />
        </g>
      ))}
      {/* frozen digits from Doctor Exactly's ray */}
      {['3.14159', '27.0001', '8,169', '1.000000'].map((t, i) => (
        <text key={t} x={150 + i * 260} y={180 + (i % 2) * 60} font-family="Fredoka" font-weight="700" font-size="34" fill="#bfe6ff" opacity=".6" style={{ animation: `bob ${3 + i * 0.4}s ease-in-out infinite` }}>
          {t}
        </text>
      ))}
      <rect x="0" y="680" width="1200" height="120" fill="#2a1a1a" />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={i * 110 + 20} y="736" width="60" height="8" fill="#ffd166" opacity=".7" />
      ))}
    </Svg>
  );
}

export function Cosmos() {
  const rng = new Rng(20);
  return (
    <Svg>
      <defs>
        <radialGradient id="cs-bg" cx=".6" cy=".4" r=".9">
          <stop offset="0" stop-color="#3a1a6a" />
          <stop offset=".6" stop-color="#120a2e" />
          <stop offset="1" stop-color="#020108" />
        </radialGradient>
        <radialGradient id="cs-galaxy">
          <stop offset="0" stop-color="#fff4dc" />
          <stop offset=".3" stop-color="#c08cff" stop-opacity=".7" />
          <stop offset="1" stop-color="#c08cff" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="cs-planet" cx=".35" cy=".35" r=".8">
          <stop offset="0" stop-color="#ffd1a8" />
          <stop offset="1" stop-color="#c0602a" />
        </radialGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#cs-bg)" />
      {Array.from({ length: 140 }, (_, i) => (
        <circle
          key={i}
          cx={rng.int(0, 1200)}
          cy={rng.int(0, 800)}
          r={rng.pick([0.8, 1.2, 1.8, 2.6])}
          fill="#fff"
          opacity={0.4 + rng.next() * 0.6}
          style={i % 6 === 0 ? { animation: `twinkle ${1.5 + (i % 7) * 0.4}s ease-in-out infinite` } : undefined}
        />
      ))}
      {/* a spiral galaxy */}
      <g transform="translate(860 230) rotate(-20)" style={{ animation: 'spin 120s linear infinite', transformOrigin: '860px 230px' }}>
        <ellipse rx="230" ry="80" fill="url(#cs-galaxy)" />
        <path d="M0 0 Q120 -60 200 10 M0 0 Q-120 60 -200 -10" fill="none" stroke="#e6dcff" stroke-width="6" opacity=".5" />
      </g>
      {/* a ringed planet */}
      <circle cx="260" cy="520" r="120" fill="url(#cs-planet)" />
      <ellipse cx="260" cy="520" rx="210" ry="40" fill="none" stroke="#ffd166" stroke-width="10" opacity=".8" transform="rotate(-12 260 520)" />
      <circle cx="560" cy="650" r="34" fill="#7dd3fc" />
      <circle cx="548" cy="640" r="10" fill="#5ab04a" />
      {/* a sign at the edge */}
      <g transform="translate(980 640) rotate(6)">
        <rect x="-120" y="-34" width="240" height="68" rx="8" fill="#fff4dc" stroke="#3a2a14" stroke-width="4" />
        <text y="-6" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="18" fill="#3a2a14">
          EDGE OF THE UNIVERSE
        </text>
        <text y="20" text-anchor="middle" font-family="Fredoka" font-size="15" fill="#3a2a14">
          NO BALL GAMES
        </text>
      </g>
    </Svg>
  );
}
