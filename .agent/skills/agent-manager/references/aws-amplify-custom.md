# AWS Amplify Gen 2: Custom AWS Services & CDK Extensibility

This document serves as the authoritative "Documents-Only" source for extending Amplify with any AWS service using the CDK.

## 1. Custom resources
To add resources not natively supported by Amplify, create a new CloudFormation stack in `amplify/backend.ts` using `backend.createStack()`:

```typescript
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import * as sqs from 'aws-cdk-lib/aws-sqs';

const backend = defineBackend({
  auth,
  data,
});

// Create a new CloudFormation stack
const customStack = backend.createStack('MyCustomResources');

// Add L2 constructs to the stack
new sqs.Queue(customStack, 'MyCustomQueue', {
  fifo: true,
});
```

## 2. Overriding resources
For deep customization of existing Amplify resources, use the `cfnResources` property to access L1 constructs:

```typescript
// Accessing L1 UserPool
const { cfnUserPool } = backend.auth.resources.cfnResources;

// Override properties directly
cfnUserPool.policies = {
  passwordPolicy: {
    minimumLength: 12,
    requireNumbers: true,
  },
};
```

## 3. Granting Permissions
To permit resources to interact (e.g., a Function calling Cognito), use L2 `grant` methods:

```typescript
const userPool = backend.auth.resources.userPool;
const lambdaFunction = backend.myFunction.resources.lambda;

// Grant scoped permission
userPool.grant(lambdaFunction, 'cognito:AdminListUserAuthEvents');

// Pass resource IDs via environment variables
backend.myFunction.addEnvironment('USER_POOL_ID', userPool.userPoolId);
```

## 4. Key Patterns
- **L2 Constructs**: Preferred for high-level interactions (`backend.auth.resources.userPool`).
- **L1 Constructs**: Used for raw CloudFormation overrides (`cfnResources.cfnUserPool`).
- **`backend.createStack()`**: Essential for grouping external resources without cluttering the main stacks.

## 5. Safe Practice Protocol
- Always verify if an Amplify-native way exists before using custom CDK code.
- Ensure custom resource names are unique within the stack.
- Document all environment variables passed to functions via `addEnvironment`.
