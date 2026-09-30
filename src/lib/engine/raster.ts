/**
 * L-module: raster helpers built on pdf.js. All canvas work is local.
 */

import pdfjsLib from "../pdfjs";
import { loadPdf } from "./util";
import type { PDFDocument } from "@cantoo/pdf-lib";

export interface RenderedPage {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export async function openWithPdfjs(
  file: File | Blob | ArrayBuffer
): Promise<import("pdfjs-dist").PDFDocumentProxy> {
  let data: Uint8Array;
  if (file instanceof ArrayBuffer) data = new Uint8Array(file);
  else data = new Uint8Array(await file.arrayBuffer());
  return pdfjsLib.getDocument({ data }).promise;
}

export async function renderPageToCanvas(
  page: import("pdfjs-dist").PDFPageProxy,
  scale: number,
  grayscale = false
): Promise<RenderedPage> {
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  if (grayscale) toGrayscale(canvas);
  return { canvas, width: canvas.width, height: canvas.height };
}

export function toGrayscale(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = d[i + 1] = d[i + 2] = g;
  }
  ctx.putImageData(img, 0, 0);
}

export function canvasToJpegBytes(canvas: HTMLCanvasElement, quality: number): Uint8Array {
  const url = canvas.toDataURL("image/jpeg", quality);
  return Uint8Array.from(atob(url.split(",")[1] ?? ""), (c) => c.charCodeAt(0));
}

export function canvasToPngBytes(canvas: HTMLCanvasElement): Uint8Array {
  const url = canvas.toDataURL("image/png");
  return Uint8Array.from(atob(url.split(",")[1] ?? ""), (c) => c.charCodeAt(0));
}

/** Count embedded images (XObjects) per page via pdf-lib for stats. */
export async function countImages(doc: PDFDocument): Promise<number> {
  let count = 0;
  const pages = doc.getPages();
  for (const p of pages) {
    const resources = p.node.Resources?.();
    const xobjs = resources?.lookup(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      p.node.context.obj("XObject") as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;
    if (xobjs) {
      for (const [, ref] of xobjs.entries()) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const xo = p.node.context.lookup(ref) as any;
        if (xo?.Subtype?.name === "Image") count++;
      }
    }
  }
  return count;
}

export interface PageThumb {
  index: number;
  dataUrl: string;
  width: number;
  height: number;
}

export async function renderThumbs(
  file: File,
  maxPages = 60,
  onProgress?: (pct: number, label: string) => void
): Promise<PageThumb[]> {
  const doc = await openWithPdfjs(file);
  const thumbs: PageThumb[] = [];
  const count = Math.min(doc.numPages, maxPages);
  for (let i = 1; i <= count; i++) {
    onProgress?.((i / count) * 100, `Thumbnail ${i}/${count}`);
    const page = await doc.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const scale = 150 / Math.max(base.width, base.height);
    const r = await renderPageToCanvas(page, scale);
    thumbs.push({
      index: i - 1,
      dataUrl: r.canvas.toDataURL("image/jpeg", 0.75),
      width: r.width,
      height: r.height,
    });
    r.canvas.width = 0;
    r.canvas.height = 0;
  }
  doc.destroy();
  return thumbs;
}
