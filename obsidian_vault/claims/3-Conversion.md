---
type: claim
claim_id: "LEGACY-03"
aliases:
  - "Conversion"
  - "Claim 3"
tags:
  - claim
status: active
evidence_count: 0
gaps: []
severity: high
governing_law: "Illinois common law (In re Thebus, 108 Ill. 2d 255; Cirrincione v. Johnson, 184 Ill. 2d 109)"
related_entities:
  - "[[../entities/Lucas-Guariglia]]"
  - "[[../entities/Joseph-Zangrilli]]"
  - "[[../entities/Rowboat-Creative-LLC]]"
  - "[[../entities/Fifth-Third-Bank]]"
  - "[[../entities/Ryan-Hayes]]"
case: "Guariglia v. Zangrilli, 2024CH00720 (Cook County Chancery)"
created: 2026-05-18
updated: 2026-05-18
---

# Claim 3: Conversion

## Description

LG wrongfully assumed control, dominion, and ownership over Rowboat Creative LLC property to which JZ had an absolute and unconditional right of possession as 50% owner. LG's conversion encompasses: (1) the company bank account at Fifth Third (#7986201452) — excluding JZ entirely; (2) customer contracts and revenue streams — diverting Brand Addition orders to AWM; (3) physical merchandise — 1,000 Totally Promotional can coolers ($1,437.16) ordered under Rowboat's name but shipped to LG's Charlotte residence; (4) company credit card funds — used for LG's personal Chicago trip; (5) company funds — used for LG's side ventures (candle manufacturing, fruit infusion bottles); (6) employee relationships — sabotaged through "get worried" texts; (7) company information — accountant communications withheld from JZ. JZ made repeated demands for return, including the Tuesday ultimatum demanding reinstatement of access, forwarding of accountant emails, and banking rectification. LG refused, stating "The judge can figure out whatever they want to figure out." The conversion continued through active receivership (Feb-Jul 2024).

## Legal Elements

1. **Plaintiff's right to property** — JZ, as 50% owner, has ownership interest in all company assets
2. **Absolute and unconditional right to immediate possession** — Equal member rights under Delaware LLC Act
3. **Defendant wrongfully assumed control/dominion/ownership** — Bank exclusion, customer diversion, physical property misappropriation
4. **Demand for return** — JZ's Tuesday ultimatum and repeated demands
5. **Refusal to return** — LG's "Judge can figure it out" and ongoing control

## Evidence Table

| Element | Evidence ID | Source | Description |
|---------|-------------|--------|-------------|
| 1-2: Right to Property | Op Agreement | accounting_locker | 50/50 member-managed LLC; equal ownership rights |
| 3: Bank Account | trs-2023-04-26 | `_analysis_outputs/` | JZ excluded from Fifth Third account #7986201452 despite 50% ownership |
| 3: Customer Diversion | RECEIVERSHIP_FRAUD | INV 702222 V4 | $85,431.40 Brand Addition quote diverted to AWM |
| 3: Customer Diversion | trs-2024-04-25 | `_analysis_outputs/` | Brand Addition refund request for Order #100096358 to re-place with AWM |
| 3: Customer Diversion | RECEIVERSHIP_FRAUD | Jul 31, 2024 PNG | "MASSIVE BRAND ADDITION ORDERS CONVERTED TO AWA" |
| 3: Physical Property | RECEIVERSHIP_FRAUD | TO-240222, TO-240224 | 1,000 can coolers ($1,437.16) shipped to LG's Charlotte residence (1768 Dunkirk Dr) |
| 3: Credit Card | trs-2023-05-28 (line 123) | `_analysis_outputs/` | JZ: "Where are you going in June? I saw it on the credit card." LG used company card for personal travel. |
| 3: Side Ventures | `evidence_hub.db:email:1001219` | SMOKING_GUN_LOCKER | LG paid Sunday Fly Inc for candle samples — not an authorized RBC product line |
| 3: Side Ventures | `evidence_hub.db:email:1001306-1001471` | SMOKING_GUN_LOCKER | Fruit infusion bottle orders through RBC bank accounts |
| 3: Information | trs-2023-05-28 (lines 56-60) | `_analysis_outputs/` | LG refused to forward accountant emails: "Because they were phone conversations" |
| 4: Demand | trs-2023-05-28 (lines 93-98) | `_analysis_outputs/` | JZ: "I want my fucking access to everything reinstated... We should have a meeting on Tuesday with Stephanie and Sherry, and you could tell them what the fuck you did." |
| 4: Demand | trs-2023-05-28 (lines 71-72) | `_analysis_outputs/` | JZ: "How are you going to get to the bank and tell them that you fucking lied and then fix my fucking name with them?" |
| 5: Refusal | trs-2023-05-28 (line 66) | `_analysis_outputs/` | LG: "The judge can figure out whatever they want to figure out." |
| 5: Ongoing | RECEIVERSHIP_FRAUD | Jul 31, 2024 PNG | Diversion continues through July 2024 — months after receivership and liquidation |

## Cross-References

- [[1-Breach-of-Fiduciary-Duty]] — Conversion is a core component of the fiduciary breach
- [[2-Fraud]] — False $8K statement justified the bank exclusion/conversion
- [[5-Unjust-Enrichment]] — LG received converted property as unjust benefit
- [[7-Civil-Conspiracy]] — Len Mayersky facilitated the bank conversion
- [[8-Fraudulent-Transfer]] — Customer diversion structured as transfers away from RBC
- [[9-Wire-Fraud]] — ACH/wire used to execute conversion of customer payments

**Entities:** [[../entities/Lucas-Guariglia]], [[../entities/Joseph-Zangrilli]], [[../entities/Rowboat-Creative-LLC]], [[../entities/Fifth-Third-Bank]], [[../entities/Ryan-Hayes]]

## Gap Analysis

| Gap | Severity | Action Required |
|-----|----------|----------------|
| Fifth Third Bank account statements | High | Subpoena full statements for account #7986201452 to trace all unauthorized withdrawals |
| AWM bank account records | High | Identify and subpoena AWM's bank account to trace diverted customer payments |
| Company credit card statements | Medium | Review all company credit card charges for personal expenses |
| Physical inventory at 4200 W. Diversey | Medium | Establish what physical assets were at the facility when liquidation was announced |
| Totally Promotional payment source | High | Determine who paid for the orders — RBC credit card, LG personal, or AWM |

## Damages Summary

- Financial conversion: Full Fifth Third account #7986201452 (all company operating funds)
- Customer diversion: $85,431.40 (Brand Addition) + unknown backpack order + additional orders
- Physical conversion: $1,437.16 (can coolers) + potential additional physical goods
- Company credit card: Undetermined personal charges (Chicago trip + other)
- Side ventures: Unknown amounts paid to Sunday Fly Inc and PMGOA from company funds
