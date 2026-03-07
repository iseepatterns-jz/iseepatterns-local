# Amazon Comprehend: Natural Language Processing (NLP) Technical Reference

This document serves as the authoritative "Documents-Only" source for architecting and operating NLP layers using Amazon Comprehend.

## 1. Core Concepts
Amazon Comprehend is a managed NLP service that uses machine learning to find insights and relationships in text.
- **Entities**: Identifies people, places, dates, and organizations.
- **Key Phrases**: Identifies main points and descriptors.
- **Sentiment**: Detects positive, negative, neutral, or mixed sentiment.
- **PII Detection**: Identifies and redacts Personally Identifiable Information (Names, SSNs, credit cards).
- **Language Detection**: Automatically identifies the language of a document.

## 2. Custom Models (Build your own NLP)
- **Custom Classification**: Categorize entire documents into predefined labels (e.g., classifying support tickets by department).
- **Custom Entity Recognition**: Identify specific terms unique to your business or industry (e.g., product codes, proprietary part names).

## 3. Comprehend Medical (Healthcare NLP)
A HIPAA-eligible service for extracting health data from medical text (prescriptions, procedures, diagnoses).
- **Ontology Linking**: Automatically links detected entities to standard medical knowledge bases (RxNorm, ICD-10-CM).

## 4. Processing Modes
- **Real-time (Synchronous)**: For immediate analysis of single documents or small batches (up to 25 documents). `Detect*` and `BatchDetect*` APIs.
- **Asynchronous (Batch)**: For large document sets stored in S3. High-throughput processing with results stored in S3. `Start*Job` APIs.

## 5. Implementation Workflow (AWS SDK for JavaScript)
```typescript
import { ComprehendClient, DetectSentimentCommand } from "@aws-sdk/client-comprehend";

const client = new ComprehendClient({ region: "us-east-1" });

const command = new DetectSentimentCommand({
  Text: "Amazon Comprehend is a powerful tool for analyzing text data.",
  LanguageCode: "en"
});

const response = await client.send(command);
console.log("Sentiment:", response.Sentiment); // e.g., "POSITIVE"
```

## 6. Safe Practice Protocol
- **PII Compliance**: Always use PII detection to find and redact sensitive data before storing or sharing analysis results.
- **Batching Strategy**: Use Asynchronous jobs for any workload exceeding 25 documents to ensure efficiency and high throughput.
- **Medical Isolation**: Use **Comprehend Medical** specifically for healthcare data to ensure HIPAA compliance and access to medical ontologies.
- **Region Specificity**: All architectural recommendations are centered on `us-east-1`.
