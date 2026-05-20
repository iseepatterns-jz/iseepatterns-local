---
type: dashboard
title: "Master Case Timeline"
case: "Rowboat Creative LLC v. Guariglia"
case_number: "2024CH00720"
created: "2026-05-18"
updated: "2026-05-18"
tags:
  - dashboard
  - timeline
  - chronology
---

# Master Case Timeline: Rowboat Creative LLC

> **Dataview-powered chronology of critical events: 2014–2026**
> Each entry links to entity notes and claim notes. Use filter by phase or year.

## Interactive Query — Full Timeline

```dataview
TABLE 
  date,
  phase,
  description,
  "[[" + join(related_entities, "]], [[") + "]]" as Entities,
  "[[" + join(related_claims, "]], [[") + "]]" as Claims,
  related_exhibits as Exhibits
FROM "timeline/entries"
SORT date ASC
```

---

## Phase 0: Foundation (2014–2016)

### 2014 — Formation
- **Date**: 2014
- **Phase**: Foundation
- **Description**: Rowboat Creative LLC formed as a Delaware LLC — 50/50 partnership between [[Joseph Zangrilli]] (JZ, COO/Production) and [[Lucas Guariglia]] (LG, CEO/Sales). Operating as branded merchandise and apparel production business based in Chicago, IL.
- **Related Entities**: [[Rowboat Creative LLC]], [[Joseph Zangrilli]], [[Lucas Guariglia]]
- **Related Claims**: [[C-004-Breach-of-Contract]]
- **Related Exhibits**: None (pre-dispute foundation event)

---

## Phase 1: Early Manipulation & Schemes (2017–2018)

### 2017 — Press Release Incident
- **Date**: 2017
- **Phase**: Early Manipulation
- **Description**: Press release incident — LG takes credit for company-wide achievement, marginalizing JZ's contributions. Early indicator of LG's pattern of claiming sole credit and diminishing JZ's role.
- **Related Entities**: [[Lucas Guariglia]], [[Joseph Zangrilli]], [[Rowboat Creative LLC]]
- **Related Claims**: [[C-004-Breach-of-Contract]]
- **Related Exhibits**: None (historical incident)

### 2017 — Johansen Separate Entity Scheme
- **Date**: 2017
- **Phase**: Early Manipulation
- **Description**: Accountant [[James Johansen]] (JD Johansen & Associates) orchestrates separate entity structures that enable LG's financial control and self-dealing. This is the genesis of the side-entity pattern that later expanded to China business, Layto, Goose Island, and eventually AWM/All World Merch.
- **Related Entities**: [[James Johansen]], [[Lucas Guariglia]], [[Rowboat Creative LLC]], [[Joseph Zangrilli]]
- **Related Claims**: [[C-001-Breach-of-Fiduciary-Duty]], [[C-002-Conversion-Misappropriation]], [[C-005-Unjust-Enrichment]]
- **Related Exhibits**: None (historical — referenced in later accounting analysis)

### 2017–2019 — Chase Redemption Pattern
- **Date**: 2017–2019
- **Phase**: Early Manipulation
- **Description**: While Rowboat Creative banked with [[JP Morgan Chase]], LG systematically redeemed and redirected company funds. Pattern of unauthorized withdrawals and transfers predating the Chase-to-53 transition. This is the earliest documented financial misappropriation pattern.
- **Related Entities**: [[JP Morgan Chase]], [[Lucas Guariglia]], [[Rowboat Creative LLC]], [[Joseph Zangrilli]]
- **Related Claims**: [[C-002-Conversion-Misappropriation]], [[C-001-Breach-of-Fiduciary-Duty]], [[C-007-Bank-Collusion]]
- **Related Exhibits**: None (Chase records needed — subpoena required)

---

## Phase 2: Accounting Chaos & Exodus (2018–2019)

### 2018–2019 — Accounting Transitions
- **Date**: 2018–2019
- **Phase**: Accounting Chaos
- **Description**: Rowboat Creative cycles through multiple accounting firms. Each transition creates gaps in financial records and enables LG's financial control to deepen. Pattern of accountants being fired or quitting after confronting LG about financial irregularities begins. [[James Johansen]] departs; internal chaos ensues.
- **Related Entities**: [[Rowboat Creative LLC]], [[Lucas Guariglia]], [[James Johansen]]
- **Related Claims**: [[C-001-Breach-of-Fiduciary-Duty]], [[C-002-Conversion-Misappropriation]]
- **Related Exhibits**: None (historical accounting firm records needed)

