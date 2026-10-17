/**
 * The Region screen's lower half once the story is done: the rank track (I Story → V Ridiculous,
 * with the two-sleep cooldown), the next rank's path, the region's treasures and its trophies.
 * Rank rules live in src/engine/ranks.ts.
 */
import type { Region } from '../../content/schema';
import type { Profile } from '../../engine/profile';
import { achievements, campaignById, itemById } from '../../content';
import {
  MAX_RANK,
  RANKS,
  nextRank,
  opensIn,
  rankGold,
  rankInfo,
  rankNodeOpen,
  rankOf,
  rankPath,
  rankReady,
  rankState,
  rankXp,
  type RankNode,
} from '../../engine/ranks';
import { achProgress } from '../../engine/achievements';
import { relicText } from '../../engine/relics';
import { go } from '../router';
import { sfx } from '../../audio/sfx';

/** Icons for encounter games (also used by the story path). */
export const GAME_ICON: Record<string, string> = {
  chest: '🧰',
  bridge: '🌉',
  siege: '🏰',
  vault: '🔐',
  battle: '⚔️',
  duel: '🤺',
  rescue: '🛟',
};

const crest = (n: number) => ({ '--crest': rankInfo(n).color }) as Record<string, string>;

function rankNodeIcon(n: RankNode): string {
  if (n.type === 'story') return '📜';
  if (n.type === 'boss') return '💀';
  if (n.id === 'hunt') return '🔎';
  return GAME_ICON[n.game] ?? '⚔️';
}

export function RankTrack({ p, region }: { p: Profile; region: Region }) {
  const have = rankOf(p, region);
  const next = nextRank(p, region);
  const ready = rankReady(p, region);
  const camp = campaignById[region.campaign];
  const path = next ? rankPath(region, next) : [];
  const run = rankState(p, region).run;
  const firstOpen = path.findIndex((n, i) => run[n.id] === undefined && rankNodeOpen(p, region, path, i));

  return (
    <div class="panel rank-panel">
      <div class="section-title" style={{ marginTop: 0 }}>
        🏅 Ranks
      </div>
      <div class="rank-track">
        {RANKS.map((r) => (
          <div key={r.n} class={`rank-step ${r.n <= have ? 'got' : ''} ${r.n === next ? 'next' : ''}`}>
            <span class={`rank-crest ${r.n <= have ? '' : 'dim'}`} style={crest(r.n)}>
              {r.icon}
            </span>
            <small>{r.name}</small>
          </div>
        ))}
      </div>
      {have === 0 && (
        <p class="muted" style={{ marginBottom: 0 }}>
          Finish the story path to unlock <b>Heroic</b>: the same region again with harder problems, a
          plot twist, and treasure.
        </p>
      )}
      {have >= MAX_RANK && (
        <p style={{ marginBottom: 0 }}>
          🤪 <b>Ridiculous</b> cleared. There is nothing harder here. You can stop now. (You won't.)
        </p>
      )}
      {next && !ready && (
        <div class="rank-wait">
          <span style={{ fontSize: '2rem' }}>💤</span>
          <div>
            <b>
              {rankInfo(next).name} opens {opensIn(p, region)}.
            </b>{' '}
            <span class="muted">{camp?.cooldown}</span>
          </div>
        </div>
      )}
      {next && ready && (
        <>
          <p style={{ margin: '4px 0 8px' }}>
            <b>
              {rankInfo(next).icon} {rankInfo(next).name}
            </b>{' '}
            is open! Harder problems, a twist, a Mistake Hunt and a boss with one more phase.{' '}
            <span class="muted">
              Reward: {rankXp(next)} XP, {rankGold(next)} gold
              {region.treasures.some((t) => t.rank === next) ? ' and a treasure' : ''}.
            </span>
          </p>
          <div class="rank-nodes">
            {path.map((n, i) => {
              const done = run[n.id] !== undefined;
              const open = rankNodeOpen(p, region, path, i);
              return (
                <button
                  key={n.id}
                  class={`rank-node ${done ? 'done' : ''} ${i === firstOpen ? 'current' : ''}`}
                  disabled={!open}
                  onClick={() => {
                    sfx('click');
                    go(`/rank/${region.id}/${n.id}`);
                  }}
                >
                  <span class="rank-node-icon">{done ? '✅' : open ? rankNodeIcon(n) : '🔒'}</span>
                  <span>{n.title}</span>
                </button>
              );
            })}
          </div>
          {firstOpen >= 0 && (
            <button
              class="btn gold big wide"
              style={{ marginTop: '10px' }}
              onClick={() => {
                sfx('click');
                go(`/rank/${region.id}/${path[firstOpen].id}`);
              }}
            >
              {rankInfo(next).icon} {firstOpen === 0 ? 'Start' : 'Continue'} {rankInfo(next).name}: {path[firstOpen].title}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function RegionLoot({ p, region }: { p: Profile; region: Region }) {
  const trophies = achievements.filter((a) => a.region === region.id);
  if (!region.treasures.length && !trophies.length) return null;
  const flawless = p.counters[`flawless:${region.id}`] ?? 0;
  return (
    <div class="panel" style={{ marginBottom: '20px' }}>
      {region.treasures.length > 0 && (
        <>
          <div class="section-title" style={{ marginTop: 0 }}>
            💎 Treasures of {region.name}
          </div>
          <p class="muted" style={{ marginTop: 0, fontSize: '.9rem' }}>
            Only this region gives these. Pets on expeditions here can bring back its souvenirs too.
          </p>
          <div class="treasure-list">
            {region.treasures.map((t) => {
              const it = itemById[t.item];
              if (!it) return null;
              const got = !!p.counters[`treasure:${t.item}`];
              const how = t.rank
                ? `Clear ${rankInfo(t.rank).name}`
                : `Win ${t.flawless} fights here without a mistake (${Math.min(flawless, t.flawless ?? 0)}/${t.flawless})`;
              return (
                <div key={t.item} class={`treasure ${got ? 'got' : ''}`} title={it.desc}>
                  <span class="treasure-icon">{got ? it.icon : '❔'}</span>
                  <div style={{ minWidth: 0 }}>
                    <b>{got ? it.name : '???'}</b>
                    <div class="muted" style={{ fontSize: '.8rem' }}>
                      {got ? (it.relic ? `Relic: ${relicText(it.relic)}` : it.desc) : `${it.kind === 'relic' ? 'A relic. ' : ''}${how}.`}
                    </div>
                  </div>
                  {got && <span class="treasure-tick">✓</span>}
                </div>
              );
            })}
          </div>
        </>
      )}
      {trophies.length > 0 && (
        <>
          <div class="section-title">🏆 Trophies only found here</div>
          <div class="trophies">
            {trophies.map((a) => {
              const got = !!p.ach[a.id];
              return (
                <div key={a.id} class={`trophy ${got ? 'got' : ''}`}>
                  <div class="trophy-icon">{a.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>{a.name}</b>
                    <div class="muted" style={{ fontSize: '.8rem' }}>
                      {a.desc}
                    </div>
                    {!got && (
                      <div class="bar good" style={{ marginTop: '4px', height: '6px' }}>
                        <i style={{ width: `${achProgress(p, a.id) * 100}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
