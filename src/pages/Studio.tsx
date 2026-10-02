import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  Lightbulb,
  Mic,
  RotateCcw,
  Sparkles,
  Square,
  Trash2,
  WifiOff,
  X,
} from "lucide-react";
import Brand from "../components/Brand";
import SignalWave from "../components/SignalWave";
import {
  DictationEngine,
  type DictationState,
  type DictationStats,
  type DictationEvidence,
} from "../lib/dictation";
import {
  browserSpeechAvailable,
  type EnginePreference,
} from "../lib/asr";
import { DEFAULT_FORMAT_OPTIONS, VOICE_COMMANDS, wordCount } from "../lib/format";
import {
  activateLicense,
  gumroadConfig,
  gumroadReady,
  isPro,
  upgradeToPro,
  paddleReady,
} from "../lib/billing";

type ToggleKey = "removeFillers" | "applyCommands" | "autoPunctuate";

const TOGGLES: Array<{ key: ToggleKey; label: string; hint: string }> = [
  { key: "removeFillers", label: "Strip fillers", hint: "um, uh, er, hmm" },
  { key: "applyCommands", label: "Voice commands", hint: "new paragraph, comma, scratch that" },
  { key: "autoPunctuate", label: "Auto punctuation", hint: "caps & periods you didn't say" },
];

const ENGINE_LABEL: Record<EnginePreference, string> = {
  auto: "Auto — fastest available",
  browser: "Browser — fast, online",
  local: "Offline — on-device, private",
};

