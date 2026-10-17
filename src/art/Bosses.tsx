/**
 * Hand-drawn bosses for the campaigns added in v3 (200 × 200, standing on y ≈ 190). `hue`
 * recolours the ones that come back at higher ranks (Gerald's mum is pinker than Gerald).
 */
import type { BOSS_ARTS } from '../content/schema';
import { hsl } from './paint';

export type BossArt = (typeof BOSS_ARTS)[number];

interface Props {
  hue?: number;
  boss?: boolean;
  hurt?: boolean;
  class?: string;
}

const INK = '#1b1033';

function Frame({ children, cls, hurt }: { children: preact.ComponentChildren; cls?: string; hurt?: boolean }) {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 200 200"
      class={cls}
      style={{ overflow: 'visible', filter: hurt ? 'saturate(.5) brightness(.9)' : undefined }}
    >
      <ellipse cx="100" cy="192" rx="70" ry="9" fill="rgba(0,0,0,.3)" />
      {children}
    </svg>
  );
}

function Eye({ x, y, r = 10, look = 0, hurt }: { x: number; y: number; r?: number; look?: number; hurt?: boolean }) {
  if (hurt)
    return (
      <path
        d={`M${x - r * 0.7} ${y - r * 0.7} l${r * 1.4} ${r * 1.4} M${x + r * 0.7} ${y - r * 0.7} l${-r * 1.4} ${r * 1.4}`}
        stroke={INK}
        stroke-width="3"
        stroke-linecap="round"
      />
    );
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="#fff" stroke={INK} stroke-width="2.5" />
      <circle cx={x + look} cy={y + 1} r={r * 0.5} fill={INK} />
      <circle cx={x + look + r * 0.2} cy={y - r * 0.2} r={r * 0.17} fill="#fff" />
    </g>
  );
}

/** Gerald the Gelatinous Cube: a wobbly see-through cube with things floating inside. */
function Cube({ hue = 100, hurt, class: cls }: Props) {
  const f = hsl(hue, 70, 60, 0.75);
  const d = hsl(hue, 60, 28);
  return (
    <Frame cls={cls} hurt={hurt}>
      <g style={{ transformOrigin: '100px 190px', animation: 'wobble 2.2s ease-in-out infinite' }}>
        <path d="M40 70 L110 50 L170 70 L170 170 L100 190 L40 170 Z" fill={f} stroke={d} stroke-width="4" stroke-linejoin="round" />
        <path d="M40 70 L100 90 L170 70 M100 90 L100 190" fill="none" stroke={d} stroke-width="3" opacity=".7" />
        <path d="M100 90 L170 70 L170 170 L100 190 Z" fill={hsl(hue, 60, 40, 0.35)} />
        {/* things inside */}
        <text x="62" y="160" font-size="22" opacity=".8" transform="rotate(-20 62 160)">🦴</text>
        <text x="122" y="150" font-size="18" opacity=".75">🪑</text>
        <text x="70" y="124" font-size="14" opacity=".7">🧀</text>
        <circle cx="140" cy="110" r="5" fill="#fff" opacity=".6" />
        <circle cx="60" cy="96" r="3" fill="#fff" opacity=".6" />
        <Eye x={64} y={110} r={11} hurt={hurt} />
        <Eye x={88} y={116} r={11} hurt={hurt} />
        <path d="M58 140 Q76 154 94 142" fill="none" stroke={d} stroke-width="4" stroke-linecap="round" />
      </g>
    </Frame>
  );
}

