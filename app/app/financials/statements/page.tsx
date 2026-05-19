"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Download,
  ChevronLeft,
  Loader2,
  AlertTriangle,
  Landmark,
  CreditCard,
  Building2,
} from "lucide-react";

// ─── Types ───

interface StatementSummary {
  forensic_statement_file: string;
  bank: string;
  bank_label: string;
  account: string;
  account_extracted: string;
  year_extracted: string;
  start_date: string;
  end_date: string;
  txn_count: number;
  pdf_available: boolean;
  pdf_count: number | null;
}

interface StatementDetail {
  success: boolean;
  file: string;
  pdf_path: string | null;
  bank: string;
  bank_label: string;
  account: string;
  account_type: string;
  start_date: string;
  end_date: string;
  total_debits: number;
  total_credits: number;
  ending_balance: number;
  txn_count: number;
  transactions: StatementTransaction[];
}

interface StatementTransaction {
  rosettastone_row_number: number;
  date: string;
  description: string;
  transaction_type: string;
  amount: number;
  running_balance: number;
  forensic_page: string;
}

interface StatementsApiResponse {
  success: boolean;
  total_statements: number;
  grouped: Record<string, StatementSummary[]>;
  list: StatementSummary[];
}

// ─── Helpers ───

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

function fmtDate(d: string): string {
  if (!d) return "—";
  const date = new Date(d + (d.length <= 10 ? "T00:00:00" : ""));
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function bankIcon(bank: string) {
  if (bank.includes("CC") || bank.includes("Credit"))
    return <CreditCard size={16} style={{ color: "var(--accent-cyan)" }} />;
  if (bank.includes("Fifth Third"))
    return <Building2 size={16} style={{ color: "var(--accent-orange)" }} />;
  return <Landmark size={16} style={{ color: "var(--accent-purple)" }} />;
}

// ─── Styles ───

const styles = {
  page: {
    padding: "2rem",
    maxWidth: 1400,
    margin: "0 auto",
    minHeight: "100vh",
  } as React.CSSProperties,

  header: {
    marginBottom: "1.5rem",
  } as React.CSSProperties,

  title: {
    fontSize: "1.75rem",
    fontWeight: 700,
    fontFamily: "var(--font-heading)",
    margin: "0 0 0.25rem 0",
    color: "var(--text-primary)",
  } as React.CSSProperties,

  subtitle: {
    color: "var(--text-secondary)",
    fontSize: "0.875rem",
    margin: 0,
  } as React.CSSProperties,

  bankGroupHeader: {
    fontSize: "1.1rem",
    fontWeight: 600,
    fontFamily: "var(--font-heading)",
    color: "var(--text-primary)",
    marginBottom: "0.75rem",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  } as React.CSSProperties,

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "0.75rem",
    marginBottom: "2rem",
  } as React.CSSProperties,

  statementCard: (selected: boolean): React.CSSProperties => ({
    background: selected ? "var(--bg-glass-hover)" : "var(--bg-glass)",
    backdropFilter: "blur(var(--glass-blur))",
    WebkitBackdropFilter: "blur(var(--glass-blur))",
    border: selected
      ? "1px solid var(--border-glass-active)"
      : "var(--glass-border)",
    borderRadius: 10,
    padding: "1rem 1.25rem",
    cursor: "pointer",
    transition: "all 200ms ease",
  }),

  cardRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  } as React.CSSProperties,

  cardAccount: {
    fontSize: "0.9rem",
    fontWeight: 600,
    fontFamily: "var(--font-mono)",
    color: "var(--text-primary)",
  } as React.CSSProperties,

  cardDate: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    fontFamily: "var(--font-mono)",
  } as React.CSSProperties,

  cardCount: {
    fontSize: "0.7rem",
    color: "var(--text-muted)",
    fontFamily: "var(--font-mono)",
    marginTop: "0.25rem",
  } as React.CSSProperties,

  cardBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "0.65rem",
    fontWeight: 600,
    color: "var(--accent-cyan)",
    background: "rgba(0, 242, 255, 0.1)",
    padding: "2px 8px",
    borderRadius: 4,
  } as React.CSSProperties,

  detailHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "1.5rem",
    flexWrap: "wrap",
    gap: "1rem",
  } as React.CSSProperties,

  detailTitleSection: {
    flex: 1,
  } as React.CSSProperties,

  detailBankLabel: {
    fontSize: "0.75rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--text-secondary)",
    marginBottom: "0.25rem",
  } as React.CSSProperties,

  detailTitle: {
    fontSize: "1.5rem",
    fontWeight: 700,
    fontFamily: "var(--font-heading)",
    color: "var(--text-primary)",
  } as React.CSSProperties,

  detailSubtitle: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    marginTop: "0.25rem",
  } as React.CSSProperties,

  statRow: {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
    marginBottom: "1.5rem",
  } as React.CSSProperties,

  stat: {
    background: "var(--bg-glass)",
    backdropFilter: "blur(var(--glass-blur))",
    WebkitBackdropFilter: "blur(var(--glass-blur))",
    border: "var(--glass-border)",
    borderRadius: 8,
    padding: "0.75rem 1rem",
    minWidth: 140,
    flex: 1,
  } as React.CSSProperties,

  statLabel: {
    fontSize: "0.65rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "var(--text-muted)",
    marginBottom: "0.25rem",
  } as React.CSSProperties,

  statValue: {
    fontSize: "1.1rem",
    fontWeight: 700,
    fontFamily: "var(--font-mono)",
    color: "var(--text-primary)",
  } as React.CSSProperties,

  statNegative: {
    fontSize: "1.1rem",
    fontWeight: 700,
    fontFamily: "var(--font-mono)",
    color: "var(--accent-red)",
  } as React.CSSProperties,

  statPositive: {
    fontSize: "1.1rem",
    fontWeight: 700,
    fontFamily: "var(--font-mono)",
    color: "var(--accent-emerald)",
  } as React.CSSProperties,

  btn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "var(--bg-glass)",
    backdropFilter: "blur(var(--glass-blur))",
    WebkitBackdropFilter: "blur(var(--glass-blur))",
    border: "var(--glass-border)",
    borderRadius: 8,
    padding: "0.5rem 1rem",
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    cursor: "pointer",
    transition: "all 200ms ease",
    fontFamily: "inherit",
  } as React.CSSProperties,

  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))",
    border: "none",
    borderRadius: 8,
    padding: "0.5rem 1.25rem",
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "#fff",
    cursor: "pointer",
    transition: "all 200ms ease",
    fontFamily: "inherit",
  } as React.CSSProperties,

  tableContainer: {
    overflowX: "auto",
  } as React.CSSProperties,

  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "0.8rem",
  },

  th: (align: "left" | "right" = "left"): React.CSSProperties => ({
    textAlign: align,
    padding: "0.6rem 0.75rem",
    fontSize: "0.65rem",
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    whiteSpace: "nowrap",
    borderBottom: "1px solid var(--border-glass)",
  }),

  td: (
    align: "left" | "right" = "left",
    mono = false,
    highlight = false
  ): React.CSSProperties => ({
    textAlign: align,
    padding: "0.5rem 0.75rem",
    fontSize: "0.8rem",
    fontFamily: mono ? "var(--font-mono)" : "inherit",
    borderBottom: "1px solid var(--border-glass)",
    background: highlight ? "var(--bg-glass-hover)" : "transparent",
  }),

  amountPositive: {
    color: "var(--accent-emerald)",
  } as React.CSSProperties,

  amountNegative: {
    color: "var(--accent-red)",
  } as React.CSSProperties,

  transactionTypeBadge: (type: string): React.CSSProperties => ({
    display: "inline-block",
    padding: "1px 6px",
    borderRadius: 4,
    fontSize: "0.65rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    background:
      type === "CC Debit"
        ? "rgba(245, 158, 11, 0.15)"
        : type === "Deposit"
        ? "rgba(16, 185, 129, 0.15)"
        : type === "Withdrawl"
        ? "rgba(239, 68, 68, 0.15)"
        : type === "CC Credit"
        ? "rgba(59, 130, 246, 0.15)"
        : "rgba(255,255,255,0.06)",
    color:
      type === "CC Debit"
        ? "var(--accent-orange)"
        : type === "Deposit"
        ? "var(--accent-emerald)"
        : type === "Withdrawl"
        ? "var(--accent-red)"
        : type === "CC Credit"
        ? "#3b82f6"
        : "var(--text-secondary)",
  }),

  loadingPanel: {
    padding: "3rem",
    textAlign: "center",
    color: "var(--text-muted)",
  } as React.CSSProperties,

  errorPanel: {
    padding: "2rem",
    textAlign: "center",
  } as React.CSSProperties,
};

