import type { Rng } from '../engine/rng';
import type { Answer, Nudge } from './types';

export interface Option {
  text: string;
  /** If the player picks this wrong option, nudge them instead of failing right away. */
  nudge?: string;
}

/**
 * Builds a shuffled multiple-choice answer. Duplicate option texts are dropped
 * (the correct one always survives) so generators can be sloppy with distractors.
 */
export function choice(
  rng: Rng,
  correct: string,
  distractors: (string | Option)[],
  maxOptions = 4,
): { answer: Answer; nudges: Nudge[] } {
  const seen = new Set([correct]);
  const opts: Option[] = [];
  for (const d of distractors) {
    const o = typeof d === 'string' ? { text: d } : d;
    if (seen.has(o.text)) continue;
    seen.add(o.text);
    opts.push(o);
  }
  // Misconception distractors (the ones with nudges) are the most useful, so keep them first.
  const shuffled = rng.shuffle(opts);
  const chosen = [...shuffled.filter((o) => o.nudge), ...shuffled.filter((o) => !o.nudge)].slice(
    0,
    maxOptions - 1,
  );
  const all = rng.shuffle([{ text: correct }, ...chosen] as Option[]);
  const nudges: Nudge[] = [];
  all.forEach((o, i) => {
    if (o.nudge) nudges.push({ match: i, text: o.nudge });
  });
  return {
    answer: {
      kind: 'choice',
      options: all.map((o) => o.text),
      correct: all.findIndex((o) => o.text === correct),
    },
    nudges,
  };
}

/** Number answer with nudges, dropping any nudge that equals the right answer. */
export function numeric(
  value: number,
  nudges: [number, string][] = [],
): { answer: Answer; nudges: Nudge[] } {
  const seen = new Set<number>([value]);
  const out: Nudge[] = [];
  for (const [match, text] of nudges) {
    if (!Number.isFinite(match) || seen.has(match)) continue;
    seen.add(match);
    out.push({ match, text });
  }
  return { answer: { kind: 'number', value }, nudges: out };
}

/** `3x`, `x`, `-x` style coefficient. */
export function coef(a: number, v = 'x'): string {
  if (a === 1) return v;
  if (a === -1) return `-${v}`;
  return `${a}${v}`;
}

/** Formats a signed term to append: `+ 5`, `- 3`. */
export function signed(n: number): string {
  return n < 0 ? `- ${-n}` : `+ ${n}`;
}

/** Formats a number for LaTeX: thin-space thousands separators, no float noise. */
export function tex(n: number): string {
  const s = fmt(n);
  const [int, frac] = s.split('.');
  const neg = int.startsWith('-');
  const digits = neg ? int.slice(1) : int;
  const grouped = digits.length > 4 ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, '{,}') : digits;
  return (neg ? '-' : '') + grouped + (frac ? '.' + frac : '');
}

/** Plain-text number without floating point noise (0.1 + 0.2 issues). */
export function fmt(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(parseFloat(n.toPrecision(12)));
}

/** Rounds away floating point noise. */
export function clean(n: number): number {
  return parseFloat(n.toPrecision(12));
}
