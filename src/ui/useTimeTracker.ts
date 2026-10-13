/**
 * Counts time spent playing in a region (for the adventure board's "time spent" stats).
 * Only counts while the page is visible and the player has touched something in the last
 * minute, so a tablet left on the table doesn't rack up hours.
 */
import { useEffect } from 'preact/hooks';
import { update } from '../engine/store';

const IDLE = 60_000;
const TICK = 5_000;
let lastInput = Date.now();

if (typeof window !== 'undefined') {
  for (const ev of ['pointerdown', 'keydown', 'touchstart']) {
    window.addEventListener(ev, () => (lastInput = Date.now()), { passive: true });
  }
}

export function useTimeTracker(regionId: string | undefined): void {
  useEffect(() => {
    if (!regionId) return;
    let pending = 0;
    const flush = () => {
      if (pending <= 0) return;
      const ms = pending;
      pending = 0;
      update((p) => {
        p.time[regionId] = (p.time[regionId] ?? 0) + ms;
      });
    };
    const tick = setInterval(() => {
      const visible = typeof document === 'undefined' || document.visibilityState === 'visible';
      if (visible && Date.now() - lastInput < IDLE) pending += TICK;
      if (pending >= 30_000) flush();
    }, TICK);
    return () => {
      clearInterval(tick);
      flush();
    };
  }, [regionId]);
}
