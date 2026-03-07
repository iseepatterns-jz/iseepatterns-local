# Amazon Bedrock: Foundation AI Technical Reference

This document serves as the authoritative "Documents-Only" source for directly interacting with Amazon Bedrock primitives.

## 1. Foundation Models (FMs)
Amazon Bedrock supports high-performing foundation models from Amazon, Anthropic, AI21 Labs, Meta, Mistral AI, and Stability AI. 
- **Claude 3.5 Sonnet/Haiku**: Supported for reasoning, content generation, and chat tasks.
- **Titan**: Supported for summarization, text generation, and search.
- **Inference Parameters**: `temperature`, `topP`, and model-specific parameters (e.g., `max_tokens` for Anthropic, `maxTokenCount` for Titan).

## 2. Knowledge Bases (RAG)
For retrieving proprietary data to augment model responses:
- **Data Sources**: S3 buckets containing documents.
- **Vector Stores**: OpenSearch Serverless, Pinecone, or Aurora.
- **Usage**: Use the `Retrieve` and `RetrieveAndGenerate` APIs.

## 3. Amazon Bedrock Agents
Agents use FMs and knowledge bases to execute multi-step tasks:
- **Action Groups**: Defines the actions the agent can perform for the user.
- **Knowledge Base Association**: Provides the agent with a secure way to query private data sources.
- **Orchestration Strategy**: The agent uses the foundation model to reason through user requests and coordinate components.

## 4. Guardrails for Bedrock
Implement safety filters for:
- **Content Filtering**: Hate, insults, sexual, violence.
- **Denied Topics**: Specifically defined prohibited subjects.
- **PII Redaction**: Redact sensitive user data from responses.

## 5. Direct API Implementation (AWS SDK)
When using the SDK directly (outside of Amplify AI Kit):
```typescript
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({ region: "us-east-1" });

const command = new InvokeModelCommand({
  modelId: "anthropic.claude-3-5-sonnet-20240620-v1:0",
  contentType: "application/json",
  accept: "application/json",
  body: JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 1000,
    messages: [{ role: "user", content: "Hello Bedrock!" }],
  }),
});

const response = await client.send(command);
```

## 6. Safe Practice Protocol
- **Region Check**: Verify model availability in `us-east-1`.
- **Latency Optimization**: Use streaming (`InvokeModelWithResponseStream`) for long responses.
- **Amplify First**: Always check if the `Amplify AI Kit` (Amplify Data) can fulfill the requirement before using Bedrock SDK directly.
