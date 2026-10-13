/**
 * Backdrops for the Long Count campaign: Greyhaven (a stone town under snow, its ledger hall
 * still smoking), the Ashen Road (burned forest, wagons), the Siege of Thornwall (a fortress on
 * a cliff and a plain full of campfires) and the Glass Vaults (crystal pillars under the
 * mountain). Same layered approach as the other scenes, with a colder, grimmer palette.
 */
import { hills, ridge, snowCap } from '../paint';
import { Rng } from '../../engine/rng';

const VB = '0 0 1200 800';

function Svg({ children }: { children: preact.ComponentChildren }) {
  return (
    <svg viewBox={VB} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <filter id="dblur8" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <filter id="dblur20" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="20" />
        </filter>
        <filter id="dglow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {children}
    </svg>
  );
}

function Sky({ id, stops }: { id: string; stops: [string, string, string] }) {
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color={stops[0]} />
          <stop offset=".6" stop-color={stops[1]} />
          <stop offset="1" stop-color={stops[2]} />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill={`url(#${id})`} />
    </>
  );
}

function Smoke({
  x,
  y,
  s = 1,
  color = '#3a3840',
  dur = 7,
}: {
  x: number;
  y: number;
  s?: number;
  color?: string;
  dur?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <circle
          key={i}
          cx={i * 6}
          cy={-i * 10}
          r={18 + i * 9}
          fill={color}
          opacity={0.55 - i * 0.08}
          style={{
            animation: `smoke ${dur}s ease-out ${-i * (dur / 5)}s infinite`,
            transformBox: 'fill-box',
            transformOrigin: 'center',
          }}
        />
      ))}
    </g>
  );
}

function Banner({
  x,
  y,
  color = '#6a7280',
  s = 1,
}: {
  x: number;
  y: number;
  color?: string;
  s?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-2" y="-90" width="5" height="90" fill="#2a2a30" />
      <path
        d="M3 -88 L46 -84 Q40 -70 46 -56 L3 -60 Z"
        fill={color}
        stroke="#14121a"
        stroke-width="2"
        style={{
          animation: 'sway 3s ease-in-out infinite',
          transformBox: 'fill-box',
          transformOrigin: 'left center',
        }}
      />
      <path d="M14 -76 l6 -6 l6 6 l-2 6 l-8 0 Z" fill="#c9ced8" opacity=".8" />
    </g>
  );
}

function Torch({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-3" y="0" width="6" height="22" fill="#3a2a20" />
      <circle cx="0" cy="-4" r="16" fill="#ff9f43" opacity=".35" filter="url(#dblur8)" />
      <path
        d="M0 -14 Q8 -4 0 2 Q-8 -4 0 -14 Z"
        fill="#ffb347"
        style={{ animation: 'flicker 0.9s ease-in-out infinite' }}
      />
    </g>
  );
}

// ---------------------------------------------------------------------------

