/** Pets, eggs, poop, flies and tombstones. */
import type { Mood } from '../engine/pet';
import { HatArt } from './Avatar';

function Eyes({
  mood,
  x1,
  x2,
  y,
  r = 9,
  dark = '#1b1033',
  sleep,
}: {
  mood: Mood;
  x1: number;
  x2: number;
  y: number;
  r?: number;
  dark?: string;
  sleep?: boolean;
}) {
  if (sleep && mood !== 'dead')
    return (
      <g fill="none" stroke={dark} stroke-width="3.5" stroke-linecap="round">
        <path d={`M${x1 - r} ${y} Q${x1} ${y + r * 0.8} ${x1 + r} ${y}`} />
        <path d={`M${x2 - r} ${y} Q${x2} ${y + r * 0.8} ${x2 + r} ${y}`} />
      </g>
    );
  if (mood === 'dead')
    return (
      <g stroke={dark} stroke-width="4" stroke-linecap="round">
        <path
          d={`M${x1 - 7} ${y - 7} l14 14 M${x1 + 7} ${y - 7} l-14 14 M${x2 - 7} ${y - 7} l14 14 M${x2 + 7} ${y - 7} l-14 14`}
        />
      </g>
    );
  if (mood === 'sick')
    return (
      <g fill="none" stroke={dark} stroke-width="3">
        <path d={`M${x1 - 6} ${y} a6 6 0 1 1 6 6 a3 3 0 1 1 -3 -3`} />
        <path d={`M${x2 - 6} ${y} a6 6 0 1 1 6 6 a3 3 0 1 1 -3 -3`} />
      </g>
    );
  if (mood === 'bored' || mood === 'grumpy')
    return (
      <g>
        <circle cx={x1} cy={y} r={r} fill="#fff" stroke={dark} stroke-width="3" />
        <circle cx={x2} cy={y} r={r} fill="#fff" stroke={dark} stroke-width="3" />
        <circle cx={x1} cy={y + 3} r={r * 0.45} fill={dark} />
        <circle cx={x2} cy={y + 3} r={r * 0.45} fill={dark} />
        <path
          d={`M${x1 - r - 2} ${y - 1} L${x1 + r + 2} ${y - 1} M${x2 - r - 2} ${y - 1} L${x2 + r + 2} ${y - 1}`}
          stroke={dark}
          stroke-width="4"
        />
      </g>
    );
  return (
    <g>
      <circle cx={x1} cy={y} r={r} fill="#fff" stroke={dark} stroke-width="3" />
      <circle cx={x2} cy={y} r={r} fill="#fff" stroke={dark} stroke-width="3" />
      <circle cx={x1 + 1} cy={y + 1} r={r * 0.55} fill={dark} />
      <circle cx={x2 + 1} cy={y + 1} r={r * 0.55} fill={dark} />
      <circle cx={x1 + 3} cy={y - 2} r={r * 0.22} fill="#fff" />
      <circle cx={x2 + 3} cy={y - 2} r={r * 0.22} fill="#fff" />
    </g>
  );
}

function Mouth({
  mood,
  x,
  y,
  dark = '#1b1033',
}: {
  mood: Mood;
  x: number;
  y: number;
  dark?: string;
}) {
  switch (mood) {
    case 'dead':
      return (
        <g>
          <path
            d={`M${x - 10} ${y} L${x + 10} ${y}`}
            stroke={dark}
            stroke-width="3.5"
            stroke-linecap="round"
          />
          <path
            d={`M${x + 2} ${y} q4 12 10 4 l-2 -4`}
            fill="#ff6b8a"
            stroke={dark}
            stroke-width="2"
          />
        </g>
      );
    case 'sick':
      return (
        <path
          d={`M${x - 10} ${y + 4} q5 -6 10 0 q5 6 10 0`}
          fill="none"
          stroke={dark}
          stroke-width="3"
          stroke-linecap="round"
        />
      );
    case 'hungry':
      return (
        <g>
          <ellipse
            cx={x}
            cy={y + 2}
            rx="9"
            ry="8"
            fill="#3a0d1f"
            stroke={dark}
            stroke-width="2.5"
          />
          <path
            d={`M${x + 6} ${y + 9} q2 8 -1 12`}
            stroke="#9fe0ff"
            stroke-width="3"
            fill="none"
            stroke-linecap="round"
          />
        </g>
      );
    case 'bored':
    case 'grumpy':
      return (
        <path
          d={`M${x - 9} ${y + 4} Q${x} ${y - 2} ${x + 9} ${y + 4}`}
          fill="none"
          stroke={dark}
          stroke-width="3"
          stroke-linecap="round"
        />
      );
    default:
      return (
        <path
          d={`M${x - 11} ${y - 2} Q${x} ${y + 11} ${x + 11} ${y - 2} Z`}
          fill="#3a0d1f"
          stroke={dark}
          stroke-width="2.5"
          stroke-linejoin="round"
        />
      );
  }
}

