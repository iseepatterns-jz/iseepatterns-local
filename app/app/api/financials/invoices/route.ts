import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

export const dynamic = "force-dynamic";

const INV_DB_PATH = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/_analysis_outputs/rowboat_invoice_database/invoice_analysis.db";

export async function GET(request: NextRequest) {
  try {
    const db = new Database(INV_DB_PATH, { readonly: true });
    const url = new URL(request.url);
    const invoiceNum = url.searchParams.get("invoice");
    const poNum = url.searchParams.get("po");
    const customer = url.searchParams.get("customer");

    const results: any = {};

    if (invoiceNum) {
      results.invoice = db.prepare(
        `SELECT * FROM invoices WHERE doc_number = ? OR id = ?`
      ).get(invoiceNum, isNaN(Number(invoiceNum)) ? -1 : Number(invoiceNum));

      if (results.invoice) {
        const links = db.prepare(
          `SELECT po_id, relationship_type FROM invoice_po_link WHERE invoice_id = ?`
        ).all((results.invoice as any).id);
        results.linked_pos = links;

        const printavo = db.prepare(
          `SELECT * FROM printavo_orders WHERE invoice_number = ?`
        ).all((results.invoice as any).doc_number);
        results.printavo_orders = printavo;

        const deco = db.prepare(
          `SELECT * FROM deco_orders WHERE po_number IN (SELECT doc_number FROM purchase_orders WHERE id IN (SELECT po_id FROM invoice_po_link WHERE invoice_id = ?))`
        ).all((results.invoice as any).id);
        results.deco_orders = deco;
      }
    }

    if (poNum) {
      results.po = db.prepare(`SELECT * FROM purchase_orders WHERE doc_number = ?`).get(poNum);
      if (results.po) {
        results.linked_invoices = db.prepare(
          `SELECT invoice_id, relationship_type FROM invoice_po_link WHERE po_id = ?`
        ).all((results.po as any).id);
      }
    }

    if (customer) {
      results.customer_invoices = db.prepare(
        `SELECT * FROM invoices WHERE LOWER(customer_name) LIKE LOWER(?) OR LOWER(customer_company) LIKE LOWER(?) LIMIT 50`
      ).all(`%${customer}%`, `%${customer}%`);
    }

    if (!invoiceNum && !poNum && !customer) {
      results.invoice_count = (db.prepare("SELECT COUNT(*) as c FROM invoices").get() as any).c;
      results.po_count = (db.prepare("SELECT COUNT(*) as c FROM purchase_orders").get() as any).c;
      results.deco_count = (db.prepare("SELECT COUNT(*) as c FROM deco_orders").get() as any).c;
      results.printavo_count = (db.prepare("SELECT COUNT(*) as c FROM printavo_orders").get() as any).c;
      results.years = db.prepare(
        "SELECT DISTINCT year FROM invoices WHERE year IS NOT NULL ORDER BY year"
      ).all().map((r: any) => r.year);
    }

    db.close();
    return NextResponse.json({ success: true, ...results });
  } catch (error: any) {
    console.error("Invoice cross-reference error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
