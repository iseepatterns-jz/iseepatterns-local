"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Search,
    Scale,
    FileText,
    ChevronRight,
    X,
    Calendar,
    File,
    Hash,
    Filter,
    ExternalLink,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────

interface CourtDocument {
    id: string;
    filename: string;
    date: string;
    title: string;
    category: "filing" | "evidence" | "order" | "notice" | "exhibit" | "other";
    sizeBytes: number;
    relativePath: string;
}

interface ComplaintParagraph {
    id: string;
    name: string;
    complaint: string;
    response: string;
    group: string;
    category: string;
    subCategory: string;
    paragraphNum: string;
    pageNum: string;
}

// ─── Helpers ─────────────────────────────────────────────────────

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const CATEGORY_COLORS: Record<string, string> = {
    filing: "#00f5d4",
    evidence: "#f77f00",
    order: "#e63946",
    notice: "#7b68ee",
    exhibit: "#48cae4",
    other: "#999",
};

const CATEGORY_LABELS: Record<string, string> = {
    filing: "Filing",
    evidence: "Evidence",
    order: "Order",
    notice: "Notice",
    exhibit: "Exhibit",
    other: "Other",
};

// Group color palette for complaint sections
const GROUP_COLORS = [
    "#00f5d4", "#f77f00", "#e63946", "#7b68ee",
    "#48cae4", "#06d6a0", "#ef476f", "#ffd166",
];

function groupColor(idx: number): string {
    return GROUP_COLORS[idx % GROUP_COLORS.length];
}

// ─── Component ───────────────────────────────────────────────────

type TabType = "filings" | "complaint" | "evidence";

