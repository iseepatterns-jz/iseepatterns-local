# Amazon DynamoDB: NoSQL Technical Reference

This document serves as the authoritative "Documents-Only" source for architecting and interacting with Amazon DynamoDB.

## 1. Core Components
DynamoDB is a fully managed NoSQL database service that provides fast and predictable performance with seamless scalability.
- **Tables**: Collections of data items.
- **Items**: Groups of attributes that are uniquely identifiable among all other items. Items are similar to rows, records, or tuples.
- **Attributes**: Fundamental data elements (e.g., strings, numbers, booleans). Attributes are similar to fields or columns.

## 2. Primary Keys
The primary key uniquely identifies each item in a table. DynamoDB supports two types:
- **Partition Key (Simple Primary Key)**: Composed of one attribute. DynamoDB uses the partition key's value as input to an internal hash function to determine the partition (physical storage) where the item is stored.
- **Partition Key and Sort Key (Composite Primary Key)**: Composed of two attributes. All items with the same partition key are stored together and kept in sorted order by the sort key value.

## 3. Secondary Indexes
Secondary indexes allow you to query data using an alternate key.
- **Global Secondary Index (GSI)**: An index with a partition key and an optional sort key that can be different from those on the table. GSIs allow querying across all partition keys in the table.
- **Local Secondary Index (LSI)**: An index that has the same partition key as the table, but a different sort key.

## 4. Partitions and Data Distribution
DynamoDB stores data in partitions. A partition is an allocation of storage for a table, backed by solid-state drives (SSDs) and automatically replicated across multiple Availability Zones.
- **Automatic Scaling**: DynamoDB automatically allocates additional partitions as throughput requirements increase or storage fills up.
- **Partition Discovery**: Partition management is handled entirely by DynamoDB; applications never manage partitions directly.

## 5. Implementation Workflow (AWS SDK)
When interacting with DynamoDB directly:
```typescript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

// Put Item
await docClient.send(new PutCommand({
  TableName: "MyTable",
  Item: {
    PartitionKey: "User123",
    SortKey: "Profile",
    Name: "Jane Doe",
    Active: true
  }
}));

// Get Item
const { Item } = await docClient.send(new GetCommand({
  TableName: "MyTable",
  Key: {
    PartitionKey: "User123",
    SortKey: "Profile"
  }
}));
```

## 6. Safe Practice Protocol
- **Partition Key Design**: Choose partition keys with high cardinality to distribute data evenly across partitions.
- **Index Quotas**: Tables support up to 20 GSIs (default) and 5 LSIs.
- **Region Specificity**: Verify service availability in `us-east-1` (the primary region for this project).
