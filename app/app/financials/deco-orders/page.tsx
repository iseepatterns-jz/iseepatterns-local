"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search, Loader2, AlertTriangle, ShoppingCart,
  ChevronUp, ChevronDown, Package
} from "lucide-react";

// Types
interface DecoOrder {
  order_number: string;
  order_type: string;
  status: string;
  production_status: string;
  priority_order: string;
  po_number: string;
  supplier_po_number: string;
  order_job_name: string;
  sales_staff: string;
  date_ordered: string;
  date_invoiced: string;
  date_shipped: string;
  date_due: string;
  date_produced: string;
  date_scheduled: string;
  order_total: number;
  shipping_total: number;
  tax_total: number;
  tax_exempt: string;
  rush_order_cost: number;
  coupon_discount: number;
  amount_billed: number;
  payment_due_date: string;
  payment_date: string;
  payment_terms: string;
  payment_method: string;
  wholesale_price: number;
  base_cost: number;
  site_id: string;
  site_name: string;
  billing_company: string;
  billing_first_name: string;
  billing_last_name: string;
  billing_email: string;
  billing_address: string;
  billing_city: string;
  billing_state: string;
  billing_country: string;
  billing_post_code: string;
  billing_phone: string;
  shipping_first_name: string;
  shipping_last_name: string;
  shipping_company: string;
  shipping_address: string;
  shipping_city: string;
  shipping_state: string;
  shipping_country: string;
  shipping_post_code: string;
  shipping_phone: string;
  shipping_method: string;
  weight_total: number;
  shipping_notes: string;
  purchase_orders: Record<string, unknown>[];
  po_items: Record<string, unknown>[];
  linked_po_numbers: string[];
  raw_json?: unknown;
}

interface DecoApiResponse {
  source: string;
  total: number;
  limit: number;
  offset: number;
  results: DecoOrder[];
}

type SortKey = keyof DecoOrder | "po_count" | "billing_name";
type SortDirection = "asc" | "desc";

const LIMIT = 50;