### 2019 — Employee Departures
- **Date**: 2019
- **Phase**: Accounting Chaos
- **Description**: Wave of employee departures from Rowboat Creative. Employees leave amid growing concerns about LG's management style and financial control. Multiple key production and design staff exit, creating operational instability that LG later blames on JZ.
- **Related Entities**: [[Rowboat Creative LLC]], [[Lucas Guariglia]], [[Joseph Zangrilli]]
- **Related Claims**: [[C-004-Breach-of-Contract]], [[C-001-Breach-of-Fiduciary-Duty]]
- **Related Exhibits**: None (employment records / exit interviews needed)

---

## Phase 3: PPP & Banking Pivot (2020)

### 2020 — PPP Loans and Dunkirk House
- **Date**: 2020
- **Phase**: PPP & Banking
- **Description**: Rowboat Creative receives approximately **$195,000** in PPP loans. Evidence suggests **$70,000** of PPP funds were diverted as a down payment on LG's personal residence (the "Dunkirk house") in North Carolina, rather than being used for eligible payroll and business expenses.
- **Related Entities**: [[Lucas Guariglia]], [[Rowboat Creative LLC]], [[Joseph Zangrilli]]
- **Related Claims**: [[C-006-PPP-Loan-Fraud]], [[C-002-Conversion-Misappropriation]]
- **Related Exhibits**: EXH-0063 (Lucas Calendar — EIDL briefing, Mar 26, 2020)

### March 26, 2020 — Joint EIDL Briefing (Calendar Corroboration)
- **Date**: March 26, 2020
- **Phase**: PPP & Banking
- **Description**: JZ and LG jointly attend **"Economic Injury Disaster Loans: Overview for Small Businesses"** — a Google Calendar event on LG's calendar with both JZ and LG as attendees (11:00 AM – 12:00 PM). This is the **only calendar event crossing an iMessage critical date** and directly corroborates that both partners were jointly focused on disaster loan programs. On this exact date, iMessages show peak PPP/EIDL discussion activity (4/8 topic crossover). The day prior (Mar 25) features a separate "S&S Meeting" with JZ + LG together.
- **Related Entities**: [[Lucas Guariglia]], [[Joseph Zangrilli]], [[Rowboat Creative LLC]]
- **Related Claims**: [[C-006-PPP-Loan-Fraud]]
- **Related Exhibits**: EXH-0063 (786 Lucas calendar events parsed; 594 JZ-LG joint meetings)
- **Source**: `_analysis_outputs/lucas_calendar_vs_imessage_timeline.md`

### 2020 — Chase-to-53 Transition
- **Date**: 2020
- **Phase**: PPP & Banking
- **Description**: Rowboat Creative transitions banking from [[JP Morgan Chase]] to [[Fifth Third Bank]]. LG leads the migration. [[Leonard Mayersky]] becomes the relationship manager. The transition consolidates LG's unilateral banking control — JZ is excluded from the new account structure. This is the inflection point marking LG's complete capture of financial infrastructure.
- **Related Entities**: [[Fifth Third Bank]], [[JP Morgan Chase]], [[Leonard Mayersky]], [[Lucas Guariglia]], [[Rowboat Creative LLC]], [[Joseph Zangrilli]]
- **Related Claims**: [[C-007-Bank-Collusion]], [[C-001-Breach-of-Fiduciary-Duty]], [[C-004-Breach-of-Contract]]
- **Related Exhibits**: None (Fifth Third account opening records needed)

---

## Phase 4: Mayersky Collusion & Accounting Renewal (2021–2022)

