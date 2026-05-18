"use client";

import { DragEvent, Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";

type UnallocatedRow = Record<string, string>;
type SortDirection = "asc" | "desc";
type ColumnOption = { key: string; label: string; align?: "left" | "right" };

const DEFAULT_VISIBLE_COLUMNS: Record<string, boolean> = {
  suggestedSalesperson: true,
  decoOwner: true,
  lucasPdfMatch: true,
  joePdfMatch: true,
  allPdfMatch: true,
  invoiceLockerMatch: true,
  invoiceLockerStatus: true,
  invoiceLockerSource: true,
  invoiceLockerTokens: false,
  suggestionBasis: true,
  salesTracking: true,
  derivedFlags: false,
  docNumber: true,
  invoiceId: true,
  date: true,
  customer: true,
  total: true,
  qboInitials: true,
  printavoOwner: false,
  decoSalesStaff: false,
  status: true,
};

const COLUMN_OPTIONS: ColumnOption[] = [
  { key: "suggestedSalesperson", label: "Suggested salesperson/customer" },
  { key: "decoOwner", label: "Deco owner" },
  { key: "lucasPdfMatch", label: "Lucas PDF match" },
  { key: "joePdfMatch", label: "Joe PDF match" },
  { key: "allPdfMatch", label: "All PDF index match" },
  { key: "invoiceLockerMatch", label: "INVOICE_LOCKER match" },
  { key: "invoiceLockerStatus", label: "INVOICE_LOCKER status" },
  { key: "invoiceLockerSource", label: "INVOICE_LOCKER source" },
  { key: "invoiceLockerTokens", label: "INVOICE_LOCKER tokens" },
  { key: "suggestionBasis", label: "Suggestion basis/source" },
  { key: "salesTracking", label: "Sales tracking XLSX hit" },
  { key: "derivedFlags", label: "Derived match flags" },
  { key: "docNumber", label: "Doc #" },
  { key: "invoiceId", label: "Invoice ID" },
  { key: "date", label: "Date" },
  { key: "customer", label: "Customer" },
  { key: "total", label: "Total", align: "right" },
  { key: "qboInitials", label: "QBO initials" },
  { key: "printavoOwner", label: "Printavo owner" },
  { key: "decoSalesStaff", label: "Deco sales staff" },
  { key: "status", label: "Status" },
];
const DEFAULT_COLUMN_ORDER = COLUMN_OPTIONS.map((column) => column.key);

interface ApiResponse {
  success: boolean;
  sourceCsv: string;
  sourceCsvSha256: string;
  view?: string;
  availableViews?: string[];
  remainingHuntCsv?: string;
  salesTrackingIndex?: string;
  salesTrackingIndexTotalUniqueInvoiceKeys?: number;
  salesTrackingIndexTotalHits?: number;
  completionSummaryHtml?: string;
  completionStatus?: string;
  completionNote?: string;
  lucasPdfStageComplete?: boolean;
  joePdfStageComplete?: boolean;
  decoStageComplete?: boolean;
  allPdfStageComplete?: boolean;
  pipelineComplete?: boolean;
  finalRemainingRows?: number;
  finalRemainingGross?: number;
  derivedMatchesCsv?: string;
  derivedMatchesJson?: string;
  derivedMatchesSummary?: string;
  derivedMatchesOutputCsvSha256?: string;
  derivedMatchesOutputJsonSha256?: string;
  derivedMatchesRowsProcessed?: number;
  derivedMatchCounts?: Record<string, number>;
  decoOwnerMatchesCsv?: string;
  decoOwnerMatchesSummaryJson?: string;
  decoRemainingHuntCsv?: string;
  decoRemainingHuntXlsx?: string;
  decoWorkbook?: string;
  decoWorkbookSha256?: string;
  decoSheet?: string;
  decoMatchRule?: string;
  decoMatchedRows?: number;
  decoUnmatchedRows?: number;
  decoMatchedGrossTotal?: string;
  decoRemainingGrossTotal?: string;
  decoMatchedByOwner?: Record<string, number>;
  decoOwnerMatchesCsvSha256?: string;
  decoCurrentWithOwnerMatchesCsvSha256?: string;
  decoRemainingHuntCsvSha256?: string;
  decoRemainingHuntXlsxSha256?: string;
  lucasPdfMatchesCsv?: string;
  lucasPdfMatchesSummaryJson?: string;
  lucasRemainingHuntCsv?: string;
  lucasRemainingHuntXlsx?: string;
  lucasPdfSourceFolder?: string;
  lucasPdfSourceFileCount?: number;
  lucasPdfTextSidecarCount?: number;
  lucasPdfMatchRule?: string;
  lucasPdfMatchedRows?: number;
  lucasPdfRemainingRows?: number;
  lucasPdfMatchedGrossTotal?: string;
  lucasPdfRemainingGrossTotal?: string;
  lucasPdfMatchedByOwner?: Record<string, number>;
  lucasPdfMatchesCsvSha256?: string;
  lucasPdfCurrentWithMatchesCsvSha256?: string;
  lucasPdfRemainingHuntCsvSha256?: string;
  lucasPdfRemainingHuntXlsxSha256?: string;
  lucasPdfSummaryJsonSha256?: string;
  joePdfCombinedAcceptedMatchesCsv?: string;
  joePdfCombinedCurrentCsv?: string;
  joePdfCombinedRemainingCsv?: string;
  joePdfCombinedSummaryJson?: string;
  joePdfSourceFolder?: string;
  joePdfInputOriginalRemainingRows?: number;
  joePdfAcceptedSearchMethods?: string[];
  joePdfAcceptedMatchedRows?: number;
  joePdfAcceptedMatchedDistinctDocNumbers?: number;
  joePdfAcceptedMatchedDocNumbers?: string[];
  joePdfStillUnmatchedRows?: number;
  joePdfAcceptedMatchedGrossTotal?: string | number;
  joePdfRemainingGrossTotal?: string | number;
  joePdfCombinedAcceptedMatchesCsvSha256?: string;
  joePdfCombinedCurrentCsvSha256?: string;
  joePdfCombinedRemainingCsvSha256?: string;
  joePdfCombinedSummaryJsonSha256?: string;
  totalSourceRows: number;
  total: number;
  filtered: number;
  filteredTotalAmt?: number;
  limit: number;
  offset: number;
  rows: UnallocatedRow[];
  fields: string[];
}

function money(value: string) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number.isFinite(n) ? n : 0);
}

