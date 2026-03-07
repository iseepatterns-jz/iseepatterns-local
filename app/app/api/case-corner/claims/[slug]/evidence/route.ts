import { NextRequest, NextResponse } from "next/server";
import { getCaseCornerDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET — list evidence linked to this claim */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const db = getCaseCornerDb();
        const claim = db.prepare("SELECT id FROM claims WHERE slug = ?").get(slug) as { id: number } | undefined;
        if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });

        const evidence = db.prepare(
            "SELECT * FROM claim_evidence WHERE claim_id = ? ORDER BY created_at DESC"
        ).all(claim.id);

        return NextResponse.json({ evidence });
    } catch (err) {
        console.error("Claim evidence error:", err);
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}

/** POST — link evidence to this claim */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const body = await req.json();
        const { evidence_id, evidence_type, relevance } = body;
        if (!evidence_id || !evidence_type) {
            return NextResponse.json({ error: "evidence_id and evidence_type required" }, { status: 400 });
        }

        const db = getCaseCornerDb();
        const claim = db.prepare("SELECT id FROM claims WHERE slug = ?").get(slug) as { id: number } | undefined;
        if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });

        db.prepare(`
            INSERT OR REPLACE INTO claim_evidence (claim_id, evidence_id, evidence_type, relevance)
            VALUES (?, ?, ?, ?)
        `).run(claim.id, evidence_id, evidence_type, relevance || null);

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Link evidence error:", err);
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}

/** DELETE — unlink evidence from this claim */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const body = await req.json();
        const { evidence_id, evidence_type } = body;

        const db = getCaseCornerDb();
        const claim = db.prepare("SELECT id FROM claims WHERE slug = ?").get(slug) as { id: number } | undefined;
        if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });

        db.prepare("DELETE FROM claim_evidence WHERE claim_id = ? AND evidence_id = ? AND evidence_type = ?")
            .run(claim.id, evidence_id, evidence_type);

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Unlink evidence error:", err);
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}
