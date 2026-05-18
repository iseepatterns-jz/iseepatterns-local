"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Search, Filter, ChevronLeft, ChevronRight, Mail, MessageSquare, Shield,
    Clock, Tag, User, FileText, ExternalLink, RefreshCw, BarChart2, X,
    Highlighter, Flag, AlertTriangle, Info, Trash2, Plus, Database, Server,
    Archive, HardDrive, ChevronDown, ChevronUp, MessageCircle, LayoutGrid,
    Mic, DollarSign, Scale, FolderOpen, Link2, Globe
} from "lucide-react";
import {
    type EvidenceItem, type DetailResult, type Stats, type Annotation,
    type ThreadEmail, type CoCData, type WorkbenchSection,
    FLAG_LEVELS, HIGHLIGHT_COLORS, PLAYER_PROFILES,
    fmtDate, parseTags, resolveHandle, setHandleMap
} from "./types";
import ThreadView from "./components/ThreadView";

const cocIcon = (type: string) => {
    switch (type) {
        case "archive": return <Archive size={14} />;
        case "database": return <Database size={14} />;
        case "server": return <Server size={14} />;
        case "shield": return <Shield size={14} />;
        default: return <HardDrive size={14} />;
    }
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
/* ─── component ─── */
export default function EvidenceHubPage() {
    const [query, setQuery] = useState("");
    const [sourceFilter, setSourceFilter] = useState("");
    const [tagFilter, setTagFilter] = useState("");
    const [participantFilter, setParticipantFilter] = useState<string[]>([]);
    const [participantDropdownOpen, setParticipantDropdownOpen] = useState(false);
    const participantRef = useRef<HTMLDivElement>(null);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [page, setPage] = useState(1);
    const [limit] = useState(50);
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    // ── Context Menu State ──
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, item: any } | null>(null);

    const handleContextMenu = (e: React.MouseEvent, item: any) => {
        if (item.source_type !== "email") return; // Only for emails as requested
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, item });
    };

    const pivotToAccount = (email: string, ts: number) => {
        handleTabChange("all"); 
        const d = new Date(ts);
        const from = new Date(d); from.setDate(d.getDate() - 3);
        const to = new Date(d); to.setDate(d.getDate() + 3);
        
        setResults([]);
        setQuery(email);
        setDateFrom(from.toISOString().split("T")[0]);
        setDateTo(to.toISOString().split("T")[0]);
        setPage(1);
        setContextMenu(null);
    };

    const pivotToDomain = (email: string, ts: number) => {
        const domainMatch = email.match(/@([\w.-]+)$/);
        const domain = domainMatch ? domainMatch[0] : "";
        if (!domain) return;

        handleTabChange("all");
        const d = new Date(ts);
        const from = new Date(d); from.setDate(d.getDate() - 3);
        const to = new Date(d); to.setDate(d.getDate() + 3);

        setResults([]);
        setQuery(domain);
        setDateFrom(from.toISOString().split("T")[0]);
        setDateTo(to.toISOString().split("T")[0]);
        setPage(1);
        setContextMenu(null);
    };

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
    // ── Annotations & CoC state ──
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [cocData, setCocData] = useState<CoCData | null>(null);
    const [showCoC, setShowCoC] = useState(false);
    const [highlightPopup, setHighlightPopup] = useState<{ text: string; x: number; y: number } | null>(null);
    const [highlightNote, setHighlightNote] = useState("");
    const [highlightColor, setHighlightColor] = useState(HIGHLIGHT_COLORS[0]);
    const [savingAnnotation, setSavingAnnotation] = useState(false);
    const [detailTab, setDetailTab] = useState<"body" | "annotations" | "coc" | "ai" | "thread">("body");
    const [aiResponse, setAiResponse] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);

    // ── Thread view state ──
    const [threadEmails, setThreadEmails] = useState<ThreadEmail[]>([]);
    const [threadSubject, setThreadSubject] = useState("");
    const [threadLoading, setThreadLoading] = useState(false);
    const bodyRef = useRef<HTMLDivElement>(null);

    // ── Workbench Sections ──
    const [wbSections, setWbSections] = useState<WorkbenchSection[]>([]);
    const [showSectionPicker, setShowSectionPicker] = useState(false);


    const fetchSections = useCallback(async () => {
        try {
            const res = await fetch("/api/workbench/sections");
            const data = await res.json();
            setWbSections(data.sections || []);
        } catch (e) { console.error("fetch sections err:", e); }
    }, []);



    // ── iMessage View toggle ──
    const [iMessageView, setIMessageView] = useState(false);
    const [jumpToRowid, setJumpToRowid] = useState<number | null>(null);

    // ── Label exclusion (auto-filter trash/spam/draft) ──
    const DEFAULT_EXCLUDES = ["trash", "spam", "draft"];
    const [excludeLabels, setExcludeLabels] = useState<string[]>(DEFAULT_EXCLUDES);
    const toggleExclude = (label: string) => {
        setExcludeLabels(prev =>
            prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
        );
        setPage(1);
    };

    // ── Multi-select mode ──
    const [selectMode, setSelectMode] = useState(false);
    const [selectedRowids, setSelectedRowids] = useState<Set<number>>(new Set());
    const toggleRowid = (rowid: number) => {
        setSelectedRowids(prev => {
            const next = new Set(prev);
            if (next.has(rowid)) next.delete(rowid); else next.add(rowid);
            return next;
        });
    };

    // ── Category Tabs ──
    type EvidenceTab = "all" | "imessage" | "email" | "transcripts" | "financial" | "court";
    const [activeTab, setActiveTab] = useState<EvidenceTab>("all");
    const EVIDENCE_TABS: { id: EvidenceTab; label: string; icon: React.ReactNode; sourceFilter: string; color: string }[] = [
        { id: "all", label: "All", icon: <LayoutGrid size={15} />, sourceFilter: "", color: "#94a3b8" },
        { id: "imessage", label: "iMessage", icon: <MessageSquare size={15} />, sourceFilter: "imessage", color: "#34d399" },
        { id: "email", label: "Email", icon: <Mail size={15} />, sourceFilter: "email", color: "#60a5fa" },
        { id: "transcripts", label: "Transcripts", icon: <Mic size={15} />, sourceFilter: "transcript", color: "#f472b6" },
        { id: "financial", label: "Financial", icon: <DollarSign size={15} />, sourceFilter: "financial", color: "#fbbf24" },
        { id: "court", label: "Court", icon: <Scale size={15} />, sourceFilter: "legal", color: "#a78bfa" },
    ];
    const handleTabChange = (tab: EvidenceTab) => {
        setActiveTab(tab);
        const tabDef = EVIDENCE_TABS.find(t => t.id === tab);
        setSourceFilter(tabDef?.sourceFilter || "");
        setIMessageView(tab === "imessage");
        setPage(1);
    };

    // ── Toast notifications ──
    const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
    const showToast = useCallback((msg: string, error = false) => {
        setToast({ msg, error });
        setTimeout(() => setToast(null), 3500);
    }, []);

    const assignToSection = useCallback(async (section: string, evidenceIds: string[], evidenceType: string = "email") => {
        try {
            const results = await Promise.all(evidenceIds.map(id =>
                fetch("/api/workbench/assign", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ evidenceId: id, evidenceType, targetSection: section }),
                })
            ));
            const ok = results.filter(r => r.ok).length;
            showToast(`📁 Assigned ${ok} item${ok !== 1 ? "s" : ""} to ${section}`);
        } catch (e) { console.error("assign err:", e); showToast("❌ Failed to assign", true); }
    }, [showToast]);

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

    // Load handle map on mount
    useEffect(() => {
        fetchSections();
        fetch('/api/players?mode=handles').then(r => r.json()).then(data => {
            if (data.handleMap) setHandleMap(data.handleMap);
        }).catch(() => {});
    }, [fetchSections]);

    // Click-outside to close context menu and participant dropdown
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (participantDropdownOpen && participantRef.current && !participantRef.current.contains(e.target as Node)) {
                setParticipantDropdownOpen(false);
            }
            if (contextMenu) {
                setContextMenu(null);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [participantDropdownOpen, contextMenu]);

    const fetchResults = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: String(limit) });
            if (query) params.set("q", query);
            if (sourceFilter) params.set("source_type", sourceFilter);
            if (tagFilter) params.set("tag", tagFilter);
            if (participantFilter.length) {
                // Send as pipe-separated groups: each player's identifiers are comma-sep, players separated by |
                const groups = participantFilter.map(id => (PLAYER_PROFILES.find(p => p.id === id)?.identifiers || []).join(","));
                params.set("participant", groups.join("|"));
            }
            if (dateFrom) params.set("date_from", dateFrom);
            if (dateTo) params.set("date_to", dateTo);
            params.set("sort_dir", sortDir);
            if (excludeLabels.length > 0) params.set("exclude_labels", excludeLabels.join(","));
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
    }, [query, sourceFilter, tagFilter, participantFilter.join(), dateFrom, dateTo, page, sortDir, excludeLabels.join(), limit]);

    useEffect(() => { fetchResults(); }, [fetchResults]);


    useEffect(() => {
        if (!jumpToRowid || loading || !results.length) return;
        // Small delay to let DOM render
        const timer = setTimeout(() => {
            const el = document.querySelector(`[data-rowid="${jumpToRowid}"]`);
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                el.classList.add("imsg-highlight-jump");
                setTimeout(() => el.classList.remove("imsg-highlight-jump"), 2500);
            }
            setJumpToRowid(null);
        }, 300);
        return () => clearTimeout(timer);
    }, [jumpToRowid, loading, results]);

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
                setCocData({ evidence_id: id, chain: [], participants: [], origin_count: 0 });
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

    /* ─── fetch email thread ─── */
    const fetchThread = async (messageId: string) => {
        setThreadLoading(true);
        setThreadEmails([]);
        try {
            const res = await fetch(`/api/communications/${encodeURIComponent(messageId)}/thread`);
            const data = await res.json();
            setThreadEmails(data.thread || []);
            setThreadSubject(data.base_subject || "");
            setDetailTab("thread");
        } catch (err) {
            console.error("thread fetch error:", err);
        } finally {
            setThreadLoading(false);
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
        setParticipantFilter([]); setDateFrom(""); setDateTo("");
        setPage(1);
    };

    const hasFilters = query || sourceFilter || tagFilter || participantFilter.length > 0 || dateFrom || dateTo;

    return (
        <div className="evidence-hub-page">
            <style>{`
                .evidence-hub-page {
                    display: flex;
                    flex-direction: column;
                    min-height: 100vh;
                    background: linear-gradient(135deg, #0a0e1a 0%, #111827 50%, #0f172a 100%);
                    color: #e2e8f0;
                    font-family: 'Inter', -apple-system, system-ui, sans-serif;
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
                    position: sticky;
                    top: 0;
                    max-height: 100vh;
                    overflow-y: auto;
                    background: rgba(15, 23, 42, 0.6);
                    padding: 20px;
                    align-self: start;
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
                .eh-detail-tabs { display: flex; gap: 2px; margin-bottom: 16px; background: rgba(15, 23, 42, 0.5); border-radius: 8px; padding: 3px; overflow-x: auto; flex-wrap: wrap; }
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

                /* ── Category Tab Bar ── */
                .eh-tab-bar {
                    display: flex; gap: 2px; padding: 6px 24px;
                    background: rgba(15, 23, 42, 0.6);
                    border-bottom: 1px solid rgba(71, 85, 105, 0.25);
                    flex-shrink: 0;
                }
                .eh-tab-btn {
                    display: flex; align-items: center; gap: 7px;
                    padding: 10px 18px; border-radius: 8px;
                    font-size: 13px; font-weight: 600; cursor: pointer;
                    border: 1px solid transparent;
                    background: transparent; color: #64748b;
                    transition: all 0.2s; position: relative;
                    letter-spacing: 0.01em;
                }
                .eh-tab-btn:hover { color: #cbd5e1; background: rgba(30, 41, 59, 0.5); }
                .eh-tab-btn.active {
                    background: rgba(30, 41, 59, 0.8);
                    border-color: rgba(71, 85, 105, 0.4);
                }
                .eh-tab-btn.active::after {
                    content: ''; position: absolute; bottom: -7px; left: 20%; right: 20%;
                    height: 2px; border-radius: 2px;
                }

                /* ── Label Exclusion Chips ── */
                .eh-label-chips {
                    display: flex; align-items: center; gap: 6px;
                    padding: 6px 24px;
                    background: rgba(15, 23, 42, 0.4);
                    border-bottom: 1px solid rgba(71, 85, 105, 0.15);
                    flex-shrink: 0;
                }
                .label-chip {
                    display: inline-flex; align-items: center; gap: 4px;
                    padding: 3px 10px; border-radius: 12px;
                    font-size: 11px; font-weight: 500; cursor: pointer;
                    border: 1px solid; background: transparent;
                    transition: all 0.2s; text-transform: capitalize;
                    letter-spacing: 0.02em;
                }
                .label-chip:hover { opacity: 0.8; transform: scale(1.02); }
                .label-chip.excluded { font-weight: 600; }
                .label-chip.included { opacity: 0.5; }
                .label-chip.included:hover { opacity: 0.9; }

                /* ── iOS-style Conversation List ── */
                .ios-conv-list {
                    display: flex; flex-direction: column;
                    overflow-y: auto; height: 100%;
                }
                .ios-conv-list .ios-search {
                    padding: 10px 16px;
                    background: rgba(15, 23, 42, 0.3);
                    border-bottom: 1px solid rgba(71, 85, 105, 0.15);
                }
                .ios-conv-list .ios-search input {
                    width: 100%; padding: 8px 12px; border-radius: 10px;
                    background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(71, 85, 105, 0.2);
                    color: #e2e8f0; font-size: 13px; outline: none;
                }
                .ios-conv-list .ios-search input::placeholder { color: #475569; }
                .ios-conv-list .ios-search input:focus { border-color: rgba(52, 211, 153, 0.4); }
                .ios-conv-row {
                    display: flex; align-items: center; gap: 12px;
                    padding: 14px 16px; cursor: pointer;
                    border-bottom: 1px solid rgba(71, 85, 105, 0.1);
                    transition: background 0.15s;
                    position: relative;
                }
                .ios-conv-row:hover { background: rgba(30, 41, 59, 0.5); }
                .ios-conv-row.active { background: rgba(52, 211, 153, 0.08); }
                .ios-conv-avatar {
                    width: 44px; height: 44px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 16px; font-weight: 700; color: white;
                    flex-shrink: 0; letter-spacing: -0.5px;
                }
                .ios-conv-info { flex: 1; min-width: 0; }
                .ios-conv-name {
                    font-size: 15px; font-weight: 600; color: #f1f5f9;
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                    line-height: 1.3;
                }
                .ios-conv-preview {
                    font-size: 13px; color: #64748b;
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                    line-height: 1.4; margin-top: 2px;
                }
                .ios-conv-right {
                    display: flex; flex-direction: column; align-items: flex-end;
                    gap: 4px; flex-shrink: 0;
                }
                .ios-conv-time {
                    font-size: 12px; color: #475569; white-space: nowrap;
                }
                .ios-conv-badge {
                    background: #3b82f6; color: white; font-size: 11px;
                    font-weight: 700; padding: 1px 7px; border-radius: 10px;
                    min-width: 20px; text-align: center;
                }
                .ios-conv-delete {
                    position: absolute; top: 50%; right: 8px; transform: translateY(-50%);
                    background: none; border: none; color: #475569; cursor: pointer;
                    padding: 4px; opacity: 0; transition: opacity 0.15s;
                }
                .ios-conv-row:hover .ios-conv-delete { opacity: 1; }
                .ios-conv-delete:hover { color: #ef4444; }
                .ios-conv-new-btn {
                    display: flex; align-items: center; gap: 8px;
                    padding: 12px 16px; cursor: pointer;
                    border: none; background: none; color: #3b82f6;
                    font-size: 14px; font-weight: 600; width: 100%;
                    border-bottom: 1px solid rgba(71, 85, 105, 0.1);
                    transition: background 0.15s;
                }
                .ios-conv-new-btn:hover { background: rgba(59, 130, 246, 0.06); }

                /* ── Folder headers ── */
                .ios-folder-header {
                    display: flex; align-items: center; gap: 6px;
                    padding: 10px 12px; cursor: pointer;
                    font-size: 12px; font-weight: 700; color: #94a3b8;
                    text-transform: uppercase; letter-spacing: 0.05em;
                    border-bottom: 1px solid rgba(71, 85, 105, 0.1);
                    transition: background 0.15s;
                }
                .ios-folder-header:hover { background: rgba(255,255,255,0.03); color: #cbd5e1; }
                .ios-folder-count {
                    margin-left: auto; font-size: 10px; font-weight: 500;
                    color: #64748b; text-transform: none; letter-spacing: 0;
                }
                .ios-folder-header.drop-over {
                    background: rgba(59, 130, 246, 0.12); border-color: #3b82f6;
                }
                .ios-conv-row.dragging { opacity: 0.4; }
                .ios-conv-row[draggable] { cursor: grab; }
                .ios-conv-row[draggable]:active { cursor: grabbing; }

                /* ── Context Menu ── */
                .ctx-backdrop {
                    position: fixed; inset: 0; z-index: 999;
                }
                .ctx-menu {
                    position: fixed; z-index: 1000;
                    background: #1e293b; border: 1px solid rgba(71,85,105,0.3);
                    border-radius: 10px; padding: 4px 0; min-width: 180px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                    backdrop-filter: blur(12px);
                }
                .ctx-menu-title {
                    font-size: 10px; font-weight: 700; color: #64748b;
                    text-transform: uppercase; letter-spacing: 0.06em;
                    padding: 8px 12px 4px;
                }
                .ctx-menu-item {
                    display: flex; align-items: center; gap: 8px;
                    padding: 7px 12px; font-size: 13px; color: #e2e8f0;
                    cursor: pointer; transition: background 0.1s;
                }
                .ctx-menu-item:hover { background: rgba(59, 130, 246, 0.12); }
                .ctx-menu-item.active { color: #3b82f6; font-weight: 600; }
                .ctx-menu-item.new { color: #34d399; }
                .ctx-menu-item.danger { color: #f87171; }
                .ctx-menu-separator { height: 1px; background: rgba(71,85,105,0.2); margin: 4px 0; }
                .ctx-menu-input-wrap { padding: 4px 8px; }
                .ctx-menu-input {
                    width: 100%; padding: 6px 10px; font-size: 12px;
                    background: rgba(255,255,255,0.06); border: 1px solid rgba(71,85,105,0.3);
                    border-radius: 6px; color: #e2e8f0; outline: none;
                }
                .ctx-menu-input:focus { border-color: #3b82f6; }

                /* ── Chat Header (inside conversation) ── */
                .imsg-chat-header {
                    display: flex; align-items: center; gap: 12px;
                    padding: 12px 16px;
                    background: rgba(15, 23, 42, 0.5);
                    border-bottom: 1px solid rgba(71, 85, 105, 0.2);
                    flex-shrink: 0;
                }
                .imsg-chat-back {
                    display: flex; align-items: center; gap: 4px;
                    background: none; border: none; cursor: pointer;
                    color: #3b82f6; font-size: 14px; font-weight: 600;
                    padding: 4px 0; transition: opacity 0.15s;
                }
                .imsg-chat-back:hover { opacity: 0.8; }
                .imsg-chat-title {
                    flex: 1; text-align: center;
                    font-size: 15px; font-weight: 700; color: #f1f5f9;
                }
                .imsg-chat-avatar {
                    width: 32px; height: 32px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 12px; font-weight: 700; color: white;
                }

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

                /* ── iMessage Bubble View ── */
                .imsg-thread {
                    display: flex; flex-direction: column; gap: 3px;
                    padding: 16px 12px; min-height: 100%;
                    background: #0b0b0b;
                    max-width: 680px; margin: 0 auto;
                }
                .imsg-time-sep {
                    text-align: center; font-size: 11px; color: #6b7280;
                    padding: 10px 0 4px; font-weight: 500;
                }
                .imsg-row {
                    display: flex; max-width: 70%; margin-bottom: 2px;
                    cursor: pointer; transition: opacity 0.1s;
                }
                .imsg-row:hover { opacity: 0.85; }
                .imsg-row.me { align-self: flex-end; }
                .imsg-row.them { align-self: flex-start; }
                .imsg-bubble {
                    padding: 8px 14px; border-radius: 18px;
                    font-size: 15px; line-height: 1.35; word-break: break-word;
                    position: relative; letter-spacing: -0.01em;
                }
                .imsg-row.me .imsg-bubble {
                    background: #0b84fe; color: #fff;
                    border-bottom-right-radius: 4px;
                }
                .imsg-row.them .imsg-bubble {
                    background: #2c2c2e; color: #fff;
                    border-bottom-left-radius: 4px;
                }
                .imsg-sender {
                    font-size: 10px; color: #6b7280; padding: 6px 14px 2px;
                    font-weight: 500;
                }
                .imsg-row.me .imsg-sender { text-align: right; }
                .imsg-row.them .imsg-sender { text-align: left; }
                .imsg-time-hover {
                    font-size: 9px; color: #4b5563; padding-top: 1px;
                    text-align: center; opacity: 0; transition: opacity 0.15s;
                }
                .imsg-row:hover .imsg-time-hover { opacity: 1; }
                .imsg-meta {
                    font-size: 9px; color: #4b5563; padding: 2px 14px 0;
                    font-family: 'SF Mono', 'Fira Code', monospace;
                    letter-spacing: 0.02em;
                }
                .imsg-row.me .imsg-meta { text-align: right; }
                .imsg-row.them .imsg-meta { text-align: left; }
                .imsg-row.selected .imsg-bubble {
                    outline: 2px solid #22d3ee; outline-offset: 2px;
                }
                .imsg-highlight-jump {
                    animation: jumpPulse 2.5s ease-out;
                }
                @keyframes jumpPulse {
                    0% { box-shadow: 0 0 0 0 rgba(34, 211, 238, 0.7); }
                    30% { box-shadow: 0 0 16px 4px rgba(34, 211, 238, 0.5); }
                    100% { box-shadow: 0 0 0 0 rgba(34, 211, 238, 0); }
                }
                .imsg-bubble[title]:hover {
                    filter: brightness(1.1);
                    cursor: default;
                }
                .imsg-empty-body { color: #4b5563; font-style: italic; }
                .imsg-attachment { display: flex; flex-direction: column; gap: 6px; }
                .imsg-attachment-img { max-width: 280px; max-height: 320px; border-radius: 10px; cursor: zoom-in; object-fit: cover; }
                .imsg-attachment-text { font-size: 13px; margin-top: 2px; }
                .imsg-attachment-fallback { font-size: 13px; color: #94a3b8; }
                .hidden { display: none; }

                /* ── Participant Multi-Select ── */
                .participant-select {
                    display: flex; align-items: center; gap: 4px; flex-wrap: wrap;
                    min-width: 180px; min-height: 30px; padding: 4px 8px;
                    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 6px; cursor: pointer; font-size: 12px;
                }
                .participant-select:hover { border-color: rgba(139,92,246,0.4); }
                .participant-chip {
                    display: inline-flex; align-items: center; gap: 4px;
                    padding: 2px 8px; border-radius: 12px; font-size: 11px;
                    font-weight: 600; border: 1px solid;
                }
                .participant-chip button {
                    background: none; border: none; color: inherit; cursor: pointer;
                    font-size: 14px; padding: 0; line-height: 1; opacity: 0.7;
                }
                .participant-chip button:hover { opacity: 1; }
                .participant-dropdown {
                    position: absolute; top: 100%; left: 0; right: 0;
                    background: #1e293b; border: 1px solid rgba(255,255,255,0.15);
                    border-radius: 8px; padding: 4px; z-index: 100;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.5); min-width: 260px;
                    margin-top: 4px;
                }
                .participant-option {
                    display: flex; align-items: center; gap: 8px;
                    padding: 8px 10px; border-radius: 6px; cursor: pointer;
                    transition: background 0.1s;
                }
                .participant-option:hover { background: rgba(255,255,255,0.08); }
                .participant-option.selected { background: rgba(52,211,153,0.1); }
                .participant-dot {
                    width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
                }

                /* ── Multi-select floating bar ── */
                .select-float-bar {
                    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
                    display: flex; align-items: center; gap: 12px;
                    background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(139, 92, 246, 0.4);
                    border-radius: 12px; padding: 10px 20px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.15);
                    z-index: 1000; backdrop-filter: blur(12px);
                    font-size: 13px; color: #e2e8f0;
                }
                .select-float-bar .count {
                    font-weight: 700; color: #a78bfa; min-width: 100px;
                }
                .select-float-bar button {
                    display: flex; align-items: center; gap: 4px;
                    padding: 6px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.15);
                    background: rgba(255,255,255,0.06); color: #e2e8f0;
                    font-size: 12px; cursor: pointer; transition: all 0.15s;
                    white-space: nowrap;
                }
                .select-float-bar button:hover {
                    background: rgba(139, 92, 246, 0.2); border-color: rgba(139,92,246,0.5);
                }
                .select-float-bar button.primary {
                    background: rgba(52, 211, 153, 0.15); border-color: rgba(52,211,153,0.4);
                    color: #34d399;
                }
                .select-float-bar button.primary:hover {
                    background: rgba(52, 211, 153, 0.3);
                }
                .select-float-bar button.danger {
                    background: rgba(239, 68, 68, 0.1); border-color: rgba(239,68,68,0.3);
                    color: #f87171;
                }
                .select-checkbox {
                    width: 16px; height: 16px; accent-color: #a78bfa; cursor: pointer;
                    flex-shrink: 0;
                }
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
                <button
                    className={`eh-btn ${selectMode ? "active" : ""}`}
                    onClick={() => { setSelectMode(!selectMode); if (selectMode) { setSelectedRowids(new Set()); } }}
                    style={selectMode ? { background: "rgba(139,92,246,0.2)", borderColor: "rgba(139,92,246,0.5)", color: "#a78bfa" } : undefined}
                >
                    <Plus size={14} /> {selectMode ? "Exit Select" : "Select"}
                </button>
                <div className="eh-header-meta">
                    <button
                        className="eh-btn"
                        onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
                        title={sortDir === "asc" ? "Showing oldest first" : "Showing newest first"}
                        style={{ minWidth: 72, padding: "4px 10px" }}
                    >
                        {sortDir === "asc" ? "↑ Oldest" : "↓ Newest"}
                    </button>
                    <span className="count">{total.toLocaleString()} results</span>
                    {searchMode && <span className="badge">{searchMode}</span>}
                    {hasFilters && (
                        <button className="eh-btn" onClick={() => { clearFilters(); setActiveTab("all"); }} style={{ padding: "4px 8px" }}>
                            <X size={14} /> Clear
                        </button>
                    )}
                </div>
            </header>

            {/* ─── Category Tab Bar ─── */}
            <div className="eh-tab-bar">
                {EVIDENCE_TABS.map(tab => (
                    <button
                        key={tab.id}
                        className={`eh-tab-btn ${activeTab === tab.id ? "active" : ""}`}
                        onClick={() => handleTabChange(tab.id)}
                        style={activeTab === tab.id ? { color: tab.color } : {}}
                    >
                        {tab.icon} {tab.label}
                        {activeTab === tab.id && (
                            <span style={{ position: "absolute", bottom: -7, left: "20%", right: "20%", height: 2, borderRadius: 2, background: tab.color }} />
                        )}
                    </button>
                ))}
            </div>

            {/* ─── Label Exclusion Chips ─── */}
            {(activeTab === "email" || activeTab === "all") && (
                <div className="eh-label-chips">
                    <span style={{ fontSize: 11, color: "#64748b", marginRight: 6 }}>
                        <Filter size={11} /> Hiding:
                    </span>
                    {["trash", "spam", "draft", "sent", "archived"].map(label => {
                        const isExcluded = excludeLabels.includes(label);
                        const colors: Record<string, string> = {
                            trash: "#ef4444", spam: "#f97316", draft: "#a78bfa",
                            sent: "#60a5fa", archived: "#94a3b8",
                        };
                        return (
                            <button
                                key={label}
                                className={`label-chip ${isExcluded ? "excluded" : "included"}`}
                                onClick={() => toggleExclude(label)}
                                style={{
                                    borderColor: isExcluded ? colors[label] : "#334155",
                                    color: isExcluded ? colors[label] : "#94a3b8",
                                    background: isExcluded ? `${colors[label]}15` : "transparent",
                                }}
                            >
                                {isExcluded ? <X size={10} /> : null}
                                {label}
                            </button>
                        );
                    })}
                    {excludeLabels.length > 0 && excludeLabels.some(l => !DEFAULT_EXCLUDES.includes(l)) && (
                        <button
                            className="label-chip reset"
                            onClick={() => { setExcludeLabels(DEFAULT_EXCLUDES); setPage(1); }}
                            style={{ color: "#64748b", borderColor: "#334155" }}
                        >
                            Reset
                        </button>
                    )}
                </div>
            )}

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
                    <div ref={participantRef} style={{ position: "relative" }}>
                        <label></label>
                        <div
                            className="participant-select"
                            onClick={() => setParticipantDropdownOpen(!participantDropdownOpen)}
                        >
                            {participantFilter.length === 0 ? (
                                <span style={{ color: "#6b7280", fontSize: 12 }}>Filter by contact…</span>
                            ) : (
                                participantFilter.map(id => {
                                    const p = PLAYER_PROFILES.find(pp => pp.id === id);
                                    return p ? (
                                        <span key={id} className="participant-chip" style={{ background: `${p.color}30`, borderColor: `${p.color}60`, color: p.color }}>
                                            {p.name}
                                            <button onClick={(e) => { e.stopPropagation(); setParticipantFilter(prev => prev.filter(x => x !== id)); setPage(1); }}>×</button>
                                        </span>
                                    ) : null;
                                })
                            )}
                            <ChevronDown size={12} style={{ marginLeft: "auto", opacity: 0.5 }} />
                        </div>
                        {participantDropdownOpen && (
                            <div className="participant-dropdown">
                                {PLAYER_PROFILES.filter(p => p.id !== "jz").map(p => {
                                    const selected = participantFilter.includes(p.id);
                                    return (
                                        <div
                                            key={p.id}
                                            className={`participant-option ${selected ? "selected" : ""}`}
                                            onClick={() => {
                                                setParticipantFilter(prev => selected ? prev.filter(x => x !== p.id) : [...prev, p.id]);
                                                setPage(1);
                                            }}
                                        >
                                            <span className="participant-dot" style={{ background: p.color }} />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name} <span style={{ fontWeight: 400, color: "#9ca3af", fontSize: 11 }}>({p.fullName})</span></div>
                                                <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>{p.identifiers.slice(0, 3).join(", ")}{p.identifiers.length > 3 ? ` +${p.identifiers.length - 3}` : ""}</div>
                                            </div>
                                            {selected && <span style={{ color: "#34d399" }}>✓</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <label>From:
                        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
                    </label>
                    <label>To:
                        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
                    </label>
                    {dateFrom && dateTo && (
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <button
                                className="eh-btn"
                                title="Shift window earlier (−7 days)"
                                style={{ padding: "2px 6px", fontSize: 13 }}
                                onClick={() => {
                                    const f = new Date(dateFrom); f.setDate(f.getDate() - 7);
                                    const t = new Date(dateTo); t.setDate(t.getDate() - 7);
                                    setDateFrom(f.toISOString().split('T')[0]);
                                    setDateTo(t.toISOString().split('T')[0]);
                                    setPage(1);
                                }}
                            >
                                <ChevronUp size={14} /> Earlier
                            </button>
                            <button
                                className="eh-btn"
                                title="Shift window later (+7 days)"
                                style={{ padding: "2px 6px", fontSize: 13 }}
                                onClick={() => {
                                    const f = new Date(dateFrom); f.setDate(f.getDate() + 7);
                                    const t = new Date(dateTo); t.setDate(t.getDate() + 7);
                                    setDateFrom(f.toISOString().split('T')[0]);
                                    setDateTo(t.toISOString().split('T')[0]);
                                    setPage(1);
                                }}
                            >
                                <ChevronDown size={14} /> Later
                            </button>
                        </div>
                    )}
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
                    {loading ? (
                        <div className="eh-loading"><RefreshCw size={20} /> &nbsp; Loading…</div>
                    ) : results.length === 0 ? (
                        <div className="eh-empty">
                            <Search size={40} />
                            <p>No evidence found. Try adjusting your search or filters.</p>
                        </div>
                    ) : iMessageView && searchMode === "official_chatdb" ? (
                        /* ── iMessage Bubble View ── */
                        <div className="imsg-thread">
                            {(() => {
                                let lastDate = "";
                                return results.map((item: any, i: number) => {
                                    const ts = item.start_timestamp;
                                    const dateLabel = ts ? new Date(ts).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "";
                                    const timeLabel = ts ? new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" }) : "";
                                    const showDateSep = dateLabel !== lastDate;
                                    if (showDateSep) lastDate = dateLabel;
                                    const isMe = item.is_from_me === 1;
                                    return (
                                        <React.Fragment key={item.canonical_id || `${item.id}-${i}`}>
                                            {showDateSep && <div className="imsg-time-sep">{dateLabel}</div>}
                                            <div
                                                className={`imsg-row ${isMe ? "me" : "them"} ${selectedId === item.id ? "selected" : ""}`}
                                                onClick={() => selectMode ? toggleRowid(item.id) : fetchDetail(item.id, "imessage")}
                                            >
                                            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                                                    {selectMode && (
                                                        <input type="checkbox" className="select-checkbox"
                                                            checked={selectedRowids.has(item.id)}
                                                            onChange={() => toggleRowid(item.id)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            style={{ marginTop: 6 }}
                                                        />
                                                    )}
                                                    <div style={{ flex: 1 }}>
                                                        <div className="imsg-sender">{isMe ? resolveHandle("+17736109104") : resolveHandle(item.handle_id || "?")}</div>
                                                        <div className="imsg-bubble" title={`ROWID: ${item.id}\nGUID: ${item.canonical_id || 'N/A'}`} data-rowid={item.id}>
                                                            {item.preview || <span className="imsg-empty-body">[attachment]</span>}
                                                        </div>
                                                        <div className="imsg-meta">
                                                            {timeLabel} · {isMe ? "+17736109104" : (item.handle_id || "Unknown")}
                                                        </div>
                                                        <div className="imsg-time-hover">{dateLabel}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </React.Fragment>
                                    );
                                });
                            })()}
                        </div>
                    ) : (
                        results.map((item) => {
                            const tags = parseTags(item.tags);
                            return (
                                <div
                                    key={item.canonical_id || item.id}
                                    className={`eh-list-item ${selectedId === item.id ? "selected" : ""}`}
                                    onClick={() => selectMode ? toggleRowid(item.id) : fetchDetail(item.id, item.source_type)}
                                    onContextMenu={(e) => handleContextMenu(e, item)}
                                    style={selectMode ? { display: "flex", alignItems: "center", gap: 8 } : undefined}
                                >
                                    {selectMode && (
                                        <input type="checkbox" className="select-checkbox"
                                            checked={selectedRowids.has(item.id)}
                                            onChange={() => toggleRowid(item.id)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    )}
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
                                        <div className="title-line">{(item.title || item.canonical_id).replace(/\+?\d{10,}|[\w.+-]+@[\w.-]+/g, (m: string) => resolveHandle(m))}</div>
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

                {/* ── Multi-select floating action bar ── */}
                {selectMode && selectedRowids.size > 0 && (
                    <div className="select-float-bar">
                        <span className="count">{selectedRowids.size} selected</span>
                        <button className="danger" onClick={() => { setSelectedRowids(new Set()); setSelectMode(false); }}>
                            <X size={14} /> Clear
                        </button>
                    </div>
                )}

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
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                        <span className="eh-detail-title">{detail.evidence.title || detail.evidence.canonical_id}</span>
                                        <button 
                                            className="eh-btn active" 
                                            onClick={askAi}
                                            title="Ask AI about this evidence"
                                            style={{ padding: "4px 8px", background: "rgba(167, 139, 250, 0.15)", borderColor: "rgba(167, 139, 250, 0.4)" }}
                                        >
                                            <MessageCircle size={14} color="#a78bfa" /> <span style={{ color: "#a78bfa" }}>Ask AI</span>
                                        </button>
                                        {/* Assign to Section button */}
                                        {wbSections.length > 0 && (
                                            <div style={{ position: "relative" }}>
                                                <button
                                                    className="eh-btn"
                                                    onClick={() => { setShowSectionPicker(prev => !prev); }}
                                                    title="Assign to workbench section"
                                                    style={{ padding: "4px 8px", background: "rgba(251, 191, 36, 0.1)", borderColor: "rgba(251, 191, 36, 0.3)" }}
                                                >
                                                    <FolderOpen size={14} color="#fbbf24" /> <span style={{ color: "#fbbf24" }}>Section</span>
                                                </button>
                                                {showSectionPicker && (
                                                    <div className="eh-conv-dropdown" style={{ top: "110%", left: 0, maxHeight: 240, overflowY: "auto" }}>
                                                        {wbSections.map(s => (
                                                            <button key={s.name} onClick={() => {
                                                                const eid = detail.evidence.canonical_id || String(detail.evidence.id);
                                                                assignToSection(s.name, [eid], detail.evidence.source_type || "email");
                                                                setShowSectionPicker(false);
                                                            }}>
                                                                <span style={{ fontSize: 10, color: "#fbbf24", fontWeight: 700, marginRight: 4 }}>{s.prefix}</span>
                                                                {s.name.replace(/_/g, " ")} <span style={{ color: "#64748b", fontSize: 10 }}>({s.totalItems})</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {/* View Thread button — email only */}
                                        {detail.evidence.source_type === "email" && (() => {
                                            try {
                                                const ids = JSON.parse(detail.evidence.primary_ids || "{}");
                                                const msgId = ids.message_id;
                                                if (!msgId) return null;
                                                return (
                                                    <button
                                                        className="eh-btn"
                                                        onClick={() => fetchThread(msgId)}
                                                        title="View full email thread"
                                                        style={{ padding: "4px 8px", background: "rgba(59, 130, 246, 0.12)", borderColor: "rgba(59, 130, 246, 0.35)" }}
                                                    >
                                                        <Link2 size={14} color="#3b82f6" />
                                                        <span style={{ color: "#3b82f6" }}>
                                                            {threadEmails.length > 1 ? `Thread (${threadEmails.length})` : "Thread"}
                                                        </span>
                                                    </button>
                                                );
                                            } catch { return null; }
                                        })()}
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
                                    {threadEmails.length > 0 && (
                                        <button className={`eh-detail-tab ${detailTab === "thread" ? "active" : ""}`} onClick={() => setDetailTab("thread")}>
                                            <Link2 size={12} /> Thread
                                            <span className="badge-count">{threadEmails.length}</span>
                                        </button>
                                    )}
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
                                                                onClick={() => {
                                                                    const match = PLAYER_PROFILES.find(pp => pp.identifiers.some(ident => (p.normalized_identifier || p.identifier).includes(ident) || ident.includes(p.normalized_identifier || p.identifier)));
                                                                    if (match) { setParticipantFilter(prev => prev.includes(match.id) ? prev : [...prev, match.id]); }
                                                                    setPage(1); setShowFilters(true);
                                                                }}
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

                                {/* ── Thread tab ── */}
                                {detailTab === "thread" && (
                                    <ThreadView
                                        threadEmails={threadEmails}
                                        threadSubject={threadSubject}
                                        threadLoading={threadLoading}
                                        wbSections={wbSections}
                                        assignToSection={assignToSection}
                                    />
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

            {/* ═══ Toast Popup ═══ */}
            {toast && (
                <div style={{
                    position: "fixed", top: 24, right: 24, zIndex: 9999,
                    padding: "10px 18px", borderRadius: 8,
                    background: toast.error ? "#ef4444" : "#10b981",
                    color: "#fff", fontSize: "0.8125rem", fontWeight: 600,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                    animation: "fadeIn .2s",
                }}>
                    {toast.msg}
                </div>
            )}
            {/* ── Context Menu Overlay ── */}
            {contextMenu && (
                <div 
                    className="eh-context-menu"
                    style={{ 
                        position: 'fixed', 
                        top: contextMenu.y, 
                        left: contextMenu.x,
                        zIndex: 9999,
                        background: '#1e1e2e',
                        border: '1px solid #313244',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        padding: '4px',
                        minWidth: '240px'
                    }}
                >
                    {(() => {
                        let email = "Unknown";
                        try {
                            const parsed = JSON.parse(contextMenu.item.primary_ids || "{}");
                            email = parsed.account || parsed.message_id?.match(/[\w.+-]+@[\w.-]+/)?.[0] || "Unknown";
                        } catch {
                            const emailMatch = contextMenu.item.primary_ids?.split(',')[0] || contextMenu.item.title.match(/[\w.+-]+@[\w.-]+/)?.[0];
                            email = emailMatch || "Unknown";
                        }
                        const domain = email.split('@')[1];
                        
                        return (
                            <>
                                <div style={{ padding: '8px 12px', fontSize: '11px', color: '#7f849c', borderBottom: '1px solid #313244', marginBottom: '4px' }}>
                                    PIVOT FILTERS (±3 DAYS)
                                </div>
                                <button 
                                    className="eh-context-item"
                                    onClick={(e) => { e.stopPropagation(); pivotToAccount(email, contextMenu.item.start_timestamp); }}
                                >
                                    <User size={14} /> All mail for <strong>{email}</strong>
                                </button>
                                {domain && (
                                    <button 
                                        className="eh-context-item"
                                        onClick={(e) => { e.stopPropagation(); pivotToDomain(email, contextMenu.item.start_timestamp); }}
                                    >
                                        <Globe size={14} /> All mail for domain <strong>@{domain}</strong>
                                    </button>
                                )}
                                <button 
                                    className="eh-context-item"
                                    onClick={(e) => { e.stopPropagation(); setContextMenu(null); }}
                                >
                                    <X size={14} /> Cancel
                                </button>
                            </>
                        );
                    })()}
                </div>
            )}
            <style jsx global>{`
                .eh-context-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    width: 100%;
                    padding: 8px 12px;
                    background: transparent;
                    border: none;
                    color: #cdd6f4;
                    font-size: 13px;
                    text-align: left;
                    cursor: pointer;
                    border-radius: 4px;
                }
                .eh-context-item:hover {
                    background: #313244;
                }
                .eh-context-item strong {
                    color: var(--accent-blue);
                }
            `}</style>
        </div>
    );
}
