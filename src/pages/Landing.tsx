import { Link } from "react-router-dom";
import {
  Flame,
  Scissors,
  LayoutGrid,
  Minimize2,
  GitMerge,
  Image as ImageIcon,
  FileImage,
  Hash,
  Stamp,
  ScanText,
  ShieldCheck,
  Lock,
  Infinity as InfinityIcon,
  Wallet,
  ArrowRight,
  ArrowUpRight,
  Check,
  X,
  Cpu,
  BookOpen,
  Zap,
  PenTool,
  FileQuestion,
} from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Badge, SectionHeading, btnPrimary, btnGhost } from "../components/ui";
import { TOOLS, CATEGORY_LABELS, CATEGORY_ORDER, type ToolDef } from "../lib/tools";

const ICONS: Record<string, typeof Flame> = {
  "git-merge": GitMerge,
  scissors: Scissors,
  "layout-grid": LayoutGrid,
  "minimize-2": Minimize2,
  image: ImageIcon,
  "file-image": FileImage,
  hash: Hash,
  stamp: Stamp,
  "scan-text": ScanText,
  "rotate-cw": Zap,
  "arrow-up-down": ArrowRight,
  combine: Zap,
  shuffle: Zap,
  "file-output": FileImage,
  copy: FileImage,
  "grid-2x2": LayoutGrid,
  "book-open": BookOpen,
  scaling: Zap,
  contrast: Zap,
  layers: Zap,
  eraser: Zap,
  "file-type": FileImage,
  "move-vertical": Zap,
  "file-plus": FileImage,
  "panel-top": Zap,
  type: FileImage,
  crop: Zap,
  "file-cog": FileImage,
  "pen-tool": PenTool,
  lock: Lock,
  "lock-open": Zap,
  "square-dashed-bottom": Zap,
  "git-compare": Zap,
  info: FileQuestion,
  "file-text": FileImage,
  search: Zap,
  paperclip: FileImage,
  "layout-template": LayoutGrid,
};

function ToolIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Flame;
  return <Icon className={className} strokeWidth={1.75} />;
}

function ToolCard({ tool }: { tool: ToolDef }) {
  return (
    <Link
      to={`/${tool.slug}`}
      className="card-ink group relative overflow-hidden rounded-2xl p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(0,0,0,0.45)]"
    >
      <div className="flex items-start justify-between">
        <span className="grid size-10 place-items-center rounded-xl bg-brass-400/10 text-brass-300 transition group-hover:bg-brass-400 group-hover:text-ink-950">
          <ToolIcon name={tool.icon} className="size-5" />
        </span>
        <ArrowUpRight className="size-4 text-ink-500 transition group-hover:text-brass-300" />
      </div>
      <h3 className="mt-3.5 font-serif text-base font-bold text-paper-50">{tool.name}</h3>
      <p className="mt-1 text-sm leading-relaxed text-ink-300">{tool.tagline}</p>
    </Link>
  );
}

const COMPARISON: Array<{
  feature: string;
  forge: string | boolean;
  smallpdf: string | boolean;
  adobe: string | boolean;
}> = [
  { feature: "Files uploaded to a server", forge: "Never", smallpdf: true, adobe: true },
  { feature: "Account required", forge: false, smallpdf: true, adobe: true },
  { feature: "Free daily task limit", forge: "Unlimited", smallpdf: "2 free tasks", adobe: "Trial only" },
  { feature: "File size cap", forge: "Your RAM", smallpdf: "Yes", adobe: "Yes" },
  { feature: "Works offline after first load", forge: true, smallpdf: false, adobe: false },
  { feature: "OCR included", forge: true, smallpdf: "Paid tier", adobe: "Paid tier" },
  { feature: "Batch + ZIP output", forge: true, smallpdf: "Paid tier", adobe: "Paid tier" },
  { feature: "E-signature included", forge: true, smallpdf: "Paid tier", adobe: "Paid tier" },
  { feature: "Monthly price", forge: "$0", smallpdf: "$9–12", adobe: "$12.99–23.99" },
];

function CompareCell({ v }: { v: string | boolean }) {
  if (v === true)
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-red-300/90">
        <X className="size-4" /> Yes
      </span>
    );
  if (v === false)
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-emerald-300/90">
        <Check className="size-4" /> No
      </span>
    );
  return <span className="text-sm text-paper-100">{v}</span>;
}

const STEPS = [
  {
    icon: ShieldCheck,
    title: "Pick a tool, drop a file",
    body: "Files open straight from your disk into the page. Nothing is transmitted — open DevTools and watch the network tab stay silent.",
  },
  {
    icon: Cpu,
    title: "Your CPU does the work",
    body: "pdf-lib, pdf.js and Tesseract compile to WebAssembly and run in your browser tab. The server never sees a single byte.",
  },
  {
    icon: Zap,
    title: "Download instantly",
    body: "Results are written to a Blob and saved locally. Multi-file results come back as a tidy ZIP. No queue, no waiting room.",
  },
];

