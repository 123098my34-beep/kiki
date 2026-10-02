# Skills

Keyword-activated skills live in `skills/icm/` (nested under the ICM skill folder). Check the user's prompt at the start of every turn:

| Prompt starts with | Skill file | Domain |
|---|---|---|
| `hrm` (e.g. `hrm ...`, `hrm: ...`) | `skills/icm/hrm/SKILL.md` | Hierarchical Reasoning Model — sapientinc/HRM |
| `azr` (e.g. `azr ...`, `azr: ...`) | `skills/icm/azr/SKILL.md` | Absolute Zero Reasoner — LeapLabTHU/Absolute-Zero-Reasoner |
| `connector` (e.g. `connector ...`, `connector: ...`) | `skills/icm/connector/SKILL.md` | Connector/deal-flow business model — Saad Belcaid (myoProcess, Connector OS) |
| `icm` (e.g. `icm ...`, `icm: ...`) | `skills/icm/SKILL.md` | Interpretable Context Methodology — Van Clief & McDermott (arXiv:2603.16021) |

## Activation rules

- The trigger matches only when the prompt **begins** with the keyword (case-insensitive), immediately followed by whitespace, punctuation, or nothing.
- On a match, read the corresponding skill file from `skills/icm/` and apply its guidance for the whole turn. Act as an expert in that repo: use its terminology, commands, conventions, and known pitfalls.
- **Pairing rule (user instruction, 2026-10-02):** `azr` is always applied **together with** `hrm`. When the prompt starts with `azr`, load **both** `skills/icm/azr/SKILL.md` and `skills/icm/hrm/SKILL.md` for that turn. AZR supplies the PROPOSE/SOLVE self-play framing for the work; HRM supplies the hierarchical multi-timescale framing for how it is executed (slow planning module, many fast detail steps, adaptive stopping). `azr` alone is never sufficient.
- If the request falls outside the skill's scope, still apply the skill where relevant and answer the rest normally.
- No trigger keyword → behave normally, do not load any skill.
- `hrm` inside a sentence that does not start the prompt (e.g. "fix the hrm bug later") still counts as a match since the prompt starts with it — but a prompt that merely *mentions* HRM mid-sentence does not activate the skill.

# Repository architecture — ICM (Interpretable Context Methodology)

This repo follows **ICM** (Van Clief & McDermott, [arXiv:2603.16021](https://arxiv.org/abs/2603.16021)): *folder structure as agent architecture*. All operational work is organized as ICM workspaces under `workspaces/`.

## Rules for any agent working in this repo

1. **Navigate, don't memorize.** In a workspace, read its `CONTEXT.md` (Layer 1) first, then the specific stage's `CONTEXT.md` (Layer 2). Load only what the stage's Inputs table names — layers 3/4 are loaded selectively, never wholesale. Fewer irrelevant tokens = better output.
2. **Stage numbering is execution order.** `stages/01-* → 02-* → …`; each stage reads the previous stage's `output/` and writes its own. One stage, one job — never merge stages' responsibilities.
3. **Every output is an edit surface.** A human may edit any file in a stage's `output/` before the next stage runs; the next stage consumes the edited version. Respect what the human left there.
4. **Canonical sources.** Every piece of information has one home (`_config/`, `references/`). Stages point to it; never duplicate rules into stage files. One-way references only — nothing references forward or circularly.
5. **Reference vs working context.** Layer 3 (`_config/`, `references/`, `skills/`) = stable constraints to internalize. Layer 4 (`output/`, per-run artifacts) = input to process. Don't mix them.
6. **Human gates are non-negotiable.** Where a stage contract declares a Checkpoint (e.g. sending outreach, routing an intro, issuing an invoice), stop and get user approval. Reputation work is never autonomous.
7. **Triggers:** `status` (in a workspace) renders the pipeline state by scanning `stages/*/output/`; `setup` (in a workspace) runs its `setup/QUESTIONNAIRE.md` once and bakes answers into the config files.
8. **New repeatable workflows become new workspaces** under `workspaces/`, built stage-by-stage following `stages/` conventions above — not as loose folders at the repo root.
