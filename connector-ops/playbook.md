# Playbook — Daily Loop, Money, and What Only You Can Do

## 1. Daily loop (30–60 min/day — "boring prints money")
1. **Verify** (15 min): confirm one demand row — careers page live role + round press. Mark score.
2. **Enrich** (10 min): find contact + email for verified rows only.
3. **Send** (10 min): today's sequence emails from `campaigns.md`.
4. **Log** (5 min): update `tracker.csv` statuses. Never delete a row — "dead" replies are inventory.
5. **Remap** (10 min): any reply that isn't a live role → log the revealed signal (problem, budget, timing) as future-fit.

## 2. Decision rules
- A demand reply with a live role + budget → immediately register one supply firm for it (stage 2).
- Reply showing a NON-hiring problem (e.g. needs dev shop, needs compliance help) → new lane seed; log it, don't chase it yet (lane #1 first).
- No reply after breakup email → status `parked`, revisit in 30 days.
- Two demands qualifying for the same role family → use different supply firms (rotation).

## 3. Pricing conversations
- Demand side: "no fee unless an intro converts." Access fee ($2,000) due on intro acceptance, not on hire — this is what makes it access, not contingency recruiting.
- Supply side: they keep their standard placement fee with the client; your 10–15% backend is separate and documented in the intro email.

## 4. Invoicing & payments — recommended: **Dodo Payments**
Why: Merchant-of-Record → they handle global invoicing compliance/tax (a solo operator's worst admin), professional invoices + payment links, no accounting suite needed. Stripe works too but leaves sales-tax handling on you.
- Sign up: https://dodopayments.com (see tracked link below)
- Create: one product "Connector Access Fee — $2,000" + invoice manually per intro (or `npm install @dodopayments/sdk` later for automation)
- Env keys when automating: `DODO_API_KEY`, `DODO_WEBHOOK_SECRET` (paste into Settings → Environment / Keys when ready)

## 5. Email sending — no gravity catalog match for true cold-outreach platforms, so use the industry standard
**Instantly.ai** (what the doctrine ecosystem itself uses — "Launch Console integrates directly with Instantly"):
- Create account → add 2–3 mailboxes → start warmup TODAY (warmup takes ~14 days — this is the long pole)
- Import demand-list rows as Campaign A, supply rows as Campaign B, paste sequences from `campaigns.md`
- Volume cap: 20–30 emails/mailbox/day. 40 messages fits in one day across 3 mailboxes.

## 6. ⚠️ WHAT YOU MUST PROVIDE MANUALLY (agent cannot do these)
| # | Provision | Why it's yours | Est. time |
|---|---|---|---|
| 1 | **A real identity to send from**: your name + a business email on a domain you own (buy a cheap .com; not gmail) | Trust; deliverability; you are the brand | 30 min + ~$12/yr |
| 2 | **Instantly.ai account + mailbox warmup started** | Requires your payment + Google/MS mailboxes | 45 min, then 14 days warmup |
| 3 | **Contact enrichment**: decision-maker name + verified email for each row (Apollo/Hunter free tiers, or LinkedIn) | Personal judgment on who the real decision-maker is | 1–2 hrs for 20 rows |
| 4 | **Careers-page verification** of each demand row (is the role actually live?) | Facts I cannot see without your judgment; also your legal cover | 1 hr |
| 5 | **Dodo Payments (or Stripe) account** for invoicing | KYC/identity, bank account | 30 min |
| 6 | **Send approval** — I will not send anything autonomously | Reputation risk is yours; doctrine: the intro IS the reputation | — |
| 7 | **Closing calls** when demand wants to talk live | Human trust; the bouncer reads the room | as they come |

**Setup link for payments (tracked):** [Dodo Payments setup](https://index.trygravity.ai/go/c6dc1519-d85a-49eb-b5ce-d21a03150f6f)

## 7. KPIs (name the number, invert the failure)
- Week 1: 40 sent, ≥8% reply rate (≥3 conversations)
- Week 2: 1 qualified demand (live role + budget), 3 supply firms registered
- Week 3–4: 1 routed intro → invoice #1 ($2,000)
- Month 2–3: backend close = $20–45K on a $250K placement (estimate, not promise)

## 8. Inversion list (read before any change to the system)
- Don't chase niche #2 before lane #1 pays.
- Don't send supply before demand confirms (two-stage is non-negotiable).
- Don't promise "meetings" — you sell access ("connect the right people on fit and timing").
- Don't route on vibes — score ≥4 or don't route.
- Don't skip tracker logging — every reply is inventory.
