export type PaperSize = "A4" | "Letter" | "Legal" | "A5";

export const PAPER_SIZES: Record<PaperSize, [number, number]> = {
  A4: [595.28, 841.89],
  Letter: [612, 792],
  Legal: [612, 1008],
  A5: [419.53, 595.28],
};

export const PAPER_LABELS: Record<string, string> = {
  A4: "A4",
  Letter: "US Letter",
  Legal: "US Legal",
  A5: "A5",
  fit: "Fit to image",
};
