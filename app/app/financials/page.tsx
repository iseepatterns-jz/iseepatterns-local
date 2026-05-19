"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign, ArrowUpDown, Search, Filter, X,
  ChevronLeft, ChevronRight, Loader2, ExternalLink,
  FileText, Download, Building2, CreditCard, User,
  Calendar, AlertTriangle, CheckCircle, Ban
} from "lucide-react";

// All 17 native fields + extras from RosettaStone
const NATIVE_FIELDS = [
  { key: "date", label: "Date", width: "w-28", type: "date" },
  { key: "description", label: "Description", width: "min-w-48", type: "text" },
  { key: "transaction_type", label: "Transaction Type", width: "w-32", type: "select" },
  { key: "amount", label: "Amount", width: "w-28", type: "number" },
  { key: "account", label: "Account", width: "w-20", type: "text" },
  { key: "account_type", label: "Account Type", width: "w-28", type: "select" },
  { key: "bank", label: "Bank", width: "w-28", type: "select" },
  { key: "user", label: "User", width: "w-16", type: "select" },
  { key: "category", label: "Category", width: "min-w-36", type: "select" },
  { key: "class", label: "Class", width: "min-w-32", type: "text" },
  { key: "company", label: "Company", width: "min-w-36", type: "text" },
  { key: "invoice_num", label: "Invoice #", width: "w-24", type: "text" },
  { key: "po_number", label: "PO #", width: "w-24", type: "text" },
  { key: "client", label: "Client", width: "min-w-36", type: "text" },
  { key: "normalized_salesperson", label: "Salesperson", width: "w-36", type: "text" },
  { key: "verification", label: "V", width: "w-10", type: "icon" },
  { key: "forensic_statement_file", label: "Statement", width: "w-10", type: "icon" },
];

const PAGE_SIZES = [25, 50, 100, 250, 500];

