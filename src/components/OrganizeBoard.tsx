import { useMemo, useState } from "react";
import {
  Download,
  Flame,
  RotateCw,
  Trash2,
  Undo2,
} from "lucide-react";
import {
  organizePdf,
  downloadBytes,
  type PageThumb,
} from "../lib/pdfEngine";

interface Props {
  file: File;
  thumbs: PageThumb[];
  onReset: () => void;
}

interface Slot {
  index: number; // original 0-based page index
  rotate: boolean;
  remove: boolean;
}

export default function OrganizeBoard({ file, thumbs, onReset }: Props) {
  const [slots, setSlots] = useState<Slot[]>(
    thumbs.map((t) => ({ index: t.index, rotate: false, remove: false }))
  );
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const kept = useMemo(() => slots.filter((s) => !s.remove), [slots]);

  const move = (from: number, to: number): void => {
    setSlots((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      if (!item) return prev;
      next.splice(to, 0, item);
      return next;
    });
  };

  const toggleRotate = (i: number): void =>
    setSlots((prev) => prev.map((s, j) => (j === i ? { ...s, rotate: !s.rotate } : s)));

  const toggleRemove = (i: number): void =>
    setSlots((prev) => prev.map((s, j) => (j === i ? { ...s, remove: !s.remove } : s)));

  const apply = async (): Promise<void> => {
    setBusy(true);
    try {
      const bytes = await organizePdf(file, {
        order: slots.map((s) => s.index),
        remove: new Set(slots.filter((s) => s.remove).map((s) => s.index)),
        rotate: new Set(
          slots.filter((s) => s.rotate && !s.remove).map((s) => s.index)
        ),
      });
      downloadBytes(
        bytes,
        file.name.replace(/\.pdf$/i, "") + " — organized.pdf"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-300">
          Drag cards to reorder · <RotateCw className="inline size-3.5 text-brass-300" /> rotate ·{" "}
          <Trash2 className="inline size-3.5 text-red-300" /> delete —{" "}
          <span className="font-mono text-[11px] text-ink-400">
            {kept.length} of {slots.length} pages kept
          </span>
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={onReset} className="text-sm text-ink-400 transition hover:text-paper-50">
            <Undo2 className="mr-1.5 inline size-4" /> Start over
          </button>
          <button
            type="button"
            onClick={() => void apply()}
            disabled={busy || kept.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-brass-400 px-5 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-brass-300 disabled:opacity-50"
          >
            <Download className="size-4" />
            {busy ? "Building…" : "Apply & download"}
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {slots.map((slot, i) => {
          const thumb = thumbs.find((t) => t.index === slot.index);
          return (
            <div
              key={`${slot.index}-${i}`}
              draggable
              onDragStart={() => setDragIdx(i)}
              onDragOver={(e) => {
                e.preventDefault();
                setOverIdx(i);
              }}
              onDragLeave={() => setOverIdx((cur) => (cur === i ? null : cur))}
              onDrop={() => {
                if (dragIdx !== null && dragIdx !== i) move(dragIdx, i);
                setDragIdx(null);
                setOverIdx(null);
              }}
              onDragEnd={() => {
                setDragIdx(null);
                setOverIdx(null);
              }}
              className={`group relative cursor-grab rounded-xl border bg-ink-900/70 p-2 transition active:cursor-grabbing ${
                slot.remove
                  ? "border-red-400/40 opacity-40"
                  : overIdx === i && dragIdx !== null && dragIdx !== i
                    ? "border-brass-400 shadow-[0_0_0_2px_rgba(244,185,66,0.35)]"
                    : "border-paper-300/15 hover:border-brass-400/40"
              } ${dragIdx === i ? "opacity-50" : ""}`}
            >
              <div className="overflow-hidden rounded-lg bg-white shadow-md">
                <img
                  src={thumb?.dataUrl}
                  alt={`Page ${slot.index + 1}`}
                  className="pointer-events-none w-full transition-transform duration-300"
                  style={{ transform: slot.rotate ? "rotate(90deg)" : undefined, aspectRatio: "auto" }}
                />
              </div>
              <p className="mt-2 text-center font-mono text-[10px] text-ink-400">
                {i + 1} <span className="text-ink-600">·</span> orig {slot.index + 1}
              </p>
              <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => toggleRotate(i)}
                  className={`grid size-7 place-items-center rounded-md backdrop-blur transition ${
                    slot.rotate
                      ? "bg-brass-400 text-ink-950"
                      : "bg-ink-950/80 text-paper-100 hover:bg-ink-800"
                  }`}
                  aria-label="Rotate page"
                >
                  <RotateCw className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleRemove(i)}
                  className={`grid size-7 place-items-center rounded-md backdrop-blur transition ${
                    slot.remove
                      ? "bg-red-400 text-ink-950"
                      : "bg-ink-950/80 text-paper-100 hover:bg-ink-800"
                  }`}
                  aria-label="Delete page"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <span className="absolute left-2 top-1.5 cursor-grab rounded bg-ink-950/70 px-1.5 py-0.5 font-mono text-[9px] text-ink-300 backdrop-blur">
                ⠿ {i + 1}
              </span>
            </div>
          );
        })}
      </div>

      {kept.length === 0 && (
        <p className="mt-6 text-center text-sm text-red-300">
          All pages marked for deletion — unmark at least one to apply.
        </p>
      )}

      <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-widest text-ink-500">
        <Flame className="mr-1.5 inline size-3.5 text-brass-300" />
        reorder happens in memory — nothing uploads
      </p>
    </div>
  );
}
