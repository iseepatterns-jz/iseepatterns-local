/**
 * RAG Engine — TypeScript port of lawmodel1/rag_law_assistant.py
 * ────────────────────────────────────────────────────────────────
 * Hybrid search (BM25 + Vector) with Reciprocal Rank Fusion.
 * Uses Ollama for embeddings + LLM, ChromaDB for vector store.
 *
 * Designed to run server-side in Next.js API routes.
 */

import { Ollama } from "ollama";
import { ChromaClient, Collection } from "chromadb";
import fs from "fs";
import path from "path";
import {
    buildBM25Index,
    bm25Search,
    serializeBM25,
    deserializeBM25,
    type BM25Index,
    type BM25Document,
} from "./bm25";

// ─────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────

const LEGAL_DOCS_DIR = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data";
const BM25_INDEX_PATH = path.join(LEGAL_DOCS_DIR, "bm25_index_ts.json");
const CHROMA_COLLECTION = "legal_docs";

// Email & Messaging evidence hub (unified)
const EVIDENCE_HUB_DB_PATH = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/evidence_hub.db";

// Labels to exclude from RAG indexing
const EXCLUDED_LABELS = ["^DRAFT", "^SPAM", "^DELETED", "^TRASH"];

// Models
const EMBEDDING_MODEL = "nomic-embed-text";
const LLM_MODEL = "qwen2.5-32b-forensic";

// Chunking
const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 300;

// Retrieval
const VECTOR_TOP_K = 15;
const BM25_TOP_K = 15;
const RRF_K = 60;
const FINAL_TOP_N = 8;

// Default email limit for indexing (start small, scale up)
const DEFAULT_EMAIL_LIMIT = 5000;

// Category labels (matching Python version)
export const CATEGORY_LABELS: Record<string, string> = {
    "01_complaints_and_exhibits": "Complaints & Exhibits",
    "02_motions_and_filings": "Motions & Filings",
    "03_receiver_reports": "Receiver Reports",
    "04_orders": "Court Orders",
    "05_appearances": "Appearances",
    "06_service_notifications": "Service Notifications",
    "07_business_taxes": "Business Taxes",
    "08_court_transcripts": "Court Transcripts",
    general: "General / Uncategorized",
    // Email evidence categories
    email_inbox: "Email — Inbox",
    email_sent: "Email — Sent",
    email_archived: "Email — Archived",
    email_other: "Email — Other",
};

// System prompt for answer generation
const SYSTEM_PROMPT = `You are a legal research assistant specialized in business law and criminal law.

INSTRUCTIONS:
- Answer the question using ONLY the provided context documents.
- Cite specific documents by their source filename when referencing information.
- Distinguish clearly between business-law and criminal-law issues when both might apply.
- If the answer is not supported by the context, say "I don't have enough information in the indexed documents to answer that."
- Avoid jurisdiction-specific conclusions unless the materials explicitly identify a jurisdiction.
- Do NOT provide legal advice, strategies, or recommendations — only general information and education.
- Structure your response with clear paragraphs and, when helpful, bullet points.`;

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface RAGResult {
    content: string;
    metadata: {
        source_file: string;
        page: number | string;
        domain: string;
        category: string;
        [key: string]: unknown;
    };
    score: number;
}

export interface RAGSearchResponse {
    answer: string;
    sources: {
        filename: string;
        page: number | string;
        category: string;
        score: number;
    }[];
    domain: string;
    query: string;
    chunksSearched: number;
}

// ─────────────────────────────────────────────────────────────────
// Singletons (lazy-loaded)
// ─────────────────────────────────────────────────────────────────

let _ollama: Ollama | null = null;
let _chroma: ChromaClient | null = null;
let _collection: Collection | null = null;
let _bm25Index: BM25Index | null = null;

function getOllama(): Ollama {
    if (!_ollama) {
        _ollama = new Ollama({ host: "http://localhost:11434" });
    }
    return _ollama;
}

async function getChroma(): Promise<ChromaClient> {
    if (!_chroma) {
        _chroma = new ChromaClient({ path: "http://localhost:8000" });
    }
    return _chroma;
}

// ─────────────────────────────────────────────────────────────────
// Document Loading & Chunking
// ─────────────────────────────────────────────────────────────────

