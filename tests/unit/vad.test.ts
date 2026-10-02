import { describe, expect, it } from "vitest";
import { VoiceActivityDetector, DEFAULT_VAD_CONFIG } from "../../src/lib/vad";

const SILENCE = new Float32Array(4096);
const LOUD = new Float32Array(4096).fill(0.3);

function vad() {
  return new VoiceActivityDetector();
}

describe("VoiceActivityDetector", () => {
  it("stays quiet on silence", () => {
    const v = vad();
    const t = v.push(SILENCE, 100);
    expect(t.began).toBe(false);
    expect(t.speaking).toBe(false);
    expect(t.level).toBeGreaterThanOrEqual(0);
    expect(t.level).toBeLessThanOrEqual(1);
  });

  it("opens a segment after sustained speech exceeds minSpeechMs", () => {
    const v = vad();
    expect(v.push(LOUD, 100).began).toBe(false); // first block starts the clock
    const t = v.push(LOUD, 100 + DEFAULT_VAD_CONFIG.minSpeechMs + 10);
    expect(t.began).toBe(true);
    expect(t.speaking).toBe(true);
  });

  it("closes a segment after the hangover window of silence", () => {
    const v = vad();
    v.push(LOUD, 100);
    v.push(LOUD, 500); // speaking
    const closeAt = 500 + DEFAULT_VAD_CONFIG.hangoverMs + 10;
    const t = v.push(SILENCE, closeAt);
    expect(t.ended).toBe(true);
    expect(t.speaking).toBe(false);
  });

  it("ignores blips shorter than minSpeechMs", () => {
    const v = vad();
    v.push(LOUD, 100);
    const t = v.push(SILENCE, 150); // voice stopped before min duration
    expect(t.began).toBe(false);
    expect(t.speaking).toBe(false);
  });

  it("does not end while voice keeps arriving within hangover", () => {
    const v = vad();
    v.push(LOUD, 100);
    v.push(LOUD, 500);
    const t = v.push(SILENCE, 500 + DEFAULT_VAD_CONFIG.hangoverMs - 100);
    expect(t.ended).toBe(false);
    expect(t.speaking).toBe(true);
  });

  it("reset clears state", () => {
    const v = vad();
    v.push(LOUD, 100);
    v.push(LOUD, 500);
    v.reset();
    const t = v.push(SILENCE, 600);
    expect(t.speaking).toBe(false);
    expect(t.began).toBe(false);
  });
});
