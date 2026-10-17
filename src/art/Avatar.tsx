/**
 * The player's hero: a chibi adventurer drawn in SVG from a few choices
 * (skin, hair colour, hair style, outfit colour), the class gear and equipped hat/cape.
 */
import type { Look } from '../engine/profile';

export const SKINS = [
  '#ffe0c2',
  '#f6c99b',
  '#e2a86f',
  '#c68642',
  '#8d5524',
  '#5c3a1e',
  '#9fe0a0',
  '#b9a7ff',
];
export const HAIRS = [
  '#2b1b0e',
  '#5a3825',
  '#a0522d',
  '#e6be8a',
  '#f2d16b',
  '#d94f30',
  '#ff6fb5',
  '#5ec8ff',
  '#9b7bff',
  '#f2f2f2',
];
export const OUTFITS = [
  '#6c4ce0',
  '#e0475b',
  '#1f9e75',
  '#2b7de0',
  '#e08a1f',
  '#3a405a',
  '#d14fb0',
];
export const HAIR_STYLES = ['Spiky', 'Long', 'Buns', 'Curly', 'Mohawk'];

const CAPES: Record<string, string> = {
  'red-cape': '#e0334d',
  'purple-cape': '#5b2ea6',
  'gold-cape': '#f2b705',
  'rainbow-cape': 'url(#rainbow)',
  'ash-cloak': '#4a4652',
  'march-mantle': '#2f4a6a',
  'blood-moon': '#7a1830',
  // Region treasures (patterns are defined in the avatar's <defs>)
  'hydra-cape': 'url(#cape-scales)',
  'cape-of-144': 'url(#cape-checker)',
  'cape-of-magnitude': 'url(#cape-stars)',
  'ballpark-jacket': '#e0334d',
  'zero-cape': 'url(#cape-stripes)',
  'frost-cape': '#7dd3fc',
  'bramble-cape': '#3a8a2a',
  'tower-cape': '#2b4fd6',
  'sailcloth-cape': '#efe4c8',
  'ledger-cloak': '#4a4458',
  'thorn-cape': '#7a1a2e',
};

function darker(hex: string, f = 0.7): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `rgb(${r},${g},${b})`;
}

function Hair({ style, color, back }: { style: number; color: string; back?: boolean }) {
  const d = darker(color, 0.75);
  if (back) {
    if (style === 1)
      return (
        <path
          d="M30 48 Q28 95 42 104 L78 104 Q92 95 90 48 Z"
          fill={color}
          stroke={d}
          stroke-width="2.5"
        />
      );
    if (style === 2)
      return (
        <g fill={color} stroke={d} stroke-width="2.5">
          <circle cx="29" cy="30" r="11" />
          <circle cx="91" cy="30" r="11" />
        </g>
      );
    return null;
  }
  switch (style) {
    case 0: // spiky
      return (
        <path
          d="M30 46 L28 30 L38 34 L40 18 L50 28 L58 12 L64 27 L74 15 L77 30 L88 24 L86 38 L92 44 Q78 30 60 32 Q42 30 30 46 Z"
          fill={color}
          stroke={d}
          stroke-width="2.5"
          stroke-linejoin="round"
        />
      );
    case 1: // long
      return (
        <path
          d="M29 52 Q26 22 60 18 Q94 22 91 52 Q86 34 72 32 Q66 40 52 36 Q38 36 29 52 Z"
          fill={color}
          stroke={d}
          stroke-width="2.5"
        />
      );
    case 2: // buns
      return (
        <path
          d="M30 46 Q30 20 60 19 Q90 20 90 46 Q80 32 60 33 Q40 32 30 46 Z"
          fill={color}
          stroke={d}
          stroke-width="2.5"
        />
      );
    case 3: // curly
      return (
        <g fill={color} stroke={d} stroke-width="2.5">
          {[
            [32, 40],
            [36, 28],
            [46, 20],
            [58, 17],
            [70, 19],
            [81, 26],
            [88, 38],
            [40, 34],
            [52, 28],
            [66, 27],
            [78, 33],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="9" />
          ))}
        </g>
      );
    default: // mohawk
      return (
        <path
          d="M50 34 L48 8 L56 14 L60 4 L64 14 L72 8 L70 34 Q60 30 50 34 Z"
          fill={color}
          stroke={d}
          stroke-width="2.5"
          stroke-linejoin="round"
        />
      );
  }
}

