import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOCKER_ROOT = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER";
const PRIMARY_UNALLOCATED_CSV = path.join(
  LOCKER_ROOT,
  "_analysis_outputs/qbo_unallocated_joe_pdf_extract_matches/qbo_unallocated_current_with_joe_pdf_extract_matches.csv"
);
const REMAINING_UNALLOCATED_CSV = path.join(
  LOCKER_ROOT,
  "_analysis_outputs/qbo_unallocated_joe_pdf_extract_matches/qbo_unallocated_remaining_after_joe_pdf_extract_matches.csv"
);
const FALLBACK_UNALLOCATED_CSV = path.join(
  LOCKER_ROOT,
  "_analysis_outputs/qbo_unallocated_accounting_invoice_locker_matches/qbo_unallocated_current_with_invoice_locker_matches.csv"
);
const UNALLOCATED_CSV = PRIMARY_UNALLOCATED_CSV;
const LUCAS_PDF_MATCHES_CSV = path.join(
  LOCKER_ROOT,
  "_analysis_outputs/qbo_unallocated_lucas_pdf_extract_matches/qbo_unallocated_lucas_pdf_extract_matches.csv"
);
const LUCAS_PDF_MATCHES_SUMMARY_JSON = path.join(
  LOCKER_ROOT,
  "_analysis_outputs/qbo_unallocated_lucas_pdf_extract_matches/qbo_unallocated_lucas_pdf_extract_matches_summary.json"
);
const LUCAS_REMAINING_HUNT_CSV = path.join(
  LOCKER_ROOT,
  "_analysis_outputs/qbo_unallocated_lucas_pdf_extract_matches/qbo_unallocated_remaining_after_lucas_pdf_extract_matches.csv"
);
const LUCAS_REMAINING_HUNT_XLSX = path.join(
  LOCKER_ROOT,
  "_analysis_outputs/qbo_unallocated_lucas_pdf_extract_matches/qbo_unallocated_remaining_after_lucas_pdf_extract_matches.xlsx"
);
const JOE_PDF_COMBINED_ACCEPTED_MATCHES_CSV = path.join(
  LOCKER_ROOT,
  "_analysis_outputs/qbo_unallocated_joe_pdf_extract_matches/qbo_unallocated_joe_pdf_extract_matches.csv"
);
const JOE_PDF_COMBINED_SUMMARY_JSON = path.join(
  LOCKER_ROOT,
  "_analysis_outputs/qbo_unallocated_joe_pdf_extract_matches/qbo_unallocated_joe_pdf_extract_match_summary.json"
);
const DECO_OWNER_MATCHES_CSV = path.join(
  LOCKER_ROOT,
  "_analysis_outputs/qbo_unallocated_deco_owner_matches/qbo_unallocated_deco_owner_matches.csv"
);
const DECO_OWNER_MATCHES_SUMMARY_JSON = path.join(
  LOCKER_ROOT,
  "_analysis_outputs/qbo_unallocated_deco_owner_matches/qbo_unallocated_deco_owner_matches_summary.json"
);
const DECO_REMAINING_HUNT_CSV = path.join(
  LOCKER_ROOT,
  "_analysis_outputs/qbo_unallocated_deco_owner_matches/qbo_unallocated_remaining_after_deco_owner_matches.csv"
);
const DECO_REMAINING_HUNT_XLSX = path.join(
  LOCKER_ROOT,
  "_analysis_outputs/qbo_unallocated_deco_owner_matches/qbo_unallocated_remaining_after_deco_owner_matches.xlsx"
);
const ALL_PDF_INDEX_HUNT_CSV = path.join(
  LOCKER_ROOT,
  "_analysis_outputs/qbo_unallocated_all_pdf_index_matches/qbo_unallocated_true_remaining_after_joseph_identified.csv"
);
const ALL_PDF_INDEX_MATCHES_CSV = path.join(
  LOCKER_ROOT,
  "_analysis_outputs/qbo_unallocated_all_pdf_index_matches/qbo_unallocated_with_all_pdf_index_matches.csv"
);
const ALL_PDF_INDEX_SUMMARY_JSON = path.join(
  LOCKER_ROOT,
  "_analysis_outputs/qbo_unallocated_all_pdf_index_matches/qbo_unallocated_all_pdf_index_summary.json"
);
const ALL_PDF_INDEX_ENRICHED_CSV = path.join(
  LOCKER_ROOT,
  "_analysis_outputs/qbo_unallocated_all_pdf_index_matches/qbo_unallocated_with_all_pdf_index_matches.csv"
);
const FINAL_177_HUNT_CSV = path.join(
  LOCKER_ROOT,
  "_analysis_outputs/qbo_unallocated_joe_pdf_extract_matches/qbo_unallocated_177_hunt_target.csv"
);
const FINAL_177_HUNT_SUMMARY_JSON = path.join(
  LOCKER_ROOT,
  "_analysis_outputs/qbo_unallocated_joe_pdf_extract_matches/qbo_unallocated_hunt_177_summary.json"
);
const COMPLETION_SUMMARY_JSON = path.join(
  LOCKER_ROOT,
  "_analysis_outputs/qbo_unallocated_all_pdf_index_matches/qbo_unallocated_completion_summary.json"
);
const UPLOAD_ROOT = path.join(
  LOCKER_ROOT,
  "analysis/uploads/qbo_unallocated_invoice_uploads"
);
const CATEGORY_SIDECAR = path.join(UPLOAD_ROOT, "qbo_unallocated_invoice_categories.sidecar.json");
const CATEGORY_MANIFEST_ROOT = path.join(UPLOAD_ROOT, "category_manifests");
const CATEGORY_APPROVAL_SIDECAR = path.join(UPLOAD_ROOT, "qbo_unallocated_invoice_category_approvals.sidecar.json");
const CATEGORY_APPROVAL_MANIFEST_ROOT = path.join(UPLOAD_ROOT, "category_approval_manifests");
const CATEGORY_OPTIONS = ["", "tenant rent", "contractor"];
const APPLY_SUGGESTED_CATEGORY_OPTIONS = ["tenant rent", "contractor"];
const SALES_TRACKING_INDEX = path.join(UPLOAD_ROOT, "sales_tracking_invoice_index.json");
const DERIVED_MATCHES_CSV = path.join(
  LOCKER_ROOT,
  "_analysis_outputs/rosettastone_business_context_map/qbo_unallocated_invoice_derived_matches_joseph_sales_tracking.csv"
);
const DERIVED_MATCHES_JSON = path.join(
  LOCKER_ROOT,
  "_analysis_outputs/rosettastone_business_context_map/qbo_unallocated_invoice_derived_matches_joseph_sales_tracking.json"
);
const DERIVED_MATCHES_SUMMARY = path.join(
  LOCKER_ROOT,
  "_analysis_outputs/rosettastone_business_context_map/qbo_unallocated_invoice_derived_matches_joseph_sales_tracking_summary.json"
);

interface SalesTrackingHit {
  source_path?: string;
  source_sha256?: string;
  sheet?: string;
  excel_row_number?: string;
  invoice_or_order_number?: string;
  customer_name?: string;
  salesperson_raw?: string;
  date?: string;
  amount?: string;
  basis?: string;
}

interface SalesTrackingIndex {
  output_path?: string;
  total_unique_invoice_keys?: number;
  total_indexed_hits?: number;
  by_invoice?: Record<string, SalesTrackingHit[]>;
}

interface DerivedSuggestion {
  suggested_category: string;
  suggested_salesperson_customer: string;
  suggestion_basis: string;
  suggestion_source: string;
  sales_tracking_hits_count: string;
  sales_tracking_first_hit: string;
}

interface DerivedMatchRow {
  row_key?: string;
  suggested_category?: string;
  suggested_salesperson?: string;
  suggested_salesperson_raw?: string;
  suggestion_basis?: string;
  suggestion_source?: string;
  tenant_rule_name?: string;
  tenant_expected_monthly_amount?: string;
  tenant_amount_match_flag?: string;
  customer_sales_rule_name?: string;
  customer_sales_suggestion_flag?: string;
  sales_tracking_hit_flag?: string;
  sales_tracking_hits_count?: string;
  sales_tracking_salesperson_raw_values?: string;
  sales_tracking_salesperson_suggestions?: string;
  sales_tracking_amount_match_flag?: string;
  sales_tracking_date_match_flag?: string;
  amount_match_notes?: string;
  date_match_notes?: string;
  sales_tracking_hit_notes?: string;
}

interface DerivedMatchesPayload {
  output_csv?: string;
  rows?: DerivedMatchRow[];
}

interface DerivedMatchesSummary {
  output_csv_sha256?: string;
  output_json_sha256?: string;
  unallocated_rows_processed?: number;
  counts?: Record<string, number>;
}