export function Muster() {
  const far = ridge(301, 330, 150, 7);
  const rng = new Rng(77);
  return (
    <Svg>
      <Sky id="sky-muster" stops={['#0b0d16', '#2e3648', '#5a6276']} />
      <circle cx="930" cy="150" r="46" fill="#e8ecf4" opacity=".75" filter="url(#dglow)" />
      <path d={far.d} fill="#3e4658" />
      {far.peaks.map((pk, i) => (
        <path key={i} d={snowCap(pk, 50, i)} fill="#c8d0dc" opacity=".85" />
      ))}
      <path d={hills(302, 470, 30, 7)} fill="#2c3240" />
      {/* town wall */}
      <path d="M0 520 L1200 500 L1200 800 L0 800 Z" fill="#23262f" />
      <path d="M60 520 L60 420 L1140 400 L1140 510" fill="none" stroke="#151820" stroke-width="0" />
      <rect
        x="40"
        y="430"
        width="1120"
        height="90"
        fill="#3a3e4a"
        stroke="#14161c"
        stroke-width="4"
      />
      {Array.from({ length: 28 }, (_, i) => (
        <rect
          key={i}
          x={44 + i * 40}
          y="412"
          width="24"
          height="22"
          fill="#3a3e4a"
          stroke="#14161c"
          stroke-width="3"
        />
      ))}
      {/* towers */}
      {[120, 600, 1080].map((x, i) => (
        <g key={x}>
          <rect
            x={x - 40}
            y={300 - i * 10}
            width="80"
            height={230 + i * 10}
            fill="#454a58"
            stroke="#14161c"
            stroke-width="4"
          />
          <path
            d={`M${x - 52} ${302 - i * 10} L${x} ${220 - i * 10} L${x + 52} ${302 - i * 10} Z`}
            fill="#2a2e38"
            stroke="#14161c"
            stroke-width="4"
          />
          <rect
            x={x - 8}
            y={340 - i * 10}
            width="16"
            height="26"
            rx="8"
            fill="#ffd27a"
            opacity=".85"
          />
          <Banner x={x + 4} y={220 - i * 10} color={i === 1 ? '#5a6478' : '#4a5262'} />
        </g>
      ))}
      {/* the burned Ledger Hall */}
      <g transform="translate(360 430)">
        <path
          d="M-70 0 L-70 -70 L-40 -90 L-10 -60 L20 -96 L70 -60 L70 0 Z"
          fill="#1a1a1e"
          stroke="#0a0a0c"
          stroke-width="4"
        />
        <path
          d="M-40 0 L-40 -30 M0 0 L0 -40 M40 0 L40 -26"
          stroke="#ff7a3d"
          stroke-width="3"
          opacity=".6"
          style={{ animation: 'flicker 2s infinite' }}
        />
        <Smoke x={0} y={-100} s={1.6} color="#2a2830" dur={9} />
      </g>
      {/* frozen river */}
      <path
        d="M-20 640 Q300 600 600 650 T1220 630 L1220 700 Q900 690 600 720 T-20 700 Z"
        fill="#8fa3b8"
        opacity=".55"
      />
      <path d={hills(303, 720, 18, 8)} fill="#e4e8ef" />
      {[200, 820, 980].map((x) => (
        <Torch key={x} x={x} y={410} />
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <path
          key={i}
          d={`M${rng.int(0, 1200)} ${rng.int(700, 780)} l14 -40 l14 40 Z`}
          fill="#1c2a26"
          opacity=".9"
        />
      ))}
    </Svg>
  );
}

export function AshRoad() {
  const rng = new Rng(91);
  const trees = Array.from({ length: 22 }, (_, i) => ({
    x: i * 58 + rng.int(-14, 14),
    h: rng.int(90, 220),
    lean: rng.int(-8, 8),
    far: i % 3 === 0,
  }));
  return (
    <Svg>
      <Sky id="sky-ash" stops={['#140c0a', '#5a2c1a', '#a8522a']} />
      <circle cx="260" cy="230" r="70" fill="#ff8a3d" opacity=".45" filter="url(#dblur20)" />
      <circle cx="260" cy="230" r="34" fill="#ffb27a" opacity=".7" />
      <path d={hills(401, 430, 40, 6)} fill="#3a2418" />
      {trees
        .filter((t) => t.far)
        .map((t, i) => (
          <path
            key={`f${i}`}
            d={`M${t.x} 470 l${t.lean / 2} ${-t.h * 0.6}`}
            stroke="#22140e"
            stroke-width="5"
          />
        ))}
      <Smoke x={820} y={420} s={2.2} color="#2a1c18" dur={10} />
      <Smoke x={140} y={460} s={1.6} color="#2a1c18" dur={12} />
      <path d={hills(402, 540, 30, 7)} fill="#2a1a14" />
      {/* the road */}
      <path
        d="M560 800 Q620 680 700 600 Q760 545 900 520 L940 524 Q800 560 750 610 Q680 690 700 800 Z"
        fill="#4a3426"
      />
      {/* wagons */}
      {[
        [780, 560, 0.7],
        [700, 640, 1],
      ].map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <path d="M-60 -40 Q0 -90 60 -40 Z" fill="#c9b48a" stroke="#1a100a" stroke-width="4" />
          <rect
            x="-62"
            y="-42"
            width="124"
            height="34"
            fill="#5a3a22"
            stroke="#1a100a"
            stroke-width="4"
          />
          <circle cx="-38" cy="-4" r="16" fill="#2a1a10" stroke="#1a100a" stroke-width="4" />
          <circle cx="38" cy="-4" r="16" fill="#2a1a10" stroke="#1a100a" stroke-width="4" />
          <circle
            cx="66"
            cy="-60"
            r="10"
            fill="#ffb347"
            opacity=".7"
            style={{ animation: 'flicker 1.3s infinite' }}
          />
        </g>
      ))}
      {trees
        .filter((t) => !t.far)
        .map((t, i) => (
          <g key={`n${i}`}>
            <path
              d={`M${t.x} 800 L${t.x + t.lean} ${800 - t.h}`}
              stroke="#0e0806"
              stroke-width="12"
              stroke-linecap="round"
            />
            <path
              d={`M${t.x + t.lean * 0.6} ${800 - t.h * 0.6} l${-30 + t.lean} -36 M${t.x + t.lean * 0.8} ${800 - t.h * 0.8} l${26} -30`}
              stroke="#0e0806"
              stroke-width="6"
              stroke-linecap="round"
            />
          </g>
        ))}
      <path d={hills(403, 760, 14, 8)} fill="#120a08" />
    </Svg>
  );
}

