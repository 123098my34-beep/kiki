# Enrichment Log — Stage 02 (gate PASSED 2026-09-30 for named rows)

> **Status: GATE PASSED.** The user confirmed the Section A picks and the CEO-exception pattern on 2026-09-30 (see `hrm continue` turn). Named rows are written into `tracker.csv` with status `contact-confirmed` (Talentfoot → `enriched` — her email is self-published on the firm's own team page). Emails for the other rows are still UNVERIFIED — free/OSS tools only (see `_config/oss-stack.md`, "Free enrichment tools"). No send. The stage-03 send gate stays armed.
>
> **Count note vs. tasking:** the demand list holds 14 rows, of which **4 are verified** (✅ round + careers). The other 10 (Round 1) never passed careers-page verification — stage-01 audit rule bars unverified rows from carrying contacts downstream, so they are listed in Section C as blocked, not enriched. Coverage: **4/4 verified demand + 10/10 supply.**
>
> Method: identity evidence from primary sources (company sites, funding press, LinkedIn profiles) gathered 2026-09-30. Decision-maker rule per stage-02 contract: CEO if <50 staff, else Head of Eng/CTO/CISO; supply = BD/principal, not the CEO (except where a founder-led boutique has no separate BD seat — flagged).
>
> **The `hrm` trigger was NOT active for this task** (this run was ordered by confirmation, not keyword). Same H/L pattern applied out of convention: plan the decision rule per row, run rapid identity sweeps, halt when evidence converged or clearly didn't.

---

## Section A — Demand-side candidates (verified rows only) — ✅ CONFIRMED BY USER

| # | Company | Proposed contact | Role | Why them (evidence, dated) | Confidence | Likely email + source | Personalization hook (stage-02 step 5) |
|---|---|---|---|---|---|---|---|
| 1 | ✅ Volta Infrastructure | **Ricard Boada** | Co-founder & CEO | ~100 staff (datacentremagazine Aug 6, 2026); CEO leads talent at this scale; confirmed via Businesswire launch press (Aug 4, 2026) + LinkedIn | HIGH | UNVERIFIED — `first@volta.com` pattern guess; free-tool lookup on `volta.com` | $300M seed+A at $2.4B (a16z/Altimeter); scaling AI-native infra across Palo Alto/London/NY |
| 2 | ✅ Resolve AI | **Spiros Xanthos** | Founder & CEO | OpenTelemetry co-creator, 2 exits to Splunk; company hires across engineering incl. Infrastructure Security; confirmed via resolve.ai/about-us + funding press (Feb 2026) | HIGH | UNVERIFIED — `first@resolve.ai` pattern guess; free-tool lookup on `resolve.ai` | $125M Series A at $1B; OpenTelemetry pedigree; infra-security roles visible |
| 3 | ✅ Qevlar AI | **Hamza Sayah** | Co-founder & CTO | 77 employees (Tracxn, Jul 2026) → >50 staff rule → CTO for eng hiring; confirmed via qevlar.com/about + tamradar profile (Mar 2026) | HIGH | UNVERIFIED — `first@qevlar.com` pattern guess; free-tool lookup on `qevlar.com` | $30M Series A (Partech/Forgepoint); autonomous AI SOC; they publish on SOC analyst hiring pain — mirror that |
| 4 | ✅ Escape | **Tristan Kalos** | Co-founder & CEO | 29 employees (YC profile) → <50 staff rule → CEO; self-describes as running Product/Sales/Marketing; confirmed via LinkedIn /tkalos + escape.tech/blog/author/tristan | HIGH | UNVERIFIED — `first@escape.tech` pattern guess; free-tool lookup on `escape.tech` | $18M Series A (Balderton); 18 open roles + a Technical Recruiter post = scaling hiring now |

**Decision-maker alternatives if the user redirects:** Resolve → Mayank Agarwal (CTO) · Qevlar → Ahmed Achchak (CEO) or Hakim Jakhjoukh (CRO, GTM angle) · Escape → Antoine Carossio (CTO) · Volta → Sofia Gumuzio (Chief Corp Dev — capital partnerships, likely wrong for talent; listed for completeness).

---

## Section B — Supply-side BD seats — 5 named, 5 still OPEN

> Stage-02 rule: BD/principal contact, **not the CEO**. Founder-led boutiques have no separate BD seat — the founder IS the seat (user approved this `CEO-exception` pattern on 2026-09-30). Names marked ✅ were found in dated sweeps and confirmed by the user; **OPEN** rows stay honest — no guesses.

| # | Firm | Contact | Role | Evidence (dated 2026-09-30) | Confidence | Email source | Tracker status |
|---|---|---|---|---|---|---|---|
| 1 | ✅ Harnham | **Mark Bremer** | Managing Director & Partner (US) | harnham.com/leadership-team + LinkedIn /markbremer ("MD & Partner, US", 16+ yrs, at Harnham since 2015) | HIGH | free-tool lookup on `harnham.com` | `contact-confirmed` |
| 2 | ✅ Recruits Lab | **Darren Nelson** | Founder & CEO (`CEO-exception`) | recruitslab.com homepage, /about, /recruiters, /author/darren-nelson | HIGH | free-tool lookup on `recruitslab.com` | `contact-confirmed` |
| 3 | OPEN Redfish Technology | — | Practice lead / principal | Two sweeps (incl. name-guess probes) did not converge 2026-09-30 | — | LinkedIn people-search first | `open-name` |
| 4 | ✅ Blue Signal Search | **Matt Walsh** | CEO & Founder (`CEO-exception`) | bluesignal.com/about + LinkedIn /mattwalshcsam ("CEO & Founder") | HIGH | free-tool lookup on `bluesignal.com` | `contact-confirmed` |
| 5 | ✅ KORE1 | **Tom Kenaley** | Co-Founder & President | kore1.com/our-team + LinkedIn /tomkenaley | HIGH | free-tool lookup on `kore1.com` | `contact-confirmed` |
| 6 | OPEN Alpha Apex Group | — | Principal | No leadership name surfaced 2026-09-30 | — | LinkedIn people-search first | `open-name` |
| 7 | ✅ Talentfoot | **Camille Fetter** | Founder & CEO (`CEO-exception`) | talentfoot.com/team/camille + /our-team — **email self-published: Camille.Fetter@talentfoot.com** | VERIFIED | none needed — already public | `enriched` |
| 8 | OPEN Christian & Timbers | — | Managing partner | No leadership name surfaced 2026-09-30 | — | LinkedIn people-search first | `open-name` |
| 9 | OPEN Tecla | — | Founder/BD lead | No leadership name surfaced 2026-09-30 | — | LinkedIn people-search first | `open-name` |
| 10 | OPEN MSH Talent | — | BD/principal | No leadership name surfaced 2026-09-30 | — | LinkedIn people-search first | `open-name` |

---

## Section C — Blocked demand rows (do NOT enrich yet)

Rows 1–10 of the Round-1 demand list (Onyx Security, Nexthop AI, Uncommon.io, BackOps AI, Qurrent, Femtum, Celloid, GalaxEye, Axiom Math AI, Cognition AI) have **no ✅ verification** — careers-page + round confirmation (user provision §6 #4) has not run on them. Per stage-01 audit ("no unverified row carries contact info downstream"), no names or emails are proposed here. They unblock the moment the user verifies them.

---

## Section D — Gate record (2026-09-30)

- [x] **A1–A4:** user confirmed all four decision-maker picks — gate PASSED
- [x] **B:** `CEO-exception` pattern approved for founder-led boutiques
- [x] **B OPEN rows:** user approved follow-up name sweeps — 5 named in the same pass (Bremer, Nelson, Walsh, Kenaley, Fetter); 5 remain OPEN (Redfish, Alpha Apex, C&T, Tecla, MSH) — next step is LinkedIn people-search (user's call, or agent pass on request)
- [x] **Email tooling:** user chose **free/OSS only** — no paid enrichment. Free-tool plan lives in `_config/oss-stack.md` → "Free enrichment tools". Talentfoot email needs no tool (self-published).
- [x] Tracker write-back for confirmed rows done (status `contact-confirmed`; Talentfoot `enriched`)
- [ ] **Still open (user):** email verification on the 8 named-but-unverified contacts · domain + Mailcow warmup start · 60+ days role probes (score 2→4 lift)
- [ ] **Armed:** stage 03 send gate (§6 #6) and stage 04 two-stage gate — nothing sends without explicit approval

**References (one-way, do not edit from here):** stage contract `../CONTEXT.md` · campaign personalization fields `../03-run-campaigns/references/campaign-sequences.md` · enrichment habit `../../_config/operating-rules.md` §1 step 2 · manual provisions §6 · market-map scoring.
