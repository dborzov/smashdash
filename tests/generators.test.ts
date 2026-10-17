import { validateGame } from '../src/games';
import { describe, expect, it } from 'vitest';
import { generators } from '../src/skills';
import { Rng } from '../src/engine/rng';
import type { Level } from '../src/skills/types';
import { renderMath } from '../src/ui/math';
import { skillById } from '../src/content';
import {
  applyMove,
  assessMove,
  bestMove,
  checkBuild,
  eqFrom,
  fInt,
  frac,
  fEq,
  parseStory,
  sameEquation,
  solutionOf,
  solveSteps,
  tidyEq,
  tokensFor,
  type Expr,
} from '../src/engine/eqcanvas';
import type { CanvasAnswer } from '../src/skills/types';

const nums = (e: Expr): ReturnType<typeof frac>[] =>
  e.t === 'num' ? [e.v] : e.t === 'x' ? [] : [...nums(e.a), ...nums(e.b)];

/** A canvas problem must be buildable from its tiles and solvable in friendly whole numbers. */
function checkCanvas(a: CanvasAnswer, ctx: string) {
  const eq = eqFrom(a.equation);
  expect(fEq(solutionOf(eq)!, frac(a.x)), `${ctx}: x solves it`).toBe(true);
  if (a.mode === 'build' || a.mode === 'full') {
    expect(a.story && a.unknown && a.question, ctx).toBeTruthy();
    const { tiles } = parseStory(a.story!);
    const toks = tokensFor(a.equation, tiles);
    for (const t of toks)
      if (t.k === 'num') expect(t.tile, `${ctx}: ${t.v} is a tile in the story`).toBeDefined();
    const used = new Set(toks.flatMap((t) => (t.k === 'num' ? [t.tile] : [])));
    tiles.forEach((t, i) =>
      expect(used.has(i), `${ctx}: tile ${t.v} ${t.decoy ? 'is a decoy' : 'is used'}`).toBe(
        !t.decoy,
      ),
    );
    const v = checkBuild(toks, { target: eq, tiles, unknown: a.unknown! });
    expect(v.kind, ctx).toBe('right');
    for (const t of a.traps ?? [])
      expect(sameEquation(eqFrom(t.eq), eq), `${ctx}: trap ${t.eq}`).toBe(false);
  }
  if (a.mode === 'move') {
    const m = bestMove(eq)!;
    expect(m, ctx).toBeTruthy();
    expect(['good', 'solved'], ctx).toContain(assessMove(eq, m).kind);
  } else {
    const moves = solveSteps(eq)!;
    expect(moves, `${ctx}: solvable by peeling layers`).toBeTruthy();
    expect(moves.length, ctx).toBeLessThanOrEqual(3);
    let cur = eq;
    for (const m of moves) {
      cur = tidyEq(applyMove(cur, m));
      for (const n of [...nums(cur.l), ...nums(cur.r)])
        expect(fInt(n), `${ctx}: whole numbers`).toBe(true);
    }
  }
}

const LEVELS: Level[] = [1, 2, 3];
const SEEDS = 400;

