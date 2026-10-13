/**
 * Art for the Long Count campaign: grimmer foes and portraits. Same chibi proportions and
 * thick outlines as the rest of the game (so it still belongs), but a colder, darker palette:
 * iron, ash, bone, ink, and a ghostly glow in the eyes.
 *
 * Foes use a 200 × 200 viewBox (like MonsterArt); portraits use 100 × 100 (like Portrait).
 */
import { Rng } from '../engine/rng';
import { hsl } from './paint';

export type DarkFoe = 'hollow' | 'wraith' | 'tallyman' | 'forger' | 'golem' | 'rider';

interface FoeProps {
  seed?: number;
  hue?: number;
  boss?: boolean;
  hurt?: boolean;
  class?: string;
}

const INK = '#120d1c';

function Svg({
  children,
  cls,
  vb = '0 0 200 200',
}: {
  children: preact.ComponentChildren;
  cls?: string;
  vb?: string;
}) {
  return (
    <svg width="100%" height="100%" viewBox={vb} class={cls} style={{ overflow: 'visible' }}>
      {children}
    </svg>
  );
}

function GlowEyes({
  x1,
  x2,
  y,
  r = 6,
  color,
  hurt,
}: {
  x1: number;
  x2: number;
  y: number;
  r?: number;
  color: string;
  hurt?: boolean;
}) {
  if (hurt)
    return (
      <g stroke={INK} stroke-width="4" stroke-linecap="round">
        <path d={`M${x1 - 5} ${y - 5} l10 10 M${x1 + 5} ${y - 5} l-10 10`} />
        <path d={`M${x2 - 5} ${y - 5} l10 10 M${x2 + 5} ${y - 5} l-10 10`} />
      </g>
    );
  return (
    <g>
      <circle cx={x1} cy={y} r={r * 2.2} fill={color} opacity=".25" />
      <circle cx={x2} cy={y} r={r * 2.2} fill={color} opacity=".25" />
      <circle cx={x1} cy={y} r={r} fill={color} />
      <circle cx={x2} cy={y} r={r} fill={color} />
      <circle cx={x1} cy={y} r={r * 0.4} fill="#fff" />
      <circle cx={x2} cy={y} r={r * 0.4} fill="#fff" />
    </g>
  );
}

