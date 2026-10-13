/**
 * Region 5 — Bazaar of Whispers: story problems.
 *
 * Split into three atomic skills:
 *  - name-unknown:      in this story, what IS the mystery number?
 *  - story-to-equation: which equation tells this story?
 *  - story-solve:       solve it (and answer the question that was asked, not the total).
 */
import type { Rng } from '../engine/rng';
import type { Generator, Level } from './types';
import { choice, numeric } from './util';
import { lin } from './balance';
import { steps } from './equations';

const r = String.raw;

export interface Story {
  text: string;
  /** What x stands for, e.g. "the number of bags". */
  unknown: string;
  /** Other quantities from the story (distractors for name-unknown). */
  others: string[];
  /** The question as asked, e.g. "How many bags?" */
  question: string;
  a: number;
  b: number;
  c: number;
  /** 'mul': a·x + b = c, 'add': x + b = c, 'sub': x − b = c, 'div': x / a = c */
  shape: 'mul' | 'add' | 'sub' | 'div';
  x: number;
}

type Template = (rng: Rng, level: Level) => Story;

const templates: Template[] = [
  (rng) => {
    const a = rng.int(3, 8),
      x = rng.int(2, 9),
      b = rng.int(1, a - 1);
    return {
      text: `Merchant Pib sells apples in bags of ${a}. A hungry troll buys some bags plus ${b} loose apples — ${a * x + b} apples in total.`,
      question: 'How many bags did the troll buy?',
      unknown: 'the number of bags',
      others: [
        'the total number of apples',
        'the number of apples in each bag',
        'the number of loose apples',
      ],
      a,
      b,
      c: a * x + b,
      shape: 'mul',
      x,
    };
  },
  (rng) => {
    const a = rng.int(3, 9),
      x = rng.int(2, 8),
      b = rng.int(2, 15);
    return {
      text: `The ogre Burpington burps ${a} times every hour. After a few hours of feasting, plus ${b} bonus burps at dessert, he has burped ${a * x + b} times.`,
      question: 'How many hours did he feast?',
      unknown: 'the number of hours',
      others: ['the total number of burps', 'the burps per hour', 'the bonus burps'],
      a,
      b,
      c: a * x + b,
      shape: 'mul',
      x,
    };
  },
  (rng) => {
    const x = rng.int(5, 40),
      b = rng.int(3, 25);
    return {
      text: `A goblin had some gold coins. He found ${b} more in a smelly sock. Now he has ${x + b}.`,
      question: 'How many coins did he have at the start?',
      unknown: 'the coins he had at the start',
      others: ['the coins in the sock', 'the coins he has now', 'the number of socks'],
      a: 1,
      b,
      c: x + b,
      shape: 'add',
      x,
    };
  },
  (rng) => {
    const b = rng.int(3, 20),
      c = rng.int(2, 25);
    return {
      text: `You had some gold. You spent ${b} on a suspicious cheese, and now you have ${c} left.`,
      question: 'How much gold did you have before the cheese?',
      unknown: 'the gold you had before',
      others: ['the price of the cheese', 'the gold you have left', 'the number of cheeses'],
      a: 1,
      b,
      c,
      shape: 'sub',
      x: b + c,
    };
  },
  (rng) => {
    const a = rng.int(2, 6),
      c = rng.int(3, 12);
    return {
      text: `A dragon's hoard of gems is shared equally between ${a} baby dragons. Each baby gets ${c} gems.`,
      question: 'How many gems were in the hoard?',
      unknown: 'the number of gems in the hoard',
      others: ['the number of baby dragons', 'the gems each baby gets', 'the number of hoards'],
      a,
      b: 0,
      c,
      shape: 'div',
      x: a * c,
    };
  },
  (rng) => {
    const a = rng.int(4, 9),
      x = rng.int(2, 9),
      b = rng.int(2, 9);
    return {
      text: `Tickets to the Great Sock Circus cost ${a} gold each. A family buys some tickets and one ${b}-gold bucket of popcorn. They pay ${a * x + b} gold.`,
      question: 'How many tickets did they buy?',
      unknown: 'the number of tickets',
      others: ['the price of one ticket', 'the total they paid', 'the price of the popcorn'],
      a,
      b,
      c: a * x + b,
      shape: 'mul',
      x,
    };
  },
  (rng) => {
    const x = rng.int(2, 9),
      b = 3;
    return {
      text: `In a creepy cave there are some spiders (8 legs each) and one wobbly ${b}-legged stool. Counting everything, there are ${8 * x + b} legs.`,
      question: 'How many spiders are there?',
      unknown: 'the number of spiders',
      others: ['the total number of legs', 'the legs on each spider', 'the legs on the stool'],
      a: 8,
      b,
      c: 8 * x + b,
      shape: 'mul',
      x,
    };
  },
  (rng) => {
    const a = rng.int(2, 4),
      x = rng.int(3, 12),
      b = rng.int(1, 10);
    return {
      text: `The wizard Glimmerbeard is ${a} times as old as his apprentice, plus ${b} years. The wizard is ${a * x + b}.`,
      question: 'How old is the apprentice?',
      unknown: "the apprentice's age",
      others: ["the wizard's age", 'how many times older the wizard is', 'the extra years'],
      a,
      b,
      c: a * x + b,
      shape: 'mul',
      x,
    };
  },
];

