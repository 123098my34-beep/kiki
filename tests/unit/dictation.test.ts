import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DictationEngine,
  type DictationEvidence,
} from "../../src/lib/dictation";
import { resolveEngine, type ResolvedEngine } from "../../src/lib/asr";

/**
 * The on-device activity indicator is the load-bearing claim of Murmur, so
 * the evidence it renders is tested at the engine level: `onEvidence` must
 * fire `evidenced: true` exactly once when a session comes up, keep the
 * resolved engine on the payload, and flip back to `false` on stop.
 */

const start = vi.fn(async () => {});
const stopSession = vi.fn();

vi.mock("../../src/lib/asr", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/lib/asr")>();
  return {
    ...actual,
    resolveEngine: (pref: string): ResolvedEngine =>
      pref === "local" || pref === "browser" ? (pref as ResolvedEngine) : actual.resolveEngine(pref as never),
    createSession: (opts: { preference: string }) => ({
      engine: opts.preference === "local" ? "local" : "browser",
      start,
      stop: stopSession,
    }),
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
    expect(engine.evidence).toEqual({ evidenced: false, engine: "local" });
    expect(engine.isRunning).toBe(false);
  });

  it("flips evidence on when the session starts and off when it stops", async () => {
    const seen: DictationEvidence[] = [];
    const engine = new DictationEngine({
      onEvidence: (e) => seen.push(e),
    });

    await engine.start("local");
    expect(engine.isRunning).toBe(true);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toEqual({ evidenced: true, engine: "local" });

    engine.stop();
    expect(engine.isRunning).toBe(false);
    expect(seen).toHaveLength(2);
    expect(seen[1]).toEqual({ evidenced: false, engine: "local" });
  });

  it("labels the badge honestly when the cloud engine is chosen", async () => {
    const seen: DictationEvidence[] = [];
    const engine = new DictationEngine({
      onEvidence: (e) => seen.push(e),
    });

    await engine.start("browser");
    expect(seen[0].engine).toBe("browser");
    expect(seen[0].evidenced).toBe(true);
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
