# Amazon ECR: Container Registry Technical Reference

This document serves as the authoritative "Documents-Only" source for architecting and managing container images using Amazon Elastic Container Registry (ECR).

## 1. Core Concepts
Amazon ECR is a fully managed container registry that makes it easy for developers to store, manage, and deploy Docker container images, OCI images, and OCI-compatible artifacts.
- **Registry**: Your AWS account's container image storage area. Supports both Private and Public.
- **Repository**: A logical collection of images within a registry (e.g., `my-app`).
- **Image**: The container image itself, identified by a name and either a **Tag** or a **Digest**.

## 2. Image Scanning
Scan images for software vulnerabilities to improve your security posture.
- **Basic Scanning**: (AWS Native) Scans on push or manual trigger using a library of open-source CVEs.
- **Enhanced Scanning**: (Amazon Inspector Integration) Provides continuous scanning, automated re-scans, and deep integration with AWS security services.

## 3. Lifecycle Policies
Automate the cleanup of images to manage storage costs and declutter repositories.
- **Rules**: Define rules based on image age (e.g., delete after 30 days) or image count (e.g., keep only the last 10 images).
- **Scope**: Can be applied to all images or filtered by tag status (e.g., only untagged images).

## 4. Permissions & Cross-Account Access
ECR uses IAM for authentication and resource-based policies for authorization.
- **Registry Policy**: Grants permissions at the registry level (e.g., for cross-account replication). V2 is the expanded default.
- **Repository Policy**: Grants permissions to specific repositories (e.g., allowing an ECS task in Account B to pull an image from Account A).
- **Cross-Account Access**: Requires an IAM role in the consumer account and a Repository Policy in the producer account.

## 5. Implementation Workflow (AWS SDK for JavaScript)
```typescript
import { ECRClient, CreateRepositoryCommand, DescribeImagesCommand } from "@aws-sdk/client-ecr";

const client = new ECRClient({ region: "us-east-1" });

// Create a new private repository
const createRepo = new CreateRepositoryCommand({
  repositoryName: "my-production-app",
  imageScanningConfiguration: { scanOnPush: true },
  encryptionConfiguration: { encryptionType: "AES256" }
});

const response = await client.send(createRepo);
console.log("Repository Created:", response.repository.repositoryArn);
```

## 6. Safe Practice Protocol
- **Scan on Push**: Always enable image scanning for production repositories to identify vulnerabilities early.
- **Tag Immutability**: Use Immutable Tags for production releases to prevent different images from using the same tag (e.g., `latest`).
- **Lifecycle Management**: Implement lifecycle policies for all non-production and "latest" repositories to prevent unbounded storage growth.
- **Auth Tokens**: Note that `GetAuthorizationToken` returns a token valid for 12 hours; ensure build systems handle re-authentication.
- **Region Specificity**: All architectural recommendations are centered on `us-east-1`.
