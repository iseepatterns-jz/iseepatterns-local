import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

const STATEMENTS_ROOT = path.resolve(
  "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/STATEMENTS_LOCKER"
);

// ── Bank label mapper ──
const BANK_LABELS: Record<string, string> = {
  "Chase CC": "Chase Credit Card",
  "Chase": "Chase Checking",
  "Fifth Third": "Fifth Third Checking",
};

// ── PDF path cache ──
let _pdfCache: Map<string, string> | null = null;

function buildPdfCache(): Map<string, string> {
  if (_pdfCache) return _pdfCache;

  const cache = new Map<string, string>();
  const walkDir = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(full);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
        // Cache by filename only (case-insensitive key)
        cache.set(entry.name.toLowerCase(), full);
      }
    }
  };
  walkDir(STATEMENTS_ROOT);
  _pdfCache = cache;
  return cache;
}

function resolvePdfPath(forensicFile: string): string | null {
  const cache = buildPdfCache();
  const key = forensicFile.toLowerCase();
  return cache.get(key) || null;
}

// ── Extract account from forensic filename ──
// Pattern: YYYYMMDD-statements-{ACCOUNT}.pdf
function extractAccount(filename: string): string {
  const match = filename.match(/statements-(\d{3,4})/i);
  return match ? match[1] : "";
}

// ── Extract year from forensic filename ──
function extractYear(filename: string): string {
  const match = filename.match(/^(\d{4})/);
  return match ? match[1] : "";
}

/**
 * GET /api/financials/statements — list all unique statements
 * GET /api/financials/statements?file={forensic_statement_file} — transactions for a specific statement
 * GET /api/financials/statements?file={...}&pdf=true — serve the PDF
 */
export async function GET(request: NextRequest) {
  try {
    const db = getDb("evidence_hub");
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const forensicFile = searchParams.get("file");
    const pdfMode = searchParams.get("pdf") === "true" || searchParams.get("pdf") === "1";

    // ── PDF serve mode ──
    if (forensicFile && pdfMode) {
      const pdfPath = resolvePdfPath(forensicFile);
      if (!pdfPath || !fs.existsSync(pdfPath)) {
        return NextResponse.json(
          { success: false, error: "PDF not found" },
          { status: 404 }
        );
      }

      const fileBuffer = fs.readFileSync(pdfPath);
      const fileName = path.basename(pdfPath);

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${fileName}"`,
          "Content-Length": String(fileBuffer.length),
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // ── Statement detail mode (transactions for a specific statement) ──
    if (forensicFile) {
      const rows = db
        .prepare(
          `SELECT * FROM rosettastone_transactions WHERE forensic_statement_file = ? ORDER BY forensic_page, date`
        )
        .all(forensicFile) as any[];

      const pdfPath = resolvePdfPath(forensicFile);

      // Calculate statement-level aggregates
      let totalDebits = 0;
      let totalCredits = 0;
      let runningBalance = 0;

      const transactionsWithBalance = rows.map((row: any) => {
        runningBalance += row.amount || 0;
        if ((row.amount || 0) < 0) totalDebits += Math.abs(row.amount);
        if ((row.amount || 0) > 0) totalCredits += row.amount;
        return { ...row, running_balance: Math.round(runningBalance * 100) / 100 };
      });

      // Get file metadata
      const dateRange = db
        .prepare(
          `SELECT MIN(date) as start_date, MAX(date) as end_date FROM rosettastone_transactions WHERE forensic_statement_file = ?`
        )
        .get(forensicFile) as { start_date: string; end_date: string } | undefined;

      const meta = db
        .prepare(
          `SELECT DISTINCT bank, account, account_type FROM rosettastone_transactions WHERE forensic_statement_file = ? LIMIT 1`
        )
        .get(forensicFile) as { bank: string; account: string; account_type: string } | undefined;

      return NextResponse.json({
        success: true,
        file: forensicFile,
        pdf_path: pdfPath,
        bank: meta?.bank || "",
        bank_label: BANK_LABELS[meta?.bank || ""] || meta?.bank || "",
        account: meta?.account || extractAccount(forensicFile),
        account_type: meta?.account_type || "",
        start_date: dateRange?.start_date || extractYear(forensicFile) + "-01-01",
        end_date: dateRange?.end_date || "",
        total_debits: Math.round(totalDebits * 100) / 100,
        total_credits: Math.round(totalCredits * 100) / 100,
        ending_balance: Math.round(runningBalance * 100) / 100,
        transaction_count: rows.length,
        transactions: transactionsWithBalance,
      });
    }

    // ── Statement list mode ──
    const statements = db
      .prepare(
        `SELECT DISTINCT 
           forensic_statement_file, 
           bank, 
           account, 
           MIN(date) as start_date, 
           MAX(date) as end_date, 
           COUNT(*) as txn_count 
         FROM rosettastone_transactions 
         WHERE forensic_statement_file IS NOT NULL AND forensic_statement_file != '' 
         GROUP BY forensic_statement_file, bank, account 
         ORDER BY bank, account, start_date DESC`
      )
      .all() as any[];

    // Enrich with bank labels and PDF availability
    const enriched = statements.map((s: any) => {
      const pdfPath = resolvePdfPath(s.forensic_statement_file);
      return {
        ...s,
        bank_label: BANK_LABELS[s.bank] || s.bank,
        account_extracted: extractAccount(s.forensic_statement_file),
        year_extracted: extractYear(s.forensic_statement_file),
        pdf_available: !!pdfPath,
        pdf_count: null, // will be filled below
      };
    });

    // Group by bank
    const grouped: Record<string, any[]> = {};
    for (const s of enriched) {
      const key = s.bank_label || s.bank;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(s);
    }

    return NextResponse.json({
      success: true,
      total_statements: statements.length,
      grouped,
      list: enriched,
    });
  } catch (error: any) {
    console.error("Statements API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
