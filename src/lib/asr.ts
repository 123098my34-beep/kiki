/**
 * Hybrid speech-to-text.
 *
 *  - "browser" : Web Speech API — instant, zero download, engine lives in the
 *                browser vendor's stack (Chrome). Best UX when online.
 *  - "local"   : Whisper-tiny via transformers.js (ONNX, WASM/WebGPU) — runs
 *                fully on-device after a one-time model download. Nothing ever
 *                leaves the machine. Based on open research:
 *                Whisper (arXiv:2303.13349), Moonshine-class tiny models
 *                (arXiv:2410.15005) demonstrate small models are enough for
 *                dictation-grade streaming.
 *
 * Both paths expose the same session interface so the engine layer can treat
 * them interchangeably ("auto" picks browser when available).
 */

import { VoiceActivityDetector } from "./vad";

export type EnginePreference = "auto" | "browser" | "local";
export type ResolvedEngine = "browser" | "local";

/* ------------------------------------------------------------------ */
/* Minimal structural typings for Web Speech (not in TS lib.dom)       */
/* ------------------------------------------------------------------ */

interface SRResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SRResultEventLike {
  resultIndex: number;
  results: { length: number; [i: number]: SRResultLike };
}
interface SRInstanceLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SRResultEventLike) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
interface SRConstructorLike {
  new (): SRInstanceLike;
}

function getSpeechRecognitionCtor(): SRConstructorLike | null {
  const w = window as unknown as Record<string, unknown>;
  const ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as SRConstructorLike | undefined;
  return ctor ?? null;
}

export function browserSpeechAvailable(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

export function resolveEngine(pref: EnginePreference): ResolvedEngine {
  if (pref === "browser") return browserSpeechAvailable() ? "browser" : "local";
  if (pref === "local") return "local";
  return browserSpeechAvailable() ? "browser" : "local";
}

/* ------------------------------------------------------------------ */
/* Local ASR (lazy transformers.js)                                    */
/* ------------------------------------------------------------------ */

interface AsrPipeline {
  (audio: Float32Array, opts?: Record<string, unknown>): Promise<{ text?: string }>;
}

const MODEL_CANDIDATES: Array<{ model: string; opts: Record<string, unknown> }> = [
  { model: "onnx-community/whisper-tiny.en", opts: { dtype: "q8" } },
  { model: "Xenova/whisper-tiny.en", opts: { dtype: "q8" } },
  { model: "Xenova/whisper-tiny.en", opts: { dtype: "quantized" } },
  { model: "Xenova/whisper-tiny.en", opts: {} },
];

let pipePromise: Promise<AsrPipeline> | null = null;

async function getLocalPipeline(onStatus?: (msg: string) => void): Promise<AsrPipeline> {
  if (!pipePromise) {
    onStatus?.("Loading offline speech model (~40 MB, one time)…");
    const run = async (): Promise<AsrPipeline> => {
      const mod = await import("@huggingface/transformers");
      let lastErr: unknown = null;
      for (const candidate of MODEL_CANDIDATES) {
        try {
          const pipe = (await mod.pipeline(
            "automatic-speech-recognition",
            candidate.model,
            candidate.opts
          )) as unknown as AsrPipeline;
          onStatus?.("Offline model ready.");
          return pipe;
        } catch (err) {
          lastErr = err;
        }
      }
      throw lastErr instanceof Error ? lastErr : new Error("offline model unavailable");
    };
    pipePromise = run();
    pipePromise.catch(() => {
      pipePromise = null; // allow retry next time
    });
  }
  return pipePromise;
}

/** Transcribe a 16 kHz mono Float32 clip fully on-device. */
export async function transcribeLocal(
  audio: Float32Array,
  onStatus?: (msg: string) => void
): Promise<string> {
  const pipe = await getLocalPipeline(onStatus);
  const out = await pipe(audio, {
    sampling_rate: 16000,
    chunk_length_s: 15,
    stride_length_s: 3,
  });
  return (out.text ?? "").trim();
}

/* ------------------------------------------------------------------ */
/* Sessions                                                            */
/* ------------------------------------------------------------------ */

export interface AsrHandlers {
  onPartial?: (text: string) => void;
  onFinal?: (text: string) => void;
  onStatus?: (message: string) => void;
  onError?: (message: string) => void;
}

export interface AsrSession {
  engine: ResolvedEngine;
  start(): Promise<void>;
  stop(): void;
}

export interface SessionOptions {
  preference: EnginePreference;
  handlers: AsrHandlers;
}

/* ------------------------------------------------------------------ */
/* Browser session — Web Speech API                                    */
/* ------------------------------------------------------------------ */

function createBrowserSession(handlers: AsrHandlers): AsrSession {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) {
    return {
      engine: "browser",
      async start() {
        handlers.onError?.("Web Speech API not available in this browser.");
      },
      stop() {},
    };
  }

  const rec = new Ctor();
  let shouldRun = false;
  let sawFinal = false;

  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = navigator.language || "en-US";

  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      const text = r[0]?.transcript ?? "";
      if (r.isFinal) {
        const trimmed = text.trim();
        if (trimmed) {
          sawFinal = true;
          handlers.onFinal?.(trimmed);
        }
      } else {
        interim += text;
      }
    }
    if (interim.trim()) handlers.onPartial?.(interim.trim());
    else if (sawFinal) handlers.onPartial?.("");
  };

  rec.onerror = (e) => {
    const err = e.error;
    if (err === "not-allowed" || err === "service-not-allowed") {
      shouldRun = false;
      handlers.onError?.(
        "Microphone blocked — click the camera/lock icon in the address bar, " +
          "set the microphone to “Allow”, then press the mic again."
      );
    } else if (err === "no-speech" || err === "aborted") {
      // harmless; onend will restart
    } else if (err) {
      handlers.onError?.(`Speech service error: ${err}`);
    }
  };

  rec.onend = () => {
    if (shouldRun) {
      try {
        rec.start();
      } catch {
        /* already restarting */
      }
    } else {
      handlers.onPartial?.("");
    }
  };

  return {
    engine: "browser",
    async start() {
      shouldRun = true;
      rec.start();
    },
    stop() {
      shouldRun = false;
      try {
        rec.stop();
      } catch {
        /* noop */
      }
    },
  };
}

