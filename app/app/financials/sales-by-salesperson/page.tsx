"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
    DollarSign, TrendingUp, Users, ShoppingCart,
    Loader2, AlertTriangle, ChevronUp, ChevronDown,
    Calendar
} from "lucide-react";

// ─── Types ───

interface SalesSummary {
    totalGross: number;
    orderCount: number;
    activeCustomers: number;
}

interface MonthlyRow {
    customer: string;
    months: Record<string, number>;
    total: number;
}

interface YearlyRow {
    customer: string;
    years: Record<string, number>;
    total: number;
}

interface SalesApiResponse {
    success: boolean;
    view: "monthly" | "yearly";
    salesperson: string;
    year?: number;
    month?: number;
    summary: SalesSummary;
    salespeople: string[];
    availableYears: number[];
    rows: (MonthlyRow | YearlyRow)[];
    totals: Record<string, number>;
}

type ViewMode = "monthly" | "yearly";
type SortDirection = "asc" | "desc";
type SortKey = "customer" | "total" | string;

const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// ─── Helpers ───

function fmtCurrency(n: number | null | undefined): string {
    if (n == null) return "—";
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(n);
}

function fmtCurrencyPrecise(n: number | null | undefined): string {
    if (n == null) return "—";
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(n);
}

// ─── Styles (reusable inline helpers matching existing financials styling) ───

const styles = {
    select: {
        background: "var(--bg-glass)",
        border: "var(--glass-border)",
        borderRadius: 6,
        padding: "6px 12px",
        fontSize: "0.8rem",
        color: "var(--text-primary)",
        outline: "none",
        cursor: "pointer",
        fontFamily: "inherit",
    } as React.CSSProperties,

    btnTab: (active: boolean): React.CSSProperties => ({
        background: active ? "var(--accent-cyan)" : "var(--bg-glass)",
        color: active ? "#000" : "var(--text-secondary)",
        border: active ? "1px solid var(--accent-cyan)" : "var(--glass-border)",
        borderRadius: 6,
        padding: "6px 16px",
        fontSize: "0.8rem",
        fontWeight: 600,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 6,
        transition: "all 0.15s",
    }),

    th: (align: "left" | "right" = "left"): React.CSSProperties => ({
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
    }),

    td: (align: "left" | "right" = "left", mono = false): React.CSSProperties => ({
        textAlign: align,
        padding: "0.5rem 0.75rem",
        fontSize: "0.8rem",
        fontFamily: mono ? "var(--font-mono)" : "inherit",
        borderBottom: "1px solid var(--border-glass)",
    }),

    tdTotal: (align: "left" | "right" = "left"): React.CSSProperties => ({
        textAlign: align,
        padding: "0.5rem 0.75rem",
        fontSize: "0.8rem",
        fontWeight: 700,
        fontFamily: "var(--font-mono)",
        borderTop: "1px solid var(--border-glass)",
        borderBottom: "none",
        background: "var(--bg-glass-hover)",
    }),
};

// ─── Component ───

