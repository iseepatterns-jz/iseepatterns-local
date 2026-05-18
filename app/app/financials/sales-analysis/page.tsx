"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  DollarSign, TrendingUp, Users, ShoppingCart, Award,
  Loader2, AlertTriangle, BarChart3, Activity,
  Target, Calendar, Zap, PieChart, FileText, Repeat
} from "lucide-react";

// ─── Types ───

interface Overview {
  total_invoices: number;
  total_customers: number;
  total_salespeople: number;
  total_revenue: number;
  avg_invoice_size: number;
  first_date: string;
  last_date: string;
  first_year: number;
  last_year: number;
}

interface YearlyTrend {
  year: number;
  invoice_count: number;
  total_revenue: number;
  avg_invoice_size: number;
  unique_customers: number;
}

interface MonthlyTrend {
  year: number;
  month: number;
  invoice_count: number;
  total_revenue: number;
  avg_invoice_size: number;
}

interface Salesperson {
  salesperson: string;
  invoice_count: number;
  total_revenue: number;
  avg_invoice_size: number;
  unique_customers: number;
  first_order_date: string;
  last_order_date: string;
}

interface CustomerRow {
  customer_name: string;
  invoice_count: number;
  total_revenue: number;
  avg_invoice_size: number;
  salespeople: string;
  first_order_date: string;
  last_order_date: string;
}

interface SeasonalityRow {
  month: number;
  invoice_count: number;
  total_revenue: number;
  avg_invoice_size: number;
}

interface SizeBucket {
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

interface GrowthRow {
  year: number;
  revenue: number;
  invoice_count: number;
  yoy_revenue_growth_pct: number | null;
  yoy_invoice_growth_pct: number | null;
}

interface SalesAnalysisData {
  overview: Overview | null;
  revenue_trends: { monthly: MonthlyTrend[]; yearly: YearlyTrend[] } | null;
  salespeople: Salesperson[] | null;
  customers: CustomerRow[] | null;
  seasonality: SeasonalityRow[] | null;
  sizes: SizeBucket[] | null;
  retention: RetentionCohort[] | null;
  growth: GrowthRow[] | null;
}

// ─── Helpers ───

function fmtCurrency(n: number | null | undefined): string {
  if (n == null || n === 0) return "$0";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function fmtCurrencyPrecise(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n);
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US");
}

const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTHS_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ─── Sparkline bar (inline simple chart) ───

function SparkBar({ value, max, color = "var(--accent-cyan)", height = 16 }: {
  value: number; max: number; color?: string; height?: number;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{
      width: "100%", height, borderRadius: 4,
      background: "rgba(255,255,255,0.05)",
      overflow: "hidden",
    }}>
      <div style={{
        width: `${Math.max(pct, 0.5)}%`, height: "100%",
        background: color, borderRadius: 4,
        transition: "width 0.3s",
      }} />
    </div>
  );
}

function TrendBar({ value, max, color = "var(--accent-cyan)" }: {
  value: number; max: number; color?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{
        flex: 1, height: 8, borderRadius: 4,
        background: "rgba(255,255,255,0.05)",
        overflow: "hidden", minWidth: 60,
      }}>
        <div style={{
          width: `${Math.max(pct, 0.5)}%`, height: "100%",
          background: color, borderRadius: 4,
        }} />
      </div>
      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", minWidth: 60, textAlign: "right" }}>
        {fmtCurrency(value)}
      </span>
    </div>
  );
}

// ─── Main Component ───

