/**
 * Progress through an adaptive run, shown as pips: answered problems are filled, the ones still
 * to do are hollow, and reinforcements added after a mistake are marked as extra training.
 * Progress never goes backwards — a mistake adds a pip, it never empties one.
 * `RunNews` shows a short line about the latest run event (reinforcement, redemption, combo…).
 */
import { useEffect, useState } from 'preact/hooks';
import type { Run, RunEvent } from '../../engine/adaptive';
import { remaining } from '../../engine/adaptive';
import { skillById } from '../../content';

export function RunBar({ run, icon = '⚔️' }: { run: Run; icon?: string }) {
  const left = remaining(run);
  const total = run.done + left;
  const extraLeft = Math.min(left, run.extra);
  const pips = total <= 24;
  return (
    <div class="runbar" aria-label={`${run.done} of ${total} done`}>
      <span class="chip">
        {icon} {run.done} / {total}
      </span>
      {pips ? (
        <div class="pips">
          {Array.from({ length: total }, (_, i) => (
            <i
              key={i}
              class={i < run.done ? 'on' : i >= total - extraLeft ? 'extra' : ''}
              title={i >= total - extraLeft && i >= run.done ? 'Extra training' : undefined}
            />
          ))}
        </div>
      ) : (
        <div class="bar good" style={{ flex: 1 }}>
          <i style={{ width: `${(run.done / total) * 100}%` }} />
        </div>
      )}
      {run.combo >= 3 && <span class="chip combo">🔥 ×{run.combo}</span>}
    </div>
  );
}

export function eventText(e: RunEvent, dark: boolean): string | null {
  const name = (s: string) => skillById[s]?.name ?? s;
  switch (e.kind) {
    case 'reinforce':
      return dark
        ? `Extra drill added: ${name(e.skill)}. We go again until it holds.`
        : `+1 practice on ${name(e.skill)} — let's iron that out!`;
    case 'iron':
      return dark
        ? `One more before we move on. Mistakes don't get left behind.`
        : `One more go at that one before we finish!`;
    case 'redeem':
      return dark ? `Mistake put right. +Grit.` : `You fixed it! +Grit bonus`;
    case 'swift':
      return dark
        ? `Swift strike: you clearly know this. One drill skipped.`
        : `Swift! You've got this one — one less to do.`;
    case 'combo':
      return e.n === 3 || e.n === 5 || e.n === 8 || (e.n > 8 && e.n % 5 === 0)
        ? `🔥 ${e.n} in a row! Combo bonus XP.`
        : null;
  }
}

/** The latest notable event, shown for a couple of seconds. */
export function RunNews({ events, dark = false }: { events: RunEvent[]; dark?: boolean }) {
  const [shown, setShown] = useState<string | null>(null);
  useEffect(() => {
    const msgs = events.map((e) => eventText(e, dark)).filter((x): x is string => !!x);
    if (!msgs.length) return;
    setShown(msgs[msgs.length - 1]);
    const t = setTimeout(() => setShown(null), 2600);
    return () => clearTimeout(t);
  }, [events]);
  if (!shown) return null;
  return (
    <div class="run-news" key={shown}>
      {shown}
    </div>
  );
}
