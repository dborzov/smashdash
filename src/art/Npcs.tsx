/**
 * Portraits (100 × 100) for the people of the campaigns added in v3: the Dungeon Master's
 * party, the Order of Magnitude, and the sequel's new faces. Same style as Portrait.tsx: a round
 * face at (50, 56) plus whatever makes the character.
 */
const INK = '#1b1033';

function Face({ skin, stroke = '#5a3a20', eyes = true }: { skin: string; stroke?: string; eyes?: boolean }) {
  return (
    <>
      <circle cx="50" cy="56" r="26" fill={skin} stroke={stroke} stroke-width="2.5" />
      {eyes && (
        <>
          <ellipse cx="41" cy="54" rx="3.5" ry="4.5" fill={INK} />
          <ellipse cx="59" cy="54" rx="3.5" ry="4.5" fill={INK} />
          <circle cx="42" cy="52.5" r="1.3" fill="#fff" />
          <circle cx="60" cy="52.5" r="1.3" fill="#fff" />
        </>
      )}
      <ellipse cx="34" cy="64" rx="5" ry="3" fill="#ff7a9a" opacity=".4" />
      <ellipse cx="66" cy="64" rx="5" ry="3" fill="#ff7a9a" opacity=".4" />
    </>
  );
}

const smile = <path d="M42 68 Q50 75 58 68" fill="none" stroke={INK} stroke-width="2.5" stroke-linecap="round" />;

