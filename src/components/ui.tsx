import type { ReactNode } from "react";

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-brass-400/30 bg-brass-400/10 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-brass-300">
      {children}
    </span>
  );
}

export function SectionHeading({
  kicker,
  title,
  sub,
}: {
  kicker: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <Badge>{kicker}</Badge>
      <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-paper-50 sm:text-4xl">
        {title}
      </h2>
      {sub ? <p className="mt-4 text-base leading-relaxed text-ink-300">{sub}</p> : null}
    </div>
  );
}

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-brass-400 px-5 py-3 text-sm font-semibold text-ink-950 transition hover:bg-brass-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brass-300/60 disabled:cursor-not-allowed disabled:opacity-50";

export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-lg border hairline bg-ink-800/60 px-5 py-3 text-sm font-medium text-paper-100 transition hover:border-brass-400/40 hover:bg-ink-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brass-300/40 disabled:cursor-not-allowed disabled:opacity-50";

export const inputCls =
  "w-full rounded-lg border hairline bg-ink-900/80 px-3 py-2.5 text-sm text-paper-100 placeholder:text-ink-500 focus:border-brass-400/50 focus:outline-none focus:ring-1 focus:ring-brass-400/40";

export const selectCls = inputCls;

export const labelCls =
  "mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-ink-400";
