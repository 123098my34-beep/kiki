# Pipeline Status — connector-ops

Rendered per ICM `status` trigger convention (scan `stages/*/output/`):

```
[01-source-markets] --> [02-enrich-contacts] --> [03-run-campaigns] --> [04-route-intro] --> [05-invoice-backend]
     COMPLETE                PENDING                  PENDING                PENDING                 PENDING
     demand-list.md
     supply-list.md
```

**Notes:**
- Stage 01 output exists (10 demand + 10 supply targets) but rows are NOT yet verified — verification (✅ column) is the stage's remaining audit item.
- Stage 02+ empty: enrichment, sending, routing, invoicing have not begun.
- Nothing has ever been sent from this workspace. Human gates in stages 02→03 and 03→04 are armed.
- Last rendered: 2026-09-30.
