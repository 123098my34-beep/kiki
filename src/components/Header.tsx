import { Link } from "react-router-dom";
import { Flame } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b hairline bg-ink-950/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="group flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-brass-400 text-ink-950 shadow-[0_0_24px_rgba(244,185,66,0.25)]">
            <Flame className="size-5" strokeWidth={2.25} />
          </span>
          <span className="font-serif text-lg font-bold tracking-tight text-paper-50">
            PaperForge
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            to="/merge-pdf"
            className="hidden rounded-md px-3 py-2 text-sm text-ink-300 transition hover:bg-ink-800 hover:text-paper-50 sm:block"
          >
            Tools
          </Link>
          <Link
            to="/research"
            className="hidden rounded-md px-3 py-2 text-sm text-ink-300 transition hover:bg-ink-800 hover:text-paper-50 sm:block"
          >
            Research
          </Link>
          <Link
            to="/merge-pdf"
            className="rounded-md bg-brass-400 px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-brass-300"
          >
            Open a tool
          </Link>
        </nav>
      </div>
    </header>
  );
}