export default function SalesAnalysisPage() {
  const [data, setData] = useState<SalesAnalysisData>({
    overview: null, revenue_trends: null, salespeople: null,
    customers: null, seasonality: null, sizes: null,
    retention: null, growth: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "trends" | "salespeople" | "customers" | "seasonality" | "sizes" | "retention">("overview");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const views = ["overview", "trends", "salespeople", "customers", "seasonality", "sizes", "retention", "growth"];
      const results = await Promise.all(
        views.map(v =>
          fetch(`/api/financials/sales-analysis?view=${v}`).then(r => r.json())
        )
      );

      const merged: SalesAnalysisData = {
        overview: results[0]?.overview || null,
        revenue_trends: results[1]?.revenue_trends || null,
        salespeople: results[2]?.salespeople || null,
        customers: results[3]?.customers || null,
        seasonality: results[4]?.seasonality || null,
        sizes: results[5]?.sizes || null,
        retention: results[6]?.retention || null,
        growth: results[7]?.growth || null,
      };

      // Check for any API errors
      for (const r of results) {
        if (!r.success) throw new Error(r.error || "API error");
      }

      setData(merged);
      if (!selectedYear && merged.overview) {
        setSelectedYear(merged.overview.last_year);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sales data");
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Derived data ───

  const years = useMemo(() => {
    if (!data.revenue_trends?.yearly) return [];
    return data.revenue_trends.yearly.map(y => y.year);
  }, [data.revenue_trends]);

  const yearlyData = useMemo(() => {
    if (!data.revenue_trends?.yearly) return [];
    return data.revenue_trends.yearly;
  }, [data.revenue_trends]);

  const monthlyData = useMemo(() => {
    if (!data.revenue_trends?.monthly || !selectedYear) return [];
    return data.revenue_trends.monthly.filter(m => m.year === selectedYear);
  }, [data.revenue_trends, selectedYear]);

  const allSeasonality = useMemo(() => {
    if (!data.seasonality) return [];
    return data.seasonality;
  }, [data.seasonality]);

  const maxSeasonRev = useMemo(() =>
    Math.max(...allSeasonality.map(s => s.total_revenue), 1),
  [allSeasonality]);

  // ─── Loading ───

  if (loading) {
    return (
      <div style={{ padding: "2rem", maxWidth: 1600, margin: "0 auto" }}>
        <div className="glass-panel" style={{ padding: "4rem", textAlign: "center" }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: "0 auto 1rem", color: "var(--accent-cyan)" }} />
          <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>
            Loading Sales Analysis...
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
            Fetching from invoice_analysis.db (7,484 invoices, 2016–2025)
          </div>
        </div>
      </div>
    );
  }

  // ─── Error ───

  if (error) {
    return (
      <div style={{ padding: "2rem", maxWidth: 1600, margin: "0 auto" }}>
        <div className="glass-panel" style={{ padding: "3rem", textAlign: "center" }}>
          <AlertTriangle size={36} style={{ color: "var(--accent-red)", marginBottom: "1rem" }} />
          <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
            Unable to load sales data
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>{error}</div>
          <button onClick={fetchAll} className="btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  const ov = data.overview;
  if (!ov) return null;

  // ─── Helpers for rendering ───

  const statCard = (
    label: string, value: string | number, subtitle: string | null,
    icon: React.ReactNode, color: string, accentBg: string
  ) => (
    <div className="glass-panel" style={{ padding: "1rem 1.25rem", flex: 1, minWidth: 170 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: accentBg, border: `1px solid ${color}40`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {label}
          </div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-primary)", lineHeight: 1.3 }}>
            {value}
          </div>
          {subtitle && (
            <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginTop: 2 }}>{subtitle}</div>
          )}
        </div>
      </div>
    </div>
  );

  const panelHeader = (icon: React.ReactNode, title: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
      {icon}
      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)" }}>{title}</span>
    </div>
  );

  // ─── Main Render ───

  return (
    <div style={{ padding: "2rem", maxWidth: 1600, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, fontFamily: "var(--font-heading)", margin: "0 0 0.25rem 0" }}>
          Sales Analysis
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>
          Full invoice_analysis.db · {fmtNum(ov.total_invoices)} invoices · {ov.first_year}–{ov.last_year}
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {statCard("Total Revenue", fmtCurrency(ov.total_revenue),
          `${ov.first_year}–${ov.last_year}`,
          <DollarSign size={18} style={{ color: "var(--accent-cyan)" }} />,
          "var(--accent-cyan)", "rgba(0,242,255,0.1)")}
        {statCard("Total Invoices", fmtNum(ov.total_invoices),
          `Avg ${fmtCurrency(ov.avg_invoice_size)}/invoice`,
          <FileText size={18} style={{ color: "var(--accent-purple)" }} />,
          "var(--accent-purple)", "rgba(112,0,255,0.1)")}
        {statCard("Customers", fmtNum(ov.total_customers),
          `${((ov.total_revenue / ov.total_customers) || 0).toFixed(0) === "0" ? fmtCurrency(ov.total_revenue / ov.total_customers) : fmtCurrency(ov.total_revenue / ov.total_customers)} avg per customer`,
          <Users size={18} style={{ color: "var(--accent-emerald)" }} />,
          "var(--accent-emerald)", "rgba(16,185,129,0.1)")}
        {statCard("Salespeople", ov.total_salespeople,
          `${fmtNum(ov.total_invoices)} invoices across team`,
          <Award size={18} style={{ color: "var(--accent-orange)" }} />,
          "var(--accent-orange)", "rgba(249,115,22,0.1)")}
        {statCard("Avg Invoice", fmtCurrency(ov.avg_invoice_size),
          `${ov.first_date} → ${ov.last_date}`,
          <ShoppingCart size={18} style={{ color: "var(--accent-red)" }} />,
          "var(--accent-red)", "rgba(239,68,68,0.1)")}
      </div>

      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: "0.375rem", marginBottom: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
        {([
          { key: "overview", label: "Overview", icon: <Activity size={14} /> },
          { key: "trends", label: "Trends", icon: <TrendingUp size={14} /> },
          { key: "salespeople", label: "Salespeople", icon: <Users size={14} /> },
          { key: "customers", label: "Customers", icon: <Target size={14} /> },
          { key: "seasonality", label: "Seasonality", icon: <Calendar size={14} /> },
          { key: "sizes", label: "Invoice Sizes", icon: <BarChart3 size={14} /> },
          { key: "retention", label: "Retention", icon: <Repeat size={14} /> },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              background: activeTab === tab.key ? "var(--accent-cyan)" : "var(--bg-glass)",
              color: activeTab === tab.key ? "#000" : "var(--text-secondary)",
              border: activeTab === tab.key ? "1px solid var(--accent-cyan)" : "var(--glass-border)",
              borderRadius: 6, padding: "5px 12px", fontSize: "0.72rem",
              fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4,
              transition: "all 0.15s",
            }}>
            {tab.icon} {tab.label}
          </button>
        ))}
        {years.length > 0 && (
          <select value={selectedYear ?? ""} onChange={e => setSelectedYear(Number(e.target.value) || null)}
            style={{
              marginLeft: "auto", background: "var(--bg-glass)", border: "var(--glass-border)",
              borderRadius: 6, padding: "5px 12px", fontSize: "0.72rem",
              color: "var(--text-primary)", outline: "none", cursor: "pointer", fontWeight: 600,
            }}>
            {years.slice().reverse().map(y => (
              <option key={y} value={y} style={{ color: "#000" }}>{y}</option>
            ))}
          </select>
        )}
      </div>

      {/* ═══ TAB: OVERVIEW ═══ */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Row 1: Yearly Revenue Bars + Top Customers */}
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "1rem" }}>
            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              {panelHeader(<BarChart3 size={16} style={{ color: "var(--accent-cyan)" }} />, "Annual Revenue (2016–2025)")}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {yearlyData.map(y => (
                  <TrendBar key={y.year} value={y.total_revenue}
                    max={Math.max(...yearlyData.map(x => x.total_revenue))}
                    color={y.year === selectedYear ? "var(--accent-cyan)" : "rgba(0,242,255,0.3)"} />
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: "0.6rem", color: "var(--text-muted)" }}>
                {yearlyData.map(y => (
                  <span key={y.year} style={{ cursor: "pointer", fontWeight: y.year === selectedYear ? 700 : 400, color: y.year === selectedYear ? "var(--accent-cyan)" : undefined }}
                    onClick={() => setSelectedYear(y.year)}>{y.year}</span>
                ))}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              {panelHeader(<Target size={16} style={{ color: "var(--accent-orange)" }} />, "Top 10 Customers (All-Time)")}
              <div style={{ maxHeight: 340, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.7rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-glass)" }}>
                      <th style={thStyle("left")}>#</th>
                      <th style={thStyle("left")}>Customer</th>
                      <th style={thStyle("right")}>Revenue</th>
                      <th style={thStyle("right")}>Invoices</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.customers || []).slice(0, 10).map((c, i) => (
                      <tr key={c.customer_name} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <td style={tdStyle("left", true)}>{i + 1}</td>
                        <td style={{ ...tdStyle("left"), maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.customer_name}
                        </td>
                        <td style={tdStyle("right", true)}>{fmtCurrencyPrecise(c.total_revenue)}</td>
                        <td style={tdStyle("right", true)}>{c.invoice_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Row 2: Monthly detail for selected year + Seasonality summary */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              {panelHeader(<Calendar size={16} style={{ color: "var(--accent-emerald)" }} />, `Monthly Breakdown — ${selectedYear}`)}
              {monthlyData.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {monthlyData.map(m => (
                    <TrendBar key={m.month} value={m.total_revenue}
                      max={Math.max(...monthlyData.map(x => x.total_revenue))}
                      color="var(--accent-emerald)" />
                  ))}
                </div>
              ) : (
                <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", padding: "1rem", textAlign: "center" }}>
                  No data for {selectedYear}
                </div>
              )}
              {monthlyData.length > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: "0.6rem", color: "var(--text-muted)" }}>
                  {MONTHS_ABBR.map((m, i) => (
                    <span key={m}>{m}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              {panelHeader(<PieChart size={16} style={{ color: "var(--accent-purple)" }} />, "Invoice Size Distribution")}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.7rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-glass)" }}>
                    <th style={thStyle("left")}>Bucket</th>
                    <th style={thStyle("right")}>Count</th>
                    <th style={thStyle("right")}>Revenue</th>
                    <th style={thStyle("right")}>% Rev</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.sizes || []).map(s => (
                    <tr key={s.bucket} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <td style={tdStyle("left")}>{s.bucket}</td>
                      <td style={tdStyle("right", true)}>{fmtNum(s.invoice_count)}</td>
                      <td style={tdStyle("right", true)}>{fmtCurrency(s.total_revenue)}</td>
                      <td style={tdStyle("right", true)}>{s.pct_of_revenue}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: TRENDS ═══ */}
      {activeTab === "trends" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Yearly table */}
          <div className="glass-panel" style={{ padding: "1.25rem" }}>
            {panelHeader(<TrendingUp size={16} style={{ color: "var(--accent-cyan)" }} />, "Multi-Year Revenue Trend")}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-glass)" }}>
                    <th style={thStyle("left")}>Year</th>
                    <th style={thStyle("right")}>Revenue</th>
                    <th style={thStyle("right")}>Invoices</th>
                    <th style={thStyle("right")}>Avg Invoice</th>
                    <th style={thStyle("right")}>Customers</th>
                    <th style={thStyle("right")}>YoY Growth</th>
                    <th style={thStyle("left")}>Bar</th>
                  </tr>
                </thead>
                <tbody>
                  {yearlyData.map((y, i) => {
                    const growth = data.growth?.find(g => g.year === y.year);
                    const gPct = growth?.yoy_revenue_growth_pct;
                    return (
                      <tr key={y.year} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", cursor: "pointer" }}
                        onClick={() => setSelectedYear(y.year)}>
                        <td style={{ ...tdStyle("left"), fontWeight: y.year === selectedYear ? 700 : 400, color: y.year === selectedYear ? "var(--accent-cyan)" : undefined }}>
                          {y.year}
                        </td>
                        <td style={tdStyle("right", true)}>{fmtCurrencyPrecise(y.total_revenue)}</td>
                        <td style={tdStyle("right", true)}>{fmtNum(y.invoice_count)}</td>
                        <td style={tdStyle("right", true)}>{fmtCurrency(y.avg_invoice_size)}</td>
                        <td style={tdStyle("right", true)}>{fmtNum(y.unique_customers)}</td>
                        <td style={{
                          ...tdStyle("right", true),
                          color: gPct != null ? (gPct >= 0 ? "var(--accent-emerald)" : "var(--accent-red)") : "var(--text-muted)",
                        }}>
                          {gPct != null ? `${gPct >= 0 ? "+" : ""}${gPct}%` : "—"}
                        </td>
                        <td style={{ padding: "0.3rem 0.5rem" }}>
                          <SparkBar value={y.total_revenue} max={Math.max(...yearlyData.map(x => x.total_revenue))}
                            color={y.year === selectedYear ? "var(--accent-cyan)" : "rgba(0,242,255,0.3)"} height={12} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Growth cards */}
          <div className="glass-panel" style={{ padding: "1.25rem" }}>
            {panelHeader(<Zap size={16} style={{ color: "var(--accent-purple)" }} />, "Year-over-Year Growth")}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" }}>
              {(data.growth || []).filter(g => g.yoy_revenue_growth_pct != null).map(g => (
                <div key={g.year} className="glass-panel" style={{
                  padding: "0.75rem", background: "var(--bg-glass-hover)",
                  display: "flex", flexDirection: "column", gap: "0.15rem",
                }}>
                  <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                    {g.year}
                  </div>
                  <div style={{ fontSize: "1rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                    {fmtCurrency(g.revenue)}
                  </div>
                  <div style={{
                    fontSize: "0.65rem",
                    color: (g.yoy_revenue_growth_pct ?? 0) >= 0 ? "var(--accent-emerald)" : "var(--accent-red)",
                    display: "flex", alignItems: "center", gap: 2,
                  }}>
                    {(g.yoy_revenue_growth_pct ?? 0) >= 0 ? <TrendingUp size={12} /> : <TrendingUp size={12} style={{ transform: "rotate(180deg)" }} />}
                    {(g.yoy_revenue_growth_pct ?? 0) >= 0 ? "+" : ""}{g.yoy_revenue_growth_pct}%
                  </div>
                  <div style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>
                    {fmtNum(g.invoice_count)} invoices
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: SALESPEOPLE ═══ */}
      {activeTab === "salespeople" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "1rem" }}>
            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              {panelHeader(<Users size={16} style={{ color: "var(--accent-cyan)" }} />, "Salesperson Performance (All-Time)")}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.72rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-glass)" }}>
                      <th style={thStyle("left")}>#</th>
                      <th style={thStyle("left")}>Salesperson</th>
                      <th style={thStyle("right")}>Revenue</th>
                      <th style={thStyle("right")}>Invoices</th>
                      <th style={thStyle("right")}>Avg</th>
                      <th style={thStyle("right")}>Customers</th>
                      <th style={thStyle("right")}>% Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const totalRev = (data.salespeople || []).reduce((s, sp) => s + sp.total_revenue, 0);
                      const maxRev = Math.max(...(data.salespeople || []).map(sp => sp.total_revenue), 1);
                      return (data.salespeople || []).map((sp, i) => (
                        <tr key={sp.salesperson} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                          <td style={tdStyle("left", true)}>{i + 1}</td>
                          <td style={tdStyle("left")}>{sp.salesperson}</td>
                          <td style={tdStyle("right", true)}>{fmtCurrencyPrecise(sp.total_revenue)}</td>
                          <td style={tdStyle("right", true)}>{fmtNum(sp.invoice_count)}</td>
                          <td style={tdStyle("right", true)}>{fmtCurrency(sp.avg_invoice_size)}</td>
                          <td style={tdStyle("right", true)}>{fmtNum(sp.unique_customers)}</td>
                          <td style={tdStyle("right", true)}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                              <SparkBar value={sp.total_revenue} max={maxRev} height={10}
                                color={`hsl(${(i * 50) % 360}, 70%, 50%)`} />
                              <span>{totalRev > 0 ? ((sp.total_revenue / totalRev) * 100).toFixed(1) : 0}%</span>
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Salesperson timeline */}
            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              {panelHeader(<Calendar size={16} style={{ color: "var(--accent-purple)" }} />, "Salesperson Timeline")}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 500, overflowY: "auto" }}>
                {(data.salespeople || []).map((sp, i) => (
                  <div key={sp.salesperson} style={{
                    padding: "0.5rem 0.75rem", borderRadius: 6,
                    background: "var(--bg-glass-hover)", fontSize: "0.7rem",
                  }}>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>
                      {sp.salesperson}
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.65rem" }}>
                      {sp.first_order_date} → {sp.last_order_date}
                    </div>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.65rem" }}>
                      {fmtCurrencyPrecise(sp.total_revenue)} · {sp.invoice_count} invoices · {sp.unique_customers} customers
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: CUSTOMERS ═══ */}
      {activeTab === "customers" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="glass-panel" style={{ padding: "1.25rem" }}>
            {panelHeader(<Target size={16} style={{ color: "var(--accent-cyan)" }} />,
              `Top Customers (${(data.customers || []).length} total)`)}

            {/* Concentration stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "1rem" }}>
              {(() => {
                const custs = data.customers || [];
                const totalRev = ov.total_revenue;
                const top5Rev = custs.slice(0, 5).reduce((s, c) => s + c.total_revenue, 0);
                const top10Rev = custs.slice(0, 10).reduce((s, c) => s + c.total_revenue, 0);
                const top20Rev = custs.slice(0, 20).reduce((s, c) => s + c.total_revenue, 0);
                const top50Rev = custs.slice(0, 50).reduce((s, c) => s + c.total_revenue, 0);
                const stats = [
                  { label: "Top 5", rev: top5Rev, color: "var(--accent-cyan)" },
                  { label: "Top 10", rev: top10Rev, color: "var(--accent-purple)" },
                  { label: "Top 20", rev: top20Rev, color: "var(--accent-emerald)" },
                  { label: "Top 50", rev: top50Rev, color: "var(--accent-orange)" },
                ];
                return stats.map(s => (
                  <div key={s.label} style={{
                    padding: "0.75rem", borderRadius: 8,
                    background: "var(--bg-glass-hover)", textAlign: "center",
                  }}>
                    <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: s.color }}>
                      {totalRev > 0 ? ((s.rev / totalRev) * 100).toFixed(1) : 0}%
                    </div>
                    <div style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>
                      {fmtCurrency(s.rev)}
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Full customer table */}
            <div style={{ overflowX: "auto", maxHeight: 500, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.72rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-glass)", position: "sticky", top: 0, background: "var(--bg-elevated)" }}>
                    <th style={thStyle("left")}>#</th>
                    <th style={thStyle("left")}>Customer</th>
                    <th style={thStyle("right")}>Revenue</th>
                    <th style={thStyle("right")}>Invoices</th>
                    <th style={thStyle("right")}>Avg Invoice</th>
                    <th style={thStyle("left")}>Salespeople</th>
                    <th style={thStyle("left")}>First</th>
                    <th style={thStyle("left")}>Last</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.customers || []).map((c, i) => (
                    <tr key={c.customer_name} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <td style={tdStyle("left", true)}>{i + 1}</td>
                      <td style={{ ...tdStyle("left"), maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.customer_name}
                      </td>
                      <td style={tdStyle("right", true)}>{fmtCurrencyPrecise(c.total_revenue)}</td>
                      <td style={tdStyle("right", true)}>{c.invoice_count}</td>
                      <td style={tdStyle("right", true)}>{fmtCurrency(c.avg_invoice_size)}</td>
                      <td style={{ ...tdStyle("left"), maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.65rem" }}>
                        {c.salespeople}
                      </td>
                      <td style={tdStyle("left")}>{c.first_order_date}</td>
                      <td style={tdStyle("left")}>{c.last_order_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: SEASONALITY ═══ */}
      {activeTab === "seasonality" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              {panelHeader(<Calendar size={16} style={{ color: "var(--accent-cyan)" }} />, "All-Time Monthly Revenue Pattern")}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {allSeasonality.map(s => (
                  <div key={s.month} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 36, fontSize: "0.65rem", color: "var(--text-muted)", textAlign: "right" }}>
                      {MONTHS_ABBR[s.month - 1]}
                    </span>
                    <div style={{ flex: 1 }}>
                      <SparkBar value={s.total_revenue} max={maxSeasonRev}
                        color={s.total_revenue / maxSeasonRev >= 0.85 ? "var(--accent-emerald)" :
                          s.total_revenue / maxSeasonRev >= 0.5 ? "var(--accent-cyan)" : "rgba(0,242,255,0.3)"}
                        height={14} />
                    </div>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-primary)", fontFamily: "var(--font-mono)", minWidth: 60, textAlign: "right" }}>
                      {fmtCurrency(s.total_revenue)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              {panelHeader(<BarChart3 size={16} style={{ color: "var(--accent-purple)" }} />, "Monthly Detail Table")}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.72rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-glass)" }}>
                    <th style={thStyle("left")}>Month</th>
                    <th style={thStyle("right")}>Revenue</th>
                    <th style={thStyle("right")}>Invoices</th>
                    <th style={thStyle("right")}>Avg Invoice</th>
                    <th style={thStyle("right")}>% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const totalRev = allSeasonality.reduce((s, m) => s + m.total_revenue, 0);
                    return allSeasonality.map(s => (
                      <tr key={s.month} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <td style={tdStyle("left")}>{MONTHS_FULL[s.month - 1]}</td>
                        <td style={tdStyle("right", true)}>{fmtCurrencyPrecise(s.total_revenue)}</td>
                        <td style={tdStyle("right", true)}>{fmtNum(s.invoice_count)}</td>
                        <td style={tdStyle("right", true)}>{fmtCurrency(s.avg_invoice_size)}</td>
                        <td style={tdStyle("right", true)}>
                          {totalRev > 0 ? ((s.total_revenue / totalRev) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>

              {/* Seasonality insight */}
              {allSeasonality.length > 0 && (() => {
                const sorted = [...allSeasonality].sort((a, b) => b.total_revenue - a.total_revenue);
                const peak = sorted[0];
                const trough = sorted[sorted.length - 1];
                return (
                  <div style={{
                    marginTop: "0.75rem", padding: "0.75rem",
                    background: "var(--bg-glass-hover)", borderRadius: 8,
                    fontSize: "0.68rem", color: "var(--text-secondary)",
                  }}>
                    <div style={{ marginBottom: "0.2rem" }}>
                      <span style={{ color: "var(--accent-emerald)", fontWeight: 600 }}>Peak:</span> {MONTHS_FULL[peak.month - 1]} ({fmtCurrencyPrecise(peak.total_revenue)}) — {(peak.total_revenue / trough.total_revenue).toFixed(1)}x the slowest
                    </div>
                    <div>
                      <span style={{ color: "var(--accent-red)", fontWeight: 600 }}>Trough:</span> {MONTHS_FULL[trough.month - 1]} ({fmtCurrencyPrecise(trough.total_revenue)})
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: INVOICE SIZES ═══ */}
      {activeTab === "sizes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              {panelHeader(<BarChart3 size={16} style={{ color: "var(--accent-cyan)" }} />, "Invoice Size Distribution")}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(data.sizes || []).map(s => (
                  <div key={s.bucket} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 70, fontSize: "0.65rem", color: "var(--text-muted)", textAlign: "right" }}>
                      {s.bucket}
                    </span>
                    <div style={{ flex: 1 }}>
                      <SparkBar value={s.invoice_count} max={Math.max(...(data.sizes || []).map(x => x.invoice_count))}
                        color="var(--accent-cyan)" height={18} />
                    </div>
                    <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", minWidth: 45, textAlign: "right" }}>
                      {s.pct_of_invoices}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              {panelHeader(<DollarSign size={16} style={{ color: "var(--accent-emerald)" }} />, "Revenue by Invoice Size")}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.72rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-glass)" }}>
                    <th style={thStyle("left")}>Bucket</th>
                    <th style={thStyle("right")}>Count</th>
                    <th style={thStyle("right")}>Revenue</th>
                    <th style={thStyle("right")}>% Invoices</th>
                    <th style={thStyle("right")}>% Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.sizes || []).map(s => (
                    <tr key={s.bucket} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <td style={tdStyle("left")}>{s.bucket}</td>
                      <td style={tdStyle("right", true)}>{fmtNum(s.invoice_count)}</td>
                      <td style={tdStyle("right", true)}>{fmtCurrencyPrecise(s.total_revenue)}</td>
                      <td style={tdStyle("right", true)}>{s.pct_of_invoices}%</td>
                      <td style={tdStyle("right", true)}>{s.pct_of_revenue}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Avg invoice size highlight */}
              <div style={{
                marginTop: "0.75rem", padding: "0.75rem",
                background: "var(--bg-glass-hover)", borderRadius: 8,
                fontSize: "0.68rem", color: "var(--text-secondary)",
              }}>
                <span style={{ fontWeight: 600, color: "var(--accent-cyan)" }}>Overall Avg:</span> {fmtCurrencyPrecise(ov.avg_invoice_size)} per invoice · {fmtNum(ov.total_invoices)} total invoices
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: RETENTION ═══ */}
      {activeTab === "retention" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              {panelHeader(<Repeat size={16} style={{ color: "var(--accent-cyan)" }} />, "Customer Retention Cohorts")}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(data.retention || []).map(c => {
                  const maxCount = Math.max(...(data.retention || []).map(x => x.customer_count));
                  return (
                    <div key={c.cohort} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 75, fontSize: "0.65rem", color: "var(--text-muted)", textAlign: "right", fontWeight: 600 }}>
                        {c.cohort}
                      </span>
                      <div style={{ flex: 1 }}>
                        <SparkBar value={c.customer_count} max={maxCount}
                          color="var(--accent-purple)" height={18} />
                      </div>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-primary)", fontFamily: "var(--font-mono)", minWidth: 45, textAlign: "right" }}>
                        {c.customer_count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              {panelHeader(<DollarSign size={16} style={{ color: "var(--accent-emerald)" }} />, "Retention Detail")}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.72rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-glass)" }}>
                    <th style={thStyle("left")}>Cohort</th>
                    <th style={thStyle("right")}>Customers</th>
                    <th style={thStyle("right")}>Revenue</th>
                    <th style={thStyle("right")}>Avg Orders</th>
                    <th style={thStyle("right")}>Avg Rev/Cust</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.retention || []).map(c => (
                    <tr key={c.cohort} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <td style={{ ...tdStyle("left"), fontWeight: 600 }}>{c.cohort}</td>
                      <td style={tdStyle("right", true)}>{fmtNum(c.customer_count)}</td>
                      <td style={tdStyle("right", true)}>{fmtCurrencyPrecise(c.cohort_revenue)}</td>
                      <td style={tdStyle("right", true)}>{c.avg_orders_per_customer}</td>
                      <td style={tdStyle("right", true)}>{fmtCurrencyPrecise(c.avg_revenue_per_customer)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Retention insight */}
              <div style={{
                marginTop: "0.75rem", padding: "0.75rem",
                background: "var(--bg-glass-hover)", borderRadius: 8,
                fontSize: "0.68rem", color: "var(--text-secondary)",
              }}>
                {(data.retention || []).length > 0 && (() => {
                  const oneTimers = data.retention?.find(c => c.cohort === "1 order");
                  const total = (data.retention || []).reduce((s, c) => s + c.customer_count, 0);
                  const repeatPct = total > 0 ? ((total - (oneTimers?.customer_count || 0)) / total * 100) : 0;
                  return (
                    <span>
                      <span style={{ fontWeight: 600, color: "var(--accent-purple)" }}>{repeatPct.toFixed(1)}%</span> of customers placed more than 1 order
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state fallback */}
      {!ov && !loading && !error && (
        <div className="glass-panel" style={{ padding: "3rem", textAlign: "center" }}>
          <AlertTriangle size={36} style={{ color: "var(--accent-amber)", marginBottom: "1rem" }} />
          <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>
            No sales data available
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
            Check that invoice_analysis.db is accessible
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared table styles ───

const thStyle = (align: "left" | "right" = "left"): React.CSSProperties => ({
  textAlign: align,
  padding: "0.4rem 0.6rem",
  fontSize: "0.58rem",
  fontWeight: 700,
  color: "var(--text-muted)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  whiteSpace: "nowrap" as const,
});

const tdStyle = (align: "left" | "right" = "left", mono = false): React.CSSProperties => ({
  textAlign: align,
  padding: "0.35rem 0.6rem",
  fontSize: "0.7rem",
  fontFamily: mono ? "var(--font-mono)" : "inherit",
});
