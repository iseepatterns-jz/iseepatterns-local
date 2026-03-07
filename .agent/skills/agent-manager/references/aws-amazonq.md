# Amazon Q: Expert AI Productivity Technical Reference

This document serves as the authoritative "Documents-Only" source for implementing and utilizing Amazon Q services.

## 1. Amazon Q Developer
Amazon Q Developer is the primary assistant for software development and AWS operations.
- **IDE Capabilities**: Inline completion, code generation, whole-file chat, security vulnerability scanning, and code upgrades.
- **Supported IDEs**: Visual Studio Code, JetBrains IDEs, Visual Studio, Eclipse (Preview).
- **AWS Operations**: Natural language queries about infrastructure, billing, and resource configuration in the AWS Management Console and Console Mobile App.
- **Identity & Permissions**:
    - **IAM Identity**: Requires `AmazonQDeveloperAccess` managed policy for AWS account users.
    - **AWS Builder ID**: Allows free-tier access for individual developers without an AWS account.
- **Chat Platforms**: Supported in Microsoft Teams and Slack via the Amazon Q bot.
- **Pricing Tiers**: Available as a **Free tier** and **Amazon Q Developer Pro** subscription.

## 2. Amazon Q Business
Amazon Q Business is an enterprise-grade assistant for employee productivity and data retrieval.
- **Data Retrieval**: Uses a **Retriever** to select and retrieve relevant documents from an index during a conversation.
- **Plugins**: Allows Amazon Q to perform tasks across integrated 3rd-party applications (e.g., creating tickets).
- **Security**: Relies on **AWS IAM Identity Center** for user authentication and access control.
- **Retention**: Stores 30 days of conversation context.

## 3. Implementation Workflow: Amazon Q Business
To build an enterprise assistant:
1. **Enable IAM Identity Center**: Required for workforce authentication.
2. **Create Application**: Define the Q Business environment.
3. **Connect Data Source**: Integrate S3 or other supported enterprise connectors.
4. **Configure Retriever**: Set up the indexing and retrieval logic.
5. **Deploy Web Experience**: Use the built-in web portal or embed the UI.

## 4. Key Distinctions
- **Developer**: For *building* on AWS (focus: code, infra, architecture).
- **Business**: For *running* a business (focus: enterprise knowledge, internal data, plugins).

## 5. Safe Practice Protocol
- **PII Sensitivity**: Ensure Guardrails are enabled for Q Business to redact sensitive data.
- **Identity First**: Never attempt a Q Business setup without first verifying IAM Identity Center status.
- **Refer to Bedrock**: For custom RAG that requires more control than Q Business provides, use the direct Bedrock APIs (`RetrieveAndGenerate`).
