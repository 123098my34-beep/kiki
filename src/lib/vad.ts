/**
 * Lightweight energy Voice Activity Detector.
 *
 * Adaptive RMS threshold with a noise floor tracker plus hangover/min-duration
 * hysteresis so short coughs and keyboard clicks don't open a segment.
 * No dependencies, no wasm — runs on the raw 16 kHz capture buffer.
 */

export interface VadConfig {
  /** absolute RMS floor that counts as sound at all */
  floor: number;
  /** multiplier over the tracked noise floor to count as speech */
  multiplier: number;
  /** how long sound may drop before a segment closes (ms) */
  hangoverMs: number;
  /** minimum speech duration before a segment is emitted (ms) */
  minSpeechMs: number;
}

export const DEFAULT_VAD_CONFIG: VadConfig = {
  floor: 0.018,
  multiplier: 2.6,
  hangoverMs: 650,
  minSpeechMs: 280,
};

export interface VadTransition {
  began: boolean;
  ended: boolean;
  speaking: boolean;
  /** instantaneous 0..1-ish level for meters */
  level: number;
}

export class VoiceActivityDetector {
  private speaking = false;
  private lastVoiceAt = 0;
  private speechStartedAt = 0;
  private noiseFloor = 0.01;
  private config: VadConfig;

  constructor(config: Partial<VadConfig> = {}) {
    this.config = { ...DEFAULT_VAD_CONFIG, ...config };
  }

  reset(): void {
    this.speaking = false;
    this.lastVoiceAt = 0;
    this.speechStartedAt = 0;
    this.noiseFloor = 0.01;
  }

  push(samples: Float32Array, now: number = performance.now()): VadTransition {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      const v = samples[i];
      sum += v * v;
    }
    const rms = Math.sqrt(sum / Math.max(1, samples.length));

    // track noise floor slowly while nobody speaks
    if (!this.speaking) {
      this.noiseFloor = this.noiseFloor * 0.995 + Math.min(rms, 0.05) * 0.005;
    }

    const threshold = Math.max(this.config.floor, this.noiseFloor * this.config.multiplier);
    const isVoice = rms >= threshold;

    let began = false;
    let ended = false;

    if (isVoice) {
      this.lastVoiceAt = now;
      if (!this.speaking) {
        if (this.speechStartedAt === 0) {
          this.speechStartedAt = now;
        }
        if (now - this.speechStartedAt >= this.config.minSpeechMs) {
          this.speaking = true;
          began = true;
        }
      }
    } else if (this.speaking && now - this.lastVoiceAt >= this.config.hangoverMs) {
      this.speaking = false;
      this.speechStartedAt = 0;
      ended = true;
    }

    if (!isVoice && !this.speaking) {
      this.speechStartedAt = 0;
    }

    return { began, ended, speaking: this.speaking, level: Math.min(1, rms * 12) };
  }
}
