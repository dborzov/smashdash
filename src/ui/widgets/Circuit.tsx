/**
 * Electricity widgets for the Sparkwick Junkyard.
 *
 *  - CircuitWidget: a loop of wire with a pack of AA cells, a bulb or motor, and maybe some
 *    "mud tunnel" resistors. Baby electrons (blue dots) crawl from the − end round to the
 *    Nanny Ions at the + end — faster when the current is bigger. With tools it becomes a
 *    workshop: add/remove cells and mud, flip a cell, close the gap, hit a target current.
 *  - PipeWidget: the water analogy. Tank height = push (volts), pipe squeeze = resistance,
 *    water flow = current, and flow = height ÷ squeeze.
 *
 * All motion is CSS animation, so `prefers-reduced-motion` stills it.
 */
import { useEffect, useState } from 'preact/hooks';
import type { CircuitPic } from '../../skills/types';
import { circuitState } from '../../skills/electricity';
import { fmt } from '../../skills/util';
import { RichInline } from '../components/Rich';
import { sfx } from '../../audio/sfx';

const L = 34;
const R = 406;
const T = 58;
const B = 196;
const CELL_W = 42;

function Cell({ x, flipped }: { x: number; flipped: boolean }) {
  return (
    <g transform={`translate(${x} ${B}) ${flipped ? 'scale(-1 1)' : ''}`}>
      <rect x="-17" y="-11" width="30" height="22" rx="5" class="aa-body" />
      <rect x="5" y="-11" width="8" height="22" rx="2" class="aa-top" />
      <rect x="13" y="-5" width="4" height="10" rx="1.5" class="aa-nub" />
      <text
        x="-4"
        y="5"
        text-anchor="middle"
        class="aa-label"
        transform={flipped ? 'scale(-1 1) translate(8 0)' : undefined}
      >
        {flipped ? '↺' : '+'}
      </text>
    </g>
  );
}

function Mud({ y, ohms }: { y: number; ohms: number }) {
  const zig = `M${R} ${y - 10} l8 3 l-16 4 l16 4 l-16 4 l8 3`;
  return (
    <g>
      <rect x={R - 13} y={y - 13} width="26" height="26" rx="6" class="mud" />
      <path d={zig} class="mud-zig" />
      <text x={R + 18} y={y + 5} class="mud-label">
        {fmt(ohms)}Ω
      </text>
    </g>
  );
}

function Load({
  kind,
  amps,
  popped,
  reversed,
}: {
  kind: 'bulb' | 'motor';
  amps: number;
  popped: boolean;
  reversed: boolean;
}) {
  const cx = (L + R) / 2;
  const glow = popped ? 0 : Math.min(1, amps / 2.5);
  if (kind === 'bulb') {
    return (
      <g transform={`translate(${cx} ${T})`}>
        <circle r={20 + glow * 26} class="bulb-glow" style={{ opacity: glow }} />
        <circle cy="-6" r="20" class={`bulb-glass ${popped ? 'popped' : ''}`} />
        <path
          d="M-7 4 L-4 -12 L0 -4 L4 -12 L7 4"
          class="filament"
          style={{ stroke: glow > 0 ? '#fff3b0' : '#7a6a50' }}
        />
        <rect x="-10" y="8" width="20" height="10" rx="3" class="bulb-base" />
        {popped && (
          <text y="-34" text-anchor="middle" font-size="26" class="anim-bob">
            💨
          </text>
        )}
      </g>
    );
  }
  const dur = amps > 0 && !popped ? Math.max(0.12, 1.4 / amps) : 0;
  return (
    <g transform={`translate(${cx} ${T})`}>
      <circle r="22" class="motor" />
      <g
        class="fan"
        style={{
          animation: dur
            ? `spin ${dur}s linear infinite ${reversed ? 'reverse' : 'normal'}`
            : 'none',
        }}
      >
        {[0, 120, 240].map((a) => (
          <path
            key={a}
            d="M0 0 Q6 -8 0 -17 Q-6 -8 0 0"
            transform={`rotate(${a})`}
            class="fan-blade"
          />
        ))}
      </g>
      <circle r="4" fill="#2a1c10" />
      {popped && (
        <text y="-28" text-anchor="middle" font-size="26" class="anim-bob">
          💨
        </text>
      )}
    </g>
  );
}

