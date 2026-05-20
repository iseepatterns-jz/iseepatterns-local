---
type: dashboard
title: "Evidence Tracker"
case: "Rowboat Creative LLC v. Guariglia"
case_number: "2024CH00720"
created: "2026-05-18"
updated: "2026-05-19"
tags:
  - dashboard
  - evidence
  - tracking
---

# Evidence Tracker

> **Track all evidence, especially unlinked items that need to be connected to claims or entities.**
> This dashboard helps identify evidence orphans, weak links, and collection gaps.

## Unlinked Evidence — Not Yet Connected to Any Claim

```dataview
TABLE 
  file.name as "File",
  file.cday as "Created",
  "Unlinked" as "Status"
FROM "evidence"
WHERE length(file.inlinks) = 0 OR !contains(file.etags, "linked")
SORT file.cday DESC
```

> *Note: This query shows evidence files with zero incoming links. Once evidence is referenced in a claim or entity note, it will disappear from this list.*

---

## Evidence by Source Type

```dataview
TABLE 
  source_type as "Source",
  length(rows) as "Count"
FROM "evidence"
GROUP BY source_type
SORT length(rows) DESC
```

---

## Claims by Evidence Count

```dataview
TABLE 
  claim_id,
  title,
  evidence_count as "Evidence Items",
  "[[" + join(related_exhibits, "]], [[") + "]]" as "Exhibits"
FROM "claims"
WHERE type = "claim"
SORT evidence_count DESC
```

---

## Exhibit Inventory — All 58 Core Exhibits (EXH-0001 through EXH-0058)

| EXH | Date | Category | Key Content | Linked Claims |
|-----|------|----------|-------------|---------------|
| EXH-0001 | 2022-03-09 | LG-JZ Calls | LG: "I can't work with you. I cannot." | C-001, C-004 |
| EXH-0003 | 2022-11-15 | LG-JZ Calls | LG admits China business, Amazon misuse, threats | C-001, C-002, C-005 |
| EXH-0005 | 2023-02-14 | Accounting | Post-closure accounting meeting, new account LG-only | C-001, C-004 |
| EXH-0006 | 2023-02-20 | LG-JZ Calls | LG demands >50% ownership: "Yes." | C-001, C-004 |
| EXH-0007 | 2023-02-23 | Whistleblower | Early Warning confirms identity theft | C-003 |
| EXH-0008 | 2023-02-24 | Nitschke | JZ intake with attorney; $23K personal payroll | C-001 |
| EXH-0016 | 2023-04-11 | Accounting | 75% COG documented; LG: "dissolve the company" | C-001, C-004 |
| EXH-0017 | 2023-04-11 | LG-JZ Calls | LG post-accounting call; dissolution threats | C-001, C-004 |
| EXH-0024 | 2023-05-22 | MMM | LG admits bypassing JZ; unilateral OT policy | C-001, C-004, C-010 |
| EXH-0025 | 2023-05-25 | Nitschke | JZ presents full case; three-prong strategy | C-001, C-002, C-005, C-007 |
| EXH-0026 | 2023-05-28 | LG-JZ Calls | LG denies then admits false $8K theft claim | C-009 |
| EXH-0028 | 2023-06-05 | MMM | LG mutes JZ; Layto/Goose Island $40K; sabotage texts | C-001, C-002, C-005, C-008, C-010 |
| EXH-0030 | 2023-06-23 | 5/3 Bank | JZ reports Mayersky; docs forwarded to LG; 8 new accounts | C-007 |
| EXH-0031 | 2023-06-23 | Whistleblower | Constellation Navex report #294567134501 | C-005, C-010 |
| EXH-0039 | 2023-12-28 | Sabotage | GoDaddy domain locked — credit card lapsed | C-010 |
| EXH-0040 | 2024-01-11 | Sabotage | Payroll $16,061.80 blocked R29 fraud filter | C-003, C-010 |
| EXH-0042 | 2024-01-17 | Sabotage | LG calls employee to "cause chaos" | C-010 |
| EXH-0043 | 2024-02-14 | Court | TRO hearing; receiver appointed | C-011 |
| EXH-0045 | 2024-02-27 | Receivership | Rally first meeting; QB taken offline | C-011 |
| EXH-0047 | 2024-04-05 | Court | Liquidation authorized; insolvency confirmed | C-011 |
| EXH-0048 | 2024-04-23 | Contractor | Abel Rodriguez reveals LG's false statements | C-008, C-009 |
| EXH-0049 | 2024-04-25 | Diversion | Brand Addition diverted to AWM during receivership | C-008, C-011 |
| EXH-0057 | 2025-03-14 | Court | LG seeks voluntary dismissal without prejudice | C-011 |
| EXH-0058 | 2025-04-22 | Court | Final objection; $150K/$500K jobs; under advisement | C-002, C-005, C-008, C-011 |

