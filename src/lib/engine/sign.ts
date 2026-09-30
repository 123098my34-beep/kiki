/**
 * L-module: e-signature. The user draws on a canvas; the ink is exported as a
 * transparent PNG and stamped onto the chosen page — all local.
 */

import { loadPdf, savePdf, type ProgressFn } from "./util";

export interface SignOptions {
  /** data URL of transparent PNG from the signature pad */
  signatureDataUrl: string;
  pageIndex: number; // 0-based
  xPercent: number; // 0..100 (left edge of signature)
  yPercent: number; // 0..100 (bottom edge of signature, from bottom)
  widthPercent: number; // 0..100 of page width
}

export async function signPdf(
  file: File,
  opts: SignOptions,
  onProgress?: ProgressFn
): Promise<Uint8Array> {
  if (!opts.signatureDataUrl) throw new Error("Draw a signature first.");
  onProgress?.(20, "Embedding signature");
  const doc = await loadPdf(file);
  const pngB64 = opts.signatureDataUrl.split(",")[1] ?? "";
  const pngBytes = Uint8Array.from(atob(pngB64), (c) => c.charCodeAt(0));
  const img = await doc.embedPng(pngBytes);
  const pages = doc.getPages();
  const page = pages[opts.pageIndex];
  if (!page) throw new Error("Page not found.");
  const { width, height } = page.getSize();
  const w = (opts.widthPercent / 100) * width;
  const h = w * (img.height / img.width);
  page.drawImage(img, {
    x: (opts.xPercent / 100) * width,
    y: (opts.yPercent / 100) * height,
    width: w,
    height: h,
  });
  onProgress?.(90, "Saving");
  return savePdf(doc);
}

/** consume a drawing canvas and return a trimmed transparent PNG data URL */
export function signatureCanvasToDataUrl(
  canvas: HTMLCanvasElement
): string {
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas.toDataURL("image/png");
  const { width, height } = canvas;
  const img = ctx.getImageData(0, 0, width, height);
  let minX = width, minY = height, maxX = 0, maxY = 0, hasInk = false;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = img.data[(y * width + x) * 4 + 3];
      if (a > 10) {
        hasInk = true;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!hasInk) return canvas.toDataURL("image/png");
  const pad = 6;
  const w = Math.min(width, maxX - minX + pad * 2);
  const h = Math.min(height, maxY - minY + pad * 2);
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const octx = out.getContext("2d");
  if (!octx) return canvas.toDataURL("image/png");
  octx.drawImage(canvas, Math.max(0, minX - pad), Math.max(0, minY - pad), w, h, 0, 0, w, h);
  return out.toDataURL("image/png");
}
