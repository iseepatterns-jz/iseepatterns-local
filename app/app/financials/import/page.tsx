"use client";

import { useState, useEffect } from "react";
import { 
    Upload, FileText, CheckCircle, AlertCircle, 
    Loader2, Search, ArrowRight, Shield, History, Trash2,
    RefreshCw, X
} from "lucide-react";
import Link from "next/link";

interface ImportSession {
    id: number;
    statement_file_id: number;
    status: string;
    transaction_count: number;
    created_at: string;
    original_filename: string;
    sha256_hash: string;
    bank_name: string;
    error_message?: string;
}

export default function StatementImportPage() {
    const [file, setFile] = useState<File | null>(null);
    const [bankName, setBankName] = useState("");
    const [stmtType, setStmtType] = useState("CREDIT_CARD");
    const [uploading, setUploading] = useState(false);
    const [sessions, setSessions] = useState<ImportSession[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        id: number | null;
        title: string;
        message: string;
    }>({
        open: false,
        id: null,
        title: "",
        message: "",
    });

    const showToast = (msg: string, type: "success" | "error" = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchSessions = async () => {
        setRefreshing(true);
        try {
            // Use timestamp to bust cache
            const res = await fetch(`/api/financials/import?t=${Date.now()}`);
            const data = await res.json();
            setSessions(data);
        } catch (e) {
            console.error("Fetch sessions error:", e);
            showToast("Failed to fetch sessions", "error");
        } finally {
            setRefreshing(false);
        }
    };

    const deleteSession = async (id: number) => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
        
        console.log(`[DELETE-v2] Starting purge for session: ${id}`);
        setDeletingId(id);
        setError(null);
        
        try {
            const body = new FormData();
            body.append("action", "delete");
            body.append("id", String(id));

            console.log("[DELETE-v2] Sending POST request...");
            const res = await fetch("/api/financials/import", { method: "POST", body });
            console.log("[DELETE-v2] Response status:", res.status);
            
            const json = await res.json().catch(() => ({ unknown: true }));
            console.log("[DELETE-v2] Response body:", JSON.stringify(json));
            
            if (res.ok && json.success) {
                showToast(`Session ${id} purged successfully.`);
                // Immediately remove from local state for instant UI feedback
                setSessions(prev => prev.filter(s => s.id !== id));
                // Also refresh from server after a delay
                setTimeout(fetchSessions, 1000);
            } else {
                const errMsg = json.error || json.detail || `Delete failed (${res.status})`;
                setError(errMsg);
                showToast(`Purge failed: ${errMsg}`, "error");
            }
        } catch (e: any) {
            console.error("[DELETE-v2] EXCEPTION:", e);
            const msg = e?.message || "Unknown error";
            setError(msg);
            showToast(`Delete error: ${msg}`, "error");
        } finally {
            setDeletingId(null);
        }
    };

    const openDeleteConfirm = (session: ImportSession) => {
        setConfirmDialog({
            open: true,
            id: session.id,
            title: "Purge Import Session",
            message: `Are you sure you want to purge session #${session.id} (${session.original_filename}) and all its transactions? This action is permanent and cannot be undone.`
        });
    };

    useEffect(() => { fetchSessions(); }, []);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("bankName", bankName);
        formData.append("statementType", stmtType);

        try {
            const res = await fetch("/api/financials/import", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("Upload failed");

            const result = await res.json();
            // Refresh list and clear form
            fetchSessions();
            setFile(null);
            setBankName("");
            
            // Redirect to review if success
            window.location.href = `/financials/review/${result.session_id}`;
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={{ padding: "2rem", maxWidth: 1000, margin: "0 auto" }}>
            <div style={{ marginBottom: "2rem" }}>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 700, fontFamily: "var(--font-heading)", margin: "0 0 0.25rem 0" }}>
                    Statement Import
                </h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>
                    Upload PDF statements for forensic parsing and RosettaStone alignment.
                </p>
            </div>

            <div className="glass-panel" style={{ padding: "2rem", marginBottom: "2.5rem" }}>
                <form onSubmit={handleUpload}>
                    <div style={{ 
                        border: "2px dashed var(--glass-border)", 
                        borderRadius: 12, 
                        padding: "3rem 2rem", 
                        textAlign: "center",
                        background: file ? "rgba(0, 255, 255, 0.05)" : "transparent",
                        transition: "all 0.2s"
                    }}>
                        {file ? (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                                <CheckCircle size={40} style={{ color: "var(--accent-cyan)" }} />
                                <div>
                                    <div style={{ fontSize: "1rem", fontWeight: 600 }}>{file.name}</div>
                                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                        {(file.size / 1024 / 1024).toFixed(2)} MB · PDF Document
                                    </div>
                                </div>
                                <button type="button" onClick={() => setFile(null)} 
                                    style={{ color: "var(--accent-red)", fontSize: "0.75rem", background: "none", border: "none", cursor: "pointer" }}>
                                    Remove and select another
                                </button>
                            </div>
                        ) : (
                            <label style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                                <div style={{ 
                                    width: 50, height: 50, borderRadius: "50%", 
                                    background: "var(--bg-glass)", border: "var(--glass-border)",
                                    display: "flex", alignItems: "center", justifyContent: "center" 
                                 }}>
                                    <Upload size={20} style={{ color: "var(--accent-cyan)" }} />
                                </div>
                                <div>
                                    <div style={{ fontSize: "0.9375rem", fontWeight: 600 }}>Click to upload PDF statement</div>
                                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                                        Credit card or checking statements supported
                                    </div>
                                </div>
                                <input type="file" accept="application/pdf" style={{ display: "none" }} 
                                    onChange={(e) => setFile(e.target.files?.[0] || null)} />
                            </label>
                        )}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1.5rem" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                                Bank / Institution
                            </label>
                            <input 
                                id="bank-name"
                                name="bank-name"
                                type="text" 
                                placeholder="e.g. Chase, Amex, RBC" 
                                value={bankName} onChange={e => setBankName(e.target.value)}
                                style={{ 
                                    width: "100%", background: "var(--bg-glass)", border: "var(--glass-border)", 
                                    borderRadius: 6, padding: "8px 12px", color: "var(--text-primary)", outline: "none"
                                }} />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                                Statement Type
                            </label>
                            <select value={stmtType} onChange={e => setStmtType(e.target.value)}
                                style={{ 
                                    width: "100%", background: "var(--bg-glass)", border: "var(--glass-border)", 
                                    borderRadius: 6, padding: "8px 12px", color: "var(--text-primary)", outline: "none"
                                }}>
                                <option value="CREDIT_CARD">Credit Card</option>
                                <option value="CHECKING">Checking Account</option>
                            </select>
                        </div>
                    </div>

                    {error && (
                        <div style={{ 
                            marginTop: "1.5rem", padding: "0.75rem 1rem", borderRadius: 6, 
                            background: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--accent-red)",
                            color: "var(--accent-red)", fontSize: "0.8rem", display: "flex", gap: "0.5rem", alignItems: "center"
                        }}>
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    <button type="submit" disabled={!file || uploading} 
                        style={{ 
                            marginTop: "1.5rem", width: "100%", padding: "0.75rem", borderRadius: 6,
                            background: uploading || !file ? "var(--bg-glass)" : "var(--accent-cyan)",
                            color: uploading || !file ? "var(--text-muted)" : "#000",
                            border: "none", fontWeight: 800, cursor: file && !uploading ? "pointer" : "default",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem"
                        }}>
                        {uploading ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
                        {uploading ? "Parsing Statement..." : "Start Forensic Ingest"}
                    </button>
                </form>
            </div>

            {/* History Section */}
            <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <History size={16} style={{ color: "var(--text-muted)" }} />
                    <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Import History</h2>
                </div>
                <button 
                    onClick={fetchSessions}
                    disabled={refreshing}
                    style={{
                        background: "rgba(0, 245, 212, 0.08)",
                        border: "1px solid rgba(0, 245, 212, 0.2)",
                        borderRadius: 6,
                        padding: "4px 10px",
                        color: "var(--accent-cyan)",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        opacity: refreshing ? 0.6 : 1
                    }}
                >
                    <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            <div className="glass-panel" style={{ overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
                    <thead>
                        <tr style={{ background: "rgba(255, 255, 255, 0.02)", borderBottom: "1px solid var(--border-glass)" }}>
                            <th style={{ textAlign: "left", padding: "1rem", color: "var(--text-muted)" }}>STATEMENT</th>
                            <th style={{ textAlign: "left", padding: "1rem", color: "var(--text-muted)" }}>BANK</th>
                            <th style={{ textAlign: "left", padding: "1rem", color: "var(--text-muted)" }}>FORENSIC HASH</th>
                            <th style={{ textAlign: "left", padding: "1rem", color: "var(--text-muted)" }}>STATUS</th>
                            <th style={{ textAlign: "right", padding: "1rem", color: "var(--text-muted)" }}>ACTION</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sessions.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                                    No import sessions found.
                                </td>
                            </tr>
                        ) : sessions.map(s => (
                            <tr key={s.id} style={{ borderBottom: "1px solid var(--border-glass)" }}>
                                <td style={{ padding: "1rem" }}>
                                    <div style={{ fontWeight: 600 }}>{s.original_filename}</div>
                                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{s.created_at.slice(0, 16).replace("T", " ")}</div>
                                </td>
                                <td style={{ padding: "1rem" }}>
                                    <span style={{ 
                                        padding: "2px 8px", borderRadius: 4, background: "rgba(255, 255, 255, 0.05)", 
                                        border: "1px solid var(--glass-border)", fontSize: "0.7rem"
                                    }}>
                                        {s.bank_name}
                                    </span>
                                </td>
                                <td style={{ padding: "1rem", fontFamily: "var(--font-mono)", fontSize: "0.7rem" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                        <Shield size={10} style={{ color: "var(--accent-cyan)" }} />
                                        {s.sha256_hash.slice(0, 12)}...
                                    </div>
                                </td>
                                <td style={{ padding: "1rem" }}>
                                    <span style={{ 
                                        color: s.status === "REVIEW" ? "var(--accent-amber, #f59e0b)" : 
                                               s.status === "FAILED" ? "var(--accent-red, #ef4444)" : "var(--accent-cyan)",
                                        fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase"
                                    }}>
                                        {s.status}
                                    </span>
                                    {s.status === "FAILED" && s.error_message && (
                                        <div style={{ color: "var(--accent-red)", opacity: 0.6, fontSize: "0.65rem", marginTop: "0.25rem", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={s.error_message}>
                                            {s.error_message.split('\n')[0]}
                                        </div>
                                    )}
                                </td>
                                <td style={{ padding: "1rem", textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "1rem" }}>
                                    <Link href={`/financials/review/${s.id}`} style={{ 
                                        color: "var(--accent-cyan)", textDecoration: "none", fontWeight: 600, 
                                        display: "inline-flex", alignItems: "center", gap: "0.25rem" 
                                    }}>
                                        Review <ArrowRight size={12} />
                                    </Link>
                                    <button 
                                        type="button"
                                        onClick={() => openDeleteConfirm(s)}
                                        style={{ 
                                            background: "none", border: "none", 
                                            color: "var(--text-muted)", 
                                            cursor: "pointer", 
                                            transition: "color 0.2s", padding: "4px",
                                            display: "inline-flex", alignItems: "center"
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.color = "var(--accent-red)"}
                                        onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
                                        title="Purge Session"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ═══ Confirmation Dialog ═══ */}
            {confirmDialog.open && (
                <div style={{ 
                    position: "fixed", top: 0, left: 0, width: "100%", height: "100%", 
                    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 
                }}>
                    <div 
                        style={{ 
                            position: "absolute", top: 0, left: 0, width: "100%", height: "100%", 
                            background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)",
                            animation: "fadeIn 0.2s ease-out"
                        }}
                        onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
                    />
                    <div style={{ 
                        position: "relative", width: "100%", maxWidth: "420px",
                        background: "var(--bg-elevated)", border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "16px", padding: "2rem",
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                        animation: "modalZoom 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                            <div style={{ 
                                background: "rgba(239, 68, 68, 0.1)", padding: "10px", borderRadius: "12px",
                                color: "var(--accent-red)"
                            }}>
                                <Trash2 size={24} />
                            </div>
                            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>{confirmDialog.title}</h2>
                        </div>
                        
                        <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "2rem", fontSize: "0.9375rem" }}>
                            {confirmDialog.message}
                        </p>

                        <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                            <button 
                                onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
                                style={{ 
                                    background: "transparent", color: "var(--text-muted)", border: "none",
                                    padding: "8px 16px", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer"
                                }}>
                                Cancel
                            </button>
                            <button 
                                disabled={deletingId !== null}
                                onClick={() => confirmDialog.id && deleteSession(confirmDialog.id)}
                                style={{ 
                                    background: "var(--accent-red)", 
                                    color: "#fff", border: "none", borderRadius: "8px",
                                    padding: "8px 24px", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer",
                                    display: "flex", alignItems: "center", gap: "0.5rem",
                                    boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)"
                                }}>
                                {deletingId !== null ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                                Confirm Purge
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast System */}
            {toast && (
                <div style={{
                    position: "fixed",
                    bottom: "2rem",
                    right: "2rem",
                    padding: "1rem 1.5rem",
                    borderRadius: 12,
                    background: toast.type === "success" ? "rgba(16, 185, 129, 0.95)" : "rgba(239, 68, 68, 0.95)",
                    color: "#fff",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.5)",
                    zIndex: 9999,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    animation: "slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    backdropFilter: "blur(10px)"
                }}>
                    {toast.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>{toast.msg}</span>
                    <button 
                        onClick={() => setToast(null)}
                        style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", padding: "4px" }}
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes modalZoom {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
