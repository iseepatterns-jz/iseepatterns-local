import { NextRequest, NextResponse } from "next/server";
import { getCaseCornerDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET — list claims linked to this agency submission */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const db = getCaseCornerDb();
        const agency = db.prepare("SELECT id FROM agency_submissions WHERE slug = ?").get(slug) as { id: number } | undefined;
        if (!agency) return NextResponse.json({ error: "Agency not found" }, { status: 404 });

        const linkedClaims = db.prepare(`
            SELECT sc.*, c.title as claim_title, c.slug as claim_slug, c.status as claim_status
            FROM submission_claims sc
            JOIN claims c ON c.id = sc.claim_id
            WHERE sc.submission_id = ?
        `).all(agency.id);

        return NextResponse.json({ linkedClaims });
    } catch (err) {
        console.error("Agency claims error:", err);
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}

/** POST — link a claim to this agency submission */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const body = await req.json();
        const { claim_slug, priority, notes } = body;
        if (!claim_slug) return NextResponse.json({ error: "claim_slug required" }, { status: 400 });

        const db = getCaseCornerDb();
        const agency = db.prepare("SELECT id FROM agency_submissions WHERE slug = ?").get(slug) as { id: number } | undefined;
        if (!agency) return NextResponse.json({ error: "Agency not found" }, { status: 404 });

        const claim = db.prepare("SELECT id FROM claims WHERE slug = ?").get(claim_slug) as { id: number } | undefined;
        if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });

        db.prepare(`
            INSERT OR REPLACE INTO submission_claims (submission_id, claim_id, priority, notes)
            VALUES (?, ?, ?, ?)
        `).run(agency.id, claim.id, priority || "primary", notes || null);

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Link claim error:", err);
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}

/** DELETE — unlink a claim from this agency submission */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const body = await req.json();
        const { claim_slug } = body;

        const db = getCaseCornerDb();
        const agency = db.prepare("SELECT id FROM agency_submissions WHERE slug = ?").get(slug) as { id: number } | undefined;
        if (!agency) return NextResponse.json({ error: "Agency not found" }, { status: 404 });

        const claim = db.prepare("SELECT id FROM claims WHERE slug = ?").get(claim_slug) as { id: number } | undefined;
        if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });

        db.prepare("DELETE FROM submission_claims WHERE submission_id = ? AND claim_id = ?")
            .run(agency.id, claim.id);

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Unlink claim error:", err);
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}
