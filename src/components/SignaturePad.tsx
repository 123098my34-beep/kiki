import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";
import { signatureCanvasToDataUrl } from "../lib/engine/sign";

export default function SignaturePad({
  onChange,
}: {
  onChange: (dataUrl: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#14120f";
  }, []);

  const pos = (e: PointerEvent | React.PointerEvent): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * canvas.width,
      y: ((e.clientY - r.top) / r.height) * canvas.height,
    };
  };

  const start = (e: React.PointerEvent): void => {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
  };

  const move = (e: React.PointerEvent): void => {
    if (!drawing.current || !last.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (!hasInk) setHasInk(true);
  };

  const end = (): void => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    const canvas = canvasRef.current;
    if (canvas && hasInk) onChange(signatureCanvasToDataUrl(canvas));
  };

  const clear = (): void => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    onChange(null);
  };

  return (
    <div>
      <div className="relative rounded-xl border-2 border-dashed border-paper-300/25 bg-white">
        <canvas
          ref={canvasRef}
          width={900}
          height={260}
          className="h-40 w-full touch-none rounded-xl sm:h-48"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
        {!hasInk && (
          <span className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="font-serif text-lg italic text-ink-300">Sign here</span>
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-500">
          {hasInk ? "signature captured — transparent PNG" : "draw with mouse, pen, or finger"}
        </p>
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-ink-400 transition hover:bg-ink-800 hover:text-paper-50"
        >
          <Eraser className="size-3.5" /> Clear
        </button>
      </div>
    </div>
  );
}
