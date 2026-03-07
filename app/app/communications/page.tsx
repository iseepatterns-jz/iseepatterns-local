"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
    Search,
    Upload,
    ChevronLeft,
    ChevronRight,
    X,
    CheckCircle,
    AlertTriangle,
    XCircle,
    Mail,
    FileText,
    Shield,
} from "lucide-react";

interface EmailRow {
    msg_id: string;
    account: string;
    sender: string;
    subject: string;
    date: string;
    source_file: string;
    zip_path: string;
    client_id: string;
    case_id: string;
}

interface SearchResult {
    results: EmailRow[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

interface EmailDetail extends EmailRow {
    body: string;
    thread_id: string;
    source_hash: string;
    byte_offset: number;
    created_at: string;
}

interface MatchResult {
    confidence: "exact" | "probable" | "none";
    message: EmailRow | null;
    parsed: {
        messageId: string | null;
        subject: string | null;
        from: string | null;
        date: string | null;
    };
    searchDetails: string;
}

export default function CommunicationsPage() {
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const [data, setData] = useState<SearchResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    // Drag and drop
    const [dragActive, setDragActive] = useState(false);
    const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
    const [matching, setMatching] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchEmails = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams({ page: String(page), limit: "50" });
        if (query) params.set("q", query);
        const res = await fetch(`/api/communications?${params}`);
        const json = await res.json();
        setData(json);
        setLoading(false);
    }, [query, page]);

    useEffect(() => {
        fetchEmails();
    }, [fetchEmails]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchEmails();
    };

    const openDetail = async (msgId: string) => {
        const res = await fetch(`/api/communications/${encodeURIComponent(msgId)}`);
        if (res.ok) {
            const detail = await res.json();
            setSelectedEmail(detail);
            setDetailOpen(true);
        }
    };

