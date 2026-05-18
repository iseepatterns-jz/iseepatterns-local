---
aliases:
  - "Accounting"
  - "Equitable Accounting"
  - "Claim 6"
tags:
  - claim
status: active
severity: high
governing_law: "Delaware LLC Act § 18-305 (right to information) | Illinois common law (equitable accounting)"
related_entities:
  - "[[../entities/Lucas-Guariglia]]"
  - "[[../entities/Joseph-Zangrilli]]"
  - "[[../entities/Rowboat-Creative-LLC]]"
  - "[[../entities/Stephanie-Morin]]"
  - "[[../entities/Spark-Business-Consulting]]"
  - "[[../entities/Thomas-Nitschke]]"
case: "Guariglia v. Zangrilli, 2024CH00720 (Cook County Chancery)"
created: 2026-05-18
updated: 2026-05-18
---

# Claim 6: Accounting

## Description

Rowboat Creative LLC cycled through five accounting firms in approximately 10 years, with each transition marked by data access problems, irregular handoffs, and LG's pattern of excluding JZ from financial communications. The accounting claim seeks a court-ordered full accounting of all company finances from formation through liquidation, including: revenue and expense reconciliation across all five accounting periods; tracing of PPP/EIDL funds ($303,950 total); isolation of Constellation-related transactions for kickback analysis; reconciliation of bank account transitions (Chase→Fifth Third); and quantification of diverted customer revenue. JZ, as 50% member, has a statutory right to information under Delaware LLC Act § 18-305 and an equitable right to an accounting given the fiduciary relationship and the complexity of the accounts. LG systematically withheld financial information: refusing to forward accountant emails, having separate phone conversations with accountants, excluding JZ from the bank account, and manipulating COGS figures potentially to hide the Constellation scheme.

## Legal Elements

1. **Fiduciary or confidential relationship** — 50/50 member-managed LLC
2. **Defendant received money or property belonging to plaintiff** — LG controlled all company finances
3. **Accounts are complicated or amount is uncertain** — Five accounting firms, bank transitions, kickback schemes, PPP funds
4. **Plaintiff lacks adequate remedy at law** — Damages cannot be calculated without a full accounting

## Evidence Table

| Element | Evidence ID | Source | Description |
|---------|-------------|--------|-------------|
| 1: Fiduciary Relationship | Op Agreement | accounting_locker | 50/50 member-managed LLC |
| 2: LG's Financial Control | trs-2023-04-26 | `_analysis_outputs/` | JZ excluded from Fifth Third account — LG had sole financial control |
| 2: LG's Financial Control | trs-2023-05-28 (lines 56-63) | `_analysis_outputs/` | LG refused to forward accountant emails; had separate phone conversations |
| 2: LG's Financial Control | `evidence_hub.db:email:1001302,1001434` | SMOKING_GUN_LOCKER | Chase→Fifth Third transition executed unilaterally by LG |
| 3: Complex Accounts | Five accounting firms | accounting_locker | Johansen → Rudder → Supporting Strategies → PKFM/Spark → None (in-house) |
| 3: Complex Accounts | trs-2023-04-11 | `_analysis_outputs/` | 75% COGS discussion — potentially manipulated figure |
| 3: Complex Accounts | trs-2023-03-15 | `_analysis_outputs/` | JZ contacts Sheri Highland to understand LG's financial statements |
| 3: Complex Accounts | trs-2023-06-05 | `_analysis_outputs/` | JZ contacts JT Spark about Stephanie Morin and LG |
| 4: Inadequate Legal Remedy | invoice_analysis.db | `_analysis_outputs/` | Revenue data available but cost/profit analysis incomplete without full accounting |

### Accounting Handoff Chain

| Firm | Period | Evidence Source |
|------|--------|----------------|
| Johansen | Pre-2018? | accounting_locker: /JOHANSEN_LOCKER/ |
| Rudder | 2018-2019? | accounting_locker: /JOHANSEN_TO_RUDDER_EXPORTS/ |
| Supporting Strategies (Laurie Zimmerman) | 2019-2020 | `evidence_hub.db:email:1001434,1001302` |
| PKFM / Spark (Stephanie Morin, Sheri Highland) | 2022-2023 | trs-2023-03-15, trs-2023-04-11, trs-2023-06-05 |
| In-House / None | 2023-2024 | 15-month gap (Nov 2020-Feb 2022); Spark terminated Jun 7, 2023 |

