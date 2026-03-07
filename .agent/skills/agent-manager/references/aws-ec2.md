# Amazon EC2: Elastic Compute Technical Reference

This document serves as the authoritative "Documents-Only" source for architecting and managing virtual servers using Amazon EC2.

## 1. Core Concepts
Amazon Elastic Compute Cloud (Amazon EC2) provides scalable computing capacity in the AWS Cloud.
- **Instances**: Virtual computing environments (servers).
- **Amazon Machine Image (AMI)**: Preconfigured templates containing the OS and application software required to boot an instance.
- **Regions & Availability Zones**: Physical locations where resources are hosted to provide high availability.
- **Instance Store & EBS**: EBS provides persistent storage, while Instance Store provides temporary, high-speed storage.

## 2. Instance Types (Categories)
Choosing the right instance type entails balancing CPU, memory, storage, and networking capacity.
- **General Purpose (T, M)**: Balanced resources for diverse workloads (web servers, small databases).
- **Compute Optimized (C)**: High-performance processors for batch processing, media transcoding, and high-performance web servers.
- **Memory Optimized (R, X, High Memory)**: Fast performance for workloads that process large data sets in memory (databases, real-time analytics).
- **Storage Optimized (I, D, H)**: Designed for workloads that require high read and write access to very large data sets on local storage (NoSQL, data warehousing).
- **Accelerated Computing (P, G, F)**: Use hardware accelerators (GPUs, FPGAs) for co-processing.

## 3. AMI Mastery
An AMI is required to launch an instance and is specific to a Region, OS, and Architecture (x86_64 vs. arm64/Graviton).
- **AMI Lifecycle**: Find (Marketplace/Community), Launch, Customize, Create (Capture new image), Copy (Transfer to other Regions), and Share.
- **Block Device Mapping**: Specifies which volumes to attach to the instance upon launch.

## 4. Security & Access
- **Security Groups**: State-based virtual firewalls that control inbound and outbound traffic.
- **Key Pairs**: Secure login using public/private key cryptography (AWS stores the public key, you store the private key).
- **IAM Roles**: Grant instances permissions to access other AWS services securely without managing long-term credentials.

## 5. Pricing Models
- **On-Demand**: Pay by the second for used capacity.
- **Savings Plans & Reserved Instances**: 1 or 3-year commitment for significant discounts (up to 72%).
- **Spot Instances**: Use spare EC2 capacity at up to 90% discount; ideal for fault-tolerant workloads.
- **Dedicated Hosts**: A physical EC2 server dedicated for your use (useful for licensing compliance).

## 6. Implementation Workflow (AWS SDK)
```typescript
import { EC2Client, RunInstancesCommand, TerminateInstancesCommand } from "@aws-sdk/client-ec2";

const client = new EC2Client({ region: "us-east-1" });

// Launch Instance
const runCommand = new RunInstancesCommand({
  ImageId: "ami-xxxxxxxx", 
  InstanceType: "t3.micro",
  MinCount: 1,
  MaxCount: 1,
  KeyName: "my-key-pair"
});
const response = await client.send(runCommand);

// Terminate Instance
const terminateCommand = new TerminateInstancesCommand({
  InstanceIds: ["i-xxxxxxxxxxxxxxxxx"]
});
await client.send(terminateCommand);
```

## 7. Safe Practice Protocol
- **PII & PCI Compliance**: EC2 is validated for PCI DSS Level 1.
- **Stopping vs. Terminating**: Stopping keeps the EBS volume intact (billing for storage only), Terminating deletes the instance and typically its root volumes.
- **Region Specificity**: All architectural recommendations are centered on `us-east-1`.
