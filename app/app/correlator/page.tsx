"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
    Headphones,
    Search,
    ChevronLeft,
    ChevronRight,
    Mail,
    MessageSquare,
    ArrowRight,
    Clock,
    Smartphone,
    X,
    Columns2,
    RotateCcw,
    Link2,
    CheckSquare,
    Square,
    ChevronDown,
    ChevronUp,
    CalendarDays,
    Users,
    Briefcase,
    FolderOpen,
    Loader2,
} from "lucide-react";
import Link from "next/link";

/* ── Types ─────────────────────────────────────────────────────── */
interface SectionInfo {
    name: string;
    prefix: string;
    types: string[];
    pdfCount: number;
    emlCount: number;
    totalItems: number;
}
interface EmailRow {
    msg_id: string;
    account: string;
    sender: string;
    subject: string;
    date: string;
    source_file: string;
    zip_path: string;
}

interface EmailDetail extends EmailRow {
    body: string;
    thread_id: string;
    source_hash: string;
}

interface IMessage {
    id: number;
    handle_id: string;
    is_from_me: number;
    date_utc: string;
    body: string;
    service: string;
    chat_identifier: string;
    source_db: string;
    device: string;
    guid: string;
    has_attachments?: number;
}

interface ThreadEmail {
    msg_id: string;
    sender: string;
    account: string;
    subject: string;
    date: string;
    body: string;
    source_file: string;
    zip_path: string;
}

interface CalendarEvent {
    id: number;
    summary: string;
    start_dt: string;
    end_dt: string;
    duration_min: number;
    delta_days?: number;
}

interface PlayerMatch {
    id: number;
    slug: string;
    display_name: string;
    title: string;
    company: string;
    location: string;
    profile_type: string;
    linkedin_url: string;
}

/* ── Helpers ───────────────────────────────────────────────────── */
function getInitials(name: string): string {
    return name
        .replace(/[,®]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 0 && w[0] === w[0].toUpperCase())
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
}

function fmtDate(d: string | null) {
    if (!d) return "—";
    try {
        return new Date(d).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    } catch {
        return d;
    }
}

function timeDiff(a: string, b: string): string {
    try {
        const ms = Math.abs(new Date(a).getTime() - new Date(b).getTime());
        if (ms < 60000) return `${Math.round(ms / 1000)}s`;
        if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
        if (ms < 86400000) return `${(ms / 3600000).toFixed(1)}h`;
        return `${Math.round(ms / 86400000)}d`;
    } catch {
        return "?";
    }
}

