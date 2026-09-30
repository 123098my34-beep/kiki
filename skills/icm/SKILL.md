# Skill: ICM — Interpretable Context Methodology (Van Clief & McDermott)

> Paper: https://arxiv.org/abs/2603.16021 · Repo: https://github.com/RinDig/Interpretable-Context-Methodology · Author channel: https://www.youtube.com/@JEVanClief
> "Folder structure as agent architecture." Replaces framework-level orchestration (CrewAI/LangChain/AutoGen) with filesystem structure for sequential, human-reviewed workflows.

## The five-layer context hierarchy (agents read down, stop when served)

| Layer | File | Question | Size |
|---|---|---|---|
| 0 | `CLAUDE.md`/root identity | Where am I? | ~800 tok, always loaded |
| 1 | `CONTEXT.md` | Where do I go? (task routing) | ~300 tok |
| 2 | `stages/0N-*/CONTEXT.md` | What do I do? (stage contract) | 200–500 tok |
| 3 | `_config/`, `references/`, `skills/` | What rules apply? (reference, "the factory") | selective |
| 4 | `stages/*/output/` | What am I working with? (working artifacts, "the product") | selective |

**Layer 3 vs 4 is the key distinction:** L3 = internalize as constraints (voice, conventions — stable across runs); L4 = process as input (this run's material). Mixing them forces the model to sort context itself — separation is prevention, not compression (Liu et al.: irrelevant context degrades performance; ICM keeps stage context at 2–8K tokens vs 30–50K monolithic).

## Five design principles

1. **One stage, one job** (Unix/McIlroy, Parnas information-hiding) — a stage that researches does not also write.
2. **Plain text as the interface** — markdown/JSON only; no binary, no proprietary serialization; any editor can inspect any artifact.
3. **Layered context loading** — each stage loads only its Inputs-table scope; prevention over compression.
4. **Every output is an edit surface** — human edits stage output in place; next stage consumes the edited version (Horvitz mixed-initiative, Shneiderman direct manipulation).
5. **Configure the factory, not the product** — set up once (questionnaire), reuse for every run.

## The 15 conventions (abridged — canonical: `_core/CONVENTIONS.md` upstream)

Stage contracts (Inputs/Process/Outputs tables — exact shape, no exceptions) · stage handoffs via `output/` folders · one-way cross-references (no circular deps) · selective section routing (load the *section*, not the file) · canonical sources (one home per fact; pointers elsewhere) · CONTEXT.md = routing not content (25–80 lines) · tool prerequisites documented in the stage that uses them · flat all-at-once questionnaires (derive, don't ask; sensible defaults) · bundled skills in `skills/` · specs are contracts (WHAT/WHEN, not HOW) · checkpoints (pause for human steering in creative stages) · stage audits (unambiguous pass conditions) · value validation (lock the value before drafting) · docs over outputs (agents learn from reference docs, never from past outputs) · trigger keywords (`setup`, `status`).

## Naming

Folders/files `lowercase-with-hyphens` · stages zero-padded `01-` · placeholders `{{SCREAMING_SNAKE}}` · outputs `[slug]-[artifact-type].md`.

## Where ICM fits (and doesn't)

**Fits:** sequential + reviewable + repeatable workflows (content pipelines, research, reporting, monitoring digests, connector/deal operations).
**Doesn't:** real-time multi-agent chat loops, high-concurrency serving, complex automated branching — that's framework territory. ICM is complementary to MCP (integration layer vs context-delivery layer).

## In this repository

This repo itself follows ICM: operational work lives in `workspaces/<name>/` (see root `AGENTS.md` architecture rules). Skills live in `skills/icm/` — the ICM skill folder is the umbrella: `skills/icm/SKILL.md` (this file) plus domain skills bundled beneath it at `skills/icm/<name>/SKILL.md` (currently `hrm`, `azr`, `connector`) — Layer 3 domain knowledge per ICM Pattern 9. The `connector-ops` workspace is the reference implementation of the methodology applied to the connector business.
