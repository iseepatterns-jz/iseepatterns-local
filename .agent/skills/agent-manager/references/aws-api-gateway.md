# Amazon API Gateway: API Management Technical Reference

This document serves as the authoritative "Documents-Only" source for architecting and managing APIs using Amazon API Gateway.

## 1. Core Concepts
Amazon API Gateway is a fully managed service that makes it easy for developers to create, publish, maintain, monitor, and secure APIs at any scale.
- **REST API**: Feature-rich, supports API keys, per-client throttling, and request/response transformation.
- **HTTP API**: Low-latency, cost-effective, optimized for serverless workloads. Best for simple proxying to Lambda or HTTP backends.
- **WebSocket API**: Stateful, two-way communication between client and server.

## 2. API Types Comparison
| Feature | HTTP API | REST API |
| :--- | :--- | :--- |
| **Latency** | Sub-millisecond (Fastest) | Millisecond |
| **Cost** | Up to 71% cheaper than REST | Standard |
| **Authorization** | JWT, Lambda, IAM, Cognito | Lambda, IAM, Cognito |
| **Throttling** | Account-level and Stage-level | Per-client (Usage Plans) |
| **Features** | CORS natively supported | Request transformation, Caching, WAF |

## 3. Security & Authorization
- **Lambda Authorizers**: Custom logic using a Lambda function to control access (Token-based or Request-based).
- **Cognito Authorizers**: Seamless integration with Amazon Cognito User Pools.
- **IAM Authorization**: Uses AWS SigV4 to authenticate requests from AWS services or IAM users.
- **API Keys & Usage Plans**: (REST API Only) Track and limit API usage on a per-customer basis.
- **WAF Integration**: Protect APIs from common web exploits (SQLi, XSS).

## 4. Connectivity & Integration
- **Proxy Integration**: Pass the entire request directly to a backend (Lambda, HTTP, or AWS Service).
- **VPC Link**: Securely connect to resources within a private VPC (ALB, NLB) without exposure to the internet.
- **Custom Domains**: Map APIs to custom domains with AWS Certificate Manager (ACM) integration.

## 5. Implementation Workflow (AWS SDK for JavaScript)
```typescript
import { APIGatewayClient, CreateRestApiCommand } from "@aws-sdk/client-api-gateway";

const client = new APIGatewayClient({ region: "us-east-1" });

const command = new CreateRestApiCommand({
  Name: "MyProductionAPI",
  Description: "An API for production workloads.",
  EndpointConfiguration: { Types: ["REGIONAL"] }
});

const response = await client.send(command);
console.log("API Created:", response.Id);
```

## 6. Safe Practice Protocol
- **Performance Selection**: Default to **HTTP APIs** for serverless proxies unless usage plans or WAF are required.
- **Throttling**: Always configure stage-level and account-level throttling to prevent cascading failures.
- **Encryption**: Enforce HTTPS and consider Mutual TLS (mTLS) for high-security internal APIs.
- **Region Specificity**: All architectural recommendations are centered on `us-east-1`.