### 2021 — Mayersky Collusion Deepens
- **Date**: 2021
- **Phase**: Collusion
- **Description**: [[Leonard Mayersky]]'s preferential relationship with LG deepens. Mayersky provides LG with unilateral control over Rowboat's Fifth Third accounts. JZ remains excluded from banking access. The Mayersky-LG alliance becomes the financial backbone of LG's partnership takeover.
- **Related Entities**: [[Leonard Mayersky]], [[Fifth Third Bank]], [[Lucas Guariglia]], [[Joseph Zangrilli]], [[Rowboat Creative LLC]]
- **Related Claims**: [[C-007-Bank-Collusion]], [[C-001-Breach-of-Fiduciary-Duty]]
- **Related Exhibits**: EXH-0059 through EXH-0557 (Mayersky email database — 579 emails)

### 2022–2023 — Spark Accounting Engagement
- **Date**: February 2022 – June 2023
- **Phase**: Accounting & Collapse
- **Description**: [[Spark Business Consulting]] ([[Stephanie Morin]]) engaged as the 5th external accounting firm. Spark documents 75% cost of goods — reveals structural unprofitability. LG resists Spark's recommendations for a sales plan and financial transparency. The engagement frames the final act before partnership implosion.
- **Related Entities**: [[Spark Business Consulting]], [[Stephanie Morin]], [[Lucas Guariglia]], [[Rowboat Creative LLC]], [[Joseph Zangrilli]]
- **Related Claims**: [[C-001-Breach-of-Fiduciary-Duty]], [[C-004-Breach-of-Contract]]
- **Related Exhibits**: EXH-0005, EXH-0010, EXH-0011, EXH-0016, EXH-0017

---

## Phase 5: Partnership Breakdown & Legal Escalation (2023)

### March–April 2023 — Partnership Breakdown
- **Date**: March – April 2023
- **Phase**: Breakdown
- **Description**: Full partnership breakdown: LG ceases salary payments to JZ. LG states "I can't work with you. I cannot." and resists all structural improvements. LG demands more than 50% ownership (Feb 20). Spark documents 75% COG. LG: "My next steps would be to dissolve the company." JZ excluded from all financial accounts.
- **Related Entities**: [[Lucas Guariglia]], [[Joseph Zangrilli]], [[Rowboat Creative LLC]], [[Spark Business Consulting]], [[Stephanie Morin]]
- **Related Claims**: [[C-001-Breach-of-Fiduciary-Duty]], [[C-004-Breach-of-Contract]], [[C-002-Conversion-Misappropriation]]
- **Related Exhibits**: EXH-0001, EXH-0003, EXH-0005, EXH-0006, EXH-0016, EXH-0017

### May 2023 — Nixon Peabody Letter
- **Date**: May 2023
- **Phase**: Legal Escalation
- **Description**: Nixon Peabody letter sent to Rowboat Creative — legal escalation begins. The letter addresses partnership governance issues and financial control. LG's response triggers further breakdown with Spark accounting.
- **Related Entities**: [[Rowboat Creative LLC]], [[Lucas Guariglia]], [[Joseph Zangrilli]], [[Spark Business Consulting]]
- **Related Claims**: [[C-004-Breach-of-Contract]], [[C-001-Breach-of-Fiduciary-Duty]]
- **Related Exhibits**: None (Nixon Peabody correspondence — privileged, to be collected)

### May 2023 — Nitschke Full Case Presentation
- **Date**: May 25, 2023
- **Phase**: Legal Escalation
- **Description**: JZ presents full case to attorney [[Thomas Nitschke]] (Blaise & Nitschke): 240 personal Amazon purchases, flights, side business AllWorldAgency.com, China manufacturing, Constellation collusion, Mayersky/Fifth Third. Nitschke advises three-prong strategy.
- **Related Entities**: [[Thomas Nitschke]], [[Joseph Zangrilli]], [[Lucas Guariglia]], [[Rowboat Creative LLC]], [[Leonard Mayersky]], [[Suzanne Guariglia]]
- **Related Claims**: [[C-001-Breach-of-Fiduciary-Duty]], [[C-002-Conversion-Misappropriation]], [[C-005-Unjust-Enrichment]], [[C-007-Bank-Collusion]]
- **Related Exhibits**: EXH-0025

