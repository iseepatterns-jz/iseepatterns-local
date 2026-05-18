---
type: entity
name: "{{title}}"
aliases: []
role: "principal"
relevance: "primary"
tags:
  - entity
  - person
created: "{{date}}"
updated: "{{date}}"
---

# {{title}}

## Basic Information
- **Full Name**: 
- **Role**: 
- **Organization**: 
- **Location**: 
- **Phone**: 
- **Email**: 

## Case Relevance
- **Relationship to Rowboat Creative**: 
- **Period of Involvement**: 
- **Key Conduct**: 

## Related Entities
```dataview
TABLE role, relevance
FROM "entities"
WHERE contains(related_entities, this.file.name)
```

## Related Claims
```dataview
TABLE claim_id, status, severity
FROM "claims"
WHERE contains(related_entities, this.file.name)
```

## Related Evidence
```dataview
TABLE exhibit_id, date, summary
FROM "evidence"
WHERE contains(related_entities, this.file.name)
SORT date ASC
```

## Notes
- 
