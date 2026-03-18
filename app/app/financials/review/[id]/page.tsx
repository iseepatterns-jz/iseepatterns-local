"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { 
    Shield, ArrowLeft, Save, CheckCircle, 
    AlertTriangle, Filter, LayoutGrid, List,
    ChevronRight, ExternalLink, Loader2, Users, Tag
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface Transaction {
    id: number;
    date: string;
    description_raw: string;
    amount: number;
    page_number: number;
    player_id: number | null;
    player_name: string | null;
    final_account_id: string | null;
    notes: string | null;
    review_status: string;
    verification_status: string | null;
    nc_flag: number | null;
    evidence_url: string | null;
    master_id: number | null;
    rosetta_user: string | null;
    rosetta_account: string | null;
    rosetta_category: string | null;
    rosetta_company: string | null;
    match_score: number | null;
    match_reason: string | null;
}

interface Player {
    id: number;
    display_name: string;
}

export default function TransactionReviewPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params.id;
    
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [matching, setMatching] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [filter, setFilter] = useState("ALL");
    const [error, setError] = useState<string | null>(null);

    // Draggable Column State
    const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({
        "DATE": 80,
        "DESCRIPTION": 300,
        "AMOUNT": 100,
        "PAGE": 50,
        "ROSETTA MATCH": 240,
        "SCORE": 50,
        "REASON": 140,
        "ACCOUNT": 70,
        "PLAYER": 160,
        "DOC": 40,
        "STATUS": 100
    });

    const [isResizing, setIsResizing] = useState<string | null>(null);
    const startXRef = useState<number>(0)[0]; // We use a ref-like pattern for mouse tracking

    const fetchPlayers = useCallback(async () => {
        try {
            const res = await fetch("/api/players");
            const data = await res.json();
            setPlayers(data.players || []);
        } catch (e) {
            console.error("Fetch players error:", e);
        }
    }, []);

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/financials/transactions?session_id=${sessionId}`);
            const data = await res.json();
            
            if (Array.isArray(data)) {
                setTransactions(data);
            } else if (data.error) {
                setError(data.error);
                setTransactions([]);
            } else {
                setTransactions([]);
            }
        } catch (e) {
            console.error("Fetch transactions error:", e);
            setError("Failed to connect to forensic server");
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    }, [sessionId]);

    useEffect(() => {
        fetchTransactions();
        fetchPlayers();
    }, [fetchTransactions, fetchPlayers]);

    // Global Mouse Listeners for Resizing
    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            setColumnWidths(prev => {
                const currentWidth = prev[isResizing];
                const delta = e.movementX;
                const nextWidth = Math.max(30, currentWidth + delta);
                return { ...prev, [isResizing]: nextWidth };
            });
        };

        const handleMouseUp = () => {
            setIsResizing(null);
            document.body.style.cursor = "default";
            document.body.style.userSelect = "auto";
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isResizing]);

    const handleUpdate = async (ids: number[], updates: Partial<Transaction>) => {
        setSaving(true);
        try {
            const res = await fetch("/api/financials/transactions", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids, updates }),
            });
            if (res.ok) {
                setTransactions(prev => prev.map(t => 
                    ids.includes(t.id) ? { ...t, ...updates } : t
                ));
            }
        } catch (e) {
            console.error("Update failed:", e);
        } finally {
            setSaving(false);
        }
    };

    const runAutomatch = async () => {
        setMatching(true);
        try {
            const res = await fetch("/api/financials/automatch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId: parseInt(sessionId as string) }),
            });
            const result = await res.json();
            if (result.success) {
                await fetchTransactions(); // Refresh
                alert(`Automatch complete: ${result.matched_count} potential matches identified.`);
            } else {
                alert(result.error || "Automatch failed");
            }
        } catch (e) {
            console.error("Automatch failed:", e);
        } finally {
            setMatching(false);
        }
    };

    const approveAllMatched = async () => {
        const matchedPending = transactions.filter(t => 
            t.verification_status === "MATCHED" && t.review_status !== "REVIEWED"
        );
        
        if (matchedPending.length === 0) {
            alert("No new matches to approve.");
            return;
        }

        if (!confirm(`Approve all ${matchedPending.length} automatically matched records?`)) return;

        const ids = matchedPending.map(t => t.id);
        await handleUpdate(ids, { review_status: "REVIEWED" });
    };

    const finalizeVerification = async () => {
        if (!confirm("Finalize forensic verification? This will update the Master Sheet with forensic metadata (source files, pages, and match hashes) for all approved matches and create a timestamped backup. Unmatched records will remain in the master sheet untouched.")) return;
        
        setSaving(true);
        try {
            const res = await fetch("/api/financials/finalize-verification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId: parseInt(sessionId as string) }),
            });
            const result = await res.json();
            if (result.success) {
                alert("Verification finalized! Master Sheet has been updated.");
                router.push('/financials/import');
            } else {
                alert(result.error || "Finalization failed");
            }
        } catch (e) {
            console.error("Finalize error:", e);
        } finally {
            setSaving(false);
        }
    };

    const toggleSelection = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const selectAll = () => {
        if (selectedIds.length === filteredTransactions.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredTransactions.map(t => t.id));
        }
    };

    const filteredTransactions = useMemo(() => {
        let base = transactions;
        if (filter === "PENDING") base = transactions.filter(t => t.review_status === "PENDING_REVIEW");
        if (filter === "REVIEWED") base = transactions.filter(t => t.review_status === "REVIEWED");
        return base;
    }, [transactions, filter]);

    const displayPlayers = useMemo(() => {
        const allowed = ["JZ", "LG", "PH"];
        return players.filter(p => {
            if (p.id === 28) return true; // JZ
            if (p.id === 25) return true; // LG
            if (p.id === 45) return true; // PH
            return false;
        }).map(p => {
            let initials = "";
            if (p.id === 28) initials = "JZ";
            if (p.id === 25) initials = "LG";
            if (p.id === 45) initials = "PH";
            return { ...p, initials };
        });
    }, [players]);

    if (loading) return (
        <div style={{ padding: "10rem", textAlign: "center", color: "var(--text-muted)" }}>
            <Loader2 className="animate-spin" size={32} style={{ margin: "0 auto 1rem" }} />
            Loading forensic transaction hub...
        </div>
    );

    if (error) return (
        <div style={{ padding: "5rem", textAlign: "center" }}>
            <AlertTriangle size={48} style={{ color: "var(--accent-red)", marginBottom: "1rem" }} />
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Forensic Hub Error</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>{error}</p>
            <Link href="/financials/import" style={{ color: "var(--accent-cyan)", textDecoration: "underline" }}>
                Return to Statement Import
            </Link>
        </div>
    );

    return (
        <div style={{ padding: "1.5rem", height: "100vh", display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <Link href="/financials/import" style={{ 
                        color: "var(--text-muted)", background: "var(--bg-glass)", padding: "6px", 
                        borderRadius: "50%", border: "var(--glass-border)" 
                    }}>
                        <ArrowLeft size={16} />
                    </Link>
                    <div>
                        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Review Ingest Session #{sessionId}</h1>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <Shield size={12} style={{ color: "var(--accent-cyan)" }} />
                            Forensic integrity preserved · {transactions.length} transactions
                        </div>
                    </div>
                </div>

                <div style={{ display: "flex", gap: "0.75rem" }}>
                    <button onClick={runAutomatch} disabled={matching || saving}
                        className="glass-panel"
                        style={{ 
                            display: "flex", alignItems: "center", gap: "0.5rem", padding: "6px 16px",
                            borderRadius: 8, fontSize: "0.8125rem", fontWeight: 600,
                            color: "var(--accent-cyan)", cursor: (matching || saving) ? "default" : "pointer",
                            opacity: (matching || saving) ? 0.7 : 1
                        }}>
                        {matching ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                        {matching ? "Matching..." : "Automatch"}
                    </button>

                    <button onClick={approveAllMatched} disabled={saving || matching}
                        className="glass-panel"
                        style={{ 
                            display: "flex", alignItems: "center", gap: "0.5rem", padding: "6px 16px",
                            borderRadius: 8, fontSize: "0.8125rem", fontWeight: 600,
                            color: "var(--accent-emerald)", cursor: (saving || matching) ? "default" : "pointer",
                            opacity: (saving || matching) ? 0.7 : 1,
                            border: "1px solid rgba(16, 185, 129, 0.3)"
                        }}>
                        <CheckCircle size={14} />
                        Approve Matches
                    </button>

                    <button onClick={finalizeVerification} disabled={saving || matching}
                        style={{ 
                            background: "var(--accent-emerald)", color: "#000", border: "none", 
                            borderRadius: 8, padding: "6px 16px", fontSize: "0.8125rem", fontWeight: 700, 
                            cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem"
                        }}>
                        <Save size={14} />
                        Finalize Verification
                    </button>

                    <div className="glass-panel" style={{ display: "flex", padding: "4px", borderRadius: 8 }}>
                        {["ALL", "PENDING", "REVIEWED"].map(f => (
                            <button key={f} onClick={() => setFilter(f)}
                                style={{
                                    padding: "4px 12px", borderRadius: 6, fontSize: "0.75rem", fontWeight: 600,
                                    background: filter === f ? "rgba(0, 255, 255, 0.1)" : "transparent",
                                    color: filter === f ? "var(--accent-cyan)" : "var(--text-secondary)",
                                    border: "none", cursor: "pointer"
                                }}>{f}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bulk Actions Toolbar omitted for brevity or integrated if needed */}

            {/* Main Table View */}
            <div className="glass-panel" style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ overflowY: "auto", flex: 1 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem", tableLayout: "fixed" }}>
                        <thead style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--bg-panel)", borderBottom: "1px solid var(--border-glass)" }}>
                            <tr>
                                <th style={{ padding: "12px", width: 40 }}><input type="checkbox" checked={selectedIds.length === filteredTransactions.length && filteredTransactions.length > 0} onChange={selectAll} /></th>
                                
                                {[
                                    { id: "DATE", label: "DATE" },
                                    { id: "DESCRIPTION", label: "DESCRIPTION" },
                                    { id: "AMOUNT", label: "AMOUNT", align: "right" as const },
                                    { id: "PAGE", label: "PAGE", align: "center" as const },
                                    { id: "ROSETTA MATCH", label: "ROSETTA MATCH" },
                                    { id: "SCORE", label: "SCORE", align: "center" as const },
                                    { id: "REASON", label: "REASON" },
                                    { id: "ACCOUNT", label: "ACCOUNT" },
                                    { id: "PLAYER", label: "PLAYER (ROSETTA)" },
                                    { id: "DOC", label: "DOC", align: "center" as const },
                                    { id: "STATUS", label: "STATUS" }
                                ].map((col) => (
                                    <th key={col.id} style={{ 
                                        textAlign: col.align || "left", 
                                        padding: "12px", 
                                        color: "var(--text-muted)", 
                                        width: columnWidths[col.id],
                                        position: "relative",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis"
                                    }}>
                                        {col.label}
                                        {/* Resize Handle */}
                                        <div 
                                            onMouseDown={(e) => { e.preventDefault(); setIsResizing(col.id); }}
                                            style={{
                                                position: "absolute", right: 0, top: 0, bottom: 0, width: "4px",
                                                cursor: "col-resize", background: isResizing === col.id ? "var(--accent-cyan)" : "transparent",
                                                transition: "background 0.2s", zIndex: 5
                                            }}
                                            onMouseEnter={(e) => (e.target as HTMLDivElement).style.background = "rgba(0, 255, 255, 0.3)"}
                                            onMouseLeave={(e) => { if (isResizing !== col.id) (e.target as HTMLDivElement).style.background = "transparent" }}
                                        />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.map((t: any) => (
                                <tr key={t.id} style={{ 
                                    borderBottom: "1px solid var(--border-glass)",
                                    background: t.verification_status === "MATCHED" ? "rgba(16, 185, 129, 0.05)" : (t.review_status === "REVIEWED" ? "rgba(0, 255, 255, 0.02)" : "transparent"),
                                    transition: "background 0.3s"
                                }}>
                                    <td style={{ padding: "10px", textAlign: "center" }}><input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => toggleSelection(t.id)} /></td>
                                    <td style={{ padding: "10px", fontFamily: "var(--font-mono)" }}>{t.date}</td>
                                    <td style={{ padding: "10px" }}>
                                        <div style={{ fontWeight: 500 }}>{t.description_raw}</div>
                                        {t.master_id !== null && (
                                            <div style={{ fontSize: "0.65rem", color: "var(--accent-emerald)", fontWeight: 700, letterSpacing: "0.05em" }}>
                                                LINKED TO MASTER #{t.master_id}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ 
                                        padding: "10px", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700,
                                        color: t.amount < 0 ? "var(--accent-red)" : "var(--accent-emerald)"
                                    }}>
                                        {t.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                    </td>
                                    <td style={{ padding: "10px", textAlign: "center" }}>
                                        <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>#{t.page_number || "?"}</span>
                                    </td>
                                    {/* Rosetta Match Context */}
                                    <td style={{ padding: "10px" }}>
                                        {t.rosetta_user ? (
                                            <div style={{ fontSize: "0.75rem", lineHeight: 1.5 }}>
                                                <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{t.rosetta_company}</div>
                                                <div style={{ color: "var(--text-secondary)" }}>
                                                    <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>{t.rosetta_user}</span>
                                                    {t.rosetta_account ? ` · ${t.rosetta_account}` : ""}
                                                </div>
                                                {t.rosetta_category && (
                                                    <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{t.rosetta_category}</div>
                                                )}
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                                                No match
                                            </div>
                                        )}
                                    </td>
                                    {/* Match Score */}
                                    <td style={{ padding: "10px", textAlign: "center" }}>
                                        {t.match_score ? (
                                            <div style={{
                                                display: "inline-flex", alignItems: "center", justifyContent: "center",
                                                width: 32, height: 32, borderRadius: "50%", fontSize: "0.7rem", fontWeight: 800,
                                                fontFamily: "var(--font-mono)",
                                                background: t.match_score >= 100 ? "rgba(16, 185, 129, 0.15)" : t.match_score >= 80 ? "rgba(0, 255, 255, 0.1)" : "rgba(255, 200, 0, 0.1)",
                                                color: t.match_score >= 100 ? "var(--accent-emerald)" : t.match_score >= 80 ? "var(--accent-cyan)" : "#ffc800",
                                                border: `1px solid ${t.match_score >= 100 ? "rgba(16, 185, 129, 0.3)" : t.match_score >= 80 ? "rgba(0, 255, 255, 0.2)" : "rgba(255, 200, 0, 0.2)"}`
                                            }}>
                                                {t.match_score}
                                            </div>
                                        ) : (
                                            <span style={{ color: "var(--text-muted)", fontSize: "0.65rem" }}>—</span>
                                        )}
                                    </td>
                                    {/* Match Reason */}
                                    <td style={{ padding: "10px" }}>
                                        <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                                            {t.match_reason || (t.verification_status === "MATCHED" ? "Legacy Match" : "—")}
                                        </div>
                                    </td>
                                    <td style={{ padding: "10px" }}>
                                        <input 
                                            type="text" 
                                            value={t.final_account_id || ""} 
                                            placeholder="XXXX"
                                            maxLength={4}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setTransactions(prev => prev.map(item => item.id === t.id ? { ...item, final_account_id: val } : item));
                                            }}
                                            onBlur={(e) => handleUpdate([t.id], { final_account_id: e.target.value })}
                                            style={{ 
                                                width: "80px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--glass-border)", 
                                                borderRadius: 4, padding: "4px 8px", color: "var(--text-primary)", fontSize: "0.8125rem",
                                                fontFamily: "var(--font-mono)", textAlign: "center"
                                            }} 
                                        />
                                    </td>
                                    <td style={{ padding: "10px" }}>
                                        <select value={t.player_id || ""} onChange={(e) => handleUpdate([t.id], { player_id: e.target.value ? parseInt(e.target.value) : null })}
                                            style={{ 
                                                width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid var(--glass-border)", 
                                                borderRadius: 4, padding: "4px", color: "var(--text-primary)", fontSize: "0.8125rem"
                                            }}>
                                            <option value="">(Unmapped)</option>
                                            {displayPlayers.map(p => <option key={p.id} value={p.id}>{p.initials} - {p.display_name.split(' ')[0]}</option>)}
                                        </select>
                                    </td>
                                    <td style={{ padding: "10px", textAlign: "center" }}>
                                        {t.evidence_url ? (
                                            <a href={t.evidence_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-cyan)" }}>
                                                <ExternalLink size={16} />
                                            </a>
                                        ) : (
                                            <span style={{ color: "var(--text-muted)", opacity: 0.3 }}><ExternalLink size={16} /></span>
                                        )}
                                    </td>
                                    <td style={{ padding: "10px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                            <button onClick={() => handleUpdate([t.id], { review_status: t.review_status === "REVIEWED" ? "PENDING_REVIEW" : "REVIEWED" })}
                                                style={{ 
                                                    background: t.review_status === "REVIEWED" ? "var(--accent-cyan)" : "var(--bg-glass)",
                                                    border: "1px solid var(--glass-border)", borderRadius: 4, padding: "2px 8px", 
                                                    fontSize: "0.65rem", fontWeight: 700, color: t.review_status === "REVIEWED" ? "#000" : "var(--text-muted)", 
                                                    cursor: "pointer", transition: "all 0.2s"
                                                }}>
                                                {t.review_status === "REVIEWED" ? "REVIEWED" : "APPROVE"}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer Summary */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                <div>Showing {filteredTransactions.length} of {transactions.length} items</div>
                <div style={{ display: "flex", gap: "1rem" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-emerald)" }} /> {transactions.filter(t => t.verification_status === "MATCHED").length} Verified
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-cyan)" }} /> {transactions.filter(t => t.review_status === "REVIEWED").length} Approved
                    </span>
                </div>
            </div>
        </div>
    );
}
