# OSS Stack — Self-Hosted Replacement for Paid Tools

Replaces: **Instantly.ai** (outreach, ~$37–97/mo) and **Dodo Payments** (MoR invoicing, per-transaction). Everything below is open source, self-hosted on one cheap VPS. Verified maintained as of Sep 2026.

## The stack

| Job | Tool | License | Why this one |
|---|---|---|---|
| Mail server (real mailboxes, DKIM/SPF/DMARC, replies) | **Mailcow** (dockerized) | GPL-3.0 | Full mail server with admin UI in Docker; gives you the 2–3 mailboxes the campaign needs, on your own domain |
| Campaigns & sequencing | **Listmonk** | AGPL-3.0 | Single Go binary + Postgres; campaigns, templates, per-subscriber variables, webhooks; the 2026 reviews rank it best for lean campaign sending |
| Invoicing & payment links | **Invoice Ninja** (self-hosted) | Elastic License (free self-host) | Mature default of the 2026 self-hosted trio (vs Crater/Akaunting); recurring invoices, reminders, client portal, payment-gateway hooks |
| VPS | any ~$5–6/mo KVM, 2 GB RAM (Hetzner/DO) | — | Mailcow + Listmonk + Invoice Ninja fit comfortably |

Fallbacks (encoded, in case a pick rots): Mautic (heavier campaigns), InvoiceShelf/Crater (lighter invoicing), Mailu (lighter mail server).

## Costs (before vs after)

| | Paid path | OSS path |
|---|---|---|
| Outreach | Instantly ~$37–97/mo + mailbox costs | VPS share ~$3 + domain |
| Invoicing | Dodo per-transaction MoR | self-hosted, gateway fees only (Stripe/PayPal standard) |
| **Fixed monthly** | **~$50–110** | **~$6–9** |

## Honest tradeoffs (inversion check — read before choosing)

1. **Deliverability is now YOUR problem.** Instantly automates warmup and inbox rotation; self-hosting means you run warmup discipline manually: send 5–10/day per mailbox weeks 1–2, 15–20/day weeks 3–4, keep bounce <2%, engage with replies. One spam flag on the domain and you burn it — buy the domain, don't use your main one.
2. **No orbit-style reply detection.** Listmonk doesn't parse replies like Instantly. Mitigation: replies land in Mailcow anyway — the L-sweep habit is "open the inbox, log replies to tracker.csv" (10 min/day, already in the playbook).
3. **Self-host = admin on you.** Updates, backups, monitoring. Mitigation: docker compose profiles, weekly `docker compose pull && up -d`, nightly volume backup cron.
4. **Cold out of a self-hosted mail server is the riskiest deliverability setup** (worst case). Acceptable here because volume is tiny (40 msgs, 20–30/day cap) and the doctrine's edge is signal quality, not volume. If scale ever matters, revisit.

## Setup order (the only correct order)

1. Domain → VPS → **Mailcow** first (needs ports 25/465/587/993 + rDNS set at the VPS provider)
2. Create 3 mailboxes (`you@`, `a2@`, `a3@`) → enable DKIM in Mailcow → publish SPF/DKIM/DMARC DNS
3. **Warmup starts the day mailboxes exist** — 14 days before any campaign send (unchanged long pole)
4. **Listmonk** (docker, same VPS) → connect SMTP to a Mailcow mailbox → import demand/supply lists from `tracker.csv` as two lists → paste sequences from `campaigns.md` as campaign templates (`{{.FirstName}}`, `{{.CompanyName}}` etc.)
5. **Invoice Ninja** → create product "Connector Access Fee — $2,000" → connect Stripe/PayPal keys for payment links → invoice on intro acceptance

## What stays manual (unchanged from playbook §6, minus the SaaS signups)

- Identity/domain purchase, VPS account, DNS entries
- Warmup discipline (now manual — calendar it)
- Contact enrichment + careers-page verification
- Send approval, closing calls
