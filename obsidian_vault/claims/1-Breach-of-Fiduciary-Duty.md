---
type: claim
claim_id: "LEGACY-01"
aliases:
  - "Breach of Fiduciary Duty"
  - "Fiduciary Duty"
  - "Claim 1"
tags:
  - claim
status: active
evidence_count: 0
gaps: []
severity: high
governing_law: "Delaware LLC Act (6 Del. C. §§ 18-1101 et seq.) | Illinois common law"
related_entities:
  - "[[../entities/Lucas-Guariglia]]"
  - "[[../entities/Joseph-Zangrilli]]"
  - "[[../entities/Rowboat-Creative-LLC]]"
  - "[[../entities/Suzanne-Guariglia]]"
  - "[[../entities/Leonard-Mayersky]]"
  - "[[../entities/Fifth-Third-Bank]]"
  - "[[../entities/Stephanie-Morin]]"
  - "[[../entities/Ryan-Hayes]]"
case: "Guariglia v. Zangrilli, 2024CH00720 (Cook County Chancery)"
created: 2026-05-18
updated: 2026-05-18
---

# Claim 1: Breach of Fiduciary Duty

## Description

LG, as 50% member of Rowboat Creative LLC (a Delaware member-managed LLC), owed fiduciary duties of care and loyalty to the company and to his co-member JZ. LG systematically breached these duties through: (1) self-dealing by diverting Rowboat customers to his competing entity AWM; (2) usurping corporate opportunities via the Constellation kickback scheme with his wife SG; (3) excluding JZ from company bank accounts; (4) making false statements to Fifth Third Bank to damage JZ's banking reputation; (5) sabotaging employee morale; and (6) driving the company into receivership and liquidation. Under Auriga Capital Corp. v. Gatz Properties, LLC, 40 A.3d 839 (Del. Ch. 2012), default fiduciary duties apply to LLC members unless explicitly waived in the operating agreement.

## Legal Elements

1. **Fiduciary Relationship** — 50/50 member-managed Delaware LLC; both parties acknowledged equal ownership and veto power
2. **Breach of Duty of Loyalty** — Self-dealing (AWM diversion), usurpation of corporate opportunities (Constellation scheme), competing with LLC
3. **Breach of Duty of Care** — Gross negligence, intentional misconduct, failure to act in good faith (bank exclusion, false statements, sabotage)
4. **Causation** — LG's breaches proximately caused harm to the LLC and JZ
5. **Damages** — Revenue collapse from $2.3M to $46K; diversion of $85,431+ in customer contracts; liquidation

## Evidence Table

| Element | Evidence ID | Source | Description |
|---------|-------------|--------|-------------|
| 1: Relationship | Op Agreement | accounting_locker | Rowboat Creative LLC Operating Agreement (50/50 member-managed) |
| 1: Relationship | trs-2023-02-20 | `_analysis_outputs/` | JZ: "I had the business before you... we started a 50/50 situation." LG: "I've been feeling like I should have more than 50%." |
| 2: Self-Dealing | trs-2023-06-30 | `_analysis_outputs/` | JZ filed Navex #294567134501 alleging SG routed Constellation orders through RBC at inflated prices with kickback |
| 2: Self-Dealing | trs-2024-04-25 | `_analysis_outputs/` | Brand Addition customer confirms Rowboat asked to refund Order #100096358 to re-place with AWM |
| 2: Self-Dealing | RECEIVERSHIP_FRAUD | INV 702222 V4 | Brand Addition quote $85,431.40 — payment to Fifth Third account #7986201452, work diverted to AWM |
| 2: Self-Dealing | RECEIVERSHIP_FRAUD | Jul 31, 2024 screenshot | "MASSIVE BRAND ADDITION ORDERS CONVERTED TO AWA" |
| 2: Side Ventures | `evidence_hub.db:email:1001196-1001227` | SMOKING_GUN_LOCKER | Candle manufacturing with Sunday Fly Inc (China); LG paid for samples without JZ |
| 2: Side Ventures | `evidence_hub.db:email:1001306-1001471` | SMOKING_GUN_LOCKER | Fruit infusion bottle orders through RBC bank accounts |
| 3: Misconduct | trs-2023-05-28 | `_analysis_outputs/` | LG admits his lawyer told Fifth Third JZ stole $8,000 — a false statement |
| 3: Misconduct | trs-2023-04-26 | `_analysis_outputs/` | JZ excluded from Fifth Third Bank account despite 50% ownership |
| 3: Misconduct | trs-2023-05-28 (lines 148-150) | `_analysis_outputs/` | LG sent texts to Filiberto and Jeff saying "get worried" — employee sabotage |
| 3: Misconduct | `evidence_hub.db:email:1001302,1001434,1001199` | SMOKING_GUN_LOCKER | Chase→Fifth Third transition executed without JZ's knowledge/consent |
| 4-5: Damages | invoice_analysis.db | `_analysis_outputs/` | Revenue: $2,312,466 (2022) → $407,093 (2024) → $46,050 (2025). GP: $895K → $138K → $1,411 |
| 4-5: Damages | `evidence_hub.db:email:215821` | receivership | May 23, 2024: LG notified insurer Rowboat "ceased all operations... in liquidation mode" |

## Cross-References

- [[2-Fraud]] — The false $8K statement to Fifth Third is both fiduciary breach and fraud
- [[3-Conversion]] — Bank account exclusion and customer diversion are also conversion
- [[5-Unjust-Enrichment]] — LG received benefits at Rowboat's expense
- [[7-Civil-Conspiracy]] — LG + SG + Len Mayersky formed agreement to exclude JZ
- [[8-Fraudulent-Transfer]] — Customer diversion and bank exclusion structured transfers away from RBC
- [[9-Wire-Fraud]] — ACH/wire transfers used to execute the diversion scheme
- [[11-Civil-RICO]] — The overarching enterprise pattern

**Entities:** [[../entities/Lucas-Guariglia]], [[../entities/Joseph-Zangrilli]], [[../entities/Rowboat-Creative-LLC]], [[../entities/Suzanne-Guariglia]], [[../entities/Leonard-Mayersky]], [[../entities/Fifth-Third-Bank]], [[../entities/Stephanie-Morin]], [[../entities/Ryan-Hayes]]

## Gap Analysis

| Gap | Severity | Action Required |
|-----|----------|----------------|
| Operating Agreement not located/reviewed | Critical | Locate and review for fiduciary duty waivers/modifications |
| AWM/AWA entity formation records | High | Subpoena Illinois Secretary of State for All World Agency/Merch ownership |
| Full Hayes iMessage chat (354 msgs, Feb-Jun 2024) | High | Review chat_master.db for receivership-period diversion evidence |
| Constellation investigation outcome | Medium | Subpoena Constellation Brands internal investigation file (Navex #294567134501) |
| LG's investor list from RBC customers | Medium | Identify and interview Blake and other investors LG recruited from RBC customers |
| Filiberto/Jeff employee sabotage texts | Medium | Obtain the actual text messages LG sent to Filiberto and Jeff |
| Len Mayersky full correspondence | High | Subpoena Mayersky's communications with LG and internal Fifth Third records |

## Damages Summary

- Revenue destruction: ~$2.27M annual revenue reduced to near zero
- Specific diversion: $85,431.40 (Brand Addition Quote #702222) + unknown backpack order + additional Brand Addition orders
- Physical conversion: $1,437.16 (Totally Promotional can coolers shipped to LG's residence)
- Lost company value: Business liquidated; estate "close to zeroed out" by March 2025
- JZ forced free labor: months of uncompensated work during bank exclusion period
