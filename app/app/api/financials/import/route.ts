import { NextRequest, NextResponse } from "next/server";
import { getWorkbenchDb } from "@/lib/db";
import crypto from "crypto";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

const debugLogPath = path.join(process.cwd(), "debug_ingest.log");
const writeDebug = (msg: string) => {
    fs.appendFileSync(debugLogPath, `${new Date().toISOString()} ${msg}\n`);
};

/**
 * POST /api/financials/import
 * Handles both session deletion (via action=delete) and PDF uploads.
 */
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const action = formData.get("action");

        // Action: DELETE
        if (action === "delete") {
            const id = formData.get("id");
            writeDebug(`[POST-DELETE] Request to purge session ID: ${id}`);
            if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
            
            const db = getWorkbenchDb();
            db.transaction(() => {
                db.prepare("DELETE FROM statement_transactions WHERE import_session_id = ?").run(id);
                db.prepare("DELETE FROM import_sessions WHERE id = ?").run(id);
            })();
            writeDebug(`[POST-DELETE] Successfully purged session ${id}`);
            return NextResponse.json({ success: true });
        }

        // Action: UPLOAD (Default)
        const file = formData.get("file") as File | null;
        const bankName = formData.get("bankName") as string || "Unknown";
        const statementType = formData.get("statementType") as string || "CREDIT_CARD";

        if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

        const buffer = Buffer.from(await file.arrayBuffer());
        const hash = crypto.createHash("sha256").update(buffer).digest("hex");

        const UPLOADS_DIR = path.join(process.cwd(), "data", "UPLOADS");
        if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        
        const storagePath = path.join(UPLOADS_DIR, `${hash}.pdf`);
        if (!fs.existsSync(storagePath)) fs.writeFileSync(storagePath, buffer);

        const db = getWorkbenchDb();
        const stmt = db.prepare(`
            INSERT INTO statement_files (original_filename, storage_path, sha256_hash, size_bytes, bank_name, statement_type)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(sha256_hash) DO UPDATE SET original_filename=excluded.original_filename
            RETURNING id
        `).get(file.name, storagePath, hash, file.size, bankName, statementType) as { id: number };

        const session = db.prepare(`
            INSERT INTO import_sessions (statement_file_id, status)
            VALUES (?, 'PARSING')
            RETURNING id
        `).get(stmt.id) as { id: number };

        let transactionCount = 0;
        try {
            writeDebug(`Starting parse for ${file.name} (Hash: ${hash.slice(0, 8)})`);
            
            let PDFParse: any;
            try {
                const pdfParseModule = await import("pdf-parse");
                PDFParse = (pdfParseModule as any).PDFParse || (pdfParseModule as any).default?.PDFParse || (pdfParseModule as any).default;
                
                if (PDFParse.setWorker) {
                    const workerPath = path.join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs");
                    if (fs.existsSync(workerPath)) {
                        PDFParse.setWorker(workerPath);
                        writeDebug(`Worker explicitly set to: ${workerPath}`);
                    }
                }
            } catch (err) {
                const pdfParseModule = require("pdf-parse");
                PDFParse = pdfParseModule.PDFParse || pdfParseModule.default?.PDFParse || pdfParseModule;
            }
            
            if (!PDFParse) throw new Error("Could not load PDFParse");

            const parser = new PDFParse({ data: buffer });
            const result = await parser.getText();
            const text = result.text;
            
            const lines = text.split('\n');
            const transactions: any[] = [];
            
            // Chase 2016 Regex
            const chaseTxRegex = /(\d{1,2}\/\d{1,2})\s+(.*?)\s+(-?[\d,]+\.\d{2})(?:\s|$)/;
            let pageNum = 1;

            for (const line of lines) {
                if (line.toLowerCase().includes("page")) {
                    const pMatch = line.match(/page\s+(\d+)/i);
                    if (pMatch) pageNum = parseInt(pMatch[1]);
                }
                const match = line.match(chaseTxRegex);
                if (match) {
                    const amount = parseFloat(match[3].replace(/,/g, ''));
                    if (match[2].length > 2 && !match[2].includes("New Balance")) {
                        transactions.push({ date: match[1], description: match[2].trim(), amount, page: pageNum });
                    }
                }
            }

            if (transactions.length === 0) {
                const genericRegex = /(\d{1,2}\/\d{1,2})\s+(.*?)\s+(-?\d+\.\d{2})/;
                for (const line of lines) {
                    const match = line.match(genericRegex);
                    if (match) transactions.push({ date: match[1], description: match[2].trim(), amount: parseFloat(match[3]), page: pageNum });
                }
            }

            const insertTxn = db.prepare(`
                INSERT INTO statement_transactions (import_session_id, statement_file_id, date, description_raw, amount, page_number)
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            db.transaction(() => {
                for (const t of transactions) {
                    insertTxn.run(session.id, stmt.id, t.date, t.description, t.amount, t.page);
                    transactionCount++;
                }
                db.prepare("UPDATE import_sessions SET status = 'REVIEW', transaction_count = ? WHERE id = ?").run(transactionCount, session.id);
            })();
            writeDebug(`Session ${session.id} success: ${transactionCount} records`);

        } catch (e) {
            const errMsg = (e as Error).message;
            writeDebug(`PARSING ERROR: ${errMsg}`);
            db.prepare("UPDATE import_sessions SET status = 'FAILED', error_message = ? WHERE id = ?")
              .run(`${errMsg}\n${(e as Error).stack?.slice(0, 500)}`, session.id);
        }

        return NextResponse.json({ success: true, session_id: session.id, count: transactionCount });

    } catch (error) {
        console.error("Statement Import API error:", error);
        return NextResponse.json({ error: "Import failed", detail: (error as Error).message }, { status: 500 });
    }
}

/**
 * GET /api/financials/import
 * Lists previous import sessions.
 */
export async function GET() {
    try {
        const db = getWorkbenchDb();
        const sessions = db.prepare(`
            SELECT s.*, f.original_filename, f.sha256_hash, f.bank_name
            FROM import_sessions s
            JOIN statement_files f ON s.statement_file_id = f.id
            ORDER BY s.created_at DESC
        `).all();
        return NextResponse.json(sessions);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        writeDebug(`[API-DELETE] Received delete request for session ID: ${id}`);
        
        if (!id) {
            writeDebug("[API-DELETE] Error: ID missing");
            return NextResponse.json({ error: "ID required" }, { status: 400 });
        }

        const db = getWorkbenchDb();
        
        // Verify existence first for logging
        const session = db.prepare("SELECT id FROM import_sessions WHERE id = ?").get(id);
        if (!session) {
            writeDebug(`[API-DELETE] Warning: Session ${id} not found in database`);
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        db.transaction(() => {
            const txCount = db.prepare("DELETE FROM statement_transactions WHERE import_session_id = ?").run(id);
            const sessCount = db.prepare("DELETE FROM import_sessions WHERE id = ?").run(id);
            writeDebug(`[API-DELETE] Successfully purged session ${id}. Deleted ${txCount.changes} transactions and ${sessCount.changes} session records.`);
        })();
        
        return NextResponse.json({ success: true });
    } catch (error) {
        const msg = (error as Error).message;
        writeDebug(`[API-DELETE] FATAL ERROR: ${msg}`);
        console.error("Delete failed:", error);
        return NextResponse.json({ error: "Delete failed", detail: msg }, { status: 500 });
    }
}
