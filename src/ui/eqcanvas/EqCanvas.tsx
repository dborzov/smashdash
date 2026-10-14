/**
 * EQcanvas: the equation slate. Instead of picking a final answer, the player does the work
 * and gets feedback on every step:
 *
 *  1. **Write it.** Drag (or tap) the numbers from the story, x and the signs onto the slate.
 *     The slate draws the equation as it grows and reads it back in words ("8 legs on each
 *     spider × x (the number of spiders) + …"). On "Check", mistakes are explained and the
 *     tiles that don't fit the story turn red.
 *  2. **Solve it.** Pick a move (+ − × ÷ and an amount) and do it to both sides. The move is
 *     written into the equation, judged (did it free x, or bury it deeper?), and can be undone.
 *     The player works out the numbers; the slate shows what cancels. Every line is kept, like
 *     working on paper.
 *  3. **Answer it.** x goes back into the story and the equation, to check it.
 *
 * Logic lives in src/engine/eqcanvas.ts. In `demo` mode the slate plays itself, one tap of
 * "Next step" at a time, so lessons can show a worked example before the player tries one.
 */
import { Fragment } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { CanvasAnswer } from '../../skills/types';
import type { Outcome } from '../../engine/mastery';
import {
  applyMove,
  assessMove,
  bestMove,
  blocked,
  checkBuild,
  checkTex,
  eqFrom,
  eqTex,
  fEq,
  fInt,
  frac,
  fracTex,
  fVal,
  hasX,
  layerTex,
  moveTex,
  moveWords,
  outerLayer,
  parseEquation,
  parseStory,
  readEquation,
  solveSteps,
  solvedValue,
  syntaxMessage,
  tidyEq,
  tidyNote,
  toTex,
  tokensFor,
  type Assessment,
  type Equation,
  type Expr,
  type Frac,
  type Move,
  type OpSym,
  type Tok,
} from '../../engine/eqcanvas';
import { parseNumber } from '../../engine/answer';
import { Rich, RichInline } from '../components/Rich';
import { renderMath } from '../math';
import { sfx } from '../../audio/sfx';

export interface EqCanvasProps {
  spec: CanvasAnswer;
  /** 'free': hints on tap. 'paid': each problem's first hint goes through onHint. 'none': no
   * hint button (the step-by-step feedback and "Show me" still help). */
  hint?: 'free' | 'paid' | 'none';
  onHint?: () => boolean;
  hintLabel?: string;
  /** Called once, when the work is finished. */
  onComplete?: (o: Outcome) => void;
  /** Plays itself: the player taps "Next step" to watch a worked example. */
  demo?: boolean;
}

type Phase = 'build' | 'solve' | 'done';

interface Line {
  eq: Equation;
  move?: Move;
  note?: string;
}

interface Pending {
  move: Move;
  applied: Equation;
  after: Equation;
  verdict: Assessment;
  /** A bad move: waiting for "undo" or "keep going". */
  decide: boolean;
  /** Numbers to work out by hand: e.g. 51 − 3. */
  ask: { side: 'l' | 'r'; tex: string; value: Frac; wrongOp?: Frac } | null;
  notes: string[];
}

const OPS: { op: OpSym; sym: string; word: string }[] = [
  { op: '+', sym: '+', word: 'add' },
  { op: '-', sym: '−', word: 'take away' },
  { op: '*', sym: '×', word: 'multiply' },
  { op: '/', sym: '÷', word: 'divide' },
];

const SYM: Record<string, string> = { '+': '+', '-': '−', '*': '×', '/': '÷', '=': '=' };

const tokKey = (t: Tok) => (t.k === 'num' ? `n${t.v}:${t.tile ?? ''}` : t.k === 'op' ? t.op : t.k);

function tokLabel(t: Tok): string {
  if (t.k === 'num') return String(t.v);
  if (t.k === 'op') return SYM[t.op];
  return t.k;
}

