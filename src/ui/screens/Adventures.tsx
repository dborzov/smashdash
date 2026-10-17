/**
 * The adventure board — the home screen. Replaces the crowded island map as the main way to
 * get around (the maps are still one tap away, per campaign):
 *  - Continue: the adventure in progress and its next step.
 *  - Today's bounties and the dispatch feed (what's new in the game).
 *  - Wandering monsters (spaced review).
 *  - Every region as a card, grouped by campaign: what it teaches, progress, stars, time spent,
 *    accuracy, mastery, NEW / REVIEW badges, and what unlocks it. Filter and sort.
 */
import { useState } from 'preact/hooks';
import type { Region } from '../../content/schema';
import type { Profile } from '../../engine/profile';
import { campaigns, news, regions, skills, skillById } from '../../content';
import { regionStats, formatTime, type RegionStats } from '../../engine/regionStats';
import { currentRegion } from '../../engine/progress';
import { learnedSkills } from '../../engine/mastery';
import { update } from '../../engine/store';
import { go } from '../router';
import { sfx } from '../../audio/sfx';
import { Landmark } from '../../art/Landmarks';
import { FoeArt } from '../../art/Foe';
import { RichInline } from '../components/Rich';
import { Bounties } from '../components/Bounties';
import { nodeIcon } from './Region';

type Filter = 'all' | 'active' | 'new' | 'done' | 'locked';
type Sort = 'story' | 'recent';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'In progress' },
  { id: 'new', label: 'New' },
  { id: 'done', label: 'Completed' },
  { id: 'locked', label: 'Locked' },
];

function Thumb({ r, locked }: { r: Region; locked: boolean }) {
  return (
    <div
      class={`rc-thumb ${locked ? 'locked' : ''}`}
      style={{ background: `linear-gradient(${r.palette.sky[0]}, ${r.palette.sky[1]})` }}
    >
      <svg viewBox="-120 -165 240 185" aria-hidden="true">
        <ellipse cx="0" cy="8" rx="110" ry="16" fill={r.palette.ground} opacity=".8" />
        <Landmark scene={r.scene} />
      </svg>
      {locked && <div class="rc-fog">🔒</div>}
    </div>
  );
}

function Badge({ st }: { st: RegionStats }) {
  if (st.status === 'locked') return <span class="badge locked">🔒 Locked</span>;
  if (st.isNew) return <span class="badge new">✨ NEW</span>;
  if (st.needsReview) return <span class="badge review">🔁 Needs review</span>;
  if (st.status === 'done') return <span class="badge done">✅ Completed</span>;
  if (st.status === 'started') return <span class="badge active">▶ In progress</span>;
  return <span class="badge">Not started</span>;
}

export function RegionCard({ p, r }: { p: Profile; r: Region }) {
  const st = regionStats(p, r);
  const locked = st.status === 'locked';
  const rs = skills.filter((s) => s.region === r.id);
  const dark = campaigns.find((c) => c.id === r.campaign)?.mood === 'dark';
  return (
    <button
      class={`region-card ${dark ? 'dark' : ''} ${locked ? 'locked' : ''} ${st.isNew ? 'is-new' : ''}`}
      style={{ '--accent': r.palette.accent } as Record<string, string>}
      onClick={() => {
        sfx(locked ? 'wrong' : 'click');
        go(`/region/${r.id}`);
      }}
    >
      <Thumb r={r} locked={locked} />
      <div class="rc-body">
        <div class="rc-top">
          <Badge st={st} />
          {st.maxStars > 0 && st.stars > 0 && (
            <span class="rc-stars" title="Stars earned">
              ⭐ {st.stars}/{st.maxStars}
            </span>
          )}
        </div>
        <div class="rc-name">{r.name}</div>
        <div class="rc-topic">
          <RichInline text={r.topic} />
        </div>
        <div class="rc-progress">
          <div class="bar good">
            <i style={{ width: `${(st.done / st.total) * 100}%` }} />
          </div>
          <span>
            {st.done}/{st.total}
          </span>
        </div>
        <div class="rc-skills">
          {rs.map((s) => {
            const sk = p.skills[s.id];
            return (
              <span
                key={s.id}
                class={`rc-skill ${sk ? `t${sk.tier ?? 1}` : 'unk'}`}
                title={`${s.name}${sk ? ` — tier ${sk.tier ?? 1}` : ' (not learned yet)'}`}
              >
                {sk ? s.icon : '❔'}
              </span>
            );
          })}
        </div>
        <div class="rc-stats">
          <span title="Time spent here">⏱ {formatTime(st.timeMs)}</span>
          <span title="Answers right on this region's skills">
            🎯 {st.accuracy === null ? '—' : `${Math.round(st.accuracy * 100)}%`}
          </span>
          <span title="Tiny skills that are solid or mastered">
            🌳 {st.atomsSolid}/{st.atomsTotal}
          </span>
        </div>
        {locked && st.waitingFor.length > 0 && (
          <div class="rc-lock">
            Finish {st.waitingFor.map((x) => x.name).join(' and ')} to open the way.
          </div>
        )}
        {!locked && st.next && (
          <div class="rc-next">
            Next: {nodeIcon(st.next)} {st.next.title}
          </div>
        )}
      </div>
    </button>
  );
}

