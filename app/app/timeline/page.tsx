"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
    AlertTriangle, CheckCircle2, Clock, Filter, Plus,
    ChevronDown, ChevronRight, ExternalLink, ZapIcon,
    Scale, Building2, Mail, FileText, DollarSign, Ban, X, Loader2, Download, Search, Link2,
    Users, BookX, Landmark, UserX, HandCoins
} from "lucide-react";

// ─── TYPES ───────────────────────────────────────────────────────
type EventCategory = "wire_fraud" | "financial" | "legal" | "deception" | "shadow_business" | "receivership" | "partnership" | "collusion" | "acct_triangulation" | "ppp_fraud" | "unemployment_fraud" | "self_dealing";
type Severity = "critical" | "high" | "medium" | "info";

interface TimelineEvent {
    id: string;
    date: string;
    dateLabel?: string;
    title: string;
    description: string;
    category: EventCategory;
    severity: Severity;
    claims: string[];
    sources?: string[];
    lg?: boolean;
    jz?: boolean;
}

// ─── CATEGORY CONFIG ─────────────────────────────────────────────
const CATEGORIES: Record<EventCategory, { label: string; color: string; icon: React.ElementType }> = {
    wire_fraud: { label: "Wire Fraud", color: "var(--accent-red, #ef4444)", icon: ZapIcon },
    financial: { label: "Financial", color: "var(--accent-amber, #f59e0b)", icon: DollarSign },
    legal: { label: "Legal", color: "var(--accent-purple)", icon: Scale },
    deception: { label: "Deception", color: "var(--accent-pink, #ec4899)", icon: Ban },
    shadow_business: { label: "Shadow Business", color: "var(--accent-cyan)", icon: Building2 },
    receivership: { label: "Receivership", color: "var(--accent-orange, #f97316)", icon: AlertTriangle },
    partnership: { label: "Partnership", color: "var(--accent-emerald)", icon: FileText },
    collusion: { label: "Collusion", color: "#c084fc", icon: Users },
    acct_triangulation: { label: "Acct Triangulation", color: "#fb923c", icon: BookX },
    ppp_fraud: { label: "PPP Fraud", color: "#f43f5e", icon: Landmark },
    unemployment_fraud: { label: "Unemployment", color: "#fbbf24", icon: UserX },
    self_dealing: { label: "Self-Dealing", color: "#f472b6", icon: HandCoins },
};

const SEVERITY_COLORS: Record<Severity, string> = {
    critical: "var(--accent-red, #ef4444)",
    high: "var(--accent-amber, #f59e0b)",
    medium: "var(--accent-cyan)",
    info: "var(--text-muted)",
};

const ALL_CATS = ["all", ...Object.keys(CATEGORIES)] as const;
type FilterCat = typeof ALL_CATS[number];

