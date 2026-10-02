import { expect, test } from "@playwright/test";

/**
 * The app under test: the managed preview locally, the deployed site in
 * production. The privacy test below has to know which host is "us", or our
 * own lazily-loaded chunks look like third-party traffic.
 */
const APP_ORIGIN = new URL(process.env.E2E_BASE_URL ?? "http://localhost:5173").origin;

test.describe("landing", () => {
  test("loads with hero, nav and all promised sections", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Murmur/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Speak");

    for (const id of ["why", "demo", "how", "features", "compare", "privacy", "pricing", "faq"]) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
    await expect(page.getByRole("link", { name: "Open Studio" })).toBeVisible();
  });

  test("run sample exercises the real formatting engine", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Run sample/i }).click();

    const demo = page.locator("#demo");
    await expect(
      demo.getByText(/So hey team I wanted to talk about the q3 roadmap/)
    ).toBeVisible();
    await expect(demo.getByText("−2 fillers").first()).toBeVisible();
    await expect(demo.getByText("⌘ scratch that")).toBeVisible();
  });

  test("compare table states verified Wispr facts", async ({ page }) => {
    await page.goto("/#compare");
    await expect(page.getByRole("cell", { name: /2,000 words\/wk/i })).toBeVisible();
    await expect(page.getByRole("cell", { name: /Mac, Windows, iOS, Android/i })).toBeVisible();
    await expect(page.getByRole("cell", { name: /SOC 2/i })).toBeVisible();
  });

  test("pricing states the desktop license honestly and lists what Pro unlocks", async ({ page }) => {
    await page.goto("/#pricing");
    const pro = page.locator("#pricing").getByText(/murmur pro/i).locator("xpath=ancestor::div[contains(@class,'card-carbon')]");
    await expect(pro.getByText(/browser engine/i)).toBeVisible();
    await expect(pro.getByText(/whisper base\.en/i)).toBeVisible();
    await expect(pro.getByText(/included when that build launches \(not released yet\)/i)).toBeVisible();
    // nothing may imply the desktop app is available today
    await expect(page.getByText(/desktop app license \(macos \/ windows\) when it ships/i)).toHaveCount(0);
  });

  test("upgrade button fails soft when payments are unconfigured", async ({ page }) => {
    await page.goto("/#pricing");
    const upgrade = page.getByRole("button", { name: /Upgrade with Paddle|Go Pro/ });
    await expect(upgrade).toBeVisible();
    await upgrade.click();
    // either the Paddle overlay opened, or our honest fallback note appeared
    await expect(
      page
        .getByText(/Checkout goes live once payment config is added/i)
        .or(page.locator(".paddle-overlay, [class*='paddle']").first())
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("studio", () => {
  test("first-run coach shows, dismisses, stays dismissed", async ({ page }) => {
    await page.goto("/studio");
    await expect(page.getByText(/first time\? try these three/i)).toBeVisible();

    await page.getByLabel("Dismiss tips").click();
    await expect(page.getByText(/first time\? try these three/i)).toBeHidden();

    await page.reload();
    await expect(page.getByText(/first time\? try these three/i)).toBeHidden();
    await expect(page.getByLabel("Start dictation")).toBeVisible();
  });

  test("voice-command cheat sheet opens", async ({ page }) => {
    await page.goto("/studio");
    await page.getByText(/voice commands cheat sheet/i).click();
    await expect(page.getByText(/deletes the sentence you just finished/i)).toBeVisible();
  });

  test("offline engine is the free default, not a locked option", async ({ page }) => {
    await page.goto("/studio");
    await expect(page.getByTestId("evidence-badge")).toContainText(/no data leaves this browser/i);
    const offline = page.getByRole("button", { name: /Offline — on-device, private/i });
    await expect(offline).toBeEnabled();
    await expect(page.getByText(/Offline is the default and always free/i)).toBeVisible();
  });

  test("the paid engine, models and presets are locked for free users", async ({ page }) => {
    await page.goto("/studio");
    await page.getByTestId("engine-browser").click();
    // the honest explanation appears and the session is still offline
    await expect(page.getByText(/audio leaves the device/i)).toBeVisible();
    await expect(page.getByText(/engine: local/i)).toBeVisible();

    await page.getByTestId("model-small").click();
    await expect(page.getByText(/is a Pro model/i)).toBeVisible();
    await page.getByTestId("preset-notes").click();
    await expect(page.getByText(/is a Pro preset/i)).toBeVisible();

    // …and the free path was never locked in the first place
    await expect(page.getByTestId("engine-local")).toBeEnabled();
  });

  test("the badge admits it is not processing while the model fetch is blocked", async ({ page }) => {
    // Hold the model host open. transformers.js resolves file metadata before
    // it emits any progress event, so during this window the session is up but
    // the engine genuinely cannot transcribe yet. The badge must say so.
    await page.route(/(huggingface\.co|hf\.co|jsdelivr\.net)/, async () => {
      await new Promise((resolve) => setTimeout(resolve, 30_000));
    });

    await page.goto("/studio");
    await page.evaluate(() => {
      Object.defineProperty(window, "SpeechRecognition", { configurable: true, value: undefined });
      Object.defineProperty(window, "webkitSpeechRecognition", { configurable: true, value: undefined });
    });

    const badge = page.getByTestId("evidence-badge");
    await expect(badge).toContainText(/engine idle/i);

    await page.getByLabel("Start dictation").click();

    await expect(badge).toContainText(/preparing local model|downloading model/i, {
      timeout: 15_000,
    });
    // the specific lie this test exists to prevent
    await expect(badge).not.toContainText(/local processing active/i);
    // bytes ARE leaving for the weights, so the privacy line must be hidden
    await expect(badge).not.toContainText(/no data leaves this browser/i);
    await expect(page.getByTestId("evidence-progress-detail")).toBeVisible();
  });

  test("no audio or telemetry leaves the page while the offline engine runs", async ({ page }) => {
    const MODEL_HOSTS = /(^|\.)(huggingface\.co|hf\.co|jsdelivr\.net)$/;
    const external: { method: string; url: string }[] = [];
    page.on("request", (r) => {
      const u = new URL(r.url());
      // our own bundle — including chunks fetched lazily from the deployed host
      if (u.origin === APP_ORIGIN) return;
      external.push({ method: r.method(), url: r.url() });
    });

    // The one-time model download is the only sanctioned egress. Block it so the
    // run is hermetic; anything else reaching the network is a privacy failure.
    await page.route(/(huggingface\.co|hf\.co|jsdelivr\.net)/, (route) => route.abort());
    await page.goto("/studio");
    await page.evaluate(() => {
      Object.defineProperty(window, "SpeechRecognition", {
        configurable: true,
        value: undefined,
      });
      Object.defineProperty(window, "webkitSpeechRecognition", {
        configurable: true,
        value: undefined,
      });
    });

    const badge = page.getByTestId("evidence-badge");
    await expect(badge).toContainText(/engine idle/i);
    external.length = 0; // only count what happens while dictating

    await page.getByLabel("Start dictation").click();
    await expect(badge).toContainText(/local processing active/i, { timeout: 15_000 });

    // let audio frames flow through the on-device pipeline and attempt a flush
    await page.waitForTimeout(4000);
    await page.getByLabel("Stop dictation").click();
    await expect(badge).toContainText(/engine idle/i);

    // Everything external must be a one-time, read-only model-weight fetch.
    const leaked = external.filter(
      (r) => !(r.method === "GET" && MODEL_HOSTS.test(new URL(r.url).hostname))
    );
    expect(leaked).toEqual([]);
  });

  test("mic click with fake device does not crash the app", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto("/studio");
    await page.getByLabel("Start dictation").click();

    // some deterministic outcome: listening status OR an actionable error
    await expect(
      page
        .getByText(/listening|speech service error|microphone|failed/i)
        .first()
    ).toBeVisible({ timeout: 10_000 });

    // still on the page, no crash overlay
    await expect(page.getByRole("heading", { name: "Dictation Studio" })).toBeVisible();
    expect(errors.filter((e) => !e.includes("SpeechRecognition"))).toEqual([]);
  });
});

test.describe("routing", () => {
  test("unknown path shows branded 404", async ({ page }) => {
    await page.goto("/definitely-not-a-route");
    await expect(page.getByText(/Nothing was said here/i)).toBeVisible();
    await page.getByRole("link", { name: "Open Studio" }).click();
    await expect(page).toHaveURL(/\/studio$/);
  });

  test("landing CTA lands in the studio", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Start dictating — free/i }).click();
    await expect(page).toHaveURL(/\/studio$/);
    await expect(page.getByText(/Dictation Studio/i)).toBeVisible();
  });
});
