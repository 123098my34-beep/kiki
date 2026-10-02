# Murmur — QA Report

**Date:** 2026-10-01 · **Branch state:** post customer-obsession pass
**Method:** AZR-style PROPOSE → SOLVE — every risk became a task, execution decided the verdict.

## 1. Frameworks used (current top-of-field for Vite/React/TS)

| Layer | Framework | Version | Why |
|---|---|---|---|
| Unit / logic | **Vitest** | 5.0.3 | De-facto standard for Vite projects; native TS/ESM, fast watch |
| Components | **React Testing Library** + jest-dom, happy-dom | 16.3.3 / 7.0.1 / 20.14.5 | Tests behavior users see, not implementation |
| End-to-end | **Playwright** | 1.63.0 | Real Chromium, fake-mic flags, strict-mode locators |

Scripts: `bun run test` (unit+component) · `bun run test:e2e` (Playwright, requires `freebuff-preview start`).

## 2. Results — all green

```
Unit + component : 94 passed / 94 (9 files)
E2E (chromium)   : 14 passed / 14 (~19s)
tsc -b --noEmit  : clean
```

### Coverage map

| Area | Cases | Notes |
|---|---|---|
| Formatting engine (`src/lib/format.ts`) | 19 | fillers, typography, auto-punct on/off, commands on/off, punctuation commands, quotes, new line/paragraph, scratch-that (4 edge cases incl. empty + paragraph-break), multi-segment accumulation, stats |
| VAD (`src/lib/vad.ts`) | 6 | silence floor, min-speech hysteresis, hangover close, blip rejection, mid-hangover keep-alive, reset |
| Billing (`src/lib/billing.ts`) | 9 | entitlement default/persist/revoke, unconfigured checkout never self-grants Pro, license-key activation (reject short/invalid keys, accept + store, receipt line-break tolerance) |
| LiveDemo component | 6 | render, Web-Speech capability gating, sample → real engine output + chips, reset, **the landing demo starts with the visitor's entitlement** (free never gets the Pro cloud path) and warns about the one-time model download |
| Dictation engine (`src/lib/dictation.ts`) | 8 | on-device evidence defaults idle, flips true on start / false on stop, engine label stays honest (local vs cloud), **never claims local processing before the model is ready**, no preparation claim for the cloud engine, download progress surfaced then cleared, model failure stops the download readout, refused mic leaves evidence untouched, `resolveEngine("local") === "local"` |
| Offline session (`src/lib/asr.ts`) | 6 | **the mic is never routed straight to the speakers** (zeroed gain tap — verified failing against pre-fix code), audio graph torn down on stop, **never claims "speak freely" before the model resolves**, says words are *kept* not lost while loading, says "armed" only once the pipeline lands, **no stale status after stop** |
| Studio component | 13 | first-run coach + persistence, controls, toggle state, cheat-sheet reveal, **offline is the enabled default**, on-device indicator toggle (idle → live → idle), **"preparing local model" during the cold fetch**, real byte/percent readout, no fabricated percentage when the total is unknown, badge labels the cloud engine when picked, Pro upsell without gating privacy |
| E2E — landing | 4 | sections/nav integrity, run-sample through real engine, **verified Wispr facts in compare table**, checkout soft-fail |
| E2E — studio | 6 | coach dismiss + reload persistence, cheat sheet, offline-is-free-default, **badge admits it is not processing while the model fetch is blocked** (verified failing against pre-fix code), **no audio/telemetry request leaves the page while the offline engine runs**, **mic click with fake device: no crash** |
| E2E — routing | 2 | branded 404, landing CTA → studio |

### Pro-gating pass (2026-10-02) — “Pro unlocks something real”

Selling a $79 lifetime tier means the gate has to be in the code, not just on the
pricing card. Entitlement rules now live in one module (`src/lib/access.ts`) and
are enforced in the engine, not only in the UI.

