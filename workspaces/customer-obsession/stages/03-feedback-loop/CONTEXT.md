# Stage 03 — feedback-loop

**Job:** turn customer signals into shipped fixes without losing the thread.

## Inputs
- `../02-promise-map/output/promise-map.md`
- Signal sources: marketplace reviews, support email, in-product feedback,
  session replays (if ever added — requires human approval, privacy-first),
  `output/feedback-log.md`

## Contract — PROPOSE / SOLVE (borrowed from AZR self-play)
1. **PROPOSE:** every signal becomes a task card in `output/feedback-log.md`
   with persona, promise touched, and a proposed fix. Cards are validated by
   execution (does the fix typecheck, does the preview show it), not opinion.
2. **SOLVE:** ship the smallest fix that keeps the promise.
3. **REWARD:** a card reaches `verified` only when checks pass AND the outcome
   is observable (user reply, review, typecheck + preview green). A card with
   no verifiable reward stays `proposed` — it is not done.

## Checkpoint
- Anything touching payments, outreach, or public statements: human gate.