/** The Hydra: three snake heads on long necks, arguing. */
function Hydra({ hue = 150, hurt, class: cls }: Props) {
  const f = hsl(hue, 60, 45);
  const l = hsl(hue, 70, 70);
  const d = hsl(hue, 60, 18);
  const heads: [number, number, number, string][] = [
    [50, 60, -18, '1.9s'],
    [104, 34, 0, '2.3s'],
    [156, 62, 16, '2.1s'],
  ];
  return (
    <Frame cls={cls} hurt={hurt}>
      <ellipse cx="104" cy="160" rx="64" ry="34" fill={f} stroke={d} stroke-width="4" />
      <ellipse cx="104" cy="168" rx="40" ry="18" fill={l} />
      <path d="M160 168 Q196 170 190 140" fill="none" stroke={f} stroke-width="14" stroke-linecap="round" />
      {heads.map(([x, y, r, dur], i) => (
        <g key={i} style={{ transformOrigin: `104px 150px`, animation: `sway ${dur} ease-in-out infinite alternate` }}>
          <path d={`M104 150 Q${(104 + x) / 2 + r} ${(150 + y) / 2 + 20} ${x} ${y + 18}`} fill="none" stroke={d} stroke-width="24" stroke-linecap="round" />
          <path d={`M104 150 Q${(104 + x) / 2 + r} ${(150 + y) / 2 + 20} ${x} ${y + 18}`} fill="none" stroke={f} stroke-width="18" stroke-linecap="round" />
          <ellipse cx={x} cy={y} rx="24" ry="20" fill={f} stroke={d} stroke-width="3.5" transform={`rotate(${r} ${x} ${y})`} />
          <ellipse cx={x + (r > 0 ? 8 : r < 0 ? -8 : 0)} cy={y + 10} rx="14" ry="8" fill={l} />
          <Eye x={x - 9} y={y - 4} r={7} look={i - 1} hurt={hurt} />
          <Eye x={x + 9} y={y - 4} r={7} look={i - 1} hurt={hurt} />
          <path d={`M${x - 6} ${y + 14} l3 6 3 -6`} fill="#fff" stroke={d} stroke-width="1.5" />
          {i === 2 && <text x={x + 18} y={y - 18} font-size="14">💢</text>}
        </g>
      ))}
    </Frame>
  );
}

/** The Squareholder: a beholder with a 7 × 7 grid of eyes and stalks on a square body. */
function Beholder({ hue = 320, hurt, class: cls }: Props) {
  const f = hsl(hue, 65, 58);
  const d = hsl(hue, 60, 22);
  return (
    <Frame cls={cls} hurt={hurt}>
      <g style={{ animation: 'bob 2.6s ease-in-out infinite' }}>
        {[30, 70, 130, 170].map((x, i) => (
          <g key={x}>
            <path d={`M${x < 100 ? 60 : 140} 70 Q${x} 40 ${x} 22`} fill="none" stroke={d} stroke-width="6" />
            <Eye x={x} y={18} r={9} look={i < 2 ? -2 : 2} hurt={hurt} />
          </g>
        ))}
        <rect x="40" y="56" width="120" height="120" rx="20" fill={f} stroke={d} stroke-width="4" />
        {Array.from({ length: 49 }, (_, k) => {
          const r = Math.floor(k / 7);
          const c = k % 7;
          return hurt ? (
            <path key={k} d={`M${55 + c * 15} ${71 + r * 15} l6 6 m0 -6 l-6 6`} stroke={INK} stroke-width="1.5" />
          ) : (
            <g key={k}>
              <circle cx={58 + c * 15} cy={74 + r * 15} r="5.5" fill="#fff" stroke={d} stroke-width="1" />
              <circle cx={58 + c * 15 + ((k * 3) % 3) - 1} cy={74 + r * 15} r="2.6" fill={INK} />
            </g>
          );
        })}
      </g>
    </Frame>
  );
}

/** The Dungeon Master: a gnome in a hoodie behind a cardboard screen, rolling a d20. */
function DungeonMaster({ hue = 270, hurt, class: cls }: Props) {
  const hood = hsl(hue, 55, 45);
  const d = hsl(hue, 50, 20);
  return (
    <Frame cls={cls} hurt={hurt}>
      <path d="M40 120 Q100 40 160 120 L150 190 L50 190 Z" fill={hood} stroke={d} stroke-width="4" />
      <path d="M60 80 Q100 -30 140 80" fill={hood} stroke={d} stroke-width="4" />
      <circle cx="100" cy="92" r="30" fill="#f2c99a" stroke="#6a4020" stroke-width="3" />
      <path d="M72 102 Q100 150 128 102 Q120 128 100 132 Q80 128 72 102 Z" fill="#e8e0d0" stroke="#7a6a50" stroke-width="2" />
      <Eye x={88} y={88} r={7} hurt={hurt} />
      <Eye x={112} y={88} r={7} hurt={hurt} />
      <path d="M80 76 l14 4 M120 76 l-14 4" stroke={INK} stroke-width="3" stroke-linecap="round" />
      <ellipse cx="100" cy="100" rx="7" ry="5" fill="#e8a070" />
      {/* the screen */}
      <path d="M20 190 L36 132 L100 140 L164 132 L180 190 Z" fill="#c9a26a" stroke="#5a3a14" stroke-width="4" stroke-linejoin="round" />
      <path d="M100 140 L100 190" stroke="#5a3a14" stroke-width="3" />
      <text x="62" y="172" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="14" fill="#5a3a14">DM</text>
      <text x="138" y="174" text-anchor="middle" font-size="18">🐉</text>
      <g style={{ transformOrigin: '160px 100px', animation: 'spin 3s linear infinite' }}>
        <path d="M160 84 L174 92 L174 108 L160 116 L146 108 L146 92 Z" fill="#ff5fa2" stroke={INK} stroke-width="2.5" />
        <text x="160" y="105" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="11" fill="#fff">20</text>
      </g>
    </Frame>
  );
}

