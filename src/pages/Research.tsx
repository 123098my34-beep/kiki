import { Link } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Cpu,
  FileCheck2,
  Github,
  Lock,
  WifiOff,
} from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Badge, SectionHeading } from "../components/ui";

const STACK = [
  {
    lib: "pdf-lib",
    license: "MIT",
    role: "Structural edits — merge, split, rotate, reorder, stamp text. Pure JS, no native code.",
  },
  {
    lib: "pdf.js (Mozilla)",
    license: "Apache-2.0",
    role: "Parsing & rasterization — renders pages to canvas for compression, JPG export, OCR, thumbnails.",
  },
  {
    lib: "Tesseract.js",
    license: "Apache-2.0",
    role: "OCR — the Tesseract engine compiled to WebAssembly, with the eng model fetched once and cached.",
  },
  {
    lib: "fflate",
    license: "MIT",
    role: "ZIP packaging for batch results, ~8 kB and the fastest JS deflate available.",
  },
];

const PAPERS = [
  {
    tag: "arXiv:2505.03335",
    title: "Absolute Zero: Reinforced Self-play Reasoning with Zero Data",
    points: [
      "Learns by PROPOSE/SOLVE self-play — no external dataset, tasks verified by Python execution.",
      "PaperForge's analogue: the product needs no document corpus. Your files arrive, are processed, and cease to exist server-side because there is no server-side.",
      "Lesson applied: capability without data capture is not a compromise — it can be the superior design.",
    ],
  },
  {
    tag: "arXiv:2506.04158 (Tiny Recursive Model)",
    title: "Hierarchical Reasoning with ~7M parameters",
    points: [
      "A 7M-param recursive model matches 27B/671B systems on Sudoku/ARC via deliberate depth, not width.",
      "Lesson applied: right-size the computation. pdf-lib (~300 kB) beats a server farm for structural edits; heavy rasterization streams page-by-page so memory stays flat.",
    ],
  },
  {
    tag: "arXiv:2603.16021",
    title: "Interpretable Context Methodology",
    points: [
      "Structures work as navigable context layers instead of opaque pipelines.",
      "Lesson applied: the engine, tool registry and UI are small, readable layers — auditable in an afternoon, not a black box trusting a vendor's word.",
    ],
  },
];

const FAQ = [
  {
    q: "How can you prove nothing is uploaded?",
    a: "Open your browser DevTools → Network tab and run any tool. You will see zero outbound requests carrying file data. The only network calls are static asset loads (the app itself) and Tesseract's one-time model download for OCR. This is verifiable by anyone — it doesn't rest on a privacy-policy promise.",
  },
  {
    q: "Where do the processing limits come from, then?",
    a: "From your device only: RAM and CPU. A 500 MB PDF merges if your tab can hold it. There is no artificial cap because there is no metering server to pay for.",
  },
  {
    q: "Is client-side weaker than server-side processing?",
    a: "For these operations, no — it is strictly better for privacy and usually faster (no upload/download round trip). The one trade-off: compression rasterizes pages, so text stops being selectable in the compressed copy. Server tools that preserve text do lossy font/image surgery with big compute — we show sizes transparently instead.",
  },
  {
    q: "Does it work offline?",
    a: "Yes, after first load the core tools work offline; OCR needs its one-time ~15 MB language model fetch.",
  },
  {
    q: "Why is it free? What's the catch?",
    a: "There is no upload bandwidth bill, no storage bill, no metering infrastructure, and no support desk for a login system. The marginal cost per user is approximately zero, so the price is zero. No catch — no account exists to upsell.",
  },
];

export default function Research() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-ink-400 transition hover:text-brass-300">
          <ArrowLeft className="size-4" /> All tools
        </Link>

        <div className="mt-8">
          <Badge><BookOpen className="size-3" /> Research notes</Badge>
          <h1 className="mt-4 font-serif text-4xl font-bold tracking-tight text-paper-50 sm:text-5xl">
            Why local-first wins
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-300">
            PaperForge's architecture is a bet: that the browser has become powerful
            enough that dedicated PDF servers are legacy infrastructure. Here is the
            engineering reasoning and the open literature behind it.
          </p>
        </div>

        {/* proof strip */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { icon: WifiOff, t: "Verifiable privacy", b: "Watch the network tab: no file bytes ever leave the tab. Trust the wire, not the words." },
            { icon: Cpu, t: "WASM-class compute", b: "pdf-lib, pdf.js and Tesseract compile to WebAssembly — near-native speed inside the sandbox." },
            { icon: FileCheck2, t: "Auditable layers", b: "Engine, registry, UI: three small readable layers. Audit us in an afternoon." },
          ].map((c) => (
            <div key={c.t} className="card-ink rounded-2xl p-5">
              <c.icon className="size-5 text-brass-300" strokeWidth={1.75} />
              <h3 className="mt-3 font-serif text-base font-bold text-paper-50">{c.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-300">{c.b}</p>
            </div>
          ))}
        </div>

        {/* stack */}
        <section className="mt-16">
          <h2 className="font-serif text-2xl font-bold text-paper-50">The open-source stack</h2>
          <div className="mt-6 overflow-hidden rounded-2xl border hairline">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-ink-800/80 font-mono text-[11px] uppercase tracking-widest text-ink-300">
                  <th className="px-4 py-3">Library</th>
                  <th className="px-4 py-3">License</th>
                  <th className="px-4 py-3">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y hairline bg-ink-900/60">
                {STACK.map((s) => (
                  <tr key={s.lib}>
                    <td className="px-4 py-3 font-mono text-brass-300">{s.lib}</td>
                    <td className="px-4 py-3 text-ink-400">{s.license}</td>
                    <td className="px-4 py-3 text-ink-300">{s.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* papers */}
        <section className="mt-16">
          <h2 className="font-serif text-2xl font-bold text-paper-50">From the literature</h2>
          <div className="mt-6 space-y-4">
            {PAPERS.map((p) => (
              <div key={p.tag} className="card-ink rounded-2xl p-6">
                <p className="font-mono text-[11px] uppercase tracking-widest text-brass-300">{p.tag}</p>
                <h3 className="mt-2 font-serif text-lg font-bold text-paper-50">{p.title}</h3>
                <ul className="mt-3 space-y-2">
                  {p.points.map((pt, i) => (
                    <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink-300">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-brass-400" />
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* faq */}
        <section className="mt-16">
          <h2 className="font-serif text-2xl font-bold text-paper-50">Honest questions</h2>
          <div className="mt-6 space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-xl border hairline bg-ink-900/60 px-5 py-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-paper-100 marker:hidden">
                  <span className="mr-2 inline-block text-brass-300 transition group-open:rotate-90">▸</span>
                  {f.q}
                </summary>
                <p className="mt-3 pl-5 text-sm leading-relaxed text-ink-300">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <div className="card-ink mt-16 rounded-2xl p-8 text-center">
          <Lock className="mx-auto size-6 text-brass-300" />
          <h2 className="mt-3 font-serif text-2xl font-bold text-paper-50">
            Convinced? The workshop is open.
          </h2>
          <Link to="/merge-pdf" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brass-400 px-6 py-3 text-sm font-semibold text-ink-950 transition hover:bg-brass-300">
            Open a tool — no signup
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