export function HatArt({ id, outfit }: { id: string; outfit: string }) {
  switch (id) {
    case 'thogs-helm':
      return (
        <g>
          <path d="M26 30 Q6 18 10 -10 Q18 10 32 16 Z" fill="#fff4dc" stroke="#7a6a50" stroke-width="2.5" />
          <path d="M94 30 Q114 18 110 -10 Q102 10 88 16 Z" fill="#fff4dc" stroke="#7a6a50" stroke-width="2.5" />
          <path d="M28 36 Q30 4 60 4 Q90 4 92 36 Z" fill="#8d6e4a" stroke="#3a2a14" stroke-width="2.5" />
          <path d="M44 10 l4 8 M60 6 v9 M76 10 l-4 8" stroke="#3a2a14" stroke-width="2" />
          <path d="M24 38 Q60 26 96 38 L96 44 Q60 34 24 44 Z" fill="#c9a26a" stroke="#6a4a24" stroke-width="2" />
          <path d="M30 40 l3 5 M40 38 l2 6 M52 36 l1 6 M68 36 l-1 6 M80 38 l-2 6 M90 40 l-3 5" stroke="#6a4a24" stroke-width="2" />
        </g>
      );
    case 'bobble-hat':
      return (
        <g>
          <path d="M28 36 Q28 4 60 4 Q92 4 92 36 Z" fill="#5ec8ff" stroke="#1a5a8a" stroke-width="2.5" />
          <path d="M34 16 h52 M30 26 h60" stroke="#fff" stroke-width="4" opacity=".8" />
          <rect x="24" y="32" width="72" height="10" rx="5" fill="#fff" stroke="#1a5a8a" stroke-width="2" />
          <circle cx="60" cy="0" r="10" fill="#fff" stroke="#1a5a8a" stroke-width="2" />
        </g>
      );
    case 'star-mask':
      return (
        <g>
          <path d="M30 32 Q30 6 60 6 Q90 6 90 32 Z" fill="#2b4fd6" stroke="#142a7a" stroke-width="2.5" />
          <path d="M60 10 l4 8 8 1 -6 5 2 8 -8 -4 -8 4 2 -8 -6 -5 8 -1 Z" fill="#ffd166" stroke="#a86b00" stroke-width="1.5" />
          <path d="M26 34 Q60 26 94 34 L94 40 Q60 32 26 40 Z" fill="#e0334d" stroke="#7a1020" stroke-width="2" />
        </g>
      );
    case 'party-hat':
      return (
        <g transform="rotate(-8 60 20)">
          <path
            d="M44 30 L60 -6 L76 30 Z"
            fill="#ff5fa2"
            stroke="#8a1c4a"
            stroke-width="2.5"
            stroke-linejoin="round"
          />
          <path d="M50 18 L70 18 M54 8 L66 8" stroke="#ffd166" stroke-width="4" />
          <circle cx="60" cy="-7" r="5" fill="#ffd166" stroke="#a86b00" stroke-width="2" />
        </g>
      );
    case 'viking-helmet':
      return (
        <g>
          <path
            d="M22 26 Q12 10 16 -4 Q24 12 34 18 Z"
            fill="#fff4dc"
            stroke="#7a6a50"
            stroke-width="2.5"
          />
          <path
            d="M98 26 Q108 10 104 -4 Q96 12 86 18 Z"
            fill="#fff4dc"
            stroke="#7a6a50"
            stroke-width="2.5"
          />
          <path
            d="M28 36 Q30 6 60 6 Q90 6 92 36 Z"
            fill="#9aa4b5"
            stroke="#4a5263"
            stroke-width="2.5"
          />
          <rect
            x="26"
            y="32"
            width="68"
            height="8"
            rx="4"
            fill="#c98a3c"
            stroke="#6b4a2b"
            stroke-width="2"
          />
        </g>
      );
    case 'propeller-cap':
      return (
        <g>
          <path
            d="M30 34 Q32 10 60 10 Q88 10 90 34 Z"
            fill="#2b7de0"
            stroke="#163f73"
            stroke-width="2.5"
          />
          <path d="M30 34 L60 34" stroke="#ffd166" stroke-width="0" />
          <path d="M60 10 L60 0" stroke="#333" stroke-width="3" />
          <g style={{ transformOrigin: '60px 0px', animation: 'spin .4s linear infinite' }}>
            <ellipse
              cx="60"
              cy="0"
              rx="20"
              ry="4"
              fill="#ff5fa2"
              stroke="#8a1c4a"
              stroke-width="2"
            />
          </g>
          <path
            d="M84 32 Q100 32 104 38 L86 38 Z"
            fill="#2b7de0"
            stroke="#163f73"
            stroke-width="2"
          />
        </g>
      );
    case 'crown':
      return (
        <g>
          <path
            d="M36 32 L34 6 L48 18 L60 0 L72 18 L86 6 L84 32 Z"
            fill="#ffd166"
            stroke="#a86b00"
            stroke-width="2.5"
            stroke-linejoin="round"
          />
          <circle cx="60" cy="22" r="4" fill="#e0334d" />
          <circle cx="46" cy="25" r="3" fill="#5ec8ff" />
          <circle cx="74" cy="25" r="3" fill="#5ee6a8" />
        </g>
      );
    case 'chicken-hat':
      return (
        <g>
          <ellipse
            cx="60"
            cy="18"
            rx="24"
            ry="16"
            fill="#fffaf0"
            stroke="#8a7a60"
            stroke-width="2.5"
          />
          <circle cx="78" cy="6" r="10" fill="#fffaf0" stroke="#8a7a60" stroke-width="2.5" />
          <path
            d="M78 -4 Q80 -12 84 -6 Q88 -12 88 -2"
            fill="#e0334d"
            stroke="#8a1c1c"
            stroke-width="1.5"
          />
          <path d="M87 8 L96 10 L87 13 Z" fill="#ffb020" stroke="#a86b00" stroke-width="1.5" />
          <circle cx="81" cy="4" r="2" fill="#222" />
          <path d="M40 16 Q32 12 30 22" fill="none" stroke="#8a7a60" stroke-width="2.5" />
        </g>
      );
    case 'warden-helm':
      return (
        <g>
          <path
            d="M26 40 Q24 4 60 2 Q96 4 94 40 Z"
            fill="#9aa4b5"
            stroke="#3a4250"
            stroke-width="2.5"
          />
          <path
            d="M22 40 Q60 30 98 40 L98 46 Q60 38 22 46 Z"
            fill="#7a8494"
            stroke="#3a4250"
            stroke-width="2.5"
          />
          <path d="M60 2 L60 40" stroke="#3a4250" stroke-width="3" />
          <circle cx="44" cy="22" r="2.5" fill="#3a4250" />
          <circle cx="76" cy="22" r="2.5" fill="#3a4250" />
        </g>
      );
    case 'raven-hood':
      return (
        <g>
          <path
            d="M22 58 Q18 10 60 6 Q102 10 98 58 Q90 30 60 28 Q30 30 22 58 Z"
            fill="#23202c"
            stroke="#0e0c14"
            stroke-width="2.5"
          />
          <path
            d="M44 28 L60 44 L76 28 Q60 22 44 28 Z"
            fill="#3a3448"
            stroke="#0e0c14"
            stroke-width="2"
          />
          <path d="M52 30 L60 44 L68 30" fill="#d9a83a" stroke="#6a4a10" stroke-width="1.5" />
          <path d="M92 20 Q104 8 110 10 Q100 18 96 28 Z" fill="#14101c" />
        </g>
      );
    case 'tricorn':
      return (
        <g>
          <path
            d="M18 30 Q60 4 102 30 Q84 22 60 26 Q36 22 18 30 Z"
            fill="#2a1e1a"
            stroke="#120a08"
            stroke-width="2.5"
          />
          <path
            d="M30 28 Q32 6 60 6 Q88 6 90 28 Q60 20 30 28 Z"
            fill="#3a2a22"
            stroke="#120a08"
            stroke-width="2.5"
          />
          <path d="M18 30 Q60 40 102 30" fill="none" stroke="#d9a83a" stroke-width="3" />
          <circle cx="60" cy="16" r="5" fill="#e8e0d0" stroke="#120a08" stroke-width="1.5" />
        </g>
      );
    case 'antlers':
      return (
        <g stroke="#6b4a2b" stroke-width="5" stroke-linecap="round" fill="none">
          <path d="M42 24 Q34 4 22 -6 M36 12 L24 12 M30 2 L36 -10" />
          <path d="M78 24 Q86 4 98 -6 M84 12 L96 12 M90 2 L84 -10" />
        </g>
      );
    case 'jester-hat':
      return (
        <g>
          <path
            d="M30 34 Q30 14 60 12 Q90 14 90 34 Z"
            fill="#7a1fa2"
            stroke="#3a0a52"
            stroke-width="2.5"
          />
          <path
            d="M34 22 Q14 4 10 22 Q22 18 36 30 Z"
            fill="#e0334d"
            stroke="#6a0a1a"
            stroke-width="2.5"
          />
          <path
            d="M86 22 Q106 4 110 22 Q98 18 84 30 Z"
            fill="#ffd166"
            stroke="#7a5200"
            stroke-width="2.5"
          />
          <path
            d="M60 12 Q60 -8 70 -12 Q66 4 64 14 Z"
            fill="#5ee6a8"
            stroke="#126a40"
            stroke-width="2"
          />
          <circle cx="10" cy="22" r="5" fill="#ffd166" stroke="#7a5200" stroke-width="1.5" />
          <circle cx="110" cy="22" r="5" fill="#ffd166" stroke="#7a5200" stroke-width="1.5" />
          <circle cx="70" cy="-12" r="5" fill="#ffd166" stroke="#7a5200" stroke-width="1.5" />
        </g>
      );
    case 'iron-crown':
      return (
        <g>
          <path
            d="M34 34 L32 6 L44 16 L52 0 L60 14 L68 0 L76 16 L88 6 L86 34 Z"
            fill="#6a6f7d"
            stroke="#22252c"
            stroke-width="2.5"
            stroke-linejoin="round"
          />
          <rect
            x="32"
            y="28"
            width="56"
            height="8"
            rx="3"
            fill="#4a4f5a"
            stroke="#22252c"
            stroke-width="2"
          />
          <circle cx="60" cy="24" r="4" fill="#6ee7ff" />
          <circle cx="45" cy="26" r="2.5" fill="#b3263a" />
          <circle cx="75" cy="26" r="2.5" fill="#b3263a" />
        </g>
      );
    case 'wizard':
      return (
        <g>
          <path
            d="M28 34 Q60 26 92 34 L66 -14 Q60 -18 58 -12 Z"
            fill={outfit}
            stroke={darker(outfit, 0.55)}
            stroke-width="2.5"
            stroke-linejoin="round"
          />
          <ellipse
            cx="60"
            cy="34"
            rx="36"
            ry="7"
            fill={outfit}
            stroke={darker(outfit, 0.55)}
            stroke-width="2.5"
          />
          <path d="M56 6 l2 5 5 1 -4 3 1 5 -4 -3 -4 3 1 -5 -4 -3 5 -1 Z" fill="#ffd166" />
          <circle cx="70" cy="18" r="2.5" fill="#ffd166" />
        </g>
      );
    case 'knight':
      return (
        <g>
          <path
            d="M28 40 Q28 6 60 6 Q92 6 92 40 L84 40 Q84 22 60 22 Q36 22 36 40 Z"
            fill="#c9d1de"
            stroke="#4a5263"
            stroke-width="2.5"
          />
          <path
            d="M60 6 Q64 -6 76 -8 Q70 2 66 8"
            fill="#e0334d"
            stroke="#8a1c1c"
            stroke-width="2"
          />
        </g>
      );
    case 'rogue':
      return (
        <path
          d="M24 56 Q22 12 60 10 Q98 12 96 56 Q90 30 60 28 Q30 30 24 56 Z"
          fill="#2e2a3d"
          stroke="#14111f"
          stroke-width="2.5"
        />
      );
    case 'bard':
      return (
        <g>
          <path
            d="M30 32 Q34 12 62 12 Q88 14 92 30 Q60 24 30 32 Z"
            fill={outfit}
            stroke={darker(outfit, 0.55)}
            stroke-width="2.5"
          />
          <path
            d="M76 18 Q100 -6 108 2 Q96 6 80 22 Z"
            fill="#ffd166"
            stroke="#a86b00"
            stroke-width="2"
          />
        </g>
      );
    default:
      return null;
  }
}

