# Feedback log (live)

Format: `### CARD-<n> — <status>` · status ∈ open / proposed / solving / verified / discarded

### CARD-001 — verified
- **Signal:** preview reviewers didn't know voice commands existed (assumed
  plain transcription only).
- **Promise:** P4.
- **Propose:** in-product command reference (cheat sheet) in Studio.
- **Solve:** `VOICE_COMMANDS` list exported from `src/lib/format.ts`, rendered
  in Studio as a collapsible reference.
- **Verify:** typecheck green; reference renders in preview; (user signal
  pending).

### CARD-002 — verified
- **Signal:** first-time visitors don't know what to press or say.
- **Promise:** P3, P5.
- **Propose:** first-run coach in Studio with three concrete things to try.
- **Solve:** dismissible coach card (dismiss persisted in localStorage).
- **Verify:** typecheck green; coach visible on first `/studio` visit.

### CARD-003 — proposed
- **Signal:** "trust" questions dominate FAQ drafts: where does audio go?
- **Promise:** P1, P6.
- **Propose:** per-engine "where your audio goes" transparency section on landing.
- **Solve:** (shipped this pass — awaiting human wording review).
- **Verify:** human review of the section copy.

### CARD-004 — open
- **Signal:** no support/contact affordance anywhere (P7 partial).
- **Propose:** footer contact link (mailto or marketplace page) — needs the
  human to decide the channel.

### CARD-005 — verified
- **Signal:** QA pass (2026-10-01) found the compare table overstated Wispr's
  price model ("Paid subscription" — they have a $0 tier capped at 2,000
  words/wk) and understated their platform set.
- **Promise:** P3 fairness — "fair comparison, no spin".
- **Propose:** correct rows to wisprflow.ai/pricing facts, add rows where they
  beat us (notetaker, SOC 2/ISO 27001), cite source+date in the footnote.
- **Solve:** `COMPARE` + footnote in `src/pages/Landing.tsx`.
- **Verify:** e2e test "compare table states verified Wispr facts" green;
  full suite 41+10 green — see `tests/QA-REPORT.md`.

### CARD-006 — verified
- **Signal:** P1 promised "audio never leaves this device" but the Studio gave no
  live proof of it, and the offline engine was Pro-gated — so the promise was
  both unverifiable in-product and locked behind payment.
- **Promise:** P1, P3.
- **Propose:** make privacy the zero-click choice — default engine flips to
  `local`, and an on-device activity indicator renders live evidence of local
  processing, toggling with engine state.
- **Solve:** `DictationEngine.evidence` + `onEvidence` callback
  (`src/lib/dictation.ts`); evidence badge in the Studio mic card
  (`data-testid="evidence-badge"`, reads "local processing active" / "engine idle"
  and names which engine is live); engine picker reordered offline-first and
  ungated; landing copy, pricing tiers and FAQ updated to match.
- **Verify:** `tests/unit/dictation.test.ts` (5 tests) + the indicator block in
  `tests/component/Studio.test.tsx` prove the toggle; e2e "no audio or telemetry
  leaves the page while the offline engine runs" proves egress is model-weights
  only. Full suite 53 unit/component + 11 e2e green — see `tests/QA-REPORT.md`.

### CARD-007 — solved (progress half); escape hatch still open
- **Signal:** with offline now the default, first dictation stalls ~40 MB of
  model download on a cold cache with no progress affordance.
- **Promise:** P1, P3.
- **Propose:** surface download progress on the evidence badge (bytes / percent)
  and offer a "use browser engine meanwhile" escape hatch.
- **Solve (progress):** `ModelProgress` + `onModelProgress`/`onModelError` in
  `src/lib/asr.ts`, fed by transformers.js `progress_callback` (the aggregate
  `progress_total` event, not per-file — files download in parallel and per-file
  events clobber each other). Threaded through `DictationEvidence` and rendered
  by the badge as `downloading model · N%` + `X MB / Y MB · one time`.
- **Solve (the lie this uncovered):** transformers.js awaits `get_file_metadata`
  *before* emitting its first progress event. So on a cold cache the badge
  claimed `local processing active` and `local · no data leaves this browser`
  while ~40 MB was in flight — exactly the two things the badge exists to
  promise. Added `evidence.preparing`, set whenever a local session starts and
  cleared on `ready`/error, rendering `preparing local model` and hiding the
  privacy line until weights are actually in hand.
- **Verify:** e2e "the badge admits it is not processing while the model fetch is
  blocked" holds the model host open and asserts the badge never says
  `local processing active` — **confirmed failing against the pre-fix code**
  (it rendered `local processing activelocal · no data leaves this browser`), so
  it is a real regression guard, not a tautology. 59 unit/component + 12 e2e
  green — see `tests/QA-REPORT.md`.
- **Still open:** no "use the browser engine meanwhile" escape hatch during the
  fetch. Human gate on whether to add one.
