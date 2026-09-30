# Stage 01 — Source Markets (Layer 2)

**Job:** find and verify demand (funded startups with live AI/cyber roles) and supply (specialist recruiting firms). One stage, one job: sourcing only — no enrichment, no outreach.

## Inputs
| Source | File/Location | Section/Scope | Why |
|--------|--------------|---------------|-----|
| Reference | `_config/market-map.md` | "Demand-side pressure signatures", "Supply-side qualification", "Match filters" | Signal definitions and guardrails |
| Working | `output/demand-list.md` | Full file | Current demand targets + verification column |
| Working | `output/supply-list.md` | Full file | Current supply targets + fit notes |

## Process
1. Sweep the sources named in `_config/market-map.md` (funding trackers, CIO/shortage reports, recruiting-firm roundups)
2. Append candidates to `output/demand-list.md` / `output/supply-list.md` with signal + source + date
3. Verify each demand row: funding round confirmed AND careers page shows a live role (mark ✅ in Verify column; unverified rows are never passed downstream)
4. Apply match filters from `_config/market-map.md` — reject targets that violate role guardrails
5. Update `tracker.csv` rows for new targets (side, company, signal, status `new`)

## Outputs
| Artifact | Location | Format |
|----------|----------|--------|
| Demand targets | `output/demand-list.md` | Table with Verify column |
| Supply targets | `output/supply-list.md` | Table with fit notes |
| Tracker rows | `../../tracker.csv` | CSV append/update |

## Audit (before declaring complete)
- [ ] Every demand row has a named signal and source
- [ ] No unverified row carries contact info downstream
- [ ] Lists hold ≥10 targets each before stage 02 consumes them
