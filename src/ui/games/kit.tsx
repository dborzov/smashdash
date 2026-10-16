/**
 * Shared bits for the mini-games: how a game is scored, and the feedback bubble.
 *
 * Scoring is the same everywhere (like the EQcanvas): no slips → right; slips the player put
 * right → nudged; "Show me" → wrong. A game calls `onDone` once, when it is finished.
 */
import { useRef, useState } from 'preact/hooks';
import type { Outcome } from '../../engine/mastery';
import type { Verdict } from '../../games';
import { Rich } from '../components/Rich';
import { sfx } from '../../audio/sfx';

export interface GameProps<S> {
  spec: S;
  /** Called once when the game is finished. Lessons ignore the outcome. */
  onDone?: (o: Outcome) => void;
  /** A still picture: nothing to do. */
  still?: boolean;
}

export function useScore(onDone?: (o: Outcome) => void) {
  const slips = useRef(0);
  const shown = useRef(false);
  const [over, setOver] = useState(false);
  return {
    over,
    slip() {
      slips.current++;
    },
    showMe() {
      shown.current = true;
    },
    get slips() {
      return slips.current;
    },
    finish() {
      if (over) return;
      setOver(true);
      onDone?.(shown.current ? 'wrong' : slips.current ? 'nudged' : 'right');
    },
  };
}

/** Feedback for the last move: green when it worked, amber when it didn't. */
export function Say({ v, title }: { v: Verdict | null; title?: string }) {
  if (!v || (v.ok && !v.text)) return null;
  return (
    <div class={`feedback ${v.ok ? 'right' : 'nudge'} game-say`}>
      {title && <div class="title">{title}</div>}
      <Rich text={v.text ?? ''} />
    </div>
  );
}

/** "Show me" appears after a couple of misses. */
export function ShowMe({ misses, onClick, after = 2 }: { misses: number; onClick: () => void; after?: number }) {
  if (misses < after) return null;
  return (
    <button
      class="btn small ghost show-me"
      onClick={() => {
        sfx('page');
        onClick();
      }}
    >
      🙋 Show me
    </button>
  );
}

/** Plays the right sound for a verdict. */
export function ding(ok: boolean) {
  sfx(ok ? 'right' : 'nudge');
}
