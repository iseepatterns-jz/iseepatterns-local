import { NextRequest, NextResponse } from "next/server";
import { getCaseCornerDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET — list players assigned to this claim */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const db = getCaseCornerDb();
        const claim = db.prepare("SELECT id FROM claims WHERE slug = ?").get(slug) as { id: number } | undefined;
        if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });

        const players = db.prepare(
            "SELECT * FROM claim_players WHERE claim_id = ? ORDER BY created_at DESC"
        ).all(claim.id);

        return NextResponse.json({ players });
    } catch (err) {
        console.error("Claim players error:", err);
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}

/** POST — assign a player to this claim */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const body = await req.json();
        const { player_slug, player_name, role, notes } = body;
        if (!player_slug || !player_name) {
            return NextResponse.json({ error: "player_slug and player_name required" }, { status: 400 });
        }

        const db = getCaseCornerDb();
        const claim = db.prepare("SELECT id FROM claims WHERE slug = ?").get(slug) as { id: number } | undefined;
        if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });

        db.prepare(`
            INSERT OR REPLACE INTO claim_players (claim_id, player_slug, player_name, role, notes)
            VALUES (?, ?, ?, ?, ?)
        `).run(claim.id, player_slug, player_name, role || "defendant", notes || null);

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Assign player error:", err);
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}

/** DELETE — remove a player from this claim */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const body = await req.json();
        const { player_slug } = body;

        const db = getCaseCornerDb();
        const claim = db.prepare("SELECT id FROM claims WHERE slug = ?").get(slug) as { id: number } | undefined;
        if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });

        db.prepare("DELETE FROM claim_players WHERE claim_id = ? AND player_slug = ?")
            .run(claim.id, player_slug);

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Remove player error:", err);
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}
