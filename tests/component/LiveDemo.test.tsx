import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import LiveDemo from "../../src/components/LiveDemo";

/** what the demo engine was started with — the Pro gate must show up here */
let lastStart: { preference: string; access?: { tier?: string } } = { preference: "" };

vi.mock("../../src/lib/dictation", () => ({
  DictationEngine: class {
    isRunning = false;
    async start(preference: string, _fmt?: unknown, access?: { tier?: string }) {
      lastStart = { preference, access };
      this.isRunning = true;
    }
    stop() {
      this.isRunning = false;
    }
  },
}));

afterEach(cleanup);

describe("LiveDemo", () => {
  beforeEach(() => {
    localStorage.clear();
    cleanup();
  });

  it("renders with sample and mic affordances", () => {
    render(<LiveDemo />);
    expect(screen.getByText("Run sample")).toBeInTheDocument();
    expect(screen.getByText("Dictate live")).toBeInTheDocument();
  });

  it("disables live dictation when Web Speech API is unavailable", () => {
    render(<LiveDemo />);
    const speechAvailable =
      typeof (window as unknown as Record<string, unknown>).SpeechRecognition !== "undefined" ||
      typeof (window as unknown as Record<string, unknown>).webkitSpeechRecognition !== "undefined";
    const btn = screen.getByText("Dictate live").closest("button");
    expect(btn).toBeInTheDocument();
    expect(btn?.disabled).toBe(!speechAvailable);
  });

  it("runs the sample through the real formatting engine", () => {
    render(<LiveDemo />);
    fireEvent.click(screen.getByText("Run sample"));

    // raw pane keeps the messy utterance (filler intact — raw is never edited)
    expect(screen.getByText(/um so hey team i wanted to uh talk/i)).toBeInTheDocument();

    // formatted pane shows engine output
    expect(
      screen.getByText(/So hey team I wanted to talk about the q3 roadmap/)
    ).toBeInTheDocument();

    // stats chips reflect what changed
    expect(screen.getByText(/−2 fillers/)).toBeInTheDocument();
    expect(screen.getByText("⌘ scratch that")).toBeInTheDocument();
    expect(screen.getByText("⌘ new line")).toBeInTheDocument();
  });

  it("starts the demo with the visitor's entitlement, not a Pro cloud path", () => {
    // Web Speech exists here so the live mic is enabled
    Object.defineProperty(window, "webkitSpeechRecognition", {
      configurable: true,
      value: function Fake() {},
    });
    render(<LiveDemo />);
    fireEvent.click(screen.getByText("Dictate live"));
    expect(lastStart.access).toEqual({
      tier: "free",
      model: "tiny",
      preset: "standard",
      customCommands: false,
    });
    Reflect.deleteProperty(window, "webkitSpeechRecognition");
  });

  it("tells free visitors the demo downloads a model before dictating", () => {
    Object.defineProperty(window, "webkitSpeechRecognition", {
      configurable: true,
      value: function Fake() {},
    });
    render(<LiveDemo />);
    expect(screen.getByText(/one-time ~40 MB model download/i)).toBeInTheDocument();
    Reflect.deleteProperty(window, "webkitSpeechRecognition");
  });

  it("clears output on reset", () => {
    render(<LiveDemo />);
    fireEvent.click(screen.getByText("Run sample"));
    expect(screen.getByText(/So hey team I wanted/)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Clear demo"));
    expect(screen.queryByText(/So hey team I wanted/)).not.toBeInTheDocument();
    expect(screen.queryByText(/−2 fillers/)).not.toBeInTheDocument();
  });
});
