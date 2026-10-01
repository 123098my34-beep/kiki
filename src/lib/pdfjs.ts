import * as pdfjsLib from "pdfjs-dist";
// Vite resolves the bundled worker file to a real asset URL at build time
// (the ?url suffix is typed by vite/client).
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export default pdfjsLib;