interface DocChunk {
    content: string;
    metadata: {
        domain: string;
        category: string;
        source_file: string;
        page: number;
        [key: string]: unknown; // Email metadata: date, from_addr, to_addr, labels, involves
    };
}

/**
 * Split text into overlapping chunks.
 */
function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
    const chunks: string[] = [];
    const separators = ["\n\n", "\n", ". ", " "];

    // Simple recursive character text splitter
    if (text.length <= size) {
        return [text];
    }

    let start = 0;
    while (start < text.length) {
        let end = Math.min(start + size, text.length);

        // Try to break at a natural boundary
        if (end < text.length) {
            let bestBreak = -1;
            for (const sep of separators) {
                const searchStart = Math.max(start + size * 0.5, start);
                const lastIdx = text.lastIndexOf(sep, end);
                if (lastIdx >= searchStart) {
                    bestBreak = lastIdx + sep.length;
                    break;
                }
            }
            if (bestBreak > start) {
                end = bestBreak;
            }
        }

        chunks.push(text.slice(start, end).trim());
        start = end - overlap;
        if (start >= text.length) break;
    }

    return chunks.filter((c) => c.length > 50); // Skip tiny fragments
}

/**
 * Extract text from a PDF file using a standalone pdfjs-dist script.
 * Uses child_process to bypass Next.js module bundling issues.
 */
function extractPdfText(filePath: string): string {
    const { execFileSync } = require("child_process") as typeof import("child_process");
    const scriptPath = path.resolve(process.cwd(), "scripts/extract-pdf-text.mjs");

    try {
        console.log(`     [PDF] Extracting text from ${path.basename(filePath)}...`);
        const result = execFileSync("node", [scriptPath, filePath], {
            encoding: "utf-8",
            timeout: 60_000, // 60s timeout per PDF
            maxBuffer: 50 * 1024 * 1024, // 50MB max output
            stdio: ["pipe", "pipe", "pipe"],
        });
        if (!result || !result.trim()) {
            console.log(`     [PDF] ⚠️  Empty text extracted from ${path.basename(filePath)}`);
        }
        return result;
    } catch (e: any) {
        const errorMsg = e.stderr?.toString() || e.message || String(e);
        console.error(`     [PDF] ❌ Failed to extract ${path.basename(filePath)}: ${errorMsg}`);
        return "";
    }
}

/**
 * Load documents from a directory, extract text, and chunk them.
 * Handles PDF and TXT files. Falls back to TXT-only if pdfjs fails.
 */
async function loadDocsFromDir(baseDir: string, domain: string): Promise<DocChunk[]> {
    const chunks: DocChunk[] = [];

    console.log(`  📂 Checking ${domain} dir: ${baseDir}`);
    if (!fs.existsSync(baseDir)) {
        console.log(`     ❌ Directory does not exist: ${baseDir}`);
        return chunks;
    }

    // Walk directory to find all PDF/TXT files
    const walkDir = (dir: string): string[] => {
        const files: string[] = [];
        try {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                if (entry.name.startsWith(".")) continue; // skip hidden files
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    files.push(...walkDir(full));
                } else if (
                    entry.name.toLowerCase().endsWith(".pdf") ||
                    entry.name.toLowerCase().endsWith(".txt")
                ) {
                    files.push(full);
                }
            }
        } catch (e) {
            console.error(`     ❌ Error reading directory ${dir}: ${e}`);
        }
        return files;
    };

    const files = walkDir(baseDir);
    console.log(`     Found ${files.length} files`);

    if (files.length === 0) return chunks;

    // Test if PDF extraction script is available
    let pdfWorking = true;
    const pdfScript = path.resolve(process.cwd(), "scripts/extract-pdf-text.mjs");
    if (fs.existsSync(pdfScript)) {
        console.log(`     ✓ PDF extraction script found: ${pdfScript}`);
    } else {
        console.warn(`     ⚠️ PDF extraction script not found at ${pdfScript}. Will skip PDFs.`);
        pdfWorking = false;
    }

    let processed = 0;
    let skipped = 0;

    for (const filePath of files) {
        const relDir = path.relative(baseDir, path.dirname(filePath));
        const category = relDir === "." ? "general" : relDir;
        const filename = path.basename(filePath);
        const ext = filename.toLowerCase().split(".").pop();

        try {
            let text = "";

            if (ext === "pdf") {
                if (!pdfWorking) {
                    skipped++;
                    continue;
                }
                text = extractPdfText(filePath);
            } else if (ext === "txt") {
                text = fs.readFileSync(filePath, "utf-8");
            }

            if (!text.trim()) {
                skipped++;
                continue;
            }

            const textChunks = chunkText(text);
            for (let i = 0; i < textChunks.length; i++) {
                chunks.push({
                    content: textChunks[i],
                    metadata: {
                        domain,
                        category,
                        source_file: filename,
                        page: i + 1,
                        source_type: ext === "pdf" ? "pdf" : "text",
                    },
                });
            }

            processed++;
            if (processed % 10 === 0) {
                console.log(`     Processed ${processed}/${files.length} files (${chunks.length} chunks)...`);
            }
        } catch (e) {
            console.error(`     ✗ ${filename}: ${e}`);
            skipped++;
        }
    }

    console.log(`  ✓ ${domain}: ${processed} files processed, ${skipped} skipped, ${chunks.length} chunks`);
    return chunks;
}