/** A soldier of the Hollow Host: an empty suit of old armour and a tattered cloak. */
export function Hollow({ seed = 1, hue = 190, boss, hurt, class: cls }: FoeProps) {
  const rng = new Rng(seed * 31 + 7);
  const weapon = rng.pick(['spear', 'sword', 'axe'] as const);
  const helm = rng.pick(['kettle', 'great', 'hood'] as const);
  const eye = hsl(hue, 90, 65);
  const cloak = hsl((hue + 220) % 360, 18, 22);
  const steel = hurt ? '#6a6670' : '#8d93a3';
  return (
    <Svg cls={cls}>
      <ellipse cx="100" cy="192" rx="58" ry="8" fill="rgba(0,0,0,.35)" />
      {/* cloak */}
      <path
        d="M58 90 Q48 150 44 188 L60 178 L72 190 L86 178 L100 190 L114 178 L128 190 L140 178 L156 188 Q152 150 142 90 Z"
        fill={cloak}
        stroke={INK}
        stroke-width="4"
        stroke-linejoin="round"
      />
      {/* breastplate */}
      <path
        d="M70 92 Q100 82 130 92 L126 146 Q100 158 74 146 Z"
        fill={steel}
        stroke={INK}
        stroke-width="4"
      />
      <path d="M100 92 L100 150" stroke={INK} stroke-width="2.5" opacity=".5" />
      {/* the Tallyman's mark: four strokes and a slash */}
      <g stroke={hurt ? '#555' : '#b3263a'} stroke-width="4" stroke-linecap="round">
        <path d="M86 108 v22 M94 108 v22 M102 108 v22 M110 108 v22" />
        <path d="M80 126 L116 110" />
      </g>
      {/* weapon arm */}
      <g transform={hurt ? 'rotate(30 150 120)' : undefined}>
        {weapon === 'spear' && (
          <g>
            <rect
              x="150"
              y="28"
              width="7"
              height="150"
              rx="3"
              fill="#5a4030"
              stroke={INK}
              stroke-width="3"
            />
            <path
              d="M153.5 6 L164 34 L143 34 Z"
              fill="#c9ced8"
              stroke={INK}
              stroke-width="3"
              stroke-linejoin="round"
            />
          </g>
        )}
        {weapon === 'sword' && (
          <g>
            <path
              d="M150 54 L160 54 L158 140 L152 140 Z"
              fill="#c9ced8"
              stroke={INK}
              stroke-width="3"
            />
            <rect
              x="140"
              y="138"
              width="30"
              height="7"
              rx="3"
              fill="#5a4030"
              stroke={INK}
              stroke-width="3"
            />
            <rect
              x="151"
              y="144"
              width="8"
              height="20"
              rx="3"
              fill="#3a2a20"
              stroke={INK}
              stroke-width="2.5"
            />
          </g>
        )}
        {weapon === 'axe' && (
          <g>
            <rect
              x="150"
              y="40"
              width="7"
              height="130"
              rx="3"
              fill="#5a4030"
              stroke={INK}
              stroke-width="3"
            />
            <path
              d="M157 46 Q186 52 184 82 Q170 74 157 76 Z"
              fill="#c9ced8"
              stroke={INK}
              stroke-width="3"
              stroke-linejoin="round"
            />
          </g>
        )}
        <circle cx="153" cy="128" r="11" fill={steel} stroke={INK} stroke-width="4" />
      </g>
      {/* shield arm */}
      <path
        d="M40 104 Q40 150 62 162 Q84 150 84 104 Q62 96 40 104 Z"
        fill={hsl((hue + 200) % 360, 25, 30)}
        stroke={INK}
        stroke-width="4"
      />
      <path
        d="M62 104 L62 160 M42 128 L82 128"
        stroke={hurt ? '#555' : '#b3263a'}
        stroke-width="3"
        opacity=".8"
      />
      {/* head */}
      <g transform={hurt ? 'rotate(-14 100 60)' : undefined}>
        <path
          d="M70 70 Q70 30 100 28 Q130 30 130 70 Q130 92 100 94 Q70 92 70 70 Z"
          fill="#1c1626"
          stroke={INK}
          stroke-width="4"
        />
        <GlowEyes x1={88} x2={112} y={66} color={eye} hurt={hurt} />
        {helm === 'kettle' && (
          <g>
            <path
              d="M64 52 Q66 22 100 20 Q134 22 136 52 Z"
              fill={steel}
              stroke={INK}
              stroke-width="4"
            />
            <path
              d="M52 54 Q100 44 148 54 Q100 62 52 54 Z"
              fill={steel}
              stroke={INK}
              stroke-width="4"
            />
          </g>
        )}
        {helm === 'great' && (
          <g>
            <path
              d="M68 46 Q70 18 100 16 Q130 18 132 46 L132 88 Q100 98 68 88 Z"
              fill={steel}
              stroke={INK}
              stroke-width="4"
            />
            <rect
              x="74"
              y="58"
              width="52"
              height="16"
              rx="5"
              fill="#1c1626"
              stroke={INK}
              stroke-width="3"
            />
            <GlowEyes x1={88} x2={112} y={66} r={5} color={eye} hurt={hurt} />
            <path
              d="M100 16 Q110 0 128 2"
              fill="none"
              stroke="#b3263a"
              stroke-width="6"
              stroke-linecap="round"
            />
          </g>
        )}
        {helm === 'hood' && (
          <path
            d="M60 80 Q56 20 100 16 Q144 20 140 80 Q134 46 100 44 Q66 46 60 80 Z"
            fill={cloak}
            stroke={INK}
            stroke-width="4"
          />
        )}
      </g>
      {boss && (
        <path
          d="M76 22 L72 0 L88 12 L100 -6 L112 12 L128 0 L124 22 Z"
          fill="#9aa4b8"
          stroke={INK}
          stroke-width="4"
          stroke-linejoin="round"
        />
      )}
    </Svg>
  );
}