function Weapon({ cls }: { cls: string }) {
  switch (cls) {
    case 'wizard':
      return (
        <g>
          <rect
            x="92"
            y="62"
            width="5"
            height="68"
            rx="2"
            fill="#8b5a2b"
            stroke="#4a2e14"
            stroke-width="1.5"
          />
          <circle cx="94.5" cy="58" r="8" fill="#7dd3fc" stroke="#1d6fa3" stroke-width="2" />
          <circle cx="92" cy="55" r="2.5" fill="#fff" />
        </g>
      );
    case 'knight':
      return (
        <g>
          <rect
            x="93"
            y="50"
            width="6"
            height="50"
            rx="2"
            fill="#e8edf5"
            stroke="#4a5263"
            stroke-width="2"
          />
          <rect
            x="86"
            y="96"
            width="20"
            height="5"
            rx="2"
            fill="#c98a3c"
            stroke="#6b4a2b"
            stroke-width="1.5"
          />
          <rect x="93.5" y="100" width="5" height="12" rx="2" fill="#6b4a2b" />
          <path
            d="M16 78 L36 78 L36 98 Q26 110 16 98 Z"
            fill="#e0334d"
            stroke="#6b1020"
            stroke-width="2.5"
          />
          <path d="M26 82 L26 102 M18 90 L34 90" stroke="#ffd166" stroke-width="3" />
        </g>
      );
    case 'rogue':
      return (
        <g>
          <path d="M96 78 L104 58 L100 80 Z" fill="#e8edf5" stroke="#4a5263" stroke-width="1.5" />
          <rect x="94" y="78" width="8" height="4" rx="1" fill="#6b4a2b" />
          <path d="M22 80 L14 62 L20 82 Z" fill="#e8edf5" stroke="#4a5263" stroke-width="1.5" />
        </g>
      );
    case 'bard':
      return (
        <g transform="rotate(-25 98 90)">
          <ellipse
            cx="98"
            cy="98"
            rx="12"
            ry="14"
            fill="#c98a3c"
            stroke="#6b4a2b"
            stroke-width="2"
          />
          <circle cx="98" cy="96" r="4" fill="#4a2e14" />
          <rect
            x="95.5"
            y="58"
            width="5"
            height="32"
            fill="#8b5a2b"
            stroke="#4a2e14"
            stroke-width="1.5"
          />
        </g>
      );
    default:
      return null;
  }
}

