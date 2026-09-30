/**
 * L-module: stamping (edit category).
 */

import { StandardFonts, degrees, rgb, type PDFFont, type PDFPage } from "@cantoo/pdf-lib";
import { loadPdf, savePdf, parsePageRanges, type ProgressFn } from "./util";

export interface StampOptions {
  position:
    | "bottom-center"
    | "bottom-right"
    | "bottom-left"
    | "top-center"
    | "top-right"
    | "top-left";
  startAt: number;
  fontSize: number;
  margin: number;
  format: string; // "{n}", "{n} / {total}", "Page {n}", "Page {n} of {total}"
  skipFirst: boolean;
}

export async function addPageNumbers(
  file: File,
  opts: StampOptions,
  onProgress?: ProgressFn
): Promise<Uint8Array> {
  const doc = await loadPdf(file);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const total = pages.length;
  let n = opts.startAt;
  pages.forEach((page, i) => {
    onProgress?.(((i + 1) / total) * 95, `Stamping page ${i + 1}/${total}`);
    if (opts.skipFirst && i === 0) return;
    drawStamped(page, font, formatStamp(opts.format, n, total), {
      anchor: opts.position,
      fontSize: opts.fontSize,
      margin: opts.margin,
      color: rgb(0.35, 0.33, 0.29),
    });
    n += 1;
  });
  onProgress?.(100, "Done");
  return savePdf(doc);
}

function formatStamp(format: string, n: number, total: number): string {
  return format.replace("{total}", String(total)).replace("{n}", String(n));
}

interface AnchorOpts {
  anchor: StampOptions["position"];
  fontSize: number;
  margin: number;
  color: ReturnType<typeof rgb>;
}

function drawStamped(
  page: PDFPage,
  font: PDFFont,
  text: string,
  o: AnchorOpts,
  rotate = 0
): void {
  const { width, height } = page.getSize();
  const tw = font.widthOfTextAtSize(text, o.fontSize);
  let x: number;
  if (o.anchor.endsWith("left")) x = o.margin;
  else if (o.anchor.endsWith("right")) x = width - o.margin - tw;
  else x = (width - tw) / 2;
  const y = o.anchor.startsWith("top") ? height - o.margin - o.fontSize : o.margin;
  const draw = {
    x,
    y,
    size: o.fontSize,
    font,
    color: o.color,
    ...(rotate ? { rotate: degrees(rotate) } : {}),
  };
  page.drawText(text, draw);
}

/* -------------------------------- watermark -------------------------------- */

export interface WatermarkOptions {
  text: string;
  fontSize: number;
  opacity: number;
  rotation: number;
  color: "gray" | "red" | "blue";
  tile: boolean;
}

const WM_COLORS: Record<WatermarkOptions["color"], ReturnType<typeof rgb>> = {
  gray: rgb(0.5, 0.5, 0.5),
  red: rgb(0.8, 0.2, 0.2),
  blue: rgb(0.2, 0.35, 0.8),
};

export async function addWatermark(
  file: File,
  opts: WatermarkOptions,
  onProgress?: ProgressFn
): Promise<Uint8Array> {
  const doc = await loadPdf(file);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const pages = doc.getPages();
  pages.forEach((page, i) => {
    onProgress?.(((i + 1) / pages.length) * 95, `Watermarking page ${i + 1}/${pages.length}`);
    const { width, height } = page.getSize();
    const color = WM_COLORS[opts.color];
    const stamp = (cx: number, cy: number): void => {
      const tw = font.widthOfTextAtSize(opts.text, opts.fontSize);
      page.drawText(opts.text, {
        x: cx - tw / 2,
        y: cy - opts.fontSize / 2,
        size: opts.fontSize,
        font,
        color,
        opacity: opts.opacity,
        rotate: degrees(opts.rotation),
      });
    };
    if (opts.tile) {
      for (let gy = 0; gy < 3; gy++) for (let gx = 0; gx < 3; gx++) stamp(((gx + 0.5) * width) / 3, ((gy + 0.5) * height) / 3);
    } else {
      stamp(width / 2, height / 2);
    }
  });
  onProgress?.(100, "Done");
  return savePdf(doc);
}