/** A wraith: a hooded scrap of shadow trailing burnt ledger pages. */
export function Wraith({ seed = 1, hue = 200, boss, hurt, class: cls }: FoeProps) {
  const eye = hsl(hue, 95, 70);
  const body = hurt ? '#4a4652' : hsl((hue + 240) % 360, 22, 18);
  const rng = new Rng(seed);
  const pages = Array.from({ length: 4 }, (_, i) => [
    40 + i * 38 + rng.int(-8, 8),
    40 + rng.int(0, 120),
    rng.int(-30, 30),
  ]);
  return (
    <Svg cls={cls}>
      <ellipse cx="100" cy="194" rx="40" ry="6" fill="rgba(0,0,0,.25)" />
      <g style={{ animation: 'bob 2.6s ease-in-out infinite' }}>
        <path
          d="M56 70 Q56 18 100 14 Q144 18 144 70 L150 150 Q140 140 132 168 Q122 148 112 178 Q102 150 92 180 Q82 150 70 170 Q62 142 50 156 Z"
          fill={body}
          stroke={INK}
          stroke-width="4"
          stroke-linejoin="round"
          opacity=".95"
        />
        <path
          d="M70 76 Q70 40 100 38 Q130 40 130 76 Q130 96 100 98 Q70 96 70 76 Z"
          fill="#07050d"
        />
        <GlowEyes x1={88} x2={112} y={70} r={7} color={eye} hurt={hurt} />
        {/* claws */}
        <path
          d="M54 110 Q36 118 30 136 M54 110 Q40 126 40 144 M54 110 Q46 128 50 146"
          stroke={body}
          stroke-width="7"
          stroke-linecap="round"
          fill="none"
        />
        <path
          d="M146 110 Q164 118 170 136 M146 110 Q160 126 160 144 M146 110 Q154 128 150 146"
          stroke={body}
          stroke-width="7"
          stroke-linecap="round"
          fill="none"
        />
      </g>
      {pages.map(([x, y, r], i) => (
        <g
          key={i}
          transform={`translate(${x} ${y}) rotate(${r})`}
          style={{ animation: `drift ${5 + i}s ease-in-out infinite` }}
        >
          <rect
            x="-9"
            y="-12"
            width="18"
            height="24"
            rx="2"
            fill="#d9ccb0"
            stroke={INK}
            stroke-width="2"
            opacity=".8"
          />
          <path d="M-5 -6 h10 M-5 -1 h10 M-5 4 h7" stroke="#6b5a40" stroke-width="1.5" />
          <path d="M9 -12 q-4 6 0 10 q-5 4 0 14" fill="none" stroke="#3a2a20" stroke-width="2" />
        </g>
      ))}
      {boss && (
        <circle
          cx="100"
          cy="60"
          r="70"
          fill="none"
          stroke={eye}
          stroke-width="2"
          opacity=".35"
          stroke-dasharray="4 8"
        />
      )}
    </Svg>
  );
}

/** The Tallyman: once the Royal Reckoner, now a lich who unmakes what is not counted. */
export function Tallyman({ hurt, class: cls }: FoeProps) {
  const fire = hurt ? '#666' : '#6ee7ff';
  return (
    <Svg cls={cls}>
      <ellipse cx="100" cy="194" rx="66" ry="8" fill="rgba(0,0,0,.4)" />
      {/* robe */}
      <path
        d="M52 92 Q36 150 30 192 L170 192 Q164 150 148 92 Q100 76 52 92 Z"
        fill="#1a1428"
        stroke={INK}
        stroke-width="4"
      />
      <path d="M100 86 L92 192 M100 86 L108 192" stroke="#3a2f52" stroke-width="5" />
      <path d="M58 100 Q100 116 142 100" fill="none" stroke="#a88a3a" stroke-width="5" />
      {/* tally beads on a chain */}
      <path d="M62 104 Q100 150 138 104" fill="none" stroke="#7a6a50" stroke-width="2.5" />
      {Array.from({ length: 9 }, (_, i) => {
        const t = (i + 1) / 10;
        const x = 62 + 76 * t;
        const y = 104 + Math.sin(Math.PI * t) * 34;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="4.5"
            fill={i % 5 === 4 ? '#b3263a' : '#e8dcc0'}
            stroke={INK}
            stroke-width="1.5"
          />
        );
      })}
      {/* ledger */}
      <g transform={hurt ? 'translate(10 30) rotate(25 40 140)' : 'rotate(-8 40 140)'}>
        <rect
          x="16"
          y="112"
          width="50"
          height="62"
          rx="4"
          fill="#4a2a1a"
          stroke={INK}
          stroke-width="4"
        />
        <rect x="22" y="118" width="38" height="50" rx="2" fill="#d9ccb0" />
        <path
          d="M27 128 h28 M27 136 h28 M27 144 h20 M27 152 h28"
          stroke="#6b5a40"
          stroke-width="2"
        />
        <path d="M30 160 l20 -8" stroke="#b3263a" stroke-width="3" />
      </g>
      {/* quill staff */}
      <g transform={hurt ? 'rotate(40 160 120)' : undefined}>
        <path d="M156 196 L170 40" stroke="#c9b48a" stroke-width="5" stroke-linecap="round" />
        <path
          d="M170 40 Q196 -4 178 -20 Q170 10 160 30 Q164 16 150 0 Q156 26 168 44 Z"
          fill="#e8e0d0"
          stroke={INK}
          stroke-width="3"
        />
        <circle cx="157" cy="186" r="5" fill="#0a0612" />
      </g>
      {/* skull */}
      <g transform={hurt ? 'rotate(-12 100 56)' : undefined}>
        <path
          d="M70 58 Q70 22 100 20 Q130 22 130 58 Q130 74 120 80 L118 94 L82 94 L80 80 Q70 74 70 58 Z"
          fill="#e8dcc0"
          stroke={INK}
          stroke-width="4"
        />
        <ellipse cx="87" cy="58" rx="10" ry="11" fill="#0a0612" />
        <ellipse cx="113" cy="58" rx="10" ry="11" fill="#0a0612" />
        {!hurt && (
          <g style={{ animation: 'flicker 1.6s ease-in-out infinite' }}>
            <ellipse cx="87" cy="58" rx="5" ry="7" fill={fire} />
            <ellipse cx="113" cy="58" rx="5" ry="7" fill={fire} />
            <circle cx="87" cy="58" r="14" fill={fire} opacity=".2" />
            <circle cx="113" cy="58" r="14" fill={fire} opacity=".2" />
          </g>
        )}
        <path d="M100 66 L95 76 L105 76 Z" fill="#0a0612" />
        <path d="M86 86 v8 M94 86 v8 M102 86 v8 M110 86 v8" stroke={INK} stroke-width="2.5" />
        {/* crown of quills */}
        {[-34, -20, -6, 8, 22].map((dx, i) => (
          <path
            key={i}
            d={`M${100 + dx} 30 Q${104 + dx * 1.3} ${2 - (i === 2 ? 10 : 0)} ${108 + dx * 1.4} ${-14 - (i === 2 ? 12 : 0)} Q${102 + dx} 6 ${100 + dx + 6} 30 Z`}
            fill="#d8d2c4"
            stroke={INK}
            stroke-width="2.5"
          />
        ))}
        <path
          d="M66 32 Q100 20 134 32"
          fill="none"
          stroke="#a88a3a"
          stroke-width="6"
          stroke-linecap="round"
        />
      </g>
    </Svg>
  );
}

