import { NextRequest, NextResponse } from "next/server";
import { getCaseCornerDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/case-corner/claims/[slug] */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const db = getCaseCornerDb();
        const claim = db.prepare("SELECT * FROM claims WHERE slug = ?").get(slug);
        if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });

        const players = db.prepare(
            "SELECT * FROM claim_players WHERE claim_id = ? ORDER BY created_at DESC"
        ).all((claim as { id: number }).id);

        const evidence = db.prepare(
            "SELECT * FROM claim_evidence WHERE claim_id = ? ORDER BY created_at DESC"
        ).all((claim as { id: number }).id);

        const notes = db.prepare(
            "SELECT * FROM claim_notes WHERE claim_id = ? ORDER BY created_at ASC"
        ).all((claim as { id: number }).id);

        return NextResponse.json({ claim, players, evidence, notes });
    } catch (err) {
        console.error("Claim detail error:", err);
        return NextResponse.json({ error: "Failed to get claim" }, { status: 500 });
    }
}

/** PATCH /api/case-corner/claims/[slug] */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const body = await req.json();
        const db = getCaseCornerDb();

        const fields: string[] = [];
        const vals: unknown[] = [];
        for (const key of ["title", "category", "severity", "status", "description", "legal_elements"]) {
            if (body[key] !== undefined) {
                fields.push(`${key} = ?`);
                vals.push(key === "legal_elements" ? JSON.stringify(body[key]) : body[key]);
            }
        }
        if (!fields.length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

        fields.push("updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')");
        vals.push(slug);

        db.prepare(`UPDATE claims SET ${fields.join(", ")} WHERE slug = ?`).run(...vals);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Update claim error:", err);
        return NextResponse.json({ error: "Failed to update claim" }, { status: 500 });
    }
}
