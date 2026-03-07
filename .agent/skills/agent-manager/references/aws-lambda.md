# AWS Lambda: Serverless Technical Reference

This document serves as the authoritative "Documents-Only" source for architecting and implementing serverless functions using AWS Lambda.

## 1. Core Concepts
AWS Lambda is a serverless, event-driven compute service that lets you run code without provisioning or managing servers.
- **Functions**: The basic building block, containing your code and configuration.
- **Triggers**: Event sources (S3, SNS, API Gateway, etc.) that invoke your function via JSON payloads.
- **Execution Environment**: Packages the runtime, layers, and extensions. Reusable for multiple invocations to save initialization time.
- **Handler**: The entry point in your code that Lambda calls when the function is invoked.

## 2. Programming Models
### Standard Functions
- **Runtime**: Up to 15 minutes.
- **Stateless**: Do not rely on local state beyond a single invocation; store persistent state elsewhere (e.g., DynamoDB).
- **Concurrency**: Lambda scales by running additional instances as demand increases.

### Durable Functions (Preview)
- **Runtime**: Can run for up to one year.
- **Stateful**: Automatically persists state between steps.
- **Capabilities**: Checkpointing via `step()`, wait states via `wait()`, and automatic retries.

## 3. Key Features
- **Lambda Layers**: Optimize code reuse by sharing common components (SDKs, libraries) across functions.
- **Environment Variables**: Modify behavior without code changes.
- **SnapStart**: Reduces cold start times for Java runtimes by caching initialized execution environments.
- **Function URLs**: Built-in HTTP(S) endpoints for public-facing APIs.
- **Ephemeral Storage**: `/tmp` directory (transient cache) shared across multiple invocations in the same environment.
- **Versions & Aliases**: Safe testing and management of production traffic (blue/green deployments).

## 4. Security & Networking
- **Execution Role**: IAM role that grants the function permission to access other AWS services.
- **VPC Integration**: Connect functions to private resources within a VPC.
- **Resource Policies**: Manage which event sources are permitted to trigger the function.

## 5. Implementation Workflow (Node.js Example)
```javascript
export const handler = async (event, context) => {
  console.log("Event:", JSON.stringify(event, null, 2));
  
  // Reusable clients should be defined outside the handler
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Hello from Lambda!" }),
  };
};
```

## 6. Safe Practice Protocol
- **Idempotency**: Ensure functions can handle duplicate triggers without side effects.
- **Cold Start Mitigation**: Use SnapStart or Provisioned Concurrency for latency-sensitive apps.
- **Log Management**: All stdout/stderr is sent to **Amazon CloudWatch Logs**.
- **Region Specificity**: Verify availability in `us-east-1`.
