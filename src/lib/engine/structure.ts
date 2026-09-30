/**
 * L-module: structural operations (organize category).
 * All operate on pdf-lib documents; raster-free.
 */

import { degrees, PDFDocument } from "@cantoo/pdf-lib";
import {
  loadPdf,
  parsePageRanges,
  savePdf,
  splitRangeGroups,
  baseName,
  type ProgressFn,
} from "./util";

export interface MergeOptions {
  order?: number[];
}

export async function mergePdfs(
  files: File[],
  onProgress?: ProgressFn
): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  const ordered = files;
  for (let i = 0; i < ordered.length; i++) {
    onProgress?.((i / ordered.length) * 90, `Merging ${i + 1}/${ordered.length}: ${ordered[i].name}`);
    const src = await loadPdf(ordered[i]);
    const copied = await out.copyPages(src, src.getPageIndices());
    copied.forEach((p) => out.addPage(p));
  }
  onProgress?.(96, "Writing document");
  return savePdf(out);
}

export type SplitMode =
  | { kind: "every" }
  | { kind: "ranges"; ranges: string }
  | { kind: "extract"; ranges: string }
  | { kind: "half" };

export interface SplitResult {
  name: string;
  bytes: Uint8Array;
}

export async function splitPdf(
  file: File,
  mode: SplitMode,
  onProgress?: ProgressFn
): Promise<SplitResult[]> {
  const src = await loadPdf(file);
  const total = src.getPageCount();
  const base = baseName(file.name);
  const results: SplitResult[] = [];

  const make = async (indices: number[], label: string): Promise<void> => {
    const doc = await PDFDocument.create();
    const copied = await doc.copyPages(src, indices);
    copied.forEach((p) => doc.addPage(p));
    results.push({ name: `${base} — ${label}.pdf`, bytes: await savePdf(doc) });
  };

  if (mode.kind === "every") {
    for (let i = 0; i < total; i++) {
      onProgress?.((i / total) * 90, `Extracting page ${i + 1}/${total}`);
      await make([i], `page ${String(i + 1).padStart(3, "0")}`);
    }
  } else if (mode.kind === "ranges") {
    const groups = splitRangeGroups(mode.ranges, total);
    if (groups.length === 0) throw new Error("No valid page ranges given.");
    for (let g = 0; g < groups.length; g++) {
      onProgress?.((g / groups.length) * 90, `Building file ${g + 1}/${groups.length}`);
      await make(groups[g], `pages ${mode.ranges.split(",")[g]?.trim().replace(/\s+/g, "")}`);
    }
  } else if (mode.kind === "extract") {
    const idx = parsePageRanges(mode.ranges, total);
    if (idx.length === 0) throw new Error("No valid pages in range.");
    onProgress?.(40, "Extracting pages");
    await make(idx, `extract (${idx.length} pages)`);
  } else {
    onProgress?.(20, "Splitting in half");
    const mid = Math.ceil(total / 2);
    await make(Array.from({ length: mid }, (_, i) => i), "part 1");
    await make(Array.from({ length: total - mid }, (_, i) => mid + i), "part 2");
  }
  onProgress?.(100, "Done");
  return results;
}

export interface OrganizeOp {
  order: number[];
  remove: Set<number>;
  rotate: Set<number>;
}

export async function organizePdf(file: File, op: OrganizeOp): Promise<Uint8Array> {
  const src = await loadPdf(file);
  const out = await PDFDocument.create();
  for (const idx of op.order) {
    if (op.remove.has(idx)) continue;
    const [page] = await out.copyPages(src, [idx]);
    if (op.rotate.has(idx)) {
      page.setRotation(degrees((page.getRotation().angle + 90) % 360));
    }
    out.addPage(page);
  }
  return savePdf(out);
}

/** rotate whole file; dir = 90 | 180 | 270 (clockwise) */
export async function rotatePdf(
  file: File,
  angle: 90 | 180 | 270,
  onProgress?: ProgressFn
): Promise<Uint8Array> {
  onProgress?.(10, "Loading document");
  const doc = await loadPdf(file);
  doc.getPages().forEach((p) => {
    p.setRotation(degrees((p.getRotation().angle + angle) % 360));
  });
  onProgress?.(90, "Saving");
  return savePdf(doc);
}

export async function deletePages(
  file: File,
  ranges: string,
  onProgress?: ProgressFn
): Promise<Uint8Array> {
  const doc = await loadPdf(file);
  const total = doc.getPageCount();
  const kill = new Set(parsePageRanges(ranges, total));
  if (kill.size === 0) throw new Error("No valid pages to delete.");
  if (kill.size >= total) throw new Error("Cannot delete every page.");
  const keep = Array.from({ length: total }, (_, i) => i).filter((i) => !kill.has(i));
  onProgress?.(30, "Removing pages");
  const out = await PDFDocument.create();
  const copied = await out.copyPages(doc, keep);
  copied.forEach((p) => out.addPage(p));
  onProgress?.(90, "Saving");
  return savePdf(out);
}

export async function reversePages(file: File, onProgress?: ProgressFn): Promise<Uint8Array> {
  onProgress?.(10, "Loading document");
  const doc = await loadPdf(file);
  const total = doc.getPageCount();
  const out = await PDFDocument.create();
  const copied = await out.copyPages(
    doc,
    Array.from({ length: total }, (_, i) => total - 1 - i)
  );
  copied.forEach((p) => out.addPage(p));
  onProgress?.(90, "Saving");
  return savePdf(out);
}