export default function LegalPage() {
    // Tab state
    const [activeTab, setActiveTab] = useState<TabType>("filings");

    // Documents state
    const [documents, setDocuments] = useState<CourtDocument[]>([]);
    const [docSearch, setDocSearch] = useState("");
    const [docCategory, setDocCategory] = useState("");
    const [docLoading, setDocLoading] = useState(true);
    const [docTotal, setDocTotal] = useState(0);
    const [categories, setCategories] = useState<Record<string, number>>({});

    // Complaint state
    const [paragraphs, setParagraphs] = useState<ComplaintParagraph[]>([]);
    const [complaintSearch, setComplaintSearch] = useState("");
    const [complaintGroup, setComplaintGroup] = useState("");
    const [complaintLoading, setComplaintLoading] = useState(false);
    const [groups, setGroups] = useState<string[]>([]);

    // Viewer state
    const [viewerPath, setViewerPath] = useState<string | null>(null);
    const [viewerTitle, setViewerTitle] = useState("");

    // ─── Fetch documents ────────────────────────────────────────

    const fetchDocuments = useCallback(async () => {
        setDocLoading(true);
        const params = new URLSearchParams();
        if (docSearch) params.set("q", docSearch);
        if (docCategory) params.set("category", docCategory);
        try {
            const res = await fetch(`/api/legal?${params}`);
            const data = await res.json();
            setDocuments(data.documents || []);
            setDocTotal(data.total || 0);
            setCategories(data.categories || {});
        } catch (e) {
            console.error("Failed to fetch documents:", e);
        }
        setDocLoading(false);
    }, [docSearch, docCategory]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    // ─── Fetch complaints ───────────────────────────────────────

    const fetchComplaints = useCallback(async () => {
        setComplaintLoading(true);
        const params = new URLSearchParams();
        if (complaintSearch) params.set("q", complaintSearch);
        if (complaintGroup) params.set("group", complaintGroup);
        try {
            const res = await fetch(`/api/legal/complaints?${params}`);
            const data = await res.json();
            setParagraphs(data.paragraphs || []);
            setGroups(data.groups || []);
        } catch (e) {
            console.error("Failed to fetch complaints:", e);
        }
        setComplaintLoading(false);
    }, [complaintSearch, complaintGroup]);

    useEffect(() => {
        if (activeTab === "complaint") {
            fetchComplaints();
        }
    }, [activeTab, fetchComplaints]);

    // ─── Filtered data ──────────────────────────────────────────

    const filingDocs = documents.filter(
        (d) => d.category !== "evidence"
    );
    const evidenceDocs = documents.filter(
        (d) => d.category === "evidence"
    );

    // Group complaint paragraphs by category
    const complaintByCategory: Record<string, ComplaintParagraph[]> = {};
    for (const p of paragraphs) {
        const cat = p.category || "Uncategorized";
        if (!complaintByCategory[cat]) complaintByCategory[cat] = [];
        complaintByCategory[cat].push(p);
    }

    // ─── Render ─────────────────────────────────────────────────

    const openDocument = (doc: CourtDocument) => {
        setViewerPath(doc.relativePath);
        setViewerTitle(doc.title);
    };

    const closeViewer = () => {
        setViewerPath(null);
        setViewerTitle("");
    };

    // Tab button style
    const tabStyle = (tab: TabType) => ({
        padding: "0.5rem 1.25rem",
        borderRadius: "6px 6px 0 0",
        border: "none",
        cursor: "pointer",
        fontWeight: activeTab === tab ? 700 : 400,
        fontSize: "0.85rem",
        letterSpacing: "0.03em",
        background:
            activeTab === tab
                ? "rgba(0, 245, 212, 0.12)"
                : "transparent",
        color:
            activeTab === tab ? "var(--accent-cyan)" : "var(--text-muted)",
        borderBottom:
            activeTab === tab
                ? "2px solid var(--accent-cyan)"
                : "2px solid transparent",
        transition: "all 0.2s ease",
    });

    return (
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
            {/* Header */}
            <div className="page-header">
                <h1 style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <Scale size={28} />
                    Legal
                </h1>
                <p>
                    Court filings, complaint analysis, and evidence — Case 2024CH00720
                </p>
            </div>

            {/* Tabs */}
            <div
                style={{
                    display: "flex",
                    gap: "0.25rem",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    marginBottom: "1.25rem",
                }}
            >
                <button style={tabStyle("filings")} onClick={() => setActiveTab("filings")}>
                    <FileText size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                    Filings ({filingDocs.length})
                </button>
                <button style={tabStyle("complaint")} onClick={() => setActiveTab("complaint")}>
                    <Hash size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                    Complaint
                </button>
                <button style={tabStyle("evidence")} onClick={() => setActiveTab("evidence")}>
                    <File size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                    Evidence ({evidenceDocs.length})
                </button>
            </div>

            {/* ─── Filings Tab ──────────────────────────────────── */}
            {activeTab === "filings" && (
                <div>
                    {/* Search + Filter */}
                    <div
                        style={{
                            display: "flex",
                            gap: "0.75rem",
                            marginBottom: "1rem",
                            flexWrap: "wrap",
                            alignItems: "center",
                        }}
                    >
                        <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 400 }}>
                            <Search
                                size={16}
                                style={{
                                    position: "absolute",
                                    left: 10,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    color: "var(--text-muted)",
                                }}
                            />
                            <input
                                className="input-glass"
                                placeholder="Search filings..."
                                value={docSearch}
                                onChange={(e) => setDocSearch(e.target.value)}
                                style={{ paddingLeft: 34 }}
                            />
                        </div>

                        {/* Category chips */}
                        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                            <button
                                className={`btn-chip ${!docCategory ? "active" : ""}`}
                                onClick={() => setDocCategory("")}
                                style={{
                                    padding: "0.25rem 0.6rem",
                                    borderRadius: 12,
                                    fontSize: "0.7rem",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    background: !docCategory ? "rgba(0,245,212,0.15)" : "transparent",
                                    color: !docCategory ? "var(--accent-cyan)" : "var(--text-muted)",
                                    cursor: "pointer",
                                }}
                            >
                                All
                            </button>
                            {Object.entries(categories).map(([cat, count]) => (
                                <button
                                    key={cat}
                                    onClick={() => setDocCategory(docCategory === cat ? "" : cat)}
                                    style={{
                                        padding: "0.25rem 0.6rem",
                                        borderRadius: 12,
                                        fontSize: "0.7rem",
                                        border: `1px solid ${docCategory === cat
                                                ? CATEGORY_COLORS[cat] || "#555"
                                                : "rgba(255,255,255,0.1)"
                                            }`,
                                        background:
                                            docCategory === cat
                                                ? `${CATEGORY_COLORS[cat]}22`
                                                : "transparent",
                                        color:
                                            docCategory === cat
                                                ? CATEGORY_COLORS[cat]
                                                : "var(--text-muted)",
                                        cursor: "pointer",
                                    }}
                                >
                                    {CATEGORY_LABELS[cat] || cat} ({count})
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Document List */}
                    {docLoading ? (
                        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                            Loading filings...
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                            {filingDocs.map((doc) => (
                                <div
                                    key={doc.id}
                                    onClick={() => openDocument(doc)}
                                    className="card-glass"
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.75rem",
                                        padding: "0.625rem 0.875rem",
                                        cursor: "pointer",
                                        transition: "all 0.2s ease",
                                        borderLeft: `3px solid ${CATEGORY_COLORS[doc.category] || "#555"}`,
                                    }}
                                >
                                    <FileText
                                        size={16}
                                        style={{
                                            flexShrink: 0,
                                            color: CATEGORY_COLORS[doc.category] || "#555",
                                        }}
                                    />
                                    {doc.date && (
                                        <span
                                            style={{
                                                fontFamily: "var(--font-mono)",
                                                fontSize: "0.7rem",
                                                color: "var(--text-muted)",
                                                flexShrink: 0,
                                                width: 85,
                                            }}
                                        >
                                            {doc.date}
                                        </span>
                                    )}
                                    <span
                                        style={{
                                            fontSize: "0.8rem",
                                            color: "var(--text-primary)",
                                            flex: 1,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {doc.title}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: "0.6rem",
                                            padding: "2px 6px",
                                            borderRadius: 8,
                                            background: `${CATEGORY_COLORS[doc.category]}22`,
                                            color: CATEGORY_COLORS[doc.category],
                                            textTransform: "uppercase",
                                            fontWeight: 600,
                                            letterSpacing: "0.05em",
                                            flexShrink: 0,
                                        }}
                                    >
                                        {CATEGORY_LABELS[doc.category] || doc.category}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: "0.65rem",
                                            color: "var(--text-muted)",
                                            flexShrink: 0,
                                            width: 55,
                                            textAlign: "right",
                                        }}
                                    >
                                        {formatSize(doc.sizeBytes)}
                                    </span>
                                    <ChevronRight
                                        size={14}
                                        style={{ color: "var(--text-muted)", flexShrink: 0 }}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ─── Complaint Tab ─────────────────────────────────── */}
            {activeTab === "complaint" && (
                <div>
                    {/* Search + Group Filter */}
                    <div
                        style={{
                            display: "flex",
                            gap: "0.75rem",
                            marginBottom: "1rem",
                            flexWrap: "wrap",
                            alignItems: "center",
                        }}
                    >
                        <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 400 }}>
                            <Search
                                size={16}
                                style={{
                                    position: "absolute",
                                    left: 10,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    color: "var(--text-muted)",
                                }}
                            />
                            <input
                                className="input-glass"
                                placeholder="Search complaint text..."
                                value={complaintSearch}
                                onChange={(e) => setComplaintSearch(e.target.value)}
                                style={{ paddingLeft: 34 }}
                            />
                        </div>
                        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                            <button
                                onClick={() => setComplaintGroup("")}
                                style={{
                                    padding: "0.25rem 0.6rem",
                                    borderRadius: 12,
                                    fontSize: "0.7rem",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    background: !complaintGroup ? "rgba(0,245,212,0.15)" : "transparent",
                                    color: !complaintGroup ? "var(--accent-cyan)" : "var(--text-muted)",
                                    cursor: "pointer",
                                }}
                            >
                                <Filter size={10} style={{ marginRight: 4, verticalAlign: -1 }} />
                                All Groups
                            </button>
                            {groups.map((g, idx) => (
                                <button
                                    key={g}
                                    onClick={() => setComplaintGroup(complaintGroup === g ? "" : g)}
                                    style={{
                                        padding: "0.25rem 0.6rem",
                                        borderRadius: 12,
                                        fontSize: "0.7rem",
                                        border: `1px solid ${complaintGroup === g
                                                ? groupColor(idx)
                                                : "rgba(255,255,255,0.1)"
                                            }`,
                                        background:
                                            complaintGroup === g
                                                ? `${groupColor(idx)}22`
                                                : "transparent",
                                        color:
                                            complaintGroup === g
                                                ? groupColor(idx)
                                                : "var(--text-muted)",
                                        cursor: "pointer",
                                    }}
                                >
                                    {g}
                                </button>
                            ))}
                        </div>
                    </div>

                    {complaintLoading ? (
                        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                            Loading complaint...
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                            {Object.entries(complaintByCategory).map(([cat, paras], catIdx) => (
                                <div key={cat} className="card-glass" style={{ padding: "1rem" }}>
                                    {/* Category header */}
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.5rem",
                                            marginBottom: "0.75rem",
                                            borderBottom: `1px solid ${groupColor(catIdx)}33`,
                                            paddingBottom: "0.5rem",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: "50%",
                                                background: groupColor(catIdx),
                                                flexShrink: 0,
                                            }}
                                        />
                                        <h3
                                            style={{
                                                margin: 0,
                                                fontSize: "0.85rem",
                                                fontWeight: 700,
                                                color: groupColor(catIdx),
                                            }}
                                        >
                                            {cat}
                                        </h3>
                                        <span
                                            style={{
                                                fontSize: "0.65rem",
                                                color: "var(--text-muted)",
                                            }}
                                        >
                                            {paras.length} paragraph{paras.length !== 1 ? "s" : ""}
                                        </span>
                                    </div>

                                    {/* Paragraphs */}
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                        {paras.map((p) => (
                                            <div
                                                key={p.id || p.name}
                                                style={{
                                                    display: "flex",
                                                    gap: "0.625rem",
                                                    padding: "0.375rem 0",
                                                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                                                }}
                                            >
                                                {/* Para number */}
                                                <span
                                                    style={{
                                                        fontFamily: "var(--font-mono)",
                                                        fontSize: "0.65rem",
                                                        color: groupColor(catIdx),
                                                        flexShrink: 0,
                                                        width: 30,
                                                        textAlign: "right",
                                                        paddingTop: 2,
                                                        opacity: 0.7,
                                                    }}
                                                >
                                                    ¶{p.paragraphNum}
                                                </span>
                                                <div style={{ flex: 1 }}>
                                                    {/* Sub-category label */}
                                                    {p.subCategory && (
                                                        <div
                                                            style={{
                                                                fontSize: "0.6rem",
                                                                color: "var(--text-muted)",
                                                                textTransform: "uppercase",
                                                                letterSpacing: "0.05em",
                                                                marginBottom: 2,
                                                            }}
                                                        >
                                                            {p.subCategory}
                                                        </div>
                                                    )}
                                                    {/* Complaint text */}
                                                    <p
                                                        style={{
                                                            margin: 0,
                                                            fontSize: "0.8rem",
                                                            color: "var(--text-primary)",
                                                            lineHeight: 1.6,
                                                        }}
                                                    >
                                                        {p.complaint}
                                                    </p>
                                                    {/* Response if present */}
                                                    {p.response && (
                                                        <div
                                                            style={{
                                                                marginTop: "0.375rem",
                                                                padding: "0.375rem 0.625rem",
                                                                borderLeft: "2px solid rgba(239,71,111,0.4)",
                                                                background: "rgba(239,71,111,0.05)",
                                                                borderRadius: 4,
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    fontSize: "0.6rem",
                                                                    color: "#ef476f",
                                                                    fontWeight: 600,
                                                                    letterSpacing: "0.05em",
                                                                    textTransform: "uppercase",
                                                                }}
                                                            >
                                                                Response
                                                            </span>
                                                            <p
                                                                style={{
                                                                    margin: "0.25rem 0 0",
                                                                    fontSize: "0.75rem",
                                                                    color: "rgba(255,255,255,0.7)",
                                                                    lineHeight: 1.5,
                                                                }}
                                                            >
                                                                {p.response}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Page number */}
                                                <span
                                                    style={{
                                                        fontSize: "0.6rem",
                                                        color: "var(--text-muted)",
                                                        flexShrink: 0,
                                                        paddingTop: 2,
                                                    }}
                                                >
                                                    p.{p.pageNum}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ─── Evidence Tab ──────────────────────────────────── */}
            {activeTab === "evidence" && (
                <div>
                    <div style={{ position: "relative", maxWidth: 400, marginBottom: "1rem" }}>
                        <Search
                            size={16}
                            style={{
                                position: "absolute",
                                left: 10,
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "var(--text-muted)",
                            }}
                        />
                        <input
                            className="input-glass"
                            placeholder="Search evidence..."
                            value={docSearch}
                            onChange={(e) => setDocSearch(e.target.value)}
                            style={{ paddingLeft: 34 }}
                        />
                    </div>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                            gap: "0.75rem",
                        }}
                    >
                        {evidenceDocs.map((doc) => (
                            <div
                                key={doc.id}
                                onClick={() => openDocument(doc)}
                                className="card-glass"
                                style={{
                                    padding: "0.75rem",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                    borderLeft: `3px solid ${CATEGORY_COLORS.evidence}`,
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "flex-start",
                                        gap: "0.5rem",
                                    }}
                                >
                                    <File
                                        size={16}
                                        style={{
                                            flexShrink: 0,
                                            color: CATEGORY_COLORS.evidence,
                                            marginTop: 2,
                                        }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                            style={{
                                                fontSize: "0.78rem",
                                                color: "var(--text-primary)",
                                                lineHeight: 1.4,
                                                marginBottom: "0.25rem",
                                            }}
                                        >
                                            {doc.title}
                                        </div>
                                        <div
                                            style={{
                                                display: "flex",
                                                gap: "0.75rem",
                                                fontSize: "0.65rem",
                                                color: "var(--text-muted)",
                                            }}
                                        >
                                            {doc.date && (
                                                <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                                    <Calendar size={10} />
                                                    {doc.date}
                                                </span>
                                            )}
                                            <span>{formatSize(doc.sizeBytes)}</span>
                                        </div>
                                    </div>
                                    <ExternalLink
                                        size={12}
                                        style={{ color: "var(--text-muted)", flexShrink: 0 }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── PDF Viewer Overlay ───────────────────────────── */}
            {viewerPath && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(0,0,0,0.85)",
                        zIndex: 1000,
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    {/* Viewer header */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                            padding: "0.75rem 1.25rem",
                            background: "rgba(20,20,30,0.95)",
                            borderBottom: "1px solid rgba(255,255,255,0.08)",
                        }}
                    >
                        <FileText size={18} style={{ color: "var(--accent-cyan)" }} />
                        <span
                            style={{
                                flex: 1,
                                fontSize: "0.85rem",
                                color: "var(--text-primary)",
                                fontWeight: 600,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {viewerTitle}
                        </span>
                        <button
                            onClick={() =>
                                window.open(
                                    `/api/legal/document?path=${encodeURIComponent(viewerPath)}`,
                                    "_blank"
                                )
                            }
                            style={{
                                padding: "0.3rem 0.6rem",
                                borderRadius: 6,
                                border: "1px solid rgba(255,255,255,0.1)",
                                background: "transparent",
                                color: "var(--text-muted)",
                                cursor: "pointer",
                                fontSize: "0.7rem",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                            }}
                        >
                            <ExternalLink size={12} />
                            Open in tab
                        </button>
                        <button
                            onClick={closeViewer}
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                border: "1px solid rgba(255,255,255,0.1)",
                                background: "rgba(255,255,255,0.05)",
                                color: "var(--text-muted)",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* PDF embed */}
                    <div style={{ flex: 1, padding: "0.5rem" }}>
                        <iframe
                            src={`/api/legal/document?path=${encodeURIComponent(viewerPath)}`}
                            style={{
                                width: "100%",
                                height: "100%",
                                border: "none",
                                borderRadius: 8,
                                background: "#fff",
                            }}
                            title={viewerTitle}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
