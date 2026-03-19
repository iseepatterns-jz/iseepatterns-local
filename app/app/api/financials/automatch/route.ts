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
 * Checks if two descriptions share at least one meaningful keyword.
 * Meaningful = 3+ chars, excluding common noise.
 */
function hasDescriptionOverlap(d1: string, d2: string): boolean {
    const noise = new Set([
        'the', 'inc', 'chi', 'llc', 'com', 'store', 'corp', 'pay', 'payment', 'transfer', 'service', 'services',
        'chicago', 'il', 'chigaco', 'ny', 'nyc', 'sf', 'la', 'us', 'usa', 'terminal', 'pos', 'purchase', 'debit', 'credit', 'point', 'sale', 'auth', 'authorized', 'transaction'
    ]);
    const normalize = (s: string) => (s || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 3 && !noise.has(w));
    
    const w1 = new Set(normalize(d1));
    const w2 = new Set(normalize(d2));
    
    if (w1.size === 0 || w2.size === 0) return false; // Now requires at least one non-noise word

    const intersect = [...w1].filter(w => w2.has(w));
    return intersect.length > 0;
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

        // 1. Get Session context (Filename/Date Range/Type)
        const sessionInfo = db.prepare(`
            SELECT s.id, f.original_filename, f.period_start, f.period_end, f.statement_type
            FROM import_sessions s
            JOIN statement_files f ON s.statement_file_id = f.id
            WHERE s.id = ?
        `).get(sessionId) as any;

        if (!sessionInfo) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

        // Map statement type to Master Sheet account_type
        let targetAccountType = null;
        if (sessionInfo.statement_type === 'CREDIT_CARD') targetAccountType = 'Credit Card';
        else if (sessionInfo.statement_type === 'CHECKING') targetAccountType = 'Checking';

        // Parse filename...
        const filename = sessionInfo.original_filename;
        const dateMatch = filename.match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/);
        const acctMatch = filename.match(/(\d{4})\.pdf$/i) || filename.match(/-(\d{4})-/);

        const stmtYear = dateMatch ? parseInt(dateMatch[1]) : 2023; // Fallback
        const stmtMonth = dateMatch ? parseInt(dateMatch[2]) : 1;
        const stmtAcct = acctMatch ? acctMatch[1] : null;

        console.log(`[Paralegal Automatch] Session ${sessionId} | Filename: ${filename} | Parsed: Y:${stmtYear} M:${stmtMonth} Acct:${stmtAcct}`);
        
        // 1.5 Reset non-finalized matches so we can "repair" previous matching errors
        db.prepare(`
            UPDATE statement_transactions 
            SET master_id = NULL, 
                verification_status = 'PENDING',
                match_score = 0,
                match_reason = NULL,
                rosetta_user = NULL,
                rosetta_account = NULL,
                rosetta_category = NULL,
                rosetta_company = NULL
            WHERE import_session_id = ? AND verification_status = 'MATCHED'
        `).run(sessionId);

        const forensicTxns = db.prepare(`
            SELECT * FROM statement_transactions 
            WHERE import_session_id = ? AND verification_status = 'PENDING'
        `).all(sessionId);

        // 2. Perform High-Precision Lookups
        const matches: any[] = [];
        let matchCount = 0;
        const usedMasterIds = new Set<number>();

        const findMatchStmt = db.prepare(`
            SELECT *, id as master_id_val 
            FROM master_transactions 
            WHERE abs(abs(amount) - abs(?)) <= 0.01
            AND (
                date = ? OR date = ? OR date = ?
            )
            LIMIT 20
        `);

        for (const ft of forensicTxns as any[]) {
            const fAmount = Math.abs(ft.amount);
            const fDescRaw = (ft.description_raw || "").toLowerCase();
            const fDescShort = fDescRaw.slice(0, 15);
            
            // Normalize Date: month/day/year
            const dateParts = ft.date.split('/');
            const fM = parseInt(dateParts[0]);
            const fD = parseInt(dateParts[1]);
            let fYear = stmtYear;
            
            if (fM > stmtMonth && stmtMonth < 6) { 
                fYear = stmtYear - 1;
            } else if (fM < stmtMonth && stmtMonth === 12 && fM === 1) {
                fYear = stmtYear + 1;
            }
            
            const dateObj = new Date(fYear, fM - 1, fD);
            const prevDateObj = new Date(fYear, fM - 1, fD - 1);
            const nextDateObj = new Date(fYear, fM - 1, fD + 1);

            const formatDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
            
            const targetDate = formatDate(dateObj);
            const prevDate = formatDate(prevDateObj);
            const nextDate = formatDate(nextDateObj);
            
            const candidates = findMatchStmt.all(fAmount, targetDate, prevDate, nextDate) as any[];

            let bestCandidate = null;
            let maxScore = -1;
            let finalReason = "";

            for (const candidate of candidates) {
                // COLLISION PREVENTION: Skip if already used in this session batch
                if (usedMasterIds.has(candidate.master_id_val)) continue;

                const isNumericDesc = /^-?\d+(\.\d+)?$/.test(candidate.description || "");
                const candidateDesc = (isNumericDesc && candidate.company) ? candidate.company : (candidate.description || "");
                const candidateDescLower = candidateDesc.toLowerCase();
                
                const isPerfectDesc = candidateDescLower.includes(fDescRaw) || fDescRaw.includes(candidateDescLower);
                const isPrefixMatch = candidateDescLower.startsWith(fDescShort) || fDescRaw.startsWith(candidateDescLower.slice(0, 15));
                const hasOverlap = hasDescriptionOverlap(ft.description_raw, candidateDesc);
                
                // Scoring logic - More conservative to prevent false positives
                let score = 40; // Base for Amt + Date (window)
                let reasons = ["Amt+Date"];

                // Exact Date Bonus (+10): Prioritize the exact day over +/- 1 day
                if (candidate.date === targetDate) {
                    score += 10;
                    reasons.push("ExactDate");
                }

                if (candidate.account_type === targetAccountType) {
                    score += 10;
                    reasons.push("Type");
                }
                
                if (stmtAcct && candidate.account === stmtAcct) {
                    score += 20;
                    reasons.push("AcctDigits");
                }

                if (isPerfectDesc) {
                    score += 20;
                    reasons.push("DescMatch");
                } else if (isPrefixMatch || hasOverlap) {
                    score += 10;
                    reasons.push("DescFuzzy");
                } else {
                    // SEVERE PENALTY for disjoint descriptions
                    score -= 50;
                    reasons.push("DescMismatch");
                }

                if (score > maxScore) {
                    maxScore = score;
                    bestCandidate = candidate;
                    finalReason = `[Paralegal] ${reasons.join('+')} Match (Score: ${score})`;
                }
            }

            if (bestCandidate && maxScore >= 60) {
                // Mark as used immediately to prevent double-booking
                usedMasterIds.add(bestCandidate.master_id_val);
                const userInitials = (bestCandidate.user_label || '').trim().toUpperCase();
                let playerId = null;
                if (userInitials === 'JZ') playerId = 28;
                else if (userInitials === 'LG') playerId = 25;
                else if (userInitials === 'PH') playerId = 45;

                const evidenceUrl = (bestCandidate.link || bestCandidate.invoice_url || '').trim();

                const updateMatchStmt = db.prepare(`
                    UPDATE statement_transactions 
                    SET master_id = ?, 
                        verification_status = 'MATCHED',
                        rosetta_user = ?, 
                        rosetta_account = ?, 
                        rosetta_category = ?, 
                        rosetta_company = ?,
                        match_score = ?, 
                        match_reason = ?,
                        final_account_id = ?, 
                        player_id = ?,
                        evidence_url = ?, 
                        nc_flag = 0
                    WHERE id = ?
                `);

                updateMatchStmt.run(
                    bestCandidate.master_id_val,
                    bestCandidate.user_label || '',
                    bestCandidate.account || '',
                    bestCandidate.category || '',
                    bestCandidate.description || '',
                    maxScore,
                    finalReason,
                    bestCandidate.account || null,
                    playerId || null,
                    evidenceUrl || null,
                    ft.id
                );
                
                matchCount++;
                matches.push({ forensicId: ft.id, masterId: bestCandidate.master_id_val, reason: finalReason });
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
