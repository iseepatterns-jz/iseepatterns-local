import { NextRequest, NextResponse } from "next/server";
import { ragSearch, getIndexStats, getCategories, CATEGORY_LABELS } from "@/lib/rag";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // LLM generation can take time

/**
 * GET /api/ai/rag?q=...&domain=...&category=...&skipLLM=true
 * Search legal documents using hybrid RAG (BM25 + Vector + LLM).
 */
export async function GET(req: NextRequest) {
    try {
        const url = req.nextUrl;
        const q = url.searchParams.get("q") || "";
        const domain = url.searchParams.get("domain") || undefined;
        const category = url.searchParams.get("category") || undefined;
        const skipLLM = url.searchParams.get("skipLLM") === "true";

        if (!q) {
            // Return index stats + categories
            const stats = getIndexStats();
            return NextResponse.json({
                status: "ready",
                ...stats,
                categoryLabels: CATEGORY_LABELS,
            });
        }

        const result = await ragSearch(q, { domain, category, skipLLM });
        return NextResponse.json(result);
    } catch (error) {
        console.error("RAG API error:", error);
        return NextResponse.json(
            {
                error: "RAG search failed. Ensure Ollama is running and BM25 index exists.",
                details: String(error),
            },
            { status: 500 }
        );
    }
}

/**
 * POST /api/ai/rag
 * Same as GET but accepts body for longer queries.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { query, domain, category, skipLLM } = body;

        if (!query) {
            return NextResponse.json(
                { error: "Missing required field: query" },
                { status: 400 }
            );
        }

        const result = await ragSearch(query, { domain, category, skipLLM });
        return NextResponse.json(result);
    } catch (error) {
        console.error("RAG API error:", error);
        return NextResponse.json(
            {
                error: "RAG search failed",
                details: String(error),
            },
            { status: 500 }
        );
    }
}
