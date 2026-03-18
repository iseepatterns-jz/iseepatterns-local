import { NextRequest, NextResponse } from "next/server";
import { getWorkbenchDb } from "@/lib/db";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

function ensureSchemas(db: ReturnType<typeof getWorkbenchDb>) {
    const PROJECT_ROOT = "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1";
    for (const schema of ["financials.sql", "tax_returns.sql"]) {
        const p = path.join(PROJECT_ROOT, "schemas", schema);
        if (fs.existsSync(p)) {
            db.exec(fs.readFileSync(p, "utf-8"));
        }
    }
}

/**
 * GET /api/financials?view=transactions|accounts|taxes|summary
 */
export async function GET(req: NextRequest) {
    try {
        const db = getWorkbenchDb();
        ensureSchemas(db);

        const url = req.nextUrl;
        const view = url.searchParams.get("view") || "summary";
        const year = url.searchParams.get("year") || "";
        const q = url.searchParams.get("q") || "";
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10), 500);
        const page = parseInt(url.searchParams.get("page") || "1", 10);
        const offset = (page - 1) * limit;

        if (view === "summary") {
            // Aggregate stats
            let totalDebits = 0, totalCredits = 0;
            let txnCount = 0, acctCount = 0, taxCount = 0;
            try {
                const txn = db.prepare("SELECT COUNT(*) as c FROM transactions").get() as { c: number } | null;
                const acct = db.prepare("SELECT COUNT(*) as c FROM accounts").get() as { c: number } | null;
                const tax = db.prepare("SELECT COUNT(*) as c FROM tax_returns").get() as { c: number } | null;
                txnCount = txn?.c || 0;
                acctCount = acct?.c || 0;
                taxCount = tax?.c || 0;

                const debits = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE amount < 0").get() as { total: number };
                const credits = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE amount > 0").get() as { total: number };
                totalDebits = debits.total;
                totalCredits = credits.total;
            } catch (e) { 
                console.warn("Summary data fetch error (likely missing tables):", e);
            }

            // Tax years available
            let taxYears: number[] = [];
            try {
                taxYears = (db.prepare("SELECT DISTINCT tax_year FROM tax_returns ORDER BY tax_year").all() as { tax_year: number }[])
                    .map(r => r.tax_year);
            } catch { /* */ }

            return NextResponse.json({
                view: "summary",
                transactions: txnCount,
                accounts: acctCount,
                taxReturns: taxCount,
                totalDebits,
                totalCredits,
                taxYears,
            });
        }

        if (view === "taxes") {
            let where = "WHERE 1=1";
            const params: (string | number)[] = [];
            if (year) { where += " AND tax_year = ?"; params.push(parseInt(year, 10)); }

            const rows = db.prepare(
                `SELECT * FROM tax_returns ${where} ORDER BY tax_year DESC LIMIT ? OFFSET ?`
            ).all(...params, limit, offset);

            const total = db.prepare(`SELECT COUNT(*) as c FROM tax_returns ${where}`).get(...params) as { c: number };

            // K-1 details for each return
            const detailed = (rows as Record<string, unknown>[]).map(row => {
                const k1s = db.prepare(
                    "SELECT * FROM tax_k1_details WHERE filing_id = ?"
                ).all(row.filing_id);
                return { ...row, k1Details: k1s };
            });

            return NextResponse.json({
                view: "taxes",
                results: detailed,
                total: total.c,
                page, limit,
            });
        }

        if (view === "transactions") {
            let where = "WHERE 1=1";
            const params: (string | number)[] = [];
            if (q) {
                where += " AND (description LIKE ? OR counterparty LIKE ? OR memo LIKE ?)";
                params.push(`%${q}%`, `%${q}%`, `%${q}%`);
            }
            if (year) {
                where += " AND date LIKE ?";
                params.push(`${year}%`);
            }

            const rows = db.prepare(
                `SELECT * FROM transactions ${where} ORDER BY date DESC LIMIT ? OFFSET ?`
            ).all(...params, limit, offset);

            const total = db.prepare(`SELECT COUNT(*) as c FROM transactions ${where}`).get(...params) as { c: number };

            return NextResponse.json({
                view: "transactions",
                results: rows,
                total: total.c,
                page, limit,
            });
        }

        if (view === "accounts") {
            const rows = db.prepare("SELECT * FROM accounts ORDER BY institution").all();
            return NextResponse.json({ view: "accounts", results: rows });
        }

        return NextResponse.json({ error: "Unknown view" }, { status: 400 });
    } catch (error) {
        console.error("Financials API error:", error);
        return NextResponse.json(
            { error: "Failed to fetch financials" },
            { status: 500 }
        );
    }
}
