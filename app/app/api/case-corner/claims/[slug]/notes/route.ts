import { NextRequest, NextResponse } from "next/server";
import { getCaseCornerDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET — list notes for this claim */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const db = getCaseCornerDb();
        const claim = db.prepare("SELECT id FROM claims WHERE slug = ?").get(slug) as { id: number } | undefined;
        if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });

        const notes = db.prepare(
            "SELECT * FROM claim_notes WHERE claim_id = ? ORDER BY created_at ASC"
        ).all(claim.id);

        return NextResponse.json({ notes });
    } catch (err) {
        console.error("Claim notes error:", err);
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}

/** POST — add a note */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const body = await req.json();
        const { content, role } = body;
        if (!content) return NextResponse.json({ error: "content required" }, { status: 400 });

        const db = getCaseCornerDb();
        const claim = db.prepare("SELECT id FROM claims WHERE slug = ?").get(slug) as { id: number } | undefined;
        if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });

        const result = db.prepare(`
            INSERT INTO claim_notes (claim_id, role, content)
            VALUES (?, ?, ?)
        `).run(claim.id, role || "user", content);

        return NextResponse.json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
        console.error("Add note error:", err);
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}
