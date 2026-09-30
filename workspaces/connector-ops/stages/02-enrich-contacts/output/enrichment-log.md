# Enrichment Log — Stage 02 Draft (Layer 4, awaiting human gate)

> **Status: DRAFT — DO NOT SEND.** Per the stage-02 checkpoint, nothing here moves to `tracker.csv` or downstream until the user confirms/corrects each row. Emails are NOT verified — this log proposes identity + likely email source only. Verify with Apollo/Hunter free tiers before any write-back.
>
> **Count note vs. tasking:** the demand list holds 14 rows, of which **4 are verified** (✅ round + careers). The other 10 (Round 1) never passed careers-page verification — stage-01 audit rule bars unverified rows from carrying contacts downstream, so they are listed in Section C as blocked, not enriched. Coverage: **4/4 verified demand + 10/10 supply.**
>
> Method: identity evidence from primary sources (company sites, funding press, LinkedIn profiles) gathered 2026-09-30. Decision-maker rule per stage-02 contract: CEO if <50 staff, else Head of Eng/CTO/CISO; supply = BD/principal, not the CEO (except where a founder-led boutique has no separate BD seat — flagged).
>
> **The `hrm` trigger was NOT active for this task** (this run was ordered by confirmation, not keyword). Same H/L pattern applied out of convention: plan the decision rule per row, run rapid identity sweeps, halt when evidence converged or clearly didn't.

---

## Section A — Demand-side candidates (verified rows only)

| # | Company | Proposed contact | Role | Why them (evidence, dated) | Confidence | Likely email + source | Personalization hook (stage-02 step 5) |
|---|---|---|---|---|---|---|---|
| 1 | Volta Infrastructure | **Ricard Boada** | Co-founder & CEO | ~100 staff (datacentremagazine Aug 6, 2026); CEO leads talent at this scale; confirmed via Businesswire launch press (Aug 4, 2026) + LinkedIn | HIGH | UNVERIFIED — `first@volta.com` pattern guess; Hunter/Apollo domain search on `volta.com` | $300M seed+A at $2.4B (a16z/Altimeter); scaling AI-native infra across Palo Alto/London/NY |
| 2 | Resolve AI | **Spiros Xanthos** | Founder & CEO | OpenTelemetry co-creator, 2 exits to Splunk; company hires across engineering incl. Infrastructure Security; confirmed via resolve.ai/about-us + funding press (Feb 2026) | HIGH | UNVERIFIED — `first@resolve.ai` pattern guess; Hunter/Apollo on `resolve.ai` | $125M Series A at $1B; OpenTelemetry pedigree; infra-security roles visible |
| 3 | Qevlar AI | **Hamza Sayah** | Co-founder & CTO | 77 employees (Tracxn, Jul 2026) → >50 staff rule → CTO for eng hiring; confirmed via qevlar.com/about + tamradar profile (Mar 2026) | HIGH | UNVERIFIED — `first@qevlar.com` pattern guess; Hunter/Apollo on `qevlar.com` | $30M Series A (Partech/Forgepoint); autonomous AI SOC; they publish on SOC analyst hiring pain — mirror that |
| 4 | Escape | **Tristan Kalos** | Co-founder & CEO | 29 employees (YC profile) → <50 staff rule → CEO; self-describes as running Product/Sales/Marketing; confirmed via LinkedIn /tkalos + escape.tech/blog/author/tristan | HIGH | UNVERIFIED — `first@escape.tech` pattern guess; Hunter/Apollo on `escape.tech` | $18M Series A (Balderton); 18 open roles + a Technical Recruiter post = scaling hiring now |

**Decision-maker alternatives if the user redirects:** Resolve → Mayank Agarwal (CTO) · Qevlar → Ahmed Achchak (CEO) or Hakim Jakhjoukh (CRO, GTM angle) · Escape → Antoine Carossio (CTO) · Volta → Sofia Gumuzio (Chief Corp Dev — capital partnerships, likely wrong for talent; listed for completeness).

---

## Section B — Supply-side BD seats (all 10 firms)

> Stage-02 rule: BD/principal contact, **not the CEO**. Reality check applied: several are founder-led boutiques with no separate BD seat — the founder IS the BD seat. Those are flagged `CEO-exception`. Names that did not converge in searches are marked **OPEN** — proposing a name without evidence would poison the intro quality the doctrine depends on.

