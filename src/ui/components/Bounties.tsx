/** Today's bounties: three small goals, gold for each, and a chest for all three. */
import { useState } from 'preact/hooks';
import type { Profile } from '../../engine/profile';
import { claimChest, claimQuest, questById, questReady } from '../../engine/quests';
import { update } from '../../engine/store';
import { itemById } from '../../content';
import { sfx } from '../../audio/sfx';
import type { Fx } from '../../engine/rewards';
import { track } from '../../engine/events';

export function Bounties({ p }: { p: Profile }) {
  const [opened, setOpened] = useState<{ gold: number; item: string } | null>(null);
  const qd = p.quests;
  if (!qd) return null;
  const allClaimed = qd.list.every((q) => q.claimed);
  return (
    <div class="panel bounties">
      <div class="section-title" style={{ margin: 0 }}>
        📜 Today's bounties
      </div>
      <div class="stack" style={{ marginTop: '8px' }}>
        {qd.list.map((q) => {
          const def = questById[q.id];
          if (!def) return null;
          const ready = questReady(q);
          return (
            <div key={q.id} class={`bounty ${q.claimed ? 'claimed' : ''} ${ready ? 'ready' : ''}`}>
              <span class="bounty-icon">{def.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div>{def.text(q.goal)}</div>
                <div class="row" style={{ gap: '6px' }}>
                  <div class="bar good" style={{ flex: 1 }}>
                    <i style={{ width: `${(q.have / q.goal) * 100}%` }} />
                  </div>
                  <span class="muted" style={{ fontSize: '.8rem' }}>
                    {q.have}/{q.goal}
                  </span>
                </div>
              </div>
              {q.claimed ? (
                <span class="chip">✓</span>
              ) : (
                <button
                  class={`btn small ${ready ? 'gold' : 'ghost'}`}
                  disabled={!ready}
                  onClick={() => {
                    sfx('coin');
                    update((x) => {
                      const gold = claimQuest(x, q.id);
                      const fx: Fx[] = gold ? [{ kind: 'gold', amount: gold }] : [];
                      return [...fx, ...track(x, 'goldEarned', gold)];
                    });
                  }}
                >
                  🪙 {def.gold}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {allClaimed && !qd.chest && (
        <button
          class="btn mint wide"
          style={{ marginTop: '10px' }}
          onClick={() => {
            sfx('unlock');
            let got: { gold: number; item: string } | null = null;
            update((x) => {
              got = claimChest(x);
              return got
                ? [
                    { kind: 'gold', amount: got.gold },
                    { kind: 'item', item: got.item, count: 1 },
                  ]
                : [];
            });
            setOpened(got);
          }}
        >
          🧰 Open the bounty chest!
        </button>
      )}
      {qd.chest && (
        <p class="muted" style={{ margin: '8px 0 0', fontSize: '.9rem' }}>
          {opened
            ? `Chest opened: ${opened.gold} gold and ${itemById[opened.item]?.icon} ${itemById[opened.item]?.name}!`
            : 'All done for today. New bounties tomorrow.'}
        </p>
      )}
    </div>
  );
}
