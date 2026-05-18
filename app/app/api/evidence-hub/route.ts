import { NextRequest, NextResponse } from "next/server";
import { getEvidenceHubDb, getImessageDb, getCommDb } from "@/lib/db";

export const dynamic = "force-dynamic";

interface CountRow { total: number }

/* ─── Email body cleaner ─── */
function cleanEmailBody(body: string | null, bodySingle: string | null): string {
    // Prefer body_single (first-message-only) if available
    let text = (bodySingle || body || "").trim();
    if (!text) return "";

    // Remove "On ... wrote:" reply headers and everything after if it's a quote block
    text = text.replace(/^On [\s\S]*?wrote:\s*$/gm, "");

    // Remove quoted lines (> prefix)
    text = text.replace(/^>.*$/gm, "");

    // Remove signature blocks (-- followed by content)
    text = text.replace(/^--\s*\n[\s\S]*$/m, "");

    // Remove horizontal rule separators (common sig/footer delimiters)
    text = text.replace(/^[_]{3,}[\s\S]*$/m, "");
    text = text.replace(/^[-]{3,}[\s\S]*$/m, "");
    text = text.replace(/^[=]{3,}[\s\S]*$/m, "");

    // Remove "Sent from my ..." footers
    text = text.replace(/^Sent from .+$/gmi, "");

    // Remove legal disclaimers / confidentiality notices
    text = text.replace(/^\s*[-–—]?\s*(Confidential|NOTICE|DISCLAIMER|This email|This message|CONFIDENTIALITY)[\s\S]*$/mi, "");

    // Remove "---------- Forwarded message ----------" blocks
    text = text.replace(/^-+\s*Forwarded message\s*-+[\s\S]*?^$/gmi, "");

    // Collapse excessive blank lines
    text = text.replace(/\n{3,}/g, "\n\n");

    return text.trim();
}

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const q = url.searchParams.get("q") || "";
        const page = parseInt(url.searchParams.get("page") || "1", 10);
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);
        const sourceType = url.searchParams.get("source_type") || "";
        const participant = url.searchParams.get("participant") || "";
        const dateFrom = url.searchParams.get("date_from") || "";
        const dateTo = url.searchParams.get("date_to") || "";
        const tag = url.searchParams.get("tag") || "";
        const excludeLabels = (url.searchParams.get("exclude_labels") || "").split(",").map(s => s.trim()).filter(Boolean);
        const mode = url.searchParams.get("mode") || "list"; // list | stats | detail
        const evidenceId = url.searchParams.get("id") || "";
        const offset = (page - 1) * limit;
        const sortDir = (url.searchParams.get("sort_dir") || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";

        // Build exclude clause for tags
        const excludeClause = excludeLabels.map(() => "AND e.tags NOT LIKE ?").join(" ");
        const excludeParams = excludeLabels.map(l => `%${l}%`);

        const db = getEvidenceHubDb();
        const chatDb = getImessageDb();
        const mboxDb = getCommDb();

        // ── Stats mode ──
        if (mode === "stats") {
            const totalEvidence = db.prepare("SELECT COUNT(*) as total FROM evidence").get() as CountRow;
            const totalMessages = chatDb.prepare("SELECT COUNT(*) as total FROM message").get() as CountRow;
            const totalEmails = mboxDb.prepare("SELECT COUNT(*) as total FROM emails").get() as CountRow;

            return NextResponse.json({
                total: (totalEvidence?.total || 0) + (totalMessages?.total || 0) + (totalEmails?.total || 0),
                sources: [
                    { source_type: "imessage", count: totalMessages.total },
                    { source_type: "gmail", count: totalEmails.total }
                ],
                participants: [], // Will populate if requested
                origins: [],
                tags: [],
            });
        }

        // ── Detail mode ──
        if (mode === "detail" && evidenceId) {
            const idNum = parseInt(evidenceId, 10);
            if (isNaN(idNum)) {
                return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
            }

            // iMessage detail — fetch from chat_case_only.db
            if (sourceType === "imessage") {
                const msg = chatDb.prepare(`
                    SELECT
                        m.ROWID as id,
                        m.guid as canonical_id,
                        'imessage' as source_type,
                        CASE WHEN m.is_from_me = 1
                            THEN 'JZ → Lucas Guariglia'
                            ELSE 'Lucas Guariglia → JZ'
                        END as title,
                        m.text as body_snippet,
                        m.text as summary,
                        datetime(m.date_utc, 'unixepoch', 'localtime') as start_timestamp,
                        '["chat", "key_players"]' as tags,
                        m.is_from_me,
                        h.id as handle_id_str,
                        m.service as extra
                    FROM messages m
                    LEFT JOIN handle h ON h.id = m.contact_name
                    WHERE m.ROWID = ?
                `).get(idNum) as any;

                if (!msg) {
                    return NextResponse.json({ error: "iMessage not found" }, { status: 404 });
                }

                const participants = [
                    { identifier: "+17736109104", normalized_identifier: "Joseph Zangrilli", role: msg.is_from_me ? "sender" : "recipient" },
                ];
                if (msg.handle_id_str) {
                    participants.push({ identifier: msg.handle_id_str, normalized_identifier: msg.handle_id_str, role: msg.is_from_me ? "recipient" : "sender" });
                }

                return NextResponse.json({
                    evidence: msg,
                    participants,
                    provenance: [{ origin_system: "CHAT_DB_IMAC_2013", source_file: "data/IMESSAGE_LOCKER/Messages/chat_case_only.db", source_rowid: idNum, created_at: msg.start_timestamp }]
                });
            }

            // Default detail — fetch from evidence_hub.db
            const evidence = db.prepare(`
                SELECT e.*, GROUP_CONCAT(DISTINCT eo.origin_system || ':' || eo.source_file) as origins
                FROM evidence e
                LEFT JOIN evidence_origins eo ON eo.evidence_id = e.id
                WHERE e.id = ?
                GROUP BY e.id
            `).get(idNum) as any;

            if (!evidence) {
                return NextResponse.json({ error: "Evidence not found" }, { status: 404 });
            }

            const participants = db.prepare(`
                SELECT p.identifier, p.normalized_identifier, ep.role
                FROM evidence_participants ep
                JOIN participants p ON p.id = ep.participant_id
                WHERE ep.evidence_id = ?
                ORDER BY ep.role
            `).all(idNum);

            const provenance = db.prepare(`
                SELECT origin_system, source_file, source_rowid, imported_at as created_at
                FROM evidence_origins
                WHERE evidence_id = ?
            `).all(idNum);

            return NextResponse.json({ evidence, participants, provenance });
        }

        // ── Thread mode — resolve full email chain ──
        if (mode === "thread") {
            const messageId = url.searchParams.get("message_id") || "";
            if (!messageId) {
                return NextResponse.json({ error: "message_id required" }, { status: 400 });
            }

            // Find the seed email and its refs chain
            const seedEmail = mboxDb.prepare(`
                SELECT rfc822_id, refs, in_reply_to, subject
                FROM emails WHERE rfc822_id = ? LIMIT 1
            `).get(messageId) as any;

            if (!seedEmail) {
                return NextResponse.json({ error: "Email not found in mbox_metadata.db" }, { status: 404 });
            }

            // Collect all Message-IDs in the thread
            const threadIds = new Set<string>();
            threadIds.add(messageId);

            // refs contains space-separated Message-IDs for the entire thread
            if (seedEmail.refs) {
                seedEmail.refs.split(/\s+/).filter(Boolean).forEach((id: string) => threadIds.add(id));
            }
            if (seedEmail.in_reply_to) {
                threadIds.add(seedEmail.in_reply_to);
            }

            // Expand: find all emails that reference any of these IDs (catches forks)
            if (threadIds.size > 0) {
                const idsArr = Array.from(threadIds);
                const placeholders = idsArr.map(() => "?").join(",");

                // Find emails whose rfc822_id, in_reply_to, or refs contain any of these IDs
                const related = mboxDb.prepare(`
                    SELECT DISTINCT rfc822_id, refs, in_reply_to
                    FROM emails
                    WHERE rfc822_id IN (${placeholders})
                       OR in_reply_to IN (${placeholders})
                `).all(...idsArr, ...idsArr) as any[];

                for (const r of related) {
                    threadIds.add(r.rfc822_id);
                    if (r.refs) r.refs.split(/\s+/).filter(Boolean).forEach((id: string) => threadIds.add(id));
                    if (r.in_reply_to) threadIds.add(r.in_reply_to);
                }
            }

            // Fetch full email data for all thread members
            const allIds = Array.from(threadIds);
            const ph = allIds.map(() => "?").join(",");
            const threadEmails = mboxDb.prepare(`
                SELECT rfc822_id, from_addr, to_addr, cc_addr, subject,
                       date_sent, body, body_single, account
                FROM emails
                WHERE rfc822_id IN (${ph})
                ORDER BY date_sent ASC
            `).all(...allIds) as any[];

            // Deduplicate by rfc822_id (same email may exist in multiple accounts)
            const seen = new Set<string>();
            const deduped = threadEmails.filter((e: any) => {
                if (seen.has(e.rfc822_id)) return false;
                seen.add(e.rfc822_id);
                return true;
            });

            // Clean bodies and build response
            const thread = deduped.map((e: any) => ({
                rfc822_id: e.rfc822_id,
                from_addr: e.from_addr,
                to_addr: e.to_addr,
                cc_addr: e.cc_addr,
                subject: e.subject,
                date_sent: e.date_sent,
                account: e.account,
                cleaned_body: cleanEmailBody(e.body, e.body_single),
            }));

            return NextResponse.json({
                thread,
                thread_count: thread.length,
                seed_message_id: messageId,
                seed_subject: seedEmail.subject,
            });
        }
        // ── FTS5 search (evidence_hub.db — emails & evidence cards only) ──
        // Skip for iMessage source — handled by chat_case_only.db below
        if (q && sourceType !== "imessage") {
            // Minimum query length to avoid full-table-scan FTS queries
            if (q.trim().length < 3) {
                return NextResponse.json({
                    results: [],
                    total: 0,
                    page,
                    totalPages: 0,
                    error: "Search query must be at least 3 characters"
                });
            }
            try {
                const ftsQuery = /[^a-zA-Z0-9\s@._-]/.test(q) ? `"${q}"` : q;

                let extraWhere = "";
                const extraParams: string[] = [];

                if (sourceType) {
                    extraWhere += " AND e.source_type = ?";
                    extraParams.push(sourceType);
                }
                if (tag) {
                    extraWhere += " AND e.tags LIKE ?";
                    extraParams.push(`%${tag}%`);
                }
                if (dateFrom) {
                    extraWhere += " AND e.start_timestamp >= ?";
                    extraParams.push(dateFrom);
                }
                if (dateTo) {
                    extraWhere += " AND e.start_timestamp <= ?";
                    extraParams.push(dateTo);
                }

                const countRow = db.prepare(`
                    SELECT COUNT(*) as total
                    FROM evidence_fts f
                    JOIN evidence e ON e.id = f.rowid
                    WHERE evidence_fts MATCH ? ${extraWhere} ${excludeClause}
                `).get(ftsQuery, ...extraParams, ...excludeParams) as CountRow;

                const rows = db.prepare(`
                    SELECT e.id, e.canonical_id, e.source_type, e.title, e.summary,
                           substr(e.body_snippet, 1, 200) as preview,
                           e.start_timestamp, e.tags, e.primary_ids
                    FROM evidence_fts f
                    JOIN evidence e ON e.id = f.rowid
                    WHERE evidence_fts MATCH ? ${extraWhere} ${excludeClause}
                    ORDER BY rank
                    LIMIT ? OFFSET ?
                `).all(ftsQuery, ...extraParams, ...excludeParams, limit, offset);

                return NextResponse.json({
                    results: rows,
                    total: countRow.total,
                    page, limit,
                    totalPages: Math.ceil(countRow.total / limit),
                    searchMode: "fts5",
                });
            } catch {
                // Fall through to LIKE
            }
        }

        // ── Filtered list / LG focal search ──
        if (sourceType === "imessage" || (q && q.toLowerCase().includes("guariglia"))) {
            // Query chat_case_only.db with dynamic filters
            let chatWhere = "WHERE 1=1";
            const chatParams: (string | number)[] = [];

            // Contact filter — filter by the message's handle name
            if (participant) {
                const groups = participant.split("|").map(g => g.split(",").map((s: string) => s.trim()).filter(Boolean)).filter(g => g.length > 0);
                const allIds = groups.flat();
                const placeholders = allIds.map(() => "h.id LIKE ?").join(" OR ");
                chatWhere += ` AND (${placeholders})`;
                allIds.forEach(id => chatParams.push(`%${id}%`));
            }

            // Date filters — date_utc is Unix seconds
            if (dateFrom) {
                chatWhere += ` AND datetime(m.date_utc, 'unixepoch', 'localtime') >= ?`;
                chatParams.push(dateFrom);
            }
            if (dateTo) {
                // Add 1 day to make the "To" date inclusive (end of day)
                chatWhere += ` AND datetime(m.date_utc, 'unixepoch', 'localtime') < date(?, '+1 day')`;
                chatParams.push(dateTo);
            }

            // Text search
            if (q) {
                chatWhere += " AND m.text LIKE ?";
                chatParams.push(`%${q}%`);
            }

            const rows = chatDb.prepare(`
                SELECT 
                    m.ROWID as id,
                    m.guid as canonical_id,
                    'imessage' as source_type,
                    CASE WHEN m.is_from_me = 1
                        THEN 'JZ → ' || COALESCE(h.id, 'Unknown')
                        ELSE COALESCE(h.id, 'Unknown') || ' → JZ'
                    END as title,
                    substr(m.text, 1, 100) as summary,
                    m.text as preview,
                    datetime(m.date_utc, 'unixepoch', 'localtime') as start_timestamp,
                    '["chat", "key_players"]' as tags,
                    m.is_from_me,
                    COALESCE(h.id, 'Unknown') as handle_id
                FROM messages m
                LEFT JOIN handle h ON h.id = m.contact_name
                ${chatWhere}
                ORDER BY m.date_utc ${sortDir}
                LIMIT ? OFFSET ?
            `).all(...chatParams, limit, offset);

            const countRow = chatDb.prepare(`
                SELECT COUNT(*) as total
                FROM messages m
                LEFT JOIN handle h ON h.id = m.contact_name
                ${chatWhere}
            `).get(...chatParams) as CountRow;

            return NextResponse.json({
                results: rows,
                total: countRow.total,
                page, limit,
                totalPages: Math.ceil(countRow.total / limit),
                searchMode: "official_chatdb",
            });
        }

        // Fallback for other filters / Evidence Hub
        let where = "WHERE 1=1";
        const params: (string | number)[] = [];

        if (sourceType) {
            where += " AND e.source_type = ?";
            params.push(sourceType);
        }
        if (tag) {
            where += " AND e.tags LIKE ?";
            params.push(`%${tag}%`);
        }
        if (dateFrom) {
            where += " AND e.start_timestamp >= ?";
            params.push(dateFrom);
        }
        if (dateTo) {
            where += " AND e.start_timestamp <= ?";
            params.push(dateTo);
        }
        if (participant) {
            const groups = participant.split("|").map(g => g.split(",").map((s: string) => s.trim()).filter(Boolean)).filter(g => g.length > 0);
            if (groups.length === 1) {
                const ids = groups[0];
                const placeholders = ids.map(() => "p.normalized_identifier LIKE ?").join(" OR ");
                where += ` AND e.id IN (
                    SELECT ep.evidence_id FROM evidence_participants ep
                    JOIN participants p ON p.id = ep.participant_id
                    WHERE ${placeholders}
                )`;
                ids.forEach(id => params.push(`%${id}%`));
            } else if (groups.length > 1) {
                const subqueries = groups.map(ids => {
                    const placeholders = ids.map(() => "p.normalized_identifier LIKE ?").join(" OR ");
                    ids.forEach(id => params.push(`%${id}%`));
                    return `SELECT ep.evidence_id FROM evidence_participants ep
                            JOIN participants p ON p.id = ep.participant_id
                            WHERE ${placeholders}`;
                });
                where += ` AND e.id IN (${subqueries.join(" INTERSECT ")})`;
            }
        }
        if (q) {
            where += " AND (e.title LIKE ? OR e.summary LIKE ? OR e.body_snippet LIKE ?)";
            const pattern = `%${q}%`;
            params.push(pattern, pattern, pattern);
        }

        // Apply exclude_labels to the fallback query
        for (const label of excludeLabels) {
            where += " AND e.tags NOT LIKE ?";
            params.push(`%${label}%`);
        }

        const countRow = db.prepare(
            `SELECT COUNT(*) as total FROM evidence e ${where}`
        ).get(...params) as CountRow;

        const rows = db.prepare(`
            SELECT e.id, e.canonical_id, e.source_type, e.title, e.summary,
                   substr(e.body_snippet, 1, 200) as preview,
                   e.start_timestamp, e.tags, e.primary_ids
            FROM evidence e ${where}
            ORDER BY e.start_timestamp ${sortDir}
            LIMIT ? OFFSET ?
        `).all(...params, limit, offset);

        return NextResponse.json({
            results: rows,
            total: countRow.total,
            page, limit,
            totalPages: Math.ceil(countRow.total / limit),
            searchMode: q ? "like" : "filter",
        });

    } catch (error) {
        console.error("Evidence Hub API error:", error);
        return NextResponse.json(
            { error: "Failed to fetch evidence" },
            { status: 500 }
        );
    }
}
