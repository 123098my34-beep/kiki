import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, Sparkles, Wand2, RotateCcw } from "lucide-react";
import { DictationEngine, type DictationState, type DictationStats } from "../lib/dictation";
import { browserSpeechAvailable } from "../lib/asr";
import { formatOnce } from "../lib/format";

const SAMPLE_UTTERANCE =
  "um so hey team i wanted to uh talk about the q3 roadmap new line " +
  "first off the latency numbers look great comma but we still need to " +
  "tighten the onboarding period scratch that actually the onboarding " +
  "is fine exclamation point";

const SAMPLE_RAW_DISPLAY =
  "um so hey team i wanted to uh talk about the q3 roadmap. new line. " +
  "first off the latency numbers look great comma but we still need to " +
  "tighten the onboarding period. scratch that! actually the onboarding is fine!";

interface DemoStats {
  fillers: number;
  commands: string[];
}

export default function LiveDemo() {
  const engineRef = useRef<DictationEngine | null>(null);
  const [listening, setListening] = useState(false);
  const [state, setState] = useState<DictationState>("idle");
  const [level, setLevel] = useState(0);
  const [partial, setPartial] = useState("");
  const [raw, setRaw] = useState("");
  const [formatted, setFormatted] = useState("");
  const [stats, setStats] = useState<DemoStats>({ fillers: 0, commands: [] });
  const [error, setError] = useState("");
  const [isSample, setIsSample] = useState(false);
  const speechOk = browserSpeechAvailable();

  const stopEngine = useCallback(() => {
    engineRef.current?.stop();
    engineRef.current = null;
    setListening(false);
    setLevel(0);
    setPartial("");
  }, []);

  useEffect(() => () => stopEngine(), [stopEngine]);

  const toggleLive = async () => {
    if (listening) {
      stopEngine();
      return;
    }
    setError("");
    setIsSample(false);
    const engine = new DictationEngine({
      onState: (s) => setState(s),
      onLevel: setLevel,
      onPartial: setPartial,
      onTranscript: (r, f, s: DictationStats) => {
        setRaw(r);
        setFormatted(f);
        setStats({ fillers: s.fillersRemoved, commands: s.commands });
      },
      onError: (m) => {
        setError(m);
        setListening(false);
      },
    });
    engineRef.current = engine;
    await engine.start("browser");
    if (engine.isRunning) setListening(true);
    else engineRef.current = null;
  };

  const runSample = () => {
    stopEngine();
    const res = formatOnce(SAMPLE_UTTERANCE);
    setIsSample(true);
    setRaw(SAMPLE_RAW_DISPLAY);
    setFormatted(res.text);
    setStats({ fillers: res.fillersRemoved, commands: res.commandsUsed });
    setError("");
  };

  const reset = () => {
    stopEngine();
    setIsSample(false);
    setRaw("");
    setFormatted("");
    setStats({ fillers: 0, commands: [] });
    setError("");
  };

  const showOutput = formatted.length > 0 || raw.length > 0;

  return (
    <div className="card-carbon rounded-2xl p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-fog-400">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              listening ? "live-dot bg-signal-400" : "bg-fog-500"
            }`}
          />
          {listening ? (state === "listening" ? "listening" : state) : "formatting engine"}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runSample}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-fog-200 transition hover:border-signal-500/50 hover:text-signal-300"
          >
            <Wand2 className="mr-1.5 inline h-3.5 w-3.5" />
            Run sample
          </button>
          {(raw || formatted) && (
            <button
              onClick={reset}
              aria-label="Clear demo"
              className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-fog-300 transition hover:border-signal-500/50 hover:text-signal-300"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {!showOutput && (
        <div className="mt-5 rounded-xl border border-dashed border-white/10 bg-carbon-900/60 px-5 py-8 text-center">
          <Sparkles className="mx-auto mb-3 h-6 w-6 text-signal-500" />
          <p className="mx-auto max-w-md text-sm leading-relaxed text-fog-300">
            {speechOk
              ? "Hit the mic and speak messy — fillers, no punctuation, voice commands. Murmur cleans it up as you go."
              : "This browser lacks the Web Speech API. Run the sample to see the formatting engine do its trick."}
          </p>
        </div>
      )}

      {showOutput && (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-carbon-950/70 p-4">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-fog-500">
              raw as heard
            </div>
            <p className="min-h-24 whitespace-pre-wrap text-sm leading-relaxed text-fog-400">
              {raw}
              {partial && <span className="text-fog-500 italic"> {partial}…</span>}
            </p>
          </div>
          <div className="rounded-xl border border-signal-500/25 bg-signal-700/5 p-4">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-signal-500">
              murmur output
            </div>
            <p className="min-h-24 whitespace-pre-wrap text-sm leading-relaxed text-fog-50">
              {formatted || <span className="text-fog-500">…</span>}
            </p>
          </div>
        </div>
      )}

      {(stats.fillers > 0 || stats.commands.length > 0) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {stats.fillers > 0 && (
            <span className="rounded-full border border-signal-500/30 bg-signal-700/10 px-2.5 py-1 font-mono text-[11px] text-signal-300">
              −{stats.fillers} filler{stats.fillers > 1 ? "s" : ""}
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

      {error && (
        <p className="mt-4 rounded-lg border border-flare-400/30 bg-flare-400/10 px-3 py-2 text-xs text-flare-400">
          {error}
        </p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={toggleLive}
          disabled={!speechOk && !listening}
          className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition ${
            listening
              ? "bg-red-500/90 text-white hover:bg-red-500"
              : "bg-signal-500 text-carbon-950 hover:bg-signal-400 disabled:cursor-not-allowed disabled:opacity-40"
          }`}
        >
          {listening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {listening ? "Stop" : "Dictate live"}
        </button>

        <div className="flex h-8 flex-1 items-center gap-[3px] overflow-hidden" aria-hidden="true">
          {Array.from({ length: 36 }).map((_, i) => {
            const center = 1 - Math.abs(i - 18) / 18;
            const h = listening ? Math.max(2, level * 30 * (0.3 + center)) : 2 + center * 3;
            return (
              <span
                key={i}
                className="w-[3px] rounded-full bg-signal-500/70 transition-all duration-100"
                style={{ height: `${h}px` }}
              />
            );
          })}
        </div>
        {!speechOk && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-fog-500">
            chrome / edge
          </span>
        )}
      </div>
      {isSample && (
        <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-fog-500">
          sample utterance · same engine as live mode
        </p>
      )}
    </div>
  );
}