interface DecoOwnerMatchesSummary {
  deco_workbook?: string;
  deco_workbook_sha256?: string;
  deco_sheet?: string;
  match_rule?: string;
  total_source_rows?: number;
  matched_rows?: number;
  unmatched_rows?: number;
  matched_gross_total?: string;
  remaining_gross_total?: string;
  matched_by_owner?: Record<string, number>;
  outputs?: Record<string, string>;
}

interface LucasPdfMatchesSummary {
  lucas_pdf_source_folder?: string;
  lucas_pdf_source_file_count?: number;
  lucas_pdf_source_extension_counts?: Record<string, number>;
  lucas_pdf_text_sidecar_count?: number;
  match_rule?: string;
  match_methods?: Record<string, number>;
  remaining_rows?: number;
  matched_gross_total?: string;
  remaining_gross_total?: string;
  matched_by_owner?: Record<string, number>;
  source_folder?: string;
  file_stats?: { count?: number; extension_counts?: Record<string, number>; total_bytes?: number };
  search_method_used?: string;
  match_method_counts?: Record<string, number>;
  remaining_rows_searched?: number;
  matched_rows?: number;
  still_unmatched_rows?: number;
  matched_gross_total_amt?: number;
  remaining_gross_total_amt?: number;
  matched_by_detected_salesperson?: Record<string, number>;
  outputs?: Record<string, string>;
}

interface JoePdfCombinedSummary {
  source_folder?: string;
  source_evidence_folder?: string;
  input_original_remaining_rows?: number;
  input_remaining_rows?: number;
  accepted_search_methods?: string[];
  accepted_matched_rows?: number;
  matched_remaining_rows?: number;
  accepted_matched_distinct_doc_numbers?: number;
  matched_unique_doc_numbers?: number;
  accepted_matched_doc_numbers?: string[];
  still_unmatched_rows?: number;
  unmatched_remaining_rows?: number;
  accepted_matched_gross_total_amt?: number;
  matched_remaining_total_amt?: number;
  remaining_gross_total_amt?: number;
  unmatched_remaining_total_amt?: number;
  match_method_counts?: Record<string, number>;
  outputs?: Record<string, string>;
  output_sha256s?: Record<string, string>;
  summary_json_sha256?: string;
}

interface AllPdfIndexSummary {
  pass?: string;
  sources_searched?: string[];
  source_type?: string;
  total_rows_in_remaining?: number;
  matched_doc_numbers?: number;
  matched_in_unallocated?: number;
  matched_in_already_approved?: number;
  matched_gross?: number;
  hunt_remaining?: number;
  hunt_remaining_gross?: number;
  approved_count?: number;
  approved_gross?: number;
}

const JOSEPH_MAPPING_SOURCE = "Joseph-provided tenant/customer mapping; derived user-provided hint only; QBO CustomField DefinitionId=2 remains controlling";

const JOSEPH_TENANT_MAPPINGS: Record<string, { amount: string; category: string }> = {
  "aeriz": { amount: "2000", category: "tenant rent" },
  "pendulum creative": { amount: "3500", category: "tenant rent" },
  "what margie made": { amount: "2175", category: "tenant rent" },
};

const JOSEPH_CUSTOMER_MAPPINGS: Record<string, string> = {
  "85 supply": "Abel Rodriguez",
  "benchmark": "Abel Rodriguez",
  "ten atoms": "Lucas Guariglia",
  "loop": "Joseph Zangrilli",
  "ivy hall": "Joseph Zangrilli",
  "futureshirts": "Lucas Guariglia",
  "oston": "Lucas Guariglia",
  "peak 6": "Lucas Guariglia",
  "aeriz": "Lucas Guariglia",
  "goose island beer": "Lucas Guariglia",
  "good buddy": "Lucas Guariglia",
  "playa society": "Lucas Guariglia",
  "s&s activewear": "Lucas Guariglia",
  "amplified pilates": "Lucas Guariglia",
  "joe fresh goods": "Lucas Guariglia",
  "taylor bennett": "Lucas Guariglia",
  "nonpoint": "Lucas Guariglia unless specifically marked JZ",
};

interface CategoryOverride {
  category: string;
  doc_number: string;
  invoice_id: string;
  source_row_number: string;
  updated_at_utc: string;
}

interface CategoryApproval extends CategoryOverride {
  approved_category: string;
  approved_at_utc: string;
  approved_by: string;
  approval_basis: string;
  source_category_field: string;
  source_csv_sha256: string;
  category_sidecar_path: string;
}

interface CategoryPatchRequest extends Partial<CategoryOverride> {
  apply_suggested_category?: boolean;
  finalize_category?: boolean;
  approved_by?: string;
}

interface CategorySidecar {
  schema_version: 1;
  purpose: string;
  source_csv: string;
  storage_note: string;
  controlling_salesperson_field: string;
  updated_at_utc: string;
  categories: Record<string, CategoryOverride>;
}

interface CategoryApprovalSidecar {
  schema_version: 1;
  purpose: string;
  source_csv: string;
  storage_note: string;
  controlling_salesperson_field: string;
  updated_at_utc: string;
  approvals: Record<string, CategoryApproval>;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i++;
      row.push(cell);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

type QboUnallocatedView = "current" | "remaining";

async function readCurrentUnallocatedCsv(view: QboUnallocatedView): Promise<{ sourceCsv: string; text: string; sourceCsvSha256: string; view: QboUnallocatedView }> {
  const candidates = view === "remaining" ? [ALL_PDF_INDEX_HUNT_CSV, FINAL_177_HUNT_CSV, REMAINING_UNALLOCATED_CSV] : [PRIMARY_UNALLOCATED_CSV, FALLBACK_UNALLOCATED_CSV];
  let lastError: unknown = null;
  for (const candidate of candidates) {
    try {
      const text = await readFile(candidate, "utf8");
      const sourceCsvSha256 = createHash("sha256").update(text).digest("hex");
      console.info("qbo-unallocated source CSV selected", { view, source_csv: candidate, source_csv_sha256: sourceCsvSha256 });
      return { sourceCsv: candidate, text, sourceCsvSha256, view };
    } catch (error) {
      lastError = error;
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        console.warn("qbo-unallocated source CSV candidate not found", { source_csv: candidate });
        continue;
      }
      console.error("qbo-unallocated source CSV read failed", { source_csv: candidate, error });
      throw error;
    }
  }
  console.error("qbo-unallocated source CSV candidates unavailable", { candidates, lastError });
  throw new Error(`Unable to read qbo-unallocated source CSV. Tried: ${candidates.join(", ")}`);
}

function cleanSegment(value: string): string {
  return (value || "unknown")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "unknown";
}

function rowKeyFromIdentifiers(docNumber: string, invoiceId: string, sourceRowNumber: string): string {
  return cleanSegment([sourceRowNumber, docNumber, invoiceId].map((value) => value.trim()).filter(Boolean).join("__"));
}

function defaultSidecar(): CategorySidecar {
  return {
    schema_version: 1,
    purpose: "derived user category annotations for QBO unallocated invoice review",
    source_csv: UNALLOCATED_CSV,
    storage_note: "Derived app-controlled artifact; original QBO/source evidence files are not modified.",
    controlling_salesperson_field: "QBO CustomField DefinitionId=2 / qbo_customfield_definitionid_2_raw_value",
    updated_at_utc: new Date().toISOString(),
    categories: {},
  };
}

function defaultApprovalSidecar(): CategoryApprovalSidecar {
  return {
    schema_version: 1,
    purpose: "derived Joseph-approved category finalization annotations for QBO unallocated invoice review",
    source_csv: UNALLOCATED_CSV,
    storage_note: "Derived app-controlled approval artifact; original QBO/source evidence files are not modified and no invoice documentation upload is required.",
    controlling_salesperson_field: "QBO CustomField DefinitionId=2 / qbo_customfield_definitionid_2_raw_value",
    updated_at_utc: new Date().toISOString(),
    approvals: {},
  };
}

async function readCategorySidecar(): Promise<CategorySidecar> {
  try {
    const text = await readFile(CATEGORY_SIDECAR, "utf8");
    const parsed = JSON.parse(text) as Partial<CategorySidecar>;
    return {
      ...defaultSidecar(),
      ...parsed,
      categories: parsed.categories ?? {},
    };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return defaultSidecar();
    console.error("qbo-unallocated category sidecar read failed", { path: CATEGORY_SIDECAR, error });
    throw error;
  }
}

async function readCategoryApprovalSidecar(): Promise<CategoryApprovalSidecar> {
  try {
    const text = await readFile(CATEGORY_APPROVAL_SIDECAR, "utf8");
    const parsed = JSON.parse(text) as Partial<CategoryApprovalSidecar>;
    return {
      ...defaultApprovalSidecar(),
      ...parsed,
      approvals: parsed.approvals ?? {},
    };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return defaultApprovalSidecar();
    console.error("qbo-unallocated category approval sidecar read failed", { path: CATEGORY_APPROVAL_SIDECAR, error });
    throw error;
  }
}

