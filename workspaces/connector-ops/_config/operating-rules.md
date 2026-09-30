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

## 4. Invoicing & payments — **open-source path (default): self-hosted Invoice Ninja**
See `oss-stack.md` for the full self-hosted stack (Mailcow + Listmonk + Invoice Ninja on one ~$6–9/mo VPS, vs ~$50–110/mo SaaS). Setup order and honest tradeoffs (manual warmup discipline, self-admin) are in that file.
- Create product "Connector Access Fee — $2,000" → payment link via your connected Stripe/PayPal → invoice on intro acceptance.
- Prefer zero-admin over zero-cost? The paid alternative is Dodo Payments (Merchant-of-Record, handles tax compliance): https://dodopayments.com

## 5. Email sending — **open-source path (default): Listmonk + Mailcow (self-hosted)**
Full stack, costs (~$6–9/mo vs Instantly's ~$37–97/mo), and the manual warmup discipline are in `oss-stack.md`. Sequence:
- Mailcow first (3 mailboxes, DKIM/SPF/DMARC) → warmup starts immediately → Listmonk → import both lists from `tracker.csv` → paste `campaigns.md` sequences as templates.
- Volume cap stays 20–30 emails/mailbox/day. 40 messages fits in one day across 3 mailboxes.
- Replies land in Mailcow inboxes — log them into `tracker.csv` by hand (Listmonk doesn't parse replies; that's the 10-min/day habit).

## 6. ⚠️ WHAT YOU MUST PROVIDE MANUALLY (agent cannot do these)
| # | Provision | Why it's yours | Est. time |
|---|---|---|---|
| 1 | **A real identity to send from**: your name + a business email on a domain you own (buy a cheap .com; not gmail) | Trust; deliverability; you are the brand | 30 min + ~$12/yr |
| 2 | **Mailcow + Listmonk deployed and mailbox warmup started** (self-hosted; needs your VPS + domain. Was: Instantly account) | Requires your payment, DNS, and server admin | 2–3 hrs setup, then 14 days warmup |
| 3 | **Contact enrichment**: decision-maker name + verified email for each row (Apollo/Hunter free tiers, or LinkedIn) | Personal judgment on who the real decision-maker is | 1–2 hrs for 20 rows |
| 4 | **Careers-page verification** of each demand row (is the role actually live?) | Facts I cannot see without your judgment; also your legal cover | 1 hr |
| 5 | **Invoice Ninja (self-hosted) or Dodo/Stripe account** for invoicing | KYC/identity, bank account, gateway keys | 30–60 min |
| 6 | **Send approval** — I will not send anything autonomously | Reputation risk is yours; doctrine: the intro IS the reputation | — |
| 7 | **Closing calls** when demand wants to talk live | Human trust; the bouncer reads the room | as they come |

**Payments (paid alternative only):** [Dodo Payments setup](https://index.trygravity.ai/go/c6dc1519-d85a-49eb-b5ce-d21a03150f6f)

## 7. KPIs (name the number, invert the failure)
- Week 1: server up, mailboxes warm, 40 enriched contacts, ≥8% reply rate target once sent
- Week 2: 1 qualified demand (live role + budget), 3 supply firms registered
- Week 3–4: 1 routed intro → invoice #1 ($2,000)
- Month 2–3: backend close = $20–45K on a $250K placement (estimate, not promise)

## 8. Inversion list (read before any change to the system)
- Don't chase niche #2 before lane #1 pays.
- Don't send supply before demand confirms (two-stage is non-negotiable).
- Don't promise "meetings" — you sell access ("connect the right people on fit and timing").
- Don't route on vibes — score ≥4 or don't route.
- Don't skip tracker logging — every reply is inventory.