/**
 * Where a hat sits on each species: the middle of the top of its head (x, y), how big the hat
 * is there (s) and a little tilt (r, degrees). Hats are drawn for the hero's head (brim centre
 * at 60, 40 in their own coordinates), so they are moved and scaled onto the pet.
 */
const HAT_SPOT: Record<string, { x: number; y: number; s: number; r?: number }> = {
  blorp: { x: 80, y: 57, s: 0.8, r: -4 },
  dragonling: { x: 80, y: 53, s: 0.75, r: 6 },
  mushling: { x: 80, y: 29, s: 0.8, r: -6 },
  owlbear: { x: 80, y: 54, s: 0.85 },
  bonepup: { x: 72, y: 42, s: 0.72, r: -8 },
  mimic: { x: 80, y: 53, s: 0.85, r: 5 },
};

function PetHat({ id, species }: { id: string; species: string }) {
  const a = HAT_SPOT[species] ?? HAT_SPOT.blorp;
  return (
    <g transform={`translate(${a.x} ${a.y}) rotate(${a.r ?? 0}) scale(${a.s}) translate(-60 -40)`}>
      <HatArt id={id} outfit="#9b7bff" />
    </g>
  );
}

export function PetArt({
  species,
  mood,
  hat,
  sleep,
  class: cls,
}: {
  species: string;
  mood: Mood;
  hat?: string;
  /** Eyes shut, little Zzz. */
  sleep?: boolean;
  class?: string;
}) {
  const sick = mood === 'sick';
  const dead = mood === 'dead';
  const tint = sick ? 'saturate(0.6) hue-rotate(20deg)' : dead ? 'grayscale(0.7)' : undefined;
  let body;
  switch (species) {
    case 'dragonling':
      body = (
        <g>
          <path
            d="M112 128 Q150 130 148 100 Q140 116 118 112 Z"
            fill="#e8483a"
            stroke="#6b1010"
            stroke-width="3.5"
          />
          <path d="M146 100 l8 -6 -2 10 Z" fill="#ffd166" stroke="#6b1010" stroke-width="2" />
          <path
            d="M48 84 Q16 60 22 104 Q34 92 50 100 Z"
            fill="#ff9a7a"
            stroke="#6b1010"
            stroke-width="3.5"
          />
          <path
            d="M112 84 Q144 60 138 104 Q126 92 110 100 Z"
            fill="#ff9a7a"
            stroke="#6b1010"
            stroke-width="3.5"
          />
          <ellipse
            cx="80"
            cy="108"
            rx="40"
            ry="38"
            fill="#ff5a4a"
            stroke="#6b1010"
            stroke-width="3.5"
          />
          <ellipse cx="80" cy="120" rx="24" ry="22" fill="#ffd27a" />
          <path d="M70 108 h20 M68 120 h24 M70 132 h20" stroke="#e8a840" stroke-width="2.5" />
          <path
            d="M58 64 L52 42 L68 58 Z M102 64 L108 42 L92 58 Z"
            fill="#fff4dc"
            stroke="#6b1010"
            stroke-width="3"
            stroke-linejoin="round"
          />
          <ellipse
            cx="80"
            cy="76"
            rx="32"
            ry="26"
            fill="#ff5a4a"
            stroke="#6b1010"
            stroke-width="3.5"
          />
          <ellipse cx="80" cy="88" rx="16" ry="10" fill="#ff8a7a" />
          <circle cx="74" cy="86" r="2" fill="#6b1010" />
          <circle cx="86" cy="86" r="2" fill="#6b1010" />
          <Eyes mood={mood} sleep={sleep} x1={67} x2={93} y={72} r={8} />
          <Mouth mood={mood} x={80} y={96} />
          <ellipse
            cx="62"
            cy="144"
            rx="10"
            ry="6"
            fill="#e8483a"
            stroke="#6b1010"
            stroke-width="3"
          />
          <ellipse
            cx="98"
            cy="144"
            rx="10"
            ry="6"
            fill="#e8483a"
            stroke="#6b1010"
            stroke-width="3"
          />
        </g>
      );
      break;
    case 'mushling':
      body = (
        <g>
          <ellipse
            cx="66"
            cy="146"
            rx="9"
            ry="6"
            fill="#f5e6c8"
            stroke="#7a5a3a"
            stroke-width="3"
          />
          <ellipse
            cx="94"
            cy="146"
            rx="9"
            ry="6"
            fill="#f5e6c8"
            stroke="#7a5a3a"
            stroke-width="3"
          />
          <path
            d="M54 82 Q50 140 80 142 Q110 140 106 82 Z"
            fill="#fff4dc"
            stroke="#7a5a3a"
            stroke-width="3.5"
          />
          <path
            d="M14 86 Q14 26 80 24 Q146 26 146 86 Q120 96 80 94 Q40 96 14 86 Z"
            fill="#ff7ab8"
            stroke="#8a1c4a"
            stroke-width="3.5"
          />
          <circle cx="50" cy="56" r="10" fill="#fff" opacity=".9" />
          <circle cx="92" cy="44" r="13" fill="#fff" opacity=".9" />
          <circle cx="122" cy="66" r="8" fill="#fff" opacity=".9" />
          <circle cx="72" cy="72" r="6" fill="#fff" opacity=".9" />
          <Eyes mood={mood} sleep={sleep} x1={68} x2={92} y={110} r={7} />
          <Mouth mood={mood} x={80} y={128} />
          <ellipse cx="60" cy="122" rx="5" ry="3" fill="#ff7a9a" opacity=".5" />
          <ellipse cx="100" cy="122" rx="5" ry="3" fill="#ff7a9a" opacity=".5" />
        </g>
      );
      break;
    case 'owlbear':
      body = (
        <g>
          <path
            d="M44 52 L38 22 L62 44 Z M116 52 L122 22 L98 44 Z"
            fill="#8a5a33"
            stroke="#3a2210"
            stroke-width="3.5"
            stroke-linejoin="round"
          />
          <ellipse
            cx="80"
            cy="100"
            rx="52"
            ry="50"
            fill="#a8743f"
            stroke="#3a2210"
            stroke-width="3.5"
          />
          <ellipse cx="80" cy="120" rx="30" ry="26" fill="#e8c49a" />
          <path
            d="M66 112 q4 4 8 0 M80 118 q4 4 8 0 M70 128 q4 4 8 0 M86 108 q4 4 8 0"
            stroke="#b08a5a"
            stroke-width="2"
            fill="none"
          />
          <ellipse
            cx="62"
            cy="80"
            rx="22"
            ry="20"
            fill="#f2deb8"
            stroke="#3a2210"
            stroke-width="2.5"
          />
          <ellipse
            cx="98"
            cy="80"
            rx="22"
            ry="20"
            fill="#f2deb8"
            stroke="#3a2210"
            stroke-width="2.5"
          />
          <Eyes mood={mood} sleep={sleep} x1={62} x2={98} y={80} r={12} />
          <path
            d="M72 92 L88 92 L80 106 Z"
            fill="#ffb020"
            stroke="#7a4a00"
            stroke-width="2.5"
            stroke-linejoin="round"
          />
          {mood !== 'happy' && mood !== 'ok' && <Mouth mood={mood} x={80} y={112} />}
          <ellipse
            cx="34"
            cy="116"
            rx="12"
            ry="18"
            fill="#a8743f"
            stroke="#3a2210"
            stroke-width="3"
            transform="rotate(20 34 116)"
          />
          <ellipse
            cx="126"
            cy="116"
            rx="12"
            ry="18"
            fill="#a8743f"
            stroke="#3a2210"
            stroke-width="3"
            transform="rotate(-20 126 116)"
          />
        </g>
      );
      break;
    case 'bonepup':
      body = (
        <g>
          <path
            d="M118 112 Q146 100 150 80"
            fill="none"
            stroke="#e8e0d0"
            stroke-width="7"
            stroke-linecap="round"
            style={{
              transformOrigin: '118px 112px',
              animation:
                mood === 'happy' && !sleep ? 'wag .35s ease-in-out infinite alternate' : undefined,
            }}
          />
          <path
            d="M118 112 Q146 100 150 80"
            fill="none"
            stroke="#3a3448"
            stroke-width="2"
            stroke-dasharray="4 6"
          />
          <ellipse
            cx="82"
            cy="114"
            rx="40"
            ry="28"
            fill="#e8e0d0"
            stroke="#3a3448"
            stroke-width="3.5"
          />
          <path
            d="M66 100 v24 M78 98 v28 M90 98 v28 M102 100 v24"
            stroke="#b8b0a4"
            stroke-width="3"
            stroke-linecap="round"
          />
          {[56, 74, 92, 110].map((x) => (
            <rect
              key={x}
              x={x - 5}
              y="130"
              width="10"
              height="18"
              rx="5"
              fill="#e8e0d0"
              stroke="#3a3448"
              stroke-width="3"
            />
          ))}
          <path
            d="M36 50 Q24 50 22 74 Q32 72 40 64 Z M108 50 Q120 50 122 74 Q112 72 104 64 Z"
            fill="#3a3448"
            stroke="#1a1626"
            stroke-width="3"
          />
          <path
            d="M40 74 Q40 40 72 38 Q104 40 104 74 Q104 92 92 98 L60 98 Q40 92 40 74 Z"
            fill="#f2ece2"
            stroke="#3a3448"
            stroke-width="3.5"
          />
          <ellipse
            cx="72"
            cy="90"
            rx="16"
            ry="10"
            fill="#e0d8cc"
            stroke="#3a3448"
            stroke-width="2.5"
          />
          <ellipse cx="72" cy="84" rx="5" ry="4" fill="#1a1626" />
          <g>
            <circle cx="58" cy="66" r="11" fill="#1a1626" />
            <circle cx="86" cy="66" r="11" fill="#1a1626" />
            <Eyes mood={mood} sleep={sleep} x1={58} x2={86} y={66} r={6} dark="#6ee7ff" />
          </g>
          {mood !== 'happy' && <Mouth mood={mood} x={72} y={98} />}
        </g>
      );
      break;
    case 'mimic':
      body = (
        <g>
          <rect
            x="30"
            y="96"
            width="100"
            height="50"
            rx="6"
            fill="#a0602b"
            stroke="#4a2a10"
            stroke-width="3.5"
          />
          <rect x="30" y="112" width="100" height="8" fill="#ffd166" opacity=".85" />
          <rect
            x="74"
            y="108"
            width="12"
            height="16"
            rx="3"
            fill="#ffd166"
            stroke="#7a4a00"
            stroke-width="2"
          />
          <path
            d="M30 96 L40 104 L50 96 L60 104 L70 96 L80 104 L90 96 L100 104 L110 96 L120 104 L130 96"
            fill="#fff"
            stroke="#4a2a10"
            stroke-width="2"
          />
          {!sleep && mood !== 'dead' && (
            <path d="M62 96 Q80 128 98 96" fill="#e0475b" stroke="#7a1020" stroke-width="2.5" />
          )}
          <g
            style={{
              transformOrigin: '30px 92px',
              animation: mood === 'happy' && !sleep ? 'chomp 1.6s ease-in-out infinite' : undefined,
            }}
          >
            <path
              d="M30 92 Q30 50 80 50 Q130 50 130 92 Z"
              fill="#b8733a"
              stroke="#4a2a10"
              stroke-width="3.5"
            />
            <path
              d="M30 92 Q30 50 80 50 Q130 50 130 92"
              fill="none"
              stroke="#ffd166"
              stroke-width="6"
              opacity=".85"
            />
            <path
              d="M30 92 L40 84 L50 92 L60 84 L70 92 L80 84 L90 92 L100 84 L110 92 L120 84 L130 92"
              fill="#fff"
              stroke="#4a2a10"
              stroke-width="2"
            />
            <Eyes mood={mood} sleep={sleep} x1={64} x2={96} y={68} r={9} />
            {hat && !dead && <PetHat id={hat} species="mimic" />}
          </g>
        </g>
      );
      break;
    default:
      // blorp, the slime
      body = (
        <g>
          <path
            d="M18 140 Q14 70 80 52 Q146 70 142 140 Q130 150 112 144 Q100 152 80 146 Q60 152 48 144 Q30 150 18 140 Z"
            fill="#6ee26b"
            stroke="#1f6b1d"
            stroke-width="3.5"
            opacity=".95"
          />
          <path
            d="M40 84 Q56 66 76 64"
            fill="none"
            stroke="#e8ffe0"
            stroke-width="7"
            stroke-linecap="round"
            opacity=".8"
          />
          <circle cx="112" cy="122" r="6" fill="#a8f5a0" opacity=".7" />
          <circle cx="46" cy="126" r="4" fill="#a8f5a0" opacity=".7" />
          <Eyes mood={mood} sleep={sleep} x1={64} x2={96} y={100} r={11} />
          <Mouth mood={mood} x={80} y={122} />
        </g>
      );
  }
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 160 160"
      class={cls}
      style={{ overflow: 'visible', filter: tint }}
    >
      <ellipse cx="80" cy="152" rx="56" ry="8" fill="rgba(0,0,0,.25)" />
      <g transform={dead ? 'rotate(170 80 100) translate(0 -30)' : undefined}>
        {body}
        {hat && !dead && species !== 'mimic' && <PetHat id={hat} species={species} />}
      </g>
      {sleep && !dead && (
        <g class="zzz" font-family="Fredoka" font-weight="700" fill="#c6b8ff">
          <text x="120" y="40" font-size="22">
            Z
          </text>
          <text x="136" y="22" font-size="16">
            z
          </text>
          <text x="148" y="8" font-size="12">
            z
          </text>
        </g>
      )}
    </svg>
  );
}