/** Maul Vane the Forger: a masked clerk with a quill like a dagger. */
export function Forger({ hurt, class: cls }: FoeProps) {
  return (
    <Svg cls={cls}>
      <ellipse cx="100" cy="192" rx="54" ry="7" fill="rgba(0,0,0,.35)" />
      <path
        d="M58 96 Q46 150 50 188 L150 188 Q154 150 142 96 Q100 84 58 96 Z"
        fill="#2a2234"
        stroke={INK}
        stroke-width="4"
      />
      <path d="M78 96 L100 150 L122 96" fill="#d9ccb0" stroke={INK} stroke-width="3" />
      {/* ink stains */}
      <circle cx="74" cy="150" r="7" fill="#0a0612" />
      <circle cx="82" cy="164" r="4" fill="#0a0612" />
      <circle cx="128" cy="140" r="5" fill="#0a0612" />
      {/* quill dagger */}
      <g transform={hurt ? 'rotate(60 152 110)' : 'rotate(-20 152 110)'}>
        <path d="M150 140 L156 60" stroke="#c9b48a" stroke-width="5" stroke-linecap="round" />
        <path
          d="M156 60 Q180 26 166 8 Q160 34 150 50 Z"
          fill="#3a3448"
          stroke={INK}
          stroke-width="3"
        />
        <path d="M148 140 L152 160 L156 140 Z" fill="#0a0612" />
      </g>
      {/* stamp */}
      <g transform="translate(48 132)">
        <rect
          x="-12"
          y="-6"
          width="24"
          height="12"
          rx="3"
          fill="#7a2a1a"
          stroke={INK}
          stroke-width="3"
        />
        <rect
          x="-4"
          y="-24"
          width="8"
          height="18"
          rx="3"
          fill="#4a2a1a"
          stroke={INK}
          stroke-width="3"
        />
        <circle cx="0" cy="-26" r="7" fill="#4a2a1a" stroke={INK} stroke-width="3" />
      </g>
      {/* head and hood */}
      <path
        d="M64 92 Q58 30 100 24 Q142 30 136 92 Q122 70 100 70 Q78 70 64 92 Z"
        fill="#1c1626"
        stroke={INK}
        stroke-width="4"
      />
      <circle cx="100" cy="66" r="26" fill="#c9a98a" stroke={INK} stroke-width="4" />
      <path
        d="M76 56 Q100 46 124 56 L122 72 Q100 64 78 72 Z"
        fill="#e8e0d0"
        stroke={INK}
        stroke-width="3"
      />
      {hurt ? (
        <path
          d="M86 60 l8 8 M94 60 l-8 8 M106 60 l8 8 M114 60 l-8 8"
          stroke={INK}
          stroke-width="3"
        />
      ) : (
        <g>
          <ellipse cx="90" cy="63" rx="4" ry="3" fill="#0a0612" />
          <ellipse cx="110" cy="63" rx="4" ry="3" fill="#0a0612" />
        </g>
      )}
      <path
        d="M88 82 Q100 88 114 80"
        fill="none"
        stroke={INK}
        stroke-width="3"
        stroke-linecap="round"
      />
      <path d="M64 92 Q58 30 100 24 Q142 30 136 92" fill="none" stroke={INK} stroke-width="4" />
    </Svg>
  );
}

