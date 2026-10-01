/**
 * Central tool registry — 40 tools, schema-driven.
 * Each tool declares its inputs and an option schema; ToolPage renders the form
 * generically and calls the runner in lib/runner.ts with collected values.
 */

export type ToolCategory = "organize" | "optimize" | "convert" | "edit" | "secure" | "read";

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  organize: "Organize",
  optimize: "Optimize",
  convert: "Convert",
  edit: "Edit",
  secure: "Secure",
  read: "Read & Analyze",
};

export type FieldType =
  | "text"
  | "textarea"
  | "password"
  | "number"
  | "range"
  | "select"
  | "checkbox"
  | "ranges";

export interface ToolField {
  name: string;
  label: string;
  type: FieldType;
  def?: string | number | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  hint?: string;
  showIf?: { field: string; equals: string };
}

export type OptionSchema = "merge-order" | "sign" | "compare" | "organize" | ToolField[] | null;

/** ids of tools the FastAPI server tier can execute (see api/main.py) */
export const CLOUD_TOOLS = new Set([
  "merge", "rotate", "delete-pages", "reverse", "extract-pages", "n-up",
  "resize-a4", "crop", "compress", "grayscale", "flatten", "remove-annotations",
  "protect", "unlock", "pdf-to-jpg", "pdf-to-png", "long-image", "jpg-to-pdf",
  "text-to-pdf", "page-numbers", "watermark", "header-footer",
  "pdf-info", "pdf-to-text", "search", "ocr",
]);

export interface ToolDef {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: ToolCategory;
  icon: string;
  accept: string;
  /** number of file inputs */
  inputs: 1 | 2 | "many";
  fields: ToolField[];
  featured?: boolean;
  badge?: string;
}

const PDF = "application/pdf";
const IMG = "image/png,image/jpeg,image/webp";

const F = {
  ranges: (name = "ranges", label = "Pages (e.g. 1-3, 5, 8-10)"): ToolField => ({
    name,
    label,
    type: "ranges",
    def: "1-3",
    placeholder: "1-3, 5, 8-10",
  }),
  select: (name: string, label: string, opts: Array<[string, string]>, def?: string): ToolField => ({
    name,
    label,
    type: "select",
    options: opts.map(([value, l]) => ({ value, label: l })),
    def: def ?? opts[0][0],
  }),
  num: (name: string, label: string, def: number, min?: number, max?: number, step?: number): ToolField => ({
    name,
    label,
    type: "number",
    def,
    min,
    max,
    step,
  }),
  range: (name: string, label: string, def: number, min: number, max: number, step: number): ToolField => ({
    name,
    label,
    type: "range",
    def,
    min,
    max,
    step,
  }),
  check: (name: string, label: string, def = false): ToolField => ({ name, label, type: "checkbox", def }),
  text: (name: string, label: string, def = "", placeholder?: string): ToolField => ({
    name,
    label,
    type: "text",
    def,
    placeholder,
  }),
};