### June 2023 — Blaisenitschke Engagement Collapse
- **Date**: June 2023
- **Phase**: Legal Escalation
- **Description**: The attorney engagement with [[Thomas Nitschke]] (Blaise & Nitschke) collapses. Simultaneously, Spark accounting engagement terminates. LG's aggressive response to legal and accounting scrutiny drives away both counsel and accountants. JZ left pro se.
- **Related Entities**: [[Thomas Nitschke]], [[Spark Business Consulting]], [[Stephanie Morin]], [[Joseph Zangrilli]], [[Lucas Guariglia]]
- **Related Claims**: [[C-001-Breach-of-Fiduciary-Duty]], [[C-010-Whistleblower-Retaliation]]
- **Related Exhibits**: EXH-0027, EXH-0028

---

## Phase 6: Whistleblowing & Sabotage (Jun 2023 – Jan 2024)

### June 2023 — Whistleblower Barrage
- **Date**: June 23, 2023
- **Phase**: Whistleblowing
- **Description**: JZ files multiple whistleblower reports in a single day: (1) reports [[Leonard Mayersky]] to [[Fifth Third Bank]] — privacy violation for forwarding JZ's personal docs to LG; (2) files Navex whistleblower report (#294567134501) against [[Suzanne Guariglia]] at Constellation Brands for price-fixing collusion; (3) submits FBI electronic tip.
- **Related Entities**: [[Joseph Zangrilli]], [[Leonard Mayersky]], [[Fifth Third Bank]], [[Suzanne Guariglia]], [[Lucas Guariglia]]
- **Related Claims**: [[C-007-Bank-Collusion]], [[C-005-Unjust-Enrichment]], [[C-010-Whistleblower-Retaliation]]
- **Related Exhibits**: EXH-0029, EXH-0030, EXH-0031

### December 2023 – January 2024 — Infrastructure Sabotage
- **Date**: December 2023 – January 2024
- **Phase**: Sabotage
- **Description**: Series of retaliatory sabotage events: (1) GoDaddy domain locked — credit card lapsed under LG's financial control (Dec 28); (2) Payroll payment of $16,061.80 returned with R29 fraud filter — Intuit confirms targeted block, not system failure (Jan 11); (3) LG calls employee to "cause chaos" (Jan 17).
- **Related Entities**: [[Lucas Guariglia]], [[Joseph Zangrilli]], [[Rowboat Creative LLC]]
- **Related Claims**: [[C-010-Whistleblower-Retaliation]], [[C-003-Fraud-Identity-Theft]]
- **Related Exhibits**: EXH-0039, EXH-0040, EXH-0042

---

## Phase 7: Receivership & Diversion (Feb 2024 – Apr 2025)

### February 2024 — TRO and Receivership
- **Date**: February 14, 2024
- **Phase**: Receivership
- **Description**: Emergency TRO hearing. LG seeks receiver. JZ does not oppose: "It would be the first time someone would actually see what is really going on." [[Ryan Hayes]] of Rally Capital appointed as receiver. LG's counsel: "sinking ship where one co-captain seems to be actively facilitating the sinking."
- **Related Entities**: [[Ryan Hayes]], [[Lucas Guariglia]], [[Joseph Zangrilli]], [[Rowboat Creative LLC]]
- **Related Claims**: [[C-011-Receivership-Abuse]]
- **Related Exhibits**: EXH-0043

### April 2024 — Court Authorizes Liquidation
- **Date**: April 5, 2024
- **Phase**: Receivership
- **Description**: Court authorizes liquidation. Receiver Hayes: "The company is insolvent. They're out of cash." Judge Meyerson raises sua sponte bankruptcy concern. LG took QuickBooks offline before receivership — obstructing receiver's investigation.
- **Related Entities**: [[Ryan Hayes]], [[Rowboat Creative LLC]], [[Lucas Guariglia]], [[Joseph Zangrilli]]
- **Related Claims**: [[C-011-Receivership-Abuse]], [[C-001-Breach-of-Fiduciary-Duty]]
- **Related Exhibits**: EXH-0047

