import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/financials/deco
 * Query params: ?search=, ?limit=, ?offset=, ?status=, ?include_items=true
 * Returns DecoNetwork orders with purchase orders and optional line items.
 */
export async function GET(req: NextRequest) {
  try {
    const db = getDb("evidence_hub");
    const url = req.nextUrl;

    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || "";
    const includeItems = url.searchParams.get("include_items") !== "false";
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 500);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    const where: string[] = [];
    const params: (string | number)[] = [];

    if (search) {
      where.push(
        "(o.order_number LIKE ? OR o.order_job_name LIKE ? OR o.billing_company LIKE ? OR o.billing_last_name LIKE ? OR o.po_number LIKE ? OR o.supplier_po_number LIKE ?)"
      );
      const q = `%${search}%`;
      params.push(q, q, q, q, q, q);
    }
    if (status) {
      where.push("o.status = ?");
      params.push(status);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    // Count total
    const countRow = db
      .prepare(`SELECT COUNT(*) as c FROM deco_orders o ${whereClause}`)
      .get(...params) as { c: number };

    // Fetch orders
    const orders = db
      .prepare(
        `SELECT o.* FROM deco_orders o ${whereClause}
         ORDER BY o.date_ordered DESC, o.order_number DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset) as Record<string, unknown>[];

    // Attach purchase orders and line items
    const results = await Promise.all(
      orders.map(async (order) => {
        const orderNum = String(order.order_number || "");

        // Find deco POs that reference this order (by PO Number or supplier PO)
        const poByOrderNum = db
          .prepare(
            `SELECT * FROM deco_purchase_orders WHERE po_number = ? OR reference LIKE ?`
          )
          .all(order.po_number || "", `%${orderNum}%`) as Record<string, unknown>[];

        // Also search deco_po_items for items linked to this order
        const orderPoNums = [
          order.po_number,
          order.supplier_po_number,
        ].filter(Boolean);

        let poItems: Record<string, unknown>[] = [];
        if (includeItems && orderPoNums.length > 0) {
          const placeholders = orderPoNums.map(() => "?").join(",");
          poItems = db
            .prepare(
              `SELECT * FROM deco_po_items WHERE po_number IN (${placeholders}) OR order_numbers LIKE ?`
            )
            .all(...orderPoNums, `%${orderNum}%`) as Record<string, unknown>[];
        }

        // Also find POs from po_items
        const itemPoNums = new Set(poItems.map((i) => String(i.po_number || "")));
        const directPoNums = new Set(poByOrderNum.map((p) => String(p.po_number || "")));
        itemPoNums.forEach((n) => directPoNums.add(n));

        return {
          ...order,
          raw_json: order.raw_json ? JSON.parse(String(order.raw_json)) : undefined,
          purchase_orders: poByOrderNum,
          po_items: poItems,
          linked_po_numbers: Array.from(directPoNums),
        };
      })
    );

    return NextResponse.json({
      source: "deconetwork",
      total: countRow.c,
      limit,
      offset,
      results,
    });
  } catch (error) {
    console.error("Deco API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch DecoNetwork data" },
      { status: 500 }
    );
  }
}
