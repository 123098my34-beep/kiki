# Pipeline Status — connector-ops

Rendered per ICM `status` trigger convention (scan `stages/*/output/`):

```
[01-source-markets] --> [02-enrich-contacts] --> [03-run-campaigns] --> [04-route-intro] --> [05-invoice-backend]
     COMPLETE                IN PROGRESS               ACTIVE                 PENDING                 PENDING
     demand-list.md          enrichment-log.md         input-brief.md
     supply-list.md          (9 contacts in tracker)   (1 of 20 sent)
```

**Notes:**
- Stage 01 COMPLETE: demand side 14 rows (4 verified ✅: Volta, Resolve AI, Qevlar AI, Escape; 10 Round-1 rows still unverified), supply side 10/10 firms verified with dated evidence.
- Stage 02 IN PROGRESS: gate PASSED 2026-09-30 — 4 demand contacts + 5 supply names user-confirmed in `tracker.csv` (`contact-confirmed`; Talentfoot `enriched`). 5 supply seats still `open-name`. Emails unverified except Talentfoot — free/OSS tools only per user decision (`_config/oss-stack.md`).
- Stage 03 ACTIVE (Plan B, domain-free MVP): rubric gained the +1 multi-opening surge rule (user-approved 2026-09-30) → **Volta qualifies at score 5**. **First send happened 2026-09-30**: email #1 to Ricard Boada (ricard@volta.com) from the user's personal Gmail — user sends, agent never sends (§6 #6). Day-3 follow-up Oct 3, Day-8 breakup Oct 8. Resolve/Qevlar/Escape MX-verified, queued.
- Stage 04 gate ARMED: no supply contact (Recruits Lab first in rotation) until demand confirms live role + budget. Nothing has been routed or invoiced yet.
- Last rendered: 2026-09-30 (post-first-send).
