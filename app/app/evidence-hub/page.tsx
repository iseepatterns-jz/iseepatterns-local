"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
    Search, Filter, ChevronLeft, ChevronRight, Mail, MessageSquare, Shield,
    Clock, Tag, User, FileText, ExternalLink, RefreshCw, BarChart2, X,
    Highlighter, Flag, AlertTriangle, Info, Trash2, Plus, Database, Server,
    Archive, HardDrive, ChevronDown, MessageCircle, Bookmark, GripVertical
} from "lucide-react";

/* ─── types ─── */
interface EvidenceItem {
    id: number;
    canonical_id: string;
    source_type: string;
    title: string;
    summary: string;
    preview: string;
    start_timestamp: string;
    tags: string;
    primary_ids: string;
}

interface DetailResult {
    evidence: {
        id: number;
        canonical_id: string;
        source_type: string;
        title: string;
        summary: string;
        body_snippet: string;
        start_timestamp: string;
        tags: string;
        primary_ids: string;
        extra: string;
        origins: string;
    };
    participants: { identifier: string; normalized_identifier: string; role: string }[];
    provenance: { origin_system: string; source_file: string; source_rowid: number; created_at: string }[];
}

interface Stats {
    total: number;
    sources: { source_type: string; count: number }[];
    participants: { id: string; count: number }[];
    origins: { origin_system: string; count: number }[];
    tags: { tag: string; count: number }[];
}

interface Annotation {
    id: number;
    evidence_id: number;
    annotation_type: string;
    selected_text: string;
    note: string;
    color: string;
    flag_level: string;
    tags: string;
    created_at: string;
}

interface CoCStep { label: string; detail: string; icon: string; timestamp?: string }
interface CoCChain {
    origin_system: string;
    source_file: string;
    source_rowid: string;
    steps: CoCStep[];
}
interface CoCData {
    evidence_id: number;
    chain: CoCChain[];
    participants: { identifier: string; normalized_identifier: string; role: string }[];
    origin_count: number;
}

const FLAG_LEVELS = [
    { value: "critical", label: "Critical", color: "#ef4444", icon: AlertTriangle },
    { value: "important", label: "Important", color: "#f59e0b", icon: Flag },
    { value: "review", label: "Review", color: "#3b82f6", icon: Bookmark },
    { value: "info", label: "Info", color: "#64748b", icon: Info },
];

const HIGHLIGHT_COLORS = ["#fbbf24", "#34d399", "#60a5fa", "#f472b6", "#a78bfa"];

const cocIcon = (type: string) => {
    switch (type) {
        case "archive": return <Archive size={14} />;
        case "database": return <Database size={14} />;
        case "server": return <Server size={14} />;
        case "shield": return <Shield size={14} />;
        default: return <HardDrive size={14} />;
    }
};

/* ─── helpers ─── */
const fmtDate = (d: string) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
    catch { return d; }
};

const sourceIcon = (t: string) => {
    switch (t) {
        case "email": return <Mail size={14} />;
        case "imessage": return <MessageSquare size={14} />;
        case "tax": return <FileText size={14} />;
        default: return <MessageSquare size={14} />;
    }
};
const sourceColor = (t: string) => {
    switch (t) {
        case "email": return "var(--accent-blue)";
        case "imessage": return "var(--accent-green)";
        case "tax": return "#a78bfa";
        default: return "var(--accent-green)";
    }
};

const parseTags = (tags: string): string[] => {
    if (!tags) return [];
    try { 
        const arr = JSON.parse(tags); 
        if (!Array.isArray(arr)) return [];
        return Array.from(new Set(arr.map(t => String(t))));
    }
    catch { return []; }
};

