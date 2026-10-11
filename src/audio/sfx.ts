/**
 * Sound effects, synthesised with WebAudio — no audio files needed.
 * Call `sfx('coin')` etc. Respects the profile's sound setting via `setMuted`.
 */

let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(m: boolean): void {
  muted = m;
}

function ac(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ctx) {
      const C =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

interface ToneOpts {
  type?: OscillatorType;
  freq: number;
  to?: number;
  start?: number;
  dur: number;
  vol?: number;
  attack?: number;
}

function tone(c: AudioContext, o: ToneOpts): void {
  const t0 = c.currentTime + (o.start ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);
  const v = (o.vol ?? 0.2) * 0.8;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(v, t0 + (o.attack ?? 0.01));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + o.dur + 0.05);
}

function noise(c: AudioContext, dur: number, vol = 0.2, start = 0, filterFreq = 1200, q = 1): void {
  const t0 = c.currentTime + start;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = filterFreq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(t0);
}

/** A wobbly low "raspberry" — the noble fart. */
function fart(c: AudioContext, start = 0, dur = 0.7): void {
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(95, t0);
  osc.frequency.linearRampToValueAtTime(60, t0 + dur);
  const lfo = c.createOscillator();
  lfo.frequency.value = 24;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 30;
  lfo.connect(lfoGain).connect(osc.frequency);
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 520;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.04);
  g.gain.setValueAtTime(0.3, t0 + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(f).connect(g).connect(c.destination);
  osc.start(t0);
  lfo.start(t0);
  osc.stop(t0 + dur + 0.05);
  lfo.stop(t0 + dur + 0.05);
}

export type Sfx =
  | 'click'
  | 'right'
  | 'wrong'
  | 'nudge'
  | 'coin'
  | 'level'
  | 'goal'
  | 'hit'
  | 'hurt'
  | 'win'
  | 'lose'
  | 'unlock'
  | 'eat'
  | 'poop'
  | 'fart'
  | 'burp'
  | 'squawk'
  | 'pop'
  | 'splash'
  | 'heal'
  | 'crack'
  | 'hatch'
  | 'death'
  | 'page'
  | 'step'
  | 'whoosh'
  | 'zap'
  | 'buzz';

