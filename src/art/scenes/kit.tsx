/** Shared frame for scene backdrops: a 1200 × 800 SVG with the common blur/glow filters. */
const VB = '0 0 1200 800';

export function Svg({ children }: { children: preact.ComponentChildren }) {
  return (
    <svg viewBox={VB} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <filter id="blur8" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <filter id="blur20" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="20" />
        </filter>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {children}
    </svg>
  );
}

