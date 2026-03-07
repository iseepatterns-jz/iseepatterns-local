import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * GET /api/calendar
 *
 * Query params:
 *   page     – page number (default 1)
 *   limit    – results per page (default 50)
 *   q        – search summary text
 *   near_date – ISO-8601 date; returns events closest to this date (temporal correlation mode)
 */
export async function GET(req: NextRequest) {
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page") || 1));
    const limit = Math.min(200, Math.max(1, Number(sp.get("limit") || 50)));
    const q = sp.get("q") || "";
    const nearDate = sp.get("near_date") || "";

    const db = getDb("calendar_events");

    /* ─── Temporal proximity mode ─── */
    if (nearDate) {
        const rows = db
            .prepare(
                `SELECT *, ABS(julianday(start_dt) - julianday(?)) AS delta_days
                 FROM calendar_events
                 ORDER BY delta_days ASC
                 LIMIT ?`
            )
            .all(nearDate, limit);
        return NextResponse.json({ events: rows, mode: "near_date", anchor: nearDate });
    }

    /* ─── Browse / search mode ─── */
    let where = "";
    const params: unknown[] = [];

    if (q) {
        where = "WHERE summary LIKE ?";
        params.push(`%${q}%`);
    }

    const countRow = db
        .prepare(`SELECT COUNT(*) as cnt FROM calendar_events ${where}`)
        .get(...params) as { cnt: number };
    const total = countRow.cnt;
    const pages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    const rows = db
        .prepare(
            `SELECT * FROM calendar_events ${where}
             ORDER BY start_dt DESC
             LIMIT ? OFFSET ?`
        )
        .all(...params, limit, offset);

    return NextResponse.json({ events: rows, total, page, pages });
}
