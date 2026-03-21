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
    const handles = db
        .prepare(
            `SELECT h.id as handle_id, COUNT(*) as cnt
             FROM message m
             JOIN handle h ON h.ROWID = m.handle_id
             GROUP BY h.id
             ORDER BY cnt DESC`
        )
        .all();
    cachedHandles = { data: handles, ts: Date.now() };
    return handles;
}

/**
 * Apple iMessage timestamps use Cocoa epoch (2001-01-01).
 * date column is in nanoseconds since that epoch.
 */
const APPLE_DATE_EXPR = `datetime((m.date / 1000000000) + strftime('%s','2001-01-01'), 'unixepoch', 'localtime')`;

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
                            ${APPLE_DATE_EXPR} as date_utc,
                            COALESCE(m.text, m.decodedBody) as body,
                            m.service,
                            m.guid
                     FROM message m
                     LEFT JOIN handle h ON h.ROWID = m.handle_id
                     WHERE COALESCE(m.text, m.decodedBody) IS NOT NULL
                       AND COALESCE(m.text, m.decodedBody) != ''
                       AND ${APPLE_DATE_EXPR} BETWEEN datetime(?, '-7 days') AND datetime(?, '+7 days')
                     ORDER BY ABS(julianday(${APPLE_DATE_EXPR}) - julianday(?))
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
            whereClause += " AND COALESCE(m.text, m.decodedBody) LIKE ?";
            params.push(`%${q}%`);
        }

        if (handle) {
            whereClause += " AND h.id LIKE ?";
            params.push(`%${handle}%`);
        }

        const countRow = db
            .prepare(
                `SELECT COUNT(*) as total
                 FROM message m
                 LEFT JOIN handle h ON h.ROWID = m.handle_id
                 ${whereClause}`
            )
            .get(...params) as { total: number };

        const rows = db
            .prepare(
                `SELECT m.ROWID as id,
                        COALESCE(h.id, 'Unknown') as handle_id,
                        m.is_from_me,
                        ${APPLE_DATE_EXPR} as date_utc,
                        COALESCE(m.text, m.decodedBody) as body,
                        m.service,
                        m.guid
                 FROM message m
                 LEFT JOIN handle h ON h.ROWID = m.handle_id
                 ${whereClause}
                 ORDER BY m.date DESC
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
