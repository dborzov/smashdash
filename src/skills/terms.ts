/**
 * The Muddler Strikes Back, part 2 — like terms. Boxes go with boxes, coins with coins, and
 * a box of boxes ($x^2$) is a different thing altogether. Then: expanding brackets and tidying
 * up, including the trap of a minus in front of a bracket.
 */
import type { ChainStep, GameSpec, Generator } from './types';
import type { Rng } from '../engine/rng';
import { choice } from './util';
import { sortTotals, totalsTex } from '../games';

const game = (g: GameSpec) => ({ answer: { kind: 'game' as const, game: g } });
const chain = (steps: ChainStep[]) =>
  game({
    kind: 'chain',
    steps: steps.map((st) => ({ ...st, nudges: st.nudges?.filter((n) => n.value !== st.answer) })),
  });
const xt = (c: number, v = 'x') => (c === 1 ? v : c === -1 ? `-${v}` : `${c}${v}`);

/** A handful of terms like '3x', '-2', 'x^2'. */
function terms(rng: Rng, n: number, kinds: ('x' | 'n' | 'x2')[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const k = kinds[i % kinds.length];
    let c = rng.int(1, 7) * (i > 0 && rng.chance(0.3) ? -1 : 1);
    if (k === 'n') out.push(String(c));
    else if (k === 'x') out.push(c === 1 ? 'x' : c === -1 ? '-x' : `${c}x`);
    else {
      c = Math.abs(c) > 3 ? 2 : c;
      out.push(c === 1 ? 'x^2' : c === -1 ? '-x^2' : `${c}x^2`);
    }
  }
  return rng.shuffle(out);
}

/** 3x + 4 - 2x as LaTeX from terms. */
function sumTex(ts: string[]): string {
  return ts
    .map((t, i) => {
      const tex = t.replace('x^2', 'x^{2}');
      return i === 0 ? tex : tex.startsWith('-') ? `- ${tex.slice(1)}` : `+ ${tex}`;
    })
    .join(' ');
}

export const likeTerms: Generator = (rng, level) => {
  const kind = rng.pick(level === 1 ? ['sort', 'combine'] : level === 2 ? ['sort', 'mixed'] : ['sort-x2', 'unlike', 'mixed']);
  if (kind === 'sort' || kind === 'sort-x2') {
    const ts = terms(rng, level === 1 ? 4 : 6, kind === 'sort-x2' ? ['x', 'n', 'x2'] : ['x', 'n']);
    const totals = sortTotals(ts);
    if (totals.some((t) => t.total === 0)) return likeTerms(rng, level);
    return {
      skill: 'like-terms',
      atoms: kind === 'sort-x2' ? ['x-squared', 'mixed'] : level === 1 ? ['combine-x', 'combine-n'] : ['mixed'],
      prompt: `Madame Marge's lost property is all mixed up. Sort it into piles, then count each pile.`,
      ...game({ kind: 'sorter', terms: ts }),
      explain: `$${sumTex(ts)} = ${totalsTex(totals)}$.`,
    };
  }
  if (kind === 'combine') {
    const a = rng.int(2, 9);
    const b = rng.int(2, 9);
    return {
      skill: 'like-terms',
      atoms: ['combine-x'],
      prompt: `${a} mystery boxes and ${b} more mystery boxes. Tidy it up:`,
      math: `${a}x + ${b}x`,
      ...choice(rng, `$${a + b}x$`, [
        { text: `$${a + b}x^{2}$`, nudge: `Adding boxes to boxes gives more boxes — not boxes of boxes. Still just $x$.` },
        { text: `$${a * b}x$`, nudge: `That's multiplying. ${a} boxes plus ${b} boxes is ${a + b} boxes.` },
        { text: `$${a + b}$`, nudge: `Where did the boxes go? It's ${a + b} **boxes**: $${a + b}x$.` },
      ]),
      explain: `$${a}x + ${b}x = ${a + b}x$: ${a + b} boxes.`,
    };
  }
  if (kind === 'unlike') {
    const a = rng.int(2, 9);
    const b = rng.int(2, 9);
    return {
      skill: 'like-terms',
      atoms: ['unlike', 'x-squared'],
      prompt: `The Clutterbeast says it has tidied these up. Which one **can't** be tidied any further?`,
      ...choice(rng, `$${a}x + ${b}$`, [
        { text: `$${a}x + ${b}x$`, nudge: `Boxes and boxes: that one tidies into $${a + b}x$.` },
        { text: `$${a} + ${b}$`, nudge: `Two plain numbers: that's just ${a + b}.` },
        { text: `$${a}x^{2} + ${b}x^{2}$`, nudge: `Both are $x^2$ — like terms! $${a + b}x^{2}$.` },
      ]),
      explain: `$${a}x + ${b}$ is boxes and coins — different kinds, so it stays as it is.`,
    };
  }
  // mixed: choose the tidy form
  const a = rng.int(2, 6);
  const b = rng.int(2, 9);
  const c = rng.int(1, 5);
  const d = rng.int(1, Math.min(b - 1, 8));
  const tex = `${a}x + ${b} + ${xt(c)} - ${d}`;
  return {
    skill: 'like-terms',
    atoms: ['mixed', 'combine-x', 'combine-n'],
    prompt: `Tidy this up:`,
    math: tex,
    ...choice(rng, `$${a + c}x + ${b - d}$`, [
      { text: `$${a + c + b - d}x$`, nudge: `You can't add the coins to the boxes! Boxes with boxes, numbers with numbers.` },
      { text: `$${a + c}x + ${b + d}$`, nudge: `Watch the minus: it's ${b} take away ${d}.` },
      { text: `$${a * c}x + ${b - d}$`, nudge: `Adding boxes, not multiplying: ${a} + ${c}.` },
    ]),
    explain: `Boxes: $${a}x + ${xt(c)} = ${a + c}x$. Numbers: $${b} - ${d} = ${b - d}$. So $${a + c}x + ${b - d}$.`,
  };
};

