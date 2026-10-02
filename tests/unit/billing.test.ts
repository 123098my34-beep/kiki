import { beforeEach, describe, expect, it } from "vitest";
import {
  activateLicense,
  getLicense,
  isPro,
  paddleConfig,
  paddleReady,
  setPro,
  upgradeToPro,
} from "../../src/lib/billing";

describe("billing — local entitlement", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to free", () => {
    expect(isPro()).toBe(false);
  });

  it("persists Pro unlock", () => {
    setPro(true);
    expect(isPro()).toBe(true);
    expect(localStorage.getItem("murmur.pro.v1")).toBe("1");
  });

  it("revokes Pro unlock", () => {
    setPro(true);
    setPro(false);
    expect(isPro()).toBe(false);
    expect(localStorage.getItem("murmur.pro.v1")).toBeNull();
  });
});

describe("billing — license activation (marketplace keys)", () => {
  beforeEach(() => localStorage.clear());

  it("rejects a too-short key and does not grant Pro", () => {
    const r = activateLicense("abc");
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/too short/i);
    expect(isPro()).toBe(false);
    expect(getLicense()).toBeNull();
  });

  it("rejects keys with invalid characters", () => {
    const r = activateLicense("bad key!! inv@lid");
    expect(r.ok).toBe(false);
    expect(isPro()).toBe(false);
  });

  it("accepts a well-formed key, stores it and unlocks Pro", () => {
    const r = activateLicense("  GUM-1234-5678-abcd  ");
    expect(r.ok).toBe(true);
    expect(isPro()).toBe(true);
    expect(getLicense()).toBe("GUM-1234-5678-abcd");
    expect(localStorage.getItem("murmur.pro.v1")).toBe("1");
  });

  it("tolerates line breaks pasted from the receipt email", () => {
    const r = activateLicense("GUM-1234-\n5678-abcd");
    expect(r.ok).toBe(true);
    expect(getLicense()).toBe("GUM-1234-5678-abcd");
  });
});

describe("billing — paddle readiness", () => {
  beforeEach(() => localStorage.clear());

  it("exposes config as booleans", () => {
    expect(typeof paddleReady()).toBe("boolean");
    expect(typeof paddleConfig.publicKey === "string" || paddleConfig.publicKey === undefined).toBe(true);
  });

  it("short-circuits checkout when unconfigured", async () => {
    if (paddleReady()) return; // keys present in this environment — covered by e2e
    expect(await upgradeToPro()).toBe("unconfigured");
    expect(isPro()).toBe(false); // never self-grants
  });
});
