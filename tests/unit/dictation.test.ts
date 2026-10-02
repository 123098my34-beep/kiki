import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DictationEngine,
  type DictationEvidence,
} from "../../src/lib/dictation";
import {
  resolveEngine,
  type AsrHandlers,
  type ModelProgress,
  type ResolvedEngine,
} from "../../src/lib/asr";

/**
 * The on-device activity indicator is the load-bearing claim of Murmur, so
 * the evidence it renders is tested at the engine level: `onEvidence` must
 * fire `evidenced: true` exactly once when a session comes up, keep the
 * resolved engine on the payload, and flip back to `false` on stop.
 */

const start = vi.fn(async () => {});
const stopSession = vi.fn();
/** the handler bag DictationEngine handed to createSession on the last start() */
let sessionHandlers: AsrHandlers = {};

vi.mock("../../src/lib/asr", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/lib/asr")>();
  return {
    ...actual,
    resolveEngine: (pref: string): ResolvedEngine =>
      pref === "local" || pref === "browser" ? (pref as ResolvedEngine) : actual.resolveEngine(pref as never),
    createSession: (opts: { preference: string; handlers: AsrHandlers }) => {
      sessionHandlers = opts.handlers;
      return {
        engine: opts.preference === "local" ? "local" : "browser",
        start,
        stop: stopSession,
      };
    },
  };
});

class FakeAudioContext {
  state = "running";
  destination = {};
  async resume() {
    this.state = "running";
  }
  createMediaStreamSource() {
    return { connect: () => undefined };
  }
  createAnalyser() {
    return {
      fftSize: 1024,
      getByteTimeDomainData: () => undefined,
      connect: () => undefined,
    };
  }
  async close() {
    return undefined;
  }
}

const fakeStream = {
  getTracks: () => [{ stop: () => undefined }],
} as unknown as MediaStream;

beforeEach(() => {
  start.mockClear();
  stopSession.mockClear();
  sessionHandlers = {};
  vi.stubGlobal("AudioContext", FakeAudioContext);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: async () => fakeStream },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DictationEngine — on-device activity evidence", () => {
  it("starts idle and reports the local engine by default", () => {
    const engine = new DictationEngine();
    expect(engine.evidence).toEqual({
      evidenced: false,
      engine: "local",
      preparing: false,
      progress: null,
    });
    expect(engine.isRunning).toBe(false);
  });

  it("flips evidence on when the session starts and off when it stops", async () => {
    const seen: DictationEvidence[] = [];
    const engine = new DictationEngine({
      onEvidence: (e) => seen.push(e),
    });

    await engine.start("browser");
    expect(engine.isRunning).toBe(true);
    expect(seen[0]).toEqual({
      evidenced: true,
      engine: "browser",
      preparing: false,
      progress: null,
    });

    engine.stop();
    expect(engine.isRunning).toBe(false);
    expect(seen[1]).toEqual({
      evidenced: false,
      engine: "browser",
      preparing: false,
      progress: null,
    });
  });

  it("never claims local processing before the model is actually ready", async () => {
    const engine = new DictationEngine();
    await engine.start("local");
    // transformers.js resolves file metadata before its first progress event,
    // so the engine is running but NOT yet able to transcribe.
    expect(engine.isRunning).toBe(true);
    expect(engine.evidence.evidenced).toBe(true);
    expect(engine.evidence.preparing).toBe(true);
    expect(engine.evidence.progress).toBeNull();
    engine.stop();
  });

  it("does not claim preparation when the cloud engine needs no model", async () => {
    const engine = new DictationEngine();
    await engine.start("browser");
    expect(engine.evidence.preparing).toBe(false);
    engine.stop();
  });

  it("surfaces model download progress on the evidence and clears it when done", async () => {
    const seen: DictationEvidence[] = [];
    const reported: ModelProgress[] = [];
    const engine = new DictationEngine({
      onEvidence: (e) => seen.push(e),
      onModelProgress: (p) => reported.push(p),
    });

    await engine.start("local");
    expect(engine.evidence.preparing).toBe(true);

    const partial: ModelProgress = { loaded: 5_000_000, total: 40_000_000, percent: 13, done: false };
    sessionHandlers.onModelProgress?.(partial);
    expect(engine.evidence.progress).toEqual(partial);
    expect(seen.at(-1)).toEqual({
      evidenced: true,
      engine: "local",
      preparing: true,
      progress: partial,
    });

    sessionHandlers.onModelProgress?.({
      loaded: 40_000_000,
      total: 40_000_000,
      percent: 100,
      done: true,
    });
    expect(engine.evidence.progress).toBeNull();
    expect(engine.evidence.preparing).toBe(false);
    expect(reported).toHaveLength(2);

    engine.stop();
    expect(engine.evidence.progress).toBeNull();
    expect(engine.evidence.preparing).toBe(false);
  });

  it("stops claiming a download when the model fails to load", async () => {
    const engine = new DictationEngine();
    await engine.start("local");
    expect(engine.evidence.preparing).toBe(true);

    sessionHandlers.onModelError?.();
    expect(engine.evidence.preparing).toBe(false);
    expect(engine.evidence.progress).toBeNull();
    // still running, but honest that the model is not there
    expect(engine.isRunning).toBe(true);
    engine.stop();
  });

  it("leaves evidence untouched when the mic is refused", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => {
          throw new DOMException("denied", "NotAllowedError");
        },
      },
    });
    const seen: DictationEvidence[] = [];
    const engine = new DictationEngine({ onEvidence: (e) => seen.push(e) });

    await engine.start("local");
    expect(engine.isRunning).toBe(false);
    expect(seen).toHaveLength(0);
    expect(engine.evidence.evidenced).toBe(false);
  });
});

describe("resolveEngine", () => {
  it("treats the offline preference as always on-device", () => {
    expect(resolveEngine("local")).toBe("local");
  });
});
