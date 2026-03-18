import { NextRequest, NextResponse } from "next/server";
import { getWorkbenchDb } from "@/lib/db";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

/**
 * Ensures the database schema has the required verification fields.
 */
function ensureSchema(db: any) {
    const info = db.pragma("table_info(statement_transactions)");
    const columnNames = info.map((c: any) => c.name);
    
    const requiredColumns: [string, string][] = [
        ['master_id', 'INTEGER'],
        ['verification_status', "TEXT DEFAULT 'PENDING'"],
        ['rosetta_user', 'TEXT'],
        ['rosetta_account', 'TEXT'],
        ['rosetta_category', 'TEXT'],
        ['rosetta_company', 'TEXT'],
        ['match_score', 'INTEGER'],
    ];
    for (const [col, type] of requiredColumns) {
        if (!columnNames.includes(col)) {
            db.prepare(`ALTER TABLE statement_transactions ADD COLUMN ${col} ${type}`).run();
        }
    }
}

/**
 * POST /api/financials/automatch
 * Parameters: session_id
 * Performs matching between forensics and the master CSV.
 */
export async function POST(req: NextRequest) {
    try {
        const { sessionId } = await req.json();
        if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

        const db = getWorkbenchDb();
        ensureSchema(db);

        // 1. Get Session context (Filename/Date Range)
        const sessionInfo = db.prepare(`
            SELECT s.id, f.original_filename, f.period_start, f.period_end
            FROM import_sessions s
            JOIN statement_files f ON s.statement_file_id = f.id
            WHERE s.id = ?
        `).get(sessionId) as any;

        if (!sessionInfo) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

        // Parse filename for Year, Month, and Account (e.g., 2016-02-10-statements-1249.pdf)
        const filename = sessionInfo.original_filename;
        const dateMatch = filename.match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/);
        const acctMatch = filename.match(/(\d{4})\.pdf$/i) || filename.match(/-(\d{4})-/);

        const stmtYear = dateMatch ? parseInt(dateMatch[1]) : 2023; // Fallback
        const stmtMonth = dateMatch ? parseInt(dateMatch[2]) : 1;
        const stmtAcct = acctMatch ? acctMatch[1] : null;

        console.log(`[Paralegal Automatch] Session ${sessionId} | Filename: ${filename} | Parsed: Y:${stmtYear} M:${stmtMonth} Acct:${stmtAcct}`);

        const forensicTxns = db.prepare(`
            SELECT * FROM statement_transactions 
            WHERE import_session_id = ? AND verification_status = 'PENDING'
        `).all(sessionId);

        // 2. Perform High-Precision Lookups
        const matches: any[] = [];
        let matchCount = 0;

        const findMatchStmt = db.prepare(`
            SELECT *, id as master_id_val 
            FROM master_transactions 
            WHERE abs(abs(amount) - abs(?)) <= 0.01
            AND (
                date = ? OR date = ? OR date = ?
            )
            ORDER BY (CASE WHEN account = ? THEN 1 ELSE 0 END) DESC
            LIMIT 1
        `);

        for (const ft of forensicTxns as any[]) {
            const fAmount = Math.abs(ft.amount);
            const fDescShort = (ft.description_raw || "").slice(0, 15);
            
            // Normalize Date: If forensic is "01/12" and statement is Feb 2016, year is 2016.
            const dateParts = ft.date.split('/');
            const fM = parseInt(dateParts[0]);
            const fD = parseInt(dateParts[1]);
            let fYear = stmtYear;
            
            if (fM > stmtMonth && stmtMonth < 6) { 
                fYear = stmtYear - 1;
            } else if (fM < stmtMonth && stmtMonth === 12 && fM === 1) {
                fYear = stmtYear + 1;
            }
            
            // Build ±1 day window
            const dateObj = new Date(fYear, fM - 1, fD);
            const prevDateObj = new Date(fYear, fM - 1, fD - 1);
            const nextDateObj = new Date(fYear, fM - 1, fD + 1);

            const formatDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
            
            const targetDate = formatDate(dateObj);
            const prevDate = formatDate(prevDateObj);
            const nextDate = formatDate(nextDateObj);
            
            const bestMatch = findMatchStmt.get(fAmount, targetDate, prevDate, nextDate, stmtAcct) as any;

            if (bestMatch) {
                const userInitials = (bestMatch.user_label || '').trim().toUpperCase();
                let playerId = null;
                if (userInitials === 'JZ') playerId = 28;
                else if (userInitials === 'LG') playerId = 25;
                else if (userInitials === 'PH') playerId = 45;

                const evidenceUrl = (bestMatch.link || bestMatch.invoice_url || '').trim();
                
                // Determine match reason
                const descMatch = bestMatch.description.toLowerCase().includes(fDescShort.toLowerCase());
                const reason = `[Paralegal] Acct+Date+Amt Match${descMatch ? ' + Desc' : ''}`;

                const updateMatchStmt = db.prepare(`
                    UPDATE statement_transactions 
                    SET master_id = ?, verification_status = 'MATCHED',
                        rosetta_user = ?, rosetta_account = ?, rosetta_category = ?, rosetta_company = ?,
                        match_score = ?, match_reason = ?,
                        final_account_id = ?, player_id = ?,
                        evidence_url = ?, nc_flag = 0
                    WHERE id = ?
                `);

                const score = 95 + (descMatch ? 5 : 0);

                updateMatchStmt.run(
                    bestMatch.master_id_val,
                    bestMatch.user_label || '',
                    bestMatch.account_type || bestMatch.account || '',
                    bestMatch.category || '',
                    bestMatch.company || bestMatch.description || '',
                    score,
                    reason,
                    bestMatch.account || ft.final_account_id || '', 
                    playerId || ft.player_id,
                    evidenceUrl || null,
                    ft.id
                );
                matchCount++;
                matches.push({ forensicId: ft.id, masterId: bestMatch.master_id_val, reason });
            }
        }

        return NextResponse.json({ 
            success: true, 
            matched_count: matchCount, 
            total_forensic: forensicTxns.length,
            matches 
        });

    } catch (error) {
        console.error("Automatch API error:", error);
        return NextResponse.json({ error: "Automatch failed", detail: (error as Error).message }, { status: 500 });
    }
}
