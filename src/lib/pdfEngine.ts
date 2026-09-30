/**
 * Compatibility facade — implementation lives in src/lib/engine/*.
 * New code should import from "./engine" directly.
 */

export {
  formatBytes,
  downloadBytes,
  downloadText,
  downloadZip,
  parsePageRanges,
  loadPdf,
  mergePdfs,
  splitPdf,
  organizePdf,
  compressPdf,
  imagesToPdf,
  pdfToImages as pdfToJpg,
  addPageNumbers,
  addWatermark,
  ocrPdf,
  renderThumbs as renderThumbnails,
} from "./engine";

export type { SplitMode, SplitResult } from "./engine";

import type { PageThumb } from "./engine/raster";
export type { PageThumb };
