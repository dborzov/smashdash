/**
 * Regions 3 & 4 — Gloomfen (one-step equations, checking) and Dragonspine (two-step).
 *
 * Stumbling blocks targeted here:
 *  - using the same operation instead of the inverse (x + 5 = 12 → 17).
 *  - two-step order: dividing first and forgetting to divide the constant ("last on, first off").
 *  - x on the right-hand side (20 = 3x + 5) looks "wrong" to many kids.
 *  - checking a solution by substituting it back (links back to Region 1).
 */
import type { CanvasAnswer, Generator } from './types';
import { choice, numeric } from './util';
import { lin } from './balance';

const r = String.raw;

/** Worked solution as an aligned LaTeX block. Each row is [left, right]. */
export function steps(rows: [string, string][]): string {
  return `$$\\begin{aligned}${rows.map(([a, b]) => `${a} &= ${b}`).join(r` \\ `)}\\end{aligned}$$`;
}

// ---------------------------------------------------------------------------

/** Solve on the EQcanvas: every move shown on both sides, every result worked out. */
export function solveOnSlate(
  equation: string,
  x: number,
  mode: 'solve' | 'move' = 'solve',
): CanvasAnswer {
  return { kind: 'canvas', mode, equation, x };
}

export const oneStepAdd: Generator = (rng, level) => {
  const forms =
    level === 1 ? ['xpa'] : level === 2 ? ['xpa', 'xma', 'apx'] : ['xma', 'apx', 'flip', 'xpa'];
  const form = rng.pick(forms);
  const big = level === 3;
  const a = rng.int(1, big ? 30 : 12);
  const v = rng.int(form === 'xma' ? 1 : 0, big ? 40 : 15);
  if (form === 'xma') {
    const x = v + a;
    return {
      skill: 'one-step-add',
      atoms: ['xma'],
      prompt: `Solve for $x$ — show each move:`,
      answer: solveOnSlate(`x-${a}=${v}`, x),
      hint: `What is stuck to the box? Undo it on both sides.`,
      explain:
        `Add ${a} to both sides:` +
        steps([
          [`x - ${a} + ${a}`, `${v} + ${a}`],
          ['x', `${x}`],
        ]),
    };
  }
  const b = v + a;
  const text = form === 'xpa' ? `x+${a}=${b}` : form === 'apx' ? `${a}+x=${b}` : `${b}=x+${a}`;
  return {
    skill: 'one-step-add',
    atoms: [form],
    prompt:
      form === 'flip'
        ? `Solve for $x$ — the box is on the right this time, no problem:`
        : `Solve for $x$ — show each move:`,
    answer: solveOnSlate(text, v),
    hint: `What is stuck to the box? Undo it on both sides.`,
    explain:
      form === 'flip'
        ? `Subtract ${a} from both sides:` +
          steps([
            [`${b} - ${a}`, `x + ${a} - ${a}`],
            [`${v}`, 'x'],
          ])
        : `Subtract ${a} from both sides:` +
          steps([
            [`${form === 'xpa' ? `x + ${a}` : `${a} + x`} - ${a}`, `${b} - ${a}`],
            ['x', `${v}`],
          ]),
  };
};

// ---------------------------------------------------------------------------

export const oneStepMul: Generator = (rng, level) => {
  const forms = level === 1 ? ['ax'] : level === 2 ? ['ax', 'xda'] : ['ax', 'xda', 'flip'];
  const form = rng.pick(forms);
  const a = rng.int(2, level === 1 ? 5 : 12);
  const v = rng.int(1, level === 1 ? 10 : 12);
  if (form === 'xda') {
    const b = v;
    return {
      skill: 'one-step-mul',
      atoms: ['xda'],
      prompt: `Solve for $x$ — show each move:`,
      answer: solveOnSlate(`x/${a}=${b}`, a * b),
      hint: `The box is split into ${a} piles. Undo the split!`,
      explain:
        `Multiply both sides by ${a}:` +
        steps([
          [r`\frac{x}{${a}} \times ${a}`, r`${b} \times ${a}`],
          ['x', `${a * b}`],
        ]),
    };
  }
  const b = a * v;
  return {
    skill: 'one-step-mul',
    atoms: [form],
    prompt: `Solve for $x$ — show each move:`,
    answer: solveOnSlate(form === 'flip' ? `${b}=${a}x` : `${a}x=${b}`, v),
    hint: `${a} boxes weigh ${b}. How much is one box?`,
    explain:
      `Divide both sides by ${a}:` +
      steps([
        [r`\frac{${a}x}{${a}}`, r`\frac{${b}}{${a}}`],
        ['x', `${v}`],
      ]),
  };
};

