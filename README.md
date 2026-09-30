# kiki — an ICM-structured agent workspace repo

This repository is organized according to the **Interpretable Context Methodology** ([ICM](https://arxiv.org/abs/2603.16021), Van Clief & McDermott 2026): folder structure as agent architecture. Orchestration lives in the filesystem — numbered stages, markdown contracts, canonical references — not in code frameworks.

## Layout

```
AGENTS.md                       # agent activation rules + ICM architecture rules (Layer 0)
skills/                         # Layer 3: keyword-activated domain skills (ICM Pattern 9)
└── icm/                        #   all skills nested under the ICM folder
    ├── SKILL.md                #   'icm' → ICM methodology reference itself
    ├── hrm/SKILL.md            #   'hrm'  → Hierarchical Reasoning Model
    ├── azr/SKILL.md            #   'azr'  → Absolute Zero Reasoner
    └── connector/SKILL.md      #   'connector' → Belcaid deal-flow doctrine
workspaces/                     # operational pipelines (numbered stages = execution order)
└── connector-ops/              # reference implementation: connector business as a 5-stage ICM pipeline
```

## How to operate in this repo

1. Check the prompt prefix against `AGENTS.md`'s trigger table; load the matching skill (whole-turn expert mode).
2. For operational tasks, enter the relevant `workspaces/<name>/`, read its `CONTEXT.md`, then the target stage's `CONTEXT.md` — load only what the Inputs table names.
3. Respect human gates declared in stage contracts; respect one-way references and canonical sources.
4. New repeatable workflows = new `workspaces/<name>/` following the same conventions.
