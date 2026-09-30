# connector-ops — AI/Cyber Talent-Routing Connector Workspace

An **ICM workspace** (Interpretable Context Methodology — Van Clief & McDermott, [arXiv:2603.16021](https://arxiv.org/abs/2603.16021)): folder structure as agent architecture. No orchestration framework — the numbered folders are the pipeline, markdown files are the control plane, and one agent reads the right files at the right moment.

**Lane (X connects to Y):** *freshly-funded AI & cybersecurity startups ↔ specialist AI/cyber recruiting firms.*
The connector motion encoded below: **Signal → Match → Route → Print** (doctrine: `skills/icm/connector/SKILL.md`).

## Folder map (what everything is)

```
connector-ops/
├── CONTEXT.md            # Layer 1 — task routing: which stage handles what
├── tracker.csv           # canonical deal state (the one ledger)
├── _config/              # Layer 3 — the factory (stable across runs)
│   ├── CONTEXT.md            # navigation for this folder
│   ├── market-map.md         # signals, filters, scoring, pricing (canonical)
│   ├── operating-rules.md    # daily loop, decisions, KPIs, provisions (canonical)
│   └── oss-stack.md          # Mailcow + Listmonk + Invoice Ninja (canonical)
├── setup/
│   └── QUESTIONNAIRE.md      # one-time factory configuration
└── stages/               # the pipeline — numbering IS the execution order
    ├── 01-source-markets/    # find + verify demand & supply
    ├── 02-enrich-contacts/   # named contacts + verified emails (human gate)
    ├── 03-run-campaigns/     # send the 40 messages, log every reply
    ├── 04-route-intro/       # ONE qualified intro, two-stage flow (human gate)
    └── 05-invoice-backend/   # $2K access fee + 10–15% backend
```

Every stage folder contains `CONTEXT.md` (Layer 2 contract: Inputs / Process / Outputs [+ checkpoints & audits]) and `output/` (Layer 4 working artifacts). References live in the stage's `references/` or the workspace `_config/` — Layer 3, stable across runs.

## How to run it

- **`status`** — pipeline state (scans all `stages/*/output/`):
  ```
  [01-source-markets] --> [02-enrich-contacts] --> [03-run-campaigns] --> [04-route-intro] --> [05-invoice-backend]
     COMPLETE               PENDING                   PENDING                   PENDING                  PENDING
     (demand-list.md, supply-list.md)
  ```
- **`setup`** — answer `setup/QUESTIONNAIRE.md` once; placeholders get baked in
- **Stage work** — enter a stage, its CONTEXT.md tells you what to load and do; every output is an edit surface a human can fix before the next stage reads it

## Why ICM here

Sequential (stage N reads stage N−1's output), reviewable (sending/intro/invoice = human gates — reputation work), repeatable (same pipeline, new targets each run). Exactly the class of workflow the methodology names as its fit.

## The five-layer context hierarchy in this workspace

| Layer | File(s) | Question it answers | Size discipline |
|---|---|---|---|
| 0 | root `AGENTS.md` + this README | "Where am I?" | always loaded |
| 1 | `CONTEXT.md` | "Where do I go?" | ~40 lines |
| 2 | `stages/0N-*/CONTEXT.md` | "What do I do?" | 30–60 lines each |
| 3 | `_config/*`, `references/*`, `skills/icm/connector/SKILL.md` | "What rules apply?" | loaded per Inputs table |
| 4 | `stages/*/output/*`, `tracker.csv` | "What am I working with?" | changes every run |

One-way references only: stages → `_config/` + earlier stages. Nothing points forward. `tracker.csv` is the single canonical state; `output/` folders are per-run artifacts.
