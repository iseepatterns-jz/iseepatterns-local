# AWS CDK v2: Infrastructure as Code Technical Reference

This document serves as the authoritative "Documents-Only" source for architecting and provisioning AWS infrastructure using the AWS Cloud Development Kit (CDK) version 2.

## 1. Core Concepts
The AWS Cloud Development Kit (AWS CDK) is an open-source software development framework to define your cloud application resources using familiar programming languages.
- **Constructs**: The building blocks of CDK apps. A construct represents a "cloud component" and encapsulates everything CloudFormation needs to create the component.
- **Stacks**: The unit of deployment. All AWS resources defined within a stack are provisioned as a single unit (mapping to a CloudFormation Stack).
- **Apps**: The container for one or more stacks.

## 2. Construct Levels (Abstraction Model)
| Level | Name | Description | prefix/Example |
| :--- | :--- | :--- | :--- |
| **L1** | Cfn Resources | Direct 1:1 mapping to CloudFormation resource types. No abstraction. | `CfnBucket`, `CfnInstance` |
| **L2** | Curated Constructs | AWS-curated best practices. Includes sensible defaults and helper methods. | `s3.Bucket`, `ec2.Instance` |
| **L3** | Patterns | Opinionated, high-level abstractions that bundle multiple resources for a specific use case. | `aws-ecs-patterns` |

## 3. The CDK Lifecycle
1. **Synthesis**: `cdk synth` translates your code into a CloudFormation template (the "Cloud Assembly").
2. **Bootstrapping**: `cdk bootstrap` prepares the environment (Account/Region) with a `CDKToolkit` stack (contains S3 bucket for assets, ECR repo, and IAM roles).
3. **Deployment**: `cdk deploy` submits the template to CloudFormation and uploads assets to the bootstrap resources.

## 4. Implementation Workflow (TypeScript)
```typescript
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';

export class MyProjectStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // L2 Construct: Simple Bucket with best practices (removal policy, encryption)
    new s3.Bucket(this, 'MyOptimizedBucket', {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });
  }
}
```

## 5. Safe Practice Protocol
- **L2-First**: Always favor **L2 Constructs** for regular infrastructure to leverage AWS-vetted defaults and reduce boilerplate.
- **Removal Policies**: Explicitly set `removalPolicy` (Destroy vs. Retain) to avoid orphaned resources or accidental data loss.
- **Environment Pinning**: Always specify `env: { account: '...', region: '...' }` in your App entry point to prevent "environment-agnostic" stacks from failing during complex syntheses.
- **Context & Tags**: Use `cdk.Tags` to ensure all provisioned resources are compliant with organizational tagging policies.
- **Region Specificity**: All architectural recommendations are centered on `us-east-1`.
