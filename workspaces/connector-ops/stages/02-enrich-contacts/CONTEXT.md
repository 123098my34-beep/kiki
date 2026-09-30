# Stage 02 — Enrich Contacts (Layer 2)

**Job:** attach a named decision-maker and verified email to every verified target. Human provides judgment on who the real decision-maker is (operating-rules §6).

## Inputs
| Source | File/Location | Section/Scope | Why |
|--------|--------------|---------------|-----|
| Previous stage | `../01-source-markets/output/demand-list.md` | Rows marked verified | Who to enrich (demand) |
| Previous stage | `../01-source-markets/output/supply-list.md` | All rows | Who to enrich (supply) |
| Reference | `../03-run-campaigns/references/campaign-sequences.md` | "Reply handling" sections | What personalization fields the messages need |
| Reference | `../../_config/operating-rules.md` | "Daily loop" step 2 | Enrichment habit and tools |

## Process
1. For each verified demand row: identify 1 decision-maker (CEO if <50 staff, else Head of Eng / CTO / CISO) — never info@
2. For each supply row: identify BD/principal contact — not the CEO
3. Verify each email (Apollo/Hunter free tiers or LinkedIn; user confirms judgment calls)
4. Write contacts into `tracker.csv` (contact_name, contact_title, email) and set status `enriched`
5. Personalization fields for campaigns.md: note one concrete hook per contact (funding amount, role title, firm practice) in the tracker's `signal` column

## Outputs
| Artifact | Location | Format |
|----------|----------|--------|
| Enriched contacts | `../../tracker.csv` | CSV column updates |
| Enrichment notes | `output/enrichment-log.md` | Per-contact sourcing notes (date, tool, confidence) |

## Checkpoint (human gate)
Present the enriched rows to the user for approval before stage 03 loads them. User confirms each contact is the right person to message.
