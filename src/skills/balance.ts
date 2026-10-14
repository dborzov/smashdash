/**
 * Region 2 — Ironhold: the balance. Each skill isolates ONE idea about equations:
 *  - balance-rule: doing the same thing to both sides keeps the balance (nothing about solving yet).
 *  - both-sides:   mechanically applying an operation to both sides, even a useless one.
 *  - inverse-ops:  which operation undoes which.
 *  - pick-move:    choosing the move that gets x alone (strategy, no arithmetic required).
 */
import type { Generator } from './types';
import { choice, numeric } from './util';

const r = String.raw;

/** Left side a·x / d + b written as LaTeX. */
export function lin(a: number, b = 0, d = 1): string {
  let s = a === 1 ? 'x' : `${a}x`;
  if (d !== 1) s = r`\frac{${s}}{${d}}`;
  if (b > 0) s += ` + ${b}`;
  if (b < 0) s += ` - ${-b}`;
  return s;
}

// ---------------------------------------------------------------------------

export const balanceRule: Generator = (rng, level) => {
  const a = level === 1 ? 1 : rng.int(1, 3);
  const v = rng.int(1, 6);
  const c = rng.int(1, 6);
  const d = a * v + c;
  const k = rng.int(1, 4);
  const goods = [
    `Add ${k} coins to **both** pans`,
    `Take ${Math.min(k, c)} coins off **both** pans`,
    `Double everything on **both** pans`,
    `Swap the two pans around`,
  ];
  const bads = [
    {
      text: `Add ${k} coins to the **left** pan only`,
      nudge: `Imagine it: one pan gets heavier, the other doesn't. Clunk!`,
    },
    {
      text: `Take ${Math.min(k, c)} coins off the **right** pan only`,
      nudge: `Only one pan changes — the scale would tip.`,
    },
    {
      text: `Add ${k} coins to the left and ${k + 1} to the right`,
      nudge: `Different amounts on each side tip the scale.`,
    },
    { text: `Double the **left** pan only`, nudge: `Doubling just one side makes it heavier.` },
  ];
  const visual = { kind: 'balance' as const, left: { x: a, c }, right: { x: 0, c: d } };
  if (level === 3 && rng.chance(0.5)) {
    // Spot the tipping move.
    const bad = rng.pick(bads);
    return {
      skill: 'balance-rule',
      atoms: ['tip'],
      prompt: `The scale is balanced. Which move will **tip** it?`,
      visual,
      ...choice(rng, bad.text, rng.shuffle(goods)),
      explain: `A scale stays balanced only when **both** pans get exactly the same treatment. "${bad.text.replace(/\*/g, '')}" changes just one side.`,
    };
  }
  if (level >= 2 && rng.chance(0.5)) {
    const eq = `${lin(a, c)} = ${d}`;
    const add = rng.int(1, 9);
    const same = rng.chance(0.5);
    const right = same ? add : add + rng.int(1, 3);
    return {
      skill: 'balance-rule',
      atoms: ['equation'],
      prompt: `The equation $${eq}$ is balanced. A dwarf adds ${add} to the left side and ${right} to the right side. Is it still balanced?`,
      ...choice(rng, same ? 'Yes, still balanced' : 'No, it tips', [
        same ? 'No, it tips' : 'Yes, still balanced',
      ]),
      explain: same
        ? `Both sides got the same +${add}, so they stay equal.`
        : `The left got +${add} but the right got +${right}. Different changes break the balance.`,
    };
  }
  return {
    skill: 'balance-rule',
    atoms: ['keep'],
    prompt: `The scale is balanced. Which move keeps it balanced?`,
    visual,
    ...choice(rng, rng.pick(goods), bads),
    explain: `Whatever you do to one pan, do to the other — then the scale can't tell the difference.`,
  };
};

// ---------------------------------------------------------------------------

type Op = { kind: '+' | '-' | '*' | '/'; k: number };
const opText = (o: Op) =>
  o.kind === '+'
    ? `**add** $${o.k}$ to`
    : o.kind === '-'
      ? `**subtract** $${o.k}$ from`
      : o.kind === '*'
        ? `**multiply**`
        : `**divide**`;
const opPhrase = (o: Op) =>
  o.kind === '+' || o.kind === '-'
    ? `${opText(o)} both sides`
    : `${opText(o)} both sides by $${o.k}$`;

