/**
 * Celebrations for rewards: toasts for XP/gold/items, and big modals for level-ups,
 * reaching the daily goal, and streak news.
 */
import { useEffect, useState } from 'preact/hooks';
import { fxQueue, dayNews, clearDayNews, useProfile } from '../../engine/store';
import type { Fx } from '../../engine/rewards';
import { achievementById, itemById, skillById } from '../../content';
import { getProfile } from '../../engine/store';
import { questById } from '../../engine/quests';
import { TIER_NAMES, type Tier } from '../../engine/mastery';

function AchCard({ id }: { id: string }) {
  const a = achievementById[id];
  if (!a) return null;
  return (
    <>
      <div style={{ fontSize: '4rem' }} class="anim-wobble">
        {a.icon}
      </div>
      <div class="muted" style={{ letterSpacing: '.1em', fontSize: '.8rem' }}>
        TROPHY EARNED
      </div>
      <h2>{a.name}</h2>
      <p>{a.desc}</p>
      <div class="row wrap" style={{ justifyContent: 'center' }}>
        {a.gold > 0 && <span class="chip gold">🪙 +{a.gold}</span>}
        {a.item && (
          <span class="chip">
            {itemById[a.item]?.icon} {itemById[a.item]?.name}
          </span>
        )}
        {a.title && <span class="chip">🏷️ New title: "{a.title}"</span>}
      </div>
    </>
  );
}
import { titleFor } from '../../engine/profile';
import { Modal } from './Bits';
import { Confetti } from './Confetti';
import { sfx } from '../../audio/sfx';

type BigFx = Fx | { kind: 'achMany'; ids: string[] };

function questText(id: string): string {
  const q = getProfile()?.quests?.list.find((x) => x.id === id);
  const def = questById[id];
  return def ? def.text(q?.goal ?? 1) : id;
}

interface Toast {
  id: number;
  text: string;
}
let nextId = 1;

export function FxLayer() {
  const p = useProfile();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [big, setBig] = useState<BigFx[]>([]);
  const [news, setNews] = useState(dayNews);

  useEffect(() => {
    if (!fxQueue.length) return;
    const fx = fxQueue.splice(0);
    const t: Toast[] = [];
    for (const f of fx) {
      if (f.kind === 'xp') t.push({ id: nextId++, text: `✨ +${f.amount} XP` });
      if (f.kind === 'gold') t.push({ id: nextId++, text: `🪙 +${f.amount} gold` });
      if (f.kind === 'item')
        t.push({
          id: nextId++,
          text: `${itemById[f.item]?.icon ?? '🎁'} +${f.count} ${itemById[f.item]?.name ?? f.item}`,
        });
      if (f.kind === 'egg') t.push({ id: nextId++, text: '🥚 A mysterious egg!' });
      if (f.kind === 'quest')
        t.push({
          id: nextId++,
          text: `📜 Bounty done: ${questText(f.id)} — claim it on the board!`,
        });
      if (f.kind === 'tier') {
        const sk = skillById[f.skill];
        if (sk)
          t.push({
            id: nextId++,
            text:
              f.to >= 2 && f.up
                ? `⬆️ ${sk.icon} ${sk.name}: ${TIER_NAMES[f.to as Tier]}! Harder problems unlocked.`
                : `🔁 ${sk.icon} ${sk.name}: a step back to firm it up.`,
          });
      }
    }
    if (t.length) {
      setToasts((old) => [...old, ...t]);
      setTimeout(() => setToasts((old) => old.filter((x) => !t.includes(x))), 2800);
    }
    const achs = fx.filter((f): f is Extract<Fx, { kind: 'ach' }> => f.kind === 'ach');
    if (achs.length >= 3) {
      setBig((old) => [...old, { kind: 'achMany', ids: achs.map((a) => a.id) } as BigFx]);
      sfx('goal');
    } else if (achs.length) {
      setBig((old) => [...old, ...achs]);
      sfx('goal');
    }
    const b = fx.filter((f) => f.kind === 'level' || f.kind === 'goal');
    if (b.length) {
      setBig((old) => [...old, ...b]);
      sfx(b.some((f) => f.kind === 'level') ? 'level' : 'goal');
    }
  });

  useEffect(() => {
    if (p && (dayNews.lost || dayNews.shieldsUsed)) setNews({ ...dayNews });
  }, [p?.id]);

  const shown = big[0];
  return (
    <>
      <div class="toasts">
        {toasts.map((t) => (
          <div key={t.id} class="toast">
            {t.text}
          </div>
        ))}
      </div>
      {shown && (
        <Modal onClose={() => setBig(big.slice(1))}>
          <Confetti />
          {shown.kind === 'level' ? (
            <>
              <div style={{ fontSize: '4rem' }}>⬆️</div>
              <h2>Level {shown.level}!</h2>
              <p>
                You are now a <b style={{ color: 'var(--gold)' }}>{titleFor(shown.level)}</b>.
              </p>
              {(shown.level === 5 || shown.level === 10) && (
                <p>❤️ You gained an extra heart in battle!</p>
              )}
              <p class="muted">New items may be waiting in the shop.</p>
            </>
          ) : shown.kind === 'ach' ? (
            <AchCard id={shown.id} />
          ) : shown.kind === 'achMany' ? (
            <>
              <div style={{ fontSize: '4rem' }}>🏆</div>
              <h2>{shown.ids.length} trophies earned!</h2>
              <p class="muted">Your past deeds have been written down.</p>
              <div class="row wrap" style={{ justifyContent: 'center' }}>
                {shown.ids.map((id) => (
                  <span key={id} class="chip">
                    {achievementById[id]?.icon} {achievementById[id]?.name}
                  </span>
                ))}
              </div>
              <p class="muted">See them all on the Hero screen.</p>
            </>
          ) : shown.kind === 'goal' ? (
            <>
              <div style={{ fontSize: '4rem' }}>🔥</div>
              <h2>Daily goal smashed!</h2>
              <p>
                Streak:{' '}
                <b style={{ color: 'var(--gold)' }}>{shown.kind === 'goal' ? shown.streak : 0}</b>{' '}
                day{shown.kind === 'goal' && shown.streak === 1 ? '' : 's'} in a row.
              </p>
              <p class="muted">Come back tomorrow to keep the fire burning.</p>
            </>
          ) : null}
          <button class="btn gold big" onClick={() => setBig(big.slice(1))}>
            Woohoo!
          </button>
        </Modal>
      )}
      {!shown && (news.lost || news.shieldsUsed) && (
        <Modal
          onClose={() => {
            clearDayNews();
            setNews({});
          }}
        >
          {news.lost ? (
            <>
              <div style={{ fontSize: '4rem' }}>💨</div>
              <h2>Your streak fizzled out…</h2>
              <p>
                Your {news.lost}-day streak went out like a wet sock. Grimble is pretending not to
                be disappointed.
              </p>
              <p class="muted">Hit today's goal to start a new one!</p>
            </>
          ) : (
            <>
              <div style={{ fontSize: '4rem' }}>🛡️</div>
              <h2>Streak Shield used!</h2>
              <p>
                You missed {news.shieldsUsed} day{news.shieldsUsed === 1 ? '' : 's'}, but your
                shield saved your streak. Phew.
              </p>
            </>
          )}
          <button
            class="btn gold"
            onClick={() => {
              clearDayNews();
              setNews({});
            }}
          >
            OK
          </button>
        </Modal>
      )}
    </>
  );
}
