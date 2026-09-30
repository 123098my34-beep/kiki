/**
 * L-module utils — file naming, byte sizing, page-range parsing, blob IO.
 * Pure functions; unit-tested in engine.test.ts.
 */

import { PDFDocument } from "@cantoo/pdf-lib";
import { zipSync, type Zippable } from "fflate";

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function baseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

export type ProgressFn = (pct: number, label: string) => void;

/** "1-3, 5, 8-10" → 0-based sorted unique indices, clamped to pageCount */
export function parsePageRanges(spec: string, pageCount: number): number[] {
  const out: number[] = [];
  for (const partRaw of spec.split(/[,\n]/)) {
    const part = partRaw.trim();
    if (!part) continue;
    const m = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) {
      let a = parseInt(m[1], 10);
      let b = parseInt(m[2], 10);
      if (a > b) [a, b] = [b, a];
      for (let p = Math.max(1, a); p <= Math.min(pageCount, b); p++) out.push(p - 1);
    } else if (/^\d+$/.test(part)) {
      const p = parseInt(part, 10);
      if (p >= 1 && p <= pageCount) out.push(p - 1);
    }
  }
  return [...new Set(out)].sort((x, y) => x - y);
}

/** "1-3, 5" → [[0,1,2],[4]] — each comma group kept separate */
export function splitRangeGroups(spec: string, pageCount: number): number[][] {
  const groups: number[][] = [];
  for (const part of spec.split(",")) {
    if (!part.trim()) continue;
    const idx = parsePageRanges(part, pageCount);
    if (idx.length > 0) groups.push(idx);
  }
  return groups;
}

export async function loadPdf(file: File | Blob | ArrayBuffer | Uint8Array): Promise<PDFDocument> {
  if (file instanceof Uint8Array) {
    return PDFDocument.load(file, { ignoreEncryption: true });
  }
  const buf = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  return PDFDocument.load(new Uint8Array(buf), { ignoreEncryption: true });
}

export async function savePdf(doc: PDFDocument): Promise<Uint8Array> {
  return doc.save({ useObjectStreams: true });
}

export function downloadBytes(
  bytes: Uint8Array,
  filename: string,
  mime = "application/pdf"
): void {
  triggerDownload(new Blob([bytes as BlobPart], { type: mime }), filename);
}

export function downloadText(text: string, filename: string): void {
  triggerDownload(new Blob([text], { type: "text/plain;charset=utf-8" }), filename);
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const [head, b64] = dataUrl.split(",");
  const mime = head.match(/data:([^;]+)/)?.[1] ?? "application/octet-stream";
  const bytes = Uint8Array.from(atob(b64 ?? ""), (c) => c.charCodeAt(0));
  downloadBytes(bytes, filename, mime);
}

export async function downloadZip(
  files: Array<{ name: string; bytes: Uint8Array }>,
  zipName: string
): Promise<void> {
  const zipData: Zippable = {};
  for (const f of files) zipData[f.name] = f.bytes;
  const zipped = zipSync(zipData);
  triggerDownload(new Blob([zipped as BlobPart], { type: "application/zip" }), zipName);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function svgToPngDataUrl(svg: string, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width));
      canvas.height = Math.max(1, Math.round(height));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to rasterize SVG"));
    };
    img.src = url;
  });
}
