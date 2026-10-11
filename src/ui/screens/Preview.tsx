/**
 * Content preview for grown-ups and content authors (not linked from the game UI):
 *   #/preview                 index of lessons and skills
 *   #/preview/lesson/<id>     play any lesson without saving progress
 *   #/preview/skill/<id>      sample problems from a generator at every level
 */
import { useState } from 'preact/hooks';
import { lessons, regions, skills, skillById } from '../../content';
import { generate } from '../../skills';
import { Rng } from '../../engine/rng';
import type { Level } from '../../skills/types';
import { LessonPlayer } from './Lesson';
import { MathBig, Rich, RichInline } from '../components/Rich';
import { WidgetView } from '../widgets';
import { go } from '../router';
import { fmt } from '../../skills/util';

export function Preview({ kind, id }: { kind?: string; id?: string }) {
  const [seed, setSeed] = useState(1);
  if (kind === 'lesson' && id && lessons[id]) {
    const region = regions.find(
      (r) =>
        r.path.some((n) => (n.type === 'lesson' || n.type === 'story') && n.lesson === id) ||
        r.outro === id,
    );
    return (
      <LessonPlayer
        lesson={lessons[id]}
        scene={region?.scene ?? 'village'}
        firstTime
        dry
        onQuit={() => go('/preview')}
        onFinish={() => go('/preview')}
      />
    );
  }
  if (kind === 'skill' && id && skillById[id]) {
    const s = skillById[id];
    return (
      <div class="screen" style={{ overflowY: 'auto', background: '#160f2e' }}>
        <div class="content-col" style={{ padding: '16px' }}>
          <div class="row">
            <button class="btn small ghost" onClick={() => go('/preview')}>
              ← Back
            </button>
            <h2 style={{ margin: 0 }}>
              {s.icon} {s.name} <small class="muted">({s.id})</small>
            </h2>
            <div class="spacer" />
            <button class="btn small gold" onClick={() => setSeed(seed + 100)}>
              🎲 Reroll
            </button>
          </div>
          <p class="muted">{s.summary}</p>
          {([1, 2, 3] as Level[]).map((lvl) => (
            <div key={lvl}>
              <div class="section-title">Level {lvl}</div>
              <div class="stack">
                {Array.from({ length: 6 }, (_, k) => {
                  const p = generate(id, lvl, new Rng(seed + lvl * 1000 + k));
                  return (
                    <div key={k} class="card">
                      <Rich text={p.prompt} class="problem-prompt" />
                      {p.math && <MathBig tex={p.math} />}
                      {p.visual && <WidgetView w={p.visual} interactive={false} quiz />}
                      <div style={{ marginTop: '8px' }}>
                        <b>Answer: </b>
                        {p.answer.kind === 'number' ? (
                          fmt(p.answer.value)
                        ) : (
                          <>
                            {p.answer.options.map((o, i) => (
                              <span
                                key={i}
                                style={{
                                  marginRight: '14px',
                                  fontWeight:
                                    i === (p.answer.kind === 'choice' ? p.answer.correct : -1)
                                      ? 800
                                      : 400,
                                  color:
                                    i === (p.answer.kind === 'choice' ? p.answer.correct : -1)
                                      ? '#138a52'
                                      : undefined,
                                }}
                              >
                                {'ABCD'[i]}) <RichInline text={o} />
                              </span>
                            ))}
                          </>
                        )}
                      </div>
                      {(p.nudges ?? []).length > 0 && (
                        <div style={{ fontSize: '.9rem', marginTop: '6px', color: '#7a4a00' }}>
                          Nudges:{' '}
                          {(p.nudges ?? [])
                            .map(
                              (n) =>
                                `${p.answer.kind === 'number' ? fmt(n.match) : 'ABCD'[n.match]} → `,
                            )
                            .join(' · ')}
                        </div>
                      )}
                      <div style={{ fontSize: '.95rem', marginTop: '6px', opacity: 0.8 }}>
                        <Rich text={p.explain} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div class="screen" style={{ overflowY: 'auto', background: '#160f2e' }}>
      <div class="content-col" style={{ padding: '16px' }}>
        <div class="row">
          <button class="btn small ghost" onClick={() => go('/map')}>
            ← Game
          </button>
          <h1 style={{ margin: 0 }}>Content preview</h1>
        </div>
        <p class="muted">
          For grown-ups and content authors. Lessons played here do not change the hero's progress.
        </p>
        <div class="section-title">Story</div>
        <button class="btn small ghost" onClick={() => go('/preview/lesson/prologue')}>
          Prologue
        </button>
        {regions.map((r) => (
          <div key={r.id}>
            <div class="section-title">{r.name}</div>
            <div class="row wrap">
              {r.path
                .filter((n) => n.type === 'lesson' || n.type === 'story')
                .map((n) => (
                  <button
                    key={n.id}
                    class="btn small ghost"
                    onClick={() => go(`/preview/lesson/${(n as { lesson: string }).lesson}`)}
                  >
                    📖 {n.title}
                  </button>
                ))}
              <button class="btn small ghost" onClick={() => go(`/preview/lesson/${r.outro}`)}>
                🎬 Outro
              </button>
            </div>
            <div class="row wrap" style={{ marginTop: '8px' }}>
              {skills
                .filter((s) => s.region === r.id)
                .map((s) => (
                  <button key={s.id} class="btn small" onClick={() => go(`/preview/skill/${s.id}`)}>
                    {s.icon} {s.name}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
