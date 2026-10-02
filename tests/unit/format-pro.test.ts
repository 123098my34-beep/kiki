import { describe, expect, it } from "vitest";
import {
  DEFAULT_FORMAT_OPTIONS,
  PRESETS,
  formatOnce,
  formatSpeech,
} from "../../src/lib/format";

/**
 * The paid tier is only honest if it changes the output. These tests pin the
 * two Pro presets and the custom-command layer to real formatting differences —
 * if a preset silently becomes a no-op, a paying customer's product is a lie.
 */

describe("Pro presets", () => {
  it("lists standard as the only free preset", () => {
    const free = PRESETS.filter((p) => !p.pro).map((p) => p.id);
    expect(free).toEqual(["standard"]);
    expect(PRESETS.map((p) => p.id)).toContain("concise");
    expect(PRESETS.map((p) => p.id)).toContain("notes");
  });

  it("standard leaves hedges alone — that is what free users get", () => {
    const r = formatOnce("basically we should ship it");
    expect(r.text).toBe("Basically we should ship it.");
  });

  it("concise strips hedges and filler phrases", () => {
    const opts = { ...DEFAULT_FORMAT_OPTIONS, preset: "concise" as const };
    const r = formatOnce("so basically you know we should ship it", opts);
    expect(r.text).toBe("So we should ship it.");
  });

  it("concise only strips hedges when filler removal is on", () => {
    const opts = {
      ...DEFAULT_FORMAT_OPTIONS,
      preset: "concise" as const,
      removeFillers: false,
    };
    expect(formatOnce("basically we ship", opts).text).toBe("Basically we ship.");
  });

  it("notes turns a spoken paragraph break into a bullet", () => {
    const opts = { ...DEFAULT_FORMAT_OPTIONS, preset: "notes" as const };
    const bulleted = formatSpeech("ship the billing first new paragraph then the docs", "", opts);
    expect(bulleted.commandsUsed).toContain("new paragraph");
    expect(bulleted.text).toContain("•");
    // each bullet is its own line, and its first word is capitalized
    expect(bulleted.text).toMatch(/^Ship the billing first\n\n• Then the docs\.$/);
  });
});

describe("custom voice commands", () => {
  const opts = (customCommands: Array<{ phrase: string; insert: string }>) => ({
    ...DEFAULT_FORMAT_OPTIONS,
    customCommands,
  });

  it("inserts the user's text when the phrase is spoken", () => {
    const r = formatOnce("ship it arrow ship it", opts([{ phrase: "arrow", insert: "→" }]));
    expect(r.text).toBe("Ship it → ship it.");
    expect(r.commandsUsed).toContain("arrow");
  });

  it("matches whole phrases only, not substrings of words", () => {
    const r = formatOnce("arrowman runs", opts([{ phrase: "arrow", insert: "→" }]));
    expect(r.text).toBe("Arrowman runs.");
  });

  it("supports multi-word phrases and punctuation inserts", () => {
    const r = formatOnce(
      "see you tomorrow sign off",
      opts([{ phrase: "sign off", insert: "→" }])
    );
    expect(r.text).toBe("See you tomorrow →.");
  });

  it("is ignored when the voice-commands toggle is off", () => {
    const r = formatOnce(
      "ship it arrow",
      { ...DEFAULT_FORMAT_OPTIONS, applyCommands: false, customCommands: [{ phrase: "arrow", insert: "→" }] }
    );
    expect(r.text).toBe("Ship it arrow.");
  });

  it("ignores blank entries instead of emitting stray spaces", () => {
    const r = formatOnce("ship it", opts([{ phrase: "  ", insert: "→" }, { phrase: "x", insert: " " }]));
    expect(r.text).toBe("Ship it.");
  });
});