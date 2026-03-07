"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Search, Brain, FileText, Loader2, BookOpen, ChevronDown,
    AlertTriangle, Zap, Clock, ExternalLink, Hash,
} from "lucide-react";

// ─── TYPES ───────────────────────────────────────────────────────

interface Source {
    filename: string;
    page: number | string;
    category: string;
    score: number;
}

interface SearchResult {
    answer: string;
    sources: Source[];
    domain: string;
    query: string;
    chunksSearched: number;
}

interface IndexStats {
    status: string;
    bm25Chunks: number;
    bm25Available: boolean;
    categories: string[];
    categoryLabels: Record<string, string>;
}

// ─── CATEGORY CONFIG ─────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
    "Complaints & Exhibits": "#ef4444",
    "Motions & Filings": "#f59e0b",
    "Receiver Reports": "#06b6d4",
    "Court Orders": "#a855f7",
    "Appearances": "#4ade80",
    "Service Notifications": "#64748b",
    "Business Taxes": "#ec4899",
    "Court Transcripts": "#3b82f6",
    "General / Uncategorized": "#94a3b8",
};

const DOMAIN_COLORS: Record<string, string> = {
    business: "var(--accent-cyan)",
    criminal: "var(--accent-red, #ef4444)",
    all: "var(--text-muted)",
};

// ─── COMPONENT ───────────────────────────────────────────────────