function ContinueCard({ p }: { p: Profile }) {
  // The most recently played region that isn't finished; otherwise the story's current one.
  const recent = regions
    .map((r) => ({ r, st: regionStats(p, r) }))
    .filter((x) => x.st.status === 'started' && x.st.lastAt > 0)
    .sort((a, b) => b.st.lastAt - a.st.lastAt)[0];
  const r = recent?.r ?? currentRegion(p);
  const st = regionStats(p, r);
  return (
    <div
      class="continue-card panel"
      style={{ '--accent': r.palette.accent } as Record<string, string>}
    >
      <Thumb r={r} locked={false} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div class="muted" style={{ fontSize: '.85rem' }}>
          {recent ? 'Pick up where you left off' : 'Your adventure continues'}
        </div>
        <div class="rc-name" style={{ fontSize: '1.4rem' }}>
          {r.name}
        </div>
        {st.next ? (
          <div>
            Next:{' '}
            <b>
              {nodeIcon(st.next)} {st.next.title}
            </b>
          </div>
        ) : (
          <div>Completed — replay anything for practice.</div>
        )}
        <div class="rc-progress" style={{ marginTop: '6px' }}>
          <div class="bar good">
            <i style={{ width: `${(st.done / st.total) * 100}%` }} />
          </div>
          <span>
            {st.done}/{st.total}
          </span>
        </div>
      </div>
      <button
        class="btn gold big"
        onClick={() => {
          sfx('click');
          if (st.next) go(`/play/${r.id}/${st.next.id}`);
          else go(`/region/${r.id}`);
        }}
      >
        ▶ {st.next ? 'Go' : 'Open'}
      </button>
    </div>
  );
}

