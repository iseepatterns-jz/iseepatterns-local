import { NextResponse } from "next/server";
import { getWorkbenchDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const { id } = await req.json();
        if (!id || typeof id !== "number") {
            return NextResponse.json({ error: "Invalid id" }, { status: 400 });
        }

        const db = getWorkbenchDb();
        const stmt = db.prepare(
            `
      SELECT
        coc_id,
        note_text,
        changed_at,
        changed_by,
        source
      FROM coc_notes_audit
      WHERE coc_id = ?
      ORDER BY changed_at DESC
      `
        );
        const rows = stmt.all(id);

        return NextResponse.json({ records: rows });
    } catch (error) {
        console.error("CoC history API error:", error);
        return NextResponse.json({ error: "History lookup failed" }, { status: 500 });
    }
}