| Area | Cases | Notes |
|---|---|---|
| Entitlements (`src/lib/access.ts`) | 10 | free keeps the whole product on-device; the vendor engine, base/small models, Concise/Notes presets and custom commands are Pro; `accessFor(false, "small")` **clamps instead of granting** |
| Pro formatting (`format.ts`) | 7 | Concise actually strips hedges (“basically”, “you know”), Notes turns a spoken paragraph break into a `•` bullet with capitalization, custom commands insert arbitrary literals, match whole phrases only, and obey the voice-commands toggle |
| Engine tier enforcement (`dictation.ts` / `asr.ts`) | 4 | free asking for `browser`/`auto` resolves to the on-device engine, a requested paid model clamps to tiny.en, Pro gets base.en by default and small.en on request; **the Web Speech stub is now a real constructor on `window` so the gate is exercised, not stubbed away** |
| Studio component | 6 | free users cannot select the browser engine (session stays `engine: local`), locked options are labelled Pro, free path stays unlocked, license activation hands over model/preset/custom commands, engine receives the clamped access bundle |
| E2E — studio | 1 | in a real browser: clicking the vendor engine, the 250 MB model and the Notes preset explains the paywall and leaves the session offline |
| E2E — landing | 1 | pricing promises the honest desktop-license line and names what Pro unlocks |

## 3. Wispr Flow comparison (verified against wisprflow.ai/pricing, 2026-10-01)

| Dimension | Murmur | Wispr Flow (their own pricing page) |
|---|---|---|
| Free tier | Unlimited, uncapped, no account | $0 but **capped 2,000 words/wk desktop, 1,000/wk mobile** |
| Paid | Pro $8/mo (or $79 once) — unlocks the browser engine, Whisper base/small models, Concise/Notes presets and custom voice commands | Pro **$15/user/mo** ($12 annual) · Growth $23 · Enterprise |
| Platforms | Web today; desktop license with Pro coming | Mac, Windows, iOS, Android |
| Transcription | Hybrid: browser engine **or on-device Whisper** | Cloud (per third-party teardowns) |
| Offline | Yes (after one-time ~40 MB model) | No |
| Edit transparency | Raw + formatted panes + change chips | Output only |
| Meeting notetaker | Not yet — dictation first | Included (limited on Free) |
| Compliance | n/a — no accounts, no stored data | SOC 2, ISO 27001, HIPAA-ready (BAA) |
| Languages | EN-first (Whisper-tiny.en / base.en / small.en, or browser lang) | 100+ |

**Honest read:** Wispr wins on platforms, language coverage, notetaker and compliance; Murmur wins on price, offline/privacy, transparency and zero-account UX. Our compare table was corrected this pass (it previously said "Paid subscription" — inaccurate; Wispr has a free tier) and now states their advantages too — promise-map rule: no claim without proof.

**Corrections applied to `src/pages/Landing.tsx`:** price row (2,000 words/wk · $15/mo), platforms row, added meeting-notetaker row, added compliance row, footnote now cites source + date.

## 4. Known limitations (honest)

1. **Live speech recognition is not E2E-testable headless** — Chromium builds ship no speech service; Web Speech returns an error. Covered instead by: fake-mic no-crash test, capability gating unit test, and the engine's error-path copy. Manual checklist: open `/studio` in Chrome, dictate one sentence, confirm raw+formatted panes fill, and confirm **no audio comes back out of the speakers** (the mic-feedback fix is unit-proven but only a human ear can hear it).
2. **Offline model download (~40 MB from HF hub)** not exercised in CI (network-heavy, slow). Fallback chain (4 candidates for tiny.en; 3 + tiny-en fallback for base/small) fails soft into an actionable error; verify manually once by selecting Offline with Pro unlocked.
3. **License keys are shape-validated only** — any string ≥8 valid chars unlocks Pro on that device (`activateLicense`). Fine for $8/mo, weak for $79 lifetime; a signed key or Gumroad API check needs a backend. Still open.
4. **Pro model sizes are approximate marketing numbers** (`~80 MB` base, `~250 MB` small, q8 ONNX). The Studio shows real byte counts once the download starts; nobody has fetched base/small end-to-end yet.
5. **Visual/a11y regressions** not automated — no screenshot baselines or axe run yet (candidate CARD-006).
6. E2E assumes the managed preview is running on `localhost:5173`.

## 5. Commands

```bash
bun run test          # vitest: 94 unit/component tests
bun run test:e2e      # playwright: 14 e2e tests (preview must be up)
bun tsc -b --noEmit   # typecheck
bun x playwright install chromium && bun x playwright install-deps chromium  # one-time
```
