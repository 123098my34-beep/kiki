import { useEffect, useRef } from "react";

interface Props {
  /** 0..1 mic level; omit for a procedural idle animation */
  level?: number;
  active?: boolean;
  bars?: number;
  className?: string;
}

/**
 * Animated signal bars — the brand's heartbeat.
 * Idle: speech-like procedural envelope. Active: driven by real mic level.
 * Perf: stops its rAF loop while offscreen (IntersectionObserver) and paints
 * a single static frame when the user prefers reduced motion.
 */
export default function SignalWave({ level, active = false, bars = 56, className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const levelRef = useRef(0);
  const activeRef = useRef(active);

  useEffect(() => {
    levelRef.current = level ?? 0;
    activeRef.current = active;
  }, [level, active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let t = 0;
    let visible = true;
    const heights = new Array<number>(bars).fill(0.08);

    const drawFrame = (advance: boolean) => {
      if (advance) t += 0.045;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (w < 2 || h < 2) return;
      ctx.clearRect(0, 0, w, h);

      const gap = 3;
      const bw = Math.max(2, (w - gap * (bars - 1)) / bars);
      const lvl = activeRef.current ? levelRef.current : 0;

      for (let i = 0; i < bars; i++) {
        const centerBias = 1 - Math.abs(i - bars / 2) / (bars / 2);
        const wave =
          Math.sin(t * 2.1 + i * 0.38) * 0.4 +
          Math.sin(t * 3.7 + i * 0.9) * 0.25 +
          Math.sin(t * 1.2 + i * 0.15) * 0.35;
        const idle = 0.1 + 0.16 * centerBias * (wave * 0.5 + 0.5);
        const live =
          0.06 + Math.min(1, lvl * 2.4 + Math.abs(wave) * 0.35) * 0.9 * (0.35 + 0.65 * centerBias);
        const target = activeRef.current ? live : idle;
        heights[i] += (target - heights[i]) * 0.24;

        const bh = Math.max(2, heights[i] * h);
        const x = i * (bw + gap);
        const y = (h - bh) / 2;

        const grad = ctx.createLinearGradient(0, y, 0, y + bh);
        grad.addColorStop(
          0,
          activeRef.current ? "rgba(124, 243, 189, 0.95)" : "rgba(47, 217, 138, 0.8)"
        );
        grad.addColorStop(
          1,
          activeRef.current ? "rgba(27, 179, 113, 0.55)" : "rgba(27, 179, 113, 0.25)"
        );
        ctx.fillStyle = grad;

        const r = Math.min(bw / 2, 2.5);
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(x, y, bw, bh, r);
        } else {
          ctx.rect(x, y, bw, bh);
        }
        ctx.fill();
      }
    };

    const schedule = () => {
      if (!raf && visible && !reduced) {
        raf = requestAnimationFrame(step);
      }
    };

    function step() {
      raf = 0;
      if (!visible) return;
      drawFrame(true);
      raf = requestAnimationFrame(step);
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduced) drawFrame(false);
    };
    resize();
    window.addEventListener("resize", resize);

    let io: IntersectionObserver | null = null;
    if (!reduced && typeof IntersectionObserver === "function") {
      io = new IntersectionObserver(
        (entries) => {
          const wasVisible = visible;
          visible = entries[0]?.isIntersecting ?? true;
          if (visible && !wasVisible) schedule();
          if (!visible && raf) {
            cancelAnimationFrame(raf);
            raf = 0;
          }
        },
        { threshold: 0.05 }
      );
      io.observe(canvas);
    }

    if (reduced) drawFrame(false);
    else schedule();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      io?.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [bars]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
