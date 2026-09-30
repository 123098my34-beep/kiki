export default function ProgressPanel({
  pct,
  label,
}: {
  pct: number;
  label: string;
}) {
  return (
    <div className="rounded-xl border hairline bg-ink-900/70 p-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-paper-100">{label}</p>
        <p className="font-mono text-xs text-brass-300">{Math.round(pct)}%</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brass-500 to-brass-300 transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
        />
      </div>
    </div>
  );
}
