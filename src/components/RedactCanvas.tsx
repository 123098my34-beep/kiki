import { useEffect, useRef, useState } from "react";
import { Flame, Plus, Trash2 } from "lucide-react";
import {
  openWithPdfjs,
  redactPdf,
  downloadBytes,
  baseName,
  type RedactRegion,
} from "../lib/engine";

interface Rect {
  pageIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export default function RedactCanvas({
  file,
  busy,
  onBusyChange,
  onProgress,
  onError,
}: {
  file: File;
  busy: boolean;
  onBusyChange: (b: boolean) => void;
  onProgress: (pct: number, label: string) => void;
  onError: (msg: string | null) => void;
}) {
  const [pages, setPages] = useState<string[]>([]);
  const [current, setCurrent] = useState(0);
  const [rects, setRects] = useState<Rect[]>([]);
  const drag = useRef<{ x0: number; y0: number } | null>(null);
  const [pending, setPending] = useState<Rect | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const doc = await openWithPdfjs(file);
        const urls: string[] = [];
        const count = Math.min(doc.numPages, 40);
        for (let i = 1; i <= count; i++) {
          const page = await doc.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: 620 / Math.max(base.width, base.height) });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport }).promise;
          urls.push(canvas.toDataURL("image/jpeg", 0.8));
        }
        doc.destroy();
        if (!cancelled) setPages(urls);
      } catch (e) {
        if (!cancelled) onError(e instanceof Error ? e.message : "Failed to render");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>): void => {
    const host = e.currentTarget.getBoundingClientRect();
    drag.current = {
      x0: (e.clientX - host.left) / host.width,
      y0: (e.clientY - host.top) / host.height,
    };
  };
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (!drag.current) return;
    const host = e.currentTarget.getBoundingClientRect();
    const x1 = (e.clientX - host.left) / host.width;
    const y1 = (e.clientY - host.top) / host.height;
    const { x0, y0 } = drag.current;
    setPending({
      pageIndex: current,
      x: Math.min(x0, x1),
      y: Math.min(y0, y1),
      w: Math.abs(x1 - x0),
      h: Math.abs(y1 - y0),
    });
  };
  const onMouseUp = (): void => {
    if (pending && pending.w > 0.01 && pending.h > 0.01) {
      setRects((prev) => [...prev, pending]);
    }
    setPending(null);
    drag.current = null;
  };

  const apply = async (): Promise<void> => {
    onBusyChange(true);
    onError(null);
    try {
      const bytes = await redactPdf(file, rects, onProgress);
      downloadBytes(bytes, baseName(file.name) + " — redacted.pdf");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Redaction failed");
    } finally {
      onBusyChange(false);
    }
  };

  if (pages.length === 0) {
    return <p className="py-10 text-center text-sm text-ink-300">Rendering pages…</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            className="rounded-md border hairline px-3 py-1.5 text-sm text-paper-100 disabled:opacity-40"
          >
            ←
          </button>
          <span className="font-mono text-xs text-ink-300">
            page {current + 1} / {pages.length}
          </span>
          <button
            type="button"
            onClick={() => setCurrent((c) => Math.min(pages.length - 1, c + 1))}
            disabled={current === pages.length - 1}
            className="rounded-md border hairline px-3 py-1.5 text-sm text-paper-100 disabled:opacity-40"
          >
            →
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] uppercase tracking-widest text-ink-400">
            {rects.length} box{rects.length === 1 ? "" : "es"} · drag to draw
          </span>
          {rects.length > 0 && (
            <button type="button" onClick={() => setRects([])} className="inline-flex items-center gap-1.5 text-xs text-ink-400 hover:text-paper-50">
              <Trash2 className="size-3.5" /> Reset
            </button>
          )}
          <button
            type="button"
            onClick={() => void apply()}
            disabled={busy || rects.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-brass-400 px-5 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-brass-300 disabled:opacity-50"
          >
            <Flame className="size-4" />
            {busy ? "Burning…" : "Apply & download"}
          </button>
        </div>
      </div>

      <div className="mt-4 flex justify-center">
        <div
          className="relative max-w-2xl cursor-crosshair select-none overflow-hidden rounded-lg shadow-2xl"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <img src={pages[current]} alt={`Page ${current + 1}`} className="pointer-events-none block w-full" draggable={false} />
          {rects
            .filter((r) => r.pageIndex === current)
            .map((r, i) => (
              <div
                key={i}
                className="absolute border border-red-300/60 bg-black"
                style={{
                  left: `${r.x * 100}%`,
                  top: `${r.y * 100}%`,
                  width: `${r.w * 100}%`,
                  height: `${r.h * 100}%`,
                }}
              />
            ))}
          {pending && pending.pageIndex === current && (
            <div
              className="absolute border border-dashed border-red-400 bg-black/40"
              style={{
                left: `${pending.x * 100}%`,
                top: `${pending.y * 100}%`,
                width: `${pending.w * 100}%`,
                height: `${pending.h * 100}%`,
              }}
            />
          )}
        </div>
      </div>

      <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-widest text-ink-500">
        <Plus className="mr-1 inline size-3 text-brass-300" />
        affected pages are re-rasterized — covered text is destroyed, not hidden
      </p>
    </div>
  );
}