export const TOOLS: ToolDef[] = [
  /* ------------------------------- ORGANIZE (13) ------------------------------ */
  {
    id: "merge", slug: "merge-pdf", name: "Merge PDF", category: "organize", icon: "git-merge",
    tagline: "Combine files in order", accept: PDF, inputs: "many", featured: true,
    description: "Stitch multiple PDFs into one document, in the order listed. Runs entirely in memory.",
    fields: [],
  },
  {
    id: "split", slug: "split-pdf", name: "Split PDF", category: "organize", icon: "scissors",
    tagline: "Every page, ranges, or halves", accept: PDF, inputs: 1, featured: true,
    description: "Split one PDF into many files. Batch results download as a ZIP.",
    fields: [
      F.select("mode", "Split mode", [["ranges", "Range groups (one file per group)"], ["every", "Every page"], ["half", "Split in half"], ["extract", "Extract pages into one file"]]),
      { name: "ranges", label: "Pages", type: "ranges", def: "1-3, 4-6", placeholder: "1-3, 5, 8-10", showIf: { field: "mode", equals: "ranges" } },
      { name: "extract", label: "Pages to extract", type: "ranges", def: "1-5", placeholder: "1-5", showIf: { field: "mode", equals: "extract" } },
    ],
  },
  {
    id: "organize", slug: "organize-pdf", name: "Organize PDF", category: "organize", icon: "layout-grid",
    tagline: "Reorder, rotate, delete visually", accept: PDF, inputs: 1, featured: true, badge: "Visual",
    description: "A visual page board: drag to reorder, rotate, or delete pages, then rebuild the PDF.",
    fields: [],
  },
  {
    id: "rotate", slug: "rotate-pdf", name: "Rotate PDF", category: "organize", icon: "rotate-cw",
    tagline: "Turn every page", accept: PDF, inputs: 1,
    description: "Rotate all pages by 90°, 180°, or 270° clockwise.",
    fields: [F.select("angle", "Rotation", [["90", "90° clockwise"], ["180", "180°"], ["270", "270° (90° counter)"]])],
  },
  {
    id: "delete-pages", slug: "delete-pages", name: "Delete Pages", category: "organize", icon: "trash-2",
    tagline: "Remove pages by range", accept: PDF, inputs: 1,
    description: "Delete the pages you name; everything else is kept in order.",
    fields: [F.ranges()],
  },
  {
    id: "reverse", slug: "reverse-pages", name: "Reverse Pages", category: "organize", icon: "arrow-up-down",
    tagline: "Flip the page order", accept: PDF, inputs: 1,
    description: "Reverse the entire document — last page first. Handy for scanners that output backwards.",
    fields: [],
  },
  {
    id: "combine-insert", slug: "combine-insert", name: "Combine & Insert", category: "organize", icon: "combine",
    tagline: "Insert B into A at any page", accept: PDF, inputs: 2,
    description: "Merge two PDFs but choose exactly where the second document lands inside the first.",
    fields: [F.num("insertAt", "Insert second file at page", 1, 1)],
  },
  {
    id: "interleave", slug: "interleave", name: "Interleave", category: "organize", icon: "shuffle",
    tagline: "Zip two docs page-by-page", accept: PDF, inputs: 2,
    description: "Alternate pages from two PDFs — perfect for merging a scan of fronts with a scan of backs.",
    fields: [F.check("reverseB", "Take second file's pages in reverse", false)],
  },
  {
    id: "extract-pages", slug: "extract-pages", name: "Extract Pages", category: "organize", icon: "file-output",
    tagline: "Pull a selection into a new PDF", accept: PDF, inputs: 1,
    description: "Copy the selected pages into a fresh document; the original is untouched.",
    fields: [F.ranges()],
  },
  {
    id: "duplicate-pages", slug: "duplicate-pages", name: "Duplicate Pages", category: "organize", icon: "copy",
    tagline: "Repeat selected pages", accept: PDF, inputs: 1,
    description: "Duplicate the chosen pages in place (e.g. print two copies of a form page).",
    fields: [F.ranges(), F.num("times", "Copies", 1, 1, 10)],
  },
  {
    id: "n-up", slug: "n-up-pdf", name: "N-up Layout", category: "organize", icon: "grid-2x2",
    tagline: "2 or 4 pages per sheet", accept: PDF, inputs: 1,
    description: "Impose multiple pages onto each A4 sheet to save paper.",
    fields: [F.select("per", "Pages per sheet", [["2", "2 per sheet"], ["4", "4 per sheet"]])],
  },
  {
    id: "booklet", slug: "booklet", name: "Booklet Imposition", category: "organize", icon: "book-open",
    tagline: "Fold-ready page order", accept: PDF, inputs: 1,
    description: "Re-orders and 2-up imposes pages on landscape sheets so a folded stack reads as a booklet.",
    fields: [],
  },
  {
    id: "resize-a4", slug: "resize-pages", name: "Resize to A4", category: "organize", icon: "scaling",
    tagline: "Normalize page geometry", accept: PDF, inputs: 1,
    description: "Re-embed every page onto a standard A4 sheet, centered — fixes mixed-size scans.",
    fields: [F.check("landscape", "Landscape A4", false)],
  },

  /* ------------------------------- OPTIMIZE (6) ------------------------------- */
  {
    id: "compress", slug: "compress-pdf", name: "Compress PDF", category: "optimize", icon: "minimize-2",
    tagline: "Shrink with a quality dial", accept: PDF, inputs: 1, featured: true,
    description: "Re-renders pages as quality-tuned JPEGs in a fresh PDF. Transparent and fully local.",
    fields: [
      F.select("level", "Preset", [["gentle", "Gentle"], ["balanced", "Balanced"], ["strong", "Strong"]], "balanced"),
      F.range("quality", "JPEG quality", 60, 20, 95, 5),
    ],
  },
  {
    id: "grayscale", slug: "grayscale-pdf", name: "Grayscale PDF", category: "optimize", icon: "contrast",
    tagline: "Strip color, save ink", accept: PDF, inputs: 1,
    description: "Converts every page to black-and-white — cheaper to print, smaller to store.",
    fields: [],
  },
  {
    id: "flatten", slug: "flatten-forms", name: "Flatten Forms", category: "optimize", icon: "layers",
    tagline: "Bake AcroForm fields into the page", accept: PDF, inputs: 1,
    description: "Freezes form field values into static page content so they can't be edited or lost.",
    fields: [],
  },
  {
    id: "remove-annotations", slug: "remove-annotations", name: "Remove Annotations", category: "optimize", icon: "eraser",
    tagline: "Strip comments & highlights", accept: PDF, inputs: 1,
    description: "Deletes annotation objects (comments, highlights, sticky notes) from every page.",
    fields: [],
  },
  {
    id: "pdf-to-jpg", slug: "pdf-to-jpg", name: "PDF to JPG", category: "optimize", icon: "file-image",
    tagline: "Every page as an image", accept: PDF, inputs: 1, featured: true,
    description: "Rasterize each page to a JPEG at your chosen resolution. Batch output as ZIP.",
    fields: [F.select("format", "Format", [["jpeg", "JPEG"], ["png", "PNG"]]), F.select("dpi", "Resolution", [["96", "96 DPI (screen)"], ["144", "144 DPI"], ["200", "200 DPI"], ["300", "300 DPI (print)"]], "144")],
  },
  {
    id: "pdf-to-png", slug: "png-converter", name: "PDF to PNG", category: "optimize", icon: "image",
    tagline: "Lossless page images", accept: PDF, inputs: 1,
    description: "PNG export per page — lossless, with crisp text. ZIP for batches.",
    fields: [F.select("dpi", "Resolution", [["96", "96 DPI (screen)"], ["144", "144 DPI"], ["200", "200 DPI"], ["300", "300 DPI (print)"]], "144")],
  },

  /* ------------------------------- CONVERT (4) -------------------------------- */
  {
    id: "jpg-to-pdf", slug: "jpg-to-pdf", name: "JPG to PDF", category: "convert", icon: "image",
    tagline: "Images → one tidy PDF", accept: IMG, inputs: "many", featured: true,
    description: "Turn scanned images or photos into a single PDF with paper sizing and margins.",
    fields: [
      F.select("paper", "Paper", [["A4", "A4"], ["Letter", "US Letter"], ["Legal", "US Legal"], ["A5", "A5"], ["fit", "Fit to image"]]),
      F.select("orientation", "Orientation", [["auto", "Auto"], ["portrait", "Portrait"], ["landscape", "Landscape"]]),
      F.range("margin", "Margin (pt)", 24, 0, 72, 4),
    ],
  },
  {
    id: "text-to-pdf", slug: "text-to-pdf", name: "Text to PDF", category: "convert", icon: "file-type",
    tagline: "Typeset plain text", accept: "", inputs: 0 as unknown as 1,
    description: "Paste any text and get a paginated, monospaced PDF. No upload, obviously.",
    fields: [F.text("title", "Document title", "Untitled"), { name: "text", label: "Text", type: "textarea", def: "", placeholder: "Paste or type here…" }],
  },
  {
    id: "long-image", slug: "pdf-to-long-image", name: "PDF to Long Image", category: "convert", icon: "move-vertical",
    tagline: "One tall PNG of everything", accept: PDF, inputs: 1,
    description: "Stitches all pages into a single scrollable PNG — great for chat sharing.",
    fields: [F.select("width", "Width", [["800", "800 px"], ["1000", "1000 px"], ["1400", "1400 px"]], "1000")],
  },
  {
    id: "blank-pdf", slug: "blank-pdf", name: "Blank PDF", category: "convert", icon: "file-plus",
    tagline: "Generate empty pages", accept: "", inputs: 0 as unknown as 1,
    description: "Create a fresh PDF with N blank pages in your chosen paper size.",
    fields: [F.num("pages", "Number of pages", 1, 1, 500), F.select("paper", "Paper", [["A4", "A4"], ["Letter", "US Letter"], ["Legal", "US Legal"], ["A5", "A5"]])],
  },

  /* --------------------------------- EDIT (7) --------------------------------- */
  {
    id: "page-numbers", slug: "page-numbers", name: "Page Numbers", category: "edit", icon: "hash",
    tagline: "Stamp numbering anywhere", accept: PDF, inputs: 1,
    description: "Add page numbers with format, start offset, placement and skip-cover control.",
    fields: [
      F.select("format", "Format", [["{n}", "1, 2, 3"], ["{n} / {total}", "1 / N"], ["Page {n}", "Page 1"], ["Page {n} of {total}", "Page 1 of N"]], "{n} / {total}"),
      F.select("position", "Position", [["bottom-center", "Bottom center"], ["bottom-right", "Bottom right"], ["bottom-left", "Bottom left"], ["top-center", "Top center"], ["top-right", "Top right"], ["top-left", "Top left"]]),
      F.num("startAt", "Start numbering at", 1, 0),
      F.num("fontSize", "Font size", 11, 6, 36),
      F.num("margin", "Margin (pt)", 28, 8, 96),
      F.check("skipFirst", "Skip the first page", false),
    ],
  },
  {
    id: "watermark", slug: "watermark", name: "Watermark", category: "edit", icon: "stamp",
    tagline: "Text stamps, single or tiled", accept: PDF, inputs: 1,
    description: "Brand documents with DRAFT / CONFIDENTIAL watermarks — size, opacity, rotation, tiling.",
    fields: [
      F.text("text", "Text", "CONFIDENTIAL"),
      F.select("color", "Color", [["gray", "Gray"], ["red", "Red"], ["blue", "Blue"]]),
      F.num("fontSize", "Font size", 72, 24, 144),
      F.range("opacity", "Opacity", 12, 5, 50, 5),
      F.select("rotation", "Rotation", [["0", "0°"], ["15", "15°"], ["30", "30°"], ["45", "45°"], ["60", "60°"], ["90", "90°"]], "45"),
      F.check("tile", "Tile 3×3 across each page", false),
    ],
  },
  {
    id: "header-footer", slug: "header-footer", name: "Header & Footer", category: "edit", icon: "panel-top",
    tagline: "Six slots, dynamic tokens", accept: PDF, inputs: 1,
    description: "Stamp headers/footers with {page}, {pages} and {date} tokens in six positions.",
    fields: [
      F.text("headerLeft", "Header left", ""),
      F.text("headerCenter", "Header center", ""),
      F.text("headerRight", "Header right", ""),
      F.text("footerLeft", "Footer left", ""),
      F.text("footerCenter", "Footer center", "{page} / {pages}"),
      F.text("footerRight", "Footer right", "{date}"),
      F.num("fontSize", "Font size", 9, 6, 18),
      F.num("margin", "Margin (pt)", 24, 8, 72),
    ],
  },
  {
    id: "add-text", slug: "add-text", name: "Add Text", category: "edit", icon: "type",
    tagline: "Place text by coordinates", accept: PDF, inputs: 1,
    description: "Drop text at precise positions — X/Y are percent of page from top-left.",
    fields: [
      F.text("text", "Text", "APPROVED"),
      F.num("xPercent", "X (% from left)", 10, 0, 100),
      F.num("yPercent", "Y (% from top)", 10, 0, 100),
      F.num("fontSize", "Font size", 14, 6, 72),
      F.select("color", "Color", [["#1a1815", "Ink black"], ["#b91c1c", "Red"], ["#1d4ed8", "Blue"], ["#b45309", "Amber"]]),
      F.check("bold", "Bold", true),
      { name: "pages", label: "Pages ('all' or e.g. 1-3)", type: "text", def: "all", placeholder: "all" },
    ],
  },
  {
    id: "crop", slug: "crop-pdf", name: "Crop Pages", category: "edit", icon: "crop",
    tagline: "Trim margins by ratio", accept: PDF, inputs: 1,
    description: "Shrink every page's crop box — great for removing scanner borders.",
    fields: [
      F.range("top", "Top %", 5, 0, 40, 1),
      F.range("right", "Right %", 5, 0, 40, 1),
      F.range("bottom", "Bottom %", 5, 0, 40, 1),
      F.range("left", "Left %", 5, 0, 40, 1),
    ],
  },
  {
    id: "edit-metadata", slug: "edit-metadata", name: "Edit Metadata", category: "edit", icon: "file-cog",
    tagline: "Rewrite title, author, dates", accept: PDF, inputs: 1,
    description: "Set the document's Info dictionary — title, author, subject — and strip producer traces.",
    fields: [F.text("title", "Title", ""), F.text("author", "Author", ""), F.text("subject", "Subject", ""), F.text("creator", "Creator app", "")],
  },
  {
    id: "sign", slug: "sign-pdf", name: "Sign PDF", category: "edit", icon: "pen-tool",
    tagline: "Draw, place, done", accept: PDF, inputs: 1, featured: true, badge: "Visual",
    description: "Draw your signature on the pad, drop it on any page, size and position it. All local.",
    fields: [],
  },

  /* -------------------------------- SECURE (4) -------------------------------- */
  {
    id: "protect", slug: "protect-pdf", name: "Protect PDF", category: "secure", icon: "lock",
    tagline: "Password-encrypt locally", accept: PDF, inputs: 1,
    description: "Encrypt with a user password (and optional owner password + permissions). Nothing leaves the tab.",
    fields: [
      { name: "userPassword", label: "User password (to open)", type: "password", def: "" },
      { name: "ownerPassword", label: "Owner password (permissions) — optional", type: "password", def: "" },
      F.check("allowPrinting", "Allow printing", true),
      F.check("allowCopying", "Allow text copying", true),
    ],
  },
  {
    id: "unlock", slug: "unlock-pdf", name: "Unlock PDF", category: "secure", icon: "lock-open",
    tagline: "Remove known-password encryption", accept: PDF, inputs: 1,
    description: "Decrypt a PDF you own by supplying its password; output is unencrypted.",
    fields: [{ name: "password", label: "Password", type: "password", def: "" }],
  },
  {
    id: "redact", slug: "redact-pdf", name: "Redact PDF", category: "secure", icon: "square-dashed-bottom",
    tagline: "Black-box and burn underneath", accept: PDF, inputs: 1, badge: "Visual",
    description: "Draw boxes over sensitive content; affected pages are re-rasterized so the text is truly gone.",
    fields: [],
  },
  {
    id: "compare", slug: "compare-pdfs", name: "Compare PDFs", category: "secure", icon: "git-compare",
    tagline: "Pixel-diff two documents", accept: PDF, inputs: 2,
    description: "Renders both documents and reports per-page pixel differences with side-by-side previews.",
    fields: [],
  },

  /* ------------------------------ READ & ANALYZE (6) --------------------------- */
  {
    id: "ocr", slug: "ocr-pdf", name: "OCR PDF", category: "read", icon: "scan-text",
    tagline: "Scans → searchable text", accept: PDF, inputs: 1, featured: true,
    description: "Tesseract (WASM) reads scanned pages into text — offline after the one-time model fetch.",
    fields: [],
  },
  {
    id: "pdf-info", slug: "pdf-info", name: "PDF Info", category: "read", icon: "info",
    tagline: "Full document dossier", accept: PDF, inputs: 1,
    description: "Pages, sizes, encryption state, form fields, and every metadata field — no server fingerprinting.",
    fields: [],
  },
  {
    id: "pdf-to-text", slug: "pdf-to-text", name: "PDF to Text", category: "read", icon: "file-text",
    tagline: "Extract the text layer", accept: PDF, inputs: 1,
    description: "Pulls the embedded text layer per page. If it extracts, your PDF was never a scan.",
    fields: [],
  },
  {
    id: "search", slug: "search-pdf", name: "Search PDF", category: "read", icon: "search",
    tagline: "Find phrases across pages", accept: PDF, inputs: 1,
    description: "Full-text search with page numbers and excerpts. Up to 200 hits, all client-side.",
    fields: [F.text("query", "Search for", "", "e.g. indemnify")],
  },
  {
    id: "attachments", slug: "pdf-attachments", name: "PDF Attachments", category: "read", icon: "paperclip",
    tagline: "List & extract embedded files", accept: PDF, inputs: 1,
    description: "See what files ride inside the PDF and pull them out — portfolio PDFs often hide surprises.",
    fields: [],
  },
  {
    id: "contact-sheet", slug: "contact-sheet", name: "Contact Sheet", category: "read", icon: "layout-template",
    tagline: "Thumbnail overview PDF", accept: PDF, inputs: 1,
    description: "Generates a printable thumbnail sheet of the whole document — 4, 9, or 16 pages per sheet.",
    fields: [F.select("perPage", "Thumbnails per sheet", [["4", "4"], ["9", "9"], ["16", "16"]], "9")],
  },
];

export function toolBySlug(slug: string | undefined): ToolDef | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

export const CATEGORY_ORDER: ToolCategory[] = ["organize", "optimize", "convert", "edit", "secure", "read"];

export function toolsByCategory(cat: ToolCategory): ToolDef[] {
  return TOOLS.filter((t) => t.category === cat);
}
