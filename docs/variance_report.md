# Variance Report (Forensic Integrity Audit)

## Purpose

The **Variance Report** (also known as the **Forensic Integrity Audit** or **FIA**) is a mandatory verification step that compares imported bank statement transactions against the Rosetta Stone master ledger. It produces a per-month breakdown of match rates to identify any transactions present in bank statements but missing from the master record — or vice versa.

## When to Run

- **After importing a full year** of bank statements for any account
- **Before finalizing** any year's financial forensic analysis
- **Before attorney export** to ensure data integrity
- **After any automatch re-run** to verify match rates haven't degraded

## How It Works

1. **Session Discovery**: Finds all import sessions for the specified year + bank combination
2. **Month Coverage Check**: Verifies all 12 months (Jan–Dec) are present
3. **Match Rate Calculation**: For each session, counts `MATCHED` vs `PENDING`/`UNVERIFIED` transactions
4. **Rosetta Cross-Reference**: Counts total Rosetta master records for the year
5. **Duplicate Detection**: Checks for duplicate SHA-256 file hashes
6. **Variance Extraction**: Lists all unmatched transactions with date, description, and amount

## Status Definitions

| Status | Criteria |
|:---|:---|
| **PASSED** | All 12 months present, match rate ≥ 95%, all sessions COMPLETE |
| **WARNING** | Missing months, or sessions not in COMPLETE status, but match rate ≥ 95% |
| **FAILED** | Match rate < 95%, or no transactions found |

## Output Format

### Executive Summary
| Metric | Description |
|:---|:---|
| Total Forensic Transactions | Count of all imported transactions for the year |
| Rosetta Master Records | Count of all master ledger entries for the year |
| Matched Transactions | Count successfully linked to Rosetta entries |
| Match Rate | Percentage of transactions matched |
| Variance | Count and dollar total of unmatched items |

### Monthly Breakdown
Per-session table showing: Session ID, Statement Filename, Transaction Count, Matched, Unmatched, Match %.

### Missing from Master (Variance)
Table of unmatched transactions with Date, Description, Amount.

## API Endpoints

| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/api/financials/forensic-audit` | Run audit for `{ year, bank }` |
| `GET` | `/api/financials/forensic-audit` | List all past audit runs |

## UI Location

The audit panel is available at `/financials/import` below the Import History section. Select a year, enter a bank name, and click **Run Audit**.

## Historical Results

Results are stored in the `forensic_audits` table in `workbench.db` and displayed in the "Past Audit Results" table on the import page. Each audit run creates a new record — re-running an audit for the same year will add a new entry, allowing comparison over time.

## Prior Audit Results (Chase CC)

| Year | Transactions | Matched | Rate | Variance |
|:---|:---|:---|:---|:---|
| 2016 | 1,134 | 1,133 | 99.9% | 1 ($7.24) |
| 2017 | 1,708 | 1,707 | 99.9% | 1 ($0.26) |
| 2018 | 1,729 | 1,728 | 99.9% | 1 (-$40.56) |

## Database Schema

```sql
CREATE TABLE forensic_audits (
    id, audit_year, bank_name, account_suffix, status,
    total_sessions, total_txns, matched_txns, unmatched_txns, match_rate,
    months_covered, missing_months, rosetta_total,
    findings, monthly_breakdown, variance_detail, created_at
);
```
