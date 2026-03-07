import { NextRequest, NextResponse } from "next/server";
import { getCaseCornerDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/case-corner/claims — list all claims */
export async function GET(req: NextRequest) {
    try {
        const db = getCaseCornerDb();
        const status = req.nextUrl.searchParams.get("status") || "";
        const category = req.nextUrl.searchParams.get("category") || "";

        let sql = "SELECT * FROM claims";
        const conditions: string[] = [];
        const params: string[] = [];

        if (status) { conditions.push("status = ?"); params.push(status); }
        if (category) { conditions.push("category = ?"); params.push(category); }
        if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
        sql += " ORDER BY sort_order ASC, id ASC";

        const claims = db.prepare(sql).all(...params);

        // Attach counts
        const playerCounts = db.prepare(
            "SELECT claim_id, COUNT(*) as cnt FROM claim_players GROUP BY claim_id"
        ).all() as { claim_id: number; cnt: number }[];
        const evidenceCounts = db.prepare(
            "SELECT claim_id, COUNT(*) as cnt FROM claim_evidence GROUP BY claim_id"
        ).all() as { claim_id: number; cnt: number }[];

        const pcMap = new Map(playerCounts.map(r => [r.claim_id, r.cnt]));
        const ecMap = new Map(evidenceCounts.map(r => [r.claim_id, r.cnt]));

        const enriched = (claims as { id: number }[]).map(c => ({
            ...c,
            playerCount: pcMap.get(c.id) || 0,
            evidenceCount: ecMap.get(c.id) || 0,
        }));

        return NextResponse.json({ claims: enriched });
    } catch (err) {
        console.error("Claims list error:", err);
        return NextResponse.json({ error: "Failed to list claims" }, { status: 500 });
    }
}

/** POST /api/case-corner/claims — create a new claim */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { slug, title, category, severity, legal_elements, description } = body;
        if (!slug || !title) {
            return NextResponse.json({ error: "slug and title are required" }, { status: 400 });
        }
        const db = getCaseCornerDb();
        const maxOrder = db.prepare("SELECT MAX(sort_order) as m FROM claims").get() as { m: number | null };
        const nextOrder = (maxOrder?.m || 0) + 1;

        db.prepare(`
            INSERT INTO claims (slug, title, category, severity, legal_elements, description, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(slug, title, category || "criminal", severity || "felony",
            JSON.stringify(legal_elements || []), description || "", nextOrder);

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Create claim error:", err);
        return NextResponse.json({ error: "Failed to create claim" }, { status: 500 });
    }
}
