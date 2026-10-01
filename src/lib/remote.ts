/**
 * Remote (server-tier) runner — talks to the FastAPI service in api/main.py.
 *
 * Design: split computing (arXiv:2103.04505). The cloud tier is opt-in per
 * operation; the browser engine stays the default. The API stores results as
 * single-use, short-lived sessions (GDPR Art. 5(1)(c) data minimisation) —
 * we fetch the bytes immediately and hand them to the same download path as
 * local results, so the user experience is identical.
 */

import { formatBytes, type DocInfo } from "./engine";

export interface RemoteResult {
  kind: "download" | "zip";
  token: string;
  name: string;
  size?: number;
  before?: number;
  after?: number;
  savedPct?: number;
  count?: number;
  width?: number;
  height?: number;
}

export interface RemoteTextResult {
  kind: "text";
  text: string;
  ocrUsed?: boolean;
}

export interface RemoteInfoResult {
  kind: "info";
  info: Record<string, string | number | boolean>;
}

export interface RemoteSearchResult {
  kind: "search";
  hits: Array<{ page: number; excerpt: string }>;
  total: number;
}

export type RemoteResponse = RemoteResult | RemoteTextResult | RemoteInfoResult | RemoteSearchResult;

export function apiBase(): string {
  const env = (import.meta as unknown as { env?: Record<string, string> }).env ?? {};
  return env.VITE_API_BASE || "http://localhost:8000";
}