// ---------------------------------------------------------------------------

/** A random linear equation a·x + b = c (or x/a + b = c) with integer solution. */
function randomEq(
  rng: { int(a: number, b: number): number; chance(p: number): boolean },
  twoStep: boolean,
) {
  const v = rng.int(1, 10);
  const a = twoStep ? rng.int(2, 6) : 1;
  const b = rng.int(1, 12) * (rng.chance(0.3) ? -1 : 1);
  const c = a * v + b;
  return { v, a, b, c, left: lin(a, b), tex: `${lin(a, b)} = ${c}` };
}

export const checkSolution: Generator = (rng, level) => {
  const e = randomEq(rng, level > 1 || rng.chance(0.3));
  const evalAt = (k: number) => e.a * k + e.b;
  if (level === 3 && rng.chance(0.5)) {
    const cands = [e.v, e.v + 1, Math.max(0, e.v - 2), e.c - e.b, e.c];
    const c = choice(
      rng,
      `$x = ${e.v}$`,
      cands.filter((k) => k !== e.v).map((k) => `$x = ${k}$`),
    );
    return {
      skill: 'check-solution',
      atoms: ['which'],
      prompt: `Which value of $x$ makes $${e.tex}$ true? (Test them!)`,
      ...c,
      explain: `Plug in $x = ${e.v}$: $${e.a === 1 ? '' : `${e.a} \\times `}${e.v} ${e.b < 0 ? '-' : '+'} ${Math.abs(e.b)} = ${e.c}$ ✓`,
    };
  }
  const k = rng.chance(0.5) ? e.v : e.v + rng.pick([-2, -1, 1, 2, 3]);
  const lhs = evalAt(k);
  const subst = `${e.a === 1 ? '' : `${e.a} \\times `}${k < 0 ? `(${k})` : k} ${e.b < 0 ? '-' : '+'} ${Math.abs(e.b)} = ${lhs}`;
  if (level >= 2 && rng.chance(0.4)) {
    return {
      skill: 'check-solution',
      atoms: ['plug'],
      prompt: `Plug $x = ${k}$ into the left side of $${e.tex}$. What number do you get?`,
      ...numeric(lhs, [[e.a * (k + e.b), `Multiply first, then add or subtract.`]]),
      explain: `$${subst}$`,
    };
  }
  const ok = k === e.v;
  return {
    skill: 'check-solution',
    atoms: ['truth'],
    prompt: `A goblin claims $x = ${k}$ solves $${e.tex}$. Truth or trap?`,
    ...choice(rng, ok ? `Truth! Both sides match.` : `Trap! The sides don't match.`, [
      ok ? `Trap! The sides don't match.` : `Truth! Both sides match.`,
    ]),
    hint: `Swap $x$ for ${k} on the left and see if you get ${e.c}.`,
    explain: ok
      ? `$${subst}$ — matches the right side. Truth!`
      : `$${subst}$, but the right side is $${e.c}$. Trap!`,
  };
};

// ---------------------------------------------------------------------------

