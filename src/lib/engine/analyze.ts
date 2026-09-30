/**
 * L-module: analysis (read category).
 */

import { PDFDocument, rgb } from "@cantoo/pdf-lib";
import {
  baseName,
  formatBytes,
  loadPdf,
  savePdf,
  type ProgressFn,
} from "./util";
import { openWithPdfjs, renderPageToCanvas, canvasToJpegBytes } from "./raster";
import { PAPER_SIZES } from "./paper";

/* --------------------------------- doc info --------------------------------- */

export interface DocInfo {
  fileName: string;
  fileSize: string;
  pageCount: number;
  title: string;
  author: string;
  subject: string;
  creator: string;
  producer: string;
  creationDate: string;
  modDate: string;
  version: string;
  encrypted: boolean;
  pageSize: string;
  hasAcroForm: boolean;
}

export async function getDocInfo(file: File): Promise<DocInfo> {
  const doc = await loadPdf(file);
  const pages = doc.getPages();
  const first = pages[0]?.getSize();
  const meta = doc.getTitle() ?? "";
  const dims = first
    ? `${first.width.toFixed(0)} × ${first.height.toFixed(0)} pt`
    : "—";
  const iso = (d: Date | undefined): string => {
    if (!d) return "—";
    try {
      return d.toLocaleString();
    } catch {
      return "—";
    }
  };
  return {
    fileName: file.name,
    fileSize: formatBytes(file.size),
    pageCount: doc.getPageCount(),
    title: meta || "—",
    author: doc.getAuthor() ?? "—",
    subject: doc.getSubject() ?? "—",
    creator: doc.getCreator() ?? "—",
    producer: doc.getProducer() ?? "—",
    creationDate: iso(doc.getCreationDate()),
    modDate: iso(doc.getModificationDate()),
    version: (doc.context.header as { toString(): string } | undefined)?.toString() ?? "PDF",
    encrypted: doc.isEncrypted,
    pageSize: dims,
    hasAcroForm: doc.getForm().getFields().length > 0,
  };
}

/* -------------------------------- text export ------------------------------- */

export async function extractText(
  file: File,
  onProgress?: ProgressFn
): Promise<string> {
  const doc = await openWithPdfjs(file);
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    onProgress?.((i / doc.numPages) * 95, `Extracting text ${i}/${doc.numPages}`);
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    let lastY: number | null = null;
    let line = "";
    const lines: string[] = [];
    for (const item of tc.items) {
      if (!("str" in item)) continue;
      const y = Math.round(item.transform[5]);
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        lines.push(line);
        line = "";
      }
      line += item.str;
      lastY = y;
    }
    if (line) lines.push(line);
    parts.push(`──────── Page ${i} ────────\n${lines.join("\n").trim() || "[no text layer]"}`);
  }
  doc.destroy();
  return parts.join("\n\n") + "\n";
}

/* -------------------------------- attachments ------------------------------- */

export interface AttachmentEntry {
  name: string;
  size: number;
}

export async function listAttachments(
  file: File,
  onProgress?: ProgressFn
): Promise<AttachmentEntry[]> {
  onProgress?.(20, "Scanning attachments");
  const doc = await loadPdf(file);
  const att = (doc as unknown as { getAttachments?: () => Record<string, unknown[]> }).getAttachments?.();
  if (!att) return [];
  return Object.keys(att).map((name) => {
    const dataArr = att[name] as ArrayLike<number> | undefined;
    return { name, size: dataArr ? dataArr.length : 0 };
  });
}

export async function extractAttachments(
  file: File,
  onProgress?: ProgressFn
): Promise<Array<{ name: string; bytes: Uint8Array }>> {
  onProgress?.(30, "Extracting attachments");
  const doc = await loadPdf(file);
  const att = (doc as unknown as { getAttachments?: () => Record<string, unknown[]> }).getAttachments?.();
  if (!att) return [];
  return Object.entries(att).map(([name, dataArr]) => ({
    name,
    bytes: new Uint8Array(
      (dataArr as ArrayLike<number> | undefined ?? { length: 0 })
    ),
  }));
}

/* ------------------------------- contact sheet ------------------------------ */

export async function contactSheet(
  file: File,
  perPage: 4 | 9 | 16,
  onProgress?: ProgressFn
): Promise<Uint8Array> {
  const pdfjsDoc = await openWithPdfjs(file);
  const out = await PDFDocument.create();
  const total = pdfjsDoc.numPages;
  const cols = perPage === 4 ? 2 : perPage === 9 ? 3 : 4;
  const rows = perPage / cols;
  const [pw, ph] = PAPER_SIZES.Letter;

  for (let start = 1; start <= total; start += perPage) {
    onProgress?.((start / total) * 90, `Sheet ${Math.ceil(start / perPage)}`);
    const sheet = out.addPage([pw, ph]);
    for (let k = 0; k < perPage && start + k <= total; k++) {
      const pageNo = start + k;
      const page = await pdfjsDoc.getPage(pageNo);
      const base = page.getViewport({ scale: 1 });
      const scale = 220 / Math.max(base.width, base.height);
      const r = await renderPageToCanvas(page, scale);
      const jpg = canvasToJpegBytes(r.canvas, 0.8);
      const img = await out.embedJpg(jpg);
      const cellW = pw / cols;
      const cellH = ph / rows;
      const col = k % cols;
      const row = Math.floor(k / cols);
      const maxW = cellW - 24;
      const maxH = cellH - 34;
      const s = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * s;
      const h = img.height * s;
      const x = col * cellW + (cellW - w) / 2;
      const y = ph - (row + 1) * cellH + (cellH - h) / 2 + 12;
      sheet.drawImage(img, { x, y, width: w, height: h });
      const font = await out.embedFont("Helvetica");
      sheet.drawText(`p. ${pageNo}`, {
        x: col * cellW + 8,
        y: y - 4,
        size: 8,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
      r.canvas.width = 0;
      r.canvas.height = 0;
    }
  }
  pdfjsDoc.destroy();
  return savePdf(out);
}

/* --------------------------------- searching -------------------------------- */

export interface SearchHit {
  page: number;
  excerpt: string;
}

export async function searchText(
  file: File,
  query: string,
  onProgress?: ProgressFn
): Promise<SearchHit[]> {
  const q = query.trim().toLowerCase();
  if (!q) throw new Error("Type a search term.");
  const doc = await openWithPdfjs(file);
  const hits: SearchHit[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    onProgress?.((i / doc.numPages) * 95, `Searching page ${i}/${doc.numPages}`);
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    let text = "";
    for (const item of tc.items) {
      if ("str" in item) text += item.str + " ";
    }
    const lower = text.toLowerCase();
    let pos = lower.indexOf(q);
    while (pos !== -1 && hits.length < 200) {
      hits.push({
        page: i,
        excerpt: text
          .slice(Math.max(0, pos - 60), Math.min(text.length, pos + q.length + 60))
          .replace(/\s+/g, " ")
          .trim(),
      });
      pos = lower.indexOf(q, pos + q.length);
    }
  }
  doc.destroy();
  return hits;
}

/** shared with OCR: page-count via pdf.js without loading pdf-lib twice */
export async function quickPageCount(file: File): Promise<number> {
  try {
    const doc = await loadPdf(file);
    return doc.getPageCount();
  } catch {
    return 0;
  }
}

export { baseName };
