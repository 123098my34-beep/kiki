import { Link } from "react-router-dom";

export function Mark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#0e1614" />
      <g fill="#2fd98a">
        <rect x="12" y="26" width="5" height="12" rx="2.5" />
        <rect x="21" y="18" width="5" height="28" rx="2.5" />
        <rect x="30" y="12" width="5" height="40" rx="2.5" />
        <rect x="39" y="20" width="5" height="24" rx="2.5" />
        <rect x="48" y="27" width="5" height="10" rx="2.5" />
      </g>
    </svg>
  );
}

export default function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="group flex items-center gap-2.5" aria-label="Murmur home">
      <Mark className={compact ? "h-7 w-7" : "h-8 w-8"} />
      <span className="text-lg font-semibold tracking-tight text-fog-50 transition-colors group-hover:text-signal-300">
        Murmur
      </span>
    </Link>
  );
}
