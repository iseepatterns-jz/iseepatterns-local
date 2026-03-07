# Amazon Textract: Document Intelligence Technical Reference

This document serves as the authoritative "Documents-Only" source for architecting and operating document intelligence layers using Amazon Textract.

## 1. Core Concepts
Amazon Textract is a machine learning service that automatically extracts text, handwriting, and data from scanned documents.
- **Detect Text**: Basic OCR for identifying lines and words.
- **Analyze Document**: Advanced extraction for structured data (Forms, Tables, Queries, Signatures).
- **Analyze Expense**: Specialized processing for invoices and receipts.
- **Analyze ID**: Specialized processing for identity documents (Passports, Driver's Licenses).

## 2. Advanced Extraction Features
- **Forms**: Extracts key-value pairs (e.g., "Name: John Doe").
- **Tables**: Extracts tabular data while preserving row/column relationships.
- **Queries**: Uses natural language questions to pinpoint specific data (e.g., "What is the policy number?").
- **Signatures**: Detects the presence of signatures on documents.
- **Layout**: Identifies document elements like headers, footers, and paragraphs.

## 3. Processing Modes
- **Synchronous**: For immediate analysis of single-page documents (JPEG, PNG). Results returned instantly. `DetectDocumentText`, `AnalyzeDocument`.
- **Asynchronous**: Required for multi-page documents (PDF, TIFF) and high-volume batch processing. Follows a `Start` and `Get` pattern. `StartDocumentAnalysis`, `GetDocumentAnalysis`.

## 4. Implementation Workflow (AWS SDK for JavaScript)
```typescript
import { TextractClient, AnalyzeDocumentCommand } from "@aws-sdk/client-textract";

const client = new TextractClient({ region: "us-east-1" });

const command = new AnalyzeDocumentCommand({
  Document: { S3Object: { Bucket: "my-bucket", Name: "document.png" } },
  FeatureTypes: ["TABLES", "FORMS", "QUERIES"],
  QueriesConfig: { Queries: [{ Text: "What is the total amount?" }] }
});

const response = await client.send(command);
// Blocks represent detected text, tables, and query results
console.log("Blocks found:", response.Blocks?.length);
```

## 5. Safe Practice Protocol
- **Async for Multi-page**: Always use **Asynchronous** APIs for PDF and TIFF files, as synchronous APIs only support single-page images.
- **S3 for Large Docs**: Stores documents in **Amazon S3** for asynchronous processing to handle larger file sizes (up to 500MB).
- **Confidence Scoring**: Always check the `Confidence` score for extracted values and implement a human-in-the-loop (A2I) workflow for low-confidence results.
- **Specialized APIs**: Use `AnalyzeExpense` for invoices and `AnalyzeID` for passports/licenses for higher accuracy on those specific document types.
- **Region Specificity**: All architectural recommendations are centered on `us-east-1`.
