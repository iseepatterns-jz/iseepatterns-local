import { NextRequest, NextResponse } from "next/server";
import { getWorkbenchDb } from "@/lib/db";
import fs from "fs";
import path from "path";

/**
 * Super minimal but robust CSV parser for the master sheet.
 * Handles quoted strings and escaped quotes.
 */
function parseCSV(content: string) {
    const lines = content.split(/\r?\n/);
    if (lines.length === 0) return { headers: [], records: [] };
    
    const headers = lines[0].split(",").map(h => h.trim());
    const records = [];
    
    const re_csv = /,"([^"]*(?:""[^"]*)*)"|,"([^",]*)"|^"([^"]*(?:""[^"]*)*)"|^"([^",]*)"|([^,]*)/g;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const matches = line.matchAll(re_csv);
        const values: string[] = [];
        for (const m of matches) {
            if (m[0] === "" && m.index > 0 && m.index === line.length) break;
            let val = m[1] || m[2] || m[3] || m[4] || m[5] || "";
            values.push(val.replace(/""/g, '"'));
        }

        const entry: any = {};
        headers.forEach((h, idx) => {
            entry[h] = values[idx] || "";
        });
        records.push(entry);
    }
    return { headers, records };
}

function stringifyCSV(headers: string[], records: any[]) {
    const escape = (val: string) => {
        val = String(val);
        if (val.includes(",") || val.includes('"') || val.includes("\n")) {
            return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
    };
    
    const headRow = headers.join(",");
    const bodyRows = records.map(r => headers.map(h => escape(r[h] || "")).join(","));
    return [headRow, ...bodyRows].join("\n");
}

export async function POST(req: NextRequest) {
    try {
        const { sessionId } = await req.json();
        const db = getWorkbenchDb();

        // 1. Get forensic matches
        const matches = db.prepare(`
            SELECT id, master_id 
            FROM statement_transactions 
            WHERE import_session_id = ? AND verification_status = 'MATCHED'
        `).all(sessionId) as any[];

        if (matches.length === 0) {
            return NextResponse.json({ error: "No verified matches to finalize" }, { status: 400 });
        }

        const matchedMasterIndices = new Set(matches.map(m => m.master_id));

        // 2. Load Master CSV
        const masterPath = "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/FINANCIAL_LOCKER/ROWBOAT_CREATIVE_ROSETTASTONE/rbc-rosettastone-statement-transactions-master-sheet-full.csv";
        const content = fs.readFileSync(masterPath, "utf-8");
        const { headers, records } = parseCSV(content);

        // Ensure "Verification" column exists in headers
        if (!headers.includes("Verification")) {
            headers.push("Verification");
        }

        const verifiedRecords: any[] = [];
        const unverifiedRecords: any[] = [];

        records.forEach((record, index) => {
            if (matchedMasterIndices.has(index)) {
                // Verified row
                record["Verification"] = "FORENSICALLY_VERIFIED";
                verifiedRecords.push(record);
            } else {
                // Unverified row
                unverifiedRecords.push(record);
            }
        });

        // 3. Save Updated Master (only verified ones stay)
        fs.writeFileSync(masterPath, stringifyCSV(headers, verifiedRecords));

        // 4. Save Unverified List
        const unverifiedPath = masterPath.replace(".csv", "-UNVERIFIED-DISCREPANCIES.csv");
        fs.writeFileSync(unverifiedPath, stringifyCSV(headers, unverifiedRecords));

        return NextResponse.json({ 
            success: true, 
            verified_count: verifiedRecords.length,
            unverified_count: unverifiedRecords.length,
            unverified_file: unverifiedPath
        });

    } catch (error) {
        console.error("Finalize error:", error);
        return NextResponse.json({ error: "Finalization failed", details: (error as Error).message }, { status: 500 });
    }
}
