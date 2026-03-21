import { NextRequest, NextResponse } from "next/server";
import { getCaseCornerDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/case-corner/agencies — list all agency submissions */
export async function GET() {
    try {
        const db = getCaseCornerDb();
        const agencies = db.prepare("SELECT * FROM agency_submissions ORDER BY sort_order ASC").all();

        // Attach linked claim counts (submission_claims may not exist yet)
        let lcMap = new Map<number, number>();
        try {
            const linkCounts = db.prepare(
                "SELECT submission_id, COUNT(*) as cnt FROM submission_claims GROUP BY submission_id"
            ).all() as { submission_id: number; cnt: number }[];
            lcMap = new Map(linkCounts.map(r => [r.submission_id, r.cnt]));
        } catch { /* table may not exist */ }

        const enriched = (agencies as { id: number }[]).map(a => ({
            ...a,
            claimCount: lcMap.get(a.id) || 0,
        }));

        return NextResponse.json({ agencies: enriched });
    } catch (err) {
        console.error("Agencies list error:", err);
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}

/** POST — create a new agency submission */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { slug, title, agency_type, submission_method, contact_info, notes } = body;
        if (!slug || !title) return NextResponse.json({ error: "slug and title required" }, { status: 400 });

        const db = getCaseCornerDb();
        const maxOrder = db.prepare("SELECT MAX(sort_order) as m FROM agency_submissions").get() as { m: number | null };

        db.prepare(`
            INSERT INTO agency_submissions (slug, title, agency_type, submission_method, contact_info, notes, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(slug, title, agency_type || "federal", submission_method || "online",
            JSON.stringify(contact_info || {}), notes || null, (maxOrder?.m || 0) + 1);

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Create agency error:", err);
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}
