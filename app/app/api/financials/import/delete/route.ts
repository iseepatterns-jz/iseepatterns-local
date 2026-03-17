import { NextRequest, NextResponse } from "next/server";
import { getWorkbenchDb } from "@/lib/db";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

const debugLogPath = path.join(process.cwd(), "debug_ingest.log");
const writeDebug = (msg: string) => {
    fs.appendFileSync(debugLogPath, `${new Date().toISOString()} ${msg}\n`);
};

/**
 * GET /api/financials/import/delete?id=X
 * Simple GET-based delete that redirects back to /financials/import.
 * This bypasses any JavaScript fetch issues.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    const id = idStr ? parseInt(idStr, 10) : null;

    writeDebug(`[SIMPLE-DELETE] Request for session ID: ${id}`);

    if (!id || isNaN(id)) {
        writeDebug(`[SIMPLE-DELETE] Invalid ID: ${idStr}`);
        return NextResponse.redirect(new URL("/financials/import?error=invalid_id", req.url));
    }

    try {
        const db = getWorkbenchDb();

        // Get file info before deletion
        const fileInfo = db.prepare(`
            SELECT f.storage_path, f.id as file_id
            FROM import_sessions s
            JOIN statement_files f ON s.statement_file_id = f.id
            WHERE s.id = ?
        `).get(id) as { storage_path: string; file_id: number } | undefined;

        if (!fileInfo) {
            writeDebug(`[SIMPLE-DELETE] Session ${id} not found`);
            return NextResponse.redirect(new URL("/financials/import?error=not_found", req.url));
        }

        db.transaction(() => {
            const txDel = db.prepare("DELETE FROM statement_transactions WHERE import_session_id = ?").run(id);
            const sessDel = db.prepare("DELETE FROM import_sessions WHERE id = ?").run(id);
            writeDebug(`[SIMPLE-DELETE] Deleted ${txDel.changes} txns, ${sessDel.changes} sessions for ID ${id}`);

            // Clean up orphaned file
            const remaining = db.prepare("SELECT id FROM import_sessions WHERE statement_file_id = ?").all(fileInfo.file_id);
            if (remaining.length === 0) {
                db.prepare("DELETE FROM statement_files WHERE id = ?").run(fileInfo.file_id);
                if (fs.existsSync(fileInfo.storage_path)) {
                    try { fs.unlinkSync(fileInfo.storage_path); } catch {}
                }
                writeDebug(`[SIMPLE-DELETE] Cleaned up orphaned file ${fileInfo.file_id}`);
            }
        })();

        writeDebug(`[SIMPLE-DELETE] Session ${id} purged successfully`);
        return NextResponse.redirect(new URL("/financials/import?deleted=" + id, req.url));
    } catch (err) {
        writeDebug(`[SIMPLE-DELETE] ERROR: ${(err as Error).message}`);
        return NextResponse.redirect(new URL("/financials/import?error=delete_failed", req.url));
    }
}
