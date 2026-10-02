import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Studio from "../../src/pages/Studio";

/** Captured callbacks of the last constructed DictationEngine. */
type Callbacks = {
  onEvidence?: (e: {
    evidenced: boolean;
    engine: "local" | "browser";
    preparing: boolean;
    progress: { loaded: number; total: number; percent: number | null; done: boolean } | null;
  }) => void;
};

const engineLog: {
  started: number;
  stopped: number;
  preference: "auto" | "browser" | "local";
} = { started: 0, stopped: 0, preference: "local" };
let lastCallbacks: Callbacks = {};

vi.mock("../../src/lib/dictation", () => ({
  DictationEngine: class {
    isRunning = false;
    constructor(private cb: Callbacks) {
      lastCallbacks = cb;
    }
    async start(preference: "auto" | "browser" | "local") {
      engineLog.started += 1;
      this.isRunning = true;
      engineLog.preference = preference;
      this.cb.onEvidence?.({
        evidenced: true,
        engine: preference === "browser" ? "browser" : "local",
        preparing: preference !== "browser",
        progress: null,
      });
    }
    stop() {
      engineLog.stopped += 1;
      this.isRunning = false;
      this.cb.onEvidence?.({ evidenced: false, engine: "local", preparing: false, progress: null });
    }
  },
}));

function renderStudio() {
  return render(
    <MemoryRouter>
      <Studio />
    </MemoryRouter>
  );
}

afterEach(cleanup);

describe("Studio — first-run coach", () => {
  beforeEach(() => localStorage.clear());

  it("shows the three-step coach on first visit", () => {
    renderStudio();
    expect(screen.getByText(/first time\? try these three/i)).toBeInTheDocument();
    // "new paragraph" appears in coach, cheat sheet and toggle hint — all three
    expect(screen.getAllByText(/new paragraph/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/scratch that/i).length).toBeGreaterThanOrEqual(2);
  });

  it("dismisses and persists the dismissal", () => {
    const { unmount } = renderStudio();
    fireEvent.click(screen.getByLabelText("Dismiss tips"));
    expect(screen.queryByText(/first time\? try these three/i)).not.toBeInTheDocument();
    expect(localStorage.getItem("murmur.coach.v1")).toBe("done");

    // remount — coach must stay gone
    renderStudio();
    expect(screen.queryByText(/first time\? try these three/i)).not.toBeInTheDocument();
    unmount();
  });

  it("persisted dismissal survives a fresh mount", () => {
    const first = renderStudio();
    fireEvent.click(screen.getByLabelText("Dismiss tips"));
    expect(localStorage.getItem("murmur.coach.v1")).toBe("done");
    first.unmount();

    renderStudio();
    expect(screen.queryByText(/first time\? try these three/i)).not.toBeInTheDocument();
  });
});

describe("Studio — controls", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders mic, engine picker and formatting toggles", () => {
    renderStudio();
    expect(screen.getByLabelText("Start dictation")).toBeInTheDocument();
    expect(screen.getByText(/Auto — fastest available/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Strip fillers/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Voice commands/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Auto punctuation/)).toBeInTheDocument();
  });

  it("toggling a formatting switch flips its checked state", () => {
    renderStudio();
    const strip = screen.getByLabelText(/Strip fillers/) as HTMLInputElement;
    expect(strip.checked).toBe(true);
    fireEvent.click(strip);
    expect(strip.checked).toBe(false);
    fireEvent.click(strip);
    expect(strip.checked).toBe(true);
  });

  it("reveals the voice-command cheat sheet", () => {
    renderStudio();
    const summary = screen.getByText(/voice commands cheat sheet/i);
    fireEvent.click(summary);
    expect(screen.getByText(/deletes the sentence you just finished/i)).toBeInTheDocument();
    expect(screen.getByText(/starts a new paragraph/i)).toBeInTheDocument();
  });

  it("defaults to the offline engine so privacy is the zero-click choice", () => {
    renderStudio();
    const offline = screen.getByText(/Offline — on-device, private/i).closest("button");
    expect(offline).toBeEnabled();
    expect(offline).toHaveClass("border-signal-500/60");
    expect(screen.getByText(/Offline is the default and always free/i)).toBeInTheDocument();
  });
});

