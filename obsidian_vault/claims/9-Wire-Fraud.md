---
aliases:
  - "Wire Fraud"
  - "18 USC 1343"
  - "Claim 9"
tags:
  - claim
status: active
severity: high
governing_law: "18 U.S.C. § 1343 (federal wire fraud) | United States v. Porcelli, 865 F.2d 1352 (2d Cir. 1989)"
related_entities:
  - "[[../entities/Lucas-Guariglia]]"
  - "[[../entities/Suzanne-Guariglia]]"
  - "[[../entities/Leonard-Mayersky]]"
  - "[[../entities/Fifth-Third-Bank]]"
  - "[[../entities/Joseph-Zangrilli]]"
  - "[[../entities/Rowboat-Creative-LLC]]"
case: "Guariglia v. Zangrilli, 2024CH00720 (Cook County Chancery)"
created: 2026-05-18
updated: 2026-05-18
---

# Claim 9: Wire Fraud (18 U.S.C. § 1343)

## Description

LG devised and executed a scheme to defraud Rowboat Creative LLC and JZ through the use of interstate wire communications — including email, ACH/wire transfers, SMS text messages, internet commerce, and phone calls — spanning from at least September 2019 through July 2024. The scheme involved three interconnected frauds: (1) the Fifth Third banking scheme (excluding JZ from company finances through false statements and secret bank transitions), (2) the Constellation kickback scheme (routing Constellation Brands orders through Rowboat at inflated prices via SG's inside position), and (3) the AWM customer diversion scheme (diverting Rowboat customer contracts to LG's competing entity using Rowboat's banking infrastructure). Each use of interstate wire — every email to Mayersky, every ACH transfer routing through Fifth Third, every text message to employees, every online order shipped interstate — constitutes a separate wire fraud violation. The scheme resulted in the deprivation of at least $85,431.40 in specific diverted contracts and the destruction of Rowboat Creative as a going concern ($2.3M annual revenue reduced to near zero).

## Legal Elements

1. **Scheme or artifice to defraud** — Three interconnected fraudulent schemes (2019-2024)
2. **Intent to defraud** — LG's admissions and pattern of concealment
3. **Use of interstate wire communications** — Email, ACH, SMS, internet, phone
4. **Material misrepresentation or omission** — False statements to bank, customers, accountants
5. **Deprivation of money or property** — $85,431.40+ in diverted contracts; $2.3M→$46K revenue collapse

## Evidence Table

### Scheme Overview

| Scheme | Period | Primary Wire Channels | Key Evidence |
|--------|--------|----------------------|-------------|
| Fifth Third Banking | 2019-2023 | Email (Mayersky, Zimmerman), ACH | SMOKING_GUN_LOCKER: IDs 1001199, 1001302, 1001434 |
| Constellation Kickback | 2021-2023 | Email (SG secondary account), Navex internet filing | trs-2023-06-30; EXH-0031 |
| AWM Customer Diversion | 2024 | Email, ACH, internet commerce | RECEIVERSHIP_FRAUD: INV 702222, TO-240222/4 |

### Wire Communications Used in Furtherance

| Date | Evidence ID | Wire Type | Description |
|------|-------------|-----------|-------------|
| Sep 26, 2019 | `evidence_hub.db:email:1001199` | Interstate email | Mayersky to LG: "still adjusting to the 5/3 life" — scheme cultivation |
| Jan 9, 2020 | `evidence_hub.db:email:1001302` | Interstate email | LG to Laurie Zimmerman: "very serious issue with Chase bank... transfer likely to 5/3" |
| Jan 9, 2020 | `evidence_hub.db:email:1001434` | Interstate email | Zimmerman confirms Fifth Third integration (payroll, Stripe, Shopify) |
| Jun 24, 2021 | `evidence_hub.db:email:1001203` | Interstate email/ACH | PMGOA: "Prepayment needed by ACH/wire. Wire instructions attached." Routing to Fifth Third #7986201452 |
| Jun 25, 2021 | `evidence_hub.db:email:1001194` | Interstate email/ACH | Ashley Myles: payment "already released" via Fifth Third ACH |
| Jul 13-14, 2021 | `evidence_hub.db:email:1001306-1001471` | Interstate email/ACH | 16+ emails routing fruit infusion bottle payments through Fifth Third ACH |
| Late 2021 | `evidence_hub.db:email:1001196-1001227` | Interstate email | Candle manufacturing with Sunday Fly (China) — international wire communications |
| May 28, 2023 | trs-2023-05-28 (line 149) | Interstate SMS | LG sent texts to Filiberto and Jeff: "get worried" (Charlotte→Chicago) |
| Jun 23, 2023 | Navex #294567134501 | Interstate internet | JZ files whistleblower report via Navex Ethics Helpline online system |
| Jun 30, 2023 | trs-2023-06-30 | Interstate phone | Eric Howe (Constellation) confirms kickback investigation via phone call |
| Feb 22, 2024 | RECEIVERSHIP_FRAUD: TO-240222 | Interstate internet | Order placed online at TotallyPromotional.com, shipped to Charlotte, NC |
| Feb 24, 2024 | RECEIVERSHIP_FRAUD: TO-240224 | Interstate internet | Second Totally Promotional order, shipped interstate to Charlotte |
| Feb 2024 | RECEIVERSHIP_FRAUD: INV 702222 V4 | Interstate ACH/wire | $85,431.40 Brand Addition quote: "PAYMENT VIA ACH TO: FIFTH THIRD BANK... Acct: 7986201452 / Routing: 053100737" |
| Apr 25, 2024 | trs-2024-04-25 | Interstate phone | Brand Addition customer voicemail confirming redirect to AWM |
| Jul 31, 2024 | RECEIVERSHIP_FRAUD: PNG | Interstate internet | Screenshot confirming Brand Addition orders diverted to AWA |

### Deprivation of Money/Property

| Item | Amount | Evidence |
|------|--------|----------|
| Brand Addition Quote #702222 | $85,431.40 | RECEIVERSHIP_FRAUD: INV 702222 V4 |
| Brand Addition Order #100096358 | Unknown | trs-2024-04-25 |
| Additional Brand Addition Orders | Unknown | RECEIVERSHIP_FRAUD: Jul 31, 2024 PNG |
| Totally Promotional Orders | $1,437.16 | RECEIVERSHIP_FRAUD: TO-240222, TO-240224 |
| Revenue Collapse | $2,312,466 → $46,050 | invoice_analysis.db |
| Gross Profit Decimation | $895,401 → $1,411 | invoice_analysis.db |

## Cross-References

- [[1-Breach-of-Fiduciary-Duty]] — Wire fraud is the federal criminal parallel to the fiduciary breach
- [[2-Fraud]] — Wire communications were the means of transmitting false statements
- [[3-Conversion]] — ACH/wire transfers used to convert customer payments
- [[7-Civil-Conspiracy]] — Wire communications facilitated the conspiratorial agreements
- [[8-Fraudulent-Transfer]] — Wire/ACH used to execute fraudulent transfers
- [[10-Computer-Fraud]] — Internet commerce and email systems used for scheme execution
- [[11-Civil-RICO]] — Wire fraud is the primary RICO predicate act

**Entities:** [[../entities/Lucas-Guariglia]], [[../entities/Suzanne-Guariglia]], [[../entities/Leonard-Mayersky]], [[../entities/Fifth-Third-Bank]], [[../entities/Joseph-Zangrilli]], [[../entities/Rowboat-Creative-LLC]]

## Gap Analysis

| Gap | Severity | Action Required |
|-----|----------|----------------|
| SWIFT/ACH trace for all Fifth Third transactions | Critical | Subpoena Fifth Third account #7986201452 showing all ACH/wire transfers 2019-2024 |
| Totally Promotional payment source | High | Trace who paid for orders TO-240222 and TO-240224 — RBC card, LG personal, or AWM |
| AWM bank account records | High | Identify and subpoena AWM accounts to trace receipt of diverted wire payments |
| Constellation Navex report outcome | Medium | Subpoena Constellation for Navex #294567134501 investigation file |
| SG's secondary email account | Medium | Identify the non-Constellation email SG used for scheme communications |
| Full iMessage records | Medium | Review chat_master.db for additional interstate SMS evidence |
| Complete email server logs | Medium | Subpoena Google Workspace logs for all Rowboat email accounts |

## Federal Criminal Referral Considerations

- FBI electronic tip filed by JZ (June 2023, follow-up November 2023)
- ACH routing through Fifth Third (Routing #053100737) — federally insured institution
- International wire element (candle manufacturing with Sunday Fly Inc, China)
- Interstate SMS (LG in North Carolina to employees in Illinois)
- Potential referral to U.S. Attorney's Office, Northern District of Illinois

## Damages Summary

- Specific wire fraud proceeds: $85,431.40 (Brand Addition) + $1,437.16 (Totally Promotional) = $86,868.56 minimum
- Revenue destruction: $2.27M annual revenue reduced to near-zero
- Treble damages available under civil RICO (see [[11-Civil-RICO]])
