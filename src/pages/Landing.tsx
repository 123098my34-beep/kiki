import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  X,
  Mic,
  Cpu,
  Wand2,
  Download,
  ShieldCheck,
  WifiOff,
  Keyboard,
  Minus,
  Plus,
  Timer,
  Feather,
  Building2,
} from "lucide-react";
import Brand, { Mark } from "../components/Brand";
import SignalWave from "../components/SignalWave";
import LiveDemo from "../components/LiveDemo";
import {
  gumroadConfig,
  gumroadReady,
  isPro,
  upgradeToPro,
  paddleReady,
} from "../lib/billing";

const NAV = [
  { href: "#why", label: "Why" },
  { href: "#demo", label: "Demo" },
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#compare", label: "Compare" },
  { href: "#pricing", label: "Pricing" },
];

const PAINS = [
  {
    icon: Timer,
    title: "You think at 150 wpm. You type at 40.",
    pain: "“The thought is finished by the time my fingers catch up — so I just don't write it down.”",
    answer: "Say it instead. Murmur formats while you talk.",
  },
  {
    icon: Feather,
    title: "Your wrists keep the score",
    pain: "“By 3pm every keystroke is a reminder that I've been typing since breakfast.”",
    answer: "Dictate the work, not just the quick note — core is free, forever.",
  },
  {
    icon: Building2,
    title: "Notes eat your afternoons",
    pain: "“CRM updates, ticket replies, meeting recaps — that's an hour I never budgeted for.”",
    answer: "Voice commands structure it live: paragraphs, punctuation, scratch that.",
  },
  {
    icon: ShieldCheck,
    title: "Some words aren't theirs to read",
    pain: "“Client notes, medical terms, strategy — I'm not shipping that to a vendor's server.”",
    answer: "Offline mode transcribes on your device. After the model download, nothing uploads.",
  },
];

const TRANSPARENCY = [
  {
    icon: ShieldCheck,
    name: "Offline engine (default, free)",
    body: "Audio goes into an ONNX model running in this tab and comes out as text. After the one-time ~40 MB model download, transcription touches the network zero times — the Studio shows a live indicator while it runs, and our E2E suite asserts nothing leaves the page. Airplane mode approved.",
    tag: "nothing leaves",
  },
  {
    icon: Cpu,
    name: "Browser engine (optional)",
    body: "Your browser's built-in speech service does the transcribing — the same one that powers phone dictation. It's a vendor cloud, not ours: we never receive your audio, but your vendor does process it.",
    tag: "fast · online",
  },
  {
    icon: Wand2,
    name: "Formatting & demo",
    body: "Filler removal, voice commands and the sample demo run entirely in JavaScript on your device — including everything on this landing page. “Run sample” makes no network requests.",
    tag: "pure local js",
  },
];

const PIPELINE = [
  {
    icon: Mic,
    title: "Capture",
    body: "Your mic streams into the app at 16 kHz. An adaptive voice-activity detector separates speech from room tone in real time.",
  },
  {
    icon: Cpu,
    title: "Transcribe",
    body: "Hybrid engine: the browser's Web Speech API for instant online dictation, or Whisper-tiny running as ONNX on your device for full privacy. Your call, per session.",
  },
  {
    icon: Wand2,
    title: "Format",
    body: "The part Wispr sells as magic — fillers stripped, punctuation added, voice commands honored. Ours runs on-device, is transparent about what it changed, and is yours to tune.",
  },
  {
    icon: Keyboard,
    title: "Deliver",
    body: "Copy to clipboard in one keystroke. The Studio keeps raw + formatted in sync; the desktop build (soon) injects straight into any app.",
  },
];

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Private by architecture",
    body: "Offline mode transcribes with a model that lives on your machine. No audio upload, no telemetry, no account — because there is no server.",
  },
  {
    icon: WifiOff,
    title: "Works offline",
    body: "Download the open model once (~40 MB) and dictate on a plane, in a SCIF, on a train through a tunnel. Silence is not an error state.",
  },
  {
    icon: Wand2,
    title: "Formatting you can audit",
    body: "Fillers removed, sentences capitalized, voice commands expanded — with chips showing exactly what changed. Raw transcript always kept alongside.",
  },
  {
    icon: Keyboard,
    title: "Voice commands, built in",
    body: "“new paragraph”, “comma”, “question mark”, “scratch that” — dictation that edits, not just transcribes.",
  },
  {
    icon: Cpu,
    title: "Hybrid engine",
    body: "Speed when you're online, sovereignty when it matters. Auto mode picks the best available path and shows which one is live.",
  },
  {
    icon: Download,
    title: "Desktop-ready core",
    body: "The engine is framework-free by design. The same code ships inside the upcoming Tauri desktop app for system-wide dictation.",
  },
];