export const bothSides: Generator = (rng, level) => {
  // Start: a x + b = c with known solution v. Apply op to both sides; ask for the result.
  const form = rng.pick(
    level === 1 ? ['add'] : level === 2 ? ['add', 'mul', 'div'] : ['add', 'mul', 'div', 'free'],
  );
  const v = rng.int(1, 10);
  let a = 1,
    b = 0,
    d = 1,
    op: Op;
  if (form === 'add') {
    b = rng.int(1, 9) * (level > 1 && rng.chance(0.3) ? -1 : 1);
    op = b > 0 ? { kind: '-', k: b } : { kind: '+', k: -b };
  } else if (form === 'mul') {
    a = rng.int(2, 6);
    op = { kind: '/', k: a };
  } else if (form === 'div') {
    d = rng.int(2, 6);
    op = { kind: '*', k: d };
  } else {
    // A legal but useless move: still keeps the balance!
    b = rng.int(1, 9);
    op = rng.chance(0.5) ? { kind: '+', k: rng.int(1, 5) } : { kind: '-', k: rng.int(1, b) };
  }
  const c = (a * v) / d + b;
  // In 'div' form, keep c an integer by choosing v multiple of d.
  const vv = form === 'div' ? d * rng.int(1, 6) : v;
  const cc = form === 'div' ? vv / d + b : c;
  const start = `${lin(a, b, d)} = ${cc}`;

  let resLeft: string, resRight: number, oneSide: string;
  if (op.kind === '+' || op.kind === '-') {
    const delta = op.kind === '+' ? op.k : -op.k;
    resLeft = lin(a, b + delta, d);
    resRight = cc + delta;
    oneSide = `$${resLeft} = ${cc}$`;
  } else if (op.kind === '/') {
    resLeft = lin(a / op.k, b / op.k, d);
    resRight = cc / op.k;
    oneSide = `$${resLeft} = ${cc}$`;
  } else {
    resLeft = lin(a, b * op.k, d / op.k);
    resRight = cc * op.k;
    oneSide = `$${resLeft} = ${cc}$`;
  }
  const result = `$${resLeft} = ${resRight}$`;
  const wrongRight =
    op.kind === '+'
      ? cc - op.k
      : op.kind === '-'
        ? cc + op.k
        : op.kind === '/'
          ? cc * op.k
          : cc / op.k;
  const fa = form === 'add' ? 'add-sub' : form === 'free' ? 'useless' : 'mul-div';
  const prompt = `Start with $${start}$ and ${opPhrase(op)}. What do you get?`;
  if (level >= 2 && rng.chance(0.4) && Number.isInteger(resRight)) {
    return {
      skill: 'both-sides',
      atoms: [fa, 'right-side'],
      prompt: `$${start}$. If we ${opPhrase(op)}, the left side becomes $${resLeft}$. What does the **right** side become?`,
      ...numeric(resRight, [
        [wrongRight, `Check the operation: we ${opPhrase(op).replace(/\*/g, '')}.`],
      ]),
      explain: `Whatever happens on the left happens on the right too: the right side becomes $${resRight}$.`,
    };
  }
  return {
    skill: 'both-sides',
    atoms: [fa],
    prompt,
    ...choice(rng, result, [
      {
        text: oneSide,
        nudge: `Whoa — you changed only the left side! The right side needs the same treatment.`,
      },
      Number.isInteger(wrongRight)
        ? `$${resLeft} = ${wrongRight}$`
        : `$${lin(a, b, d)} = ${resRight}$`,
      `$${lin(a, b, d)} = ${resRight}$`,
      `$x = ${resRight + 1}$`,
    ]),
    explain: `Do it to **both** sides: $${start}$ becomes ${result}.`,
  };
};

// ---------------------------------------------------------------------------

