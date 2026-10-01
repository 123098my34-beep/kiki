/**
 * Runner — the single dispatch point from the UI to the engine.
 * Each entry receives the loaded files and collected option values and returns
 * a typed result the ToolPage knows how to present.
 */

import {
  comparePdfs,
  mergePdfs,
  splitPdf,
  rotatePdf,
  deletePages,
  reversePages,
  combineWithInsert,
  extractPages,
  nUp,
  booklet,
  cropPdf,
  compressPdf,
  pdfToImages,
  pdfToLongImage,
  imagesToPdf,
  textToPdf,
  pdfToGrayscale,
  removeAnnotations,
  addPageNumbers,
  addWatermark,
  addHeaderFooter,
  addText,
  flattenForms,
  protectPdf,
  unlockPdf,
  getDocInfo,
  extractText,
  listAttachments,
  contactSheet,
  searchText,
  signPdf,
  ocrPdf,
  downloadBytes,
  downloadText,
  downloadZip,
  baseName,
  type SplitMode,
} from "./engine";
import { PDFDocument } from "@cantoo/pdf-lib";
import type { ToolDef } from "./tools";

export interface FileResult {
  name: string;
  bytes: Uint8Array;
  mime: string;
}

export type RunResult =
  | { kind: "download"; name: string; bytes: Uint8Array; mime?: string; note?: string }
  | { kind: "zip"; name: string; files: FileResult[] }
  | { kind: "text"; text: string; downloadName: string }
  | { kind: "info"; info: Awaited<ReturnType<typeof getDocInfo>> }
  | { kind: "attachments"; entries: Awaited<ReturnType<typeof listAttachments>> }
  | { kind: "search"; hits: Awaited<ReturnType<typeof searchText>> }
  | { kind: "compare"; result: import("./engine").CompareResult };

export interface RunContext {
  files: File[];
  values: Record<string, string | number | boolean>;
  signatureDataUrl?: string;
  regions?: Array<{ pageIndex: number; x: number; y: number; w: number; h: number }>;
  onProgress: (pct: number, label: string) => void;
}

const S = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
const N = (v: unknown, d = 0): number => (typeof v === "number" ? v : parseFloat(String(v)) || d);
const B = (v: unknown): boolean => v === true || v === "true";