/** LaTeX for a half-built row of tiles (so the slate can draw it as it grows). */
function partialTex(toks: Tok[]): string {
  return toks
    .map((t, i) => {
      const prev = toks[i - 1];
      const glue =
        prev &&
        (prev.k === 'num' || prev.k === 'x' || prev.k === ')') &&
        (t.k === 'x' || t.k === '(');
      // Two numbers side by side: keep a visible gap so 8 3 doesn't look like 83.
      if (prev?.k === 'num' && t.k === 'num') return `\\;\\;${fracTex(frac(t.v))}`;
      const s =
        t.k === 'num'
          ? fracTex(frac(t.v))
          : t.k === 'x'
            ? 'x'
            : t.k === 'op'
              ? { '+': '+', '-': '-', '*': '\\times', '/': '\\div' }[t.op]
              : t.k === '='
                ? '='
                : t.k === '('
                  ? '\\left('
                  : '\\right)';
      return (glue ? '' : ' ') + s;
    })
    .join('')
    .replace(/\\left\(([^()]*)$/, '($1');
}

const numsIn = (e: Expr): Frac[] =>
  e.t === 'num' ? [e.v] : e.t === 'x' ? [] : [...numsIn(e.a), ...numsIn(e.b)];

const plainValue = (f: Frac) => (f.d === 1 ? String(f.n) : `${f.n}/${f.d}`);

/** The non-x side as a sum to work out (51 − 3) if it is one simple whole-number sum. */
function arithmeticAsk(applied: Equation, after: Equation, m: Move): Pending['ask'] {
  for (const side of ['l', 'r'] as const) {
    const e = applied[side];
    if (hasX(e) || e.t === 'num' || e.t === 'x') continue;
    if (e.a.t !== 'num' || e.b.t !== 'num') continue;
    const res = after[side];
    if (res.t !== 'num' || !fInt(res.v) || Math.abs(fVal(res.v)) > 99999) continue;
    // The answer you'd get doing the opposite operation (a classic slip).
    const a = e.a.v,
      b = e.b.v;
    const opp =
      m.op === '+'
        ? frac(fVal(a) - fVal(b))
        : m.op === '-'
          ? frac(fVal(a) + fVal(b))
          : m.op === '*'
            ? frac(fVal(a) / fVal(b))
            : frac(fVal(a) * fVal(b));
    const tex = { '+': '+', '-': '-', '*': '\\times', '/': '\\div' }[m.op];
    return {
      side,
      tex: `${fracTex(a)} ${tex} ${fracTex(b)}`,
      value: res.v,
      wrongOp: opp,
    };
  }
  return null;
}

/** Splits a row of tiles into chunks for the demo: "8x", "+ 3", "= 51". */
function chunks(toks: Tok[]): Tok[][] {
  const out: Tok[][] = [];
  let cur: Tok[] = [];
  let depth = 0;
  for (const t of toks) {
    const boundary =
      depth === 0 && ((t.k === 'op' && (t.op === '+' || t.op === '-')) || t.k === '=');
    if (boundary && cur.length) {
      out.push(cur);
      cur = [];
    }
    if (t.k === '(') depth++;
    if (t.k === ')') depth--;
    cur.push(t);
  }
  if (cur.length) out.push(cur);
  return out;
}

function MathSpan({ tex, class: cls }: { tex: string; class?: string }) {
  return <span class={cls} dangerouslySetInnerHTML={{ __html: renderMath(tex) }} />;
}

export function EqCanvas({
  spec,
  hint = 'free',
  onHint,
  hintLabel,
  onComplete,
  demo,
}: EqCanvasProps) {
  const target = useMemo(() => eqFrom(spec.equation), [spec]);
  const building = spec.mode === 'build' || spec.mode === 'full';
  const story = useMemo(() => (spec.story ? parseStory(spec.story) : null), [spec]);
  const tiles = story?.tiles ?? [];
  const unknown = spec.unknown ?? 'the mystery number';
  const traps = useMemo(
    () => (spec.traps ?? []).map((t) => ({ eq: eqFrom(t.eq), text: t.text })),
    [spec],
  );

  const [phase, setPhase] = useState<Phase>(building ? 'build' : 'solve');
  const [slips, setSlips] = useState(0);
  const [reveals, setReveals] = useState(0);
  const [paid, setPaid] = useState(hint === 'free');
  const [say, setSay] = useState<string | null>(null);

  // ---- build state
  const [toks, setToks] = useState<Tok[]>([]);
  const [tries, setTries] = useState(0);
  const [msg, setMsg] = useState<{
    kind: 'syntax' | 'wrong' | 'right';
    text: string;
    bad: number[];
    tiles?: number[];
  } | null>(null);
  const [built, setBuilt] = useState<Equation | null>(null);
  const [scaffold, setScaffold] = useState(!!spec.scaffold);
  const [buildHints, setBuildHints] = useState(0);

  // ---- solve state
  const [lines, setLines] = useState<Line[]>(() => (building ? [] : [{ eq: target }]));
  const [op, setOp] = useState<OpSym | null>(null);
  const [amt, setAmt] = useState<Frac | 'x' | null>(null);
  const [custom, setCustom] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [askIn, setAskIn] = useState('');
  const [askTries, setAskTries] = useState(0);
  const [askMsg, setAskMsg] = useState<string | null>(null);
  const [stepSlips, setStepSlips] = useState(0);
  const [solveHints, setSolveHints] = useState(0);
  const [moveMsg, setMoveMsg] = useState<{ kind: 'good' | 'bad' | 'block'; text: string } | null>(
    null,
  );
  const [moveTries, setMoveTries] = useState(0);

  const cur = lines.length ? lines[lines.length - 1].eq : target;
  const outcome: Outcome = reveals > 0 ? 'wrong' : slips > 0 ? 'nudged' : 'right';

  useEffect(() => {
    if (phase === 'done') onComplete?.(outcome);
  }, [phase]);

  const slip = () => {
    setSlips((s) => s + 1);
    setStepSlips((s) => s + 1);
  };

  // ======================================================================
  // Build: tiles on the slate

  const slateRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{
    label: string;
    x: number;
    y: number;
    over: number | null;
    cls: string;
  } | null>(null);
  const usedTiles = new Set(
    toks.flatMap((t) => (t.k === 'num' && t.tile !== undefined ? [t.tile] : [])),
  );
  const locked = demo || phase !== 'build' || msg?.kind === 'right';

  const edit = (f: (t: Tok[]) => Tok[]) => {
    setToks((t) => f(t));
    setMsg((m) => (m?.kind === 'right' ? m : null));
  };
  const insert = (t: Tok, at?: number) => {
    if (
      t.k === 'num' &&
      t.tile !== undefined &&
      toks.some((q) => q.k === 'num' && q.tile === t.tile)
    )
      return;
    sfx('click');
    edit((arr) => {
      const n = arr.slice();
      n.splice(at ?? n.length, 0, t);
      return n;
    });
  };
  const removeAt = (i: number) => {
    sfx('pop');
    edit((arr) => arr.filter((_, j) => j !== i));
  };
  const moveTok = (from: number, to: number) => {
    sfx('click');
    edit((arr) => {
      const n = arr.slice();
      const [t] = n.splice(from, 1);
      n.splice(to > from ? to - 1 : to, 0, t);
      return n;
    });
  };

  /** Where on the slate a tile dropped at (x, y) would go; null if not over the slate. */
  const dropIndex = (x: number, y: number): number | null => {
    const el = slateRef.current;
    if (!el) return null;
    const box = el.getBoundingClientRect();
    if (x < box.left - 20 || x > box.right + 20 || y < box.top - 30 || y > box.bottom + 30)
      return null;
    const items = Array.from(el.querySelectorAll<HTMLElement>('[data-i]'));
    let rowLast = -1;
    for (const it of items) {
      const r = it.getBoundingClientRect();
      if (y < r.top - 10 || y > r.bottom + 10) continue;
      const i = Number(it.dataset.i);
      if (x < r.left + r.width / 2) return i;
      rowLast = i;
    }
    return rowLast >= 0 ? rowLast + 1 : items.length;
  };

  /** Pointer handling shared by every draggable tile: a tap places/removes, a drag moves. */
  const grab = (
    e: PointerEvent,
    label: string,
    cls: string,
    onTap: () => void,
    onDrop: (at: number | null) => void,
  ) => {
    if (locked || e.button > 0) return;
    const sx = e.clientX,
      sy = e.clientY;
    let moving = false;
    const move = (ev: PointerEvent) => {
      if (!moving && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 8) return;
      moving = true;
      ev.preventDefault();
      setDrag({
        label,
        cls,
        x: ev.clientX,
        y: ev.clientY,
        over: dropIndex(ev.clientX, ev.clientY),
      });
    };
    const end = (ev: PointerEvent, cancel = false) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancelH);
      setDrag(null);
      if (cancel) return;
      if (!moving) onTap();
      else onDrop(dropIndex(ev.clientX, ev.clientY));
    };
    const up = (ev: PointerEvent) => end(ev);
    const cancelH = (ev: PointerEvent) => end(ev, true);
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancelH);
  };

  /** A tile in the story or the tray: tap to add it at the end, drag to drop it anywhere. */
  const sourceProps = (t: Tok, cls: string) => ({
    onPointerDown: (e: PointerEvent) =>
      grab(
        e,
        tokLabel(t),
        cls,
        () => insert(t),
        (at) => at !== null && insert(t, at),
      ),
    // Keyboard (Enter/Space) clicks have detail 0; pointer taps are handled above.
    onClick: (e: MouseEvent) => e.detail === 0 && !locked && insert(t),
  });

  const parsed = useMemo(() => parseEquation(toks), [toks]);

  const check = () => {
    if (toks.length === 0) return;
    const v = checkBuild(toks, { target, tiles, unknown, traps });
    if (v.kind === 'syntax') {
      sfx('nudge');
      setMsg({ kind: 'syntax', text: v.text, bad: v.at >= 0 ? [v.at] : [] });
    } else if (v.kind === 'wrong') {
      sfx('nudge');
      slip();
      setTries((n) => n + 1);
      if (spec.words) setScaffold(true);
      setMsg({ kind: 'wrong', text: v.text, bad: v.bad, tiles: v.tiles });
    } else {
      sfx('right');
      setBuilt(v.eq);
      setMsg({
        kind: 'right',
        text: `That's the story! ${v.note ?? ''}`,
        bad: [],
      });
      if (spec.mode === 'build') setPhase('done');
    }
  };

  const showEquation = () => {
    sfx('page');
    setReveals((r) => r + 1);
    setToks(tokensFor(spec.equation, tiles));
    setBuilt(target);
    setMsg({
      kind: 'right',
      text: `Here it is. Read it out loud and match each piece to the story.`,
      bad: [],
    });
    if (spec.mode === 'build') setPhase('done');
  };

  const startSolve = () => {
    const mine = built ?? target;
    // Solve the player's own version when it can be solved by peeling layers; else the tidy one.
    const eq = solveSteps(mine, 4) ? mine : target;
    sfx('whoosh');
    setLines([{ eq }]);
    setPhase('solve');
  };

  // ======================================================================
  // Solve: moves on both sides

  const move: Move | null = op && amt !== null ? { op, k: amt } : null;
  const blockMsg = move ? blocked(move) : null;
  const preview = move && !blockMsg ? applyMove(cur, move) : null;

  const amounts = useMemo(() => {
    const seen: Frac[] = [];
    for (const n of [...numsIn(cur.l), ...numsIn(cur.r)]) {
      const a = frac(Math.abs(n.n), n.d);
      if (a.n !== 0 && !seen.some((s) => fEq(s, a))) seen.push(a);
    }
    return seen;
  }, [cur]);

  const commit = (p: Pending, extra?: string) => {
    const notes = [...p.notes, extra].filter(Boolean).join(' ');
    const next = [
      ...lines,
      { eq: p.applied, move: p.move },
      { eq: p.after, note: notes || undefined },
    ];
    setLines(next);
    setPending(null);
    setAskIn('');
    setAskTries(0);
    setAskMsg(null);
    setStepSlips(0);
    setSolveHints(0);
    if (solvedValue(p.after)) {
      sfx('win');
      setPhase('done');
    } else if (spec.mode === 'move') {
      setPhase('done');
    }
  };

  const doMove = (m: Move, shown = false) => {
    const verdict = assessMove(cur, m);
    const applied = applyMove(cur, m);
    const after = tidyEq(applied);
    const bad = verdict.kind === 'meh' || verdict.kind === 'worse';
    setOp(null);
    setAmt(null);
    setCustom(null);
    const notes: string[] = [];
    for (const side of ['l', 'r'] as const) {
      const n = tidyNote(applied[side], after[side], m);
      if (n) notes.push(n);
    }
    if (spec.mode === 'move') {
      if (bad) {
        sfx('nudge');
        slip();
        const t = moveTries + 1;
        setMoveTries(t);
        if (t >= 2) {
          const best = bestMove(cur)!;
          setReveals((r) => r + 1);
          setMoveMsg({
            kind: 'bad',
            text: `${verdict.text}\n\nThe move that works: **${moveWords(best)}**.`,
          });
          commit({
            move: best,
            applied: applyMove(cur, best),
            after: tidyEq(applyMove(cur, best)),
            verdict,
            decide: false,
            ask: null,
            notes: [],
          });
          return;
        }
        setMoveMsg({
          kind: 'bad',
          text: `If you ${moveWords(m)}, you get $${eqTex(after)}$.\n\n${verdict.text} Try another move.`,
        });
        return;
      }
      sfx('right');
      setMoveMsg({ kind: 'good', text: verdict.text });
      commit({ move: m, applied, after, verdict, decide: false, ask: null, notes });
      return;
    }
    if (bad) {
      sfx('nudge');
      slip();
    } else sfx(shown ? 'page' : 'zap');
    const p: Pending = {
      move: m,
      applied,
      after,
      verdict,
      decide: bad,
      ask: arithmeticAsk(applied, after, m),
      notes,
    };
    if (shown) {
      commit(p, p.ask ? `$${p.ask.tex} = ${fracTex(p.ask.value)}$.` : undefined);
      return;
    }
    setPending(p);
    setAskIn('');
    setAskTries(0);
    setAskMsg(null);
    if (!bad && !p.ask) commit(p);
  };

  const submitAsk = (typed: string) => {
    if (!pending?.ask) return;
    const n = parseNumber(typed);
    if (Number.isNaN(n)) return;
    const a = pending.ask;
    if (Math.abs(n - fVal(a.value)) < 1e-9) {
      sfx('right');
      commit(pending);
      return;
    }
    sfx('nudge');
    slip();
    const t = askTries + 1;
    setAskTries(t);
    setAskIn('');
    if (t >= 2) {
      setAskMsg(
        `It's $${fracTex(a.value)}$. Arithmetic slips happen to everyone — even Grimble. Mostly Grimble.`,
      );
      setTimeout(() => commit(pending, `$${a.tex} = ${fracTex(a.value)}$.`), 1400);
      return;
    }
    if (a.wrongOp && Math.abs(n - fVal(a.wrongOp)) < 1e-9)
      setAskMsg(`That's the **opposite** sum. Look at the sign: $${a.tex}$.`);
    else setAskMsg(`Not quite. Work out $${a.tex}$ again — no rush.`);
  };

  const undoPending = () => {
    sfx('whoosh');
    setPending(null);
  };

  const undoLast = () => {
    if (lines.length < 3 || pending) return;
    sfx('whoosh');
    setLines(lines.slice(0, -2));
    setMoveMsg(null);
  };

  const showMove = () => {
    let best = bestMove(cur);
    if (!best) {
      // Tangled up: go back to the start and show the first move from there.
      if (lines.length > 1) {
        setLines([lines[0]]);
        best = bestMove(lines[0].eq);
      }
      if (!best) return;
    }
    setReveals((r) => r + 1);
    setPending(null);
    setSolveHints(0);
    doMoveFrom(best);
  };
  // doMove reads `cur`; after a reset we need the fresh one, so defer a tick.
  const doMoveFrom = (m: Move) => setTimeout(() => doMoveRef.current(m, true), 0);
  const doMoveRef = useRef(doMove);
  doMoveRef.current = doMove;

  // ======================================================================
  // Hints (specific to where the player is, never "use x")

  const askHint = (): boolean => {
    if (paid || demo) return true;
    if (hint === 'paid' && onHint && onHint()) {
      setPaid(true);
      return true;
    }
    return false;
  };

  const buildHintList = spec.hints?.length
    ? spec.hints
    : [`Say the story in words first, then swap each part for its number or $x$.`];

  const solveHint = (): string => {
    const o = outerLayer(cur);
    const best = bestMove(cur);
    if (!best)
      return `Things got tangled. Tap **↩ Undo** to go back a step, then peel the **outside** layer off $x$.`;
    if (solveHints <= 1 && o)
      return `What's stuck to $x$ on the outside? The $${layerTex(o)}$ — it was the last thing done to $x$, so it comes off first. Do the **opposite**, on both sides.`;
    return `**${moveWords(best)[0].toUpperCase()}${moveWords(best).slice(1)}.**`;
  };

  const hintButton = (onClick: () => void, label?: string) =>
    hint !== 'none' || paid ? (
      <button class="btn small ghost eqc-hint-btn" onClick={() => askHint() && onClick()}>
        {paid || hint === 'free' ? (label ?? '📜 Hint') : (hintLabel ?? '📜 Hint')}
      </button>
    ) : null;

  // ======================================================================
  // Demo: the slate plays itself

  const demoNext = () => {
    if (phase === 'build') {
      if (msg?.kind === 'right') {
        setSay(`Now we solve it. The trick: whatever we do to one side, we do to the other.`);
        startSolve();
        return;
      }
      const all = tokensFor(spec.equation, tiles);
      const parts = chunks(all);
      let have = toks.length;
      const next = parts.find((c) => {
        have -= c.length;
        return have < 0;
      });
      if (next) {
        const piece = partialTex(next).trim();
        const nums = next.filter((t) => t.k === 'num');
        const what = nums
          .map((t) =>
            t.k === 'num' && t.tile !== undefined ? `$${t.v}$ is ${tiles[t.tile].means}` : '',
          )
          .filter(Boolean)
          .join('; ');
        setSay(
          next[0].k === '='
            ? `Everything adds up to the total, so: $${piece}$. ${what ? `(${what}.)` : ''}`
            : `$${piece}$${what ? ` — ${what}` : ''}${next.some((t) => t.k === 'x') ? `, and $x$ is ${unknown}` : ''}.`,
        );
        sfx('click');
        setToks((t) => [...t, ...next]);
        return;
      }
      setSay(`Let's check it against the story…`);
      check();
      return;
    }
    if (phase === 'solve') {
      if (pending?.ask) {
        setAskIn(plainValue(pending.ask.value));
        setSay(`Work out the numbers: $${pending.ask.tex} = ${fracTex(pending.ask.value)}$.`);
        setTimeout(() => commit(pending), 500);
        return;
      }
      const best = bestMove(cur);
      if (!best) return;
      if (!op || amt === null) {
        const o = outerLayer(cur);
        setSay(
          o
            ? `What's on the outside of $x$? $${layerTex(o)}$. Undo it: **${moveWords(best)}**.`
            : `**${moveWords(best)}**.`,
        );
        setOp(best.op);
        setAmt(best.k);
        return;
      }
      setSay(null);
      doMove(best);
    }
  };

  // ======================================================================
  // Rendering

  const stage = phase === 'build' ? 0 : phase === 'solve' ? 1 : 2;
  const xVal = frac(spec.x);
  const finalCheck = useMemo(() => checkTex(built ?? target, xVal), [built, target]);
  // Warn straight away about tiles that can never work (8 3 reads as 83), even mid-build.
  const glued = toks.findIndex(
    (t, i) => i > 0 && t.k === 'num' && (toks[i - 1].k === 'num' || toks[i - 1].k === 'x'),
  );
  const soft =
    glued > 0
      ? ({ code: toks[glued - 1].k === 'num' ? 'glued' : 'num-after-x', at: glued } as const)
      : !parsed.ok &&
          toks.length > 0 &&
          !['dangling', 'no-equals', 'right-empty', 'empty'].includes(parsed.err.code)
        ? parsed.err
        : null;

  return (
    <div class={`eqc ${demo ? 'demo' : ''}`}>
      {spec.mode === 'full' && (
        <div class="eqc-steps">
          {['Write it', 'Solve it', 'Answer it'].map((s, i) => (
            <span key={s} class={`eqc-step ${i === stage ? 'on' : i < stage ? 'done' : ''}`}>
              {i < stage ? '✓' : i + 1} {s}
            </span>
          ))}
        </div>
      )}

      {/* ---------- the story with its number tiles ---------- */}
      {story && (
        <div class="eqc-story">
          {story.parts.map((p, i) =>
            typeof p === 'string' ? (
              <RichInline key={i} text={p} />
            ) : (
              <button
                key={i}
                class={`eqc-chip ${usedTiles.has(p.tile) ? 'used' : ''} ${msg?.tiles?.includes(p.tile) ? 'flag' : ''}`}
                title={tiles[p.tile].means}
                disabled={phase !== 'build'}
                {...sourceProps({ k: 'num', v: tiles[p.tile].v, tile: p.tile }, 'num')}
              >
                {tiles[p.tile].v}
              </button>
            ),
          )}{' '}
          {spec.question && <b>{spec.question}</b>}
        </div>
      )}

      {/* ---------- 1. write the equation ---------- */}
      {phase === 'build' && (
        <>
          <div class="eqc-xkey">
            <span class="eqc-tile x static">x</span> = {unknown}
          </div>
          {scaffold && spec.words && (
            <div class="eqc-pattern">
              <span class="eqc-pattern-label">In words</span> <Rich text={spec.words} />
            </div>
          )}
          <div class="eqc-slate-wrap">
            <div
              ref={slateRef}
              class={`eqc-slate ${drag && drag.over !== null ? 'hot' : ''} ${msg?.kind === 'right' ? 'right' : ''}`}
            >
              {toks.length === 0 && !drag && (
                <span class="eqc-empty">
                  Drag the numbers from the story here — or just tap them.
                </span>
              )}
              {toks.map((t, i) => (
                <Fragment key={`${tokKey(t)}-${i}`}>
                  {drag?.over === i && <span class="eqc-caret" />}
                  <button
                    data-i={i}
                    class={`eqc-tile on-slate ${t.k} ${msg?.bad.includes(i) ? 'bad' : ''}`}
                    aria-label={`${tokLabel(t)} (tap to take it off)`}
                    onPointerDown={(e: PointerEvent) =>
                      grab(
                        e,
                        tokLabel(t),
                        t.k,
                        () => removeAt(i),
                        (at) => (at === null ? removeAt(i) : moveTok(i, at)),
                      )
                    }
                    onClick={(e: MouseEvent) => e.detail === 0 && !locked && removeAt(i)}
                  >
                    {tokLabel(t)}
                    {t.k === 'num' && t.tile !== undefined && (
                      <span class="eqc-means">{tiles[t.tile].means}</span>
                    )}
                  </button>
                </Fragment>
              ))}
              {drag?.over === toks.length && <span class="eqc-caret" />}
            </div>
          </div>

          <div class="eqc-look">
            {toks.length > 0 && (
              <div class="eqc-looks">
                <span class="eqc-pattern-label">Looks like</span>{' '}
                <MathSpan tex={parsed.ok ? eqTex(parsed.eq) : partialTex(toks) || '\\square'} />
              </div>
            )}
            {parsed.ok && (
              <div class="eqc-reads">
                <span class="eqc-pattern-label">Says</span>{' '}
                <RichInline text={readEquation(parsed.eq, toks, tiles, unknown)} />
              </div>
            )}
            {(!parsed.ok || soft) && toks.length > 0 && (
              <div class="eqc-status">
                {soft ? <RichInline text={'⚠️ ' + syntaxMessage(soft, toks)} /> : '…keep going'}
              </div>
            )}
          </div>

          {!locked && (
            <div class="eqc-tray">
              <button class="eqc-tile x" {...sourceProps({ k: 'x' }, 'x')}>
                x
              </button>
              {(['+', '-', '*', '/'] as OpSym[]).map((o) => (
                <button key={o} class="eqc-tile op" {...sourceProps({ k: 'op', op: o }, 'op')}>
                  {SYM[o]}
                </button>
              ))}
              <button class="eqc-tile eq" {...sourceProps({ k: '=' }, '=')}>
                =
              </button>
              {spec.equation.includes('(') && (
                <>
                  <button class="eqc-tile op" {...sourceProps({ k: '(' }, 'op')}>
                    (
                  </button>
                  <button class="eqc-tile op" {...sourceProps({ k: ')' }, 'op')}>
                    )
                  </button>
                </>
              )}
              <span class="spacer" />
              <button
                class="btn small ghost eqc-light-btn"
                disabled={toks.length === 0}
                onClick={() => removeAt(toks.length - 1)}
                aria-label="Take the last tile off"
              >
                ⌫
              </button>
              <button
                class="btn small ghost eqc-light-btn"
                disabled={toks.length === 0}
                onClick={() => {
                  sfx('whoosh');
                  edit(() => []);
                }}
              >
                🧽 Wipe
              </button>
            </div>
          )}

          {msg && (
            <div class={`feedback ${msg.kind === 'right' ? 'right' : 'nudge'}`}>
              <div class="title">
                {msg.kind === 'right'
                  ? '✨ Yes!'
                  : msg.kind === 'syntax'
                    ? '🤔 Not an equation yet'
                    : '🤔 Hmm — not this story'}
              </div>
              <Rich text={msg.text} />
            </div>
          )}

          {!demo && (
            <div class="row wrap eqc-actions">
              {msg?.kind !== 'right' && (
                <>
                  {buildHints < buildHintList.length &&
                    hintButton(() => {
                      sfx('page');
                      setBuildHints((h) => h + 1);
                      if (buildHints === 0 && spec.words) setScaffold(true);
                    })}
                  {tries >= 2 && (
                    <button class="btn small ghost eqc-light-btn" onClick={showEquation}>
                      👀 Show me
                    </button>
                  )}
                  <span class="spacer" />
                  <button class="btn mint" disabled={toks.length === 0} onClick={check}>
                    ✓ Check it
                  </button>
                </>
              )}
              {msg?.kind === 'right' && spec.mode === 'full' && (
                <>
                  <span class="spacer" />
                  <button class="btn gold" onClick={startSolve}>
                    Now solve it →
                  </button>
                </>
              )}
            </div>
          )}
          {buildHints > 0 && msg?.kind !== 'right' && (
            <div class="feedback hint">
              <div class="title">📜 Hint</div>
              {buildHintList.slice(0, buildHints).map((h, i) => (
                <Rich key={i} text={h} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ---------- 2. solve it, one move at a time ---------- */}
      {(phase === 'solve' || (phase === 'done' && lines.length > 0)) && (
        <>
          <div class="eqc-log">
            {lines.map((ln, i) => {
              const last = i === lines.length - 1 && !pending;
              const [l, r] = [toTex(ln.eq.l), toTex(ln.eq.r)];
              return (
                <div
                  key={i}
                  class={`eqc-line ${ln.move ? 'applied' : ''} ${last ? 'current' : ''}`}
                >
                  <span class="eqc-l">
                    <MathSpan tex={l} />
                  </span>
                  <span class="eqc-eq">
                    <MathSpan tex="=" />
                  </span>
                  <span class="eqc-r">
                    <MathSpan tex={r} />
                  </span>
                  <span class="eqc-ann">
                    {ln.move ? (
                      <span class="eqc-pill">
                        <MathSpan tex={moveTex(ln.move)} /> both sides
                      </span>
                    ) : i === 0 ? (
                      <span class="eqc-pill start">start</span>
                    ) : null}
                  </span>
                  {ln.note && (
                    <span class="eqc-note">
                      <RichInline text={ln.note} />
                    </span>
                  )}
                </div>
              );
            })}
            {pending && (
              <div class={`eqc-line applied pending ${pending.decide ? 'bad' : ''}`}>
                <span class="eqc-l">
                  <MathSpan tex={toTex(pending.applied.l)} />
                </span>
                <span class="eqc-eq">
                  <MathSpan tex="=" />
                </span>
                <span class="eqc-r">
                  <MathSpan tex={toTex(pending.applied.r)} />
                </span>
                <span class="eqc-ann">
                  <span class="eqc-pill">
                    <MathSpan tex={moveTex(pending.move)} /> both sides
                  </span>
                </span>
              </div>
            )}
            {preview && !pending && phase === 'solve' && (
              <div class="eqc-line preview">
                <span class="eqc-l">
                  <MathSpan tex={toTex(preview.l)} />
                </span>
                <span class="eqc-eq">
                  <MathSpan tex="=" />
                </span>
                <span class="eqc-r">
                  <MathSpan tex={toTex(preview.r)} />
                </span>
                <span class="eqc-ann">
                  <span class="eqc-pill ghost">preview</span>
                </span>
              </div>
            )}
          </div>

          {phase === 'solve' && pending?.decide && (
            <div class="feedback nudge">
              <div class="title">⚖️ Still balanced… but look</div>
              <Rich text={`It becomes $${eqTex(pending.after)}$.\n\n${pending.verdict.text}`} />
              {!demo && (
                <div class="row" style={{ marginTop: '8px' }}>
                  <button class="btn small mint" onClick={undoPending}>
                    ↩ Undo that move
                  </button>
                  <button
                    class="btn small ghost eqc-light-btn"
                    onClick={() => setPending({ ...pending, decide: false })}
                  >
                    Keep going anyway
                  </button>
                </div>
              )}
            </div>
          )}

          {phase === 'solve' && pending && !pending.decide && pending.ask && (
            <div class="eqc-ask">
              {pending.verdict.kind !== 'meh' && pending.verdict.kind !== 'worse' && (
                <div class="eqc-good">
                  <RichInline text={'✔ ' + pending.verdict.text} />
                </div>
              )}
              {pending.notes.map((n, i) => (
                <div key={i} class="eqc-good soft">
                  <RichInline text={n} />
                </div>
              ))}
              <div class="eqc-ask-row">
                <span>Work out the numbers:</span>
                <MathSpan tex={`${pending.ask.tex} =`} class="eqc-ask-sum" />
                <span class={`answer-box small ${askIn === '' ? 'empty' : ''}`}>{askIn}</span>
              </div>
              {askMsg && (
                <div class="feedback nudge">
                  <Rich text={askMsg} />
                </div>
              )}
              {!demo && (
                <MiniPad
                  value={askIn}
                  set={(v) => {
                    setAskIn(v);
                    setAskMsg((m) => (askTries >= 2 ? m : null));
                  }}
                  onGo={submitAsk}
                />
              )}
            </div>
          )}

          {phase === 'solve' && !pending && (
            <div class="eqc-tools">
              {moveMsg?.kind === 'bad' && (
                <div class="feedback nudge">
                  <Rich text={moveMsg.text} />
                </div>
              )}
              <div class="eqc-tool-label">
                {spec.mode === 'move'
                  ? 'Your move — to both sides:'
                  : 'Pick a move for both sides:'}
              </div>
              <div class="eqc-ops">
                {OPS.map((o) => (
                  <button
                    key={o.op}
                    class={`eqc-op ${op === o.op ? 'on' : ''}`}
                    disabled={demo}
                    onClick={() => {
                      sfx('click');
                      setOp(o.op);
                    }}
                  >
                    <b>{o.sym}</b>
                    <small>{o.word}</small>
                  </button>
                ))}
              </div>
              {op && (
                <div class="eqc-amts">
                  {amounts.map((a) => (
                    <button
                      key={plainValue(a)}
                      class={`eqc-tile num ${amt !== null && amt !== 'x' && fEq(amt, a) ? 'on' : ''}`}
                      disabled={demo}
                      onClick={() => {
                        sfx('click');
                        setCustom(null);
                        setAmt(a);
                      }}
                    >
                      {a.d === 1 ? a.n : <MathSpan tex={fracTex(a)} />}
                    </button>
                  ))}
                  {(op === '+' || op === '-') && (
                    <button
                      class={`eqc-tile x ${amt === 'x' ? 'on' : ''}`}
                      disabled={demo}
                      onClick={() => {
                        sfx('click');
                        setCustom(null);
                        setAmt('x');
                      }}
                    >
                      x
                    </button>
                  )}
                  <button
                    class={`eqc-tile other ${custom !== null ? 'on' : ''}`}
                    disabled={demo}
                    onClick={() => {
                      setAmt(null);
                      setCustom('');
                    }}
                  >
                    123…
                  </button>
                </div>
              )}
              {custom !== null && (
                <div class="eqc-custom">
                  <span class={`answer-box small ${custom === '' ? 'empty' : ''}`}>{custom}</span>
                  <MiniPad
                    value={custom}
                    set={setCustom}
                    onGo={(v) => {
                      const n = parseNumber(v);
                      if (!Number.isNaN(n)) setAmt(frac(n));
                    }}
                    goLabel="Use it"
                  />
                </div>
              )}
              {blockMsg && (
                <div class="feedback nudge">
                  <Rich text={blockMsg} />
                </div>
              )}
              {!demo && (
                <div class="row wrap eqc-actions">
                  {hintButton(() => {
                    sfx('page');
                    setSolveHints((h) => h + 1);
                  })}
                  {(solveHints >= 2 || stepSlips >= 2) && spec.mode !== 'move' && (
                    <button class="btn small ghost eqc-light-btn" onClick={showMove}>
                      👀 Show me
                    </button>
                  )}
                  {lines.length >= 3 && spec.mode !== 'move' && (
                    <button class="btn small ghost eqc-light-btn" onClick={undoLast}>
                      ↩ Undo
                    </button>
                  )}
                  <span class="spacer" />
                  <button
                    class="btn mint"
                    disabled={!move || !!blockMsg}
                    onClick={() => move && doMove(move)}
                  >
                    ⚖️ Do it to both sides
                  </button>
                </div>
              )}
              {solveHints > 0 && (
                <div class="feedback hint">
                  <div class="title">📜 Hint</div>
                  <Rich text={solveHint()} />
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ---------- 3. the answer, checked ---------- */}
      {phase === 'done' && (
        <div class="eqc-done">
          {spec.mode === 'build' ? (
            <Rich text={`$x$ is ${unknown}, and the story is $${eqTex(built ?? target)}$.`} />
          ) : spec.mode === 'move' ? (
            moveMsg && <Rich text={moveMsg.kind === 'good' ? `✔ ${moveMsg.text}` : moveMsg.text} />
          ) : (
            <>
              <div class="eqc-answer">
                <MathSpan tex={`x = ${fracTex(xVal)}`} />
                {spec.unit && (
                  <span>
                    {' '}
                    →{' '}
                    <b>
                      {fmtNum(spec.x)} {spec.unit}
                    </b>
                  </span>
                )}
              </div>
              {spec.unknown && (
                <div class="muted-ink">
                  <RichInline
                    text={`$x$ was ${spec.unknown}, so that answers *${spec.question ?? 'the question'}*`}
                  />
                </div>
              )}
              <div class="eqc-check">
                <span class="eqc-pattern-label">Check it</span> <MathSpan tex={finalCheck.tex} />{' '}
                {finalCheck.ok ? '✓' : ''}
              </div>
            </>
          )}
        </div>
      )}

      {demo && phase !== 'done' && (
        <div class="eqc-demo-bar">
          {say && (
            <div class="eqc-say">
              <RichInline text={say} />
            </div>
          )}
          <button class="btn gold" onClick={demoNext}>
            ▶ Next step
          </button>
        </div>
      )}

      {drag && (
        <div
          class={`eqc-ghost eqc-tile ${drag.cls}`}
          style={{ left: `${drag.x}px`, top: `${drag.y}px` }}
        >
          {drag.label}
        </div>
      )}
    </div>
  );
}

function fmtNum(n: number): string {
  return n.toLocaleString('en-US');
}

/** A small keypad for working out numbers and choosing amounts. */
function MiniPad({
  value,
  set,
  onGo,
  goLabel = '✓',
}: {
  value: string;
  set: (v: string) => void;
  onGo: (v: string) => void;
  goLabel?: string;
}) {
  // Keys can arrive faster than renders: always build on the latest value.
  const cur = useRef(value);
  cur.current = value;
  const go = useRef(onGo);
  go.current = onGo;
  const press = (k: string) => {
    sfx('click');
    const v = cur.current;
    const next =
      k === '⌫'
        ? v.slice(0, -1)
        : k === '−'
          ? v.startsWith('-')
            ? v.slice(1)
            : '-' + v
          : k === '.'
            ? v.includes('.')
              ? v
              : (v || '0') + '.'
            : v.replace(/[-.]/g, '').length >= 7
              ? v
              : v === '0'
                ? k
                : v + k;
    cur.current = next;
    set(next);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('⌫');
      else if (e.key === '-') press('−');
      else if (e.key === '.') press('.');
      else if (e.key === 'Enter') {
        e.preventDefault();
        go.current(cur.current);
      } else return;
      e.stopPropagation();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div class="eqc-pad">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.', '−', '⌫'].map((k) => (
        <button key={k} class={`key ${/[0-9]/.test(k) ? '' : 'fn'}`} onClick={() => press(k)}>
          {k}
        </button>
      ))}
      <button class="key go" disabled={value === '' || value === '-'} onClick={() => onGo(value)}>
        {goLabel}
      </button>
    </div>
  );
}