async function writeCategorySidecar(sidecar: CategorySidecar, manifestInput: CategoryOverride & { row_key: string }) {
  await mkdir(UPLOAD_ROOT, { recursive: true });
  await mkdir(CATEGORY_MANIFEST_ROOT, { recursive: true });
  const serialized = JSON.stringify(sidecar, null, 2);
  await writeFile(CATEGORY_SIDECAR, serialized);
  const sidecarSha256 = createHash("sha256").update(serialized).digest("hex");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const manifest = {
    category_saved_at_utc: sidecar.updated_at_utc,
    row_key: manifestInput.row_key,
    category: manifestInput.category,
    doc_number: manifestInput.doc_number,
    invoice_id: manifestInput.invoice_id,
    source_row_number: manifestInput.source_row_number,
    sidecar_path: CATEGORY_SIDECAR,
    sidecar_sha256: sidecarSha256,
    source_csv: UNALLOCATED_CSV,
    purpose: "derived user category annotation; no source evidence modified",
    controlling_salesperson_field: "QBO CustomField DefinitionId=2 / qbo_customfield_definitionid_2_raw_value",
  };
  const manifestPath = path.join(CATEGORY_MANIFEST_ROOT, `${timestamp}__${cleanSegment(manifestInput.row_key)}__category_manifest.json`);
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.info("qbo-unallocated category sidecar written", { row_key: manifestInput.row_key, category: manifestInput.category, sidecar_path: CATEGORY_SIDECAR, manifest_path: manifestPath, sidecar_sha256: sidecarSha256 });
  return { sidecarSha256, manifestPath };
}

async function writeCategoryApprovalSidecar(sidecar: CategoryApprovalSidecar, manifestInput: CategoryApproval & { row_key: string; category_sidecar_sha256: string }) {
  await mkdir(UPLOAD_ROOT, { recursive: true });
  await mkdir(CATEGORY_APPROVAL_MANIFEST_ROOT, { recursive: true });
  const serialized = JSON.stringify(sidecar, null, 2);
  await writeFile(CATEGORY_APPROVAL_SIDECAR, serialized);
  const approvalSidecarSha256 = createHash("sha256").update(serialized).digest("hex");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const manifest = {
    category_approved_at_utc: manifestInput.approved_at_utc,
    row_key: manifestInput.row_key,
    approved_category: manifestInput.approved_category,
    approved_by: manifestInput.approved_by,
    approval_basis: manifestInput.approval_basis,
    source_category_field: manifestInput.source_category_field,
    doc_number: manifestInput.doc_number,
    invoice_id: manifestInput.invoice_id,
    source_row_number: manifestInput.source_row_number,
    approval_sidecar_path: CATEGORY_APPROVAL_SIDECAR,
    approval_sidecar_sha256: approvalSidecarSha256,
    category_sidecar_path: manifestInput.category_sidecar_path,
    category_sidecar_sha256: manifestInput.category_sidecar_sha256,
    source_csv: UNALLOCATED_CSV,
    source_csv_sha256: manifestInput.source_csv_sha256,
    purpose: "derived accepted category annotation; no source evidence modified; no invoice documentation upload required",
    controlling_salesperson_field: "QBO CustomField DefinitionId=2 / qbo_customfield_definitionid_2_raw_value",
  };
  const manifestSerialized = JSON.stringify(manifest, null, 2);
  const manifestSha256 = createHash("sha256").update(manifestSerialized).digest("hex");
  const manifestPath = path.join(CATEGORY_APPROVAL_MANIFEST_ROOT, `${timestamp}__${cleanSegment(manifestInput.row_key)}__category_approval_manifest.json`);
  await writeFile(manifestPath, manifestSerialized);
  console.info("qbo-unallocated category approval sidecar written", { row_key: manifestInput.row_key, approved_category: manifestInput.approved_category, approval_sidecar_path: CATEGORY_APPROVAL_SIDECAR, manifest_path: manifestPath, approval_sidecar_sha256: approvalSidecarSha256, manifest_sha256: manifestSha256 });
  return { approvalSidecarSha256, manifestPath, manifestSha256 };
}

async function readSalesTrackingIndex(): Promise<SalesTrackingIndex> {
  try {
    const text = await readFile(SALES_TRACKING_INDEX, "utf8");
    return JSON.parse(text) as SalesTrackingIndex;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return { by_invoice: {} };
    throw error;
  }
}