/** The Unit Confuser: a tangle of rulers and scales in a lab coat, mixing up mm and km. */
function Confuser({ hue = 30, hurt, class: cls }: Props) {
  const f = hsl(hue, 85, 60);
  return (
    <Frame cls={cls} hurt={hurt}>
      <rect x="70" y="80" width="60" height="100" rx="12" fill="#f4f4f8" stroke={INK} stroke-width="3.5" />
      <rect x="40" y="110" width="120" height="16" rx="3" fill={f} stroke={INK} stroke-width="3" transform="rotate(-20 100 118)" />
      {Array.from({ length: 10 }, (_, i) => (
        <line key={i} x1={44 + i * 12} y1="111" x2={44 + i * 12} y2={i % 5 ? 117 : 121} stroke={INK} stroke-width="1.5" transform="rotate(-20 100 118)" />
      ))}
      <circle cx="100" cy="58" r="34" fill="#ffe0b8" stroke={INK} stroke-width="3.5" />
      <Eye x={86} y={54} r={10} look={-3} hurt={hurt} />
      <Eye x={116} y={52} r={13} look={3} hurt={hurt} />
      <path d="M84 78 Q100 70 116 82" fill="none" stroke={INK} stroke-width="3" stroke-linecap="round" />
      <text x="40" y="40" font-family="Fredoka" font-weight="700" font-size="16" fill={f} transform="rotate(-14 40 40)">km?</text>
      <text x="140" y="34" font-family="Fredoka" font-weight="700" font-size="16" fill={f} transform="rotate(12 140 34)">mm!</text>
      <path d="M60 30 Q70 10 84 26 M140 26 Q130 6 116 22" fill="none" stroke="#5a3a14" stroke-width="5" stroke-linecap="round" />
    </Frame>
  );
}

/** Doctor Exactly: a pristine villain in a lab coat whose badge has fourteen decimal places. */
function Exactly({ hue = 220, hurt, class: cls }: Props) {
  const c = hsl(hue, 40, 92);
  return (
    <Frame cls={cls} hurt={hurt}>
      <path d="M58 100 L142 100 L160 190 L40 190 Z" fill={c} stroke={INK} stroke-width="4" stroke-linejoin="round" />
      <path d="M100 100 L100 190" stroke="#b8c0d8" stroke-width="3" />
      <rect x="112" y="118" width="38" height="16" rx="3" fill="#ffd166" stroke={INK} stroke-width="2" />
      <text x="131" y="130" text-anchor="middle" font-family="Fredoka" font-size="8" fill={INK}>3.14159265…</text>
      <circle cx="100" cy="64" r="36" fill="#f6dcc0" stroke={INK} stroke-width="4" />
      <path d="M64 56 Q66 20 100 22 Q134 20 136 56 Q118 40 100 42 Q82 40 64 56 Z" fill="#e8ecff" stroke={INK} stroke-width="3" />
      <rect x="74" y="54" width="22" height="16" rx="3" fill="#bfe6ff" stroke={INK} stroke-width="3" />
      <rect x="104" y="54" width="22" height="16" rx="3" fill="#bfe6ff" stroke={INK} stroke-width="3" />
      <line x1="96" y1="62" x2="104" y2="62" stroke={INK} stroke-width="3" />
      {hurt ? (
        <path d="M80 60 l10 6 M90 60 l-10 6 M110 60 l10 6 M120 60 l-10 6" stroke={INK} stroke-width="2" />
      ) : (
        <>
          <circle cx="85" cy="62" r="3.5" fill={INK} />
          <circle cx="115" cy="62" r="3.5" fill={INK} />
        </>
      )}
      <path d="M86 86 Q100 80 114 86" fill="none" stroke={INK} stroke-width="3" stroke-linecap="round" />
      <path d="M86 80 Q93 76 100 80 Q107 76 114 80" fill="none" stroke="#6a4020" stroke-width="3" />
      <g style={{ transformOrigin: '164px 110px', animation: 'sway 1.6s ease-in-out infinite alternate' }}>
        <rect x="150" y="70" width="10" height="56" rx="3" fill="#9aa4b5" stroke={INK} stroke-width="2.5" />
        <circle cx="155" cy="66" r="9" fill="#ff5fa2" stroke={INK} stroke-width="2.5" />
      </g>
    </Frame>
  );
}