function fmtCurrency(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

function statusColor(status: string): string {
  const s = (status || "").toLowerCase();
  if (s.includes("complete") || s.includes("shipped") || s.includes("invoiced")) return "var(--accent-emerald)";
  if (s.includes("production") || s.includes("processing")) return "var(--accent-cyan)";
  if (s.includes("hold") || s.includes("cancel") || s.includes("backorder")) return "var(--accent-red)";
  if (s.includes("pending") || s.includes("new")) return "var(--accent-amber)";
  return "var(--text-primary)";
}

function billingDisplayName(order: DecoOrder): string {
  if (order.billing_company) return order.billing_company;
  const parts = [order.billing_first_name, order.billing_last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "—";
}

export default function DecoOrdersPage() {
  const [data, setData] = useState<DecoApiResponse | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("date_ordered");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: String(LIMIT),
        offset: String(offset),
      });
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      const res = await fetch(`/api/financials/deco?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load DecoNetwork data");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [search, status, offset]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sortedRows = useMemo(() => {
    const rows = data?.results || [];
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      let va: string | number;
      let vb: string | number;
      if (sortKey === "po_count") {
        va = a.linked_po_numbers?.length || 0;
        vb = b.linked_po_numbers?.length || 0;
      } else if (sortKey === "billing_name") {
        va = billingDisplayName(a);
        vb = billingDisplayName(b);
      } else if (["order_total", "shipping_total", "tax_total", "amount_billed", "base_cost", "wholesale_price", "rush_order_cost", "coupon_discount", "weight_total"].includes(sortKey)) {
        va = Number(a[sortKey as keyof DecoOrder]) || 0;
        vb = Number(b[sortKey as keyof DecoOrder]) || 0;
      } else {
        va = String(a[sortKey as keyof DecoOrder] || "");
        vb = String(b[sortKey as keyof DecoOrder] || "");
      }
      if (typeof va === "number" && typeof vb === "number") {
        return sortDir === "asc" ? va - vb : vb - va;
      }
      const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data?.results, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(p => p === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "order_total" || key === "date_ordered" ? "desc" : "asc");
    }
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return null;
    return sortDir === "asc"
      ? <ChevronUp size={10} style={{ display: "inline", marginLeft: 2 }} />
      : <ChevronDown size={10} style={{ display: "inline", marginLeft: 2 }} />;
  };

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 0;
  const currentPage = Math.floor(offset / LIMIT) + 1;

  const resetFilters = () => {
    setOffset(0);
    setSearch("");
    setStatus("");
  };

  const th = (align: "left" | "right" = "left"): React.CSSProperties => ({
    textAlign: align,
    padding: "0.6rem 0.75rem",
    fontSize: "0.65rem",
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    whiteSpace: "nowrap",
    cursor: "pointer",
    userSelect: "none",
    borderBottom: "1px solid var(--border-glass)",
  });

  const td = (align: "left" | "right" = "left", mono = false): React.CSSProperties => ({
    textAlign: align,
    padding: "0.5rem 0.75rem",
    fontSize: "0.8rem",
    fontFamily: mono ? "var(--font-mono)" : "inherit",
    borderBottom: "1px solid var(--border-glass)",
  });

  return (
    <div style={{ padding: "2rem", maxWidth: 1600, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0 0 0.25rem 0" }}>
          Deco Orders
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>
          Order records from DecoNetwork platform — RC-2026
        </p>
      </div>

      {/* Filters bar */}
      <div className="glass-panel" style={{ padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <Search size={16} style={{ color: "var(--text-muted)" }} />
          <input
            value={search}
            onChange={(e) => { setOffset(0); setSearch(e.target.value); }}
            placeholder="Search orders, customers, job names, PO numbers..."
            style={{ flex: 1, minWidth: 240, background: "var(--bg-glass)", border: "var(--glass-border)", borderRadius: 6, padding: "0.5rem 0.75rem", color: "var(--text-primary)", fontSize: "0.8rem" }}
          />
          <input
            value={status}
            onChange={(e) => { setOffset(0); setStatus(e.target.value); }}
            placeholder="Filter status"
            style={{ width: 160, background: "var(--bg-glass)", border: "var(--glass-border)", borderRadius: 6, padding: "0.5rem 0.75rem", color: "var(--text-primary)", fontSize: "0.8rem" }}
          />
          <button
            onClick={fetchData}
            style={{ border: "none", borderRadius: 6, padding: "0.5rem 1rem", background: "var(--accent-cyan)", color: "#000", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}
          >
            Refresh
          </button>
          <button
            onClick={resetFilters}
            style={{ border: "var(--glass-border)", borderRadius: 6, padding: "0.5rem 1rem", background: "var(--bg-glass)", color: "var(--text-primary)", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
          <Loader2 size={24} className="animate-spin" style={{ margin: "0 auto 1rem" }} />
          <div>Loading DecoNetwork orders...</div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="glass-panel" style={{ padding: "2rem", textAlign: "center" }}>
          <AlertTriangle size={28} style={{ color: "var(--accent-red)", margin: "0 auto 0.75rem" }} />
          <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
            Unable to load DecoNetwork data
          </div>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0 0 1rem 0" }}>{error}</p>
          <button onClick={fetchData} style={{ border: "var(--glass-border)", borderRadius: 6, padding: "6px 16px", background: "var(--bg-glass)", color: "var(--accent-cyan)", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}>
            Retry
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && data && data.results.length === 0 && (
        <div className="glass-panel" style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
          <ShoppingCart size={28} style={{ margin: "0 auto 0.75rem", opacity: 0.5 }} />
          <div style={{ fontSize: "0.875rem" }}>No DecoNetwork orders found</div>
          <p style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>Try adjusting your search or filters.</p>
        </div>
      )}

      {/* Data */}
      {!loading && !error && data && data.results.length > 0 && (
        <>
          {/* Summary bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", color: "var(--text-muted)", fontSize: "0.78rem" }}>
            <span>
              Showing {data.results.length} of {data.total.toLocaleString()} orders
              {currentPage > 1 && ` · Page ${currentPage} of ${totalPages}`}
            </span>
            {search && <span>Filtered: &quot;{search}&quot;</span>}
          </div>

          {/* Table */}
          <div className="glass-panel" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 1200, borderCollapse: "collapse", fontSize: "0.8rem" }}>
              <thead>
                <tr>
                  <th onClick={() => toggleSort("order_number")} style={th("left")}>
                    Order # {sortIndicator("order_number")}
                  </th>
                  <th onClick={() => toggleSort("date_ordered")} style={th("left")}>
                    Date {sortIndicator("date_ordered")}
                  </th>
                  <th onClick={() => toggleSort("billing_name")} style={th("left")}>
                    Customer {sortIndicator("billing_name")}
                  </th>
                  <th onClick={() => toggleSort("order_job_name")} style={th("left")}>
                    Job Name {sortIndicator("order_job_name")}
                  </th>
                  <th onClick={() => toggleSort("status")} style={th("left")}>
                    Status {sortIndicator("status")}
                  </th>
                  <th onClick={() => toggleSort("production_status")} style={th("left")}>
                    Production {sortIndicator("production_status")}
                  </th>
                  <th onClick={() => toggleSort("sales_staff")} style={th("left")}>
                    Sales Staff {sortIndicator("sales_staff")}
                  </th>
                  <th onClick={() => toggleSort("order_total")} style={th("right")}>
                    Total {sortIndicator("order_total")}
                  </th>
                  <th onClick={() => toggleSort("amount_billed")} style={th("right")}>
                    Billed {sortIndicator("amount_billed")}
                  </th>
                  <th onClick={() => toggleSort("po_count")} style={th("right")}>
                    POs {sortIndicator("po_count")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((order) => (
                  <tr key={order.order_number} style={{ transition: "background 0.1s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-glass-hover)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}
                  >
                    <td style={td("left", true)}>
                      <div>{order.order_number}</div>
                      {order.order_type && <div style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>{order.order_type}</div>}
                    </td>
                    <td style={td("left")}>{order.date_ordered || "—"}</td>
                    <td style={td("left")}>
                      <div>{billingDisplayName(order)}</div>
                      {order.billing_city && order.billing_state && (
                        <div style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
                          {order.billing_city}, {order.billing_state}
                        </div>
                      )}
                    </td>
                    <td style={td("left")} title={order.order_job_name}>
                      <div style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {order.order_job_name || "—"}
                      </div>
                    </td>
                    <td style={td("left")}>
                      <span style={{ color: statusColor(order.status), fontWeight: 600 }}>
                        {order.status || "—"}
                      </span>
                    </td>
                    <td style={td("left")}>
                      {order.production_status ? (
                        <span style={{ color: statusColor(order.production_status), fontWeight: 500 }}>
                          {order.production_status}
                        </span>
                      ) : "—"}
                    </td>
                    <td style={td("left")}>{order.sales_staff || "—"}</td>
                    <td style={td("right", true)}>{fmtCurrency(order.order_total)}</td>
                    <td style={td("right", true)}>{fmtCurrency(order.amount_billed)}</td>
                    <td style={td("right")}>{order.linked_po_numbers?.length || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
            <button
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - LIMIT))}
              style={{
                padding: "0.5rem 1rem", borderRadius: 6,
                border: "var(--glass-border)", background: "var(--bg-glass)",
                color: offset === 0 ? "var(--text-muted)" : "var(--text-primary)",
                cursor: offset === 0 ? "default" : "pointer",
                fontSize: "0.8rem",
              }}
            >
              Previous
            </button>
            <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              disabled={offset + LIMIT >= data.total}
              onClick={() => setOffset(offset + LIMIT)}
              style={{
                padding: "0.5rem 1rem", borderRadius: 6,
                border: "var(--glass-border)", background: "var(--bg-glass)",
                color: offset + LIMIT >= data.total ? "var(--text-muted)" : "var(--text-primary)",
                cursor: offset + LIMIT >= data.total ? "default" : "pointer",
                fontSize: "0.8rem",
              }}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
