---
type: dashboard
title: "Witness Binder — Deposition Preparation"
case: "Rowboat Creative LLC v. Guariglia"
case_number: "2024CH00720"
created: "2026-05-18"
updated: "2026-05-18"
tags:
  - dashboard
  - deposition
  - witness-prep
---

# Witness Binder — Deposition Preparation

> **Template for organizing deposition preparation. Duplicate this file for each witness.**
> Structure: Witness Profile → Key Topics → Exhibit Binder → Impeachment Material → Questions

---

## Witness Profile

- **Witness Name**: 
- **Role**: 
- **Relationship to Case**: 
- **Deposition Date**: 
- **Deposition Location**: 
- **Attorney Taking Deposition**: 
- **Attorney Defending**: 
- **Court Reporter**: 
- **Videographer**: 

---

## Witness Background

### Personal History
- 

### Professional History
- 

### Relationship to Principals
- **Relationship to Joseph Zangrilli**: 
- **Relationship to Lucas Guariglia**: 
- **Relationship to Rowboat Creative LLC**: 

### Prior Statements
- **Affidavits / Declarations**: 
- **Prior Testimony**: 
- **Written Communications**: 

---

## Key Topics for Examination

### Topic 1: [Topic Name]
- **Relevance**: 
- **Claims Supported**: 
- **Key Exhibits**: 
- **Known Admissions**: 
- **Areas to Explore**: 

### Topic 2: [Topic Name]
- **Relevance**: 
- **Claims Supported**: 
- **Key Exhibits**: 
- **Known Admissions**: 
- **Areas to Explore**: 

### Topic 3: [Topic Name]
- **Relevance**: 
- **Claims Supported**: 
- **Key Exhibits**: 
- **Known Admissions**: 
- **Areas to Explore**: 

---

## Exhibit Binder — Documents to Confront Witness With

| Tab | Exhibit | Date | Description | Topic | Use |
|-----|---------|------|-------------|-------|-----|
| 1 | | | | | Authenticate |
| 2 | | | | | Impeach |
| 3 | | | | | Refresh recollection |
| 4 | | | | | Foundation |
| 5 | | | | | Admission |

---

## Impeachment Material

| Prior Statement | Source | Inconsistency | Exhibit for Impeachment |
|----------------|--------|---------------|------------------------|
| | | | |
| | | | |
| | | | |

---

## Cross-Examination Outline

### Introduction / Background
1. 
2. 
3. 

### [Topic Area 1]
1. 
2. 
3. 

### [Topic Area 2]
1. 
2. 
3. 

### [Topic Area 3]
1. 
2. 
3. 

### Closing / Wrap-Up
1. 
2. 

---

## Key Admissions to Lock In

- [ ] 
- [ ] 
- [ ] 
- [ ] 
- [ ] 

---

## Potential Objections to Anticipate

| Objection | Basis | Response |
|-----------|-------|----------|
| | | |
| | | |
| | | |

---

## Documents Witness May Authenticate

| Document | Foundation Questions |
|----------|---------------------|
| | |
| | |
| | |

---

## Post-Deposition Checklist

- [ ] Review transcript for errata
- [ ] Flag key admissions for summary judgment
- [ ] Update claim files with new evidence
- [ ] Identify new investigative leads
- [ ] Assess witness credibility
- [ ] Update witness list for trial

---

## Related Entities (Auto-Populated)

```dataview
TABLE role, relevance
FROM "entities"
WHERE contains(related_entities, this.file.name)
```

## Related Claims (Auto-Populated)

```dataview
TABLE claim_id, title, severity, status
FROM "claims"
WHERE type = "claim"
SORT claim_id ASC
```

---

## Quick Reference — All Claims

```dataview
TABLE 
  claim_id as "ID",
  title as "Claim",
  severity as "Sev",
  evidence_count as "Ev",
  legal_basis as "Legal Basis"
FROM "claims"
WHERE type = "claim"
SORT severity DESC, claim_id ASC
```