export async function checkApi(): Promise<{ ok: boolean; service?: string }> {
  try {
    const r = await fetch(`${apiBase()}/api/health`, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return { ok: false };
    const body = (await r.json()) as { ok: boolean; service: string };
    return { ok: body.ok, service: body.service };
  } catch {
    return { ok: false };
  }
}

async function postForm(
  path: string,
  files: Array<{ key: string; file: File }>,
  values: Record<string, string | number | boolean>
): Promise<RemoteResponse> {
  const fd = new FormData();
  for (const { key, file } of files) fd.append(key, file, file.name);
  for (const [k, v] of Object.entries(values)) {
    if (v === undefined || v === null || v === "") continue;
    fd.append(k, String(v));
  }
  const r = await fetch(`${apiBase()}${path}`, { method: "POST", body: fd });
  if (!r.ok) {
    let detail = `HTTP ${r.status}`;
    try {
      const body = await r.json();
      detail = body.detail ?? detail;
    } catch {
      /* keep default */
    }
    throw new Error(`Cloud tier: ${detail}`);
  }
  return (await r.json()) as RemoteResponse;
}

/** Fetch result bytes immediately — the server session is single-use. */
export async function materializeRemote(resp: RemoteResponse): Promise<RemoteMaterialized> {
  if (resp.kind === "download" || resp.kind === "zip") {
    const r = await fetch(`${apiBase()}/api/result/${resp.token}`);
    if (!r.ok) throw new Error("Cloud result expired before download — try again.");
    const bytes = new Uint8Array(await r.arrayBuffer());
    const mime =
      resp.kind === "zip"
        ? "application/zip"
        : resp.name.endsWith(".png")
          ? "image/png"
          : "application/pdf";
    return {
      kind: "download",
      name: resp.name,
      bytes,
      mime,
      savedPct: resp.savedPct,
      before: resp.before,
      after: resp.after,
    };
  }
  if (resp.kind === "text") return { kind: "text", text: resp.text };
  if (resp.kind === "info") return { kind: "info", info: resp.info };
  if (resp.kind === "search") return { kind: "search", hits: resp.hits, total: resp.total };
  throw new Error("Unsupported cloud response.");
}

/** Map the API's flat info record onto the local DocInfo shape the UI renders. */
export function toDocInfo(info: Record<string, string | number | boolean>): DocInfo {
  const s = (k: string, d = "—"): string => {
    const v = info[k];
    return v === undefined || v === null || v === "" ? d : String(v);
  };
  const bool = (k: string): boolean => info[k] === true || info[k] === "true";
  return {
    fileName: s("fileName", "document.pdf"),
    fileSize: typeof info.fileSize === "number" ? formatBytes(info.fileSize) : s("fileSize"),
    pageCount: Number(info.pageCount ?? 0),
    title: s("title"),
    author: s("author"),
    subject: s("subject"),
    creator: s("creator"),
    producer: s("producer"),
    creationDate: s("creationDate"),
    modDate: s("modDate"),
    version: s("version", "PDF"),
    encrypted: bool("encrypted"),
    pageSize: s("pageSize"),
    hasAcroForm: bool("hasAcroForm"),
  };
}

export type RemoteMaterialized =
  | { kind: "download"; name: string; bytes: Uint8Array; mime: string; savedPct?: number; before?: number; after?: number }
  | { kind: "text"; text: string }
  | { kind: "info"; info: Record<string, string | number | boolean> }
  | { kind: "search"; hits: Array<{ page: number; excerpt: string }>; total: number };

/* --------------------------- per-tool remote calls --------------------------- */

export async function runRemote(
  toolId: string,
  files: File[],
  values: Record<string, string | number | boolean>
): Promise<RemoteMaterialized> {
  const v = values;
  const S = (k: string, d = ""): string => String(v[k] ?? d);
  const N = (k: string, d = 0): number => (typeof v[k] === "number" ? (v[k] as number) : parseFloat(String(v[k] ?? d)) || d);
  const B = (k: string): boolean => v[k] === true || v[k] === "true";

  switch (toolId) {
    case "merge":
      return materializeRemote(
        await postForm("/api/merge", files.map((f) => ({ key: "files", file: f })), {})
      );
    case "rotate":
      return materializeRemote(await postForm("/api/rotate", [f0(files)], { angle: S("angle", "90") }));
    case "delete-pages":
      return materializeRemote(await postForm("/api/delete-pages", [f0(files)], { ranges: S("ranges") }));
    case "reverse":
      return materializeRemote(await postForm("/api/reverse", [f0(files)], {}));
    case "extract-pages":
      return materializeRemote(await postForm("/api/extract-pages", [f0(files)], { ranges: S("ranges") }));
    case "n-up":
      return materializeRemote(await postForm("/api/nup", [f0(files)], { per: S("per", "2") }));
    case "resize-a4":
      return materializeRemote(await postForm("/api/resize-a4", [f0(files)], { landscape: B("landscape") }));
    case "crop":
      return materializeRemote(
        await postForm("/api/crop", [f0(files)], {
          top: N("top", 5) / 100,
          right: N("right", 5) / 100,
          bottom: N("bottom", 5) / 100,
          left: N("left", 5) / 100,
        })
      );
    case "compress":
      return materializeRemote(await postForm("/api/compress", [f0(files)], { level: S("level", "balanced") }));
    case "grayscale":
      return materializeRemote(await postForm("/api/grayscale", [f0(files)], {}));
    case "flatten":
      return materializeRemote(await postForm("/api/flatten-forms", [f0(files)], {}));
    case "remove-annotations":
      return materializeRemote(await postForm("/api/remove-annotations", [f0(files)], {}));
    case "protect":
      return materializeRemote(
        await postForm("/api/protect", [f0(files)], {
          userPassword: S("userPassword"),
          ownerPassword: S("ownerPassword"),
          allowPrinting: B("allowPrinting"),
          allowCopying: B("allowCopying"),
        })
      );
    case "unlock":
      return materializeRemote(await postForm("/api/unlock", [f0(files)], { password: S("password") }));
    case "pdf-to-jpg":
    case "pdf-to-png": {
      const isPng = toolId === "pdf-to-png";
      return materializeRemote(
        await postForm("/api/pdf-to-images", [f0(files)], {
          fmt: isPng ? "png" : "jpeg",
          dpi: N("dpi", 150),
        })
      );
    }
    case "long-image":
      return materializeRemote(await postForm("/api/pdf-to-long-image", [f0(files)], { width: N("width", 1000) }));
    case "jpg-to-pdf":
      return materializeRemote(
        await postForm("/api/images-to-pdf", files.map((f) => ({ key: "files", file: f })), {})
      );
    case "text-to-pdf":
      return materializeRemote(
        await postForm("/api/text-to-pdf", [], { title: S("title"), text: S("text") })
      );
    case "page-numbers":
      return materializeRemote(
        await postForm("/api/page-numbers", [f0(files)], {
          position: S("position", "bottom-center"),
          startAt: N("startAt", 1),
          fontSize: N("fontSize", 11),
          skipFirst: B("skipFirst"),
        })
      );
    case "watermark":
      return materializeRemote(
        await postForm("/api/watermark", [f0(files)], {
          text: S("text", "CONFIDENTIAL"),
          opacity: N("opacity", 12) / 100,
          rotation: N("rotation", 45),
          tile: B("tile"),
        })
      );
    case "header-footer":
      return materializeRemote(await postForm("/api/header-footer", [f0(files)], {}));
    case "pdf-info":
      return materializeRemote(await postForm("/api/pdf-info", [f0(files)], {}));
    case "pdf-to-text":
      return materializeRemote(await postForm("/api/pdf-to-text", [f0(files)], {}));
    case "search":
      return materializeRemote(await postForm("/api/search", [f0(files)], { query: S("query") }));
    case "ocr":
      return materializeRemote(await postForm("/api/ocr", [f0(files)], {}));
    default:
      throw new Error(`Tool "${toolId}" runs locally only — switch to the Local engine.`);
  }
}

function f0(files: File[]): { key: string; file: File } {
  if (!files[0]) throw new Error("No file provided.");
  return { key: "file", file: files[0] };
}
