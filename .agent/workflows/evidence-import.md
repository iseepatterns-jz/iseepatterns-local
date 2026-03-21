---
description: Import and index new evidence into the lawmodel1 pipeline
---

# Evidence Import Workflow

Standard procedure for importing new evidence into the lawmodel1 system.

## Prerequisites

- FastAPI backend running: `python -m uvicorn api_server:app --host 0.0.0.0 --port 8000 --reload`
- Next.js frontend running: `cd app && npm run dev`

## 1. Identify Evidence Type

| Type | Source Format | Target Database | Ingest Script |
|---|---|---|---|
| iMessages | chat.db (iMazing/M1 Studio backup) | `chat_master.db` | `scripts/consolidate_master_chat.py` |
| Gmail | .mbox (zipped) | `gmail_master_index.db` | `scripts/index_mbox_master.py` |
| EML files | .eml (individual emails) | evidence_hub.db | `scripts/generate_rsmf_export.py` |
| Financial statements | .csv/.xlsx | `financials.db` | Import via UI: `/financials/import` |
| Flight records | .csv | evidence_hub.db | `scripts/ingest_flights_to_evidence_hub.py` |
| Amazon purchases | .csv | evidence_hub.db | `scripts/ingest_amazon_to_evidence_hub.py` |

## 2. Place Raw Evidence

- Put raw files in the appropriate `data/*_LOCKER/` directory
- **NEVER modify original files** — the governance mandate
- Record the SHA-256 hash of the file before processing

## 3. Run Ingest Script

```bash
# Example: indexing new MBOX files
python scripts/index_mbox_master.py

# Example: importing iMessages from M1 Studio backup
python scripts/consolidate_master_chat.py
```

## 4. Verify Chain of Custody

```bash
# Update chain of custody records
python scripts/update_chain_of_custody.py

# Verify evidence hub integrity
python scripts/verify_evidence_hub.py
```

## 5. Post-Import Checks

- [ ] Raw files stored in correct `*_LOCKER/` directory
- [ ] SHA-256 hash recorded in chain of custody
- [ ] Database records match expected count
- [ ] Whitelist filter applied (JZ/LG only for chat data)
- [ ] Evidence hub updated with new canonical entries
- [ ] No original files were modified

## 6. Update Ready Bag (Optional)

If this is significant new evidence:
```bash
python scripts/save_ready_bag.py
```