export async function runTool(tool: ToolDef, ctx: RunContext): Promise<RunResult> {
  const { files, values: v, onProgress: p } = ctx;
  const f0 = files[0];
  const f1 = files[1];

  switch (tool.id) {
    /* organize */
    case "merge": {
      const bytes = await mergePdfs(files, p);
      return { kind: "download", name: "merged.pdf", bytes };
    }
    case "split": {
      const mode: SplitMode =
        S(v.mode) === "every" ? { kind: "every" }
        : S(v.mode) === "half" ? { kind: "half" }
        : S(v.mode) === "extract" ? { kind: "extract", ranges: S(v.extract) }
        : { kind: "ranges", ranges: S(v.ranges) };
      const results = await splitPdf(f0!, mode, p);
      if (results.length === 1) return { kind: "download", name: results[0].name, bytes: results[0].bytes };
      return { kind: "zip", name: "split-results.zip", files: results.map((r) => ({ name: r.name, bytes: r.bytes, mime: "application/pdf" })) };
    }
    case "rotate": {
      const bytes = await rotatePdf(f0!, N(v.angle, 90) as 90 | 180 | 270, p);
      return { kind: "download", name: `${baseName(f0!.name)} — rotated.pdf`, bytes };
    }
    case "delete-pages": {
      const bytes = await deletePages(f0!, S(v.ranges), p);
      return { kind: "download", name: `${baseName(f0!.name)} — pages-removed.pdf`, bytes };
    }
    case "reverse": {
      const bytes = await reversePages(f0!, p);
      return { kind: "download", name: `${baseName(f0!.name)} — reversed.pdf`, bytes };
    }
    case "combine-insert": {
      const bytes = await combineWithInsert(f0!, f1!, N(v.insertAt, 1), p);
      return { kind: "download", name: "combined.pdf", bytes };
    }
    case "interleave": {
      const bytes = await interleave(f0!, f1!, B(v.reverseB), p);
      return { kind: "download", name: "interleaved.pdf", bytes };
    }
    case "extract-pages": {
      const bytes = await extractPages(f0!, S(v.ranges), p);
      return { kind: "download", name: `${baseName(f0!.name)} — extracted.pdf`, bytes };
    }
    case "duplicate-pages": {
      const bytes = await duplicatePages(f0!, S(v.ranges), N(v.times, 1), p);
      return { kind: "download", name: `${baseName(f0!.name)} — duplicated.pdf`, bytes };
    }
    case "n-up": {
      const bytes = await nUp(f0!, N(v.per, 2) as 2 | 4, p);
      return { kind: "download", name: `${baseName(f0!.name)} — nup.pdf`, bytes };
    }
    case "booklet": {
      const bytes = await booklet(f0!, p);
      return { kind: "download", name: `${baseName(f0!.name)} — booklet.pdf`, bytes };
    }
    case "resize-a4": {
      const bytes = await resizeToA4(f0!, B(v.landscape), p);
      return { kind: "download", name: `${baseName(f0!.name)} — A4.pdf`, bytes };
    }

    /* optimize */
    case "compress": {
      const scale = S(v.level) === "gentle" ? 0.85 : S(v.level) === "strong" ? 0.45 : 0.65;
      const out = await compressPdf(f0!, { scale, jpegQuality: N(v.quality, 60) / 100 }, p);
      void out;
      return { kind: "download", name: `${baseName(f0!.name)} — compressed.pdf`, bytes: out.bytes };
    }
    case "grayscale": {
      const bytes = await pdfToGrayscale(f0!, p);
      return { kind: "download", name: `${baseName(f0!.name)} — grayscale.pdf`, bytes };
    }
    case "flatten": {
      const bytes = await flattenForms(f0!, p);
      return { kind: "download", name: `${baseName(f0!.name)} — flattened.pdf`, bytes };
    }
    case "remove-annotations": {
      const bytes = await removeAnnotations(f0!, p);
      return { kind: "download", name: `${baseName(f0!.name)} — clean.pdf`, bytes };
    }
    case "pdf-to-jpg":
    case "pdf-to-png": {
      const format = tool.id === "pdf-to-jpg" ? (S(v.format, "jpeg") as "jpeg" | "png") : "png";
      const dpi = N(v.dpi, 144);
      const imgs = await pdfToImages(f0!, format, dpi, p);
      if (imgs.length === 1) return { kind: "download", name: imgs[0].name, bytes: imgs[0].bytes, mime: format === "jpeg" ? "image/jpeg" : "image/png" };
      return { kind: "zip", name: `${baseName(f0!.name)} — images.zip`, files: imgs.map((r) => ({ name: r.name, bytes: r.bytes, mime: format === "jpeg" ? "image/jpeg" : "image/png" })) };
    }

    /* convert */
    case "jpg-to-pdf": {
      const bytes = await imagesToPdf(files, {
        paper: S(v.paper, "A4") as "A4" | "Letter" | "Legal" | "A5" | "fit",
        margin: N(v.margin, 24),
        orientation: S(v.orientation, "auto") as "portrait" | "landscape" | "auto",
      }, p);
      return { kind: "download", name: "images.pdf", bytes };
    }
    case "text-to-pdf": {
      const bytes = await textToPdf(S(v.text), S(v.title, "Untitled"), p);
      return { kind: "download", name: `${S(v.title, "text") || "text"}.pdf`, bytes };
    }
    case "long-image": {
      const img = await pdfToLongImage(f0!, N(v.width, 1000), p);
      return { kind: "download", name: img.name, bytes: img.bytes, mime: "image/png" };
    }
    case "blank-pdf": {
      const bytes = await blankPdf(N(v.pages, 1), S(v.paper, "A4") as "A4" | "Letter" | "Legal" | "A5");
      return { kind: "download", name: `blank-${N(v.pages, 1)}p.pdf`, bytes };
    }

    /* edit */
    case "page-numbers": {
      const bytes = await addPageNumbers(f0!, {
        position: S(v.position, "bottom-center") as never,
        startAt: N(v.startAt, 1),
        fontSize: N(v.fontSize, 11),
        margin: N(v.margin, 28),
        format: S(v.format, "{n} / {total}"),
        skipFirst: B(v.skipFirst),
      }, p);
      return { kind: "download", name: `${baseName(f0!.name)} — numbered.pdf`, bytes };
    }
    case "watermark": {
      const bytes = await addWatermark(f0!, {
        text: S(v.text, "CONFIDENTIAL"),
        fontSize: N(v.fontSize, 72),
        opacity: N(v.opacity, 12) / 100,
        rotation: N(v.rotation, 45),
        color: S(v.color, "gray") as "gray" | "red" | "blue",
        tile: B(v.tile),
      }, p);
      return { kind: "download", name: `${baseName(f0!.name)} — watermarked.pdf`, bytes };
    }
    case "header-footer": {
      const bytes = await addHeaderFooter(f0!, {
        headerLeft: S(v.headerLeft),
        headerCenter: S(v.headerCenter),
        headerRight: S(v.headerRight),
        footerLeft: S(v.footerLeft),
        footerCenter: S(v.footerCenter),
        footerRight: S(v.footerRight),
        fontSize: N(v.fontSize, 9),
        margin: N(v.margin, 24),
        dynamicDate: true,
      }, p);
      return { kind: "download", name: `${baseName(f0!.name)} — headed.pdf`, bytes };
    }
    case "add-text": {
      const bytes = await addText(f0!, {
        text: S(v.text, "APPROVED"),
        xPercent: N(v.xPercent, 10),
        yPercent: N(v.yPercent, 10),
        fontSize: N(v.fontSize, 14),
        color: S(v.color, "#1a1815"),
        bold: B(v.bold),
        pages: S(v.pages, "all"),
      }, p);
      return { kind: "download", name: `${baseName(f0!.name)} — text.pdf`, bytes };
    }
    case "crop": {
      const bytes = await cropPdf(f0!, N(v.top, 5) / 100, N(v.right, 5) / 100, N(v.bottom, 5) / 100, N(v.left, 5) / 100, p);
      return { kind: "download", name: `${baseName(f0!.name)} — cropped.pdf`, bytes };
    }
    case "edit-metadata": {
      const bytes = await editMetadata(f0!, {
        title: S(v.title),
        author: S(v.author),
        subject: S(v.subject),
        creator: S(v.creator),
      }, p);
      return { kind: "download", name: `${baseName(f0!.name)} — metadata.pdf`, bytes };
    }
    case "sign": {
      const bytes = await signPdf(f0!, {
        signatureDataUrl: ctx.signatureDataUrl ?? "",
        pageIndex: N(v.pageIndex, 0),
        xPercent: N(v.xPercent, 55),
        yPercent: N(v.yPercent, 8),
        widthPercent: N(v.widthPercent, 30),
      }, p);
      return { kind: "download", name: `${baseName(f0!.name)} — signed.pdf`, bytes };
    }

    /* secure */
    case "protect": {
      const bytes = await protectPdf(f0!, {
        userPassword: S(v.userPassword),
        ownerPassword: S(v.ownerPassword),
        allowPrinting: B(v.allowPrinting),
        allowCopying: B(v.allowCopying),
      }, p);
      return { kind: "download", name: `${baseName(f0!.name)} — protected.pdf`, bytes };
    }
    case "unlock": {
      const bytes = await unlockPdf(f0!, S(v.password), p);
      return { kind: "download", name: `${baseName(f0!.name)} — unlocked.pdf`, bytes };
    }
    case "redact": {
      const bytes = await redactWithRegions(f0!, ctx.regions ?? [], p);
      return { kind: "download", name: `${baseName(f0!.name)} — redacted.pdf`, bytes };
    }
    case "compare": {
      const result = await comparePdfs(f0!, f1!, p);
      return { kind: "compare", result };
    }

    /* read */
    case "ocr": {
      const { text } = await ocrPdf(f0!, p);
      return { kind: "text", text, downloadName: `${baseName(f0!.name)}.txt` };
    }
    case "pdf-info": {
      const info = await getDocInfo(f0!);
      return { kind: "info", info };
    }
    case "pdf-to-text": {
      const text = await extractText(f0!, p);
      return { kind: "text", text, downloadName: `${baseName(f0!.name)}.txt` };
    }
    case "search": {
      const hits = await searchText(f0!, S(v.query), p);
      return { kind: "search", hits };
    }
    case "attachments": {
      const entries = await listAttachments(f0!, p);
      return { kind: "attachments", entries };
    }
    case "contact-sheet": {
      const bytes = await contactSheet(f0!, N(v.perPage, 9) as 4 | 9 | 16, p);
      return { kind: "download", name: `${baseName(f0!.name)} — contact-sheet.pdf`, bytes };
    }

    default:
      throw new Error(`Tool "${tool.id}" is not wired yet.`);
  }
}

