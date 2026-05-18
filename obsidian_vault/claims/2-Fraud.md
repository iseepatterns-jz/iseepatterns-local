---
type: claim
claim_id: "LEGACY-02"
aliases:
  - "Fraud"
  - "Actual Fraud"
  - "Fraudulent Misrepresentation"
  - "Claim 2"
tags:
  - claim
status: active
evidence_count: 0
gaps: []
severity: high
governing_law: "Illinois common law (Soules v. General Motors Corp., 79 Ill. 2d 282)"
related_entities:
  - "[[../entities/Lucas-Guariglia]]"
  - "[[../entities/Joseph-Zangrilli]]"
  - "[[../entities/Rowboat-Creative-LLC]]"
  - "[[../entities/Fifth-Third-Bank]]"
  - "[[../entities/Leonard-Mayersky]]"
  - "[[../entities/Stephanie-Morin]]"
  - "[[../entities/Spark-Business-Consulting]]"
case: "Guariglia v. Zangrilli, 2024CH00720 (Cook County Chancery)"
created: 2026-05-18
updated: 2026-05-18
---

# Claim 2: Fraud / Actual Fraud

## Description

LG made multiple false statements of material fact — to Fifth Third Bank, to Rowboat's accountants, to JZ, and to the Court — with knowledge of their falsity and intent to induce reliance. The core false statements include: (1) telling Fifth Third Bank that JZ stole $8,000 (a knowingly false accusation made via LG's attorney at LG's direction); (2) denying to JZ that he had dealings with Len Mayersky at Fifth Third, then contradicting himself on the same recorded call; (3) falsely claiming JZ "transferred over a bunch of stuff" (emails), which was actually a Google Cloud trial license removal; (4) telling accountants "bullshit stories" that then fed into banking and tax representations; (5) telling the Court on Feb 14, 2024 that JZ was making unauthorized payroll payments, when in fact JZ was legitimately managing payroll. LG's false representations induced reliance by Fifth Third Bank (restricting JZ's access), by accountants (excluding JZ from financial discussions), and by employees (creating fear and destabilizing operations).

## Legal Elements

1. **False statement of material fact** — Multiple documented false statements
2. **Scienter (knowledge of falsity)** — LG caught on recording making contradictory statements
3. **Intent to induce action** — LG sought to exclude JZ from banking and accounting
4. **Justifiable reliance** — Fifth Third, accountants, and employees acted on LG's statements
5. **Damages** — JZ's banking reputation damaged; company financial access restricted; operational destabilization

## Evidence Table

| Element | Evidence ID | Source | Description |
|---------|-------------|--------|-------------|
| 1: False Statement | trs-2023-05-28 (lines 73-81) | `_analysis_outputs/` | LG admits his lawyer told Fifth Third JZ stole $8,000. JZ: "You said to the bank that I stole $8,000." LG: "I did not say to the bank." Then admits his lawyer told the bank exactly that on his behalf. |
| 1: False Statement | trs-2023-05-28 (lines 39-45) | `_analysis_outputs/` | LG denies having dealings with Len Mayersky: "Nothing going on in terms of what?" Then later contradicted (line 117): JZ: "You realize that you just contradicted what you said." |
| 1: False Statement | trs-2023-05-28 (line 53) | `_analysis_outputs/` | LG: "There's nothing that was done on purpose." Contradicted by Feb 20 demand for >50%, bankruptcy "forecast," AWM diversion, and employee sabotage texts. |
| 1: False Statement | trs-2024-02-21 | `_analysis_outputs/` | LG told Court JZ was making unauthorized payroll payments. JZ's Intuit call shows legitimate payroll management. |
| 1: False Statement | trs-2023-05-28 (lines 22-34) | `_analysis_outputs/` | LG initially claims JZ "transferred over a bunch of stuff" (emails). JZ explains it was a Google Cloud license removal. LG retreats: "Again, it doesn't matter." |
| 2: Scienter | trs-2023-05-28 (line 74) | `_analysis_outputs/` | JZ calls out LG's lie: "You just lied. And then you come up with a bullshit, embarrassing explanation." |
| 2: Scienter | trs-2023-05-28 (line 66) | `_analysis_outputs/` | LG: "The judge can figure out whatever they want to figure out." — demonstrates consciousness of legal exposure. |
| 2: Scienter | trs-2023-05-28 (lines 105-108) | `_analysis_outputs/` | JZ: "You emailed me something once by accident... I just been holding on to it for years. You don't really look at your fucking signatures very often." |
| 3: Intent to Induce | trs-2023-05-28 (lines 71-72) | `_analysis_outputs/` | JZ: "How are you going to get to the bank and tell them that you fucking lied and then fix my fucking name with them?" |
| 3: Intent to Induce | trs-2023-05-28 (lines 54-59) | `_analysis_outputs/` | LG refused to forward accountant emails to JZ: "I don't have to share you on them." |
| 3: Intent to Induce | trs-2023-05-28 (lines 148-150) | `_analysis_outputs/` | LG sent texts to Filiberto and Jeff saying "get worried" — inducing employee fear. |
| 3: Intent to Induce | `evidence_hub.db:email:1001199` | SMOKING_GUN_LOCKER | Sep 26, 2019: Len Mayersky to LG: "still adjusting to the 5/3 life." Relationship cultivated exclusively. |
| 4-5: Reliance/Damages | See Claim 1 | — | Revenue collapse, bank exclusion, payroll disruptions, liquidation |

## Cross-References

- [[1-Breach-of-Fiduciary-Duty]] — False statements are both fraud and fiduciary breach
- [[3-Conversion]] — False $8K statement used to justify bank exclusion/conversion
- [[7-Civil-Conspiracy]] — False statements made in coordination with Len Mayersky
- [[9-Wire-Fraud]] — False statements transmitted via interstate wire (email, phone)
- [[11-Civil-RICO]] — Fraud is a RICO predicate act

**Entities:** [[../entities/Lucas-Guariglia]], [[../entities/Joseph-Zangrilli]], [[../entities/Fifth-Third-Bank]], [[../entities/Leonard-Mayersky]], [[../entities/Stephanie-Morin]], [[../entities/Spark-Business-Consulting]]

## Gap Analysis

| Gap | Severity | Action Required |
|-----|----------|----------------|
| Actual Fifth Third Bank statements re: JZ's account status | High | Subpoena Fifth Third account #7986201452 — fraud reports, stop payments, communications about JZ |
| Len Mayersky's full email correspondence | High | Review complete Mayersky-LG email chain; SMOKING_GUN_LOCKER IDs cover 2018-2019 only |
| Attorney correspondence containing $8,000 claim | High | Obtain the letter from LG's lawyer to Fifth Third Bank referenced on May 28 call |
| Accountant testimony (Stephanie Morin, Sheri Highland) | Medium | Interview accountants about what LG told them and what they told the bank |
| Filiberto and Jeff witness statements | Medium | Interview employees re: the "get worried" texts and sabotage communications |

## Damages Summary

- Banking reputation: JZ's name falsely associated with theft at federally insured institution
- Loss of banking access: JZ excluded from company accounts based on false statements
- Company destabilization: False statements to accountants fed into misrepresentations to IRS and bank
- Employee morale destruction: False/implicit threats caused operational paralysis