/** A glass golem from the alchemists' vaults: faceted, cold, with a ticking brass heart. */
export function Golem({ hue = 190, hurt, class: cls }: FoeProps) {
  const glass = hurt ? '#7a8590' : hsl(hue, 60, 72);
  const deep = hsl(hue, 55, 38);
  return (
    <Svg cls={cls}>
      <ellipse cx="100" cy="194" rx="62" ry="8" fill="rgba(0,0,0,.35)" />
      <path
        d="M58 188 L66 150 L82 150 L80 188 Z M120 188 L118 150 L134 150 L142 188 Z"
        fill={deep}
        stroke={INK}
        stroke-width="4"
        stroke-linejoin="round"
      />
      <path
        d="M52 80 L76 60 L124 60 L148 80 L140 150 L60 150 Z"
        fill={glass}
        stroke={INK}
        stroke-width="4"
        stroke-linejoin="round"
        opacity=".92"
      />
      <path
        d="M76 60 L100 96 L124 60 M52 80 L100 96 L148 80 M60 150 L100 96 L140 150"
        stroke={deep}
        stroke-width="2.5"
        fill="none"
        opacity=".6"
      />
      {/* brass heart */}
      <circle cx="100" cy="108" r="13" fill="#c9962a" stroke={INK} stroke-width="3" />
      {!hurt && (
        <circle
          cx="100"
          cy="108"
          r="22"
          fill="#ffd166"
          opacity=".25"
          style={{ animation: 'pulse 1.2s infinite' }}
        />
      )}
      <path d="M100 100 L100 108 L106 112" stroke={INK} stroke-width="2.5" fill="none" />
      {/* arms */}
      <path
        d="M52 82 L26 116 L34 150 L50 146 L44 120 L60 100 Z"
        fill={glass}
        stroke={INK}
        stroke-width="4"
        stroke-linejoin="round"
      />
      <path
        d="M148 82 L174 116 L166 150 L150 146 L156 120 L140 100 Z"
        fill={glass}
        stroke={INK}
        stroke-width="4"
        stroke-linejoin="round"
      />
      {/* head */}
      <path
        d="M74 58 L80 24 L100 14 L120 24 L126 58 Z"
        fill={glass}
        stroke={INK}
        stroke-width="4"
        stroke-linejoin="round"
      />
      <path
        d="M80 24 L100 40 L120 24 M100 14 L100 40"
        stroke={deep}
        stroke-width="2"
        opacity=".6"
      />
      <GlowEyes x1={90} x2={110} y={44} r={5} color={hurt ? '#888' : '#ff7a3d'} hurt={hurt} />
      {hurt && (
        <path d="M64 90 L84 110 L76 126 L92 140" stroke={INK} stroke-width="3" fill="none" />
      )}
    </Svg>
  );
}

