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

        // 2. Perform Indexed SQL Lookups
        // We match by absolute Amount (within 1 cent) and then score by Date and Description
        const matches: any[] = [];
        let matchCount = 0;

        const findMatchStmt = db.prepare(`
            SELECT *, id as master_id_val 
            FROM master_transactions 
            WHERE abs(abs(amount) - abs(?)) <= 0.01
            ORDER BY 
                (CASE WHEN date LIKE ? || '/%' OR date = ? THEN 1 ELSE 0 END) DESC,
                (CASE WHEN instr(lower(description), lower(?)) > 0 OR instr(lower(?), lower(description)) > 0 THEN 1 ELSE 0 END) DESC
            LIMIT 1
        `);

        for (const ft of forensicTxns as any[]) {
            const fAmount = Math.abs(ft.amount);
            const fDescShort = (ft.description_raw || "").slice(0, 15);
            const fDate = ft.date; // e.g., "12/10"
            
            const bestMatch = findMatchStmt.get(fAmount, fDate, fDate, fDescShort, fDescShort) as any;

            if (bestMatch) {
                const userInitials = (bestMatch.user_label || '').trim().toUpperCase();
                let playerId = null;
                if (userInitials === 'JZ') playerId = 28;
                else if (userInitials === 'LG') playerId = 25;
                else if (userInitials === 'PH') playerId = 45;

                const evidenceUrl = (bestMatch.link || bestMatch.invoice_url || '').trim();
                
                // Determine match reason
                const dateMatch = (bestMatch.date === fDate || bestMatch.date.startsWith(fDate + '/'));
                const descMatch = bestMatch.description.toLowerCase().includes(fDescShort.toLowerCase());
                const reason = `Amt Match${dateMatch ? ' + Date' : ''}${descMatch ? ' + Desc' : ''}`;

                const updateMatchStmt = db.prepare(`
                    UPDATE statement_transactions 
                    SET master_id = ?, verification_status = 'MATCHED',
                        rosetta_user = ?, rosetta_account = ?, rosetta_category = ?, rosetta_company = ?,
                        match_score = ?, match_reason = ?,
                        final_account_id = ?, player_id = ?,
                        evidence_url = ?, nc_flag = 0
                    WHERE id = ?
                `);

                const score = 50 + (dateMatch ? 30 : 0) + (descMatch ? 15 : 0);

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
