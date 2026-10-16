/** A small keypad for working out numbers on the slate and in mini-games. */
import { useEffect, useRef } from 'preact/hooks';
import { sfx } from '../../audio/sfx';

export function MiniPad({
  value,
  set,
  onGo,
  goLabel = '✓',
}: {
  value: string;
  set: (v: string) => void;
  onGo: (v: string) => void;
  goLabel?: string;
}) {
  // Keys can arrive faster than renders: always build on the latest value.
  const cur = useRef(value);
  cur.current = value;
  const go = useRef(onGo);
  go.current = onGo;
  const press = (k: string) => {
    sfx('click');
    const v = cur.current;
    const next =
      k === '⌫'
        ? v.slice(0, -1)
        : k === '−'
          ? v.startsWith('-')
            ? v.slice(1)
            : '-' + v
          : k === '.'
            ? v.includes('.')
              ? v
              : (v || '0') + '.'
            : v.replace(/[-.]/g, '').length >= 7
              ? v
              : v === '0'
                ? k
                : v + k;
    cur.current = next;
    set(next);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('⌫');
      else if (e.key === '-') press('−');
      else if (e.key === '.') press('.');
      else if (e.key === 'Enter') {
        e.preventDefault();
        go.current(cur.current);
      } else return;
      e.stopPropagation();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div class="mini-pad">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.', '−', '⌫'].map((k) => (
        <button key={k} class={`key ${/[0-9]/.test(k) ? '' : 'fn'}`} onClick={() => press(k)}>
          {k}
        </button>
      ))}
      <button class="key go" disabled={value === '' || value === '-'} onClick={() => onGo(value)}>
        {goLabel}
      </button>
    </div>
  );
}
