/** A speaker portrait plus speech bubble; text types out letter by letter (tap to finish). */
import { useEffect, useState } from 'preact/hooks';
import { cast } from '../../content';
import { Portrait } from '../../art/Portrait';
import { getProfile } from '../../engine/store';
import { Rich } from './Rich';
import type { ComponentChildren } from 'preact';

export function Dialogue({
  who,
  text,
  children,
}: {
  who?: string;
  text?: string;
  children?: ComponentChildren;
}) {
  const p = getProfile();
  const c = who ? cast[who] : undefined;
  const name = who === 'hero' ? (p?.hero.name ?? 'You') : c?.name;
  return (
    <div class="dialogue" style={{ '--who': c?.color ?? 'var(--gold)' } as Record<string, string>}>
      {who && (
        <div class="portrait">
          <Portrait who={who} profile={p} />
        </div>
      )}
      <div class="bubble panel">
        {name && <div class="who">{name}</div>}
        {text && <TypeText text={text} />}
        {children}
      </div>
    </div>
  );
}

/**
 * Reveals rich text progressively. Math is never split: we reveal by paragraph chunks of words,
 * which keeps LaTeX intact while still feeling alive.
 */
export function TypeText({ text, class: cls }: { text: string; class?: string }) {
  const words = text.split(/(\s+)/);
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const id = setInterval(() => {
      setN((k) => {
        if (k >= words.length) {
          clearInterval(id);
          return k;
        }
        return k + 2;
      });
    }, 28);
    return () => clearInterval(id);
  }, [text]);
  const done = n >= words.length;
  // Never cut inside $...$: extend to the end of any open math span.
  let shown = words.slice(0, n).join('');
  if (!done) {
    const dollars = (shown.match(/\$/g) ?? []).length;
    if (dollars % 2 === 1) {
      const rest = text.slice(shown.length);
      const close = rest.indexOf('$');
      shown += rest.slice(0, close + 1);
    }
    const bolds = (shown.match(/\*\*/g) ?? []).length;
    if (bolds % 2 === 1) shown += '**';
  }
  return (
    <div class={`text ${cls ?? ''}`} onClick={() => setN(words.length)}>
      <Rich text={done ? text : shown} />
    </div>
  );
}
