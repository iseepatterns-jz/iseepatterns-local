# Amazon RDS: Relational Database Technical Reference

This document serves as the authoritative "Documents-Only" source for architecting and managing relational databases using Amazon RDS.

## 1. Core Concepts
Amazon Relational Database Service (Amazon RDS) is a managed service that makes it easy to set up, operate, and scale a relational database in the cloud.
- **DB Instance**: An isolated database environment in the cloud.
- **DB Engine**: The relational database software (MySQL, PostgreSQL, Oracle, SQL Server, MariaDB, IBM Db2).
- **DB Instance Class**: Determines the computation and memory capacity (General Purpose, Memory Optimized, Compute Optimized, Burstable).
- **DB Storage**: EBS-backed storage (General Purpose SSD, Provisioned IOPS SSD).

## 2. High Availability & Scalability
- **Multi-AZ Deployment**: Amazon RDS automatically provisions and maintains a synchronous standby replica in a different Availability Zone (AZ). Provides data redundancy and failover support.
- **Multi-AZ DB Cluster**: One writer and two readers in three separate AZs. All three can serve read traffic.
- **Read Replicas**: Used for read-heavy workloads. Replicated asynchronously from the primary instance.

## 3. Database Engines
Amazon RDS supports:
- **Aurora**: MySQL and PostgreSQL-compatible relational database built for the cloud.
- **PostgreSQL**: Advanced open-source relational database.
- **MySQL**: The world's most popular open-source database.
- **MariaDB**: Developed by the original developers of MySQL.
- **Microsoft SQL Server**: Enterprise-level database management system.
- **Oracle Database**: Enterprise database with advanced features.
- **IBM Db2**: Enterprise-grade database for high-performance workloads.

## 4. Security & Networking
- **VPC Integration**: DB instances should reside in private subnets with no direct internet access.
- **Security Groups**: Virtual firewalls to control inbound and outbound traffic to the DB instance.
- **IAM Database Authentication**: Use IAM to manage access to your RDS DB instances (MySQL and PostgreSQL).
- **Encryption at Rest**: Use AWS KMS to encrypt your RDS instances and snapshots.

## 5. Maintenance & Backups
- **Automated Backups**: RDS automatically backups your DB instances during the backup window (retained up to 35 days).
- **DB Snapshots**: User-initiated backups stored in S3.
- **Parameter Groups**: Manage engine configuration settings.
- **Option Groups**: Manage additional features (like Oracle TDE or SQL Server TDE).

## 6. Implementation Workflow (AWS SDK)
```typescript
import { RDSClient, CreateDBInstanceCommand, DeleteDBInstanceCommand } from "@aws-sdk/client-rds";

const client = new RDSClient({ region: "us-east-1" });

// Create DB Instance
const createCommand = new CreateDBInstanceCommand({
  DBInstanceIdentifier: "my-db-instance",
  Engine: "postgres",
  DBInstanceClass: "db.t3.micro",
  AllocatedStorage: 20,
  MasterUsername: "admin",
  MasterUserPassword: "securepassword123",
  MultiAZ: true
});
await client.send(createCommand);

// Delete DB Instance
const deleteCommand = new DeleteDBInstanceCommand({
  DBInstanceIdentifier: "my-db-instance",
  SkipFinalSnapshot: true
});
await client.send(deleteCommand);
```

## 7. Safe Practice Protocol
- **Private Subnets**: Always deploy RDS in private subnets.
- **Multi-AZ for Production**: Use Multi-AZ for high availability in production environments.
- **Provisioned IOPS**: Use PIOPS for I/O intensive production workloads.
- **Region Specificity**: All architectural recommendations are centered on `us-east-1`.