export default function LegalResearchPage() {
    const [query, setQuery] = useState("");
    const [result, setResult] = useState<SearchResult | null>(null);
    const [stats, setStats] = useState<IndexStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [indexing, setIndexing] = useState(false);
    const [domain, setDomain] = useState<string>("auto");
    const [category, setCategory] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [searchTime, setSearchTime] = useState<number>(0);

    // Load stats on mount
    useEffect(() => {
        fetch("/api/ai/rag")
            .then((r) => r.json())
            .then(setStats)
            .catch(() => setStats(null));
    }, []);

    // Search handler
    const handleSearch = useCallback(async () => {
        if (!query.trim()) return;
        setLoading(true);
        setError(null);
        const start = Date.now();

        try {
            const params = new URLSearchParams({ q: query });
            if (domain !== "auto") params.set("domain", domain);
            if (category) params.set("category", category);

            const res = await fetch(`/api/ai/rag?${params}`);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Search failed");
            }
            const data = await res.json();
            setResult(data);
            setSearchTime(Date.now() - start);
        } catch (e) {
            setError(String(e));
        } finally {
            setLoading(false);
        }
    }, [query, domain, category]);

    // Index handler
    const handleIndex = useCallback(async (reindex = false) => {
        setIndexing(true);
        setError(null);
        try {
            const res = await fetch("/api/ai/rag/index", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reindex }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            // Refresh stats
            const statsRes = await fetch("/api/ai/rag");
            setStats(await statsRes.json());
        } catch (e) {
            setError(String(e));
        } finally {
            setIndexing(false);
        }
    }, []);

    return (
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem" }}>
            {/* ─── HEADER ─── */}
            <div style={{ marginBottom: "2rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                    <div
                        style={{
                            width: 42,
                            height: 42,
                            borderRadius: 12,
                            background: "linear-gradient(135deg, #a855f7, #06b6d4)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 0 20px rgba(168, 85, 247, 0.3)",
                        }}
                    >
                        <Brain size={22} color="#fff" strokeWidth={2} />
                    </div>
                    <div>
                        <h1
                            style={{
                                fontSize: "1.75rem",
                                fontWeight: 800,
                                fontFamily: "var(--font-heading)",
                                background: "linear-gradient(135deg, #a855f7, #06b6d4)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                                lineHeight: 1.2,
                                margin: 0,
                            }}
                        >
                            Legal Research
                        </h1>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                            Hybrid RAG · BM25 + Vector · Ollama qwen2.5:32b
                        </div>
                    </div>
                </div>

                {/* Stats bar */}
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "1rem" }}>
                    <div className="glass-panel" style={{ padding: "0.5rem 0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Hash size={14} style={{ color: "var(--accent-cyan)" }} />
                        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                            {stats?.bm25Chunks || 0} chunks indexed
                        </span>
                    </div>
                    <div className="glass-panel" style={{ padding: "0.5rem 0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <FileText size={14} style={{ color: "var(--accent-purple)" }} />
                        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                            {stats?.categories?.length || 0} categories
                        </span>
                    </div>
                    <div className="glass-panel" style={{ padding: "0.5rem 0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div
                            style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: stats?.bm25Available ? "var(--accent-emerald)" : "var(--accent-red, #ef4444)",
                                boxShadow: stats?.bm25Available ? "0 0 6px var(--accent-emerald)" : "0 0 6px rgba(239, 68, 68, 0.5)",
                            }}
                        />
                        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                            {stats?.bm25Available ? "Engine Ready" : "Not Indexed"}
                        </span>
                    </div>
                    {!stats?.bm25Available && (
                        <button
                            className="workbench-action-btn"
                            onClick={() => handleIndex(false)}
                            disabled={indexing}
                            style={{ fontSize: "0.75rem", gap: "0.5rem" }}
                        >
                            {indexing ? <Loader2 size={14} className="spin" /> : <Zap size={14} />}
                            {indexing ? "Indexing…" : "Index Documents"}
                        </button>
                    )}
                </div>
            </div>

            {/* ─── SEARCH BOX ─── */}
            <div className="glass-panel" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.75rem" }}>
                    <div style={{ flex: 1, position: "relative" }}>
                        <Search
                            size={18}
                            style={{
                                position: "absolute",
                                left: 14,
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "var(--text-muted)",
                                pointerEvents: "none",
                            }}
                        />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            placeholder="Search legal documents... (e.g., 'PPP loan fraud evidence')"
                            style={{
                                width: "100%",
                                padding: "0.75rem 1rem 0.75rem 2.75rem",
                                background: "var(--bg-card)",
                                border: "1px solid var(--border-glass)",
                                borderRadius: 10,
                                color: "var(--text-primary)",
                                fontSize: "0.9375rem",
                                fontFamily: "var(--font-body)",
                                outline: "none",
                                transition: "border-color 0.2s",
                            }}
                            onFocus={(e) => (e.target.style.borderColor = "var(--accent-cyan)")}
                            onBlur={(e) => (e.target.style.borderColor = "var(--border-glass)")}
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        disabled={loading || !query.trim()}
                        className="workbench-action-btn"
                        style={{
                            padding: "0.75rem 1.5rem",
                            background: loading ? "var(--bg-glass)" : "linear-gradient(135deg, #a855f7, #06b6d4)",
                            color: "#fff",
                            fontSize: "0.875rem",
                            fontWeight: 600,
                            borderRadius: 10,
                            border: "none",
                            cursor: loading ? "wait" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            transition: "all 0.2s",
                        }}
                    >
                        {loading ? <Loader2 size={16} className="spin" /> : <Brain size={16} />}
                        {loading ? "Thinking…" : "Search"}
                    </button>
                </div>

                {/* Filters */}
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    {/* Domain filter */}
                    <div style={{ position: "relative" }}>
                        <select
                            value={domain}
                            onChange={(e) => setDomain(e.target.value)}
                            style={{
                                padding: "0.5rem 2rem 0.5rem 0.75rem",
                                background: "var(--bg-card)",
                                border: "1px solid var(--border-glass)",
                                borderRadius: 8,
                                color: "var(--text-primary)",
                                fontSize: "0.8125rem",
                                fontFamily: "var(--font-body)",
                                appearance: "none",
                                cursor: "pointer",
                            }}
                        >
                            <option value="auto">🔮 Auto-detect Domain</option>
                            <option value="business">📊 Business Law</option>
                            <option value="criminal">⚖️ Criminal Law</option>
                            <option value="all">📁 All Domains</option>
                        </select>
                        <ChevronDown size={14} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-muted)" }} />
                    </div>

                    {/* Category filter */}
                    <div style={{ position: "relative" }}>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            style={{
                                padding: "0.5rem 2rem 0.5rem 0.75rem",
                                background: "var(--bg-card)",
                                border: "1px solid var(--border-glass)",
                                borderRadius: 8,
                                color: "var(--text-primary)",
                                fontSize: "0.8125rem",
                                fontFamily: "var(--font-body)",
                                appearance: "none",
                                cursor: "pointer",
                            }}
                        >
                            <option value="">All Categories</option>
                            {stats?.categories?.map((cat) => (
                                <option key={cat} value={cat}>
                                    {stats.categoryLabels?.[cat] || cat}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={14} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-muted)" }} />
                    </div>
                </div>
            </div>

            {/* ─── ERROR ─── */}
            {error && (
                <div
                    className="glass-panel"
                    style={{
                        padding: "1rem",
                        marginBottom: "1.5rem",
                        borderLeft: "3px solid var(--accent-red, #ef4444)",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.75rem",
                    }}
                >
                    <AlertTriangle size={18} style={{ color: "var(--accent-red, #ef4444)", flexShrink: 0, marginTop: 2 }} />
                    <div>
                        <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.25rem" }}>Search Error</div>
                        <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>{error}</div>
                    </div>
                </div>
            )}

            {/* ─── LOADING ─── */}
            {loading && (
                <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", marginBottom: "1.5rem" }}>
                    <Loader2 size={32} className="spin" style={{ color: "var(--accent-purple)", marginBottom: "1rem" }} />
                    <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Analyzing legal documents…</div>
                    <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                        Hybrid search (BM25 + Vector) → Reranking → LLM Generation
                    </div>
                </div>
            )}

            {/* ─── RESULTS ─── */}
            {result && !loading && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    {/* Answer card */}
                    <div className="glass-panel" style={{ padding: "1.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <Brain size={18} style={{ color: "var(--accent-purple)" }} />
                                <span style={{ fontWeight: 700, fontSize: "0.875rem" }}>AI Analysis</span>
                            </div>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                <span
                                    className="badge"
                                    style={{
                                        background: `${DOMAIN_COLORS[result.domain] || "var(--text-muted)"}20`,
                                        color: DOMAIN_COLORS[result.domain] || "var(--text-muted)",
                                        fontSize: "0.7rem",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                    }}
                                >
                                    {result.domain}
                                </span>
                                <span className="badge" style={{ background: "var(--bg-glass)", color: "var(--text-muted)", fontSize: "0.7rem" }}>
                                    <Clock size={10} /> {(searchTime / 1000).toFixed(1)}s
                                </span>
                                <span className="badge" style={{ background: "var(--bg-glass)", color: "var(--text-muted)", fontSize: "0.7rem" }}>
                                    {result.chunksSearched} chunks
                                </span>
                            </div>
                        </div>
                        <div
                            style={{
                                fontSize: "0.9375rem",
                                lineHeight: 1.75,
                                color: "var(--text-primary)",
                                whiteSpace: "pre-wrap",
                            }}
                        >
                            {result.answer}
                        </div>
                    </div>

                    {/* Sources card */}
                    {result.sources.length > 0 && (
                        <div className="glass-panel" style={{ padding: "1.25rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                                <BookOpen size={16} style={{ color: "var(--accent-cyan)" }} />
                                <span style={{ fontWeight: 700, fontSize: "0.875rem" }}>Sources ({result.sources.length})</span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                {result.sources.map((src, i) => {
                                    const catColor = CATEGORY_COLORS[src.category] || "#94a3b8";
                                    return (
                                        <div
                                            key={i}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "0.75rem",
                                                padding: "0.625rem 0.875rem",
                                                background: "var(--bg-card)",
                                                borderRadius: 8,
                                                borderLeft: `3px solid ${catColor}`,
                                            }}
                                        >
                                            <FileText size={14} style={{ color: catColor, flexShrink: 0 }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div
                                                    style={{
                                                        fontSize: "0.8125rem",
                                                        fontWeight: 600,
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    {src.filename}
                                                </div>
                                                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                                                    Page {src.page} · {src.category}
                                                </div>
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: "0.7rem",
                                                    fontFamily: "var(--font-mono)",
                                                    color: "var(--text-muted)",
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {src.score.toFixed(4)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Disclaimer */}
                    <div
                        style={{
                            padding: "0.75rem 1rem",
                            background: "rgba(239, 68, 68, 0.05)",
                            borderRadius: 8,
                            border: "1px solid rgba(239, 68, 68, 0.1)",
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                            lineHeight: 1.5,
                        }}
                    >
                        ⚠️ <strong>Disclaimer:</strong> This information is for general educational purposes only
                        and is not legal advice. It does not replace advice from a licensed attorney, especially
                        in criminal matters where liberty interests are at stake.
                    </div>
                </div>
            )}

            {/* ─── EMPTY STATE ─── */}
            {!result && !loading && !error && (
                <div
                    className="glass-panel"
                    style={{
                        padding: "4rem 2rem",
                        textAlign: "center",
                    }}
                >
                    <Brain
                        size={48}
                        style={{
                            color: "var(--accent-purple)",
                            opacity: 0.3,
                            marginBottom: "1.5rem",
                        }}
                    />
                    <div style={{ fontWeight: 700, fontSize: "1.125rem", marginBottom: "0.5rem" }}>
                        Ask a Legal Question
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "var(--text-muted)", maxWidth: 500, margin: "0 auto", lineHeight: 1.6 }}>
                        Search across {stats?.bm25Chunks || "125+"} legal documents including complaints, motions,
                        receiver reports, court orders, transcripts, and tax filings. Powered by hybrid RAG with
                        BM25 keyword matching + vector similarity search.
                    </div>
                    <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap", marginTop: "1.5rem" }}>
                        {[
                            "PPP loan fraud evidence",
                            "Receiver report findings",
                            "Breach of fiduciary duty",
                            "Embezzlement claims",
                        ].map((suggestion) => (
                            <button
                                key={suggestion}
                                className="workbench-action-btn"
                                onClick={() => setQuery(suggestion)}
                                style={{
                                    fontSize: "0.75rem",
                                    padding: "0.5rem 1rem",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Spinner keyframes */}
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                .spin { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    );
}