describe("Studio — on-device activity indicator", () => {
  beforeEach(() => {
    localStorage.clear();
    engineLog.started = 0;
    engineLog.stopped = 0;
    engineLog.preference = "local";
    lastCallbacks = {};
  });

  it("shows an idle badge that flips live while the engine runs", async () => {
    renderStudio();
    // cloud engine: no model fetch, so "processing" is the honest label
    fireEvent.click(screen.getByText(/Browser — fast, online/i).closest("button")!);
    const badge = screen.getByTestId("evidence-badge");

    // the badge reports the engine of the *last session*, so it still reads
    // local until this session actually resolves
    expect(badge).toHaveTextContent(/engine idle/i);
    expect(badge).toHaveTextContent(/local · no data leaves this browser/i);

    fireEvent.click(screen.getByLabelText("Start dictation"));
    expect(badge).toHaveTextContent(/local processing active/i);
    expect(badge).toHaveTextContent(/online · cloud engine/i);

    fireEvent.click(await screen.findByLabelText("Stop dictation"));
    expect(badge).toHaveTextContent(/engine idle/i);
    expect(engineLog.started).toBe(1);
    expect(engineLog.stopped).toBe(1);
  });

  it("says 'preparing' rather than 'processing' during the cold model fetch", async () => {
    renderStudio();
    fireEvent.click(screen.getByLabelText("Start dictation"));
    await screen.findByLabelText("Stop dictation");

    const badge = screen.getByTestId("evidence-badge");
    // the mock engine reports preparing=true for the offline engine
    expect(badge).toHaveTextContent(/preparing local model/i);
    expect(badge).not.toHaveTextContent(/local processing active/i);
    expect(screen.getByTestId("evidence-progress-detail")).toHaveTextContent(
      /~40 MB · one time/i
    );
    // bytes are leaving the browser for the weights, so do not claim otherwise
    expect(badge).not.toHaveTextContent(/no data leaves this browser/i);
  });

  it("shows real download progress instead of claiming it is processing", async () => {
    renderStudio();
    fireEvent.click(screen.getByLabelText("Start dictation"));
    await screen.findByLabelText("Stop dictation");

    const badge = screen.getByTestId("evidence-badge");

    act(() => {
      lastCallbacks.onEvidence?.({
        evidenced: true,
        engine: "local",
        preparing: true,
        progress: { loaded: 5_242_880, total: 41_943_040, percent: 13, done: false },
      });
    });

    expect(badge).toHaveTextContent(/downloading model · 13%/i);
    expect(badge).toHaveTextContent(/5\.0 MB \/ 40\.0 MB · one time/i);
    expect(badge).not.toHaveTextContent(/no data leaves this browser/i);

    act(() => {
      lastCallbacks.onEvidence?.({
        evidenced: true,
        engine: "local",
        preparing: false,
        progress: null,
      });
    });
    expect(badge).toHaveTextContent(/local processing active/i);
    expect(badge).toHaveTextContent(/no data leaves this browser/i);
  });

  it("says 'downloading' without a percentage while the total is unknown", async () => {
    renderStudio();
    fireEvent.click(screen.getByLabelText("Start dictation"));
    await screen.findByLabelText("Stop dictation");

    act(() => {
      lastCallbacks.onEvidence?.({
        evidenced: true,
        engine: "local",
        preparing: true,
        progress: { loaded: 1_000_000, total: 0, percent: null, done: false },
      });
    });
    const badge = screen.getByTestId("evidence-badge");
    expect(badge).toHaveTextContent(/downloading model/i);
    // no fabricated percentage while the total is unknown
    expect(badge).not.toHaveTextContent(/\d+%/i);
    expect(screen.getByTestId("evidence-progress-detail")).toHaveTextContent(
      "1.0 MB · one time"
    );
  });

  it("keeps the badge honest about the cloud engine when it is picked", async () => {
    renderStudio();
    fireEvent.click(screen.getByText(/Browser — fast, online/i).closest("button")!);
    fireEvent.click(screen.getByLabelText("Start dictation"));

    const badge = screen.getByTestId("evidence-badge");
    expect(await screen.findByLabelText("Stop dictation")).toBeInTheDocument();
    expect(badge).toHaveTextContent(/local processing active/i);
    expect(badge).not.toHaveTextContent(/preparing/i);
    expect(badge).toHaveTextContent(/online · cloud engine/i);
  });

  it("offers Pro upsell without gating the offline engine", () => {
    renderStudio();
    const offlineBtn = screen.getByText(/Offline — on-device, private/i).closest("button");
    expect(offlineBtn).toBeEnabled();
    expect(screen.getByRole("button", { name: /Unlock Pro|See Pro/ })).toBeInTheDocument();
  });
});
