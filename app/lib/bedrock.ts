import {
    BedrockRuntimeClient,
    InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

// ── Bedrock Client ──
const client = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || "us-east-1",
});

const MODEL_ID = process.env.BEDROCK_MODEL_ID || "us.anthropic.claude-3-5-sonnet-20241022-v2:0";

interface BedrockMessage {
    role: "user" | "assistant";
    content: string;
}

/**
 * Call Claude via AWS Bedrock.
 */
export async function callBedrock(
    systemPrompt: string,
    messages: BedrockMessage[],
    maxTokens = 2048
): Promise<string> {
    const body = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: messages.map(m => ({
            role: m.role,
            content: [{ type: "text", text: m.content }],
        })),
    };

    const command = new InvokeModelCommand({
        modelId: MODEL_ID,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(body),
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    // Extract text from content blocks
    const text = responseBody.content
        ?.filter((c: { type: string }) => c.type === "text")
        .map((c: { text: string }) => c.text)
        .join("\n") || "";

    return text;
}

/**
 * Analyze evidence relevance to a specific claim.
 */
export async function analyzeEvidence(
    evidenceBody: string,
    claimTitle: string,
    claimDescription: string,
    legalElements: string[]
): Promise<string> {
    const system = `You are a forensic evidence analyst assisting with a legal case investigation.
Your role is to analyze a piece of evidence and explain how it relates to a specific legal claim.
Be specific, cite exact quotes from the evidence, and evaluate which legal elements are supported.
Be objective and note both supporting and potentially contradicting evidence.
Format your analysis with clear sections.`;

    const userMessage = `## Claim: ${claimTitle}
${claimDescription}

### Legal Elements to Evaluate:
${legalElements.map((e, i) => `${i + 1}. ${e}`).join("\n")}

## Evidence to Analyze:
---
${evidenceBody.slice(0, 8000)}
---

Please analyze this evidence's relevance to the claim above. For each legal element, indicate whether this evidence supports it (✅), is neutral (➖), or contradicts it (❌).`;

    return callBedrock(system, [{ role: "user", content: userMessage }]);
}

/**
 * Generate a case summary for a claim based on all linked evidence.
 */
export async function summarizeClaim(
    claimTitle: string,
    claimDescription: string,
    evidenceSummaries: { type: string; title: string; body: string }[]
): Promise<string> {
    const system = `You are a forensic analyst preparing a case summary for an attorney.
Synthesize all provided evidence into a coherent narrative that supports the legal claim.
Include key dates, actors, and specific actions documented in the evidence.
Structure your summary for court readability.`;

    const evidenceText = evidenceSummaries
        .map((e, i) => `### Evidence ${i + 1} (${e.type}): ${e.title}\n${e.body.slice(0, 3000)}`)
        .join("\n\n");

    const userMessage = `## Claim: ${claimTitle}
${claimDescription}

## Linked Evidence (${evidenceSummaries.length} items):

${evidenceText}

Please synthesize a comprehensive case summary for this claim based on the evidence above.`;

    return callBedrock(system, [{ role: "user", content: userMessage }], 4096);
}
