import { describe, expect, it } from "vitest";
import {
  FREE_ACCESS,
  accessFor,
  clampModel,
  clampPreset,
  cloudEngineAllowed,
  customCommandsAllowed,
  modelAllowed,
  presetAllowed,
} from "../../src/lib/access";

/**
 * The pricing page promises four things behind Pro. These tests are the contract:
 * if one of them becomes free again (or a free user gets it), the Gumroad
 * listing is describing a product that no longer exists.
 */

describe("free tier", () => {
  it("keeps the whole product usable, on-device", () => {
    expect(FREE_ACCESS).toEqual({
      tier: "free",
      model: "tiny",
      preset: "standard",
      customCommands: false,
    });
    expect(cloudEngineAllowed("free")).toBe(false);
    expect(modelAllowed("tiny", "free")).toBe(true);
    expect(presetAllowed("standard", "free")).toBe(true);
  });

  it("does not leak the vendor engine or the paid models", () => {
    expect(modelAllowed("base", "free")).toBe(false);
    expect(modelAllowed("small", "free")).toBe(false);
    expect(presetAllowed("concise", "free")).toBe(false);
    expect(presetAllowed("notes", "free")).toBe(false);
    expect(customCommandsAllowed("free")).toBe(false);
  });

  it("clamps a requested paid model or preset back to the free ones", () => {
    expect(clampModel("small", "free")).toBe("tiny");
    expect(clampModel("base", "free")).toBe("tiny");
    expect(clampModel(null, "free")).toBe("tiny");
    expect(clampPreset("notes", "free")).toBe("standard");
    expect(clampPreset(null, "free")).toBe("standard");
  });

  it("accessFor ignores a preferred model when there is no license", () => {
    expect(accessFor(false, "small")).toEqual(FREE_ACCESS);
  });
});

describe("pro tier", () => {
  it("unlocks exactly what the pricing table lists", () => {
    expect(cloudEngineAllowed("pro")).toBe(true);
    expect(modelAllowed("base", "pro")).toBe(true);
    expect(modelAllowed("small", "pro")).toBe(true);
    expect(presetAllowed("concise", "pro")).toBe(true);
    expect(presetAllowed("notes", "pro")).toBe(true);
    expect(customCommandsAllowed("pro")).toBe(true);
  });

  it("defaults to the base model and honors an explicit choice", () => {
    expect(accessFor(true)).toEqual({
      tier: "pro",
      model: "base",
      preset: "standard",
      customCommands: true,
    });
    expect(accessFor(true, "small").model).toBe("small");
  });

  it("still needs clamping only for values it does not know", () => {
    expect(clampModel("small", "pro")).toBe("small");
    expect(clampPreset("notes", "pro")).toBe("notes");
  });
});