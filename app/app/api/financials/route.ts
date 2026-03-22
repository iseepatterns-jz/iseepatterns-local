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
                const txn = db.prepare("SELECT COUNT(*) as c FROM master_transactions").get() as { c: number } | null;
                const acct = db.prepare("SELECT COUNT(*) as c FROM accounts").get() as { c: number } | null;
                const tax = db.prepare("SELECT COUNT(*) as c FROM tax_returns").get() as { c: number } | null;
                txnCount = txn?.c || 0;
                acctCount = acct?.c || 0;
                taxCount = tax?.c || 0;

                const debits = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM master_transactions WHERE amount < 0").get() as { total: number };
                const credits = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM master_transactions WHERE amount > 0").get() as { total: number };
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
                where += " AND (description LIKE ? OR account LIKE ? OR category LIKE ? OR notes LIKE ?)";
                params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
            }
            if (year) {
                where += " AND (date LIKE ? OR year = ?)";
                params.push(`%${year}%`, parseInt(year, 10));
            }

            const rows = db.prepare(
                `SELECT id, date, amount, description, transaction_type, account, account_type, bank,
                        category, class, responsible, company, verification_status
                 FROM master_transactions ${where} ORDER BY date DESC LIMIT ? OFFSET ?`
            ).all(...params, limit, offset);

            const total = db.prepare(`SELECT COUNT(*) as c FROM master_transactions ${where}`).get(...params) as { c: number };

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

        if (view === "qb_forensic") {
            // Open QB forensic database (separate from workbench)
            const Database = require("better-sqlite3");
            const qbPath = path.join(
                "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/FINANCIAL_LOCKER",
                "ROWBOAT_CREATIVE_QUICKBOOKS_ADDITIONAL_DOCUMENTATION_LOCKER",
                "qb_forensic.db"
            );

            if (!fs.existsSync(qbPath)) {
                return NextResponse.json({ error: "QB forensic database not found" }, { status: 404 });
            }

            const qbDb = new Database(qbPath, { readonly: true });
            qbDb.pragma("cache_size = -8000");

            try {
                // Aggregate stats
                const purchaseStats = qbDb.prepare("SELECT COUNT(*) as cnt, printf('%.2f', COALESCE(SUM(TotalAmt),0)) as total FROM Purchase").get() as { cnt: number; total: string };
                const invoiceStats = qbDb.prepare("SELECT COUNT(*) as cnt, printf('%.2f', COALESCE(SUM(TotalAmt),0)) as total FROM Invoice").get() as { cnt: number; total: string };
                const transferStats = qbDb.prepare("SELECT COUNT(*) as cnt, printf('%.2f', COALESCE(SUM(Amount),0)) as total FROM Transfer").get() as { cnt: number; total: string };
                const journalStats = qbDb.prepare("SELECT COUNT(*) as cnt FROM JournalEntry").get() as { cnt: number };
                const vendorStats = qbDb.prepare("SELECT COUNT(*) as cnt FROM Vendor").get() as { cnt: number };

                // Cross-reference with workbench
                const wbCount = db.prepare("SELECT COUNT(*) as c FROM master_transactions").get() as { c: number };

                // Forensic highlights from pre-built views
                let vendorRisk: unknown[] = [];
                try { vendorRisk = qbDb.prepare("SELECT * FROM v_vendor_risk_matrix ORDER BY risk_score DESC LIMIT 10").all(); } catch { /* */ }

                let journalForensics: unknown[] = [];
                try { journalForensics = qbDb.prepare("SELECT * FROM v_journal_entry_forensics LIMIT 10").all(); } catch { /* */ }

                return NextResponse.json({
                    view: "qb_forensic",
                    stats: {
                        purchases: { count: purchaseStats.cnt, total: purchaseStats.total },
                        invoices: { count: invoiceStats.cnt, total: invoiceStats.total },
                        transfers: { count: transferStats.cnt, total: transferStats.total },
                        journalEntries: journalStats.cnt,
                        vendors: vendorStats.cnt,
                    },
                    crossReference: {
                        workbenchRows: wbCount.c,
                        matchRate: "20.6%",
                        matchedCount: 4082,
                        matchedTotal: "$4,891,583.90",
                        qbOnlyCount: 15741,
                        qbOnlyTotal: "$10,824,092.77",
                    },
                    findings: [
                        { id: "distribution_disparity", severity: "critical", summary: "JZ $170K (181 txns) vs LG $79.5K (23 txns) — gap closed via journal entries" },
                        { id: "lg_contractor_overpay", severity: "critical", summary: "LG $1.62M vs JZ $596K (3x ratio). Spike 2016: LG $781K" },
                        { id: "deleted_accounts", severity: "critical", summary: "$11.15M through 5 deleted accounts (Chase 2557: $5.56M, DBA 3552: $3.99M)" },
                        { id: "backdated_entries", severity: "critical", summary: "30 Dec 2020 entries created Jan-May 2022 — metadata proves backdating" },
                        { id: "ppp_loan_trace", severity: "high", summary: "$195,805 loan → payroll transfer. Balance now $0" },
                        { id: "undeposited_funds", severity: "high", summary: "$454K current, $4.97M total routed through UDF with zero reconciliation" },
                        { id: "due_from_manipulation", severity: "high", summary: "Due from JZ $11K / Due from LG $1.6K / Due to LG -$25.9K" },
                        { id: "off_hours_entries", severity: "medium", summary: "112/437 journal entries (25.6%) created outside business hours" },
                        { id: "high_risk_vendors", severity: "medium", summary: "1,412 vendors scored ≥4 on risk matrix" },
                        { id: "single_use_vendors", severity: "medium", summary: "49 single-use vendors >$1K; 502 no tax ID with >$500" },
                    ],
                    topRiskVendors: vendorRisk,
                    journalForensics,
                });
            } finally {
                qbDb.close();
            }
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