export const inverseOps: Generator = (rng, level) => {
  const k = rng.int(2, 9);
  const ops = [
    {
      did: `+ ${k}`,
      atom: 'undo-add',
      undo: `- ${k}`,
      spell: `added ${k} to the box's number`,
      same: `add ${k}`,
      undoWords: `take away ${k}`,
    },
    {
      did: `- ${k}`,
      atom: 'undo-sub',
      undo: `+ ${k}`,
      spell: `took ${k} away from the box's number`,
      same: `take away ${k}`,
      undoWords: `add ${k}`,
    },
    {
      did: r`\times ${k}`,
      atom: 'undo-mul',
      undo: r`\div ${k}`,
      spell: `multiplied the box's number by ${k}`,
      same: `multiply by ${k}`,
      undoWords: `divide by ${k}`,
    },
    {
      did: r`\div ${k}`,
      atom: 'undo-div',
      undo: r`\times ${k}`,
      spell: `divided the box's number by ${k}`,
      same: `divide by ${k}`,
      undoWords: `multiply by ${k}`,
    },
  ];
  const o = level === 1 ? rng.pick(ops.slice(0, 2)) : rng.pick(ops);
  if (level === 3 && rng.chance(0.6)) {
    // Think backwards: I multiplied my number by k and got n.
    const v = rng.int(2, 12);
    const t = rng.pick(['mul', 'add', 'sub'] as const);
    const n = t === 'mul' ? v * k : t === 'add' ? v + k : v - k + k * 2;
    const before = t === 'sub' ? n + k : t === 'mul' ? n / k : n - k;
    const what =
      t === 'mul' ? `multiplied it by ${k}` : t === 'add' ? `added ${k}` : `took away ${k}`;
    return {
      skill: 'inverse-ops',
      atoms: ['backwards'],
      prompt: `A goblin thinks of a number, ${what}, and gets $${n}$. Undo the spell: what was the number?`,
      ...numeric(before, [
        [
          t === 'mul' ? n * k : t === 'add' ? n + k : n - k,
          `That's doing the spell again, not undoing it!`,
        ],
      ]),
      explain: `To undo "${what}" we ${t === 'mul' ? `divide by ${k}` : t === 'add' ? `take away ${k}` : `add ${k}`}: the number was $${before}$.`,
    };
  }
  const words = level >= 2 && rng.chance(0.5);
  const all = ops.map((x) => (words ? x.undoWords : `$${x.undo}$`));
  const right = words ? o.undoWords : `$${o.undo}$`;
  const same = words ? o.same : `$${o.did}$`;
  return {
    skill: 'inverse-ops',
    atoms: [o.atom],
    prompt: words
      ? `A spell ${o.spell}. Which counter-spell undoes it?`
      : `Which move **undoes** $${o.did}$?`,
    ...choice(rng, right, [
      { text: same, nudge: `That would do it twice! We want to go **backwards**.` },
      ...all.filter((t) => t !== right),
    ]),
    explain: `Adding and subtracting undo each other; multiplying and dividing undo each other. So $${o.did}$ is undone by $${o.undo}$.`,
  };
};

// ---------------------------------------------------------------------------

export const pickMove: Generator = (rng, level) => {
  const forms =
    level === 1
      ? ['add', 'sub']
      : level === 2
        ? ['add', 'sub', 'mul', 'div']
        : ['add', 'sub', 'mul', 'div', 'flip'];
  const form = rng.pick(forms);
  const k = rng.int(2, 9);
  const v = rng.int(1, 12);
  let text: string, x: number, why: string;
  switch (form) {
    case 'add':
    case 'flip':
      text =
        form === 'flip'
          ? `${v + k}=x+${k}`
          : rng.chance(0.5)
            ? `x+${k}=${v + k}`
            : `${k}+x=${v + k}`;
      x = v;
      why = `The box has $+ ${k}$ stuck to it. Subtracting $${k}$ from both sides leaves the box alone.`;
      break;
    case 'sub':
      text = `x-${k}=${v}`;
      x = v + k;
      why = `Undo $- ${k}$ with $+ ${k}$ on both sides.`;
      break;
    case 'mul':
      text = `${k}x=${k * v}`;
      x = v;
      why = `$${k}x$ means ${k} times the box; dividing both sides by $${k}$ leaves one box.`;
      break;
    default:
      text = `x/${k}=${v}`;
      x = k * v;
      why = `The box is divided by $${k}$; multiplying both sides by $${k}$ undoes it.`;
  }
  return {
    skill: 'pick-move',
    atoms: [form],
    prompt: `Pick the move that gets $x$ alone, and do it to both sides:`,
    answer: { kind: 'canvas', mode: 'move', equation: text, x },
    hint: `What is stuck to $x$? Do the opposite.`,
    explain: why,
  };
};
