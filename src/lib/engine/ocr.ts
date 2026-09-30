/**
 * L-module: OCR via Tesseract.js (WASM). Model fetched once, then offline.
 */

import { baseName, downloadText, type ProgressFn } from "./util";
import { openWithPdfjs, renderPageToCanvas } from "./raster";

let workerPromise: Promise<import("tesseract.js").Worker> | null = null;

async function getWorker(): Promise<import("tesseract.js").Worker> {
  if (!workerPromise) {
    workerPromise = import("tesseract.js").then((T) => T.createWorker("eng"));
  }
  return workerPromise;
}

export interface OcrResult {
  text: string;
  pages: number;
}

export async function ocrPdf(
  file: File,
  onProgress?: ProgressFn
): Promise<OcrResult> {
  const doc = await openWithPdfjs(file);
  const worker = await getWorker();
  const pageTexts: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    onProgress?.((i / doc.numPages) * 90, `Rendering page ${i}/${doc.numPages}`);
    const page = await doc.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(2.5, Math.max(1.5, 1600 / Math.max(base.width, base.height)));
    const r = await renderPageToCanvas(page, scale);

    onProgress?.(((i - 0.5) / doc.numPages) * 90, `Reading page ${i}/${doc.numPages} (OCR)`);
    const { data } = await worker.recognize(r.canvas);
    pageTexts.push(`──────── Page ${i} ────────\n${data.text.trim() || "[no text detected]"}`);

    r.canvas.width = 0;
    r.canvas.height = 0;
  }
  doc.destroy();

  return {
    text:
      `${baseName(file.name)}\n${"=".repeat(baseName(file.name).length + 4)}\n\n` +
      pageTexts.join("\n\n") +
      "\n",
    pages: pageTexts.length,
  };
}

export async function ocrPdfAndDownload(
  file: File,
  onProgress?: ProgressFn
): Promise<string> {
  const { text } = await ocrPdf(file, onProgress);
  downloadText(text, baseName(file.name) + ".txt");
  return text;
}
