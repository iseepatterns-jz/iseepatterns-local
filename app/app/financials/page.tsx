"use client";

import { useState, useEffect, useCallback } from "react";
import {
    DollarSign, TrendingDown, TrendingUp, FileText,
    Building2, Search, ChevronDown, ChevronRight,
    Loader2, Calendar, AlertTriangle
} from "lucide-react";

interface SummaryData {
    transactions: number;
    accounts: number;
    taxReturns: number;
    totalDebits: number;
    totalCredits: number;
    taxYears: number[];
}

interface TaxReturn {
    filing_id: string;
    tax_year: number;
    form_type: string;
    filing_entity: string;
    filing_state: string;
    gross_income: number | null;
    cost_of_goods_sold: number | null;
    gross_profit: number | null;
    total_deductions: number | null;
    net_income: number | null;
    officer_compensation: number | null;
    distributions: number | null;
    total_assets: number | null;
    source_file: string | null;
    notes: string | null;
    k1Details: K1Detail[];
}

interface K1Detail {
    partner_name: string;
    ownership_pct: number | null;
    ordinary_income: number | null;
    distributions: number | null;
}

interface Transaction {
    transaction_id: string;
    account_id: string;
    date: string;
    amount: number;
    description: string;
    counterparty: string;
    transaction_type: string;
    category: string;
}

