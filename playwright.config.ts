import { defineConfig } from "@playwright/test";

/**
 * E2E runs against the Freebuff-managed preview (`freebuff-preview start`),
 * not a Playwright-managed server — the platform owns the preview port.
 * Chromium is launched with fake-microphone flags so permission flows are
 * testable headless. Live *speech* itself is out of scope headless (no
 * speech service in Chromium builds); see tests/QA-REPORT.md.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 7_000 },
  retries: 0,
  reporter: [["list"]],
  use: {
    // Overridable so CI can pin an explicit address; the privacy test compares
    // request hosts against localhost/127.0.0.1, so the two must agree.
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    permissions: ["microphone"],
    launchOptions: {
      args: [
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
        "--autoplay-policy=no-user-gesture-required",
      ],
    },
    screenshot: "off",
    video: "off",
    trace: "off",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