/** Professor Googol: an enormous zero with a tiny one riding on top, wearing a mortarboard. */
function Googol({ hue = 270, hurt, class: cls }: Props) {
  const f = hsl(hue, 70, 62);
  const d = hsl(hue, 60, 24);
  return (
    <Frame cls={cls} hurt={hurt}>
      <g style={{ animation: 'bob 3s ease-in-out infinite' }}>
        <ellipse cx="110" cy="116" rx="62" ry="74" fill={f} stroke={d} stroke-width="5" />
        <ellipse cx="110" cy="116" rx="30" ry="42" fill="#1a0e3a" stroke={d} stroke-width="4" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <text key={i} x={70 + i * 16} y={188} font-family="Fredoka" font-weight="700" font-size="14" fill="#fff" opacity=".7">0</text>
        ))}
        <Eye x={86} y={70} r={10} hurt={hurt} />
        <Eye x={134} y={70} r={10} hurt={hurt} />
        <path d="M88 160 Q110 174 132 160" fill="none" stroke={d} stroke-width="4" stroke-linecap="round" />
        <rect x="36" y="40" width="16" height="70" rx="4" fill="#ffd166" stroke={d} stroke-width="3" transform="rotate(-8 44 75)" />
        <path d="M30 52 L44 36 L48 44" fill="#ffd166" stroke={d} stroke-width="3" />
        <path d="M80 34 L110 22 L140 34 L110 46 Z" fill={INK} />
        <path d="M110 34 L110 50" stroke={INK} stroke-width="3" />
        <path d="M140 34 L144 52" stroke="#ffd166" stroke-width="2.5" />
      </g>
      <text x="160" y="38" font-family="Fredoka" font-weight="700" font-size="18" fill="#ffd166">10¹⁰⁰</text>
    </Frame>
  );
}

/** Admiral Waddles: a penguin pirate who steals plus signs. */
function Waddles({ hue = 200, hurt, class: cls }: Props) {
  const coat = hsl(hue, 50, 26);
  return (
    <Frame cls={cls} hurt={hurt}>
      <g style={{ transformOrigin: '100px 190px', animation: 'waddle 1.2s ease-in-out infinite alternate' }}>
        <ellipse cx="100" cy="124" rx="50" ry="66" fill="#20242e" stroke={INK} stroke-width="4" />
        <ellipse cx="100" cy="136" rx="34" ry="50" fill="#f4f6fa" />
        <path d="M54 110 Q30 140 52 166 Q62 140 64 120 Z M146 110 Q170 140 148 166 Q138 140 136 120 Z" fill={coat} stroke={INK} stroke-width="3" />
        <path d="M70 186 l-10 6 h22 Z M130 186 l10 6 h-22 Z" fill="#ffb020" stroke={INK} stroke-width="2.5" />
        <Eye x={86} y={90} r={9} look={1} hurt={hurt} />
        <Eye x={114} y={90} r={9} look={1} hurt={hurt} />
        <path d="M90 104 L110 104 L100 120 Z" fill="#ffb020" stroke={INK} stroke-width="2.5" />
        <path d="M58 64 Q100 30 142 64 Q100 54 58 64 Z" fill="#20242e" stroke={INK} stroke-width="3" />
        <path d="M66 60 Q100 6 134 60 Z" fill="#20242e" stroke={INK} stroke-width="3" />
        <text x="100" y="52" text-anchor="middle" font-size="16">☠️</text>
        <text x="148" y="150" font-family="Fredoka" font-weight="700" font-size="30" fill="#ff5fa2">+</text>
        <text x="40" y="160" font-family="Fredoka" font-weight="700" font-size="22" fill="#5ec8ff">+</text>
      </g>
    </Frame>
  );
}

