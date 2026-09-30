# Stage 04 — Route Intro (Layer 2)

**Job:** route ONE qualified introduction — demand confirmed first, supply chosen by rotation, Clean Intro Forge copy, access fee invoiced on acceptance. This stage is where the money and the reputation live; human approval required before anything is sent.

## Inputs
| Source | File/Location | Section/Scope | Why |
|--------|--------------|---------------|-----|
| Previous stage | `../03-run-campaigns/output/input-brief.md` | Full file | The qualified demand: company, contact, role, budget, timing |
| Reference | `references/intro-template.md` | Full file | The Clean Intro Forge — <120 words, both-side context |
| Reference | `../01-source-markets/output/supply-list.md` | Fit column + rotation order | Which firm is next for this role family |
| Reference | `../01-source-markets/output/demand-list.md` | Verified rows | Cross-check demand details |
| Reference | `../../_config/market-map.md` | "Match confidence score" + "Pricing" | Score ≥4 required before routing |

## Process
1. Score the match (market-map formula). Below 4 → do not route; park with reason in `output/intro-log.md`
2. Select supply firm: best fit per role guardrails, skipping any firm already used for this role family (rotation rule)
3. Confirm supply firm's capacity + fee structure in writing (their standard terms apply to the client; our backend is separate and documented in the intro)
4. Draft the intro in `output/` using `references/intro-template.md` verbatim structure — names, role, salary band, city, both-side context
5. **Human gate:** user approves the intro text and both parties
6. Send reply-all from the demand thread; both sides reply-all keeps one thread
7. Log the intro in `output/intro-log.md` (date, parties, role, access fee due) + tracker row `intro_made`

## Outputs
| Artifact | Location | Format |
|----------|----------|--------|
| Intro message | `output/intro-[slug].md` | The exact text sent |
| Intro ledger entry | `output/intro-log.md` | Append-only: date, demand, supply, role, fee, status |
| Tracker update | `../../tracker.csv` | status `intro_made`, value_if_closed |

## Checkpoint + Audit
- Checkpoint: user steering on firm choice and intro text (creative + reputational decision)
- [ ] Match score ≥4 recorded in intro-log
- [ ] Rotation respected (no firm reused within same role family)
- [ ] Access fee amount confirmed with demand side BEFORE the intro goes out