| # | Firm | Proposed contact | Role | Evidence (dated 2026-09-30) | Confidence | Email source |
|---|---|---|---|---|---|---|
| 1 | Harnham | OPEN | AI/data practice director | Large firm (UK/US); leadership not surfaced in sweep — needs LinkedIn people-search: "Harnham" + AI/cyber practice lead | LOW | Hunter/Apollo on `harnham.com` after name confirmed |
| 2 | Recruits Lab | OPEN | Founder/principal | Firm self-describes as AI-specialist serving venture-backed startups (recruitslab.com); founder name not surfaced | LOW | Hunter/Apollo on `recruitslab.com` |
| 3 | Redfish Technology | OPEN | Practice lead / principal | AI/ML exec search confirmed (redfishtech.com); leadership name not surfaced | LOW | Hunter/Apollo on `redfishtech.com` |
| 4 | Blue Signal Search | **Matt Walsh** | CEO & Founder — `CEO-exception` | Founder-led boutique; bio on bluesignal.com/about + LinkedIn /mattwalshcsam ("CEO & Founder") | HIGH | Hunter/Apollo on `bluesignal.com` |
| 5 | KORE1 | OPEN | BD/principal | AI staffing confirmed (kore1.com); leadership not surfaced | LOW | Hunter/Apollo on `kore1.com` |
| 6 | Alpha Apex Group | OPEN | Principal | AI/data/NLP placement confirmed; publishes rankings content but no named leadership in sweep | LOW | Hunter/Apollo on `alphaapexgroup.com` |
| 7 | Talentfoot | OPEN | Founder/principal | AI exec search confirmed (talentfoot.com); founder name not surfaced | LOW | Hunter/Apollo on `talentfoot.com` |
| 8 | Christian & Timbers | OPEN | Managing partner | Retained AI exec search confirmed; leadership not surfaced | LOW | Hunter/Apollo on `christianandtimbers.com` |
| 9 | Tecla | OPEN | Founder/BD lead | AI-talent sourcing confirmed (tecla.io, publishes 2026 rankings); leadership not surfaced | LOW | Hunter/Apollo on `tecla.io` |
| 10 | MSH Talent | OPEN | BD/principal | AI/LLM staffing confirmed (talentmsh.com); leadership not surfaced | LOW | Hunter/Apollo on `talentmsh.com` |

---

## Section C — Blocked demand rows (do NOT enrich yet)

Rows 1–10 of the Round-1 demand list (Onyx Security, Nexthop AI, Uncommon.io, BackOps AI, Qurrent, Femtum, Celloid, GalaxEye, Axiom Math AI, Cognition AI) have **no ✅ verification** — careers-page + round confirmation (user provision §6 #4) has not run on them. Per stage-01 audit ("no unverified row carries contact info downstream"), no names or emails are proposed here. They unblock the moment the user verifies them.

---

## Section D — Human gate checklist (stage-02 checkpoint)

- [ ] **A1–A4:** confirm/correct the four decision-maker picks (or swap to a listed alternative)
- [ ] **B:** approve the `CEO-exception` approach for founder-led boutiques (Blue Signal now; same pattern will apply to others when named) or redirect to practice leads
- [ ] **B OPEN rows (9):** either name the right person yourself (fastest, §6 judgment) or approve a follow-up LinkedIn people-search pass by the agent
- [ ] **Email verification:** approve Apollo/Hunter run — note free-tier daily caps; §6 #3 makes verification the user's judgment call, so expect a split: agent drafts, user verifies
- [ ] After confirmation: agent writes confirmed rows into `tracker.csv` (contact_name, contact_title, email; status `enriched`) and presents the stage-02 checkpoint
- [ ] Stage 03 remains armed but gated: no send without explicit approval (§6 #6), and Campaign B (supply) stays locked until stage 04 confirms demand interest (two-stage gate)

**References (one-way, do not edit from here):** stage contract `../CONTEXT.md` · campaign personalization fields `../03-run-campaigns/references/campaign-sequences.md` · enrichment habit `../../_config/operating-rules.md` §1 step 2 · manual provisions §6 · market-map scoring.