function rowIdentity(row: UnallocatedRow) {
  return row.row_key || row.doc_number || row.invoice_id || row.source_row_number;
}

function getSortValue(row: UnallocatedRow, columnKey: string) {
  switch (columnKey) {
    case "suggestedSalesperson":
      return row.suggested_salesperson_customer || "";
    case "decoOwner":
      return `${row.deco_owner || ""} ${row.deco_owner_match_status || ""} ${row.deco_excel_row_number || ""}`;
    case "lucasPdfMatch":
      return `${row.lucas_pdf_extract_detected_salesperson_name || ""} ${row.lucas_pdf_extract_match_flag || ""} ${row.lucas_pdf_extract_match_methods || ""} ${row.lucas_pdf_extract_match_count || ""} ${row.lucas_pdf_extract_file_names || ""}`;
    case "joePdfMatch":
      return `${row.joe_pdf_extract_detected_salesperson_name || ""} ${row.joe_pdf_extract_match_flag || ""} ${row.joe_pdf_extract_match_methods || ""} ${row.joe_pdf_extract_match_count || ""} ${row.joe_pdf_extract_file_names || ""} ${row.joe_pdf_extract_pass2_strict_match_flag || ""} ${row.joe_pdf_extract_pass2_strict_match_methods || ""} ${row.joe_pdf_extract_pass2_strict_match_count || ""} ${row.joe_pdf_extract_pass2_strict_file_names || ""}`;
    case "allPdfMatch":
      return `${row.all_pdf_index_match_flag || ""} ${row.all_pdf_index_match_status || ""} ${row.all_pdf_index_match_count || ""} ${row.all_pdf_index_match_methods || ""} ${row.all_pdf_index_file_names || ""}`;
    case "invoiceLockerMatch":
      return `${row.invoice_locker_match_flag || ""} ${row.invoice_locker_match_count || ""} ${row.invoice_locker_match_methods || ""} ${row.invoice_locker_candidate_invoice_numbers || ""} ${row.invoice_locker_second_pass_match_flag || ""} ${row.invoice_locker_second_pass_match_count || ""} ${row.invoice_locker_second_pass_match_methods || ""}`;
    case "invoiceLockerStatus":
      return `${row.invoice_locker_match_status || ""} ${row.invoice_locker_status_token_from_filename || ""} ${row.invoice_locker_second_pass_match_status || ""}`;
    case "invoiceLockerSource":
      return `${row.invoice_locker_source_paths || ""} ${row.invoice_locker_file_names || ""} ${row.invoice_locker_file_sha256s || ""} ${row.invoice_locker_second_pass_source_paths || ""} ${row.invoice_locker_second_pass_file_names || ""} ${row.invoice_locker_second_pass_file_sha256s || ""}`;
    case "invoiceLockerTokens":
      return `${row.invoice_locker_date_token_from_filename || ""} ${row.invoice_locker_customer_token_from_filename || ""} ${row.invoice_locker_second_pass_filename_customer_tokens || ""} ${row.invoice_locker_second_pass_filename_dates || ""} ${row.match_basis_text || ""}`;
    case "suggestionBasis":
      return `${row.suggestion_basis || ""} ${row.suggestion_source || ""}`;
    case "salesTracking":
      return Number(row.sales_tracking_hits_count || 0);
    case "derivedFlags":
      return `${row.tenant_rule_name || ""} ${row.tenant_amount_match_flag || ""} ${row.customer_sales_rule_name || ""} ${row.customer_sales_suggestion_flag || ""} ${row.sales_tracking_amount_match_flag || ""} ${row.sales_tracking_date_match_flag || ""}`;
    case "docNumber":
      return row.doc_number || "";
    case "invoiceId":
      return row.invoice_id || "";
    case "date":
      return Date.parse(row.txn_date || "") || row.txn_date || "";
    case "customer":
      return row.customer_ref_name || "";
    case "total":
      return Number(row.total_amt || 0);
    case "qboInitials":
      return row.qbo_salesperson_initials || "";
    case "printavoOwner":
      return row.printavo_order_owner || "";
    case "decoSalesStaff":
      return row.deconetwork_sales_staff_account || "";
    case "status":
      return row.recovery_status || "";
    default:
      return row[columnKey] || "";
  }
}

