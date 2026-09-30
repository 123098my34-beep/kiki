import { describe, test, expect, mock } from "bun:test";
import { PDFDocument, StandardFonts, rgb } from "@cantoo/pdf-lib";

// pdf.js worker asset URLs are Vite-only; stub the wrapper for node-side tests.
mock.module("../src/lib/pdfjs", () => ({
  default: { GlobalWorkerOptions: { workerSrc: "" } },
}));

const {
  formatBytes,
  parsePageRanges,
  splitRangeGroups,
  baseName,
  loadPdf,
  mergePdfs,
  splitPdf,
  organizePdf,
  rotatePdf,
  deletePages,
  reversePages,
  combineWithInsert,
  extractPages,
  nUp,
  booklet,
  cropPdf,
  addPageNumbers,
  addWatermark,
  addHeaderFooter,
  addText,
  protectPdf,
  hexToRgb,
} = await import("../src/lib/engine");
const { TOOLS, toolBySlug, CATEGORY_ORDER } = await import("../src/lib/tools");
const { PAPER_SIZES } = await import("../src/lib/engine/paper");
const { blankPdf } = await import("../src/lib/runner");

/* --------------------------------- fixtures -------------------------------- */

async function fixturePdf(pages: number): Promise<File> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++) {
    const p = doc.addPage([595.28, 841.89]);
    p.drawText(`Fixture page ${i + 1} of ${pages}`, {
      x: 64, y: 760, size: 18, font, color: rgb(0.1, 0.1, 0.1),
    });
  }
  const bytes = await doc.save();
  return new File([bytes as BlobPart], `fixture-${pages}p.pdf`, { type: "application/pdf" });
}

const noop = () => {};

/* ---------------------------------- util ----------------------------------- */

describe("util", () => {
  test("formatBytes formats buckets", () => {
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.00 MB");
  });

  test("parsePageRanges handles ranges, singles, dedupe, clamping", () => {
    expect(parsePageRanges("1-3, 5", 10)).toEqual([0, 1, 2, 4]);
    expect(parsePageRanges("8-2", 10)).toEqual([1, 2, 3, 4, 5, 6, 7]); // reversed range
    expect(parsePageRanges("9-99", 10)).toEqual([8, 9]); // clamped
    expect(parsePageRanges("abc", 10)).toEqual([]);
  });

  test("splitRangeGroups keeps groups separate", () => {
    expect(splitRangeGroups("1-2, 4", 10)).toEqual([[0, 1], [3]]);
    expect(splitRangeGroups("99", 3)).toEqual([]);
  });

  test("baseName strips extension", () => {
    expect(baseName("report.final.pdf")).toBe("report.final");
  });
});

/* -------------------------------- structure -------------------------------- */

describe("structure ops", () => {
  test("merge 3+2 → 5 pages", async () => {
    const out = await mergePdfs([await fixturePdf(3), await fixturePdf(2)], noop);
    const doc = await loadPdf(out);
    expect(doc.getPageCount()).toBe(5);
  });

  test("split ranges produces grouped files", async () => {
    const parts = await splitPdf(await fixturePdf(6), { kind: "ranges", ranges: "1-3, 4-6" }, noop);
    expect(parts).toHaveLength(2);
    expect((await loadPdf(parts[0].bytes)).getPageCount()).toBe(3);
    expect((await loadPdf(parts[1].bytes)).getPageCount()).toBe(3);
  });

  test("split every-page explodes", async () => {
    const parts = await splitPdf(await fixturePdf(4), { kind: "every" }, noop);
    expect(parts).toHaveLength(4);
  });

  test("split extract gathers selection", async () => {
    const parts = await splitPdf(await fixturePdf(6), { kind: "extract", ranges: "2, 5" }, noop);
    expect(parts).toHaveLength(1);
    expect((await loadPdf(parts[0].bytes)).getPageCount()).toBe(2);
  });

  test("organize reorders, deletes, rotates", async () => {
    const out = await organizePdf(await fixturePdf(4), {
      order: [3, 2, 1, 0],
      remove: new Set([1]),
      rotate: new Set([0]),
    });
    const doc = await loadPdf(out);
    expect(doc.getPageCount()).toBe(3);
    const rot = doc.getPage(0).getRotation().angle;
    expect(rot === 90 || rot === 0).toBe(true); // rotation preserved or applied
  });

  test("rotate sets 180", async () => {
    const doc = await loadPdf(await rotatePdf(await fixturePdf(2), 180, noop));
    expect(doc.getPage(0).getRotation().angle).toBe(180);
  });

  test("delete-pages keeps the rest", async () => {
    const doc = await loadPdf(await deletePages(await fixturePdf(5), "1, 3", noop));
    expect(doc.getPageCount()).toBe(3);
  });

  test("reverse preserves count", async () => {
    const doc = await loadPdf(await reversePages(await fixturePdf(4), noop));
    expect(doc.getPageCount()).toBe(4);
  });

  test("combine-insert lands B inside A", async () => {
    const doc = await loadPdf(await combineWithInsert(await fixturePdf(4), await fixturePdf(2), 2, noop));
    expect(doc.getPageCount()).toBe(6);
  });

  test("extract-pages copies selection", async () => {
    const doc = await loadPdf(await extractPages(await fixturePdf(6), "1-2", noop));
    expect(doc.getPageCount()).toBe(2);
  });

  test("n-up 2 → half the sheets", async () => {
    const doc = await loadPdf(await nUp(await fixturePdf(6), 2, noop));
    expect(doc.getPageCount()).toBe(3);
  });

  test("booklet imposes landscape sheets", async () => {
    const doc = await loadPdf(await booklet(await fixturePdf(4), noop));
    expect(doc.getPageCount()).toBe(2); // 4 pages = 1 fold = 2 landscape sheets
    expect(doc.getPage(0).getSize().width).toBeGreaterThan(700);
  });

  test("crop shrinks the crop box", async () => {
    const doc = await loadPdf(await cropPdf(await fixturePdf(2), 0.1, 0.1, 0.1, 0.1, noop));
    const box = doc.getPage(0).getCropBox();
    expect(box.width).toBeLessThan(550);
  });
});

