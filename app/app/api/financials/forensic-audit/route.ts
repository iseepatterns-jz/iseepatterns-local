import { NextRequest, NextResponse } from "next/server";
import { getWorkbenchDb } from "@/lib/db";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

interface MonthlyBreakdown {
    session_id: number;
    filename: string;
    month: number;
    trans_count: number;
    matched: number;
    unmatched: number;
    match_pct: string;
}

interface VarianceItem {
    session_id: number;
    date: string;
    description: string;
    amount: number;
}

/**
 * POST /api/financials/forensic-audit
 * Run a forensic integrity audit (variance report) for a given year + bank.
 * Compares imported statement_transactions against master_transactions (Rosetta Stone).
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const year = Number(body.year);
        const bank = (body.bank || "").trim();

        if (!year || isNaN(year) || year < 2000 || year > 2030) {
            return NextResponse.json({ error: "Valid year required (2000-2030)" }, { status: 400 });
        }
        if (!bank) {
            return NextResponse.json({ error: "Bank name required" }, { status: 400 });
        }

        const db = getWorkbenchDb();

        // Ensure schema
        const schemaPath = path.join(
            "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1",
            "schemas",
            "forensic_audit.sql"
        );
        if (fs.existsSync(schemaPath)) {
            db.exec(fs.readFileSync(schemaPath, "utf-8"));
        }

        // 1. Get all import sessions for this year + bank
        //    Filename pattern: YYYYMMDD-statements-ACCT.pdf
        const yearPrefix = String(year);
        const sessions = db.prepare(`
            SELECT s.id, s.transaction_count, s.status, f.original_filename, f.sha256_hash
            FROM import_sessions s
            JOIN statement_files f ON s.statement_file_id = f.id
            WHERE f.original_filename LIKE ? AND LOWER(f.bank_name) LIKE LOWER(?)
            ORDER BY f.original_filename
        `).all(`${yearPrefix}%`, `%${bank}%`) as any[];

        if (sessions.length === 0) {
            return NextResponse.json({
                error: `No import sessions found for ${bank} ${year}. Upload statements first.`
            }, { status: 404 });
        }

        // 2. Determine months covered
        const monthsCovered = new Set<number>();
        for (const s of sessions) {
            const match = s.original_filename.match(/^\d{4}(\d{2})\d{2}-/);
            if (match) monthsCovered.add(parseInt(match[1]));
        }
        const allMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        const missingMonths = allMonths.filter(m => !monthsCovered.has(m));

        // 3. Extract account suffix from filenames
        const acctMatch = sessions[0]?.original_filename?.match(/(\d{4})\.pdf$/i);
        const accountSuffix = acctMatch ? acctMatch[1] : null;

        // 4. Per-session breakdown: count matched vs unmatched
        const monthlyBreakdown: MonthlyBreakdown[] = [];
        let totalTxns = 0;
        let totalMatched = 0;
        let totalUnmatched = 0;
        const varianceDetails: VarianceItem[] = [];

        for (const s of sessions) {
            const txns = db.prepare(`
                SELECT id, date, description_raw, amount, verification_status 
                FROM statement_transactions 
                WHERE import_session_id = ?
            `).all(s.id) as any[];

            const matched = txns.filter((t: any) => t.verification_status === 'MATCHED' || t.verification_status === 'FINALIZED').length;
            const unmatched = txns.filter((t: any) => t.verification_status !== 'MATCHED' && t.verification_status !== 'FINALIZED').length;
            const total = txns.length;

            const monthMatch = s.original_filename.match(/^\d{4}(\d{2})\d{2}-/);
            const month = monthMatch ? parseInt(monthMatch[1]) : 0;

            monthlyBreakdown.push({
                session_id: s.id,
                filename: s.original_filename,
                month,
                trans_count: total,
                matched,
                unmatched,
                match_pct: total > 0 ? ((matched / total) * 100).toFixed(1) + "%" : "N/A"
            });

            totalTxns += total;
            totalMatched += matched;
            totalUnmatched += unmatched;

            // Collect unmatched transactions for variance detail
            for (const t of txns) {
                if (t.verification_status !== 'MATCHED') {
                    varianceDetails.push({
                        session_id: s.id,
                        date: t.date,
                        description: t.description_raw,
                        amount: t.amount
                    });
                }
            }
        }

        // 5. Count Rosetta master records for this year (dates are M/D/YYYY format)
        const rosettaCount = db.prepare(`
            SELECT COUNT(*) as cnt FROM master_transactions
            WHERE date LIKE ?
        `).get(`%/${year}`) as { cnt: number };

        // 6. Check for duplicate SHA-256 hashes
        const dupeCheck = db.prepare(`
            SELECT sha256_hash, COUNT(*) as cnt 
            FROM statement_files 
            WHERE original_filename LIKE ? AND LOWER(bank_name) LIKE LOWER(?)
            GROUP BY sha256_hash HAVING cnt > 1
        `).all(`${yearPrefix}%`, `%${bank}%`) as any[];

        // 7. Build findings
        const findings: string[] = [];
        const matchRate = totalTxns > 0 ? (totalMatched / totalTxns) * 100 : 0;

        if (missingMonths.length > 0) {
            findings.push(`Missing ${missingMonths.length} month(s): ${missingMonths.join(', ')}`);
        }
        if (dupeCheck.length > 0) {
            findings.push(`${dupeCheck.length} duplicate file hash(es) detected`);
        }
        if (totalUnmatched > 0) {
            findings.push(`${totalUnmatched} unmatched transaction(s) totaling $${varianceDetails.reduce((s, v) => s + Math.abs(v.amount), 0).toFixed(2)}`);
        }
        const nonCompleteSessions = sessions.filter(s => s.status !== 'COMPLETE' && s.status !== 'REVIEW');
        if (nonCompleteSessions.length > 0) {
            findings.push(`${nonCompleteSessions.length} session(s) not in COMPLETE/REVIEW status`);
        }

        // 8. Determine overall status
        let status = "PASSED";
        if (missingMonths.length > 0 || nonCompleteSessions.length > 0) status = "WARNING";
        if (matchRate < 95) status = "FAILED";
        if (totalTxns === 0) status = "FAILED";

        // 9. Store results
        const auditResult = db.prepare(`
            INSERT INTO forensic_audits 
            (audit_year, bank_name, account_suffix, status, total_sessions, total_txns, 
             matched_txns, unmatched_txns, match_rate, months_covered, missing_months,
             rosetta_total, findings, monthly_breakdown, variance_detail)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id
        `).get(
            year, bank, accountSuffix, status,
            sessions.length, totalTxns, totalMatched, totalUnmatched,
            parseFloat(matchRate.toFixed(1)),
            monthsCovered.size, JSON.stringify(missingMonths),
            rosettaCount.cnt, JSON.stringify(findings),
            JSON.stringify(monthlyBreakdown), JSON.stringify(varianceDetails)
        ) as { id: number };

        return NextResponse.json({
            success: true,
            audit_id: auditResult.id,
            year,
            bank,
            account_suffix: accountSuffix,
            status,
            summary: {
                total_sessions: sessions.length,
                total_txns: totalTxns,
                matched_txns: totalMatched,
                unmatched_txns: totalUnmatched,
                match_rate: matchRate.toFixed(1) + "%",
                months_covered: monthsCovered.size,
                missing_months: missingMonths,
                rosetta_total: rosettaCount.cnt
            },
            findings,
            monthly_breakdown: monthlyBreakdown,
            variance_detail: varianceDetails
        });

    } catch (error) {
        console.error("Forensic Audit API error:", error);
        return NextResponse.json({ error: "Audit failed", detail: (error as Error).message }, { status: 500 });
    }
}

/**
 * GET /api/financials/forensic-audit
 * Returns all past audit runs.
 */
export async function GET() {
    try {
        const db = getWorkbenchDb();

        // Ensure schema exists
        const schemaPath = path.join(
            "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1",
            "schemas",
            "forensic_audit.sql"
        );
        if (fs.existsSync(schemaPath)) {
            db.exec(fs.readFileSync(schemaPath, "utf-8"));
        }

        const audits = db.prepare(`
            SELECT * FROM forensic_audits ORDER BY created_at DESC
        `).all();

        return NextResponse.json(audits);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch audits", detail: (error as Error).message }, { status: 500 });
    }
}
