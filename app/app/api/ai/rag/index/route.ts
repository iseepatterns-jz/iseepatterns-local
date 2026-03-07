import { NextResponse } from "next/server";
import { indexDocuments } from "@/lib/rag";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Indexing can take minutes

/**
 * POST /api/ai/rag/index
 * Trigger document indexing (BM25 + ChromaDB).
 * Body: { reindex?: boolean, emailLimit?: number }
 */
export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const reindex = body.reindex === true;
        const emailLimit = typeof body.emailLimit === "number" ? body.emailLimit : undefined;

        const result = await indexDocuments(reindex, emailLimit);
        return NextResponse.json(result);
    } catch (error) {
        console.error("Indexing error:", error);
        return NextResponse.json(
            { error: "Indexing failed", details: String(error) },
            { status: 500 }
        );
    }
}
