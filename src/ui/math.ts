/**
 * KaTeX rendering + a tiny rich-text format used everywhere in content:
 *   $inline math$, $$display math$$, **bold**, *italic*, blank line = new paragraph.
 *
 * Unknowns (x, y) and the mystery box (□) are automatically wrapped in a `.var` span so
 * they always show up in the same "mystery" colour — a deliberate visual anchor.
 */
import katex from 'katex';

const MACROS: Record<string, string> = {
  '\\box': '\\square',
  '\\hl': '\\htmlClass{hl}{#1}',
  '\\good': '\\htmlClass{good}{#1}',
  '\\bad': '\\htmlClass{bad}{#1}',
  '\\muted': '\\htmlClass{muted}{#1}',
};

const cache = new Map<string, string>();

export function renderMath(tex: string, display = false, throwOnError = false): string {
  const key = (display ? 'D' : 'I') + tex;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  // Inline maths uses display style so fractions and exponents stay full-size and readable.
  let html = katex.renderToString(display ? tex : `\\displaystyle ${tex}`, {
    displayMode: display,
    throwOnError,
    macros: { ...MACROS },
    trust: (ctx) => ctx.command === '\\htmlClass',
    strict: false,
  });
  html = html
    .replace(
      /<span class="mord mathnormal"([^>]*)>([xy])<\/span>/g,
      '<span class="mord mathnormal var"$1>$2</span>',
    )
    .replace(
      /<span class="mord amsrm"([^>]*)>□<\/span>/g,
      '<span class="mord amsrm var"$1>□</span>',
    );
  cache.set(key, html);
  return html;
}

export type Token =
  | { t: 'text'; s: string }
  | { t: 'math'; s: string; display: boolean }
  | { t: 'b'; s: string }
  | { t: 'i'; s: string };

/** Splits a rich-text paragraph into tokens. */
export function tokenize(src: string): Token[] {
  const out: Token[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$|\*\*([^*]+?)\*\*|\*([^*\s][^*]*?)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push({ t: 'text', s: src.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ t: 'math', s: m[1], display: true });
    else if (m[2] !== undefined) out.push({ t: 'math', s: m[2], display: false });
    else if (m[3] !== undefined) out.push({ t: 'b', s: m[3] });
    else out.push({ t: 'i', s: m[4] });
    last = re.lastIndex;
  }
  if (last < src.length) out.push({ t: 'text', s: src.slice(last) });
  return out;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Renders one paragraph of rich text to HTML. Bold may contain math. */
export function richToHtml(src: string): string {
  return tokenize(src)
    .map((tok) => {
      switch (tok.t) {
        case 'math':
          return renderMath(tok.s, tok.display);
        case 'b':
          return `<strong>${richToHtml(tok.s)}</strong>`;
        case 'i':
          return `<em>${esc(tok.s)}</em>`;
        default:
          return esc(tok.s);
      }
    })
    .join('');
}

/** Splits rich text into paragraphs on blank lines (single newlines become line breaks). */
export function paragraphs(src: string): string[] {
  return src
    .trim()
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
