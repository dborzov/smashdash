/**
 * Region 5 — Bazaar of Whispers: story problems.
 *
 * Split into three atomic skills:
 *  - name-unknown:      in this story, what IS the mystery number?
 *  - story-to-equation: write the equation that tells the story, on the EQcanvas slate.
 *  - story-solve:       write it, solve it move by move, and answer the question asked.
 *
 * Story numbers are marked as tiles ([[51|legs in all]]) so they can be dragged onto the slate,
 * and each one knows what it means — the slate reads the player's equation back in words.
 */
import type { Rng } from '../engine/rng';
import type { CanvasAnswer, Generator, Level } from './types';
import { choice } from './util';
import { plainStory } from '../engine/eqcanvas';
import { lin } from './balance';
import { steps } from './equations';

const r = String.raw;

export interface Story {
  /** The story with its numbers marked as EQcanvas tiles: 'bags of [[6|apples in each bag]]'. */
  story: string;
  /** The same story as plain text. */
  text: string;
  /** What x stands for, e.g. "the number of bags". */
  unknown: string;
  /** Other quantities from the story (distractors for name-unknown). */
  others: string[];
  /** The question as asked, e.g. "How many bags?" */
  question: string;
  /** Unit of the answer: "bags". */
  unit: string;
  /** The equation in words: "apples in the bags + loose apples = all the apples". */
  words: string;
  /** How x turns into the first piece of the equation: "$x$ bags of 6 apples is $6x$ apples." */
  build: string;
  a: number;
  b: number;
  c: number;
  /** 'mul': a·x + b = c, 'add': x + b = c, 'sub': x − b = c, 'div': x / a = c */
  shape: 'mul' | 'add' | 'sub' | 'div';
  x: number;
}

type Template = (rng: Rng, level: Level) => Omit<Story, 'text'> & { decoy: (d: number) => string };

/** A tile marker for the EQcanvas: the number, then what it means in the story. */
const t = (v: number, means: string) => `[[${v}|${means}]]`;
const decoyTile = (v: number, means: string) => `[[${v}|${means}|decoy]]`;

