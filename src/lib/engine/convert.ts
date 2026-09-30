/**
 * L-module: conversions & optimization (optimize + convert categories).
 */

import { PDFDocument, PDFName, StandardFonts, rgb } from "@cantoo/pdf-lib";
import {
  baseName,
  loadPdf,
  savePdf,
  type ProgressFn,
} from "./util";
import {
  openWithPdfjs,
  renderPageToCanvas,
  canvasToJpegBytes,
  canvasToPngBytes,
} from "./raster";
import { PAPER_SIZES, type PaperSize } from "./paper";

/* --------------------------------- compress -------------------------------- */

export interface CompressOptions {
  scale: number;
  jpegQuality: number;
}

export async function compressPdf(
  file: File,
  opts: CompressOptions,
  onProgress?: ProgressFn
): Promise<{ bytes: Uint8Array; before: number; after: number; pages: number }> {
  const before = file.size;
  const doc = await openWithPdfjs(file);
  const out = await PDFDocument.create();
  for (let i = 1; i <= doc.numPages; i++) {
    onProgress?.((i / doc.numPages) * 92, `Recompressing page ${i}/${doc.numPages}`);
    const page = await doc.getPage(i);
    const r = await renderPageToCanvas(page, opts.scale);
    const jpg = canvasToJpegBytes(r.canvas, opts.jpegQuality);
    const img = await out.embedJpg(jpg);
    const ptW = r.width * 0.75; // px at 96dpi → pt
    const ptH = r.height * 0.75;
    const p = out.addPage([ptW, ptH]);
    p.drawImage(img, { x: 0, y: 0, width: ptW, height: ptH });
    r.canvas.width = 0;
    r.canvas.height = 0;
  }
  onProgress?.(96, "Writing document");
  const bytes = await savePdf(out);
  doc.destroy();
  return { bytes, before, after: bytes.byteLength, pages: doc.numPages };
}

/* ------------------------------- PDF → images ------------------------------ */

export interface ImageResult {
  name: string;
  bytes: Uint8Array;
}

export async function pdfToImages(
  file: File,
  format: "jpeg" | "png",
  dpi: number,
  onProgress?: ProgressFn
): Promise<ImageResult[]> {
  const doc = await openWithPdfjs(file);
  const base = baseName(file.name);
  const scale = dpi / 72;
  const out: ImageResult[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    onProgress?.((i / doc.numPages) * 92, `Rendering page ${i}/${doc.numPages}`);
    const page = await doc.getPage(i);
    const r = await renderPageToCanvas(page, scale);
    const bytes =
      format === "jpeg" ? canvasToJpegBytes(r.canvas, 0.92) : canvasToPngBytes(r.canvas);
    out.push({
      name: `${base} — page ${String(i).padStart(3, "0")}.${format === "jpeg" ? "jpg" : "png"}`,
      bytes,
    });
    r.canvas.width = 0;
    r.canvas.height = 0;
  }
  doc.destroy();
  return out;
}

/** one tall PNG of the whole document (top to bottom) */
export async function pdfToLongImage(
  file: File,
  widthPx = 900,
  onProgress?: ProgressFn
): Promise<{ name: string; bytes: Uint8Array; width: number; height: number }> {
  const doc = await openWithPdfjs(file);
  const first = await doc.getPage(1);
  const scale = widthPx / first.getViewport({ scale: 1 }).width;
  const pageCanvases: HTMLCanvasElement[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    onProgress?.((i / doc.numPages) * 70, `Rendering page ${i}/${doc.numPages}`);
    const page = await doc.getPage(i);
    const r = await renderPageToCanvas(page, scale);
    pageCanvases.push(r.canvas);
  }
  const totalH = pageCanvases.reduce((a, c) => a + c.height, 0);
  onProgress?.(80, "Stitching");
  const out = document.createElement("canvas");
  out.width = widthPx;
  out.height = totalH;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, out.width, out.height);
  let y = 0;
  for (const c of pageCanvases) {
    ctx.drawImage(c, 0, y);
    y += c.height;
    c.width = 0;
    c.height = 0;
  }
  const bytes = canvasToPngBytes(out);
  doc.destroy();
  return { name: `${baseName(file.name)} — long.png`, bytes, width: widthPx, height: totalH };
}

/* ------------------------------- images → PDF ------------------------------ */

export interface ImgToPdfOptions {
  paper: PaperSize | "fit";
  margin: number;
  orientation: "portrait" | "landscape" | "auto";
}