export function Siege() {
  const rng = new Rng(55);
  const fires = Array.from({ length: 70 }, () => ({
    x: rng.int(520, 1200),
    y: rng.int(560, 760),
    r: rng.int(2, 5),
  }));
  return (
    <Svg>
      <Sky id="sky-siege" stops={['#07060c', '#2a0e1c', '#5a1a24']} />
      <circle cx="980" cy="140" r="40" fill="#ffd6c8" opacity=".9" />
      <circle cx="980" cy="140" r="80" fill="#ff8a6a" opacity=".2" filter="url(#dblur20)" />
      <path d={ridge(501, 470, 110, 6).d} fill="#1c1018" />
      {/* plain with campfires */}
      <path d="M0 540 L1200 520 L1200 800 L0 800 Z" fill="#1a0e12" />
      {fires.map((f, i) => (
        <g key={i}>
          <circle cx={f.x} cy={f.y} r={f.r * 3} fill="#ff6a2a" opacity=".18" />
          <circle
            cx={f.x}
            cy={f.y}
            r={f.r}
            fill="#ffb347"
            style={{ animation: `flicker ${1 + (i % 5) * 0.3}s ease-in-out infinite` }}
          />
        </g>
      ))}
      {/* siege towers */}
      {[720, 940].map((x, i) => (
        <g key={x} transform={`translate(${x} ${560 + i * 20})`}>
          <path d="M-30 0 L-22 -150 L22 -150 L30 0 Z" fill="#14090c" />
          <path d="M-26 -40 L26 -40 M-24 -90 L24 -90" stroke="#3a1a1e" stroke-width="4" />
        </g>
      ))}
      {/* the cliff and the fortress */}
      <path
        d="M0 800 L0 420 Q120 380 300 400 Q420 420 470 520 L520 800 Z"
        fill="#241820"
        stroke="#0a0608"
        stroke-width="5"
      />
      <g transform="translate(220 400)">
        <rect
          x="-170"
          y="-120"
          width="340"
          height="130"
          fill="#3a3038"
          stroke="#0a0608"
          stroke-width="5"
        />
        {Array.from({ length: 11 }, (_, i) => (
          <rect
            key={i}
            x={-168 + i * 31}
            y="-138"
            width="20"
            height="22"
            fill="#3a3038"
            stroke="#0a0608"
            stroke-width="4"
          />
        ))}
        {[-130, 0, 130].map((x) => (
          <g key={x}>
            <rect
              x={x - 30}
              y="-230"
              width="60"
              height="120"
              fill="#463a44"
              stroke="#0a0608"
              stroke-width="5"
            />
            <path
              d={`M${x - 40} -228 L${x} -290 L${x + 40} -228 Z`}
              fill="#2a2028"
              stroke="#0a0608"
              stroke-width="5"
            />
            <rect x={x - 7} y="-200" width="14" height="22" rx="7" fill="#ffcf6a" />
          </g>
        ))}
        {/* black thorns */}
        <path
          d="M-180 10 q20 -40 10 -70 q30 30 20 70 q20 -50 40 -60 q-10 40 10 60 q20 -40 50 -50 q-20 30 0 50 q30 -50 50 -40 q-10 20 10 40 q30 -40 60 -40 q-20 30 0 40"
          fill="none"
          stroke="#0a0608"
          stroke-width="6"
        />
        <Banner x={0} y={-290} color="#7a2030" />
        <Torch x={-90} y={-150} />
        <Torch x={90} y={-150} />
      </g>
      <Smoke x={600} y={540} s={1.5} color="#2a1418" dur={9} />
    </Svg>
  );
}