### Revenue and Profit Data (invoice_analysis.db)

| Year | Invoices | Revenue | Gross Profit |
|------|----------|---------|-------------|
| 2018 | 2,044 | $1,803,462.66 | No GP data |
| 2019 | 1,740 | $2,331,314.70 | $661,785.84 |
| 2020 | 891 | $1,577,813.66 | $589,721.82 |
| 2021 | 731 | $2,268,236.02 | $1,119,167.28 |
| 2022 | 901 | $2,312,465.60 | $895,401.31 |
| 2023 | 847 | $2,039,459.89 | $837,573.62 |
| 2024 | 220 | $407,092.59 | $138,606.49 |
| 2025 | 18 | $46,050.00 | $1,410.70 |

Notable: 2021 spike ($2.27M on only 731 invoices — highest revenue-per-invoice) coincides with Constellation kickback activity period. 2024-2025 collapse follows partnership breakdown and receivership.

### Available Financial Records

| Source | Contents | Path |
|--------|----------|------|
| QuickBooks Online | invoice_analysis.db | `_analysis_outputs/rowboat_invoice_database/` |
| Full QBO Export | 3,249 files | accounting_locker |
| Invoices by Year | Annual breakdowns | accounting_locker: /FINANCIALS_BY_YEAR/ |
| Purchase Orders | PO records | accounting_locker: /PURCHASE_ORDER_LOCKER/ |
| Receipts | Receipt records | accounting_locker: /RECEIPTS_LOCKER/ |
| Loan Register | PPP/EIDL records | accounting_locker: /LOAN_REGISTER_LOCKER/ |
| Refunds | Refund records | accounting_locker: /REFUND_LOCKER/ |

## Cross-References

- [[1-Breach-of-Fiduciary-Duty]] — LG's exclusion of JZ from financial information is fiduciary breach
- [[2-Fraud]] — LG's "bullshit stories" to accountants fed into false financial representations
- [[3-Conversion]] — Full accounting needed to quantify converted funds
- [[5-Unjust-Enrichment]] — Accounting needed to quantify all diverted benefits
- [[7-Civil-Conspiracy]] — Accountants may have been unwitting participants in LG's information control
- [[11-Civil-RICO]] — Accounting trail needed to establish the full pattern of racketeering activity

**Entities:** [[../entities/Lucas-Guariglia]], [[../entities/Joseph-Zangrilli]], [[../entities/Rowboat-Creative-LLC]], [[../entities/Stephanie-Morin]], [[../entities/Spark-Business-Consulting]], [[../entities/Thomas-Nitschke]]

## Gap Analysis

| Gap | Severity | Action Required |
|-----|----------|----------------|
| Full forensic accounting | Critical | Engage forensic accountant to reconcile QBO data, bank statements, and tax returns |
| Johansen and Rudder period records | High | Review accounting handoff exports for irregularities during transition periods |
| Tax returns (2016-2024) | High | Compare QBO data with filed tax returns — discrepancies may reveal hidden income/expenses |
| Constellation-related COGS | High | Isolate all Constellation-related invoices and compare pricing to industry standards |
| PPP/EIDL loan accounting | Medium | Trace use of $303,950 in COVID relief funds |
| Spark termination data access | High | Spark refused all data transfer on June 7, 2023 — explore legal remedies for data access |
| 15-month bookkeeper gap (Nov 2020-Feb 2022) | Medium | Reconstruct financial activity during period with no external oversight |

## Relief Sought

- Court-ordered full forensic accounting from formation to liquidation
- Appointment of independent forensic accountant
- Reconciliation of all bank accounts, QBO data, tax returns, and PPP/EIDL funds
- Tracing of all diverted customer revenue to AWM and LG personally
- Surcharge against LG for all amounts found to be misappropriated
