---
aliases:
  - "Fraudulent Transfer"
  - "UFTA"
  - "Claim 8"
tags:
  - claim
status: active
severity: high
governing_law: "Illinois Uniform Fraudulent Transfer Act (740 ILCS 160/1 et seq.) | 11 U.S.C. § 548 (bankruptcy parallel)"
related_entities:
  - "[[../entities/Lucas-Guariglia]]"
  - "[[../entities/Joseph-Zangrilli]]"
  - "[[../entities/Rowboat-Creative-LLC]]"
  - "[[../entities/Fifth-Third-Bank]]"
  - "[[../entities/Leonard-Mayersky]]"
  - "[[../entities/Ryan-Hayes]]"
case: "Guariglia v. Zangrilli, 2024CH00720 (Cook County Chancery)"
created: 2026-05-18
updated: 2026-05-18
---

# Claim 8: Fraudulent Transfer

## Description

LG executed multiple transfers of Rowboat Creative LLC assets with actual intent to hinder, delay, or defraud JZ (a creditor/member of the LLC), or without receiving reasonably equivalent value in exchange while Rowboat was insolvent or became insolvent as a result. The fraudulent transfers fall into several categories:

**Category 1 — Customer Contract Transfers to AWM:** LG diverted Rowboat's customer contracts (Brand Addition) to his competing entity AWM/All World Agency. The Brand Addition Quote #702222 ($85,431.40) was developed under Rowboat's name, with payment directed to Rowboat's Fifth Third account, but the work and revenue were diverted to AWM. This transfer of contractual rights and customer relationships occurred during receivership (Feb-Jul 2024), when Rowboat was demonstrably insolvent. LG received the benefit through his ownership/control of AWM — an insider transfer under UFTA § 5(b).

**Category 2 — Physical Asset Transfers to LG Personally:** The Totally Promotional orders (TO-240222, TO-240224) placed under Rowboat Creative's name on Feb 22 and 24, 2024 — 8-10 days after the receiver was appointed — resulted in 1,000 can coolers ($1,437.16) shipped to LG's personal residence at 1768 Dunkirk Dr, Charlotte, NC 28203-4304. This constitutes a transfer of Rowboat assets to LG personally during insolvency.

**Category 3 — Chase→Fifth Third Account Transition:** The transition from Chase Bank to Fifth Third Bank was structured to exclude JZ from access to company funds. Multiple new accounts were opened at Fifth Third with LG as the sole signatory — transferring control of all company financial assets to LG exclusively. Under UFTA § 5(a)(1), this transfer was made with actual intent to hinder JZ's access to company assets.

**Category 4 — PPP Funds Transfer to LG Personal:** $70,000 in PPP loan proceeds was transferred to LG's personal savings account for a down payment on the Dunkirk Drive house. While PPP rules permitted owner compensation, the transfer occurred during a period when JZ had no visibility into company finances and when LG was actively excluding JZ from banking.

**Category 5 — Credit Card Balance Transfer Proposal:** During receivership, LG proposed a credit card balance transfer hidden from JZ (evidence_hub.db:email:298138, Mar 13, 2024) and requested fund transfers to "other accounts" (evidence_hub.db:email:871031, Apr 12, 2024). These proposals during active receivership indicate ongoing intent to move assets beyond JZ's reach.

## Legal Elements (UFTA § 5(a) — Actual Fraud)

1. **Transfer of an asset** — Customer contracts, physical goods, bank funds, PPP proceeds
2. **Made with actual intent to hinder, delay, or defraud any creditor** — LG's admissions and pattern of concealment
3. **Badges of fraud present** — Insolvency, insider transfers, concealment, removal of assets, inadequate consideration

### Badges of Fraud Analysis (UFTA § 5(b))

| Badge | Evidence |
|-------|----------|
| Transfer to insider (LG/AWM) | All transfers benefited LG or entities he controls |
| Debtor retained possession/control | LG maintained exclusive control of Fifth Third accounts post-transfer |
| Transfer concealed | Chase→Fifth Third transition done without JZ's knowledge; AWM diversion hidden during receivership |
| Debtor sued or threatened with suit | Partnership dispute active since Feb 2023; receivership since Feb 2024 |
| Transfer of substantially all assets | Customer contracts, bank accounts, inventory transferred away from Rowboat |
| Debtor absconded | LG relocated to North Carolina |
| Removal or concealment of assets | Side ventures hidden; separate accountant communications |
| Inadequate consideration | AWM received contracts worth $85,431.40+ for no payment to Rowboat |
| Insolvency | Rowboat was insolvent by Feb 2024 (receivership); revenue collapsed to $407K in 2024 and $46K in 2025 |

