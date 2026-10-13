/**
 * The Skill Tree: every skill in the game broken into its atomic sub-skills ("atoms", like
 * $10^2 = 100$), with the player's progress on each.
 *  - Tree:   campaigns → regions → skills → atoms, with status, recent history and drills.
 *  - Graph:  the dependency graph of skills (what needs what), coloured by tier and mastery.
 *  - Report: for grown-ups — time per region, accuracy, trouble spots, fading skills.
 */
import { useState } from 'preact/hooks';
import type { Skill } from '../../content/schema';
import type { Profile } from '../../engine/profile';
import { campaigns, regionById, regions, skills, skillById } from '../../content';
import {
  effectiveMastery,
  masteryStars,
  TIER_NAMES,
  type AtomStatus,
  type Tier,
} from '../../engine/mastery';
import {
  atomViews,
  dependents,
  fadingSkills,
  layoutGraph,
  summary,
  toNextTier,
  troubleAtoms,
} from '../../engine/skillTree';
import { regionStats, formatTime } from '../../engine/regionStats';
import { go } from '../router';
import { Modal, Stars } from '../components/Bits';
import { RichInline } from '../components/Rich';
import { sfx } from '../../audio/sfx';

const STATUS_LABEL: Record<AtomStatus, string> = {
  unseen: 'not tried yet',
  learning: 'learning',
  shaky: 'shaky — went wrong recently',
  solid: 'solid',
  mastered: 'mastered',
};

function Legend() {
  return (
    <div class="row wrap legend">
      {(['unseen', 'learning', 'shaky', 'solid', 'mastered'] as AtomStatus[]).map((s) => (
        <span key={s} class="row" style={{ gap: '4px' }}>
          <i class={`ad ${s}`} /> {STATUS_LABEL[s].split(' —')[0]}
        </span>
      ))}
    </div>
  );
}

/** The last few answers on an atom as little dots: green right, amber nudged, red wrong. */
function History({ h }: { h?: string }) {
  if (!h) return null;
  return (
    <span class="hist" title="Most recent answers (newest on the right)">
      {h.split('').map((c, i) => (
        <i key={i} class={c === 'R' ? 'r' : c === 'N' ? 'n' : 'w'} />
      ))}
    </span>
  );
}

