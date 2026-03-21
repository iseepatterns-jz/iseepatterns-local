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
| `chat_master.db` | `data/chat_master.db` | iMessage evidence (JZ/LG conversations) |
| `gmail_master_index.db` | `data/MBOX_LOCKER/.../gmail_master_index.db` | Email evidence index |
| `evidence_hub.db` | `data/evidence_hub.db` | Consolidated evidence registry |
| `financials.db` | `app/data/financials.db` | Financial transaction data |

## Context Continuity Rules

1. **Never assume schema** — run `.schema <table>` or `PRAGMA table_info(<table>)` before querying
2. **Reference previous conversations** by checking brain artifacts when the user mentions past work
3. **Track automatch/Rosetta state** — financial matching logic has been rebuilt multiple times; always verify current implementation before modifying
4. **Chain of custody** — all evidence data modifications must be logged and traceable
5. **Whitelist awareness** — only JZ and LG messages are relevant; never process other participants without explicit instruction

## Evidence Integrity

- NEVER modify original evidence files (MBOX, EML, chat backups)
- All analysis should read from indexed databases, not raw sources
- Temporary scripts go in `/tmp/`, never in the project tree
- Label all forensic output with timestamps and session IDs
