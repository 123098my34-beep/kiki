import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    hmr: false,
  },
  worker: {
    format: "es",
  },
  build: {
    target: "es2022",
    // transformers.js ships an onnxruntime WASM binary of ~27 MB; it is only
    // fetched by the offline engine, never on first paint.
    chunkSizeWarningLimit: 4000,
  },
});