/* ─── component ─── */
export default function EvidenceHubPage() {
    const [query, setQuery] = useState("");
    const [sourceFilter, setSourceFilter] = useState("");
    const [tagFilter, setTagFilter] = useState("");
    const [participantFilter, setParticipantFilter] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [page, setPage] = useState(1);
    const [results, setResults] = useState<EvidenceItem[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [detail, setDetail] = useState<DetailResult | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [stats, setStats] = useState<Stats | null>(null);
    const [showStats, setShowStats] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [searchMode, setSearchMode] = useState("");
    const limit = 50;

    // ── Annotations & CoC state ──
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [cocData, setCocData] = useState<CoCData | null>(null);
    const [showCoC, setShowCoC] = useState(false);
    const [highlightPopup, setHighlightPopup] = useState<{ text: string; x: number; y: number } | null>(null);
    const [highlightNote, setHighlightNote] = useState("");
    const [highlightColor, setHighlightColor] = useState(HIGHLIGHT_COLORS[0]);
    const [savingAnnotation, setSavingAnnotation] = useState(false);
    const [detailTab, setDetailTab] = useState<"body" | "annotations" | "coc" | "ai">("body");
    const [aiResponse, setAiResponse] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const bodyRef = useRef<HTMLDivElement>(null);

    // ── Resizable detail panel ──
    const [detailWidth, setDetailWidth] = useState(420);
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

    const handleResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        dragRef.current = { startX: e.clientX, startWidth: detailWidth };
        setIsDragging(true);
    }, [detailWidth]);

    useEffect(() => {
        if (!isDragging) return;
        const onMove = (e: MouseEvent) => {
            if (!dragRef.current) return;
            const delta = dragRef.current.startX - e.clientX;
            const newWidth = Math.min(800, Math.max(300, dragRef.current.startWidth + delta));
            setDetailWidth(newWidth);
        };
        const onUp = () => {
            setIsDragging(false);
            dragRef.current = null;
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
        // Prevent text selection during drag
        document.body.style.userSelect = "none";
        document.body.style.cursor = "col-resize";
        return () => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
            document.body.style.userSelect = "";
            document.body.style.cursor = "";
        };
    }, [isDragging]);

    // ── Conversation Playlists ──
    interface Conversation { id: number; name: string; description: string | null; color: string; message_count: number; created_at: string; updated_at: string }
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<number | null>(null);
    const [convMessages, setConvMessages] = useState<any[]>([]);
    const [showConvPicker, setShowConvPicker] = useState(false);
    const [showCreateConv, setShowCreateConv] = useState(false);
    const [newConvName, setNewConvName] = useState("");
    const [convLoading, setConvLoading] = useState(false);

    const fetchConversations = useCallback(async () => {
        try {
            const res = await fetch("/api/conversations");
            const data = await res.json();
            setConversations(data.conversations || []);
        } catch (e) { console.error("fetch conversations err:", e); }
    }, []);

    const createConversation = useCallback(async (name: string) => {
        if (!name.trim()) return;
        try {
            const res = await fetch("/api/conversations?action=create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim() }),
            });
            const data = await res.json();
            if (data.id) {
                await fetchConversations();
                setNewConvName("");
                setShowCreateConv(false);
            }
        } catch (e) { console.error("create conv err:", e); }
    }, [fetchConversations]);

    const addToConversation = useCallback(async (convId: number, rowids: number[]) => {
        try {
            await fetch("/api/conversations?action=add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conversation_id: convId, message_rowids: rowids }),
            });
            await fetchConversations();
            if (activeConversation === convId) loadConversation(convId);
        } catch (e) { console.error("add to conv err:", e); }
    }, [fetchConversations, activeConversation]);

    const bulkAddToConversation = useCallback(async (convId: number) => {
        try {
            await fetch("/api/conversations?action=bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    conversation_id: convId,
                    participant: participantFilter || undefined,
                    date_from: dateFrom || undefined,
                    date_to: dateTo || undefined,
                    q: query || undefined,
                }),
            });
            await fetchConversations();
            if (activeConversation === convId) loadConversation(convId);
        } catch (e) { console.error("bulk add err:", e); }
    }, [fetchConversations, activeConversation, participantFilter, dateFrom, dateTo, query]);

    const loadConversation = useCallback(async (id: number) => {
        setConvLoading(true);
        try {
            const res = await fetch(`/api/conversations?id=${id}`);
            const data = await res.json();
            setConvMessages(data.messages || []);
        } catch (e) { console.error("load conv err:", e); }
        setConvLoading(false);
    }, []);

    const removeFromConversation = useCallback(async (convId: number, rowids: number[]) => {
        try {
            await fetch("/api/conversations?action=remove", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conversation_id: convId, message_rowids: rowids }),
            });
            await fetchConversations();
            if (activeConversation === convId) loadConversation(convId);
        } catch (e) { console.error("remove from conv err:", e); }
    }, [fetchConversations, activeConversation, loadConversation]);

    const deleteConversation = useCallback(async (id: number) => {
        if (!confirm("Delete this conversation playlist?")) return;
        try {
            await fetch(`/api/conversations?id=${id}`, { method: "DELETE" });
            if (activeConversation === id) {
                setActiveConversation(null);
                setConvMessages([]);
            }
            await fetchConversations();
        } catch (e) { console.error("delete conv err:", e); }
    }, [fetchConversations, activeConversation]);

    // Load conversations on mount
    useEffect(() => { fetchConversations(); }, [fetchConversations]);

    // Load conversation messages when active changes
    useEffect(() => {
        if (activeConversation) loadConversation(activeConversation);
    }, [activeConversation, loadConversation]);

    const fetchResults = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: String(limit) });
            if (query) params.set("q", query);
            if (sourceFilter) params.set("source_type", sourceFilter);
            if (tagFilter) params.set("tag", tagFilter);
            if (participantFilter) params.set("participant", participantFilter);
            if (dateFrom) params.set("date_from", dateFrom);
            if (dateTo) params.set("date_to", dateTo);
            const res = await fetch(`/api/evidence-hub?${params}`);
            const data = await res.json();
            setResults(data.results || []);
            setTotal(data.total || 0);
            setTotalPages(data.totalPages || 0);
            setSearchMode(data.searchMode || "");
        } catch (err) {
            console.error("fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, [query, sourceFilter, tagFilter, participantFilter, dateFrom, dateTo, page]);

    useEffect(() => { fetchResults(); }, [fetchResults]);

    /* ─── fetch detail ─── */
    const fetchDetail = async (id: number, itemSourceType?: string) => {
        setSelectedId(id);
        setDetailLoading(true);
        setDetailTab("body");
        setHighlightPopup(null);
        try {
            const params = new URLSearchParams({ mode: "detail", id: String(id) });
            if (itemSourceType) params.set("source_type", itemSourceType);
            const res = await fetch(`/api/evidence-hub?${params}`);
            const data = await res.json();
            setDetail(data);
            // For iMessage items, provenance comes with detail response;
            // separate fetch would hit evidence_hub.db with wrong ROWID
            if (itemSourceType === "imessage") {
                setCocData(null);
                setAnnotations([]);
            } else {
                fetchAnnotations(id);
                fetchCoC(id);
            }
        } catch (err) {
            console.error("detail error:", err);
        } finally {
            setDetailLoading(false);
        }
    };

    /* ─── fetch annotations ─── */
    const fetchAnnotations = async (id: number) => {
        try {
            const res = await fetch(`/api/evidence-hub/annotations?mode=annotations&evidence_id=${id}`);
            const data = await res.json();
            setAnnotations(data.annotations || []);
        } catch (err) { console.error("annotations error:", err); }
    };

    /* ─── fetch chain of custody ─── */
    const fetchCoC = async (id: number) => {
        try {
            const res = await fetch(`/api/evidence-hub/annotations?mode=provenance&evidence_id=${id}`);
            const data = await res.json();
            setCocData(data);
        } catch (err) { console.error("coc error:", err); }
    };

    /* ─── text selection handler ─── */
    const handleTextSelect = () => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !bodyRef.current) {
            setHighlightPopup(null);
            return;
        }
        const text = selection.toString().trim();
        if (text.length < 3) { setHighlightPopup(null); return; }
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const bodyRect = bodyRef.current.getBoundingClientRect();
        setHighlightPopup({
            text,
            x: rect.left - bodyRect.left + rect.width / 2,
            y: rect.top - bodyRect.top - 10,
        });
        setHighlightNote("");
    };

    /* ─── save annotation ─── */
    const saveAnnotation = async (type: string, flagLevel?: string) => {
        if (!selectedId) return;
        setSavingAnnotation(true);
        try {
            await fetch("/api/evidence-hub/annotations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    evidence_id: selectedId,
                    annotation_type: type,
                    selected_text: highlightPopup?.text || null,
                    note: highlightNote || null,
                    color: highlightColor,
                    flag_level: flagLevel || null,
                }),
            });
            setHighlightPopup(null);
            setHighlightNote("");
            fetchAnnotations(selectedId);
        } catch (err) { console.error("save error:", err); }
        finally { setSavingAnnotation(false); }
    };

    /* ─── AI analysis ─── */
    const askAi = async () => {
        if (!detail?.evidence) return;
        setDetailTab("ai");
        setAiLoading(true);
        setAiResponse(null);
        try {
            const query = `Analyze the following evidence item (ID: ${detail.evidence.canonical_id}) and explain its significance in the context of the case. Focus on participants, dates, and any potentially incriminating or suspicious patterns. 
            
            Evidence Content:
            ${detail.evidence.body_snippet}`;

            const res = await fetch("/api/ai/rag", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query, skipLLM: false }),
            });
            const data = await res.json();
            setAiResponse(data.answer || "No AI response received.");
        } catch (err) {
            console.error("ai error:", err);
            setAiResponse("Error performing AI analysis. Please ensure Ollama is running.");
        } finally {
            setAiLoading(false);
        }
    };

    /* ─── delete annotation ─── */
    const deleteAnnotation = async (annId: number) => {
        if (!selectedId) return;
        try {
            await fetch(`/api/evidence-hub/annotations?id=${annId}`, { method: "DELETE" });
            fetchAnnotations(selectedId);
        } catch (err) { console.error("delete error:", err); }
    };

    /* ─── fetch stats ─── */
    const fetchStats = async () => {
        if (stats) { setShowStats(!showStats); return; }
        try {
            const res = await fetch("/api/evidence-hub?mode=stats");
            const data = await res.json();
            setStats(data);
            setShowStats(true);
        } catch (err) {
            console.error("stats error:", err);
        }
    };

    /* ─── search handler ─── */
    const onSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchResults();
    };

    const clearFilters = () => {
        setQuery(""); setSourceFilter(""); setTagFilter("");
        setParticipantFilter(""); setDateFrom(""); setDateTo("");
        setPage(1);
    };

    const hasFilters = query || sourceFilter || tagFilter || participantFilter || dateFrom || dateTo;

    return (
        <div className="evidence-hub-page">
            <style>{`
                .evidence-hub-page {
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    background: linear-gradient(135deg, #0a0e1a 0%, #111827 50%, #0f172a 100%);
                    color: #e2e8f0;
                    font-family: 'Inter', -apple-system, system-ui, sans-serif;
                    overflow: hidden;
                }
                .eh-header {
                    padding: 16px 24px;
                    background: rgba(15, 23, 42, 0.8);
                    backdrop-filter: blur(12px);
                    border-bottom: 1px solid rgba(71, 85, 105, 0.3);
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    flex-shrink: 0;
                }
                .eh-header h1 {
                    font-size: 20px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: linear-gradient(135deg, #60a5fa, #a78bfa);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .eh-search-bar {
                    flex: 1;
                    display: flex;
                    gap: 8px;
                    max-width: 600px;
                }
                .eh-search-bar input {
                    flex: 1;
                    background: rgba(30, 41, 59, 0.8);
                    border: 1px solid rgba(71, 85, 105, 0.4);
                    border-radius: 8px;
                    padding: 8px 12px 8px 36px;
                    color: #e2e8f0;
                    font-size: 14px;
                    outline: none;
                    transition: border-color 0.2s;
                }
                .eh-search-bar input:focus {
                    border-color: #60a5fa;
                    box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.15);
                }
                .eh-search-wrap { position: relative; flex: 1; }
                .eh-search-wrap svg { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #64748b; }
                .eh-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 14px;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 500;
                    border: 1px solid rgba(71, 85, 105, 0.4);
                    background: rgba(30, 41, 59, 0.6);
                    color: #cbd5e1;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .eh-btn:hover { background: rgba(51, 65, 85, 0.8); border-color: rgba(100, 116, 139, 0.5); }
                .eh-btn.active { border-color: #60a5fa; color: #60a5fa; background: rgba(96, 165, 250, 0.1); }
                .eh-header-meta { display: flex; align-items: center; gap: 12px; margin-left: auto; }
                .eh-header-meta .count { font-size: 13px; color: #94a3b8; }
                .eh-header-meta .badge { font-size: 11px; padding: 2px 8px; border-radius: 9999px; background: rgba(96, 165, 250, 0.15); color: #60a5fa; }

                /* ── Filters panel ── */
                .eh-filters {
                    padding: 12px 24px;
                    background: rgba(15, 23, 42, 0.5);
                    border-bottom: 1px solid rgba(71, 85, 105, 0.2);
                    display: flex;
                    gap: 12px;
                    flex-wrap: wrap;
                    align-items: center;
                    flex-shrink: 0;
                }
                .eh-filters select, .eh-filters input[type="date"], .eh-filters input[type="text"] {
                    background: rgba(30, 41, 59, 0.8);
                    border: 1px solid rgba(71, 85, 105, 0.4);
                    border-radius: 6px;
                    padding: 6px 10px;
                    color: #e2e8f0;
                    font-size: 13px;
                    outline: none;
                }
                .eh-filters label { font-size: 12px; color: #94a3b8; display: flex; align-items: center; gap: 4px; }

                /* ── Stats dashboard ── */
                .eh-stats {
                    padding: 16px 24px;
                    background: rgba(15, 23, 42, 0.4);
                    border-bottom: 1px solid rgba(71, 85, 105, 0.2);
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 16px;
                    flex-shrink: 0;
                }
                .eh-stat-card {
                    background: rgba(30, 41, 59, 0.5);
                    border: 1px solid rgba(71, 85, 105, 0.3);
                    border-radius: 10px;
                    padding: 14px;
                }
                .eh-stat-card h3 { font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
                .eh-stat-card .big-num { font-size: 28px; font-weight: 700; color: #f1f5f9; }
                .eh-stat-card ul { list-style: none; margin: 0; padding: 0; }
                .eh-stat-card li { font-size: 13px; padding: 3px 0; display: flex; justify-content: space-between; color: #cbd5e1; }
                .eh-stat-card li span:last-child { color: #94a3b8; }

                /* ── Main grid ── */
                .eh-main {
                    flex: 1;
                    display: grid;
                    overflow: hidden;
                    position: relative;
                }
                .eh-main.no-detail { grid-template-columns: 1fr; }

                /* ── Resize handle ── */
                .eh-resize-handle {
                    width: 6px;
                    cursor: col-resize;
                    background: transparent;
                    position: relative;
                    z-index: 10;
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.15s;
                }
                .eh-resize-handle::after {
                    content: '';
                    width: 2px;
                    height: 40px;
                    background: rgba(71, 85, 105, 0.4);
                    border-radius: 2px;
                    transition: background 0.15s, height 0.15s;
                }
                .eh-resize-handle:hover::after,
                .eh-resize-handle.dragging::after {
                    background: #00ffff;
                    height: 60px;
                }
                .eh-resize-handle:hover,
                .eh-resize-handle.dragging {
                    background: rgba(0, 255, 255, 0.05);
                }

                /* ── List panel ── */
                .eh-list {
                    overflow-y: auto;
                    border-right: 1px solid rgba(71, 85, 105, 0.2);
                }
                .eh-list-item {
                    padding: 12px 20px;
                    border-bottom: 1px solid rgba(71, 85, 105, 0.15);
                    cursor: pointer;
                    transition: background 0.15s;
                    display: flex;
                    gap: 12px;
                    align-items: flex-start;
                }
                .eh-list-item:hover { background: rgba(30, 41, 59, 0.5); }
                .eh-list-item.selected { background: rgba(96, 165, 250, 0.1); border-left: 3px solid #60a5fa; }
                .eh-list-item .source-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    flex-shrink: 0;
                    margin-top: 2px;
                }
                .eh-list-item .content { flex: 1; min-width: 0; }
                .eh-list-item .title-line { font-size: 14px; font-weight: 500; color: #f1f5f9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .eh-list-item .preview-text { font-size: 12px; color: #94a3b8; margin-top: 4px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
                .eh-list-item .meta { display: flex; gap: 8px; align-items: center; margin-top: 6px; font-size: 11px; color: #64748b; }
                .eh-list-item .meta .tags { display: flex; gap: 4px; flex-wrap: wrap; }
                .eh-list-item .meta .tag { padding: 1px 6px; border-radius: 4px; background: rgba(167, 139, 250, 0.15); color: #a78bfa; font-size: 10px; }

                /* ── Detail panel ── */
                .eh-detail {
                    overflow-y: auto;
                    background: rgba(15, 23, 42, 0.6);
                    padding: 20px;
                }
                .eh-detail-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 16px;
                }
                .eh-detail-title { font-size: 16px; font-weight: 600; color: #f1f5f9; }
                .eh-detail-section { margin-bottom: 16px; }
                .eh-detail-section h4 { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
                .eh-detail-body {
                    background: rgba(30, 41, 59, 0.5);
                    border: 1px solid rgba(71, 85, 105, 0.25);
                    border-radius: 8px;
                    padding: 12px;
                    font-size: 13px;
                    line-height: 1.6;
                    color: #cbd5e1;
                    white-space: pre-wrap;
                    word-break: break-word;
                    max-height: 300px;
                    overflow-y: auto;
                }
                .eh-detail-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
                .eh-detail-row .label { color: #64748b; }
                .eh-detail-row .value { color: #e2e8f0; text-align: right; max-width: 250px; overflow: hidden; text-overflow: ellipsis; }
                .eh-participant-list, .eh-provenance-list { list-style: none; padding: 0; margin: 0; }
                .eh-participant-list li, .eh-provenance-list li {
                    padding: 6px 10px;
                    background: rgba(30, 41, 59, 0.4);
                    border-radius: 6px;
                    margin-bottom: 4px;
                    font-size: 12px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .eh-participant-list li .role {
                    font-size: 10px; text-transform: uppercase;
                    padding: 1px 6px; border-radius: 4px;
                    background: rgba(96, 165, 250, 0.15); color: #60a5fa;
                }

                /* ── Pagination ── */
                .eh-pagination {
                    padding: 10px 24px;
                    background: rgba(15, 23, 42, 0.8);
                    border-top: 1px solid rgba(71, 85, 105, 0.3);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-shrink: 0;
                    font-size: 13px;
                    color: #94a3b8;
                }
                .eh-pagination .page-btns { display: flex; gap: 6px; }

                /* ── Loading ── */
                .eh-loading {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 40px;
                    color: #64748b;
                }
                .eh-loading svg { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

                /* ── Empty state ── */
                .eh-empty { text-align: center; padding: 60px 20px; color: #64748b; }
                .eh-empty svg { margin-bottom: 12px; opacity: 0.4; }

                /* ── Scrollbar ── */
                .eh-list::-webkit-scrollbar, .eh-detail::-webkit-scrollbar { width: 6px; }
                .eh-list::-webkit-scrollbar-thumb, .eh-detail::-webkit-scrollbar-thumb { background: rgba(71, 85, 105, 0.4); border-radius: 3px; }

                /* ── Detail tabs ── */
                .eh-detail-tabs { display: flex; gap: 2px; margin-bottom: 16px; background: rgba(15, 23, 42, 0.5); border-radius: 8px; padding: 3px; }
                .eh-detail-tab {
                    flex: 1; padding: 6px 10px; border-radius: 6px; font-size: 12px; font-weight: 500;
                    text-align: center; cursor: pointer; border: none;
                    background: transparent; color: #94a3b8; transition: all 0.2s;
                    display: flex; align-items: center; justify-content: center; gap: 4px;
                }
                .eh-detail-tab:hover { color: #cbd5e1; }
                .eh-detail-tab.active { background: rgba(96, 165, 250, 0.15); color: #60a5fa; }
                .eh-detail-tab .badge-count {
                    font-size: 10px; padding: 0 5px; border-radius: 9999px;
                    background: rgba(96, 165, 250, 0.2); color: #60a5fa; min-width: 16px;
                }

                /* ── Highlight popup ── */
                .eh-highlight-popup {
                    position: absolute; z-index: 50;
                    background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(96, 165, 250, 0.4);
                    border-radius: 10px; padding: 10px; min-width: 240px;
                    backdrop-filter: blur(12px);
                    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
                    transform: translateX(-50%) translateY(-100%);
                }
                .eh-highlight-popup .selected-preview {
                    font-size: 11px; color: #94a3b8; padding: 6px 8px;
                    background: rgba(30, 41, 59, 0.6); border-radius: 6px;
                    margin-bottom: 8px; max-height: 60px; overflow: hidden;
                    border-left: 3px solid #fbbf24;
                }
                .eh-highlight-popup .color-picker { display: flex; gap: 4px; margin-bottom: 8px; }
                .eh-highlight-popup .color-dot {
                    width: 20px; height: 20px; border-radius: 50%; cursor: pointer;
                    border: 2px solid transparent; transition: border-color 0.15s;
                }
                .eh-highlight-popup .color-dot.active { border-color: #fff; }
                .eh-highlight-popup textarea {
                    width: 100%; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(71, 85, 105, 0.4);
                    border-radius: 6px; padding: 6px 8px; color: #e2e8f0; font-size: 12px;
                    resize: none; outline: none; margin-bottom: 8px; font-family: inherit;
                }
                .eh-highlight-popup .actions { display: flex; gap: 6px; }
                .eh-highlight-btn {
                    padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 500;
                    border: none; cursor: pointer; display: flex; align-items: center; gap: 4px;
                }
                .eh-highlight-btn.save { background: rgba(96, 165, 250, 0.2); color: #60a5fa; }
                .eh-highlight-btn.save:hover { background: rgba(96, 165, 250, 0.3); }
                .eh-highlight-btn.flag { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
                .eh-highlight-btn.flag:hover { background: rgba(245, 158, 11, 0.3); }
                .eh-highlight-btn.cancel { background: rgba(71, 85, 105, 0.3); color: #94a3b8; }

                /* ── Annotation cards ── */
                .eh-ann-card {
                    background: rgba(30, 41, 59, 0.4); border-radius: 8px;
                    padding: 10px; margin-bottom: 8px;
                    border-left: 3px solid #fbbf24;
                }
                .eh-ann-card .ann-excerpt {
                    font-size: 12px; color: #cbd5e1; font-style: italic;
                    padding: 4px 8px; background: rgba(15, 23, 42, 0.4);
                    border-radius: 4px; margin-bottom: 6px; line-height: 1.4;
                }
                .eh-ann-card .ann-note { font-size: 12px; color: #94a3b8; margin-bottom: 4px; }
                .eh-ann-card .ann-meta {
                    display: flex; justify-content: space-between; align-items: center;
                    font-size: 10px; color: #64748b;
                }
                .eh-ann-card .ann-delete { cursor: pointer; color: #64748b; transition: color 0.15s; }
                .eh-ann-card .ann-delete:hover { color: #ef4444; }

                /* ── Flag bar ── */
                .eh-flag-bar { display: flex; gap: 6px; margin-bottom: 16px; }
                .eh-flag-btn {
                    flex: 1; padding: 6px 8px; border-radius: 6px; font-size: 11px;
                    font-weight: 500; border: 1px solid; cursor: pointer;
                    display: flex; align-items: center; justify-content: center; gap: 4px;
                    transition: all 0.2s; background: transparent;
                }
                .eh-flag-btn:hover { filter: brightness(1.3); }

                /* ── Chain of Custody timeline ── */
                .eh-coc-timeline { position: relative; padding-left: 24px; }
                .eh-coc-timeline::before {
                    content: ''; position: absolute; left: 10px; top: 0; bottom: 0;
                    width: 2px; background: linear-gradient(180deg, #60a5fa 0%, #a78bfa 50%, #34d399 100%);
                }
                .eh-coc-step {
                    position: relative; padding: 8px 0 16px 16px;
                }
                .eh-coc-step::before {
                    content: ''; position: absolute; left: -19px; top: 12px;
                    width: 10px; height: 10px; border-radius: 50%;
                    background: #60a5fa; border: 2px solid #0f172a;
                    z-index: 1;
                }
                .eh-coc-step:last-child::before { background: #34d399; }
                .eh-coc-step .step-card {
                    background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(71, 85, 105, 0.3);
                    border-radius: 8px; padding: 10px 12px;
                }
                .eh-coc-step .step-label {
                    font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em;
                    color: #64748b; display: flex; align-items: center; gap: 4px; margin-bottom: 4px;
                }
                .eh-coc-step .step-detail { font-size: 13px; color: #e2e8f0; word-break: break-all; }
                .eh-coc-step .step-time { font-size: 10px; color: #475569; margin-top: 4px; }

                /* ── Body with selection ── */
                .eh-detail-body-wrap { position: relative; }
                .eh-detail-body-selectable {
                    cursor: text; user-select: text;
                }
                .eh-detail-body-selectable::selection { background: rgba(251, 191, 36, 0.3); }

                /* ── Conversation Playlists ── */
                .eh-conv-bar {
                    display: flex; align-items: center; gap: 8px; padding: 8px 20px;
                    background: rgba(15, 23, 42, 0.4); border-bottom: 1px solid rgba(71, 85, 105, 0.2);
                    flex-wrap: wrap;
                }
                .eh-conv-bar .conv-label {
                    font-size: 11px; color: #64748b; text-transform: uppercase;
                    letter-spacing: 0.05em; font-weight: 600; display: flex; align-items: center; gap: 4px;
                }
                .eh-conv-bar .conv-pill {
                    display: inline-flex; align-items: center; gap: 6px;
                    padding: 4px 10px; border-radius: 16px; font-size: 12px;
                    cursor: pointer; transition: all 0.15s; border: 1px solid rgba(71, 85, 105, 0.3);
                    background: rgba(30, 41, 59, 0.5); color: #cbd5e1;
                }
                .eh-conv-bar .conv-pill:hover { background: rgba(96, 165, 250, 0.1); border-color: rgba(96, 165, 250, 0.3); }
                .eh-conv-bar .conv-pill.active { background: rgba(96, 165, 250, 0.15); border-color: #60a5fa; color: #60a5fa; }
                .eh-conv-bar .conv-pill .conv-count {
                    font-size: 10px; background: rgba(96, 165, 250, 0.2); color: #60a5fa;
                    padding: 1px 6px; border-radius: 8px;
                }
                .eh-conv-bar .conv-pill .conv-dot {
                    width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
                }
                .eh-conv-bar .conv-create-form {
                    display: flex; gap: 4px; align-items: center;
                }
                .eh-conv-bar .conv-create-form input {
                    background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(71, 85, 105, 0.3);
                    border-radius: 6px; padding: 4px 8px; font-size: 12px; color: #e2e8f0;
                    outline: none; width: 160px;
                }
                .eh-conv-bar .conv-create-form input:focus { border-color: #60a5fa; }

                .eh-conv-dropdown {
                    position: absolute; top: 100%; right: 0; z-index: 50;
                    background: #1e293b; border: 1px solid rgba(71, 85, 105, 0.4);
                    border-radius: 8px; padding: 4px; min-width: 200px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
                }
                .eh-conv-dropdown button {
                    display: flex; align-items: center; gap: 8px; width: 100%;
                    padding: 8px 10px; border: none; background: none;
                    color: #cbd5e1; font-size: 12px; cursor: pointer; border-radius: 6px;
                    text-align: left;
                }
                .eh-conv-dropdown button:hover { background: rgba(96, 165, 250, 0.1); color: #60a5fa; }

                /* ── Conversation view in list area ── */
                .eh-conv-view { padding: 12px 20px; }
                .eh-conv-msg {
                    padding: 10px 14px; margin-bottom: 6px;
                    border-radius: 8px; background: rgba(30, 41, 59, 0.5);
                    border: 1px solid rgba(71, 85, 105, 0.2); font-size: 13px;
                    display: flex; gap: 10px;
                }
                .eh-conv-msg .msg-meta { color: #64748b; font-size: 11px; white-space: nowrap; }
                .eh-conv-msg .msg-body { color: #e2e8f0; flex: 1; line-height: 1.5; }
                .eh-conv-msg .msg-from-me { text-align: right; }
                .eh-conv-msg.from-me { background: rgba(96, 165, 250, 0.08); border-color: rgba(96, 165, 250, 0.2); }
                .eh-conv-msg .msg-remove {
                    background: none; border: none; color: #475569; cursor: pointer;
                    padding: 2px; opacity: 0; transition: opacity 0.15s;
                }
                .eh-conv-msg:hover .msg-remove { opacity: 1; }
                .eh-conv-msg .msg-remove:hover { color: #ef4444; }
            `}</style>

            {/* ─── Header ─── */}
            <header className="eh-header">
                <h1><Shield size={22} /> Evidence Hub</h1>
                <form className="eh-search-bar" onSubmit={onSearch}>
                    <div className="eh-search-wrap">
                        <Search size={16} />
                        <input
                            placeholder="Search across 643k+ evidence records…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="eh-btn">Search</button>
                </form>
                <button className={`eh-btn ${showFilters ? "active" : ""}`} onClick={() => setShowFilters(!showFilters)}>
                    <Filter size={14} /> Filters
                </button>
                <button className={`eh-btn ${showStats ? "active" : ""}`} onClick={fetchStats}>
                    <BarChart2 size={14} /> Stats
                </button>
                <div className="eh-header-meta">
                    <span className="count">{total.toLocaleString()} results</span>
                    {searchMode && <span className="badge">{searchMode}</span>}
                    {hasFilters && (
                        <button className="eh-btn" onClick={clearFilters} style={{ padding: "4px 8px" }}>
                            <X size={14} /> Clear
                        </button>
                    )}
                </div>
            </header>

            {/* ─── Conversation Playlist Bar ─── */}
            <div className="eh-conv-bar">
                <span className="conv-label"><Bookmark size={12} /> Playlists</span>
                <span
                    className={`conv-pill ${!activeConversation ? "active" : ""}`}
                    onClick={() => { setActiveConversation(null); setConvMessages([]); }}
                >
                    All Messages
                </span>
                {conversations.map(c => (
                    <span
                        key={c.id}
                        className={`conv-pill ${activeConversation === c.id ? "active" : ""}`}
                        onClick={() => setActiveConversation(c.id)}
                    >
                        <span className="conv-dot" style={{ background: c.color }} />
                        {c.name}
                        <span className="conv-count">{c.message_count}</span>
                        {activeConversation === c.id && (
                            <button
                                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, marginLeft: 2 }}
                                onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                                title="Delete playlist"
                            >
                                <Trash2 size={10} color="#ef4444" />
                            </button>
                        )}
                    </span>
                ))}
                {showCreateConv ? (
                    <div className="conv-create-form">
                        <input
                            autoFocus
                            placeholder="Playlist name…"
                            value={newConvName}
                            onChange={e => setNewConvName(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") createConversation(newConvName); if (e.key === "Escape") setShowCreateConv(false); }}
                        />
                        <button className="eh-btn" onClick={() => createConversation(newConvName)} style={{ padding: "4px 8px" }}>✓</button>
                        <button className="eh-btn" onClick={() => setShowCreateConv(false)} style={{ padding: "4px 8px" }}><X size={12} /></button>
                    </div>
                ) : (
                    <button className="eh-btn" onClick={() => setShowCreateConv(true)} style={{ padding: "4px 8px" }}>
                        <Plus size={12} /> New
                    </button>
                )}
                {/* Bulk add button — shown when filtering + conversations exist */}
                {conversations.length > 0 && (sourceFilter || participantFilter || dateFrom || dateTo || query) && !activeConversation && (
                    <div style={{ position: "relative", marginLeft: "auto" }}>
                        <button
                            className="eh-btn"
                            onClick={() => setShowConvPicker(!showConvPicker)}
                            style={{ padding: "4px 10px" }}
                        >
                            <Plus size={12} /> Add {total} to playlist
                        </button>
                        {showConvPicker && (
                            <div className="eh-conv-dropdown">
                                {conversations.map(c => (
                                    <button key={c.id} onClick={() => { bulkAddToConversation(c.id); setShowConvPicker(false); }}>
                                        <span className="conv-dot" style={{ background: c.color, width: 8, height: 8, borderRadius: "50%", flexShrink: 0 }} />
                                        {c.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ─── Filters ─── */}
            {showFilters && (
                <div className="eh-filters">
                    <label>Source:
                        <select value={sourceFilter} onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}>
                            <option value="">All</option>
                            <option value="email">Email</option>
                            <option value="imessage">iMessage</option>
                            <option value="tax">Tax</option>
                        </select>
                    </label>
                    <label>Tag:
                        <input type="text" placeholder="e.g. inbox, sent"
                            value={tagFilter} onChange={(e) => { setTagFilter(e.target.value); setPage(1); }}
                            style={{ width: 120 }}
                        />
                    </label>
                    <label>Participant:
                        <input type="text" placeholder="email or phone"
                            value={participantFilter} onChange={(e) => { setParticipantFilter(e.target.value); setPage(1); }}
                            style={{ width: 160 }}
                        />
                    </label>
                    <label>From:
                        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
                    </label>
                    <label>To:
                        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
                    </label>
                </div>
            )}

            {/* ─── Stats ─── */}
            {showStats && stats && (
                <div className="eh-stats">
                    <div className="eh-stat-card">
                        <h3>Total Records</h3>
                        <div className="big-num">{stats.total.toLocaleString()}</div>
                    </div>
                    <div className="eh-stat-card">
                        <h3>By Source</h3>
                        <ul>
                            {stats.sources.map((s) => (
                                <li key={s.source_type}>
                                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        {sourceIcon(s.source_type)} {s.source_type}
                                    </span>
                                    <span>{s.count.toLocaleString()}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="eh-stat-card">
                        <h3>Top Participants</h3>
                        <ul>
                            {stats.participants.slice(0, 8).map((p) => (
                                <li key={p.id}>
                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>{p.id}</span>
                                    <span>{p.count.toLocaleString()}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="eh-stat-card">
                        <h3>Top Tags</h3>
                        <ul>
                            {stats.tags.slice(0, 8).map((t) => (
                                <li key={t.tag}>
                                    <span>{t.tag}</span>
                                    <span>{t.count.toLocaleString()}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* ─── Main grid ─── */}
            <div
                className={`eh-main ${selectedId ? "" : "no-detail"}`}
                style={selectedId ? { gridTemplateColumns: `1fr auto ${detailWidth}px` } : undefined}
            >
                {/* ── List ── */}
                <div className="eh-list">
                    {/* Conversation view mode */}
                    {activeConversation ? (
                        convLoading ? (
                            <div className="eh-loading"><RefreshCw size={20} /> &nbsp; Loading playlist…</div>
                        ) : convMessages.length === 0 ? (
                            <div className="eh-empty">
                                <Bookmark size={40} />
                                <p>No messages in this playlist yet. Use filters to find messages, then add them.</p>
                            </div>
                        ) : (
                            <div className="eh-conv-view">
                                {convMessages.map((msg: any) => {
                                    const dateObj = msg.raw_date ? new Date((msg.raw_date / 1e9 + 978307200) * 1000) : null;
                                    const dateStr = dateObj ? dateObj.toLocaleString() : "";
                                    return (
                                        <div key={msg.rowid} className={`eh-conv-msg ${msg.is_from_me ? "from-me" : ""}`}>
                                            <div className="msg-meta">
                                                <div>{msg.is_from_me ? "JZ" : (msg.handle_id || "?")}</div>
                                                <div>{dateStr}</div>
                                            </div>
                                            <div className="msg-body">{msg.body || "[no content]"}</div>
                                            <button
                                                className="msg-remove"
                                                title="Remove from playlist"
                                                onClick={() => removeFromConversation(activeConversation, [msg.rowid])}
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    ) : loading ? (
                        <div className="eh-loading"><RefreshCw size={20} /> &nbsp; Loading…</div>
                    ) : results.length === 0 ? (
                        <div className="eh-empty">
                            <Search size={40} />
                            <p>No evidence found. Try adjusting your search or filters.</p>
                        </div>
                    ) : (
                        results.map((item) => {
                            const tags = parseTags(item.tags);
                            return (
                                <div
                                    key={item.id}
                                    className={`eh-list-item ${selectedId === item.id ? "selected" : ""}`}
                                    onClick={() => fetchDetail(item.id, item.source_type)}
                                >
                                    <span
                                        className="source-badge"
                                        style={{
                                            background: `${sourceColor(item.source_type)}20`,
                                            color: sourceColor(item.source_type),
                                        }}
                                    >
                                        {sourceIcon(item.source_type)}
                                        {item.source_type}
                                    </span>
                                    <div className="content">
                                        <div className="title-line">{item.title || item.canonical_id}</div>
                                        <div className="preview-text">{item.preview || item.summary || "—"}</div>
                                        <div className="meta">
                                            <Clock size={10} />
                                            <span>{fmtDate(item.start_timestamp)}</span>
                                            {tags.length > 0 && (
                                                <div className="tags">
                                                    {tags.slice(0, 3).map((t) => (
                                                        <span
                                                            key={t}
                                                            className="tag"
                                                            onClick={(e) => { e.stopPropagation(); setTagFilter(t); setPage(1); }}
                                                            style={{ cursor: "pointer" }}
                                                        >{t}</span>
                                                    ))}
                                                    {tags.length > 3 && <span className="tag">+{tags.length - 3}</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* ── Resize handle ── */}
                {selectedId && (
                    <div
                        className={`eh-resize-handle ${isDragging ? "dragging" : ""}`}
                        onMouseDown={handleResizeStart}
                    />
                )}

                {/* ── Detail panel ── */}
                {selectedId && (
                    <div className="eh-detail">
                        {detailLoading ? (
                            <div className="eh-loading"><RefreshCw size={20} /> &nbsp; Loading details…</div>
                        ) : detail?.evidence ? (
                            <>
                                <div className="eh-detail-header">
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span className="eh-detail-title">{detail.evidence.title || detail.evidence.canonical_id}</span>
                                        <button 
                                            className="eh-btn active" 
                                            onClick={askAi}
                                            title="Ask AI about this evidence"
                                            style={{ padding: "4px 8px", background: "rgba(167, 139, 250, 0.15)", borderColor: "rgba(167, 139, 250, 0.4)" }}
                                        >
                                            <MessageCircle size={14} color="#a78bfa" /> <span style={{ color: "#a78bfa" }}>Ask AI</span>
                                        </button>
                                        {/* Add to Playlist button */}
                                        {conversations.length > 0 && detail.evidence.source_type === "imessage" && (
                                            <div style={{ position: "relative" }}>
                                                <button
                                                    className="eh-btn"
                                                    onClick={() => setShowConvPicker(prev => !prev)}
                                                    title="Add to playlist"
                                                    style={{ padding: "4px 8px", background: "rgba(52, 211, 153, 0.1)", borderColor: "rgba(52, 211, 153, 0.3)" }}
                                                >
                                                    <Plus size={14} color="#34d399" /> <span style={{ color: "#34d399" }}>Playlist</span>
                                                </button>
                                                {showConvPicker && (
                                                    <div className="eh-conv-dropdown" style={{ top: "110%", left: 0 }}>
                                                        {conversations.map(c => (
                                                            <button key={c.id} onClick={() => {
                                                                addToConversation(c.id, [detail.evidence.id]);
                                                                setShowConvPicker(false);
                                                            }}>
                                                                <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                                                                {c.name} <span style={{ color: "#64748b", fontSize: 10 }}>({c.message_count})</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <button className="eh-btn" onClick={() => { setSelectedId(null); setDetail(null); setHighlightPopup(null); }} style={{ padding: "4px 8px" }}>
                                        <X size={14} />
                                    </button>
                                </div>

                                {/* ── Metadata ── */}
                                <div className="eh-detail-section">
                                    <div className="eh-detail-row"><span className="label">ID</span><span className="value">{detail.evidence.canonical_id}</span></div>
                                    <div className="eh-detail-row"><span className="label">Type</span><span className="value">{detail.evidence.source_type}</span></div>
                                    <div className="eh-detail-row"><span className="label">Date</span><span className="value">{fmtDate(detail.evidence.start_timestamp)}</span></div>
                                </div>

                                {/* ── Flag bar ── */}
                                <div className="eh-flag-bar">
                                    {FLAG_LEVELS.map((fl) => (
                                        <button
                                            key={fl.value}
                                            className="eh-flag-btn"
                                            style={{ borderColor: `${fl.color}40`, color: fl.color }}
                                            onClick={() => saveAnnotation("flag", fl.value)}
                                        >
                                            <fl.icon size={12} /> {fl.label}
                                        </button>
                                    ))}
                                </div>

                                {/* ── Tabs ── */}
                                <div className="eh-detail-tabs">
                                    <button className={`eh-detail-tab ${detailTab === "body" ? "active" : ""}`} onClick={() => setDetailTab("body")}>
                                        <FileText size={12} /> Body
                                    </button>
                                    <button className={`eh-detail-tab ${detailTab === "annotations" ? "active" : ""}`} onClick={() => setDetailTab("annotations")}>
                                        <Highlighter size={12} /> Notes
                                        {annotations.length > 0 && <span className="badge-count">{annotations.length}</span>}
                                    </button>
                                    <button className={`eh-detail-tab ${detailTab === "coc" ? "active" : ""}`} onClick={() => setDetailTab("coc")}>
                                        <Shield size={12} /> Chain
                                        {cocData && <span className="badge-count">{cocData.origin_count}</span>}
                                    </button>
                                    <button className={`eh-detail-tab ${detailTab === "ai" ? "active" : ""}`} onClick={() => setDetailTab("ai")}>
                                        <MessageCircle size={12} /> AI Insights
                                    </button>
                                </div>

                                {/* ── Body tab ── */}
                                {detailTab === "body" && (
                                    <>
                                        {detail.evidence.summary && (
                                            <div className="eh-detail-section">
                                                <h4>Summary</h4>
                                                <div className="eh-detail-body" style={{ maxHeight: 80 }}>{detail.evidence.summary}</div>
                                            </div>
                                        )}

                                        <div className="eh-detail-section">
                                            <h4 style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                Body
                                                <span style={{ fontSize: 10, color: "#475569", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— select text to highlight</span>
                                            </h4>
                                            <div className="eh-detail-body-wrap" ref={bodyRef}>
                                                <div
                                                    className="eh-detail-body eh-detail-body-selectable"
                                                    onMouseUp={handleTextSelect}
                                                >
                                                    {detail.evidence.body_snippet || "No body available"}
                                                </div>

                                                {/* ── Highlight popup ── */}
                                                {highlightPopup && (
                                                    <div className="eh-highlight-popup" style={{ left: highlightPopup.x, top: highlightPopup.y }}>
                                                        <div className="selected-preview">&ldquo;{highlightPopup.text.substring(0, 120)}{highlightPopup.text.length > 120 ? "…" : ""}&rdquo;</div>
                                                        <div className="color-picker">
                                                            {HIGHLIGHT_COLORS.map((c) => (
                                                                <div
                                                                    key={c}
                                                                    className={`color-dot ${highlightColor === c ? "active" : ""}`}
                                                                    style={{ background: c }}
                                                                    onClick={() => setHighlightColor(c)}
                                                                />
                                                            ))}
                                                        </div>
                                                        <textarea
                                                            rows={2}
                                                            placeholder="Add a note…"
                                                            value={highlightNote}
                                                            onChange={(e) => setHighlightNote(e.target.value)}
                                                        />
                                                        <div className="actions">
                                                            <button
                                                                className="eh-highlight-btn save"
                                                                onClick={() => saveAnnotation("highlight")}
                                                                disabled={savingAnnotation}
                                                            >
                                                                <Highlighter size={11} /> Save Highlight
                                                            </button>
                                                            <button
                                                                className="eh-highlight-btn flag"
                                                                onClick={() => saveAnnotation("highlight", "important")}
                                                                disabled={savingAnnotation}
                                                            >
                                                                <Flag size={11} /> Flag
                                                            </button>
                                                            <button className="eh-highlight-btn cancel" onClick={() => setHighlightPopup(null)}>
                                                                <X size={11} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* ── Tax Reconciled Activity ── */}
                                        {detail.evidence.source_type === "tax" && detail.evidence.extra && (
                                            <div className="eh-detail-section" style={{ marginTop: 24 }}>
                                                <h4 style={{ color: "#a78bfa", display: "flex", alignItems: "center", gap: 6 }}>
                                                    <BarChart2 size={12} /> Financial Activity Summary
                                                </h4>
                                                <div style={{ 
                                                    background: "rgba(167, 139, 250, 0.05)", 
                                                    border: "1px solid rgba(167, 139, 250, 0.2)",
                                                    borderRadius: 8,
                                                    padding: 12,
                                                    fontSize: 12,
                                                    color: "#cbd5e1"
                                                }}>
                                                    {(() => {
                                                        try {
                                                            const extra = JSON.parse(detail.evidence.extra);
                                                            if (extra.bullets && extra.bullets.length > 0) {
                                                                return (
                                                                    <ul style={{ padding: "0 0 0 18px", margin: 0 }}>
                                                                        {extra.bullets.map((b: string, i: number) => (
                                                                            <li key={i} style={{ marginBottom: 4 }}>{b}</li>
                                                                        ))}
                                                                    </ul>
                                                                );
                                                            }
                                                            return <span style={{ color: "#64748b" }}>No linked transactions found for this period.</span>;
                                                        } catch {
                                                            return null;
                                                        }
                                                    })()}
                                                </div>
                                            </div>
                                        )}

                                        {/* ── Participants ── */}
                                        {detail.participants.length > 0 && (
                                            <div className="eh-detail-section">
                                                <h4><User size={12} /> Participants ({detail.participants.length})</h4>
                                                <ul className="eh-participant-list">
                                                    {detail.participants.map((p, i) => (
                                                        <li key={i}>
                                                            <span
                                                                style={{ cursor: "pointer", textDecoration: "underline", textDecorationColor: "#475569" }}
                                                                onClick={() => { setParticipantFilter(p.normalized_identifier); setPage(1); setShowFilters(true); }}
                                                            >
                                                                {p.normalized_identifier || p.identifier}
                                                            </span>
                                                            <span className="role">{p.role}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* ── Tags ── */}
                                        {parseTags(detail.evidence.tags).length > 0 && (
                                            <div className="eh-detail-section">
                                                <h4><Tag size={12} /> Tags</h4>
                                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                                    {parseTags(detail.evidence.tags).map((t) => (
                                                        <span
                                                            key={t}
                                                            style={{
                                                                padding: "3px 10px", borderRadius: 6,
                                                                background: "rgba(167,139,250,0.15)", color: "#a78bfa",
                                                                fontSize: 12, cursor: "pointer",
                                                            }}
                                                            onClick={() => { setTagFilter(t); setPage(1); setShowFilters(true); }}
                                                        >{t}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* ── Annotations tab ── */}
                                {detailTab === "annotations" && (
                                    <div className="eh-detail-section">
                                        {annotations.length === 0 ? (
                                            <div className="eh-empty" style={{ padding: 30 }}>
                                                <Highlighter size={24} />
                                                <p style={{ fontSize: 13 }}>No annotations yet. Select text in the Body tab to highlight evidence.</p>
                                            </div>
                                        ) : (
                                            annotations.map((ann) => (
                                                <div key={ann.id} className="eh-ann-card" style={{ borderLeftColor: ann.color || "#fbbf24" }}>
                                                    {ann.selected_text && (
                                                        <div className="ann-excerpt">&ldquo;{ann.selected_text}&rdquo;</div>
                                                    )}
                                                    {ann.note && <div className="ann-note">{ann.note}</div>}
                                                    <div className="ann-meta">
                                                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                            {ann.flag_level && (
                                                                <span style={{
                                                                    padding: "1px 6px", borderRadius: 4, fontSize: 10,
                                                                    background: `${FLAG_LEVELS.find(f => f.value === ann.flag_level)?.color || "#64748b"}20`,
                                                                    color: FLAG_LEVELS.find(f => f.value === ann.flag_level)?.color || "#64748b",
                                                                }}>
                                                                    {ann.flag_level}
                                                                </span>
                                                            )}
                                                            {ann.annotation_type}
                                                        </span>
                                                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                            {fmtDate(ann.created_at)}
                                                            <span className="ann-delete" onClick={() => deleteAnnotation(ann.id)}><Trash2 size={12} /></span>
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}

                                {/* ── Chain of Custody tab ── */}
                                {detailTab === "coc" && (
                                    <div className="eh-detail-section">
                                        {!cocData ? (
                                            <div className="eh-loading"><RefreshCw size={16} />&nbsp; Loading chain…</div>
                                        ) : cocData.chain.length === 0 ? (
                                            <div className="eh-empty" style={{ padding: 30 }}>
                                                <Shield size={24} />
                                                <p style={{ fontSize: 13 }}>No provenance chain available.</p>
                                            </div>
                                        ) : (
                                            cocData.chain.map((c, ci) => (
                                                <div key={ci} style={{ marginBottom: 20 }}>
                                                    <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                                                        <Server size={12} /> Origin #{ci + 1}: {c.origin_system}
                                                    </div>
                                                    <div className="eh-coc-timeline">
                                                        {c.steps.map((step, si) => (
                                                            <div key={si} className="eh-coc-step">
                                                                <div className="step-card">
                                                                    <div className="step-label">
                                                                        {cocIcon(step.icon)} {step.label}
                                                                    </div>
                                                                    <div className="step-detail">{step.detail}</div>
                                                                    {step.timestamp && (
                                                                        <div className="step-time">{fmtDate(step.timestamp)}</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {c.source_rowid && (
                                                        <div style={{ fontSize: 11, color: "#475569", paddingLeft: 24 }}>
                                                            Source ROWID: {c.source_rowid}
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                        {cocData && cocData.participants.length > 0 && (
                                            <div style={{ marginTop: 16 }}>
                                                <h4 style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                                                    <User size={12} /> Verified Participants
                                                </h4>
                                                <ul className="eh-participant-list">
                                                    {cocData.participants.map((p, i) => (
                                                        <li key={i}>
                                                            <span>{p.normalized_identifier || p.identifier}</span>
                                                            <span className="role">{p.role}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── AI Insights tab ── */}
                                {detailTab === "ai" && (
                                    <div className="eh-detail-section">
                                        <h4>AI Insights & Analysis</h4>
                                        {aiLoading ? (
                                            <div className="eh-loading" style={{ padding: 40 }}>
                                                <RefreshCw size={24} />
                                                <p style={{ marginTop: 12 }}>RAG analysis in progress…</p>
                                            </div>
                                        ) : aiResponse ? (
                                            <div className="eh-detail-body" style={{ background: "rgba(167, 139, 250, 0.05)", borderColor: "rgba(167, 139, 250, 0.2)", minHeight: 400 }}>
                                                <div style={{ padding: "8px 0" }}>
                                                    {aiResponse.split("\n\n").map((para, i) => (
                                                        <p key={i} style={{ marginBottom: 12 }}>{para}</p>
                                                    ))}
                                                </div>
                                                <div style={{ marginTop: 24, fontSize: 11, color: "#64748b", borderTop: "1px solid rgba(167, 139, 250, 0.1)", paddingTop: 12 }}>
                                                    Analysis generated by the integrated RAG core using hybrid BM25 + Vector search.
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="eh-empty" style={{ padding: 30 }}>
                                                <MessageCircle size={30} />
                                                <p style={{ fontSize: 13 }}>Click the "Ask AI" button above to perform a contextual analysis of this record.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="eh-empty">
                                <Shield size={30} />
                                <p>Failed to load evidence details.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ─── Pagination ─── */}
            <div className="eh-pagination">
                <span>Page {page} of {totalPages.toLocaleString()} &middot; {total.toLocaleString()} total</span>
                <div className="page-btns">
                    <button className="eh-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                        <ChevronLeft size={14} /> Prev
                    </button>
                    <button className="eh-btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                        Next <ChevronRight size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
