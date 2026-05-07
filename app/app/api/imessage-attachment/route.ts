import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

const IMESSAGE_LOCKER = path.resolve(
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/IMESSAGE_LOCKER/Messages"
);
const CASE_DB_PATH = path.join(IMESSAGE_LOCKER, "chat_case_only.db");
const ATTACHMENTS_ROOT = path.join(IMESSAGE_LOCKER, "Attachments");
const LIBRARY_PREFIX = "~/Library/Messages/Attachments/";

let _caseDb: Database.Database | null = null;
function getCaseDb(): Database.Database {
    if (!_caseDb) {
        _caseDb = new Database(CASE_DB_PATH, { readonly: true });
        _caseDb.pragma("journal_mode = WAL");
    }
    return _caseDb;
}

/**
 * GET /api/imessage-attachment?guid=<message-guid>
 * Returns attachment file(s) for a given message GUID.
 * If ?info=1, returns JSON metadata instead of the file.
 */
export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const guid = url.searchParams.get("guid");
        const infoOnly = url.searchParams.get("info") === "1";

        if (!guid) {
            return NextResponse.json({ error: "Missing guid parameter" }, { status: 400 });
        }

        const db = getCaseDb();

        // Look up message in chat_case_only.db by GUID
        const msg = db.prepare(
            "SELECT ROWID FROM message WHERE guid = ?"
        ).get(guid) as { ROWID: number } | undefined;

        if (!msg) {
            return NextResponse.json({ error: "Message not found in case DB", guid }, { status: 404 });
        }

        // Get attachments via join
        const attachments = db.prepare(`
            SELECT a.ROWID, a.filename, a.mime_type, a.transfer_name, a.total_bytes,
                   a.uti, a.is_sticker
            FROM message_attachment_join maj
            JOIN attachment a ON a.ROWID = maj.attachment_id
            WHERE maj.message_id = ?
        `).all(msg.ROWID) as any[];

        if (attachments.length === 0) {
            return NextResponse.json({ error: "No attachments found", guid }, { status: 404 });
        }

        // Map ~/Library/Messages/Attachments/... paths to local disk
        const resolved = attachments.map((a: any) => {
            let localPath = "";
            if (a.filename && a.filename.startsWith(LIBRARY_PREFIX)) {
                const relativePath = a.filename.slice(LIBRARY_PREFIX.length);
                localPath = path.join(ATTACHMENTS_ROOT, relativePath);
            }
            return {
                id: a.ROWID,
                filename: a.transfer_name || path.basename(a.filename || "unknown"),
                mime_type: a.mime_type || "application/octet-stream",
                total_bytes: a.total_bytes,
                is_sticker: a.is_sticker,
                local_path: localPath,
                exists: localPath ? fs.existsSync(localPath) : false,
            };
        });

        // Info mode: return metadata
        if (infoOnly) {
            return NextResponse.json({ guid, attachments: resolved });
        }

        // File mode: serve the first existing attachment
        const first = resolved.find(a => a.exists);
        if (!first) {
            return NextResponse.json({
                error: "Attachment files not found on disk",
                guid,
                attachments: resolved.map(a => ({ filename: a.filename, exists: a.exists }))
            }, { status: 404 });
        }

        const fileBuffer = fs.readFileSync(first.local_path);
        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                "Content-Type": first.mime_type,
                "Content-Length": String(fileBuffer.length),
                "Cache-Control": "public, max-age=86400",
                "Content-Disposition": `inline; filename="${first.filename}"`,
            },
        });
    } catch (error: any) {
        console.error("Attachment API error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