// ─── Component ───

export default function BankStatementsPage() {
  const [statements, setStatements] = useState<StatementsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail view state
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [detail, setDetail] = useState<StatementDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ─── Fetch statement list ───

  const fetchStatements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/financials/statements");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setStatements(json);
    } catch (e: any) {
      setError(e.message || "Failed to load statements");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatements();
  }, [fetchStatements]);

  // ─── Fetch statement detail ───

  const openStatement = useCallback(async (file: string) => {
    setSelectedFile(file);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetch(
        `/api/financials/statements?file=${encodeURIComponent(file)}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setDetail(json);
    } catch (e: any) {
      setDetail({ success: false } as any);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = () => {
    setSelectedFile(null);
    setDetail(null);
  };

  // ─── Download PDF ───

  const downloadPdf = (file: string) => {
    window.open(
      `/api/financials/statements?file=${encodeURIComponent(file)}&pdf=true`,
      "_blank"
    );
  };

  // ─── Loading state ───

  if (loading) {
    return (
      <div style={styles.page}>
        <div className="glass-panel" style={styles.loadingPanel}>
          <Loader2
            size={24}
            className="animate-spin"
            style={{ margin: "0 auto 1rem", display: "block" }}
          />
          <div>Loading bank statements...</div>
          <div style={{ fontSize: "0.75rem", marginTop: "0.5rem" }}>
            Scanning RosettaStone SSOT
          </div>
        </div>
      </div>
    );
  }

  // ─── Error state ───

  if (error) {
    return (
      <div style={styles.page}>
        <div className="glass-panel" style={styles.errorPanel}>
          <AlertTriangle
            size={28}
            style={{
              color: "var(--accent-orange)",
              margin: "0 auto 0.75rem",
              display: "block",
            }}
          />
          <div
            style={{
              fontSize: "0.875rem",
              color: "var(--text-secondary)",
              marginBottom: "0.5rem",
            }}
          >
            Unable to load bank statements
          </div>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0 0 1rem" }}>
            {error}
          </p>
          <button onClick={fetchStatements} style={styles.btn}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ─── Detail view ───

  if (selectedFile && (detailLoading || detail)) {
    return (
      <div style={styles.page}>
        {/* Back button */}
        <button
          onClick={closeDetail}
          style={{
            ...styles.btn,
            marginBottom: "1.5rem",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.borderColor = "var(--border-glass-active)";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.borderColor = "";
          }}
        >
          <ChevronLeft size={16} />
          Back to Statement List
        </button>

        {detailLoading && (
          <div className="glass-panel" style={styles.loadingPanel}>
            <Loader2 size={24} className="animate-spin" style={{ margin: "0 auto 1rem", display: "block" }} />
            <div>Loading statement transactions...</div>
          </div>
        )}

        {detail && detail.success === false && (
          <div className="glass-panel" style={styles.errorPanel}>
            <AlertTriangle size={28} style={{ color: "var(--accent-orange)", margin: "0 auto 0.75rem", display: "block" }} />
            <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              Failed to load statement detail
            </div>
          </div>
        )}

        {detail && detail.success !== false && (
          <>
            {/* Detail Header */}
            <div style={styles.detailHeader}>
              <div style={styles.detailTitleSection}>
                <div style={styles.detailBankLabel}>
                  {bankIcon(detail.bank_label || detail.bank)}
                  <span style={{ marginLeft: "0.5rem" }}>
                    {detail.bank_label || detail.bank}
                  </span>
                </div>
                <div style={styles.detailTitle}>
                  Account {detail.account}
                  {detail.account_type ? ` · ${detail.account_type}` : ""}
                </div>
                <div style={styles.detailSubtitle}>
                  {fmtDate(detail.start_date)} — {fmtDate(detail.end_date)}
                  {" · "}
                  {detail.txn_count} transactions
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                {detail.pdf_path && (
                  <button
                    onClick={() => downloadPdf(detail.file)}
                    style={styles.btnPrimary}
                  >
                    <Download size={14} />
                    Download Original PDF
                  </button>
                )}
              </div>
            </div>

            {/* Summary Stats */}
            <div style={styles.statRow}>
              <div style={styles.stat}>
                <div style={styles.statLabel}>Total Credits</div>
                <div style={styles.statPositive}>{fmtCurrency(detail.total_credits)}</div>
              </div>
              <div style={styles.stat}>
                <div style={styles.statLabel}>Total Debits</div>
                <div style={styles.statNegative}>{fmtCurrency(detail.total_debits)}</div>
              </div>
              <div style={styles.stat}>
                <div style={styles.statLabel}>Ending Balance</div>
                <div
                  style={
                    detail.ending_balance >= 0
                      ? styles.statPositive
                      : styles.statNegative
                  }
                >
                  {fmtCurrency(detail.ending_balance)}
                </div>
              </div>
              <div style={styles.stat}>
                <div style={styles.statLabel}>Transactions</div>
                <div style={styles.statValue}>{detail.txn_count}</div>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="glass-panel" style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th("left")}>Date</th>
                    <th style={styles.th("left")}>Description</th>
                    <th style={styles.th("right")}>Debit</th>
                    <th style={styles.th("right")}>Credit</th>
                    <th style={styles.th("right")}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.transactions.map((txn: StatementTransaction, i: number) => (
                    <tr
                      key={txn.rosettastone_row_number || i}
                      style={{
                        transition: "background 100ms",
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLElement).closest("tr")!.style.background =
                          "var(--bg-glass-hover)";
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLElement).closest("tr")!.style.background = "";
                      }}
                    >
                      <td style={styles.td("left", true)}>{txn.date}</td>
                      <td style={styles.td("left")}>
                        <span
                          style={styles.transactionTypeBadge(txn.transaction_type)}
                        >
                          {txn.transaction_type}
                        </span>
                        {" "}
                        {txn.description}
                      </td>
                      <td style={styles.td("right", true)}>
                        {txn.amount < 0 ? (
                          <span style={styles.amountNegative}>
                            {fmtCurrency(Math.abs(txn.amount))}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                      <td style={styles.td("right", true)}>
                        {txn.amount > 0 ? (
                          <span style={styles.amountPositive}>
                            {fmtCurrency(txn.amount)}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                      <td
                        style={styles.td(
                          "right",
                          true,
                          i === detail.transactions.length - 1
                        )}
                      >
                        <span
                          style={{
                            color:
                              txn.running_balance >= 0
                                ? "var(--text-primary)"
                                : "var(--accent-red)",
                            fontWeight:
                              i === detail.transactions.length - 1 ? 700 : 400,
                          }}
                        >
                          {fmtCurrency(txn.running_balance)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    );
  }

  // ─── List view ───

  const grouped = statements?.grouped || {};

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Bank & Credit Card Statements</h1>
        <p style={styles.subtitle}>
          {statements?.total_statements || 0} statements ·{" "}
          {Object.keys(grouped).length} banks · RosettaStone SSOT
        </p>
      </div>

      {/* Bank Groups */}
      {Object.entries(grouped).map(([bankLabel, stmts]) => (
        <div key={bankLabel}>
          <div style={styles.bankGroupHeader}>
            {bankIcon(bankLabel)}
            {bankLabel}
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 400 }}>
              ({stmts.length} statements)
            </span>
          </div>
          <div style={styles.grid}>
            {stmts.map((s) => (
              <div
                key={s.forensic_statement_file}
                className="glass-panel-hover"
                style={styles.statementCard(
                  selectedFile === s.forensic_statement_file
                )}
                onClick={() => openStatement(s.forensic_statement_file)}
              >
                <div style={styles.cardRow}>
                  <div>
                    <div style={styles.cardAccount}>
                      {bankIcon(bankLabel)}
                      <span style={{ marginLeft: "0.5rem" }}>
                        Account {s.account}
                      </span>
                    </div>
                    <div style={styles.cardDate}>
                      {fmtDate(s.start_date)} — {fmtDate(s.end_date)}
                    </div>
                  </div>
                  {s.pdf_available && (
                    <div style={styles.cardBadge}>
                      <FileText size={10} />
                      PDF
                    </div>
                  )}
                </div>
                <div style={styles.cardCount}>
                  {s.txn_count} transactions
                  {s.pdf_available && (
                    <span
                      style={{
                        marginLeft: "0.5rem",
                        color: "var(--accent-cyan)",
                        cursor: "pointer",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadPdf(s.forensic_statement_file);
                      }}
                      title="Download PDF"
                    >
                      <Download size={10} style={{ display: "inline" }} />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Empty state */}
      {Object.keys(grouped).length === 0 && (
        <div className="glass-panel" style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
          <FileText size={28} style={{ margin: "0 auto 0.75rem", display: "block", opacity: 0.4 }} />
          <div style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>
            No statements found
          </div>
          <p style={{ fontSize: "0.8rem", margin: 0 }}>
            No forensic statement files are linked to transactions in the RosettaStone.
          </p>
        </div>
      )}
    </div>
  );
}
