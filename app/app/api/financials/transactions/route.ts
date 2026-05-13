import { NextRequest, NextResponse } from "next/server";
import { getWorkbenchDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const ALLOWED_TRANSACTION_UPDATE_FIELDS = new Set([
    "player_id",
    "user_label_override",
    "final_account_id",
    "notes",
    "tags",
    "review_status",
    "flag_reason",
    "master_id",
    "verification_status",
    "rosetta_user",
    "rosetta_account",
    "rosetta_category",
    "rosetta_company",
    "match_score",
    "match_reason",
    "nc_flag",
    "evidence_url",
]);

function ensureStatementTransactionSchema(db: any) {
    const info = db.pragma("table_info(statement_transactions)") as any[];
    const columnNames = info.map((c: any) => c.name);
    if (!columnNames.includes("user_label_override")) {
        db.prepare("ALTER TABLE statement_transactions ADD COLUMN user_label_override TEXT").run();
    }
}

/**
 * GET /api/financials/transactions?session_id=...
 * Returns transactions for a specific import session for review.
 */
export async function GET(req: NextRequest) {
    try {
        const db = getWorkbenchDb();
        ensureStatementTransactionSchema(db);
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
            ORDER BY id ASC
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
        ensureStatementTransactionSchema(db);

        if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
            return NextResponse.json({ error: "updates object required" }, { status: 400 });
        }
        
        const fields = Object.keys(updates);
        if (fields.length === 0) {
            return NextResponse.json({ error: "No updates provided" }, { status: 400 });
        }

        const invalidFields = fields.filter(f => !ALLOWED_TRANSACTION_UPDATE_FIELDS.has(f));
        if (invalidFields.length > 0) {
            return NextResponse.json({
                error: "Unsupported update field(s)",
                fields: invalidFields
            }, { status: 400 });
        }

        // Prepare whitelisted dynamic update query
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
