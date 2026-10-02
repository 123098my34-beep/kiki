# Gumroad listing — Murmur Pro

Paste-ready copy for the Gumroad product page. Every line here matches what the
code actually does today; if the app changes, this file changes first.

**Product name:** Murmur Pro
**Price:** $79 one-time (lifetime) · $8/month alternative
**License key:** delivered by Gumroad with the receipt, pasted once in the Studio
**Support:** support email goes here (Gumroad requires a real reply address)

---

## Short description (max ~160 chars)

> Local-first voice dictation that runs on your own machine. Whisper on-device,
> formatting you can audit, no account, no servers.

## Full description

Murmur turns speech into text you can paste anywhere — and the default engine
runs **entirely on your device**, in your browser tab, with no account and no
server on our side.

Free forever, no sign-up:

- unlimited dictation in the web Studio
- offline Whisper (tiny.en, ~40 MB one-time download) — your audio never leaves
  the machine, ever
- the full formatting engine: fillers stripped, punctuation added
- the built-in voice-command set — "new paragraph", "comma", "question mark",
  "scratch that"
- raw transcript shown next to the formatted one, with a chip for every edit

**Pro** unlocks four things that are actually implemented today:

1. **Browser engine** — your browser's own speech service for the lowest
   latency. It is a vendor cloud, which is exactly why it is not free.
2. **Sharper on-device models** — Whisper base.en (~80 MB) and small.en (~250 MB),
   both still fully offline, one-time download, cached afterwards.
3. **Advanced formatting presets** — *Concise* (strips hedges: "basically", "you
   know", "I mean") and *Meeting notes* (a spoken "new paragraph" becomes a bullet).
4. **Your own voice commands** — teach it a phrase and what it should insert
   (say "arrow", get →; say "hash", get #).

A desktop build (global hotkey, types into any application) is planned. It has
**not shipped yet**; when it does, its license is included with Pro — you will
not pay a second time for it.

## What you get

- Lifetime access to Pro on every device you activate it on
- License key by email, activated in the Studio (no account, no database)
- All future Pro features and model updates
- The free core stays free after your Pro expires — there is nothing to expire
  unless you cancel a subscription

## Honest requirements & limits

- Runs in a modern desktop browser (Chrome, Edge, Safari, Firefox). The Studio is
  a web app today; there is no native binary.
- The offline model downloads once from Hugging Face (~40 MB free, 80 MB / 250 MB
  for Pro models) and is cached by the browser. First run needs a connection.
- The offline engine is English (`.en` models).
- Web Speech / browser engine support varies by browser — it is the fallback, not
  the foundation.
- No meeting notetaker, no mobile app, no 100+ languages. Not yet.

## Refunds

30 days, no questions — the free tier is genuinely free, so try it first.