/** An Ash Rider: a hollow knight on a horse whose mane is smoke and cinders. */
export function Rider({ hue = 20, boss, hurt, class: cls }: FoeProps) {
  const ember = hurt ? '#666' : hsl(hue, 95, 58);
  return (
    <Svg cls={cls}>
      <ellipse cx="100" cy="194" rx="80" ry="8" fill="rgba(0,0,0,.4)" />
      {/* horse */}
      <path
        d="M40 120 Q40 96 70 96 L140 96 Q160 96 162 118 L160 150 L150 150 L148 128 L66 128 L62 152 L50 152 Z"
        fill="#2a2430"
        stroke={INK}
        stroke-width="4"
        stroke-linejoin="round"
      />
      <path
        d="M58 150 L54 186 L66 186 L70 150 M140 150 L136 186 L148 186 L152 150"
        fill="#2a2430"
        stroke={INK}
        stroke-width="4"
      />
      <path
        d="M44 104 Q20 96 14 72 Q30 74 36 62 Q48 70 52 96 Z"
        fill="#2a2430"
        stroke={INK}
        stroke-width="4"
        stroke-linejoin="round"
      />
      <path
        d="M14 72 Q18 60 30 58 L36 62 Q28 70 14 72 Z"
        fill="#e8dcc0"
        stroke={INK}
        stroke-width="3"
      />
      <circle cx="28" cy="66" r="3" fill={ember} />
      {/* smoke mane */}
      {!hurt &&
        [0, 1, 2, 3].map((i) => (
          <circle
            key={i}
            cx={40 + i * 6}
            cy={66 + i * 7}
            r={7 - i}
            fill={ember}
            opacity=".7"
            style={{ animation: `flicker ${1 + i * 0.3}s infinite` }}
          />
        ))}
      <path
        d="M160 104 Q186 110 190 140 Q178 128 166 126"
        fill="none"
        stroke={ember}
        stroke-width="5"
        stroke-linecap="round"
        opacity=".8"
      />
      {/* rider */}
      <path
        d="M86 98 L84 52 Q100 42 116 52 L114 98 Z"
        fill="#6a6f7d"
        stroke={INK}
        stroke-width="4"
      />
      <path
        d="M84 54 Q84 18 100 16 Q116 18 116 54 Z"
        fill="#8d93a3"
        stroke={INK}
        stroke-width="4"
      />
      <rect x="88" y="34" width="24" height="8" rx="3" fill="#07050d" />
      <GlowEyes x1={95} x2={105} y={38} r={2.6} color={ember} hurt={hurt} />
      <path
        d="M100 16 Q96 -4 112 -10"
        fill="none"
        stroke={ember}
        stroke-width="6"
        stroke-linecap="round"
        opacity=".85"
      />
      <g transform={hurt ? 'rotate(50 120 70)' : undefined}>
        <path d="M118 66 L176 30" stroke="#5a4030" stroke-width="6" stroke-linecap="round" />
        <path d="M176 30 L190 20 L184 36 Z" fill="#c9ced8" stroke={INK} stroke-width="3" />
      </g>
      {boss && (
        <path
          d="M86 20 L84 4 L94 12 L100 0 L106 12 L116 4 L114 20 Z"
          fill="#9aa4b8"
          stroke={INK}
          stroke-width="3"
        />
      )}
    </Svg>
  );
}

export function DarkFoeArt({ art, ...p }: FoeProps & { art: DarkFoe }) {
  switch (art) {
    case 'hollow':
      return <Hollow {...p} />;
    case 'wraith':
      return <Wraith {...p} />;
    case 'tallyman':
      return <Tallyman {...p} />;
    case 'forger':
      return <Forger {...p} />;
    case 'golem':
      return <Golem {...p} />;
    case 'rider':
      return <Rider {...p} />;
  }
}

// ---------------------------------------------------------------------------
// Portraits (100 × 100)

function Head({ skin, stroke = '#3a2418' }: { skin: string; stroke?: string }) {
  return <circle cx="50" cy="56" r="26" fill={skin} stroke={stroke} stroke-width="2.5" />;
}

function Eyes({ y = 54, l = true, r = true }: { y?: number; l?: boolean; r?: boolean }) {
  return (
    <g>
      {l && <ellipse cx="41" cy={y} rx="3.2" ry="4" fill={INK} />}
      {r && <ellipse cx="59" cy={y} rx="3.2" ry="4" fill={INK} />}
      {l && <circle cx="42" cy={y - 1.5} r="1.1" fill="#fff" />}
      {r && <circle cx="60" cy={y - 1.5} r="1.1" fill="#fff" />}
    </g>
  );
}

