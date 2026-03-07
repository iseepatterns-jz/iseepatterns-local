# AWS SDK for JavaScript (v3): Modular Web/Node.js Technical Reference

This document serves as the authoritative "Documents-Only" source for architecting and developing with the AWS SDK for JavaScript v3.

## 1. Core Concepts (V3)
The SDK v3 is a modular rewrite designed for performance and efficiency through **tree-shaking**.

### A. Modular Architecture
Unlike v2, where the entire SDK was imported, v3 allows importing only the specific service clients and commands needed.
- **Benefit**: Significantly reduces bundle size for web applications and decreases cold start times for Lambda functions.

### B. Command Pattern
All service operations follow a uniform pattern: **Import Client** -> **Import Command** -> **Send Command**.
- **Pattern**: `client.send(new Command(input))`

## 2. Implementation Workflow (Node.js/TS)
```typescript
import { S3Client, ListObjectsV2Command, paginateListObjectsV2 } from "@aws-sdk/client-s3";

// 1. Initialize Client (Minimal configuration)
const s3Client = new S3Client({ region: "us-east-1" });

async function listItems() {
  // 2. The Command Pattern (send/Command)
  const command = new ListObjectsV2Command({ Bucket: "my-bucket" });
  const response = await s3Client.send(command);
  
  // 3. The Paginator Pattern (Automatic generator)
  const paginator = paginateListObjectsV2({ client: s3Client }, { Bucket: "my-bucket" });
  for await (const page of paginator) {
    console.log(page.Contents);
  }
}
```

## 3. Middleware Stack
V3 uses a "Lifecycle" middleware stack allowing developers to hook into 4 phases:
1. **Initialize**: Validate or set defaults.
2. **Serialize**: Convert input to HTTP request.
3. **Build**: Add HTTP headers (e.g., Auth, User-Agent).
4. **Finalize**: Retries, Timeout handling.

## 4. Advanced Features
- **Paginators**: Namespaced as `paginate<OperationName>`. Returns an **Async Generator** for easy iteration with `for await...of`.
- **Waiters**: Built-in functions (e.g., `waitUntilBucketExists`) that poll until conditions are met.
- **TypeScript First**: Full type safety for all inputs and responses, including documentation for complex types.

## 5. Safe Practice Protocol
- **Tree-Shaking First**: NEVER import from a base package if a submodule exists. Use specialized imports (e.g., `@aws-sdk/client-s3`) to minimize footprint.
- **Promise-Default**: V3 returns Promises by default; do NOT use callbacks.
- **Credential Providers**: Use `@aws-sdk/credential-providers` for robust, pluggable authentication (SSO, IAM Roles, Environment Variables).
- **Region Specificity**: All architectural recommendations are centered on `us-east-1`.
