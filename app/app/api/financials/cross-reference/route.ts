import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/financials/cross-reference
 * Query params: ?qbo_invoice=, ?printavo_invoice=, ?deco_order=, ?limit=, ?offset=
 *
 * Links QuickBooks Online invoice numbers to:
 *   - Printavo invoice numbers (from rosettastone_transactions)
 *   - DecoNetwork order numbers (from rosettastone_transactions)
 */
export async function GET(req: NextRequest) {
  try {
    const db = getDb("evidence_hub");
    const url = req.nextUrl;

    const qboInvoice = url.searchParams.get("qbo_invoice") || "";
    const printavoInvoice = url.searchParams.get("printavo_invoice") || "";
    const decoOrder = url.searchParams.get("deco_order") || "";
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10), 1000);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    const where: string[] = [];
    const params: (string | number)[] = [];

    // Always require at least one meaningful cross-reference
    where.push(
      "(associated_invoice IS NOT NULL AND associated_invoice != '') AND (crm_source LIKE '%Printavo%' OR crm_source LIKE '%Deco%')"
    );

    if (qboInvoice) {
      where.push("(invoice_num LIKE ? OR associated_invoice LIKE ?)");
      params.push(`%${qboInvoice}%`, `%${qboInvoice}%`);
    }
    if (printavoInvoice) {
      where.push("associated_invoice LIKE ?");
      params.push(`%${printavoInvoice}%`);
    }
    if (decoOrder) {
      where.push("(associated_order_job LIKE ? OR order_id LIKE ?)");
      params.push(`%${decoOrder}%`, `%${decoOrder}%`);
    }

    const whereClause = `WHERE ${where.join(" AND ")}`;

    // Count
    const countRow = db
      .prepare(
        `SELECT COUNT(*) as c FROM rosettastone_transactions ${whereClause}`
      )
      .get(...params) as { c: number };

    // Fetch cross-reference rows
    const rows = db
      .prepare(
        `SELECT rosettastone_row_number, date, amount, description, account, bank,
                invoice_num AS qbo_invoice_num, order_id, po_number,
                associated_invoice, associated_po, associated_customer,
                associated_vendor, associated_order_job, crm_source,
                source_match_basis, qbo_sales_initials, normalized_salesperson
         FROM rosettastone_transactions ${whereClause}
         ORDER BY date DESC, rosettastone_row_number DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset) as Record<string, unknown>[];

    // Enrich with Printavo and Deco detail summaries
    const enriched = rows.map((row) => {
      const associatedInv = String(row.associated_invoice || "");
      const associatedOrder = String(row.associated_order_job || "");

      // Get matching Printavo invoices
      let printavoMatches: Record<string, unknown>[] = [];
      if (associatedInv) {
        // May have multiple comma-separated invoice numbers
        const invNums = associatedInv.split(",").map((s: string) => s.trim()).filter(Boolean);
        const placeholders = invNums.map(() => "?").join(",");
        try {
          printavoMatches = db
            .prepare(
              `SELECT invoice_number, customer_name, total, invoice_status, invoice_url, owner
               FROM printavo_invoices WHERE invoice_number IN (${placeholders})`
            )
            .all(...invNums) as Record<string, unknown>[];
        } catch {
          // table may not exist yet
        }
      }

      // Get matching Deco orders
      let decoMatches: Record<string, unknown>[] = [];
      if (associatedOrder) {
        const orderNames = associatedOrder.split("|").map((s: string) => s.trim()).filter(Boolean);
        for (const name of orderNames) {
          try {
            const deco = db
              .prepare(
                `SELECT order_number, order_job_name, order_total, status, billing_company, date_ordered
                 FROM deco_orders WHERE order_job_name LIKE ? OR order_number LIKE ?`
              )
              .all(`%${name}%`, `%${name}%`) as Record<string, unknown>[];
            decoMatches.push(...deco);
          } catch {
            // table may not exist yet
          }
        }
        // Dedupe by order_number
        const seen = new Set();
        decoMatches = decoMatches.filter((d) => {
          const key = d.order_number;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }

      // Determine which CRM sources are involved
      const crmSources = new Set<string>();
      const crmStr = String(row.crm_source || "");
      crmStr.split("|").forEach((s: string) => {
        const trimmed = s.trim();
        if (trimmed) crmSources.add(trimmed);
      });

      return {
        ...row,
        crm_sources: Array.from(crmSources),
        printavo_matches: printavoMatches,
        deco_matches: decoMatches,
      };
    });

    return NextResponse.json({
      source: "cross-reference",
      total: countRow.c,
      limit,
      offset,
      results: enriched,
    });
  } catch (error) {
    console.error("Cross-reference API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cross-reference data" },
      { status: 500 }
    );
  }
}
