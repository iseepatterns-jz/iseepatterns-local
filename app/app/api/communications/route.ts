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
                // Sanitize FTS query: wrap in quotes if it contains special chars
                const ftsQuery = /[^a-zA-Z0-9\s@._-]/.test(q) ? `"${q}"` : q;

                const countRow = db
                    .prepare(
                        `SELECT COUNT(*) as total FROM messages_fts WHERE messages_fts MATCH ?`
                    )
                    .get(ftsQuery) as { total: number };

                const rows = db
                    .prepare(
                        `SELECT m.msg_id, m.account, m.sender, m.subject, m.date, m.source_file, m.zip_path, m.client_id, m.case_id
                         FROM messages_fts f
                         JOIN messages m ON m.id = f.rowid
                         WHERE messages_fts MATCH ?
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
            } catch {
                // FTS table doesn't exist or query failed — fall through to LIKE
            }
        }

        // ── LIKE fallback ──
        let whereClause = "WHERE 1=1";
        const params: (string | number)[] = [];

        if (q) {
            whereClause += " AND (subject LIKE ? OR sender LIKE ? OR msg_id LIKE ? OR body LIKE ? OR recipients LIKE ? OR account LIKE ?)";
            const pattern = `%${q}%`;
            params.push(pattern, pattern, pattern, pattern, pattern, pattern);
        }

        if (sender) {
            whereClause += " AND sender LIKE ?";
            params.push(`%${sender}%`);
        }

        // Count total matching
        const countRow = db
            .prepare(`SELECT COUNT(*) as total FROM messages ${whereClause}`)
            .get(...params) as { total: number };

        // Fetch page
        const rows = db
            .prepare(
                `SELECT msg_id, account, sender, subject, date, source_file, zip_path, client_id, case_id
         FROM messages ${whereClause}
         ORDER BY date DESC
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

