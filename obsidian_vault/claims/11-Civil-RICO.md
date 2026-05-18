---
type: claim
claim_id: "11"
aliases:
  - "Civil RICO"
  - "Racketeering"
  - "18 U.S.C. § 1962"
tags:
  - claim
status: active
evidence_count: 0
gaps: []
severity: high
governing_law: "18 U.S.C. §§ 1961-1968 (RICO) — § 1962(c) and § 1962(d)"
related_entities:
  - "[[../entities/Lucas-Guariglia]]"
  - "[[../entities/Joseph-Zangrilli]]"
  - "[[../entities/Suzanne-Guariglia]]"
  - "[[../entities/Mayersky]]"
  - "[[../entities/Fifth-Third-Bank]]"
  - "[[../entities/All-World-Agency]]"
  - "[[../entities/Stephanie-Morin]]"
  - "[[../entities/Rally-LLC]]"
case: "Guariglia v. Zangrilli, 2024CH00720 (Cook County Chancery)"
created: 2026-05-18
updated: 2026-05-18
---

# Claim 11: Civil RICO (18 U.S.C. § 1962(c) and § 1962(d))

## Legal Elements

1. Conduct
2. Of an enterprise
3. Through a pattern (at least two predicate acts within ten years)
4. Of racketeering activity (predicate acts listed in 18 U.S.C. § 1961(1))
5. Injury to business or property
6. By reason of the RICO violation (proximate causation)

Remedy: Treble damages + attorney fees (18 U.S.C. § 1964(c)).

---

## Evidence Mapping

### Element 1: The Enterprise(s)

Three possible enterprise formulations:

| Enterprise | Members | Description |
|---|---|---|
| Rowboat Creative LLC as vehicle | LG as central figure | LG used the LLC itself as instrument for racketeering |
| LG-SG-Mayorsky association-in-fact | LG + Suzanne Guariglia + Len Mayersky | Trio working together to extract value from Rowboat |
| LG-AWM enterprise | LG + All World Agency | LG using Rowboat resources to build competing entity while destroying Rowboat |

Enterprise participants:
- Lucas Guariglia — central orchestrator
- Suzanne Guariglia — Constellation insider for kickback/pricing scheme
- Len Mayersky — Fifth Third banker who facilitated Chase transition + JZ exclusion
- All World Agency — receiving entity for diverted orders
- Stephanie Morin (possible) — PKFM accountant with separate LG communications
- Laurie Zimmerman — Supporting Strategies, implemented Chase→Fifth Third transition

---

### Element 2: Pattern — Predicate Acts Timeline (2019-2024)

| Date | Predicate Act | Statute | Evidence |
|---|---|---|---|
| Sep 2019 | Mayersky/LG cultivate Fifth Third relationship | Wire fraud (§ 1343) | SMOKING_GUN_LOCKER: ID 1001199 |
| Jan 2020 | Chase→Fifth Third transition without JZ | Wire fraud | SMOKING_GUN_LOCKER: ID 1001302 |
| Jun 2021 | PMGOA invoice payment via ACH | Wire fraud | SMOKING_GUN_LOCKER: IDs 1001194, 1001203 |
| Jul 2021 | Fruit infusion bottles ACH payments | Wire fraud | SMOKING_GUN_LOCKER: IDs 1001306-1001471 |
| Late 2021 | Candle manufacturing side venture | Wire fraud (email) | SMOKING_GUN_LOCKER: IDs 1001196-1001227 |
| Feb 2023 | LG demands >50% ownership or dissolution | Hobbs Act (§ 1951) potential | Transcript: 2023-02-20 (lines 18-62) |
| Apr 2023 | JZ excluded from bank accounts | Bank fraud / conversion | Transcript: 2023-04-26 |
| May 2023 | LG false $8K statement to Fifth Third | Bank fraud / wire fraud | Transcript: 2023-05-28 (lines 73-81) |
| May 2023 | "Get worried" sabotage texts | Wire fraud (interstate SMS) | chat_case_only.db: Chat3:2023-05 |
| Jun 2023 | Constellation scheme reported to Navex | Wire fraud (kickback) | ETHICS_LOCKER |
| Feb 2024 | Totally Promotional orders → Charlotte | Mail fraud (§ 1341) / wire fraud | RECEIVERSHIP_FRAUD: TO-240222, TO-240224 |
| Apr 2024 | Brand Addition refund + re-place with AWM | Wire fraud / conversion | RECEIVERSHIP_FRAUD |
| Jul 2024 | Brand Addition orders converted to AWA | Wire fraud / conversion | RECEIVERSHIP_FRAUD screenshot |

14 predicate acts over 5 years — well within the 10-year RICO window. At least 2 required; 14 identified.

---

### Predicate Act Detail: Wire Fraud (§ 1343)

Multiple instances spanning 2019-2024. See [[../claims/9-Wire-Fraud]] for full listing.

### Predicate Act Detail: Mail Fraud (§ 1341)

Totally Promotional can coolers ($1,437.16) shipped interstate to Charlotte residence during receivership — ordered under Rowboat name, shipped to LG.

### Predicate Act Detail: Hobbs Act Extortion (§ 1951) — Potential

LG: "I should have more than 50%" → "I don't know where it goes if it's not moving forward" → "We would have to just dissolve it." Transcript: 2023-02-20. Economic extortion: demanding ownership transfer under threat of destroying the business.

---

### Three Schemes, One Enterprise

1. Constellation kickback/price-fixing scheme — SG inside Constellation routing orders to Rowboat at below-market pricing
2. Fifth Third banking scheme — Mayersky facilitating exclusion of JZ from financial accounts
3. AWM customer diversion scheme — Brand Addition orders diverted during receivership

Linked by LG as central figure in all three. Common purpose: extracting value from Rowboat for LG's personal benefit.

---

### Temporal Inflection Point: February 2023

The Feb 2023 ownership demand marks the inflection point. Before: LG cultivated the Fifth Third relationship (2019-2020) and operated the Constellation scheme. After JZ's refusal: LG escalated to active destruction — false bank accusations, employee sabotage, customer diversion.

---

## Cross-References

- [[../claims/1-Breach-of-Fiduciary-Duty]] — fiduciary breach is the foundation; RICO is the pattern of breaches as criminal enterprise
- [[../claims/2-Fraud]] — fraud predicate acts
- [[../claims/3-Conversion]] — converted assets as enterprise proceeds
- [[../claims/9-Wire-Fraud]] — wire fraud is the primary predicate act
- [[../claims/8-Fraudulent-Transfer]] — transfers as enterprise acts
- [[../entities/All-World-Agency]] — receiving entity for diverted orders
- [[../entities/Suzanne-Guariglia]] — enterprise participant

---

## Gap Analysis

| Gap | Severity | Action |
|---|---|---|
| Len Mayersky's full role | Critical | Subpoena Mayersky communications — knowing participant or unwitting tool? |
| SG's role in Constellation scheme | Critical | Obtain Constellation investigation outcome — discipline/termination? |
| AWM entity records | High | Subpoena AWM formation documents, bank records, tax returns |
| Fifth Third ↔ AWM connection | High | Does AWM also bank with Fifth Third / same banker (Mayersky)? |
| PPP/EIDL fraud nexus | Medium | Investigate COVID relief funds as enterprise financial activities |
| RICO demand letter | Medium | Prepare and serve per 18 U.S.C. § 1964(c) |
