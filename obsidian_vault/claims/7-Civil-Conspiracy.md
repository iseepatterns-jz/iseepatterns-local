---
aliases:
  - "Civil Conspiracy"
  - "Claim 7"
tags:
  - claim
status: active
severity: high
governing_law: "Illinois common law (Adcock v. Brakegate, Ltd., 164 Ill. 2d 54; McClure v. Owens Corning Fiberglas Corp., 188 Ill. 2d 102)"
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

# Claim 7: Civil Conspiracy

## Description

LG entered into agreements with at least two other persons — his wife Suzanne Guariglia (SG) and Fifth Third banker Leonard Mayersky — to accomplish unlawful purposes through unlawful means, resulting in tortious injury to JZ and Rowboat Creative LLC. The civil conspiracy claim involves three distinct conspiratorial agreements:

**Conspiracy 1 — The Fifth Third Banking Conspiracy (LG + Len Mayersky):** LG and Mayersky agreed to transition Rowboat's banking from Chase to Fifth Third without JZ's knowledge or consent, to open accounts that excluded JZ, and to make false statements to Fifth Third to permanently exclude JZ. Mayersky forwarded JZ's personal banking documents to LG without JZ's consent (privacy violation). The May 17, 2019 meeting (Mayersky + "Steve" visiting to discuss Fifth Third solutions) marks the overt act initiating this conspiracy. Mayersky's Sep 26, 2019 email ("still adjusting to the 5/3 life") confirms the ongoing relationship cultivated exclusively with LG.

**Conspiracy 2 — The Constellation Kickback Conspiracy (LG + SG):** LG and SG agreed to route Constellation Brands orders through Rowboat Creative at inflated prices, with SG (a Constellation employee) acting as the inside person. LG's text to SG — "don't talk pricing… we'll make it match what I put into my report" — is direct evidence of price-fixing collusion. JZ filed Navex whistleblower report #294567134501; Constellation confirmed receipt and opened investigation (June 30, 2023). SG used a secondary email account (non-Constellation) to evade corporate monitoring.

**Conspiracy 3 — The AWM Customer Diversion Conspiracy (LG + SG + potentially others):** During active receivership, LG and SG coordinated the diversion of Rowboat customer contracts (Brand Addition) to LG's competing entity AWM/All World Agency. The Brand Addition Quote #702222 ($85,431.40) was created under Rowboat's name but work was diverted to AWM. The scheme continued through at least July 2024, months after liquidation was announced.

## Legal Elements

1. **Agreement between two or more persons** — LG + SG; LG + Mayersky; LG + SG + others
2. **To accomplish an unlawful purpose or lawful purpose by unlawful means** — Bank fraud, wire fraud, conversion, fiduciary breach
3. **Tortious act in furtherance of the conspiracy** — Multiple overt acts (detailed below)
4. **Injury to person or property** — Destruction of Rowboat Creative as a going concern

## Evidence Table

| Element | Evidence ID | Source | Description |
|---------|-------------|--------|-------------|
| 1: Agreement (LG + Mayersky) | `evidence_hub.db:email:1001511` | SMOKING_GUN_LOCKER | May 17, 2019: Mayersky and "Steve" visit to discuss Fifth Third solutions with LG exclusively |
| 1: Agreement (LG + Mayersky) | `evidence_hub.db:email:1001199` | SMOKING_GUN_LOCKER | Sep 26, 2019: Mayersky to LG: "still adjusting to the 5/3 life. Just let me know when I can bring Steve over." |
| 1: Agreement (LG + Mayersky) | `evidence_hub.db:email:1001302` | SMOKING_GUN_LOCKER | Jan 9, 2020: LG emails Laurie Zimmerman re: Chase→Fifth Third transition |
| 1: Agreement (LG + Mayersky) | `evidence_hub.db:email:1001434` | SMOKING_GUN_LOCKER | Laurie Zimmerman confirms Fifth Third integration — transition executed |
| 1: Agreement (LG + SG) | trs-2023-06-30 | `_analysis_outputs/` | JZ files Navex whistleblower report #294567134501; Eric Howe confirms Constellation investigation |
| 1: Agreement (LG + SG) | LG text to SG | Exhibit EXH-0031 | "don't talk pricing… we'll make it match what I put into my report" |
| 1: Agreement (LG + SG) | trs-2023-06-30 (line 68) | `_analysis_outputs/` | SG used "another email account" (non-Constellation) for scheme communications |
| 3: Overt Act — Banking | trs-2023-04-26 | `_analysis_outputs/` | JZ excluded from Fifth Third account #7986201452 |
| 3: Overt Act — Banking | trs-2023-05-28 (lines 73-81) | `_analysis_outputs/` | LG's lawyer tells Fifth Third JZ stole $8,000 — false statement |
| 3: Overt Act — Banking | Mayersky privacy violation | Exhibit EXH-0030 | Mayersky forwarded JZ's personal banking documents to LG without consent |
| 3: Overt Act — Kickback | trs-2023-06-30 | `_analysis_outputs/` | Constellation confirms active investigation into kickback scheme |
| 3: Overt Act — Diversion | RECEIVERSHIP_FRAUD | INV 702222 V4 | Brand Addition $85,431.40 quote diverted to AWM |
| 3: Overt Act — Diversion | trs-2024-04-25 | `_analysis_outputs/` | Brand Addition customer confirms redirect to AWM |
| 3: Overt Act — Diversion | RECEIVERSHIP_FRAUD | Jul 31, 2024 PNG | "MASSIVE BRAND ADDITION ORDERS CONVERTED TO AWA" |
| 4: Injury | invoice_analysis.db | `_analysis_outputs/` | Revenue collapse: $2.3M → $46K; liquidation |

