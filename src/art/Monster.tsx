/**
 * Procedural monsters: every seed gives a different cute-ugly creature
 * (body blob, eyes, horns or antennae, teeth, spots), coloured by `hue`.
 */
import { useMemo } from 'preact/hooks';
import { Rng } from '../engine/rng';
import { blob, hsl } from './paint';

export interface MonsterArtProps {
  seed: number;
  hue?: number;
  boss?: boolean;
  hurt?: boolean;
  class?: string;
}

export function MonsterArt({ seed, hue, boss, hurt, class: cls }: MonsterArtProps) {
  const m = useMemo(() => {
    const rng = new Rng(seed * 7919 + 13);
    const h = hue ?? rng.int(0, 360);
    return {
      h,
      body: blob(
        seed,
        100,
        118,
        58 + rng.int(-6, 8),
        52 + rng.int(-6, 10),
        rng.int(3, 7),
        0.06 + rng.next() * 0.08,
      ),
      eyes: rng.pick([1, 2, 2, 2, 3]),
      eyeR: rng.int(10, 16),
      top: rng.pick(['horns', 'ears', 'antennae', 'spikes', 'none'] as const),
      mouth: rng.pick(['teeth', 'fangs', 'open', 'smirk'] as const),
      spots: Array.from({ length: rng.int(0, 4) }, () => [
        rng.int(60, 140),
        rng.int(105, 150),
        rng.int(4, 9),
      ]),
      arms: rng.chance(0.7),
      brows: rng.chance(0.5),
      pupil: rng.pick(['#1b1033', '#c2185b', '#1b1033']),
    };
  }, [seed, hue]);
  const fill = hsl(m.h, 68, 56);
  const dark = hsl(m.h, 55, 22);
  const light = hsl(m.h, 75, 76);
  const id = `mg${seed}`;
  const eyeXs = m.eyes === 1 ? [100] : m.eyes === 2 ? [80, 120] : [74, 100, 126];
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 200 200"
      class={cls}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <radialGradient id={id} cx="35%" cy="30%" r="80%">
          <stop offset="0" stop-color={light} />
          <stop offset=".55" stop-color={fill} />
          <stop offset="1" stop-color={hsl(m.h, 60, 38)} />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="182" rx="62" ry="10" fill="rgba(0,0,0,.28)" />
      {/* top decorations behind the body */}
      {m.top === 'horns' && (
        <g fill="#fff4dc" stroke={dark} stroke-width="4" stroke-linejoin="round">
          <path d="M62 82 Q44 50 58 34 Q62 58 80 72 Z" />
          <path d="M138 82 Q156 50 142 34 Q138 58 120 72 Z" />
        </g>
      )}
      {m.top === 'ears' && (
        <g fill={fill} stroke={dark} stroke-width="4">
          <path d="M58 88 Q34 52 52 44 Q70 54 80 74 Z" />
          <path d="M142 88 Q166 52 148 44 Q130 54 120 74 Z" />
        </g>
      )}
      {m.top === 'antennae' && (
        <g stroke={dark} stroke-width="4" fill={light}>
          <path d="M84 72 Q76 40 64 30" fill="none" />
          <path d="M116 72 Q124 40 136 30" fill="none" />
          <circle cx="64" cy="28" r="8" />
          <circle cx="136" cy="28" r="8" />
        </g>
      )}
      {m.top === 'spikes' && (
        <g fill={light} stroke={dark} stroke-width="4" stroke-linejoin="round">
          <path d="M70 76 L78 46 L90 70 Z" />
          <path d="M90 68 L100 36 L110 68 Z" />
          <path d="M110 70 L122 46 L130 76 Z" />
        </g>
      )}
      {/* feet */}
      <ellipse cx="76" cy="170" rx="16" ry="10" fill={fill} stroke={dark} stroke-width="4" />
      <ellipse cx="124" cy="170" rx="16" ry="10" fill={fill} stroke={dark} stroke-width="4" />
      {/* arms */}
      {m.arms && (
        <g fill={fill} stroke={dark} stroke-width="4">
          <ellipse cx="44" cy="128" rx="12" ry="18" transform="rotate(25 44 128)" />
          <ellipse cx="156" cy="128" rx="12" ry="18" transform="rotate(-25 156 128)" />
        </g>
      )}
      {/* body */}
      <path d={m.body} fill={`url(#${id})`} stroke={dark} stroke-width="5" />
      <ellipse cx="100" cy="140" rx="34" ry="24" fill={light} opacity=".55" />
      {m.spots.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={hsl(m.h, 60, 45)} opacity=".6" />
      ))}
      {/* eyes */}
      {eyeXs.map((x, i) => (
        <g key={i}>
          {hurt ? (
            <path
              d={`M${x - 8} ${96} l16 12 M${x + 8} ${96} l-16 12`}
              stroke={dark}
              stroke-width="5"
              stroke-linecap="round"
            />
          ) : (
            <>
              <circle cx={x} cy={102} r={m.eyeR} fill="#fff" stroke={dark} stroke-width="4" />
              <circle cx={x + 2} cy={104} r={m.eyeR * 0.5} fill={m.pupil} />
              <circle cx={x + 5} cy={100} r={m.eyeR * 0.18} fill="#fff" />
            </>
          )}
        </g>
      ))}
      {m.brows && !hurt && (
        <g stroke={dark} stroke-width="5" stroke-linecap="round">
          <path d={`M${eyeXs[0] - 14} ${84} L${eyeXs[0] + 10} ${92}`} />
          <path
            d={`M${eyeXs[eyeXs.length - 1] + 14} ${84} L${eyeXs[eyeXs.length - 1] - 10} ${92}`}
          />
        </g>
      )}
      {/* mouth */}
      {m.mouth === 'teeth' && (
        <g>
          <path
            d="M72 128 Q100 150 128 128 Z"
            fill="#3a0d1f"
            stroke={dark}
            stroke-width="4"
            stroke-linejoin="round"
          />
          <path
            d="M78 130 L84 138 L90 132 L96 140 L102 133 L108 140 L114 132 L120 138 L124 130"
            fill="#fff"
            stroke={dark}
            stroke-width="1.5"
          />
        </g>
      )}
      {m.mouth === 'fangs' && (
        <g>
          <path
            d="M78 130 Q100 140 122 130"
            fill="none"
            stroke={dark}
            stroke-width="5"
            stroke-linecap="round"
          />
          <path
            d="M86 133 L90 146 L94 135 Z M106 135 L110 146 L114 133 Z"
            fill="#fff"
            stroke={dark}
            stroke-width="2"
          />
        </g>
      )}
      {m.mouth === 'open' && (
        <g>
          <ellipse
            cx="100"
            cy="136"
            rx="18"
            ry={hurt ? 6 : 14}
            fill="#3a0d1f"
            stroke={dark}
            stroke-width="4"
          />
          {!hurt && <ellipse cx="100" cy="143" rx="10" ry="6" fill="#ff6b8a" />}
        </g>
      )}
      {m.mouth === 'smirk' && (
        <path
          d="M80 134 Q104 146 124 126"
          fill="none"
          stroke={dark}
          stroke-width="5"
          stroke-linecap="round"
        />
      )}
      {boss && (
        <g transform="translate(0 -6)">
          <path
            d="M72 64 L68 34 L86 48 L100 26 L114 48 L132 34 L128 64 Z"
            fill="#ffd166"
            stroke="#7a4a00"
            stroke-width="4"
            stroke-linejoin="round"
          />
          <circle cx="100" cy="52" r="5" fill="#e0334d" />
        </g>
      )}
    </svg>
  );
}