    // ── Drag-and-Drop .eml ──
    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        if (e.type === "dragleave") setDragActive(false);
    }, []);

    const processEml = async (file: File) => {
        setMatching(true);
        setMatchResult(null);
        const formData = new FormData();
        formData.append("eml", file);
        const res = await fetch("/api/match-eml", { method: "POST", body: formData });
        const result = await res.json();
        setMatchResult(result);
        setMatching(false);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const file = e.dataTransfer?.files?.[0];
        if (file && (file.name.endsWith(".eml") || file.type === "message/rfc822")) {
            processEml(file);
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processEml(file);
    };

    const ConfidenceIcon = matchResult
        ? matchResult.confidence === "exact"
            ? CheckCircle
            : matchResult.confidence === "probable"
                ? AlertTriangle
                : XCircle
        : null;

    const confidenceColor = matchResult
        ? matchResult.confidence === "exact"
            ? "var(--accent-emerald)"
            : matchResult.confidence === "probable"
                ? "var(--accent-orange)"
                : "var(--accent-red)"
        : "";

    return (
        <div className="animate-in">
            {/* Page Header */}
            <div className="page-header">
                <h1>Communications</h1>
                <p>
                    Search {data?.total?.toLocaleString() || "..."} indexed emails •
                    Drop <code>.eml</code> files to find matches
                </p>
            </div>

            {/* ── Drop Zone ── */}
            <div
                className={`drop-zone ${dragActive ? "active" : ""}`}
                style={{ marginBottom: "1.5rem" }}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".eml,message/rfc822"
                    onChange={handleFileSelect}
                    style={{ display: "none" }}
                />
                <Upload size={28} style={{ marginBottom: "0.5rem", opacity: 0.6 }} />
                <div style={{ fontSize: "0.9375rem", fontWeight: 600 }}>
                    {matching
                        ? "Parsing & matching..."
                        : dragActive
                            ? "Drop .eml file here"
                            : "Drag & drop .eml file to find it in the index"}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                    Matches by Message-ID (exact) or Subject + Sender (probable)
                </div>
            </div>

            {/* ── Match Result ── */}
            {matchResult && (
                <div
                    className="glass-panel"
                    style={{
                        padding: "1.25rem 1.5rem",
                        marginBottom: "1.5rem",
                        borderColor: confidenceColor,
                        borderWidth: "1px",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                        {ConfidenceIcon && <ConfidenceIcon size={20} color={confidenceColor} />}
                        <h3 style={{ margin: 0, fontSize: "1rem" }}>
                            {matchResult.confidence === "exact"
                                ? "Exact Match Found"
                                : matchResult.confidence === "probable"
                                    ? "Probable Match Found"
                                    : "No Match Found"}
                        </h3>
                        <span
                            className={`badge ${matchResult.confidence === "exact"
                                    ? "badge-emerald"
                                    : matchResult.confidence === "probable"
                                        ? "badge-orange"
                                        : "badge-red"
                                }`}
                        >
                            {matchResult.confidence}
                        </span>
                        <button
                            onClick={() => setMatchResult(null)}
                            style={{
                                marginLeft: "auto",
                                background: "none",
                                border: "none",
                                color: "var(--text-secondary)",
                                cursor: "pointer",
                            }}
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Parsed info */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "0.5rem",
                            fontSize: "0.8125rem",
                            marginBottom: "0.75rem",
                        }}
                    >
                        <div>
                            <span style={{ color: "var(--text-muted)" }}>From:</span>{" "}
                            {matchResult.parsed.from || "—"}
                        </div>
                        <div>
                            <span style={{ color: "var(--text-muted)" }}>Subject:</span>{" "}
                            {matchResult.parsed.subject || "—"}
                        </div>
                        <div>
                            <span style={{ color: "var(--text-muted)" }}>Date:</span>{" "}
                            {matchResult.parsed.date || "—"}
                        </div>
                        <div>
                            <span style={{ color: "var(--text-muted)" }}>Message-ID:</span>{" "}
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem" }}>
                                {matchResult.parsed.messageId
                                    ? `${matchResult.parsed.messageId.slice(0, 30)}…`
                                    : "—"}
                            </span>
                        </div>
                    </div>

                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        {matchResult.searchDetails}
                    </div>

                    {/* Matched record */}
                    {matchResult.message && (
                        <div
                            className="glass-panel glass-panel-hover"
                            style={{
                                marginTop: "0.75rem",
                                padding: "0.75rem 1rem",
                                cursor: "pointer",
                            }}
                            onClick={() =>
                                matchResult.message &&
                                openDetail(matchResult.message.msg_id)
                            }
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem" }}>
                                <Mail size={14} color="var(--accent-cyan)" />
                                <strong>{matchResult.message.subject || "(no subject)"}</strong>
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                                {matchResult.message.sender} • {matchResult.message.date}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Search Bar ── */}
            <form
                onSubmit={handleSearch}
                style={{
                    display: "flex",
                    gap: "0.75rem",
                    marginBottom: "1.5rem",
                }}
            >
                <div style={{ position: "relative", flex: 1 }}>
                    <Search
                        size={16}
                        style={{
                            position: "absolute",
                            left: 12,
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "var(--text-muted)",
                        }}
                    />
                    <input
                        type="text"
                        className="input-glass"
                        placeholder="Search by subject, sender, or message ID..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        style={{ paddingLeft: "2.25rem" }}
                    />
                </div>
                <button type="submit" className="btn-primary">
                    Search
                </button>
            </form>

            {/* ── Results Table ── */}
            <div className="glass-panel" style={{ overflow: "hidden" }}>
                {loading ? (
                    <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                        Loading...
                    </div>
                ) : data && data.results.length > 0 ? (
                    <>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Sender</th>
                                    <th>Subject</th>
                                    <th>Date</th>
                                    <th>Source</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.results.map((row) => (
                                    <tr
                                        key={row.msg_id}
                                        onClick={() => openDetail(row.msg_id)}
                                    >
                                        <td style={{ maxWidth: 180 }}>{row.sender || "—"}</td>
                                        <td style={{ maxWidth: 320 }}>
                                            {row.subject || "(no subject)"}
                                        </td>
                                        <td style={{ fontSize: "0.75rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                                            {row.date || "—"}
                                        </td>
                                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                                            {row.source_file
                                                ? row.source_file.split("/").pop()
                                                : row.zip_path
                                                    ? row.zip_path.split("/").pop()
                                                    : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "0.75rem 1rem",
                                borderTop: "1px solid var(--border-glass)",
                                fontSize: "0.8125rem",
                                color: "var(--text-secondary)",
                            }}
                        >
                            <span>
                                Page {data.page} of {data.totalPages} •{" "}
                                {data.total.toLocaleString()} results
                            </span>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                <button
                                    className="btn-primary"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    style={{
                                        padding: "0.375rem 0.75rem",
                                        opacity: page <= 1 ? 0.3 : 1,
                                        fontSize: "0.8125rem",
                                    }}
                                >
                                    <ChevronLeft size={14} /> Prev
                                </button>
                                <button
                                    className="btn-primary"
                                    onClick={() => setPage((p) => p + 1)}
                                    disabled={page >= (data?.totalPages ?? 1)}
                                    style={{
                                        padding: "0.375rem 0.75rem",
                                        opacity: page >= (data?.totalPages ?? 1) ? 0.3 : 1,
                                        fontSize: "0.8125rem",
                                    }}
                                >
                                    Next <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                        {query ? "No emails match your search." : "No emails found."}
                    </div>
                )}
            </div>

            {/* ── Detail Slide Panel ── */}
            <div className={`slide-panel ${detailOpen ? "open" : ""}`}>
                {selectedEmail && (
                    <div style={{ padding: "1.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                            <h2 style={{ margin: 0, fontSize: "1.125rem" }}>Email Detail</h2>
                            <button
                                onClick={() => setDetailOpen(false)}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "var(--text-secondary)",
                                    cursor: "pointer",
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Metadata */}
                        <div style={{ marginBottom: "1.5rem" }}>
                            {[
                                { label: "Subject", value: selectedEmail.subject },
                                { label: "Sender", value: selectedEmail.sender },
                                { label: "Date", value: selectedEmail.date },
                                { label: "Account", value: selectedEmail.account },
                                { label: "Message-ID", value: selectedEmail.msg_id, mono: true },
                                { label: "Thread ID", value: selectedEmail.thread_id, mono: true },
                            ].map((field) => (
                                <div key={field.label} style={{ marginBottom: "0.625rem" }}>
                                    <div style={{
                                        fontSize: "0.65rem", fontWeight: 700,
                                        letterSpacing: "0.08em", textTransform: "uppercase",
                                        color: "var(--text-muted)", marginBottom: "0.125rem"
                                    }}>
                                        {field.label}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: field.mono ? "0.75rem" : "0.875rem",
                                            fontFamily: field.mono ? "var(--font-mono)" : "inherit",
                                            color: "var(--text-primary)",
                                            wordBreak: "break-all",
                                        }}
                                    >
                                        {field.value || "—"}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Source Badge */}
                        <div
                            className="glass-panel"
                            style={{
                                padding: "0.75rem 1rem",
                                marginBottom: "1.5rem",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                            }}
                        >
                            <Shield size={14} color="var(--accent-emerald)" />
                            <div>
                                <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                                    Source Provenance
                                </div>
                                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                                    {selectedEmail.source_hash
                                        ? `${selectedEmail.source_hash.slice(0, 16)}…${selectedEmail.source_hash.slice(-8)}`
                                        : "—"}
                                </div>
                                <div style={{ fontSize: "0.75rem", marginTop: "0.125rem" }}>
                                    {selectedEmail.source_file || selectedEmail.zip_path || "—"}
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div>
                            <div style={{
                                fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em",
                                textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.5rem",
                                display: "flex", alignItems: "center", gap: "0.5rem"
                            }}>
                                <FileText size={12} /> Body
                            </div>
                            <div
                                style={{
                                    background: "var(--bg-glass)",
                                    border: "var(--glass-border)",
                                    borderRadius: 8,
                                    padding: "1rem",
                                    fontFamily: "var(--font-mono)",
                                    fontSize: "0.75rem",
                                    lineHeight: 1.7,
                                    maxHeight: "50vh",
                                    overflowY: "auto",
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                    color: "var(--text-secondary)",
                                }}
                            >
                                {selectedEmail.body || "(no body)"}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Overlay when detail panel is open */}
            {detailOpen && (
                <div
                    onClick={() => setDetailOpen(false)}
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.4)",
                        zIndex: 55,
                    }}
                />
            )}
        </div>
    );
}