export function makeStory(rng: Rng, level: Level): Story {
  const pool = level === 1 ? templates.filter((_, i) => [2, 3, 4].includes(i)) : templates;
  return rng.pick(pool)(rng, level);
}

export function storyEquation(s: Story): string {
  switch (s.shape) {
    case 'mul':
      return `${lin(s.a, s.b)} = ${s.c}`;
    case 'add':
      return `x + ${s.b} = ${s.c}`;
    case 'sub':
      return `x - ${s.b} = ${s.c}`;
    default:
      return r`\frac{x}{${s.a}} = ${s.c}`;
  }
}

function wrongEquations(s: Story): { text: string; nudge?: string }[] {
  switch (s.shape) {
    case 'mul':
      return [
        {
          text: `$${lin(s.b, s.a)} = ${s.c}$`,
          nudge: `Swapped! Which number goes with each bag/hour/ticket — that one multiplies $x$.`,
        },
        { text: `$${lin(s.a, -s.b)} = ${s.c}$` },
        { text: `$${s.a}x = ${s.c} + ${s.b}$` },
        {
          text: `$x + ${s.a} + ${s.b} = ${s.c}$`,
          nudge: `Each one comes with ${s.a} — that's multiplying, not adding ${s.a} once.`,
        },
      ];
    case 'add':
      return [
        {
          text: `$x - ${s.b} = ${s.c}$`,
          nudge: `He **found** more — the pile got bigger. That's adding.`,
        },
        { text: `$${s.b}x = ${s.c}$` },
        { text: `$x + ${s.c} = ${s.b}$` },
      ];
    case 'sub':
      return [
        {
          text: `$x + ${s.b} = ${s.c}$`,
          nudge: `You **spent** gold — the pile got smaller. That's subtracting.`,
        },
        { text: `$${s.b} - x = ${s.c}$` },
        { text: `$${s.b}x = ${s.c}$` },
      ];
    default:
      return [
        { text: `$${s.a}x = ${s.c}$`, nudge: `Sharing out means **dividing** the hoard.` },
        { text: r`$\frac{${s.a}}{x} = ${s.c}$` },
        { text: `$x - ${s.a} = ${s.c}$` },
      ];
  }
}

function solution(s: Story): string {
  const eq = storyEquation(s);
  switch (s.shape) {
    case 'mul':
      return (
        `$${eq}$` +
        steps([
          [`${s.a}x`, `${s.c} - ${s.b} = ${s.c - s.b}`],
          ['x', `${s.x}`],
        ])
      );
    case 'add':
      return `$${eq}$` + steps([['x', `${s.c} - ${s.b} = ${s.x}`]]);
    case 'sub':
      return `$${eq}$` + steps([['x', `${s.c} + ${s.b} = ${s.x}`]]);
    default:
      return `$${eq}$` + steps([['x', r`${s.c} \times ${s.a} = ${s.x}`]]);
  }
}

// ---------------------------------------------------------------------------

export const nameUnknown: Generator = (rng, level) => {
  const s = makeStory(rng, level);
  return {
    skill: 'name-unknown',
    atoms: [s.shape],
    prompt: `${s.text} **${s.question}**\n\nIf we call the mystery number $x$, what does $x$ stand for?`,
    ...choice(
      rng,
      s.unknown,
      s.others.map((o, i) =>
        i === 0
          ? {
              text: o,
              nudge: `That number is already in the story — we know it! $x$ is the one we **don't** know yet.`,
            }
          : o,
      ),
    ),
    explain: `The question asks "${s.question}" — so $x$ is ${s.unknown}.`,
  };
};

export const storyToEquation: Generator = (rng, level) => {
  const s = makeStory(rng, level);
  return {
    skill: 'story-to-equation',
    atoms: [s.shape],
    prompt: `${s.text}\n\nLet $x$ be ${s.unknown}. Which equation tells this story?`,
    ...choice(rng, `$${storyEquation(s)}$`, wrongEquations(s)),
    explain: `$x$ is ${s.unknown}, so the story says $${storyEquation(s)}$.`,
  };
};

export const storySolve: Generator = (rng, level) => {
  const s = makeStory(rng, level);
  const nudges: [number, string][] = [
    [s.c, `That's a number from the story. The question asks for ${s.unknown}!`],
  ];
  if (s.shape === 'mul') {
    nudges.push([
      s.c - s.b,
      `So close! That's how many come in the full groups. Now divide by ${s.a}.`,
    ]);
    nudges.push([(s.c + s.b) / s.a, `The extra ${s.b} needs to be taken away, not added.`]);
  }
  if (s.shape === 'add') nudges.push([s.c + s.b, `He **found** coins, so he had fewer before.`]);
  if (s.shape === 'sub') nudges.push([s.c - s.b, `You **spent** gold, so you had more before!`]);
  if (s.shape === 'div')
    nudges.push([s.c / s.a, `Shared out means the hoard was bigger than each share!`]);
  return {
    skill: 'story-solve',
    atoms: [s.shape],
    prompt: `${s.text} **${s.question}**`,
    ...numeric(s.x, nudges),
    hint: `Write the equation first: let $x$ be ${s.unknown}.`,
    explain: solution(s),
  };
};