const COMPARE: Array<{ label: string; murmur: string; wispr: string; good?: boolean }> = [
  {
    label: "Price",
    murmur: "Free core · Pro $8/mo",
    wispr: "Free (capped 2,000 words/wk) · Pro $15/mo",
  },
  { label: "Where audio is processed", murmur: "On-device (offline mode)", wispr: "Cloud" },
  { label: "Account required", murmur: "Never", wispr: "Yes" },
  { label: "Works offline", murmur: "Yes", wispr: "No" },
  { label: "Transparency of edits", murmur: "Raw + formatted side by side", wispr: "Black box" },
  { label: "Voice commands", murmur: "Included", wispr: "Included" },
  { label: "Open-model based", murmur: "Yes (Whisper-class research)", wispr: "No" },
  {
    label: "Platforms",
    murmur: "Web today · desktop license with Pro coming",
    wispr: "Mac, Windows, iOS, Android",
  },
  {
    label: "Meeting notetaker",
    murmur: "Not yet — dictation first",
    wispr: "Included (limited on Free)",
  },
  {
    label: "Independent compliance",
    murmur: "n/a — no accounts, no stored data",
    wispr: "SOC 2 · ISO 27001 · HIPAA-ready",
  },
];

const FAQ = [
  {
    q: "Is the core really free forever?",
    a: "Yes. Murmur's web Studio, offline engine, formatting engine and voice commands are free with no account and no card — offline is the default, so privacy costs you nothing. Pro pays for itself with advanced presets, priority models and the desktop license — and funds development without ads or data.",
  },
  {
    q: "How is this different from Wispr Flow?",
    a: "Three ways: privacy (offline mode never sends audio anywhere), transparency (you always see the raw transcript next to the formatted one, with chips for every change), and price (the core is free). Wispr is a polished cloud product — we're the local-first alternative built on the same open research lineage.",
  },
  {
    q: "Does it actually work without internet?",
    a: "Yes, after a one-time model download (~40 MB). The offline engine is the default: it loads Whisper-tiny via ONNX and transcribes entirely in your browser tab. The Studio shows a live indicator while that processing happens, and our test suite asserts no audio or telemetry request leaves the page. The optional browser engine needs the vendor's online speech service.",
  },
  {
    q: "What about a desktop app?",
    a: "It's the next milestone: the same engine wrapped in Tauri for global hotkey dictation that types into any application. Pro includes the desktop license — no second purchase.",
  },
  {
    q: "If there are no servers, how do you charge for Pro?",
    a: "Marketplaces are the merchant of record: Gumroad (and Paddle) run checkout, taxes and license-key delivery. You paste your key once in the Studio and Pro unlocks on that device. No accounts database, no webhooks, no hosting bill.",
  },
  {
    q: "Can I buy on Gumroad or other marketplaces?",
    a: "Yes — Gumroad is wired first: card checkout, license key emailed to your inbox, tax handled for you. Paste the key in the Studio to activate. Paddle checkout is also wired, and more marketplaces (Lemon Squeezy, FastSpring, desktop app stores) are on the list — your key will unlock them all.",
  },
];

