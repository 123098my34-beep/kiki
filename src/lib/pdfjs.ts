import * as pdfjsLib from "pdfjs-dist";
// Vite resolves the bundled worker file to a real asset URL at build time.
// @ts-expect-error -- Vite's ?url suffix isn't in pdfjs-dist's type decls
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export default pdfjsLib;