/** Buzzing flies: tiny black dots orbiting a point. */
export function Flies({ n = 3, size = 60 }: { n?: number; size?: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {Array.from({ length: n }, (_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${30 + i * 18}%`,
            top: `${10 + (i % 2) * 14}%`,
            width: `${size * 0.1}px`,
            height: `${size * 0.1}px`,
            animation: `fly ${0.9 + i * 0.37}s linear infinite`,
          }}
        >
          <svg viewBox="0 0 10 10" width="10" height="10">
            <ellipse cx="5" cy="6" rx="3" ry="2.5" fill="#111" />
            <ellipse cx="3" cy="3" rx="2.5" ry="1.6" fill="rgba(200,220,255,.8)" />
            <ellipse cx="7" cy="3" rx="2.5" ry="1.6" fill="rgba(200,220,255,.8)" />
          </svg>
        </div>
      ))}
    </div>
  );
}

export function Poop({ size = 56 }: { size?: number }) {
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} style={{ overflow: 'visible' }}>
      <ellipse cx="30" cy="54" rx="22" ry="4" fill="rgba(0,0,0,.25)" />
      <path
        d="M8 52 Q4 40 16 38 Q12 28 22 26 Q20 16 30 14 Q30 6 36 4 Q36 12 40 16 Q48 20 42 28 Q54 30 48 40 Q58 44 52 52 Z"
        fill="#8a5a2b"
        stroke="#3a2210"
        stroke-width="2.5"
        stroke-linejoin="round"
      />
      <path
        d="M18 42 Q30 46 44 40 M22 32 Q30 34 38 30"
        fill="none"
        stroke="#5a3a18"
        stroke-width="2"
      />
      <circle cx="24" cy="38" r="3" fill="#fff" />
      <circle cx="36" cy="38" r="3" fill="#fff" />
      <circle cx="24.5" cy="38.5" r="1.4" fill="#111" />
      <circle cx="36.5" cy="38.5" r="1.4" fill="#111" />
      <path
        d="M26 46 Q30 49 34 46"
        fill="none"
        stroke="#3a2210"
        stroke-width="1.8"
        stroke-linecap="round"
      />
      <path
        d="M14 10 q4 -6 0 -12 M28 0 q4 -6 0 -12 M44 6 q4 -6 0 -12"
        fill="none"
        stroke="#9adf6b"
        stroke-width="2"
        opacity=".7"
      />
    </svg>
  );
}

export function Egg({ cracks = 0, class: cls }: { cracks?: number; class?: string }) {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 120 150"
      class={cls}
      style={{ overflow: 'visible' }}
    >
      <ellipse cx="60" cy="142" rx="38" ry="7" fill="rgba(0,0,0,.25)" />
      <path
        d="M60 8 Q100 10 104 82 Q106 138 60 140 Q14 138 16 82 Q20 10 60 8 Z"
        fill="#fff4dc"
        stroke="#7a5a3a"
        stroke-width="3.5"
      />
      <circle cx="40" cy="60" r="8" fill="#9b7bff" opacity=".7" />
      <circle cx="78" cy="44" r="6" fill="#ff5fa2" opacity=".7" />
      <circle cx="74" cy="96" r="10" fill="#5ee6a8" opacity=".7" />
      <circle cx="40" cy="108" r="6" fill="#ffd166" opacity=".8" />
      <path
        d="M36 30 Q46 20 58 20"
        stroke="#fff"
        stroke-width="5"
        fill="none"
        stroke-linecap="round"
        opacity=".9"
      />
      {cracks > 0 && (
        <path
          d="M30 80 L42 74 L48 84 L58 76"
          fill="none"
          stroke="#3a2210"
          stroke-width="3"
          stroke-linejoin="round"
        />
      )}
      {cracks > 1 && (
        <path
          d="M58 76 L66 86 L76 78 L88 84"
          fill="none"
          stroke="#3a2210"
          stroke-width="3"
          stroke-linejoin="round"
        />
      )}
      {cracks > 2 && (
        <path
          d="M66 86 L62 100 L70 108 M42 74 L38 60 L46 52"
          fill="none"
          stroke="#3a2210"
          stroke-width="3"
          stroke-linejoin="round"
        />
      )}
      {cracks > 3 && (
        <path
          d="M88 84 L96 70 M38 60 L28 56"
          fill="none"
          stroke="#3a2210"
          stroke-width="3"
          stroke-linejoin="round"
        />
      )}
    </svg>
  );
}

export function Tombstone({ name, class: cls }: { name: string; class?: string }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 120 140" class={cls}>
      <ellipse cx="60" cy="132" rx="50" ry="8" fill="#3d6b35" />
      <path
        d="M20 132 L20 50 Q20 14 60 14 Q100 14 100 50 L100 132 Z"
        fill="#9aa0b0"
        stroke="#4a4f5e"
        stroke-width="3.5"
      />
      <path d="M28 128 L28 52 Q28 22 60 22" fill="none" stroke="#c4c9d6" stroke-width="3" />
      <text
        x="60"
        y="58"
        text-anchor="middle"
        font-family="Fredoka"
        font-weight="700"
        font-size="16"
        fill="#4a4f5e"
      >
        R.I.P.
      </text>
      <text
        x="60"
        y="84"
        text-anchor="middle"
        font-family="Fredoka"
        font-weight="600"
        font-size={name.length > 8 ? 12 : 15}
        fill="#4a4f5e"
      >
        {name}
      </text>
      <path d="M52 100 h16 M60 92 v20" stroke="#4a4f5e" stroke-width="3" />
    </svg>
  );
}
