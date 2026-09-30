# QUESTIONNAIRE.md — One-Time Workspace Setup (Layer 3)

Configures the factory, not the product (ICM Pattern 8): flat, all-at-once, system-level only, sensible defaults, ask once. Per-run details are collected conversationally by stage 03 at the start of each campaign cycle.

Answer all at once or accept the `[default]` by skipping:

1. Operator identity — name + business email sent from: `{{OPERATOR_NAME}}` / `{{OPERATOR_EMAIL}}` [required, no default]
2. Sending domain (owned, not gmail): `{{SENDING_DOMAIN}}` [default: same as email domain]
3. Lane focus (market the connector routes in): [default: AI/cyber talent routing per `_config/market-map.md`]
4. Access fee per intro: [default: $2,000]
5. Backend success fee: [default: 10% first-year comp; 15% if exclusive]
6. Sending volume cap per mailbox/day: [default: 20–30]
7. Mailboxes in rotation: [default: 3 (main + 2 warm)]
8. Outreach stack: [default: self-hosted Mailcow + Listmonk per `_config/oss-stack.md`]
9. Invoicing stack: [default: self-hosted Invoice Ninja per `_config/oss-stack.md`]
10. Currency for invoices: [default: USD]
11. Reply SLA (hours to log + act on replies): [default: 24]
12. Parking policy for "not now" replies (days): [default: 30]

**Derive, do not ask:** warmup duration (14 days from mailbox creation), KPI targets (§7), inversion list (§8) — all derived from operating-rules.

**After setup:** answers are baked into `_config/*` and `tracker.csv` headers. These questions are never shown again; changing them is factory reconfiguration via direct file edits.
