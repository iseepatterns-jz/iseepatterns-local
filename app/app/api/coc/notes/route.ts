import { NextResponse } from "next/server";
import { getCommDbWritable, getWorkbenchDb } from "@/lib/db";


export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const { id, notes } = await req.json();

        if (!id || typeof id !== "number") {
            return NextResponse.json({ error: "Invalid id" }, { status: 400 });
        }

        const db = getCommDbWritable();
        const workbench = getWorkbenchDb();
        const now = new Date().toISOString();

        const stmt = db.prepare(
            `
            UPDATE chain_of_custody
            SET notes = ?,last_updated_at = ?
            WHERE id = ?
      `
        );
        const result = stmt.run(notes ?? null, now, id);

        if (result.changes === 0) {
            return NextResponse.json({ error: "Record not found" }, { status: 404 });
        }

        // audit log
        const auditStmt = workbench.prepare(
            `
            INSERT INTO coc_notes_audit (coc_id, note_text, changed_at, changed_by, source)
            VALUES (?, ?, ?, ?, ?)
            `
        );
        auditStmt.run(id, notes ?? null, now, "jz-local", "coc_page");

        return NextResponse.json({ ok: true, lastUpdatedAt: now });
    } catch (error) {
        console.error("CoC notes API error:", error);
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
}