export function CircuitWidget(
  props: CircuitPic & { onDone?: () => void; interactive?: boolean; quiz?: boolean },
) {
  const { onDone, interactive = true, quiz = false } = props;
  const tools = interactive ? (props.tools ?? []) : [];
  const [cells, setCells] = useState(props.cells);
  const [flipped, setFlipped] = useState(props.flipped ?? 0);
  const [mud, setMud] = useState(props.mud ?? 0);
  const [gap, setGap] = useState(!!props.gap);
  const [won, setWon] = useState(false);
  const pic: CircuitPic = { ...props, cells, flipped, mud, gap };
  const { volts, ohms, amps, closed, reversed } = circuitState(pic);
  const fuse = props.fuse;
  const popped = fuse !== undefined && amps > fuse;
  const load = props.load ?? 'bulb';
  const goal = interactive ? props.goal : undefined;
  const readout = props.readout ?? tools.some((t) => t === 'cells' || t === 'mud');

  useEffect(() => {
    if (!goal) onDone?.();
  }, []);
  // Is the goal met right now? (`won` remembers that it was met once, which finishes the beat.)
  const ok =
    goal === 'close'
      ? closed && amps > 0
      : goal === 'volts'
        ? volts === props.target && !reversed
        : goal === 'amps'
          ? amps === props.target && !popped
          : false;
  useEffect(() => {
    if (won || !goal) return;
    if (ok) {
      setWon(true);
      sfx('buzz');
      setTimeout(() => onDone?.(), 500);
    } else if (popped) sfx('crack');
  }, [cells, flipped, mud, gap]);

  const packW = Math.max(1, cells) * CELL_W;
  const cx = (L + R) / 2;
  const p0 = cx - packW / 2;
  const p1 = cx + packW / 2;
  const gapTop = 112;
  const gapBot = 142;
  // Which cells are flipped: the last `flipped` ones, so it's easy to spot.
  const cellEls = Array.from({ length: cells }, (_, i) => (
    <Cell key={i} x={p0 + CELL_W / 2 + i * CELL_W} flipped={i >= cells - flipped} />
  ));
  // The electrons' road, from the − end of the pack all the way round to the + end.
  const road = props.sameEnd
    ? `M${p0} ${B} L${L} ${B} L${L} ${T} L${R} ${T} L${R} ${B} L${R} ${B + 44} L${p0 - 16} ${B + 44} L${p0 - 16} ${B} L${p0} ${B}`
    : `M${p0} ${B} L${L} ${B} L${L} ${T} L${R} ${T} L${R} ${B} L${p1} ${B}`;
  // In a quiz picture nothing moves or glows, so the picture doesn't give the answer away.
  const flowing = closed && amps > 0 && !popped && !quiz;
  const dur = flowing ? Math.min(6, Math.max(0.18, 1.6 / amps)) : 0;
  const mudOhms = props.mudOhms ?? 3;
  const mudEls = Array.from({ length: mud }, (_, i) => {
    const span = B - T - 40;
    const y = T + 20 + (span * (i + 0.5)) / mud;
    return <Mud key={i} y={y} ohms={mudOhms} />;
  });

  const status = !goal
    ? null
    : goal === 'close'
      ? ok
        ? `The loop is complete — the babies are crawling home to Nanny!`
        : `There's a gap! Tap it to join the wire.`
      : goal === 'volts'
        ? ok
          ? `$${fmt(volts)}\\,\\text{V}$ of push. Zoom zoom!`
          : `Push: $${fmt(volts)}\\,\\text{V}$. Goal: $${fmt(props.target!)}\\,\\text{V}$.`
        : ok
          ? load === 'motor'
            ? `Perfect! Exactly $${fmt(props.target!)}\\,\\text{A}$. Nugget is ready to RAM!`
            : `Perfect! Exactly $${fmt(props.target!)}\\,\\text{A}$. A lovely glow.`
          : popped
            ? `POOF! Over $${fmt(fuse!)}\\,\\text{A}$ and the fuse blows. Too much push — or not enough squeeze!`
            : amps === 0
              ? `Nothing's flowing. Is there any push? Is the loop complete?`
              : amps < props.target!
                ? `$${fmt(amps)}\\,\\text{A}$: not enough flow! The goal is $${fmt(props.target!)}\\,\\text{A}$.`
                : `$${fmt(amps)}\\,\\text{A}$: too much flow! The goal is $${fmt(props.target!)}\\,\\text{A}$.`;

  return (
    <div class="circuit-widget">
      <svg viewBox="0 0 440 270" class="circuit-svg" role="img" aria-label="circuit">
        <rect x="0" y="0" width="440" height="270" rx="18" class="circuit-bg" />
        {/* wires */}
        <path d={road} class="wire" />
        {/* the gap */}
        {gap && (
          <>
            <rect
              x={L - 8}
              y={gapTop}
              width="16"
              height={gapBot - gapTop}
              class="circuit-bg-fill"
            />
            <circle cx={L} cy={gapTop} r="4" class="wire-end" />
            <circle cx={L} cy={gapBot} r="4" class="wire-end" />
            {tools.includes('close') && (
              <g
                class="gap-btn anim-bob"
                onClick={() => {
                  sfx('pop');
                  setGap(false);
                }}
              >
                <circle cx={L + 26} cy={(gapTop + gapBot) / 2} r="20" />
                <text x={L + 26} y={(gapTop + gapBot) / 2 + 7} text-anchor="middle" font-size="20">
                  🔗
                </text>
              </g>
            )}
          </>
        )}
        {/* baby electrons */}
        <path
          d={road}
          class={`electrons ${flowing ? 'flowing' : ''}`}
          style={{
            animationDuration: flowing ? `${dur}s` : undefined,
            animationDirection: reversed ? 'reverse' : 'normal',
          }}
        />
        {gap && (
          <rect
            x={L - 6}
            y={gapTop + 5}
            width="12"
            height={gapBot - gapTop - 10}
            class="circuit-bg-fill"
          />
        )}
        {mudEls}
        <Load kind={load} amps={quiz ? 0 : amps} popped={popped && !quiz} reversed={reversed} />
        {cells === 0 ? (
          <text x={cx} y={B + 6} text-anchor="middle" class="mud-label">
            (no batteries!)
          </text>
        ) : (
          cellEls
        )}
        <text x={p0 - 6} y={B + 34} text-anchor="end" class="terminal">
          {reversed ? '+ 👵' : '− 👶'}
        </text>
        <text x={p1 + 6} y={B + 34} class="terminal">
          {reversed ? '👶 −' : '👵 +'}
        </text>
      </svg>
      {readout && !quiz && (
        <div class="circuit-readout">
          <RichInline
            text={`Push $V = ${fmt(volts)}\\,\\text{V}$ · Squeeze $R = ${fmt(ohms)}\\,\\Omega$ · Flow $I = ${closed ? `\\frac{${fmt(volts)}}{${fmt(ohms)}} = ` : ''}${fmt(amps)}\\,\\text{A}$`}
          />
        </div>
      )}
      {tools.length > 0 && (
        <div class="row circuit-tools">
          {tools.includes('cells') && (
            <>
              <button
                class="btn small"
                disabled={cells <= 0}
                onClick={() => {
                  sfx('click');
                  setCells(cells - 1);
                  setFlipped(Math.min(flipped, cells - 1));
                }}
              >
                ➖ AA
              </button>
              <button
                class="btn small gold"
                disabled={cells >= 8}
                onClick={() => {
                  sfx('pop');
                  setCells(cells + 1);
                }}
              >
                ➕ AA
              </button>
            </>
          )}
          {tools.includes('flip') && (
            <button
              class="btn small"
              disabled={cells === 0}
              onClick={() => {
                sfx('click');
                setFlipped(flipped > 0 ? flipped - 1 : 1);
              }}
            >
              {flipped > 0 ? '↻ Unflip' : '↺ Flip one'}
            </button>
          )}
          {tools.includes('mud') && (
            <>
              <button
                class="btn small"
                disabled={mud <= 0}
                onClick={() => {
                  sfx('click');
                  setMud(mud - 1);
                }}
              >
                ➖ Mud
              </button>
              <button
                class="btn small mint"
                disabled={mud >= 6}
                onClick={() => {
                  sfx('splash');
                  setMud(mud + 1);
                }}
              >
                ➕ Mud ({fmt(mudOhms)}Ω)
              </button>
            </>
          )}
        </div>
      )}
      {status && (
        <div class={`circuit-status ${ok ? 'good-text' : popped ? 'bad-text' : ''}`}>
          {goal === 'amps' && !ok && <span class="chip">🎯 Goal: {fmt(props.target!)} A</span>}{' '}
          <RichInline text={status} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

const PIPE = [0, 26, 17, 11, 7];

export function PipeWidget({
  height,
  squeeze,
  target,
  onDone,
}: {
  height: number;
  squeeze: number;
  target?: number;
  onDone?: () => void;
}) {
  const [h, setH] = useState(height);
  const [s, setS] = useState(squeeze);
  const [won, setWon] = useState(false);
  const flow = Math.round((h / s) * 100) / 100;
  useEffect(() => {
    if (target === undefined) onDone?.();
  }, []);
  useEffect(() => {
    if (target === undefined || won) return;
    if (flow === target && (h !== height || s !== squeeze)) {
      setWon(true);
      sfx('splash');
      setTimeout(() => onDone?.(), 500);
    }
  }, [h, s]);

  const ground = 236;
  const tankBottom = ground - 30 - h * 26;
  const tankTop = tankBottom - 46;
  const wheel = { x: 352, y: 196 };
  const pipe = `M112 ${tankBottom - 12} C 200 ${tankBottom - 12}, 230 ${wheel.y - 30}, ${wheel.x - 30} ${wheel.y - 30}`;
  const dur = Math.min(5, Math.max(0.2, 1.5 / flow));
  return (
    <div class="pipe-widget">
      <svg viewBox="0 0 440 260" class="circuit-svg" role="img" aria-label="water tank and pipe">
        <rect x="0" y="0" width="440" height="260" rx="18" class="circuit-bg" />
        <rect x="0" y={ground} width="440" height={260 - ground} class="pipe-ground" />
        {/* stand */}
        <path
          d={`M44 ${tankBottom} L36 ${ground} M100 ${tankBottom} L108 ${ground}`}
          class="pipe-stand"
        />
        {/* tank */}
        <rect x="30" y={tankTop} width="84" height="46" rx="8" class="tank" />
        <rect x="34" y={tankTop + 8} width="76" height="34" rx="5" class="tank-water" />
        <text x="72" y={tankTop - 8} text-anchor="middle" class="mud-label">
          👶👶👶
        </text>
        {/* pipe: outer, then the water inside */}
        <path d={pipe} class="pipe-outer" style={{ strokeWidth: PIPE[s] + 8 }} />
        <path d={pipe} class="pipe-water" style={{ strokeWidth: PIPE[s] }} />
        <path
          d={pipe}
          class="pipe-flow"
          style={{ strokeWidth: Math.max(3, PIPE[s] - 6), animationDuration: `${dur}s` }}
        />
        {/* waterwheel */}
        <g transform={`translate(${wheel.x} ${wheel.y})`}>
          <g style={{ animation: `spin ${dur * 2.5}s linear infinite` }}>
            <circle r="34" class="wheel" />
            {[0, 45, 90, 135].map((a) => (
              <path key={a} d="M-34 0 L34 0" transform={`rotate(${a})`} class="wheel-spoke" />
            ))}
          </g>
          <circle r="6" fill="#5a3a20" />
        </g>
        <text x="352" y="252" text-anchor="middle" class="mud-label">
          👵 Nanny's pond
        </text>
      </svg>
      <div class="circuit-readout">
        Height <b>{h}</b> ÷ squeeze <b>{s}</b> = flow <b>{fmt(flow)}</b>
        {target !== undefined && flow !== target && (
          <span class="chip" style={{ marginLeft: '8px' }}>
            🎯 Goal: flow {fmt(target)}
          </span>
        )}
      </div>
      <div class="row circuit-tools">
        <button class="btn small gold" disabled={h >= 6} onClick={() => (sfx('pop'), setH(h + 1))}>
          ⬆ Raise tank
        </button>
        <button class="btn small" disabled={h <= 1} onClick={() => (sfx('click'), setH(h - 1))}>
          ⬇ Lower
        </button>
        <button
          class="btn small mint"
          disabled={s <= 1}
          onClick={() => (sfx('splash'), setS(s - 1))}
        >
          ↔ Wider pipe
        </button>
        <button class="btn small" disabled={s >= 4} onClick={() => (sfx('click'), setS(s + 1))}>
          🤏 Squeeze pipe
        </button>
      </div>
      <div class="row pipe-key">
        <span class="chip">⬆ height = volts (push)</span>
        <span class="chip">🤏 squeeze = ohms</span>
        <span class="chip">🌊 flow = amps</span>
      </div>
      {won && flow === target && (
        <div class="circuit-status good-text">
          Splendid splashing! Flow {fmt(flow)} — just right.
        </div>
      )}
    </div>
  );
}