export function DarkPortrait({ who, class: cls }: { who: string; class?: string }) {
  let body: preact.ComponentChildren;
  switch (who) {
    case 'voss': // Marshal Edda Voss: grey braid, eyepatch, scar, steel gorget
      body = (
        <>
          <path
            d="M22 100 Q24 80 50 78 Q76 80 78 100 Z"
            fill="#6a6f7d"
            stroke={INK}
            stroke-width="2.5"
          />
          <path d="M34 82 Q50 90 66 82" fill="none" stroke="#a88a3a" stroke-width="3" />
          <Head skin="#e0b48e" />
          <path
            d="M24 52 Q22 26 50 24 Q78 26 76 52 Q70 36 50 36 Q30 36 24 52 Z"
            fill="#9a9aa6"
            stroke={INK}
            stroke-width="2.5"
          />
          <path
            d="M74 50 Q86 70 80 94"
            fill="none"
            stroke="#9a9aa6"
            stroke-width="6"
            stroke-linecap="round"
          />
          <path d="M77 62 l6 2 M77 72 l6 2 M78 82 l6 1" stroke={INK} stroke-width="1.5" />
          <Eyes l={false} />
          <path
            d="M33 49 L49 49 L48 59 Q41 62 34 58 Z"
            fill="#1c1626"
            stroke={INK}
            stroke-width="2"
          />
          <path d="M28 47 L72 44" stroke="#1c1626" stroke-width="2" />
          <path d="M60 60 L66 72" stroke="#b36a5a" stroke-width="2.5" stroke-linecap="round" />
          <path
            d="M42 70 Q50 68 58 70"
            fill="none"
            stroke="#3a2418"
            stroke-width="2.5"
            stroke-linecap="round"
          />
        </>
      );
      break;
    case 'hobb': // Quartermaster Hobb Tallow: bald, spectacles, walrus moustache, quill behind ear
      body = (
        <>
          <path
            d="M20 100 Q22 80 50 78 Q78 80 80 100 Z"
            fill="#5a4a3a"
            stroke={INK}
            stroke-width="2.5"
          />
          <Head skin="#eac3a0" />
          <ellipse cx="25" cy="58" rx="5" ry="7" fill="#eac3a0" stroke="#3a2418" stroke-width="2" />
          <ellipse cx="75" cy="58" rx="5" ry="7" fill="#eac3a0" stroke="#3a2418" stroke-width="2" />
          <path
            d="M26 46 Q24 40 30 38 M74 46 Q76 40 70 38"
            stroke="#d9d4cc"
            stroke-width="5"
            stroke-linecap="round"
          />
          <Eyes />
          <circle
            cx="41"
            cy="54"
            r="7"
            fill="rgba(200,230,255,.25)"
            stroke="#a88a3a"
            stroke-width="2"
          />
          <circle
            cx="59"
            cy="54"
            r="7"
            fill="rgba(200,230,255,.25)"
            stroke="#a88a3a"
            stroke-width="2"
          />
          <path d="M48 54 h4" stroke="#a88a3a" stroke-width="2" />
          <path
            d="M30 70 Q40 62 50 68 Q60 62 70 70 Q62 76 50 71 Q38 76 30 70 Z"
            fill="#d9d4cc"
            stroke={INK}
            stroke-width="2"
          />
          <path d="M76 44 L92 18" stroke="#e8e0d0" stroke-width="3" />
          <path
            d="M92 18 Q98 8 94 2 Q90 12 86 22 Z"
            fill="#e8e0d0"
            stroke={INK}
            stroke-width="1.5"
          />
        </>
      );
      break;
    case 'wren': // Wren the scout: hood, freckles, a crow feather
      body = (
        <>
          <path
            d="M20 100 Q22 78 50 76 Q78 78 80 100 Z"
            fill="#3a4a3a"
            stroke={INK}
            stroke-width="2.5"
          />
          <path
            d="M20 70 Q16 22 50 18 Q84 22 80 70 Q74 40 50 38 Q26 40 20 70 Z"
            fill="#3a4a3a"
            stroke={INK}
            stroke-width="2.5"
          />
          <Head skin="#f0c9a6" />
          <path d="M26 50 Q30 32 50 32 Q70 32 74 50 Q64 42 50 44 Q36 42 26 50 Z" fill="#2a1a12" />
          <Eyes />
          <g fill="#c98a5a">
            <circle cx="36" cy="62" r="1.3" />
            <circle cx="40" cy="64" r="1.3" />
            <circle cx="60" cy="62" r="1.3" />
            <circle cx="64" cy="64" r="1.3" />
          </g>
          <path
            d="M44 70 Q50 72 57 68"
            fill="none"
            stroke="#3a2418"
            stroke-width="2.5"
            stroke-linecap="round"
          />
          <path
            d="M70 30 Q88 14 92 4 Q84 22 74 34 Z"
            fill="#14101c"
            stroke={INK}
            stroke-width="1.5"
          />
        </>
      );
      break;
    case 'anselm': // Brother Anselm, the archivist: tonsure, soot on the nose, candle-light
      body = (
        <>
          <path
            d="M18 100 Q20 78 50 76 Q80 78 82 100 Z"
            fill="#5a3a2a"
            stroke={INK}
            stroke-width="2.5"
          />
          <path d="M30 82 Q50 92 70 82 L66 100 L34 100 Z" fill="#4a2e20" />
          <Head skin="#e8bf98" />
          <path
            d="M24 56 Q22 38 32 32 Q38 40 50 40 Q62 40 68 32 Q78 38 76 56 Q72 44 50 46 Q28 44 24 56 Z"
            fill="#8a6a4a"
            stroke={INK}
            stroke-width="2"
          />
          <Eyes />
          <ellipse cx="50" cy="61" rx="3" ry="2" fill="#555" opacity=".6" />
          <path
            d="M43 70 Q50 74 57 70"
            fill="none"
            stroke="#3a2418"
            stroke-width="2.5"
            stroke-linecap="round"
          />
        </>
      );
      break;
    case 'tallyman':
      body = (
        <>
          <path
            d="M16 100 Q20 76 50 74 Q80 76 84 100 Z"
            fill="#1a1428"
            stroke={INK}
            stroke-width="2.5"
          />
          <path
            d="M30 40 Q30 16 50 14 Q70 16 70 40 Q70 52 64 56 L62 66 L38 66 L36 56 Q30 52 30 40 Z"
            fill="#e8dcc0"
            stroke={INK}
            stroke-width="2.5"
          />
          <ellipse cx="42" cy="40" rx="6" ry="7" fill="#0a0612" />
          <ellipse cx="58" cy="40" rx="6" ry="7" fill="#0a0612" />
          <ellipse
            cx="42"
            cy="40"
            rx="3"
            ry="4"
            fill="#6ee7ff"
            style={{ animation: 'flicker 1.6s infinite' }}
          />
          <ellipse
            cx="58"
            cy="40"
            rx="3"
            ry="4"
            fill="#6ee7ff"
            style={{ animation: 'flicker 1.6s infinite' }}
          />
          <path d="M50 46 L47 52 L53 52 Z" fill="#0a0612" />
          <path d="M42 60 v6 M47 60 v6 M52 60 v6 M57 60 v6" stroke={INK} stroke-width="1.6" />
          {[-14, -6, 2, 10].map((dx, i) => (
            <path
              key={i}
              d={`M${50 + dx} 20 Q${52 + dx} 2 ${56 + dx} -6 Q${52 + dx} 6 ${54 + dx} 20 Z`}
              fill="#d8d2c4"
              stroke={INK}
              stroke-width="1.5"
            />
          ))}
        </>
      );
      break;
    case 'vane':
      body = (
        <>
          <path
            d="M18 100 Q20 78 50 76 Q80 78 82 100 Z"
            fill="#2a2234"
            stroke={INK}
            stroke-width="2.5"
          />
          <path
            d="M20 74 Q14 18 50 14 Q86 18 80 74 Q72 42 50 40 Q28 42 20 74 Z"
            fill="#1c1626"
            stroke={INK}
            stroke-width="2.5"
          />
          <Head skin="#c9a98a" />
          <path
            d="M28 46 Q50 38 72 46 L70 60 Q50 54 30 60 Z"
            fill="#e8e0d0"
            stroke={INK}
            stroke-width="2"
          />
          <ellipse cx="41" cy="51" rx="3" ry="2.4" fill={INK} />
          <ellipse cx="59" cy="51" rx="3" ry="2.4" fill={INK} />
          <path
            d="M40 70 Q50 74 62 66"
            fill="none"
            stroke={INK}
            stroke-width="2.5"
            stroke-linecap="round"
          />
        </>
      );
      break;
    case 'ashcaptain':
      body = (
        <>
          <path
            d="M18 100 Q20 78 50 76 Q80 78 82 100 Z"
            fill="#6a6f7d"
            stroke={INK}
            stroke-width="2.5"
          />
          <path
            d="M26 74 Q24 22 50 20 Q76 22 74 74 Z"
            fill="#8d93a3"
            stroke={INK}
            stroke-width="2.5"
          />
          <rect x="32" y="46" width="36" height="10" rx="3" fill="#07050d" />
          <circle cx="42" cy="51" r="2.6" fill="#ff7a3d" />
          <circle cx="58" cy="51" r="2.6" fill="#ff7a3d" />
          <path
            d="M50 20 Q44 2 62 -4"
            fill="none"
            stroke="#ff7a3d"
            stroke-width="5"
            stroke-linecap="round"
            opacity=".85"
          />
          <path d="M34 64 h32 M38 70 h24" stroke="#4a5263" stroke-width="2" />
        </>
      );
      break;
    case 'warden':
      body = (
        <>
          <path
            d="M18 100 Q20 78 50 76 Q80 78 82 100 Z"
            fill="#4a7a8a"
            stroke={INK}
            stroke-width="2.5"
          />
          <path
            d="M28 70 L32 34 L50 22 L68 34 L72 70 L50 82 Z"
            fill="#a8e0ee"
            stroke={INK}
            stroke-width="2.5"
            opacity=".95"
          />
          <path
            d="M32 34 L50 50 L68 34 M50 22 L50 50 M28 70 L50 50 L72 70"
            stroke="#4a7a8a"
            stroke-width="1.5"
            opacity=".6"
          />
          <circle cx="42" cy="52" r="3" fill="#ff7a3d" />
          <circle cx="58" cy="52" r="3" fill="#ff7a3d" />
        </>
      );
      break;
    default:
      body = (
        <>
          <Head skin="#d9b08c" />
          <Eyes />
        </>
      );
  }
  return (
    <Svg cls={cls} vb="0 0 100 100">
      {body}
    </Svg>
  );
}