/* ------------------------------------------------------------------ */
/* Local session — own mic capture + VAD + whisper                     */
/* ------------------------------------------------------------------ */

function createLocalSession(handlers: AsrHandlers): AsrSession {
  let stream: MediaStream | null = null;
  let ctx: AudioContext | null = null;
  let node: ScriptProcessorNode | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  const vad = new VoiceActivityDetector();
  let running = false;
  let collecting = false;
  let segments: Float32Array[] = [];
  let silenceBlocks = 0;
  let pending: Promise<void> = Promise.resolve();

  const flush = () => {
    if (segments.length === 0) return;
    const total = segments.reduce((n, s) => n + s.length, 0);
    const clip = new Float32Array(total);
    let off = 0;
    for (const s of segments) {
      clip.set(s, off);
      off += s.length;
    }
    segments = [];
    pending = pending
      .then(async () => {
        const text = await transcribeLocal(clip, handlers.onStatus);
        if (text) handlers.onFinal?.(text);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        handlers.onError?.(`Offline model failed to run: ${msg}. Try the Browser engine.`);
      });
  };

  const onAudio = (e: AudioProcessingEvent) => {
    const buf = e.inputBuffer.getChannelData(0);
    const copy = new Float32Array(buf);
    const t = vad.push(copy);

    if (t.began) {
      collecting = true;
      silenceBlocks = 0;
      handlers.onStatus?.("Hearing you — model runs locally…");
    }

    if (collecting) {
      segments.push(copy);
      silenceBlocks = t.speaking || t.level > 0.02 ? 0 : silenceBlocks + 1;
      if (silenceBlocks >= 3 || (!t.speaking && silenceBlocks >= 1)) {
        collecting = false;
        handlers.onStatus?.("Transcribing on-device…");
        flush();
      }
    }
  };

  return {
    engine: "local",
    async start() {
      if (running) return;
      running = true;
      vad.reset();
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      });
      ctx = new AudioContext({ sampleRate: 16000 });
      if (ctx.state === "suspended") await ctx.resume();
      source = ctx.createMediaStreamSource(stream);
      node = ctx.createScriptProcessor(4096, 1, 1);
      node.onaudioprocess = onAudio;
      source.connect(node);
      node.connect(ctx.destination);
      // warm the model in the background so first utterance isn't slow
      void getLocalPipeline(handlers.onStatus).catch(() => {
        /* surfaced on first transcribe */
      });
      handlers.onStatus?.("Offline engine armed — speak freely.");
    },
    stop() {
      running = false;
      collecting = false;
      flush();
      if (node) {
        node.onaudioprocess = null;
        try {
          node.disconnect();
        } catch {
          /* noop */
        }
      }
      node = null;
      source = null;
      stream?.getTracks().forEach((tr) => tr.stop());
      stream = null;
      void ctx?.close().catch(() => undefined);
      ctx = null;
      handlers.onStatus?.("");
      handlers.onPartial?.("");
    },
  };
}

/* ------------------------------------------------------------------ */
/* Factory                                                             */
/* ------------------------------------------------------------------ */

export function createSession(opts: SessionOptions): AsrSession {
  const engine = resolveEngine(opts.preference);
  if (engine === "browser") return createBrowserSession(opts.handlers);
  return createLocalSession(opts.handlers);
}
