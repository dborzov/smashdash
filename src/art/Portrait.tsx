/** Dialogue portraits: Grimble the frog, the Muddler, named NPCs, monsters and the hero. */
import { cast } from '../content';
import { MonsterArt } from './Monster';
import { Avatar } from './Avatar';
import type { Profile } from '../engine/profile';

export function Grimble({ class: cls }: { class?: string }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" class={cls}>
      <ellipse cx="50" cy="66" rx="40" ry="30" fill="#5fcf5c" stroke="#1f5c1d" stroke-width="3" />
      <ellipse cx="50" cy="76" rx="26" ry="15" fill="#c9f2a8" />
      <circle cx="30" cy="40" r="15" fill="#5fcf5c" stroke="#1f5c1d" stroke-width="3" />
      <circle cx="70" cy="40" r="15" fill="#5fcf5c" stroke="#1f5c1d" stroke-width="3" />
      <circle cx="30" cy="40" r="9" fill="#fff" />
      <circle cx="70" cy="40" r="9" fill="#fff" />
      <circle cx="32" cy="42" r="5" fill="#1b1033" />
      <circle cx="68" cy="42" r="5" fill="#1b1033" />
      <circle cx="33.5" cy="40" r="1.6" fill="#fff" />
      <circle cx="69.5" cy="40" r="1.6" fill="#fff" />
      {/* monocle */}
      <circle cx="70" cy="40" r="11" fill="none" stroke="#ffd166" stroke-width="2.5" />
      <path d="M81 42 Q86 60 80 70" fill="none" stroke="#ffd166" stroke-width="1.5" />
      {/* half-lidded unimpressed look */}
      <path d="M21 36 Q30 30 39 36" fill="#5fcf5c" stroke="#1f5c1d" stroke-width="2" />
      <path
        d="M24 64 Q50 78 76 62"
        fill="none"
        stroke="#1f5c1d"
        stroke-width="3"
        stroke-linecap="round"
      />
      <circle cx="42" cy="56" r="1.8" fill="#1f5c1d" />
      <circle cx="58" cy="56" r="1.8" fill="#1f5c1d" />
      {/* mortarboard */}
      <path d="M30 22 L50 13 L70 22 L50 31 Z" fill="#1b1033" stroke="#000" stroke-width="1.5" />
      <rect x="42" y="24" width="16" height="7" fill="#1b1033" />
      <path d="M50 22 L66 26 L66 36" fill="none" stroke="#ffd166" stroke-width="2" />
      <circle cx="66" cy="37" r="2.5" fill="#ffd166" />
    </svg>
  );
}

export function Muddler({ class: cls }: { class?: string }) {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      class={cls}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <radialGradient id="fog" cx="50%" cy="50%" r="50%">
          <stop offset="0" stop-color="#d9c4ff" />
          <stop offset="1" stop-color="#8a5fd6" />
        </radialGradient>
      </defs>
      {/* fog beard */}
      <path
        d="M22 58 Q14 80 30 92 Q40 100 50 94 Q62 102 72 92 Q88 80 78 58 Z"
        fill="url(#fog)"
        stroke="#4b2a8a"
        stroke-width="2.5"
      />
      <path
        d="M34 80 q6 -6 12 0 q6 6 12 0"
        fill="none"
        stroke="#4b2a8a"
        stroke-width="1.5"
        opacity=".6"
      />
      <circle cx="50" cy="52" r="22" fill="#d6c2a8" stroke="#5a4030" stroke-width="2.5" />
      {/* eyes: narrow and scheming */}
      <path
        d="M36 48 Q41 44 46 48"
        fill="none"
        stroke="#1b1033"
        stroke-width="3"
        stroke-linecap="round"
      />
      <path
        d="M54 48 Q59 44 64 48"
        fill="none"
        stroke="#1b1033"
        stroke-width="3"
        stroke-linecap="round"
      />
      <path
        d="M32 40 L46 44 M68 40 L54 44"
        stroke="#4b2a8a"
        stroke-width="3.5"
        stroke-linecap="round"
      />
      <ellipse cx="50" cy="56" rx="5" ry="7" fill="#c9a98a" stroke="#5a4030" stroke-width="2" />
      <path
        d="M40 66 Q50 72 62 64"
        fill="none"
        stroke="#1b1033"
        stroke-width="2.5"
        stroke-linecap="round"
      />
      {/* swirly hat */}
      <path
        d="M22 38 Q50 30 78 38 L58 -8 Q50 -14 52 0 Q40 10 46 18 Z"
        fill="#6c3fc9"
        stroke="#2e1466"
        stroke-width="2.5"
        stroke-linejoin="round"
      />
      <ellipse cx="50" cy="38" rx="31" ry="6" fill="#6c3fc9" stroke="#2e1466" stroke-width="2.5" />
      <path
        d="M44 22 q4 -6 8 0 q2 6 -4 6 q-4 -2 -1 -4"
        fill="none"
        stroke="#d9c4ff"
        stroke-width="2"
      />
      <circle cx="58" cy="-8" r="4" fill="#d9c4ff" />
    </svg>
  );
}

