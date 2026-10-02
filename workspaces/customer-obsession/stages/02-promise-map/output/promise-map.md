# Murmur — promise map (draft, human-editable)

| # | Persona pain | Promise (sayable copy) | Proof in product | Status |
|---|---|---|---|---|
| P1 | "Cloud dictation reads my words" | "Offline by default: your audio never leaves this device — and the Studio proves it live" | `src/lib/asr.ts` local session is the default preference; on-device activity indicator in `src/pages/Studio.tsx` driven by `DictationEngine.evidence`; E2E asserts no non-model request leaves the page | ✅ shipped |
| P2 | "I can't tell what the tool changed" | "Raw transcript always shown next to the output, with chips for every edit" | dual panes + stats chips in Studio & landing demo | ✅ shipped |
| P3 | "Paid tools want a card before value" | "Free core: dictate with no account and no card" | `/studio` open, no auth anywhere | ✅ shipped |
| P4 | "I didn't know it could do that" | "Voice commands: new paragraph, comma, scratch that" | `VOICE_COMMANDS` in `src/lib/format.ts`, rendered in Studio | ✅ shipped |
| P5 | "Wrists hurt, typing is slow" | "Speak — it's already typed right" | hero + working Studio | ✅ shipped |
| P6 | "What happens to my audio, honestly?" | Transparent per-engine explanation (browser vendor vs on-device) | "Where your audio goes" section on landing | ✅ shipped |
| P7 | "No servers means no support?" | A real feedback path (marketplace reviews + contact) | `03-feedback-loop` workspace + footer link (TODO) | 🔶 partial |
| P8 | "Desktop is where dictation actually lives" | "Desktop app license included with Pro when it ships" | pricing copy only — no build yet | 🔶 promised |
| P9 | "I want to buy where I already have an account" | "Buy on Gumroad — key by email; paste it in the Studio to unlock" | `VITE_GUMROAD_PRODUCT_URL` CTA on pricing + license activation card in Studio (`src/lib/billing.ts`) | ✅ shipped (needs product URL) |
