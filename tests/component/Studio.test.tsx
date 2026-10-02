import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Studio from "../../src/pages/Studio";

/** Captured callbacks of the last constructed DictationEngine. */
type Callbacks = {
  onEvidence?: (e: { evidenced: boolean; engine: "local" | "browser" }) => void;
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
      });
    }
    stop() {
      engineLog.stopped += 1;
      this.isRunning = false;
      this.cb.onEvidence?.({ evidenced: false, engine: "local" });
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
    const badge = screen.getByTestId("evidence-badge");

    expect(badge).toHaveTextContent(/engine idle/i);
    expect(badge).toHaveTextContent(/no data leaves this browser/i);

    fireEvent.click(screen.getByLabelText("Start dictation"));
    expect(badge).toHaveTextContent(/local processing active/i);

    fireEvent.click(await screen.findByLabelText("Stop dictation"));
    expect(badge).toHaveTextContent(/engine idle/i);
    expect(engineLog.started).toBe(1);
    expect(engineLog.stopped).toBe(1);
  });

  it("keeps the badge honest about the cloud engine when it is picked", async () => {
    renderStudio();
    fireEvent.click(screen.getByText(/Browser — fast, online/i).closest("button")!);
    fireEvent.click(screen.getByLabelText("Start dictation"));

    const badge = screen.getByTestId("evidence-badge");
    expect(await screen.findByLabelText("Stop dictation")).toBeInTheDocument();
    expect(badge).toHaveTextContent(/local processing active/i);
    expect(badge).toHaveTextContent(/online · cloud engine/i);
  });

  it("offers Pro upsell without gating the offline engine", () => {
    renderStudio();
    const offlineBtn = screen.getByText(/Offline — on-device, private/i).closest("button");
    expect(offlineBtn).toBeEnabled();
    expect(screen.getByRole("button", { name: /Unlock Pro|See Pro/ })).toBeInTheDocument();
  });
});