/* ------------------------------ header / footer ----------------------------- */

export interface HeaderFooterOptions {
  headerLeft: string;
  headerCenter: string;
  headerRight: string;
  footerLeft: string;
  footerCenter: string;
  footerRight: string;
  fontSize: number;
  margin: number;
  dynamicDate: boolean;
}

export async function addHeaderFooter(
  file: File,
  opts: HeaderFooterOptions,
  onProgress?: ProgressFn
): Promise<Uint8Array> {
  const doc = await loadPdf(file);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const today = new Date().toLocaleDateString();
  pages.forEach((page, i) => {
    onProgress?.(((i + 1) / pages.length) * 95, `Stamping page ${i + 1}/${pages.length}`);
    const { width, height } = page.getSize();
    const ctx = (raw: string): string =>
      raw
        .replace(/{page}/g, String(i + 1))
        .replace(/{pages}/g, String(pages.length))
        .replace(/{date}/g, today);

    const put = (raw: string, where: "top" | "bottom", align: "left" | "center" | "right"): void => {
      const text = ctx(raw);
      if (!text) return;
      const tw = font.widthOfTextAtSize(text, opts.fontSize);
      const x =
        align === "left"
          ? opts.margin
          : align === "right"
            ? width - opts.margin - tw
            : (width - tw) / 2;
      const y = where === "top" ? height - opts.margin - opts.fontSize : opts.margin;
      page.drawText(text, { x, y, size: opts.fontSize, font, color: rgb(0.35, 0.33, 0.29) });
    };

    put(opts.headerLeft, "top", "left");
    put(opts.headerCenter, "top", "center");
    put(opts.headerRight, "top", "right");
    put(opts.footerLeft, "bottom", "left");
    put(opts.footerCenter, "bottom", "center");
    put(opts.footerRight, "bottom", "right");
  });
  onProgress?.(100, "Done");
  return savePdf(doc);
}

/* -------------------------------- add text --------------------------------- */

export interface AddTextOptions {
  text: string;
  xPercent: number; // 0..100
  yPercent: number;
  fontSize: number;
  color: string; // hex
  bold: boolean;
  pages: string; // "all" or range spec
}

export async function addText(
  file: File,
  opts: AddTextOptions,
  onProgress?: ProgressFn
): Promise<Uint8Array> {
  const doc = await loadPdf(file);
  const font = await doc.embedFont(opts.bold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica);
  const pages = doc.getPages();
  const color = hexToRgb(opts.color);
  const targets =
    opts.pages === "all"
      ? pages
      : parsePageRanges(opts.pages, pages.length)
          .map((i) => pages[i])
          .filter(Boolean);

  targets.forEach((page, k) => {
    onProgress?.(((k + 1) / Math.max(1, targets.length)) * 95, `Adding text ${k + 1}/${targets.length}`);
    const { width, height } = page.getSize();
    page.drawText(opts.text, {
      x: (opts.xPercent / 100) * width,
      y: (1 - opts.yPercent / 100) * height,
      size: opts.fontSize,
      font,
      color,
    });
  });
  onProgress?.(100, "Done");
  return savePdf(doc);
}

export function hexToRgb(hex: string): ReturnType<typeof rgb> {
  const m = hex.replace("#", "");
  const n = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m, 16);
  if (Number.isNaN(n)) return rgb(0, 0, 0);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/* ------------------------------- flatten forms ------------------------------ */

export async function flattenForms(file: File, onProgress?: ProgressFn): Promise<Uint8Array> {
  onProgress?.(10, "Loading form fields");
  const doc = await loadPdf(file);
  const fields = doc.getForm().getFields();
  onProgress?.(40, `Flattening ${fields.length} field(s)`);
  doc.getForm().flatten();
  onProgress?.(90, "Saving");
  return savePdf(doc);
}