---

## Email Evidence — Mayersky / Fifth Third (P1-P3 Priority)

| Tier | Label | Count | Exhibit Range | Status |
|------|-------|-------|---------------|--------|
| P1 | BANK_FRAUD_ACCOUNT_MANIPULATION | 82 | EXH-0059 – EXH-0140 | Linked to C-007 |
| P2 | BANK_FRAUD_TRANSFERS | 417 | EXH-0141 – EXH-0557 | Linked to C-007 |
| P3 | Unprocessed | 80 | Pending | Needs review |

---

## Unlinked / Unreviewed Evidence Sources

| Source | Description | Priority | Action |
|--------|-------------|----------|--------|
| Chase bank statements (2017-2019) | Chase redemption pattern evidence | Urgent | Subpoena Chase |
| PPP loan applications (2020) | SBA certifications | Urgent | FOIA SBA |
| Dunkirk house closing docs (2020) | $70K down payment trace | Urgent | Subpoena / title search |
| Bank of America account records (2023) | Identity theft account opening | Urgent | Subpoena BoA |
| QuickBooks pre-2022 backup | Full financial history | High | Demand from LG / forensic recovery |
| AWM entity records | LG's side entity incorporation | High | NC Secretary of State search |
| GoDaddy access logs | Domain lockout forensics | High | Subpoena GoDaddy |
| Intuit payroll records | R29 fraud filter details | Medium | Subpoena Intuit |
| Former employee records | Exit interviews, statements | Medium | Contact/witness interviews |
| FBI tip response | Investigation status | Medium | FOIA FBI |

---

## New Evidence — Lucas Calendar Cross-Reference (2026-05-20)

- **Source**: `_analysis_outputs/lucas_calendar_vs_imessage_timeline.md`
- **Count**: 786 calendar events parsed from LG's Google Calendar emails (2016–2022)
- **Key Finding**: Only 1 calendar event overlaps an iMessage critical date: **March 26, 2020 — "Economic Injury Disaster Loans: Overview for Small Businesses"** (JZ + LG, 11am)
- **2023 Void**: Zero calendar events on any 2023 critical conflict date. Partnership implosion played out entirely in iMessage — no structured meetings scheduled.
- **JZ-LG Joint Meetings**: 594 events across 2017–2022
- **Suzanne Ronayne**: 52 calendar events with LG (pre-dispute RBC involvement)
- **Exhibit**: EXH-0063

---

## Newly Linked — Financial Explorer (2026-05-19)

These evidence sources are now wired into the [[Financial Explorer]] at `localhost:3000/financials`:

| Source | Records | Link | Notes |
|--------|---------|------|-------|
| RosettaStone transactions | 21,981 | `evidence_hub.db` → `rosettastone_transactions` | 2015-2023, 150 bank/CC statements, filterable by 17 fields |
| Printavo invoices | 1,995 | `evidence_hub.db` → `printavo_invoices` | Production orders with POs, cross-referenced to QBO |
| DecoNetwork orders | 2,949 | `evidence_hub.db` → `deco_orders` | 24,289 PO line items, sales staff tracking |
| QBO ↔ Printavo ↔ Deco cross-refs | 340 | `/api/financials/cross-reference` | Closed-loop forensic loop: RosettaStone → QBO → Printavo → Deco |
| Slack messages | 2,707 | `evidence_hub.db` → `slack_messages` | 14 channels, Mar 2020 – Mar 2024, FTS-searchable |
| Bank/CC statements (PDF) | 150 | `/api/financials/statements` | Chase CC (147), Chase Checking (1), Fifth Third (2) |

---

## Evidence Linkage Summary

```dataview
TABLE 
  length(file.outlinks) as "Outgoing Links",
  length(file.inlinks) as "Incoming Links"
FROM "claims" OR "entities" OR "evidence"
WHERE type
SORT length(file.inlinks) DESC
LIMIT 20
```
