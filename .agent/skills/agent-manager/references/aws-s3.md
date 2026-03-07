# Amazon S3: Object Storage Technical Reference

This document serves as the authoritative "Documents-Only" source for architecting and managing object storage using Amazon S3.

## 1. Core Concepts
Amazon Simple Storage Service (Amazon S3) is an object storage service that offers industry-leading scalability, data availability, security, and performance.
- **Buckets**: Containers for objects. Every object is contained in a bucket.
- **Objects**: The fundamental entities stored in S3. Consist of object data and metadata (name-value pairs).
- **Keys**: Unique identifier for an object within a bucket. S3 can be thought of as a mapping between "bucket + key + version" and the object.
- **Regions**: Physical locations where S3 stores the buckets that you create.

## 2. Bucket Types
### General Purpose Buckets
- Recommended for most use cases.
- Support all storage classes (Standard, Intelligent-Tiering, etc.).
- Redundantly store objects across multiple Availability Zones.

### Directory Buckets
- Recommended for low-latency and data-residency use cases.
- Organize objects hierarchically (directories/prefixes).
- Support **S3 Express One Zone** for single-digit millisecond latencies.

## 3. Storage Classes
- **S3 Standard**: High durability, availability, and performance object storage for frequently accessed data.
- **S3 Intelligent-Tiering**: Automatically moves data to the most cost-effective tier.
- **S3 Standard-IA & One Zone-IA**: For data that is accessed less frequently, but requires rapid access when needed.
- **S3 Glacier (Instant Retrieval, Flexible Retrieval, Deep Archive)**: Low-cost storage for data archiving.
- **S3 Express One Zone**: High-performance, single-AZ storage class.

## 4. Consistency Model
Amazon S3 provides **strong read-after-write consistency** for PUT and DELETE requests of objects in all Regions.
- Applies to writes to new objects and overwrites of existing objects.
- LIST operations and metadata (HEAD) are also strongly consistent.
- **Note**: Bucket configurations follow an eventual consistency model.

## 5. Security & Access Management
- **Bucket Policies**: Resource-based IAM policies (JSON) used to grant permissions at the bucket or prefix level. Limited to 20 KB.
- **IAM Policies**: User-based policies to manage access to S3 resources.
- **S3 Access Points**: Named network endpoints with dedicated access policies to simplify data access at scale.
- **Block Public Access**: A control that prevents public access to buckets and objects.
- **S3 Versioning**: Keep multiple variants of an object in the same bucket to protect against unintended deletes or overwrites.

## 6. Implementation Workflow (AWS SDK)
```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

const client = new S3Client({ region: "us-east-1" });

// Upload Object
await client.send(new PutObjectCommand({
  Bucket: "my-bucket",
  Key: "documents/report.pdf",
  Body: Buffer.from("data"),
  ContentType: "application/pdf"
}));

// Download Object
const { Body } = await client.send(new GetObjectCommand({
  Bucket: "my-bucket",
  Key: "documents/report.pdf"
}));
```

## 7. Safe Practice Protocol
- **Versioning**: Enable versioning on critical buckets for recovery.
- **Lifecycle Policies**: Automate object transitions to lower-cost storage classes.
- **Prefix Design**: Use prefixes to organize data and manage permissions effectively.
- **Region Specificity**: All architectural recommendations are centered on `us-east-1`.
