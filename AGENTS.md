# Skills

Keyword-activated skills live in `skills/`. Check the user's prompt at the start of every turn:

| Prompt starts with | Skill file | Domain |
|---|---|---|
| `hrm` (e.g. `hrm ...`, `hrm: ...`) | `skills/hrm.md` | Hierarchical Reasoning Model — sapientinc/HRM |
| `azr` (e.g. `azr ...`, `azr: ...`) | `skills/azr.md` | Absolute Zero Reasoner — LeapLabTHU/Absolute-Zero-Reasoner |
| `connector` (e.g. `connector ...`, `connector: ...`) | `skills/connector.md` | Connector/deal-flow business model — Saad Belcaid (myoProcess, Connector OS) |

## Activation rules

- The trigger matches only when the prompt **begins** with the keyword (case-insensitive), immediately followed by whitespace, punctuation, or nothing.
- On a match, read the corresponding skill file from `skills/` and apply its guidance for the whole turn. Act as an expert in that repo: use its terminology, commands, conventions, and known pitfalls.
- If the request falls outside the skill's scope, still apply the skill where relevant and answer the rest normally.
- No trigger keyword → behave normally, do not load any skill.
- `hrm` inside a sentence that does not start the prompt (e.g. "fix the hrm bug later") still counts as a match since the prompt starts with it — but a prompt that merely *mentions* HRM mid-sentence does not activate the skill.
