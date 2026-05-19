"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search, Loader2, AlertTriangle, Printer,
  ChevronUp, ChevronDown, ExternalLink
} from "lucide-react";

// Types
interface PrintavoInvoice {
  invoice_number: string;
  nickname: string;
  created_date: string;
  customer_name: string;
  customer_id: string;
  customer_company: string;
  customer_email: string;
  invoice_status: string;
  total: number;
  total_untaxed: number;
  amount_paid: number;
  amount_outstanding: number;
  po_number: string;
  tags: string;
  owner: string;
  invoice_url: string;
  public_url: string;
  purchase_orders: { po_number: string; vendor_name: string; cost: number }[];
  raw_json?: unknown;
}

interface PrintavoApiResponse {
  source: string;
  total: number;
  limit: number;
  offset: number;
  results: PrintavoInvoice[];
}

type SortKey = keyof PrintavoInvoice | "po_count";
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
  if (s.includes("paid")) return "var(--accent-emerald)";
  if (s.includes("sent") || s.includes("open")) return "var(--accent-cyan)";
  if (s.includes("overdue") || s.includes("void")) return "var(--accent-red)";
  return "var(--text-primary)";
}

export default function PrintavoInvoicesPage() {
  const [data, setData] = useState<PrintavoApiResponse | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [owner, setOwner] = useState("");
  const [customer, setCustomer] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("created_date");
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
      if (owner) params.set("owner", owner);
      if (customer) params.set("customer", customer);
      const res = await fetch(`/api/financials/printavo?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load Printavo data");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [search, status, owner, customer, offset]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sortedRows = useMemo(() => {
    const rows = data?.results || [];
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      let va: string | number;
      let vb: string | number;
      if (sortKey === "po_count") {
        va = a.purchase_orders?.length || 0;
        vb = b.purchase_orders?.length || 0;
      } else if (sortKey === "total" || sortKey === "amount_paid" || sortKey === "amount_outstanding" || sortKey === "total_untaxed") {
        va = Number(a[sortKey]) || 0;
        vb = Number(b[sortKey]) || 0;
      } else {
        va = String(a[sortKey] || "");
        vb = String(b[sortKey] || "");
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
      setSortDir(key === "total" || key === "created_date" ? "desc" : "asc");
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
    setOwner("");
    setCustomer("");
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
          Printavo Invoices
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>
          Invoice records from Printavo production management — RC-2026
        </p>
      </div>

      {/* Filters bar */}
      <div className="glass-panel" style={{ padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <Search size={16} style={{ color: "var(--text-muted)" }} />
          <input
            value={search}
            onChange={(e) => { setOffset(0); setSearch(e.target.value); }}
            placeholder="Search invoices, customers, companies..."
            style={{ flex: 1, minWidth: 220, background: "var(--bg-glass)", border: "var(--glass-border)", borderRadius: 6, padding: "0.5rem 0.75rem", color: "var(--text-primary)", fontSize: "0.8rem" }}
          />
          <input
            value={status}
            onChange={(e) => { setOffset(0); setStatus(e.target.value); }}
            placeholder="Filter status"
            style={{ width: 140, background: "var(--bg-glass)", border: "var(--glass-border)", borderRadius: 6, padding: "0.5rem 0.75rem", color: "var(--text-primary)", fontSize: "0.8rem" }}
          />
          <input
            value={owner}
            onChange={(e) => { setOffset(0); setOwner(e.target.value); }}
            placeholder="Filter owner"
            style={{ width: 140, background: "var(--bg-glass)", border: "var(--glass-border)", borderRadius: 6, padding: "0.5rem 0.75rem", color: "var(--text-primary)", fontSize: "0.8rem" }}
          />
          <input
            value={customer}
            onChange={(e) => { setOffset(0); setCustomer(e.target.value); }}
            placeholder="Filter customer"
            style={{ width: 160, background: "var(--bg-glass)", border: "var(--glass-border)", borderRadius: 6, padding: "0.5rem 0.75rem", color: "var(--text-primary)", fontSize: "0.8rem" }}
          />
          <button
            onClick={fetchData}
            style={{ border: "none", borderRadius: 6, padding: "0.5rem 1rem", background: "var(--accent-purple)", color: "#fff", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}
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
          <div>Loading Printavo invoices...</div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="glass-panel" style={{ padding: "2rem", textAlign: "center" }}>
          <AlertTriangle size={28} style={{ color: "var(--accent-red)", margin: "0 auto 0.75rem" }} />
          <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
            Unable to load Printavo data
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
          <Printer size={28} style={{ margin: "0 auto 0.75rem", opacity: 0.5 }} />
          <div style={{ fontSize: "0.875rem" }}>No Printavo invoices found</div>
          <p style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>Try adjusting your search or filters.</p>
        </div>
      )}

      {/* Data */}
      {!loading && !error && data && data.results.length > 0 && (
        <>
          {/* Summary bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", color: "var(--text-muted)", fontSize: "0.78rem" }}>
            <span>
              Showing {data.results.length} of {data.total.toLocaleString()} invoices
              {currentPage > 1 && ` · Page ${currentPage} of ${totalPages}`}
            </span>
            {search && <span>Filtered: &quot;{search}&quot;</span>}
          </div>

          {/* Table */}
          <div className="glass-panel" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 1100, borderCollapse: "collapse", fontSize: "0.8rem" }}>
              <thead>
                <tr>
                  <th onClick={() => toggleSort("invoice_number")} style={th("left")}>
                    Invoice # {sortIndicator("invoice_number")}
                  </th>
                  <th onClick={() => toggleSort("created_date")} style={th("left")}>
                    Date {sortIndicator("created_date")}
                  </th>
                  <th onClick={() => toggleSort("customer_name")} style={th("left")}>
                    Customer {sortIndicator("customer_name")}
                  </th>
                  <th onClick={() => toggleSort("nickname")} style={th("left")}>
                    Nickname {sortIndicator("nickname")}
                  </th>
                  <th onClick={() => toggleSort("invoice_status")} style={th("left")}>
                    Status {sortIndicator("invoice_status")}
                  </th>
                  <th onClick={() => toggleSort("owner")} style={th("left")}>
                    Owner {sortIndicator("owner")}
                  </th>
                  <th onClick={() => toggleSort("total")} style={th("right")}>
                    Total {sortIndicator("total")}
                  </th>
                  <th onClick={() => toggleSort("amount_paid")} style={th("right")}>
                    Paid {sortIndicator("amount_paid")}
                  </th>
                  <th onClick={() => toggleSort("amount_outstanding")} style={th("right")}>
                    Due {sortIndicator("amount_outstanding")}
                  </th>
                  <th onClick={() => toggleSort("po_count")} style={th("right")}>
                    POs {sortIndicator("po_count")}
                  </th>
                  <th style={th("left")}>Link</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((inv) => (
                  <tr key={inv.invoice_number} style={{ transition: "background 0.1s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-glass-hover)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}
                  >
                    <td style={td("left", true)}>{inv.invoice_number}</td>
                    <td style={td("left")}>{inv.created_date || "—"}</td>
                    <td style={td("left")}>
                      <div>{inv.customer_name || "—"}</div>
                      {inv.customer_company && <div style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>{inv.customer_company}</div>}
                    </td>
                    <td style={td("left")}>{inv.nickname || "—"}</td>
                    <td style={td("left")}>
                      <span style={{ color: statusColor(inv.invoice_status), fontWeight: 600 }}>
                        {inv.invoice_status || "—"}
                      </span>
                    </td>
                    <td style={td("left")}>{inv.owner || "—"}</td>
                    <td style={td("right", true)}>{fmtCurrency(inv.total)}</td>
                    <td style={td("right", true)}>{fmtCurrency(inv.amount_paid)}</td>
                    <td style={td("right", true)}>
                      <span style={{ color: inv.amount_outstanding > 0 ? "var(--accent-red)" : "var(--text-primary)" }}>
                        {fmtCurrency(inv.amount_outstanding)}
                      </span>
                    </td>
                    <td style={td("right")}>{inv.purchase_orders?.length || 0}</td>
                    <td style={td("left")}>
                      {inv.public_url ? (
                        <a href={inv.public_url} target="_blank" rel="noopener noreferrer"
                          style={{ color: "var(--accent-cyan)", display: "inline-flex", alignItems: "center", gap: 4 }}
                        >
                          <ExternalLink size={14} /> View
                        </a>
                      ) : "—"}
                    </td>
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