export default function FinancialExplorer() {
  // Data
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Sort
  const [sortField, setSortField] = useState("sortable_date");
  const [sortDir, setSortDir] = useState<"ASC" | "DESC">("DESC");

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filterOptions, setFilterOptions] = useState<any>({});

  // Detail
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [linkedData, setLinkedData] = useState<any>(null);

  // Summary
  const [totals, setTotals] = useState({ debits: 0, credits: 0, count: 0 });

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      params.set("sortField", sortField);
      params.set("sortDir", sortDir);
      if (quickSearch) params.set("q", quickSearch);
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });

      const res = await fetch(`/api/financials/explorer?${params}`);
      const json = await res.json();
      if (json.success) {
        setRows(json.data);
        setTotal(json.pagination.total);
        setFilterOptions(json.filterOptions || {});
      } else {
        setError(json.error);
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, [page, pageSize, sortField, sortDir, quickSearch, filters]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load totals
  useEffect(() => {
    fetch("/api/financials/explorer?page=1&pageSize=1")
      .then(r => r.json())
      .then(j => {
        if (j.success) setTotals({ count: j.pagination.total, debits: 0, credits: 0 });
      })
      .catch(() => {});
  }, [quickSearch, filters]);

  // Load linked data when row selected
  const selectRow = async (row: any) => {
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

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="flex-none border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">Financial Explorer</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              RosettaStone SSOT — {totals.count.toLocaleString()} transactions · 2015–2023
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm ${
                showFilters ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
            </button>
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            >
              <X className="w-4 h-4" /> Clear
            </button>
          </div>
        </div>

        {/* Quick search */}
        <div className="mt-3 flex items-center gap-3">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search descriptions, companies, customers, invoices..."
              value={quickSearch}
              onChange={e => { setQuickSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 p-3 bg-zinc-900 rounded border border-zinc-800">
            {[
              { field: "transaction_type", label: "Type", options: filterOptions.transaction_types },
              { field: "bank", label: "Bank", options: filterOptions.banks },
              { field: "account", label: "Account", options: filterOptions.accounts },
              { field: "user", label: "User", options: filterOptions.users },
              { field: "category", label: "Category", options: filterOptions.categories },
              { field: "class", label: "Class", options: filterOptions.classes },
              { field: "verification", label: "Verification", options: ["UNVERIFIED", "VERIFIED", "DISPUTED"] },
              { field: "company", label: "Company", options: filterOptions.companies },
              { field: "normalized_salesperson", label: "Salesperson", options: filterOptions.salespersons },
            ].map(({ field, label, options }) => (
              <div key={field}>
                <label className="block text-xs text-zinc-500 mb-1">{label}</label>
                <select
                  value={filters[field] || ""}
                  onChange={e => setFilter(field, e.target.value)}
                  className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-300"
                >
                  <option value="">All</option>
                  {(options || []).filter(Boolean).slice(0, 50).map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data table */}
      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-red-400 justify-center py-20">
            <AlertTriangle className="w-5 h-5" /> {error}
          </div>
        )}
        {!loading && !error && (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-zinc-900 z-10">
              <tr className="border-b border-zinc-700">
                {NATIVE_FIELDS.map(({ key, label, width }) => (
                  <th
                    key={key}
                    onClick={() => toggleSort(key)}
                    className={`${width} px-3 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-200 whitespace-nowrap`}
                  >
                    <span className="flex items-center gap-1">
                      {label}
                      {sortField === key && (
                        <ArrowUpDown className={`w-3 h-3 ${sortDir === "ASC" ? "rotate-180" : ""}`} />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.rosettastone_row_number || i}
                  onClick={() => selectRow(row)}
                  className={`border-b border-zinc-800/50 cursor-pointer transition-colors ${
                    selectedRow?.rosettastone_row_number === row.rosettastone_row_number
                      ? "bg-indigo-900/30"
                      : "hover:bg-zinc-800/50"
                  } ${i % 2 === 0 ? "bg-zinc-950" : "bg-zinc-900/30"}`}
                >
                  <td className="px-3 py-1.5 text-zinc-400 font-mono text-xs whitespace-nowrap">{row.date}</td>
                  <td className="px-3 py-1.5 text-zinc-200 max-w-xs truncate" title={row.description}>
                    {row.transaction_type === "CC Debit" && <CreditCard className="w-3 h-3 inline mr-1 text-amber-500" />}
                    {row.transaction_type === "Deposit" && <DollarSign className="w-3 h-3 inline mr-1 text-green-500" />}
                    {row.transaction_type === "Withdrawl" && <ArrowUpDown className="w-3 h-3 inline mr-1 text-red-400" />}
                    {row.description}
                  </td>
                  <td className="px-3 py-1.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      row.transaction_type === "CC Debit" ? "bg-amber-900/40 text-amber-300" :
                      row.transaction_type === "Deposit" ? "bg-green-900/40 text-green-300" :
                      row.transaction_type === "Withdrawl" ? "bg-red-900/40 text-red-300" :
                      row.transaction_type === "CC Credit" ? "bg-blue-900/40 text-blue-300" :
                      "bg-zinc-800 text-zinc-400"
                    }`}>
                      {row.transaction_type}
                    </span>
                  </td>
                  <td className={`px-3 py-1.5 font-mono text-xs text-right font-medium ${
                    row.amount < 0 ? "text-red-400" : row.amount > 0 ? "text-green-400" : "text-zinc-500"
                  }`}>
                    {row.amount ? `$${Math.abs(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ""}
                  </td>
                  <td className="px-3 py-1.5 text-zinc-500 text-xs font-mono">{row.account}</td>
                  <td className="px-3 py-1.5 text-zinc-500 text-xs">{row.account_type}</td>
                  <td className="px-3 py-1.5 text-zinc-400 text-xs">{row.bank}</td>
                  <td className="px-3 py-1.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      row.user === "LG" ? "bg-red-900/30 text-red-400" :
                      row.user === "JZ" ? "bg-cyan-900/30 text-cyan-400" :
                      "bg-zinc-800 text-zinc-400"
                    }`}>
                      {row.user}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-zinc-400 text-xs max-w-[200px] truncate" title={row.category}>
                    {row.category}
                  </td>
                  <td className="px-3 py-1.5 text-zinc-500 text-xs max-w-[150px] truncate" title={row.class}>
                    {row.class}
                  </td>
                  <td className="px-3 py-1.5 text-zinc-400 text-xs max-w-[150px] truncate" title={row.company}>
                    {row.company}
                  </td>
                  <td className="px-3 py-1.5 text-zinc-500 text-xs font-mono">
                    {row.invoice_num && (
                      <span className="text-indigo-400 cursor-pointer hover:underline">{row.invoice_num}</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-zinc-500 text-xs font-mono">{row.po_number}</td>
                  <td className="px-3 py-1.5 text-zinc-400 text-xs max-w-[150px] truncate" title={row.client}>
                    {row.client}
                  </td>
                  <td className="px-3 py-1.5 text-zinc-500 text-xs">{row.normalized_salesperson}</td>
                  <td className="px-3 py-1.5 text-center">
                    {row.verification === "VERIFIED" ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    ) : row.verification === "DISPUTED" ? (
                      <Ban className="w-3.5 h-3.5 text-red-500" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    {row.forensic_statement_file && (
                      <FileText className="w-3.5 h-3.5 text-zinc-500" title={row.forensic_statement_file} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex-none border-t border-zinc-800 px-6 py-3 flex items-center justify-between bg-zinc-900">
        <div className="flex items-center gap-4 text-sm text-zinc-400">
          <span>{total.toLocaleString()} results</span>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs"
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
            className="p-1.5 rounded bg-zinc-800 text-zinc-400 disabled:opacity-30 hover:bg-zinc-700"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-zinc-400 px-2">
            Page {page} of {totalPages || 1}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-1.5 rounded bg-zinc-800 text-zinc-400 disabled:opacity-30 hover:bg-zinc-700"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Detail panel */}
      {selectedRow && (
        <div className="flex-none border-t border-zinc-800 bg-zinc-900 max-h-72 overflow-y-auto">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-200">
                {selectedRow.date} — {selectedRow.description}
              </h3>
              <button onClick={() => setSelectedRow(null)} className="p-1 hover:bg-zinc-800 rounded">
                <X className="w-4 h-4 text-zinc-500" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
              {[
                ["Amount", `$${Math.abs(selectedRow.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
                ["Account", `${selectedRow.account} (${selectedRow.account_type})`],
                ["Bank", selectedRow.bank],
                ["User", selectedRow.user],
                ["Category", selectedRow.category],
                ["Class", selectedRow.class],
                ["Company", selectedRow.company],
                ["Salesperson", selectedRow.normalized_salesperson],
                ["Invoice #", selectedRow.invoice_num],
                ["PO #", selectedRow.po_number],
                ["Verification", selectedRow.verification],
                ["Statement", selectedRow.forensic_statement_file],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label} className="bg-zinc-800/50 rounded p-2">
                  <div className="text-xs text-zinc-500">{label}</div>
                  <div className="text-zinc-200 font-medium truncate">{value || "—"}</div>
                </div>
              ))}
            </div>

            {/* Linked data */}
            {linkedData && (
              <div className="border-t border-zinc-700 pt-3">
                <h4 className="text-xs font-semibold text-zinc-400 mb-2 uppercase">Cross-References</h4>
                <div className="grid grid-cols-2 gap-3">
                  {linkedData.invoice && (
                    <div className="bg-zinc-800/50 rounded p-2">
                      <div className="text-xs text-green-400 mb-1">QBO Invoice {linkedData.invoice.doc_number}</div>
                      <div className="text-xs text-zinc-400">Customer: {linkedData.invoice.customer_name}</div>
                      <div className="text-xs text-zinc-400">Total: ${linkedData.invoice.total_amt?.toLocaleString()}</div>
                      <div className="text-xs text-zinc-400">Salesperson: {linkedData.invoice.salesperson_name}</div>
                      {linkedData.invoice.gross_profit != null && (
                        <div className="text-xs text-zinc-400">Profit: ${linkedData.invoice.gross_profit?.toLocaleString()}</div>
                      )}
                    </div>
                  )}
                  {linkedData.po && (
                    <div className="bg-zinc-800/50 rounded p-2">
                      <div className="text-xs text-amber-400 mb-1">Purchase Order {linkedData.po.doc_number}</div>
                      <div className="text-xs text-zinc-400">Vendor: {linkedData.po.vendor_name}</div>
                      <div className="text-xs text-zinc-400">Total: ${linkedData.po.total_amt?.toLocaleString()}</div>
                    </div>
                  )}
                  {linkedData.printavo_orders?.length > 0 && (
                    <div className="bg-zinc-800/50 rounded p-2">
                      <div className="text-xs text-purple-400 mb-1">Printavo Orders ({linkedData.printavo_orders.length})</div>
                      {linkedData.printavo_orders.map((po: any, i: number) => (
                        <div key={i} className="text-xs text-zinc-400">
                          Order {po.order_id}: ${po.total?.toLocaleString()} — Owner: {po.owner}
                        </div>
                      ))}
                    </div>
                  )}
                  {linkedData.deco_orders?.length > 0 && (
                    <div className="bg-zinc-800/50 rounded p-2">
                      <div className="text-xs text-blue-400 mb-1">Deco Orders ({linkedData.deco_orders.length})</div>
                      {linkedData.deco_orders.map((d: any, i: number) => (
                        <div key={i} className="text-xs text-zinc-400">
                          Order {d.order_number}: ${d.order_total?.toLocaleString()} — Staff: {d.sales_staff}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedRow.notes && (
              <div className="border-t border-zinc-700 pt-3 mt-3">
                <h4 className="text-xs font-semibold text-zinc-400 mb-1 uppercase">Notes</h4>
                <p className="text-xs text-zinc-300 whitespace-pre-wrap">{selectedRow.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
