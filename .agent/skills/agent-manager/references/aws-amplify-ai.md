# AWS Amplify Gen 2: AI kit Technical Reference

This document serves as the authoritative "Documents-Only" source for implementing generative AI features using the Amplify AI kit.

## 1. Concepts
The Amplify AI kit provides high-level abstractions for connecting your backend to Amazon Bedrock:
- **AI Conversation**: For implementing conversational chat patterns.
- **AI Generation**: For leveraging AI-driven data generation in your application.
- **Infrastructure**: Provisions AppSync, Lambda orchestrators, and DynamoDB for history storage.

## 2. Conversation (Chat) Implementation
### Data Schema
Define a conversation route in `amplify/data/resource.ts`:
```typescript
const schema = a.schema({
  chat: a.conversation({
    aiModel: a.ai.model('Claude 3.5 Sonnet'),
    systemPrompt: 'You are a helpful assistant for this specific app.',
  })
  .authorization((allow) => allow.owner()),
});
```

### Frontend Integration
Use the `AIConversation` component from `@aws-amplify/ui-react-ai`:
```tsx
import { AIConversation } from '@aws-amplify/ui-react-ai';
import { generateClient } from 'aws-amplify/api';

const client = generateClient<Schema>();

function App() {
  return (
    <AIConversation
      client={client}
      routeName="chat"
    />
  );
}
```

## 3. Data Generation (Typed Objects)
Use `a.generation()` for structured data output:
```typescript
const schema = a.schema({
  generateSummary: a.generation({
    aiModel: a.ai.model('Claude 3.5 Haiku'),
    systemPrompt: 'Summarize the input concisely.',
  })
  .arguments({ input: a.string() })
  .returns(a.string())
  .authorization((allow) => allow.authenticated()),
});
```

## 4. Tool Use (Agentic Actions)
Conversations can invoke AppSync queries as "tools":
- Define a query in your schema.
- Pass the tool to the conversation route definition.
- The Lambda orchestrator will automatically invoke the tool when the LLM requests it.

## 5. Security & Limitations
- **Region**: Bedrock must be available in the project region (`us-east-1`).
- **Auth**: Most AI features require `authenticated` or `owner` authorization.
- **Models**: Standard models include `Claude 3.5 Sonnet`, `Claude 3.5 Haiku`, etc.
