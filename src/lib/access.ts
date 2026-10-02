/**
 * Entitlement rules — the single source of truth for "what does Pro unlock".
 *
 * Selling a paid tier is only honest if the gate is in the code, not just in
 * the pricing table. Every Pro-only capability in Murmur resolves through this
 * module so the UI, the engine and the formatting layer can never disagree
 * about who is entitled to what.
 *
 * Rules, in one place:
 *   - the browser ("cloud") engine is Pro — it routes audio to a vendor
 *   - the small Whisper models are Pro — free gets tiny.en and stays tiny.en
 *   - advanced formatting presets are Pro — free gets "standard"
 *   - custom voice commands are Pro — free keeps the built-in command set
 */

import type { ModelChoice } from "./asr";
import type { PresetId } from "./format";

export type Tier = "free" | "pro";

/** What a session is allowed to do, resolved once and passed down. */
export interface Access {
  tier: Tier;
  /** the on-device model this tier may load */
  model: ModelChoice;
  /** the formatting preset this tier may use */
  preset: PresetId;
  /** whether user-defined voice commands are honored */
  customCommands: boolean;
}

/** The free product, stated once. Everything here is genuinely usable forever. */
export const FREE_ACCESS: Access = {
  tier: "free",
  model: "tiny",
  preset: "standard",
  customCommands: false,
};

/**
 * Resolve the access bundle for a license state. `preferredModel` is clamped:
 * a free caller asking for `small` gets `tiny`, not an exception.
 */
export function accessFor(pro: boolean, preferredModel?: ModelChoice): Access {
  if (!pro) return { ...FREE_ACCESS };
  return {
    tier: "pro",
    model: preferredModel ?? "base",
    preset: "standard",
    customCommands: true,
  };
}

/** The browser/Web Speech engine sends audio to a vendor — Pro only. */
export function cloudEngineAllowed(tier: Tier): boolean {
  return tier === "pro";
}

/** Bigger on-device models cost download size and RAM — Pro only. */
export function modelAllowed(id: ModelChoice, tier: Tier): boolean {
  return id === "tiny" || tier === "pro";
}

/** "standard" ships free; the tuned presets are the paid differentiator. */
export function presetAllowed(id: PresetId, tier: Tier): boolean {
  if (id === "standard") return true;
  return tier === "pro";
}

export function customCommandsAllowed(tier: Tier): boolean {
  return tier === "pro";
}

/** Coerce a stored preference to something this tier may actually use. */
export function clampModel(id: ModelChoice | null | undefined, tier: Tier): ModelChoice {
  if (!id) return FREE_ACCESS.model;
  return modelAllowed(id, tier) ? id : FREE_ACCESS.model;
}

export function clampPreset(id: PresetId | null | undefined, tier: Tier): PresetId {
  if (!id) return FREE_ACCESS.preset;
  return presetAllowed(id, tier) ? id : FREE_ACCESS.preset;
}