export default function SalesBySalespersonPage() {
    const [view, setView] = useState<ViewMode>("monthly");
    const [salesperson, setSalesperson] = useState("all");
    const [year, setYear] = useState<number>(2019);
    const [month, setMonth] = useState<number>(1);
    const [data, setData] = useState<SalesApiResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<SortKey>("customer");
    const [sortDir, setSortDir] = useState<SortDirection>("asc");

    // ─── Fetch data ───

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                view,
                salesperson,
                year: String(year),
            });
            if (view === "monthly") {
                params.set("month", String(month).padStart(2, "0"));
            }
            const url = `/api/financials/sales-by-salesperson?${params}`;
            const res = await fetch(url);
            const json = await res.json();
            if (!res.ok) {
                throw new Error(json.error || `HTTP ${res.status}`);
            }
            setData(json);
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Failed to load sales data";
            setError(msg);
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [view, salesperson, year, month]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ─── Derived values ───

    const salespeople = useMemo(() => {
        if (!data?.salespeople) return [];
        return ["all", ...data.salespeople];
    }, [data]);

    const availableYears = useMemo(() => {
        if (data?.availableYears?.length) return data.availableYears;
        // Fallback: Rowboat QBO data range
        const years: number[] = [];
        for (let y = 2016; y <= 2024; y++) years.push(y);
        return years;
    }, [data]);

    // ─── Sorting ───

    const sortedRows = useMemo(() => {
        const rows = data?.rows || [];
        if (!sortKey) return rows;

        const sorted = [...rows].sort((a, b) => {
            let va: string | number;
            let vb: string | number;

            if (sortKey === "customer") {
                va = (a as MonthlyRow).customer || "";
                vb = (b as MonthlyRow).customer || "";
            } else if (sortKey === "total") {
                va = a.total;
                vb = b.total;
            } else if (view === "monthly") {
                va = (a as MonthlyRow).months?.[sortKey] ?? 0;
                vb = (b as MonthlyRow).months?.[sortKey] ?? 0;
            } else {
                va = (a as YearlyRow).years?.[sortKey] ?? 0;
                vb = (b as YearlyRow).years?.[sortKey] ?? 0;
            }

            if (typeof va === "string" && typeof vb === "string") {
                return sortDir === "asc"
                    ? va.localeCompare(vb, undefined, { sensitivity: "base" })
                    : vb.localeCompare(va, undefined, { sensitivity: "base" });
            }
            const na = Number(va) || 0;
            const nb = Number(vb) || 0;
            return sortDir === "asc" ? na - nb : nb - na;
        });
        return sorted;
    }, [data?.rows, sortKey, sortDir, view]);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(prev => prev === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
    };

    const sortIndicator = (key: SortKey) => {
        if (sortKey !== key) return null;
        return sortDir === "asc"
            ? <ChevronUp size={10} style={{ display: "inline", marginLeft: 2 }} />
            : <ChevronDown size={10} style={{ display: "inline", marginLeft: 2 }} />;
    };

    // ─── Stat card helper ───

    const statCard = (label: string, value: string | number, icon: React.ReactNode, color: string) => (
        <div className="glass-panel" style={{ padding: "1.25rem", flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: `${color}20`, border: `1px solid ${color}40`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}>{icon}</div>
                <div>
                    <div style={{
                        fontSize: "0.7rem", color: "var(--text-muted)",
                        fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
                    }}>{label}</div>
                    <div style={{
                        fontSize: "1.25rem", fontWeight: 700,
                        fontFamily: "var(--font-mono)", color: "var(--text-primary)",
                    }}>{value}</div>
                </div>
            </div>
        </div>
    );

    // ─── Column headers ───

    const monthCols = MONTHS.map((m, i) => String(i + 1));
    const yearCols = availableYears.map(String);

    const columnKeys: SortKey[] = view === "monthly"
        ? ["customer", ...monthCols, "total"]
        : ["customer", ...yearCols, "total"];

    const columnLabels: Record<string, string> = view === "monthly"
        ? Object.fromEntries(MONTHS.map((m, i) => [String(i + 1), m]))
        : Object.fromEntries(availableYears.map(y => [String(y), String(y)]));

    // ─── Check if data is empty ───

    const isEmpty = !loading && !error && data && (!data.rows || data.rows.length === 0);

    return (
        <div style={{ padding: "2rem", maxWidth: 1400, margin: "0 auto" }}>
            {/* Header */}
            <div style={{ marginBottom: "1.5rem" }}>
                <h1 style={{
                    fontSize: "1.75rem", fontWeight: 700,
                    fontFamily: "var(--font-heading)", margin: "0 0 0.25rem 0",
                }}>
                    Sales by Salesperson
                </h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>
                    Revenue attribution by customer and salesperson · RC-2026
                </p>
            </div>

            {/* ─── Filters bar ─── */}
            <div className="glass-panel" style={{ padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
                <div style={{
                    display: "flex", gap: "1rem", alignItems: "center",
                    flexWrap: "wrap",
                }}>
                    {/* View toggle */}
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                        <button
                            onClick={() => setView("monthly")}
                            style={styles.btnTab(view === "monthly")}
                        >
                            <Calendar size={14} /> Monthly
                        </button>
                        <button
                            onClick={() => setView("yearly")}
                            style={styles.btnTab(view === "yearly")}
                        >
                            <TrendingUp size={14} /> Yearly
                        </button>
                    </div>

                    {/* Salesperson dropdown */}
                    <select
                        value={salesperson}
                        onChange={e => setSalesperson(e.target.value)}
                        style={styles.select}
                    >
                        <option value="all">All Salespeople</option>
                        {data?.salespeople?.map(sp => (
                            <option key={sp} value={sp}>{sp}</option>
                        ))}
                    </select>

                    {/* Year selector */}
                    <select
                        value={year}
                        onChange={e => setYear(Number(e.target.value))}
                        style={styles.select}
                    >
                        {availableYears.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>

                    {/* Month selector (monthly only) */}
                    {view === "monthly" && (
                        <select
                            value={month}
                            onChange={e => setMonth(Number(e.target.value))}
                            style={styles.select}
                        >
                            {MONTHS.map((m, i) => (
                                <option key={i + 1} value={i + 1}>{m}</option>
                            ))}
                        </select>
                    )}

                    {/* Refresh button */}
                    <button
                        onClick={fetchData}
                        style={{
                            border: "var(--glass-border)",
                            borderRadius: 6,
                            padding: "6px 14px",
                            background: "var(--bg-glass)",
                            color: "var(--text-primary)",
                            fontWeight: 600,
                            fontSize: "0.8rem",
                            cursor: "pointer",
                            marginLeft: "auto",
                        }}
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* ─── Loading state ─── */}
            {loading && (
                <div className="glass-panel" style={{
                    padding: "3rem", textAlign: "center", color: "var(--text-muted)",
                }}>
                    <Loader2 size={24} className="animate-spin" style={{ margin: "0 auto 1rem" }} />
                    <div>Loading sales data...</div>
                    <div style={{ fontSize: "0.75rem", marginTop: "0.5rem" }}>
                        Connecting to sales-by-salesperson API
                    </div>
                </div>
            )}

            {/* ─── Error state ─── */}
            {!loading && error && (
                <div className="glass-panel" style={{
                    padding: "2rem", textAlign: "center",
                }}>
                    <AlertTriangle size={28} style={{
                        color: "var(--accent-amber, #f59e0b)", margin: "0 auto 0.75rem",
                    }} />
                    <div style={{
                        fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem",
                    }}>
                        Unable to load sales data
                    </div>
                    <p style={{
                        fontSize: "0.8rem", color: "var(--text-muted)", margin: "0 0 1rem 0",
                    }}>
                        {error}
                    </p>
                    <button
                        onClick={fetchData}
                        style={{
                            border: "var(--glass-border)",
                            borderRadius: 6,
                            padding: "6px 16px",
                            background: "var(--bg-glass)",
                            color: "var(--accent-cyan)",
                            fontWeight: 600,
                            fontSize: "0.8rem",
                            cursor: "pointer",
                        }}
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* ─── Empty state ─── */}
            {isEmpty && (
                <div className="glass-panel" style={{
                    padding: "2rem", textAlign: "center", color: "var(--text-muted)",
                }}>
                    <AlertTriangle size={28} style={{
                        color: "var(--accent-amber, #f59e0b)", margin: "0 auto 0.75rem",
                    }} />
                    <div style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                        No sales data found for the current filter
                    </div>
                    <p style={{ fontSize: "0.8rem", margin: 0 }}>
                        Try changing the year, salesperson, or view mode.
                    </p>
                </div>
            )}

            {/* ─── Data display ─── */}
            {!loading && !error && data && !isEmpty && (
                <>
                    {/* Summary cards */}
                    <div style={{
                        display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem",
                    }}>
                        {statCard(
                            "Total Gross",
                            fmtCurrency(data.summary?.totalGross),
                            <DollarSign size={18} style={{ color: "var(--accent-cyan)" }} />,
                            "var(--accent-cyan)",
                        )}
                        {statCard(
                            "Order Count",
                            data.summary?.orderCount ?? "—",
                            <ShoppingCart size={18} style={{ color: "var(--accent-purple)" }} />,
                            "var(--accent-purple)",
                        )}
                        {statCard(
                            "Active Customers",
                            data.summary?.activeCustomers ?? "—",
                            <Users size={18} style={{ color: "var(--accent-emerald)" }} />,
                            "var(--accent-emerald)",
                        )}
                    </div>

                    {/* Results table */}
                    <div className="glass-panel" style={{ overflowX: "auto" }}>
                        <table style={{
                            width: "100%",
                            minWidth: view === "monthly" ? 900 : 600,
                            borderCollapse: "collapse",
                            fontSize: "0.8rem",
                        }}>
                            <thead>
                                <tr>
                                    {columnKeys.map(key => (
                                        <th
                                            key={key}
                                            onClick={() => toggleSort(key)}
                                            style={styles.th(key === "customer" ? "left" : "right")}
                                        >
                                            {key === "customer"
                                                ? "Customer"
                                                : key === "total"
                                                    ? "Total"
                                                    : (columnLabels[key] || key)}
                                            {sortIndicator(key)}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedRows.map((row, ri) => (
                                    <tr key={(row as MonthlyRow).customer || ri}>
                                        {columnKeys.map(key => {
                                            const isRight = key !== "customer";
                                            if (key === "customer") {
                                                return (
                                                    <td key={key} style={styles.td("left")}>
                                                        {(row as MonthlyRow).customer || "—"}
                                                    </td>
                                                );
                                            }
                                            if (key === "total") {
                                                return (
                                                    <td key={key} style={{
                                                        ...styles.td("right", true),
                                                        fontWeight: 600,
                                                    }}>
                                                        {fmtCurrencyPrecise(row.total)}
                                                    </td>
                                                );
                                            }
                                            // Month or year column
                                            let cellVal: number | null = null;
                                            if (view === "monthly") {
                                                cellVal = (row as MonthlyRow).months?.[key] ?? null;
                                            } else {
                                                cellVal = (row as YearlyRow).years?.[key] ?? null;
                                            }
                                            return (
                                                <td key={key} style={{
                                                    ...styles.td("right", true),
                                                    color: cellVal != null && cellVal < 0
                                                        ? "var(--accent-red, #ef4444)"
                                                        : "var(--text-primary)",
                                                }}>
                                                    {fmtCurrencyPrecise(cellVal)}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                            {/* Totals row */}
                            {data.totals && (
                                <tfoot>
                                    <tr>
                                        {columnKeys.map(key => {
                                            const isRight = key !== "customer";
                                            if (key === "customer") {
                                                return (
                                                    <td key={key} style={{
                                                        ...styles.tdTotal("left"),
                                                        fontFamily: "inherit",
                                                    }}>
                                                        TOTAL
                                                    </td>
                                                );
                                            }
                                            if (key === "total") {
                                                return (
                                                    <td key={key} style={styles.tdTotal("right")}>
                                                        {fmtCurrencyPrecise(data.totals[key] ?? 0)}
                                                    </td>
                                                );
                                            }
                                            const tVal = data.totals[key] ?? null;
                                            return (
                                                <td key={key} style={{
                                                    ...styles.tdTotal("right"),
                                                    color: tVal != null && tVal < 0
                                                        ? "var(--accent-red, #ef4444)"
                                                        : "var(--text-primary)",
                                                }}>
                                                    {fmtCurrencyPrecise(tVal)}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>

                    {/* Filter context */}
                    <div style={{
                        marginTop: "0.75rem",
                        fontSize: "0.7rem",
                        color: "var(--text-muted)",
                    }}>
                        {sortedRows.length} customers · {view === "monthly"
                            ? `${MONTHS[month - 1]} ${year}`
                            : `${availableYears[0]}–${availableYears[availableYears.length - 1]}`}
                        {salesperson !== "all" && ` · Salesperson: ${salesperson}`}
                    </div>
                </>
            )}
        </div>
    );
}
