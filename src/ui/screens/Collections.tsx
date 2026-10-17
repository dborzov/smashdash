/**
 * Collections on the Hero page: the times-table Fact Map (every fact a × b and how well it's
 * known), the Scale Museum (a card for every real thing put on the Scale Ladder), and the
 * treasure cabinet (every region's treasures, and how to get the missing ones).
 */
import { Fragment } from 'preact';
import type { Profile } from '../../engine/profile';
import { campaigns, itemById, regions, sizes } from '../../content';
import { FACT_MAX, factStatus, factsKnown, rowKnown } from '../../engine/facts';
import { cardsCollected } from '../../engine/cards';
import { sizeText } from '../../games';
import { rankInfo } from '../../engine/ranks';
import { regionUnlocked } from '../../engine/progress';
import { go } from '../router';

const STATUS_NAME: Record<string, string> = {
  unseen: 'not met yet',
  shaky: 'shaky',
  learning: 'learning',
  solid: 'solid',
  mastered: 'mastered',
};

export function FactMap({ p }: { p: Profile }) {
  const known = factsKnown(p);
  const rows = Array.from({ length: FACT_MAX }, (_, i) => i + 1);
  return (
    <div class="panel">
      <div class="section-title" style={{ marginTop: 0 }}>
        ✖️ Fact Map{' '}
        <span class="muted" style={{ fontSize: '.9rem' }}>
          {known}/78 facts known
        </span>
      </div>
      <p class="muted" style={{ marginTop: 0, fontSize: '.9rem' }}>
        Every square is one fact. 3 × 7 and 7 × 3 are the same fact (turn it around!), so they light up together. Facts glow as you get them right in the Times Tables campaign — the
        quick-facts drill aims at the dim ones.
      </p>
      <div class="factmap" role="grid" aria-label="Times table fact map">
        <span class="fm-corner">×</span>
        {rows.map((c) => (
          <span key={`h${c}`} class={`fm-head ${rowKnown(p, c) ? 'row-done' : ''}`}>
            {c}
          </span>
        ))}
        {rows.map((r) => (
          <Fragment key={r}>
            <span class={`fm-head ${rowKnown(p, r) ? 'row-done' : ''}`}>
              {r}
            </span>
            {rows.map((c) => {
              const s = factStatus(p, r, c);
              return (
                <span key={`${r}-${c}`} class={`fm-cell ${s}`} title={`${r} × ${c} = ${r * c} · ${STATUS_NAME[s]}`}>
                  {r * c}
                </span>
              );
            })}
          </Fragment>
        ))}
      </div>
      <div class="row wrap fm-legend">
        {(['unseen', 'shaky', 'learning', 'solid', 'mastered'] as const).map((s) => (
          <span key={s} class="row" style={{ gap: '4px' }}>
            <i class={`fm-cell ${s}`} style={{ width: '18px', height: '18px' }} /> {STATUS_NAME[s]}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Museum({ p }: { p: Profile }) {
  const n = cardsCollected(p);
  return (
    <div class="panel">
      <div class="section-title" style={{ marginTop: 0 }}>
        🖼️ The Scale Museum{' '}
        <span class="muted" style={{ fontSize: '.9rem' }}>
          {n}/{sizes.length} cards
        </span>
      </div>
      <p class="muted" style={{ marginTop: 0, fontSize: '.9rem' }}>
        From the smallest thing to the biggest. Put a thing in the right place on the Scale Ladder (in
        The Order of Magnitude) and its card goes up on the wall.
      </p>
      <div class="museum">
        {sizes.map((c) => {
          const got = !!p.cards[c.id];
          return (
            <div key={c.id} class={`museum-card ${got ? 'got' : ''}`} title={got ? c.fact : 'Not collected yet'}>
              <div class="museum-icon">{got ? c.icon : '❔'}</div>
              <b>{got ? c.name : '???'}</b>
              <small>{got ? `${sizeText(c.m)} ${c.what}` : `about ${sizeText(c.m)}`}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TreasureCabinet({ p }: { p: Profile }) {
  const all = regions.flatMap((r) => r.treasures.map((t) => ({ r, t })));
  const got = all.filter(({ t }) => p.counters[`treasure:${t.item}`]).length;
  return (
    <div class="panel">
      <div class="section-title" style={{ marginTop: 0 }}>
        💎 Treasure Cabinet{' '}
        <span class="muted" style={{ fontSize: '.9rem' }}>
          {got}/{all.length}
        </span>
      </div>
      <p class="muted" style={{ marginTop: 0, fontSize: '.9rem' }}>
        Each region hides three treasures: one for clearing it on Heroic, a relic for Legendary, and
        something to wear (or put in the den) for winning 5 fights there without a single mistake.
      </p>
      {campaigns.map((c) => {
        const rs = regions.filter((r) => r.campaign === c.id && r.treasures.length);
        if (!rs.length) return null;
        return (
          <div key={c.id} class="cabinet-shelf">
            <div class="muted" style={{ fontWeight: 600, margin: '8px 0 4px' }}>
              {c.icon} {c.name}
            </div>
            <div class="cabinet-row">
              {rs.map((r) => (
                <button key={r.id} class="cabinet-region" disabled={!regionUnlocked(p, r)} onClick={() => go(`/region/${r.id}`)} title={`Go to ${r.name}`}>
                  <small>{r.name}</small>
                  <span>
                    {r.treasures.map((t) => {
                      const it = itemById[t.item];
                      const have = !!p.counters[`treasure:${t.item}`];
                      return (
                        <i key={t.item} class={have ? 'got' : ''} title={have ? it?.name : t.rank ? `Clear ${rankInfo(t.rank).name}` : `${t.flawless} flawless wins`}>
                          {have ? it?.icon : '❔'}
                        </i>
                      );
                    })}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
