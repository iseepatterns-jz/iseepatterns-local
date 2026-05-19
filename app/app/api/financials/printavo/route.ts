import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/financials/printavo
 * Query params: ?search=, ?limit=, ?offset=, ?customer=, ?status=, ?owner=
 * Returns Printavo invoices joined with purchase orders.
 */
export async function GET(req: NextRequest) {
  try {
    const db = getDb("evidence_hub");
    const url = req.nextUrl;

    const search = url.searchParams.get("search") || "";
    const customer = url.searchParams.get("customer") || "";
    const status = url.searchParams.get("status") || "";
    const owner = url.searchParams.get("owner") || "";
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 500);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    const where: string[] = [];
    const params: (string | number)[] = [];

    if (search) {
      where.push("(i.invoice_number LIKE ? OR i.customer_name LIKE ? OR i.nickname LIKE ? OR i.customer_company LIKE ?)");
      const q = `%${search}%`;
      params.push(q, q, q, q);
    }
    if (customer) {
      where.push("(i.customer_name LIKE ? OR i.customer_company LIKE ?)");
      const c = `%${customer}%`;
      params.push(c, c);
    }
    if (status) {
      where.push("i.invoice_status = ?");
      params.push(status);
    }
    if (owner) {
      where.push("i.owner = ?");
      params.push(owner);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    // Count total
    const countRow = db
      .prepare(`SELECT COUNT(*) as c FROM printavo_invoices i ${whereClause}`)
      .get(...params) as { c: number };

    // Fetch invoices with their POs as a JSON array
    const invoices = db
      .prepare(
        `SELECT i.* FROM printavo_invoices i ${whereClause}
         ORDER BY i.created_date DESC, i.invoice_number DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset) as Record<string, unknown>[];

    // Attach purchase orders to each invoice
    const poStmt = db.prepare(
      `SELECT po_number, vendor_name, cost FROM printavo_purchase_orders WHERE invoice_number = ?`
    );

    // Also search by PO's invoice_number referencing the invoice
    const poByInvStmt = db.prepare(
      `SELECT po_number, vendor_name, cost FROM printavo_purchase_orders WHERE invoice_number LIKE ?`
    );

    const results = invoices.map((inv) => {
      const invNum = String(inv.invoice_number || "");
      let pos = poStmt.all(invNum) as Record<string, unknown>[];

      // Also try matching where PO.invoice_number contains this invoice (comma-separated)
      if (pos.length === 0) {
        pos = poByInvStmt.all(`%${invNum}%`) as Record<string, unknown>[];
      }

      return {
        ...inv,
        purchase_orders: pos,
        raw_json: inv.raw_json ? JSON.parse(String(inv.raw_json)) : undefined,
      };
    });

    return NextResponse.json({
      source: "printavo",
      total: countRow.c,
      limit,
      offset,
      results,
    });
  } catch (error) {
    console.error("Printavo API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Printavo data" },
      { status: 500 }
    );
  }
}
