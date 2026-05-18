---
type: claim
claim_id: "C-{{number}}"
title: "{{title}}"
status: "active"
severity: "high"
legal_basis: "{{legal_basis}}"
related_entities: []
related_exhibits: []
evidence_count: 0
gaps: []
date_range_start: "{{start_date}}"
date_range_end: "{{end_date}}"
tags:
  - claim
created: "{{date}}"
updated: "{{date}}"
---

# Claim {{number}}: {{title}}

## Summary

## Legal Basis
- 

## Factual Allegations
1. 

## Key Evidence
| EXH | Date | Description | Weight |
|-----|------|-------------|--------|
|     |      |             |        |

## Related Entities
```dataview
TABLE role, relevance
FROM "entities"
WHERE contains(related_entities, this.file.name)
```

## Timeline Integration
```dataview
TABLE date, title
FROM "timeline"
WHERE contains(related_claims, this.file.name)
SORT date ASC
```

## Gaps & Investigation Notes
- 

## Damages
- 

## Status History
| Date | Status | Notes |
|------|--------|-------|
|      |        |       |
