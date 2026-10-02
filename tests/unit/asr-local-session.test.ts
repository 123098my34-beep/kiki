import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSession,
  __resetLocalPipeline,
  type AsrHandlers,
} from "../../src/lib/asr";

/**
 * The offline session is the default engine and the load-bearing claim of the
 * product, so its audio graph and its status messages are tested here. Two
 * promises live in this file:
 *   - the mic is never routed to the speakers (a howl is not "dictation"), and
 *   - "speak freely" is only said once the model can actually transcribe.
 */

/** gate the fake transformers.js pipeline on, so "cold cache" is testable */
let gate: Promise<void> | null = null;

vi.mock("@huggingface/transformers", () => ({
  pipeline: async () => {
    await gate;
    return () => Promise.resolve({ text: "" });
  },
}));

interface FakeNode {
  kind: string;
  /** only gain nodes carry an AudioParam, matching the real API */
  gain?: { value: number };
  destinations: string[];
  onaudioprocess: ((e: AudioProcessingEvent) => void) | null;
  connect: (n: FakeNode) => FakeNode;
  disconnect: () => void;
}

let nodes: FakeNode[] = [];
let destination!: FakeNode;
let scriptProcessor: FakeNode | undefined;

function makeNode(kind: string): FakeNode {
  const n: FakeNode = {
    kind,
    destinations: [],
    onaudioprocess: null,
    connect: (other) => {
      n.destinations.push(other.kind);
      return other;
    },
    disconnect: () => {
      n.destinations = [];
    },
  };
  nodes.push(n);
  return n;
}

class FakeAudioContext {
  state = "running";
  destination: FakeNode;
  constructor() {
    this.destination = destination;
  }
  async resume() {
    this.state = "running";
  }
  createMediaStreamSource() {
    return makeNode("source");
  }
  createScriptProcessor() {
    scriptProcessor = makeNode("scriptProcessor");
    return scriptProcessor;
  }
  createGain() {
    // a fresh GainNode starts at unity gain
    const n = makeNode("gain");
    n.gain = { value: 1 };
    return n;
  }
  async close() {
    return undefined;
  }
}

const fakeStream = {
  getTracks: () => [{ stop: () => undefined }],
} as unknown as MediaStream;

/** statuses the session reported, in order */
function collectHandlers(): { statuses: string[]; handlers: AsrHandlers } {
  const statuses: string[] = [];
  return {
    statuses,
    handlers: {
      onStatus: (m) => {
        if (m) statuses.push(m);
      },
    },
  };
}

/** drive one block of audio through the ScriptProcessorNode */
function pushAudio(samples: Float32Array): void {
  scriptProcessor!.onaudioprocess!({
    inputBuffer: { getChannelData: () => samples },
  } as unknown as AudioProcessingEvent);
}

const SILENCE = new Float32Array(4096);
const SPEECH = new Float32Array(4096).fill(0.3);
/** a model that never finishes loading — the cold-cache case */
function coldCache(): void {
  gate = new Promise<void>(() => {
    /* never resolves */
  });
}
function warmCache(): void {
  gate = Promise.resolve();
}

beforeEach(() => {
  nodes = [];
  destination = makeNode("destination");
  scriptProcessor = undefined;
  __resetLocalPipeline();
  coldCache();
  vi.stubGlobal("AudioContext", FakeAudioContext);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: async () => fakeStream },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  __resetLocalPipeline();
});

describe("local session — audio graph", () => {
  it("never routes the microphone straight to the speakers", async () => {
    const { handlers } = collectHandlers();
    const session = createSession({ preference: "local", handlers });
    await session.start();

    // ScriptProcessorNode only fires while it reaches a destination, but the
    // destination is the speakers — so it must go through a zeroed gain tap.
    const gains = nodes.filter((n) => n.kind === "gain");
    expect(gains).toHaveLength(1);
    expect(gains[0].gain?.value).toBe(0);

    expect(scriptProcessor!.destinations).toEqual(["gain"]);
    expect(gains[0].destinations).toEqual(["destination"]);

    // Nothing but the muted gain reaches the speakers.
    const intoSpeakers = nodes.filter((n) => n.destinations.includes("destination"));
    expect(intoSpeakers.map((n) => n.kind)).toEqual(["gain"]);

    session.stop();
  });

  it("stops pulling audio once the session stops", async () => {
    const { handlers } = collectHandlers();
    const session = createSession({ preference: "local", handlers });
    await session.start();
    expect(scriptProcessor!.onaudioprocess).toBeTypeOf("function");

    session.stop();
    expect(scriptProcessor!.onaudioprocess).toBeNull();
    // the muted tap is torn down too, so nothing is left wired to the speakers
    expect(scriptProcessor!.destinations).toEqual([]);
  });
});

describe("local session — status honesty", () => {
  it("does not claim the engine is armed before the model exists", async () => {
    coldCache();
    const { statuses, handlers } = collectHandlers();
    const session = createSession({ preference: "local", handlers });
    await session.start();

    const joined = statuses.join(" | ");
    expect(joined).not.toContain("speak freely");
    expect(joined).toContain("Offline model loading");

    session.stop();
  });

  it("says words are kept, not lost, while the model is still loading", async () => {
    coldCache();
    const { statuses, handlers } = collectHandlers();
    const session = createSession({ preference: "local", handlers });
    await session.start();

    pushAudio(SPEECH);
    pushAudio(SPEECH);
    pushAudio(SILENCE);

    const joined = statuses.join(" | ");
    // A user talking through a 40 MB download must not think they were dropped,
    // and must not be told transcription already started.
    expect(joined).toMatch(/keep talking, your words are kept/i);
    expect(joined).not.toMatch(/Transcribing on-device/);
    expect(joined).not.toContain("speak freely");

    session.stop();
  });

  it("says the engine is armed once the pipeline resolves", async () => {
    warmCache();
    const { statuses, handlers } = collectHandlers();
    const session = createSession({ preference: "local", handlers });
    await session.start();

    await vi.waitFor(() => {
      expect(statuses.join(" | ")).toContain("speak freely");
    });

    session.stop();
  });

  it("does not resurrect a stale status after stop", async () => {
    coldCache();
    const { statuses, handlers } = collectHandlers();
    const session = createSession({ preference: "local", handlers });
    await session.start();

    session.stop();

    // the model lands after the user already hit stop
    warmCache();
    const before = statuses.slice();
    await new Promise((r) => setTimeout(r, 20));

    expect(statuses.slice(before.length)).toEqual([]);
    expect(statuses.join(" | ")).not.toContain("speak freely");
  });
});