/** Human-readable byte size for the one-time model download readout. */
function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Studio() {
  const [listening, setListening] = useState(false);
  const [state, setState] = useState<DictationState>("idle");
  const [evidence, setEvidence] = useState<DictationEvidence>({
    evidenced: false,
    engine: "local",
    preparing: false,
    progress: null,
  });
  const [preference, setPreference] = useState<EnginePreference>("local");
  const [level, setLevel] = useState(0);
  const [partial, setPartial] = useState("");
  const [raw, setRaw] = useState("");
  const [formatted, setFormatted] = useState("");
  const [stats, setStats] = useState<DictationStats>({ fillersRemoved: 0, commands: [] });
  const [status, setStatus] = useState("Ready when you are.");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pro, setProState] = useState(isPro());
  const [checkoutNote, setCheckoutNote] = useState("");
  const [licenseInput, setLicenseInput] = useState("");
  const [licenseMsg, setLicenseMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [coachOpen, setCoachOpen] = useState(() => {
    try {
      return localStorage.getItem("murmur.coach.v1") !== "done";
    } catch {
      return true;
    }
  });

  const dismissCoach = () => {
    setCoachOpen(false);
    try {
      localStorage.setItem("murmur.coach.v1", "done");
    } catch {
      /* private mode — coach simply returns next visit */
    }
  };

  const engineRef = useRef<DictationEngine | null>(null);
  const fmtRef = useRef({ ...DEFAULT_FORMAT_OPTIONS });
  const [fmtUi, setFmtUi] = useState({ ...DEFAULT_FORMAT_OPTIONS });

  const speechOk = browserSpeechAvailable();

  useEffect(() => {
    const handler = () => setProState(isPro());
    window.addEventListener("murmur:pro", handler);
    return () => window.removeEventListener("murmur:pro", handler);
  }, []);

  const stop = useCallback(() => {
    engineRef.current?.stop();
    engineRef.current = null;
    setListening(false);
    setLevel(0);
    setPartial("");
  }, []);

  useEffect(() => () => stop(), [stop]);

  const toggleListen = async () => {
    if (listening) {
      stop();
      return;
    }
    setError("");
    const engine = new DictationEngine({
      onState: setState,
      onLevel: setLevel,
      onPartial: setPartial,
      onStatus: setStatus,
      onEvidence: setEvidence,
      onTranscript: (r, f, s) => {
        setRaw(r);
        setFormatted(f);
        setStats({ fillersRemoved: s.fillersRemoved, commands: s.commands });
      },
      onError: (m) => {
        setError(m);
        setListening(false);
      },
    });
    engineRef.current = engine;
    await engine.start(preference, fmtRef.current);
    if (engine.isRunning) {
      setListening(true);
    } else {
      engineRef.current = null;
    }
  };

  const copyOut = async () => {
    if (!formatted) return;
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Clipboard blocked by the browser — select and copy manually.");
    }
  };

  const clearAll = () => {
    engineRef.current?.reset();
    setRaw("");
    setFormatted("");
    setStats({ fillersRemoved: 0, commands: [] });
    setError("");
    setStatus("Cleared.");
  };

  const pickEngine = (pref: EnginePreference) => {
    if (listening) stop();
    setPreference(pref);
  };

  const onActivate = () => {
    const result = activateLicense(licenseInput);
    setLicenseMsg({ ok: result.ok, text: result.message });
    if (result.ok) setLicenseInput("");
  };

  const onUpgrade = async () => {
    const outcome = await upgradeToPro();
    if (outcome === "unconfigured") {
      setCheckoutNote("Checkout goes live once payment keys are added in Settings → Environment.");
    } else if (outcome === "failed") {
      setCheckoutNote("Checkout could not start — check your connection.");
    } else {
      setCheckoutNote("");
    }
  };

  const setToggle = (key: ToggleKey, value: boolean) => {
    // mutate in place: the running engine captured this exact object
    fmtRef.current[key] = value;
    setFmtUi((s) => ({ ...s, [key]: value }));
  };

  return (
    <div className="signal-grain min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-carbon-950/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-5">
            <Brand compact />
            <Link
              to="/"
              className="hidden items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-fog-500 transition hover:text-signal-300 sm:flex"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              home
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {pro ? (
              <span className="rounded-full border border-flare-400/40 bg-flare-400/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-flare-400">
                pro
              </span>
            ) : (
              <button
                onClick={onUpgrade}
                className="rounded-full border border-white/15 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-fog-300 transition hover:border-flare-400/60 hover:text-flare-400"
              >
                go pro
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-8 sm:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-fog-50">Dictation Studio</h1>
          <p className="mt-1 text-sm text-fog-400">
            Raw transcript and Murmur output stay side by side — every edit is visible.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          {/* ------------------------------------------------ stage controls */}
          <div className="space-y-5">
            <div className="card-carbon rounded-2xl p-5">
              <button
                onClick={toggleListen}
                className={`mx-auto flex h-28 w-28 items-center justify-center rounded-full transition-all ${
                  listening
                    ? "bg-red-500/90 text-white shadow-[0_0_50px_-8px_rgba(239,68,68,0.7)]"
                    : "bg-signal-500 text-carbon-950 hover:scale-105 hover:bg-signal-400"
                }`}
                aria-label={listening ? "Stop dictation" : "Start dictation"}
              >
                {listening ? (
                  <Square className="h-9 w-9" />
                ) : (
                  <Mic className="h-10 w-10" />
                )}
              </button>

              <SignalWave
                className="mt-5 h-12 w-full"
                active={listening}
                level={level}
                bars={32}
              />

              <p className="mt-3 text-center font-mono text-[11px] text-fog-400">
                {listening ? status : "press to dictate"}
              </p>
              {partial && (
                <p className="mt-2 text-center text-xs italic text-fog-500">“{partial}…”</p>
              )}

              {/* On-device activity evidence badge */}
              <div
                data-testid="evidence-badge"
                className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-carbon-950/60 px-4 py-3"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`relative flex h-2.5 w-2.5 shrink-0 rounded-full ${
                      evidence.progress || evidence.preparing
                        ? "bg-flare-400"
                        : evidence.evidenced
                          ? "bg-signal-400"
                          : "bg-fog-500"
                    }`}
                  >
                    {(evidence.evidenced || evidence.progress || evidence.preparing) && (
                      <span className="absolute h-full w-full animate-ping rounded-full bg-current opacity-40" />
                    )}
                  </span>
                  <span
                    className={`font-mono text-xs uppercase tracking-widest ${
                      evidence.progress || evidence.preparing
                        ? "text-flare-400"
                        : evidence.evidenced
                          ? "text-signal-300"
                          : "text-fog-500"
                    }`}
                  >
                    {evidence.progress
                      ? evidence.progress.percent !== null
                        ? `downloading model · ${evidence.progress.percent}%`
                        : "downloading model"
                      : evidence.preparing
                        ? "preparing local model"
                        : evidence.evidenced
                          ? "local processing active"
                          : "engine idle"}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-fog-400">
                  {evidence.progress ? (
                    <span data-testid="evidence-progress-detail">
                      {formatBytes(evidence.progress.loaded)}
                      {evidence.progress.total > 0
                        ? ` / ${formatBytes(evidence.progress.total)}`
                        : ""}{" "}
                      · one time
                    </span>
                  ) : evidence.preparing ? (
                    <span data-testid="evidence-progress-detail">~40 MB · one time</span>
                  ) : evidence.engine === "local" ? (
                    "local · no data leaves this browser"
                  ) : (
                    "online · cloud engine"
                  )}
                </span>
              </div>
            </div>

            <div className="card-carbon rounded-2xl p-5">
              <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-fog-500">
                engine
              </div>
              <div className="space-y-2">
                {(["local", "browser", "auto"] as EnginePreference[]).map((pref) => {
                  const active = preference === pref;
                  return (
                    <button
                      key={pref}
                      onClick={() => pickEngine(pref)}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                        active
                          ? "border-signal-500/60 bg-signal-700/10 text-fog-50"
                          : "border-white/8 text-fog-300 hover:border-white/20"
                      }`}
                    >
                      <span>{ENGINE_LABEL[pref]}</span>
                      {pref === "local" && (
                        <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-signal-500">
                          <WifiOff className="h-3 w-3" />
                          default · ~40 mb
                        </span>
                      )}
                      {pref === "browser" && !speechOk && (
                        <span className="font-mono text-[9px] uppercase tracking-widest text-fog-500">
                          n/a
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 rounded-lg border border-signal-500/20 bg-signal-700/5 p-3">
                <p className="text-xs leading-relaxed text-fog-300">
                  <WifiOff className="mr-1.5 inline h-3.5 w-3.5 text-signal-400" />
                  Offline is the default and always free — the model downloads once (~40 MB),
                  then your audio never leaves this device. Pro adds the browser engine's speed,
                  unlimited words and voice commands everywhere.
                </p>
                {!pro && (
                  <button
                    onClick={onUpgrade}
                    className="mt-2 w-full rounded-lg bg-flare-400 px-3 py-1.5 text-xs font-semibold text-carbon-950 transition hover:bg-flare-500"
                  >
                    {paddleReady() ? "Unlock Pro" : "See Pro"}
                  </button>
                )}
                {checkoutNote && (
                  <p className="mt-2 text-[11px] leading-snug text-flare-400">{checkoutNote}</p>
                )}
              </div>
            </div>

            <div className="card-carbon rounded-2xl p-5">
              <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-fog-500">
                formatting
              </div>
              <div className="space-y-3">
                {TOGGLES.map((t) => (
                  <label
                    key={t.key}
                    className="flex cursor-pointer items-start justify-between gap-3"
                  >
                    <span>
                      <span className="block text-sm text-fog-200">{t.label}</span>
                      <span className="block font-mono text-[10px] text-fog-500">{t.hint}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={fmtUi[t.key]}
                      onChange={(e) => setToggle(t.key, e.target.checked)}
                      className="sr-only"
                    />
                    <span
                      className={`relative mt-1 h-5 w-9 shrink-0 rounded-full transition-colors ${
                        fmtUi[t.key] ? "bg-signal-600" : "bg-carbon-600"
                      }`}
                    >
                      <span
                        className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-fog-100 transition-transform ${
                          fmtUi[t.key] ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {!pro && (
              <div className="card-carbon rounded-2xl p-5">
                <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-fog-500">
                  have a license key?
                </div>
                <div className="flex gap-2">
                  <input
                    value={licenseInput}
                    onChange={(e) => setLicenseInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onActivate();
                    }}
                    aria-label="License key"
                    placeholder="paste your Gumroad key"
                    className="min-w-0 flex-1 rounded-lg border border-white/10 bg-carbon-950 px-3 py-2 font-mono text-xs text-fog-100 placeholder:text-fog-500 focus:border-signal-500 focus:outline-none"
                  />
                  <button
                    onClick={onActivate}
                    className="shrink-0 rounded-lg bg-signal-500 px-4 py-2 text-xs font-semibold text-carbon-950 transition hover:bg-signal-400"
                  >
                    Activate
                  </button>
                </div>
                {licenseMsg && (
                  <p
                    className={`mt-2 text-xs ${licenseMsg.ok ? "text-signal-300" : "text-flare-400"}`}
                  >
                    {licenseMsg.text}
                  </p>
                )}
                <p className="mt-2 font-mono text-[10px] leading-relaxed uppercase tracking-widest text-fog-500">
                  keys arrive by email with your receipt · stored on this device only
                </p>
                {gumroadReady() && (
                  <a
                    href={gumroadConfig.productUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-signal-300 transition hover:text-signal-400"
                  >
                    Need a key? Buy on Gumroad →
                  </a>
                )}
              </div>
            )}

            <details className="card-carbon group rounded-2xl p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between font-mono text-[10px] uppercase tracking-widest text-fog-500">
                <span>voice commands cheat sheet</span>
                <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
              </summary>
              <ul className="mt-4 space-y-2.5">
                {VOICE_COMMANDS.map((c) => (
                  <li key={c.phrase} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <code className="rounded bg-white/5 px-2 py-0.5 font-mono text-xs text-signal-300">
                      “{c.phrase}”
                    </code>
                    <span className="text-xs text-fog-400">{c.effect}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-fog-500">
                honored in both engines · toggle them off under formatting
              </p>
            </details>
          </div>

          {/* ------------------------------------------------ transcript area */}
          <div className="space-y-5">
            {coachOpen && !raw && (
              <div className="rounded-2xl border border-signal-500/30 bg-signal-700/5 p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-signal-500">
                    <Lightbulb className="h-3.5 w-3.5" />
                    first time? try these three
                  </span>
                  <button
                    onClick={dismissCoach}
                    aria-label="Dismiss tips"
                    className="rounded-md p-1 text-fog-500 transition hover:text-fog-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <ol className="space-y-2.5 text-sm leading-relaxed text-fog-300">
                  <li>
                    <span className="font-semibold text-fog-100">1. Ramble on purpose.</span>{" "}
                    Press the mic and say <em>“um so basically we should ship it”</em> — watch
                    the fillers and punctuation clean themselves up.
                  </li>
                  <li>
                    <span className="font-semibold text-fog-100">2. Talk like an editor.</span>{" "}
                    Say <em>“new paragraph”</em>, <em>“comma”</em>, or{" "}
                    <em>“question mark”</em> mid-sentence.
                  </li>
                  <li>
                    <span className="font-semibold text-fog-100">3. Fix a bad take.</span> Fluff a
                    sentence? Say <em>“scratch that”</em> and keep going — the last sentence
                    disappears.
                  </li>
                </ol>
                <p className="mt-3 border-t border-signal-500/20 pt-3 font-mono text-[10px] leading-relaxed uppercase tracking-widest text-fog-500">
                  privacy: offline mode never uploads · browser mode uses your browser&apos;s own
                  speech service · we run no servers
                </p>
              </div>
            )}

            <div className="card-carbon rounded-2xl p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-fog-500">
                  raw as heard
                </span>
                <span className="font-mono text-[10px] text-fog-500">
                  {wordCount(raw)} words
                </span>
              </div>
              <p className="min-h-20 whitespace-pre-wrap rounded-lg bg-carbon-950/70 p-4 text-sm leading-relaxed text-fog-400">
                {raw || <span className="text-fog-500">Nothing yet — press the mic.</span>}
              </p>
            </div>

            <div className="card-carbon rounded-2xl border-signal-500/25 p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-signal-500">
                  <Sparkles className="h-3.5 w-3.5" />
                  murmur output
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-fog-500">
                    {wordCount(formatted)} words
                  </span>
                  {raw && (
                    <button
                      onClick={clearAll}
                      aria-label="Clear transcript"
                      className="rounded-lg border border-white/10 p-1.5 text-fog-400 transition hover:border-white/25 hover:text-fog-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={copyOut}
                    disabled={!formatted}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-signal-500 px-3 py-1.5 text-xs font-semibold text-carbon-950 transition hover:bg-signal-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
              <div className="min-h-32 whitespace-pre-wrap rounded-lg border border-signal-500/20 bg-signal-700/5 p-4 text-sm leading-relaxed text-fog-50">
                {formatted || (
                  <span className="text-fog-500">
                    Your polished transcript lands here — fillers gone, commands expanded,
                    punctuation sorted.
                  </span>
                )}
              </div>

              {(stats.fillersRemoved > 0 || stats.commands.length > 0) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {stats.fillersRemoved > 0 && (
                    <span className="rounded-full border border-signal-500/30 bg-signal-700/10 px-2.5 py-1 font-mono text-[11px] text-signal-300">
                      −{stats.fillersRemoved} filler{stats.fillersRemoved > 1 ? "s" : ""}
                    </span>
                  )}
                  {stats.commands.map((c) => (
                    <span
                      key={c}
                      className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[11px] text-fog-300"
                    >
                      ⌘ {c}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <p className="rounded-xl border border-flare-400/30 bg-flare-400/10 px-4 py-3 text-sm text-flare-400">
                {error}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-carbon-900/60 px-4 py-3">
              <span className="font-mono text-[10px] uppercase tracking-widest text-fog-500">
                session: {state} · engine: {preference}
                {listening && <span className="text-signal-500"> · live</span>}
              </span>
              <button
                onClick={stop}
                disabled={!listening}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-fog-300 transition hover:border-white/25 disabled:opacity-40"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Stop engine
              </button>
            </div>

            <p className="font-mono text-[10px] leading-relaxed uppercase tracking-widest text-fog-500">
              desktop build (global hotkey + type-into-any-app) ships next · same engine, same
              license
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
