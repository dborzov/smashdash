/**
 * Landmarks for the campaigns added in v3: Dungeons & Times Tables, The Order of Magnitude and
 * The Muddler Strikes Back. Drawn around (0, 0) = the ground, about 160 wide and 100 tall.
 */

export const NEW_BIOMES: Record<string, string> = {
  tavern: '#b07a3a',
  dungeon: '#4a5a5a',
  squarehall: '#8a4ab0',
  gridroom: '#2a6aa8',
  hq: '#4a8ad8',
  city: '#d8a84a',
  cosmos: '#2a1a5a',
  subzero: '#bfe6ff',
  lostfound: '#b08a5a',
  twinscales: '#e0c070',
  riddlemaze: '#4aa04a',
};

const ink = '#2a1a10';

export function NewLandmark({ scene }: { scene: string }) {
  switch (scene) {
    case 'tavern':
      return (
        <g>
          <rect x="-50" y="-48" width="100" height="48" fill="#c98a4a" stroke={ink} stroke-width="3" />
          <path d="M-60 -46 L0 -86 L60 -46 Z" fill="#7a3a1a" stroke={ink} stroke-width="3" stroke-linejoin="round" />
          <rect x="-12" y="-28" width="24" height="28" fill="#4a2a10" />
          <rect x="-38" y="-38" width="14" height="12" fill="#ffd166" />
          <rect x="24" y="-38" width="14" height="12" fill="#ffd166" />
          <line x1="50" y1="-40" x2="72" y2="-40" stroke={ink} stroke-width="3" />
          <rect x="60" y="-38" width="22" height="16" rx="3" fill="#ffb347" stroke={ink} stroke-width="2" />
          <text x="71" y="-25" text-anchor="middle" font-size="12">🍺</text>
        </g>
      );
    case 'dungeon':
      return (
        <g>
          <path d="M-56 0 L-56 -50 Q0 -96 56 -50 L56 0 Z" fill="#6a737d" stroke={ink} stroke-width="3" />
          <path d="M-26 0 L-26 -36 Q0 -60 26 -36 L26 0 Z" fill="#0e1418" />
          <path d="M-12 -30 q-6 -14 4 -22 q-2 10 8 14 q-6 4 -12 8 Z" fill="#5ee6a8" opacity=".8" style={{ animation: 'flicker 1.4s ease-in-out infinite' }} />
          <path d="M8 -26 q-6 -14 4 -22 q-2 10 8 14 q-6 4 -12 8 Z" fill="#5ee6a8" opacity=".8" style={{ animation: 'flicker 1.9s ease-in-out infinite' }} />
          {[-46, -36, 36, 46].map((x, i) => (
            <rect key={i} x={x - 5} y={-20 - (i % 2) * 14} width="10" height="8" fill="#525a62" />
          ))}
        </g>
      );
    case 'squarehall':
      return (
        <g>
          <rect x="-54" y="-70" width="108" height="70" fill="#8a4ab0" stroke={ink} stroke-width="3" />
          {Array.from({ length: 16 }, (_, i) => (
            <rect key={i} x={-48 + (i % 4) * 24} y={-64 + Math.floor(i / 4) * 16} width="20" height="12" fill={(i + Math.floor(i / 4)) % 2 ? '#ff7ab8' : '#ffd1ea'} />
          ))}
          <rect x="-58" y="-78" width="116" height="10" fill="#5a2a7a" stroke={ink} stroke-width="2" />
        </g>
      );
    case 'gridroom':
      return (
        <g>
          <rect x="-60" y="-64" width="120" height="64" fill="#0e2238" stroke="#7dd3fc" stroke-width="3" />
          {Array.from({ length: 5 }, (_, i) => (
            <g key={i}>
              <line x1={-60 + i * 24} y1="-64" x2={-60 + i * 24} y2="0" stroke="#7dd3fc" stroke-width="1.5" opacity=".7" />
              <line x1="-60" y1={-64 + i * 16} x2="60" y2={-64 + i * 16} stroke="#7dd3fc" stroke-width="1.5" opacity=".7" />
            </g>
          ))}
          <text x="0" y="-26" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="20" fill="#ffd166">144</text>
        </g>
      );
    case 'hq':
      return (
        <g>
          <rect x="-36" y="-92" width="72" height="92" fill="#4a8ad8" stroke={ink} stroke-width="3" />
          <circle cx="0" cy="-92" r="22" fill="#ffd166" stroke={ink} stroke-width="3" />
          <text x="0" y="-84" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="22" fill="#e0334d">10</text>
          {[-20, 0, 20].map((x) => [-70, -50, -30].map((y) => <rect key={`${x}${y}`} x={x - 6} y={y} width="12" height="12" fill="#bfe6ff" />))}
          <rect x="-10" y="-18" width="20" height="18" fill="#1a3a6a" />
        </g>
      );
    case 'city':
      return (
        <g>
          <rect x="-70" y="-60" width="26" height="60" fill="#d8a84a" stroke={ink} stroke-width="2.5" />
          <rect x="-40" y="-84" width="30" height="84" fill="#e8c06a" stroke={ink} stroke-width="2.5" />
          <rect x="44" y="-50" width="24" height="50" fill="#c8984a" stroke={ink} stroke-width="2.5" />
          <ellipse cx="18" cy="-14" rx="32" ry="14" fill="#5ab04a" stroke={ink} stroke-width="2.5" />
          <path d="M-14 -14 Q18 -46 50 -14" fill="none" stroke="#fff" stroke-width="3" />
          <text x="18" y="-8" text-anchor="middle" font-size="12">⚾</text>
        </g>
      );
    case 'cosmos':
      return (
        <g>
          <circle cx="0" cy="-48" r="34" fill="#c08cff" stroke={ink} stroke-width="3" />
          <ellipse cx="0" cy="-48" rx="58" ry="12" fill="none" stroke="#ffd166" stroke-width="4" transform="rotate(-14 0 -48)" />
          <circle cx="-12" cy="-58" r="6" fill="#9a6ae0" />
          <circle cx="52" cy="-86" r="4" fill="#fff" style={{ animation: 'twinkle 2s ease-in-out infinite' }} />
          <circle cx="-56" cy="-76" r="3" fill="#fff" style={{ animation: 'twinkle 2.6s ease-in-out infinite' }} />
        </g>
      );
    case 'subzero':
      return (
        <g>
          <path d="M-70 0 L-40 -60 L-10 -20 L20 -80 L70 0 Z" fill="#e8f6ff" stroke="#3a6a8a" stroke-width="3" stroke-linejoin="round" />
          <ellipse cx="-4" cy="-6" rx="34" ry="8" fill="#7dd3fc" stroke="#3a6a8a" stroke-width="2" />
          {[-14, 0, 14].map((x, i) => (
            <path key={i} d={`M${x} -12 q-6 -10 0 -20 q6 -10 0 -18`} fill="none" stroke="#fff" stroke-width="3" opacity=".7" style={{ animation: `flicker ${1.5 + i * 0.4}s ease-in-out infinite` }} />
          ))}
          <text x="44" y="-6" font-size="20">🐧</text>
        </g>
      );
    case 'lostfound':
      return (
        <g>
          <rect x="-58" y="-60" width="116" height="60" fill="#b08a5a" stroke={ink} stroke-width="3" />
          <rect x="-58" y="-74" width="116" height="16" fill="#7a5a3a" stroke={ink} stroke-width="2" />
          <text x="0" y="-62" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="11" fill="#fff4dc">LOST & FOUND</text>
          <text x="-30" y="-14" font-size="22">🧦</text>
          <text x="2" y="-20" font-size="20">☂️</text>
          <text x="26" y="-10" font-size="20">🎺</text>
        </g>
      );
    case 'twinscales':
      return (
        <g>
          <rect x="-66" y="-90" width="26" height="90" fill="#e0c070" stroke={ink} stroke-width="3" />
          <rect x="40" y="-90" width="26" height="90" fill="#e0c070" stroke={ink} stroke-width="3" />
          <line x1="-53" y1="-84" x2="53" y2="-84" stroke="#a86b00" stroke-width="6" />
          <circle cx="0" cy="-84" r="8" fill="#ffd166" stroke="#7a5200" stroke-width="2.5" />
          <path d="M-30 -84 L-38 -56 L-22 -56 Z M30 -84 L22 -56 L38 -56 Z" fill="none" stroke="#a86b00" stroke-width="2" />
          <path d="M-42 -56 Q-30 -46 -18 -56 Z M18 -56 Q30 -46 42 -56 Z" fill="#ffd166" stroke="#7a5200" stroke-width="2" />
        </g>
      );
    case 'riddlemaze':
      return (
        <g>
          <rect x="-64" y="-50" width="128" height="50" fill="#3a8a3a" stroke="#1a4a1a" stroke-width="3" />
          <path d="M-52 -40 h40 v30 h-24 M-4 -50 v26 h30 v-14 M40 -40 v30" fill="none" stroke="#1a4a1a" stroke-width="5" />
          <text x="-50" y="-52" font-size="18">🍎</text>
          <text x="30" y="-54" font-size="18">🍌</text>
          <text x="-4" y="-56" font-size="20">🍇</text>
        </g>
      );
  }
  return null;
}
