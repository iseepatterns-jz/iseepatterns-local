import { NextRequest, NextResponse } from "next/server";
import { getEvidenceHubDb } from "@/lib/db";

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

        // ── Stats mode ──
        if (mode === "stats") {
            const totalRow = db.prepare("SELECT COUNT(*) as total FROM evidence").get() as CountRow;
            const sourceBreakdown = db.prepare(
                "SELECT source_type, COUNT(*) as count FROM evidence GROUP BY source_type ORDER BY count DESC"
            ).all();
            const participantTop = db.prepare(`
                SELECT p.normalized_identifier as id, COUNT(ep.evidence_id) as count
                FROM participants p
                JOIN evidence_participants ep ON ep.participant_id = p.id
                GROUP BY p.id ORDER BY count DESC LIMIT 15
            `).all();
            const originBreakdown = db.prepare(
                "SELECT origin_system, COUNT(*) as count FROM evidence_origins GROUP BY origin_system ORDER BY count DESC"
            ).all();
            const tagBreakdown = db.prepare(`
                SELECT DISTINCT json_each.value as tag, COUNT(*) as count
                FROM evidence, json_each(evidence.tags)
                WHERE json_valid(evidence.tags)
                GROUP BY json_each.value
                ORDER BY count DESC LIMIT 20
            `).all() || [];

            return NextResponse.json({
                total: totalRow?.total || 0,
                sources: sourceBreakdown || [],
                participants: participantTop || [],
                origins: originBreakdown || [],
                tags: tagBreakdown || [],
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

        // ── Filtered list ──
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