/** Simple illustrated heads for the named NPCs. */
function Npc({ id, color, class: cls }: { id: string; color: string; class?: string }) {
  const face = (skin: string, stroke = '#5a3a20') => (
    <>
      <circle cx="50" cy="56" r="26" fill={skin} stroke={stroke} stroke-width="2.5" />
      <ellipse cx="41" cy="54" rx="3.5" ry="4.5" fill="#1b1033" />
      <ellipse cx="59" cy="54" rx="3.5" ry="4.5" fill="#1b1033" />
      <circle cx="42" cy="52.5" r="1.3" fill="#fff" />
      <circle cx="60" cy="52.5" r="1.3" fill="#fff" />
      <ellipse cx="34" cy="64" rx="5" ry="3" fill="#ff7a9a" opacity=".4" />
      <ellipse cx="66" cy="64" rx="5" ry="3" fill="#ff7a9a" opacity=".4" />
    </>
  );
  let body;
  switch (id) {
    case 'mayor':
      body = (
        <>
          {face('#f6c99b')}
          <path d="M34 68 Q42 60 50 66 Q58 60 66 68 Q58 72 50 68 Q42 72 34 68 Z" fill="#6b4a2b" />
          <path d="M44 74 Q50 78 56 74" fill="none" stroke="#5a3a20" stroke-width="2" />
          <rect
            x="30"
            y="8"
            width="40"
            height="28"
            rx="3"
            fill="#2a2440"
            stroke="#000"
            stroke-width="2"
          />
          <rect
            x="22"
            y="33"
            width="56"
            height="7"
            rx="3"
            fill="#2a2440"
            stroke="#000"
            stroke-width="2"
          />
          <rect x="30" y="26" width="40" height="6" fill={color} />
        </>
      );
      break;
    case 'brokka':
      body = (
        <>
          {face('#e2a86f')}
          <path
            d="M28 64 Q30 98 50 100 Q70 98 72 64 Q60 74 50 70 Q40 74 28 64 Z"
            fill="#d9542b"
            stroke="#7a2a10"
            stroke-width="2.5"
          />
          <path d="M44 88 L44 100 M56 88 L56 100" stroke="#ffd166" stroke-width="3" />
          <path
            d="M22 50 Q22 22 50 22 Q78 22 78 50 Z"
            fill="#9aa4b5"
            stroke="#4a5263"
            stroke-width="2.5"
          />
          <rect
            x="47"
            y="18"
            width="6"
            height="34"
            fill="#c9d1de"
            stroke="#4a5263"
            stroke-width="1.5"
          />
          <path
            d="M22 44 Q12 30 16 20 Q24 32 30 36"
            fill="#fff4dc"
            stroke="#7a6a50"
            stroke-width="2"
          />
          <path
            d="M78 44 Q88 30 84 20 Q76 32 70 36"
            fill="#fff4dc"
            stroke="#7a6a50"
            stroke-width="2"
          />
        </>
      );
      break;
    case 'nettle':
      body = (
        <>
          {face('#b7d99a', '#3f5a2a')}
          <circle cx="62" cy="64" r="2.5" fill="#6a8a4a" />
          <path d="M40 70 Q50 78 60 70" fill="#3a1d1d" stroke="#3f5a2a" stroke-width="2" />
          <rect x="47" y="70" width="4" height="5" fill="#fff" />
          <path
            d="M16 38 Q50 30 84 38 L58 -4 Q54 -8 52 2 Q44 14 48 24 Z"
            fill="#3b2a5a"
            stroke="#1b1033"
            stroke-width="2.5"
          />
          <ellipse
            cx="50"
            cy="38"
            rx="36"
            ry="6"
            fill="#3b2a5a"
            stroke="#1b1033"
            stroke-width="2.5"
          />
          <path
            d="M30 40 Q24 70 28 84 M70 40 Q78 70 72 84"
            stroke="#cfcfcf"
            stroke-width="5"
            fill="none"
            stroke-linecap="round"
          />
        </>
      );
      break;
    case 'snowbert':
      body = (
        <>
          <circle cx="50" cy="54" r="34" fill="#f4f8ff" stroke="#8aa4c8" stroke-width="2.5" />
          {[20, 34, 50, 66, 80].map((x, i) => (
            <circle
              key={i}
              cx={x}
              cy={26 + Math.abs(x - 50) * 0.4}
              r="9"
              fill="#f4f8ff"
              stroke="#8aa4c8"
              stroke-width="2"
            />
          ))}
          <ellipse
            cx="50"
            cy="58"
            rx="20"
            ry="18"
            fill="#9fd0ff"
            stroke="#5a86b8"
            stroke-width="2"
          />
          <ellipse cx="43" cy="54" rx="3.5" ry="4.5" fill="#1b1033" />
          <ellipse cx="57" cy="54" rx="3.5" ry="4.5" fill="#1b1033" />
          <path
            d="M42 66 Q50 72 58 66"
            fill="none"
            stroke="#1b1033"
            stroke-width="2.5"
            stroke-linecap="round"
          />
          <path
            d="M18 84 Q50 96 82 84 L82 94 Q50 104 18 94 Z"
            fill="#e0334d"
            stroke="#7a1020"
            stroke-width="2"
          />
          <path
            d="M24 30 L18 14 L32 24 M76 30 L82 14 L68 24"
            fill="#dfe8f5"
            stroke="#8aa4c8"
            stroke-width="2"
          />
        </>
      );
      break;
    case 'ptolemeow':
      body = (
        <>
          <path
            d="M14 96 L22 34 L50 22 L78 34 L86 96 Z"
            fill="#2b5fd6"
            stroke="#122a66"
            stroke-width="2.5"
          />
          {[40, 52, 64, 76].map((y) => (
            <path key={y} d={`M18 ${y} L82 ${y}`} stroke="#ffd166" stroke-width="5" opacity=".9" />
          ))}
          <path
            d="M30 34 L26 10 L42 26 Z M70 34 L74 10 L58 26 Z"
            fill="#f2b84b"
            stroke="#7a4a00"
            stroke-width="2.5"
          />
          <circle cx="50" cy="52" r="24" fill="#f2b84b" stroke="#7a4a00" stroke-width="2.5" />
          <ellipse cx="41" cy="50" rx="4" ry="6" fill="#3ea86a" />
          <ellipse cx="59" cy="50" rx="4" ry="6" fill="#3ea86a" />
          <ellipse cx="41" cy="50" rx="1.3" ry="5" fill="#1b1033" />
          <ellipse cx="59" cy="50" rx="1.3" ry="5" fill="#1b1033" />
          <path d="M47 60 L53 60 L50 64 Z" fill="#ff7a9a" />
          <path
            d="M50 64 Q45 70 41 66 M50 64 Q55 70 59 66"
            fill="none"
            stroke="#7a4a00"
            stroke-width="2"
          />
          <path
            d="M30 60 L18 58 M30 64 L18 66 M70 60 L82 58 M70 64 L82 66"
            stroke="#7a4a00"
            stroke-width="1.5"
          />
        </>
      );
      break;
    case 'zoomwhistle':
      body = (
        <>
          {face('#f6c99b')}
          <path
            d="M26 64 Q30 100 50 104 Q70 100 74 64 Q62 72 50 70 Q38 72 26 64 Z"
            fill="#f2f2f2"
            stroke="#9a9a9a"
            stroke-width="2.5"
          />
          <circle cx="41" cy="54" r="8" fill="none" stroke="#7a4a00" stroke-width="2.5" />
          <circle cx="59" cy="54" r="8" fill="none" stroke="#7a4a00" stroke-width="2.5" />
          <path d="M49 54 L51 54" stroke="#7a4a00" stroke-width="2.5" />
          <path
            d="M20 36 Q50 28 80 36 L60 -6 Q52 -10 54 2 Q42 14 46 24 Z"
            fill="#3a5fd6"
            stroke="#1a2a66"
            stroke-width="2.5"
          />
          <ellipse
            cx="50"
            cy="36"
            rx="32"
            ry="6"
            fill="#3a5fd6"
            stroke="#1a2a66"
            stroke-width="2.5"
          />
          <circle cx="44" cy="20" r="2.5" fill="#ffd166" />
          <circle cx="56" cy="10" r="2" fill="#ffd166" />
          <path
            d="M60 24 l1.5 3 3 .5 -2.3 2 .6 3 -2.8 -1.5 -2.8 1.5 .6 -3 -2.3 -2 3 -.5 Z"
            fill="#ffd166"
          />
        </>
      );
      break;
    case 'pib':
      body = (
        <>
          {face('#c68642', '#5a3010')}
          <path
            d="M36 68 Q30 62 26 66 M64 68 Q70 62 74 66"
            stroke="#2b1b0e"
            stroke-width="3"
            fill="none"
            stroke-linecap="round"
          />
          <path d="M38 66 Q50 62 62 66" stroke="#2b1b0e" stroke-width="4" fill="none" />
          <path d="M44 74 Q50 78 56 74" fill="none" stroke="#5a3010" stroke-width="2" />
          <circle cx="24" cy="62" r="3" fill="#ffd166" />
          <path
            d="M22 40 Q20 16 50 14 Q80 16 78 40 Q66 30 50 32 Q34 30 22 40 Z"
            fill={color}
            stroke="#8a2a5a"
            stroke-width="2.5"
          />
          <path d="M26 34 Q50 22 74 34" fill="none" stroke="#fff" stroke-width="3" opacity=".6" />
          <circle cx="50" cy="22" r="5" fill="#5ec8ff" stroke="#1d6fa3" stroke-width="2" />
        </>
      );
      break;
    case 'ogre':
      // Two heads, one neck, zero agreement.
      body = (
        <>
          <path d="M14 104 Q50 70 86 104 Z" fill="#8a6a3a" stroke="#4a3a1a" stroke-width="2.5" />
          {[
            [30, -1],
            [70, 1],
          ].map(([cx, d]) => (
            <g key={cx}>
              <circle cx={cx} cy="58" r="21" fill="#9bcf5a" stroke="#3a5a1a" stroke-width="2.5" />
              <ellipse cx={cx - 7} cy="54" rx="3" ry="4" fill="#1b1033" />
              <ellipse cx={cx + 7} cy="54" rx="3" ry="4" fill="#1b1033" />
              <path
                d={`M${cx - 8} 67 Q${cx} ${d > 0 ? 73 : 63} ${cx + 8} 67`}
                fill="none"
                stroke="#3a5a1a"
                stroke-width="2.5"
                stroke-linecap="round"
              />
              <path d={`M${cx - 5} 66 l2 -5 l2 5 M${cx + 1} 66 l2 -5 l2 5`} fill="#fff" />
              <path
                d={`M${cx - 10} 44 Q${cx - 14} 34 ${cx - 8} 32 M${cx + 10} 44 Q${cx + 14} 34 ${cx + 8} 32`}
                stroke="#3a5a1a"
                stroke-width="2.5"
                fill="none"
              />
            </g>
          ))}
          <path d="M44 48 Q50 44 56 48" stroke="#3a5a1a" stroke-width="2" fill="none" />
        </>
      );
      break;
    case 'polly':
      body = (
        <>
          <path
            d="M28 70 Q22 104 50 106 Q78 104 72 70 Z"
            fill="#3aa05a"
            stroke="#1a5a2a"
            stroke-width="2.5"
          />
          <circle cx="50" cy="52" r="26" fill={color} stroke="#8a1a1a" stroke-width="2.5" />
          <path
            d="M50 54 Q74 56 68 76 Q60 66 50 66 Z"
            fill="#ffd166"
            stroke="#7a4a00"
            stroke-width="2.5"
          />
          <circle cx="40" cy="48" r="5" fill="#fff" stroke="#1b1033" stroke-width="2" />
          <circle cx="41" cy="48" r="2.5" fill="#1b1033" />
          <path
            d="M52 40 L66 52 M54 44 Q62 40 66 46 Q62 54 54 50 Z"
            fill="#1b1033"
            stroke="#1b1033"
            stroke-width="2"
          />
          <path
            d="M20 30 Q50 10 80 30 L72 36 Q50 26 28 36 Z"
            fill="#2a1c10"
            stroke="#000"
            stroke-width="2"
          />
          <text x="50" y="30" text-anchor="middle" font-size="10" fill="#fff">
            ☠
          </text>
        </>
      );
      break;
    case 'sprocket':
      body = (
        <>
          <path
            d="M18 60 L4 48 L22 50 Z M82 60 L96 48 L78 50 Z"
            fill="#7fbf5a"
            stroke="#3a5a1a"
            stroke-width="2.5"
          />
          {face('#8fcf6a', '#3a5a1a')}
          <path
            d="M40 66 Q50 74 60 66"
            fill="none"
            stroke="#3a5a1a"
            stroke-width="2.5"
            stroke-linecap="round"
          />
          <path d="M22 44 Q50 36 78 44" stroke="#5a3a20" stroke-width="5" fill="none" />
          <circle
            cx="40"
            cy="42"
            r="9"
            fill="#7dd3fc"
            stroke="#5a3a20"
            stroke-width="3"
            opacity=".9"
          />
          <circle
            cx="60"
            cy="42"
            r="9"
            fill="#7dd3fc"
            stroke="#5a3a20"
            stroke-width="3"
            opacity=".9"
          />
          <path
            d="M30 32 Q34 14 50 16 Q66 14 70 32"
            fill="#ff8c5a"
            stroke="#7a3a1a"
            stroke-width="2.5"
          />
          <path d="M66 74 l10 8 l-4 2 l6 6" stroke="#e0a526" stroke-width="3" fill="none" />
        </>
      );
      break;
    case 'zap':
      body = (
        <>
          <circle cx="50" cy="56" r="30" fill="#9fd8ff" stroke="#1d6fa3" stroke-width="3" />
          <circle
            cx="50"
            cy="56"
            r="38"
            fill="none"
            stroke="#9fd8ff"
            stroke-width="2"
            stroke-dasharray="3 7"
            opacity=".7"
          />
          <path
            d="M38 50 Q42 46 46 50 M54 50 Q58 46 62 50"
            stroke="#1b1033"
            stroke-width="2.5"
            fill="none"
            stroke-linecap="round"
          />
          <ellipse cx="50" cy="70" rx="8" ry="6" fill="#ff7ab8" stroke="#a3165a" stroke-width="2" />
          <circle cx="50" cy="70" r="3" fill="#ffd1e6" />
          <path
            d="M36 58 Q34 66 38 70 M64 58 Q66 66 62 70"
            stroke="#7dd3fc"
            stroke-width="2.5"
            fill="none"
          />
          <path d="M44 22 L56 22" stroke="#1d6fa3" stroke-width="5" stroke-linecap="round" />
          <path d="M50 26 Q46 18 52 14" stroke="#1d6fa3" stroke-width="2.5" fill="none" />
        </>
      );
      break;
    default:
      body = face('#f6c99b');
  }
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      class={cls}
      style={{ overflow: 'visible' }}
    >
      {body}
    </svg>
  );
}

/** Portrait for a cast id. `hero` uses the current player's avatar. */
export function Portrait({
  who,
  profile,
  class: cls,
}: {
  who: string;
  profile?: Profile | null;
  class?: string;
}) {
  const c = cast[who];
  if (who === 'hero' && profile)
    return (
      <Avatar
        look={profile.hero.look}
        cls={profile.hero.cls}
        hat={profile.hero.hat}
        portrait
        class={cls}
      />
    );
  if (!c) return <Grimble class={cls} />;
  switch (c.art) {
    case 'grimble':
      return <Grimble class={cls} />;
    case 'muddler':
      return <Muddler class={cls} />;
    case 'monster':
      return <MonsterArt seed={c.seed ?? 1} hue={c.hue} class={cls} />;
    default:
      return <Npc id={who} color={c.color} class={cls} />;
  }
}
