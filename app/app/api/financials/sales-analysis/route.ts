import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

export const dynamic = "force-dynamic";

const DB_PATH = path.join(
  "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER",
  "_analysis_outputs/rowboat_invoice_database/invoice_analysis.db"
);

// ─── Types ───

interface RevenueTrendMonthly {
  year: number;
  month: number;
  invoice_count: number;
  total_revenue: number;
  avg_invoice_size: number;
}

interface RevenueTrendYearly {
  year: number;
  invoice_count: number;
  total_revenue: number;
  avg_invoice_size: number;
  unique_customers: number;
}

interface SalespersonRanking {
  salesperson: string;
  invoice_count: number;
  total_revenue: number;
  avg_invoice_size: number;
  unique_customers: number;
  first_order_date: string;
  last_order_date: string;
}

interface TopCustomer {
  customer_name: string;
  invoice_count: number;
  total_revenue: number;
  avg_invoice_size: number;
  salespeople: string;
  first_order_date: string;
  last_order_date: string;
}

interface Seasonality {
  month: number;
  invoice_count: number;
  total_revenue: number;
  avg_invoice_size: number;
}

interface InvoiceSizeBucket {
  bucket: string;
  invoice_count: number;
  total_revenue: number;
  avg_invoice_size: number;
  pct_of_invoices: number;
  pct_of_revenue: number;
}

interface RetentionCohort {
  cohort: string;
  customer_count: number;
  cohort_revenue: number;
  avg_orders_per_customer: number;
  avg_revenue_per_customer: number;
}

interface YoYGrowth {
  year: number;
  revenue: number;
  invoice_count: number;
  yoy_revenue_growth_pct: number | null;
  yoy_invoice_growth_pct: number | null;
}

interface SalespersonOverlap {
  customer_name: string;
  salesperson_count: number;
  salespeople: string;
}

// ─── Response type ───

interface SalesAnalysisResponse {
  success: boolean;
  view: string;
  data: unknown;
}

// ─── Helper: get DB connection ───

function getDb(): Database.Database {
  return new Database(DB_PATH, { readonly: true });
}

// ─── Query functions ───

function getRevenueTrends(db: Database.Database): {
  monthly: RevenueTrendMonthly[];
  yearly: RevenueTrendYearly[];
} {
  const monthly = db
    .prepare(
      `SELECT year, month, COUNT(*) as invoice_count,
              ROUND(SUM(total_amt), 2) as total_revenue,
              ROUND(AVG(total_amt), 2) as avg_invoice_size
       FROM invoices
       WHERE total_amt IS NOT NULL
       GROUP BY year, month
       ORDER BY year, month`
    )
    .all() as RevenueTrendMonthly[];

  const yearly = db
    .prepare(
      `SELECT year, COUNT(*) as invoice_count,
              ROUND(SUM(total_amt), 2) as total_revenue,
              ROUND(AVG(total_amt), 2) as avg_invoice_size,
              COUNT(DISTINCT customer_name) as unique_customers
       FROM invoices
       WHERE total_amt IS NOT NULL
       GROUP BY year
       ORDER BY year`
    )
    .all() as RevenueTrendYearly[];

  return { monthly, yearly };
}

function getSalespersonRanking(db: Database.Database): SalespersonRanking[] {
  return db
    .prepare(
      `SELECT
         CASE WHEN salesperson_name IS NULL OR salesperson_name = '' THEN 'Unassigned'
              ELSE salesperson_name
         END as salesperson,
         COUNT(*) as invoice_count,
         ROUND(SUM(total_amt), 2) as total_revenue,
         ROUND(AVG(total_amt), 2) as avg_invoice_size,
         COUNT(DISTINCT customer_name) as unique_customers,
         MIN(txn_date) as first_order_date,
         MAX(txn_date) as last_order_date
       FROM invoices
       GROUP BY salesperson
       ORDER BY total_revenue DESC`
    )
    .all() as SalespersonRanking[];
}

function getTopCustomers(db: Database.Database): TopCustomer[] {
  return db
    .prepare(
      `WITH customer_salespeople AS (
         SELECT DISTINCT customer_name,
           CASE WHEN salesperson_name IS NULL OR salesperson_name = '' THEN 'Unassigned' ELSE salesperson_name END as sp_name
         FROM invoices
         WHERE customer_name IS NOT NULL AND customer_name != ''
       ),
       customer_sp_agg AS (
         SELECT customer_name, GROUP_CONCAT(sp_name, ', ') as salespeople
         FROM customer_salespeople
         GROUP BY customer_name
       )
       SELECT
         i.customer_name,
         COUNT(*) as invoice_count,
         ROUND(SUM(i.total_amt), 2) as total_revenue,
         ROUND(AVG(i.total_amt), 2) as avg_invoice_size,
         csa.salespeople,
         MIN(i.txn_date) as first_order_date,
         MAX(i.txn_date) as last_order_date
       FROM invoices i
       JOIN customer_sp_agg csa ON i.customer_name = csa.customer_name
       WHERE i.customer_name IS NOT NULL AND i.customer_name != ''
       GROUP BY i.customer_name
       ORDER BY total_revenue DESC
       LIMIT 100`
    )
    .all() as TopCustomer[];
}

