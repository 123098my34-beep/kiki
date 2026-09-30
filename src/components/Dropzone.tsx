import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { UploadCloud, X, FileText, Image as ImageIcon } from "lucide-react";
import { formatBytes } from "../lib/pdfEngine";

interface Props {
  accept: string;
  multiple: boolean;
  files: File[];
  onChange: (files: File[]) => void;
  compact?: boolean;
  label?: string;
}

export default function Dropzone({ accept, multiple, files, onChange, compact, label }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const addFiles = (incoming: FileList | null): void => {
    if (!incoming || incoming.length === 0) return;
    const arr = Array.from(incoming);
    const next = multiple ? [...files, ...arr] : [arr[0] ?? new File([], "")].slice(0, 1);
    onChange(next.filter((f) => f.size > 0));
  };

  const onDrop = (e: DragEvent): void => {
    e.preventDefault();
    setDrag(false);
    addFiles(e.dataTransfer.files);
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>): void => {
    addFiles(e.target.files);
    e.target.value = "";
  };

  const removeAt = (i: number): void => {
    const next = [...files];
    next.splice(i, 1);
    onChange(next);
  };

  const isImage = accept.includes("image");

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={`flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition ${
          drag
            ? "border-brass-400 bg-brass-400/10"
            : "border-paper-300/20 bg-ink-900/50 hover:border-brass-400/50 hover:bg-ink-900/80"
        } ${compact ? "px-6 py-8" : "px-6 py-14"}`}
      >
        <span
          className={`grid size-14 place-items-center rounded-full bg-brass-400/10 text-brass-300 transition ${
            drag ? "scale-110" : ""
          }`}
        >
          <UploadCloud className="size-7" strokeWidth={1.75} />
        </span>
        <span className="text-center">
          <span className="block text-sm font-semibold text-paper-50">
            {label ?? (drag ? "Release to load" : "Drop files here")}
          </span>
          <span className="mt-1 block text-xs text-ink-400">
            or click to browse — {isImage ? "PNG · JPG · WebP" : "PDF"} · processed locally
          </span>
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={onPick}
        className="hidden"
      />

      {files.length > 0 && (
        <ul className="mt-4 space-y-2">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center gap-3 rounded-lg border hairline bg-ink-900/70 px-3 py-2.5"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-md bg-brass-400/10 text-brass-300">
                {isImage ? (
                  <ImageIcon className="size-4" />
                ) : (
                  <FileText className="size-4" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-paper-100">{f.name}</span>
                <span className="block font-mono text-[11px] text-ink-400">
                  {formatBytes(f.size)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="grid size-7 shrink-0 place-items-center rounded-md text-ink-400 transition hover:bg-ink-800 hover:text-paper-50"
                aria-label={`Remove ${f.name}`}
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
