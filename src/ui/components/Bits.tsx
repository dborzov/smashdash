/** Small shared bits: progress bar, modal, stars. */
import type { ComponentChildren } from 'preact';

export function Bar({
  value,
  max,
  kind = '',
  lg,
}: {
  value: number;
  max: number;
  kind?: string;
  lg?: boolean;
}) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div class={`bar ${kind} ${lg ? 'lg' : ''}`}>
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Modal({
  children,
  onClose,
  class: cls,
}: {
  children: ComponentChildren;
  onClose?: () => void;
  class?: string;
}) {
  return (
    <div class="modal-back" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div class={`modal panel ${cls ?? ''}`}>{children}</div>
    </div>
  );
}

export function Stars({ n, of = 3 }: { n: number; of?: number }) {
  return (
    <span class="stars" aria-label={`${n} of ${of} stars`}>
      {Array.from({ length: of }, (_, i) => (i < n ? '⭐' : '☆')).join('')}
    </span>
  );
}

export function Hearts({ n, max }: { n: number; max: number }) {
  return (
    <span class="hearts" style={{ fontSize: '1.4rem', letterSpacing: '2px' }}>
      {Array.from({ length: max }, (_, i) => (i < n ? '❤️' : '🖤')).join('')}
    </span>
  );
}