### 2024–2025 — Post-Receivership Diversion
- **Date**: April 2024 – March 2025
- **Phase**: Diversion
- **Description**: During active receivership, LG continues pattern of diversion: (1) April 25, 2024 — Rowboat customer Brand Addition receives request to refund Rowboat order and re-place with "AWM (ALL WORLD MERCH)" — LG's entity; (2) Receiver Hayes later testifies he found $150,000 and $500,000 jobs with Rowboat customers during receivership period; (3) LG receives $251K in post-dispute distributions while estate is "close to zeroed out."
- **Related Entities**: [[Lucas Guariglia]], [[Ryan Hayes]], [[Rowboat Creative LLC]], "All World Merch (AWM)"
- **Related Claims**: [[C-011-Receivership-Abuse]], [[C-008-Tortious-Interference]], [[C-002-Conversion-Misappropriation]]
- **Related Exhibits**: EXH-0048, EXH-0049, EXH-0058

### March 2025 — LG Seeks Dismissal
- **Date**: March 14, 2025
- **Phase**: Current
- **Description**: LG seeks voluntary dismissal without prejudice — receivership complete, estate "close to zeroed out." JZ objects: "I have all the evidence in the world that proves complete fraud." LG's counsel: JZ is "judgment proof." Court orders 14 days for written objection.
- **Related Entities**: [[Lucas Guariglia]], [[Joseph Zangrilli]], [[Rowboat Creative LLC]], [[Ryan Hayes]]
- **Related Claims**: [[C-011-Receivership-Abuse]], [[C-001-Breach-of-Fiduciary-Duty]]
- **Related Exhibits**: EXH-0057

### April 2025 — Final Objection Hearing
- **Date**: April 22, 2025
- **Phase**: Current
- **Description**: Objection hearing. JZ sworn in, testifies that receiver Hayes showed him "$150,000 job and another $500,000 job with one of our customers." LG's counsel notes JZ "never filed a counterclaim." Judge D. Renee Jackson takes matter under advisement. Both sides ordered to submit proposed orders.
- **Related Entities**: [[Joseph Zangrilli]], [[Lucas Guariglia]], [[Ryan Hayes]], [[Rowboat Creative LLC]]
- **Related Claims**: [[C-011-Receivership-Abuse]], [[C-001-Breach-of-Fiduciary-Duty]], [[C-002-Conversion-Misappropriation]], [[C-008-Tortious-Interference]]
- **Related Exhibits**: EXH-0058

---

## Phase Summary

| Phase | Period | Key Theme |
|-------|--------|-----------|
| Foundation | 2014–2016 | 50/50 LLC formation, early operations |
| Early Manipulation | 2017–2019 | Press release, Johansen scheme, Chase redemption, accounting chaos |
| PPP & Banking | 2020 | PPP loans, Dunkirk house, Chase-to-53 transition |
| Collusion | 2021 | Mayersky-LG alliance solidifies |
| Accounting & Collapse | 2022–2023 | Spark engagement, 75% COG, partnership breakdown |
| Legal Escalation | May–Jun 2023 | Nixon Peabody, Nitschke case presentation, engagement collapse |
| Whistleblowing | Jun 2023 | Multiple whistleblower reports filed |
| Sabotage | Dec 2023–Jan 2024 | Domain lockout, payroll fraud hold |
| Receivership | Feb–Apr 2024 | TRO, receiver appointed, liquidation authorized |
| Diversion | Apr 2024–Mar 2025 | AWM customer diversion, $251K distributions |
| Current | Mar–Apr 2025 | Dismissal hearing, under advisement |

---

## Key Dollar Amounts at a Glance

| Amount | Description | Phase |
|--------|-------------|-------|
| $195,000 | PPP loans received | PPP & Banking (2020) |
| — | 786 calendar events parsed; 594 JZ-LG meetings | Calendar Evidence (2026-05-20) |
| — | 2023 calendar void — zero meetings on 6 critical dates | Calendar Evidence (2026-05-20) |
| $70,000 | Dunkirk house down payment from PPP funds | PPP & Banking (2020) |
| $30,000 | China side business (undisclosed) | Early Manipulation (2017–) |
| $40,000 | Layto/Goose Island parking scheme | Collapse (2023) |
| $16,061.80 | Payroll blocked with R29 fraud filter | Sabotage (Jan 2024) |
| $251,000 | LG post-dispute distributions | Diversion (2024–2025) |
| $150,000 | Customer job found by receiver | Diversion (2024) |
| $500,000 | Customer job found by receiver | Diversion (2024) |
| $23,000+ | JZ personal funds to cover payroll | Breakdown (2023) |
