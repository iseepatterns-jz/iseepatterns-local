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

/** Clean email body: strip quoted replies, signatures, footers */
function cleanEmailBody(body: string | null): string {
    let text = (body || "").trim();
    if (!text) return "";
    text = text.replace(/^On [\s\S]*?wrote:\s*$/gm, "");
    text = text.replace(/^>.*$/gm, "");
    text = text.replace(/^--\s*\n[\s\S]*$/m, "");
    text = text.replace(/^[_]{3,}[\s\S]*$/m, "");
    text = text.replace(/^[-]{3,}[\s\S]*$/m, "");
    text = text.replace(/^[=]{3,}[\s\S]*$/m, "");
    text = text.replace(/^Sent from .+$/gmi, "");
    text = text.replace(/^\s*[-–—]?\s*(Confidential|NOTICE|DISCLAIMER|This email|This message|CONFIDENTIALITY)[\s\S]*$/mi, "");
    text = text.replace(/^-+\s*Forwarded message\s*-+[\s\S]*?^$/gmi, "");
    text = text.replace(/\n{3,}/g, "\n\n");
    return text.trim();
}

/**
 * Recursively expand thread IDs using indexed lookups only.
 * Each pass: query by rfc822_id IN (...) and in_reply_to IN (...),
 * then harvest new message-IDs from the found rows' refs + in_reply_to.
 * Max 3 passes to avoid runaway expansion.
 */
function resolveThreadIds(db: any, seedIds: string[]): string[] {
    const allIds = new Set<string>(seedIds);
    let frontier = [...seedIds];

    for (let pass = 0; pass < 3 && frontier.length > 0; pass++) {
        const ph = frontier.map(() => '?').join(',');

        // Find emails that match frontier IDs — lightweight query (metadata only)
        const rows = db.prepare(`
            SELECT DISTINCT rfc822_id, in_reply_to, refs
            FROM emails
            WHERE rfc822_id IN (${ph})
               OR in_reply_to IN (${ph})
        `).all(...frontier, ...frontier) as any[];

        // Harvest new IDs
        const newIds: string[] = [];
        for (const r of rows) {
            if (r.rfc822_id && !allIds.has(r.rfc822_id)) {
                allIds.add(r.rfc822_id);
                newIds.push(r.rfc822_id);
            }
            if (r.in_reply_to && !allIds.has(r.in_reply_to)) {
                allIds.add(r.in_reply_to);
                newIds.push(r.in_reply_to);
            }
            if (r.refs) {
                for (const ref of r.refs.split(/\s+/).filter((s: string) => s.length > 5)) {
                    if (!allIds.has(ref)) {
                        allIds.add(ref);
                        newIds.push(ref);
                    }
                }
            }
        }

        frontier = newIds; // Next pass searches only for newly discovered IDs
        if (newIds.length === 0) break;
    }

    return [...allIds];
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
        const base = baseSubject(anchor.subject);

        // 2. Build seed IDs from anchor's forensic metadata
        const seedIds = [anchorId];
        if (anchor.in_reply_to) seedIds.push(anchor.in_reply_to);
        if (anchor.refs) {
            for (const ref of anchor.refs.split(/\s+/).filter((s: string) => s.length > 5)) {
                seedIds.push(ref);
            }
        }
        const uniqueSeeds = [...new Set(seedIds)];

        // 3. Recursive expansion — indexed lookups only, max 3 passes
        const allThreadIds = resolveThreadIds(db, uniqueSeeds);
        console.log(`[API] Thread resolved: ${uniqueSeeds.length} seed IDs → ${allThreadIds.length} total IDs`);

        // 4. Fetch full data for all thread members
        const ph = allThreadIds.map(() => '?').join(',');
        const threadMessages = db.prepare(`
            SELECT DISTINCT id as row_id, rfc822_id as msg_id, from_addr as sender, account, subject, date_sent as date, 
                   SUBSTR(COALESCE(body_single, body), 1, 2000) as cleaned_body_raw,
                   to_addr, cc_addr,
                   mbox_source as source_file, zip_source as zip_path, locker_source
            FROM emails
            WHERE rfc822_id IN (${ph})
               OR in_reply_to IN (${ph})
            ORDER BY date_sent ASC
            LIMIT 100
        `).all(...allThreadIds, ...allThreadIds);

        // 5. Deduplicate by rfc822_id
        const seen = new Set<string>();
        const deduped = threadMessages.filter((m: any) => {
            if (seen.has(m.msg_id)) return false;
            seen.add(m.msg_id);
            return true;
        });

        // 6. Clean bodies
        const enriched = deduped.map((m: any) => ({
            ...m,
            cleaned_body: cleanEmailBody(m.cleaned_body_raw),
            cleaned_body_raw: undefined,
            body: null,
        }));

        const hasForensic = anchor.in_reply_to || anchor.refs;
        return NextResponse.json({
            anchor_msg_id: id,
            base_subject: base,
            thread: enriched,
            count: enriched.length,
            threading_method: hasForensic ? "forensic" : "standalone"
        });
    } catch (error) {
        console.error("Thread API error:", error);
        return NextResponse.json(
            { error: "Failed to fetch thread" },
            { status: 500 }
        );
    }
}
