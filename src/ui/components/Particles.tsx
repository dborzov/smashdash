/** Cheap ambient particles (CSS-animated dots): fireflies, embers, snow, stars, sparks. */
import { useMemo } from 'preact/hooks';
import { Rng, hashString } from '../../engine/rng';

export type ParticleKind = 'firefly' | 'ember' | 'snow' | 'star' | 'spark' | 'ash' | 'mote';

export function Particles({
  kind,
  count = 24,
  seed = kind,
}: {
  kind: ParticleKind;
  count?: number;
  seed?: string;
}) {
  const dots = useMemo(() => {
    const rng = new Rng(hashString(seed));
    return Array.from({ length: count }, () => ({
      left: rng.int(0, 100),
      top:
        kind === 'snow' || kind === 'ash'
          ? rng.int(-20, 0)
          : kind === 'ember'
            ? rng.int(80, 110)
            : rng.int(0, 95),
      delay: -rng.next() * 9,
      dur: 0.7 + rng.next() * 0.8,
      size: 0.6 + rng.next() * 0.9,
    }));
  }, [kind, count, seed]);
  return (
    <div class="particles" aria-hidden="true">
      {dots.map((d, i) => (
        <i
          key={i}
          class={`p-${kind}`}
          style={{
            left: `${d.left}%`,
            top: `${d.top}%`,
            animationDelay: `${d.delay}s, ${d.delay * 0.7}s`,
            animationDuration:
              kind === 'snow' || kind === 'ember' || kind === 'ash'
                ? `${(kind === 'ember' ? 6 : kind === 'ash' ? 12 : 9) * (1 / d.dur)}s`
                : undefined,
            transform: `scale(${d.size})`,
          }}
        />
      ))}
    </div>
  );
}
