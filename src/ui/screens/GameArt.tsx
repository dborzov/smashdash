/**
 * Arena art for the encounter games: the mimic chest, the rickety bridge, the siege wall and
 * the vault door. Each takes the run's progress (`done` of `total`) so it can grow when
 * reinforcements are added (one more lock, plank, soldier or tumbler).
 */

export function ChestArt({
  locks,
  open,
  biting,
}: {
  locks: number;
  open: number;
  biting: boolean;
}) {
  const all = open >= locks;
  return (
    <svg viewBox="0 0 220 180" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      <ellipse cx="110" cy="170" rx="90" ry="10" fill="rgba(0,0,0,.3)" />
      <g
        style={{
          transformOrigin: '110px 70px',
          transform: all ? 'rotate(-18deg) translateY(-14px)' : biting ? 'rotate(-10deg)' : 'none',
          transition: 'transform .3s',
        }}
      >
        <path
          d="M20 70 Q20 20 110 20 Q200 20 200 70 Z"
          fill="#a0602b"
          stroke="#4a2a10"
          stroke-width="5"
        />
        <path
          d="M20 70 Q20 20 110 20 Q200 20 200 70"
          fill="none"
          stroke="#ffd166"
          stroke-width="8"
          opacity=".85"
        />
        {biting && (
          <path
            d="M30 70 L40 84 L50 70 L60 84 L70 70 L80 84 L90 70 L100 84 L110 70 L120 84 L130 70 L140 84 L150 70 L160 84 L170 70 L180 84 L190 70"
            fill="#fff"
            stroke="#4a2a10"
            stroke-width="2"
          />
        )}
      </g>
      {all && (
        <g filter="url(#glowc)">
          <ellipse cx="110" cy="74" rx="70" ry="16" fill="#ffd166" opacity=".9" />
          {[0, 1, 2, 3, 4].map((i) => (
            <circle
              key={i}
              cx={70 + i * 20}
              cy={66 - (i % 2) * 8}
              r="9"
              fill="#ffe27a"
              stroke="#a86b00"
              stroke-width="2"
            />
          ))}
        </g>
      )}
      <rect
        x="20"
        y="70"
        width="180"
        height="90"
        rx="6"
        fill="#b8733a"
        stroke="#4a2a10"
        stroke-width="5"
      />
      {biting && (
        <path
          d="M30 70 L40 58 L50 70 L60 58 L70 70 L80 58 L90 70 L100 58 L110 70 L120 58 L130 70 L140 58 L150 70 L160 58 L170 70 L180 58 L190 70"
          fill="#fff"
          stroke="#4a2a10"
          stroke-width="2"
        />
      )}
      <rect x="20" y="96" width="180" height="10" fill="#ffd166" opacity=".8" />
      {biting && (
        <g>
          <circle cx="70" cy="40" r="10" fill="#fff" stroke="#4a2a10" stroke-width="3" />
          <circle cx="150" cy="40" r="10" fill="#fff" stroke="#4a2a10" stroke-width="3" />
          <circle cx="72" cy="42" r="5" fill="#c2185b" />
          <circle cx="152" cy="42" r="5" fill="#c2185b" />
        </g>
      )}
      {Array.from({ length: locks }, (_, i) => {
        const x = 110 + (i - (locks - 1) / 2) * Math.min(34, 160 / locks);
        const isOpen = i < open;
        return (
          <g key={i} transform={`translate(${x} 128)`} style={{ transition: 'transform .3s' }}>
            <path
              d={
                isOpen
                  ? 'M-7 -8 L-7 -18 Q-7 -26 0 -26 Q7 -26 7 -18 L7 -22'
                  : 'M-7 -8 L-7 -16 Q-7 -24 0 -24 Q7 -24 7 -16 L7 -8'
              }
              fill="none"
              stroke="#9aa4b5"
              stroke-width="4"
            />
            <rect
              x="-11"
              y="-9"
              width="22"
              height="20"
              rx="4"
              fill={isOpen ? '#5ee6a8' : '#ffd166'}
              stroke="#4a2a10"
              stroke-width="2.5"
            />
            <circle cx="0" cy="0" r="3" fill="#4a2a10" />
          </g>
        );
      })}
      <defs>
        <filter id="glowc">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
    </svg>
  );
}

