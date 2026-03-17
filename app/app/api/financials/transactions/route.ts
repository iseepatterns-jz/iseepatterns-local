import { NextRequest, NextResponse } from "next/server";
import { getWorkbenchDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/financials/transactions?session_id=...
 * Returns transactions for a specific import session for review.
 */
export async function GET(req: NextRequest) {
    try {
        const db = getWorkbenchDb();
        const url = req.nextUrl;
        const sessionId = url.searchParams.get("session_id");

        if (!sessionId) {
            return NextResponse.json({ error: "session_id required" }, { status: 400 });
        }

        // Fetch transactions
        const transactions = db.prepare(`
            SELECT *
            FROM statement_transactions
            WHERE import_session_id = ?
            ORDER BY date ASC, id ASC
        `).all(sessionId);

        return NextResponse.json(transactions);
    } catch (error) {
        return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
    }
}

/**
 * PATCH /api/financials/transactions
 * Bulk update transactions (Status, Player, Account, Notes).
 */
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { ids, updates } = body; // ids = array of transaction IDs, updates = object

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "ids array required" }, { status: 400 });
        }

        const db = getWorkbenchDb();
        
        // Prepare dynamic update query
        const fields = Object.keys(updates);
        if (fields.length === 0) {
            return NextResponse.json({ error: "No updates provided" }, { status: 400 });
        }

        const setClause = fields.map(f => `${f} = ?`).join(", ");
        const query = `UPDATE statement_transactions SET ${setClause}, updated_at = datetime('now') WHERE id = ?`;
        const stmt = db.prepare(query);
        
        const values = fields.map(f => updates[f]);

        // Bulk update in a transaction
        const updateAll = db.transaction((idList: number[]) => {
            for (const id of idList) {
                stmt.run(...values, id);
            }
        });

        updateAll(ids);

        return NextResponse.json({ success: true, count: ids.length });

    } catch (error) {
        console.error("Bulk update error:", error);
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
}
