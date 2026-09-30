# Stage 05 — Invoice & Backend (Layer 2)

**Job:** collect the access fee on intro acceptance and track the backend success fee to payment. Mechanical stage — no creative decisions; runs straight through.

## Inputs
| Source | File/Location | Section/Scope | Why |
|--------|--------------|---------------|-----|
| Previous stage | `../04-route-intro/output/intro-log.md` | Entries with status `intro_made`, not yet invoiced | What to bill |
| Reference | `../../_config/market-map.md` | "Pricing" | Fee amounts: $2,000 access / 10–15% backend |
| Reference | `../../_config/oss-stack.md` | "Invoicing & payments" row + setup order | Invoice Ninja self-hosted flow (paid fallback: Dodo/Stripe) |
| Reference | `../../_config/operating-rules.md` | "Pricing conversations" | What was promised to whom |

## Process
1. On demand-side acceptance of the intro: issue access-fee invoice ($2,000) via Invoice Ninja product "Connector Access Fee" — payment link attached
2. Record invoice number + date in `output/invoice-log.md` and tracker (`access_fee` column, status `invoiced`)
3. Set a follow-up for the placement outcome: did the supply firm place a candidate? (30/60/90-day checks)
4. On confirmed placement: invoice backend (10% first-year comp; 15% if exclusive per market-map) — status `backend_invoiced`
5. On payment: status `paid`; update KPI tallies in tracker notes

## Outputs
| Artifact | Location | Format |
|----------|----------|--------|
| Invoice ledger | `output/invoice-log.md` | Append-only: date, party, item, amount, invoice #, status |
| Tracker updates | `../../tracker.csv` | access_fee / status_backend / value_if_closed columns |
| KPI tally | `output/kpi-log.md` | Weekly rollup vs operating-rules §7 targets |

## Audit (before declaring complete)
- [ ] No invoice issued for an intro not logged by stage 04
- [ ] Backend % matches what the intro email documented
- [ ] Every status change in tracker has a dated ledger entry (audit trail)
