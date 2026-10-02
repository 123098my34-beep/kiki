import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing";

// Route-level code splitting: the landing (first paint) never waits on the
// Studio's dictation UI, and the 404 loads only when hit.
const Studio = lazy(() => import("./pages/Studio"));
const NotFound = lazy(() => import("./pages/NotFound"));

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-carbon-950">
          <span className="font-mono text-[11px] uppercase tracking-widest text-fog-500">
            loading…
          </span>
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/studio" element={<Studio />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