// ─────────────────────────────────────────────────────────────────
// Embedding
// ─────────────────────────────────────────────────────────────────

/**
 * Get embeddings for a list of texts using Ollama.
 */
async function embed(texts: string[]): Promise<number[][]> {
    const ollama = getOllama();
    const results: number[][] = [];

    // Batch in groups of 32 to avoid overwhelming Ollama
    const batchSize = 32;
    for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const response = await ollama.embed({
            model: EMBEDDING_MODEL,
            input: batch,
        });
        results.push(...response.embeddings);
    }

    return results;
}

/**
 * Embed a single query.
 */
async function embedQuery(text: string): Promise<number[]> {
    const [embedding] = await embed([text]);
    return embedding;
}

// ─────────────────────────────────────────────────────────────────
// Indexing
// ─────────────────────────────────────────────────────────────────

/**
 * Load evidence from the Evidence Hub (Emails + iMessages).
 * Filters out short snippets and empty content.
 */
function loadEvidenceFromHub(limit: number = DEFAULT_EMAIL_LIMIT): DocChunk[] {
    const chunks: DocChunk[] = [];

    console.log(`  📂 Loading evidence from ${EVIDENCE_HUB_DB_PATH}`);
    if (!fs.existsSync(EVIDENCE_HUB_DB_PATH)) {
        console.log(`     ❌ Evidence Hub not found: ${EVIDENCE_HUB_DB_PATH}`);
        return chunks;
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Database = require("better-sqlite3");
        const db = new Database(EVIDENCE_HUB_DB_PATH, { readonly: true });

        // Query non-empty body_snippet records
        const stmt = db.prepare(`
            SELECT id, canonical_id, source_type as source, start_timestamp as timestamp,
                   body_snippet, tags, primary_ids
            FROM evidence
            WHERE body_snippet IS NOT NULL
              AND body_snippet != ''
            ORDER BY start_timestamp DESC
            LIMIT ?
        `);

        const rows = stmt.all(limit);
        console.log(`     Found ${rows.length} rows in Evidence Hub (requested limit: ${limit})`);

        let skippedShort = 0;

        for (const row of rows) {
            const text = row.body_snippet as string;
            if (text.trim().length < 20) {
                skippedShort++;
                continue; 
            }

            // Categorize by source
            let category = "email_other";
            if (row.source === "email") category = "email_inbox";
            else if (row.source === "imessage") category = "general";

            // For longer content, chunk them; for short ones, keep as-is
            const textChunks = text.length > CHUNK_SIZE ? chunkText(text) : [text];

            for (let i = 0; i < textChunks.length; i++) {
                chunks.push({
                    content: textChunks[i],
                    metadata: {
                        domain: "evidence",
                        category,
                        source_file: row.canonical_id || "Unknown Source",
                        source_type: row.source,
                        page: i + 1,
                        timestamp: row.timestamp || "",
                        evidence_id: String(row.id),
                        tags: row.tags || "[]",
                    },
                });
            }
        }

        db.close();
        console.log(`  ✓ evidence: ${rows.length} rows, ${chunks.length} chunks (skipped: ${skippedShort} short)`);
    } catch (e) {
        console.error(`  ❌ Evidence loading error: ${e}`);
    }

    return chunks;
}

