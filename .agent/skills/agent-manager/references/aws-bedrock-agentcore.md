# Amazon Bedrock AgentCore: Advanced Agentic Technical Reference

This document serves as the authoritative "Documents-Only" source for architecting and operating advanced AI agents using Amazon Bedrock AgentCore.

## 1. Core Platform Concepts
Amazon Bedrock AgentCore is an infrastructure-agnostic agentic platform for building and operating secure AI agents at scale.
- **Any-Framework**: Works with CrewAI, LangGraph, LlamaIndex, Strands Agents, etc.
- **Any-Model**: Supports foundation models from Bedrock, OpenAI, Gemini, etc.
- **Session Isolation**: Each agent session runs in a dedicated microVM, providing absolute compute, memory, and filesystem separation.

## 2. Platform Units (Modular Services)
### RuntimeUnit (Secure Infrastructure)
- Serverless environment with fast cold starts.
- Extended runtime for asynchronous execution (Long-running tasks).
- True session isolation prevents cross-user data leakage.

### GatewayUnit (Tool Connectivity & MCP)
- Converts APIs, Lambda functions, and OpenAPI specs into **Model Context Protocol (MCP)** compatible tools.
- Enables instant tool access for any MCP-compatible agent without code rewrites.

### MemoryUnit (Context & Learning)
- **Short-term Memory**: For multi-turn conversational context.
- **Long-term Memory**: Persistent across sessions; enables agents to learn from past experiences.
- Compatible with LangGraph, LangChain, and LlamaIndex stores.

### GovernanceUnit (Identity & Policy)
- **Identity**: IAM-compatible agent authentication; works with Cognito, Okta, and Azure Entra ID.
- **Policy**: Natural language or **Cedar** policies to define tool access, allowed actions, and execution conditions.

## 3. Specialized Tools
- **Code Interpreter**: Isolated sandbox supporting Python, JavaScript, and TypeScript execution.
- **Browser Tool**: Managed cloud-based browser for web interaction, form filling, and information extraction.

## 4. Operational Excellence
- **Observability**: OpenTelemetry (OTEL) compatible tracing for inspecting execution paths and debugging bottlenecks.
- **Evaluations**: Data-driven assessment of agent task execution, reliability, and edge-case handling.

## 5. Implementation Pattern (Simplified Execution)
AgentCore is designed to be the "paved path" for production agents. Instead of managing individual microVMs or memory databases, you deploy agents directly to the AgentCore Runtime.

```typescript
// Conceptual AgentCore Runtime dispatch
const response = await agentCoreRuntime.invoke({
  agentId: "customer-support-agent",
  sessionId: "session-123",
  input: "Help me analyze this spreadsheet.",
  enableCodeInterpreter: true
});
```

## 6. Safe Practice Protocol
- **MicroVM Hardening**: Always rely on AgentCore microVM isolation for execution of untrusted code or tools.
- **Zero-Contamination**: Terminate sessions immediately after completion to trigger memory sanitization.
- **Natural Language Guardrails**: Use Policy to enforce business rules globally across all agent interactions.
- **Region Specificity**: All architectural recommendations are centered on `us-east-1`.
