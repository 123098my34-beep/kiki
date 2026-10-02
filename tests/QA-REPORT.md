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
Unit + component : 53 passed / 53 (6 files)
E2E (chromium)   : 11 passed / 11 (~14s)
tsc -b --noEmit  : clean
```

### Coverage map

| Area | Cases | Notes |
|---|---|---|
| Formatting engine (`src/lib/format.ts`) | 19 | fillers, typography, auto-punct on/off, commands on/off, punctuation commands, quotes, new line/paragraph, scratch-that (4 edge cases incl. empty + paragraph-break), multi-segment accumulation, stats |
| VAD (`src/lib/vad.ts`) | 6 | silence floor, min-speech hysteresis, hangover close, blip rejection, mid-hangover keep-alive, reset |
| Billing (`src/lib/billing.ts`) | 9 | entitlement default/persist/revoke, unconfigured checkout never self-grants Pro, license-key activation (reject short/invalid keys, accept + store, receipt line-break tolerance) |
| LiveDemo component | 4 | render, Web-Speech capability gating, sample → real engine output + chips, reset |
| Dictation engine (`src/lib/dictation.ts`) | 5 | on-device evidence defaults idle, flips true on session start and false on stop, engine label stays honest (local vs cloud), refused mic leaves evidence untouched, `resolveEngine("local") === "local"` |
| Studio component | 10 | first-run coach + persistence, controls, toggle state, cheat-sheet reveal, **offline is the enabled default**, on-device indicator toggle (idle → live → idle), badge labels the cloud engine when picked, Pro upsell without gating privacy |
| E2E — landing | 4 | sections/nav integrity, run-sample through real engine, **verified Wispr facts in compare table**, checkout soft-fail |
| E2E — studio | 5 | coach dismiss + reload persistence, cheat sheet, offline-is-free-default, **no audio/telemetry request leaves the page while the offline engine runs**, **mic click with fake device: no crash** |
| E2E — routing | 2 | branded 404, landing CTA → studio |

## 3. Wispr Flow comparison (verified against wisprflow.ai/pricing, 2026-10-01)

| Dimension | Murmur | Wispr Flow (their own pricing page) |
|---|---|---|
| Free tier | Unlimited, uncapped, no account | $0 but **capped 2,000 words/wk desktop, 1,000/wk mobile** |
| Paid | Pro $8/mo (or $79 once) | Pro **$15/user/mo** ($12 annual) · Growth $23 · Enterprise |
| Platforms | Web today; desktop license with Pro coming | Mac, Windows, iOS, Android |
| Transcription | Hybrid: browser engine **or on-device Whisper** | Cloud (per third-party teardowns) |
| Offline | Yes (after one-time ~40 MB model) | No |
| Edit transparency | Raw + formatted panes + change chips | Output only |
| Meeting notetaker | Not yet — dictation first | Included (limited on Free) |
| Compliance | n/a — no accounts, no stored data | SOC 2, ISO 27001, HIPAA-ready (BAA) |
| Languages | EN-first (Whisper-tiny.en / browser lang) | 100+ |

**Honest read:** Wispr wins on platforms, language coverage, notetaker and compliance; Murmur wins on price, offline/privacy, transparency and zero-account UX. Our compare table was corrected this pass (it previously said "Paid subscription" — inaccurate; Wispr has a free tier) and now states their advantages too — promise-map rule: no claim without proof.

**Corrections applied to `src/pages/Landing.tsx`:** price row (2,000 words/wk · $15/mo), platforms row, added meeting-notetaker row, added compliance row, footnote now cites source + date.

## 4. Known limitations (honest)

1. **Live speech recognition is not E2E-testable headless** — Chromium builds ship no speech service; Web Speech returns an error. Covered instead by: fake-mic no-crash test, capability gating unit test, and the engine's error-path copy. Manual checklist: open `/studio` in Chrome, dictate one sentence, confirm raw+formatted panes fill.
2. **Offline model download (~40 MB from HF hub)** not exercised in CI (network-heavy, slow). Fallback chain (4 model candidates) fails soft into an actionable error; verify manually once by selecting Offline with Pro unlocked.
3. **Visual/a11y regressions** not automated — no screenshot baselines or axe run yet (candidate CARD-006).
4. E2E assumes the managed preview is running on `localhost:5173`.

## 5. Commands

```bash
bun run test          # vitest: 53 unit/component tests
bun run test:e2e      # playwright: 11 e2e tests (preview must be up)
bun tsc -b --noEmit   # typecheck
bun x playwright install chromium && bun x playwright install-deps chromium  # one-time
```