/**
 * Index all legal documents + email evidence into ChromaDB + BM25.
 * Run this once (or on re-index).
 */
export async function indexDocuments(
    reindex = false,
    emailLimit: number = DEFAULT_EMAIL_LIMIT
): Promise<{
    chunks: number;
    status: string;
    pdfChunks: number;
    emailChunks: number;
}> {
    console.log("\n📚 Indexing legal documents + email evidence...\n");

    // Load all forensic documents from the centralized data directory
    // This will recursively find all PDFs/TXTs in all "Locker" folders
    const pdfChunks = await loadDocsFromDir(LEGAL_DOCS_DIR, "forensic");

    // Load evidence hub data (emails + messages)
    const emailChunks = loadEvidenceFromHub(emailLimit);

    const allChunks = [...pdfChunks, ...emailChunks];

    if (allChunks.length === 0) {
        return { chunks: 0, status: "No documents found", pdfChunks: 0, emailChunks: 0 };
    }

    console.log(`\n📄 Total chunks: ${allChunks.length}\n`);

    // ── Build BM25 index ──
    console.log("🔍 Building BM25 index...");
    const bm25Docs: BM25Document[] = allChunks.map((c) => ({
        content: c.content,
        metadata: c.metadata,
    }));
    const bm25Index = buildBM25Index(bm25Docs);
    fs.writeFileSync(BM25_INDEX_PATH, serializeBM25(bm25Index));
    _bm25Index = bm25Index;
    console.log(`   ✓ BM25 saved to ${BM25_INDEX_PATH}`);

    // ── Build ChromaDB vector index ──
    console.log("🧲 Building vector index...");
    try {
        const chroma = await getChroma();

        if (reindex) {
            try {
                await chroma.deleteCollection({ name: CHROMA_COLLECTION });
                console.log("   Cleared existing collection");
            } catch {
                // Collection may not exist
            }
        }

        const collection = await chroma.getOrCreateCollection({
            name: CHROMA_COLLECTION,
        });

        // Embed and insert in batches
        const batchSize = 50;
        for (let i = 0; i < allChunks.length; i += batchSize) {
            const batch = allChunks.slice(i, i + batchSize);
            const texts = batch.map((c) => c.content);
            const embeddings = await embed(texts);

            await collection.add({
                ids: batch.map((_, j) => `chunk-${i + j}`),
                embeddings,
                documents: texts,
                metadatas: batch.map((c) => c.metadata as unknown as Record<string, string>),
            });

            console.log(
                `   Indexed ${Math.min(i + batchSize, allChunks.length)}/${allChunks.length} chunks`
            );
        }

        _collection = collection;
        console.log(`   ✓ Vector index complete (${allChunks.length} chunks)`);
    } catch (e) {
        console.error(`   ⚠️  ChromaDB unavailable (${e}). Using BM25 only.`);
    }

    return {
        chunks: allChunks.length,
        status: "Indexing complete",
        pdfChunks: pdfChunks.length,
        emailChunks: emailChunks.length,
    };
}

// ─────────────────────────────────────────────────────────────────
// Hybrid Search
// ─────────────────────────────────────────────────────────────────

interface RankedResult {
    content: string;
    metadata: Record<string, unknown>;
    score: number;
}

/**
 * Reciprocal Rank Fusion — merge multiple ranked lists.
 */
function reciprocalRankFusion(
    resultLists: { content: string; metadata: Record<string, unknown> }[][],
    k: number = RRF_K
): RankedResult[] {
    const scores: Record<string, { content: string; metadata: Record<string, unknown>; score: number }> = {};

    for (const list of resultLists) {
        for (let rank = 0; rank < list.length; rank++) {
            const { content, metadata } = list[rank];
            const key = content.slice(0, 200); // dedup key
            if (!scores[key]) {
                scores[key] = { content, metadata, score: 0 };
            }
            scores[key].score += 1.0 / (k + rank + 1);
        }
    }

    return Object.values(scores).sort((a, b) => b.score - a.score);
}

/**
 * Domain inference from query keywords.
 */