function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${className}`}>
      {children}
    </section>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-signal-500">
      {children}
    </p>
  );
}

function Accordion({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen((o) => !o)}
      className="w-full border-b border-white/8 py-4 text-left transition hover:border-signal-500/30"
      aria-expanded={open}
    >
      <span className="flex items-center justify-between gap-4">
        <span className="font-medium text-fog-100">{q}</span>
        {open ? (
          <Minus className="h-4 w-4 shrink-0 text-signal-500" />
        ) : (
          <Plus className="h-4 w-4 shrink-0 text-fog-400" />
        )}
      </span>
      {open && <span className="mt-2 block max-w-3xl text-sm leading-relaxed text-fog-400">{a}</span>}
    </button>
  );
}

export default function Landing() {
  const [pro, setProState] = useState(isPro());
  const [checkoutNote, setCheckoutNote] = useState("");

  useEffect(() => {
    const handler = () => setProState(isPro());
    window.addEventListener("murmur:pro", handler);
    return () => window.removeEventListener("murmur:pro", handler);
  }, []);

  const onUpgrade = async () => {
    const outcome = await upgradeToPro();
    if (outcome === "opened") {
      setCheckoutNote("");
    } else if (outcome === "unconfigured") {
      setCheckoutNote(
        "Checkout goes live once payment config is added in Settings → Environment " +
          "(VITE_PADDLE_PUBLIC_KEY + VITE_PADDLE_PRICE_ID_PRO, or VITE_GUMROAD_PRODUCT_URL)."
      );
    } else {
      setCheckoutNote("Checkout could not start — check your connection and try again.");
    }
    setProState(isPro());
  };

  return (
    <div className="signal-grain min-h-screen">
      {/* ---------------------------------------------------------------- */}
      {/* Nav                                                               */}
      {/* ---------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 border-b border-white/8 bg-carbon-950/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <Brand />
          <nav className="hidden items-center gap-7 md:flex">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="text-sm text-fog-300 transition-colors hover:text-signal-300"
              >
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {pro && (
              <span className="rounded-full border border-flare-400/40 bg-flare-400/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-flare-400">
                pro
              </span>
            )}
            <Link
              to="/studio"
              className="rounded-xl bg-signal-500 px-4 py-2 text-sm font-semibold text-carbon-950 transition hover:bg-signal-400"
            >
              Open Studio
            </Link>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(47,217,138,0.12),transparent_70%)]" />
        <Section className="relative pb-16 pt-16 sm:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
            <div className="rise">
              <Eyebrow>local-first voice dictation</Eyebrow>
              <h1 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight text-fog-50 sm:text-6xl">
                Speak. It&apos;s already
                <span className="text-signal-400"> typed right</span>.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-fog-300">
                Murmur turns speech into polished text entirely on your device — a hybrid
                transcription engine, formatting that understands what you meant, and a free tier
                that stays free <em className="font-serif not-italic text-signal-300">because there are no servers to pay for</em>.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to="/studio"
                  className="group inline-flex items-center gap-2 rounded-xl bg-signal-500 px-6 py-3.5 text-sm font-semibold text-carbon-950 transition hover:bg-signal-400"
                >
                  Start dictating — free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a
                  href="#demo"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3.5 text-sm font-semibold text-fog-100 transition hover:border-signal-500/60 hover:text-signal-300"
                >
                  <Mic className="h-4 w-4" />
                  See the formatting trick
                </a>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-widest text-fog-500">
                <span>no account</span>
                <span>no telemetry</span>
                <span>open models</span>
                <span>web now · desktop soon</span>
              </div>
            </div>

            <div className="rise" style={{ animationDelay: "120ms" }}>
              <div className="card-carbon relative rounded-2xl p-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-fog-500">
                    signal / live
                  </span>
                  <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-signal-500">
                    <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-signal-400" />
                    on-device
                  </span>
                </div>
                <SignalWave className="h-28 w-full" active bars={48} />
                <div className="mt-5 space-y-3 rounded-xl bg-carbon-950/70 p-4">
                  <div>
                    <div className="mb-1 font-mono text-[9px] uppercase tracking-widest text-fog-500">
                      heard
                    </div>
                    <p className="font-mono text-xs leading-relaxed text-fog-400">
                      um so let&apos;s ship it new line fix the, uh, billing first period
                    </p>
                  </div>
                  <div className="border-t border-white/8 pt-3">
                    <div className="mb-1 font-mono text-[9px] uppercase tracking-widest text-signal-500">
                      murmur
                    </div>
                    <p className="text-sm leading-relaxed text-fog-50">
                      So let&apos;s ship it.
                      <br />
                      Fix the billing first.
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2 font-mono text-[10px]">
                  <span className="rounded-full bg-signal-700/15 px-2 py-0.5 text-signal-300">
                    −2 fillers
                  </span>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-fog-400">⌘ new line</span>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-fog-400">⌘ period</span>
                </div>
              </div>
            </div>
          </div>
        </Section>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Why — customer pains                                              */}
      {/* ---------------------------------------------------------------- */}
      <Section id="why" className="py-16 sm:py-24">
        <Eyebrow>why murmur exists</Eyebrow>
        <h2 className="mb-3 max-w-3xl text-3xl font-bold tracking-tight text-fog-50 sm:text-4xl">
          Dictation tools were built for demos.
          <br />
          Your workday is harder than that.
        </h2>
        <p className="mb-10 max-w-2xl text-fog-300">
          Four things we heard — in the words people actually use — and what Murmur does
          about each one.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          {PAINS.map((p) => (
            <div key={p.title} className="card-carbon flex flex-col rounded-2xl p-6">
              <div className="mb-4 flex items-center gap-3">
                <span className="rounded-lg bg-signal-700/15 p-2">
                  <p.icon className="h-4 w-4 text-signal-400" />
                </span>
                <h3 className="font-semibold text-fog-50">{p.title}</h3>
              </div>
              <p className="font-serif text-[15px] italic leading-relaxed text-fog-300">
                {p.pain}
              </p>
              <p className="mt-4 border-t border-white/8 pt-3 text-sm text-signal-300">
                {p.answer}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      {/* Demo                                                              */}
      {/* ---------------------------------------------------------------- */}
      <Section id="demo" className="py-16 sm:py-24">
        <Eyebrow>try it right here</Eyebrow>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-fog-50 sm:text-4xl">
              Dictate messy. Read clean.
            </h2>
            <p className="mt-3 max-w-2xl text-fog-300">
              Fillers, missing punctuation, verbal commands — the exact inputs that make cloud
              dictation look sloppy. Nothing is sent anywhere in offline mode.
            </p>
          </div>
        </div>
        <LiveDemo />
      </Section>

      {/* ---------------------------------------------------------------- */}
      {/* How it works                                                      */}
      {/* ---------------------------------------------------------------- */}
      <Section id="how" className="py-16 sm:py-24">
        <Eyebrow>how it works</Eyebrow>
        <h2 className="mb-10 max-w-2xl text-3xl font-bold tracking-tight text-fog-50 sm:text-4xl">
          Four stages, zero round trips.
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PIPELINE.map((step, i) => (
            <div key={step.title} className="card-carbon rounded-2xl p-5 transition">
              <div className="mb-4 flex items-center justify-between">
                <step.icon className="h-5 w-5 text-signal-400" />
                <span className="font-mono text-[10px] tracking-widest text-fog-500">
                  0{i + 1}
                </span>
              </div>
              <h3 className="mb-2 font-semibold text-fog-50">{step.title}</h3>
              <p className="text-sm leading-relaxed text-fog-400">{step.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-3xl font-mono text-xs leading-relaxed text-fog-500">
          Built on open research: Whisper (arXiv:2303.13349) and Moonshine-class tiny models
          (arXiv:2410.15005) proved small, fast recognizers are enough for dictation — we run them
          locally instead of renting them from you.
        </p>
      </Section>

      {/* ---------------------------------------------------------------- */}
      {/* Features                                                          */}
      {/* ---------------------------------------------------------------- */}
      <Section id="features" className="py-16 sm:py-24">
        <Eyebrow>what you get</Eyebrow>
        <h2 className="mb-10 max-w-2xl text-3xl font-bold tracking-tight text-fog-50 sm:text-4xl">
          Everything Wispr does. Minus the meter running.
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card-carbon rounded-2xl p-5 transition">
              <f.icon className="mb-4 h-5 w-5 text-signal-400" />
              <h3 className="mb-2 font-semibold text-fog-50">{f.title}</h3>
              <p className="text-sm leading-relaxed text-fog-400">{f.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      {/* Compare                                                           */}
      {/* ---------------------------------------------------------------- */}
      <Section id="compare" className="py-16 sm:py-24">
        <Eyebrow>head to head</Eyebrow>
        <h2 className="mb-8 text-3xl font-bold tracking-tight text-fog-50 sm:text-4xl">
          Against the category leader.
        </h2>
        <div className="card-carbon overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-5 py-4 font-mono text-[10px] uppercase tracking-widest text-fog-500">
                  &nbsp;
                </th>
                <th className="px-5 py-4 font-mono text-[10px] uppercase tracking-widest text-signal-500">
                  murmur
                </th>
                <th className="px-5 py-4 font-mono text-[10px] uppercase tracking-widest text-fog-400">
                  wispr flow
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((row) => (
                <tr key={row.label} className="border-b border-white/6 last:border-0">
                  <td className="px-5 py-3.5 text-fog-400">{row.label}</td>
                  <td className="px-5 py-3.5">
                    <span className="flex items-start gap-2 text-fog-50">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-signal-500" />
                      {row.murmur}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="flex items-start gap-2 text-fog-400">
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-fog-500" />
                      {row.wispr}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-fog-500">
          verified against wisprflow.ai/pricing (oct 2026) · fair comparison, no spin
        </p>
      </Section>

      {/* ---------------------------------------------------------------- */}
      {/* Transparency — where audio goes                                  */}
      {/* ---------------------------------------------------------------- */}
      <Section id="privacy" className="py-16 sm:py-24">
        <Eyebrow>full transparency</Eyebrow>
        <h2 className="mb-3 text-3xl font-bold tracking-tight text-fog-50 sm:text-4xl">
          Where does your audio actually go?
        </h2>
        <p className="mb-10 max-w-2xl text-fog-300">
          The per-engine answer, without the marketing gloss — because “trust us” isn&apos;t an
          answer.
        </p>
        <div className="grid gap-5 md:grid-cols-3">
          {TRANSPARENCY.map((t) => (
            <div key={t.name} className="card-carbon rounded-2xl p-5">
              <div className="mb-3 flex items-center justify-between">
                <t.icon className="h-5 w-5 text-signal-400" />
                <span className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-fog-500">
                  {t.tag}
                </span>
              </div>
              <h3 className="mb-2 font-semibold text-fog-50">{t.name}</h3>
              <p className="text-sm leading-relaxed text-fog-400">{t.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 font-mono text-[11px] uppercase tracking-widest text-fog-500">
          no accounts · no analytics scripts · no cookies beyond your local settings · no server of ours exists
        </p>
      </Section>

      {/* ---------------------------------------------------------------- */}
      {/* Pricing                                                           */}
      {/* ---------------------------------------------------------------- */}
      <Section id="pricing" className="py-16 sm:py-24">
        <Eyebrow>pricing</Eyebrow>
        <h2 className="mb-10 max-w-2xl text-3xl font-bold tracking-tight text-fog-50 sm:text-4xl">
          Free core. Optional Pro. Zero servers either way.
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card-carbon rounded-2xl p-7">
            <div className="mb-1 font-mono text-[11px] uppercase tracking-widest text-fog-400">
              free
            </div>
            <div className="mb-6 flex items-baseline gap-2">
              <span className="text-5xl font-bold text-fog-50">$0</span>
              <span className="text-fog-400">forever</span>
            </div>
            <ul className="mb-8 space-y-3 text-sm text-fog-300">
              {[
                "Unlimited dictation in the Studio",
                "Offline engine as the default — audio never leaves your device",
                "Full formatting engine + voice commands",
                "Raw + formatted transcript side by side",
                "No account, no watermark, no telemetry",
              ].map((item) => (
                <li key={item} className="flex gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-signal-500" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              to="/studio"
              className="block rounded-xl border border-white/15 px-5 py-3 text-center text-sm font-semibold text-fog-100 transition hover:border-signal-500/60 hover:text-signal-300"
            >
              Open the Studio
            </Link>
          </div>

          <div className="card-carbon relative rounded-2xl border-signal-500/30 p-7">
            <div className="absolute -top-3 right-6 rounded-full bg-flare-400 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-carbon-950">
              pro
            </div>
            <div className="mb-1 font-mono text-[11px] uppercase tracking-widest text-flare-400">
              murmur pro
            </div>
            <div className="mb-6 flex items-baseline gap-2">
              <span className="text-5xl font-bold text-fog-50">$8</span>
              <span className="text-fog-400">/ month</span>
              <span className="text-xs text-fog-500">or $79 once</span>
            </div>
            <ul className="mb-8 space-y-3 text-sm text-fog-300">
              {[
                "Everything in Free",
                "Browser engine option for users who want lower latency",
                "Desktop app license (macOS / Windows) when it ships",
                "Advanced formatting presets & custom voice commands",
                "Priority model & feature updates",
              ].map((item) => (
                <li key={item} className="flex gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-flare-400" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={onUpgrade}
              disabled={pro}
              className="block w-full rounded-xl bg-signal-500 px-5 py-3 text-center text-sm font-semibold text-carbon-950 transition hover:bg-signal-400 disabled:cursor-default disabled:bg-signal-700 disabled:text-fog-300"
            >
              {pro ? "You're Pro ✓" : paddleReady() ? "Upgrade with Paddle" : "Go Pro"}
            </button>
            {gumroadReady() && !pro && (
              <a
                href={gumroadConfig.productUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block rounded-xl border border-white/15 px-5 py-3 text-center text-sm font-semibold text-fog-100 transition hover:border-signal-500/60 hover:text-signal-300"
              >
                Buy on Gumroad — key by email
              </a>
            )}
            {checkoutNote && (
              <p className="mt-3 text-xs leading-relaxed text-flare-400">{checkoutNote}</p>
            )}
            <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-widest text-fog-500">
              checkout &amp; tax handled by paddle · card details never touch this app
            </p>
          </div>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      {/* FAQ                                                               */}
      {/* ---------------------------------------------------------------- */}
      <Section id="faq" className="py-16 sm:py-24">
        <Eyebrow>questions</Eyebrow>
        <h2 className="mb-6 text-3xl font-bold tracking-tight text-fog-50 sm:text-4xl">
          Straight answers.
        </h2>
        <div className="max-w-3xl">
          {FAQ.map((item) => (
            <Accordion key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      {/* CTA + Footer                                                      */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-t border-white/8 bg-carbon-900/60">
        <Section className="py-16 text-center sm:py-20">
          <SignalWave className="mx-auto h-16 w-full max-w-lg opacity-70" bars={40} />
          <h2 className="mx-auto mt-6 max-w-2xl text-3xl font-bold tracking-tight text-fog-50 sm:text-4xl">
            Your voice should be yours.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-fog-300">
            Open the Studio and dictate something messy — you&apos;ll see the difference in the
            first ten seconds.
          </p>
          <Link
            to="/studio"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-signal-500 px-7 py-3.5 text-sm font-semibold text-carbon-950 transition hover:bg-signal-400"
          >
            Launch Murmur Studio
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Section>
      </section>

      <footer className="border-t border-white/8">
        <Section className="flex flex-col items-start justify-between gap-6 py-10 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <Mark className="h-6 w-6" />
            <span className="text-sm text-fog-400">
              Murmur — local-first dictation. Built with open models &amp; public research.
            </span>
          </div>
          <div className="flex gap-6 font-mono text-[11px] uppercase tracking-widest text-fog-500">
            <a href="#how" className="transition hover:text-signal-300">
              how it works
            </a>
            <a href="#pricing" className="transition hover:text-signal-300">
              pricing
            </a>
            <Link to="/studio" className="transition hover:text-signal-300">
              studio
            </Link>
          </div>
        </Section>
      </footer>
    </div>
  );
}
