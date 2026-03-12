import { NextRequest, NextResponse } from "next/server";
import { getWorkbenchDb } from "@/lib/db";

/**
 * GET /api/transcripts/[slug]/annotations
 * Returns all annotations for a specific transcript.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    try {
        const db = getWorkbenchDb();
        const rows = db.prepare(`
            SELECT id, line_index, note, created_at, updated_at
            FROM transcript_annotations
            WHERE transcript_slug = ?
            ORDER BY line_index ASC
        `).all(slug);

        return NextResponse.json({ annotations: rows });
    } catch (error) {
        console.error("Annotations GET error:", error);
        return NextResponse.json({ error: "Failed to fetch annotations" }, { status: 500 });
    }
}

/**
 * POST /api/transcripts/[slug]/annotations
 * Create or update an annotation for a specific line index.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    try {
        const body = await request.json();
        const { line_index, note } = body;

        if (line_index === undefined || note === undefined) {
            return NextResponse.json({ error: "line_index and note are required" }, { status: 400 });
        }

        const db = getWorkbenchDb();
        
        // Upsert logic
        const existing = db.prepare(`
            SELECT id FROM transcript_annotations 
            WHERE transcript_slug = ? AND line_index = ?
        `).get(slug, line_index) as { id: number } | undefined;

        if (existing) {
            db.prepare(`
                UPDATE transcript_annotations
                SET note = ?, updated_at = datetime('now')
                WHERE id = ?
            `).run(note, existing.id);
        } else {
            db.prepare(`
                INSERT INTO transcript_annotations (transcript_slug, line_index, note)
                VALUES (?, ?, ?)
            `).run(slug, line_index, note);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Annotations POST error details:", error);
        return NextResponse.json({ error: "Failed to save annotation", message: error.message }, { status: 500 });
    }
}
