import { paragraphs, renderMath, richToHtml } from '../math';

/** Renders rich text: $math$, $$display$$, **bold**, *italic*, blank-line paragraphs. */
export function Rich({ text, class: cls }: { text: string; class?: string }) {
  const html = paragraphs(text)
    .map((p) => `<p>${richToHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('');
  return <div class={`rich ${cls ?? ''}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Inline rich text without paragraph wrapping (for buttons, options). */
export function RichInline({ text }: { text: string }) {
  return <span dangerouslySetInnerHTML={{ __html: richToHtml(text) }} />;
}

/** A big centred equation. */
export function MathBig({ tex }: { tex: string }) {
  return <div class="math-big" dangerouslySetInnerHTML={{ __html: renderMath(tex, true) }} />;
}
