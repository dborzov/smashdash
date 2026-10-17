/**
 * The world map: an island with one landmark per region. Locked regions hide under the
 * Muddler's fog. Wandering monsters (spaced review) roam around regions you've visited.
 */
import type { Region } from '../../content/schema';
import type { Profile } from '../../engine/profile';
import {
  regions as allRegions,
  regionById,
  skillById,
  campaignById,
  campaigns,
} from '../../content';
import { currentRegion, regionDone, regionUnlocked } from '../../engine/progress';
import { blob } from '../../art/paint';
import { Avatar } from '../../art/Avatar';
import { FoeArt } from '../../art/Foe';
import { Particles } from '../components/Particles';
import { go } from '../router';
import { sfx } from '../../audio/sfx';
import { BIOME, Landmark } from '../../art/Landmarks';
import { learnedSkills } from '../../engine/mastery';

const W = 1000;
const H = 700;


function Fog() {
  return (
    <g opacity=".95" style={{ animation: 'bob 6s ease-in-out infinite' }}>
      {[
        [-50, -40, 40],
        [-10, -60, 48],
        [40, -42, 42],
        [0, -20, 50],
        [-60, -10, 30],
        [60, -12, 32],
      ].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={i % 2 ? '#c9b3ff' : '#e6dcff'} />
      ))}
    </g>
  );
}

function road(a: Region, b: Region): string {
  const x1 = a.map.x * 10;
  const y1 = a.map.y * 7;
  const x2 = b.map.x * 10;
  const y2 = b.map.y * 7;
  const mx = (x1 + x2) / 2 + (y2 - y1) * 0.15;
  const my = (y1 + y2) / 2 - (x2 - x1) * 0.15;
  return `M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`;
}

