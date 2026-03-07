# AWS SAM: Serverless Application Model Technical Reference

This document serves as the authoritative "Documents-Only" source for architecting and developing serverless applications using the AWS Serverless Application Model (SAM).

## 1. Core Concepts
AWS SAM is an open-source framework that extends AWS CloudFormation to provide a simplified shorthand syntax for defining serverless resources.
- **Simplified Syntax**: Define Lambda functions, APIs, and databases in a fraction of the code required by pure CloudFormation.
- **Local Development**: The SAM CLI leverages Docker to simulate Lambda and API Gateway environments locally for rapid testing and debugging.

## 2. Template Anatomy
- **Transform**: MUST include `Transform: AWS::Serverless-2016-10-31` to identify the template.
- **Globals**: Unique to SAM. Use this section to define shared properties (e.g., `Runtime`, `Timeout`, `MemorySize`, `Environment`) that all resources of a certain type inherit.
- **Resources**: Where you define `AWS::Serverless::Function`, `AWS::Serverless::Api`, `AWS::Serverless::SimpleTable`, etc.

## 3. Core Resource Types
| Resource | Description |
| :--- | :--- |
| **AWS::Serverless::Function** | Defines a Lambda function, its IAM role, execution settings, and event triggers (API, S3, SQS, etc.). |
| **AWS::Serverless::Api** | Defines an Amazon API Gateway REST API. Integrates easily with SAM Functions via event triggers. |
| **AWS::Serverless::HttpApi** | Defines a lightweight, low-latency API Gateway HTTP API. |
| **AWS::Serverless::SimpleTable** | Provisions a DynamoDB table with a single attribute primary key (ID). Use for basic storage needs. |

## 4. Implementation Workflow (SAM CLI)
```bash
# 1. Initialize project from template
sam init

# 2. Build local artifacts
sam build

# 3. Local testing
sam local invoke "MyFunction" -e event.json
sam local start-api

# 4. Accelerated Development (Sync to Cloud)
sam sync --watch --stack-name my-dev-stack

# 5. Production Deployment
sam deploy --guided
```

## 5. Accelerated Development: SAM Sync
- **`sam sync --watch`**: Automatically monitors local file changes.
- **Code-Only Update**: If only code changes (no template/infra changes), SAM uses service APIs to bypass CloudFormation, updating Lambda code in seconds.
- **Infra Update**: If the template changes, SAM performs a standard CloudFormation update.

## 6. Safe Practice Protocol
- **Globals-First**: Use the `Globals` section for all standard configuration to ensure environment consistency.
- **Accelerated Dev**: Use `sam sync` for developer sandboxes only; never use it for production pipelines.
- **Specific Runtimes**: Always specify exact runtimes (e.g., `nodejs18.x`) rather than defaults to prevent breaking updates.
- **Policy Templates**: Use SAM's built-in policy templates (e.g., `S3ReadPolicy`, `DynamoDBCrudPolicy`) to grant granular permissions easily while following the principle of least privilege.
- **Region Specificity**: All architectural recommendations are centered on `us-east-1`.
