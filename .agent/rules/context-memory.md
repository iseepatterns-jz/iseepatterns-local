# Context & Memory Governance

Rules for maintaining persistent context and session continuity across conversations.

## Session Start Checklist

At the start of every session involving lawmodel1:
1. **Check KI summaries** for existing knowledge about the current topic
2. **Review recent conversation summaries** if the user references past work
3. **Verify database schemas** before any SQL query — never assume column names

## Persistent Data Sources

These databases are the source of truth. Always check schema before querying:

| Database | Location | Purpose |
|---|---|---|
| `workbench.db` | `data/rowboat-creative/RC-2026/db/workbench.db` | **Primary working DB** — `master_transactions` (22k rows, Rosetta Stone source of truth), `statement_transactions` (6.5k rows, imported bank statements + automatch results), claims, accounts, timeline, annotations, and 20+ other tables. Accessed via `getWorkbenchDb()` in `app/lib/db.ts`. |
| `chat_master.db` | `data/chat_master.db` | iMessage evidence (JZ/LG conversations) |
| `mbox_metadata.db` | `data/MBOX_LOCKER/mbox_metadata.db` | Email evidence index + chain of custody |
| `evidence_hub.db` | `data/evidence_hub.db` | Consolidated evidence registry (643k+ records) |

## Critical Architecture Decisions (Persistent Memory)

These decisions have been made and MUST NOT be re-learned or re-debated each session:

1. **Rosetta Stone is DB-first** — `workbench.db → master_transactions` (22k rows) is the source of truth. CSVs are exports for accountant audit review, NOT the source of truth. Legacy CSV at `data/FINANCIAL_LOCKER/ROWBOAT_CREATIVE_ROSETTASTONE/` is a backup reference only.
2. **Automatch stores results in DB** — matched Rosetta fields (`rosetta_user`, `rosetta_account`, `rosetta_category`, `rosetta_company`, match score) are stored in `workbench.db → statement_transactions` (6.5k rows).
3. **Workbench DB path** — the actual file is at `data/rowboat-creative/RC-2026/db/workbench.db`, accessed via `getWorkbenchDb()` in `app/lib/db.ts`. The `data/workbench.db` at project root is a separate, mostly empty DB for conversations only.
4. **Finalize creates backups first** — the finalize-verification API creates timestamped backups before any modifications and requires REVIEWED status.
5. **Evidence is sacrosanct** — original files in `data/*_LOCKER/` and `chatdb_storage/` are NEVER modified.
6. **Whitelist** — only JZ and LG messages are relevant unless explicitly instructed otherwise.

## Context Continuity Rules

1. **Never assume schema** — run `.schema <table>` or `PRAGMA table_info(<table>)` before querying
2. **Reference previous conversations** by checking brain artifacts when the user mentions past work
3. **Track automatch/Rosetta state** — financial matching logic has been rebuilt multiple times; always verify current implementation before modifying
4. **Chain of custody** — all evidence data modifications must be logged and traceable

## Evidence Integrity

- NEVER modify original evidence files (MBOX, EML, chat backups)
- All analysis should read from indexed databases, not raw sources
- Temporary scripts go in `/tmp/`, never in the project tree
- Label all forensic output with timestamps and session IDs
