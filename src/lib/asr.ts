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

/* ------------------------------------------------------------------ */
/* Model download progress                                             */
/* ------------------------------------------------------------------ */

/**
 * Cold start pulls ~40 MB of weights. "Downloading" and "processing" are
 * different facts, so progress rides its own channel rather than being
 * squashed into the status string — the Studio badge must be able to say
 * which one is true.
 */
export interface ModelProgress {
  /** bytes fetched so far, across all files of the model */
  loaded: number;
  /** total bytes expected, or 0 while unknown */
  total: number;
  /** 0–100, or null while the total is still unknown */
  percent: number | null;
  /** true once every file has arrived and the pipeline is usable */
  done: boolean;
}

type ProgressListener = (p: ModelProgress) => void;

const progressListeners = new Set<ProgressListener>();
/** per-file byte counts, so parallel downloads aggregate instead of clobbering */
const fileBytes = new Map<string, { loaded: number; total: number }>();
let progressDone = false;

function emitProgress(): void {
  let loaded = 0;
  let total = 0;
  for (const v of fileBytes.values()) {
    loaded += v.loaded;
    total += v.total;
  }
  const snapshot: ModelProgress = {
    loaded,
    total,
    percent: total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : null,
    done: progressDone,
  };
  for (const listener of progressListeners) listener(snapshot);
}

/** Subscribe to download progress. Returns an unsubscribe function. */
export function onModelProgress(listener: ProgressListener): () => void {
  progressListeners.add(listener);
  return () => {
    progressListeners.delete(listener);
  };
}

/** Test seam: drop the memoized pipeline so a fresh download can be simulated. */
export function __resetLocalPipeline(): void {
  pipePromise = null;
  progressDone = false;
  fileBytes.clear();
}

interface TransformersProgressEvent {
  status?: string;
  file?: string;
  loaded?: number;
  total?: number;
  /** aggregate across files, present on `progress_total` */
  files?: Record<string, { loaded: number; total: number }>;
}

/**
 * transformers.js emits several event shapes; the aggregate `progress_total`
 * is authoritative because files download in parallel and per-file events
 * would otherwise clobber each other.
 */
function makeProgressCallback(): (e: TransformersProgressEvent) => void {
  return (e) => {
    switch (e.status) {
      case "ready":
        progressDone = true;
        emitProgress();
        return;
      case "done":
        return; // progress_total already accounts for this file
      case "initiate":
      case "download": {
        const file = e.file ?? "_unknown";
        if (!fileBytes.has(file)) fileBytes.set(file, { loaded: 0, total: e.total ?? 0 });
        emitProgress();
        return;
      }
      case "progress": {
        const file = e.file ?? "_unknown";
        const prev = fileBytes.get(file);
        fileBytes.set(file, { loaded: e.loaded ?? 0, total: e.total ?? prev?.total ?? 0 });
        emitProgress();
        return;
      }
      case "progress_total": {
        fileBytes.clear();
        for (const [file, v] of Object.entries(e.files ?? {})) {
          fileBytes.set(file, { loaded: v.loaded, total: v.total });
        }
        emitProgress();
        return;
      }
      default:
        return;
    }
  };
}

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
            { ...candidate.opts, progress_callback: makeProgressCallback() }
          )) as unknown as AsrPipeline;
          progressDone = true;
          emitProgress();
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
      progressDone = false;
      emitProgress();
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
  /** fires while the one-time model download runs; absent once cached */
  onModelProgress?: (p: ModelProgress) => void;
  /** the model could not be loaded at all — stops the download readout */
  onModelError?: () => void;
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
      const unsubscribe = handlers.onModelProgress
        ? onModelProgress(handlers.onModelProgress)
        : null;
      void getLocalPipeline(handlers.onStatus)
        .catch(() => {
          handlers.onModelError?.();
          /* surfaced on first transcribe */
        })
        .finally(() => {
          unsubscribe?.();
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
