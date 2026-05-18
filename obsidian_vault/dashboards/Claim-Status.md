---
type: dashboard
title: "Claim Status Dashboard"
case: "Rowboat Creative LLC v. Guariglia"
case_number: "2024CH00720"
created: "2026-05-18"
updated: "2026-05-18"
tags:
  - dashboard
  - claims
  - status
---

# Claim Status Dashboard

> **All 11 claims with status, severity, evidence, and gaps.**
> Click any claim to open its full analysis.

## Claims Table

```dataview
TABLE 
  claim_id,
  title,
  status,
  severity,
  evidence_count as "Evidence",
  length(gaps) as "Gaps",
  legal_basis as "Legal Basis",
  date_range_start + " → " + date_range_end as "Date Range"
FROM "claims"
WHERE type = "claim"
SORT severity DESC, claim_id ASC
```

## Status Breakdown

```dataview
TABLE 
  length(rows) as "Count"
FROM "claims"
WHERE type = "claim"
GROUP BY status
```

## Severity Breakdown

```dataview
TABLE 
  length(rows) as "Count"
FROM "claims"
WHERE type = "claim"
GROUP BY severity
```

---

## Claim Quick Reference

| ID | Claim | Status | Severity | Evidence | Key Gaps |
|----|-------|--------|----------|----------|----------|
| C-001 | [[C-001-Breach-of-Fiduciary-Duty\|Breach of Fiduciary Duty]] | Active | Critical | 7 | QuickBooks pre-2022, Chase statements |
| C-002 | [[C-002-Conversion-Misappropriation\|Conversion / Misappropriation]] | Active | Critical | 4 | China revenue accounting, Layto/Goose Island tracing |
| C-003 | [[C-003-Fraud-Identity-Theft\|Fraud / Identity Theft]] | Active | Critical | 2 | BoA account records, IP logs, FBI response |
| C-004 | [[C-004-Breach-of-Contract\|Breach of Contract / LLC Agreement]] | Active | High | 5 | Original operating agreement, capital contributions |
| C-005 | [[C-005-Unjust-Enrichment\|Unjust Enrichment]] | Active | High | 4 | Side business accounting, AWM entity records |
| C-006 | [[C-006-PPP-Loan-Fraud\|PPP Loan Fraud]] | Active | High | 0 | SBA FOIA, Dunkirk closing docs, bank records |
| C-007 | [[C-007-Bank-Collusion\|Bank Collusion (Mayersky)]] | Active | High | 4 | Full 579-email analysis, 53 internal investigation |
| C-008 | [[C-008-Tortious-Interference\|Tortious Interference]] | Active | High | 3 | Full diverted customer list, Brand Addition outcome |
| C-009 | [[C-009-Defamation\|Defamation / False Statements]] | Active | Medium | 2 | Abel Rodriguez deposition, 53 theft-claim records |
| C-010 | [[C-010-Whistleblower-Retaliation\|Whistleblower Retaliation]] | Active | High | 5 | Causal link evidence, Intuit docs, GoDaddy logs |
| C-011 | [[C-011-Receivership-Abuse\|Receivership Abuse / Diversion]] | Active | Critical | 6 | Full $251K accounting, receiver's AWM investigation |

---

## Evidence Collection Priority

### Tier 1 — Urgent (Blocking Core Claims)
- [ ] SBA PPP loan records — FOIA request (C-006)
- [ ] Bank of America account opening records — subpoena (C-003)
- [ ] Chase bank statements 2017–2019 — subpoena (C-001, C-002)
- [ ] Dunkirk house closing documents (C-006)
- [ ] Original Rowboat LLC Operating Agreement (C-004)

### Tier 2 — High Priority
- [ ] Full analysis of 579 Mayersky emails — P1 bank fraud (C-007)
- [ ] Fifth Third internal investigation records (C-007)
- [ ] QuickBooks backup pre-2022 (C-001, C-002)
- [ ] AWM / All World Merch incorporation records (C-005, C-008)
- [ ] Brand Addition customer correspondence (C-008)
- [ ] Intuit payroll fraud documentation (C-010)

### Tier 3 — Important
- [ ] Abel Rodriguez deposition (C-008, C-009)
- [ ] FBI response to June 2023 electronic tip (C-003)
- [ ] Constellation Brands Navex investigation outcome (C-005)
- [ ] GoDaddy access and domain logs (C-010)
- [ ] Former employee exit interviews / statements (C-001)

---

## Gap Summary

```dataview
TABLE 
  claim_id,
  title,
  gaps as "Evidence Gaps"
FROM "claims"
WHERE type = "claim" AND length(gaps) > 0
SORT claim_id ASC
```
