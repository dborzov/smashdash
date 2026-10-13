/** Merchant Pib's shop. */
import { useState } from 'preact/hooks';
import type { Profile } from '../../engine/profile';
import { levelFromXp } from '../../engine/profile';
import { items } from '../../content';
import { buy, canBuy } from '../../engine/items';
import { update } from '../../engine/store';
import { track } from '../../engine/events';
import { Portrait } from '../../art/Portrait';
import { sfx } from '../../audio/sfx';

const TABS = [
  { id: 'food', label: '🍖 Pet food', kinds: ['food'] },
  { id: 'fun', label: '🧸 Toys & care', kinds: ['toy', 'care'] },
  { id: 'battle', label: '⚔️ Battle', kinds: ['potion', 'special'] },
  { id: 'style', label: '👑 Style', kinds: ['hat', 'cape'] },
  { id: 'den', label: '🏠 Den', kinds: ['decor'] },
];

const QUIPS = [
  'Welcome, welcome! Everything is 100% legal. Mostly.',
  'Buy two, get two! (At full price.)',
  'That cheese? Very rare. Very suspicious. Very good.',
  'No refunds. Especially not on the Mystery Meat.',
  'Ah, a customer with gold! My favourite kind.',
  'New stock from the North! Slightly frostbitten. Still works.',
  'A ward rune? Excellent choice. Mostly un-cursed.',
  'Decorate the den! Pets with a bed live longer. Probably.',
];

export function ShopScreen({ p }: { p: Profile }) {
  const [tab, setTab] = useState('food');
  const [quip, setQuip] = useState(QUIPS[0]);
  const level = levelFromXp(p.hero.xp);
  const shown = items.filter(
    (i) => i.inShop && TABS.find((t) => t.id === tab)!.kinds.includes(i.kind),
  );

  return (
    <div
      class="screen"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #6e2a5a, #1a0a2e 70%)' }}
    >
      <div class="screen-scroll">
        <div class="content-col stack">
          <div class="panel row" style={{ gap: '14px' }}>
            <div class="portrait" style={{ '--who': '#ffb3d1' } as Record<string, string>}>
              <Portrait who="pib" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', color: '#ffb3d1', fontWeight: 600 }}>
                Merchant Pib
              </div>
              <div style={{ fontSize: '1.1rem' }}>{quip}</div>
            </div>
            <span class="chip gold" style={{ fontSize: '1.2rem' }}>
              🪙 {p.hero.gold}
            </span>
          </div>
          <div class="row wrap">
            {TABS.map((t) => (
              <button
                key={t.id}
                class={`btn small ${tab === t.id ? 'gold' : 'ghost'}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div
            class="grid-cards"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
          >
            {shown.map((it) => {
              const why = level < it.level ? `Level ${it.level}` : canBuy(p, it.id);
              const own = it.effect.egg ? p.eggs : (p.inv[it.id] ?? 0);
              return (
                <div
                  key={it.id}
                  class="panel"
                  style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
                >
                  <div class="row">
                    <span style={{ fontSize: '2.4rem' }}>{it.icon}</span>
                    <div>
                      <b>{it.name}</b>
                      {own > 0 && (
                        <div class="muted" style={{ fontSize: '.8rem' }}>
                          You have {own}
                        </div>
                      )}
                    </div>
                  </div>
                  <div class="muted" style={{ fontSize: '.9rem', flex: 1 }}>
                    {it.desc}
                  </div>
                  <button
                    class="btn small gold"
                    disabled={!!why}
                    onClick={() => {
                      let err: string | null = null;
                      update((q) => {
                        err = buy(q, it.id);
                        if (err) return;
                        return [...track(q, 'buy'), ...track(q, 'goldSpent', it.price)];
                      });
                      if (!err) {
                        sfx('coin');
                        setQuip(QUIPS[Math.floor(Math.random() * QUIPS.length)]);
                      }
                    }}
                  >
                    {why
                      ? why === 'Not enough gold'
                        ? `🪙 ${it.price} · need more gold`
                        : why
                      : `Buy · 🪙 ${it.price}`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
