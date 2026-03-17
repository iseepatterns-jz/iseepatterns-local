import { NextRequest, NextResponse } from "next/server";
import { getCommDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Strip Re:/Fwd:/Fw: prefixes to get the base subject for threading */
function baseSubject(subject: string | null): string {
    if (!subject) return "";
    return subject
        .replace(/^(\s*(Re|Fwd|Fw)\s*:\s*)+/gi, "")
        .trim();
}

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const db = getCommDb();

        console.log(`[API] Fetching forensic thread for anchor ID: ${id}`);

        // 1. Get the anchor email with forensic headers
        let anchor = db
            .prepare(
                `SELECT rfc822_id as msg_id, subject, date_sent as date, from_addr as sender, account, in_reply_to, refs 
                 FROM emails WHERE rfc822_id = ?`
            )
            .get(id) as any;

        if (!anchor && !isNaN(Number(id))) {
            anchor = db
                .prepare(
                    `SELECT rfc822_id as msg_id, subject, date_sent as date, from_addr as sender, account, in_reply_to, refs 
                     FROM emails WHERE id = ?`
                )
                .get(Number(id)) as any;
        }

        if (!anchor) {
            console.warn(`[API] Anchor NOT FOUND for ID: ${id}`);
            return NextResponse.json({ error: "Message not found" }, { status: 404 });
        }

        const anchorId = anchor.msg_id;
        const msgIdForQuery = anchorId.startsWith('<') ? anchorId : `<${anchorId}>`;

        // 2. Build the thread collection
        // Option A: Messages that point to this anchor via In-Reply-To or References
        // Option B: Messages this anchor points to
        // Option C: Fallback to subject similarity if no forensic headers are present
        
        const hasForensic = anchor.in_reply_to || anchor.refs;
        
        let threadMessages: any[] = [];

        if (hasForensic || anchorId) {
            // Priority 1: Forensic match
            // We search for:
            // - Any message that is the anchor itself
            // - Any message that replies to the anchor (in_reply_to)
            // - Any message that references the anchor (refs contains anchorId)
            // - Any message the anchor replies to (rfc822_id = anchor.in_reply_to)
            // - Any message the anchor references (rfc822_id IN anchor.refs split)
            
            const refsList = (anchor.refs || "")
                .split(/\s+/)
                .map((r: string) => r.trim())
                .filter((r: string) => r.length > 5); // Ensure they look like IDs

            const relatedIds = [anchorId, anchor.in_reply_to, ...refsList].filter(Boolean);
            
            threadMessages = db.prepare(`
                SELECT DISTINCT id as row_id, rfc822_id as msg_id, from_addr as sender, account, subject, date_sent as date, 
                       SUBSTR(body, 1, 250) as body,
                       mbox_source as source_file, zip_source as zip_path, locker_source
                FROM emails
                WHERE rfc822_id = ? 
                   OR in_reply_to = ? 
                   OR refs LIKE ?
                   OR rfc822_id IN (${relatedIds.map(() => '?').join(',')})
                ORDER BY date_sent ASC
            `).all(
                anchorId, 
                anchorId, 
                `%${anchorId}%`,
                ...relatedIds
            );
        }

        // 3. Fallback: If we didn't find much, or if metadata is sparse, use subject matching
        // But only if we have at least a base subject
        const base = baseSubject(anchor.subject);
        if (threadMessages.length <= 1 && base) {
             console.log(`[API] Forensic metadata sparse, falling back to subject: ${base}`);
             const subjectMatches = db.prepare(`
                SELECT DISTINCT id as row_id, rfc822_id as msg_id, from_addr as sender, account, subject, date_sent as date, 
                       SUBSTR(body, 1, 250) as body,
                       mbox_source as source_file, zip_source as zip_path, locker_source
                FROM emails
                WHERE subject LIKE ?
                ORDER BY date_sent ASC
            `).all(`%${base}`);
            
            // Merge results (set handles uniqueness if needed, but and/or in query might be better)
            // For now just swap if forensic found nothing better
            if (subjectMatches.length > threadMessages.length) {
                threadMessages = subjectMatches;
            }
        }

        return NextResponse.json({
            anchor_msg_id: id,
            base_subject: base,
            thread: threadMessages,
            count: threadMessages.length,
            threading_method: threadMessages.length > 1 && hasForensic ? "forensic" : "subject_fallback"
        });
    } catch (error) {
        console.error("Thread API error:", error);
        return NextResponse.json(
            { error: "Failed to fetch thread" },
            { status: 500 }
        );
    }
}

