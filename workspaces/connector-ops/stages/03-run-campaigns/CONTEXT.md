# Stage 03 — Run Campaigns (Layer 2)

**Job:** execute the two-sided campaign (demand + supply) exactly as written; capture every reply as inventory. No re-writing copy mid-run — the sequences file is canonical.

## Inputs
| Source | File/Location | Section/Scope | Why |
|--------|--------------|---------------|-----|
| Reference | `references/campaign-sequences.md` | Full file | Exact message copy — canonical, do not rewrite per run |
| Previous stage | `../../tracker.csv` | Rows with email, status `enriched` | Who receives which message today |
| Reference | `../../_config/operating-rules.md` | "Daily loop", "Decision rules", "KPIs" | Cadence and thresholds |
| Reference | `../../_config/oss-stack.md` | "Email sending" section | Listmonk/Mailcow sending mechanics + warmup discipline |

## Process
1. Import day's recipient set into Listmonk campaigns A (demand) / B (supply) — cap 20–30/mailbox/day
2. Send per sequence day numbers (Day 0 #1, Day 3 #2, Day 8 breakup)
3. Check Mailcow inboxes daily; log every reply to `tracker.csv` (status per reply-handling tables: `replied`, `qualified`, `parked`, `registered`…)
4. Non-hiring replies: log the revealed signal in `value_if_closed` notes — dead replies are inventory, never deleted
5. **Two-stage gate:** a demand reply showing live role + budget → write `output/input-brief.md` and STOP for stage 04

## Outputs
| Artifact | Location | Format |
|----------|----------|--------|
| Qualified demand brief | `output/input-brief.md` | One brief per qualified intro: company, contact, role, budget, timing |
| Tracker updates | `../../tracker.csv` | status/last_action/next_action columns |
| Reply inventory | `output/reply-log.md` | Every reply, including rejections (remappable later) |

## Audit (before declaring complete)
- [ ] Copy sent matches `references/campaign-sequences.md` verbatim (variables filled only)
- [ ] No supply-side contact made before stage 04 confirms demand interest
- [ ] Every reply logged same-day
