# Workspace: customer-obsession

**Purpose:** keep Murmur decisions anchored to the customer, not the tech. Every
copy change, feature, and pricing move traces back to a named pain in
`stages/01-customer-model/output/customer-model.md` and a kept promise in
`stages/02-promise-map/output/promise-map.md`.

## Why this workspace exists

The build is local-first voice dictation (Murmur, repo root). The risk that kills
products like this is falling in love with the engine while the customer's real
job goes unserved. This workspace is the canonical home for who we serve and
what we owe them.

## Stages (execution order)

| # | Stage | Job | Output |
|---|---|---|---|
| 1 | `01-customer-model` | Who we serve, in their words | `output/customer-model.md` |
| 2 | `02-promise-map` | Pain → promise → proof in the product | `output/promise-map.md` |
| 3 | `03-feedback-loop` | Signals in, decisions out (PROPOSE → SOLVE) | `output/feedback-log.md` |

## Rules

1. A landing claim or new feature must cite a row in the promise map. No row →
   no claim (or add the row first, human-approved).
2. Persona "pain" fields stay in quotation marks — customer language, never
   marketing language. Edit surfaces: humans may rewrite any `output/` file.
3. Feedback handling borrows the AZR PROPOSE/SOLVE loop: a signal PROPOSEs a
   task (pain + proposed fix), we SOLVE it (ship), and execution-verified
   results (typecheck, preview, user reply) are the reward.
4. One-way references: stages point at the repo root and at stage 1; nothing
   points forward.