export function WorldMap({ p, campaign = 'kingdom' }: { p: Profile; campaign?: string }) {
  const regions = allRegions.filter((r) => r.campaign === campaign);
  const dark = campaignById[campaign]?.mood === 'dark';
  const cur = currentRegion(p);
  const here = regions.includes(cur)
    ? cur
    : (regions.find((r) => regionUnlocked(p, r) && !regionDone(p, r)) ?? regions[0]);
  const island = blob(7, 500, 370, 450, 300, 4, 0.07, 22);
  const beach = blob(7, 500, 372, 466, 314, 4, 0.07, 22);
  const hasSkills = learnedSkills(p).length > 0;
  return (
    <div
      class="screen"
      style={{
        background: dark
          ? 'radial-gradient(ellipse at 50% 45%, #2a3446, #07090f 75%)'
          : 'radial-gradient(ellipse at 50% 45%, #2a74b8, #0b1f4a 75%)',
      }}
    >
      <Particles kind="star" count={20} />
      <div
        class="screen-scroll"
        style={{ padding: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      >
        <div
          style={{
            position: 'relative',
            width: 'min(100%, calc((100vh - var(--hud-h) - var(--tabs-h) - 120px) * 10 / 7))',
            minWidth: 'min(100%, 560px)',
            aspectRatio: '10 / 7',
            flex: 'none',
          }}
        >
          <svg
            viewBox={`0 0 ${W} ${H}`}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            aria-hidden="true"
          >
            <defs>
              <clipPath id="island-clip">
                <path d={island} />
              </clipPath>
              <filter id="mapblur">
                <feGaussianBlur stdDeviation="14" />
              </filter>
              <filter id="fogblur">
                <feGaussianBlur stdDeviation="5" />
              </filter>
            </defs>
            {/* waves */}
            {Array.from({ length: 26 }, (_, i) => {
              const x = (i * 137) % 1000;
              const y = (i * 263) % 700;
              return (
                <path
                  key={i}
                  d={`M${x} ${y} q10 -8 20 0 q10 8 20 0`}
                  fill="none"
                  stroke="#9fd6ff"
                  stroke-width="2.5"
                  opacity=".35"
                  style={{ animation: `cloud ${6 + (i % 4)}s ease-in-out infinite alternate` }}
                />
              );
            })}
            <path d={beach} fill={dark ? '#c8ccd4' : '#f6dfa0'} />
            <path d={island} fill={dark ? '#4a5262' : '#8fd16a'} />
            <g clip-path="url(#island-clip)">
              {regions.map((r) => (
                <path
                  key={r.id}
                  d={blob(r.order * 31, r.map.x * 10, r.map.y * 7, 170, 120, 3, 0.18)}
                  fill={BIOME[r.scene] ?? '#8fd16a'}
                  filter="url(#mapblur)"
                  opacity=".95"
                />
              ))}
            </g>
            <path d={island} fill="none" stroke="#5a9a4a" stroke-width="4" opacity=".6" />
            {/* roads */}
            {regions.flatMap((r) =>
              r.requires
                .filter((req) => regions.includes(regionById[req]))
                .map((req) => {
                  const from = regionById[req];
                  const open = regionUnlocked(p, r);
                  return (
                    <path
                      key={`${req}-${r.id}`}
                      d={road(from, r)}
                      fill="none"
                      stroke={open ? '#fff4dc' : '#9a8aa8'}
                      stroke-width="6"
                      stroke-dasharray="2 14"
                      stroke-linecap="round"
                      opacity=".9"
                    />
                  );
                }),
            )}
            {/* landmarks */}
            {regions.map((r) => (
              <g key={r.id} transform={`translate(${r.map.x * 10} ${r.map.y * 7 + 30})`}>
                <Landmark scene={r.scene} />
                {!regionUnlocked(p, r) && (
                  <g filter="url(#fogblur)">
                    <Fog />
                  </g>
                )}
              </g>
            ))}
            {/* compass */}
            <g transform="translate(930 630)" opacity=".8">
              <circle r="34" fill="#f6dfa0" stroke="#7a5a3a" stroke-width="3" />
              <path d="M0 -28 L7 0 L0 28 L-7 0 Z" fill="#e0334d" />
              <path d="M-28 0 L0 7 L28 0 L0 -7 Z" fill="#7a5a3a" />
              <text
                y="-36"
                text-anchor="middle"
                font-family="Fredoka"
                font-weight="700"
                font-size="16"
                fill="#fff"
              >
                N
              </text>
            </g>
            <text
              x="70"
              y="650"
              font-size="40"
              style={{ animation: 'bob 3s ease-in-out infinite' }}
            >
              🐙
            </text>
          </svg>

          {/* region labels (clickable) */}
          {regions.map((r) => {
            const open = regionUnlocked(p, r);
            const done = regionDone(p, r);
            return (
              <button
                key={r.id}
                onClick={() => {
                  sfx(open ? 'click' : 'wrong');
                  go(`/region/${r.id}`);
                }}
                style={{
                  position: 'absolute',
                  left: `${r.map.x}%`,
                  top: `${r.map.y + 6.5}%`,
                  transform: 'translate(-50%, 0)',
                  background: open ? 'rgba(22,15,50,.88)' : 'rgba(60,50,90,.85)',
                  border: `2px solid ${open ? r.palette.accent : '#8a80aa'}`,
                  color: '#fff',
                  borderRadius: '12px',
                  padding: '3px 10px',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: 'clamp(.7rem, 1.6vw, 1rem)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(0,0,0,.4)',
                  zIndex: 2,
                }}
              >
                {open ? (done ? '✅ ' : '') : '🔒 '}
                {r.name}
              </button>
            );
          })}
          {/* big invisible click targets over landmarks */}
          {regions.map((r) => (
            <button
              key={`t${r.id}`}
              aria-label={r.name}
              onClick={() => go(`/region/${r.id}`)}
              style={{
                position: 'absolute',
                left: `${r.map.x - 8}%`,
                top: `${r.map.y - 12}%`,
                width: '16%',
                height: '18%',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                zIndex: 1,
              }}
            />
          ))}
          {/* the hero */}
          <div
            style={{
              position: 'absolute',
              left: `${here.map.x - 3}%`,
              top: `${here.map.y - 13}%`,
              width: '7%',
              transform: 'translate(-50%, 0)',
              zIndex: 3,
              pointerEvents: 'none',
              filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.5))',
            }}
            class="anim-bob"
          >
            <Avatar look={p.hero.look} cls={p.hero.cls} hat={p.hero.hat} cape={p.hero.cape} />
          </div>
          {/* wandering monsters */}
          {p.wanderers
            .filter((w) => regions.some((r) => r.id === w.region))
            .map((w) => (
              <button
                key={w.id}
                onClick={() => {
                  sfx('whoosh');
                  go(`/wander/${w.id}`);
                }}
                title={`${w.monster.name}: practise ${w.skills.map((s) => skillById[s]?.name).join(', ')}`}
                style={{
                  position: 'absolute',
                  left: `${w.x}%`,
                  top: `${w.y}%`,
                  width: '6.5%',
                  transform: 'translate(-50%, -50%)',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  zIndex: 4,
                }}
                class="anim-bob"
              >
                <FoeArt m={w.monster} />
                <span
                  style={{
                    position: 'absolute',
                    top: '-28%',
                    right: '-20%',
                    background: '#ff5f5f',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '1.6em',
                    height: '1.6em',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 800,
                    fontSize: 'clamp(.7rem, 1.4vw, .95rem)',
                    boxShadow: '0 2px 6px rgba(0,0,0,.4)',
                    animation: 'pulse 1.2s infinite',
                  }}
                >
                  !
                </span>
              </button>
            ))}
        </div>

        <div class="panel row wrap atlas-bar">
          <button class="btn small ghost" onClick={() => go('/map')}>
            ← Adventures
          </button>
          <div class="row wrap" style={{ gap: '6px' }}>
            {campaigns.map((c) => (
              <button
                key={c.id}
                class={`btn small ${c.id === campaign ? 'gold' : 'ghost'}`}
                onClick={() => go(`/atlas/${c.id}`, true)}
              >
                {c.icon} {c.name}
              </button>
            ))}
          </div>
          <div class="spacer" />
          {hasSkills && (
            <button class="btn small" onClick={() => go('/wander/seek')}>
              👹 Seek trouble
            </button>
          )}
          {here && (
            <button class="btn small gold" onClick={() => go(`/region/${here.id}`)}>
              ▶ {here.name}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
