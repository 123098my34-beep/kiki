/**
 * Dictation engine — orchestrates mic, meter, ASR session, evidence and formatting.
 *
 * Evidence: the on-device activity indicator is the deliverable here — each
 * session start/stop toggles `evidenced` (live = local processing is happening
 * right now), and the Studio renders it as a status badge the user can point
 * at. Default engine is OFFLINE (private), so cloud-first is an active choice.
 */

export interface DictationStats {
  fillersRemoved: number;
  commands: string[];
}

export interface DictationEvidence {
  /** live evidence of local processing: true while the session is active */
  evidenced: boolean;
  engine: ResolvedEngine;
  /**
   * The local model is being fetched/compiled and is NOT yet usable. This is
   * distinct from `evidenced`: transformers.js resolves file metadata before
   * emitting its first progress event, so there is a real window where the
   * session is up but no bytes have been reported yet. Claiming "processing"
   * during that window would be a lie, so the badge says "preparing".
   */
  preparing: boolean;
  /** one-time model download in flight; null when idle or already cached */
  progress: ModelProgress | null;
  /** the on-device model this session may load — drives the size readout */
  model?: ModelChoice;
}

export interface DictationCallbacks {
  onState?: (state: DictationState) => void;
  onEngine?: (engine: ResolvedEngine) => void;
  onEvidence?: (evidence: DictationEvidence) => void;
  onModelProgress?: (progress: ModelProgress) => void;
  onLevel?: (level: number) => void;
  onPartial?: (text: string) => void;
  onTranscript?: (raw: string, formatted: string, stats: DictationStats) => void;
  onStatus?: (message: string) => void;
  onError?: (message: string) => void;
}

import {
  createSession,
  resolveEngine,
  type AsrSession,
  type EnginePreference,
  type ModelChoice,
  type ModelProgress,
  type ResolvedEngine,
} from "./asr";
import {
  DEFAULT_FORMAT_OPTIONS,
  formatSpeech,
  type FormatOptions,
} from "./format";
import { clampModel, FREE_ACCESS, type Access } from "./access";

export type DictationState = "idle" | "starting" | "listening" | "error";

export class DictationEngine {
  private session: AsrSession | null = null;
  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private meterTimer: number | null = null;
  private running = false;

  raw = "";
  formatted = "";
  stats: DictationStats = { fillersRemoved: 0, commands: [] };
  evidence: DictationEvidence = {
    evidenced: false,
    engine: "local",
    preparing: false,
    progress: null,
    model: FREE_ACCESS.model,
  };

  constructor(private callbacks: DictationCallbacks = {}) {}

  get isRunning(): boolean {
    return this.running;
  }

  async start(
    preference: EnginePreference,
    formatOpts: FormatOptions = DEFAULT_FORMAT_OPTIONS,
    access: Access = FREE_ACCESS
  ): Promise<void> {
    if (this.running) return;
    this.setState("starting");
    this.callbacks.onStatus?.("Requesting microphone…");

    let engine: ResolvedEngine;
    try {
      // Entitlement decides what the session may use before anything starts —
      // the mic is never opened for a path this license does not cover, and a
      // requested model is clamped to the tier rather than trusted.
      const model = clampModel(access.model, access.tier);
      engine = resolveEngine(preference, access.tier);
      this.callbacks.onEngine?.(engine);
      this.evidence.engine = engine;
      this.evidence.model = model;
      this.evidence.progress = null;
      // A cold offline engine has to fetch ~40 MB before it can transcribe
      // anything. Say so immediately rather than implying it already can.
      this.evidence.preparing = engine === "local";

      // parallel mic meter feed (works for both engines)
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      });
      this.ctx = new AudioContext();
      if (this.ctx.state === "suspended") await this.ctx.resume();
      const src = this.ctx.createMediaStreamSource(this.stream);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      src.connect(this.analyser);
      this.startMeter();

      this.session = createSession({
        preference,
        tier: access.tier,
        model,
        handlers: {
          onPartial: (text) => this.callbacks.onPartial?.(text),
          onFinal: (text) => {
            this.raw = this.raw ? `${this.raw} ${text}` : text;
            const res = formatSpeech(text, this.formatted, formatOpts);
            this.formatted = res.text;
            this.stats.fillersRemoved += res.fillersRemoved;
            for (const c of res.commandsUsed) {
              if (!this.stats.commands.includes(c)) this.stats.commands.push(c);
            }
            this.callbacks.onTranscript?.(this.raw, this.formatted, this.stats);
            this.callbacks.onPartial?.("");
          },
          onStatus: (msg) => this.callbacks.onStatus?.(msg),
          onError: (msg) => this.callbacks.onError?.(msg),
          onModelProgress: (p) => {
            this.evidence.progress = p.done ? null : p;
            if (p.done) this.evidence.preparing = false;
            this.callbacks.onEvidence?.({ ...this.evidence });
            this.callbacks.onModelProgress?.(p);
          },
          onModelError: () => {
            // Never leave the badge claiming a download that has stopped.
            this.evidence.preparing = false;
            this.evidence.progress = null;
            this.callbacks.onEvidence?.({ ...this.evidence });
          },
        },
      });
      await this.session.start();

      this.running = true;
      this.evidence.evidenced = true;
      this.callbacks.onEvidence?.({ ...this.evidence });
      this.setState("listening");
      this.callbacks.onStatus?.(
        engine === "browser"
          ? "Listening — browser engine (fast, online)."
          : "Listening — offline engine (audio never leaves this device)."
      );
    } catch (err) {
      this.teardown();
      const msg =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone blocked — click the camera/lock icon in the address bar, " +
            "set the microphone to “Allow”, then press the mic again."
          : err instanceof DOMException && err.name === "NotFoundError"
            ? "No microphone found — plug one in (or enable your device's mic) and try again."
            : err instanceof Error
              ? err.message
              : String(err);
      this.setState("error");
      this.callbacks.onError?.(msg);
    }
  }

  stop(): void {
    if (!this.running && !this.session) return;
    this.running = false;
    this.session?.stop();
    this.session = null;
    this.evidence.evidenced = false;
    this.evidence.progress = null;
    this.evidence.preparing = false;
    this.callbacks.onEvidence?.({ ...this.evidence });
    this.teardown();
    this.setState("idle");
    this.callbacks.onLevel?.(0);
    this.callbacks.onStatus?.("Stopped.");
  }

  reset(): void {
    this.raw = "";
    this.formatted = "";
    this.stats = { fillersRemoved: 0, commands: [] };
    this.callbacks.onTranscript?.("", "", this.stats);
  }

  private teardown(): void {
    if (this.meterTimer !== null) {
      window.clearInterval(this.meterTimer);
      this.meterTimer = null;
    }
    this.analyser = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }

  private startMeter(): void {
    const analyser = this.analyser;
    if (!analyser) return;
    const buf = new Uint8Array(analyser.fftSize);
    this.meterTimer = window.setInterval(() => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length);
      this.callbacks.onLevel?.(Math.min(1, rms * 4));
    }, 90);
  }

  private setState(state: DictationState): void {
    this.callbacks.onState?.(state);
  }
}
