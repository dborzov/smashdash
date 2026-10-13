/**
 * Regions 3 & 4 — Gloomfen (one-step equations, checking) and Dragonspine (two-step).
 *
 * Stumbling blocks targeted here:
 *  - using the same operation instead of the inverse (x + 5 = 12 → 17).
 *  - two-step order: dividing first and forgetting to divide the constant ("last on, first off").
 *  - x on the right-hand side (20 = 3x + 5) looks "wrong" to many kids.
 *  - checking a solution by substituting it back (links back to Region 1).
 */
import type { Generator } from './types';
import { choice, numeric } from './util';
import { lin } from './balance';

const r = String.raw;

/** Worked solution as an aligned LaTeX block. Each row is [left, right]. */
export function steps(rows: [string, string][]): string {
  return `$$\\begin{aligned}${rows.map(([a, b]) => `${a} &= ${b}`).join(r` \\ `)}\\end{aligned}$$`;
}

// ---------------------------------------------------------------------------

export const oneStepAdd: Generator = (rng, level) => {
  const forms =
    level === 1 ? ['xpa'] : level === 2 ? ['xpa', 'xma', 'apx'] : ['xma', 'apx', 'flip', 'xpa'];
  const form = rng.pick(forms);
  const big = level === 3;
  const a = rng.int(1, big ? 30 : 12);
  const v = rng.int(form === 'xma' ? 1 : 0, big ? 40 : 15);
  let eq: string, nudges: [number, string][], explain: string;
  switch (form) {
    case 'xpa':
    case 'apx':
    case 'flip': {
      const b = v + a;
      eq =
        form === 'xpa' ? `x + ${a} = ${b}` : form === 'apx' ? `${a} + x = ${b}` : `${b} = x + ${a}`;
      nudges = [[b + a, `You added ${a} — but to undo $+ ${a}$ we **subtract** it!`]];
      explain =
        form === 'flip'
          ? `The box is on the right this time — no problem! Subtract ${a} from both sides:` +
            steps([
              [`${b} - ${a}`, `x + ${a} - ${a}`],
              [`${v}`, 'x'],
            ])
          : `Subtract ${a} from both sides:` +
            steps([
              [`${form === 'xpa' ? `x + ${a}` : `${a} + x`} - ${a}`, `${b} - ${a}`],
              ['x', `${v}`],
            ]);
      break;
    }
    default: {
      const b = v;
      const x = b + a;
      eq = `x - ${a} = ${b}`;
      nudges = [[b - a, `You subtracted — but to undo $- ${a}$ we **add** it back!`]];
      explain =
        `Add ${a} to both sides:` +
        steps([
          [`x - ${a} + ${a}`, `${b} + ${a}`],
          ['x', `${x}`],
        ]);
      return {
        skill: 'one-step-add',
        atoms: ['xma'],
        prompt: `Solve for $x$:`,
        math: eq,
        ...numeric(x, nudges),
        hint: `What is stuck to the box? Undo it on both sides.`,
        explain,
      };
    }
  }
  return {
    skill: 'one-step-add',
    atoms: [form],
    prompt: `Solve for $x$:`,
    math: eq,
    ...numeric(v, nudges),
    hint: `What is stuck to the box? Undo it on both sides.`,
    explain,
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
      prompt: `Solve for $x$:`,
      math: r`\frac{x}{${a}} = ${b}`,
      ...numeric(a * b, [
        [b / a, `The box is already being divided. To undo dividing we **multiply**!`],
        [a + b, `Undo dividing with multiplying, not adding.`],
      ]),
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
  const eq = form === 'flip' ? `${b} = ${a}x` : `${a}x = ${b}`;
  return {
    skill: 'one-step-mul',
    atoms: [form],
    prompt: `Solve for $x$:`,
    math: eq,
    ...numeric(v, [
      [b - a, r`$${a}x$ is $${a} \times x$, so undo it by **dividing**, not subtracting.`],
      [b * a, `That's multiplying again! Undo times with divide.`],
    ]),
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
  const b = rng.int(1, 12);
  const v = rng.int(1, 10);
  const sub = `**Subtract** $${b}$ from both sides`;
  const add = `**Add** $${b}$ to both sides`;
  const div = `**Divide** both sides by $${a}$`;
  const mul = `**Multiply** both sides by $${a}$`;
  let eq: string, right: string, wrong: (string | { text: string; nudge: string })[], why: string;
  const lastOn = `Last on, first off! The $${b}$ was added last, so peel it off first.`;
  switch (form) {
    case 'axpb':
      eq = `${a}x + ${b} = ${a * v + b}`;
      right = sub;
      wrong = [
        { text: div, nudge: `You'd have to divide the ${b} too — messy! ${lastOn}` },
        add,
        `**Subtract** $${a}$ from both sides`,
      ];
      why = `To build $${a}x + ${b}$ you multiply by ${a}, then add ${b}. Undo in reverse: subtract ${b} first.`;
      break;
    case 'axmb':
      eq = `${a}x - ${b} = ${a * v - b}`;
      right = add;
      wrong = [
        {
          text: div,
          nudge: `Dividing first means dividing the ${b} too. Undo the $- ${b}$ first!`,
        },
        sub,
        mul,
      ];
      why = `Undo the last step first: the $- ${b}$. Add ${b} to both sides.`;
      break;
    case 'xdapb':
      eq = r`\frac{x}{${a}} + ${b} = ${v + b}`;
      right = sub;
      wrong = [
        { text: mul, nudge: `Multiplying first would multiply the ${b} too. ${lastOn}` },
        div,
        add,
      ];
      why = `The $+ ${b}$ was the last thing done to the box, so undo it first.`;
      break;
    case 'bpax':
      eq = `${b} + ${a}x = ${a * v + b}`;
      right = sub;
      wrong = [
        {
          text: div,
          nudge: `Even though the ${b} is written first, it's still added after multiplying. Remove it first!`,
        },
        add,
        mul,
      ];
      why = `Multiplication happens before addition, so the ${b} is the outer layer. Subtract it first.`;
      break;
    case 'paren':
      eq = `${a}(x + ${b}) = ${a * (v + b)}`;
      right = div;
      wrong = [
        {
          text: sub,
          nudge: `The brackets protect the ${b}! The ×${a} is the outer layer this time.`,
        },
        mul,
        add,
      ];
      why = `Inside the brackets happens first, so the ×${a} is done last. Undo it first: divide by ${a}.`;
      break;
    default:
      eq = r`\frac{x + ${b}}{${a}} = ${v + b}`;
      right = mul;
      wrong = [
        {
          text: sub,
          nudge: `The ${b} is trapped under the fraction bar. Undo the dividing first!`,
        },
        div,
        add,
      ];
      why = `The whole top is divided by ${a} last, so multiply by ${a} first.`;
  }
  return {
    skill: 'undo-order',
    atoms: [form],
    prompt: `To solve this, what's the **first** move?`,
    math: eq,
    ...choice(rng, right, wrong),
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
  const b = rng.int(1, level === 1 ? 10 : 20);
  const v = rng.int(1, level === 1 ? 10 : 12);
  const wrongOrder = `Close! It looks like you divided before peeling off the ${b}. Last on, first off!`;
  switch (form) {
    case 'axpb':
    case 'flip': {
      const c = a * v + b;
      const eq = form === 'flip' ? `${c} = ${a}x + ${b}` : `${a}x + ${b} = ${c}`;
      return {
        skill: 'two-step',
        atoms: [form],
        prompt:
          form === 'flip'
            ? `Solve for $x$ (the box is on the right — that's fine!):`
            : `Solve for $x$:`,
        math: eq,
        ...numeric(v, [
          [c / a - b, wrongOrder],
          [(c + b) / a, `Check the sign: to undo $+ ${b}$ we subtract.`],
          [c - b, `Nearly! That's $${a}x$. Now one more step: divide by ${a}.`],
        ]),
        hint: `First get rid of the $+ ${b}$, then split into ${a} equal parts.`,
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
        prompt: `Solve for $x$:`,
        math: `${a}x - ${b} = ${c}`,
        ...numeric(vv, [
          [(c - b) / a, `Check the sign: to undo $- ${b}$ we **add**.`],
          [c / a + b, wrongOrder],
          [c + b, `Nearly! That's $${a}x$. Now divide by ${a}.`],
        ]),
        hint: `First undo the $- ${b}$, then divide.`,
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
        prompt: `Solve for $x$:`,
        math: r`\frac{x}{${a}} + ${b} = ${c}`,
        ...numeric(x, [
          [c * a - b, `Peel off the $+ ${b}$ before multiplying!`],
          [v, `Nearly! That's $\\frac{x}{${a}}$. One more step: multiply by ${a}.`],
          [(c - b) / a, `To undo dividing, **multiply**.`],
        ]),
        hint: `First subtract ${b}, then undo the dividing.`,
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
        prompt: `Solve for $x$:`,
        math: `${a}(x + ${b}) = ${c}`,
        ...numeric(v, [
          [c - b / a, `The brackets change the order — divide first!`],
          [c / a, `Nearly! That's $x + ${b}$. Now subtract ${b}.`],
          [
            (c - b) / a,
            `The bracket is a VIP room: divide by ${a} first, then deal with the ${b}.`,
          ],
        ]),
        hint: `Brackets first means ×${a} was done last — undo it first.`,
        explain: steps([
          [`x + ${b}`, r`\frac{${c}}{${a}} = ${v + b}`],
          ['x', `${v + b} - ${b} = ${v}`],
        ]),
      };
    }
  }
};