export function inferDomain(query: string): string {
    const businessKw = [
        "merger", "contract", "corporate", "employment", "securities", "agreement",
        "stock", "tax", "partnership", "llc", "operating agreement", "breach",
        "fiduciary", "shareholder", "receiver", "receivership", "embezzlement",
        "rowboat", "guariglia", "zangrilli", "ppp", "fraud", "accounting",
    ];
    const criminalKw = [
        "miranda", "arrest", "statute", "procedure", "search", "warrant",
        "felony", "misdemeanor", "trial", "defense", "indictment", "plea",
    ];

    const q = query.toLowerCase();
    const bizScore = businessKw.filter((kw) => q.includes(kw)).length;
    const crimScore = criminalKw.filter((kw) => q.includes(kw)).length;

    if (bizScore > crimScore) return "business";
    if (crimScore > bizScore) return "criminal";
    return "all";
}

/**
 * Load BM25 index from disk (lazy).
 */
function loadBM25(): BM25Index | null {
    if (_bm25Index) return _bm25Index;
    if (!fs.existsSync(BM25_INDEX_PATH)) {
        // Try loading from Python's pickle-generated index
        // Fall back to null — user needs to run indexing
        return null;
    }
    try {
        const json = fs.readFileSync(BM25_INDEX_PATH, "utf-8");
        _bm25Index = deserializeBM25(json);
        return _bm25Index;
    } catch {
        return null;
    }
}

/**
 * Perform hybrid search: BM25 + ChromaDB vector search → RRF fusion.
 */
export async function hybridSearch(
    query: string,
    options?: {
        domain?: string;
        category?: string;
        startDate?: string;
        endDate?: string;
        sourceType?: string;
        invoiceNumber?: string;
        poNumber?: string;
        masterRowId?: string;
        vectorK?: number;
        bm25K?: number;
    }
): Promise<RankedResult[]> {
    const vectorK = options?.vectorK ?? VECTOR_TOP_K;
    const bm25K = options?.bm25K ?? BM25_TOP_K;
    const domainFilter = options?.domain && options.domain !== "all" ? options.domain : undefined;
    const categoryFilter = options?.category;

    const resultLists: { content: string; metadata: Record<string, unknown> }[][] = [];

    // ── BM25 search ──
    const bm25 = loadBM25();
    if (bm25) {
        const bm25Results = bm25Search(query, bm25, bm25K, {
            domain: domainFilter,
            category: categoryFilter,
            startDate: options?.startDate,
            endDate: options?.endDate,
            sourceType: options?.sourceType,
            invoiceNumber: options?.invoiceNumber,
            poNumber: options?.poNumber,
            masterRowId: options?.masterRowId,
        });
        resultLists.push(
            bm25Results.map((r) => ({ content: r.content, metadata: r.metadata }))
        );
    }

    // ── Vector search (ChromaDB) ──
    try {
        if (!_collection) {
            const chroma = await getChroma();
            _collection = await chroma.getCollection({ name: CHROMA_COLLECTION });
        }

        const queryEmbedding = await embedQuery(query);

        // Build where filter
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let whereFilter: any = undefined;
        const filters: any[] = [];

        if (domainFilter) filters.push({ domain: domainFilter });
        if (categoryFilter) filters.push({ category: categoryFilter });
        if (options?.sourceType) filters.push({ source_type: options.sourceType });
        if (options?.startDate) filters.push({ date: { $gte: options.startDate } });
        if (options?.endDate) filters.push({ date: { $lte: options.endDate } });
        if (options?.invoiceNumber) filters.push({ invoice_number: options.invoiceNumber });
        if (options?.poNumber) filters.push({ po_number: options.poNumber });
        if (options?.masterRowId) filters.push({ master_row_id: options.masterRowId });

        if (filters.length === 1) {
            whereFilter = filters[0];
        } else if (filters.length > 1) {
            whereFilter = { $and: filters };
        }

        const vectorResults = await _collection.query({
            queryEmbeddings: [queryEmbedding],
            nResults: vectorK,
            where: whereFilter,
        });

        if (vectorResults.documents?.[0]) {
            const vectorRanked = vectorResults.documents[0].map((doc, i) => ({
                content: doc || "",
                metadata: (vectorResults.metadatas?.[0]?.[i] || {}) as Record<string, unknown>,
            }));
            resultLists.push(vectorRanked);
        }
    } catch (e) {
        console.warn(`  ⚠️  ChromaDB search failed (${e}). Using BM25 only.`);
    }

    if (resultLists.length === 0) {
        return [];
    }

    // ── Reciprocal Rank Fusion ──
    return reciprocalRankFusion(resultLists);
}

