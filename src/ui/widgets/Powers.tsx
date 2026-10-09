/** Powers-of-ten widgets: a size slider, the decimal-point hop, and the repeat tower. */
import { useEffect, useState } from 'preact/hooks';
import { renderMath } from '../math';
import { clean, tex } from '../../skills/util';
import { sfx } from '../../audio/sfx';

const SIZES: Record<number, [string, string]> = {
  [-3]: ['🦟', 'a flea (about a millimetre)'],
  [-2]: ['🐜', 'an ant (about a centimetre)'],
  [-1]: ['🐭', 'a mouse (about 10 cm)'],
  [0]: ['🧒', 'a kid (about a metre)'],
  [1]: ['🏠', 'a house (about 10 m)'],
  [2]: ['🗼', 'a tall tower (about 100 m)'],
  [3]: ['⛰️', 'a big hill (about a kilometre)'],
  [4]: ['🏔️', 'a giant mountain (about 10 km)'],
  [5]: ['🏞️', 'a whole region (about 100 km)'],
  [6]: ['🌍', 'a country (about 1000 km)'],
};

export function PowersWidget({
  min,
  max,
  start = 0,
  onDone,
}: {
  min: number;
  max: number;
  start?: number;
  onDone?: () => void;
}) {
  const [n, setN] = useState(start);
  useEffect(() => onDone?.(), []);
  const v = clean(Math.pow(10, n));
  const size = SIZES[n];
  return (
    <div class="powers-widget" style={{ textAlign: 'center' }}>
      <div
        style={{
          fontSize: `${2.4 + n * 0.35}rem`,
          lineHeight: 1.2,
          minHeight: '4.2rem',
          transition: 'font-size .3s',
        }}
      >
        {size?.[0] ?? '✨'}
      </div>
      <div
        class="math-big"
        dangerouslySetInnerHTML={{ __html: renderMath(`10^{${n}} = ${tex(v)}`, true) }}
      />
      {size && (
        <div class="muted" style={{ marginBottom: '8px' }}>
          {n === 0 ? 'Exactly 1 — ' : ''}About the size of {size[1]} in metres
        </div>
      )}
      <div class="row" style={{ justifyContent: 'center', gap: '12px' }}>
        <button
          class="btn small"
          disabled={n <= min}
          onClick={() => {
            setN(n - 1);
            sfx('pop');
          }}
        >
          🔽 Shrink ÷10
        </button>
        <input
          type="range"
          min={min}
          max={max}
          value={n}
          onInput={(e) => setN(Number((e.target as HTMLInputElement).value))}
          style={{ flex: 1, maxWidth: '240px', accentColor: '#ffd166' }}
        />
        <button
          class="btn small gold"
          disabled={n >= max}
          onClick={() => {
            setN(n + 1);
            sfx('pop');
          }}
        >
          🔼 Grow ×10
        </button>
      </div>
    </div>
  );
}