function getSeasonality(db: Database.Database): Seasonality[] {
  return db
    .prepare(
      `SELECT
         month,
         COUNT(*) as invoice_count,
         ROUND(SUM(total_amt), 2) as total_revenue,
         ROUND(AVG(total_amt), 2) as avg_invoice_size
       FROM invoices
       WHERE total_amt IS NOT NULL
       GROUP BY month
       ORDER BY month`
    )
    .all() as Seasonality[];
}

function getInvoiceSizeDistribution(db: Database.Database): InvoiceSizeBucket[] {
  const totalInvoices = (db.prepare("SELECT COUNT(*) as cnt FROM invoices").get() as { cnt: number }).cnt;
  const totalRevenue = (db.prepare("SELECT COALESCE(SUM(total_amt), 0) as rev FROM invoices").get() as { rev: number }).rev;

  const buckets = db
    .prepare(
      `SELECT
         CASE
           WHEN total_amt < 100 THEN '<$100'
           WHEN total_amt >= 100 AND total_amt < 500 THEN '$100-500'
           WHEN total_amt >= 500 AND total_amt < 1000 THEN '$500-1K'
           WHEN total_amt >= 1000 AND total_amt < 5000 THEN '$1K-5K'
           WHEN total_amt >= 5000 AND total_amt < 10000 THEN '$5K-10K'
           WHEN total_amt >= 10000 AND total_amt < 50000 THEN '$10K-50K'
           ELSE '$50K+'
         END as bucket,
         COUNT(*) as invoice_count,
         ROUND(SUM(total_amt), 2) as total_revenue,
         ROUND(AVG(total_amt), 2) as avg_invoice_size
       FROM invoices
       WHERE total_amt IS NOT NULL
       GROUP BY bucket
       ORDER BY MIN(total_amt)`
    )
    .all() as Omit<InvoiceSizeBucket, "pct_of_invoices" | "pct_of_revenue">[];

  return buckets.map((b) => ({
    ...b,
    pct_of_invoices: totalInvoices > 0 ? Math.round((b.invoice_count / totalInvoices) * 1000) / 10 : 0,
    pct_of_revenue: totalRevenue > 0 ? Math.round((b.total_revenue / totalRevenue) * 1000) / 10 : 0,
  }));
}

function getCustomerRetention(db: Database.Database): RetentionCohort[] {
  const cohorts = db
    .prepare(
      `WITH customer_order_counts AS (
         SELECT customer_name, COUNT(*) as order_count, ROUND(SUM(total_amt), 2) as total_rev
         FROM invoices
         WHERE customer_name IS NOT NULL AND customer_name != ''
         GROUP BY customer_name
       )
       SELECT
         CASE
           WHEN order_count = 1 THEN '1 order'
           WHEN order_count >= 2 AND order_count <= 5 THEN '2-5 orders'
           WHEN order_count >= 6 AND order_count <= 10 THEN '6-10 orders'
           ELSE '11+ orders'
         END as cohort,
         COUNT(*) as customer_count,
         ROUND(SUM(total_rev), 2) as cohort_revenue,
         ROUND(AVG(order_count), 1) as avg_orders_per_customer,
         ROUND(AVG(total_rev), 2) as avg_revenue_per_customer
       FROM customer_order_counts
       GROUP BY cohort
       ORDER BY MIN(order_count)`
    )
    .all() as RetentionCohort[];

  return cohorts;
}

function getYoYGrowth(db: Database.Database): YoYGrowth[] {
  const rows = db
    .prepare(
      `SELECT
         year,
         ROUND(SUM(total_amt), 2) as revenue,
         COUNT(*) as invoice_count
       FROM invoices
       WHERE total_amt IS NOT NULL
       GROUP BY year
       ORDER BY year`
    )
    .all() as { year: number; revenue: number; invoice_count: number }[];

  return rows.map((row, i) => {
    const yoy_rev: number | null =
      i > 0 && rows[i - 1].revenue > 0
        ? Math.round(((row.revenue - rows[i - 1].revenue) / rows[i - 1].revenue) * 1000) / 10
        : null;
    const yoy_inv: number | null =
      i > 0 && rows[i - 1].invoice_count > 0
        ? Math.round(
            ((row.invoice_count - rows[i - 1].invoice_count) / rows[i - 1].invoice_count) * 1000
          ) / 10
        : null;
    return {
      year: row.year,
      invoice_count: row.invoice_count,
      revenue: row.revenue,
      yoy_revenue_growth_pct: yoy_rev,
      yoy_invoice_growth_pct: yoy_inv,
    };
  });
}