export const simplify: Generator = (rng, level) => {
  const kind = rng.pick(level === 1 ? ['expand-collect'] : level === 2 ? ['minus-bracket', 'expand-collect'] : ['two-brackets', 'minus-bracket']);
  if (kind === 'expand-collect') {
    const a = rng.int(2, 6);
    const b = rng.int(1, 9);
    const c = rng.int(1, 7);
    return {
      skill: 'simplify',
      atoms: ['expand-collect'],
      prompt: `Bust the bracket, then tidy up.`,
      math: `${a}(x + ${b}) + ${xt(c)}`,
      ...chain([
        {
          tex: `${a}(x + ${b}) = ${a}x + \\box`,
          answer: a * b,
          nudges: [{ value: b, text: `Halfcopy alert! The ${a} multiplies the ${b} too.` }],
        },
        {
          tex: `${a}x + ${a * b} + ${xt(c)} = \\box x + ${a * b}`,
          answer: a + c,
          nudges: [{ value: a * c, text: `Adding boxes, not multiplying: ${a} + ${c}.` }],
        },
      ]),
      explain: `$${a}(x + ${b}) + ${xt(c)} = ${a}x + ${a * b} + ${xt(c)} = ${a + c}x + ${a * b}$.`,
    };
  }
  if (kind === 'minus-bracket') {
    const a = rng.int(4, 9);
    const b = rng.int(2, 9);
    return {
      skill: 'simplify',
      atoms: ['minus-bracket'],
      prompt: `The Muddler hid a minus in front of a bracket. Careful!`,
      math: `${a}x - (x + ${b})`,
      ...chain([
        {
          tex: `${a}x - (x + ${b}) = ${a}x - x - \\box`,
          answer: b,
          say: `The minus takes away **everything** in the bracket: the $x$ AND the ${b}.`,
          nudges: [{ value: -b, text: `The minus is already written in front of the box. Take away ${b}: the box is ${b}.` }],
        },
        {
          tex: `${a}x - x - ${b} = \\box x - ${b}`,
          answer: a - 1,
          nudges: [{ value: a, text: `${a} boxes take away 1 box.` }],
        },
      ]),
      explain: `$${a}x - (x + ${b}) = ${a}x - x - ${b} = ${a - 1}x - ${b}$. (Not $+ ${b}$ — the minus takes away the whole bracket.)`,
    };
  }
  const a = rng.int(2, 5);
  const b = rng.int(1, 6);
  const c = rng.int(2, 5);
  const d = rng.int(1, 6);
  return {
    skill: 'simplify',
    atoms: ['two-brackets', 'expand-collect'],
    prompt: `Two brackets to bust. Expand both, then collect like terms.`,
    math: `${a}(x + ${b}) + ${c}(x + ${d})`,
    ...chain([
      { tex: `${a}(x + ${b}) = ${a}x + \\box`, answer: a * b },
      { tex: `${c}(x + ${d}) = ${c}x + \\box`, answer: c * d },
      { tex: `${a}x + ${c}x = \\box x`, answer: a + c },
      { tex: `${a * b} + ${c * d} = \\box`, answer: a * b + c * d },
    ]),
    explain: `$${a}x + ${a * b} + ${c}x + ${c * d} = ${a + c}x + ${a * b + c * d}$.`,
  };
};
