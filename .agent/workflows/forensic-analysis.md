---
description: Standard procedure for running a forensic analysis session
---

# Forensic Analysis Workflow

Procedure for conducting a structured forensic analysis session — from hypothesis to evidence export.

## Prerequisites

- All three servers running:
  - `cd app && npm run dev` (Next.js frontend)
  - `python -m uvicorn api_server:app --host 0.0.0.0 --port 8000 --reload` (FastAPI backend)
  - `ollama serve` (local LLM for AI-assisted analysis)

## 1. Define the Investigation Question

Before querying any database, clearly define:
- What are you looking for? (e.g., "Evidence of self-dealing in Q3 2019")
- Which evidence types are relevant? (financial, chat, email, flight records)
- What time period?
- Which actors? (JZ, LG, other parties)

## 2. Query Evidence Sources

### Chat Evidence
```sql
-- Query chat_master.db
SELECT date, sender, text FROM messages
WHERE date BETWEEN '2019-07-01' AND '2019-09-30'
  AND sender IN ('JZ', 'LG')
  AND text LIKE '%draw%'
ORDER BY date;
```

### Email Evidence
```sql
-- Query gmail_master_index.db (consult .agent/rules/email_search_guidelines.md)
SELECT date, sender, subject, body_snippet FROM emails
WHERE subject LIKE '%reconciliation%'
ORDER BY date;
```

### Financial Evidence
- Use the UI correlator at `/correlator`
- Or query `financials.db` directly

### Cross-Reference
- Use `/timeline` to see events across evidence types
- Use `/correlator` to find temporal correlations
- Use `/players` to see actor activity patterns

## 3. Extract Key Findings

For each piece of evidence found:
- Record the `canonical_id` from evidence_hub.db
- Note the original source file and hash
- Tag with intelligence categories (admission, financial, legal, flight)

### Intelligence Tagging
```bash
python scripts/harvest_intelligence_tags.py
```

## 4. Generate Outputs

### Evidence Cards
```bash
# Generate structured evidence cards
python scripts/link_evidence_metadata.py
```

### Forensic Narrative
```bash
python scripts/generate_forensic_narrative.py
```

### Paralegal Export Package
```bash
python scripts/generate_paralegal_exports.py
```

### RSMF Export (Court-Ready Email PDFs)
```bash
python scripts/generate_rsmf_export.py
```

## 5. Session Close Checklist

- [ ] All findings linked to canonical evidence IDs
- [ ] Chain of custody updated
- [ ] No original evidence files modified
- [ ] Intelligence tags applied
- [ ] Temporary scripts saved in `/tmp/` (not in project tree)
- [ ] Ready bag updated if significant new evidence found

## 6. Forensic Integrity Audit

Conclude every major session with an FIA:
```
See docs/forensic_integrity_audit.md
```

Verify:
1. **LOCKERS** — raw files ingested, metadata preserved
2. **HUB** — canonical_id formats correct, participant linkages valid
3. **BRAIN** — Rosetta Stone `master_transactions` table and walkthrough counts current
