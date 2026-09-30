# CONTEXT.md — Task Routing (Layer 1)

**Workspace:** connector-ops — AI/Cyber talent-routing connector business.
**Doctrine source:** ICM (Interpretable Context Methodology), arXiv:2603.16021 — folder structure as agent architecture. The numbered folders encode the execution order of the connector motion: Signal → Match → Route → Print.

## Task routing table

| Task | Go to | Notes |
|---|---|---|
| Understand the business model / doctrine | `skills/connector/SKILL.md` | Load only when the user's prompt starts with `connector` (see root `AGENTS.md`) |
| Find or verify demand & supply targets | `stages/01-source-markets/` | Stage contract inside |
| Add contact names + emails to lists | `stages/02-enrich-contacts/` | Stage contract inside |
| Send campaign messages / handle replies | `stages/03-run-campaigns/` | Exact copy in `references/campaign-sequences.md` |
| Route a qualified intro (demand confirmed → supply) | `stages/04-route-intro/` | Two-stage flow; NEVER contact supply before demand confirms |
| Invoice access fee / track backend | `stages/05-invoice-backend/` | Pricing in `_config/market-map.md` |
| Check pipeline state | run `status` trigger (root `AGENTS.md`) | Scans all `stages/*/output/` folders |
| Configure identity, rules, stack | `_config/` + `setup/` | Factory configuration — edit once, applies to all runs |

## Shared resources (Layer 3, cross-stage)

| Resource | Location | Role |
|---|---|---|
| Market encoding (signals, filters, scoring, pricing) | `_config/market-map.md` | Canonical — stages point here, never duplicate |
| Operating rules (daily loop, decision rules, KPIs, inversion list, manual provisions) | `_config/operating-rules.md` | Canonical |
| OSS tooling (Mailcow + Listmonk + Invoice Ninja; paid fallbacks) | `_config/oss-stack.md` | Canonical |
| Deal state | `tracker.csv` | The single ledger — every stage reads/writes rows here |

## Rules that govern every stage

1. One-way references only: stages reference `_config/` and earlier stages; nothing references forward.
2. `tracker.csv` is the canonical state — stage `output/` folders carry per-run artifacts only.
3. Human review gates: stages 02→03 and 03→04 require explicit user approval (sending, routing = reputation).
4. Context discipline: each stage's CONTEXT.md Inputs table is exhaustive. Load nothing else.