export default function Landing() {
  const featured = TOOLS.filter((t) => t.featured);

  return (
    <div className="min-h-screen">
      <Header />

      {/* ---------------------------------- hero --------------------------------- */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-5%,rgba(244,185,66,0.13),transparent_65%)]"
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge>
              <Lock className="size-3" /> 100% local · 0 uploads · $0 forever
            </Badge>
            <h1 className="mt-6 font-serif text-4xl font-bold leading-[1.08] tracking-tight text-paper-50 sm:text-6xl">
              {TOOLS.length} PDF tools that never
              <span className="block text-brass-400">ask for your documents.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-ink-300 sm:text-lg">
              Smallpdf and Adobe Acrobat upload every file you touch, then meter your
              work behind accounts and paywalls. PaperForge runs {TOOLS.length} tools — merge,
              split, compress, OCR, e-sign, redact and more — entirely inside your
              browser with WebAssembly. Unlimited, free, and private by physics.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/merge-pdf" className={btnPrimary}>
                <Flame className="size-4" />
                Start with Merge PDF
              </Link>
              <Link to="/research" className={btnGhost}>
                <BookOpen className="size-4" />
                Why it's safe — the research
              </Link>
            </div>
          </div>

          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Lock, k: "0", v: "bytes uploaded" },
              { icon: Wallet, k: "$0", v: "forever, no account" },
              { icon: InfinityIcon, k: "∞", v: "tasks & file size" },
              { icon: Zap, k: String(TOOLS.length), v: "tools, one page" },
            ].map((s) => (
              <div key={s.v} className="card-ink rounded-xl p-4 text-center">
                <s.icon className="mx-auto size-4 text-brass-300" />
                <p className="mt-2 font-serif text-2xl font-bold text-paper-50">{s.k}</p>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-ink-400">
                  {s.v}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------- tool grid ------------------------------- */}
      <section id="tools" className="border-t hairline py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            kicker="The workshop"
            title="Every tool. Zero uploads."
            sub={`The full Smallpdf + Acrobat surface — ${TOOLS.length} tools — rebuilt to run on your machine.`}
          />

          {featured.length > 0 && (
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((t) => (
                <ToolCard key={t.slug} tool={t} />
              ))}
            </div>
          )}

          {CATEGORY_ORDER.map((cat) => (
            <div key={cat} className="mt-12">
              <h3 className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-ink-400">
                <span className="h-px flex-1 bg-paper-200/10" />
                {CATEGORY_LABELS[cat]}
                <span className="h-px flex-1 bg-paper-200/10" />
              </h3>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {TOOLS.filter((t) => t.category === cat).map((t) => (
                  <ToolCard key={t.slug} tool={t} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------- how it works ----------------------------- */}
      <section className="border-t hairline bg-ink-900/40 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading kicker="How it works" title="Three steps, zero servers" />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="card-ink relative rounded-2xl p-6">
                <span className="absolute right-5 top-5 font-serif text-4xl font-bold text-paper-200/10">
                  {i + 1}
                </span>
                <span className="grid size-11 place-items-center rounded-xl bg-forge-400/10 text-forge-400">
                  <s.icon className="size-5" strokeWidth={1.75} />
                </span>
                <h3 className="mt-4 font-serif text-lg font-bold text-paper-50">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-300">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------- comparison ------------------------------- */}
      <section className="border-t hairline py-20 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <SectionHeading
            kicker="The honest comparison"
            title="Same jobs. Different trust model."
            sub="Not a diss — just architecture. Theirs was built when browsers couldn't do this. Now they can."
          />
          <div className="mt-12 overflow-hidden rounded-2xl border hairline">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-ink-800/80">
                  <th className="px-4 py-3.5 font-mono text-[11px] uppercase tracking-widest text-ink-300">
                    Feature
                  </th>
                  <th className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-brass-300">
                      <Flame className="size-4" /> PaperForge
                    </span>
                  </th>
                  <th className="px-4 py-3.5 text-sm font-semibold text-paper-200">Smallpdf</th>
                  <th className="px-4 py-3.5 text-sm font-semibold text-paper-200">Acrobat</th>
                </tr>
              </thead>
              <tbody className="divide-y hairline bg-ink-900/60">
                {COMPARISON.map((row) => (
                  <tr key={row.feature} className="transition hover:bg-ink-800/50">
                    <td className="px-4 py-3.5 text-sm text-ink-300">{row.feature}</td>
                    <td className="bg-brass-400/5 px-4 py-3.5 font-semibold">
                      <CompareCell v={row.forge} />
                    </td>
                    <td className="px-4 py-3.5">
                      <CompareCell v={row.smallpdf} />
                    </td>
                    <td className="px-4 py-3.5">
                      <CompareCell v={row.adobe} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-widest text-ink-500">
            Plans & limits as published Sept 2026 · verify before purchase decisions
          </p>
        </div>
      </section>

      {/* ----------------------------------- CTA ---------------------------------- */}
      <section className="border-t hairline py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-serif text-3xl font-bold tracking-tight text-paper-50 sm:text-4xl">
            Your documents never needed a middleman.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-300">
            Drop a file in any tool and watch it finish before a traditional site
            would finish uploading. Curious whether it all really works? Run the
            built-in verification suite.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/merge-pdf" className={btnPrimary}>
              <Flame className="size-4" /> Open the workshop
            </Link>
            <Link to="/self-test" className={btnGhost}>
              <ShieldCheck className="size-4" /> Run the 40-tool self-test
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