## Cross-References

- [[1-Breach-of-Fiduciary-Duty]] — The five-year conspiracy is the mechanism by which LG breached his fiduciary duties
- [[2-Fraud]] — False statements made in furtherance of the conspiracy
- [[3-Conversion]] — Conspiracy facilitated conversion of bank accounts and customer contracts
- [[8-Fraudulent-Transfer]] — Banking conspiracy structured to move assets away from JZ's reach
- [[9-Wire-Fraud]] — Interstate wire communications used for conspiracy communications
- [[11-Civil-RICO]] — Civil conspiracy is the state-law parallel to the RICO enterprise claim

**Entities:** [[../entities/Lucas-Guariglia]], [[../entities/Suzanne-Guariglia]], [[../entities/Leonard-Mayersky]], [[../entities/Fifth-Third-Bank]], [[../entities/Joseph-Zangrilli]], [[../entities/Rowboat-Creative-LLC]]

## Gap Analysis

| Gap | Severity | Action Required |
|-----|----------|----------------|
| Mayersky's full role and knowledge | Critical | Subpoena Mayersky's communications; determine if knowing participant or unwitting tool |
| SG's full Constellation role | Critical | Obtain Constellation investigation outcome — Navex #294567134501 |
| Secondary email account (SG) | Medium | Identify and subpoena the non-Constellation email SG used for scheme communications |
| "Steve" at Fifth Third | Medium | Identify and interview the "Steve" who accompanied Mayersky on the May 17, 2019 visit |
| AWM/AWA entity formation | High | Subpoena Illinois Secretary of State records for ownership and formation date |
| Additional co-conspirators | Medium | Determine if Laurie Zimmerman (Supporting Strategies) or Stephanie Morin (PKFM) were knowing participants |
| PPP loan nexus | Medium | Investigate whether the conspiracy extended to COVID relief fund misappropriation |

## Conspiracy Timeline

| Date | Event | Conspiracy |
|------|-------|-----------|
| May 17, 2019 | Mayersky + Steve visit to discuss Fifth Third | Banking |
| Sep 26, 2019 | Mayersky: "adjusting to the 5/3 life" | Banking |
| Jan 9, 2020 | Chase→Fifth Third transition initiated | Banking |
| 2021 | Constellation kickback activity (evidenced by revenue spike) | Kickback |
| Jun 23, 2023 | JZ files Navex report #294567134501 | Kickback |
| Jun 30, 2023 | Constellation confirms investigation | Kickback |
| Feb 14, 2024 | Receiver appointed | Diversion |
| Feb-Apr 2024 | Brand Addition diversion (INV 702222, Order #100096358) | Diversion |
| Jul 31, 2024 | Brand Addition orders confirmed converted to AWA | Diversion |

## Damages Summary

- Joint and several liability against all co-conspirators for all damages caused by conspiracy
- Banking conspiracy: JZ's exclusion from company finances; false $8K theft accusation
- Kickback conspiracy: Inflated Constellation pricing; lost company profits
- Diversion conspiracy: $85,431.40+ in diverted customer contracts
- Total: Revenue destruction from $2.3M to $46K; business liquidation