/** result.pdf = A pages + B pages at insertion point (1-based, default end) */
export async function combineWithInsert(
  fileA: File,
  fileB: File,
  insertAt: number,
  onProgress?: ProgressFn
): Promise<Uint8Array> {
  onProgress?.(10, "Loading A");
  const a = await loadPdf(fileA);
  const b = await loadPdf(fileB);
  const aCount = a.getPageCount();
  const at = Math.max(1, Math.min(insertAt, aCount + 1)) - 1;
  onProgress?.(40, "Copying pages");
  const bPages = await a.copyPages(b, b.getPageIndices());
  for (let i = 0; i < bPages.length; i++) {
    a.insertPage(at + i, bPages[i]);
  }
  onProgress?.(90, "Saving");
  return savePdf(a);
}

export async function extractPages(
  file: File,
  ranges: string,
  onProgress?: ProgressFn
): Promise<Uint8Array> {
  const doc = await loadPdf(file);
  const idx = parsePageRanges(ranges, doc.getPageCount());
  if (idx.length === 0) throw new Error("No valid pages in range.");
  onProgress?.(40, "Copying selection");
  const out = await PDFDocument.create();
  const copied = await out.copyPages(doc, idx);
  copied.forEach((p) => out.addPage(p));
  onProgress?.(90, "Saving");
  return savePdf(out);
}

/** n-up: place n pages per sheet (2 or 4). */
export async function nUp(
  file: File,
  per: 2 | 4,
  onProgress?: ProgressFn
): Promise<Uint8Array> {
  onProgress?.(10, "Loading document");
  const src = await loadPdf(file);
  const out = await PDFDocument.create();
  const cols = per === 2 ? 1 : 2;
  const rows = per === 2 ? 2 : 2;
  const [pw, ph] = [595.28, 841.89]; // A4 sheets
  const cellW = pw / cols;
  const cellH = ph / rows;
  const total = src.getPageCount();

  for (let start = 0; start < total; start += per) {
    onProgress?.((start / total) * 90, `Sheet ${Math.floor(start / per) + 1}`);
    const sheet = out.addPage([pw, ph]);
    for (let k = 0; k < per; k++) {
      const pageIdx = start + k;
      if (pageIdx >= total) break;
      const [emb] = await out.embedPdf(src, [pageIdx]);
      const srcPage = src.getPage(pageIdx);
      const { width: sw, height: sh } = srcPage.getSize();
      const s = Math.min((cellW - 12) / sw, (cellH - 12) / sh);
      const w = sw * s;
      const h = sh * s;
      const col = k % cols;
      const row = Math.floor(k / cols);
      sheet.drawPage(emb, {
        x: col * cellW + (cellW - w) / 2,
        y: ph - (row + 1) * cellH + (cellH - h) / 2,
        width: w,
        height: h,
      });
    }
  }
  onProgress?.(95, "Saving");
  return savePdf(out);
}

/** booklet imposition: 2 pages per landscape sheet in printer fold order. */
export async function booklet(
  file: File,
  onProgress?: ProgressFn
): Promise<Uint8Array> {
  onProgress?.(5, "Loading document");
  const src = await loadPdf(file);
  const total = src.getPageCount();
  // pad to multiple of 4 with blanks; each fold = 4 pages = 2 sheets
  const padded = Math.ceil(total / 4) * 4;
  const out = await PDFDocument.create();
  const [lw, lh] = [841.89, 595.28]; // landscape A4
  // front/back sheet pairs: [outer-last, outer-first], [inner-first, inner-last]...
  const sheetPairs: Array<[number, number]> = [];
  for (let f = 0; f < padded / 4; f++) {
    sheetPairs.push([padded - 1 - f * 2, f * 2]);
    sheetPairs.push([f * 2 + 1, padded - 2 - f * 2]);
  }
  for (let s = 0; s < sheetPairs.length; s++) {
    onProgress?.((s / sheetPairs.length) * 90, `Imposing sheet ${s + 1}/${sheetPairs.length}`);
    const sheet = out.addPage([lw, lh]);
    const pair = sheetPairs[s];
    for (let k = 0; k < 2; k++) {
      const pg = pair[k];
      if (pg >= total) continue; // padding page
      const [emb] = await out.embedPdf(src, [pg]);
      const { width: sw, height: sh } = src.getPage(pg).getSize();
      const scale = Math.min((lh - 16) / sh, (lw / 2 - 16) / sw);
      const w = sw * scale;
      const h = sh * scale;
      sheet.drawPage(emb, {
        x: k === 0 ? lw / 2 - w / 2 : lw - w / 2 - w / 2,
        y: (lh - h) / 2,
        width: w,
        height: h,
      });
    }
  }
  onProgress?.(95, "Saving");
  return savePdf(out);
}

/** crop margins by ratio (0..0.4) on each page */
export async function cropPdf(
  file: File,
  top: number,
  right: number,
  bottom: number,
  left: number,
  onProgress?: ProgressFn
): Promise<Uint8Array> {
  onProgress?.(10, "Loading document");
  const doc = await loadPdf(file);
  doc.getPages().forEach((p) => {
    const { width, height } = p.getSize();
    const x = left * width;
    const y = bottom * height;
    p.setCropBox(x, y, Math.max(10, width - x - right * width), Math.max(10, height - y - top * height));
  });
  onProgress?.(90, "Saving");
  return savePdf(doc);
}