/* --------------------- helpers needing small local impls -------------------- */

async function interleave(a: File, b: File, reverseB: boolean, p?: (pct: number, l: string) => void): Promise<Uint8Array> {
  p?.(10, "Loading documents");
  const { loadPdf, savePdf } = await import("./engine");
  const da = await loadPdf(a);
  const db = await loadPdf(b);
  const out = await PDFDocument.create();
  const aCount = da.getPageCount();
  const bIndices = db.getPageIndices();
  if (reverseB) bIndices.reverse();
  const max = Math.max(aCount, bIndices.length);
  for (let i = 0; i < max; i++) {
    p?.(10 + (i / max) * 80, `Interleaving page pair ${i + 1}/${max}`);
    if (i < aCount) {
      const [pg] = await out.copyPages(da, [i]);
      out.addPage(pg);
    }
    if (i < bIndices.length) {
      const [pg] = await out.copyPages(db, [bIndices[i]]);
      out.addPage(pg);
    }
  }
  p?.(95, "Saving");
  return savePdf(out);
}

async function duplicatePages(file: File, ranges: string, times: number, p?: (pct: number, l: string) => void): Promise<Uint8Array> {
  p?.(10, "Loading document");
  const { loadPdf, savePdf, parsePageRanges } = await import("./engine");
  const doc = await loadPdf(file);
  const idx = parsePageRanges(ranges, doc.getPageCount());
  if (idx.length === 0) throw new Error("No valid pages to duplicate.");
  const out = await PDFDocument.create();
  const all: number[] = [];
  for (let i = 0; i < doc.getPageCount(); i++) {
    all.push(i);
    if (idx.includes(i)) for (let t = 1; t < Math.max(1, times); t++) all.push(i);
  }
  p?.(40, `Duplicating ${idx.length} page(s) ×${times}`);
  const copied = await out.copyPages(doc, all);
  copied.forEach((pg) => out.addPage(pg));
  p?.(95, "Saving");
  return savePdf(out);
}