export const undoOrder: Generator = (rng, level) => {
  const forms =
    level === 1
      ? ['axpb', 'axmb']
      : level === 2
        ? ['axpb', 'axmb', 'xdapb', 'bpax']
        : ['xdapb', 'bpax', 'paren', 'fracparen'];
  const form = rng.pick(forms);
  const a = rng.int(2, 6);
  // b doesn't share out evenly, so dividing first really is messy.
  const b = rng.intExcept(1, 12, [a, 2 * a, 3 * a, 4 * a, 5 * a, 6 * a]);
  // Keep every number positive: negative numbers aren't taught yet.
  const v = Math.max(rng.int(1, 10), Math.ceil((b + 1) / a));
  let text: string, why: string;
  switch (form) {
    case 'axpb':
      text = `${a}x+${b}=${a * v + b}`;
      why = `To build $${a}x + ${b}$ you multiply by ${a}, then add ${b}. Undo in reverse: subtract ${b} first.`;
      break;
    case 'axmb':
      text = `${a}x-${b}=${a * v - b}`;
      why = `Undo the last step first: the $- ${b}$. Add ${b} to both sides.`;
      break;
    case 'xdapb':
      text = `x/${a}+${b}=${v + b}`;
      why = `The $+ ${b}$ was the last thing done to the box, so undo it first.`;
      break;
    case 'bpax':
      text = `${b}+${a}x=${a * v + b}`;
      why = `Multiplication happens before addition, so the ${b} is the outer layer. Subtract it first.`;
      break;
    case 'paren':
      text = `${a}(x+${b})=${a * (v + b)}`;
      why = `Inside the brackets happens first, so the ×${a} is done last. Undo it first: divide by ${a}.`;
      break;
    default:
      text = `(x+${b})/${a}=${v + b}`; // x + b = a(v + b)
      why = `The whole top is divided by ${a} last, so multiply by ${a} first.`;
  }
  const x = form === 'xdapb' ? a * v : form === 'fracparen' ? a * (v + b) - b : v;
  return {
    skill: 'undo-order',
    atoms: [form],
    prompt: `Make the **first** move on both sides. Which layer comes off first?`,
    answer: solveOnSlate(text, x, 'move'),
    hint: `Think about the order the box was wrapped in. Unwrap it in reverse.`,
    explain: why,
  };
};

// ---------------------------------------------------------------------------

export const twoStep: Generator = (rng, level) => {
  const forms =
    level === 1
      ? ['axpb']
      : level === 2
        ? ['axpb', 'axmb', 'xdapb']
        : ['axmb', 'xdapb', 'flip', 'paren'];
  const form = rng.pick(forms);
  const a = rng.int(2, level === 1 ? 5 : 9);
  const b = rng.intExcept(1, level === 1 ? 10 : 20, [a, 2 * a, 3 * a, 4 * a]);
  const v = rng.int(1, level === 1 ? 10 : 12);
  const prompt = `Solve for $x$ — one move at a time, on both sides:`;
  const hint = `Last on, first off: peel the outside layer first.`;
  switch (form) {
    case 'axpb':
    case 'flip': {
      const c = a * v + b;
      return {
        skill: 'two-step',
        atoms: [form],
        prompt:
          form === 'flip' ? `Solve for $x$ (the box is on the right — that's fine!):` : prompt,
        answer: solveOnSlate(form === 'flip' ? `${c}=${a}x+${b}` : `${a}x+${b}=${c}`, v),
        hint,
        explain:
          form === 'flip'
            ? steps([
                [`${c} - ${b}`, `${a}x`],
                [r`\frac{${c - b}}{${a}}`, 'x'],
                [`${v}`, 'x'],
              ])
            : steps([
                [`${a}x`, `${c} - ${b} = ${c - b}`],
                ['x', r`\frac{${c - b}}{${a}} = ${v}`],
              ]),
      };
    }
    case 'axmb': {
      const vv = Math.max(v, Math.ceil((b + 1) / a));
      const c = a * vv - b;
      return {
        skill: 'two-step',
        atoms: ['axmb'],
        prompt,
        answer: solveOnSlate(`${a}x-${b}=${c}`, vv),
        hint,
        explain: steps([
          [`${a}x`, `${c} + ${b} = ${c + b}`],
          ['x', r`\frac{${c + b}}{${a}} = ${vv}`],
        ]),
      };
    }
    case 'xdapb': {
      const x = a * v;
      const c = v + b;
      return {
        skill: 'two-step',
        atoms: ['xdapb'],
        prompt,
        answer: solveOnSlate(`x/${a}+${b}=${c}`, x),
        hint,
        explain: steps([
          [r`\frac{x}{${a}}`, `${c} - ${b} = ${v}`],
          ['x', r`${v} \times ${a} = ${x}`],
        ]),
      };
    }
    default: {
      const c = a * (v + b);
      return {
        skill: 'two-step',
        atoms: ['paren'],
        prompt,
        answer: solveOnSlate(`${a}(x+${b})=${c}`, v),
        hint: `Brackets first means ×${a} was done last — undo it first.`,
        explain: steps([
          [`x + ${b}`, r`\frac{${c}}{${a}} = ${v + b}`],
          ['x', `${v + b} - ${b} = ${v}`],
        ]),
      };
    }
  }
};
