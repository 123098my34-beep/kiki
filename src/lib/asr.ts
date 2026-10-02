/**
 * Hybrid speech-to-text.
 *
 *  - "browser" : Web Speech API — instant, zero download, engine lives in the
 *                browser vendor's stack (Chrome). Best UX when online.
 *  - "local"   : Whisper via transformers.js (ONNX, WASM/WebGPU) — runs
 *                fully on-device after a one-time model download. Nothing ever
 *                leaves the machine. Based on open research:
 *                Whisper (arXiv:2303.13349), Moonshine-class tiny models
 *                (arXiv:2410.15005) demonstrate small models are enough for
 *                dictation-grade streaming.
 *
 * Both paths expose the same session interface so the engine layer can treat
 * them interchangeably ("auto" picks browser when available).
 *
 * Tiering (see ./access.ts): the browser engine and the larger Whisper models
 * are Pro. `resolveEngine` and `createSession` clamp whatever the UI asks for
 * against the caller's tier, so a stale preference or a hand-edited local
 * value can never route audio to a vendor or pull a paid model on free.
 */

import { VoiceActivityDetector } from "./vad";
import { clampModel, cloudEngineAllowed, type Tier } from "./access";

export type EnginePreference = "auto" | "browser" | "local";
export type ResolvedEngine = "browser" | "local";

/* ------------------------------------------------------------------ */
/* On-device model tiers — Pro buys accuracy                          */
/* ------------------------------------------------------------------ */

export type ModelChoice = "tiny" | "base" | "small";

export interface ModelOption {
  id: ModelChoice;
  label: string;
  /** approximate one-time download for the quantized weights */
  approxMB: number;
  hint: string;
}

export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "tiny",
    label: "Whisper tiny.en",
    approxMB: 40,
    hint: "fastest · free forever",
  },
  {
    id: "base",
    label: "Whisper base.en",
    approxMB: 80,
    hint: "noticeably better words · pro",
  },
  {
    id: "small",
    label: "Whisper small.en",
    approxMB: 250,
    hint: "best accuracy · pro",
  },
];

export function modelOption(id: ModelChoice): ModelOption {
  return MODEL_OPTIONS.find((m) => m.id === id) ?? MODEL_OPTIONS[0];
}

/** "~40 MB" — the honest, approximate size shown before the fetch starts. */
export function modelSizeLabel(id: ModelChoice): string {
  return `~${modelOption(id).approxMB} MB`;
}

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

/**
 * Resolve the engine a session will actually use.
 *
 * The default tier is "free": asking for the browser engine without a Pro
 * entitlement resolves to the on-device engine instead of leaking audio to a
 * vendor's cloud. Callers pass their real tier.
 */
export function resolveEngine(pref: EnginePreference, tier: Tier = "free"): ResolvedEngine {
  if (pref === "local") return "local";
  if (!cloudEngineAllowed(tier)) return "local";
  if (pref === "browser") return browserSpeechAvailable() ? "browser" : "local";
  return browserSpeechAvailable() ? "browser" : "local";
}

/* ------------------------------------------------------------------ */
/* Local ASR (lazy transformers.js)                                    */
/* ------------------------------------------------------------------ */

interface AsrPipeline {
  (audio: Float32Array, opts?: Record<string, unknown>): Promise<{ text?: string }>;
}

const MODEL_CANDIDATES: Record<
  ModelChoice,
  Array<{ model: string; opts: Record<string, unknown> }>
> = {
  tiny: [
    { model: "onnx-community/whisper-tiny.en", opts: { dtype: "q8" } },
    { model: "Xenova/whisper-tiny.en", opts: { dtype: "q8" } },
    { model: "Xenova/whisper-tiny.en", opts: { dtype: "quantized" } },
    { model: "Xenova/whisper-tiny.en", opts: {} },
  ],
  base: [
    { model: "onnx-community/whisper-base.en", opts: { dtype: "q8" } },
    { model: "Xenova/whisper-base.en", opts: { dtype: "quantized" } },
    { model: "Xenova/whisper-base.en", opts: {} },
  ],
  small: [
    { model: "onnx-community/whisper-small.en", opts: { dtype: "q8" } },
    { model: "Xenova/whisper-small.en", opts: { dtype: "quantized" } },
    { model: "Xenova/whisper-small.en", opts: {} },
  ],
};

