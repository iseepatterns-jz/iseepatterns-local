# Rosetta Stone Location Verification

I have verified the location of the **Rosetta Stone Master File** against the **LawModel1 Governance Standards**.

## 1. Governance Stated Location
According to [.agent/skills/lawmodel1-governance/SKILL.md](file:///Volumes/batdrivetb5/AI_TRAINING/lawmodel1/.agent/skills/lawmodel1-governance/SKILL.md), the following rules apply:

- **Section 1 (Directory Standards)**: `data/` is the absolute SOURCE OF TRUTH for all evidence data (Line 47).
- **Section 5 (Data Locker Standards)**: Raw evidence must be organized into categories ending in `_LOCKER/`. Bank statements and ledgers are explicitly assigned to **`FINANCIAL_LOCKER/`** (Line 260).
- **Section 6 (Chain of Custody)**: Source provenance must track the exact file path within the lockers (Line 289).

## 2. File Verification
The file has been located and verified at:
`data/FINANCIAL_LOCKER/ROWBOAT_CREATIVE_ROSETTASTONE/rbc-rosettastone-statement-transactions-master-sheet-full.csv`

| Property | Value |
| :--- | :--- |
| **Path Integrity** | Matches the `FINANCIAL_LOCKER` governance standard. |
| **File Size** | 6.7 MB (~22,001 transaction records). |
| **Content** | Verified as the master transaction sheet containing 2016-2023 financial data. |

## 3. Audit Status: RESOLVED
The path discrepancy identified during initial verification has been resolved.

- **`scripts/ingest_financial_truth.py`**: Updated to use the `FINANCIAL_LOCKER` path and correct `rbc-rosettastone` filename.
- **`ingest/financial_ingest.py`**: Updated to use the `FINANCIAL_LOCKER` path and correct `rbc-rosettastone` filename.
- **`ingest/generate_evidence_cards.py`**: Updated to use unified `workbench.db` and `FINANCIAL_LOCKER` origin labels.
- **`scripts/ingest_amazon_to_evidence_hub.py`**: Updated to use unified `workbench.db` and correct `FINANCIAL_LOCKER` origin.
- **`ingest/link_tax_to_ledger.py`**: Re-pointed to the canonical `workbench.db`.

## 4. FIA Compliance
This verification satisfies the **Forensic Integrity Audit (FIA)** requirement to confirm that "The Lockers" are correctly organized and that the Rosetta Stone is situated in its canonical home.
