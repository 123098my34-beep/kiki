import { Link } from "react-router-dom";
import Brand from "../components/Brand";

export default function NotFound() {
  return (
    <div className="signal-grain flex min-h-screen flex-col">
      <header className="border-b border-white/8">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-5 sm:px-8">
          <Brand compact />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-5 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-signal-500">
          404 · silence
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-fog-50">
          Nothing was said here.
        </h1>
        <p className="mt-3 max-w-md text-fog-400">
          The page you asked for doesn&apos;t exist. The microphone, however, does.
        </p>
        <div className="mt-8 flex gap-4">
          <Link
            to="/"
            className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-fog-100 transition hover:border-signal-500/60 hover:text-signal-300"
          >
            Back home
          </Link>
          <Link
            to="/studio"
            className="rounded-xl bg-signal-500 px-5 py-3 text-sm font-semibold text-carbon-950 transition hover:bg-signal-400"
          >
            Open Studio
          </Link>
        </div>
      </main>
    </div>
  );
}