async function resizeToA4(file: File, landscape: boolean, p?: (pct: number, l: string) => void): Promise<Uint8Array> {
  p?.(10, "Loading document");
  const { loadPdf, savePdf } = await import("./engine");
  const { PAPER_SIZES } = await import("./engine/paper");
  const doc = await loadPdf(file);
  const out = await PDFDocument.create();
  const [pw, ph] = landscape ? [PAPER_SIZES.A4[1], PAPER_SIZES.A4[0]] : PAPER_SIZES.A4;
  const total = doc.getPageCount();
  for (let i = 0; i < total; i++) {
    p?.(10 + (i / total) * 80, `Rescaling page ${i + 1}/${total}`);
    const [emb] = await out.embedPdf(doc, [i]);
    const { width: sw, height: sh } = doc.getPage(i).getSize();
    const s = Math.min((pw - 8) / sw, (ph - 8) / sh);
    const sheet = out.addPage([pw, ph]);
    sheet.drawPage(emb, { x: (pw - sw * s) / 2, y: (ph - sh * s) / 2, width: sw * s, height: sh * s });
  }
  p?.(95, "Saving");
  return savePdf(out);
}

export async function blankPdf(pages: number, paper: "A4" | "Letter" | "Legal" | "A5"): Promise<Uint8Array> {
  const { PAPER_SIZES } = await import("./engine/paper");
  const doc = await PDFDocument.create();
  const [w, h] = PAPER_SIZES[paper];
  for (let i = 0; i < Math.max(1, Math.min(500, pages)); i++) doc.addPage([w, h]);
  return doc.save();
}

async function editMetadata(
  file: File,
  meta: { title: string; author: string; subject: string; creator: string },
  p?: (pct: number, l: string) => void
): Promise<Uint8Array> {
  p?.(20, "Updating metadata");
  const { loadPdf, savePdf } = await import("./engine");
  const doc = await loadPdf(file);
  if (meta.title) doc.setTitle(meta.title);
  if (meta.author) doc.setAuthor(meta.author);
  if (meta.subject) doc.setSubject(meta.subject);
  if (meta.creator) doc.setCreator(meta.creator);
  doc.setModificationDate(new Date());
  p?.(90, "Saving");
  return savePdf(doc);
}

async function redactWithRegions(
  file: File,
  regions: Array<{ pageIndex: number; x: number; y: number; w: number; h: number }>,
  p?: (pct: number, l: string) => void
): Promise<Uint8Array> {
  const { redactPdf } = await import("./engine/security");
  type RedactRegion = import("./engine/security").RedactRegion;
  return redactPdf(file, regions as RedactRegion[], p);
}

export function triggerDownloadResult(r: RunResult): void {
  if (r.kind === "download") downloadBytes(r.bytes, r.name, r.mime ?? "application/pdf");
  else if (r.kind === "zip") downloadZip(r.files.map((f) => ({ name: f.name, bytes: f.bytes })), r.name);
  else if (r.kind === "text") downloadText(r.text, r.downloadName);
}
