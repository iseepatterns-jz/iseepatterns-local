# Amazon Cloud Directory: Hierarchical Data Technical Reference

This document serves as the authoritative "Documents-Only" source for architecting and managing hierarchical data using Amazon Cloud Directory.

> [!IMPORTANT]
> **Service Status**: As of November 7, 2025, Amazon Cloud Directory is no longer open to new customers. Existing customers can continue to use the service. For new workloads requiring hierarchical or graph-based data, consider **Amazon DynamoDB** or **Amazon Neptune**.

## 1. Core Concepts
Amazon Cloud Directory is a specialized graph-based directory store that simplifies the creation and management of hierarchical data.
- **Directory**: A container for your objects, schemas, and facets.
- **Objects**: Entities in the directory (e.g., users, departments, devices).
- **Hierarchies**: Objects are organized into parent-child relationships, allowing for complex tree structures.

## 2. Schema Architecture
A schema is the blueprint for your directory data.
- **Facet**: The foundational building block of a schema. It defines attributes, constraints, and links for an object.
    - **Static Facets**: All attributes are defined in the schema.
    - **Dynamic Facets**: Attributes can be defined during data plane operations.
- **Attributes**: Individual data fields within a facet (e.g., `EmailAddress`, `EmployeeID`).
- **Data Validation**: Schemas enforce rules on attribute types (String, Binary, Boolean, Number, Datetime) and requirements.

## 3. Relationships & Links
- **Parent-Child Links**: Create a primary hierarchy (tree structure).
- **Typed Links**: Create non-hierarchical relationships between objects (e.g., "ManagedBy", "WorksIn").
- **Policy Links**: Used for attaching and evaluating policies across the hierarchy.

## 4. Operational Principles
- **Schema Evolution**: Schemas can be updated in-place with backwards-compatibility checks.
- **Indexing**: Create indexes on specific facets to enable fast searches and queries across objects.
- **Multi-Facet Objects**: An object can be attached to multiple facets to inherit combined properties.

## 5. Implementation Workflow (AWS SDK for JavaScript)
```typescript
import { CloudDirectoryClient, CreateDirectoryCommand, CreateFacetCommand } from "@aws-sdk/client-clouddirectory";

const client = new CloudDirectoryClient({ region: "us-east-1" });

// Create a custom facet
const facetCommand = new CreateFacetCommand({
  SchemaArn: "arn:aws:clouddirectory:us-east-1:123456789012:schema/development/myschema",
  Name: "EmployeeFacet",
  Attributes: [
    { Name: "EmployeeID", Type: "STRING", RequiredBehavior: "REQUIRED_ALWAYS" },
    { Name: "Department", Type: "STRING", RequiredBehavior: "NOT_REQUIRED" }
  ],
  ObjectType: "NODE"
});
await client.send(facetCommand);
```

## 6. Safe Practice Protocol
- **Constraint Compliance**: Always verify attribute limits and object depth constraints before designing deeply nested hierarchies.
- **Alternative Selection**: For new projects, prioritize DynamoDB (Adjacency List pattern) or Amazon Neptune.
- **Secure Access**: Use IAM policies to restrict directory and schema management operations.
- **Region Specificity**: All architectural recommendations are centered on `us-east-1`.
