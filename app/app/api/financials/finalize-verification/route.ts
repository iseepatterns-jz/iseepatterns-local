import { NextRequest, NextResponse } from "next/server";
import { getWorkbenchDb } from "@/lib/db";
import fs from "fs";
import path from "path";
import crypto from "crypto";

/**
 * Super minimal but robust CSV parser for the master sheet.
 * Handles quoted strings and escaped quotes.
 */
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

function parseCSV(content: string) {
    const lines = content.split(/\r?\n/);
    if (lines.length === 0) return { headers: [] as string[], records: [] as any[], rawLines: [] as string[] };

    const headers = csvLineSplit(lines[0]).map(h => h.trim());
    const records: any[] = [];
    const rawLines: string[] = [lines[0]]; 

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        rawLines.push(lines[i]); 
        const values = csvLineSplit(lines[i]);

        const entry: any = {};
        headers.forEach((h, idx) => {
            if (h && (entry[h] === undefined || entry[h] === "")) {
                entry[h] = values[idx] || "";
            }
        });
        records.push(entry);
    }
    return { headers, records, rawLines };
}

function stringifyCSV(headers: string[], records: any[]) {
    const escape = (val: string) => {
        val = String(val ?? "");
        if (val.includes(",") || val.includes('"') || val.includes("\n")) {
            return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
    };

    const headRow = headers.join(",");
    const bodyRows = records.map(r => headers.map(h => escape(r[h] || "")).join(","));
    return [headRow, ...bodyRows].join("\n");
}

/**
 * POST /api/financials/finalize-verification
 * 
 * SAFE finalize: updates matched rows IN-PLACE in the master CSV.
 * Does NOT remove unverified rows. Creates a backup first.
 * 
 * Adds forensic metadata columns:
 *   - Forensic_Statement_File: source PDF filename
 *   - Forensic_Page: page number where transaction appears
 *   - Forensic_Hash: SHA-256 hash of the match proof
 *   - Forensic_Verified_Date: ISO timestamp of verification
 *   - Verification: FORENSICALLY_VERIFIED
 */
export async function POST(req: NextRequest) {
    try {
        const { sessionId } = await req.json();
        const db = getWorkbenchDb();

        // 1. Get forensic matches with their statement metadata
        const matches = db.prepare(`
            SELECT st.id, st.master_id, st.page_number, st.description_raw, st.amount, st.date,
                   st.rosetta_user, st.rosetta_account, st.rosetta_category, st.rosetta_company,
                   st.match_score,
                   sf.original_filename AS source_filename
            FROM statement_transactions st
            LEFT JOIN import_sessions isess ON st.import_session_id = isess.id
            LEFT JOIN statement_files sf ON isess.statement_file_id = sf.id
            WHERE st.import_session_id = ? 
              AND st.verification_status = 'MATCHED'
              AND st.review_status = 'REVIEWED'
        `).all(sessionId) as any[];

        if (matches.length === 0) {
            return NextResponse.json({
                error: "No reviewed matches to finalize. Please approve transactions before finalizing."
            }, { status: 400 });
        }

        // Build a map of master_id → forensic metadata
        const matchMap = new Map<number, any>();
        for (const m of matches) {
            matchMap.set(m.master_id, {
                statementFile: m.source_filename || "unknown",
                pageNumber: m.page_number || 0,
                description: m.description_raw || "",
                amount: m.amount,
                date: m.date,
            });
        }

        // 2. Load Master CSV
        const masterPath = "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/FINANCIAL_LOCKER/ROWBOAT_CREATIVE_ROSETTASTONE/rbc-rosettastone-statement-transactions-master-sheet-full.csv";
        const content = fs.readFileSync(masterPath, "utf-8");
        const { headers, records } = parseCSV(content);

        // 3. Create backup BEFORE modifying
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const backupPath = masterPath.replace(".csv", `.BACKUP-${timestamp}.csv`);
        fs.writeFileSync(backupPath, content);

        // 4. Ensure forensic columns exist in headers
        const forensicHeaders = [
            "Verification",
            "Forensic_Statement_File",
            "Forensic_Page",
            "Forensic_Hash",
            "Forensic_Verified_Date"
        ];
        for (const fh of forensicHeaders) {
            if (!headers.includes(fh)) {
                headers.push(fh);
            }
        }

        // 5. Update ONLY matched rows — leave everything else untouched
        let verifiedCount = 0;

        records.forEach((record, index) => {
            if (matchMap.has(index)) {
                const meta = matchMap.get(index);

                // Generate forensic hash: SHA-256 of (master_index + amount + date + description)
                const hashInput = `${index}|${meta.amount}|${meta.date}|${meta.description}|${meta.statementFile}|${meta.pageNumber}`;
                const forensicHash = crypto.createHash("sha256").update(hashInput).digest("hex").slice(0, 16);

                record["Verification"] = "FORENSICALLY_VERIFIED";
                record["Forensic_Statement_File"] = meta.statementFile;
                record["Forensic_Page"] = String(meta.pageNumber);
                record["Forensic_Hash"] = forensicHash;
                record["Forensic_Verified_Date"] = new Date().toISOString();

                verifiedCount++;
            }
            // Unmatched rows are left COMPLETELY untouched
        });

        // 6. Write ALL records back (verified + unverified together)
        fs.writeFileSync(masterPath, stringifyCSV(headers, records));

        // 7. Update workbench.db status for finalized transactions
        const updateStmt = db.prepare(`
            UPDATE statement_transactions 
            SET verification_status = 'FINALIZED' 
            WHERE id = ?
        `);
        for (const m of matches) {
            updateStmt.run(m.id);
        }

        return NextResponse.json({
            success: true,
            verified_count: verifiedCount,
            total_records: records.length,
            backup_file: path.basename(backupPath),
            message: `${verifiedCount} transactions verified and written to master CSV. Backup created.`
        });

    } catch (error) {
        console.error("Finalize error:", error);
        return NextResponse.json({ error: "Finalization failed", details: (error as Error).message }, { status: 500 });
    }
}
