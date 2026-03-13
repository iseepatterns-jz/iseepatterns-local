import { NextRequest, NextResponse } from "next/server";
import { getEvidenceHubDb, getImessageDb, getCommDb } from "@/lib/db";

export const dynamic = "force-dynamic";

interface CountRow { total: number }

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
        const mode = url.searchParams.get("mode") || "list"; // list | stats | detail
        const evidenceId = url.searchParams.get("id") || "";
        const offset = (page - 1) * limit;

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

        // ── FTS5 search ──
        if (q) {
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
                    WHERE evidence_fts MATCH ? ${extraWhere}
                `).get(ftsQuery, ...extraParams) as CountRow;

                const rows = db.prepare(`
                    SELECT e.id, e.canonical_id, e.source_type, e.title, e.summary,
                           substr(e.body_snippet, 1, 200) as preview,
                           e.start_timestamp, e.tags, e.primary_ids
                    FROM evidence_fts f
                    JOIN evidence e ON e.id = f.rowid
                    WHERE evidence_fts MATCH ? ${extraWhere}
                    ORDER BY rank
                    LIMIT ? OFFSET ?
                `).all(ftsQuery, ...extraParams, limit, offset);

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
            // Lucas Guariglia (8478280944) and Joseph Zangrilli (7736109104)
            // chat_id 2288, 2289 are confirmed to be their threads
            const rows = chatDb.prepare(`
                SELECT 
                    m.ROWID as id,
                    m.guid as canonical_id,
                    'imessage' as source_type,
                    'iMessage with ' || CASE WHEN m.is_from_me = 1 THEN 'Joseph Zangrilli' ELSE 'Lucas Guariglia' END as title,
                    substr(m.text, 1, 100) as summary,
                    m.text as preview,
                    datetime((m.date / 1000000000) + strftime('%s','2001-01-01'), 'unixepoch', 'localtime') as start_timestamp,
                    '["chat", "key_players"]' as tags
                FROM message m
                JOIN chat_message_join cmj ON cmj.message_id = m.ROWID
                WHERE cmj.chat_id IN (2288, 2289)
                AND (m.text LIKE ? OR 1=1) -- Filter if q provided
                ORDER BY m.date DESC
                LIMIT ? OFFSET ?
            `).all(`%${q}%`, limit, offset);

            const countRow = chatDb.prepare(`
                SELECT COUNT(*) as total
                FROM message m
                JOIN chat_message_join cmj ON cmj.message_id = m.ROWID
                WHERE cmj.chat_id IN (2288, 2289)
                AND (m.text LIKE ? OR 1=1)
            `).get(`%${q}%`) as CountRow;

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
            where += ` AND e.id IN (
                SELECT ep.evidence_id FROM evidence_participants ep
                JOIN participants p ON p.id = ep.participant_id
                WHERE p.normalized_identifier LIKE ?
            )`;
            params.push(`%${participant}%`);
        }
        if (q) {
            where += " AND (e.title LIKE ? OR e.summary LIKE ? OR e.body_snippet LIKE ?)";
            const pattern = `%${q}%`;
            params.push(pattern, pattern, pattern);
        }

        const countRow = db.prepare(
            `SELECT COUNT(*) as total FROM evidence e ${where}`
        ).get(...params) as CountRow;

        const rows = db.prepare(`
            SELECT e.id, e.canonical_id, e.source_type, e.title, e.summary,
                   substr(e.body_snippet, 1, 200) as preview,
                   e.start_timestamp, e.tags, e.primary_ids
            FROM evidence e ${where}
            ORDER BY e.start_timestamp DESC
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
