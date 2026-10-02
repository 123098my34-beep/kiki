import { describe, expect, it } from "vitest";
import { DEFAULT_FORMAT_OPTIONS, formatOnce, formatSpeech, wordCount } from "../../src/lib/format";

describe("formatSpeech — core cleanup", () => {
  it("removes fillers, capitalizes and auto-punctuates", () => {
    const r = formatOnce("so hello um world");
    expect(r.text).toBe("So hello world.");
    expect(r.fillersRemoved).toBe(1);
  });

  it("caps standalone i and sentence starts", () => {
    expect(formatOnce("i think we should ship it").text).toBe("I think we should ship it.");
    expect(formatSpeech("it works great", "Hello there.").text).toBe("Hello there. It works great.");
  });

  it("keeps punctuation the recognizer already produced", () => {
    expect(formatOnce("wait, really? yes!").text).toBe("Wait, really? Yes!");
  });

  it("honors the removeFillers=false option", () => {
    const r = formatOnce("um hello", { ...DEFAULT_FORMAT_OPTIONS, removeFillers: false });
    expect(r.text).toBe("Um hello.");
    expect(r.fillersRemoved).toBe(0);
  });

  it("honors the autoPunctuate=false option", () => {
    const r = formatOnce("hello there", { ...DEFAULT_FORMAT_OPTIONS, autoPunctuate: false });
    expect(r.text).toBe("Hello there");
  });
});

describe("formatSpeech — punctuation commands", () => {
  it("inserts comma, period, colon", () => {
    expect(formatOnce("wait comma really period").text).toBe("Wait, really.");
    expect(formatOnce("lets talk colon now").text).toBe("Lets talk: now.");
  });

  it("inserts question mark and exclamation point", () => {
    expect(formatOnce("should we ship question mark").text).toBe("Should we ship?");
    expect(formatOnce("lets go exclamation point").text).toBe("Lets go!");
  });

  it("handles full stop and quotes", () => {
    expect(formatOnce("that is all full stop").text).toBe("That is all.");
    const q = formatOnce("he said open quote hello close quote");
    expect(q.text).toContain("\u201chello\u201d");
  });

  it("treats commands literally when applyCommands=false", () => {
    const r = formatOnce("say comma please", { ...DEFAULT_FORMAT_OPTIONS, applyCommands: false });
    expect(r.text).toBe("Say comma please.");
    expect(r.commandsUsed).toHaveLength(0);
  });
});

describe("formatSpeech — structure commands", () => {
  it("new line creates a break and capitalizes after it", () => {
    const r = formatOnce("first part new line second part");
    expect(r.text).toBe("First part\nSecond part.");
  });

  it("new paragraph creates a blank line", () => {
    const r = formatOnce("alpha new paragraph beta");
    expect(r.text).toBe("Alpha\n\nBeta.");
  });

  it("never produces 3+ consecutive newlines", () => {
    const r = formatOnce("one new paragraph new line two");
    expect(r.text).not.toMatch(/\n{3,}/);
  });
});

describe("formatSpeech — scratch that", () => {
  it("removes the last sentence only", () => {
    const r = formatSpeech("scratch that", "Hello world. Second sentence.");
    expect(r.text).toBe("Hello world.");
    expect(r.scratched).toBe(true);
    expect(r.commandsUsed).toContain("scratch that");
  });

  it("removes an unterminated trailing sentence", () => {
    const r = formatSpeech("scratch that", "First sentence. Half done thought");
    expect(r.text).toBe("First sentence.");
  });

  it("survives scratch on empty transcript", () => {
    expect(formatSpeech("scratch that", "").text).toBe("");
  });

  it("keeps the paragraph break before the removed sentence", () => {
    const r = formatSpeech("scratch that", "Hello.\n\nWorld.");
    expect(r.text).toBe("Hello.");
  });
});

describe("formatSpeech — multi-segment accumulation", () => {
  it("appends segments and re-capitalizes", () => {
    const a = formatSpeech("good morning team", "").text;
    const b = formatSpeech("lets review the numbers", a).text;
    expect(a).toBe("Good morning team.");
    expect(b).toBe("Good morning team. Lets review the numbers.");
  });

  it("reports cumulative stats", () => {
    const r1 = formatOnce("um hello");
    expect(r1.fillersRemoved).toBe(1);
    const r2 = formatSpeech("new line uh bye", r1.text);
    expect(r2.fillersRemoved).toBe(1);
    expect(r2.commandsUsed).toContain("new line");
  });
});

describe("wordCount", () => {
  it("counts words and handles empty", () => {
    expect(wordCount("one two three")).toBe(3);
    expect(wordCount("   ")).toBe(0);
    expect(wordCount("")).toBe(0);
  });
});