async function readDerivedMatchingOutput(): Promise<{ byRowKey: Record<string, DerivedMatchRow>; summary: DerivedMatchesSummary }> {
  const byRowKey: Record<string, DerivedMatchRow> = {};
  let summary: DerivedMatchesSummary = {};
  try {
    const text = await readFile(DERIVED_MATCHES_JSON, "utf8");
    const parsed = JSON.parse(text) as DerivedMatchesPayload;
    for (const row of parsed.rows || []) {
      if (row.row_key) byRowKey[row.row_key] = row;
    }
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  try {
    const text = await readFile(DERIVED_MATCHES_SUMMARY, "utf8");
    summary = JSON.parse(text) as DerivedMatchesSummary;
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  return { byRowKey, summary };
}

async function readDecoOwnerMatchesSummary(): Promise<DecoOwnerMatchesSummary> {
  try {
    const text = await readFile(DECO_OWNER_MATCHES_SUMMARY_JSON, "utf8");
    return JSON.parse(text) as DecoOwnerMatchesSummary;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return {};
    throw error;
  }
}

async function readLucasPdfMatchesSummary(): Promise<LucasPdfMatchesSummary> {
  try {
    const text = await readFile(LUCAS_PDF_MATCHES_SUMMARY_JSON, "utf8");
    const parsed = JSON.parse(text) as LucasPdfMatchesSummary;
    parsed.outputs = {
      ...(parsed.outputs ?? {}),
      summary_json_sha256: createHash("sha256").update(text).digest("hex"),
    };
    return parsed;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return {};
    throw error;
  }
}

async function readJoePdfCombinedSummary(): Promise<JoePdfCombinedSummary> {
  try {
    const text = await readFile(JOE_PDF_COMBINED_SUMMARY_JSON, "utf8");
    const parsed = JSON.parse(text) as JoePdfCombinedSummary;
    parsed.summary_json_sha256 = createHash("sha256").update(text).digest("hex");
    return parsed;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return {};
    throw error;
  }
}

async function readAllPdfIndexSummary(): Promise<AllPdfIndexSummary> {
  try {
    const text = await readFile(ALL_PDF_INDEX_SUMMARY_JSON, "utf8");
    return JSON.parse(text) as AllPdfIndexSummary;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return {};
    throw error;
  }
}

async function readCompletionSummary(): Promise<Record<string, unknown>> {
  try {
    const text = await readFile(COMPLETION_SUMMARY_JSON, "utf8");
    return JSON.parse(text) as Record<string, unknown>;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return {};
    throw error;
  }
}

function truthyFlag(value: string): boolean {
  return ["1", "true", "yes", "y"].includes(String(value || "").trim().toLowerCase());
}

function decoOwnerSuggestion(record: Record<string, string>): DerivedSuggestion | null {
  if (!truthyFlag(record.deco_owner_match_flag || "") || !String(record.deco_owner || "").trim()) return null;
  const source = [
    record.deco_source_workbook ? `deco_source_workbook=${record.deco_source_workbook}` : "",
    record.deco_source_sheet ? `sheet=${record.deco_source_sheet}` : "",
    record.deco_excel_row_number ? `excel_row=${record.deco_excel_row_number}` : "",
    record.deco_invoice_number ? `deco_invoice_number=${record.deco_invoice_number}` : "",
  ].filter(Boolean).join("; ");
  return {
    suggested_category: "",
    suggested_salesperson_customer: record.deco_owner,
    suggestion_basis: record.deco_owner_match_basis || record.deco_owner_match_method || "Deco owner match",
    suggestion_source: source || "Deco owner match output",
    sales_tracking_hits_count: "0",
    sales_tracking_first_hit: "",
  };
}

function lucasPdfSuggestion(record: Record<string, string>): DerivedSuggestion | null {
  if (!truthyFlag(record.lucas_pdf_extract_match_flag || "") || !String(record.lucas_pdf_extract_detected_salesperson_name || "").trim()) return null;
  const source = [
    record.lucas_pdf_extract_source_paths ? `lucas_pdf_extract_source_paths=${record.lucas_pdf_extract_source_paths}` : "",
    record.lucas_pdf_extract_file_names ? `filenames=${record.lucas_pdf_extract_file_names}` : "",
    record.lucas_pdf_extract_match_count ? `match_count=${record.lucas_pdf_extract_match_count}` : "",
  ].filter(Boolean).join("; ");
  return {
    suggested_category: "",
    suggested_salesperson_customer: record.lucas_pdf_extract_detected_salesperson_name,
    suggestion_basis: record.lucas_pdf_extract_detected_salesperson_basis || record.lucas_pdf_extract_match_methods || "Lucas PDF extract exact invoice-number match",
    suggestion_source: source || "Lucas PDF extract match output",
    sales_tracking_hits_count: "0",
    sales_tracking_first_hit: "",
  };
}

function joePdfSuggestion(record: Record<string, string>): DerivedSuggestion | null {
  const pass1 = truthyFlag(record.joe_pdf_extract_match_flag || "");
  const pass2 = truthyFlag(record.joe_pdf_extract_pass2_strict_match_flag || "");
  if (!pass1 && !pass2) return null;
  const detectedName = String(record.joe_pdf_extract_detected_salesperson_name || "").trim();
  const source = [
    record.joe_pdf_extract_source_paths ? `joe_pdf_extract_source_paths=${record.joe_pdf_extract_source_paths}` : "",
    record.joe_pdf_extract_file_names ? `filenames=${record.joe_pdf_extract_file_names}` : "",
    record.joe_pdf_extract_match_count ? `match_count=${record.joe_pdf_extract_match_count}` : "",
    record.joe_pdf_extract_pass2_strict_source_paths ? `joe_pdf_extract_pass2_strict_source_paths=${record.joe_pdf_extract_pass2_strict_source_paths}` : "",
    record.joe_pdf_extract_pass2_strict_file_names ? `pass2_filenames=${record.joe_pdf_extract_pass2_strict_file_names}` : "",
    record.joe_pdf_extract_pass2_strict_match_count ? `pass2_match_count=${record.joe_pdf_extract_pass2_strict_match_count}` : "",
  ].filter(Boolean).join("; ");
  return {
    suggested_category: "",
    suggested_salesperson_customer: detectedName,
    suggestion_basis: record.joe_pdf_extract_detected_salesperson_basis || record.joe_pdf_extract_match_methods || record.joe_pdf_extract_pass2_strict_match_methods || "Joe PDF extract combined invoice-number match",
    suggestion_source: source || "Joe PDF extract combined match output",
    sales_tracking_hits_count: "0",
    sales_tracking_first_hit: "",
  };
}

function allPdfIndexSuggestion(record: Record<string, string>): DerivedSuggestion | null {
  if (!truthyFlag(record.all_pdf_index_match_flag || "")) return null;
  const source = [
    record.all_pdf_index_source_paths ? `source_paths=${record.all_pdf_index_source_paths}` : "",
    record.all_pdf_index_file_names ? `filenames=${record.all_pdf_index_file_names}` : "",
    record.all_pdf_index_match_count ? `match_count=${record.all_pdf_index_match_count}` : "",
    record.all_pdf_index_match_methods ? `methods=${record.all_pdf_index_match_methods}` : "",
  ].filter(Boolean).join("; ");
  return {
    suggested_category: "",
    suggested_salesperson_customer: "",
    suggestion_basis: "All PDF index token-bounded filename match (13 MBOX accounts, 57,373 PDFs)",
    suggestion_source: source || "All PDF index match output",
    sales_tracking_hits_count: "0",
    sales_tracking_first_hit: "",
  };
}

function isUnallocated(record: Record<string, string>): boolean {
  if (String(record.post_recovery_status ?? "").trim()) return true;
  return (
    !String(record.normalized_salesperson ?? "").trim() ||
    String(record.salesperson_category ?? "") === "blank/no salesperson code in DefinitionId=2"
  );
}

function normalizeRow(record: Record<string, string>): Record<string, string> {
  return {
    ...record,
    doc_number: record.qbo_doc_number || record.doc_number || "",
    invoice_id: record.qbo_invoice_id || record.invoice_id || "",
    source_row_number: record.qbo_invoice_csv_row_number || record.source_row_number || "",
    txn_date: record.qbo_txn_date || record.txn_date || "",
    customer_ref_name: record.qbo_customer_ref_name || record.customer_ref_name || "",
    total_amt: record.qbo_total_amt || record.total_amt || "",
    qbo_salesperson_initials:
      record.salesperson_initials_parsed ||
      record.qbo_customfield_definitionid_2_raw_value ||
      record.qbo_definitionid_2_raw ||
      record.qbo_salesperson_initials ||
      "",
    recovery_status: record.post_recovery_status || record.recovery_status || record.salesperson_category || record.salesperson_parse_status || record.qbo_parse_status || "unallocated",
    invoice_locker_date_token_from_filename: record.invoice_locker_date_token_from_filename || record.invoice_locker_second_pass_filename_dates || "",
    invoice_locker_customer_token_from_filename: record.invoice_locker_customer_token_from_filename || record.invoice_locker_second_pass_filename_customer_tokens || "",
    invoice_locker_status_token_from_filename: record.invoice_locker_status_token_from_filename || record.invoice_locker_match_status || record.invoice_locker_second_pass_match_status || "",
    match_basis_text: record.match_basis_text || record.invoice_locker_match_methods || record.invoice_locker_second_pass_match_methods || "",
  };
}

function normalizeName(value: string): string {
  return String(value || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function rowNames(record: Record<string, string>): string[] {
  return [
    record.customer_ref_name,
    record.qbo_customer_display_name,
    record.qbo_customer_company_name,
    record.printavo_order_customer_full_name,
    record.printavo_order_customer_company,
    record.deconetwork_billing_company,
  ].map((value) => normalizeName(value || "")).filter(Boolean);
}

function hasNameMatch(names: string[], mappingName: string): boolean {
  const needle = normalizeName(mappingName);
  return names.some((name) => name === needle || name.includes(needle));
}

function deriveJosephSuggestion(record: Record<string, string>, salesTrackingIndex: SalesTrackingIndex): DerivedSuggestion {
  const names = rowNames(record);
  const suggestions: DerivedSuggestion = {
    suggested_category: "",
    suggested_salesperson_customer: "",
    suggestion_basis: "",
    suggestion_source: "",
    sales_tracking_hits_count: "0",
    sales_tracking_first_hit: "",
  };

  const docNumber = String(record.doc_number || record.qbo_doc_number || "").trim();
  const salesHits = docNumber ? (salesTrackingIndex.by_invoice?.[docNumber] || []) : [];
  if (salesHits.length > 0) {
    const first = salesHits[0];
    suggestions.sales_tracking_hits_count = String(salesHits.length);
    suggestions.sales_tracking_first_hit = [
      first.salesperson_raw ? `sales tracking salesperson=${first.salesperson_raw}` : "",
      first.customer_name ? `customer=${first.customer_name}` : "",
      first.amount ? `amount=${first.amount}` : "",
      first.source_path ? `source=${first.source_path}` : "",
      first.sheet ? `sheet=${first.sheet}` : "",
      first.excel_row_number ? `row=${first.excel_row_number}` : "",
    ].filter(Boolean).join("; ");
    if (first.salesperson_raw && !suggestions.suggested_salesperson_customer) {
      suggestions.suggested_salesperson_customer = first.salesperson_raw;
    }
    suggestions.suggestion_basis = `sales tracking XLSX invoice/order match for doc ${docNumber}`;
    suggestions.suggestion_source = "Joseph-identified sales tracking XLSX files; derived source-referenced hint only; QBO CustomField DefinitionId=2 remains controlling";
  }

  for (const [tenantName, mapping] of Object.entries(JOSEPH_TENANT_MAPPINGS)) {
    if (hasNameMatch(names, tenantName)) {
      const total = Number(record.total_amt || 0);
      const expected = Number(mapping.amount);
      const amountMatches = Number.isFinite(total) && Math.abs(total - expected) < 0.005;
      suggestions.suggested_category = mapping.category;
      suggestions.suggestion_basis = `${tenantName} tenant mapping at $${mapping.amount}/mo${amountMatches ? "; invoice total matches" : "; invoice total differs or is unavailable"}`;
      suggestions.suggestion_source = JOSEPH_MAPPING_SOURCE;
      break;
    }
  }

  for (const [customerName, salesperson] of Object.entries(JOSEPH_CUSTOMER_MAPPINGS)) {
    if (hasNameMatch(names, customerName)) {
      suggestions.suggested_salesperson_customer = salesperson;
      const customerBasis = `${customerName} customer allocation hint = ${salesperson}`;
      suggestions.suggestion_basis = suggestions.suggestion_basis ? `${suggestions.suggestion_basis}; ${customerBasis}` : customerBasis;
      suggestions.suggestion_source = JOSEPH_MAPPING_SOURCE;
      break;
    }
  }

  return suggestions;
}

interface RowFilters {
  q: string;
  customer: string;
  category: string;
  salesperson: string;
  status: string;
  salesTrackingHit: string;
  hasSuggestion: string;
}

function includesField(record: Record<string, string>, fields: string[], needle: string): boolean {
  if (!needle) return true;
  const normalizedNeedle = needle.toLowerCase();
  return fields.some((field) => String(record[field] ?? "").toLowerCase().includes(normalizedNeedle));
}

function rowMatchesFilters(record: Record<string, string>, filters: RowFilters): boolean {
  const needle = filters.q.trim().toLowerCase();
  if (needle && ![
    "doc_number",
    "invoice_id",
    "txn_date",
    "customer_ref_name",
    "qbo_customer_display_name",
    "qbo_customer_company_name",
    "total_amt",
    "qbo_salesperson_initials",
    "recovery_status",
    "printavo_order_invoice_number",
    "printavo_order_customer_full_name",
    "printavo_order_customer_company",
    "printavo_order_owner",
    "deconetwork_order_number",
    "deconetwork_billing_company",
    "deconetwork_sales_staff_account",
    "user_category",
    "suggested_category",
    "suggested_salesperson_customer",
    "suggestion_basis",
    "suggestion_source",
    "sales_tracking_first_hit",
    "sales_tracking_hit_notes",
    "deco_owner",
    "deco_owner_initials",
    "deco_owner_match_flag",
    "deco_owner_match_method",
    "deco_owner_match_status",
    "deco_owner_match_basis",
    "deco_excel_row_number",
    "lucas_pdf_extract_match_flag",
    "lucas_pdf_extract_match_status",
    "lucas_pdf_extract_match_methods",
    "lucas_pdf_extract_detected_salesperson_name",
    "lucas_pdf_extract_source_paths",
    "lucas_pdf_extract_file_names",
    "joe_pdf_extract_match_flag",
    "joe_pdf_extract_match_status",
    "joe_pdf_extract_match_methods",
    "joe_pdf_extract_detected_salesperson_name",
    "joe_pdf_extract_source_paths",
    "joe_pdf_extract_file_names",
    "joe_pdf_extract_pass2_strict_match_flag",
    "joe_pdf_extract_pass2_strict_match_status",
    "joe_pdf_extract_pass2_strict_match_methods",
    "joe_pdf_extract_pass2_strict_source_paths",
    "joe_pdf_extract_pass2_strict_file_names",
    "invoice_locker_match_flag",
    "invoice_locker_match_status",
    "invoice_locker_match_count",
    "invoice_locker_source_paths",
    "invoice_locker_file_names",
    "invoice_locker_file_sha256s",
    "invoice_locker_match_methods",
    "invoice_locker_candidate_invoice_numbers",
    "invoice_locker_date_token_from_filename",
    "invoice_locker_customer_token_from_filename",
    "invoice_locker_status_token_from_filename",
    "invoice_locker_second_pass_match_flag",
    "invoice_locker_second_pass_match_status",
    "invoice_locker_second_pass_file_names",
    "invoice_locker_second_pass_source_paths",
    "match_basis_text",
  ].some((field) => String(record[field] ?? "").toLowerCase().includes(needle))) {
    return false;
  }

  if (!includesField(record, ["customer_ref_name", "qbo_customer_display_name", "qbo_customer_company_name", "printavo_order_customer_full_name", "printavo_order_customer_company", "deconetwork_billing_company"], filters.customer.trim())) return false;
  if (!includesField(record, ["user_category", "suggested_category"], filters.category.trim())) return false;
  if (!includesField(record, ["suggested_salesperson_customer", "suggested_salesperson_raw", "qbo_salesperson_initials", "printavo_order_owner", "deconetwork_sales_staff_account", "deco_owner", "deco_owner_initials", "deco_owner_match_status", "lucas_pdf_extract_detected_salesperson_name", "lucas_pdf_extract_match_flag", "joe_pdf_extract_detected_salesperson_name", "joe_pdf_extract_match_flag", "joe_pdf_extract_pass2_strict_match_flag", "invoice_locker_match_flag", "invoice_locker_match_status", "invoice_locker_file_names", "invoice_locker_customer_token_from_filename", "invoice_locker_second_pass_match_status", "sales_tracking_salesperson_raw_values", "sales_tracking_salesperson_suggestions"], filters.salesperson.trim())) return false;
  if (!includesField(record, ["recovery_status", "post_recovery_status", "salesperson_category", "salesperson_parse_status", "qbo_parse_status", "invoice_locker_match_status", "invoice_locker_status_token_from_filename", "invoice_locker_second_pass_match_status", "joe_pdf_extract_match_status", "joe_pdf_extract_pass2_strict_match_status"], filters.status.trim())) return false;

  if (filters.salesTrackingHit === "yes" && !truthyFlag(record.sales_tracking_hit_flag) && String(record.sales_tracking_hits_count || "0") === "0") return false;
  if (filters.salesTrackingHit === "no" && (truthyFlag(record.sales_tracking_hit_flag) || String(record.sales_tracking_hits_count || "0") !== "0")) return false;

  const hasDerivedSuggestion = Boolean(
    record.suggested_category ||
    record.suggested_salesperson_customer ||
    truthyFlag(record.sales_tracking_hit_flag) ||
    String(record.sales_tracking_hits_count || "0") !== "0" ||
    truthyFlag(record.customer_sales_suggestion_flag) ||
    truthyFlag(record.deco_owner_match_flag) ||
    Boolean(record.deco_owner) ||
    truthyFlag(record.lucas_pdf_extract_match_flag) ||
    Boolean(record.lucas_pdf_extract_detected_salesperson_name) ||
    truthyFlag(record.joe_pdf_extract_match_flag) ||
    truthyFlag(record.joe_pdf_extract_pass2_strict_match_flag) ||
    Boolean(record.joe_pdf_extract_detected_salesperson_name) ||
    truthyFlag(record.invoice_locker_match_flag) ||
    truthyFlag(record.invoice_locker_second_pass_match_flag) ||
    Boolean(record.invoice_locker_file_names) ||
    Boolean(record.invoice_locker_second_pass_file_names)
  );
  if (filters.hasSuggestion === "yes" && !hasDerivedSuggestion) return false;
  if (filters.hasSuggestion === "no" && hasDerivedSuggestion) return false;

  return true;
}

async function loadRows(limit: number, offset: number, filters: RowFilters, view: QboUnallocatedView = "current") {
  const { sourceCsv, text, sourceCsvSha256 } = await readCurrentUnallocatedCsv(view);
  const categorySidecar = await readCategorySidecar();
  const categoryApprovalSidecar = await readCategoryApprovalSidecar();
  const salesTrackingIndex = await readSalesTrackingIndex();
  const derivedMatches = await readDerivedMatchingOutput();
  const decoOwnerMatchesSummary = await readDecoOwnerMatchesSummary();
  const lucasPdfMatchesSummary = await readLucasPdfMatchesSummary();
  const joePdfCombinedSummary = await readJoePdfCombinedSummary();
  const allPdfIndexSummary = await readAllPdfIndexSummary();
  const completionSummary = await readCompletionSummary();
  const parsed = parseCsv(text);
  const headers = parsed[0] || [];
  const allRecords = parsed.slice(1).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])) as Record<string, string>
  );
  const isStillUnallocated = (record: Record<string, string>) =>
    String(record.post_recovery_status ?? "").trim() === "still_unallocated";
  const sourceRecords = view === "remaining" ? allRecords.filter(isStillUnallocated) : allRecords;
  const records = sourceRecords.map((record) => {
    const normalized = normalizeRow(record);
    const rowKey = rowKeyFromIdentifiers(normalized.doc_number, normalized.invoice_id, normalized.source_row_number);
    const derivedMatch = derivedMatches.byRowKey[rowKey];
    const approval = categoryApprovalSidecar.approvals[rowKey];
    const suggestions = deriveJosephSuggestion(normalized, salesTrackingIndex);
    const decoSuggestion = decoOwnerSuggestion(normalized);
    const lucasSuggestion = lucasPdfSuggestion(normalized);
    const joeSuggestion = joePdfSuggestion(normalized);
    const allPdfSuggestion = allPdfIndexSuggestion(normalized);
    const finalSalesperson = normalized.final_salesperson_name && normalized.final_salesperson_name !== "Unallocated" ? normalized.final_salesperson_name : "";
    const recoveredSalesperson = normalized.recovered_salesperson_name || finalSalesperson || "";
    const recoveredBasis = [normalized.recovery_basis, normalized.recovery_method]
      .filter(Boolean)
      .join("; ");
    const recoveredSource = [
      normalized.evidence_locker_source ? `evidence_locker_source=${normalized.evidence_locker_source}` : "",
      normalized.evidence_zip_source ? `evidence_zip_source=${normalized.evidence_zip_source}` : "",
      normalized.evidence_mbox_source ? `evidence_mbox_source=${normalized.evidence_mbox_source}` : "",
      normalized.recovery_source_hit_csv ? `recovery_source_hit_csv=${normalized.recovery_source_hit_csv}` : "",
      normalized.recovery_source_metadata_db ? `recovery_source_metadata_db=${normalized.recovery_source_metadata_db}` : "",
    ].filter(Boolean).join("; ");
    return {
      ...normalized,
      ...suggestions,
      ...derivedMatch,
      suggested_salesperson_customer: decoSuggestion?.suggested_salesperson_customer || lucasSuggestion?.suggested_salesperson_customer || joeSuggestion?.suggested_salesperson_customer || allPdfSuggestion?.suggested_salesperson_customer || derivedMatch?.suggested_salesperson || recoveredSalesperson || suggestions.suggested_salesperson_customer,
      suggestion_basis: decoSuggestion?.suggestion_basis || lucasSuggestion?.suggestion_basis || joeSuggestion?.suggestion_basis || allPdfSuggestion?.suggestion_basis || derivedMatch?.suggestion_basis || recoveredBasis || suggestions.suggestion_basis,
      suggestion_source: decoSuggestion?.suggestion_source || lucasSuggestion?.suggestion_source || joeSuggestion?.suggestion_source || allPdfSuggestion?.suggestion_source || derivedMatch?.suggestion_source || recoveredSource || suggestions.suggestion_source,
      row_key: rowKey,
      user_category: categorySidecar.categories[rowKey]?.category ?? "",
      user_category_approved: approval ? "yes" : "",
      approved_category: approval?.approved_category ?? "",
      approved_at_utc: approval?.approved_at_utc ?? "",
      approved_by: approval?.approved_by ?? "",
      category_approved_at_utc: approval?.approved_at_utc ?? "",
      category_approved_by: approval?.approved_by ?? "",
    } as Record<string, string>;
  });
  const filtered = records.filter((record) => rowMatchesFilters(record, filters));
  const filteredTotalAmt = filtered.reduce((sum, record) => {
    const amount = Number(record.total_amt || record.qbo_total_amt || 0);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);

  return {
    success: true,
    view,
    availableViews: ["remaining", "current"],
    remainingHuntCsv: ALL_PDF_INDEX_HUNT_CSV,
    sourceCsv,
    sourceCsvSha256,
    uploadRoot: UPLOAD_ROOT,
    categorySidecar: CATEGORY_SIDECAR,
    categoryApprovalSidecar: CATEGORY_APPROVAL_SIDECAR,
    categoryOptions: CATEGORY_OPTIONS,
    salesTrackingIndex: SALES_TRACKING_INDEX,
    salesTrackingIndexTotalUniqueInvoiceKeys: salesTrackingIndex.total_unique_invoice_keys ?? 0,
    salesTrackingIndexTotalHits: salesTrackingIndex.total_indexed_hits ?? 0,
    derivedMatchesCsv: DERIVED_MATCHES_CSV,
    derivedMatchesJson: DERIVED_MATCHES_JSON,
    derivedMatchesSummary: DERIVED_MATCHES_SUMMARY,
    derivedMatchesOutputCsvSha256: derivedMatches.summary.output_csv_sha256 ?? "",
    derivedMatchesOutputJsonSha256: derivedMatches.summary.output_json_sha256 ?? "",
    derivedMatchesRowsProcessed: derivedMatches.summary.unallocated_rows_processed ?? 0,
    derivedMatchCounts: derivedMatches.summary.counts ?? {},
    decoOwnerMatchesCsv: DECO_OWNER_MATCHES_CSV,
    decoOwnerMatchesSummaryJson: DECO_OWNER_MATCHES_SUMMARY_JSON,
    decoRemainingHuntCsv: DECO_REMAINING_HUNT_CSV,
    decoRemainingHuntXlsx: DECO_REMAINING_HUNT_XLSX,
    decoWorkbook: decoOwnerMatchesSummary.deco_workbook ?? "",
    decoWorkbookSha256: decoOwnerMatchesSummary.deco_workbook_sha256 ?? "",
    decoSheet: decoOwnerMatchesSummary.deco_sheet ?? "",
    decoMatchRule: decoOwnerMatchesSummary.match_rule ?? "",
    decoMatchedRows: decoOwnerMatchesSummary.matched_rows ?? 0,
    decoUnmatchedRows: decoOwnerMatchesSummary.unmatched_rows ?? 0,
    decoMatchedGrossTotal: decoOwnerMatchesSummary.matched_gross_total ?? "",
    decoRemainingGrossTotal: decoOwnerMatchesSummary.remaining_gross_total ?? "",
    decoMatchedByOwner: decoOwnerMatchesSummary.matched_by_owner ?? {},
    decoOwnerMatchesCsvSha256: decoOwnerMatchesSummary.outputs?.matched_csv_sha256 ?? "",
    decoCurrentWithOwnerMatchesCsvSha256: decoOwnerMatchesSummary.outputs?.current_with_deco_csv_sha256 ?? "",
    decoRemainingHuntCsvSha256: decoOwnerMatchesSummary.outputs?.remaining_hunt_csv_sha256 ?? "",
    decoRemainingHuntXlsxSha256: decoOwnerMatchesSummary.outputs?.remaining_hunt_xlsx_sha256 ?? "",
    lucasPdfMatchesCsv: LUCAS_PDF_MATCHES_CSV,
    lucasPdfMatchesSummaryJson: LUCAS_PDF_MATCHES_SUMMARY_JSON,
    lucasRemainingHuntCsv: LUCAS_REMAINING_HUNT_CSV,
    lucasRemainingHuntXlsx: LUCAS_REMAINING_HUNT_XLSX,
    lucasPdfSourceFolder: lucasPdfMatchesSummary.lucas_pdf_source_folder ?? lucasPdfMatchesSummary.source_folder ?? "",
    lucasPdfSourceFileCount: lucasPdfMatchesSummary.lucas_pdf_source_file_count ?? lucasPdfMatchesSummary.file_stats?.count ?? 0,
    lucasPdfTextSidecarCount: lucasPdfMatchesSummary.lucas_pdf_text_sidecar_count ?? 0,
    lucasPdfMatchRule: lucasPdfMatchesSummary.match_rule ?? lucasPdfMatchesSummary.search_method_used ?? "",
    lucasPdfMatchMethods: lucasPdfMatchesSummary.match_methods ?? lucasPdfMatchesSummary.match_method_counts ?? {},
    lucasPdfMatchedRows: lucasPdfMatchesSummary.matched_rows ?? 0,
    lucasPdfRemainingRows: Number(completionSummary.still_unmatched_rows ?? lucasPdfMatchesSummary.remaining_rows ?? lucasPdfMatchesSummary.still_unmatched_rows ?? 0),
    lucasPdfMatchedGrossTotal: lucasPdfMatchesSummary.matched_gross_total ?? lucasPdfMatchesSummary.matched_gross_total_amt ?? "",
    lucasPdfRemainingGrossTotal: completionSummary.remaining_gross_total_amt ?? lucasPdfMatchesSummary.remaining_gross_total ?? lucasPdfMatchesSummary.remaining_gross_total_amt ?? "",
    lucasPdfMatchedByOwner: lucasPdfMatchesSummary.matched_by_owner ?? lucasPdfMatchesSummary.matched_by_detected_salesperson ?? {},
    lucasPdfMatchesCsvSha256: lucasPdfMatchesSummary.outputs?.matches_csv_sha256 ?? "",
    lucasPdfCurrentWithMatchesCsvSha256: lucasPdfMatchesSummary.outputs?.current_with_lucas_pdf_extract_matches_csv_sha256 ?? "",
    lucasPdfRemainingHuntCsvSha256: lucasPdfMatchesSummary.outputs?.remaining_after_lucas_pdf_extract_matches_csv_sha256 ?? "",
    lucasPdfRemainingHuntXlsxSha256: lucasPdfMatchesSummary.outputs?.remaining_after_lucas_pdf_extract_matches_xlsx_sha256 ?? "",
    lucasPdfSummaryJsonSha256: lucasPdfMatchesSummary.outputs?.summary_json_sha256 ?? "",
    joePdfCombinedAcceptedMatchesCsv: JOE_PDF_COMBINED_ACCEPTED_MATCHES_CSV,
    joePdfCombinedCurrentCsv: PRIMARY_UNALLOCATED_CSV,
    joePdfCombinedRemainingCsv: REMAINING_UNALLOCATED_CSV,
    joePdfCombinedSummaryJson: JOE_PDF_COMBINED_SUMMARY_JSON,
    joePdfSourceFolder: joePdfCombinedSummary.source_folder ?? joePdfCombinedSummary.source_evidence_folder ?? "",
    joePdfInputOriginalRemainingRows: joePdfCombinedSummary.input_original_remaining_rows ?? joePdfCombinedSummary.input_remaining_rows ?? 0,
    joePdfAcceptedSearchMethods: joePdfCombinedSummary.accepted_search_methods ?? Object.keys(joePdfCombinedSummary.match_method_counts ?? {}),
    joePdfAcceptedMatchedRows: joePdfCombinedSummary.accepted_matched_rows ?? joePdfCombinedSummary.matched_remaining_rows ?? 0,
    joePdfAcceptedMatchedDistinctDocNumbers: joePdfCombinedSummary.accepted_matched_distinct_doc_numbers ?? joePdfCombinedSummary.matched_unique_doc_numbers ?? 0,
    joePdfAcceptedMatchedDocNumbers: joePdfCombinedSummary.accepted_matched_doc_numbers ?? [],
    joePdfStillUnmatchedRows: Number(completionSummary.unmatched_remaining_rows ?? joePdfCombinedSummary.still_unmatched_rows ?? joePdfCombinedSummary.unmatched_remaining_rows ?? 0),
    joePdfAcceptedMatchedGrossTotal: joePdfCombinedSummary.accepted_matched_gross_total_amt ?? joePdfCombinedSummary.matched_remaining_total_amt ?? "",
    joePdfRemainingGrossTotal: completionSummary.unmatched_remaining_total_amt ?? joePdfCombinedSummary.remaining_gross_total_amt ?? joePdfCombinedSummary.unmatched_remaining_total_amt ?? "",
    joePdfCombinedAcceptedMatchesCsvSha256: joePdfCombinedSummary.output_sha256s?.[JOE_PDF_COMBINED_ACCEPTED_MATCHES_CSV] ?? "",
    joePdfCombinedCurrentCsvSha256: joePdfCombinedSummary.output_sha256s?.[PRIMARY_UNALLOCATED_CSV] ?? "",
    joePdfCombinedRemainingCsvSha256: joePdfCombinedSummary.output_sha256s?.[REMAINING_UNALLOCATED_CSV] ?? "",
    joePdfCombinedSummaryJsonSha256: joePdfCombinedSummary.summary_json_sha256 ?? joePdfCombinedSummary.output_sha256s?.[JOE_PDF_COMBINED_SUMMARY_JSON] ?? "",
    allPdfIndexMatchesCsv: ALL_PDF_INDEX_MATCHES_CSV,
    allPdfIndexEnrichedCsv: ALL_PDF_INDEX_ENRICHED_CSV,
    allPdfIndexHuntCsv: ALL_PDF_INDEX_HUNT_CSV,
    allPdfIndexSummaryJson: ALL_PDF_INDEX_SUMMARY_JSON,
    allPdfIndexPass: completionSummary.status ?? allPdfIndexSummary.pass ?? "",
    allPdfIndexSourcesSearched: Array.isArray(allPdfIndexSummary.sources_searched) ? allPdfIndexSummary.sources_searched : [],
    allPdfIndexTotalRowsInRemaining: Number(completionSummary.total_rows ?? allPdfIndexSummary.total_rows_in_remaining ?? 0),
    allPdfIndexMatchedDocNumbers: allPdfIndexSummary.matched_doc_numbers ?? 0,
    allPdfIndexMatchedInUnallocated: allPdfIndexSummary.matched_in_unallocated ?? 0,
    allPdfIndexMatchedGross: allPdfIndexSummary.matched_gross ?? 0,
    allPdfIndexHuntRemaining: allRecords.filter((r) => (r.post_recovery_status ?? "").trim() === "still_unallocated").length,
    allPdfIndexHuntRemainingGross: allRecords
      .filter((r) => (r.post_recovery_status ?? "").trim() === "still_unallocated")
      .reduce((sum, r) => { const amt = Number(r.total_amt || 0); return Number.isFinite(amt) ? sum + amt : sum; }, 0),
    allPdfIndexApprovedCount: Number(completionSummary.hunt_target_count ?? 0) - Number(completionSummary.hunt_remaining ?? 0),
    allPdfIndexApprovedGross: Number(completionSummary.hunt_target_gross ?? 0) - Number(completionSummary.hunt_remaining_gross ?? 0),
    completionStatus: completionSummary.status ?? "",
    completionNote: completionSummary.completion_note ?? "",
    completionSummaryHtml: completionSummary.status === "complete"
      ? `STATUS: COMPLETE. ${completionSummary.completion_note || "All real-dollar unallocated orders have been identified and assigned to salespeople."} ${Number(completionSummary.hunt_remaining ?? 0)} rows remain at $${Number(completionSummary.hunt_remaining_gross ?? 0).toFixed(2)} total. ${Number(completionSummary.hunt_target_count ?? 0)} hunt targets identified ($${Number(completionSummary.hunt_target_gross ?? 0).toFixed(2)} total). Pipeline stages below are historical archive counts from before Joseph's final manual identifications — not live remaining counts.`
      : (completionSummary.completion_note ?? "Pipeline still in progress."),

    // Per-stage metadata with completion overrides
    lucasPdfStageComplete: completionSummary.status === "complete",
    joePdfStageComplete: completionSummary.status === "complete",
    decoStageComplete: completionSummary.status === "complete",
    allPdfStageComplete: completionSummary.status === "complete",
    pipelineComplete: completionSummary.status === "complete",
    finalRemainingRows: Number(completionSummary.hunt_remaining ?? completionSummary.still_unmatched_rows ?? 0),
    finalRemainingGross: Number(completionSummary.hunt_remaining_gross ?? completionSummary.remaining_gross_total_amt ?? 0),
    final177HuntSummaryJson: FINAL_177_HUNT_SUMMARY_JSON,
    final177HuntRemaining: Number(completionSummary.hunt_remaining ?? 0),
    final177HuntRemainingGross: Number(completionSummary.hunt_remaining_gross ?? 0),
    final177HuntTargetCount: Number(completionSummary.hunt_target_count ?? 0),
    final177HuntTargetGross: Number(completionSummary.hunt_target_gross ?? 0),
    totalSourceRows: allRecords.length,
    total: records.length,
    filtered: filtered.length,
    filteredTotalAmt,
    limit,
    offset,
    rows: filtered.slice(offset, offset + limit),
    fields: [...headers, "doc_number", "invoice_id", "source_row_number", "txn_date", "customer_ref_name", "total_amt", "qbo_salesperson_initials", "recovery_status", "deco_owner", "deco_owner_initials", "deco_owner_match_flag", "deco_owner_match_method", "deco_owner_match_status", "deco_owner_match_basis", "deco_excel_row_number", "lucas_pdf_extract_match_flag", "lucas_pdf_extract_match_status", "lucas_pdf_extract_match_count", "lucas_pdf_extract_source_paths", "lucas_pdf_extract_file_names", "lucas_pdf_extract_file_sha256s", "lucas_pdf_extract_match_methods", "lucas_pdf_extract_contexts", "lucas_pdf_extract_detected_salesperson_name", "lucas_pdf_extract_detected_salesperson_initials", "lucas_pdf_extract_detected_salesperson_basis", "joe_pdf_extract_match_flag", "joe_pdf_extract_match_status", "joe_pdf_extract_match_count", "joe_pdf_extract_source_paths", "joe_pdf_extract_file_names", "joe_pdf_extract_file_sha256s", "joe_pdf_extract_match_methods", "joe_pdf_extract_contexts", "joe_pdf_extract_detected_salesperson_name", "joe_pdf_extract_detected_salesperson_initials", "joe_pdf_extract_detected_salesperson_basis", "joe_pdf_extract_pass2_strict_match_flag", "joe_pdf_extract_pass2_strict_match_status", "joe_pdf_extract_pass2_strict_match_count", "joe_pdf_extract_pass2_strict_source_paths", "joe_pdf_extract_pass2_strict_file_names", "joe_pdf_extract_pass2_strict_file_sha256s", "joe_pdf_extract_pass2_strict_match_methods", "joe_pdf_extract_pass2_strict_contexts", "invoice_locker_match_flag", "invoice_locker_match_status", "invoice_locker_match_count", "invoice_locker_source_paths", "invoice_locker_file_names", "invoice_locker_file_sha256s", "invoice_locker_match_methods", "invoice_locker_candidate_invoice_numbers", "invoice_locker_date_token_from_filename", "invoice_locker_customer_token_from_filename", "invoice_locker_status_token_from_filename", "invoice_locker_second_pass_match_flag", "invoice_locker_second_pass_match_status", "invoice_locker_second_pass_match_count", "invoice_locker_second_pass_source_paths", "invoice_locker_second_pass_file_names", "invoice_locker_second_pass_file_sha256s", "invoice_locker_second_pass_match_methods", "invoice_locker_second_pass_filename_customer_tokens", "invoice_locker_second_pass_filename_dates", "match_basis_text", "suggested_category", "suggested_salesperson_customer", "suggested_salesperson_raw", "suggestion_basis", "suggestion_source", "tenant_rule_name", "tenant_expected_monthly_amount", "tenant_amount_match_flag", "customer_sales_rule_name", "customer_sales_suggestion_flag", "sales_tracking_hit_flag", "sales_tracking_hits_count", "sales_tracking_amount_match_flag", "sales_tracking_date_match_flag", "amount_match_notes", "date_match_notes", "sales_tracking_hit_notes", "sales_tracking_first_hit", "row_key", "user_category", "approved_category", "category_approved_at_utc", "category_approved_by", "all_pdf_index_match_flag", "all_pdf_index_match_status", "all_pdf_index_match_count", "all_pdf_index_source_dbs", "all_pdf_index_source_paths", "all_pdf_index_file_names", "all_pdf_index_match_methods", "all_pdf_index_match_fields", "all_pdf_index_subjects", "all_pdf_index_senders"],
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 100), 1), 500);
  const offset = Math.max(Number(searchParams.get("offset") || 0), 0);
  const requestedView = searchParams.get("view") === "remaining" ? "remaining" : "current";
  const filters: RowFilters = {
    q: searchParams.get("q") || "",
    customer: searchParams.get("customer") || "",
    category: searchParams.get("category") || "",
    salesperson: searchParams.get("salesperson") || "",
    status: searchParams.get("status") || "",
    salesTrackingHit: searchParams.get("salesTrackingHit") || "",
    hasSuggestion: searchParams.get("hasSuggestion") || "",
  };

  try {
    return NextResponse.json(await loadRows(limit, offset, filters, requestedView));
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Failed to load unallocated sales" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as CategoryPatchRequest;
    let category = String(body.category ?? "").trim();
    const applySuggestedCategory = body.apply_suggested_category === true;
    const finalizeCategory = body.finalize_category === true;
    const approvedBy = String(body.approved_by ?? "Joseph").trim() || "Joseph";
    const docNumber = String(body.doc_number ?? "");
    const invoiceId = String(body.invoice_id ?? "");
    const sourceRowNumber = String(body.source_row_number ?? "");

    if (!docNumber && !invoiceId && !sourceRowNumber) {
      return NextResponse.json({ success: false, error: "Missing row identifiers" }, { status: 400 });
    }

    const rowKey = rowKeyFromIdentifiers(docNumber, invoiceId, sourceRowNumber);
    let sourceCsvSha256 = "";
    let sourceCategoryField = category ? "request_category" : "";
    let approvalBasis = "user-selected category";

    if (applySuggestedCategory || finalizeCategory) {
      const rows = await loadRows(Number.MAX_SAFE_INTEGER, 0, { q: "", customer: "", category: "", salesperson: "", status: "", salesTrackingHit: "", hasSuggestion: "" });
      sourceCsvSha256 = rows.sourceCsvSha256;
      const row = rows.rows.find((item) => item.row_key === rowKey);
      if (!row) {
        return NextResponse.json({ success: false, error: "Row not found in unallocated source CSV" }, { status: 404 });
      }

      if (applySuggestedCategory) {
        category = String(row.suggested_category ?? "").trim();
        sourceCategoryField = "suggested_category";
        approvalBasis = String(row.suggestion_basis || "suggested_category");
        if (!APPLY_SUGGESTED_CATEGORY_OPTIONS.includes(category)) {
          return NextResponse.json({ success: false, error: "Suggested category is not applyable. Allowed suggested categories: tenant rent, contractor" }, { status: 400 });
        }
      }

      if (finalizeCategory) {
        const requestedCategory = category;
        const currentCategory = String(row.user_category ?? "").trim();
        const suggestedCategory = String(row.suggested_category ?? "").trim();
        if (!requestedCategory && APPLY_SUGGESTED_CATEGORY_OPTIONS.includes(currentCategory)) {
          category = currentCategory;
          sourceCategoryField = "user_category";
          approvalBasis = "current user_category sidecar value";
        } else if (!requestedCategory && APPLY_SUGGESTED_CATEGORY_OPTIONS.includes(suggestedCategory)) {
          category = suggestedCategory;
          sourceCategoryField = "suggested_category";
          approvalBasis = String(row.suggestion_basis || "suggested_category");
        } else if (requestedCategory === currentCategory && APPLY_SUGGESTED_CATEGORY_OPTIONS.includes(currentCategory)) {
          sourceCategoryField = "user_category";
          approvalBasis = "current user_category sidecar value";
        } else if (requestedCategory === suggestedCategory && APPLY_SUGGESTED_CATEGORY_OPTIONS.includes(suggestedCategory)) {
          sourceCategoryField = "suggested_category";
          approvalBasis = String(row.suggestion_basis || "suggested_category");
        } else {
          return NextResponse.json({ success: false, error: "Finalize requires a valid current user_category or suggested_category: tenant rent or contractor" }, { status: 400 });
        }
      }
    }

    if (!CATEGORY_OPTIONS.includes(category)) {
      return NextResponse.json({ success: false, error: `Invalid category. Allowed categories: ${CATEGORY_OPTIONS.filter(Boolean).join(", ")}` }, { status: 400 });
    }

    const sidecar = await readCategorySidecar();
    const updatedAt = new Date().toISOString();
    if (category) {
      sidecar.categories[rowKey] = { category, doc_number: docNumber, invoice_id: invoiceId, source_row_number: sourceRowNumber, updated_at_utc: updatedAt };
    } else {
      delete sidecar.categories[rowKey];
    }
    sidecar.updated_at_utc = updatedAt;
    const { sidecarSha256, manifestPath } = await writeCategorySidecar(sidecar, {
      row_key: rowKey,
      category,
      doc_number: docNumber,
      invoice_id: invoiceId,
      source_row_number: sourceRowNumber,
      updated_at_utc: updatedAt,
    });

    let approvalResponse = {};
    if (finalizeCategory) {
      if (!sourceCsvSha256) {
        const text = await readFile(UNALLOCATED_CSV, "utf8");
        sourceCsvSha256 = createHash("sha256").update(text).digest("hex");
      }
      const approvalSidecar = await readCategoryApprovalSidecar();
      const approval: CategoryApproval = {
        category,
        approved_category: category,
        doc_number: docNumber,
        invoice_id: invoiceId,
        source_row_number: sourceRowNumber,
        updated_at_utc: updatedAt,
        approved_at_utc: updatedAt,
        approved_by: approvedBy,
        approval_basis: approvalBasis,
        source_category_field: sourceCategoryField || "user_category",
        source_csv_sha256: sourceCsvSha256,
        category_sidecar_path: CATEGORY_SIDECAR,
      };
      approvalSidecar.approvals[rowKey] = approval;
      approvalSidecar.updated_at_utc = updatedAt;
      const approvalWrite = await writeCategoryApprovalSidecar(approvalSidecar, { ...approval, row_key: rowKey, category_sidecar_sha256: sidecarSha256 });
      approvalResponse = {
        finalized: true,
        approved_category: category,
        approved_by: approvedBy,
        approved_at_utc: updatedAt,
        approval_sidecar_path: CATEGORY_APPROVAL_SIDECAR,
        approval_sidecar_sha256: approvalWrite.approvalSidecarSha256,
        approval_manifest_path: approvalWrite.manifestPath,
        approval_manifest_sha256: approvalWrite.manifestSha256,
      };
    }

    return NextResponse.json({
      success: true,
      row_key: rowKey,
      category,
      sidecar_path: CATEGORY_SIDECAR,
      sidecar_sha256: sidecarSha256,
      manifest_path: manifestPath,
      source_csv: UNALLOCATED_CSV,
      source_csv_sha256: sourceCsvSha256,
      controlling_salesperson_field: "QBO CustomField DefinitionId=2 / qbo_customfield_definitionid_2_raw_value",
      ...approvalResponse,
    });
  } catch (error) {
    console.error("qbo-unallocated category PATCH failed", { error });
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Failed to save category" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const docNumber = String(form.get("doc_number") || "");
    const invoiceId = String(form.get("invoice_id") || "");
    const sourceRowNumber = String(form.get("source_row_number") || "");

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "Missing upload file" }, { status: 400 });
    }
    if (!docNumber && !invoiceId) {
      return NextResponse.json({ success: false, error: "Missing doc_number or invoice_id" }, { status: 400 });
    }

    const invoiceKey = cleanSegment(docNumber || invoiceId);
    const invoiceDir = path.join(UPLOAD_ROOT, invoiceKey);
    await mkdir(invoiceDir, { recursive: true });

    const originalName = cleanSegment(file.name || "invoice_upload");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${timestamp}__${originalName}`;
    const targetPath = path.join(invoiceDir, filename);
    const bytes = Buffer.from(await file.arrayBuffer());
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    await writeFile(targetPath, bytes);

    const manifest = {
      uploaded_at_utc: new Date().toISOString(),
      invoice_key: invoiceKey,
      doc_number: docNumber,
      invoice_id: invoiceId,
      source_row_number: sourceRowNumber,
      original_filename: file.name,
      stored_filename: filename,
      stored_path: targetPath,
      size_bytes: bytes.length,
      sha256,
      content_type: file.type || "application/octet-stream",
      purpose: "allocation_support_pattern_finding_only",
      controlling_salesperson_field: "QBO CustomField DefinitionId=2 / qbo_customfield_definitionid_2_raw_value",
      source_csv: UNALLOCATED_CSV,
    };
    await writeFile(path.join(invoiceDir, `${timestamp}__manifest.json`), JSON.stringify(manifest, null, 2));

    return NextResponse.json({ success: true, ...manifest });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Upload failed" }, { status: 500 });
  }
}