export function Vault() {
  const rng = new Rng(13);
  const crystals = Array.from({ length: 14 }, (_, i) => ({
    x: i * 90 + rng.int(-20, 20),
    h: rng.int(120, 300),
    w: rng.int(30, 60),
    hue: rng.pick(['#7fd8ea', '#a8e0ee', '#5ab4d0', '#c8f0f8']),
  }));
  return (
    <Svg>
      <Sky id="sky-vault" stops={['#020a10', '#0c2a36', '#123e4c']} />
      {/* cavern arches */}
      {[200, 600, 1000].map((x) => (
        <path
          key={x}
          d={`M${x - 200} 520 Q${x} 120 ${x + 200} 520`}
          fill="none"
          stroke="#0a2028"
          stroke-width="40"
        />
      ))}
      {/* light shafts */}
      {[300, 700, 980].map((x, i) => (
        <path
          key={x}
          d={`M${x - 20} 0 L${x + 20} 0 L${x + 120} 800 L${x - 80} 800 Z`}
          fill="#a8e0ee"
          opacity={0.06 + i * 0.02}
        />
      ))}
      <path d={hills(601, 560, 20, 6)} fill="#0a2229" />
      {/* the scales */}
      {[420, 820].map((x, i) => (
        <g key={x} transform={`translate(${x} 560)`} opacity=".9">
          <rect x="-4" y="-170" width="8" height="170" fill="#c9962a" />
          <path
            d="M-90 -160 L90 -160"
            stroke="#c9962a"
            stroke-width="6"
            style={{
              transformOrigin: '0 -160px',
              animation: `sway ${4 + i}s ease-in-out infinite`,
            }}
          />
          <path
            d="M-90 -160 l-26 50 h52 Z M90 -160 l-26 50 h52 Z"
            fill="none"
            stroke="#c9962a"
            stroke-width="3"
          />
          <path
            d="M-120 -110 h60 M60 -110 h60"
            stroke="#c9962a"
            stroke-width="6"
            stroke-linecap="round"
          />
        </g>
      ))}
      {crystals.map((c, i) => (
        <g key={i} filter={i % 4 === 0 ? 'url(#dglow)' : undefined}>
          <path
            d={`M${c.x} 800 L${c.x - c.w / 2} ${800 - c.h * 0.7} L${c.x} ${800 - c.h} L${c.x + c.w / 2} ${800 - c.h * 0.7} Z`}
            fill={c.hue}
            opacity=".75"
            stroke="#04141a"
            stroke-width="4"
            style={{ animation: `flicker ${3 + (i % 4)}s ease-in-out infinite` }}
          />
          <path
            d={`M${c.x} 800 L${c.x} ${800 - c.h}`}
            stroke="#ffffff"
            stroke-width="2"
            opacity=".3"
          />
        </g>
      ))}
      <path d={hills(602, 770, 12, 8)} fill="#04141a" />
    </Svg>
  );
}
