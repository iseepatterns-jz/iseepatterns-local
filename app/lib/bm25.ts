/**
 * BM25 (Okapi BM25) — Lightweight TypeScript implementation
 * Port of rank_bm25.BM25Okapi from the Python RAG assistant.
 *
 * BM25 is a bag-of-words ranking function used by search engines.
 * This implementation supports serialization to/from JSON for persistence.
 */

export interface BM25Document {
    content: string;
    metadata: Record<string, unknown>;
}

export interface BM25Index {
    /** The BM25 parameters */
    k1: number;
    b: number;
    /** Average document length */
    avgdl: number;
    /** Total number of documents */
    n: number;
    /** Document frequencies: term → count of docs containing it */
    df: Record<string, number>;
    /** Inverse document frequencies (precomputed) */
    idf: Record<string, number>;
    /** Tokenized document lengths */
    docLengths: number[];
    /** Term frequencies per document: doc_idx → { term → count } */
    tf: Record<string, number>[];
    /** Original document contents */
    contents: string[];
    /** Original document metadata */
    metadatas: Record<string, unknown>[];
}

/**
 * Tokenize text: lowercase, split on whitespace and punctuation, filter short tokens.
 */
export function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 1);
}

/**
 * Build a BM25 index from documents.
 */
export function buildBM25Index(
    docs: BM25Document[],
    k1 = 1.5,
    b = 0.75
): BM25Index {
    const n = docs.length;
    const df: Record<string, number> = {};
    const tf: Record<string, number>[] = [];
    const docLengths: number[] = [];
    const contents: string[] = [];
    const metadatas: Record<string, unknown>[] = [];

    for (const doc of docs) {
        const tokens = tokenize(doc.content);
        docLengths.push(tokens.length);
        contents.push(doc.content);
        metadatas.push(doc.metadata);

        // Term frequencies for this document
        const termFreq: Record<string, number> = {};
        const seen = new Set<string>();

        for (const token of tokens) {
            termFreq[token] = (termFreq[token] || 0) + 1;
            if (!seen.has(token)) {
                seen.add(token);
                df[token] = (df[token] || 0) + 1;
            }
        }
        tf.push(termFreq);
    }

    const avgdl = docLengths.reduce((a, b) => a + b, 0) / n;

    // Precompute IDF using the standard BM25 formula
    const idf: Record<string, number> = {};
    for (const [term, freq] of Object.entries(df)) {
        idf[term] = Math.log((n - freq + 0.5) / (freq + 0.5) + 1);
    }

    return { k1, b, avgdl, n, df, idf, docLengths, tf, contents, metadatas };
}

/**
 * Score documents against a query using BM25.
 * Returns array of scores, one per document in the index.
 */
export function bm25Score(query: string, index: BM25Index): number[] {
    const queryTokens = tokenize(query);
    const scores = new Array<number>(index.n).fill(0);

    for (let i = 0; i < index.n; i++) {
        let score = 0;
        const dl = index.docLengths[i];
        const docTf = index.tf[i];

        for (const term of queryTokens) {
            if (!(term in index.idf)) continue;
            const termFreq = docTf[term] || 0;
            if (termFreq === 0) continue;

            const idf = index.idf[term];
            const numerator = termFreq * (index.k1 + 1);
            const denominator =
                termFreq + index.k1 * (1 - index.b + index.b * (dl / index.avgdl));
            score += idf * (numerator / denominator);
        }
        scores[i] = score;
    }

    return scores;
}

/**
 * Search the BM25 index and return top-k results.
 */
export function bm25Search(
    query: string,
    index: BM25Index,
    topK = 15,
    filters?: {
        domain?: string;
        category?: string;
        startDate?: string;
        endDate?: string;
        sourceType?: string;
        invoiceNumber?: string;
        poNumber?: string;
        masterRowId?: string;
    }
): { content: string; metadata: Record<string, unknown>; score: number }[] {
    const scores = bm25Score(query, index);

    // Build scored + filtered list
    const results: { idx: number; score: number }[] = [];
    for (let i = 0; i < scores.length; i++) {
        const meta = index.metadatas[i];
        if (filters?.domain && meta.domain !== filters.domain) continue;
        if (filters?.category && meta.category !== filters.category) continue;

        // Date filtering (checks metadata.date or metadata.start_timestamp)
        const docDate = (meta.date || meta.start_timestamp) as string | undefined;
        if (filters?.startDate && docDate && docDate < filters.startDate) continue;
        if (filters?.endDate && docDate && docDate > filters.endDate) continue;

        // Source type filtering
        if (filters?.sourceType && meta.source_type !== filters.sourceType) continue;

        // Financial filtering
        if (filters?.invoiceNumber && meta.invoice_number !== filters.invoiceNumber) continue;
        if (filters?.poNumber && meta.po_number !== filters.poNumber) continue;
        if (filters?.masterRowId && meta.master_row_id !== filters.masterRowId) continue;

        results.push({ idx: i, score: scores[i] });
    }

    // Sort descending by score
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, topK).map((r) => ({
        content: index.contents[r.idx],
        metadata: index.metadatas[r.idx],
        score: r.score,
    }));
}

/**
 * Serialize BM25 index to JSON (for file persistence).
 * Excludes the full contents/metadatas to keep size reasonable —
 * caller must store those separately or include them.
 */
export function serializeBM25(index: BM25Index): string {
    return JSON.stringify(index);
}

/**
 * Deserialize BM25 index from JSON.
 */
export function deserializeBM25(json: string): BM25Index {
    return JSON.parse(json) as BM25Index;
}