/** The Clutterbeast: a heap of unsorted lost property with eyes. */
function Clutter({ hurt, class: cls }: Props) {
  return (
    <Frame cls={cls} hurt={hurt}>
      <path d="M24 190 Q20 110 70 80 Q110 50 150 82 Q186 110 178 190 Z" fill="#a0784a" stroke={INK} stroke-width="4" />
      {[
        ['🧦', 40, 150, -20],
        ['☂️', 130, 110, 20],
        ['🎺', 70, 120, -10],
        ['🧸', 140, 160, 10],
        ['📦', 92, 170, 0],
        ['🥾', 56, 182, 0],
        ['🎩', 108, 76, -14],
      ].map(([e, x, y, r], i) => (
        <text key={i} x={x as number} y={y as number} font-size="26" transform={`rotate(${r} ${x} ${y})`}>
          {e}
        </text>
      ))}
      <Eye x={84} y={100} r={11} look={-2} hurt={hurt} />
      <Eye x={116} y={96} r={13} look={2} hurt={hurt} />
      <path d="M80 132 Q100 120 122 134" fill="none" stroke={INK} stroke-width="4" stroke-linecap="round" />
    </Frame>
  );
}

/** Mumsy Muddler: the Muddler's mum. Curlers, a cardigan, a wooden spoon and a LOT of fog. */
function Mumsy({ hue = 330, hurt, class: cls }: Props) {
  const card = hsl(hue, 55, 62);
  return (
    <Frame cls={cls} hurt={hurt}>
      <ellipse cx="100" cy="150" rx="90" ry="30" fill="#c9b3ff" opacity=".5" style={{ animation: 'bob 4s ease-in-out infinite' }} />
      <path d="M50 110 Q100 90 150 110 L162 190 L38 190 Z" fill={card} stroke={INK} stroke-width="4" />
      <path d="M100 100 L100 190" stroke={hsl(hue, 50, 40)} stroke-width="3" />
      {[118, 140, 162].map((y) => (
        <circle key={y} cx="108" cy={y} r="3.5" fill="#fff" stroke={INK} stroke-width="1.5" />
      ))}
      <circle cx="100" cy="72" r="36" fill="#f6d2b0" stroke={INK} stroke-width="4" />
      {[70, 90, 110, 130].map((x, i) => (
        <rect key={x} x={x - 9} y={30 + (i % 2) * 4} width="18" height="14" rx="7" fill={['#ff5fa2', '#5ec8ff', '#ffd166', '#5ee6a8'][i]} stroke={INK} stroke-width="2" />
      ))}
      <circle cx="86" cy="72" r="10" fill="none" stroke={INK} stroke-width="2.5" />
      <circle cx="114" cy="72" r="10" fill="none" stroke={INK} stroke-width="2.5" />
      <line x1="96" y1="72" x2="104" y2="72" stroke={INK} stroke-width="2.5" />
      {hurt ? (
        <path d="M82 68 l8 8 M90 68 l-8 8 M110 68 l8 8 M118 68 l-8 8" stroke={INK} stroke-width="2" />
      ) : (
        <>
          <circle cx="86" cy="73" r="3.5" fill={INK} />
          <circle cx="114" cy="73" r="3.5" fill={INK} />
        </>
      )}
      <path d="M86 92 Q100 86 114 92" fill="none" stroke={INK} stroke-width="3" stroke-linecap="round" />
      <ellipse cx="70" cy="88" rx="6" ry="4" fill="#ff7a9a" opacity=".5" />
      <ellipse cx="130" cy="88" rx="6" ry="4" fill="#ff7a9a" opacity=".5" />
      <g style={{ transformOrigin: '160px 140px', animation: 'sway 1.4s ease-in-out infinite alternate' }}>
        <rect x="156" y="70" width="8" height="74" rx="4" fill="#c98a3c" stroke={INK} stroke-width="2.5" />
        <ellipse cx="160" cy="66" rx="12" ry="16" fill="#c98a3c" stroke={INK} stroke-width="2.5" />
      </g>
    </Frame>
  );
}

export function BossArtView({ art, ...p }: Props & { art: BossArt }) {
  switch (art) {
    case 'cube':
      return <Cube {...p} />;
    case 'hydra':
      return <Hydra {...p} />;
    case 'beholder':
      return <Beholder {...p} />;
    case 'dm':
      return <DungeonMaster {...p} />;
    case 'confuser':
      return <Confuser {...p} />;
    case 'exactly':
      return <Exactly {...p} />;
    case 'googol':
      return <Googol {...p} />;
    case 'waddles':
      return <Waddles {...p} />;
    case 'clutter':
      return <Clutter {...p} />;
    case 'mumsy':
      return <Mumsy {...p} />;
  }
}

export const isBossArt = (a: string | undefined): a is BossArt =>
  !!a && ['cube', 'hydra', 'beholder', 'dm', 'confuser', 'exactly', 'googol', 'waddles', 'clutter', 'mumsy'].includes(a);