export function sfx(name: Sfx | string | undefined): void {
  if (!name) return;
  const c = ac();
  if (!c) return;
  switch (name) {
    case 'click':
      tone(c, { type: 'triangle', freq: 660, dur: 0.06, vol: 0.12 });
      break;
    case 'page':
      tone(c, { type: 'triangle', freq: 520, to: 780, dur: 0.09, vol: 0.08 });
      break;
    case 'right':
      [523, 659, 784].forEach((f, i) =>
        tone(c, { type: 'triangle', freq: f, start: i * 0.07, dur: 0.18, vol: 0.18 }),
      );
      tone(c, { type: 'sine', freq: 1568, start: 0.2, dur: 0.25, vol: 0.06 });
      break;
    case 'wrong':
      tone(c, { type: 'square', freq: 220, to: 140, dur: 0.32, vol: 0.12 });
      break;
    case 'nudge':
      tone(c, { type: 'triangle', freq: 440, dur: 0.12, vol: 0.14 });
      tone(c, { type: 'triangle', freq: 554, start: 0.12, dur: 0.18, vol: 0.14 });
      break;
    case 'coin':
      tone(c, { type: 'square', freq: 988, dur: 0.08, vol: 0.08 });
      tone(c, { type: 'square', freq: 1319, start: 0.08, dur: 0.25, vol: 0.08 });
      break;
    case 'level':
      [392, 523, 659, 784, 1047].forEach((f, i) =>
        tone(c, { type: 'square', freq: f, start: i * 0.1, dur: 0.22, vol: 0.08 }),
      );
      tone(c, { type: 'triangle', freq: 1047, start: 0.5, dur: 0.6, vol: 0.15 });
      break;
    case 'goal':
      [659, 784, 988, 1319].forEach((f, i) =>
        tone(c, { type: 'triangle', freq: f, start: i * 0.09, dur: 0.3, vol: 0.14 }),
      );
      break;
    case 'hit':
      noise(c, 0.15, 0.35, 0, 900, 0.8);
      tone(c, { type: 'square', freq: 180, to: 60, dur: 0.15, vol: 0.12 });
      break;
    case 'hurt':
      noise(c, 0.2, 0.3, 0, 400, 1);
      tone(c, { type: 'sawtooth', freq: 300, to: 120, dur: 0.25, vol: 0.1 });
      break;
    case 'win':
      [523, 659, 784, 1047].forEach((f, i) =>
        tone(c, { type: 'square', freq: f, start: i * 0.12, dur: 0.2, vol: 0.08 }),
      );
      [784, 1047].forEach((f) =>
        tone(c, { type: 'triangle', freq: f, start: 0.5, dur: 0.7, vol: 0.12 }),
      );
      break;
    case 'lose':
    case 'death':
      // Sad trombone: wah wah wah waaaah.
      [311, 294, 277].forEach((f, i) =>
        tone(c, { type: 'sawtooth', freq: f, start: i * 0.35, dur: 0.32, vol: 0.09 }),
      );
      tone(c, { type: 'sawtooth', freq: 262, to: 247, start: 1.05, dur: 0.9, vol: 0.09 });
      break;
    case 'unlock':
      tone(c, { type: 'square', freq: 1200, dur: 0.04, vol: 0.08 });
      tone(c, { type: 'square', freq: 800, start: 0.05, dur: 0.06, vol: 0.08 });
      noise(c, 0.08, 0.15, 0.03, 3000, 2);
      break;
    case 'eat':
      [0, 0.16, 0.32].forEach((s) => noise(c, 0.09, 0.3, s, 700, 1.5));
      break;
    case 'poop':
      tone(c, { type: 'sine', freq: 180, to: 70, dur: 0.35, vol: 0.3 });
      noise(c, 0.3, 0.2, 0.05, 300, 2);
      break;
    case 'fart':
      fart(c);
      break;
    case 'burp':
      fart(c, 0, 0.5);
      tone(c, { type: 'sawtooth', freq: 120, to: 90, dur: 0.5, vol: 0.12 });
      break;
    case 'squawk':
      tone(c, { type: 'sawtooth', freq: 900, to: 1400, dur: 0.12, vol: 0.12 });
      tone(c, { type: 'sawtooth', freq: 1300, to: 700, start: 0.12, dur: 0.35, vol: 0.12 });
      break;
    case 'pop':
      tone(c, { type: 'sine', freq: 400, to: 1200, dur: 0.08, vol: 0.2 });
      break;
    case 'splash':
      noise(c, 0.5, 0.3, 0, 1800, 0.6);
      break;
    case 'heal':
      [523, 784, 1047, 1568].forEach((f, i) =>
        tone(c, { type: 'sine', freq: f, start: i * 0.06, dur: 0.3, vol: 0.1 }),
      );
      break;
    case 'crack':
      noise(c, 0.06, 0.4, 0, 2500, 3);
      break;
    case 'hatch':
      noise(c, 0.1, 0.4, 0, 2500, 3);
      [784, 988, 1175, 1568].forEach((f, i) =>
        tone(c, { type: 'triangle', freq: f, start: 0.15 + i * 0.08, dur: 0.25, vol: 0.12 }),
      );
      break;
    case 'step':
      tone(c, { type: 'triangle', freq: 200, to: 150, dur: 0.07, vol: 0.12 });
      break;
    case 'whoosh':
      noise(c, 0.35, 0.18, 0, 1500, 0.5);
      break;
    case 'zap':
      tone(c, { type: 'sawtooth', freq: 1900, to: 180, dur: 0.22, vol: 0.12 });
      tone(c, { type: 'square', freq: 2400, to: 900, dur: 0.1, vol: 0.05 });
      break;
    case 'buzz':
      tone(c, { type: 'square', freq: 110, dur: 0.3, vol: 0.07 });
      noise(c, 0.25, 0.12, 0, 3000, 2);
      break;
  }
}
