/**
 * Little landmark drawings for each scene, used on the campaign atlases and region cards,
 * plus the ground colour (biome) each scene paints on the atlas.
 */
import { NEW_BIOMES, NewLandmark } from './Landmarks2';

export const BIOME: Record<string, string> = {
  village: '#76d16c',
  forge: '#9a5040',
  swamp: '#2f8a7a',
  peaks: '#e8f2ff',
  bazaar: '#f2c27a',
  tower: '#7b5ce0',
  caves: '#5a4aa8',
  bay: '#e8d49a',
  junkyard: '#8a7a6a',
  muster: '#9aa4b4',
  ashroad: '#5a3a2a',
  siege: '#4a2a32',
  vault: '#2a6a7a',
  ...NEW_BIOMES,
};

export function Landmark({ scene }: { scene: string }) {
  switch (scene) {
    case 'village':
      return (
        <g>
          {[
            [-40, 0, '#d9542b'],
            [0, -12, '#c98a3c'],
            [40, 2, '#b0702a'],
          ].map(([x, y, roof], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <rect
                x="-16"
                y="-22"
                width="32"
                height="24"
                fill="#fbe8c8"
                stroke="#3a2214"
                stroke-width="2.5"
              />
              <path
                d="M-22 -20 L0 -42 L22 -20 Z"
                fill={roof as string}
                stroke="#3a2214"
                stroke-width="2.5"
                stroke-linejoin="round"
              />
              <rect x="-5" y="-12" width="10" height="14" fill="#7a4a2b" />
              <rect x="-13" y="-18" width="6" height="6" fill="#ffd166" />
            </g>
          ))}
          <circle cx="66" cy="-26" r="16" fill="#3f9e4f" stroke="#1f5c2a" stroke-width="2.5" />
          <rect x="63" y="-12" width="6" height="12" fill="#6b4a2b" />
        </g>
      );
    case 'forge':
      return (
        <g>
          <path
            d="M-80 0 L-30 -80 L0 -60 L30 -96 L80 0 Z"
            fill="#5a2a2a"
            stroke="#2a0e0e"
            stroke-width="3"
            stroke-linejoin="round"
          />
          <path d="M30 -96 L18 -70 L30 -76 L42 -70 Z" fill="#ff7a3d" />
          <path
            d="M-14 0 L-14 -26 Q0 -40 14 -26 L14 0 Z"
            fill="#1a0808"
            stroke="#ff9f43"
            stroke-width="3"
          />
          <path
            d="M-60 0 Q-40 -10 -20 0 M20 0 Q40 -10 60 0"
            stroke="#ff7a3d"
            stroke-width="4"
            fill="none"
          />
          <circle
            cx="30"
            cy="-110"
            r="8"
            fill="#888"
            opacity=".5"
            style={{
              animation: 'smoke 3s ease-out infinite',
              transformBox: 'fill-box',
              transformOrigin: 'center',
            }}
          />
        </g>
      );
    case 'swamp':
      return (
        <g>
          <ellipse
            cx="0"
            cy="-6"
            rx="70"
            ry="22"
            fill="#1d4a4a"
            stroke="#0a2a2a"
            stroke-width="2.5"
          />
          <ellipse cx="-30" cy="-8" rx="12" ry="5" fill="#5ee6a8" />
          <ellipse cx="20" cy="-2" rx="14" ry="5" fill="#5ee6a8" />
          <path
            d="M40 -10 Q36 -60 50 -86 M42 -50 Q60 -60 70 -76 M44 -36 Q26 -50 20 -64"
            stroke="#2a1a10"
            stroke-width="5"
            fill="none"
            stroke-linecap="round"
          />
          <circle
            cx="-50"
            cy="-30"
            r="3"
            fill="#fff7a8"
            style={{ animation: 'flicker 2s infinite' }}
          />
          <circle
            cx="0"
            cy="-40"
            r="3"
            fill="#fff7a8"
            style={{ animation: 'flicker 2.6s infinite' }}
          />
        </g>
      );
    case 'peaks':
      return (
        <g>
          <path
            d="M-90 0 L-40 -90 L-10 -40 L20 -110 L90 0 Z"
            fill="#8aa8d6"
            stroke="#2a4a7a"
            stroke-width="3"
            stroke-linejoin="round"
          />
          <path
            d="M-40 -90 L-56 -62 L-40 -68 L-26 -62 Z M20 -110 L2 -74 L20 -82 L38 -72 Z"
            fill="#fff"
          />
          <path d="M-70 0 L-58 -26 L-46 0 Z M60 0 L72 -24 L84 0 Z" fill="#1d4a5a" />
        </g>
      );
    case 'bazaar':
      return (
        <g>
          <path d="M-20 -30 Q0 -70 20 -30 Z" fill="#ffd166" stroke="#7a4a00" stroke-width="2.5" />
          <rect
            x="-20"
            y="-30"
            width="40"
            height="30"
            fill="#f2c27a"
            stroke="#7a4a00"
            stroke-width="2.5"
          />
          {[
            [-58, '#ff5fa2'],
            [56, '#5ec8ff'],
          ].map(([x, c], i) => (
            <g key={i} transform={`translate(${x} 0)`}>
              <path
                d="M-26 -22 L0 -52 L26 -22 Z"
                fill={c as string}
                stroke="#2a0a2a"
                stroke-width="2.5"
              />
              <rect x="-20" y="-22" width="40" height="22" fill="#3a1a3a" />
            </g>
          ))}
        </g>
      );
    case 'tower':
      return (
        <g>
          <path
            d="M-18 0 L-14 -110 L14 -110 L18 0 Z"
            fill="#6a5ad6"
            stroke="#1a1450"
            stroke-width="3"
          />
          <path
            d="M-24 -108 L0 -150 L24 -108 Z"
            fill="#6c3fc9"
            stroke="#2a1466"
            stroke-width="3"
            stroke-linejoin="round"
          />
          <circle
            cx="0"
            cy="-154"
            r="6"
            fill="#ffd166"
            style={{ animation: 'flicker 2s infinite' }}
          />
          <rect x="-5" y="-90" width="10" height="14" rx="5" fill="#ffd166" />
          <rect x="-5" y="-50" width="10" height="14" rx="5" fill="#ffd166" />
          <rect
            x="22"
            y="-70"
            width="20"
            height="7"
            rx="3"
            fill="#c6b8ff"
            style={{ animation: 'bob 2s ease-in-out infinite' }}
          />
          <rect
            x="-44"
            y="-40"
            width="20"
            height="7"
            rx="3"
            fill="#c6b8ff"
            style={{ animation: 'bob 2.6s ease-in-out infinite' }}
          />
        </g>
      );
    case 'caves':
      return (
        <g>
          <path
            d="M-70 0 Q-60 -80 0 -90 Q60 -80 70 0 Z"
            fill="#6a5a8a"
            stroke="#2a1c4a"
            stroke-width="3"
          />
          <path d="M-34 0 Q-30 -50 0 -54 Q30 -50 34 0 Z" fill="#140c38" />
          {[
            [-46, -4, '#8ff0ff', -14],
            [44, -2, '#ff8ac4', 12],
            [8, -56, '#c6a8ff', 0],
          ].map(([x, y, c, r], i) => (
            <path
              key={i}
              d="M0 0 L-9 -26 L0 -48 L9 -26 Z"
              transform={`translate(${x} ${y}) rotate(${r})`}
              fill={c as string}
              stroke="#1a1040"
              stroke-width="2.5"
              style={{ animation: `flicker ${2 + i * 0.7}s ease-in-out infinite` }}
            />
          ))}
        </g>
      );
    case 'bay':
      return (
        <g>
          <path
            d="M-50 0 Q-20 -24 30 -18 Q60 -10 60 0 Z"
            fill="#7a6a5a"
            stroke="#3a2a1a"
            stroke-width="2.5"
          />
          <path
            d="M-12 -14 L-8 -96 L8 -96 L12 -14 Z"
            fill="#fff4e6"
            stroke="#2a1c10"
            stroke-width="3"
          />
          <path
            d="M-11 -34 L11 -34 L10 -50 L-10 -50 Z M-9.5 -66 L9.5 -66 L9 -80 L-9 -80 Z"
            fill="#e0334d"
          />
          <rect
            x="-12"
            y="-110"
            width="24"
            height="15"
            rx="3"
            fill="#ffd166"
            stroke="#2a1c10"
            stroke-width="3"
          />
          <path d="M-14 -110 L0 -124 L14 -110 Z" fill="#e0334d" stroke="#2a1c10" stroke-width="3" />
          <path
            d="M0 -103 L-90 -126 L-90 -96 Z"
            fill="#ff6fa8"
            opacity=".55"
            style={{ animation: 'flicker 2.4s ease-in-out infinite' }}
          />
        </g>
      );
    case 'junkyard':
      return (
        <g>
          <path
            d="M-70 0 Q-40 -50 -6 -40 Q20 -70 64 0 Z"
            fill="#7a6a5a"
            stroke="#3a2a1a"
            stroke-width="3"
          />
          <circle cx="-30" cy="-20" r="12" fill="#2a2a2a" stroke="#555" stroke-width="5" />
          <rect
            x="4"
            y="-36"
            width="30"
            height="16"
            rx="3"
            fill="#e0a526"
            stroke="#3a2a1a"
            stroke-width="2.5"
          />
          <path
            d="M44 -6 L50 -84 L60 -84 L66 -6 Z"
            fill="#9aa4b8"
            stroke="#2a1c10"
            stroke-width="3"
          />
          <ellipse
            cx="55"
            cy="-88"
            rx="16"
            ry="7"
            fill="#c9c9c9"
            stroke="#2a1c10"
            stroke-width="2.5"
          />
          <path
            d="M70 -90 l14 -8 l-6 -6 l16 -10"
            fill="none"
            stroke="#7dd3fc"
            stroke-width="3"
            style={{ animation: 'flicker 1.3s steps(2) infinite' }}
          />
        </g>
      );
    case 'muster':
      return (
        <g>
          <rect
            x="-70"
            y="-36"
            width="140"
            height="36"
            fill="#5a6070"
            stroke="#1a1c24"
            stroke-width="3"
          />
          {[-60, -30, 0, 30, 60].map((x) => (
            <rect
              key={x}
              x={x - 8}
              y="-46"
              width="14"
              height="12"
              fill="#5a6070"
              stroke="#1a1c24"
              stroke-width="2.5"
            />
          ))}
          <rect
            x="-16"
            y="-96"
            width="32"
            height="60"
            fill="#6a7080"
            stroke="#1a1c24"
            stroke-width="3"
          />
          <path d="M-22 -94 L0 -124 L22 -94 Z" fill="#3a3e4a" stroke="#1a1c24" stroke-width="3" />
          <rect x="-4" y="-80" width="8" height="12" rx="4" fill="#ffd27a" />
          <circle
            cx="44"
            cy="-58"
            r="10"
            fill="#4a4652"
            opacity=".7"
            style={{
              animation: 'smoke 4s ease-out infinite',
              transformBox: 'fill-box',
              transformOrigin: 'center',
            }}
          />
        </g>
      );
    case 'ashroad':
      return (
        <g>
          <path
            d="M-80 0 Q-20 -20 20 -6 Q60 6 80 -10"
            fill="none"
            stroke="#7a5a3a"
            stroke-width="10"
            stroke-linecap="round"
          />
          {[-60, -30, 40, 66].map((x, i) => (
            <path
              key={x}
              d={`M${x} -4 L${x + (i % 2 ? 4 : -4)} -46 M${x} -28 l-12 -12 M${x} -34 l10 -10`}
              stroke="#1a100a"
              stroke-width="4"
              stroke-linecap="round"
            />
          ))}
          <g transform="translate(6 -14)">
            <path d="M-18 -10 Q0 -30 18 -10 Z" fill="#c9b48a" stroke="#1a100a" stroke-width="2.5" />
            <rect
              x="-19"
              y="-11"
              width="38"
              height="12"
              fill="#5a3a22"
              stroke="#1a100a"
              stroke-width="2.5"
            />
          </g>
          <circle
            cx="-40"
            cy="-60"
            r="6"
            fill="#ff7a3d"
            style={{ animation: 'flicker 1.4s infinite' }}
          />
        </g>
      );
    case 'siege':
      return (
        <g>
          <path
            d="M-80 0 L-60 -40 L-30 -50 L30 -50 L60 -40 L80 0 Z"
            fill="#3a2a30"
            stroke="#0a0608"
            stroke-width="3"
          />
          <rect
            x="-50"
            y="-90"
            width="100"
            height="44"
            fill="#4a3a44"
            stroke="#0a0608"
            stroke-width="3"
          />
          {[-40, 0, 40].map((x) => (
            <g key={x}>
              <rect
                x={x - 10}
                y="-120"
                width="20"
                height="34"
                fill="#5a4a54"
                stroke="#0a0608"
                stroke-width="3"
              />
              <path
                d={`M${x - 14} -118 L${x} -136 L${x + 14} -118 Z`}
                fill="#2a2028"
                stroke="#0a0608"
                stroke-width="2.5"
              />
            </g>
          ))}
          <path d="M-3 -136 v-20 l18 6 l-18 6" fill="#b3263a" stroke="#0a0608" stroke-width="2" />
          {[-70, -50, 60, 76].map((x) => (
            <circle
              key={x}
              cx={x}
              cy={-4}
              r="3"
              fill="#ffb347"
              style={{ animation: 'flicker 1.1s infinite' }}
            />
          ))}
        </g>
      );
    case 'vault':
      return (
        <g>
          <path
            d="M-80 0 L-40 -70 L0 -40 L40 -96 L80 0 Z"
            fill="#3a4a54"
            stroke="#0a1a20"
            stroke-width="3"
            stroke-linejoin="round"
          />
          <path
            d="M-20 0 L-20 -30 Q0 -50 20 -30 L20 0 Z"
            fill="#0a1a20"
            stroke="#a8e0ee"
            stroke-width="3"
          />
          {[
            [-50, -6],
            [52, -4],
            [10, -60],
          ].map(([x, y], i) => (
            <path
              key={i}
              d="M0 0 L-7 -20 L0 -36 L7 -20 Z"
              transform={`translate(${x} ${y})`}
              fill="#a8e0ee"
              stroke="#0a1a20"
              stroke-width="2"
              style={{ animation: `flicker ${2 + i * 0.6}s ease-in-out infinite` }}
            />
          ))}
        </g>
      );
    default:
      return <NewLandmark scene={scene} />;
  }
}

