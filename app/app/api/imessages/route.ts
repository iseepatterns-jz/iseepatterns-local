import { NextRequest, NextResponse } from "next/server";
import { getImessageDb } from "@/lib/db";
import Database from "better-sqlite3";

export const dynamic = "force-dynamic";

/* ── Handles cache (avoids GROUP BY on every browse request) ── */
let cachedHandles: { data: unknown[] | null; ts: number } = { data: null, ts: 0 };
const HANDLE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getHandles(db: Database.Database) {
    if (cachedHandles.data && Date.now() - cachedHandles.ts < HANDLE_CACHE_TTL) {
        return cachedHandles.data;
    }
    // handle.id = contact_name (friendly name from messages base table)
    const handles = db
        .prepare(
            `SELECT h.id as handle_id, COUNT(*) as cnt
             FROM messages m
             JOIN handle h ON h.id = m.contact_name
             GROUP BY h.id
             ORDER BY cnt DESC`
        )
        .all();
    cachedHandles = { data: handles, ts: Date.now() };
    return handles;
}

// DB stores Unix timestamps in date_utc (seconds since 1970).
// Query messages base table; handle VIEW joins on id = contact_name.
const MSG_DATE_EXPR = `datetime(m.date_utc, 'unixepoch', 'localtime')`;

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const q = url.searchParams.get("q") || "";
        const handle = url.searchParams.get("handle") || "";
        const page = parseInt(url.searchParams.get("page") || "1", 10);
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);
        const nearDate = url.searchParams.get("near_date") || "";
        const offset = (page - 1) * limit;

        const db = getImessageDb();

        // ── Temporal proximity mode (bounded range instead of full scan) ──
        if (nearDate) {
            const rows = db
                .prepare(
                    `SELECT m.ROWID as id,
                            COALESCE(h.id, 'Unknown') as handle_id,
                            m.is_from_me,
                            ${MSG_DATE_EXPR} as date_utc,
                            m.text as body,
                            m.service,
                            m.guid
                     FROM messages m
                     JOIN handle h ON h.id = m.contact_name
                     WHERE m.text IS NOT NULL
                       AND m.text != ''
                       AND ${MSG_DATE_EXPR} BETWEEN datetime(?, '-7 days') AND datetime(?, '+7 days')
                     ORDER BY ABS(julianday(${MSG_DATE_EXPR}) - julianday(?))
                     LIMIT ?`
                )
                .all(nearDate, nearDate, nearDate, limit);

            return NextResponse.json({
                results: rows,
                anchor_date: nearDate,
                mode: "temporal_proximity",
            });
        }

        // ── Browse / search mode ──
        let whereClause = "WHERE 1=1";
        const params: (string | number)[] = [];

        if (q) {
            whereClause += " AND m.text LIKE ?";
            params.push(`%${q}%`);
        }

        if (handle) {
            whereClause += " AND h.id LIKE ?";
            params.push(`%${handle}%`);
        }

        const countRow = db
            .prepare(
                `SELECT COUNT(*) as total
                 FROM messages m
                 JOIN handle h ON h.id = m.contact_name
                 ${whereClause}`
            )
            .get(...params) as { total: number };

        const rows = db
            .prepare(
                `SELECT m.ROWID as id,
                        COALESCE(h.id, 'Unknown') as handle_id,
                        m.is_from_me,
                        ${MSG_DATE_EXPR} as date_utc,
                        m.text as body,
                        m.service,
                        m.guid
                 FROM messages m
                 JOIN handle h ON h.id = m.contact_name
                 ${whereClause}
                 ORDER BY m.date_utc DESC
                 LIMIT ? OFFSET ?`
            )
            .all(...params, limit, offset);

        // Only send handles on page 1 (saves work on pagination clicks)
        const handles = page === 1 ? getHandles(db) : undefined;

        return NextResponse.json({
            results: rows,
            total: countRow.total,
            page,
            limit,
            totalPages: Math.ceil(countRow.total / limit),
            ...(handles && { handles }),
        });
    } catch (error) {
        console.error("iMessages API error:", error);
        return NextResponse.json(
            { error: "Failed to fetch iMessages" },
            { status: 500 }
        );
    }
}