const templates: Template[] = [
  (rng) => {
    const a = rng.int(3, 8),
      x = rng.int(2, 9),
      b = rng.int(1, a - 1);
    return {
      story: `Merchant Pib sells apples in bags of ${t(a, 'apples in each bag')}. A hungry troll buys some bags plus ${t(b, 'loose apples')} — ${t(a * x + b, 'apples in total')}.`,
      decoy: (d) => ` Pib has ${decoyTile(d, 'cousins')} cousins, all called Pib.`,
      question: 'How many bags did the troll buy?',
      unknown: 'the number of bags',
      unit: 'bags',
      words: 'apples in the bags + loose apples = all the apples',
      build: `$x$ bags of ${a} apples is $${a}x$ apples.`,
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
      b = rng.intExcept(2, 15, [a, x]);
    return {
      story: `The ogre Burpington burps ${t(a, 'burps every hour')} times every hour. After a few hours of feasting, plus ${t(b, 'bonus burps')} bonus burps at dessert, he has burped ${t(a * x + b, 'burps altogether')} times.`,
      decoy: (d) => ` His ${decoyTile(d, 'pet rats')} pet rats are unimpressed.`,
      question: 'How many hours did he feast?',
      unknown: 'the number of hours',
      unit: 'hours',
      words: 'burps from feasting + dessert burps = all the burps',
      build: `$x$ hours of ${a} burps is $${a}x$ burps.`,
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
      story: `A goblin had some gold coins. He found ${t(b, 'coins in the sock')} more in a smelly sock. Now he has ${t(x + b, 'coins now')}.`,
      decoy: (d) => ` The sock had ${decoyTile(d, 'holes in it')} holes in it.`,
      question: 'How many coins did he have at the start?',
      unknown: 'the coins he had at the start',
      unit: 'coins',
      words: 'coins at the start + coins from the sock = coins now',
      build: `He started with $x$ and found ${b} more: $x + ${b}$.`,
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
      story: `You had some gold. You spent ${t(b, 'gold on the cheese')} on a suspicious cheese, and now you have ${t(c, 'gold left')} left.`,
      decoy: (d) => ` The cheese had ${decoyTile(d, 'flies on it')} flies on it. Bargain.`,
      question: 'How much gold did you have before the cheese?',
      unknown: 'the gold you had before',
      unit: 'gold',
      words: 'gold before − price of the cheese = gold left',
      build: `Start with $x$ gold and take ${b} away: $x - ${b}$.`,
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
      story: `A dragon's hoard of gems is shared equally between ${t(a, 'baby dragons')} baby dragons. Each baby gets ${t(c, 'gems for each baby')} gems.`,
      decoy: (d) => ` The babies are ${decoyTile(d, 'days old')} days old and already bite.`,
      question: 'How many gems were in the hoard?',
      unknown: 'the number of gems in the hoard',
      unit: 'gems',
      words: 'the whole hoard ÷ number of babies = gems for each baby',
      build: `The hoard, $x$, shared between ${a} babies: $x \\div ${a}$, which we write $\\frac{x}{${a}}$.`,
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
      b = rng.intExcept(2, 9, [a]);
    return {
      story: `Tickets to the Great Sock Circus cost ${t(a, 'gold for each ticket')} gold each. A family buys some tickets and one ${t(b, 'gold for the popcorn')}-gold bucket of popcorn. They pay ${t(a * x + b, 'gold in total')} gold.`,
      decoy: (d) => ` The clown juggles ${decoyTile(d, 'socks')} socks.`,
      question: 'How many tickets did they buy?',
      unknown: 'the number of tickets',
      unit: 'tickets',
      words: 'cost of the tickets + cost of the popcorn = what they paid',
      build: `$x$ tickets at ${a} gold each cost $${a}x$ gold.`,
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
      story: `In a creepy cave there are some spiders (${t(8, 'legs on each spider')} legs each) and one wobbly ${t(b, 'legs on the stool')}-legged stool. Counting everything, there are ${t(8 * x + b, 'legs in all')} legs.`,
      decoy: (d) => ` Also ${decoyTile(d, 'bats')} bats, but bats don't have legs worth counting.`,
      question: 'How many spiders are there?',
      unknown: 'the number of spiders',
      unit: 'spiders',
      words: 'spider legs + stool legs = all the legs',
      build: `$x$ spiders with 8 legs each have $8x$ legs.`,
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
      b = rng.intExcept(1, 10, [a]);
    return {
      story: `The wizard Glimmerbeard is ${t(a, 'times as old')} times as old as his apprentice, plus ${t(b, 'extra years')} years. The wizard is ${t(a * x + b, "years old (the wizard's age)")}.`,
      decoy: (d) => ` He owns ${decoyTile(d, 'pointy hats')} pointy hats.`,
      question: 'How old is the apprentice?',
      unknown: "the apprentice's age",
      unit: 'years old',
      words: `${a} × the apprentice's age + extra years = the wizard's age`,
      build: `${a} times the apprentice's age is $${a}x$.`,
      others: ["the wizard's age", 'how many times older the wizard is', 'the extra years'],
      a,
      b,
      c: a * x + b,
      shape: 'mul',
      x,
    };
  },
];

/** A random story. At level 3 it may carry a decoy number the question doesn't need. */
export function makeStory(rng: Rng, level: Level, decoys = false): Story {
  const pool = level === 1 ? templates.filter((_, i) => [2, 3, 4].includes(i)) : templates;
  const { decoy, ...s } = rng.pick(pool)(rng, level);
  const nums = [s.a, s.b, s.c];
  const story =
    decoys && level === 3 && rng.chance(0.5) ? s.story + decoy(rng.intExcept(2, 9, nums)) : s.story;
  return { ...s, story, text: plainStory(story) };
}

/** The equation as EQcanvas text: '6x+2=20', 'x/4=6'. */
export function storyEqText(s: Story): string {
  switch (s.shape) {
    case 'mul':
      return `${s.a}x+${s.b}=${s.c}`;
    case 'add':
      return `x+${s.b}=${s.c}`;
    case 'sub':
      return `x-${s.b}=${s.c}`;
    default:
      return `x/${s.a}=${s.c}`;
  }
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

/** Predicted wrong equations (as EQcanvas text) and what to say about each. */
function storyTraps(s: Story): { eq: string; text: string }[] {
  switch (s.shape) {
    case 'mul':
      return [
        {
          eq: `${s.b}x+${s.a}=${s.c}`,
          text: `Swapped! Which number comes with **each one**? That one multiplies $x$: ${s.build}`,
        },
        {
          eq: `x+${s.a}+${s.b}=${s.c}`,
          text: `Each one comes with ${s.a} — that's ${s.a} **times** $x$, not $+ ${s.a}$ just once.`,
        },
        {
          eq: `${s.a}x-${s.b}=${s.c}`,
          text: `The ${s.b} is **extra** — added on top. That's $+ ${s.b}$.`,
        },
        {
          eq: `${s.a}+${s.b}x=${s.c}`,
          text: `Which number comes with **each one**? That one multiplies $x$: ${s.build}`,
        },
      ];
    case 'add':
      return [
        { eq: `x-${s.b}=${s.c}`, text: `He **found** more — the pile got bigger. That's adding.` },
        {
          eq: `${s.b}x=${s.c}`,
          text: `Finding ${s.b} coins **adds** them on. No multiplying here.`,
        },
      ];
    case 'sub':
      return [
        {
          eq: `x+${s.b}=${s.c}`,
          text: `You **spent** gold — the pile got smaller. That's subtracting.`,
        },
        {
          eq: `${s.b}-x=${s.c}`,
          text: `Start with what you had, $x$, then take ${s.b} away: $x - ${s.b}$.`,
        },
      ];
    default:
      return [
        {
          eq: `${s.a}x=${s.c}`,
          text: `Sharing out means **dividing** the hoard, not multiplying it.`,
        },
        {
          eq: `x-${s.a}=${s.c}`,
          text: `Sharing between ${s.a} babies isn't taking ${s.a} away — it's **dividing** by ${s.a}.`,
        },
        {
          eq: `${s.c}/${s.a}=x`,
          text: `That shares out the ${s.c}. But ${s.c} is what **each baby** got — the hoard $x$ is what was shared.`,
        },
      ];
  }
}

/** The EQcanvas answer for a story: build it (and solve it, in 'full' mode). */
function storyCanvas(s: Story, mode: 'build' | 'full', level: Level): CanvasAnswer {
  return {
    kind: 'canvas',
    mode,
    equation: storyEqText(s),
    x: s.x,
    story: s.story,
    question: s.question,
    unknown: s.unknown,
    unit: s.unit,
    words: s.words,
    scaffold: level === 1,
    traps: storyTraps(s),
    hints: [
      `Say it in words first: **${s.words}**.`,
      `$x$ is ${s.unknown}. ${s.build}`,
      `Put the pieces together so they say: **${s.words}**. The total sits alone on one side of the $=$.`,
    ],
  };
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
  const s = makeStory(rng, level, true);
  const answer = storyCanvas(s, 'build', level);
  return {
    skill: 'story-to-equation',
    atoms: [s.shape],
    prompt: `${s.text}\n\nLet $x$ be ${s.unknown}. Write the equation that tells this story.`,
    answer,
    hint: answer.hints![0],
    explain: `$x$ is ${s.unknown}. In words: ${s.words}. So the story says $${storyEquation(s)}$.`,
  };
};

export const storySolve: Generator = (rng, level) => {
  const s = makeStory(rng, level, true);
  const answer = storyCanvas(s, 'full', level);
  return {
    skill: 'story-solve',
    atoms: [s.shape],
    prompt: `${s.text} **${s.question}**`,
    answer,
    hint: answer.hints![0],
    explain: `In words: ${s.words}. With $x$ as ${s.unknown}: ` + solution(s),
  };
};