/**
 * Candidate repos for a model, always ending with the free tiny.en chain: if a
 * Pro model cannot be fetched, dictation still works instead of hard-failing.
 */
function candidatesFor(id: ModelChoice) {
  return id === "tiny" ? MODEL_CANDIDATES.tiny : [...MODEL_CANDIDATES[id], ...MODEL_CANDIDATES.tiny];
}

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

/**
 * Per-model download state. Keeping this keyed by model matters once Pro can
 * pull base/small: stale byte counts from tiny.en must never be reported as the
 * progress of a 250 MB fetch.
 */
interface ModelState {
  promise: Promise<AsrPipeline> | null;
  /** per-file byte counts, so parallel downloads aggregate instead of clobbering */
  fileBytes: Map<string, { loaded: number; total: number }>;
  done: boolean;
}

const modelStates = new Map<ModelChoice, ModelState>();

function stateFor(id: ModelChoice): ModelState {
  let s = modelStates.get(id);
  if (!s) {
    s = { promise: null, fileBytes: new Map(), done: false };
    modelStates.set(id, s);
  }
  return s;
}

function emitProgress(state: ModelState): void {
  let loaded = 0;
  let total = 0;
  for (const v of state.fileBytes.values()) {
    loaded += v.loaded;
    total += v.total;
  }
  const snapshot: ModelProgress = {
    loaded,
    total,
    percent: total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : null,
    done: state.done,
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

/** Test seam: drop every memoized pipeline so a fresh download can be simulated. */
export function __resetLocalPipeline(id?: ModelChoice): void {
  if (id) {
    modelStates.delete(id);
    return;
  }
  modelStates.clear();
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
function makeProgressCallback(state: ModelState): (e: TransformersProgressEvent) => void {
  return (e) => {
    switch (e.status) {
      case "ready":
        state.done = true;
        emitProgress(state);
        return;
      case "done":
        return; // progress_total already accounts for this file
      case "initiate":
      case "download": {
        const file = e.file ?? "_unknown";
        if (!state.fileBytes.has(file)) {
          state.fileBytes.set(file, { loaded: 0, total: e.total ?? 0 });
        }
        emitProgress(state);
        return;
      }
      case "progress": {
        const file = e.file ?? "_unknown";
        const prev = state.fileBytes.get(file);
        state.fileBytes.set(file, { loaded: e.loaded ?? 0, total: e.total ?? prev?.total ?? 0 });
        emitProgress(state);
        return;
      }
      case "progress_total": {
        state.fileBytes.clear();
        for (const [file, v] of Object.entries(e.files ?? {})) {
          state.fileBytes.set(file, { loaded: v.loaded, total: v.total });
        }
        emitProgress(state);
        return;
      }
      default:
        return;
    }
  };
}

async function getLocalPipeline(
  model: ModelChoice,
  onStatus?: (msg: string) => void
): Promise<AsrPipeline> {
  const state = stateFor(model);
  if (!state.promise) {
    onStatus?.(`Loading ${modelOption(model).label} (${modelSizeLabel(model)}, one time)…`);
    const run = async (): Promise<AsrPipeline> => {
      const mod = await import("@huggingface/transformers");
      let lastErr: unknown = null;
      for (const candidate of candidatesFor(model)) {
        try {
          const pipe = (await mod.pipeline(
            "automatic-speech-recognition",
            candidate.model,
            { ...candidate.opts, progress_callback: makeProgressCallback(state) }
          )) as unknown as AsrPipeline;
          state.done = true;
          emitProgress(state);
          onStatus?.("Offline model ready.");
          return pipe;
        } catch (err) {
          lastErr = err;
        }
      }
      throw lastErr instanceof Error ? lastErr : new Error("offline model unavailable");
    };
    state.promise = run();
    state.promise.catch(() => {
      state.promise = null; // allow retry next time
      state.done = false;
      emitProgress(state);
    });
  }
  return state.promise;
}

/** Transcribe a 16 kHz mono Float32 clip fully on-device with `model`. */
export async function transcribeLocal(
  audio: Float32Array,
  onStatus?: (msg: string) => void,
  model: ModelChoice = "tiny"
): Promise<string> {
  const pipe = await getLocalPipeline(model, onStatus);
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
  /** entitlement tier; drives the cloud-engine gate and the model clamp */
  tier?: Tier;
  /** requested on-device model; clamped to what `tier` allows */
  model?: ModelChoice;
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

function createLocalSession(handlers: AsrHandlers, model: ModelChoice): AsrSession {
  let stream: MediaStream | null = null;
  let ctx: AudioContext | null = null;
  let node: ScriptProcessorNode | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let mute: GainNode | null = null;
  const vad = new VoiceActivityDetector();
  let running = false;
  let collecting = false;
  let modelReady = false;
  let segments: Float32Array[] = [];
  let silenceBlocks = 0;
  let pending: Promise<void> = Promise.resolve();

  /**
   * "Speak freely" is only true once the pipeline can actually transcribe. On a
   * cold cache that is ~40 MB away, and the microphone keeps capturing through
   * it, so the honest message is that words are being kept, not lost.
   */
  const announceReady = (msg: string) => {
    if (!running) return;
    if (modelReady) handlers.onStatus?.(msg);
    else handlers.onStatus?.("Offline model loading — keep talking, your words are kept.");
  };

  /**
   * Model status must not outlive the session: a pipeline that resolves after
   * stop() would otherwise overwrite the user's "Stopped." with a stale
   * "Offline model ready."
   */
  const pipelineStatus = (msg: string) => {
    if (running) handlers.onStatus?.(msg);
  };

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
        const text = await transcribeLocal(clip, pipelineStatus, model);
        if (text) handlers.onFinal?.(text);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        handlers.onError?.(
          `Offline model failed to run: ${msg}. Unlock Pro to use the browser engine instead.`
        );
      });
  };

  const onAudio = (e: AudioProcessingEvent) => {
    const buf = e.inputBuffer.getChannelData(0);
    const copy = new Float32Array(buf);
    const t = vad.push(copy);
    if (t.began) {
      collecting = true;
      silenceBlocks = 0;
      announceReady("Hearing you — model runs locally…");
    }

    if (collecting) {
      segments.push(copy);
      silenceBlocks = t.speaking || t.level > 0.02 ? 0 : silenceBlocks + 1;
      if (silenceBlocks >= 3 || (!t.speaking && silenceBlocks >= 1)) {
        collecting = false;
        announceReady("Transcribing on-device…");
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
      // ScriptProcessorNode only fires while it reaches a destination, but the
      // destination is the speakers — wiring the raw mic there plays the user's
      // own voice back and howls on any machine not on a headset. Tap it through
      // a zeroed gain instead: keeps the node alive, emits nothing.
      mute = ctx.createGain();
      mute.gain.value = 0;
      source.connect(node);
      node.connect(mute);
      mute.connect(ctx.destination);
      // warm the model in the background so first utterance isn't slow
      const unsubscribe = handlers.onModelProgress
        ? onModelProgress(handlers.onModelProgress)
        : null;
      void getLocalPipeline(model, pipelineStatus)
        .then(() => {
          modelReady = true;
          announceReady("Offline engine armed — speak freely.");
        })
        .catch(() => {
          modelReady = false;
          handlers.onStatus?.(
            "Offline model unavailable — check your connection. Pro also unlocks the browser engine."
          );
          handlers.onModelError?.();
          /* surfaced again on first transcribe */
        })
        .finally(() => {
          unsubscribe?.();
        });
      // Cold cache: the model is not here yet, so do not claim it is.
      if (!modelReady) {
        handlers.onStatus?.("Offline model loading — keep talking, your words are kept.");
      }
    },
    stop() {
      running = false;
      collecting = false;
      modelReady = false;
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
      if (mute) {
        try {
          mute.disconnect();
        } catch {
          /* noop */
        }
      }
      mute = null;
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
  const tier: Tier = opts.tier ?? "free";
  // Clamp first: a stale stored preference must not buy a paid model, and a
  // Pro-less caller must not reach the vendor engine by passing "browser".
  const model = clampModel(opts.model, tier);
  const engine = resolveEngine(opts.preference, tier);
  if (engine === "browser") return createBrowserSession(opts.handlers);
  return createLocalSession(opts.handlers, model);
}
