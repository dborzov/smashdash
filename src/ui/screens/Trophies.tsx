/**
 * The Trophy Room: every achievement, on shelves (learning, fighting, journey, streaks, pet,
 * stuff, adventures). Adventure trophies are grouped by campaign and region, each with a link
 * to the region that gives them. "Nearly there" shows the closest unearned ones first.
 */
import { useState } from 'preact/hooks';
import type { Achievement } from '../../content/schema';
import type { Profile } from '../../engine/profile';
import { achievements, campaigns, itemById, regionById, regions } from '../../content';
import { achProgress, earnedTitles } from '../../engine/achievements';
import { regionUnlocked } from '../../engine/progress';
import { go } from '../router';
import { sfx } from '../../audio/sfx';

const SHELVES: { id: Achievement['cat'] | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'Everything', icon: '🏆' },
  { id: 'region', label: 'Adventures', icon: '🗺️' },
  { id: 'learning', label: 'Learning', icon: '🧠' },
  { id: 'fighting', label: 'Fighting', icon: '⚔️' },
  { id: 'journey', label: 'Journey', icon: '🧭' },
  { id: 'streaks', label: 'Streaks', icon: '🔥' },
  { id: 'pet', label: 'Pet', icon: '🐾' },
  { id: 'stuff', label: 'Stuff', icon: '🎒' },
];

type Show = 'all' | 'todo' | 'got';

function TrophyCard({ p, a, jump }: { p: Profile; a: Achievement; jump?: boolean }) {
  const got = !!p.ach[a.id];
  const hidden = a.secret && !got;
  const prog = achProgress(p, a.id);
  const r = a.region ? regionById[a.region] : undefined;
  return (
    <div class={`trophy ${got ? 'got' : ''}`} title={hidden ? 'A secret trophy' : a.desc}>
      <div class="trophy-icon">{hidden ? '❔' : a.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <b>{hidden ? '???' : a.name}</b>
        <div class="muted" style={{ fontSize: '.8rem' }}>
          {hidden ? 'Keep playing to find out.' : a.desc}
        </div>
        {!got && !hidden && (
          <div class="bar good" style={{ marginTop: '4px', height: '6px' }}>
            <i style={{ width: `${prog * 100}%` }} />
          </div>
        )}
        {!hidden && (a.gold > 0 || a.title || a.item) && (
          <div class="muted" style={{ fontSize: '.75rem', marginTop: '2px' }}>
            {a.gold > 0 && `🪙 ${a.gold}`}
            {a.item && ` · ${itemById[a.item]?.icon ?? ''} ${itemById[a.item]?.name ?? ''}`}
            {a.title && ` · title: "${a.title}"`}
          </div>
        )}
        {jump && r && !got && (
          <button
            class="btn small ghost trophy-go"
            onClick={() => {
              sfx('click');
              go(`/region/${r.id}`);
            }}
          >
            Go to {r.name} →
          </button>
        )}
      </div>
    </div>
  );
}

export function TrophyRoom({ p }: { p: Profile }) {
  const [shelf, setShelf] = useState<(typeof SHELVES)[number]['id']>('all');
  const [show, setShow] = useState<Show>('all');
  const earned = achievements.filter((a) => p.ach[a.id]).length;
  const titles = earnedTitles(p).length;
  const keep = (a: Achievement) => (show === 'all' ? true : show === 'got' ? !!p.ach[a.id] : !p.ach[a.id]);
  const nearly = achievements
    .filter((a) => !p.ach[a.id] && !a.secret)
    .map((a) => ({ a, prog: achProgress(p, a.id) }))
    .filter((x) => x.prog > 0)
    .sort((x, y) => y.prog - x.prog)
    .slice(0, 4);

  const onShelf = achievements.filter((a) => (shelf === 'all' || a.cat === shelf) && keep(a));
  const general = onShelf.filter((a) => a.cat !== 'region');
  const regional = onShelf.filter((a) => a.cat === 'region');

  return (
    <div class="screen" style={{ background: 'radial-gradient(ellipse at 50% 0%, #5a3a10, #140a2e 70%)' }}>
      <div class="screen-scroll">
        <div class="content-col wide stack">
          <div class="panel trophy-head">
            <div style={{ fontSize: '3rem' }}>🏆</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ margin: 0 }}>Trophy Room</h2>
              <div class="muted">
                {earned} of {achievements.length} trophies · {titles} title{titles === 1 ? '' : 's'} to wear (on the Hero page)
              </div>
              <div class="bar xp" style={{ marginTop: '6px' }}>
                <i style={{ width: `${(earned / achievements.length) * 100}%` }} />
              </div>
            </div>
          </div>

          {nearly.length > 0 && (
            <div class="panel">
              <div class="section-title" style={{ marginTop: 0 }}>
                🎯 Nearly there
              </div>
              <div class="trophies">
                {nearly.map(({ a }) => (
                  <TrophyCard key={a.id} p={p} a={a} jump />
                ))}
              </div>
            </div>
          )}

          <div class="campaign-tabs" role="tablist">
            {SHELVES.map((s) => {
              const all = achievements.filter((a) => s.id === 'all' || a.cat === s.id);
              const got = all.filter((a) => p.ach[a.id]).length;
              return (
                <button key={s.id} role="tab" aria-selected={shelf === s.id} class={`campaign-tab ${shelf === s.id ? 'on' : ''}`} onClick={() => setShelf(s.id)}>
                  <span class="campaign-tab-icon">{s.icon}</span>
                  <span class="campaign-tab-name">{s.label}</span>
                  <small>
                    {got}/{all.length}
                  </small>
                </button>
              );
            })}
          </div>
          <div class="row wrap">
            {(['all', 'todo', 'got'] as Show[]).map((x) => (
              <button key={x} class={`btn small ${show === x ? 'gold' : 'ghost'}`} onClick={() => setShow(x)}>
                {x === 'all' ? 'All' : x === 'todo' ? 'Still to get' : 'Earned'}
              </button>
            ))}
          </div>

          {general.length > 0 && (
            <div class="panel">
              <div class="trophies">
                {general.map((a) => (
                  <TrophyCard key={a.id} p={p} a={a} />
                ))}
              </div>
            </div>
          )}

          {regional.length > 0 &&
            campaigns.map((c) => {
              const rs = regions.filter((r) => r.campaign === c.id && regional.some((a) => a.region === r.id));
              if (!rs.length) return null;
              return (
                <div key={c.id} class="panel">
                  <div class="section-title" style={{ marginTop: 0 }}>
                    {c.icon} {c.name}
                  </div>
                  {rs.map((r) => {
                    const mine = regional.filter((a) => a.region === r.id);
                    const all = achievements.filter((a) => a.region === r.id);
                    const got = all.filter((a) => p.ach[a.id]).length;
                    const open = regionUnlocked(p, r);
                    return (
                      <div key={r.id} class="trophy-region">
                        <div class="trophy-region-head" style={{ '--accent': r.palette.accent } as Record<string, string>}>
                          <b>{r.name}</b>
                          <span class="muted">
                            {got}/{all.length}
                          </span>
                          <div class="spacer" />
                          <button class="btn small ghost" disabled={!open} onClick={() => go(`/region/${r.id}`)}>
                            {open ? 'Go there →' : '🔒 Locked'}
                          </button>
                        </div>
                        <div class="trophies">
                          {mine.map((a) => (
                            <TrophyCard key={a.id} p={p} a={a} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

          {onShelf.length === 0 && <p class="muted center">Nothing on this shelf yet.</p>}
          <div style={{ height: '10px' }} />
        </div>
      </div>
    </div>
  );
}