## Evidence Table

| Element | Evidence ID | Source | Description |
|---------|-------------|--------|-------------|
| 1-2: Customer Contracts | RECEIVERSHIP_FRAUD | INV 702222 V4 | $85,431.40 Brand Addition quote diverted from Rowboat to AWM |
| 1-2: Customer Contracts | trs-2024-04-25 | `_analysis_outputs/` | Brand Addition Order #100096358 diverted to AWM |
| 1-2: Customer Contracts | RECEIVERSHIP_FRAUD | Jul 31, 2024 PNG | Multiple Brand Addition orders confirmed diverted to AWA |
| 1-2: Physical Assets | RECEIVERSHIP_FRAUD | TO-240222, TO-240224 | 1,000 can coolers ($1,437.16) shipped to LG's Charlotte residence |
| 1-2: Bank Account | trs-2023-04-26 | `_analysis_outputs/` | Fifth Third account #7986201452 — JZ excluded entirely |
| 1-2: Bank Transition | `evidence_hub.db:email:1001302,1001434,1001199` | SMOKING_GUN_LOCKER | Chase→Fifth Third transition done secretly by LG |
| 1-2: PPP Transfer | PPP documentation | lawmodel1/data | $70,000 PPP proceeds transferred to LG personal savings (Dunkirk house) |
| 1-2: Hidden Transfers | `evidence_hub.db:email:298138` | receivership | Mar 13, 2024: LG proposes CC balance transfer hidden from JZ |
| 1-2: Hidden Transfers | `evidence_hub.db:email:871031` | receivership | Apr 12, 2024: LG requests fund transfer to "other accounts" |
| 3: Insolvency | `evidence_hub.db:email:215821` | receivership | May 23, 2024: LG confirms Rowboat "ceased all operations... in liquidation mode" |
| 3: Insolvency | invoice_analysis.db | `_analysis_outputs/` | 2024 revenue $407K (down from $2.3M); 2025 revenue $46K |
| 3: Insider Status | Entity records | Illinois/Delaware SOS | LG controls AWM; all transfers to insider |

## Cross-References

- [[1-Breach-of-Fiduciary-Duty]] — Fraudulent transfers are the mechanism of fiduciary breach
- [[3-Conversion]] — The same transfers constitute conversion of company property
- [[5-Unjust-Enrichment]] — LG was unjustly enriched by the fraudulent transfers
- [[7-Civil-Conspiracy]] — Mayersky facilitated the banking transfers as part of the conspiracy
- [[9-Wire-Fraud]] — ACH/wire transfers used to execute the fraudulent transfers
- [[11-Civil-RICO]] — Fraudulent transfers are predicate acts in the RICO pattern

**Entities:** [[../entities/Lucas-Guariglia]], [[../entities/Joseph-Zangrilli]], [[../entities/Rowboat-Creative-LLC]], [[../entities/Fifth-Third-Bank]], [[../entities/Leonard-Mayersky]], [[../entities/Ryan-Hayes]]

## Gap Analysis

| Gap | Severity | Action Required |
|-----|----------|----------------|
| Fifth Third Bank full account statements | Critical | Subpoena all accounts to trace every transfer from 2019-2024 |
| AWM bank account records | Critical | Identify and subpoena AWM accounts to trace receipt of diverted funds |
| PPP loan accounting | High | Trace full disposition of $303,950 in PPP/EIDL funds |
| LG personal bank records | High | Discovery of LG's personal accounts for all transfers |
| $70K Dunkirk transfer documentation | High | Obtain bank records showing transfer from PPP account to LG personal savings |
| CC balance transfer records | Medium | Obtain full credit card statements to trace proposed hidden transfers |
| AWM formation date | Medium | Establish whether AWM was formed before or after the partnership dispute began |
| Valuation of transferred customer contracts | High | Expert valuation of Brand Addition and other customer relationships |

## UFTA Remedies Sought

- Avoidance of all fraudulent transfers (return of assets to Rowboat estate)
- Attachment against transferred assets
- Injunction against further disposition of AWM assets
- Appointment of receiver over AWM (if necessary to recover diverted assets)
- Money judgment against LG for value of assets transferred
- Punitive damages (available under Illinois UFTA for actual fraud)

## Damages Summary

- Quantified transfers: $85,431.40 (Brand Addition) + $1,437.16 (can coolers) + $70,000 (PPP to personal) = $156,868.56 minimum
- Unquantified transfers: Additional Brand Addition orders, side venture payments, hidden CC transfers, company credit card charges
- Avoidable transfers: Full value of all Fifth Third accounts controlled exclusively by LG
