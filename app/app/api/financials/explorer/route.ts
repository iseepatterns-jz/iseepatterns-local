import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// All filterable columns from the RosettaStone
const FILTERABLE_COLUMNS = [
  "sortable_date", "date", "amount", "description", "transaction_type", "account",
  "account_type", "bank", "user", "category", "class", "company",
  "invoice_num", "client", "order_id", "po_number", "notes",
  "verification", "forensic_statement_file", "forensic_page",
  "associated_invoice", "associated_po", "associated_customer",
  "associated_vendor", "associated_order_job", "crm_source", "qb_source",
  "source_match_basis", "gap_flag", "qbo_sales_initials",
  "normalized_salesperson", "salesperson_category", "commission_note"
];

export async function GET(request: NextRequest) {
  try {
    const db = getDb("evidence_hub");
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(500, Math.max(5, parseInt(searchParams.get("pageSize") || "100")));
    const offset = (page - 1) * pageSize;

    const sortField = FILTERABLE_COLUMNS.includes(searchParams.get("sortField") || "")
      ? searchParams.get("sortField")
      : "sortable_date";
    const sortDir = searchParams.get("sortDir") === "asc" ? "ASC" : "DESC";

    const conditions: string[] = [];
    const params: any[] = [];

    for (const col of FILTERABLE_COLUMNS) {
      const val = searchParams.get(col);
      if (val && val.trim() && col !== "amount") {
        conditions.push(`LOWER("${col}") LIKE LOWER(?)`);
        params.push(`%${val.trim()}%`);
      }
    }

    const amountMin = searchParams.get("amount_min");
    const amountMax = searchParams.get("amount_max");
    if (amountMin) { conditions.push(`amount <= ?`); params.push(parseFloat(amountMin)); }
    if (amountMax) { conditions.push(`amount >= ?`); params.push(parseFloat(amountMax)); }

    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    if (dateFrom) { conditions.push(`date >= ?`); params.push(dateFrom); }
    if (dateTo) { conditions.push(`date <= ?`); params.push(dateTo); }

    const quickSearch = searchParams.get("q");
    if (quickSearch && quickSearch.trim()) {
      const searchFields = [
        "description", "company", "client", "notes", "category",
        "associated_customer", "associated_vendor", "invoice_num", "po_number"
      ];
      const clauses = searchFields.map(f => `LOWER("${f}") LIKE LOWER(?)`);
      conditions.push(`(${clauses.join(" OR ")})`);
      const sParam = `%${quickSearch.trim()}%`;
      searchFields.forEach(() => params.push(sParam));
    }

    // Multi-value filters
    for (const field of ["user", "bank", "category", "transaction_type"]) {
      const val = searchParams.get(field);
      if (val && val.trim()) {
        const items = val.split(",").filter(Boolean);
        if (items.length) {
          conditions.push(`"${field}" IN (${items.map(() => "?").join(",")})`);
          items.forEach((i: string) => params.push(i.trim()));
        }
      }
    }

    const verificationFilter = searchParams.get("verification");
    if (verificationFilter) { conditions.push(`"verification" = ?`); params.push(verificationFilter); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const { total } = db.prepare(`SELECT COUNT(*) as total FROM rosettastone_transactions ${whereClause}`).get(...params) as any;

    const rows = db.prepare(
      `SELECT * FROM rosettastone_transactions ${whereClause} ORDER BY "${sortField}" ${sortDir} LIMIT ? OFFSET ?`
    ).all(...params, pageSize, offset);

    const getDistinct = (col: string) => {
      return db.prepare(
        `SELECT DISTINCT "${col}" FROM rosettastone_transactions WHERE "${col}" IS NOT NULL AND "${col}" != '' ORDER BY "${col}" LIMIT 200`
      ).all().map((r: any) => r[col]);
    };

    let filterOptions: any = {};
    try {
      filterOptions = {
        banks: getDistinct("bank"),
        accounts: getDistinct("account"),
        account_types: getDistinct("account_type"),
        users: getDistinct("user"),
        categories: getDistinct("category"),
        classes: getDistinct("class"),
        transaction_types: getDistinct("transaction_type"),
        verification_statuses: ["UNVERIFIED", "VERIFIED", "DISPUTED"],
        companies: getDistinct("company"),
        salespersons: getDistinct("normalized_salesperson"),
      };
    } catch {}

    return NextResponse.json({
      success: true,
      data: rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      filterOptions,
      sort: { field: sortField, direction: sortDir },
    });
  } catch (error: any) {
    console.error("Financial explorer error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
