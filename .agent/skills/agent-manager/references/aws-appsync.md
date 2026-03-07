# Amazon AppSync: Data Orchestration & Real-time Technical Reference

This document serves as the authoritative "Documents-Only" source for architecting and operating data orchestration layers using Amazon AppSync.

## 1. Core Concepts
Amazon AppSync is a fully managed service that makes it easy to create and manage GraphQL and Pub/Sub APIs.
- **GraphQL APIs**: Orchestrate data from multiple sources (DynamoDB, Lambda, Aurora, OpenSearch, HTTP) into a single endpoint.
- **Real-time Subscriptions**: Built-in support for WebSockets to push updates to clients.
- **Offline Data Sync**: Seamlessly sync data to mobile and web apps when They reconnect.
- **AppSync Events**: Pure Pub/Sub WebSocket API for broadcasting messages without requiring GraphQL.

## 2. Resolvers and Logic
AppSync uses resolvers to map GraphQL fields to data sources.
- **APPSYNC_JS (Recommended)**: Modern JavaScript-based runtime for writing resolver logic. No cold starts, better IDE support, and familiar syntax compared to VTL.
- **VTL (Legacy)**: Apache Velocity Template Language. Use only for maintaining legacy APIs.
- **Pipeline Resolvers**: Chain multiple functions (JS or VTL) together to perform complex operations (e.g., Auth check -> Data fetch -> Audit log).

## 3. Advanced Orchestration
- **Merged APIs**: Federate multiple source AppSync APIs into a single, unified GraphQL schema. Ideal for microservices architectures where teams manage their own schemas.
- **Enhanced Filtering**: Define server-side filters for subscriptions to minimize client-side data processing and network usage.

## 4. Implementation Workflow (APPSYNC_JS Resolver)
```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
    const { id } = ctx.arguments;
    return {
        operation: 'GetItem',
        key: util.dynamodb.toMapValues({ id }),
    };
}

export function response(ctx) {
    if (ctx.error) {
        util.error(ctx.error.message, ctx.error.type);
    }
    return ctx.result;
}
```

## 5. Security & Governance
- **Multi-Auth Support**: Combine multiple authorization modes (API_KEY, AWS_IAM, AMAZON_COGNITO_USER_POOLS, OPENID_CONNECT, AWS_LAMBDA) for different parts of the schema.
- **IAM Database Authentication**: Use IAM roles to securely access data sources like DynamoDB and Aurora without managing credentials.
- **WAF Integration**: Protect APIs against common web exploits and bots using AWS WAF.

## 6. Safe Practice Protocol
- **JS-First**: Always favor **APPSYNC_JS** for new resolvers to ensure maintainability and developer productivity.
- **Merged over Custom Federation**: Use **AppSync Merged APIs** for schema federation before considering custom gateway solutions.
- **Subscription Filtering**: Implement server-side filtering for real-time data to optimize mobile battery life and data usage.
- **Events for Pub/Sub**: Use **AppSync Events** if the primary requirement is pure messaging/notifications without a complex data graph.
- **Region Specificity**: All architectural recommendations are centered on `us-east-1`.
