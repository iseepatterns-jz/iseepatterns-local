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

        // 1. Load Forensic Transactions
        const forensicTxns = db.prepare(`
            SELECT * FROM statement_transactions 
            WHERE import_session_id = ?
        `).all(sessionId);

        if (forensicTxns.length === 0) {
            return NextResponse.json({ error: "No transactions found for this session" }, { status: 404 });
        }

        // 2. Load Master CSV
        const csvPath = "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/FINANCIAL_LOCKER/ROWBOAT_CREATIVE_ROSETTASTONE/rbc-rosettastone-statement-transactions-master-sheet-full.csv";
        if (!fs.existsSync(csvPath)) {
            return NextResponse.json({ error: "Master CSV not found" }, { status: 404 });
        }

        const csvContent = fs.readFileSync(csvPath, "utf-8");

        function csvLineSplit(line: string) {
            const result: string[] = [];
            let cur = "";
            let inQuote = false;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    if (inQuote && line[i + 1] === '"') {
                        cur += '"';
                        i++;
                    } else {
                        inQuote = !inQuote;
                    }
                } else if (char === ',' && !inQuote) {
                    result.push(cur);
                    cur = "";
                } else {
                    cur += char;
                }
            }
            result.push(cur);
            return result;
        }

        const parseCSV = (content: string) => {
            const lines = content.split(/\r?\n/);
            if (lines.length === 0) return [];
            const header = csvLineSplit(lines[0]);
            const rows = [];
            
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                const values = csvLineSplit(line);
                const entry: any = {};
                header.forEach((h, idx) => {
                    const key = h.trim();
                    if (key && (entry[key] === undefined || entry[key] === "")) {
                        entry[key] = values[idx] || "";
                    }
                });
                rows.push(entry);
            }
            return rows;
        };

        // Load Master Records
        const masterRecords = parseCSV(csvContent);

        // NORMALIZATION HELPERS
        const normalizeDate = (d: string) => {
            if (!d) return "";
            const parts = d.split("/");
            if (parts.length >= 2) {
                const m = parseInt(parts[0], 10);
                const dPart = parseInt(parts[1], 10);
                if (!isNaN(m) && !isNaN(dPart)) return `${m}/${dPart}`;
            }
            return d.trim();
        };

        const normalizeAccount = (a: any) => {
            if (a === null || a === undefined) return "";
            const s = String(a).trim();
            // If it's a 4-digit numeric string with leading zero (0891), allow matching with 891
            const numeric = parseInt(s, 10);
            return isNaN(numeric) ? s : numeric.toString();
        };

        const fTxns = (forensicTxns as any[]).map(ft => ({
            ...ft,
            normDate: normalizeDate(ft.date),
            normAccount: normalizeAccount(ft.final_account_id)
        }));

        const mRecs = masterRecords.map(mr => ({
            ...mr,
            normDate: normalizeDate(mr.Date),
            normAccount: normalizeAccount(mr['Account'] || mr['Account Number'] || "")
        }));

        const matches: any[] = [];
        let matchCount = 0;

        for (let i = 0; i < fTxns.length; i++) {
            const ft = fTxns[i];
            const fAmount = Math.abs(ft.amount);
            const fDesc = (ft.description_raw || "").toLowerCase();

            let bestMatch: any = null;
            let highestScore = 0;

            mRecs.forEach((mr: any, index: number) => {
                const mAmountStr = (mr.Amount || "0").replace(/[$,]/g, "");
                const mAmount = Math.abs(parseFloat(mAmountStr));
                if (isNaN(mAmount)) return;

                // 1. Amount match (allowing 1 cent diff)
                if (Math.abs(fAmount - mAmount) > 0.01) return;

                // 2. Account filter (if present in forensics)
                if (ft.normAccount && ft.normAccount.length >= 3) {
                    if (mr.normAccount !== ft.normAccount && !mr.normAccount.endsWith(ft.normAccount)) return;
                }

                // 3. Player filter (if present in forensics)
                if (ft.player_id) {
                    const mUser = (mr['User'] || "").trim().toUpperCase();
                    let mPlayerId = null;
                    if (mUser === 'JZ') mPlayerId = 28;
                    else if (mUser === 'LG') mPlayerId = 25;
                    else if (mUser === 'PH') mPlayerId = 45;
                    if (mPlayerId && mPlayerId !== ft.player_id) return;
                }

                let score = 50; // Base score for amount match

                // 4. Date match (normalized)
                if (ft.normDate && ft.normDate === mr.normDate) {
                    score += 30;
                }

                // 5. Description fuzzy match
                const mDesc = (mr.Description || "").toLowerCase();
                if (mDesc.includes(fDesc.slice(0, 8)) || fDesc.includes(mDesc.slice(0, 8))) {
                    score += 20;
                }

                if (score > highestScore) {
                    highestScore = score;
                    bestMatch = { index, record: mr, score };
                }
            });

            if (bestMatch && bestMatch.score >= 80) {
                const mr = bestMatch.record;
                const userInitials = (mr['User'] || '').trim().toUpperCase();
                let playerId = null;
                if (userInitials === 'JZ') playerId = 28;
                else if (userInitials === 'LG') playerId = 25;
                else if (userInitials === 'PH') playerId = 45;

                const evidenceUrl = (mr['Link'] || mr['Invoice URL'] || '').trim();

                const updateMatchStmt = db.prepare(`
                    UPDATE statement_transactions 
                    SET master_id = ?, verification_status = 'MATCHED',
                        rosetta_user = ?, rosetta_account = ?, rosetta_category = ?, rosetta_company = ?,
                        match_score = ?, final_account_id = ?, player_id = ?,
                        evidence_url = ?, nc_flag = 0
                    WHERE id = ?
                `);

                updateMatchStmt.run(
                    bestMatch.index,
                    mr['User'] || '',
                    mr['Account Type'] || mr['Account'] || '',
                    mr['Category'] || '',
                    mr['Company'] || mr['Description'] || '',
                    bestMatch.score,
                    mr['Account'] || ft.final_account_id || '', 
                    playerId || ft.player_id,
                    evidenceUrl || null,
                    ft.id
                );
                matchCount++;
                matches.push({ forensicId: ft.id, masterIndex: bestMatch.index, score: bestMatch.score });
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