export interface AvatarProps {
  look: Look;
  cls: string;
  hat?: string;
  cape?: string;
  /** Crop to head and shoulders. */
  portrait?: boolean;
  class?: string;
  mood?: 'happy' | 'hurt' | 'ko';
}

export function Avatar({
  look,
  cls,
  hat,
  cape,
  portrait,
  class: className,
  mood = 'happy',
}: AvatarProps) {
  const skin = SKINS[look.skin % SKINS.length];
  const hair = HAIRS[look.hair % HAIRS.length];
  const outfit = OUTFITS[look.outfit % OUTFITS.length];
  const skinD = darker(skin, 0.75);
  const capeFill = cape ? CAPES[cape] : null;
  const headgear = hat ?? cls;
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={portrait ? '18 -4 84 84' : '0 -20 120 160'}
      class={className}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="rainbow" x1="0" x2="1">
          <stop offset="0" stop-color="#ff5f5f" />
          <stop offset=".25" stop-color="#ffd166" />
          <stop offset=".5" stop-color="#5ee6a8" />
          <stop offset=".75" stop-color="#5ec8ff" />
          <stop offset="1" stop-color="#9b7bff" />
        </linearGradient>
        <pattern id="cape-checker" width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill="#1a4a7a" />
          <rect width="6" height="6" fill="#7dd3fc" />
          <rect x="6" y="6" width="6" height="6" fill="#7dd3fc" />
        </pattern>
        <pattern id="cape-scales" width="10" height="8" patternUnits="userSpaceOnUse">
          <rect width="10" height="8" fill="#1f7a52" />
          <path d="M0 8 Q5 0 10 8" fill="#5ee6a8" stroke="#145a3a" stroke-width="1" />
        </pattern>
        <pattern id="cape-stars" width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill="#2b4fd6" />
          <path d="M8 3 l1.5 3.2 3.5 .4 -2.6 2.3 .8 3.4 -3.2 -1.8 -3.2 1.8 .8 -3.4 -2.6 -2.3 3.5 -.4 Z" fill="#ffd166" />
        </pattern>
        <pattern id="cape-stripes" width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill="#3a2a6a" />
          <rect width="5" height="10" fill="#c08cff" />
        </pattern>
      </defs>
      {capeFill && (
        <path
          d="M40 70 L80 70 Q98 104 96 132 Q60 140 24 132 Q22 104 40 70 Z"
          fill={capeFill}
          stroke="rgba(0,0,0,.35)"
          stroke-width="2.5"
        />
      )}
      <Hair style={look.hairStyle} color={hair} back />
      {/* legs */}
      <rect x="46" y="110" width="11" height="20" rx="5" fill="#3a2e4d" />
      <rect x="63" y="110" width="11" height="20" rx="5" fill="#3a2e4d" />
      <ellipse cx="51" cy="131" rx="9" ry="5" fill="#4a2e14" />
      <ellipse cx="69" cy="131" rx="9" ry="5" fill="#4a2e14" />
      {/* body */}
      <path
        d="M40 76 Q60 66 80 76 L84 114 Q60 122 36 114 Z"
        fill={cls === 'knight' ? '#c9d1de' : outfit}
        stroke={cls === 'knight' ? '#4a5263' : darker(outfit, 0.55)}
        stroke-width="2.5"
      />
      {cls === 'knight' && (
        <path
          d="M48 82 L72 82 L70 104 Q60 110 50 104 Z"
          fill={outfit}
          stroke={darker(outfit, 0.55)}
          stroke-width="2"
        />
      )}
      {cls === 'wizard' && <path d="M60 72 L60 118" stroke="#ffd166" stroke-width="3" />}
      {cls === 'rogue' && <path d="M40 92 L84 100" stroke="#6b4a2b" stroke-width="5" />}
      {cls === 'bard' && (
        <path
          d="M52 76 L60 92 L68 76"
          fill="#fff4dc"
          stroke={darker(outfit, 0.55)}
          stroke-width="2"
        />
      )}
      <rect x="38" y="102" width="44" height="6" rx="3" fill="#4a2e14" opacity=".8" />
      {/* arms */}
      <path
        d="M40 80 Q28 90 28 102"
        stroke={cls === 'knight' ? '#c9d1de' : outfit}
        stroke-width="10"
        stroke-linecap="round"
        fill="none"
      />
      <path
        d="M80 80 Q92 88 94 98"
        stroke={cls === 'knight' ? '#c9d1de' : outfit}
        stroke-width="10"
        stroke-linecap="round"
        fill="none"
      />
      <circle cx="28" cy="104" r="6" fill={skin} stroke={skinD} stroke-width="2" />
      <Weapon cls={cls} />
      <circle cx="95" cy="100" r="6" fill={skin} stroke={skinD} stroke-width="2" />
      {/* head */}
      <circle cx="60" cy="48" r="30" fill={skin} stroke={skinD} stroke-width="2.5" />
      <ellipse cx="31" cy="52" rx="4" ry="6" fill={skin} stroke={skinD} stroke-width="2" />
      <ellipse cx="89" cy="52" rx="4" ry="6" fill={skin} stroke={skinD} stroke-width="2" />
      {mood === 'ko' ? (
        <g stroke="#2a1c10" stroke-width="3" stroke-linecap="round">
          <path d="M45 48 l8 8 M53 48 l-8 8 M67 48 l8 8 M75 48 l-8 8" />
        </g>
      ) : mood === 'hurt' ? (
        <g stroke="#2a1c10" stroke-width="3" stroke-linecap="round" fill="none">
          <path d="M44 52 l8 -3 M76 52 l-8 -3" />
        </g>
      ) : (
        <g>
          <ellipse cx="49" cy="52" rx="4.5" ry="5.5" fill="#2a1c10" />
          <ellipse cx="71" cy="52" rx="4.5" ry="5.5" fill="#2a1c10" />
          <circle cx="50.5" cy="50" r="1.8" fill="#fff" />
          <circle cx="72.5" cy="50" r="1.8" fill="#fff" />
        </g>
      )}
      <ellipse cx="42" cy="62" rx="5" ry="3" fill="#ff7a9a" opacity=".45" />
      <ellipse cx="78" cy="62" rx="5" ry="3" fill="#ff7a9a" opacity=".45" />
      {mood === 'happy' ? (
        <path
          d="M52 64 Q60 71 68 64"
          stroke="#2a1c10"
          stroke-width="2.5"
          fill="#fff"
          stroke-linecap="round"
        />
      ) : (
        <path
          d="M53 68 Q60 63 67 68"
          stroke="#2a1c10"
          stroke-width="2.5"
          fill="none"
          stroke-linecap="round"
        />
      )}
      <Hair style={look.hairStyle} color={hair} />
      <HatArt id={headgear} outfit={outfit} />
    </svg>
  );
}