function getSalespersonCustomerOverlap(db: Database.Database): SalespersonOverlap[] {
  return db
    .prepare(
      `WITH distinct_sp AS (
         SELECT DISTINCT 
           customer_name,
           CASE WHEN salesperson_name IS NULL OR salesperson_name = '' THEN 'Unassigned' ELSE salesperson_name END as sp_name
         FROM invoices
         WHERE customer_name IS NOT NULL AND customer_name != ''
       )
       SELECT
         customer_name,
         COUNT(*) as salesperson_count,
         GROUP_CONCAT(sp_name, ', ') as salespeople
       FROM distinct_sp
       GROUP BY customer_name
       HAVING salesperson_count > 1
       ORDER BY salesperson_count DESC
       LIMIT 100`
    )
    .all() as SalespersonOverlap[];
}

// ─── Overview query (aggregate KPIs) ───

function getOverview(db: Database.Database) {
  const summary = db.prepare(`
    SELECT
      COUNT(*) as total_invoices,
      COUNT(DISTINCT customer_name) as total_customers,
      COUNT(DISTINCT CASE WHEN salesperson_name IS NOT NULL AND salesperson_name != '' THEN salesperson_name END) as total_salespeople,
      ROUND(SUM(total_amt), 2) as total_revenue,
      ROUND(AVG(total_amt), 2) as avg_invoice_size,
      MIN(txn_date) as first_date,
      MAX(txn_date) as last_date,
      MIN(year) as first_year,
      MAX(year) as last_year
    FROM invoices
    WHERE total_amt IS NOT NULL
  `).get() as {
    total_invoices: number;
    total_customers: number;
    total_salespeople: number;
    total_revenue: number;
    avg_invoice_size: number;
    first_date: string;
    last_date: string;
    first_year: number;
    last_year: number;
  };
  return summary;
}

// ─── Route handler ───

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const rawView = url.searchParams.get("view") || "all";

  // Map friendly view names to internal queries, plus support original names
  const viewMap: Record<string, string[]> = {
    overview: ["overview"],
    salespeople: ["salesperson_ranking"],
    customers: ["top_customers"],
    seasonality: ["seasonality"],
    trends: ["revenue_trends"],
    sizes: ["invoice_size_distribution"],
    retention: ["customer_retention"],
    growth: ["yoy_growth"],
    overlap: ["salesperson_overlap"],
    monthly: ["revenue_trends_monthly"],
    all: ["overview", "revenue_trends", "salesperson_ranking", "top_customers",
          "seasonality", "invoice_size_distribution", "customer_retention",
          "yoy_growth", "salesperson_overlap"],
    // backward compat
    revenue_trends: ["revenue_trends"],
    salesperson_ranking: ["salesperson_ranking"],
    top_customers: ["top_customers"],
    invoice_size_distribution: ["invoice_size_distribution"],
    customer_retention: ["customer_retention"],
    yoy_growth: ["yoy_growth"],
    salesperson_overlap: ["salesperson_overlap"],
  };

  const queries = viewMap[rawView] || viewMap["all"];
  const view = rawView;

  let db: Database.Database | null = null;

  try {
    db = getDb();

    const result: Record<string, unknown> = {};

    for (const q of queries) {
      switch (q) {
        case "overview":
          result.overview = getOverview(db);
          break;
        case "revenue_trends":
          result.revenue_trends = getRevenueTrends(db);
          break;
        case "revenue_trends_monthly": {
          const trends = getRevenueTrends(db);
          result.monthly = trends.monthly;
          break;
        }
        case "salesperson_ranking":
          result.salespeople = getSalespersonRanking(db);
          break;
        case "top_customers":
          result.customers = getTopCustomers(db);
          break;
        case "seasonality":
          result.seasonality = getSeasonality(db);
          break;
        case "invoice_size_distribution":
          result.sizes = getInvoiceSizeDistribution(db);
          break;
        case "customer_retention":
          result.retention = getCustomerRetention(db);
          break;
        case "yoy_growth":
          result.growth = getYoYGrowth(db);
          break;
        case "salesperson_overlap":
          result.overlap = getSalespersonCustomerOverlap(db);
          break;
      }
    }

    return NextResponse.json({
      success: true,
      view,
      ...result,
    });
  } catch (error) {
    console.error("Sales analysis API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch sales analysis data",
      },
      { status: 500 }
    );
  } finally {
    if (db) db.close();
  }
}