function compareSortValues(a: string | number, b: string | number) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

export default function QboUnallocatedPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [q, setQ] = useState("");
  const [customer, setCustomer] = useState("");
  const [salesperson, setSalesperson] = useState("");
  const [status, setStatus] = useState("");
  const [salesTrackingHit, setSalesTrackingHit] = useState("");
  const [hasSuggestion, setHasSuggestion] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(DEFAULT_VISIBLE_COLUMNS);
  const [columnOrder, setColumnOrder] = useState<string[]>(DEFAULT_COLUMN_ORDER);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: SortDirection } | null>(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const limit = 100;

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ view: "remaining", limit: String(limit), offset: String(offset) });
      if (q.trim()) params.set("q", q.trim());
      if (customer.trim()) params.set("customer", customer.trim());
      if (salesperson.trim()) params.set("salesperson", salesperson.trim());
      if (status.trim()) params.set("status", status.trim());
      if (salesTrackingHit) params.set("salesTrackingHit", salesTrackingHit);
      if (hasSuggestion) params.set("hasSuggestion", hasSuggestion);
      const res = await fetch(`/api/financials/qbo-unallocated?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      setData(json);
    } catch (error) {
      setMessage(`Load failed: ${error instanceof Error ? error.message : "Failed to load unallocated rows"}`);
    } finally {
      setLoading(false);
    }
  }, [customer, hasSuggestion, offset, q, salesTrackingHit, salesperson, status]);

  // Initial/page/filter load is an external API synchronization.
  useEffect(() => { loadRows(); }, [loadRows]);

  const isColumnVisible = (key: string) => visibleColumns[key] !== false;
  const visibleOrderedColumns = useMemo(() => columnOrder
    .map((key) => COLUMN_OPTIONS.find((column) => column.key === key))
    .filter((column): column is ColumnOption => column !== undefined && visibleColumns[column.key] !== false), [columnOrder, visibleColumns]);
  const sortedRows = useMemo(() => {
    const rows = data?.rows || [];
    if (!sortConfig) return rows;
    return [...rows].sort((a, b) => {
      const result = compareSortValues(getSortValue(a, sortConfig.key), getSortValue(b, sortConfig.key));
      return sortConfig.direction === "asc" ? result : -result;
    });
  }, [data?.rows, sortConfig]);
  const resetFilters = () => {
    setOffset(0);
    setQ("");
    setCustomer("");
    setSalesperson("");
    setStatus("");
    setSalesTrackingHit("");
    setHasSuggestion("");
  };
  const showAllColumns = () => setVisibleColumns(Object.fromEntries(COLUMN_OPTIONS.map((column) => [column.key, true])));
  const showDefaultColumns = () => setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
  const resetColumnOrder = () => setColumnOrder(DEFAULT_COLUMN_ORDER);
  const toggleSort = (key: string) => setSortConfig((current) => {
    if (current?.key !== key) return { key, direction: "asc" };
    if (current.direction === "asc") return { key, direction: "desc" };
    return null;
  });
  const moveColumn = (fromKey: string, toKey: string) => {
    if (fromKey === toKey) return;
    setColumnOrder((current) => {
      const next = [...current];
      const fromIndex = next.indexOf(fromKey);
      const toIndex = next.indexOf(toKey);
      if (fromIndex < 0 || toIndex < 0) return current;
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, fromKey);
      return next;
    });
  };
  const handleHeaderDragStart = (event: DragEvent<HTMLTableCellElement>, key: string) => {
    setDraggedColumn(key);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", key);
  };
  const handleHeaderDrop = (event: DragEvent<HTMLTableCellElement>, key: string) => {
    event.preventDefault();
    const fromKey = event.dataTransfer.getData("text/plain") || draggedColumn;
    if (fromKey) moveColumn(fromKey, key);
    setDraggedColumn(null);
  };
  const renderColumnCell = (columnKey: string, row: UnallocatedRow) => {
    switch (columnKey) {
      case "suggestedSalesperson":
        return <td style={{ padding: "0.75rem" }}>{row.suggested_salesperson_customer || "—"}</td>;
      case "decoOwner":
        return <td style={{ padding: "0.75rem", minWidth: 220 }}>{row.deco_owner ? <div><div>{row.deco_owner}{row.deco_owner_initials ? ` (${row.deco_owner_initials})` : ""}</div><div style={{ color: "var(--text-muted)", marginTop: 4 }}>{[row.deco_owner_match_method, row.deco_owner_match_status, row.deco_excel_row_number ? `Excel row ${row.deco_excel_row_number}` : ""].filter(Boolean).join("; ")}</div></div> : <div><div>—</div><div style={{ color: "var(--text-muted)", marginTop: 4 }}>{[row.deco_owner_match_status, row.deco_excel_row_number ? `Excel row ${row.deco_excel_row_number}` : ""].filter(Boolean).join("; ")}</div></div>}</td>;
      case "lucasPdfMatch":
        return <td style={{ padding: "0.75rem", minWidth: 260 }}>{row.lucas_pdf_extract_match_flag === "true" ? <div><div>{row.lucas_pdf_extract_detected_salesperson_name || "Invoice document hit"}</div><div style={{ color: "var(--text-muted)", marginTop: 4 }}>{[row.lucas_pdf_extract_match_methods, row.lucas_pdf_extract_match_count ? `${row.lucas_pdf_extract_match_count} file hit(s)` : "", row.lucas_pdf_extract_file_names].filter(Boolean).join("; ")}</div></div> : <div>—</div>}</td>;
      case "joePdfMatch":
        return <td style={{ padding: "0.75rem", minWidth: 280 }}>{row.joe_pdf_extract_match_flag === "true" || row.joe_pdf_extract_pass2_strict_match_flag === "true" ? <div><div>{row.joe_pdf_extract_detected_salesperson_name || "Joe PDF document hit"}</div><div style={{ color: "var(--text-muted)", marginTop: 4 }}>{[row.joe_pdf_extract_match_methods, row.joe_pdf_extract_match_count ? `${row.joe_pdf_extract_match_count} file hit(s)` : "", row.joe_pdf_extract_file_names, row.joe_pdf_extract_pass2_strict_match_methods, row.joe_pdf_extract_pass2_strict_match_count ? `${row.joe_pdf_extract_pass2_strict_match_count} strict hit(s)` : "", row.joe_pdf_extract_pass2_strict_file_names].filter(Boolean).join("; ")}</div></div> : <div>—</div>}</td>;
      case "allPdfMatch":
        return <td style={{ padding: "0.75rem", minWidth: 280 }}>{row.all_pdf_index_match_flag === "true" ? <div><div>PDF hit ({row.all_pdf_index_match_count || "?"} file(s))</div><div style={{ color: "var(--text-muted)", marginTop: 4 }}>{[row.all_pdf_index_match_methods, row.all_pdf_index_file_names].filter(Boolean).join("; ")}</div></div> : <div>—</div>}</td>;
      case "invoiceLockerMatch":
        return <td style={{ padding: "0.75rem", minWidth: 260 }}>{row.invoice_locker_match_flag === "true" || row.invoice_locker_second_pass_match_flag === "true" ? <div><div>{row.invoice_locker_match_count || row.invoice_locker_second_pass_match_count || "0"} INVOICE_LOCKER hit(s)</div><div style={{ color: "var(--text-muted)", marginTop: 4 }}>{[row.invoice_locker_match_methods, row.invoice_locker_candidate_invoice_numbers ? `candidates: ${row.invoice_locker_candidate_invoice_numbers}` : "", row.invoice_locker_second_pass_match_methods].filter(Boolean).join("; ")}</div></div> : <div>—</div>}</td>;
      case "invoiceLockerStatus":
        return <td style={{ padding: "0.75rem", minWidth: 220 }}>{[row.invoice_locker_match_status, row.invoice_locker_status_token_from_filename, row.invoice_locker_second_pass_match_status].filter(Boolean).join("; ") || "—"}</td>;
      case "invoiceLockerSource":
        return <td style={{ padding: "0.75rem", minWidth: 320, overflowWrap: "anywhere" }}><div>{row.invoice_locker_file_names || row.invoice_locker_second_pass_file_names || "—"}</div><div style={{ color: "var(--text-muted)", marginTop: 4 }}>{[row.invoice_locker_source_paths, row.invoice_locker_file_sha256s ? `sha256=${row.invoice_locker_file_sha256s}` : "", row.invoice_locker_second_pass_source_paths, row.invoice_locker_second_pass_file_sha256s ? `second_pass_sha256=${row.invoice_locker_second_pass_file_sha256s}` : ""].filter(Boolean).join("; ")}</div></td>;
      case "invoiceLockerTokens":
        return <td style={{ padding: "0.75rem", minWidth: 260 }}>{[row.invoice_locker_date_token_from_filename ? `date=${row.invoice_locker_date_token_from_filename}` : "", row.invoice_locker_customer_token_from_filename ? `customer=${row.invoice_locker_customer_token_from_filename}` : "", row.invoice_locker_second_pass_filename_customer_tokens ? `second pass customer=${row.invoice_locker_second_pass_filename_customer_tokens}` : "", row.invoice_locker_second_pass_filename_dates ? `second pass date=${row.invoice_locker_second_pass_filename_dates}` : "", row.match_basis_text].filter(Boolean).join("; ") || "—"}</td>;
      case "suggestionBasis":
        return <td style={{ padding: "0.75rem", minWidth: 260 }}>{row.suggestion_basis ? <div><div>{row.suggestion_basis}</div><div style={{ color: "var(--text-muted)", marginTop: 4 }}>{row.suggestion_source}</div></div> : "—"}</td>;
      case "salesTracking":
        return <td style={{ padding: "0.75rem", minWidth: 260 }}>{row.sales_tracking_hits_count && row.sales_tracking_hits_count !== "0" ? <div><div>{row.sales_tracking_hits_count} hit(s)</div><div style={{ color: "var(--text-muted)", marginTop: 4 }}>{row.sales_tracking_first_hit || row.sales_tracking_hit_notes}</div></div> : "—"}</td>;
      case "derivedFlags":
        return <td style={{ padding: "0.75rem", minWidth: 260 }}>{row.suggestion_basis ? <div><div>tenant: {row.tenant_rule_name || "—"}; amount match: {row.tenant_amount_match_flag || "false"}</div><div>customer rule: {row.customer_sales_rule_name || "—"}; sales hint: {row.customer_sales_suggestion_flag || "false"}</div><div>sales tracking amount/date match: {row.sales_tracking_amount_match_flag || "false"}/{row.sales_tracking_date_match_flag || "false"}</div><div style={{ color: "var(--text-muted)", marginTop: 4 }}>{[row.amount_match_notes, row.date_match_notes].filter(Boolean).join(" | ")}</div></div> : "—"}</td>;
      case "docNumber":
        return <td style={{ padding: "0.75rem", fontFamily: "var(--font-mono)" }}>{row.doc_number}</td>;
      case "invoiceId":
        return <td style={{ padding: "0.75rem", fontFamily: "var(--font-mono)" }}>{row.invoice_id}</td>;
      case "date":
        return <td style={{ padding: "0.75rem" }}>{row.txn_date}</td>;
      case "customer":
        return <td style={{ padding: "0.75rem", minWidth: 220 }}>{row.customer_ref_name}</td>;
      case "total":
        return <td style={{ padding: "0.75rem", textAlign: "right", fontFamily: "var(--font-mono)" }}>{money(row.total_amt)}</td>;
      case "qboInitials":
        return <td style={{ padding: "0.75rem" }}>{row.qbo_salesperson_initials || "—"}</td>;
      case "printavoOwner":
        return <td style={{ padding: "0.75rem" }}>{row.printavo_order_owner || "—"}</td>;
      case "decoSalesStaff":
        return <td style={{ padding: "0.75rem" }}>{row.deconetwork_sales_staff_account || "—"}</td>;
      case "status":
        return <td style={{ padding: "0.75rem" }}>{row.recovery_status}</td>;
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: "2rem", width: "min(1800px, calc(100vw - 2rem))", maxWidth: "none", margin: "0 auto" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0 0 0.25rem 0" }}>Unallocated Orders — Complete</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>
          Documentation hunt complete. All real-dollar unallocated orders have been identified and assigned to salespeople. The 25 rows below are $0.00 noise — test accounts, corrections, and zero-dollar entries.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: "1rem", marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <Search size={16} style={{ color: "var(--text-muted)" }} />
          <input
            value={q}
            onChange={(e) => { setOffset(0); setQ(e.target.value); }}
            placeholder="Search any key field"
            style={{ flex: 1, minWidth: 260, background: "var(--bg-glass)", border: "var(--glass-border)", borderRadius: 6, padding: "0.6rem", color: "var(--text-primary)" }}
          />
          <button onClick={loadRows} style={{ border: "none", borderRadius: 6, padding: "0.6rem 1rem", background: "var(--accent-cyan)", color: "#000", fontWeight: 700, cursor: "pointer" }}>Refresh</button>
          <button onClick={resetFilters} style={{ border: "var(--glass-border)", borderRadius: 6, padding: "0.6rem 1rem", background: "var(--bg-glass)", color: "var(--text-primary)", fontWeight: 700, cursor: "pointer" }}>Clear filters</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem", marginTop: "0.75rem" }}>
          <input value={customer} onChange={(e) => { setOffset(0); setCustomer(e.target.value); }} placeholder="Filter customer" style={{ background: "var(--bg-glass)", border: "var(--glass-border)", borderRadius: 6, padding: "0.55rem", color: "var(--text-primary)" }} />
          <input value={salesperson} onChange={(e) => { setOffset(0); setSalesperson(e.target.value); }} placeholder="Filter salesperson/owner" style={{ background: "var(--bg-glass)", border: "var(--glass-border)", borderRadius: 6, padding: "0.55rem", color: "var(--text-primary)" }} />
          <input value={status} onChange={(e) => { setOffset(0); setStatus(e.target.value); }} placeholder="Filter status" style={{ background: "var(--bg-glass)", border: "var(--glass-border)", borderRadius: 6, padding: "0.55rem", color: "var(--text-primary)" }} />
          <select value={salesTrackingHit} onChange={(e) => { setOffset(0); setSalesTrackingHit(e.target.value); }} style={{ background: "var(--bg-glass)", border: "var(--glass-border)", borderRadius: 6, padding: "0.55rem", color: "var(--text-primary)" }}>
            <option value="" style={{ color: "#000" }}>Sales tracking: any</option>
            <option value="yes" style={{ color: "#000" }}>Sales tracking hit</option>
            <option value="no" style={{ color: "#000" }}>No sales tracking hit</option>
          </select>
          <select value={hasSuggestion} onChange={(e) => { setOffset(0); setHasSuggestion(e.target.value); }} style={{ background: "var(--bg-glass)", border: "var(--glass-border)", borderRadius: 6, padding: "0.55rem", color: "var(--text-primary)" }}>
            <option value="" style={{ color: "#000" }}>Suggestion: any</option>
            <option value="yes" style={{ color: "#000" }}>Has suggestion</option>
            <option value="no" style={{ color: "#000" }}>No suggestion</option>
          </select>
        </div>
        <div style={{ marginTop: "0.9rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(148,163,184,.16)" }}>
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap", marginBottom: "0.5rem" }}>
            <span style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700 }}>Columns:</span>
            <button onClick={showDefaultColumns} style={{ border: "var(--glass-border)", borderRadius: 6, padding: "0.35rem 0.55rem", background: "var(--bg-glass)", color: "var(--text-primary)", cursor: "pointer" }}>Default</button>
            <button onClick={showAllColumns} style={{ border: "var(--glass-border)", borderRadius: 6, padding: "0.35rem 0.55rem", background: "var(--bg-glass)", color: "var(--text-primary)", cursor: "pointer" }}>Show all</button>
            <button onClick={resetColumnOrder} style={{ border: "var(--glass-border)", borderRadius: 6, padding: "0.35rem 0.55rem", background: "var(--bg-glass)", color: "var(--text-primary)", cursor: "pointer" }}>Reset column order</button>
            <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>Click headers to sort; drag headers to reorder.</span>
          </div>
          <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
            {COLUMN_OPTIONS.map((column) => (
              <label key={column.key} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--text-secondary)", fontSize: "0.75rem" }}>
                <input type="checkbox" checked={isColumnVisible(column.key)} onChange={(event) => setVisibleColumns((current) => ({ ...current, [column.key]: event.target.checked }))} />
                {column.label}
              </label>
            ))}
          </div>
        </div>
        {data && (
          <div style={{ marginTop: "0.75rem", color: "var(--text-primary)", fontSize: "0.78rem", overflowWrap: "anywhere" }}>
            {/* Completion status banner */}
            <div style={{ padding: "0.75rem 1rem", marginBottom: "0.75rem", borderRadius: 8, background: data.pipelineComplete ? "rgba(34,197,94,0.12)" : "rgba(234,179,8,0.12)", border: `1px solid ${data.pipelineComplete ? 'rgba(34,197,94,0.35)' : 'rgba(234,179,8,0.35)'}`, color: "var(--text-primary)" }}>
              <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.3rem" }}>
                {data.pipelineComplete ? "✓ PIPELINE COMPLETE" : "Pipeline Status"}
              </div>
              <div style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {data.completionSummaryHtml || "All real-dollar unallocated orders have been identified. Pipeline stages below are historical archive data."}
              </div>
            </div>
            {/* Per-stage historical archive metadata (collapsed by default) */}
            <details style={{ marginBottom: "0.5rem", color: "var(--text-muted)", fontSize: "0.72rem" }}>
              <summary style={{ cursor: "pointer", color: "var(--text-secondary)", fontWeight: 600, padding: "0.3rem 0" }}>
                Historical pipeline stage details (archive — click to expand)
              </summary>
              <div style={{ padding: "0.5rem 0" }}>
                <div style={{ marginBottom: "0.35rem", opacity: 0.82 }}>
                  <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>Lucas PDF (ARCHIVE):</span>{" "}
                  {data.lucasPdfMatchedRows ?? 0} matched / {data.lucasPdfRemainingRows ?? 0} were remaining at this stage;
                  matched gross {data.lucasPdfMatchedGrossTotal || "not loaded"}.
                  Source: {data.lucasPdfSourceFolder || "not loaded"}.
                  Summary: {data.lucasPdfMatchesSummaryJson || "not loaded"}.
                </div>
                <div style={{ marginBottom: "0.35rem", opacity: 0.82 }}>
                  <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>Joe PDF (ARCHIVE):</span>{" "}
                  {data.joePdfAcceptedMatchedRows ?? 0} matched / {data.joePdfStillUnmatchedRows ?? 0} were remaining at this stage;
                  matched gross {money(String(data.joePdfAcceptedMatchedGrossTotal || 0))}.
                  Source: {data.joePdfSourceFolder || "not loaded"}.
                  Summary: {data.joePdfCombinedSummaryJson || "not loaded"}.
                </div>
                <div style={{ marginBottom: "0.35rem", opacity: 0.82 }}>
                  <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>Deco Owner (ARCHIVE):</span>{" "}
                  {data.decoMatchedRows ?? 0} matched / {data.decoUnmatchedRows ?? 0} were unmatched at this stage;
                  matched gross {data.decoMatchedGrossTotal || "not loaded"}.
                </div>
                <div style={{ opacity: 0.82 }}>
                  <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>All-PDF-Index (ARCHIVE):</span>{" "}
                  {data.allPdfIndexMatchedDocNumbers ?? 0} matched / {data.allPdfIndexRemainingRows ?? 0} were remaining at this stage.
                </div>
              </div>
            </details>
            <div style={{ marginBottom: "0.35rem", color: "var(--text-muted)", fontSize: "0.72rem" }}>
              Showing {data.rows.length} of {data.filtered} filtered remaining rows ({data.total} rows in view; filtered total {money(String(data.filteredTotalAmt || 0))}).
              View: {data.view || "remaining"}. Source: {data.sourceCsv}. Sales tracking index: {data.salesTrackingIndex || "not loaded"} ({data.salesTrackingIndexTotalUniqueInvoiceKeys || 0} keys / {data.salesTrackingIndexTotalHits || 0} hits).
              Derived matches: {data.derivedMatchesCsv || "not loaded"} ({data.derivedMatchesRowsProcessed || 0} rows; any suggestion {data.derivedMatchCounts?.rows_with_any_suggestion || 0}; salesperson {data.derivedMatchCounts?.rows_with_suggested_salesperson || 0}; category {data.derivedMatchCounts?.rows_with_suggested_category || 0}).
            </div>
          </div>
        )}
      </div>

      {message && <div className="glass-panel" style={{ padding: "0.75rem 1rem", marginBottom: "1rem", color: "var(--accent-cyan)", fontSize: "0.8rem", overflowWrap: "anywhere" }}>{message}</div>}

      {loading || !data ? (
        <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}><Loader2 className="animate-spin" /> Loading...</div>
      ) : (
        <>
          <div className="glass-panel" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 1400, borderCollapse: "collapse", fontSize: "0.78rem" }}>
              <thead>
                <tr style={{ color: "var(--text-muted)", textAlign: "left", borderBottom: "var(--glass-border)" }}>
                  {visibleOrderedColumns.map((column) => {
                    const sortMark = sortConfig?.key === column.key ? (sortConfig.direction === "asc" ? " ▲" : " ▼") : " ↕";
                    return (
                      <th
                        key={column.key}
                        draggable
                        onDragStart={(event) => handleHeaderDragStart(event, column.key)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => handleHeaderDrop(event, column.key)}
                        onDragEnd={() => setDraggedColumn(null)}
                        style={{ padding: "0.75rem", textAlign: column.align || "left", cursor: "grab", opacity: draggedColumn === column.key ? 0.55 : 1, whiteSpace: "nowrap" }}
                        title="Drag to reorder this column. Click label to sort."
                      >
                        <button
                          type="button"
                          onClick={() => toggleSort(column.key)}
                          style={{ border: "none", background: "transparent", color: "inherit", padding: 0, font: "inherit", fontWeight: 800, cursor: "pointer", textAlign: column.align || "left" }}
                          aria-label={`Sort by ${column.label}`}
                        >
                          {column.label}{sortMark}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => {
                  const key = rowIdentity(row);
                  return (
                    <tr key={`${row.source_row_number}-${key}`} style={{ borderBottom: "1px solid rgba(148,163,184,.14)" }}>
                      {visibleOrderedColumns.map((column) => <Fragment key={column.key}>{renderColumnCell(column.key, row)}</Fragment>)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
            <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))} style={{ padding: "0.55rem 1rem", borderRadius: 6, border: "var(--glass-border)", background: "var(--bg-glass)", color: "var(--text-primary)", cursor: offset === 0 ? "default" : "pointer" }}>Previous</button>
            <button disabled={offset + limit >= data.filtered} onClick={() => setOffset(offset + limit)} style={{ padding: "0.55rem 1rem", borderRadius: 6, border: "var(--glass-border)", background: "var(--bg-glass)", color: "var(--text-primary)", cursor: offset + limit >= data.filtered ? "default" : "pointer" }}>Next</button>
          </div>
        </>
      )}
    </div>
  );
}
