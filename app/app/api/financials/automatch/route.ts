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
        'chicago', 'il', 'chigaco', 'ny', 'nyc', 'sf', 'la', 'us', 'usa', 'terminal', 'pos', 'purchase', 'debit', 'credit', 'point', 'sale', 'auth', 'authorized', 'transaction',
        'wa', 'tx', 'ca', 'ga', 'nj', 'mi', 'oh', 'pa', 'fl', 'az', 'va', 'ma', 'md'
    ]);
    
    const normalize = (s: string) => (s || "")
        .toLowerCase()
        .replace(/amzn/g, "amazon") // Alias common Amazon short-form
        .replace(/mktp/g, "marketplace") // Alias common Marketplace short-form
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 3 && !noise.has(w));
    
    const w1 = new Set(normalize(d1));
    const w2 = new Set(normalize(d2));
    
    if (w1.size === 0 || w2.size === 0) return false;

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
        const body = await req.json();
        const sessionId = Number(body.sessionId);
        if (!sessionId || isNaN(sessionId)) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

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
        let targetAccountTypes = ['Personal', 'Corporate', 'Amex', 'Credit Card'];
        if (sessionInfo.statement_type === 'CHECKING') targetAccountTypes = ['Checking', 'Bank Account', 'Direct Deposits'];

        // ── Robust Filename Parsing ──
        // Handles both formats: YYYYMMDD-statements-ACCT.pdf AND YYYY-MM-DD-statements-ACCT.pdf
        const filename = sessionInfo.original_filename;
        
        let stmtYear = 2023;
        let stmtMonth = 1;

        // Try YYYYMMDD format first (e.g. 20190410-statements-0404.pdf)
        const yyyymmddMatch = filename.match(/^(\d{4})(\d{2})(\d{2})-/);
        if (yyyymmddMatch) {
            stmtYear = parseInt(yyyymmddMatch[1]);
            stmtMonth = parseInt(yyyymmddMatch[2]);
        } else {
            // Try YYYY-MM-DD format (e.g. 2016-03-10-statements-3758.pdf)
            const dashMatch = filename.match(/^(\d{4})-(\d{2})-(\d{2})-/);
            if (dashMatch) {
                stmtYear = parseInt(dashMatch[1]);
                stmtMonth = parseInt(dashMatch[2]);
            } else {
                // Fallback: try to find any 4-digit year
                const yearMatch = filename.match(/\b(20\d{2})\b/);
                const monthMatch = filename.match(/\b(\d{1,2})[-_/]/) || filename.match(/[-_/](\d{1,2})\b/);
                if (yearMatch) stmtYear = parseInt(yearMatch[1]);
                if (monthMatch) stmtMonth = parseInt(monthMatch[1]);
            }
        }
        
        const acctMatch = filename.match(/(\d{4})\.pdf$/i) || filename.match(/-(\d{4})-/);
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
            WHERE abs(abs(CAST(REPLACE(REPLACE(COALESCE(amount, '0'), '$', ''), ',', '') AS REAL)) - ?) <= 0.05
            LIMIT 1000
        `);

        for (const ft of forensicTxns as any[]) {
            const fAmount = Math.abs(ft.amount);
            const fDescRaw = (ft.description_raw || "").toLowerCase();
            
            // Normalize Date: month/day (forensic dates are M/D only, no year)
            const dateParts = ft.date.split('/').map((p: string) => parseInt(p, 10));
            const fM = dateParts[0];
            const fD = dateParts[1];
            
            // Derive the forensic year from the statement context
            let fYear = stmtYear;
            // Statement month is the billing cycle end. Transactions from prior month are common.
            // e.g. April statement (stmtMonth=4) contains March transactions
            if (fM > stmtMonth && stmtMonth < 6) fYear = stmtYear - 1;
            else if (fM < stmtMonth && stmtMonth === 12 && fM === 1) fYear = stmtYear + 1;
            
            let allPotential = findMatchStmt.all(fAmount) as any[];

            let bestCandidate = null;
            let maxScore = -1;
            let finalReason = "";

            for (const candidate of allPotential) {
                if (usedMasterIds.has(candidate.master_id_val)) continue;

                // 1. Precise Date Parsing for Candidate
                const cParts = (candidate.date || "").split('/').map((p: string) => {
                    const clean = p.replace(/[^0-9]/g, '');
                    return clean ? parseInt(clean, 10) : NaN;
                });
                if (isNaN(cParts[0]) || isNaN(cParts[1])) continue;
                
                const cM = cParts[0];
                const cD = cParts[1];
                let cYear = cParts[2];
                if (cYear < 100) cYear += 2000; // 23 -> 2023

                // 2. Date Filter: Same month or ±1 month, day proximity scored
                //    Credit card posting dates can differ significantly from purchase dates
                //    The Rosetta Stone may record purchase date while statement shows post date
                //    Billing periods overlap months (e.g. April statement = March 3 - April 2)
                const monthDiff = Math.abs(cM - fM);
                if (monthDiff > 1) continue; // Allow same month or ±1 month

                const dayDiff = Math.abs(cD - fD);

                // 3. Scoring
                let score = 40; // Base for Amount + Date proximity
                let reasons = ["Amt"];

                // Month proximity
                if (monthDiff === 0) {
                    reasons.push("SameMonth");
                } else {
                    score -= 10; // Adjacent month penalty
                    reasons.push("AdjMonth");
                }

                // Day proximity bonus (graduated, no hard cutoff)
                if (dayDiff === 0) {
                    score += 15;
                    reasons.push("ExactDay");
                } else if (dayDiff <= 1) {
                    score += 12;
                    reasons.push("Day±1");
                } else if (dayDiff <= 3) {
                    score += 8;
                    reasons.push("Day±3");
                } else if (dayDiff <= 7) {
                    score += 3;
                    reasons.push(`Day±${dayDiff}`);
                } else {
                    // >7 days apart — no bonus, slight penalty
                    score -= 5;
                    reasons.push(`Day±${dayDiff}`);
                }

                // Year matching: critical for preventing cross-year false matches
                if (cYear === fYear) {
                    score += 15;
                    reasons.push("YearMatch");
                } else if (!cParts[2]) {
                    score += 5;
                    reasons.push("Yearless");
                } else {
                    // Different year = heavy penalty (most cross-year same-amount matches are false)
                    score -= 40;
                    reasons.push(`YearMismatch(${cYear}vs${fYear})`);
                }

                if (targetAccountTypes.includes(candidate.account_type)) {
                    score += 10;
                    reasons.push("Type");
                }
                
                if (stmtAcct && candidate.account === stmtAcct) {
                    score += 20;
                    reasons.push("AcctDigits");
                }

                const candidateDesc = (candidate.description || "").toLowerCase();
                const cleanCandidate = candidateDesc.replace(/[^a-z0-9]/g, '');
                const cleanForensic = fDescRaw.replace(/[^a-z0-9]/g, '');
                const isPerfectDesc = cleanCandidate.includes(cleanForensic) || cleanForensic.includes(cleanCandidate);

                if (isPerfectDesc) {
                    score += 20;
                    reasons.push("DescMatch");
                } else if (hasDescriptionOverlap(fDescRaw, candidateDesc)) {
                    score += 10;
                    reasons.push("DescFuzzy");
                } else {
                    score -= 20;
                    reasons.push("DescMismatch");
                }

                if (score > maxScore) {
                    maxScore = score;
                    bestCandidate = candidate;
                    finalReason = `[Paralegal] ${reasons.join('+')} Match (Score: ${score})`;
                }
            }

            if (bestCandidate && maxScore >= 50) {
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