/** Decimal hop: m × 10^exp by moving the point one place per tap. */
export function HopWidget({
  mantissa,
  exp,
  onDone,
}: {
  mantissa: number;
  exp: number;
  onDone?: () => void;
}) {
  const [hops, setHops] = useState(0);
  const total = Math.abs(exp);
  const dir = Math.sign(exp);
  const s = String(mantissa);
  const [intPart, frac = ''] = s.split('.');
  let digits = intPart + frac;
  let point = intPart.length + dir * hops;
  let added = new Set<number>();
  // Pad with zeros (marked as "added") when the point walks off either end.
  if (point > digits.length) {
    const pad = point - digits.length;
    added = new Set(Array.from({ length: pad }, (_, i) => digits.length + i));
    digits = digits + '0'.repeat(pad);
  }
  if (point < 1) {
    const pad = 1 - point;
    added = new Set(Array.from({ length: pad }, (_, i) => i));
    digits = '0'.repeat(pad) + digits;
    point = 1;
  }
  const finished = hops >= total;
  const hop = () => {
    if (finished) return;
    sfx('step');
    const h = hops + 1;
    setHops(h);
    if (h >= total) setTimeout(() => onDone?.(), 500);
  };
  const result = clean(mantissa * Math.pow(10, exp));
  return (
    <div class="hop-widget" style={{ textAlign: 'center' }}>
      <div
        class="math-big"
        dangerouslySetInnerHTML={{
          __html: renderMath(
            `${tex(mantissa)} \\times 10^{${exp}}${finished ? ` = ${tex(result)}` : ''}`,
            true,
          ),
        }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          gap: '4px',
          margin: '14px 0',
          flexWrap: 'wrap',
        }}
      >
        {digits.split('').map((d, i) => (
          <>
            <span
              key={`d${i}`}
              style={{
                width: '44px',
                height: '58px',
                borderRadius: '12px',
                display: 'grid',
                placeItems: 'center',
                fontFamily: 'var(--font-display)',
                fontSize: '2rem',
                fontWeight: 700,
                background: added.has(i) ? 'rgba(125, 211, 252, .25)' : 'rgba(255,255,255,.12)',
                color: added.has(i) ? '#7dd3fc' : '#fff',
                border: '2px solid rgba(255,255,255,.2)',
              }}
            >
              {d}
            </span>
            {i === point - 1 && i < digits.length - 1 && (
              <span
                key={`p${i}`}
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: 'var(--gold)',
                  boxShadow: '0 0 14px var(--gold)',
                  marginBottom: '4px',
                }}
              />
            )}
          </>
        ))}
      </div>
      <div class="row" style={{ justifyContent: 'center' }}>
        <button class="btn gold" disabled={finished} onClick={hop}>
          {dir > 0 ? 'Hop right ➡️' : '⬅️ Hop left'} ({hops}/{total})
        </button>
      </div>
      <p class="muted" style={{ marginTop: '8px' }}>
        {dir > 0
          ? 'A positive power makes the number bigger: the point hops right.'
          : 'A negative power makes the number smaller: the point hops left.'}
      </p>
    </div>
  );
}

/** Repeat-spell tower: base^exp built one floor (one multiplication) at a time. */
export function TowerWidget({
  base,
  exp,
  onDone,
  interactive = true,
}: {
  base: number;
  exp: number;
  onDone?: () => void;
  interactive?: boolean;
}) {
  const [floors, setFloors] = useState(interactive ? 1 : exp);
  const value = Math.pow(base, floors);
  const finished = floors >= exp;
  const add = () => {
    sfx('pop');
    const f = floors + 1;
    setFloors(f);
    if (f >= exp) setTimeout(() => onDone?.(), 400);
  };
  const colors = ['#ff5fa2', '#ffd166', '#5ee6a8', '#7dd3fc', '#9b7bff'];
  return (
    <div class="tower-widget" style={{ textAlign: 'center' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column-reverse',
          alignItems: 'center',
          gap: '4px',
          minHeight: `${exp * 46}px`,
          justifyContent: 'flex-start',
        }}
      >
        {Array.from({ length: floors }, (_, i) => (
          <div
            key={i}
            style={{
              width: `${120 + i * 26}px`,
              maxWidth: '90%',
              height: '40px',
              borderRadius: '10px',
              background: colors[i % colors.length],
              color: '#1b1033',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '1.2rem',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 4px 0 rgba(0,0,0,.3)',
              animation: 'pop-in .3s',
            }}
          >
            {i === 0 ? base : `× ${base}`}
          </div>
        ))}
      </div>
      <div
        class="math-big"
        dangerouslySetInnerHTML={{
          __html: renderMath(`${Array(floors).fill(base).join(' \\times ')} = ${value}`, true),
        }}
      />
      {interactive && (
        <button class="btn gold" disabled={finished} onClick={add}>
          {finished ? `${base}^${exp} built!` : `Add a floor: × ${base}`}
        </button>
      )}
    </div>
  );
}
