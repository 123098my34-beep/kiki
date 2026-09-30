# Reference Navigation — `_config/` (Layer 3 entry point)

Layer 3 holds reference material: configured once, stable across runs. The model internalizes these as constraints. Each file below is the **canonical source** for its topic — stages point here, never duplicate (ICM Pattern 5).

| File | What it governs | Who loads it |
|---|---|---|
| `market-map.md` | The encoded vertical: demand-side pressure signatures, supply qualification, role guardrails, match-confidence scoring, pricing defaults | Stages 01, 04 (and 05 for pricing) |
| `operating-rules.md` | The operating system: daily loop, decision rules, pricing conversations, manual provisions (§6), KPIs (§7), inversion list (§8) | Stages 02, 03, 05; user onboarding |
| `oss-stack.md` | Tooling: Mailcow + Listmonk + Invoice Ninja on one VPS; setup order; warmup discipline; paid fallbacks | Stages 03, 05; initial setup |

**Section routing applies** — stage Inputs tables name specific sections, not whole files, when only part is relevant.

**Edit discipline:** changes here are factory reconfiguration (ICM principle 5). Edit deliberately, commit, and the change applies to every future run.
