import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Cloud,
  Copy,
  Download,
  FileDown,
  Flame,
  Lock,
  Play,
  RotateCcw,
  Trash2,
} from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Dropzone from "../components/Dropzone";
import ProgressPanel from "../components/ProgressPanel";
import OrganizeBoard from "../components/OrganizeBoard";
import SignaturePad from "../components/SignaturePad";
import RedactCanvas from "../components/RedactCanvas";
import CompareView from "../components/CompareView";
import { Badge, btnGhost, btnPrimary, inputCls, labelCls, selectCls } from "../components/ui";
import { toolBySlug, CATEGORY_LABELS, CLOUD_TOOLS, type ToolDef, type ToolField } from "../lib/tools";
import { runTool, triggerDownloadResult, type RunResult } from "../lib/runner";
import { runRemote, checkApi, toDocInfo } from "../lib/remote";
import { renderThumbs, formatBytes, downloadBytes, type PageThumb } from "../lib/engine";

type Values = Record<string, string | number | boolean>;

export default function ToolPage() {
  const { toolSlug } = useParams();
  const tool = toolBySlug(toolSlug);

  const [fileInputs, setFileInputs] = useState<File[][]>([]);
  const [values, setValues] = useState<Values>({});
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [tier, setTier] = useState<"local" | "cloud">("local");
  const [apiUp, setApiUp] = useState<boolean | null>(null);
  const [tierNote, setTierNote] = useState<string | null>(null);

  // special-flow state
  const [thumbs, setThumbs] = useState<PageThumb[] | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const progress = useCallback((p: number, l: string) => {
    setPct(p);
    setLabel(l);
  }, []);

  // preflight the cloud engine once per tool so the toggle can show readiness
  const cloudCapable = tool ? CLOUD_TOOLS.has(tool.id) : false;
  useEffect(() => {
    setTierNote(null);
    if (tool && CLOUD_TOOLS.has(tool.id)) {
      void checkApi().then((r) => setApiUp(r.ok));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool?.id]);

  if (!tool) return <NotFoundTool slug={toolSlug ?? ""} />;

  const inputCount = tool.inputs === "many" ? 1 : tool.inputs;

  const setFileAt = (slot: number, files: File[]): void => {
    setFileInputs((prev) => {
      const next = [...prev];
      while (next.length < inputCount) next.push([]);
      next[slot] = files;
      return next;
    });
  };

  const allFiles = fileInputs.flat();
  const setVal = (name: string, v: string | number | boolean): void =>
    setValues((prev) => ({ ...prev, [name]: v }));

  const defaultsReady = tool.fields.every((f) => values[f.name] !== undefined);
  if (!defaultsReady && tool.fields.length > 0) {
    const d: Values = { ...values };
    tool.fields.forEach((f) => {
      if (d[f.name] === undefined && f.def !== undefined) d[f.name] = f.def;
    });
    // render-time init is safe here: fields are static per tool
    setValues(d);
  }

  const reset = useCallback(() => {
    setFileInputs([]);
    setValues({});
    setBusy(false);
    setPct(0);
    setLabel("");
    setError(null);
    setResult(null);
    setThumbs(null);
    setSignature(null);
  }, []);

  const requiredFilesReady =
    tool.inputs === "many" ? allFiles.length > 0 : allFiles.length >= inputCount;

  const missingField = tool.fields.find((f) => {
    if (f.showIf) {
      const cond = values[f.showIf.field];
      if (String(cond) !== f.showIf.equals) return false;
    }
    if (f.type === "password") return f.name === "userPassword" || f.name === "password" ? !String(values[f.name] ?? "") : false;
    if (f.type === "text" && f.name === "query") return !String(values[f.name] ?? "").trim();
    if (f.type === "ranges" || f.type === "textarea") {
      if (f.name === "ranges" && String(values.mode ?? "ranges") === "every") return false;
      if (f.name === "ranges" && String(values.mode ?? "") === "half") return false;
      return !String(values[f.name] ?? "").trim();
    }
    return false;
  });

  const canRun =
    !busy &&
    requiredFilesReady &&
    !missingField &&
    (tool.id !== "watermark" || String(values.text ?? "").trim().length > 0) &&
    (tool.id !== "protect" || String(values.userPassword ?? "").length > 0) &&
    (tool.id !== "unlock" || String(values.password ?? "").length > 0) &&
    (tool.id !== "search" || String(values.query ?? "").trim().length > 0) &&
    (tool.id !== "text-to-pdf" || String(values.text ?? "").trim().length > 0);

  const run = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    setResult(null);
    setTierNote(null);
    try {
      if (tier === "cloud") {
        if (!apiUp) {
          const probe = await checkApi();
          setApiUp(probe.ok);
          if (!probe.ok) throw new Error("Cloud engine unreachable — it may still be starting up. Stay on the Local engine, or retry in a moment.");
        }
        const remote = await runRemote(tool.id, allFiles, values);
        if (remote.kind === "download") {
          downloadBytes(remote.bytes, remote.name, remote.mime);
          setResult({
            kind: "download",
            name: remote.name,
            bytes: remote.bytes,
            mime: remote.mime,
            note: remote.savedPct !== undefined ? `Server compression saved ${remote.savedPct}% (${formatBytes(remote.before ?? 0)} → ${formatBytes(remote.after ?? 0)})` : undefined,
          });
        } else if (remote.kind === "text") {
          setResult({ kind: "text", text: remote.text, downloadName: `${tool.slug}.txt` });
        } else if (remote.kind === "info") {
          setResult({ kind: "info", info: toDocInfo(remote.info) });
        } else {
          setResult({ kind: "search", hits: remote.hits });
        }
      } else {
        const res = await runTool(tool, {
          files: allFiles,
          values,
          signatureDataUrl: signature ?? undefined,
          onProgress: progress,
        });
        setResult(res);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
      if (msg.includes("runs locally only")) setTier("local");
    } finally {
      setBusy(false);
    }
  };

  /* -------------------------- special: organize board -------------------------- */
  if (tool.id === "organize") {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <ToolHeader tool={tool} />
          {!thumbs ? (
            <div className="mx-auto mt-8 max-w-xl">
              <Dropzone accept={tool.accept} multiple={false} files={allFiles} onChange={(f) => setFileAt(0, f)} />
              <button
                type="button"
                className={btnPrimary + " mt-5 w-full"}
                disabled={allFiles.length === 0 || busy}
                onClick={async () => {
                  setBusy(true);
                  setError(null);
                  try {
                    const t = await renderThumbs(allFiles[0]!, 60, progress);
                    setThumbs(t);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Failed to render pages");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Play className="size-4" /> Load page board
              </button>
              {busy && <div className="mt-4"><ProgressPanel pct={pct} label={label} /></div>}
              {error && <ErrorBox message={error} />}
            </div>
          ) : (
            <OrganizeBoard file={allFiles[0]!} thumbs={thumbs} onReset={reset} />
          )}
        </main>
        <Footer />
      </div>
    );
  }

  /* --------------------------- special: sign flow ------------------------------ */
  const showSign = tool.id === "sign" && allFiles.length > 0;
  const showRedact = tool.id === "redact" && allFiles.length > 0;

  return (
    <div className="min-h-screen">
      <Header />
      <main className={showRedact ? "mx-auto max-w-6xl px-4 py-12 sm:px-6" : "mx-auto max-w-3xl px-4 py-12 sm:px-6"}>
        <ToolHeader tool={tool} />

        {showRedact ? (
          <div className="card-ink mt-8 rounded-2xl p-4 sm:p-6">
            <RedactCanvas
              file={allFiles[0]!}
              busy={busy}
              onBusyChange={setBusy}
              onProgress={progress}
              onError={setError}
            />
          </div>
        ) : (
          <div className="card-ink mt-8 rounded-2xl p-6 sm:p-8">
            {!result ? (
              <>
                {/* dropzones */}
                <div className={inputCount > 1 ? "grid gap-4 sm:grid-cols-2" : ""}>
                  {Array.from({ length: inputCount }, (_, slot) => (
                    <Dropzone
                      key={slot}
                      accept={tool.accept}
                      multiple={tool.inputs === "many"}
                      files={fileInputs[slot] ?? []}
                      onChange={(f) => setFileAt(slot, f)}
                      compact={(fileInputs[slot]?.length ?? 0) > 0}
                      label={
                        inputCount > 1
                          ? slot === 0
                            ? "First document"
                            : "Second document"
                          : undefined
                      }
                    />
                  ))}
                </div>

                {/* signature pad */}
                {showSign && (
                  <div className="mt-6">
                    <span className={labelCls}>Draw your signature</span>
                    <SignaturePad onChange={setSignature} />
                  </div>
                )}

                {/* processing tier toggle */}
                {cloudCapable && (
                  <div className="mt-6 rounded-xl border hairline bg-ink-900/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className={labelCls}>Processing engine</span>
                        <div className="mt-1 flex gap-2">
                          {(["local", "cloud"] as const).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setTier(t)}
                              className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium transition ${
                                tier === t
                                  ? "border-brass-400 bg-brass-400/15 text-brass-200"
                                  : "border-paper-300/15 bg-ink-900/60 text-ink-300 hover:border-brass-400/40"
                              }`}
                            >
                              {t === "local" ? <><Lock className="size-3.5" /> Local (in-browser)</> : <><Cloud className="size-3.5" /> Cloud (server)</>}
                            </button>
                          ))}
                        </div>
                      </div>
                      <span
                        className={`font-mono text-[11px] uppercase tracking-widest ${
                          apiUp === null ? "text-ink-500" : apiUp ? "text-emerald-300" : "text-amber-300"
                        }`}
                      >
                        {tier === "cloud"
                          ? apiUp === null
                            ? "checking engine…"
                            : apiUp
                              ? "cloud engine ready"
                              : "cloud engine unreachable"
                          : "your device does the work"}
                      </span>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-ink-400">
                      {tier === "local"
                        ? "Files stay in this tab — nothing is transmitted. Best for sensitive documents."
                        : "Runs on our ephemeral server: stronger compression, rasterization-free grayscale, and faster OCR. Results are held in memory for a single download, then deleted."}
                    </p>
                    {tierNote && <p className="mt-2 text-xs text-amber-300">{tierNote}</p>}
                  </div>
                )}

                {/* option fields */}
                {tool.fields.length > 0 && (
                  <div className="mt-6 space-y-5">
                    {tool.fields.map((f) => (
                      <FieldInput
                        key={f.name}
                        field={f}
                        values={values}
                        onChange={setVal}
                      />
                    ))}
                  </div>
                )}

                {/* run row */}
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <button type="button" className={btnPrimary + " flex-1"} disabled={!canRun} onClick={() => void run()}>
                    <Play className="size-4" />
                    {busy ? "Working…" : runLabel(tool)}
                  </button>
                  {allFiles.length > 0 && (
                    <button type="button" className={btnGhost} onClick={reset}>
                      <RotateCcw className="size-4" /> Clear
                    </button>
                  )}
                </div>
                {missingField && !busy && (
                  <p className="mt-3 font-mono text-[11px] uppercase tracking-widest text-ink-500">
                    Waiting for: {missingField.label}
                  </p>
                )}
                {busy && <div className="mt-5"><ProgressPanel pct={pct} label={label} /></div>}
                {error && <ErrorBox message={error} />}
              </>
            ) : (
              <ResultView
                result={result}
                tool={tool}
                tier={tier}
                copied={copied}
                onCopy={async () => {
                  if (result.kind === "text") {
                    await navigator.clipboard.writeText(result.text);
                    setCopied(true);
                  }
                }}
                onReset={reset}
              />
            )}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-xl border hairline bg-ink-900/50 px-5 py-4">
          {tier === "local" ? (
            <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-ink-400">
              <Lock className="size-3.5 text-brass-300" /> processed on-device
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-ink-400">
              <Cloud className="size-3.5 text-forge-400" /> ephemeral cloud session · single-use download
            </span>
          )}
          <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-ink-400">
            <FileDown className="size-3.5 text-brass-300" /> no account needed
          </span>
          <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-ink-400">
            <Flame className="size-3.5 text-brass-300" /> unlimited tasks
          </span>
        </div>
      </main>
      <Footer />
    </div>
  );
}

/* -------------------------------- field input ------------------------------- */

function FieldInput({
  field,
  values,
  onChange,
}: {
  field: ToolField;
  values: Values;
  onChange: (name: string, v: string | number | boolean) => void;
}) {
  if (field.showIf && String(values[field.showIf.field]) !== field.showIf.equals) return null;
  const v = values[field.name];
  const id = `f-${field.name}`;

  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-3 text-sm text-paper-100">
        <input type="checkbox" checked={v === true} onChange={(e) => onChange(field.name, e.target.checked)} className="size-4 accent-brass-400" />
        {field.label}
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <div>
        <label className={labelCls} htmlFor={id}>{field.label}</label>
        <select id={id} className={selectCls} value={String(v ?? "")} onChange={(e) => onChange(field.name, e.target.value)}>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {field.hint && <p className="mt-1.5 font-mono text-[11px] text-ink-500">{field.hint}</p>}
      </div>
    );
  }

  if (field.type === "range") {
    return (
      <div>
        <label className={labelCls} htmlFor={id}>{field.label} — {String(v ?? field.def)}</label>
        <input
          id={id}
          type="range"
          min={field.min}
          max={field.max}
          step={field.step}
          value={Number(v ?? field.def ?? 0)}
          onChange={(e) => onChange(field.name, parseFloat(e.target.value))}
          className="w-full accent-brass-400"
        />
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div>
        <label className={labelCls} htmlFor={id}>{field.label}</label>
        <textarea
          id={id}
          rows={10}
          className={inputCls + " font-mono text-xs leading-relaxed"}
          value={String(v ?? "")}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.name, e.target.value)}
        />
      </div>
    );
  }

  return (
    <div>
      <label className={labelCls} htmlFor={id}>{field.label}</label>
      <input
        id={id}
        type={field.type === "password" ? "password" : field.type === "number" ? "number" : "text"}
        min={field.type === "number" ? field.min : undefined}
        max={field.type === "number" ? field.max : undefined}
        step={field.type === "number" ? field.step : undefined}
        className={inputCls}
        value={String(v ?? "")}
        placeholder={field.placeholder}
        onChange={(e) =>
          onChange(
            field.name,
            field.type === "number" ? parseFloat(e.target.value || "0") : e.target.value
          )
        }
      />
      {field.hint && <p className="mt-1.5 font-mono text-[11px] text-ink-500">{field.hint}</p>}
    </div>
  );
}

/* -------------------------------- result view ------------------------------- */

function ResultView({
  result,
  tool,
  tier,
  copied,
  onCopy,
  onReset,
}: {
  result: RunResult;
  tool: ToolDef;
  tier: "local" | "cloud";
  copied: boolean;
  onCopy: () => void;
  onReset: () => void;
}) {
  return (
    <div className="py-4 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-400/10 text-emerald-300">
        <CheckCircle2 className="size-7" />
      </span>
      <h3 className="mt-4 font-serif text-xl font-bold text-paper-50">{doneTitle(result, tool)}</h3>

      {result.kind === "compare" ? (
        <CompareView
          result={{
            aName: result.result.a.name,
            bName: result.result.b.name,
            aPages: result.result.aPages,
            bPages: result.result.bPages,
            pairs: result.result.pairs,
            verdict: result.result.verdict,
          }}
        />
      ) : result.kind === "info" ? (
        <InfoView info={result.info} />
      ) : result.kind === "attachments" ? (
        <AttachmentView entries={result.entries} />
      ) : result.kind === "search" ? (
        <SearchView hits={result.hits} />
      ) : result.kind === "text" ? (
        <>
          <textarea
            readOnly
            value={result.text}
            className="mt-5 h-72 w-full rounded-lg border hairline bg-ink-950/80 p-4 text-left font-mono text-xs leading-relaxed text-paper-200"
          />
          <div className="mt-3 flex justify-center gap-3">
            <button type="button" className={btnPrimary} onClick={() => triggerDownloadResult(result)}>
              <Download className="size-4" /> Download .txt
            </button>
            <button type="button" className={btnGhost} onClick={onCopy}>
              {copied ? <CheckCircle2 className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy all"}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-300">
            {tier === "cloud"
              ? "Processed on the ephemeral cloud session — result fetched once, then deleted server-side."
              : "Processed on this device — saved from a local Blob."}
          </p>
          {result.kind === "download" && result.note && (
            <p className="mx-auto mt-2 max-w-md rounded-lg bg-forge-400/10 px-4 py-2 font-mono text-xs text-forge-400">
              {result.note}
            </p>
          )}
        </>
      )}

      {result.kind !== "compare" && result.kind !== "info" && result.kind !== "attachments" && result.kind !== "search" && (
        <div className="mt-6">
          <button type="button" className={btnPrimary} onClick={() => triggerDownloadResult(result)}>
            <Download className="size-4" /> Download again
          </button>
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" className={btnGhost} onClick={onReset}>
          <RotateCcw className="size-4" /> Process another
        </button>
        <Link to="/" className={btnGhost}>All tools</Link>
      </div>
    </div>
  );
}

function doneTitle(r: RunResult, tool: ToolDef): string {
  if (r.kind === "compare") return "Comparison ready";
  if (r.kind === "info") return "Document dossier";
  if (r.kind === "attachments") return "Embedded files found";
  if (r.kind === "search") return "Search complete";
  if (r.kind === "text") return "Text extracted";
  return `${tool.name} finished`;
}

function InfoView({ info }: { info: ReturnType<typeof Object> | Record<string, string | number | boolean> }) {
  const entries = Object.entries(info as Record<string, string | number | boolean>);
  return (
    <div className="mt-5 overflow-hidden rounded-xl border hairline text-left">
      <table className="w-full text-sm">
        <tbody className="divide-y hairline bg-ink-950/60">
          {entries.map(([k, v]) => (
            <tr key={k}>
              <td className="px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-ink-400">{k}</td>
              <td className="px-4 py-2.5 text-paper-100">{String(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AttachmentView({ entries }: { entries: Array<{ name: string; size: number }> }) {
  if (entries.length === 0)
    return <p className="mt-4 text-sm text-ink-300">No embedded files found in this document.</p>;
  return (
    <ul className="mt-5 space-y-2 text-left">
      {entries.map((e) => (
        <li key={e.name} className="flex items-center justify-between rounded-lg border hairline bg-ink-950/60 px-4 py-2.5 text-sm">
          <span className="text-paper-100">{e.name}</span>
          <span className="font-mono text-xs text-ink-400">{e.size.toLocaleString()} bytes</span>
        </li>
      ))}
    </ul>
  );
}

function SearchView({ hits }: { hits: Array<{ page: number; excerpt: string }> }) {
  if (hits.length === 0)
    return <p className="mt-4 text-sm text-ink-300">No matches found.</p>;
  return (
    <ul className="mt-5 max-h-72 space-y-2 overflow-y-auto text-left">
      {hits.map((h, i) => (
        <li key={i} className="rounded-lg border hairline bg-ink-950/60 px-4 py-2.5 text-sm">
          <span className="mr-2 rounded bg-brass-400/15 px-1.5 py-0.5 font-mono text-[10px] uppercase text-brass-300">
            p. {h.page}
          </span>
          <span className="text-paper-200">…{h.excerpt}…</span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------ small components ----------------------------- */

function runLabel(tool: ToolDef): string {
  if (tool.id === "ocr") return "Run OCR";
  if (tool.id === "search") return "Search";
  if (tool.id === "compare") return "Compare documents";
  if (tool.id === "text-to-pdf" || tool.id === "blank-pdf") return "Generate PDF";
  return "Process & download";
}

function ToolHeader({ tool }: { tool: ToolDef }) {
  return (
    <div>
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-ink-400 transition hover:text-brass-300">
        <ArrowLeft className="size-4" /> All tools
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge>{CATEGORY_LABELS[tool.category]}</Badge>
        {tool.badge && (
          <span className="rounded-full border border-forge-400/40 bg-forge-400/10 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-forge-400">
            {tool.badge}
          </span>
        )}
      </div>
      <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-paper-50 sm:text-4xl">{tool.name}</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-300">{tool.description}</p>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <p className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{message}</p>
  );
}

function NotFoundTool({ slug }: { slug: string }) {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
        <Flame className="mx-auto size-10 text-brass-400" />
        <h1 className="mt-4 font-serif text-3xl font-bold text-paper-50">Unknown tool</h1>
        <p className="mt-2 text-sm text-ink-300">No tool at <span className="font-mono">/{slug}</span>.</p>
        <Link to="/" className={btnPrimary + " mt-8"}>Back to all tools</Link>
      </main>
      <Footer />
    </div>
  );
}