function formatDate(iso: string) {
    const d = new Date(iso + "T12:00:00Z");
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function groupByYear(events: TimelineEvent[]) {
    const map = new Map<string, TimelineEvent[]>();
    for (const e of events) {
        const yr = e.date.slice(0, 4);
        if (!map.has(yr)) map.set(yr, []);
        map.get(yr)!.push(e);
    }
    return map;
}

export default function TimelinePage() {
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<FilterCat>("all");
    const [selectedSeverity, setSelectedSeverity] = useState<Severity | "all">("all");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [showAddForm, setShowAddForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);

    // ── Email cross-reference state ──
    const [emailMatches, setEmailMatches] = useState<Record<string, { loading: boolean; matches: { msg_id: string; subject: string; sender: string; date: string; score: number }[] }>>({});

    // ── New event form state ──
    const [newEvent, setNewEvent] = useState({
        date: "", title: "", description: "",
        category: "financial" as EventCategory,
        severity: "medium" as Severity,
        lg: false, jz: false,
    });

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/timeline");
            const data = await res.json();
            setEvents(data.events || []);
        } catch {
            console.error("Failed to fetch timeline");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    const filtered = useMemo(() => {
        return events.filter(e => {
            if (selectedCategory !== "all" && e.category !== selectedCategory) return false;
            if (selectedSeverity !== "all" && e.severity !== selectedSeverity) return false;
            if (search) {
                const q = search.toLowerCase();
                if (!e.title.toLowerCase().includes(q) && !e.description.toLowerCase().includes(q)) return false;
            }
            return true;
        }).sort((a, b) => a.date.localeCompare(b.date));
    }, [events, selectedCategory, selectedSeverity, search]);

    const grouped = groupByYear(filtered);
    const criticalCount = filtered.filter(e => e.severity === "critical").length;

    const showToast = (msg: string, error = false) => {
        setToast({ msg, error });
        setTimeout(() => setToast(null), 3000);
    };

    const handleAddEvent = async () => {
        if (!newEvent.date || !newEvent.title || !newEvent.description) {
            showToast("Date, title, and description are required", true);
            return;
        }
        setSaving(true);
        try {
            const eventId = newEvent.title
                .toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)
                + "-" + Date.now().toString(36);
            const res = await fetch("/api/timeline", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    eventId,
                    ...newEvent,
                    claims: [],
                    sources: [],
                }),
            });
            if (res.ok) {
                showToast("Event added");
                setShowAddForm(false);
                setNewEvent({ date: "", title: "", description: "", category: "financial", severity: "medium", lg: false, jz: false });
                fetchEvents();
            } else {
                showToast("Failed to add event", true);
            }
        } catch {
            showToast("Network error", true);
        } finally {
            setSaving(false);
        }
    };

    const inputStyle: React.CSSProperties = {
        background: "var(--bg-glass)",
        border: "var(--glass-border)",
        borderRadius: 6,
        padding: "6px 10px",
        fontSize: "0.8125rem",
        color: "var(--text-primary)",
        width: "100%",
        outline: "none",
    };

    return (
        <div style={{ padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
            {/* Toast */}
            {toast && (
                <div style={{
                    position: "fixed", top: 24, right: 24, zIndex: 9999,
                    padding: "10px 18px", borderRadius: 8,
                    background: toast.error ? "var(--accent-red, #ef4444)" : "var(--accent-emerald)",
                    color: "#fff", fontSize: "0.8125rem", fontWeight: 600,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                }}>
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div style={{ marginBottom: "2rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 700, fontFamily: "var(--font-heading)", margin: 0 }}>
                        Case Timeline
                    </h1>
                    {criticalCount > 0 && (
                        <span style={{
                            background: "var(--accent-red, #ef4444)",
                            color: "#fff", fontSize: "0.7rem", fontWeight: 700,
                            padding: "2px 8px", borderRadius: 999, letterSpacing: "0.05em",
                        }}>
                            {criticalCount} CRITICAL
                        </span>
                    )}
                    <button
                        onClick={async () => {
                            try {
                                const res = await fetch("/api/export/pdf", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ type: "timeline" }),
                                });
                                if (res.ok) {
                                    const blob = await res.blob();
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = `timeline-export-${Date.now()}.pdf`;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                    setToast({ msg: "📄 Timeline PDF downloaded" });
                                }
                            } catch { setToast({ msg: "❌ Export failed", error: true }); }
                        }}
                        style={{
                            background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)",
                            borderRadius: 6, padding: "6px 14px", fontSize: "0.75rem", fontWeight: 700,
                            cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                            color: "#4ade80",
                        }}
                    >
                        <Download size={14} /> Export PDF
                    </button>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        style={{
                            marginLeft: "auto",
                            background: "var(--accent-cyan)",
                            color: "#000", border: "none", borderRadius: 6,
                            padding: "6px 14px", fontSize: "0.75rem", fontWeight: 700,
                            cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                            letterSpacing: "0.03em",
                        }}
                    >
                        {showAddForm ? <X size={14} /> : <Plus size={14} />}
                        {showAddForm ? "Cancel" : "Add Event"}
                    </button>
                </div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>
                    {loading ? "Loading..." : `${filtered.length} events`} · Rowboat Creative v. Guariglia · RC-2026
                </p>
            </div>

            {/* Add Event Form */}
            {showAddForm && (
                <div className="glass-panel" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.75rem" }}>New Timeline Event</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                        <div>
                            <label style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>Date *</label>
                            <input type="date" value={newEvent.date}
                                onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                                style={inputStyle} />
                        </div>
                        <div>
                            <label style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>Category</label>
                            <select value={newEvent.category}
                                onChange={e => setNewEvent({ ...newEvent, category: e.target.value as EventCategory })}
                                style={{ ...inputStyle, cursor: "pointer" }}>
                                {Object.entries(CATEGORIES).map(([k, v]) => (
                                    <option key={k} value={k}>{v.label}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ gridColumn: "1 / -1" }}>
                            <label style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>Title *</label>
                            <input value={newEvent.title}
                                onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                                placeholder="Event title"
                                style={inputStyle} />
                        </div>
                        <div style={{ gridColumn: "1 / -1" }}>
                            <label style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>Description *</label>
                            <textarea value={newEvent.description}
                                onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                                placeholder="What happened..."
                                rows={3}
                                style={{ ...inputStyle, resize: "vertical" }} />
                        </div>
                        <div>
                            <label style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>Severity</label>
                            <select value={newEvent.severity}
                                onChange={e => setNewEvent({ ...newEvent, severity: e.target.value as Severity })}
                                style={{ ...inputStyle, cursor: "pointer" }}>
                                <option value="critical">🔴 Critical</option>
                                <option value="high">🟡 High</option>
                                <option value="medium">🔵 Medium</option>
                                <option value="info">⚪ Info</option>
                            </select>
                        </div>
                        <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.8rem", cursor: "pointer" }}>
                                <input type="checkbox" checked={newEvent.lg}
                                    onChange={e => setNewEvent({ ...newEvent, lg: e.target.checked })} />
                                LG Involved
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.8rem", cursor: "pointer" }}>
                                <input type="checkbox" checked={newEvent.jz}
                                    onChange={e => setNewEvent({ ...newEvent, jz: e.target.checked })} />
                                JZ Involved
                            </label>
                        </div>
                    </div>
                    <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
                        <button onClick={handleAddEvent} disabled={saving}
                            style={{
                                background: "var(--accent-emerald)", color: "#000",
                                border: "none", borderRadius: 6, padding: "8px 20px",
                                fontSize: "0.8rem", fontWeight: 700, cursor: saving ? "wait" : "pointer",
                                opacity: saving ? 0.6 : 1,
                                display: "flex", alignItems: "center", gap: 6,
                            }}>
                            {saving && <Loader2 size={14} className="animate-spin" />}
                            Save Event
                        </button>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="glass-panel" style={{ padding: "1rem 1.25rem", marginBottom: "1.5rem", display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
                <Filter size={14} style={{ color: "var(--text-muted)" }} />

                <input
                    type="text"
                    placeholder="Search events..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                        background: "var(--bg-glass)",
                        border: "var(--glass-border)",
                        borderRadius: 6,
                        padding: "4px 10px",
                        fontSize: "0.8125rem",
                        color: "var(--text-primary)",
                        width: 200,
                        outline: "none",
                    }}
                />

                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    {ALL_CATS.map(cat => {
                        const active = cat === selectedCategory;
                        const color = cat === "all" ? "var(--text-secondary)" : CATEGORIES[cat as EventCategory]?.color;
                        return (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                style={{
                                    background: active ? color : "var(--bg-glass)",
                                    border: `1px solid ${active ? color : "var(--border-glass)"}`,
                                    color: active ? "#fff" : "var(--text-secondary)",
                                    borderRadius: 6,
                                    padding: "3px 10px",
                                    fontSize: "0.7rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    letterSpacing: "0.03em",
                                    textTransform: "uppercase",
                                    transition: "all 0.15s",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {cat === "all" ? "All" : CATEGORIES[cat as EventCategory]?.label}
                            </button>
                        );
                    })}
                </div>

                <select
                    value={selectedSeverity}
                    onChange={e => setSelectedSeverity(e.target.value as Severity | "all")}
                    style={{
                        background: "var(--bg-glass)",
                        border: "var(--glass-border)",
                        borderRadius: 6,
                        padding: "4px 10px",
                        fontSize: "0.8rem",
                        color: "var(--text-primary)",
                        outline: "none",
                        cursor: "pointer",
                    }}
                >
                    <option value="all">All Severities</option>
                    <option value="critical">🔴 Critical</option>
                    <option value="high">🟡 High</option>
                    <option value="medium">🔵 Medium</option>
                    <option value="info">⚪ Info</option>
                </select>
            </div>

            {/* Loading */}
            {loading ? (
                <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                    <Loader2 size={24} className="animate-spin" style={{ margin: "0 auto 1rem" }} />
                    Loading timeline events...
                </div>
            ) : filtered.length === 0 ? (
                <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                    No events match the current filters.
                </div>
            ) : (
                Array.from(grouped.entries()).map(([year, yearEvents]) => (
                    <div key={year} style={{ marginBottom: "2.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
                            <div style={{
                                fontSize: "1.5rem", fontWeight: 800,
                                fontFamily: "var(--font-heading)",
                                color: "var(--text-muted)",
                                letterSpacing: "-0.02em",
                                minWidth: 60,
                            }}>{year}</div>
                            <div style={{ flex: 1, height: 1, background: "var(--border-glass)" }} />
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                                {yearEvents.length} event{yearEvents.length !== 1 ? "s" : ""}
                            </div>
                        </div>

                        <div style={{ position: "relative" }}>
                            <div style={{
                                position: "absolute", left: 20, top: 0, bottom: 0,
                                width: 2, background: "var(--border-glass)", borderRadius: 1,
                            }} />

                            {yearEvents.map((event) => {
                                const cat = CATEGORIES[event.category];
                                if (!cat) return null;
                                const isExpanded = expandedId === event.id;
                                const CatIcon = cat.icon;

                                return (
                                    <div key={event.id} style={{ position: "relative", paddingLeft: 52, marginBottom: "0.875rem" }}>
                                        <div style={{
                                            position: "absolute", left: 12, top: 16,
                                            width: 18, height: 18, borderRadius: "50%",
                                            background: SEVERITY_COLORS[event.severity],
                                            boxShadow: event.severity === "critical"
                                                ? `0 0 10px ${SEVERITY_COLORS[event.severity]}` : undefined,
                                            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1,
                                        }}>
                                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />
                                        </div>

                                        <div
                                            className="glass-panel"
                                            onClick={() => setExpandedId(isExpanded ? null : event.id)}
                                            style={{
                                                cursor: "pointer",
                                                border: isExpanded
                                                    ? `1px solid ${cat.color}`
                                                    : event.severity === "critical"
                                                        ? `1px solid ${SEVERITY_COLORS.critical}40`
                                                        : undefined,
                                                transition: "all 0.2s",
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "0.875rem 1rem" }}>
                                                <div style={{
                                                    width: 28, height: 28, borderRadius: 6,
                                                    background: `${cat.color}22`, border: `1px solid ${cat.color}44`,
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    flexShrink: 0, marginTop: 2,
                                                }}>
                                                    <CatIcon size={14} style={{ color: cat.color }} />
                                                </div>

                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
                                                        <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                                                            {formatDate(event.date)}
                                                        </span>
                                                        <span style={{ fontSize: "0.65rem", fontWeight: 700, color: cat.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                                            {cat.label}
                                                        </span>
                                                        {event.severity === "critical" && (
                                                            <span style={{
                                                                fontSize: "0.6rem", fontWeight: 700, color: SEVERITY_COLORS.critical,
                                                                background: `${SEVERITY_COLORS.critical}22`,
                                                                border: `1px solid ${SEVERITY_COLORS.critical}44`,
                                                                padding: "1px 6px", borderRadius: 4, letterSpacing: "0.05em",
                                                            }}>CRITICAL</span>
                                                        )}
                                                        {event.lg && <span style={{ fontSize: "0.65rem", color: "var(--accent-red, #ef4444)", fontWeight: 600 }}>LG</span>}
                                                        {event.jz && <span style={{ fontSize: "0.65rem", color: "var(--accent-emerald)", fontWeight: 600 }}>JZ</span>}
                                                    </div>
                                                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4 }}>
                                                        {event.title}
                                                    </div>
                                                </div>

                                                <div style={{ flexShrink: 0, color: "var(--text-muted)", marginTop: 4 }}>
                                                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div style={{ padding: "0 1rem 1rem 1rem", borderTop: "1px solid var(--border-glass)", paddingTop: "0.875rem" }}>
                                                    <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.875rem 0" }}>
                                                        {event.description}
                                                    </p>
                                                    {event.claims.length > 0 && (
                                                        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                                                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600, alignSelf: "center" }}>Claims:</span>
                                                            {event.claims.map(claim => (
                                                                <a key={claim} href="/case-corner" onClick={e => e.stopPropagation()}
                                                                    style={{
                                                                        fontSize: "0.7rem", color: "var(--accent-cyan)",
                                                                        background: "var(--accent-cyan-10, rgba(0,255,255,0.08))",
                                                                        border: "1px solid var(--accent-cyan-30, rgba(0,255,255,0.2))",
                                                                        padding: "2px 8px", borderRadius: 4,
                                                                        textDecoration: "none",
                                                                        fontFamily: "var(--font-mono)",
                                                                        display: "flex", alignItems: "center", gap: 4,
                                                                    }}>
                                                                    {claim}
                                                                    <ExternalLink size={10} />
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Find Matching Emails */}
                                                    <div style={{ marginTop: "0.75rem", borderTop: "1px solid var(--border-glass)", paddingTop: "0.75rem" }}>
                                                        {!emailMatches[event.id] ? (
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    setEmailMatches(prev => ({ ...prev, [event.id]: { loading: true, matches: [] } }));
                                                                    try {
                                                                        const eventDate = new Date(event.date + "T12:00:00Z");
                                                                        const startDate = new Date(eventDate);
                                                                        startDate.setDate(startDate.getDate() - 7);
                                                                        const endDate = new Date(eventDate);
                                                                        endDate.setDate(endDate.getDate() + 7);

                                                                        const keywords = event.title.replace(/[^a-zA-Z0-9\s]/g, " ").split(/\s+/).filter((w: string) => w.length > 3).slice(0, 4);
                                                                        const searchQ = keywords.join(" ");

                                                                        const res = await fetch(`/api/communications?q=${encodeURIComponent(searchQ)}&from=${startDate.toISOString().slice(0, 10)}&to=${endDate.toISOString().slice(0, 10)}&limit=5`);
                                                                        const data = await res.json();
                                                                        setEmailMatches(prev => ({
                                                                            ...prev,
                                                                            [event.id]: {
                                                                                loading: false,
                                                                                matches: (data.messages || []).map((m: { msg_id: string; subject: string; sender: string; date: string }) => ({
                                                                                    msg_id: m.msg_id, subject: m.subject, sender: m.sender, date: m.date, score: 1,
                                                                                })),
                                                                            },
                                                                        }));
                                                                    } catch {
                                                                        setEmailMatches(prev => ({ ...prev, [event.id]: { loading: false, matches: [] } }));
                                                                        setToast({ msg: "❌ Email search failed", error: true });
                                                                    }
                                                                }}
                                                                style={{
                                                                    background: "rgba(0,242,255,0.06)", border: "1px solid rgba(0,242,255,0.2)",
                                                                    borderRadius: 6, padding: "5px 12px", fontSize: "0.72rem", fontWeight: 600,
                                                                    cursor: "pointer", color: "var(--accent-cyan)",
                                                                    display: "flex", alignItems: "center", gap: 5,
                                                                }}
                                                            >
                                                                <Search size={12} /> Find Matching Emails (±7 days)
                                                            </button>
                                                        ) : emailMatches[event.id].loading ? (
                                                            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                                                <Loader2 size={14} className="animate-spin" /> Searching 516K emails...
                                                            </div>
                                                        ) : emailMatches[event.id].matches.length === 0 ? (
                                                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                                                No matching emails found in ±7 day window
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                                                                    <Link2 size={11} /> {emailMatches[event.id].matches.length} matching email{emailMatches[event.id].matches.length !== 1 ? "s" : ""}
                                                                </div>
                                                                {emailMatches[event.id].matches.map((m, i) => (
                                                                    <a key={i} href={`/communications?id=${encodeURIComponent(m.msg_id)}`}
                                                                        onClick={e => e.stopPropagation()}
                                                                        style={{
                                                                            display: "block", padding: "6px 8px", marginBottom: 4,
                                                                            background: "rgba(0,242,255,0.03)", borderRadius: 5,
                                                                            border: "1px solid rgba(0,242,255,0.1)",
                                                                            textDecoration: "none", color: "inherit",
                                                                            transition: "background 0.15s",
                                                                        }}
                                                                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,242,255,0.08)")}
                                                                        onMouseLeave={e => (e.currentTarget.style.background = "rgba(0,242,255,0.03)")}
                                                                    >
                                                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                                            <Mail size={11} style={{ color: "var(--accent-cyan)", flexShrink: 0 }} />
                                                                            <span style={{ fontSize: "0.75rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                                                {m.subject || "(no subject)"}
                                                                            </span>
                                                                        </div>
                                                                        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: 2, marginLeft: 17 }}>
                                                                            {m.sender?.split("<")[0]?.trim()} · {new Date(m.date).toLocaleDateString()}
                                                                        </div>
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
