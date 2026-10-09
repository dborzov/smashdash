/** Title screen: pick a saved hero or create a new one. Also export/import saves. */
import { useRef, useState } from 'preact/hooks';
import { Scene } from '../../art/scenes';
import { Avatar } from '../../art/Avatar';
import {
  listProfiles,
  loadProfile,
  deleteProfile,
  importProfile,
  saveProfile,
} from '../../engine/save';
import { activate } from '../../engine/store';
import { go } from '../router';
import { classes } from '../../content';
import { Modal } from '../components/Bits';
import { sfx } from '../../audio/sfx';

export function Title() {
  const [profiles, setProfiles] = useState(listProfiles());
  const [confirm, setConfirm] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const file = useRef<HTMLInputElement>(null);

  const play = (id: string) => {
    const p = loadProfile(id);
    if (!p) return;
    sfx('whoosh');
    activate(p);
    go('/map', true);
  };

  const onImport = async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    try {
      const p = importProfile(await f.text());
      saveProfile(p);
      setProfiles(listProfiles());
      setErr('');
    } catch (x) {
      setErr((x as Error).message);
    }
  };

  return (
    <div class="screen">
      <Scene id="village" />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflowY: 'auto',
          padding: '6vh 16px 40px',
          zIndex: 2,
        }}
      >
        <h1 class="title-logo anim-bob">SMASHDASH</h1>
        <p class="tagline">Unbox the kingdom. Outsmart the Muddler. Become an algebra legend.</p>
        <div class="panel content-col" style={{ maxWidth: '620px', marginTop: '24px' }}>
          {profiles.length > 0 && (
            <div class="section-title" style={{ marginTop: 0 }}>
              Choose your hero
            </div>
          )}
          <div class="stack">
            {profiles.map((s) => (
              <div
                key={s.id}
                class="row"
                style={{
                  background: 'rgba(255,255,255,.07)',
                  borderRadius: '18px',
                  padding: '8px 12px',
                }}
              >
                <button
                  class="row"
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'inherit',
                  }}
                  onClick={() => play(s.id)}
                >
                  <div style={{ width: '64px', height: '64px', flex: 'none' }}>
                    <Avatar look={s.look} cls={s.cls} portrait />
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.3rem',
                        fontWeight: 600,
                      }}
                    >
                      {s.name}
                    </div>
                    <div class="muted">
                      Level {s.level} {classes[s.cls]?.name ?? ''}
                    </div>
                  </div>
                </button>
                <button class="btn gold" onClick={() => play(s.id)}>
                  Play ▶
                </button>
                <button class="icon-btn" title="Delete hero" onClick={() => setConfirm(s.id)}>
                  🗑️
                </button>
              </div>
            ))}
          </div>
          <button
            class="btn mint big wide"
            style={{ marginTop: '16px' }}
            onClick={() => go('/new')}
          >
            ✨ Create a new hero
          </button>
          <div class="row" style={{ justifyContent: 'center', marginTop: '14px' }}>
            <button class="btn small ghost" onClick={() => file.current?.click()}>
              📂 Import a saved hero
            </button>
            <input
              ref={file}
              type="file"
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={onImport}
            />
          </div>
          {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}
          <p class="muted center" style={{ fontSize: '.85rem', marginTop: '14px' }}>
            Heroes are saved in this browser. Use "Export save" on the Hero screen to move one to
            another device.
          </p>
        </div>
      </div>
      {confirm && (
        <Modal onClose={() => setConfirm(null)}>
          <h2>Delete this hero forever?</h2>
          <p>All progress, gold and pets will be gone. Grimble will pretend he never knew them.</p>
          <div class="row" style={{ justifyContent: 'center' }}>
            <button class="btn ghost" onClick={() => setConfirm(null)}>
              Keep
            </button>
            <button
              class="btn danger"
              onClick={() => {
                deleteProfile(confirm);
                setProfiles(listProfiles());
                setConfirm(null);
              }}
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
