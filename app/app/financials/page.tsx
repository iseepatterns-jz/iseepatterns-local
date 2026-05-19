"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, Filter, X, ChevronLeft, ChevronRight, Loader2,
  ArrowUpDown, DollarSign, CreditCard, FileText, Download,
  Building2, User, Calendar, AlertTriangle, CheckCircle, Ban,
  BarChart3, Eye, EyeOff, Columns, ChevronDown, ExternalLink,
  TrendingUp, TrendingDown, Shield, Scale, FileSpreadsheet,
  ReceiptText, Landmark, ArrowRight, Database, ScrollText,
  Printer, ShoppingCart, Briefcase, Link2
} from "lucide-react";

// ─── Constants ──────────────────────────────────────────────────────────────

const PAGE_SIZES = [25, 50, 100, 250, 500];

type Tab = "explorer" | "statements" | "summary" | "taxes" | "crossref";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "explorer", label: "Explorer", icon: Search },
  { id: "statements", label: "Statements", icon: FileText },
  { id: "summary", label: "Summary", icon: BarChart3 },
  { id: "taxes", label: "Tax Returns", icon: ReceiptText },
  { id: "crossref", label: "Cross-Reference", icon: Link2 },
];

const EXPLORER_COLUMNS = [
  { key: "date", label: "Date" },
  { key: "description", label: "Description" },
  { key: "transaction_type", label: "Type" },
  { key: "amount", label: "Amount" },
  { key: "account", label: "Account" },
  { key: "account_type", label: "Acct Type" },
  { key: "bank", label: "Bank" },
  { key: "user", label: "User" },
  { key: "category", label: "Category" },
  { key: "class", label: "Class" },
  { key: "company", label: "Company" },
  { key: "invoice_num", label: "Invoice #" },
  { key: "po_number", label: "PO #" },
  { key: "client", label: "Client" },
  { key: "normalized_salesperson", label: "Salesperson" },
  { key: "verification", label: "V" },
  { key: "forensic_statement_file", label: "Stmt" },
];

const DEFAULT_VISIBLE_COLUMNS = [
  "date", "description", "amount", "bank", "user", "category", "transaction_type",
];