export function NpcHead({ id, class: cls }: { id: string; class?: string }) {
  let body;
  switch (id) {
    case 'dm':
      body = (
        <>
          <path d="M16 70 Q50 -24 84 70 Q72 40 50 38 Q28 40 16 70 Z" fill="#7a4ab0" stroke="#3a1a6a" stroke-width="2.5" />
          <Face skin="#f2c99a" />
          <path d="M30 66 Q50 100 70 66 Q66 84 50 88 Q34 84 30 66 Z" fill="#e8e0d0" stroke="#7a6a50" stroke-width="2" />
          <path d="M34 46 l10 3 M66 46 l-10 3" stroke={INK} stroke-width="2.5" stroke-linecap="round" />
          <path d="M74 20 L84 26 L84 36 L74 42 L64 36 L64 26 Z" fill="#ff5fa2" stroke={INK} stroke-width="2" />
        </>
      );
      break;
    case 'thog':
      body = (
        <>
          <path d="M22 50 Q8 40 10 18 Q20 34 30 38 Z M78 50 Q92 40 90 18 Q80 34 70 38 Z" fill="#fff4dc" stroke="#7a6a50" stroke-width="2" />
          <path d="M24 50 Q24 26 50 26 Q76 26 76 50 Z" fill="#8d6e4a" stroke="#3a2a14" stroke-width="2.5" />
          <Face skin="#e0a070" />
          <path d="M28 66 Q50 92 72 66 Q64 80 50 80 Q36 80 28 66 Z" fill="#a0522d" />
          <path d="M40 70 Q50 76 60 70" fill="none" stroke={INK} stroke-width="2.5" />
          <path d="M34 47 l12 2 M66 47 l-12 2" stroke="#5a2a10" stroke-width="4" stroke-linecap="round" />
        </>
      );
      break;
    case 'barry':
      body = (
        <>
          <Face skin="#ffd5b0" />
          <path d="M22 44 Q30 18 56 22 Q80 26 78 46 Q66 34 50 34 Q34 34 22 44 Z" fill="#c98a3c" stroke="#6a4a24" stroke-width="2" />
          <path d="M24 40 Q50 22 82 34 L86 30 Q54 12 22 34 Z" fill="#2e9e8a" stroke="#145a4a" stroke-width="2" />
          <path d="M80 30 Q92 14 88 6" fill="none" stroke="#e0334d" stroke-width="3" />
          <ellipse cx="50" cy="70" rx="7" ry="5" fill="#3a0d1f" />
          <text x="78" y="68" font-size="16">♪</text>
        </>
      );
      break;
    case 'tenfold':
      body = (
        <>
          <Face skin="#f2c99a" eyes={false} />
          <path d="M24 46 Q26 22 50 22 Q74 22 76 46 Q64 30 50 32 Q36 30 24 46 Z" fill="#1a1a2a" />
          <path d="M28 50 Q50 42 72 50 L70 58 Q50 52 30 58 Z" fill="#2b4fd6" stroke="#142a7a" stroke-width="2" />
          <ellipse cx="40" cy="54" rx="4" ry="3" fill="#fff" />
          <ellipse cx="60" cy="54" rx="4" ry="3" fill="#fff" />
          <path d="M32 74 Q50 86 68 74 L66 80 Q50 92 34 80 Z" fill="#f2c99a" stroke="#5a3a20" stroke-width="2" />
          <path d="M40 72 Q50 78 60 72" fill="none" stroke={INK} stroke-width="2.5" />
          <circle cx="50" cy="94" r="8" fill="#ffd166" stroke={INK} stroke-width="2" />
          <text x="50" y="98" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="9" fill="#e0334d">10</text>
        </>
      );
      break;
    case 'ballpark':
      body = (
        <>
          <path d="M20 60 Q18 30 50 28 Q82 30 80 60 Q86 80 72 90 Q74 60 50 56 Q26 60 28 90 Q14 80 20 60 Z" fill="#7a3a1a" />
          <Face skin="#c98e62" />
          <path d="M24 40 Q50 18 76 40 L80 44 Q50 34 20 44 Z" fill="#e0334d" stroke="#7a1020" stroke-width="2" />
          <path d="M76 42 Q92 42 94 48 L78 48 Z" fill="#e0334d" stroke="#7a1020" stroke-width="2" />
          <text x="50" y="40" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="9" fill="#fff">≈</text>
          {smile}
        </>
      );
      break;
    case 'kevin':
      body = (
        <>
          <Face skin="#ffd5b0" />
          <path d="M24 50 Q24 28 50 28 Q76 28 76 50 L72 48 Q50 40 28 48 Z" fill="#5ea04a" stroke="#2a5a1a" stroke-width="2" />
          <circle cx="41" cy="54" r="9" fill="none" stroke={INK} stroke-width="2" />
          <circle cx="59" cy="54" r="9" fill="none" stroke={INK} stroke-width="2" />
          <path d="M44 70 Q50 66 56 70" fill="none" stroke={INK} stroke-width="2.5" />
          <path d="M70 30 q8 -6 4 -14 M76 36 q10 -2 10 -10" fill="none" stroke="#9fe08a" stroke-width="2" />
          <text x="78" y="24" font-size="12">🔬</text>
        </>
      );
      break;
    case 'marge':
      body = (
        <>
          <path d="M22 56 Q16 22 50 20 Q84 22 78 56 Q70 34 50 34 Q30 34 22 56 Z" fill="#b0b0c0" stroke="#5a5a6a" stroke-width="2" />
          <circle cx="50" cy="18" r="10" fill="#b0b0c0" stroke="#5a5a6a" stroke-width="2" />
          <Face skin="#f6d2b0" />
          <path d="M34 50 h14 M52 50 h14" stroke={INK} stroke-width="2" />
          <path d="M28 58 Q34 62 48 58 M52 58 Q66 62 72 58" fill="none" stroke="#b08a2a" stroke-width="2" />
          {smile}
          <text x="72" y="92" font-size="14">🏷️</text>
        </>
      );
      break;
    case 'balance':
      body = (
        <>
          <g transform="translate(-14 4) scale(.8)">
            <Face skin="#f2c99a" />
            <path d="M24 48 Q26 22 50 22 Q74 22 76 48 Z" fill="#c9d1de" stroke="#4a5263" stroke-width="2" />
            {smile}
          </g>
          <g transform="translate(34 4) scale(.8)">
            <Face skin="#e0a070" />
            <path d="M24 48 Q26 22 50 22 Q74 22 76 48 Z" fill="#ffd166" stroke="#a86b00" stroke-width="2" />
            {smile}
          </g>
          <line x1="20" y1="90" x2="80" y2="90" stroke="#a86b00" stroke-width="4" />
          <circle cx="50" cy="90" r="5" fill="#ffd166" stroke="#7a5200" stroke-width="2" />
        </>
      );
      break;
    case 'intern':
      body = (
        <>
          <Face skin="#f6d2b0" />
          <path d="M26 46 Q30 26 52 26 Q74 28 74 46 Q60 38 46 40 Q34 40 26 46 Z" fill="#3a2a1a" />
          <rect x="34" y="48" width="12" height="9" rx="2" fill="none" stroke={INK} stroke-width="2" />
          <rect x="54" y="48" width="12" height="9" rx="2" fill="none" stroke={INK} stroke-width="2" />
          <path d="M44 70 Q50 67 56 70" fill="none" stroke={INK} stroke-width="2.5" />
          <rect x="30" y="84" width="40" height="14" rx="3" fill="#fff" stroke={INK} stroke-width="1.5" />
          <text x="50" y="94" text-anchor="middle" font-family="Fredoka" font-size="8" fill={INK}>INTERN</text>
        </>
      );
      break;
    default:
      body = <Face skin="#f2c99a" />;
  }
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" class={cls} style={{ overflow: 'visible' }}>
      {body}
    </svg>
  );
}
