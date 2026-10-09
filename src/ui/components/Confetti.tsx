/** A burst of confetti on a canvas overlay. */
import { useEffect, useRef } from 'preact/hooks';

const COLORS = ['#ffd166', '#ff5fa2', '#5ee6a8', '#7dd3fc', '#9b7bff', '#ff9f43'];

export function Confetti({ pieces = 140 }: { pieces?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const c = canvas.getContext('2d');
    if (!c) return;
    const w = (canvas.width = canvas.offsetWidth * devicePixelRatio);
    const h = (canvas.height = canvas.offsetHeight * devicePixelRatio);
    const parts = Array.from({ length: pieces }, () => ({
      x: w / 2 + (Math.random() - 0.5) * w * 0.2,
      y: h * 0.45,
      vx: (Math.random() - 0.5) * w * 0.025,
      vy: -Math.random() * h * 0.03 - h * 0.008,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      s: (6 + Math.random() * 8) * devicePixelRatio,
      col: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));
    let raf = 0;
    let t = 0;
    const tick = () => {
      t++;
      c.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.vy += h * 0.0009;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.r);
        c.fillStyle = p.col;
        c.globalAlpha = Math.max(0, 1 - t / 180);
        c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        c.restore();
      }
      if (t < 180) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pieces]);
  return (
    <canvas
      ref={ref}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 120,
      }}
    />
  );
}
