# Amazon MemoryDB for Redis: Durable In-Memory Technical Reference

This document serves as the authoritative "Documents-Only" source for architecting and operating durable in-memory data stores using Amazon MemoryDB for Redis.

## 1. Core Concepts
Amazon MemoryDB for Redis is a Redis-compatible, durable, in-memory database service that delivers ultra-fast performance.
- **Primary Database**: Unlike ElastiCache (which is a cache), MemoryDB is designed to be the primary data store.
- **Microsecond Reads**: Direct memory access provides sub-millisecond read performance.
- **Durable Writes**: All writes are durably stored in a **Multi-AZ Transaction Log** before being acknowledged to the client.

## 2. MemoryDB vs. ElastiCache
| Feature | Amazon MemoryDB | Amazon ElastiCache (Redis) |
| :--- | :--- | :--- |
| **Primary Role** | Primary Database | Caching Layer |
| **Durability** | Multi-AZ Transaction Log (Strong) | Optional Snapshots/Append-only (Weak/Moderate) |
| **Read Latency** | Microseconds | Microseconds |
| **Write Latency** | Milliseconds (Durable Sync) | Microseconds (Asynchronous) |
| **Redis Compatibility** | 100% (Supports Valkey too) | 100% |

## 3. High Availability & Recovery
- **Multi-AZ Architecture**: Data is stored across multiple Availability Zones for both the cluster nodes and the transaction log.
- **Automatic Failover**: Promotes a replica to primary if the original primary fails.
- **Transaction Log Recovery**: New or replaced nodes automatically sync state from the durable transaction log.

## 4. Implementation Workflow (Redis Client)
Standard Redis clients (e.g., `ioredis`, `redis-py`) work with MemoryDB. Ensure the client supports **Redis Cluster Mode**.

```typescript
import Redis from "ioredis";

// MemoryDB requires Cluster Mode
const cluster = new Redis.Cluster([
  {
    host: "my-memorydb-cluster-endpoint",
    port: 6379,
  },
]);

async function saveData() {
  await cluster.set("session:user:123", JSON.stringify({ name: "Jane Doe", role: "Admin" }));
  const data = await cluster.get("session:user:123");
  console.log("Durable Session Data:", data);
}
```

## 5. Security & Governance
- **Access Control Lists (ACLs)**: Use Redis ACLs for granular user permissions.
- **Encryption**: Encryption at-rest (KMS) and in-transit (TLS) are enabled by default and cannot be disabled.
- **VPC Isolation**: Clusters must reside within a VPC.

## 6. Safe Practice Protocol
- **Durability vs. Latency**: Use MemoryDB when the primary requirement is durability + speed. If only speed is needed and data loss is acceptable, use ElastiCache.
- **Cluster Mode**: Always use a Redis client that supports Cluster Mode, as MemoryDB is strictly a clustered architecture.
- **Sizing**: Monitor the `FreeableMemory` metric; unlike standard Redis, MemoryDB handles snapshots and recovery from the transaction log, reducing memory overhead for these operations.
- **Region Specificity**: All architectural recommendations are centered on `us-east-1`.