export function BridgeArt({
  planks,
  at,
  broken,
}: {
  planks: number;
  at: number;
  broken: number[];
}) {
  const w = 600;
  const step = w / (planks + 1);
  return (
    <svg
      viewBox={`0 0 ${w + 120} 200`}
      style={{ width: '100%', height: '100%' }}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="chasm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#1a1030" stop-opacity=".2" />
          <stop offset="1" stop-color="#05020f" />
        </linearGradient>
      </defs>
      <rect x="40" y="110" width={w + 40} height="90" fill="url(#chasm)" />
      <path d="M0 110 L60 110 L60 200 L0 200 Z" fill="#4a3a6a" stroke="#1a1030" stroke-width="3" />
      <path
        d={`M${w + 60} 110 L${w + 120} 110 L${w + 120} 200 L${w + 60} 200 Z`}
        fill="#4a3a6a"
        stroke="#1a1030"
        stroke-width="3"
      />
      <path
        d={`M40 92 Q${w / 2 + 60} 140 ${w + 80} 92`}
        fill="none"
        stroke="#c9a24a"
        stroke-width="4"
      />
      {Array.from({ length: planks }, (_, i) => {
        const x = 60 + step * (i + 0.5) + step / 2 - 14;
        const sag = Math.sin(((i + 1) / (planks + 1)) * Math.PI) * 28;
        const isBroken = broken.includes(i);
        return (
          <g
            key={i}
            style={{
              transition: 'transform .5s',
              transform: isBroken ? 'translateY(60px) rotate(25deg)' : 'none',
              transformBox: 'fill-box',
              transformOrigin: 'center',
              opacity: isBroken ? 0.4 : 1,
            }}
          >
            <rect
              x={x}
              y={104 + sag}
              width="28"
              height="14"
              rx="3"
              fill={i < at ? '#5ee6a8' : '#a0703a'}
              stroke="#3a2210"
              stroke-width="2.5"
            />
          </g>
        );
      })}
      <text x={w + 90} y="96" text-anchor="middle" font-size="34">
        🏁
      </text>
    </svg>
  );
}

/** One small soldier of the Hollow Host, for the siege field. */
function Soldier({
  x,
  y,
  dead,
  front,
  eye,
}: {
  x: number;
  y: number;
  dead: boolean;
  front: boolean;
  eye: string;
}) {
  return (
    <g
      transform={`translate(${x} ${y})`}
      style={{ transition: 'transform .6s ease-out', opacity: dead ? 0.35 : 1 }}
      class={front && !dead ? 'siege-front' : undefined}
    >
      <g transform={dead ? 'rotate(80) translate(10 -10)' : undefined}>
        <path
          d="M-12 0 L-10 -30 Q0 -36 10 -30 L12 0 Z"
          fill="#2a2234"
          stroke="#120d1c"
          stroke-width="2.5"
        />
        <path
          d="M-9 -30 Q-9 -46 0 -47 Q9 -46 9 -30 Z"
          fill="#8d93a3"
          stroke="#120d1c"
          stroke-width="2.5"
        />
        <path d="M-14 -38 Q0 -42 14 -38" stroke="#8d93a3" stroke-width="4" stroke-linecap="round" />
        {!dead && (
          <>
            <circle cx="-3.5" cy="-33" r="2" fill={eye} />
            <circle cx="3.5" cy="-33" r="2" fill={eye} />
          </>
        )}
        <path d="M12 -26 L12 -60" stroke="#5a4030" stroke-width="3" />
        <path d="M12 -66 L16 -58 L8 -58 Z" fill="#c9ced8" />
      </g>
    </g>
  );
}

/**
 * Hold the wall: each right answer brings down one soldier of the Hollow Host; a wrong one
 * lets the front soldier hammer the gate (cracks = hearts lost).
 */
