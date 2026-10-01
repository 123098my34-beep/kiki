export interface CompareViewData {
  aName: string;
  bName: string;
  aPages: number;
  bPages: number;
  pairs: Array<{ index: number; dataUrlA: string; dataUrlB: string; diffPct: number }>;
  verdict: "identical" | "different" | "different-lengths";
}

export default function CompareView({ result }: { result: CompareViewData }) {
  const verdictText =
    result.verdict === "identical"
      ? "Documents render identically."
      : result.verdict === "different-lengths"
        ? `Different page counts: ${result.aPages} vs ${result.bPages}.`
        : "Documents differ visually on the pages below.";

  return (
    <div className="mt-5 text-left">
      <div
        className={`mx-auto flex max-w-md items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold ${
          result.verdict === "identical"
            ? "bg-emerald-400/10 text-emerald-300"
            : "bg-amber-400/10 text-amber-300"
        }`}
      >
        {verdictText}
      </div>

      <div className="mt-6 space-y-5">
        {result.pairs.map((p) => (
          <div key={p.index} className="rounded-xl border hairline bg-ink-950/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-widest text-ink-400">
                page {p.index + 1}
              </span>
              <span
                className={`font-mono text-xs ${
                  p.diffPct < 0.5 ? "text-emerald-300" : p.diffPct > 20 ? "text-red-300" : "text-amber-300"
                }`}
              >
                {p.diffPct < 0.5 ? "identical" : `${p.diffPct.toFixed(1)}% pixels differ`}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <figure>
                <img src={p.dataUrlA} alt="A" className="w-full rounded-md border hairline" />
                <figcaption className="mt-1 truncate text-center font-mono text-[10px] text-ink-500">
                  {result.aName}
                </figcaption>
              </figure>
              <figure>
                <img src={p.dataUrlB} alt="B" className="w-full rounded-md border hairline" />
                <figcaption className="mt-1 truncate text-center font-mono text-[10px] text-ink-500">
                  {result.bName}
                </figcaption>
              </figure>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