function classNames(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

// ─── Format helpers ─────────────────────────────────────────────────────────

function formatCurrency(n: number | null | undefined): string {
  if (n == null) return "";
  const abs = Math.abs(n);
  return `$${abs.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function csvEscape(val: unknown): string {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// ─── Tab Icons mapping ──────────────────────────────────────────────────────

function TabIcon({ icon: Icon }: { icon: React.ElementType }) {
  return <Icon className="w-4 h-4" />;
}

// ─── Verification Badge ─────────────────────────────────────────────────────

function VerificationBadge({ status }: { status: string }) {
  if (status === "VERIFIED") {
    return (
      <span className="badge badge-emerald gap-1">
        <CheckCircle className="w-3 h-3" /> Verified
      </span>
    );
  }
  if (status === "DISPUTED") {
    return (
      <span className="badge badge-red gap-1">
        <Ban className="w-3 h-3" /> Disputed
      </span>
    );
  }
  return (
    <span className="badge badge-orange gap-1">
      <AlertTriangle className="w-3 h-3" /> Unverified
    </span>
  );
}

// ─── Transaction Type Badge ─────────────────────────────────────────────────

function TransactionTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    "CC Debit": "bg-amber-900/40 text-amber-300 border-amber-700/30",
    "Deposit": "bg-green-900/40 text-green-300 border-green-700/30",
    "Withdrawl": "bg-red-900/40 text-red-300 border-red-700/30",
    "CC Credit": "bg-blue-900/40 text-blue-300 border-blue-700/30",
  };
  return (
    <span className={classNames("text-[11px] px-1.5 py-0.5 rounded border", colors[type] || "bg-zinc-800 text-zinc-400 border-zinc-700")}>
      {type}
    </span>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function FinancialExplorer() {
  const [activeTab, setActiveTab] = useState<Tab>("explorer");

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-deep)" }}>
      {/* Page Header */}
      <div className="flex-none page-header px-8 pt-6 pb-2">
        <h1>Financial Explorer</h1>
        <p>RosettaStone SSOT — Transaction analysis, statements, tax returns, and cross-references</p>
      </div>

      {/* Tab Bar */}
      <div className="flex-none px-8 pb-0">
        <div className="workbench-type-tabs border-b" style={{ borderColor: "var(--border-glass)" }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={classNames(
                "workbench-type-tab",
                activeTab === tab.id && "active"
              )}
            >
              <TabIcon icon={tab.icon} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "explorer" && <ExplorerTab />}
        {activeTab === "statements" && <StatementsTab />}
        {activeTab === "summary" && <SummaryTab />}
        {activeTab === "taxes" && <TaxReturnsTab />}
        {activeTab === "crossref" && <CrossRefTab />}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPLORER TAB
// ══════════════════════════════════════════════════════════════════════════════

function ExplorerTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [sortField, setSortField] = useState("date");
  const [sortDir, setSortDir] = useState<"ASC" | "DESC">("DESC");

  const [showFilters, setShowFilters] = useState(true);
  const [quickSearch, setQuickSearch] = useState("");
  const quickSearchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filterOptions, setFilterOptions] = useState<any>({});
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(DEFAULT_VISIBLE_COLUMNS));
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [linkedData, setLinkedData] = useState<any>(null);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      params.set("sortField", sortField);
      params.set("sortDir", sortDir.toLowerCase());
      if (quickSearch) params.set("q", quickSearch);
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });

      const res = await fetch(`/api/financials/explorer?${params}`);
      const json = await res.json();
      if (json.success) {
        setRows(json.data);
        setTotal(json.pagination.total);
        if (Object.keys(filterOptions).length === 0 && json.filterOptions) {
          setFilterOptions(json.filterOptions);
        }
      } else {
        setError(json.error || "Unknown error");
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, [page, pageSize, sortField, sortDir, quickSearch, filters]);

  useEffect(() => { loadData(); }, [loadData]);

  // Debounced quick search
  const handleQuickSearch = (value: string) => {
    setQuickSearch(value);
    if (quickSearchTimeout.current) clearTimeout(quickSearchTimeout.current);
    quickSearchTimeout.current = setTimeout(() => {
      setPage(1);
      loadData();
    }, 400);
  };

  // Toggle sort
  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === "ASC" ? "DESC" : "ASC");
    } else {
      setSortField(field);
      setSortDir("DESC");
    }
    setPage(1);
  };

  // Set filter
  const setFilter = (field: string, value: string) => {
    setFilters(f => ({ ...f, [field]: value }));
    setPage(1);
  };

  const clearAllFilters = () => {
    setFilters({});
    setQuickSearch("");
    setPage(1);
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length + (quickSearch ? 1 : 0);
  const totalPages = Math.ceil(total / pageSize);

  // Toggle column visibility
  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // Export CSV
  const exportCSV = async () => {
    try {
      setLoading(true);
      // Fetch all filtered data (up to 10000 rows)
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("pageSize", "10000");
      params.set("sortField", sortField);
      params.set("sortDir", sortDir.toLowerCase());
      if (quickSearch) params.set("q", quickSearch);
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });

      const res = await fetch(`/api/financials/explorer?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error("Export failed");

      const allRows = json.data;
      const cols = EXPLORER_COLUMNS.map(c => c.key);
      const header = cols.map(c => csvEscape(EXPLORER_COLUMNS.find(cl => cl.key === c)?.label)).join(",");
      const body = allRows.map((r: any) => cols.map(c => csvEscape(r[c])).join(",")).join("\n");
      const csv = header + "\n" + body;

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rosettastone_export_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError("Export failed: " + e.message);
    }
    setLoading(false);
  };

  // Row click → load linked data
  const handleRowClick = async (row: any) => {
    setSelectedRow(row);
    setLinkedData(null);
    if (row.invoice_num || row.po_number) {
      try {
        const params = new URLSearchParams();
        if (row.invoice_num) params.set("invoice", row.invoice_num);
        if (row.po_number) params.set("po", row.po_number);
        const res = await fetch(`/api/financials/invoices?${params}`);
        const json = await res.json();
        if (json.success) setLinkedData(json);
      } catch {}
    }
  };

  const FILTER_GROUPS = [
    { field: "bank", label: "Bank", options: filterOptions.banks },
    { field: "account", label: "Account", options: filterOptions.accounts },
    { field: "user", label: "User", options: filterOptions.users },
    { field: "category", label: "Category", options: filterOptions.categories },
    { field: "transaction_type", label: "Type", options: filterOptions.transaction_types },
    { field: "verification", label: "Verification", options: filterOptions.verification_statuses || ["UNVERIFIED", "VERIFIED", "DISPUTED"] },
    { field: "class", label: "Class", options: filterOptions.classes },
    { field: "company", label: "Company", options: filterOptions.companies },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top Controls */}
      <div className="flex-none px-8 py-3 flex flex-col gap-3" style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-glass)" }}>
        {/* Search & Actions Row */}
        <div className="flex items-center gap-3">
          <div className="flex-1 max-w-xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search descriptions, companies, invoices, customers..."
              value={quickSearch}
              onChange={e => handleQuickSearch(e.target.value)}
              className="input-glass pl-9"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={classNames(
              "workbench-ctrl-btn",
              showFilters && "flagged-active"
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowColumnPicker(!showColumnPicker)}
              className="workbench-ctrl-btn"
            >
              <Columns className="w-3.5 h-3.5" />
              Columns
            </button>
            {showColumnPicker && (
              <div className="absolute right-0 top-full mt-1 z-50 glass-panel p-2 w-56 shadow-2xl max-h-80 overflow-y-auto">
                <div className="text-xs font-semibold uppercase mb-2 px-1" style={{ color: "var(--text-muted)" }}>Toggle Columns</div>
                {EXPLORER_COLUMNS.map(col => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns.has(col.key)}
                      onChange={() => toggleColumn(col.key)}
                      className="accent-cyan-400"
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            )}
          </div>

          <button onClick={exportCSV} className="workbench-ctrl-btn" disabled={loading}>
            <Download className="w-3.5 h-3.5" />
            Export
          </button>

          {activeFilterCount > 0 && (
            <button onClick={clearAllFilters} className="workbench-ctrl-btn">
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>

        {/* Amount & Date Range */}
        {showFilters && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1">
              <label className="text-xs font-semibold uppercase" style={{ color: "var(--text-muted)" }}>From</label>
              <input
                type="date"
                value={filters.date_from || ""}
                onChange={e => setFilter("date_from", e.target.value)}
                className="input-glass w-36 text-xs py-1"
              />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs font-semibold uppercase" style={{ color: "var(--text-muted)" }}>To</label>
              <input
                type="date"
                value={filters.date_to || ""}
                onChange={e => setFilter("date_to", e.target.value)}
                className="input-glass w-36 text-xs py-1"
              />
            </div>
            <div className="w-px h-6" style={{ background: "var(--border-glass)" }} />
            <div className="flex items-center gap-1">
              <label className="text-xs font-semibold uppercase" style={{ color: "var(--text-muted)" }}>Min $</label>
              <input
                type="number"
                placeholder="0"
                value={filters.amount_min || ""}
                onChange={e => setFilter("amount_min", e.target.value)}
                className="input-glass w-24 text-xs py-1"
              />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs font-semibold uppercase" style={{ color: "var(--text-muted)" }}>Max $</label>
              <input
                type="number"
                placeholder="999999"
                value={filters.amount_max || ""}
                onChange={e => setFilter("amount_max", e.target.value)}
                className="input-glass w-24 text-xs py-1"
              />
            </div>
          </div>
        )}

        {/* Filter Dropdowns */}
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {FILTER_GROUPS.map(({ field, label, options }) => (
              <div key={field}>
                <label className="block text-[10px] font-semibold uppercase mb-1" style={{ color: "var(--text-muted)" }}>{label}</label>
                <select
                  value={filters[field] || ""}
                  onChange={e => setFilter(field, e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded border"
                  style={{
                    background: "var(--bg-glass)",
                    borderColor: "var(--border-glass)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="">All</option>
                  {(options || []).filter(Boolean).slice(0, 100).map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent-cyan)" }} />
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 justify-center py-20" style={{ color: "var(--accent-red)" }}>
            <AlertTriangle className="w-5 h-5" /> {error}
          </div>
        )}
        {!loading && !error && rows.length === 0 && (
          <div className="flex items-center justify-center py-20" style={{ color: "var(--text-muted)" }}>
            <div className="text-center">
              <Database className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No transactions match your filters.</p>
            </div>
          </div>
        )}
        {!loading && !error && rows.length > 0 && (
          <table className="data-table">
            <thead>
              <tr>
                {EXPLORER_COLUMNS.filter(c => visibleColumns.has(c.key)).map(({ key, label }) => (
                  <th key={key} onClick={() => toggleSort(key)} style={{ cursor: "pointer" }}>
                    <span className="flex items-center gap-1" style={{ color: sortField === key ? "var(--accent-cyan)" : undefined }}>
                      {label}
                      {sortField === key && (
                        <ArrowUpDown className={classNames("w-3 h-3", sortDir === "ASC" ? "rotate-180" : "")} />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isSelected = selectedRow?.rosettastone_row_number === row.rosettastone_row_number;
                return (
                  <tr
                    key={row.rosettastone_row_number || i}
                    onClick={() => handleRowClick(row)}
                    className={classNames(isSelected && "active")}
                    style={isSelected ? { background: "rgba(0,242,255,0.06)", borderColor: "rgba(0,242,255,0.2)" } : undefined}
                  >
                    {EXPLORER_COLUMNS.filter(c => visibleColumns.has(c.key)).map(col => (
                      <td key={col.key}>
                        <ExplorerCell column={col.key} row={row} />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex-none px-8 py-3 flex items-center justify-between" style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--border-glass)" }}>
        <div className="flex items-center gap-4 text-sm" style={{ color: "var(--text-secondary)" }}>
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{total.toLocaleString()}</span> results
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="px-2 py-1 text-xs rounded border"
            style={{
              background: "var(--bg-glass)",
              borderColor: "var(--border-glass)",
              color: "var(--text-primary)",
            }}
          >
            {PAGE_SIZES.map(s => (
              <option key={s} value={s}>{s} per page</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="workbench-ctrl-btn p-1.5"
            style={{ padding: "0.25rem 0.5rem" }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Page {page} of {totalPages || 1}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="workbench-ctrl-btn p-1.5"
            style={{ padding: "0.25rem 0.5rem" }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedRow && (
        <div className="flex-none border-t max-h-80 overflow-y-auto" style={{ background: "var(--bg-surface)", borderColor: "var(--border-glass)" }}>
          <div className="px-8 py-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                <span style={{ color: "var(--accent-cyan)" }}>{selectedRow.date}</span>
                {" — "}{selectedRow.description}
              </h3>
              <button onClick={() => setSelectedRow(null)} className="p-1 rounded hover:bg-white/5">
                <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
              </button>
            </div>

            {/* Detail Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-3">
              {[
                { label: "Amount", value: formatCurrency(selectedRow.amount) },
                { label: "Account", value: `${selectedRow.account || ""} (${selectedRow.account_type || ""})` },
                { label: "Bank", value: selectedRow.bank },
                { label: "User", value: selectedRow.user },
                { label: "Category", value: selectedRow.category },
                { label: "Class", value: selectedRow.class },
                { label: "Company", value: selectedRow.company },
                { label: "Salesperson", value: selectedRow.normalized_salesperson },
                { label: "Invoice #", value: selectedRow.invoice_num },
                { label: "PO #", value: selectedRow.po_number },
                { label: "Client", value: selectedRow.client },
                { label: "Verification", value: selectedRow.verification },
                { label: "Statement", value: selectedRow.forensic_statement_file },
                { label: "Order ID", value: selectedRow.order_id },
                { label: "QBO Sales", value: selectedRow.qbo_sales_initials },
                { label: "Commission Note", value: selectedRow.commission_note },
              ].filter(({ value }) => value).map(({ label, value }) => (
                <div key={label} className="rounded p-2" style={{ background: "var(--bg-glass)" }}>
                  <div className="text-[10px] font-semibold uppercase" style={{ color: "var(--text-muted)" }}>{label}</div>
                  <div className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{value || "—"}</div>
                </div>
              ))}
            </div>

            {/* Linked data */}
            {linkedData && (
              <div className="pt-3" style={{ borderTop: "1px solid var(--border-glass)" }}>
                <h4 className="text-xs font-semibold uppercase mb-2" style={{ color: "var(--text-muted)" }}>Cross-References</h4>
                <div className="grid grid-cols-2 gap-3">
                  {linkedData.invoice && (
                    <div className="rounded p-2" style={{ background: "var(--bg-glass)", border: "1px solid rgba(16,185,129,0.15)" }}>
                      <div className="text-xs font-semibold mb-1" style={{ color: "var(--accent-emerald)" }}>QBO Invoice {linkedData.invoice.doc_number}</div>
                      <div className="text-xs" style={{ color: "var(--text-secondary)" }}>Customer: {linkedData.invoice.customer_name}</div>
                      <div className="text-xs" style={{ color: "var(--text-secondary)" }}>Total: ${linkedData.invoice.total_amt?.toLocaleString()}</div>
                      <div className="text-xs" style={{ color: "var(--text-secondary)" }}>Sales: {linkedData.invoice.salesperson_name}</div>
                      {linkedData.invoice.gross_profit != null && (
                        <div className="text-xs" style={{ color: "var(--text-secondary)" }}>Profit: ${linkedData.invoice.gross_profit?.toLocaleString()}</div>
                      )}
                    </div>
                  )}
                  {linkedData.po && (
                    <div className="rounded p-2" style={{ background: "var(--bg-glass)", border: "1px solid rgba(249,115,22,0.15)" }}>
                      <div className="text-xs font-semibold mb-1" style={{ color: "var(--accent-orange)" }}>Purchase Order {linkedData.po.doc_number}</div>
                      <div className="text-xs" style={{ color: "var(--text-secondary)" }}>Vendor: {linkedData.po.vendor_name}</div>
                      <div className="text-xs" style={{ color: "var(--text-secondary)" }}>Total: ${linkedData.po.total_amt?.toLocaleString()}</div>
                    </div>
                  )}
                  {linkedData.printavo_orders?.length > 0 && (
                    <div className="rounded p-2" style={{ background: "var(--bg-glass)", border: "1px solid rgba(168,85,247,0.15)" }}>
                      <div className="text-xs font-semibold mb-1" style={{ color: "var(--accent-purple)" }}>Printavo Orders ({linkedData.printavo_orders.length})</div>
                      {linkedData.printavo_orders.map((po: any, i: number) => (
                        <div key={i} className="text-xs" style={{ color: "var(--text-secondary)" }}>Order {po.order_id}: ${po.total?.toLocaleString()} — {po.owner}</div>
                      ))}
                    </div>
                  )}
                  {linkedData.deco_orders?.length > 0 && (
                    <div className="rounded p-2" style={{ background: "var(--bg-glass)", border: "1px solid rgba(0,242,255,0.15)" }}>
                      <div className="text-xs font-semibold mb-1" style={{ color: "var(--accent-cyan)" }}>Deco Orders ({linkedData.deco_orders.length})</div>
                      {linkedData.deco_orders.map((d: any, i: number) => (
                        <div key={i} className="text-xs" style={{ color: "var(--text-secondary)" }}>Order {d.order_number}: ${d.order_total?.toLocaleString()} — {d.sales_staff}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedRow.notes && (
              <div className="pt-3 mt-3" style={{ borderTop: "1px solid var(--border-glass)" }}>
                <h4 className="text-xs font-semibold uppercase mb-1" style={{ color: "var(--text-muted)" }}>Forensic Notes</h4>
                <p className="text-xs whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{selectedRow.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ExplorerCell({ column, row }: { column: string; row: any }) {
  switch (column) {
    case "date":
      return <span className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>{row.date}</span>;
    case "description":
      return (
        <span className="truncate block max-w-[300px]" title={row.description} style={{ color: "var(--text-primary)" }}>
          {row.transaction_type === "CC Debit" && <CreditCard className="w-3 h-3 inline mr-1 text-amber-500" />}
          {row.transaction_type === "Deposit" && <DollarSign className="w-3 h-3 inline mr-1 text-green-500" />}
          {row.transaction_type === "Withdrawl" && <ArrowUpDown className="w-3 h-3 inline mr-1 text-red-400" />}
          {row.description}
        </span>
      );
    case "transaction_type":
      return <TransactionTypeBadge type={row.transaction_type} />;
    case "amount":
      return (
        <span
          className="font-mono text-xs font-medium"
          style={{
            color: row.amount < 0 ? "var(--accent-red)" : row.amount > 0 ? "var(--accent-emerald)" : "var(--text-muted)"
          }}
        >
          {row.amount != null ? formatCurrency(row.amount) : ""}
        </span>
      );
    case "bank":
      return <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{row.bank || "—"}</span>;
    case "user":
      return (
        <span
          className="text-xs px-1.5 py-0.5 rounded font-semibold"
          style={{
            background: row.user === "LG" ? "rgba(239,68,68,0.15)" : row.user === "JZ" ? "rgba(0,242,255,0.12)" : "var(--bg-glass)",
            color: row.user === "LG" ? "var(--accent-red)" : row.user === "JZ" ? "var(--accent-cyan)" : "var(--text-secondary)",
          }}
        >
          {row.user || "—"}
        </span>
      );
    case "category":
      return <span className="text-xs truncate max-w-[180px]" title={row.category} style={{ color: "var(--text-secondary)" }}>{row.category || "—"}</span>;
    case "account":
      return <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{row.account || "—"}</span>;
    case "account_type":
      return <span className="text-xs" style={{ color: "var(--text-muted)" }}>{row.account_type || "—"}</span>;
    case "class":
      return <span className="text-xs truncate max-w-[140px]" title={row.class} style={{ color: "var(--text-muted)" }}>{row.class || "—"}</span>;
    case "company":
      return <span className="text-xs truncate max-w-[140px]" title={row.company} style={{ color: "var(--text-secondary)" }}>{row.company || "—"}</span>;
    case "invoice_num":
      return row.invoice_num ? <span className="text-xs font-mono" style={{ color: "var(--accent-cyan)" }}>{row.invoice_num}</span> : <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>;
    case "po_number":
      return row.po_number ? <span className="text-xs font-mono" style={{ color: "var(--accent-orange)" }}>{row.po_number}</span> : <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>;
    case "client":
      return <span className="text-xs truncate max-w-[140px]" title={row.client} style={{ color: "var(--text-secondary)" }}>{row.client || "—"}</span>;
    case "normalized_salesperson":
      return <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{row.normalized_salesperson || "—"}</span>;
    case "verification":
      return (
        <span className="flex justify-center">
          {row.verification === "VERIFIED" ? (
            <CheckCircle className="w-3.5 h-3.5" style={{ color: "var(--accent-emerald)" }} />
          ) : row.verification === "DISPUTED" ? (
            <Ban className="w-3.5 h-3.5" style={{ color: "var(--accent-red)" }} />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5" style={{ color: "var(--accent-orange)" }} />
          )}
        </span>
      );
    case "forensic_statement_file":
      return row.forensic_statement_file ? <span title={row.forensic_statement_file}><FileText className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} /></span> : null;
    default:
      return <span className="text-xs" style={{ color: "var(--text-muted)" }}>{row[column] || "—"}</span>;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// STATEMENTS TAB
// ══════════════════════════════════════════════════════════════════════════════

function StatementsTab() {
  const [statements, setStatements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBank, setSelectedBank] = useState("all");
  const [banks, setBanks] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/financials/explorer?pageSize=0");
        const json = await res.json();
        if (json.success && json.filterOptions) {
          const allBanks = json.filterOptions.banks || [];
          setBanks(allBanks);
        }

        // Get statement files with counts
        const stmtRes = await fetch("/api/financials/explorer?pageSize=10000&sortField=forensic_statement_file&sortDir=asc");
        const stmtJson = await stmtRes.json();
        if (stmtJson.success) {
          // Group by bank and statement file
          const groups: Record<string, { bank: string; files: Record<string, { file: string; count: number; accounts: Set<string> }> }> = {};
          for (const row of stmtJson.data) {
            if (!row.forensic_statement_file) continue;
            const bank = row.bank || "Unknown";
            if (!groups[bank]) groups[bank] = { bank, files: {} };
            if (!groups[bank].files[row.forensic_statement_file]) {
              groups[bank].files[row.forensic_statement_file] = { file: row.forensic_statement_file, count: 0, accounts: new Set() };
            }
            groups[bank].files[row.forensic_statement_file].count++;
            if (row.account) groups[bank].files[row.forensic_statement_file].accounts.add(row.account);
          }
          setStatements(Object.values(groups));
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  const filtered = selectedBank === "all" ? statements : statements.filter(s => s.bank === selectedBank);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-none px-8 py-3 flex items-center gap-3" style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-glass)" }}>
        <select
          value={selectedBank}
          onChange={e => setSelectedBank(e.target.value)}
          className="px-3 py-1.5 text-sm rounded border"
          style={{ background: "var(--bg-glass)", borderColor: "var(--border-glass)", color: "var(--text-primary)" }}
        >
          <option value="all">All Banks</option>
          {banks.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {filtered.reduce((sum, g) => sum + Object.keys(g.files).length, 0)} statements across {banks.length} banks
        </span>
      </div>
      <div className="flex-1 overflow-auto px-8 py-4">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent-cyan)" }} />
          </div>
        )}
        {!loading && filtered.map(group => (
          <div key={group.bank} className="mb-6">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <Building2 className="w-4 h-4" style={{ color: "var(--accent-cyan)" }} />
              {group.bank}
              <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>
                ({Object.keys(group.files).length} statements)
              </span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {Object.values(group.files).sort((a, b) => b.file.localeCompare(a.file)).map(stmt => (
                <div
                  key={stmt.file}
                  className="glass-panel p-3 cursor-pointer glass-panel-hover"
                  onClick={() => {
                    // Navigate to statement view — placeholder
                    alert(`Statement view coming soon: ${stmt.file}\nTransactions: ${stmt.count}\nAccounts: ${[...stmt.accounts].join(", ")}`);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{stmt.file}</div>
                      <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                        {stmt.count.toLocaleString()} transactions
                        {stmt.accounts.size > 0 && ` · ${[...stmt.accounts].join(", ")}`}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 flex-shrink-0 ml-2" style={{ color: "var(--text-muted)" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {!loading && filtered.length === 0 && (
          <div className="flex items-center justify-center py-20" style={{ color: "var(--text-muted)" }}>
            <div className="text-center">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No statements found for this bank.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SUMMARY TAB
// ══════════════════════════════════════════════════════════════════════════════

function SummaryTab() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/financials?view=summary");
        const json = await res.json();
        setSummary(json);
      } catch (e: any) {
        setError(e.message);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent-cyan)" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20" style={{ color: "var(--accent-red)" }}>
        <AlertTriangle className="w-5 h-5 mr-2" />{error}
      </div>
    );
  }

  if (!summary) return null;

  const webOfAccounts = parseFloat(String(summary.totalDebits || 0)) + parseFloat(String(summary.totalCredits || 0));

  const cards = [
    {
      label: "Transactions",
      value: (summary.transactions || 0).toLocaleString(),
      icon: ArrowUpDown,
      accent: "var(--accent-cyan)",
    },
    {
      label: "Web of Accounts",
      value: `$${webOfAccounts.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      icon: Landmark,
      accent: "var(--accent-purple)",
    },
    {
      label: "Accounts",
      value: (summary.accounts || 0).toLocaleString(),
      icon: Building2,
      accent: "var(--accent-emerald)",
    },
    {
      label: "Tax Returns",
      value: (summary.taxReturns || 0).toLocaleString(),
      icon: ReceiptText,
      accent: "var(--accent-orange)",
    },
  ];

  return (
    <div className="overflow-auto px-8 py-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(card => (
          <div key={card.label} className="stat-card">
            <div className="flex items-center gap-2 mb-3">
              <card.icon className="w-5 h-5" style={{ color: card.accent }} />
            </div>
            <div className="stat-value">{card.value}</div>
            <div className="stat-label">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Flow Summary */}
        <div className="glass-panel p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <TrendingUp className="w-4 h-4" style={{ color: "var(--accent-emerald)" }} />
            Cash Flow
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Total Credits (Inflows)</span>
              <span className="text-sm font-mono font-semibold" style={{ color: "var(--accent-emerald)" }}>
                ${Math.abs(summary.totalCredits || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Total Debits (Outflows)</span>
              <span className="text-sm font-mono font-semibold" style={{ color: "var(--accent-red)" }}>
                ${Math.abs(summary.totalDebits || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div style={{ borderTop: "1px solid var(--border-glass)", paddingTop: "0.75rem" }}>
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Net Flow</span>
                <span className="text-sm font-mono font-bold" style={{ color: webOfAccounts >= 0 ? "var(--accent-emerald)" : "var(--accent-red)" }}>
                  ${((summary.totalCredits || 0) - Math.abs(summary.totalDebits || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tax Years */}
        <div className="glass-panel p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <ReceiptText className="w-4 h-4" style={{ color: "var(--accent-orange)" }} />
            Tax Filing Years
          </h3>
          {summary.taxYears && summary.taxYears.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {summary.taxYears.map((year: number) => (
                <span
                  key={year}
                  className="badge badge-cyan text-xs"
                >
                  {year}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No tax returns on file.</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="glass-panel p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Scale className="w-4 h-4" style={{ color: "var(--accent-purple)" }} />
            Forensic Quick Links
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Sales Analysis", icon: BarChart3, href: "/app/financials/sales-analysis", color: "var(--accent-cyan)" },
              { label: "Sales by Person", icon: User, href: "/app/financials/sales-by-salesperson", color: "var(--accent-purple)" },
              { label: "QBO Unallocated", icon: FileSpreadsheet, href: "/app/financials/qbo-unallocated", color: "var(--accent-orange)" },
              { label: "Import Statements", icon: Download, href: "/app/financials/import", color: "var(--accent-emerald)" },
            ].map(link => (
              <a
                key={link.href}
                href={link.href}
                className="glass-panel p-3 flex items-center gap-2 text-sm no-underline glass-panel-hover"
                style={{ color: "var(--text-secondary)" }}
              >
                <link.icon className="w-4 h-4 flex-shrink-0" style={{ color: link.color }} />
                {link.label}
                <ExternalLink className="w-3 h-3 ml-auto" style={{ color: "var(--text-muted)" }} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAX RETURNS TAB
// ══════════════════════════════════════════════════════════════════════════════

function TaxReturnsTab() {
  const [taxData, setTaxData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/financials?view=taxes");
        const json = await res.json();
        setTaxData(json);
      } catch (e: any) {
        setError(e.message);
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = taxData?.results?.filter((r: any) => !selectedYear || String(r.tax_year) === selectedYear) || [];
  const years = [...new Set((taxData?.results || []).map((r: any) => r.tax_year))] as number[];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent-cyan)" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20" style={{ color: "var(--accent-red)" }}>
        <AlertTriangle className="w-5 h-5 mr-2" />{error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-none px-8 py-3 flex items-center gap-3" style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-glass)" }}>
        <select
          value={selectedYear}
          onChange={e => setSelectedYear(e.target.value)}
          className="px-3 py-1.5 text-sm rounded border"
          style={{ background: "var(--bg-glass)", borderColor: "var(--border-glass)", color: "var(--text-primary)" }}
        >
          <option value="">All Years</option>
          {years.sort((a, b) => b - a).map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {filtered.length} of {taxData?.total || 0} returns
        </span>
      </div>
      <div className="flex-1 overflow-auto px-8 py-4">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-20" style={{ color: "var(--text-muted)" }}>
            <div className="text-center">
              <ReceiptText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No tax returns found.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((tax: any) => (
              <div key={tax.filing_id} className="glass-panel p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                      <ReceiptText className="w-4 h-4" style={{ color: "var(--accent-orange)" }} />
                      Tax Year {tax.tax_year}
                    </h3>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                      Filing ID: {tax.filing_id} · Status: {tax.filing_status || "N/A"}
                    </p>
                  </div>
                  <span className="badge badge-cyan">{tax.tax_year}</span>
                </div>

                {/* Key figures */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "Total Revenue", value: tax.total_revenue, format: true },
                    { label: "Total Expenses", value: tax.total_expenses, format: true },
                    { label: "Net Income", value: tax.net_income, format: true },
                    { label: "Ordinary Income", value: tax.ordinary_income, format: true },
                  ].filter(f => f.value != null).map(f => (
                    <div key={f.label} className="rounded p-2" style={{ background: "var(--bg-glass)" }}>
                      <div className="text-[10px] font-semibold uppercase" style={{ color: "var(--text-muted)" }}>{f.label}</div>
                      <div className="text-sm font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
                        {f.format ? `$${Number(f.value).toLocaleString()}` : String(f.value)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* K-1 Details */}
                {tax.k1Details && tax.k1Details.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase mb-2" style={{ color: "var(--text-muted)" }}>
                      K-1 Schedule Details ({tax.k1Details.length})
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Partner</th>
                            <th>Ownership %</th>
                            <th>Ordinary Income</th>
                            <th>Distributions</th>
                            <th>Guaranteed Payments</th>
                            <th>Ending Capital</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tax.k1Details.map((k1: any, i: number) => (
                            <tr key={i}>
                              <td style={{ color: "var(--text-primary)" }}>{k1.partner_name || `Partner ${k1.partner_id}`}</td>
                              <td style={{ color: "var(--text-secondary)" }}>{k1.ownership_pct != null ? `${k1.ownership_pct}%` : "—"}</td>
                              <td className="font-mono" style={{ color: "var(--text-primary)" }}>
                                {k1.ordinary_income != null ? `$${Number(k1.ordinary_income).toLocaleString()}` : "—"}
                              </td>
                              <td className="font-mono" style={{ color: "var(--text-secondary)" }}>
                                {k1.distributions != null ? `$${Number(k1.distributions).toLocaleString()}` : "—"}
                              </td>
                              <td className="font-mono" style={{ color: "var(--text-primary)" }}>
                                {k1.guaranteed_payments != null ? `$${Number(k1.guaranteed_payments).toLocaleString()}` : "—"}
                              </td>
                              <td className="font-mono" style={{ color: "var(--text-secondary)" }}>
                                {k1.ending_capital != null ? `$${Number(k1.ending_capital).toLocaleString()}` : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CROSS-REFERENCE TAB
// ══════════════════════════════════════════════════════════════════════════════

function CrossRefTab() {
  const links = [
    {
      title: "Printavo Orders",
      description: "Production order management system. Cross-reference order IDs and invoice data from bank transactions.",
      icon: Printer,
      accent: "var(--accent-purple)",
      href: "/app/financials/printavo",
      status: "coming",
    },
    {
      title: "Deco Orders",
      description: "DecoNetwork order system. Match order numbers and sales staff data against financial records.",
      icon: ShoppingCart,
      accent: "var(--accent-cyan)",
      href: "/app/financials/deco",
      status: "coming",
    },
    {
      title: "QuickBooks Data",
      description: "QBO forensic data including invoices, purchase orders, journal entries, and vendor risk analysis.",
      icon: FileSpreadsheet,
      accent: "var(--accent-emerald)",
      href: "/app/financials/qbo-unallocated",
      status: "live",
    },
    {
      title: "Sales Analysis",
      description: "Full salesperson performance analysis with commission tracking and variance reporting.",
      icon: BarChart3,
      accent: "var(--accent-orange)",
      href: "/app/financials/sales-analysis",
      status: "live",
    },
    {
      title: "Sales by Salesperson",
      description: "Per-salesperson breakdown of transactions, commissions, and cross-reference gaps.",
      icon: User,
      accent: "var(--accent-cyan)",
      href: "/app/financials/sales-by-salesperson",
      status: "live",
    },
    {
      title: "Forensic Audit",
      description: "Year-by-year bank statement reconciliation with RosettaStone using the forensic audit engine.",
      icon: Scale,
      accent: "var(--accent-red)",
      href: "/app/financials/import",
      status: "live",
    },
  ];

  return (
    <div className="overflow-auto px-8 py-6">
      <div className="mb-6">
        <h2 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
          Cross-Reference Data Sources
        </h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Financial data from multiple platforms linked together through the RosettaStone SSOT.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {links.map(link => (
          <a
            key={link.title}
            href={link.status === "coming" ? "#" : link.href}
            className={classNames(
              "glass-panel p-5 no-underline glass-panel-hover",
              link.status === "coming" && "opacity-50 cursor-default"
            )}
            onClick={e => {
              if (link.status === "coming") {
                e.preventDefault();
                alert(`${link.title} — Coming soon. This data integration page is under development.`);
              }
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <link.icon className="w-6 h-6" style={{ color: link.accent }} />
              <span
                className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                style={{
                  background: link.status === "live" ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.06)",
                  color: link.status === "live" ? "var(--accent-emerald)" : "var(--text-muted)",
                  border: link.status === "live" ? "1px solid rgba(16,185,129,0.2)" : "1px solid var(--border-glass)",
                }}
              >
                {link.status === "live" ? "Live" : "Coming Soon"}
              </span>
            </div>
            <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{link.title}</h3>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{link.description}</p>
          </a>
        ))}
      </div>

      {/* Cross-reference stats placeholder */}
      <div className="mt-8 glass-panel p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Link2 className="w-4 h-4" style={{ color: "var(--accent-cyan)" }} />
          RosettaStone Cross-Reference Coverage
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { label: "QBO Matched", value: "4,082", sub: "$4.89M", color: "var(--accent-emerald)" },
            { label: "QBO Unmatched", value: "15,741", sub: "$10.82M", color: "var(--accent-orange)" },
            { label: "Printavo Orders", value: "—", sub: "Coming soon", color: "var(--accent-purple)" },
            { label: "Deco Orders", value: "—", sub: "Coming soon", color: "var(--accent-cyan)" },
          ].map(stat => (
            <div key={stat.label}>
              <div className="text-2xl font-bold font-mono" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{stat.sub}</div>
              <div className="text-[10px] font-semibold uppercase mt-1" style={{ color: "var(--text-secondary)" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
