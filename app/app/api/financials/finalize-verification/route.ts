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
        const sessionInt = Number(sessionId);
        if (isNaN(sessionInt)) {
            return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
        }

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
        `).all(sessionInt) as any[];

        if (matches.length === 0) {
            // Diagnostic: Why are there no matches? 
            const anyReviewed = db.prepare(`SELECT count(*) as count FROM statement_transactions WHERE import_session_id = ? AND review_status = 'REVIEWED'`).get(sessionInt) as any;
            const anyMatched = db.prepare(`SELECT count(*) as count FROM statement_transactions WHERE import_session_id = ? AND verification_status = 'MATCHED'`).get(sessionInt) as any;
            
            return NextResponse.json({
                error: `No approved matches found to finalize. (Stats for Session ${sessionInt}: ${anyReviewed?.count || 0} Reviewed, ${anyMatched?.count || 0} Matched). All matched records must be Reviewed (blue pill) before finalization.`,
                debug: { anyReviewed: anyReviewed?.count, anyMatched: anyMatched?.count }
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

        // 2. Perform Atomic Database Update & Audit Log
        const updateMasterStmt = db.prepare(`
            UPDATE master_transactions 
            SET verification_status = 'FORENSICALLY_VERIFIED',
                forensic_file = ?,
                forensic_page = ?,
                forensic_hash = ?,
                verified_at = datetime('now'),
                updated_at = datetime('now')
            WHERE id = ?
        `);

        const auditStmt = db.prepare(`
            INSERT INTO master_audit_log (master_id, action, changed_fields, reason, agent_id)
            VALUES (?, 'VERIFY', ?, 'Forensic matching finalized from statement', 'antigravity-system')
        `);

        const updateTxnStmt = db.prepare(`
            UPDATE statement_transactions 
            SET verification_status = 'FINALIZED' 
            WHERE id = ?
        `);

        const updateSessionStmt = db.prepare(`
            UPDATE import_sessions 
            SET status = 'COMPLETE', updated_at = datetime('now')
            WHERE id = ?
        `);

        let verifiedCount = 0;
        const finalizedResults: any[] = [];

        // Transactional update for data integrity
        const finalizeTxn = db.transaction((matches, sessionId) => {
            for (const m of matches) {
                // Generate forensic hash: SHA-256 of (master_id + amount + date + description)
                const hashInput = `${m.master_id}|${m.amount}|${m.date}|${m.description_raw}|${m.source_filename}|${m.page_number}`;
                const forensicHash = crypto.createHash("sha256").update(hashInput).digest("hex").slice(0, 16);

                // 1. Update Master Table
                updateMasterStmt.run(m.source_filename, m.page_number, forensicHash, m.master_id);

                // 2. Log the Audit Event
                const changes = JSON.stringify({
                    verification_status: { old: 'UNVERIFIED', new: 'FORENSICALLY_VERIFIED' },
                    forensic_hash: forensicHash
                });
                auditStmt.run(m.master_id, changes);

                // 3. Update Forensic Session Table
                updateTxnStmt.run(m.id);

                verifiedCount++;
                finalizedResults.push({ id: m.id, masterId: m.master_id, hash: forensicHash });
            }
            updateSessionStmt.run(sessionId);
        });

        finalizeTxn(matches, sessionInt);

        // 3. Export to CSV (Synchronize Accountant View)
        const masterPath = "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/FINANCIAL_LOCKER/ROWBOAT_CREATIVE_ROSETTASTONE/rbc-rosettastone-statement-transactions-master-sheet-full.csv";
        
        // Backup before export
        const csvContentOld = fs.readFileSync(masterPath, "utf-8");
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const backupPath = masterPath.replace(".csv", `.BACKUP-${timestamp}.csv`);
        fs.writeFileSync(backupPath, csvContentOld);

        // Fetch ALL records from DB in alphabetical order of original columns (or as ingested)
        // Note: For simplicity and column order preservation, the keys in our export 
        // should match exactly what's expected by the accountant.
        const allMasterRecords = db.prepare("SELECT * FROM master_transactions").all() as any[];
        
        // Map DB columns BACK to CSV headers
        const exportHeaders = [
            "Year", "Date", "Amount", "Description", "Transaction Type",
            "Account", "Account Type", "Bank", "User", "Responsible", "Category",
            "Class", "Type", "Type2", "Department", "Link", "Company",
            "Industry", "Invoice #", "Invoice URL", "Client", "Notes", "Url",
            "Order ID", "PO Number", "Personal", "Payment Instrument Type", "Payment Identifier",
            "Amazon-Internal Product Category", "ASIN", "Title", "UNSPSC", "Segment", "Family", "Commodity",
            "Verification", "Forensic_Statement_File", "Forensic_Page", "Forensic_Hash", "Forensic_Verified_Date"
        ];

        const exportRecords = allMasterRecords.map(r => ({
            "Year": r.year,
            "Date": r.date,
            "Amount": r.amount,
            "Description": r.description,
            "Transaction Type": r.transaction_type,
            "Account": r.account,
            "Account Type": r.account_type,
            "Bank": r.bank,
            "User": r.user_label,
            "Responsible": r.responsible,
            "Category": r.category,
            "Class": r.class,
            "Type": r.entry_type,
            "Type2": r.entry_type2,
            "Department": r.department,
            "Link": r.link,
            "Company": r.company,
            "Industry": r.industry,
            "Invoice #": r.invoice_num,
            "Invoice URL": r.invoice_url,
            "Client": r.client,
            "Notes": r.notes,
            "Url": r.url,
            "Order ID": r.order_id,
            "PO Number": r.po_number,
            "Personal": r.is_personal,
            "Payment Instrument Type": r.payment_instrument,
            "Payment Identifier": r.payment_identifier,
            "Amazon-Internal Product Category": r.amazon_product_cat,
            "ASIN": r.asin,
            "Title": r.title,
            "UNSPSC": r.unspsc,
            "Segment": r.segment,
            "Family": r.family,
            "Commodity": r.commodity,
            "Verification": r.verification_status,
            "Forensic_Statement_File": r.forensic_file,
            "Forensic_Page": r.forensic_page,
            "Forensic_Hash": r.forensic_hash,
            "Forensic_Verified_Date": r.verified_at
        }));

        fs.writeFileSync(masterPath, stringifyCSV(exportHeaders, exportRecords));

        return NextResponse.json({
            success: true,
            verified_count: verifiedCount,
            total_records: exportRecords.length,
            backup_file: path.basename(backupPath),
            message: `${verifiedCount} transactions finalized in DB and synced to Master CSV. Audit logs recorded.`
        });

    } catch (error) {
        console.error("Finalize error:", error);
        return NextResponse.json({ error: "Finalization failed", details: (error as Error).message }, { status: 500 });
    }
}