function formatCurrency(n: number | null | undefined): string {
    if (n == null) return "—";
    return new Intl.NumberFormat("en-US", {
        style: "currency", currency: "USD",
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n);
}

type TabKey = "summary" | "taxes" | "transactions";

export default function FinancialsPage() {
    const [tab, setTab] = useState<TabKey>("summary");
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [taxReturns, setTaxReturns] = useState<TaxReturn[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [txnTotal, setTxnTotal] = useState(0);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [yearFilter, setYearFilter] = useState("");

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (tab === "summary") {
                const res = await fetch("/api/financials?view=summary");
                const data = await res.json();
                setSummary(data);
            } else if (tab === "taxes") {
                const params = new URLSearchParams({ view: "taxes" });
                if (yearFilter) params.set("year", yearFilter);
                const res = await fetch(`/api/financials?${params}`);
                const data = await res.json();
                setTaxReturns(data.results || []);
            } else if (tab === "transactions") {
                const params = new URLSearchParams({ view: "transactions" });
                if (search) params.set("q", search);
                if (yearFilter) params.set("year", yearFilter);
                const res = await fetch(`/api/financials?${params}`);
                const data = await res.json();
                setTransactions(data.results || []);
                setTxnTotal(data.total || 0);
            }
        } catch (e) {
            console.error("Financials fetch error:", e);
        } finally {
            setLoading(false);
        }
    }, [tab, search, yearFilter]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const statCard = (label: string, value: string | number, icon: React.ReactNode, color: string) => (
        <div className="glass-panel" style={{ padding: "1.25rem", flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: `${color}20`, border: `1px solid ${color}40`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}>{icon}</div>
                <div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {label}
                    </div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                        {value}
                    </div>
                </div>
            </div>
        </div>
    );

    const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
        { key: "summary", label: "Summary", icon: <TrendingUp size={14} /> },
        { key: "taxes", label: "Tax Returns", icon: <FileText size={14} /> },
        { key: "transactions", label: "Transactions", icon: <DollarSign size={14} /> },
    ];

    return (
        <div style={{ padding: "2rem", maxWidth: 1000, margin: "0 auto" }}>
            {/* Header */}
            <div style={{ marginBottom: "1.5rem" }}>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 700, fontFamily: "var(--font-heading)", margin: "0 0 0.25rem 0" }}>
                    Financials
                </h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>
                    Transactions, tax filings, and financial analysis · RC-2026
                </p>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
                {tabs.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        style={{
                            background: tab === t.key ? "var(--accent-cyan)" : "var(--bg-glass)",
                            color: tab === t.key ? "#000" : "var(--text-secondary)",
                            border: tab === t.key ? "1px solid var(--accent-cyan)" : "var(--glass-border)",
                            borderRadius: 6, padding: "6px 16px",
                            fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 6,
                            transition: "all 0.15s",
                        }}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                    <Loader2 size={24} className="animate-spin" style={{ margin: "0 auto 1rem" }} />
                    Loading financials...
                </div>
            ) : tab === "summary" && summary ? (
                <>
                    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
                        {statCard("Transactions", summary.transactions, <DollarSign size={18} style={{ color: "var(--accent-cyan)" }} />, "var(--accent-cyan)")}
                        {statCard("Accounts", summary.accounts, <Building2 size={18} style={{ color: "var(--accent-purple)" }} />, "var(--accent-purple)")}
                        {statCard("Tax Returns", summary.taxReturns, <FileText size={18} style={{ color: "var(--accent-amber, #f59e0b)" }} />, "var(--accent-amber, #f59e0b)")}
                    </div>
                    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
                        {statCard("Total Credits", formatCurrency(summary.totalCredits), <TrendingUp size={18} style={{ color: "var(--accent-emerald)" }} />, "var(--accent-emerald)")}
                        {statCard("Total Debits", formatCurrency(summary.totalDebits), <TrendingDown size={18} style={{ color: "var(--accent-red, #ef4444)" }} />, "var(--accent-red, #ef4444)")}
                    </div>

                    {/* Tax years */}
                    {summary.taxYears.length > 0 && (
                        <div className="glass-panel" style={{ padding: "1.25rem" }}>
                            <div style={{ fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--text-secondary)" }}>
                                Tax Returns on File
                            </div>
                            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                {summary.taxYears.map(yr => (
                                    <button key={yr} onClick={() => { setYearFilter(yr.toString()); setTab("taxes"); }}
                                        style={{
                                            background: "var(--bg-glass)", border: "var(--glass-border)",
                                            borderRadius: 6, padding: "4px 14px",
                                            fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
                                            color: "var(--accent-cyan)", fontFamily: "var(--font-mono)",
                                        }}>
                                        {yr}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {summary.transactions === 0 && summary.taxReturns === 0 && (
                        <div className="glass-panel" style={{ padding: "2rem", textAlign: "center", marginTop: "1.5rem" }}>
                            <AlertTriangle size={28} style={{ color: "var(--accent-amber, #f59e0b)", margin: "0 auto 0.75rem" }} />
                            <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                                No financial data ingested yet.
                            </div>
                            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>
                                Run the tax return ingestion script or import bank statements to populate this page.
                            </p>
                        </div>
                    )}
                </>
            ) : tab === "taxes" ? (
                <>
                    <div style={{ marginBottom: "1rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
                        <Calendar size={14} style={{ color: "var(--text-muted)" }} />
                        <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}
                            style={{
                                background: "var(--bg-glass)", border: "var(--glass-border)",
                                borderRadius: 6, padding: "4px 10px",
                                fontSize: "0.8rem", color: "var(--text-primary)",
                                outline: "none", cursor: "pointer",
                            }}>
                            <option value="">All Years</option>
                            {Array.from({ length: 15 }, (_, i) => 2011 + i).map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                    {taxReturns.length === 0 ? (
                        <div className="glass-panel" style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                            No tax returns found. Run the ingestion script to populate.
                        </div>
                    ) : (
                        taxReturns.map(tr => {
                            const isExpanded = expandedId === tr.filing_id;
                            return (
                                <div key={tr.filing_id} className="glass-panel" style={{ marginBottom: "0.75rem", cursor: "pointer" }}
                                    onClick={() => setExpandedId(isExpanded ? null : tr.filing_id)}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 1.25rem" }}>
                                        <div style={{
                                            fontSize: "1.25rem", fontWeight: 800, fontFamily: "var(--font-mono)",
                                            color: "var(--accent-cyan)", minWidth: 50,
                                        }}>{tr.tax_year}</div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                                                {tr.filing_entity || "Unknown Entity"}
                                            </div>
                                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                                Form {tr.form_type} · {tr.filing_state || "Federal"}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: "right", marginRight: "1rem" }}>
                                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Net Income</div>
                                            <div style={{
                                                fontSize: "1rem", fontWeight: 700, fontFamily: "var(--font-mono)",
                                                color: tr.net_income && tr.net_income < 0 ? "var(--accent-red, #ef4444)" : "var(--accent-emerald)",
                                            }}>{formatCurrency(tr.net_income)}</div>
                                        </div>
                                        {isExpanded ? <ChevronDown size={14} style={{ color: "var(--text-muted)" }} /> : <ChevronRight size={14} style={{ color: "var(--text-muted)" }} />}
                                    </div>
                                    {isExpanded && (
                                        <div style={{ borderTop: "1px solid var(--border-glass)", padding: "1rem 1.25rem" }}>
                                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1rem" }}>
                                                <div><div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Gross Income</div><div style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{formatCurrency(tr.gross_income)}</div></div>
                                                <div><div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>COGS</div><div style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{formatCurrency(tr.cost_of_goods_sold)}</div></div>
                                                <div><div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Gross Profit</div><div style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{formatCurrency(tr.gross_profit)}</div></div>
                                                <div><div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Deductions</div><div style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{formatCurrency(tr.total_deductions)}</div></div>
                                                <div><div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Officer Comp</div><div style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{formatCurrency(tr.officer_compensation)}</div></div>
                                                <div><div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Assets</div><div style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{formatCurrency(tr.total_assets)}</div></div>
                                            </div>
                                            {tr.k1Details?.length > 0 && (
                                                <>
                                                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>K-1 Distributions</div>
                                                    {tr.k1Details.map((k1, i) => (
                                                        <div key={i} style={{
                                                            display: "flex", justifyContent: "space-between",
                                                            padding: "4px 0", borderBottom: "1px solid var(--border-glass)",
                                                            fontSize: "0.8rem",
                                                        }}>
                                                            <span>{k1.partner_name} ({k1.ownership_pct ?? "?"}%)</span>
                                                            <span style={{ fontFamily: "var(--font-mono)" }}>
                                                                Ord: {formatCurrency(k1.ordinary_income)} · Dist: {formatCurrency(k1.distributions)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </>
                                            )}
                                            {tr.notes && <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.75rem" }}>{tr.notes}</p>}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </>
            ) : tab === "transactions" ? (
                <>
                    <div style={{ marginBottom: "1rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
                        <Search size={14} style={{ color: "var(--text-muted)" }} />
                        <input 
                            id="tx-search"
                            name="tx-search"
                            type="text" 
                            placeholder="Search transactions..."
                            value={search} onChange={e => setSearch(e.target.value)}
                            style={{
                                background: "var(--bg-glass)", border: "var(--glass-border)",
                                borderRadius: 6, padding: "4px 10px",
                                fontSize: "0.8125rem", color: "var(--text-primary)",
                                width: 250, outline: "none",
                            }} />
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{txnTotal} results</span>
                    </div>
                    {transactions.length === 0 ? (
                        <div className="glass-panel" style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                            No transactions found.
                        </div>
                    ) : (
                        <div className="glass-panel" style={{ overflow: "hidden" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                                <thead>
                                    <tr style={{ borderBottom: "1px solid var(--border-glass)" }}>
                                        {["Date", "Description", "Counterparty", "Amount", "Type"].map(h => (
                                            <th key={h} style={{
                                                textAlign: h === "Amount" ? "right" : "left",
                                                padding: "0.75rem 1rem",
                                                fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)",
                                                textTransform: "uppercase", letterSpacing: "0.05em",
                                            }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map(t => (
                                        <tr key={t.transaction_id} style={{ borderBottom: "1px solid var(--border-glass)" }}>
                                            <td style={{ padding: "0.6rem 1rem", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
                                                {t.date?.slice(0, 10)}
                                            </td>
                                            <td style={{ padding: "0.6rem 1rem", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {t.description || "—"}
                                            </td>
                                            <td style={{ padding: "0.6rem 1rem", color: "var(--text-secondary)" }}>
                                                {t.counterparty || "—"}
                                            </td>
                                            <td style={{
                                                padding: "0.6rem 1rem", textAlign: "right",
                                                fontFamily: "var(--font-mono)", fontWeight: 600,
                                                color: t.amount < 0 ? "var(--accent-red, #ef4444)" : "var(--accent-emerald)",
                                            }}>
                                                {formatCurrency(t.amount)}
                                            </td>
                                            <td style={{ padding: "0.6rem 1rem" }}>
                                                <span style={{
                                                    fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase",
                                                    background: "var(--bg-glass)", border: "var(--glass-border)",
                                                    padding: "2px 6px", borderRadius: 4,
                                                }}>
                                                    {t.transaction_type || t.category || "—"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            ) : null}
        </div>
    );
}
