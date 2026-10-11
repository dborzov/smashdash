/**
 * Distributive-law widgets for the Mirrormaze Caves.
 *  - GroupsWidget: n copies of a parcel (x boxes + c coins). With `sort`, tap each parcel to
 *    unpack it into a box pile and a coin pile, which shows n(x + c) = nx + nc.
 *  - AreaWidget: a rows × (tens ± extra) grid of crystals. 7 × 12 is a 7 × 10 slab plus a
 *    7 × 2 strip; 7 × 9 is a 7 × 10 slab with one column eaten by a bat.
 */
import { useEffect, useState } from 'preact/hooks';
import { renderMath } from '../math';
import { Coin, Crate } from './Boxes';
import { sfx } from '../../audio/sfx';

const coefTex = (k: number) => (k === 1 ? 'x' : `${k}x`);

function Mathy({ tex }: { tex: string }) {
  return <div class="math-big" dangerouslySetInnerHTML={{ __html: renderMath(tex, true) }} />;
}

function Parcel({
  x,
  c,
  open,
  onTap,
  tappable,
}: {
  x: number;
  c: number;
  open: boolean;
  onTap?: () => void;
  tappable: boolean;
}) {
  return (
    <button
      class={`parcel ${open ? 'open' : ''} ${tappable && !open ? 'anim-bob' : ''}`}
      onClick={onTap}
      disabled={!tappable || open}
      aria-label={open ? 'unpacked parcel' : 'parcel: tap to unpack'}
    >
      {open ? (
        <span class="parcel-empty">✨</span>
      ) : (
        <>
          {Array.from({ length: x }, (_, i) => (
            <Crate key={`x${i}`} size={38} />
          ))}
          <span class="parcel-coins">
            {Array.from({ length: c }, (_, i) => (
              <Coin key={i} size={20} />
            ))}
          </span>
        </>
      )}
    </button>
  );
}

export function GroupsWidget({
  n,
  x = 1,
  c,
  sort,
  onDone,
}: {
  n: number;
  x?: number;
  c: number;
  sort?: boolean;
  onDone?: () => void;
}) {
  const [opened, setOpened] = useState<boolean[]>(() => Array(n).fill(false));
  const count = opened.filter(Boolean).length;
  const all = count === n;
  useEffect(() => {
    if (!sort) onDone?.();
  }, []);
  const tap = (i: number) => {
    if (!sort || opened[i]) return;
    sfx('pop');
    const next = opened.slice();
    next[i] = true;
    setOpened(next);
    if (next.every(Boolean)) setTimeout(() => onDone?.(), 400);
  };
  const parcel = `(${coefTex(x)} + ${c})`;
  const boxes = count * x;
  const coins = count * c;
  return (
    <div class="groups-widget">
      <Mathy tex={`${n}${parcel}`} />
      <div class="parcels">
        {opened.map((o, i) => (
          <Parcel key={i} x={x} c={c} open={o} tappable={!!sort} onTap={() => tap(i)} />
        ))}
      </div>
      {sort && (
        <>
          <div class="piles">
            <div class="pile">
              <div class="pile-items">
                {Array.from({ length: boxes }, (_, i) => (
                  <Crate key={i} size={30} />
                ))}
              </div>
              <b>
                {boxes} {boxes === 1 ? 'box' : 'boxes'}
              </b>
            </div>
            <div class="pile">
              <div class="pile-items">
                {Array.from({ length: coins }, (_, i) => (
                  <Coin key={i} size={18} />
                ))}
              </div>
              <b>
                {coins} {coins === 1 ? 'coin' : 'coins'}
              </b>
            </div>
          </div>
          {all ? (
            <Mathy
              tex={`${n}${parcel} = ${Array(Math.min(n, 4)).fill(parcel).join(' + ')}${n > 4 ? ' + \\cdots' : ''} = \\hl{${coefTex(n * x)} + ${n * c}}`}
            />
          ) : (
            <div class="muted center">
              Tap each parcel to unpack it ({count} / {n})
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

export function AreaWidget({
  rows,
  tens,
  extra,
  tap,
  onDone,
}: {
  rows: number;
  tens: number;
  extra: number;
  tap?: boolean;
  onDone?: () => void;
}) {
  const [bigSeen, setBigSeen] = useState(!tap);
  const [stripSeen, setStripSeen] = useState(!tap);
  useEffect(() => {
    if (!tap) onDone?.();
  }, []);
  const plus = extra > 0;
  const k = Math.abs(extra);
  const cols = tens + (plus ? k : 0);
  const cell = Math.max(10, Math.min(30, Math.floor(420 / cols)));
  const gapX = plus ? 10 : 0;
  const W = cols * cell + gapX + 8;
  const H = rows * cell + 8;
  const both = bigSeen && stripSeen;

  const reveal = (which: 'big' | 'strip') => {
    if (!tap) return;
    if (which === 'big' && !bigSeen) {
      sfx('pop');
      setBigSeen(true);
      if (stripSeen) setTimeout(() => onDone?.(), 400);
    }
    if (which === 'strip' && !stripSeen) {
      sfx(plus ? 'pop' : 'crack');
      setStripSeen(true);
      if (bigSeen) setTimeout(() => onDone?.(), 400);
    }
  };

  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const inStrip = plus ? c >= tens : c >= tens - k;
      const eaten = !plus && inStrip && stripSeen;
      const x = 4 + c * cell + (plus && c >= tens ? gapX : 0);
      const y = 4 + r * cell;
      cells.push(
        <rect
          key={`${r}-${c}`}
          x={x + 1.5}
          y={y + 1.5}
          width={cell - 3}
          height={cell - 3}
          rx={cell / 5}
          class={`crystal ${inStrip ? (plus ? 'strip' : 'doomed') : 'big'} ${eaten ? 'eaten' : ''}`}
          onClick={() => reveal(inStrip ? 'strip' : 'big')}
        />,
      );
    }
  }
  const bigVal = rows * tens;
  const stripVal = rows * k;
  const op = plus ? '+' : '-';
  return (
    <div class="area-widget">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        class="area-svg"
        role="img"
        aria-label={`${rows} by ${tens} grid`}
      >
        {cells}
        {!plus && stripSeen && (
          <text x={4 + (tens - k / 2) * cell} y={H / 2} text-anchor="middle" font-size={cell * 1.6}>
            🦇
          </text>
        )}
      </svg>
      <div class="row" style={{ justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <button
          class={`btn small ${bigSeen ? 'gold' : ''}`}
          onClick={() => reveal('big')}
          disabled={!tap || bigSeen}
        >
          {bigSeen ? `${rows} × ${tens} = ${bigVal}` : `Tap the big slab`}
        </button>
        <button
          class={`btn small ${stripSeen ? 'mint' : ''}`}
          onClick={() => reveal('strip')}
          disabled={!tap || stripSeen}
        >
          {stripSeen
            ? `${plus ? '+' : '−'} ${rows} × ${k} = ${stripVal}`
            : plus
              ? `Tap the little strip`
              : `Feed the bat 🦇`}
        </button>
      </div>
      {both && (
        <Mathy
          tex={`${rows} \\times ${tens + extra} = ${rows} \\times ${tens} ${op} ${rows} \\times ${k} = ${bigVal} ${op} ${stripVal} = \\hl{${rows * (tens + extra)}}`}
        />
      )}
    </div>
  );
}
