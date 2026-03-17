import { NextRequest, NextResponse } from "next/server";
import { getCommDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const q = url.searchParams.get("q") || "";
        const page = parseInt(url.searchParams.get("page") || "1", 10);
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);
        const sender = url.searchParams.get("sender") || "";
        const offset = (page - 1) * limit;

        const db = getCommDb();

        // ── FTS5 fast path (when search query provided) ──
        if (q && !sender) {
            try {
                // Sanitize FTS query
                const ftsQuery = /[^a-zA-Z0-9\s@._-]/.test(q) ? `"${q}"` : q;

                const countRow = db
                    .prepare(
                        `SELECT COUNT(*) as total FROM emails_fts WHERE emails_fts MATCH ?`
                    )
                    .get(ftsQuery) as { total: number };

                const rows = db
                    .prepare(
                        `SELECT m.id as row_id, m.rfc822_id as msg_id, m.account, m.from_addr as sender, m.subject, m.date_sent as date, 
                                m.mbox_source as source_file, m.zip_source as zip_path, m.locker_source,
                                SUBSTR(m.body, 1, 200) as body_snippet
                         FROM emails_fts f
                         JOIN emails m ON m.id = f.rowid
                         WHERE emails_fts MATCH ?
                         ORDER BY rank
                         LIMIT ? OFFSET ?`
                    )
                    .all(ftsQuery, limit, offset);

                return NextResponse.json({
                    results: rows,
                    total: countRow.total,
                    page,
                    limit,
                    totalPages: Math.ceil(countRow.total / limit),
                    searchMode: "fts5",
                });
            } catch (err) {
                console.error("FTS Error:", err);
                // fall through
            }
        }

        // ── LIKE fallback ──
        let whereClause = "WHERE 1=1";
        const params: (string | number)[] = [];

        if (q) {
            whereClause += " AND (subject LIKE ? OR from_addr LIKE ? OR rfc822_id LIKE ? OR body LIKE ? OR to_addr LIKE ? OR account LIKE ?)";
            const pattern = `%${q}%`;
            params.push(pattern, pattern, pattern, pattern, pattern, pattern);
        }

        if (sender) {
            whereClause += " AND from_addr LIKE ?";
            params.push(`%${sender}%`);
        }

        // Count total matching
        const countRow = db
            .prepare(`SELECT COUNT(*) as total FROM emails ${whereClause}`)
            .get(...params) as { total: number };

        // Fetch page
        const rows = db
            .prepare(
                `SELECT id as row_id, rfc822_id as msg_id, account, from_addr as sender, subject, date_sent as date, 
                        mbox_source as source_file, zip_source as zip_path, locker_source,
                        SUBSTR(body, 1, 200) as body_snippet
                 FROM emails ${whereClause}
                 ORDER BY date_sent DESC
                 LIMIT ? OFFSET ?`
            )
            .all(...params, limit, offset);

        return NextResponse.json({
            results: rows,
            total: countRow.total,
            page,
            limit,
            totalPages: Math.ceil(countRow.total / limit),
            searchMode: "like",
        });
    } catch (error) {
        console.error("Communications API error:", error);
        return NextResponse.json(
            { error: "Failed to fetch communications" },
            { status: 500 }
        );
    }
}