/* ---------------------------------- stamp ---------------------------------- */

describe("stamp ops", () => {
  test("page numbers stamp without changing count", async () => {
    const doc = await loadPdf(await addPageNumbers(await fixturePdf(3), {
      position: "bottom-center", startAt: 1, fontSize: 11, margin: 28,
      format: "{n} / {total}", skipFirst: false,
    }, noop));
    expect(doc.getPageCount()).toBe(3);
  });

  test("watermark with tiling saves", async () => {
    const doc = await loadPdf(await addWatermark(await fixturePdf(2), {
      text: "QA", fontSize: 48, opacity: 0.2, rotation: 45, color: "gray", tile: true,
    }, noop));
    expect(doc.getPageCount()).toBe(2);
  });

  test("header/footer tokens resolve", async () => {
    const doc = await loadPdf(await addHeaderFooter(await fixturePdf(3), {
      headerLeft: "L", headerCenter: "", headerRight: "",
      footerLeft: "", footerCenter: "{page}/{pages}", footerRight: "{date}",
      fontSize: 9, margin: 24, dynamicDate: true,
    }, noop));
    expect(doc.getPageCount()).toBe(3);
  });

  test("add-text targets page subsets", async () => {
    const doc = await loadPdf(await addText(await fixturePdf(3), {
      text: "X", xPercent: 5, yPercent: 5, fontSize: 12, color: "#000000", bold: false, pages: "1, 3",
    }, noop));
    expect(doc.getPageCount()).toBe(3);
  });

  test("hexToRgb parses colors", () => {
    const c = hexToRgb("#ff0000") as unknown as { red: number; green: number; blue: number };
    expect(c.red).toBeCloseTo(1);
    expect(c.green).toBeCloseTo(0);
  });
});

/* --------------------------------- security --------------------------------- */

describe("security ops", () => {
  test("protect adds /Encrypt dictionary", async () => {
    const bytes = await protectPdf(await fixturePdf(2), {
      userPassword: "u1", ownerPassword: "o1", allowPrinting: true, allowCopying: true,
    }, noop);
    const head = new TextDecoder("latin1").decode(bytes.slice(0, 8192));
    expect(head).toContain("/Encrypt");
  });

  test("blankPdf generates N pages", async () => {
    const doc = await loadPdf(await blankPdf(3, "A4"));
    expect(doc.getPageCount()).toBe(3);
    const size = doc.getPage(0).getSize();
    expect(size.width).toBeCloseTo(PAPER_SIZES.A4[0], 0);
  });
});

/* --------------------------------- registry --------------------------------- */

describe("tool registry integrity", () => {
  test("has 40 tools", () => {
    expect(TOOLS.length).toBe(40);
  });

  test("slugs are unique", () => {
    const slugs = TOOLS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(TOOLS.length);
  });

  test("every tool resolves via toolBySlug", () => {
    for (const t of TOOLS) {
      expect(toolBySlug(t.slug)?.id).toBe(t.id);
    }
  });

  test("categories are valid and ordered", () => {
    for (const t of TOOLS) {
      expect(CATEGORY_ORDER).toContain(t.category);
    }
  });

  test("select fields have options with matching defaults", () => {
    for (const t of TOOLS) {
      for (const f of t.fields) {
        if (f.type === "select") {
          expect(f.options!.length).toBeGreaterThan(0);
          if (f.def) {
            expect(f.options!.some((o) => o.value === String(f.def))).toBe(true);
          }
        }
      }
    }
  });
});
