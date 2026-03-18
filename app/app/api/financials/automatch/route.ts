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

        const masterRecords = parseCSV(csvContent);
        console.log(`[Automatch] sessionId=${sessionId}: Found ${forensicTxns.length} forensic txns and ${masterRecords.length} master records`);

        // 3. Matching Logic
        const matches: any[] = [];
        let matchCount = 0;
        const updateStmt = db.prepare(`
            UPDATE statement_transactions 
            SET master_id = ?, verification_status = 'MATCHED',
                rosetta_user = ?, rosetta_account = ?, rosetta_category = ?, rosetta_company = ?,
                match_score = ?
            WHERE id = ?
        `);

        for (let i = 0; i < (forensicTxns as any[]).length; i++) {
            const ft = (forensicTxns as any[])[i];
            const fAmount = Math.abs(ft.amount);
            const fDate = (ft.date || "").trim();
            const fDesc = (ft.description_raw || "").toLowerCase();

            let bestMatch: any = null;
            let highestScore = 0;

            masterRecords.forEach((mr: any, index: number) => {
                if (!mr.Amount) return;
                const mAmountStr = mr.Amount.replace(/[$,]/g, '');
                const mAmount = Math.abs(parseFloat(mAmountStr));
                if (isNaN(mAmount)) return;

                const mDate = (mr.Date || "").trim();
                const mDesc = (mr.Description || "").toLowerCase();

                // 1. Amount must match or be extremely close
                if (Math.abs(fAmount - mAmount) > 0.01) return;

                let score = 50; // Base score for amount match

                // 2. Date match
                if (mDate.startsWith(fDate) || mDate.includes(fDate)) {
                    score += 30;
                }

                // 3. Description match (fuzzy)
                if (mDesc.includes(fDesc.slice(0, 10)) || fDesc.includes(mDesc.slice(0, 10))) {
                    score += 20;
                }

                if (score > highestScore) {
                    highestScore = score;
                    bestMatch = { index, record: mr, score };
                }
            });

            if (bestMatch && bestMatch.score >= 80) {
                const mr = bestMatch.record;
                updateStmt.run(
                    bestMatch.index,
                    mr['User'] || '',
                    mr['Account Type'] || mr['Account'] || '',
                    mr['Category'] || '',
                    mr['Company'] || mr['Description'] || '',
                    bestMatch.score,
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