export async function imagesToPdf(
  files: File[],
  opts: ImgToPdfOptions,
  onProgress?: ProgressFn
): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (let i = 0; i < files.length; i++) {
    onProgress?.((i / files.length) * 90, `Placing ${files[i].name}`);
    const f = files[i];
    const bytes = new Uint8Array(await f.arrayBuffer());
    let img;
    try {
      if (f.type === "image/png") img = await out.embedPng(bytes);
      else if (f.type === "image/jpeg") img = await out.embedJpg(bytes);
      else throw new Error("transcode");
    } catch {
      const bmp = await createImageBitmap(f);
      const c = document.createElement("canvas");
      c.width = bmp.width;
      c.height = bmp.height;
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      ctx.drawImage(bmp, 0, 0);
      bmp.close();
      const jpg = canvasToJpegBytes(c, 0.92);
      img = await out.embedJpg(jpg);
      c.width = 0;
      c.height = 0;
    }
    const iw = img.width;
    const ih = img.height;
    let pageW: number;
    let pageH: number;
    if (opts.paper === "fit") {
      pageW = iw * 0.75;
      pageH = ih * 0.75;
    } else {
      const [pw, ph] = PAPER_SIZES[opts.paper];
      const landscape = opts.orientation === "landscape" || (opts.orientation === "auto" && iw > ih);
      pageW = landscape ? ph : pw;
      pageH = landscape ? pw : ph;
    }
    const page = out.addPage([pageW, pageH]);
    const maxW = pageW - opts.margin * 2;
    const maxH = pageH - opts.margin * 2;
    const s = Math.min(maxW / iw, maxH / ih, 4);
    const w = iw * s;
    const h = ih * s;
    page.drawImage(img, { x: (pageW - w) / 2, y: (pageH - h) / 2, width: w, height: h });
  }
  onProgress?.(96, "Writing document");
  return savePdf(out);
}

/* -------------------------------- text → PDF ------------------------------- */

export async function textToPdf(
  text: string,
  title: string,
  onProgress?: ProgressFn
): Promise<Uint8Array> {
  onProgress?.(10, "Typesetting");
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Courier);
  const size = 11;
  const leading = 15.5;
  const [pw, ph] = PAPER_SIZES.A4;
  const marginX = 56;
  const marginY = 64;
  const maxChars = Math.floor((pw - marginX * 2) / (size * 0.6));
  const linesPerPage = Math.floor((ph - marginY * 2) / leading);

  const rawLines = text.replace(/\r\n/g, "\n").split("\n");
  const lines: string[] = [];
  for (const rl of rawLines) {
    if (rl.length <= maxChars) {
      lines.push(rl);
      continue;
    }
    for (let i = 0; i < rl.length; i += maxChars) lines.push(rl.slice(i, i + maxChars));
  }

  const pages = Math.max(1, Math.ceil(lines.length / linesPerPage));
  for (let pIdx = 0; pIdx < pages; pIdx++) {
    const page = doc.addPage([pw, ph]);
    if (pIdx === 0 && title) {
      page.drawText(title.slice(0, maxChars), {
        x: marginX,
        y: ph - marginY,
        size: 16,
        font: await doc.embedFont(StandardFonts.HelveticaBold),
        color: rgb(0.1, 0.1, 0.1),
      });
    }
    const start = pIdx * linesPerPage - (pIdx === 0 ? 2 : 0);
    const slice = lines.slice(Math.max(0, start), start + linesPerPage);
    slice.forEach((ln, j) => {
      page.drawText(ln, {
        x: marginX,
        y: ph - marginY - (j + (pIdx === 0 ? 3 : 0)) * leading,
        size,
        font,
        color: rgb(0.15, 0.15, 0.15),
      });
    });
  }
  onProgress?.(90, "Saving");
  return savePdf(doc);
}

/* --------------------------- remove annotations ---------------------------- */

export async function removeAnnotations(
  file: File,
  onProgress?: ProgressFn
): Promise<Uint8Array> {
  onProgress?.(10, "Loading document");
  const doc = await loadPdf(file);
  let removed = 0;
  for (const page of doc.getPages()) {
    const annots = page.node.Annots();
    if (annots) {
      removed += annots.size();
      page.node.delete(PDFName.of("Annots"));
    }
  }
  onProgress?.(60, `Removed ${removed} annotation object${removed === 1 ? "" : "s"}`);
  return savePdf(doc);
}

/* ------------------------------ PDF → grayscale ----------------------------- */

export async function pdfToGrayscale(
  file: File,
  onProgress?: ProgressFn
): Promise<Uint8Array> {
  const doc = await openWithPdfjs(file);
  const out = await PDFDocument.create();
  for (let i = 1; i <= doc.numPages; i++) {
    onProgress?.((i / doc.numPages) * 92, `Desaturating page ${i}/${doc.numPages}`);
    const page = await doc.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(2, Math.max(1, 1200 / Math.max(base.width, base.height)));
    const r = await renderPageToCanvas(page, scale, true);
    const jpg = canvasToJpegBytes(r.canvas, 0.85);
    const img = await out.embedJpg(jpg);
    const ptW = r.width * 0.75;
    const ptH = r.height * 0.75;
    const p = out.addPage([ptW, ptH]);
    p.drawImage(img, { x: 0, y: 0, width: ptW, height: ptH });
    r.canvas.width = 0;
    r.canvas.height = 0;
  }
  onProgress?.(96, "Saving");
  doc.destroy();
  return savePdf(out);
}