/* ── Component ─────────────────────────────────────────────────── */
export default function CorrelatorPage() {
    /* state — emails */
    const [emails, setEmails] = useState<EmailRow[]>([]);
    const [emailTotal, setEmailTotal] = useState(0);
    const [emailPage, setEmailPage] = useState(1);
    const [emailPages, setEmailPages] = useState(1);
    const [emailQuery, setEmailQuery] = useState("");
    const [emailSearch, setEmailSearch] = useState("");
    const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
    const [loadingEmail, setLoadingEmail] = useState(false);

    /* state — iMessages */
    const [iMessages, setIMessages] = useState<IMessage[]>([]);
    const [imsgTotal, setImsgTotal] = useState(0);
    const [imsgPage, setImsgPage] = useState(1);
    const [imsgPages, setImsgPages] = useState(1);
    const [imsgQuery, setImsgQuery] = useState("");
    const [imsgSearch, setImsgSearch] = useState("");
    const [correlatedMsgs, setCorrelatedMsgs] = useState<IMessage[]>([]);
    const [isCorrelating, setIsCorrelating] = useState(false);
    const [handleFilter, setHandleFilter] = useState("");
    const [handles, setHandles] = useState<{ handle_id: string; cnt: number }[]>([]);

    /* ── Parse initial URL params ────────────────────────────────── */
    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const email = params.get("email");
            const phone = params.get("phone");

            if (email) {
                setEmailQuery(email);
                setEmailSearch(email);
            }
            if (phone) {
                setImsgQuery(phone);
                setImsgSearch(phone);
            }
        }
    }, []);

    /* state — thread */
    const [threadEmails, setThreadEmails] = useState<ThreadEmail[]>([]);
    const [threadSubject, setThreadSubject] = useState("");
    const [showThread, setShowThread] = useState(false);
    const [selectedForEvidence, setSelectedForEvidence] = useState<Set<string>>(new Set());
    const [threadExpanded, setThreadExpanded] = useState<string | null>(null);

    /* state — iMessage selection */
    const [selectedIMsgs, setSelectedIMsgs] = useState<Set<string>>(new Set());

    /* state — calendar */
    const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
    const [showCalendar, setShowCalendar] = useState(true);

    /* state — player lookup */
    const [senderPlayer, setSenderPlayer] = useState<PlayerMatch | null>(null);

    /* state — transcript match */
    const [matchedTranscript, setMatchedTranscript] = useState<{ slug: string; title: string } | null>(null);

    /* state — section picker for evidence assignment */
    const [sectionPickerOpen, setSectionPickerOpen] = useState(false);
    const [sectionPickerMode, setSectionPickerMode] = useState<"email" | "imsg">("email");
    const [availableSections, setAvailableSections] = useState<SectionInfo[]>([]);
    const [sectionsLoaded, setSectionsLoaded] = useState(false);
    const [assigningEvidence, setAssigningEvidence] = useState(false);

    /* state — UI feedback */
    const [toastMsg, setToastMsg] = useState<{ title: string, error?: boolean } | null>(null);

    /* refs */
    const anchorRef = useRef<HTMLDivElement>(null);

    /* ── Show Toast ───────────────────────────────────────────── */
    const showToast = useCallback((title: string, error = false) => {
        setToastMsg({ title, error });
        setTimeout(() => setToastMsg(null), 3000);
    }, []);

    /* ── Fetch emails ─────────────────────────────────────────── */
    const fetchEmails = useCallback(async () => {
        const qs = new URLSearchParams({
            page: String(emailPage),
            limit: "30",
            ...(emailSearch && { q: emailSearch }),
        });
        const res = await fetch(`/api/communications?${qs}`);
        const data = await res.json();
        setEmails(data.results || []);
        setEmailTotal(data.total || 0);
        setEmailPages(data.totalPages || 1);
    }, [emailPage, emailSearch]);

    useEffect(() => { fetchEmails(); }, [fetchEmails]);

    /* ── Fetch iMessages (browsing mode) ──────────────────────── */
    const fetchIMessages = useCallback(async () => {
        const qs = new URLSearchParams({
            page: String(imsgPage),
            limit: "50",
            ...(imsgSearch && { q: imsgSearch }),
            ...(handleFilter && { handle: handleFilter }),
        });
        const res = await fetch(`/api/imessages?${qs}`);
        const data = await res.json();
        setIMessages(data.results || []);
        setImsgTotal(data.total || 0);
        setImsgPages(data.totalPages || 1);
        if (data.handles) setHandles(data.handles);
    }, [imsgPage, imsgSearch, handleFilter]);

    useEffect(() => { fetchIMessages(); }, [fetchIMessages]);

    /* ── Select email → correlate ─────────────────────────────── */
    const selectEmail = useCallback(async (msgId: string) => {
        setLoadingEmail(true);
        try {
            // Step 1: get email detail (required — we need the date for everything else)
            const res = await fetch(`/api/communications/${encodeURIComponent(msgId)}`);
            const detail = await res.json();
            setSelectedEmail(detail);

            // Step 2: fire ALL secondary requests in parallel
            setSenderPlayer(null);
            setMatchedTranscript(null);
            const senderEmail = (detail.sender || detail.account || "").trim();
            const emailDate = detail.date ? detail.date.slice(0, 10) : null;

            if (detail.date) {
                setIsCorrelating(true);
            }

            const nearQs = detail.date ? new URLSearchParams({ near_date: detail.date, limit: "40" }) : null;
            const calQs = detail.date ? new URLSearchParams({ near_date: detail.date, limit: "10" }) : null;

            const [plData, imData, calData, threadData, trsData] = await Promise.all([
                // Player lookup (best-effort)
                senderEmail
                    ? fetch(`/api/players/lookup?email=${encodeURIComponent(senderEmail)}`)
                        .then(r => r.json()).catch(() => null)
                    : Promise.resolve(null),
                // Temporal iMessages (if we have a date)
                nearQs
                    ? fetch(`/api/imessages?${nearQs}`).then(r => r.json())
                    : Promise.resolve({ results: [] }),
                // Calendar events (best-effort)
                calQs
                    ? fetch(`/api/calendar?${calQs}`)
                        .then(r => r.ok ? r.json() : { events: [] })
                        .catch(() => ({ events: [] }))
                    : Promise.resolve({ events: [] }),
                // Thread emails
                fetch(`/api/communications/${encodeURIComponent(msgId)}/thread`)
                    .then(r => r.json())
                    .catch(() => ({ thread: [], base_subject: "" })),
                // Transcript match (best-effort)
                emailDate
                    ? fetch(`/api/transcripts?date=${emailDate}&limit=1`)
                        .then(r => r.json()).catch(() => ({ transcripts: [] }))
                    : Promise.resolve({ transcripts: [] }),
            ]);

            // Apply results
            if (plData?.match && plData?.player) {
                setSenderPlayer(plData.player);
            }
            if (trsData?.transcripts?.length > 0) {
                const t = trsData.transcripts[0];
                setMatchedTranscript({ slug: t.slug, title: t.title });
            }
            setCorrelatedMsgs(imData.results || []);
            setCalendarEvents(calData.events || []);
            setIsCorrelating(false);
            setThreadEmails(threadData.thread || []);
            setThreadSubject(threadData.base_subject || "");
            setSelectedForEvidence(new Set((threadData.thread || []).map((t: ThreadEmail) => t.msg_id)));

            if (detail.date) {
                setTimeout(() => {
                    anchorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 100);
            }
        } catch (e) {
            console.error(e);
        }
        setLoadingEmail(false);
    }, []);

    /* ── Search handlers ──────────────────────────────────────── */
    const handleEmailSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setEmailSearch(emailQuery);
        setEmailPage(1);
    };

    const handleImsgSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setImsgSearch(imsgQuery);
        setImsgPage(1);
    };

    const clearCorrelation = () => {
        setSelectedEmail(null);
        setCorrelatedMsgs([]);
        setThreadEmails([]);
        setShowThread(false);
        setSelectedForEvidence(new Set());
        setSelectedIMsgs(new Set());
        setSenderPlayer(null);
        setMatchedTranscript(null);
    };

    /* ── Load sections for evidence assignment ─────────────────── */
    const loadSections = useCallback(async () => {
        if (sectionsLoaded) return;
        try {
            const res = await fetch("/api/workbench/sections");
            const data = await res.json();
            setAvailableSections(data.sections || []);
            setSectionsLoaded(true);
        } catch (e) {
            console.error("Failed to load sections:", e);
        }
    }, [sectionsLoaded]);

    const openSectionPicker = (mode: "email" | "imsg") => {
        setSectionPickerMode(mode);
        setSectionPickerOpen(true);
        loadSections();
    };

    const handleAssignToSection = async (targetSection: string) => {
        setAssigningEvidence(true);
        let successCount = 0;
        let failCount = 0;

        if (sectionPickerMode === "email") {
            const ids = Array.from(selectedForEvidence);
            for (const id of ids) {
                try {
                    const res = await fetch("/api/workbench/assign", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            evidenceId: id,
                            evidenceType: "email",
                            targetSection,
                        }),
                    });
                    if (res.ok) successCount++;
                    else failCount++;
                } catch {
                    failCount++;
                }
            }
        } else {
            const keys = Array.from(selectedIMsgs);
            for (const key of keys) {
                try {
                    const res = await fetch("/api/workbench/assign", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            evidenceId: key,
                            evidenceType: "text",
                            targetSection,
                        }),
                    });
                    if (res.ok) successCount++;
                    else failCount++;
                } catch {
                    failCount++;
                }
            }
        }

        setAssigningEvidence(false);
        setSectionPickerOpen(false);

        const typeLabel = sectionPickerMode === "email" ? "email(s)" : "iMessage(s)";
        if (failCount === 0) {
            showToast(`✅ ${successCount} ${typeLabel} assigned to ${targetSection.replace(/_/g, " ")}`);
        } else {
            showToast(`⚠️ ${successCount} assigned, ${failCount} failed. Check console for details.`, true);
        }
    };

    const toggleEvidence = (msgId: string) => {
        setSelectedForEvidence((prev) => {
            const next = new Set(prev);
            if (next.has(msgId)) next.delete(msgId);
            else next.add(msgId);
            return next;
        });
    };

    const selectAllEvidence = () => {
        setSelectedForEvidence(new Set(threadEmails.map((t) => t.msg_id)));
    };

    const deselectAllEvidence = () => {
        setSelectedForEvidence(new Set());
    };

    const toggleIMsgSelect = (key: string) => {
        setSelectedIMsgs((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const selectAllIMsgs = () => {
        const msgs = showCorrelation ? correlatedMsgs : iMessages;
        setSelectedIMsgs(new Set(msgs.map((m) => m.guid || String(m.id))));
    };

    const deselectAllIMsgs = () => {
        setSelectedIMsgs(new Set());
    };

    const reAnchor = useCallback(async () => {
        if (!selectedEmail?.date) return;
        setIsCorrelating(true);
        const qs = new URLSearchParams({ near_date: selectedEmail.date, limit: "40" });
        const res = await fetch(`/api/imessages?${qs}`);
        const data = await res.json();
        setCorrelatedMsgs(data.results || []);
        setIsCorrelating(false);
        setTimeout(() => {
            anchorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
    }, [selectedEmail]);

    /* ── Render ────────────────────────────────────────────────── */
    const showCorrelation = selectedEmail && correlatedMsgs.length > 0;

    return (
        <div style={{ padding: "0" }}>
            {/* Header */}
            <div className="page-header" style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <Columns2 size={24} style={{ color: "var(--accent-cyan)" }} />
                    <h1 style={{ margin: 0 }}>Temporal Correlator</h1>
                </div>
                <p>Split-screen: emails on the left, iMessages on the right. Select an email to auto-correlate by timestamp.</p>
            </div>

            {/* Split screen grid */}
            <div className="correlator-grid">
                {/* ═══ LEFT PANEL: Emails ═══ */}
                <div className="correlator-panel">
                    <div className="correlator-panel-header">
                        <Mail size={14} />
                        <span>Emails</span>
                        <span className="correlator-count">{emailTotal.toLocaleString()}</span>
                    </div>

                    {/* Search */}
                    <form onSubmit={handleEmailSearch} className="correlator-search">
                        <Search size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                        <input
                            className="correlator-search-input"
                            type="text"
                            placeholder="Search subject, sender..."
                            value={emailQuery}
                            onChange={(e) => setEmailQuery(e.target.value)}
                        />
                    </form>

                    {/* Email list */}
                    <div className="correlator-list">
                        {emails.map((e) => (
                            <div
                                key={e.msg_id}
                                className={`correlator-email-row ${selectedEmail?.msg_id === e.msg_id ? "active" : ""}`}
                                onClick={() => selectEmail(e.msg_id)}
                            >
                                <div className="correlator-email-subject">{e.subject || "(no subject)"}</div>
                                <div className="correlator-email-meta">
                                    <span>{e.sender || e.account}</span>
                                    <span className="correlator-email-date">{fmtDate(e.date)}</span>
                                </div>
                            </div>
                        ))}
                        {emails.length === 0 && (
                            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                                No emails found
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    <div className="correlator-pagination">
                        <button
                            onClick={() => setEmailPage((p) => Math.max(1, p - 1))}
                            disabled={emailPage <= 1}
                            className="workbench-action-btn"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                            {emailPage} / {emailPages}
                        </span>
                        <button
                            onClick={() => setEmailPage((p) => Math.min(emailPages, p + 1))}
                            disabled={emailPage >= emailPages}
                            className="workbench-action-btn"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>

                {/* ═══ CENTER: Email Detail ═══ */}
                <div className="correlator-panel correlator-center">
                    <div className="correlator-panel-header">
                        <Mail size={14} />
                        <span>{showThread ? "Full Thread" : "Email Detail"}</span>
                        {selectedEmail && threadEmails.length > 1 && (
                            <button
                                onClick={() => setShowThread(!showThread)}
                                className="workbench-action-btn"
                                style={{ marginLeft: "0" }}
                                title={showThread ? "Show single email" : `View full thread (${threadEmails.length})`}
                            >
                                <Link2 size={12} />
                                <span style={{ fontSize: "0.6rem", marginLeft: "3px" }}>{threadEmails.length}</span>
                            </button>
                        )}
                        {selectedEmail && (
                            <button onClick={clearCorrelation} className="workbench-action-btn" style={{ marginLeft: "auto" }}>
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {selectedEmail && showThread ? (
                        /* ── Thread View ── */
                        <div className="correlator-detail">
                            <div className="correlator-thread-controls">
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <Link2 size={14} style={{ color: "var(--accent-cyan)" }} />
                                    <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>
                                        {threadSubject || selectedEmail.subject}
                                    </span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.375rem" }}>
                                    <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                                        {selectedForEvidence.size} of {threadEmails.length} selected for evidence
                                    </span>
                                    <button onClick={selectAllEvidence} className="correlator-thread-btn" title="Select all">
                                        <CheckSquare size={11} /> All
                                    </button>
                                    <button onClick={deselectAllEvidence} className="correlator-thread-btn" title="Deselect all">
                                        <Square size={11} /> None
                                    </button>
                                </div>
                            </div>

                            <div className="correlator-list" style={{ padding: "0.25rem 0.5rem" }}>
                                {threadEmails.map((t, idx) => {
                                    const isSelected = selectedForEvidence.has(t.msg_id);
                                    const isExpanded = threadExpanded === t.msg_id;
                                    const isCurrent = t.msg_id === selectedEmail.msg_id;
                                    return (
                                        <div key={t.msg_id} className={`correlator-thread-item ${isCurrent ? "current" : ""}`}>
                                            <div className="correlator-thread-row" onClick={() => toggleEvidence(t.msg_id)}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, minWidth: 0 }}>
                                                    {isSelected
                                                        ? <CheckSquare size={14} style={{ color: "var(--accent-cyan)", flexShrink: 0 }} />
                                                        : <Square size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                                                    }
                                                    <span className="correlator-thread-idx">{idx + 1}</span>
                                                    <div style={{ minWidth: 0, flex: 1 }}>
                                                        <div className="correlator-thread-subject">{t.subject}</div>
                                                        <div className="correlator-thread-meta">
                                                            <span>{t.sender || t.account}</span>
                                                            <span>{fmtDate(t.date)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    className="workbench-action-btn"
                                                    onClick={(e) => { e.stopPropagation(); setThreadExpanded(isExpanded ? null : t.msg_id); }}
                                                    title="Expand/collapse"
                                                >
                                                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                </button>
                                            </div>
                                            {isExpanded && (
                                                <div className="correlator-thread-body">
                                                    <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "var(--font-body)", fontSize: "0.775rem", lineHeight: 1.5, margin: 0 }}>
                                                        {t.body || "(no body)"}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="correlator-thread-footer">
                                <button
                                    className="correlator-evidence-btn"
                                    disabled={selectedForEvidence.size === 0}
                                    onClick={() => openSectionPicker("email")}
                                >
                                    <CheckSquare size={14} />
                                    <span>Enter {selectedForEvidence.size} Email{selectedForEvidence.size !== 1 ? "s" : ""} as Evidence</span>
                                </button>
                            </div>
                        </div>
                    ) : selectedEmail ? (
                        /* ── Single Email View ── */
                        <div className="correlator-detail">
                            <div className="correlator-detail-header">
                                <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem" }}>
                                    {selectedEmail.subject || "(no subject)"}
                                </h3>
                                <div className="correlator-detail-meta">
                                    <div><strong>From:</strong> {selectedEmail.sender || selectedEmail.account}</div>
                                    <div><strong>Date:</strong> {fmtDate(selectedEmail.date)}</div>
                                    <div><strong>Account:</strong> {selectedEmail.account}</div>

                                    {/* Player Badge */}
                                    {senderPlayer && (
                                        <Link href={`/players`} className="player-badge" style={{ marginTop: "0.5rem" }}>
                                            <div
                                                className="player-badge-avatar"
                                                style={{
                                                    background: "rgba(0, 242, 255, 0.12)",
                                                    border: "1px solid rgba(0, 242, 255, 0.25)",
                                                    color: "var(--accent-cyan)",
                                                }}
                                            >
                                                {senderPlayer.profile_type === "entity" ? (
                                                    <Briefcase size={12} />
                                                ) : (
                                                    getInitials(senderPlayer.display_name)
                                                )}
                                            </div>
                                            <div>
                                                <div className="player-badge-name">
                                                    <Users size={10} style={{ marginRight: 4, opacity: 0.6 }} />
                                                    {senderPlayer.display_name}
                                                </div>
                                                <div className="player-badge-title">
                                                    {senderPlayer.title}{senderPlayer.company ? ` · ${senderPlayer.company}` : ""}
                                                </div>
                                            </div>
                                        </Link>
                                    )}

                                    {/* Transcript Link */}
                                    {matchedTranscript && (
                                        <Link
                                            href={`/transcripts?open=${encodeURIComponent(matchedTranscript.slug)}`}
                                            className="correlator-transcript-link"
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "0.375rem",
                                                marginTop: "0.5rem",
                                                padding: "0.3rem 0.65rem",
                                                borderRadius: 8,
                                                background: "rgba(0, 245, 212, 0.08)",
                                                border: "1px solid rgba(0, 245, 212, 0.2)",
                                                color: "var(--accent-cyan)",
                                                fontSize: "0.7rem",
                                                fontWeight: 600,
                                                textDecoration: "none",
                                                transition: "all 0.15s ease",
                                            }}
                                        >
                                            <Headphones size={12} />
                                            Transcript: {matchedTranscript.title}
                                        </Link>
                                    )}
                                </div>

                                {showCorrelation && (
                                    <div className="correlator-link-badge">
                                        <ArrowRight size={12} />
                                        <span>
                                            {correlatedMsgs.length} iMessages near this time
                                            (closest: {timeDiff(selectedEmail.date, correlatedMsgs[0]?.date_utc)} away)
                                        </span>
                                    </div>
                                )}

                                {threadEmails.length > 1 && (
                                    <button
                                        onClick={() => setShowThread(true)}
                                        className="correlator-thread-toggle"
                                    >
                                        <Link2 size={13} />
                                        <span>View Full Thread ({threadEmails.length} emails)</span>
                                    </button>
                                )}
                            </div>
                            <div className="correlator-body">
                                <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "var(--font-body)", fontSize: "0.8125rem", lineHeight: 1.6 }}>
                                    {selectedEmail.body || "(no body)"}
                                </pre>
                            </div>
                        </div>
                    ) : (
                        <div className="correlator-empty">
                            <Mail size={32} style={{ color: "var(--text-muted)", marginBottom: "0.75rem" }} />
                            <p>Select an email to view details</p>
                            <p style={{ fontSize: "0.7rem" }}>iMessages will auto-correlate by timestamp</p>
                        </div>
                    )}
                </div>

                {/* ═══ RIGHT PANEL: iMessages ═══ */}
                <div className="correlator-panel">
                    <div className="correlator-panel-header">
                        <MessageSquare size={14} />
                        <span>{showCorrelation ? "Correlated iMessages" : "iMessages"}</span>
                        <span className="correlator-count">
                            {showCorrelation ? correlatedMsgs.length : imsgTotal.toLocaleString()}
                        </span>
                        {showCorrelation && (
                            <div style={{ marginLeft: "auto", display: "flex", gap: "4px", alignItems: "center" }}>
                                {selectedIMsgs.size > 0 && (
                                    <span style={{ fontSize: "0.6rem", color: "var(--accent-cyan)", marginRight: "2px" }}>
                                        {selectedIMsgs.size} sel
                                    </span>
                                )}
                                <button
                                    onClick={selectAllIMsgs}
                                    className="workbench-action-btn"
                                    title="Select all iMessages"
                                >
                                    <CheckSquare size={12} />
                                </button>
                                <button
                                    onClick={deselectAllIMsgs}
                                    className="workbench-action-btn"
                                    title="Deselect all"
                                >
                                    <Square size={12} />
                                </button>
                                <button
                                    onClick={reAnchor}
                                    className="workbench-action-btn correlator-reset-btn"
                                    title="Reset to email timestamp"
                                >
                                    <RotateCcw size={12} />
                                </button>
                                <button
                                    onClick={clearCorrelation}
                                    className="workbench-action-btn"
                                    title="Show all iMessages"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Search / Handle filter (only in browse mode) */}
                    {!showCorrelation && (
                        <>
                            <form onSubmit={handleImsgSearch} className="correlator-search">
                                <Search size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                                <input
                                    className="correlator-search-input"
                                    type="text"
                                    placeholder="Search messages..."
                                    value={imsgQuery}
                                    onChange={(e) => setImsgQuery(e.target.value)}
                                />
                            </form>
                            {handles.length > 1 && (
                                <div style={{ padding: "0 0.5rem 0.25rem" }}>
                                    <select
                                        className="input-glass"
                                        style={{ fontSize: "0.7rem", padding: "0.25rem 0.5rem" }}
                                        value={handleFilter}
                                        onChange={(e) => { setHandleFilter(e.target.value); setImsgPage(1); }}
                                    >
                                        <option value="">All handles</option>
                                        {handles.map((h) => (
                                            <option key={h.handle_id} value={h.handle_id}>
                                                {h.handle_id} ({h.cnt.toLocaleString()})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </>
                    )}

                    {/* iMessage list */}
                    <div className="correlator-list">
                        {isCorrelating && (
                            <div style={{ padding: "1rem", textAlign: "center", color: "var(--accent-cyan)" }}>
                                <Clock size={16} className="pulse-glow" />
                                <div style={{ fontSize: "0.7rem", marginTop: "0.5rem" }}>Correlating...</div>
                            </div>
                        )}

                        {(showCorrelation ? correlatedMsgs : iMessages).map((m, idx) => {
                            const isAnchor = showCorrelation && idx === 0;
                            const diff = selectedEmail ? timeDiff(selectedEmail.date, m.date_utc) : "";
                            const msgKey = `${m.guid || m.id}-${idx}`;
                            const isIMsgSelected = selectedIMsgs.has(msgKey);
                            return (
                                <div
                                    key={msgKey}
                                    ref={isAnchor ? anchorRef : undefined}
                                    className={`correlator-imsg-row ${m.is_from_me ? "sent" : "received"} ${isAnchor ? "anchor" : ""} ${isIMsgSelected ? "imsg-selected" : ""}`}
                                    onClick={() => toggleIMsgSelect(msgKey)}
                                    style={{ cursor: "pointer" }}
                                >
                                    {isIMsgSelected && (
                                        <div className="correlator-imsg-check">
                                            <CheckSquare size={12} style={{ color: "var(--accent-cyan)" }} />
                                        </div>
                                    )}
                                    <div className="correlator-imsg-bubble">
                                        <div className="correlator-imsg-text">{m.body}</div>
                                        <div className="correlator-imsg-meta">
                                            <span>{fmtDate(m.date_utc)}</span>
                                            {m.service && <span className="correlator-imsg-service">{m.service}</span>}
                                            {showCorrelation && (
                                                <span className="correlator-imsg-diff">Δ {diff}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="correlator-imsg-handle">
                                        <Smartphone size={10} />
                                        <span>{m.handle_id}</span>
                                        {m.device && <span style={{ opacity: 0.5 }}>· {m.device}</span>}
                                    </div>
                                </div>
                            );
                        })}

                        {!showCorrelation && iMessages.length === 0 && (
                            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                                No iMessages found
                            </div>
                        )}

                        {/* ─── Calendar Events ─── */}
                        {showCorrelation && calendarEvents.length > 0 && (
                            <div className="correlator-cal-section">
                                <button
                                    className="correlator-cal-header"
                                    onClick={() => setShowCalendar(!showCalendar)}
                                >
                                    <CalendarDays size={13} />
                                    <span>Calendar Events</span>
                                    <span className="correlator-count">{calendarEvents.length}</span>
                                    <span style={{ marginLeft: "auto" }}>
                                        {showCalendar ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    </span>
                                </button>
                                {showCalendar && (
                                    <div className="correlator-cal-list">
                                        {calendarEvents.map((ev) => {
                                            const deltaDays = ev.delta_days != null ? Math.round(ev.delta_days) : null;
                                            const deltaLabel = deltaDays != null
                                                ? deltaDays === 0 ? "same day" : `${deltaDays}d`
                                                : "";
                                            return (
                                                <div key={ev.id} className="correlator-cal-item">
                                                    <CalendarDays size={12} style={{ color: "var(--accent-purple)", flexShrink: 0, marginTop: 2 }} />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div className="correlator-cal-title">{ev.summary}</div>
                                                        <div className="correlator-cal-meta">
                                                            <span>{fmtDate(ev.start_dt)}</span>
                                                            {ev.duration_min != null && ev.duration_min > 0 && (
                                                                <span>{ev.duration_min < 60 ? `${ev.duration_min}m` : `${Math.round(ev.duration_min / 60)}h`}</span>
                                                            )}
                                                            {deltaLabel && (
                                                                <span className="correlator-imsg-diff">Δ {deltaLabel}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Pagination (browse mode only) */}
                    {!showCorrelation && (
                        <div className="correlator-pagination">
                            <button
                                onClick={() => setImsgPage((p) => Math.max(1, p - 1))}
                                disabled={imsgPage <= 1}
                                className="workbench-action-btn"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                                {imsgPage} / {imsgPages}
                            </span>
                            <button
                                onClick={() => setImsgPage((p) => Math.min(imsgPages, p + 1))}
                                disabled={imsgPage >= imsgPages}
                                className="workbench-action-btn"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ Section Picker Modal ═══ */}
            {sectionPickerOpen && (
                <>
                    <div className="workbench-overlay" onClick={() => setSectionPickerOpen(false)} />
                    <div className="workbench-modal">
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                            <h3 style={{ margin: 0, fontSize: "1rem" }}>
                                Assign {sectionPickerMode === "email"
                                    ? `${selectedForEvidence.size} Email${selectedForEvidence.size !== 1 ? "s" : ""}`
                                    : `${selectedIMsgs.size} iMessage${selectedIMsgs.size !== 1 ? "s" : ""}`
                                } to Section
                            </h3>
                            <button
                                onClick={() => setSectionPickerOpen(false)}
                                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        {assigningEvidence ? (
                            <div style={{ padding: "2rem", textAlign: "center", color: "var(--accent-cyan)" }}>
                                <Loader2 size={20} className="spin" />
                                <div style={{ fontSize: "0.8125rem", marginTop: "0.75rem" }}>Assigning evidence…</div>
                            </div>
                        ) : (
                            <div className="workbench-assign-sections">
                                {availableSections.map(sec => (
                                    <div
                                        key={sec.name}
                                        className="workbench-assign-option"
                                        onClick={() => handleAssignToSection(sec.name)}
                                    >
                                        <FolderOpen size={14} color="var(--accent-cyan)" />
                                        <span>{sec.name.replace(/_/g, " ").replace(/^\d+\s/, "")}</span>
                                        <span style={{ marginLeft: "auto", fontSize: "0.65rem", color: "var(--text-muted)" }}>
                                            {sec.totalItems} items
                                        </span>
                                        <ChevronRight size={14} style={{ opacity: 0.4 }} />
                                    </div>
                                ))}
                                {availableSections.length === 0 && (
                                    <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                                        <Loader2 size={16} className="spin" style={{ marginBottom: "0.5rem" }} /><br />
                                        Loading sections…
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ═══ Toast ═══ */}
            {toastMsg && (
                <div style={{
                    position: "fixed",
                    bottom: "2rem",
                    right: "2rem",
                    background: toastMsg.error ? "#fef2f2" : "#f0fdf4",
                    color: toastMsg.error ? "#991b1b" : "#166534",
                    border: `1px solid ${toastMsg.error ? "#f87171" : "#86efac"}`,
                    padding: "1rem 1.5rem",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    zIndex: 9999,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontWeight: 500,
                    fontSize: "0.875rem"
                }}>
                    <span>{toastMsg.title}</span>
                </div>
            )}
        </div>
    );
}
