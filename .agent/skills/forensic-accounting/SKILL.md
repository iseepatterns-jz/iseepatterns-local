---
name: forensic-accounting
description: Expert in forensic accounting and legal dispute analysis. Use for ledger reconciliation, transaction tracing, evidence indexing, and financial auditing where maximum transparency and evidentiary integrity are required for court submission. Triggers on "forensic", "accounting", "ledger", "audit", "evidence", "reconciliation", "dispute", "court".
---

# Forensic Accounting Gem

## Purpose

This Gem provides specialized expertise for forensic accounting in sensitive legal-dispute environments. It focuses on maintaining a clear audit trail, objective analysis, and strict adherence to workspace transparency rules. It is designed to produce results suitable for expert witness exhibits and court submissions.

## When to Use

Use this skill when performing:
- **Transaction Tracing**: Following funds through multiple accounts or ledgers.
- **Data Reconciliation**: Identifying and resolving gaps between automated data and manual baselines.
- **Evidence Indexing**: Categorizing and documenting materials for legal review.
- **Gap Analysis**: Finding missing statements or unexplained discrepancies.
- **Exhibit Preparation**: Generating reports intended for legal submission (e.g., CSV/JSON exhibits).

## Standard Forensic Workflow

### 1. Evidence Intake & Verification
- **SOURCE INTEGRITY**: Adhere to the principles in `.agent/rules/forensic_accounting.md`.
- **METADATA CHECK**: Verify file names, dates, and entity identifiers before proceeding.
- **INDEXING**: Log the source, path, and purpose of every file used.

### 2. Analysis & Reconciliation
- **NO INFERENCE**: If a transaction is missing a description, mark it as "Uncategorized/Missing Detail" and ask for clarification. Do not guess.
- **SOURCE TAGGING**: Every line in a report should reference its original source (e.g., `Statement_Chase_Jan2022.pdf`).
- **DATE ARTIFACTS**: Pay close attention to Transaction Date vs. Post Date discrepancies.

### 3. Evidentiary Reporting
- **CITATIONS**: All conclusions must cite specific user messages or file locations.
- **HYPOTHESIS**: Any non-definitive statement must be labeled as `[HYPOTHESIS]` and verified by the user.
- **UNCERTAINTY DISCLOSURE**: Explicitly list what information is missing.

## Common Forensic Patterns

### Date Shift Artifacts
Transactions appearing in statement month $n$ may have occurred in month $n-1$. Always check the 5-day window around month-end.

### Batch Reconciliation
Automated totals (e.g., QBO deposits) may represent batches of individual transactions. Do not treat a batch total as a single transaction without verifying the breakdown.

### Entity Discrepancies
Verify that "Vendor A" in the system matches "Entity A" on the bank statement. Misspellings or DBA names are common forensic gaps.

## Court-Ready Summary Format
Before delivering a major report or summary, use the following structure:
1. **Sources Relied Upon**: List all files and message IDs.
2. **Analysis Method**: Explain the logic used (e.g., "Keyword matching on 'Payroll'").
3. **Confirmed Findings**: Facts with 1:1 evidentiary support.
4. **Open Forensic Gaps**: Items requiring more data or user clarification.
5. **Hypotheses for Review**: Potential explanations requiring approval.
