import { NextRequest, NextResponse } from "next/server";
import { getCommDb } from "@/lib/db";
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
        .prepare(`SELECT handle_id, COUNT(*) as cnt FROM imessages GROUP BY handle_id ORDER BY cnt DESC`)
        .all();
    cachedHandles = { data: handles, ts: Date.now() };
    return handles;
}

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const q = url.searchParams.get("q") || "";
        const handle = url.searchParams.get("handle") || "";
        const page = parseInt(url.searchParams.get("page") || "1", 10);
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);
        const nearDate = url.searchParams.get("near_date") || "";
        const offset = (page - 1) * limit;

        const db = getCommDb();

        // ── Temporal proximity mode (bounded range instead of full scan) ──
        if (nearDate) {
            const rows = db
                .prepare(
                    `SELECT id, handle_id, is_from_me, date_utc, body, service,
                    chat_identifier, source_db, device, guid
             FROM imessages
             WHERE body IS NOT NULL AND body != ''
               AND date_utc BETWEEN datetime(?, '-7 days') AND datetime(?, '+7 days')
             ORDER BY ABS(julianday(date_utc) - julianday(?))
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
            whereClause += " AND body LIKE ?";
            params.push(`%${q}%`);
        }

        if (handle) {
            whereClause += " AND handle_id LIKE ?";
            params.push(`%${handle}%`);
        }

        const countRow = db
            .prepare(`SELECT COUNT(*) as total FROM imessages ${whereClause}`)
            .get(...params) as { total: number };

        const rows = db
            .prepare(
                `SELECT id, handle_id, is_from_me, date_utc, body, service,
                chat_identifier, source_db, device, guid, has_attachments
         FROM imessages ${whereClause}
         ORDER BY date_utc DESC
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

