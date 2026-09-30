/**
 * L-module: security & integrity.
 * Encryption via @cantoo/pdf-lib (user/owner password, AES/RC4 per build).
 */

import { PDFDocument, degrees, rgb, StandardFonts } from "@cantoo/pdf-lib";
import { loadPdf, savePdf, parsePageRanges, baseName, type ProgressFn } from "./util";
import { openWithPdfjs, renderPageToCanvas, canvasToJpegBytes, toGrayscale } from "./raster";

export interface ProtectOptions {
  userPassword: string;
  ownerPassword: string;
  /** permission bits for @cantoo/pdf-lib encrypt() */
  allowPrinting?: boolean;
  allowCopying?: boolean;
}

export async function protectPdf(
  file: File,
  opts: ProtectOptions,
  onProgress?: ProgressFn
): Promise<Uint8Array> {
  if (!opts.userPassword && !opts.ownerPassword) {
    throw new Error("Provide a password.");
  }
  onProgress?.(20, "Encrypting (AES-256)");
  const doc = await loadPdf(file);
  doc.encrypt({
    userPassword: opts.userPassword || undefined,
    ownerPassword: opts.ownerPassword || opts.userPassword,
    permissions: {
      printing: opts.allowPrinting === false ? undefined : "highResolution",
      copying: opts.allowCopying !== false,
    },
  });
  onProgress?.(80, "Writing encrypted document");
  return doc.save({ useObjectStreams: false });
}

export async function unlockPdf(
  file: File,
  password: string,
  onProgress?: ProgressFn
): Promise<Uint8Array> {
  onProgress?.(15, "Opening encrypted document");
  const buf = new Uint8Array(await file.arrayBuffer());
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(buf, {
      ignoreEncryption: true,
      password: password || undefined,
    });
  } catch {
    throw new Error("Wrong password or unsupported encryption. Check the password and try again.");
  }
  onProgress?.(60, "Re-saving without encryption");
  return savePdf(doc);
}

export async function isEncrypted(file: File): Promise<boolean> {
  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
    return doc.isEncrypted;
  } catch {
    return false;
  }
}

/* --------------------------------- redaction -------------------------------- */

export interface RedactRegion {
  pageIndex: number; // 0-based
  x: number; // 0..1 relative
  y: number; // 0..1 from top
  w: number; // 0..1
  h: number;
}

export async function redactPdf(
  file: File,
  regions: RedactRegion[],
  onProgress?: ProgressFn
): Promise<Uint8Array> {
  if (regions.length === 0) throw new Error("Draw at least one redaction box.");
  onProgress?.(10, "Rendering pages");
  const doc = await loadPdf(file);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const pages = doc.getPages();
  for (const r of regions) {
    const page = pages[r.pageIndex];
    if (!page) continue;
    const { width, height } = page.getSize();
    page.drawRectangle({
      x: r.x * width,
      y: height - (r.y + r.h) * height,
      width: r.w * width,
      height: r.h * height,
      color: rgb(0, 0, 0),
    });
    const label = "REDACTED";
    const size = Math.min(9, Math.max(6, r.h * height * 0.18));
    const tw = font.widthOfTextAtSize(label, size);
    if (r.w * width > tw) {
      page.drawText(label, {
        x: r.x * width + ((r.w * width - tw) / 2),
        y: height - (r.y + r.h / 2) * height - size / 2,
        size,
        font,
        color: rgb(1, 1, 1),
      });
    }
  }
  onProgress?.(70, "Rasterizing redacted pages");
  // Rasterize affected pages so text underneath is truly gone.
  const pdfjs = await openWithPdfjs(file);
  for (const pageIndex of [...new Set(regions.map((r) => r.pageIndex))].sort((a, b) => a - b)) {
    const page = await pdfjs.getPage(pageIndex + 1);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(2, Math.max(1.2, 1400 / Math.max(base.width, base.height)));
    const rendered = await renderPageToCanvas(page, scale);
    const jpg = canvasToJpegBytes(rendered.canvas, 0.9);
    const img = await outEmbedJpg(doc, jpg);
    const { width: rw, height: rh } = rendered.canvas;
    const ptW = rw * 0.75;
    const ptH = rh * 0.75;
    const original = pages[pageIndex];
    original.setSize(ptW, ptH);
    original.drawImage(img, { x: 0, y: 0, width: ptW, height: ptH });
    rendered.canvas.width = 0;
    rendered.canvas.height = 0;
  }
  pdfjs.destroy();
  onProgress?.(100, "Done");
  return savePdf(doc);
}

async function outEmbedJpg(doc: PDFDocument, jpg: Uint8Array) {
  return doc.embedJpg(jpg);
}

/* ------------------------------- compare docs ------------------------------- */

export interface CompareResult {
  a: File;
  b: File;
  aPages: number;
  bPages: number;
  pairs: Array<{
    index: number;
    dataUrlA: string;
    dataUrlB: string;
    diffPct: number;
  }>;
  verdict: "identical" | "different" | "different-lengths";
}

export async function comparePdfs(
  a: File,
  b: File,
  onProgress?: ProgressFn
): Promise<CompareResult> {
  onProgress?.(5, "Opening documents");
  const [docA, docB] = await Promise.all([openWithPdfjs(a), openWithPdfjs(b)]);
  const n = Math.min(docA.numPages, docB.numPages);
  const pairs: CompareResult["pairs"] = [];
  for (let i = 1; i <= n; i++) {
    onProgress?.((i / n) * 90, `Comparing page ${i}/${n}`);
    const [pa, pb] = [await docA.getPage(i), await docB.getPage(i)];
    const base = pa.getViewport({ scale: 1 });
    const scale = 110 / Math.max(base.width, base.height);
    const [ra, rb] = [
      await renderPageToCanvas(pa, scale, true),
      await renderPageToCanvas(pb, scale, true),
    ];
    const pct = pixelDiffPct(ra.canvas, rb.canvas);
    pairs.push({
      index: i - 1,
      dataUrlA: ra.canvas.toDataURL("image/jpeg", 0.7),
      dataUrlB: rb.canvas.toDataURL("image/jpeg", 0.7),
      diffPct: pct,
    });
    ra.canvas.width = 0;
    rb.canvas.width = 0;
  }
  docA.destroy();
  docB.destroy();
  const verdict: CompareResult["verdict"] =
    docA.numPages !== docB.numPages
      ? "different-lengths"
      : pairs.every((p) => p.diffPct < 0.5)
        ? "identical"
        : "different";
  return { a, b, aPages: docA.numPages, bPages: docB.numPages, pairs, verdict };
}

function pixelDiffPct(
  ca: HTMLCanvasElement,
  cb: HTMLCanvasElement
): number {
  if (ca.width !== cb.width || ca.height !== cb.height) return 100;
  const xa = ca.getContext("2d")?.getImageData(0, 0, ca.width, ca.height);
  const xb = cb.getContext("2d")?.getImageData(0, 0, cb.width, cb.height);
  if (!xa || !xb) return 100;
  let diff = 0;
  const total = xa.data.length / 4;
  for (let i = 0; i < xa.data.length; i += 4) {
    if (Math.abs(xa.data[i] - xb.data[i]) > 24) diff++;
  }
  return (diff / total) * 100;
}

/** grayscale helper re-export so tests can hit it without pdf.js */
export { toGrayscale, degrees, baseName };
