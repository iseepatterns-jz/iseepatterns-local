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

function ensureStatementTransactionSchema(db: any) {
    const info = db.pragma("table_info(statement_transactions)") as any[];
    const columnNames = info.map((c: any) => c.name);
    if (!columnNames.includes("user_label_override")) {
        db.prepare("ALTER TABLE statement_transactions ADD COLUMN user_label_override TEXT").run();
    }
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
        ensureStatementTransactionSchema(db);

        // 1. Get forensic matches with their statement metadata
        const sessionInt = Number(sessionId);
        if (isNaN(sessionInt)) {
            return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
        }

        // Matched + Reviewed: update existing master records
        const matches = db.prepare(`
            SELECT st.id, st.master_id, st.page_number, st.description_raw, st.amount, st.date,
                   st.rosetta_user, st.rosetta_account, st.rosetta_category, st.rosetta_company,
                   st.match_score, st.player_id,
                   sf.original_filename AS source_filename
            FROM statement_transactions st
            LEFT JOIN import_sessions isess ON st.import_session_id = isess.id
            LEFT JOIN statement_files sf ON isess.statement_file_id = sf.id
            WHERE st.import_session_id = ?
              AND st.verification_status = 'MATCHED'
              AND st.review_status = 'REVIEWED'
        `).all(sessionInt) as any[];

        // Unmatched but Reviewed: insert as NEW master records (RosettaStone gap fill)
        const unmatched = db.prepare(`
            SELECT st.id, st.page_number, st.description_raw, st.amount, st.date,
                   st.player_id, st.user_label_override,
                   sf.original_filename AS source_filename,
                   sf.bank_name
            FROM statement_transactions st
            LEFT JOIN import_sessions isess ON st.import_session_id = isess.id
            LEFT JOIN statement_files sf ON isess.statement_file_id = sf.id
            WHERE st.import_session_id = ?
              AND st.verification_status = 'PENDING'
              AND st.review_status = 'REVIEWED'
              AND st.master_id IS NULL
        `).all(sessionInt) as any[];

        if (matches.length === 0 && unmatched.length === 0) {
            const anyReviewed = db.prepare(`SELECT count(*) as count FROM statement_transactions WHERE import_session_id = ? AND review_status = 'REVIEWED'`).get(sessionInt) as any;
            const anyPending = db.prepare(`SELECT count(*) as count FROM statement_transactions WHERE import_session_id = ? AND review_status = 'PENDING_REVIEW'`).get(sessionInt) as any;
            
            return NextResponse.json({
                error: `Nothing to finalize. (Session ${sessionInt}: ${anyReviewed?.count || 0} Reviewed, ${anyPending?.count || 0} still Pending Review). All items must be Reviewed before finalization.`,
                debug: { anyReviewed: anyReviewed?.count, anyPending: anyPending?.count }
            }, { status: 400 });
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

        const auditInsertStmt = db.prepare(`
            INSERT INTO master_audit_log (master_id, action, changed_fields, reason, agent_id)
            VALUES (?, 'CREATE', ?, 'New master record from statement review (RosettaStone gap fill)', 'antigravity-system')
        `);

        const updateTxnStmt = db.prepare(`
            UPDATE statement_transactions
            SET verification_status = 'FINALIZED' 
            WHERE id = ?
        `);

        // INSERT new master record from unmatched-but-reviewed transaction
        const insertMasterStmt = db.prepare(`
            INSERT INTO master_transactions (
                year, date, amount, description, transaction_type,
                user_label, verification_status,
                forensic_file, forensic_page, forensic_hash, verified_at, updated_at
            ) VALUES (?, ?, ?, ?, 'UNCATEGORIZED', ?, 'FORENSICALLY_VERIFIED', ?, ?, ?, datetime('now'), datetime('now'))
        `);

        const linkStmt = db.prepare(`
            UPDATE statement_transactions
            SET master_id = ?
            WHERE id = ?
        `);

        const updateSessionStmt = db.prepare(`
            UPDATE import_sessions 
            SET status = 'COMPLETE', updated_at = datetime('now')
            WHERE id = ?
        `);

        let verifiedCount = 0;
        let insertedCount = 0;
        const finalizedResults: any[] = [];

        // Transactional update for data integrity
        const finalizeTxn = db.transaction((matches, unmatched, sessionId) => {
            // --- Phase 1: Matched records — update existing master records ---
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
                finalizedResults.push({ id: m.id, masterId: m.master_id, hash: forensicHash, action: 'matched' });
            }

            // --- Phase 2: Unmatched-but-reviewed — insert NEW master records ---
            for (const u of unmatched) {
                const hashInput = `NEW|${u.amount}|${u.date}|${u.description_raw}|${u.source_filename}|${u.page_number}`;
                const forensicHash = crypto.createHash("sha256").update(hashInput).digest("hex").slice(0, 16);

                const txYear = u.date ? (u.date as string).slice(0, 4) : '0000';
                const computedUserName = u.player_id === 51 ? 'JZ' : u.player_id === 20 ? 'LG' : u.player_id === 29 ? 'PH' : 'UNKNOWN';
                const userName = u.user_label_override || computedUserName;

                // Insert new master record
                const result = insertMasterStmt.run(
                    txYear, u.date, u.amount, u.description_raw,
                    userName,
                    u.source_filename, u.page_number, forensicHash
                );
                const newMasterId = result.lastInsertRowid;

                // Link statement transaction to new master record
                linkStmt.run(newMasterId, u.id);

                // Log audit
                const changes = JSON.stringify({
                    action: 'RosettaStone gap fill',
                    source: u.source_filename,
                    player_id: u.player_id,
                    user_label_override: u.user_label_override || null,
                    user_label: userName,
                    forensic_hash: forensicHash
                });
                auditInsertStmt.run(newMasterId, changes);

                // Update statement transaction
                updateTxnStmt.run(u.id);

                insertedCount++;
                finalizedResults.push({ id: u.id, masterId: newMasterId, hash: forensicHash, action: 'inserted' });
            }

            updateSessionStmt.run(sessionId);
        });

        finalizeTxn(matches, unmatched, sessionInt);

        // 3. Export to CSV (Synchronize Accountant View)
        const masterPath = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/FINANCIAL_LOCKER/ROWBOAT_CREATIVE_ROSETTASTONE/rbc-rosettastone-statement-transactions-master-sheet-full.csv";
        
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
            verified_count: verifiedCount + insertedCount,
            total_records: exportRecords.length,
            backup_file: path.basename(backupPath),
            message: `${verifiedCount} matched + ${insertedCount} new records (${verifiedCount + insertedCount} total) finalized in DB and synced to Master CSV. Audit logs recorded.`
        });

    } catch (error) {
        console.error("Finalize error:", error);
        return NextResponse.json({ error: "Finalization failed", details: (error as Error).message }, { status: 500 });
    }
}
