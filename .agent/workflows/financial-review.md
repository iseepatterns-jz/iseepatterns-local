---
description: Financial review pipeline — automatch, Rosetta verification, finalization
---

# Financial Review Workflow

End-to-end procedure for processing financial transactions through the automatch → Rosetta → verification → finalization pipeline.

## Prerequisites

- App running: `cd app && npm run dev`
- FastAPI running: `python -m uvicorn api_server:app --host 0.0.0.0 --port 8000 --reload`
- Rosetta Stone master CSV at: `data/FINANCIAL_LOCKER/ROWBOAT_CREATIVE_ROSETTASTONE/rbc-rosettastone-statement-transactions-master-sheet-full.csv`

## 1. Import Statements

- Navigate to `/financials/import` in the UI
- Upload bank statement CSV/XLSX
- Verify column mapping is correct (date, description, amount, etc.)

## 2. Run Automatch

The automatch engine fuzzy-matches imported transactions against the Rosetta Stone master sheet.

**Via UI:**
- Navigate to `/financials` → click "Run Automatch"

**Via API:**
```bash
curl -X POST http://localhost:3000/api/financials/automatch
```

**Via Script (for specific year):**
```bash
python scripts/run_2019_automatch.py
```

### Automatch Output
- Matched transactions get a `rosetta_match_id` and `master_description`
- Unmatched transactions are flagged for human review
- Collision detection prevents duplicate matches

## 3. Human Review

- Navigate to `/financials` in the UI
- Review each matched transaction:
  - Verify the Rosetta match is correct
  - Check player attribution (who made the transaction)
  - Confirm amount and date alignment
- For unmatched transactions:
  - Manually assign player attribution
  - Add to Rosetta Stone if this is a recurring pattern

## 4. Finalize Verification

Once review is complete:

**Via API:**
```bash
curl -X POST http://localhost:3000/api/financials/finalize-verification
```

This creates:
- Verified transaction records
- `-UNVERIFIED-DISCREPANCIES.csv` artifact for unmatched records
- Audit log entries in workbench.db

## 5. Post-Review Checks

- [ ] All transactions either matched or flagged as discrepancies
- [ ] Player attributions are correct
- [ ] Rosetta master description displayed for each match
- [ ] Discrepancy CSV generated in `data/FORENSIC_VERIFICATION_LOCKER/`
- [ ] No duplicate matches (collision detection passed)

## 6. Forensic Integrity Audit

After every financial session, run the FIA:
- Verify Locker → Hub → Brain synchronization
- Confirm Rosetta Stone counts are current
- See `docs/forensic_integrity_audit.md` for full protocol