export function SiegeArt({
  total,
  done,
  cracks,
  hit,
}: {
  total: number;
  done: number;
  cracks: number;
  hit: boolean;
}) {
  const W = 720;
  const alive = total - done;
  const fieldL = 190;
  const gap = Math.min(60, (W - fieldL - 20) / Math.max(1, total));
  return (
    <svg
      viewBox={`0 0 ${W} 200`}
      style={{ width: '100%', height: '100%' }}
      preserveAspectRatio="xMidYMax meet"
    >
      <defs>
        <linearGradient id="siege-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#3a3040" />
          <stop offset="1" stop-color="#1a141f" />
        </linearGradient>
      </defs>
      <rect x="0" y="160" width={W} height="40" fill="url(#siege-ground)" />
      {/* the wall */}
      <path d="M0 40 L130 40 L130 200 L0 200 Z" fill="#5a5560" stroke="#120d1c" stroke-width="4" />
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={6 + i * 32}
          y="22"
          width="20"
          height="22"
          fill="#5a5560"
          stroke="#120d1c"
          stroke-width="4"
        />
      ))}
      <path
        d="M0 80 h130 M0 120 h130 M30 40 v40 M80 80 v40 M50 120 v40 M100 120 v40"
        stroke="#3a3540"
        stroke-width="2.5"
      />
      {/* gate */}
      <path
        d="M86 200 L86 150 Q108 128 130 150 L130 200 Z"
        fill="#3a2418"
        stroke="#120d1c"
        stroke-width="4"
        class={hit ? 'anim-hit' : undefined}
      />
      <path d="M96 200 V146 M108 200 V140 M120 200 V146" stroke="#1c120c" stroke-width="2.5" />
      {Array.from({ length: cracks }, (_, i) => (
        <path
          key={i}
          d={`M${94 + i * 9} ${152 + (i % 2) * 12} l6 10 l-5 6 l7 9`}
          stroke="#ff6b6b"
          stroke-width="3"
          fill="none"
        />
      ))}
      {/* torches */}
      {[20, 112].map((x) => (
        <circle
          key={x}
          cx={x}
          cy="18"
          r="6"
          fill="#ffb347"
          style={{ animation: 'flicker 1.2s infinite' }}
        />
      ))}
      {Array.from({ length: total }, (_, i) => {
        // Slain soldiers stay where they fell; the living queue up behind the front one.
        const dead = i < done;
        const slot = dead ? i : i - done;
        const x = dead ? fieldL + 30 + ((i * 47) % (W - fieldL - 60)) : fieldL + 10 + slot * gap;
        return (
          <Soldier
            key={i}
            x={x}
            y={dead ? 182 : 168}
            dead={dead}
            front={!dead && slot === 0}
            eye="#6ee7ff"
          />
        );
      })}
      {alive === 0 && (
        <text x={(W + 130) / 2} y="90" text-anchor="middle" font-size="36">
          🏳️
        </text>
      )}
    </svg>
  );
}

/**
 * Crack the vault: each right answer sets a tumbler (a gold pin round the door); a wrong one
 * trips an alarm lamp (lamps lit = hearts lost).
 */
export function VaultArt({
  total,
  done,
  alarms,
  ring,
}: {
  total: number;
  done: number;
  alarms: number;
  ring: boolean;
}) {
  const pins = Array.from({ length: total }, (_, i) => {
    const a = (i / total) * Math.PI * 2 - Math.PI / 2;
    return { x: 110 + Math.cos(a) * 74, y: 104 + Math.sin(a) * 74, on: i < done };
  });
  const open = total > 0 && done >= total;
  return (
    <svg viewBox="0 0 220 200" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      <ellipse cx="110" cy="196" rx="90" ry="6" fill="rgba(0,0,0,.35)" />
      <circle cx="110" cy="104" r="92" fill="#3a3f4a" stroke="#120d1c" stroke-width="5" />
      <g
        style={{
          transformOrigin: '110px 104px',
          transform: open ? 'translateX(-60px) scaleX(.35)' : 'none',
          transition: 'transform 1s',
        }}
      >
        <circle cx="110" cy="104" r="84" fill="#8d93a3" stroke="#120d1c" stroke-width="5" />
        <circle cx="110" cy="104" r="62" fill="#a8adb9" stroke="#4a5263" stroke-width="3" />
        {pins.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="7"
            fill={p.on ? '#ffd166' : '#4a5263'}
            stroke="#120d1c"
            stroke-width="2.5"
            style={{ transition: 'fill .3s' }}
          />
        ))}
        <g
          style={{
            transformOrigin: '110px 104px',
            transform: `rotate(${done * 37}deg)`,
            transition: 'transform .6s cubic-bezier(.3,1.4,.5,1)',
          }}
        >
          <circle cx="110" cy="104" r="30" fill="#c9962a" stroke="#120d1c" stroke-width="4" />
          {[0, 60, 120, 180, 240, 300].map((r) => (
            <rect
              key={r}
              x="107"
              y="62"
              width="6"
              height="18"
              rx="3"
              fill="#c9962a"
              stroke="#120d1c"
              stroke-width="2.5"
              transform={`rotate(${r} 110 104)`}
            />
          ))}
          <circle cx="110" cy="104" r="8" fill="#5a4030" />
        </g>
      </g>
      {open && (
        <g>
          <circle cx="140" cy="104" r="50" fill="#ffd166" opacity=".35" />
          <text x="140" y="116" text-anchor="middle" font-size="36">
            💰
          </text>
        </g>
      )}
      {/* alarm lamps */}
      {[0, 1, 2, 3, 4].map((i) => (
        <circle
          key={i}
          cx={30 + i * 40}
          cy="6"
          r="7"
          fill={i < alarms ? '#ff3d3d' : '#3a2a2a'}
          stroke="#120d1c"
          stroke-width="2.5"
          style={i < alarms && ring ? { animation: 'flicker .3s 4' } : undefined}
        />
      ))}
    </svg>
  );
}