function Dispatches({ p }: { p: Profile }) {
  const [open, setOpen] = useState(false);
  const unread = news.filter((n) => n.date > (p.newsSeen ?? ''));
  const shown = open ? news : news.slice(0, 2);
  const markRead = () => {
    if (unread.length) update((q) => void (q.newsSeen = news[0].date));
  };
  return (
    <div class="panel dispatches">
      <div class="row" style={{ justifyContent: 'space-between' }}>
        <div class="section-title" style={{ margin: 0 }}>
          📯 Dispatches {unread.length > 0 && <span class="badge new">{unread.length} new</span>}
        </div>
        {unread.length > 0 && (
          <button class="btn small ghost" onClick={markRead}>
            Mark read
          </button>
        )}
      </div>
      <div class="stack" style={{ marginTop: '8px' }}>
        {shown.map((n) => {
          const isNew = n.date > (p.newsSeen ?? '');
          return (
            <div
              key={n.title}
              class={`dispatch ${isNew ? 'unread' : ''} ${n.region ? 'link' : ''}`}
              onClick={() => {
                if (!n.region) return;
                markRead();
                go(`/region/${n.region}`);
              }}
            >
              <span class="dispatch-icon">{n.icon}</span>
              <div style={{ flex: 1 }}>
                <b>{n.title}</b>{' '}
                <span class="muted" style={{ fontSize: '.8rem' }}>
                  {n.date}
                </span>
                <div style={{ fontSize: '.95rem' }}>
                  <RichInline text={n.text} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {news.length > 2 && (
        <button class="btn small ghost" style={{ marginTop: '8px' }} onClick={() => setOpen(!open)}>
          {open ? 'Show less' : `Show all ${news.length}`}
        </button>
      )}
    </div>
  );
}

function Threats({ p }: { p: Profile }) {
  const hasSkills = learnedSkills(p).length > 0;
  if (!hasSkills) return null;
  return (
    <div class="panel">
      <div class="row" style={{ justifyContent: 'space-between' }}>
        <div class="section-title" style={{ margin: 0 }}>
          👹 Wandering monsters
        </div>
        <button class="btn small" onClick={() => go('/wander/seek')}>
          Seek trouble
        </button>
      </div>
      {p.wanderers.length === 0 ? (
        <p class="muted" style={{ margin: '6px 0 0' }}>
          All quiet… for now. Monsters wander in every couple of hours, hunting for the skills
          you're forgetting.
        </p>
      ) : (
        <div class="threats">
          {p.wanderers.map((w) => (
            <button key={w.id} class="threat" onClick={() => go(`/wander/${w.id}`)}>
              <div class="threat-art">
                <FoeArt m={w.monster} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <b>{w.monster.name}</b>
                <div class="muted" style={{ fontSize: '.85rem' }}>
                  Reviews:{' '}
                  {w.skills
                    .map((s) => `${skillById[s]?.icon ?? ''} ${skillById[s]?.name ?? s}`)
                    .join(', ')}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Adventures({ p }: { p: Profile }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('story');
  const match = (st: RegionStats) =>
    filter === 'all' ||
    (filter === 'active' && st.status === 'started') ||
    (filter === 'new' && (st.isNew || st.status === 'new')) ||
    (filter === 'done' && st.status === 'done') ||
    (filter === 'locked' && st.status === 'locked');
  return (
    <div class="screen adventures-bg">
      <div class="screen-scroll">
        <div class="content-col wide stack">
          <ContinueCard p={p} />
          <div class="adv-grid">
            <Bounties p={p} />
            <Dispatches p={p} />
          </div>
          <Threats p={p} />
          <div class="row wrap filters">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                class={`btn small ${filter === f.id ? 'gold' : 'ghost'}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
            <div class="spacer" />
            <button
              class="btn small ghost"
              onClick={() => setSort(sort === 'story' ? 'recent' : 'story')}
            >
              ↕ {sort === 'story' ? 'Story order' : 'Recently played'}
            </button>
          </div>
          {campaigns.map((c) => {
            let rs = regions
              .filter((r) => r.campaign === c.id)
              .map((r) => ({ r, st: regionStats(p, r) }))
              .filter((x) => match(x.st));
            if (sort === 'recent') rs = rs.sort((a, b) => b.st.lastAt - a.st.lastAt);
            const all = regions.filter((r) => r.campaign === c.id);
            const doneN = all.filter((r) => regionStats(p, r).status === 'done').length;
            return (
              <section key={c.id} class={`campaign ${c.mood}`}>
                <div class="campaign-head">
                  <span class="campaign-icon">{c.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 style={{ margin: 0 }}>{c.name}</h2>
                    <div class="muted">{c.tagline}</div>
                  </div>
                  <span class="chip">
                    {doneN}/{all.length} done
                  </span>
                  <button class="btn small ghost" onClick={() => go(`/atlas/${c.id}`)}>
                    🗺️ Map
                  </button>
                </div>
                {rs.length === 0 ? (
                  <p class="muted">Nothing here with this filter.</p>
                ) : (
                  <div class="region-grid">
                    {rs.map(({ r }) => (
                      <RegionCard key={r.id} p={p} r={r} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
          <div style={{ height: '10px' }} />
        </div>
      </div>
    </div>
  );
}
