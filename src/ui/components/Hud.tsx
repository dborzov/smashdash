/** Top bar (hero, XP, gold, streak, daily goal) and bottom tab bar. */
import type { Profile } from '../../engine/profile';
import { levelFromXp, xpForLevel } from '../../engine/profile';
import { Avatar } from '../../art/Avatar';
import { Bar } from './Bits';
import { go } from '../router';
import { isAway, petMood } from '../../engine/pet';
import { news } from '../../content';
import { update } from '../../engine/store';
import { setMuted, sfx } from '../../audio/sfx';

function GoalRing({ value, goal }: { value: number; goal: number }) {
  const pct = Math.min(1, value / goal);
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <svg
      viewBox="0 0 40 40"
      width="38"
      height="38"
      aria-label={`Daily goal ${value} of ${goal} XP`}
    >
      <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,.15)" stroke-width="5" />
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke={pct >= 1 ? '#5ee6a8' : '#ffd166'}
        stroke-width="5"
        stroke-linecap="round"
        stroke-dasharray={`${c * pct} ${c}`}
        transform="rotate(-90 20 20)"
      />
      <text
        x="20"
        y="25"
        text-anchor="middle"
        font-size="13"
        font-family="Fredoka"
        font-weight="700"
        fill="#fff"
      >
        {pct >= 1 ? '✓' : '🎯'}
      </text>
    </svg>
  );
}

export function Hud({ p }: { p: Profile }) {
  const level = levelFromXp(p.hero.xp);
  const lo = xpForLevel(level);
  const hi = xpForLevel(level + 1);
  const metToday = p.daily.lastMet === p.daily.day;
  return (
    <div class="hud">
      <div class="hud-hero" onClick={() => go('/hero')}>
        <div class="hud-avatar">
          <Avatar look={p.hero.look} cls={p.hero.cls} hat={p.hero.hat} portrait />
          <span class="hud-level">{level}</span>
        </div>
        <div style={{ minWidth: 0 }}>
          <div class="hud-name">{p.hero.name}</div>
          <div class="hud-xp">
            <Bar value={p.hero.xp - lo} max={hi - lo} kind="xp" />
          </div>
        </div>
      </div>
      <div class="hud-stats">
        <span
          class={`chip fire ${metToday ? '' : 'cold'}`}
          title="Streak: days in a row you hit your daily goal"
        >
          🔥 {p.daily.streak}
        </span>
        <span class="chip gold" title="Gold">
          🪙 {p.hero.gold}
        </span>
        <span
          title={`Today: ${p.daily.xp} / ${p.daily.goal} XP`}
          style={{ display: 'inline-flex' }}
        >
          <GoalRing value={p.daily.xp} goal={p.daily.goal} />
        </span>
        <button
          class="icon-btn"
          title={p.sound ? 'Sound on' : 'Sound off'}
          onClick={() => {
            update((q) => {
              q.sound = !q.sound;
            });
            setMuted(p.sound);
            if (!p.sound) sfx('click');
          }}
        >
          {p.sound ? '🔊' : '🔇'}
        </button>
      </div>
    </div>
  );
}

export function Tabs({ p, active }: { p: Profile; active: string }) {
  const petAlert =
    p.eggs > 0 || (p.pet && ['dead', 'sick', 'hungry', 'grumpy', 'bored'].includes(petMood(p.pet)));
  const unreadNews = news.some((n) => n.date > (p.newsSeen ?? ''));
  const questReady = p.quests?.list.some((q) => q.have >= q.goal && !q.claimed) ?? false;
  const petBack = !!p.pet?.away && !isAway(p.pet);
  const tabs = [
    { id: 'map', icon: '🗺️', label: 'Adventures', to: '/map', dot: unreadNews || questReady },
    { id: 'skills', icon: '🌳', label: 'Skills', to: '/skills' },
    { id: 'hero', icon: '🧙', label: 'Hero', to: '/hero' },
    { id: 'trophies', icon: '🏆', label: 'Trophies', to: '/trophies' },
    { id: 'pet', icon: '🐾', label: 'Pet', to: '/pet', dot: petAlert || petBack },
    { id: 'shop', icon: '🛒', label: 'Shop', to: '/shop' },
  ];
  return (
    <nav class="tabs">
      {tabs.map((t) => (
        <button
          key={t.id}
          class={`tab ${active === t.id ? 'active' : ''}`}
          onClick={() => {
            sfx('click');
            go(t.to);
          }}
        >
          <span class="tab-icon">{t.icon}</span>
          {t.label}
          {t.dot && <span class="dot" />}
        </button>
      ))}
    </nav>
  );
}