/** All LaTeX fragments inside a rich-text string. */
function mathBits(s: string): string[] {
  const out: string[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([^$]+)\$/g;
  let m;
  while ((m = re.exec(s))) out.push(m[1] ?? m[2]);
  return out;
}

describe.each(Object.keys(generators))('generator %s', (id) => {
  it.each(LEVELS)('produces valid problems at level %i', (level) => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const p = generators[id](new Rng(seed * 7919 + level), level);
      const ctx = `${id} L${level} seed ${seed}: ${p.prompt}`;
      expect(p.skill, ctx).toBe(id);
      expect(p.prompt.length, ctx).toBeGreaterThan(5);
      expect(p.explain.length, ctx).toBeGreaterThan(5);
      expect(p.prompt, ctx).not.toMatch(/undefined|NaN|Infinity|\[object/);
      expect(p.explain, ctx).not.toMatch(/undefined|NaN|Infinity|\[object/);
      // Every problem names the atoms it exercises, and they are declared in skills.yaml.
      expect(p.atoms.length, `${ctx}: no atoms`).toBeGreaterThan(0);
      const declared = skillById[id].atoms.map((a) => a.id);
      for (const a of p.atoms) expect(declared, `${ctx}: atom ${a}`).toContain(a);
      const a = p.answer;
      if (a.kind === 'number' || a.kind === 'line') {
        const v = a.value;
        expect(Number.isFinite(v), ctx).toBe(true);
        // No floating point noise like 0.30000000000000004.
        expect(String(v).length, ctx).toBeLessThan(14);
        for (const n of p.nudges ?? []) expect(n.match, ctx).not.toBe(v);
        if (a.kind === 'line') {
          expect(v >= a.min && v <= a.max, `${ctx}: target on the line`).toBe(true);
          expect(a.tolerance, ctx).toBeLessThan((a.max - a.min) / 8);
          for (const n of p.nudges ?? [])
            expect(Math.abs(n.match - v), `${ctx}: nudge too close`).toBeGreaterThan(a.tolerance);
        }
        if (p.entry) {
          // The dials must be able to show the answer.
          expect(v, ctx).toBeLessThan(Math.pow(10, p.entry.int));
          expect(
            Math.round(v * Math.pow(10, p.entry.dec ?? 0)) / Math.pow(10, p.entry.dec ?? 0),
            ctx,
          ).toBe(v);
        }
      } else if (a.kind === 'order') {
        expect(a.items.length, ctx).toBeGreaterThanOrEqual(2);
        expect(new Set(a.items).size, ctx).toBe(a.items.length);
        expect([...a.correct].sort(), ctx).toEqual(a.items.map((_, i) => i));
        for (const t of a.traps ?? []) expect(t.order, ctx).not.toEqual(a.correct);
      } else if (a.kind === 'canvas') {
        checkCanvas(a, ctx);
      } else if (a.kind === 'game') {
        expect(validateGame(a.game), ctx).toBeNull();
      } else {
        const { options, correct } = a;
        expect(options.length, ctx).toBeGreaterThanOrEqual(2);
        expect(new Set(options).size, ctx).toBe(options.length);
        expect(correct, ctx).toBeGreaterThanOrEqual(0);
        expect(correct, ctx).toBeLessThan(options.length);
        for (const n of p.nudges ?? []) expect(n.match, ctx).not.toBe(correct);
        for (const o of options) expect(o, ctx).not.toMatch(/undefined|NaN/);
      }
      // Every LaTeX fragment must render without KaTeX errors.
      const texts = [
        p.prompt,
        p.explain,
        p.hint ?? '',
        ...(p.answer.kind === 'choice' ? p.answer.options : []),
        ...(p.answer.kind === 'order' ? p.answer.items : []),
        ...(p.answer.kind === 'order' ? (p.answer.traps ?? []).map((t) => t.text) : []),
        ...(p.answer.kind === 'canvas'
          ? [
              ...(p.answer.traps ?? []).map((t) => t.text),
              ...(p.answer.hints ?? []),
              p.answer.words ?? '',
              p.answer.story ?? '',
              ...parseStory(p.answer.story ?? '').tiles.map((t) => t.means),
            ]
          : []),
      ];
      for (const n of p.nudges ?? []) texts.push(n.text);
      if (p.answer.kind === 'game' && p.answer.game.kind === 'chain')
        for (const st of p.answer.game.steps) {
          renderMath(st.tex, true, true);
          texts.push(st.say ?? '', st.note ?? '', st.hint ?? '', ...(st.options ?? []), ...(st.nudges ?? []).map((n) => n.text));
          expect(st.tex, ctx).not.toMatch(/undefined|NaN/);
        }
      if (p.facts) for (const [x, y] of p.facts) expect(Number.isInteger(x) && Number.isInteger(y), ctx).toBe(true);
      for (const t of texts) {
        for (const m of mathBits(t)) renderMath(m, false, true);
        // Grouped numbers like 4{,}000 only work inside maths.
        expect(t.replace(/\$[^$]*\$/g, ''), `${ctx}: {,} outside maths in "${t}"`).not.toContain('{,}');
      }
      if (p.math) renderMath(p.math, true, true);
    }
  });
});

describe('atoms', () => {
  it.each(Object.keys(generators))('every declared atom of %s can be generated', (id) => {
    const seen = new Set<string>();
    for (const level of LEVELS)
      for (let seed = 1; seed <= 600; seed++)
        for (const a of generators[id](new Rng(seed * 104729 + level), level).atoms) seen.add(a);
    const missing = skillById[id].atoms.map((a) => a.id).filter((a) => !seen.has(a));
    expect(missing, `${id}: atoms never generated`).toEqual([]);
  });
});

describe('specific answers', () => {
  it('eval-one never accepts the glued-digits mistake', () => {
    for (let seed = 1; seed < 200; seed++) {
      const p = generators['eval-one'](new Rng(seed), 1);
      if (p.answer.kind === 'number' && /^\d+x$/.test(p.math ?? '')) {
        expect(p.nudges?.some((n) => n.text.includes('glued'))).toBe(true);
      }
    }
  });
});

describe('new topics', () => {
  it('expand-check never calls a true rule fake', () => {
    let checked = 0;
    for (let seed = 1; seed < 2000; seed++) {
      const p = generators['expand-check'](new Rng(seed), 1);
      const m = /says: "\$(\d+)\(x \+ (\d+)\) = (\d+)x \+ (\d+)\$"/.exec(p.prompt);
      if (!m || p.answer.kind !== 'choice') continue;
      const [a, b, , c] = m.slice(1).map(Number);
      const saysFake = p.answer.options[p.answer.correct].startsWith('Fake');
      expect(saysFake, p.prompt).toBe(a * b !== c);
      checked++;
    }
    expect(checked).toBeGreaterThan(100);
  });
  it('electricity answers are friendly (whole numbers or halves)', () => {
    for (const id of ['volts', 'current', 'resistance', 'ohm-current', 'ohm-solve'])
      for (const level of LEVELS)
        for (let seed = 1; seed <= 300; seed++) {
          const p = generators[id](new Rng(seed), level);
          if (p.answer.kind === 'number')
            expect(Number.isInteger(p.answer.value * 2), `${id}: ${p.prompt}`).toBe(true);
        }
  });
  it('table-rule answers follow the rule shown', () => {
    for (let seed = 1; seed < 500; seed++) {
      const p = generators['table-rule'](new Rng(seed), 3);
      const m = /y = (\d*)x(?: ([+-]) (\d+))?\$/.exec(p.prompt)!;
      const k = m[1] === '' ? 1 : Number(m[1]);
      const b = m[2] ? (m[2] === '-' ? -1 : 1) * Number(m[3]) : 0;
      const xs = /x & ([\d &]+) \\\\/
        .exec(p.math!)![1]
        .split('&')
        .map((v) => Number(v.trim()));
      const x = xs[xs.length - 1];
      expect(p.answer.kind === 'number' && p.answer.value, p.prompt).toBe(k * x + b);
    }
  });
});
