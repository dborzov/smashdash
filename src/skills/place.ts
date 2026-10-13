/**
 * Place-value helpers shared by the generators (src/skills/placevalue.ts, decimals.ts) and
 * the widgets (place chart, counting board, number lines).
 *
 * Places are indexed by their power of ten: 0 = ones, 3 = thousands, 6 = millions,
 * -1 = tenths, -3 = thousandths.
 */
import { clean } from './util';

export const PLACE_NAMES: Record<number, string> = {
  [-3]: 'thousandths',
  [-2]: 'hundredths',
  [-1]: 'tenths',
  0: 'ones',
  1: 'tens',
  2: 'hundreds',
  3: 'thousands',
  4: 'ten-thousands',
  5: 'hundred-thousands',
  6: 'millions',
  7: 'ten-millions',
  8: 'hundred-millions',
  9: 'billions',
};

/** Singular names: "the hundreds place", but "one hundred" / "a hundred". */
export const PLACE_ONE: Record<number, string> = {
  [-3]: 'thousandth',
  [-2]: 'hundredth',
  [-1]: 'tenth',
  0: 'one',
  1: 'ten',
  2: 'hundred',
  3: 'thousand',
  4: 'ten thousand',
  5: 'hundred thousand',
  6: 'million',
  7: 'ten million',
  8: 'hundred million',
  9: 'billion',
};

/** Column headers for charts and dials. */
export const PLACE_SHORT: Record<number, string> = {
  [-3]: 'th',
  [-2]: 'h',
  [-1]: 't',
  0: 'O',
  1: 'T',
  2: 'H',
  3: 'Th',
  4: 'TTh',
  5: 'HTh',
  6: 'M',
  7: 'TM',
  8: 'HM',
  9: 'B',
};

/** Period (group of three places) a place belongs to. */
export function periodOf(
  place: number,
): 'billions' | 'millions' | 'thousands' | 'ones' | 'decimals' {
  if (place < 0) return 'decimals';
  if (place >= 9) return 'billions';
  if (place >= 6) return 'millions';
  if (place >= 3) return 'thousands';
  return 'ones';
}

export const pow10 = (n: number): number => clean(Math.pow(10, n));

/** The digit of `v` in place `p` (works for decimals up to thousandths). */
export function digitAt(v: number, p: number): number {
  const scaled = Math.round(Math.abs(v) * 1000);
  return Math.floor(scaled / Math.round(pow10(p + 3))) % 10;
}

/** Highest place with a digit (0 for numbers below 10, including 0). */
export function topPlace(v: number): number {
  let p = 0;
  while (pow10(p + 1) <= Math.abs(v) + 1e-9) p++;
  return p;
}

/** Digits of a whole number from the top place down to the ones, e.g. 4072 → [4, 0, 7, 2]. */
export function digitsOf(v: number): number[] {
  return String(Math.round(Math.abs(v)))
    .split('')
    .map(Number);
}

/** Number of decimal places actually used (up to 3). */
export function decimalsOf(v: number): number {
  const s = clean(v).toString();
  return s.includes('.') ? Math.min(3, s.split('.')[1].length) : 0;
}

/**
 * Plain text with thousands separators: 4372519 → "4,372,519", 0.045 → "0.045".
 * (For LaTeX use `tex` from util, which also groups.)
 */
export function group(v: number): string {
  const s = clean(v).toString();
  const neg = s.startsWith('-');
  const [int, frac] = (neg ? s.slice(1) : s).split('.');
  const g = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (neg ? '-' : '') + g + (frac ? '.' + frac : '');
}

/** LaTeX with {,} separators for every number ≥ 1000 (util's `tex` only groups ≥ 10,000). */
export function texg(v: number): string {
  return group(v).replace(/,/g, '{,}');
}

/** Round to the nearest multiple of 10^place (half rounds up). */
export function roundTo(v: number, place: number): number {
  const u = pow10(place);
  return clean(Math.floor(v / u + 0.5 + 1e-9) * u);
}

/** Round down (truncate) to a multiple of 10^place. */
export function floorTo(v: number, place: number): number {
  const u = pow10(place);
  return clean(Math.floor(v / u + 1e-9) * u);
}

// ---------------------------------------------------------------------------
// Number words (US style: no "and" in whole numbers; "and" marks the decimal point).

const ONES = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** 0–999 in words ("" for 0 unless `zero`). */
function under1000(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (h) parts.push(`${ONES[h]} hundred`);
  if (rest) {
    if (rest < 20) parts.push(ONES[rest]);
    else parts.push(TENS[Math.floor(rest / 10)] + (rest % 10 ? `-${ONES[rest % 10]}` : ''));
  }
  return parts.join(' ');
}

/** A whole number in words: 2040006 → "two million, forty thousand, six". */
export function words(n: number): string {
  n = Math.round(n);
  if (n === 0) return 'zero';
  const groups: [number, string][] = [
    [1e9, 'billion'],
    [1e6, 'million'],
    [1e3, 'thousand'],
    [1, ''],
  ];
  const out: string[] = [];
  let rest = n;
  for (const [size, name] of groups) {
    const g = Math.floor(rest / size);
    rest %= size;
    if (g) out.push(under1000(g) + (name ? ` ${name}` : ''));
  }
  return out.join(', ');
}

/** Decimal in words: 4.027 → "four and twenty-seven thousandths". */
export function decimalWords(v: number): string {
  const d = decimalsOf(v);
  const whole = Math.floor(v + 1e-9);
  if (d === 0) return words(whole);
  const frac = Math.round((v - whole) * pow10(d));
  const unit = PLACE_NAMES[-d];
  const fracWords = `${words(frac)} ${frac === 1 ? unit.slice(0, -1) : unit}`;
  return whole ? `${words(whole)} and ${fracWords}` : fracWords;
}