function SkillDetail({
  p,
  id,
  onClose,
  onOpen,
}: {
  p: Profile;
  id: string;
  onClose: () => void;
  onOpen: (id: string) => void;
}) {
  const s = skillById[id];
  const st = p.skills[id];
  const tier = (st?.tier ?? 1) as Tier;
  const next = toNextTier(p, id);
  const atoms = atomViews(p, s);
  const eff = st ? effectiveMastery(st) : 0;
  return (
    <Modal onClose={onClose} class="skill-modal">
      <div class="row" style={{ justifyContent: 'space-between' }}>
        <div class="row">
          <span style={{ fontSize: '2.4rem' }}>{s.icon}</span>
          <div style={{ textAlign: 'left' }}>
            <h2 style={{ margin: 0 }}>{s.name}</h2>
            <div class="muted">{regionById[s.region]?.name}</div>
          </div>
        </div>
        <button class="icon-btn" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <p style={{ textAlign: 'left' }}>{s.summary}</p>
      {st ? (
        <>
          <div class="tier-ladder">
            {([1, 2, 3] as Tier[]).map((t) => (
              <div key={t} class={`rung ${t === tier ? 'on' : t < tier ? 'past' : ''}`}>
                {TIER_NAMES[t]}
              </div>
            ))}
          </div>
          <p class="muted" style={{ fontSize: '.9rem' }}>
            {next === null
              ? 'Top tier. Keep it sharp — skills fade if you leave them.'
              : `${next} clean answer${next > 1 ? 's' : ''} in a row (with no shaky tiny skills) to reach ${TIER_NAMES[(tier + 1) as Tier]}.`}
          </p>
          <div class="row wrap" style={{ justifyContent: 'center' }}>
            <span class="chip">
              <Stars n={masteryStars(st)} of={5} />
            </span>
            <span class="chip">
              🎯 {st.seen ? Math.round((st.right / st.seen) * 100) : 0}% of {st.seen}
            </span>
            {eff < st.m * 0.6 && <span class="badge review">🔁 fading</span>}
          </div>
        </>
      ) : (
        <p class="muted">Not learned yet — it's taught in {regionById[s.region]?.name}.</p>
      )}
      <div class="section-title">Tiny skills</div>
      <div class="atom-list">
        {atoms.map((a) => (
          <div key={a.id} class={`atom-row ${a.status}`}>
            <i class={`ad ${a.status}`} title={STATUS_LABEL[a.status]} />
            <div class="atom-name">
              <RichInline text={a.name} />
              <div class="muted" style={{ fontSize: '.78rem' }}>
                {a.state
                  ? `${a.state.r} right · ${a.state.u} nudged · ${a.state.w} wrong`
                  : 'not tried yet'}
              </div>
            </div>
            <History h={a.state?.h} />
            {st && (
              <button
                class={`btn small ${a.status === 'shaky' ? 'gold' : 'ghost'}`}
                onClick={() => {
                  sfx('click');
                  go(`/drill/${s.id}/${a.id}`);
                }}
              >
                Drill
              </button>
            )}
          </div>
        ))}
      </div>
      {(s.requires.length > 0 || dependents(s.id).length > 0) && (
        <div class="deps">
          {s.requires.length > 0 && (
            <div>
              <span class="muted">Builds on: </span>
              {s.requires.map((r) => (
                <button key={r} class="chip link" onClick={() => onOpen(r)}>
                  {skillById[r]?.icon} {skillById[r]?.name}
                </button>
              ))}
            </div>
          )}
          {dependents(s.id).length > 0 && (
            <div>
              <span class="muted">Leads to: </span>
              {dependents(s.id).map((d) => (
                <button key={d.id} class="chip link" onClick={() => onOpen(d.id)}>
                  {d.icon} {d.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {st && (
        <button
          class="btn mint wide"
          style={{ marginTop: '12px' }}
          onClick={() => go(`/drill/${s.id}`)}
        >
          ⚔️ Practise {s.name}
        </button>
      )}
    </Modal>
  );
}

function SkillCard({ p, s, onOpen }: { p: Profile; s: Skill; onOpen: (id: string) => void }) {
  const st = p.skills[s.id];
  const atoms = atomViews(p, s);
  return (
    <button class={`skill-card ${st ? '' : 'unlearned'}`} onClick={() => onOpen(s.id)}>
      <div class="row" style={{ gap: '8px' }}>
        <span style={{ fontSize: '1.6rem' }}>{st ? s.icon : '❔'}</span>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <b>{s.name}</b>{' '}
          {st && (
            <span class={`tier-pill t${st.tier ?? 1}`}>{TIER_NAMES[(st.tier ?? 1) as Tier]}</span>
          )}
          <div class="muted" style={{ fontSize: '.8rem' }}>
            {s.summary}
          </div>
        </div>
      </div>
      <div class="atom-chips">
        {atoms.map((a) => (
          <span key={a.id} class={`atom-chip ${a.status}`} title={STATUS_LABEL[a.status]}>
            <i class={`ad ${a.status}`} />
            <RichInline text={a.name} />
          </span>
        ))}
      </div>
    </button>
  );
}

function TreeView({ p, onOpen }: { p: Profile; onOpen: (id: string) => void }) {
  return (
    <div class="stack">
      {campaigns.map((c) => (
        <section key={c.id} class={`campaign ${c.mood}`}>
          <div class="campaign-head">
            <span class="campaign-icon">{c.icon}</span>
            <h2 style={{ margin: 0 }}>{c.name}</h2>
          </div>
          {regions
            .filter((r) => r.campaign === c.id)
            .map((r) => {
              const rs = skills.filter((s) => s.region === r.id);
              const learned = rs.some((s) => p.skills[s.id]);
              const st = regionStats(p, r);
              return (
                <details key={r.id} class="tree-region" open={learned}>
                  <summary>
                    <span
                      style={{
                        color: r.palette.accent,
                        fontFamily: 'var(--font-display)',
                        fontWeight: 600,
                      }}
                    >
                      {r.name}
                    </span>
                    <span class="muted" style={{ fontSize: '.85rem' }}>
                      {' '}
                      · {rs.filter((s) => p.skills[s.id]).length}/{rs.length} skills · 🌳{' '}
                      {st.atomsSolid}/{st.atomsTotal}
                    </span>
                  </summary>
                  <div class="skill-grid">
                    {rs.map((s) => (
                      <SkillCard key={s.id} p={p} s={s} onOpen={onOpen} />
                    ))}
                  </div>
                </details>
              );
            })}
        </section>
      ))}
    </div>
  );
}

function GraphView({ p, onOpen }: { p: Profile; onOpen: (id: string) => void }) {
  return (
    <div class="stack">
      {campaigns.map((c) => {
        const g = layoutGraph(c.id);
        const CW = 130;
        const RH = 92;
        const W = g.cols.length * CW + 20;
        const H = g.rows * RH + 70;
        const pos = new Map(
          g.nodes.map((n) => [
            n.skill.id,
            { x: 10 + n.col * CW + CW / 2, y: 60 + n.row * RH + RH / 2 },
          ]),
        );
        return (
          <section key={c.id} class={`campaign ${c.mood}`}>
            <div class="campaign-head">
              <span class="campaign-icon">{c.icon}</span>
              <h2 style={{ margin: 0 }}>{c.name}</h2>
            </div>
            <div class="graph-scroll">
              <svg
                viewBox={`0 0 ${W} ${H}`}
                style={{ width: `${W}px`, maxWidth: 'none' }}
                class="skill-graph"
              >
                {g.cols.map((rid, i) => (
                  <g key={rid}>
                    <rect
                      x={10 + i * CW + 4}
                      y="4"
                      width={CW - 8}
                      height={H - 8}
                      rx="14"
                      class="graph-band"
                    />
                    <text
                      x={10 + i * CW + CW / 2}
                      y="34"
                      text-anchor="middle"
                      class="graph-region"
                      fill={regionById[rid].palette.accent}
                    >
                      {regionById[rid].name.replace(/^The /, '').split(' ').slice(0, 2).join(' ')}
                    </text>
                  </g>
                ))}
                {g.nodes.flatMap((n) =>
                  n.skill.requires
                    .filter((r) => pos.has(r))
                    .map((r) => {
                      const a = pos.get(r)!;
                      const b = pos.get(n.skill.id)!;
                      const mx = (a.x + b.x) / 2;
                      return (
                        <path
                          key={`${r}-${n.skill.id}`}
                          d={`M${a.x} ${a.y} C${mx} ${a.y} ${mx} ${b.y} ${b.x} ${b.y}`}
                          class={`graph-edge ${p.skills[r] ? 'lit' : ''}`}
                        />
                      );
                    }),
                )}
                {g.nodes.map((n) => {
                  const { x, y } = pos.get(n.skill.id)!;
                  const st = p.skills[n.skill.id];
                  const atoms = atomViews(p, n.skill);
                  const solid =
                    atoms.filter((a) => a.status === 'solid' || a.status === 'mastered').length /
                    atoms.length;
                  const r = 26;
                  const circ = 2 * Math.PI * (r + 5);
                  return (
                    <g
                      key={n.skill.id}
                      class="graph-node"
                      onClick={() => onOpen(n.skill.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <circle cx={x} cy={y} r={r + 5} class="graph-ring-bg" />
                      <circle
                        cx={x}
                        cy={y}
                        r={r + 5}
                        class="graph-ring"
                        stroke-dasharray={`${circ * solid} ${circ}`}
                        transform={`rotate(-90 ${x} ${y})`}
                      />
                      <circle
                        cx={x}
                        cy={y}
                        r={r}
                        class={`graph-dot ${st ? `t${st.tier ?? 1}` : 'unk'}`}
                      />
                      <text x={x} y={y + 8} text-anchor="middle" font-size="22">
                        {st ? n.skill.icon : '❔'}
                      </text>
                      <text x={x} y={y + r + 20} text-anchor="middle" class="graph-label">
                        {n.skill.name.length > 16 ? n.skill.name.slice(0, 15) + '…' : n.skill.name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </section>
        );
      })}
      <p class="muted">
        Lines show what builds on what. The ring fills up as tiny skills become solid. Gold = Master
        tier, blue = Adept.
      </p>
    </div>
  );
}

function ReportView({ p, onOpen }: { p: Profile; onOpen: (id: string) => void }) {
  const totalTime = Object.values(p.time).reduce((a, b) => a + b, 0);
  const answered = p.stats.right + p.stats.nudged + p.stats.wrong;
  const trouble = troubleAtoms(p);
  const fading = fadingSkills(p);
  const days = Object.keys(p.daily.history).length + (p.daily.xp > 0 ? 1 : 0);
  return (
    <div class="stack">
      <div class="panel">
        <div class="section-title" style={{ marginTop: 0 }}>
          📊 At a glance
        </div>
        <div class="report-grid">
          <div>
            <b>{formatTime(totalTime)}</b>
            <span class="muted">time playing</span>
          </div>
          <div>
            <b>{answered}</b>
            <span class="muted">questions answered</span>
          </div>
          <div>
            <b>{answered ? Math.round(((p.stats.right + p.stats.nudged) / answered) * 100) : 0}%</b>
            <span class="muted">right (incl. after a hint)</span>
          </div>
          <div>
            <b>{p.counters.grit ?? 0}</b>
            <span class="muted">mistakes put right</span>
          </div>
          <div>
            <b>{p.counters.promote ?? 0}</b>
            <span class="muted">tier promotions</span>
          </div>
          <div>
            <b>{days}</b>
            <span class="muted">days played</span>
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="section-title" style={{ marginTop: 0 }}>
          🧗 Trouble spots
        </div>
        {trouble.length === 0 ? (
          <p class="muted">No trouble yet. Either a genius or just getting started.</p>
        ) : (
          <div class="atom-list">
            {trouble.map((t) => (
              <div key={`${t.skill.id}/${t.atom}`} class={`atom-row ${t.status}`}>
                <i class={`ad ${t.status}`} />
                <div
                  class="atom-name"
                  onClick={() => onOpen(t.skill.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <RichInline text={t.name} />
                  <div class="muted" style={{ fontSize: '.78rem' }}>
                    {t.skill.icon} {t.skill.name} · {t.wrong} wrong, {t.nudged} nudged of {t.seen} ·{' '}
                    {STATUS_LABEL[t.status]}
                  </div>
                </div>
                <button
                  class={`btn small ${t.status === 'shaky' ? 'gold' : 'ghost'}`}
                  onClick={() => go(`/drill/${t.skill.id}/${t.atom}`)}
                >
                  Drill
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {fading.length > 0 && (
        <div class="panel">
          <div class="section-title" style={{ marginTop: 0 }}>
            🍂 Fading — due for review
          </div>
          <div class="row wrap">
            {fading.map(({ skill, eff }) => (
              <button key={skill.id} class="chip link" onClick={() => onOpen(skill.id)}>
                {skill.icon} {skill.name} · {Math.round(eff * 100)}%
              </button>
            ))}
          </div>
        </div>
      )}
      <div class="panel">
        <div class="section-title" style={{ marginTop: 0 }}>
          ⏱ Time and accuracy by region
        </div>
        <table class="report-table">
          <thead>
            <tr>
              <th>Region</th>
              <th>Progress</th>
              <th>Time</th>
              <th>Answers</th>
              <th>Right</th>
            </tr>
          </thead>
          <tbody>
            {regions.map((r) => {
              const st = regionStats(p, r);
              return (
                <tr key={r.id} class={st.status === 'locked' ? 'muted' : ''}>
                  <td>{r.name}</td>
                  <td>
                    {st.done}/{st.total}
                  </td>
                  <td>{formatTime(st.timeMs)}</td>
                  <td>{st.answered || '—'}</td>
                  <td>{st.accuracy === null ? '—' : `${Math.round(st.accuracy * 100)}%`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SkillTree({ p }: { p: Profile }) {
  const [view, setView] = useState<'tree' | 'graph' | 'report'>('tree');
  const [open, setOpen] = useState<string | null>(null);
  const sum = summary(p);
  return (
    <div class="screen adventures-bg">
      <div class="screen-scroll">
        <div class="content-col wide stack">
          <div class="panel">
            <h1 style={{ margin: 0 }}>🌳 Skill Tree</h1>
            <p class="muted" style={{ margin: '4px 0 10px' }}>
              Every skill is made of tiny skills. Get each one solid and the whole branch turns
              gold. Tap a skill to see its tiny skills and drill the shaky ones.
            </p>
            <div class="report-grid">
              <div>
                <b>
                  {sum.skillsLearned}/{sum.skillsTotal}
                </b>
                <span class="muted">skills learned</span>
              </div>
              <div>
                <b>{sum.masters}</b>
                <span class="muted">at Master tier</span>
              </div>
              <div>
                <b>
                  {sum.atomsSolid + sum.atomsMastered}/{sum.atomsTotal}
                </b>
                <span class="muted">tiny skills solid</span>
              </div>
              <div>
                <b>{sum.atomsMastered}</b>
                <span class="muted">tiny skills mastered</span>
              </div>
              <div>
                <b class={sum.atomsShaky ? 'bad-text' : ''}>{sum.atomsShaky}</b>
                <span class="muted">shaky right now</span>
              </div>
            </div>
            <div class="bar good lg" style={{ marginTop: '10px' }}>
              <i
                style={{
                  width: `${((sum.atomsSolid + sum.atomsMastered) / sum.atomsTotal) * 100}%`,
                }}
              />
            </div>
            <Legend />
          </div>
          <div class="row wrap">
            {(
              [
                ['tree', '🌳 Tree'],
                ['graph', '🕸️ Graph'],
                ['report', '📊 Report'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                class={`btn small ${view === id ? 'gold' : 'ghost'}`}
                onClick={() => setView(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {view === 'tree' && <TreeView p={p} onOpen={setOpen} />}
          {view === 'graph' && <GraphView p={p} onOpen={setOpen} />}
          {view === 'report' && <ReportView p={p} onOpen={setOpen} />}
          <div style={{ height: '10px' }} />
        </div>
      </div>
      {open && skillById[open] && (
        <SkillDetail p={p} id={open} onClose={() => setOpen(null)} onOpen={setOpen} />
      )}
    </div>
  );
}
