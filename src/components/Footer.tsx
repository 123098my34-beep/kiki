import { Link } from "react-router-dom";
import { Flame } from "lucide-react";

const TOOL_LINKS = [
  { to: "/merge-pdf", label: "Merge" },
  { to: "/split-pdf", label: "Split" },
  { to: "/compress-pdf", label: "Compress" },
  { to: "/organize-pdf", label: "Organize" },
  { to: "/jpg-to-pdf", label: "JPG → PDF" },
  { to: "/pdf-to-jpg", label: "PDF → JPG" },
  { to: "/ocr-pdf", label: "OCR" },
];

export default function Footer() {
  return (
    <footer className="border-t hairline bg-ink-900/60">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-lg bg-brass-400 text-ink-950">
                <Flame className="size-4" strokeWidth={2.25} />
              </span>
              <span className="font-serif text-base font-bold text-paper-50">PaperForge</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-300">
              Every PDF tool you need, running entirely inside your browser.
              No accounts. No uploads. No limits. Free forever.
            </p>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-widest text-ink-500">
              0 bytes leave your device
            </p>
          </div>
          <div>
            <h4 className="font-mono text-[11px] uppercase tracking-widest text-ink-400">Tools</h4>
            <ul className="mt-4 space-y-2">
              {TOOL_LINKS.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-ink-300 transition hover:text-brass-300">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-mono text-[11px] uppercase tracking-widest text-ink-400">Learn</h4>
            <ul className="mt-4 space-y-2">
              <li>
                <Link to="/research" className="text-sm text-ink-300 transition hover:text-brass-300">
                  How it works — the research
                </Link>
              </li>
              <li>
                <Link to="/merge-pdf" className="text-sm text-ink-300 transition hover:text-brass-300">
                  Start with Merge PDF
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t hairline pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-500">
            © {new Date().getFullYear()} PaperForge. Built with pdf-lib, pdf.js, Tesseract & fflate.
          </p>
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink-500">
            Client-side by design, not by promise
          </p>
        </div>
      </div>
    </footer>
  );
}