// ─────────────────────────────────────────────────────────────────
// Answer Generation
// ─────────────────────────────────────────────────────────────────

/**
 * Format search results into context for the LLM.
 */
function formatContext(results: RankedResult[]): string {
    return results
        .map((r, i) => {
            const source = (r.metadata.source_file as string) || "unknown";
            const page = r.metadata.page || "?";
            const category =
                CATEGORY_LABELS[r.metadata.category as string] ||
                (r.metadata.category as string) ||
                "";
            return `[Document ${i + 1}] Source: ${source} | Page: ${page} | Category: ${category}\n${r.content}`;
        })
        .join("\n\n---\n\n");
}

/**
 * Generate an answer using Ollama LLM.
 */
async function generateAnswer(query: string, context: string): Promise<string> {
    const ollama = getOllama();

    const response = await ollama.chat({
        model: LLM_MODEL,
        messages: [
            {
                role: "system",
                content: SYSTEM_PROMPT,
            },
            {
                role: "user",
                content: `CONTEXT DOCUMENTS:\n${context}\n\nQUESTION: ${query}`,
            },
        ],
        options: {
            temperature: 0.1,
            num_ctx: 8192,
        },
    });

    return response.message.content;
}

// ─────────────────────────────────────────────────────────────────
// Main Search API
// ─────────────────────────────────────────────────────────────────

/**
 * Full RAG pipeline: search → rank → generate answer.
 */
export async function ragSearch(
    query: string,
    options?: {
        domain?: string;
        category?: string;
        startDate?: string;
        endDate?: string;
        sourceType?: string;
        invoiceNumber?: string;
        poNumber?: string;
        masterRowId?: string;
        skipLLM?: boolean;
    }
): Promise<RAGSearchResponse> {
    // Auto-detect domain if not specified
    const domain = options?.domain || inferDomain(query);
    const domainFilter = domain !== "all" ? domain : undefined;

    // Hybrid search
    const rawResults = await hybridSearch(query, {
        domain: domainFilter,
        category: options?.category,
        startDate: options?.startDate,
        endDate: options?.endDate,
        sourceType: options?.sourceType,
        invoiceNumber: options?.invoiceNumber,
        poNumber: options?.poNumber,
        masterRowId: options?.masterRowId,
    });

    // Take top N
    const topResults = rawResults.slice(0, FINAL_TOP_N);

    // Generate answer (unless skipped)
    let answer = "";
    if (!options?.skipLLM && topResults.length > 0) {
        const context = formatContext(topResults);
        answer = await generateAnswer(query, context);
    } else if (topResults.length === 0) {
        answer = "No relevant documents found. Try broadening your search or checking if documents have been indexed.";
    }

    // Deduplicate sources
    const seenSources = new Set<string>();
    const sources = topResults
        .map((r) => ({
            filename: (r.metadata.source_file as string) || "unknown",
            page: (r.metadata.page as number) || 0,
            category:
                CATEGORY_LABELS[r.metadata.category as string] ||
                (r.metadata.category as string) ||
                "",
            score: r.score,
        }))
        .filter((s) => {
            const key = `${s.filename}:${s.page}`;
            if (seenSources.has(key)) return false;
            seenSources.add(key);
            return true;
        });

    return {
        answer,
        sources,
        domain,
        query,
        chunksSearched: rawResults.length,
    };
}

/**
 * Get available categories from the BM25 index.
 */
export function getCategories(): string[] {
    const bm25 = loadBM25();
    if (!bm25) return Object.keys(CATEGORY_LABELS);

    const categories = new Set<string>();
    for (const meta of bm25.metadatas) {
        if (meta.category) categories.add(meta.category as string);
    }
    return Array.from(categories).sort();
}

/**
 * Get index stats.
 */
export function getIndexStats(): {
    bm25Chunks: number;
    bm25Available: boolean;
    categories: string[];
} {
    const bm25 = loadBM25();
    return {
        bm25Chunks: bm25?.n ?? 0,
        bm25Available: !!bm25,
        categories: getCategories(),
    };
}
