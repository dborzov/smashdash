import { describe, expect, it } from 'vitest';
import { generators } from '../src/skills';
import { Rng } from '../src/engine/rng';
import type { Level } from '../src/skills/types';
import { renderMath } from '../src/ui/math';

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
      if (p.answer.kind === 'number') {
        const v = p.answer.value;
        expect(Number.isFinite(v), ctx).toBe(true);
        // No floating point noise like 0.30000000000000004.
        expect(String(v).length, ctx).toBeLessThan(14);
        for (const n of p.nudges ?? []) expect(n.match, ctx).not.toBe(v);
      } else {
        const { options, correct } = p.answer;
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
      ];
      for (const n of p.nudges ?? []) texts.push(n.text);
      for (const t of texts) for (const m of mathBits(t)) renderMath(m, false, true);
      if (p.math) renderMath(p.math, true, true);
    }
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
          if (p.answer.kind === 'number') expect(Number.isInteger(p.answer.value * 2), `${id}: ${p.prompt}`).toBe(true);
        }
  });
  it('table-rule answers follow the rule shown', () => {
    for (let seed = 1; seed < 500; seed++) {
      const p = generators['table-rule'](new Rng(seed), 3);
      const m = /y = (\d*)x(?: ([+-]) (\d+))?\$/.exec(p.prompt)!;
      const k = m[1] === '' ? 1 : Number(m[1]);
      const b = m[2] ? (m[2] === '-' ? -1 : 1) * Number(m[3]) : 0;
      const xs = /x & ([\d &]+) \\\\/.exec(p.math!)![1].split('&').map((v) => Number(v.trim()));
      const x = xs[xs.length - 1];
      expect(p.answer.kind === 'number' && p.answer.value, p.prompt).toBe(k * x + b);
    }
  });
});
