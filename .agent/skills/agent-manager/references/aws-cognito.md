# Amazon Cognito: Identity & Auth Technical Reference

This document serves as the authoritative "Documents-Only" source for architecting and managing identity and authentication using Amazon Cognito.

## 1. Core Concepts
Amazon Cognito provides authentication, authorization, and user management for your web and mobile apps.
- **User Pools**: User directories that provide sign-up and sign-in options for your app users.
- **Identity Pools (Federated Identities)**: Enable you to grant your users access to other AWS services.
- **Identity Providers (IdP)**: Support for social login (Google, Facebook, Amazon, Apple) and enterprise identity providers via SAML or OIDC.

## 2. User Pools vs. Identity Pools
| Feature | User Pools | Identity Pools |
| :--- | :--- | :--- |
| **Primary Purpose** | Authentication (Who are you?) | Authorization (What can you access?) |
| **Output** | JWT (ID, Access, Refresh tokens) | AWS Credentials (IAM temporary) |
| **User Store** | Built-in user directory | External (User Pools, OIDC, SAML, Developer) |
| **Access Control** | Groups and Attributes | IAM Roles and Policies |

## 3. Advanced Extensibility: Lambda Triggers
Cognito invokes Lambda functions at specific stages of the user lifecycle to execute custom logic.
- **Pre Sign-up**: Validate user attributes or auto-confirm users.
- **Post Confirmation**: Create user records in a database or send welcome emails.
- **Pre Authentication**: Implement custom logic before a user is allowed to sign in.
- **Post Authentication**: Log login events or adjust user profiles.
- **Pre Token Generation**: Customize claims in the ID and Access tokens (e.g., adding custom roles).
- **Custom Authentication**: Create your own challenge/response authentication flows.

## 4. Security Best Practices
- **Multi-Factor Authentication (MFA)**: Always enable MFA (SMS or TOTP) for production environments.
- **Advanced Security Features**: Use bot detection, compromised credential checks, and risk-based adaptive authentication.
- **Attribute Mapping**: Map external IdP attributes to Cognito user pool attributes for seamless integration.

## 5. Implementation Workflow (AWS SDK for JavaScript)
```typescript
import { CognitoIdentityProviderClient, SignUpCommand } from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({ region: "us-east-1" });

const command = new SignUpCommand({
  ClientId: "YOUR_CLIENT_ID",
  Username: "jane@example.com",
  Password: "Password123!",
  UserAttributes: [{ Name: "email", Value: "jane@example.com" }]
});

const response = await client.send(command);
console.log("User Signed Up:", response.UserSub);
```

## 6. Safe Practice Protocol
- **JWT Validation**: Always validate and verify Cognito JWTs in your backend services.
- **Role-Based Access Control (RBAC)**: Use Cognito Groups mapped to IAM roles in Identity Pools for granular access to AWS resources.
- **Token Expiration**: Configure appropriate ID, Access, and Refresh token expiration times based on security requirements.
- **Region Specificity**: All architectural recommendations are centered on `us-east-1`.
