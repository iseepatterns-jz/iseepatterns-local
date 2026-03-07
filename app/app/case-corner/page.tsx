"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Target, Shield, Users, FileText, MessageSquare, Plus, X, ChevronRight,
    AlertTriangle, CheckCircle2, Search, Clock, Send, FolderOpen,
    Building2, ExternalLink, Loader2, Trash2, UserPlus, LinkIcon, Mail, Smartphone, Eye,
    Brain, Download, Sparkles
} from "lucide-react";

/* ═══════════════════ TYPES ═══════════════════ */

interface Claim {
    id: number; slug: string; title: string; category: string;
    legal_elements: string; description: string; status: string;
    severity: string; sort_order: number; playerCount: number; evidenceCount: number;
}
interface ClaimPlayer {
    id: number; claim_id: number; player_slug: string; player_name: string;
    role: string; notes: string | null;
}
interface ClaimEvidence {
    id: number; claim_id: number; evidence_id: string; evidence_type: string;
    relevance: string | null;
}
interface ClaimNote {
    id: number; claim_id: number; role: string; content: string; created_at: string;
}
interface Agency {
    id: number; slug: string; title: string; agency_type: string;
    contact_info: string; submission_method: string; status: string;
    notes: string | null; claimCount: number;
}
interface LinkedClaim {
    claim_title: string; claim_slug: string; claim_status: string;
    severity: string; priority: string;
}
interface PlayerOption {
    id: number; slug: string; display_name: string; title: string; company: string;
}
interface WorkbenchItem {
    id: string; type: "email" | "text" | "transcript";
    title: string; subtitle: string; date: string;
    preview: string; source: string;
}

/* ═══════════════════ HELPERS ═══════════════════ */

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
    new: { bg: "rgba(148,163,184,0.12)", text: "#94a3b8", dot: "#94a3b8" },
    researching: { bg: "rgba(59,130,246,0.12)", text: "#60a5fa", dot: "#3b82f6" },
    established: { bg: "rgba(234,179,8,0.12)", text: "#fbbf24", dot: "#eab308" },
    ready: { bg: "rgba(34,197,94,0.12)", text: "#4ade80", dot: "#22c55e" },
    draft: { bg: "rgba(148,163,184,0.12)", text: "#94a3b8", dot: "#94a3b8" },
    in_progress: { bg: "rgba(59,130,246,0.12)", text: "#60a5fa", dot: "#3b82f6" },
    submitted: { bg: "rgba(234,179,8,0.12)", text: "#fbbf24", dot: "#eab308" },
    acknowledged: { bg: "rgba(34,197,94,0.12)", text: "#4ade80", dot: "#22c55e" },
    investigating: { bg: "rgba(168,85,247,0.12)", text: "#c084fc", dot: "#a855f7" },
};

const SEVERITY_BADGES: Record<string, { color: string; label: string }> = {
    felony: { color: "var(--accent-red)", label: "FELONY" },
    misdemeanor: { color: "var(--accent-orange)", label: "MISDEMEANOR" },
    civil: { color: "var(--accent-cyan)", label: "CIVIL" },
    regulatory: { color: "var(--accent-purple)", label: "REGULATORY" },
};

const ROLE_COLORS: Record<string, string> = {
    defendant: "var(--accent-red)",
    "co-conspirator": "var(--accent-orange)",
    witness: "var(--accent-cyan)",
    victim: "var(--accent-emerald)",
    accomplice: "var(--accent-purple)",
};

export default function CaseCornerPage() {
    // ─── View toggle ───
    const [activeView, setActiveView] = useState<"claims" | "next-steps">("claims");

    // ─── Claims state ───
    const [claims, setClaims] = useState<Claim[]>([]);
    const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
    const [claimPlayers, setClaimPlayers] = useState<ClaimPlayer[]>([]);
    const [claimEvidence, setClaimEvidence] = useState<ClaimEvidence[]>([]);
    const [claimNotes, setClaimNotes] = useState<ClaimNote[]>([]);
    const [claimTab, setClaimTab] = useState<"elements" | "evidence" | "players" | "notes">("elements");
    const [claimLoading, setClaimLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);

    // ─── Agencies state ───
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
    const [agencyLinkedClaims, setAgencyLinkedClaims] = useState<LinkedClaim[]>([]);
    const [agencyLoading, setAgencyLoading] = useState(true);
    const [agencyDetailLoading, setAgencyDetailLoading] = useState(false);

    // ─── Shared ───
    const [noteInput, setNoteInput] = useState("");
    const [playerSearch, setPlayerSearch] = useState("");
    const [playerResults, setPlayerResults] = useState<PlayerOption[]>([]);
    const [searchingPlayers, setSearchingPlayers] = useState(false);
    const [toastMsg, setToastMsg] = useState<{ msg: string; error?: boolean } | null>(null);

    // ─── AI State ───
    const [aiLoading, setAiLoading] = useState<string | null>(null); // tracks which action is loading
    const [exportLoading, setExportLoading] = useState(false);

    // ─── Evidence Preview Drawer ───
    const [previewEv, setPreviewEv] = useState<ClaimEvidence | null>(null);
    const [previewHtml, setPreviewHtml] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    const openEvidencePreview = async (ev: ClaimEvidence) => {
        setPreviewEv(ev);
        setPreviewHtml(null);
        setPreviewLoading(true);
        try {
            const res = await fetch(`/api/workbench/preview?type=${ev.evidence_type}&id=${encodeURIComponent(ev.evidence_id)}`);
            if (res.ok) {
                const data = await res.json();
                setPreviewHtml(data.html || null);
            } else {
                setPreviewHtml(null);
            }
        } catch {
            setPreviewHtml(null);
        } finally {
            setPreviewLoading(false);
        }
    };

    // ─── Add Claim modal ───
    const [showAddClaim, setShowAddClaim] = useState(false);
    const [newClaimTitle, setNewClaimTitle] = useState("");
    const [newClaimCategory, setNewClaimCategory] = useState("criminal");

    // ─── Link Claim to Agency modal ───
    const [showLinkClaim, setShowLinkClaim] = useState(false);

    // ─── Link Evidence modal ───
    const [showLinkEvidence, setShowLinkEvidence] = useState(false);
    const [workbenchItems, setWorkbenchItems] = useState<WorkbenchItem[]>([]);
    const [wbLoading, setWbLoading] = useState(false);
    const [evidenceRelevance, setEvidenceRelevance] = useState("");

    const showToast = (msg: string, error = false) => {
        setToastMsg({ msg, error });
        setTimeout(() => setToastMsg(null), 3500);
    };

    /* ═══════════════════ DATA FETCHING ═══════════════════ */

    const fetchClaims = useCallback(async () => {
        setClaimLoading(true);
        try {
            const r = await fetch("/api/case-corner/claims");
            const d = await r.json();
            setClaims(d.claims || []);
        } catch { /* */ }
        setClaimLoading(false);
    }, []);

    const fetchAgencies = useCallback(async () => {
        setAgencyLoading(true);
        try {
            const r = await fetch("/api/case-corner/agencies");
            const d = await r.json();
            setAgencies(d.agencies || []);
        } catch { /* */ }
        setAgencyLoading(false);
    }, []);

    useEffect(() => { fetchClaims(); fetchAgencies(); }, [fetchClaims, fetchAgencies]);

    const selectClaim = async (claim: Claim) => {
        setSelectedClaim(claim);
        setDetailLoading(true);
        setClaimTab("elements");
        try {
            const r = await fetch(`/api/case-corner/claims/${claim.slug}`);
            const d = await r.json();
            setClaimPlayers(d.players || []);
            setClaimEvidence(d.evidence || []);
            setClaimNotes(d.notes || []);
        } catch { /* */ }
        setDetailLoading(false);
    };

    const selectAgency = async (agency: Agency) => {
        setSelectedAgency(agency);
        setAgencyDetailLoading(true);
        try {
            const r = await fetch(`/api/case-corner/agencies/${agency.slug}`);
            const d = await r.json();
            setAgencyLinkedClaims(d.linkedClaims || []);
        } catch { /* */ }
        setAgencyDetailLoading(false);
    };

    /* ═══════════════════ ACTIONS ═══════════════════ */

    const updateClaimStatus = async (slug: string, status: string) => {
        await fetch(`/api/case-corner/claims/${slug}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        fetchClaims();
        if (selectedClaim?.slug === slug) setSelectedClaim({ ...selectedClaim, status });
    };

    const addNote = async () => {
        if (!noteInput.trim() || !selectedClaim) return;
        await fetch(`/api/case-corner/claims/${selectedClaim.slug}/notes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: noteInput, role: "user" }),
        });
        setNoteInput("");
        // Refetch notes
        const r = await fetch(`/api/case-corner/claims/${selectedClaim.slug}/notes`);
        const d = await r.json();
        setClaimNotes(d.notes || []);
    };

    const searchPlayers = async (q: string) => {
        setPlayerSearch(q);
        if (q.length < 2) { setPlayerResults([]); return; }
        setSearchingPlayers(true);
        try {
            const r = await fetch(`/api/players?q=${encodeURIComponent(q)}&limit=8`);
            const d = await r.json();
            setPlayerResults(d.players || []);
        } catch { /* */ }
        setSearchingPlayers(false);
    };

    const assignPlayer = async (player: PlayerOption, role: string) => {
        if (!selectedClaim) return;
        await fetch(`/api/case-corner/claims/${selectedClaim.slug}/players`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ player_slug: player.slug, player_name: player.display_name, role }),
        });
        showToast(`✅ ${player.display_name} assigned as ${role}`);
        setPlayerSearch("");
        setPlayerResults([]);
        const r = await fetch(`/api/case-corner/claims/${selectedClaim.slug}/players`);
        const d = await r.json();
        setClaimPlayers(d.players || []);
        fetchClaims();
    };

    const removePlayer = async (playerSlug: string) => {
        if (!selectedClaim) return;
        await fetch(`/api/case-corner/claims/${selectedClaim.slug}/players`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ player_slug: playerSlug }),
        });
        setClaimPlayers(prev => prev.filter(p => p.player_slug !== playerSlug));
        fetchClaims();
    };

    const addClaim = async () => {
        if (!newClaimTitle.trim()) return;
        const slug = newClaimTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        await fetch("/api/case-corner/claims", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug, title: newClaimTitle, category: newClaimCategory }),
        });
        setNewClaimTitle("");
        setShowAddClaim(false);
        fetchClaims();
        showToast(`✅ Claim "${newClaimTitle}" created`);
    };

    const linkClaimToAgency = async (claimSlug: string) => {
        if (!selectedAgency) return;
        await fetch(`/api/case-corner/agencies/${selectedAgency.slug}/claims`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ claim_slug: claimSlug }),
        });
        showToast("✅ Claim linked");
        setShowLinkClaim(false);
        selectAgency(selectedAgency);
        fetchAgencies();
    };

    const unlinkClaimFromAgency = async (claimSlug: string) => {
        if (!selectedAgency) return;
        await fetch(`/api/case-corner/agencies/${selectedAgency.slug}/claims`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ claim_slug: claimSlug }),
        });
        selectAgency(selectedAgency);
        fetchAgencies();
    };

    const updateAgencyStatus = async (slug: string, status: string) => {
        await fetch(`/api/case-corner/agencies/${slug}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        fetchAgencies();
        if (selectedAgency?.slug === slug) setSelectedAgency({ ...selectedAgency, status });
    };

    /* ─── Evidence Linking ─── */

    const openLinkEvidence = async () => {
        setShowLinkEvidence(true);
        setWbLoading(true);
        setEvidenceRelevance("");
        try {
            const r = await fetch("/api/workbench/evidence?type=email&limit=100");
            const d = await r.json();
            // Exclude already-linked
            const linkedIds = new Set(claimEvidence.map(e => `${e.evidence_id}:${e.evidence_type}`));
            setWorkbenchItems((d.items || []).filter((e: WorkbenchItem) => !linkedIds.has(`${e.id}:${e.type}`)));
        } catch { setWorkbenchItems([]); }
        setWbLoading(false);
    };

    const linkEvidence = async (item: WorkbenchItem) => {
        if (!selectedClaim) return;
        await fetch(`/api/case-corner/claims/${selectedClaim.slug}/evidence`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                evidence_id: item.id,
                evidence_type: item.type,
                relevance: evidenceRelevance || item.title,
            }),
        });
        showToast(`✅ Evidence linked to ${selectedClaim.title}`);
        setEvidenceRelevance("");
        // Refetch
        const r = await fetch(`/api/case-corner/claims/${selectedClaim.slug}/evidence`);
        const d = await r.json();
        setClaimEvidence(d.evidence || []);
        // Remove from picker
        setWorkbenchItems(prev => prev.filter(w => !(w.id === item.id && w.type === item.type)));
        fetchClaims();
    };

    const unlinkEvidence = async (evidenceId: string, evidenceType: string) => {
        if (!selectedClaim) return;
        await fetch(`/api/case-corner/claims/${selectedClaim.slug}/evidence`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ evidence_id: evidenceId, evidence_type: evidenceType }),
        });
        setClaimEvidence(prev => prev.filter(e => !(e.evidence_id === evidenceId && e.evidence_type === evidenceType)));
        fetchClaims();
    };

    /* ═══════════════════ AI ACTIONS ═══════════════════ */

    const aiAnalyze = async (ev: ClaimEvidence) => {
        if (!selectedClaim) return;
        setAiLoading(`analyze-${ev.evidence_id}`);
        try {
            const res = await fetch("/api/ai/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    evidenceId: ev.evidence_id,
                    evidenceType: ev.evidence_type,
                    claimSlug: selectedClaim.slug,
                }),
            });
            if (res.ok) {
                showToast("✅ AI analysis complete — check Notes tab");
                // Refresh notes
                const r = await fetch(`/api/case-corner/claims/${selectedClaim.slug}/notes`);
                const d = await r.json();
                setClaimNotes(d.notes || []);
            } else {
                const err = await res.json();
                showToast(`❌ ${err.error || "Analysis failed"}`, true);
            }
        } catch { showToast("❌ AI analysis failed — check Bedrock credentials", true); }
        setAiLoading(null);
    };

    const aiSummarize = async () => {
        if (!selectedClaim) return;
        setAiLoading("summarize");
        try {
            const res = await fetch("/api/ai/summarize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ claimSlug: selectedClaim.slug }),
            });
            if (res.ok) {
                showToast("✅ AI summary generated — check Notes tab");
                const r = await fetch(`/api/case-corner/claims/${selectedClaim.slug}/notes`);
                const d = await r.json();
                setClaimNotes(d.notes || []);
                setClaimTab("notes");
            } else {
                const err = await res.json();
                showToast(`❌ ${err.error || "Summarization failed"}`, true);
            }
        } catch { showToast("❌ AI summarization failed", true); }
        setAiLoading(null);
    };

    const exportClaimPdf = async () => {
        if (!selectedClaim) return;
        setExportLoading(true);
        try {
            const res = await fetch("/api/export/pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "claim", id: selectedClaim.slug }),
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `claim-${selectedClaim.slug}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
                showToast("📄 PDF downloaded");
            } else {
                showToast("❌ PDF export failed", true);
            }
        } catch { showToast("❌ PDF export failed", true); }
        setExportLoading(false);
    };

    /* ═══════════════════ PARSED ELEMENTS ═══════════════════ */

    const legalElements: string[] = selectedClaim?.legal_elements
        ? (() => { try { return JSON.parse(selectedClaim.legal_elements); } catch { return []; } })()
        : [];

    /* ═══════════════════ RENDER ═══════════════════ */

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
            {/* ─── Top Bar ─── */}
            <div style={{
                padding: "1rem 1.5rem",
                borderBottom: "1px solid var(--border-glass)",
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                flexShrink: 0,
            }}>
                <Target size={22} color="var(--accent-red)" />
                <h2 style={{ margin: 0, fontSize: "1.25rem", fontFamily: "var(--font-heading)" }}>Case Corner</h2>

                {/* View Toggle */}
                <div style={{
                    display: "flex",
                    background: "var(--bg-glass)",
                    borderRadius: 8,
                    border: "var(--glass-border)",
                    marginLeft: "1rem",
                    overflow: "hidden",
                }}>
                    {[
                        { key: "claims" as const, label: "Claims", icon: Shield },
                        { key: "next-steps" as const, label: "Next Steps", icon: Building2 },
                    ].map(v => (
                        <button
                            key={v.key}
                            onClick={() => setActiveView(v.key)}
                            style={{
                                padding: "0.5rem 1rem",
                                fontSize: "0.8125rem",
                                fontWeight: 600,
                                background: activeView === v.key ? "rgba(0,242,255,0.12)" : "transparent",
                                color: activeView === v.key ? "var(--accent-cyan)" : "var(--text-secondary)",
                                border: "none",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                transition: "all 0.2s",
                            }}
                        >
                            <v.icon size={14} />
                            {v.label}
                        </button>
                    ))}
                </div>

                {/* Stats */}
                <div style={{ marginLeft: "auto", display: "flex", gap: "1.5rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    <span><strong style={{ color: "var(--accent-red)" }}>{claims.length}</strong> claims</span>
                    <span><strong style={{ color: "var(--accent-cyan)" }}>{claims.filter(c => c.status === "established" || c.status === "ready").length}</strong> established</span>
                    <span><strong style={{ color: "var(--accent-emerald)" }}>{agencies.length}</strong> agencies</span>
                </div>
            </div>

            {/* ─── Main Content ─── */}
            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

                {/* ═══════ CLAIMS VIEW ═══════ */}
                {activeView === "claims" && (
                    <>
                        {/* Left: Claim List */}
                        <div className="glass-panel" style={{
                            width: 320, flexShrink: 0, display: "flex", flexDirection: "column",
                            borderRadius: 0, borderRight: "1px solid var(--border-glass)", borderTop: "none",
                        }}>
                            <div style={{ padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1px solid var(--border-glass)" }}>
                                <Shield size={14} color="var(--accent-cyan)" />
                                <span style={{ fontWeight: 700, fontSize: "0.8125rem" }}>Active Claims</span>
                                <button
                                    onClick={() => setShowAddClaim(true)}
                                    style={{
                                        marginLeft: "auto", background: "rgba(0,242,255,0.08)",
                                        border: "1px solid rgba(0,242,255,0.25)", borderRadius: 6,
                                        padding: "4px 8px", cursor: "pointer", display: "flex",
                                        alignItems: "center", gap: 4, color: "var(--accent-cyan)", fontSize: "0.7rem",
                                    }}
                                >
                                    <Plus size={12} /> Add
                                </button>
                            </div>
                            <div style={{ flex: 1, overflowY: "auto" }}>
                                {claimLoading ? (
                                    <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>Loading…</div>
                                ) : claims.map(claim => {
                                    const sc = STATUS_COLORS[claim.status] || STATUS_COLORS.new;
                                    const sv = SEVERITY_BADGES[claim.severity] || SEVERITY_BADGES.felony;
                                    const isActive = selectedClaim?.slug === claim.slug;
                                    return (
                                        <div
                                            key={claim.slug}
                                            onClick={() => selectClaim(claim)}
                                            style={{
                                                padding: "0.75rem 1rem",
                                                borderBottom: "1px solid rgba(255,255,255,0.03)",
                                                cursor: "pointer",
                                                background: isActive ? "rgba(0,245,212,0.06)" : "transparent",
                                                borderLeft: isActive ? "3px solid var(--accent-cyan)" : "3px solid transparent",
                                                transition: "all 0.15s",
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                                                <span style={{
                                                    fontSize: "0.575rem", fontWeight: 700, textTransform: "uppercase",
                                                    letterSpacing: "0.08em",
                                                    color: sv.color, padding: "1px 5px",
                                                    background: `${sv.color}18`, borderRadius: 3,
                                                }}>{sv.label}</span>
                                                <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-primary)" }}>{claim.title}</span>
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                                                <span style={{
                                                    display: "inline-flex", alignItems: "center", gap: 4,
                                                    background: sc.bg, color: sc.text, padding: "1px 6px",
                                                    borderRadius: 4, fontWeight: 600, fontSize: "0.625rem",
                                                    textTransform: "uppercase",
                                                }}>
                                                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: sc.dot }} />
                                                    {claim.status.replace("_", " ")}
                                                </span>
                                                <span><Users size={10} /> {claim.playerCount}</span>
                                                <span><FileText size={10} /> {claim.evidenceCount}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Center: Claim Detail */}
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                            {!selectedClaim ? (
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", flexDirection: "column", gap: "0.75rem" }}>
                                    <Target size={40} style={{ opacity: 0.15 }} />
                                    <span style={{ fontSize: "0.875rem" }}>Select a claim to review</span>
                                </div>
                            ) : detailLoading ? (
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--accent-cyan)" }}>
                                    <Loader2 size={20} className="spin" />
                                </div>
                            ) : (
                                <>
                                    {/* Claim Header */}
                                    <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid var(--border-glass)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: "1.125rem" }}>{selectedClaim.title}</h3>
                                            <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>{selectedClaim.description}</p>
                                        </div>
                                        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", alignItems: "center" }}>
                                            {(["new", "researching", "established", "ready"] as const).map(s => {
                                                const sc = STATUS_COLORS[s];
                                                return (
                                                    <button key={s} onClick={() => updateClaimStatus(selectedClaim.slug, s)} style={{
                                                        padding: "4px 10px", fontSize: "0.65rem", fontWeight: 600,
                                                        textTransform: "uppercase", borderRadius: 6, cursor: "pointer",
                                                        border: selectedClaim.status === s ? `1px solid ${sc.dot}` : "1px solid transparent",
                                                        background: selectedClaim.status === s ? sc.bg : "rgba(255,255,255,0.03)",
                                                        color: selectedClaim.status === s ? sc.text : "var(--text-muted)",
                                                        transition: "all 0.15s",
                                                    }}>{s.replace("_", " ")}</button>
                                                );
                                            })}
                                            <div style={{ width: 1, height: 20, background: "var(--border-glass)", margin: "0 2px" }} />
                                            <button onClick={aiSummarize} disabled={aiLoading === "summarize"} style={{
                                                padding: "4px 10px", fontSize: "0.65rem", fontWeight: 600,
                                                borderRadius: 6, cursor: aiLoading === "summarize" ? "wait" : "pointer",
                                                background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.3)",
                                                color: "#c084fc", display: "flex", alignItems: "center", gap: 4,
                                                opacity: aiLoading === "summarize" ? 0.6 : 1,
                                            }}>
                                                {aiLoading === "summarize" ? <Loader2 size={11} className="spin" /> : <Brain size={11} />}
                                                AI Summary
                                            </button>
                                            <button onClick={exportClaimPdf} disabled={exportLoading} style={{
                                                padding: "4px 10px", fontSize: "0.65rem", fontWeight: 600,
                                                borderRadius: 6, cursor: exportLoading ? "wait" : "pointer",
                                                background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)",
                                                color: "#4ade80", display: "flex", alignItems: "center", gap: 4,
                                                opacity: exportLoading ? 0.6 : 1,
                                            }}>
                                                {exportLoading ? <Loader2 size={11} className="spin" /> : <Download size={11} />}
                                                Export PDF
                                            </button>
                                        </div>
                                    </div>

                                    {/* Tabs */}
                                    <div style={{ display: "flex", borderBottom: "1px solid var(--border-glass)", flexShrink: 0 }}>
                                        {[
                                            { key: "elements" as const, label: "Elements", icon: CheckCircle2 },
                                            { key: "players" as const, label: `Players (${claimPlayers.length})`, icon: Users },
                                            { key: "evidence" as const, label: `Evidence (${claimEvidence.length})`, icon: FileText },
                                            { key: "notes" as const, label: `Notes (${claimNotes.length})`, icon: MessageSquare },
                                        ].map(t => (
                                            <button key={t.key} onClick={() => setClaimTab(t.key)} style={{
                                                padding: "0.625rem 1rem", fontSize: "0.75rem", fontWeight: 600,
                                                background: "none", border: "none", cursor: "pointer",
                                                color: claimTab === t.key ? "var(--accent-cyan)" : "var(--text-secondary)",
                                                borderBottom: claimTab === t.key ? "2px solid var(--accent-cyan)" : "2px solid transparent",
                                                display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s",
                                            }}>
                                                <t.icon size={14} /> {t.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Tab Content */}
                                    <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.5rem" }}>

                                        {/* ─── Elements Tab ─── */}
                                        {claimTab === "elements" && (
                                            <div>
                                                <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                                                    Legal Elements Required to Prove
                                                </h4>
                                                {legalElements.map((el, i) => (
                                                    <div key={i} style={{
                                                        display: "flex", alignItems: "flex-start", gap: "0.75rem",
                                                        padding: "0.625rem 0.75rem", marginBottom: "0.375rem",
                                                        background: "rgba(255,255,255,0.02)", borderRadius: 8,
                                                        border: "1px solid rgba(255,255,255,0.04)",
                                                    }}>
                                                        <div style={{
                                                            width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                                                            border: "1.5px solid rgba(255,255,255,0.15)",
                                                            display: "flex", alignItems: "center", justifyContent: "center",
                                                            fontSize: "0.65rem", color: "var(--text-muted)", marginTop: 1,
                                                        }}>{i + 1}</div>
                                                        <span style={{ fontSize: "0.8125rem", color: "var(--text-primary)", lineHeight: 1.5 }}>{el}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* ─── Players Tab (Rap Sheet) ─── */}
                                        {claimTab === "players" && (
                                            <div>
                                                {/* Search to add */}
                                                <div style={{ marginBottom: "1rem" }}>
                                                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
                                                        <div style={{
                                                            flex: 1, display: "flex", alignItems: "center", gap: "0.5rem",
                                                            background: "var(--bg-glass)", border: "var(--glass-border)",
                                                            borderRadius: 8, padding: "0.5rem 0.75rem",
                                                        }}>
                                                            <Search size={14} color="var(--text-muted)" />
                                                            <input
                                                                value={playerSearch}
                                                                onChange={e => searchPlayers(e.target.value)}
                                                                placeholder="Search players to assign…"
                                                                style={{
                                                                    background: "none", border: "none", outline: "none",
                                                                    color: "var(--text-primary)", fontSize: "0.8125rem", width: "100%",
                                                                }}
                                                            />
                                                            {searchingPlayers && <Loader2 size={14} className="spin" />}
                                                        </div>
                                                    </div>
                                                    {playerResults.length > 0 && (
                                                        <div className="glass-panel" style={{ padding: "0.25rem", marginBottom: "0.5rem" }}>
                                                            {playerResults.map(p => (
                                                                <div key={p.slug} style={{
                                                                    display: "flex", alignItems: "center", padding: "0.5rem 0.75rem",
                                                                    gap: "0.5rem", borderRadius: 6, cursor: "pointer",
                                                                }} onMouseOver={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                                                                    onMouseOut={e => (e.currentTarget.style.background = "transparent")}>
                                                                    <div>
                                                                        <div style={{ fontSize: "0.8125rem", fontWeight: 600 }}>{p.display_name}</div>
                                                                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{p.title}{p.company ? ` · ${p.company}` : ""}</div>
                                                                    </div>
                                                                    <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                                                                        {["defendant", "co-conspirator", "witness"].map(role => (
                                                                            <button key={role} onClick={() => assignPlayer(p, role)} style={{
                                                                                padding: "2px 8px", fontSize: "0.6rem", fontWeight: 600,
                                                                                borderRadius: 4, cursor: "pointer",
                                                                                background: `${ROLE_COLORS[role]}18`,
                                                                                color: ROLE_COLORS[role],
                                                                                border: `1px solid ${ROLE_COLORS[role]}40`,
                                                                                textTransform: "uppercase",
                                                                            }}>{role.replace("co-conspirator", "co-consp")}</button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Assigned players (Rap Sheet) */}
                                                <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                                                    <UserPlus size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
                                                    Assigned Players
                                                </h4>
                                                {claimPlayers.length === 0 && (
                                                    <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                                                        No players assigned yet. Search above to add.
                                                    </div>
                                                )}
                                                {claimPlayers.map(cp => (
                                                    <div key={cp.player_slug} style={{
                                                        display: "flex", alignItems: "center", gap: "0.75rem",
                                                        padding: "0.75rem 1rem", marginBottom: "0.375rem",
                                                        background: "rgba(255,255,255,0.02)", borderRadius: 8,
                                                        border: "1px solid rgba(255,255,255,0.04)",
                                                    }}>
                                                        <div style={{
                                                            width: 32, height: 32, borderRadius: 8,
                                                            background: `${ROLE_COLORS[cp.role] || "var(--accent-cyan)"}18`,
                                                            border: `1px solid ${ROLE_COLORS[cp.role] || "var(--accent-cyan)"}40`,
                                                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                                                        }}>
                                                            <Users size={14} color={ROLE_COLORS[cp.role] || "var(--accent-cyan)"} />
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontSize: "0.8125rem", fontWeight: 600 }}>{cp.player_name}</div>
                                                            <span style={{
                                                                fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase",
                                                                color: ROLE_COLORS[cp.role] || "var(--text-muted)",
                                                                letterSpacing: "0.06em",
                                                            }}>{cp.role}</span>
                                                        </div>
                                                        <button onClick={() => removePlayer(cp.player_slug)} style={{
                                                            background: "none", border: "none", cursor: "pointer",
                                                            color: "var(--text-muted)", padding: 4, opacity: 0.5,
                                                        }}><Trash2 size={14} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* ─── Evidence Tab ─── */}
                                        {claimTab === "evidence" && (
                                            <div>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                                                    <h4 style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                                                        <LinkIcon size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
                                                        Linked Evidence
                                                    </h4>
                                                    <button onClick={openLinkEvidence} style={{
                                                        background: "rgba(0,242,255,0.08)", border: "1px solid rgba(0,242,255,0.25)",
                                                        borderRadius: 6, padding: "4px 10px", cursor: "pointer",
                                                        display: "flex", alignItems: "center", gap: 4,
                                                        color: "var(--accent-cyan)", fontSize: "0.7rem", fontWeight: 600,
                                                    }}><Plus size={12} /> Link Evidence</button>
                                                </div>
                                                {claimEvidence.length === 0 ? (
                                                    <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                                                        <FolderOpen size={24} style={{ opacity: 0.2, marginBottom: 8 }} />
                                                        <br />No evidence linked yet. Click &quot;Link Evidence&quot; to pull from the Workbench.
                                                    </div>
                                                ) : claimEvidence.map(ev => {
                                                    const typeIcon = ev.evidence_type === "email" ? <Mail size={14} color="var(--accent-cyan)" />
                                                        : ev.evidence_type === "text" ? <Smartphone size={14} color="var(--accent-emerald)" />
                                                            : <FileText size={14} color="var(--accent-purple)" />;
                                                    return (
                                                        <div key={`${ev.evidence_id}-${ev.evidence_type}`} style={{
                                                            padding: "0.625rem 0.75rem", marginBottom: "0.375rem",
                                                            background: previewEv?.id === ev.id ? "rgba(0,242,255,0.06)" : "rgba(255,255,255,0.02)",
                                                            borderRadius: 8,
                                                            border: previewEv?.id === ev.id ? "1px solid rgba(0,242,255,0.3)" : "1px solid rgba(255,255,255,0.04)",
                                                            display: "flex", alignItems: "flex-start", gap: "0.75rem",
                                                            cursor: "default",
                                                            transition: "all 0.15s",
                                                        }}>
                                                            <div style={{ marginTop: 2, flexShrink: 0 }}>{typeIcon}</div>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ fontSize: "0.8125rem", fontWeight: 600, fontFamily: "var(--font-mono)", marginBottom: 2 }}>{ev.evidence_id}</div>
                                                                {ev.relevance && (
                                                                    <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                                                                        {ev.relevance}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div style={{ display: "flex", gap: 4, flexShrink: 0, alignItems: "center" }}>
                                                                <button
                                                                    onClick={() => openEvidencePreview(ev)}
                                                                    title="Preview evidence"
                                                                    style={{
                                                                        background: previewEv?.id === ev.id ? "rgba(0,242,255,0.15)" : "rgba(0,242,255,0.08)",
                                                                        border: "1px solid rgba(0,242,255,0.25)",
                                                                        borderRadius: 5, padding: "3px 8px", cursor: "pointer",
                                                                        color: "var(--accent-cyan)", fontSize: "0.68rem",
                                                                        fontWeight: 600, display: "flex", alignItems: "center", gap: 3,
                                                                    }}
                                                                >
                                                                    <Eye size={11} /> Preview
                                                                </button>
                                                                <button
                                                                    onClick={() => aiAnalyze(ev)}
                                                                    disabled={aiLoading === `analyze-${ev.evidence_id}`}
                                                                    title="AI Analyze this evidence against the claim"
                                                                    style={{
                                                                        background: "rgba(168,85,247,0.08)",
                                                                        border: "1px solid rgba(168,85,247,0.25)",
                                                                        borderRadius: 5, padding: "3px 8px", cursor: aiLoading === `analyze-${ev.evidence_id}` ? "wait" : "pointer",
                                                                        color: "#c084fc", fontSize: "0.68rem",
                                                                        fontWeight: 600, display: "flex", alignItems: "center", gap: 3,
                                                                        opacity: aiLoading === `analyze-${ev.evidence_id}` ? 0.6 : 1,
                                                                    }}
                                                                >
                                                                    {aiLoading === `analyze-${ev.evidence_id}` ? <Loader2 size={11} className="spin" /> : <Sparkles size={11} />}
                                                                    Analyze
                                                                </button>
                                                                <button onClick={() => unlinkEvidence(ev.evidence_id, ev.evidence_type)} style={{
                                                                    background: "none", border: "none", cursor: "pointer",
                                                                    color: "var(--text-muted)", padding: 4, opacity: 0.5,
                                                                }}><Trash2 size={14} /></button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* ─── Notes Tab ─── */}
                                        {claimTab === "notes" && (
                                            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                                                <div style={{ flex: 1, overflowY: "auto", marginBottom: "0.75rem" }}>
                                                    {claimNotes.length === 0 && (
                                                        <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                                                            <MessageSquare size={24} style={{ opacity: 0.2, marginBottom: 8 }} />
                                                            <br />Start building your case notes for this claim.
                                                        </div>
                                                    )}
                                                    {claimNotes.map(note => (
                                                        <div key={note.id} style={{
                                                            display: "flex", gap: "0.75rem", marginBottom: "0.75rem",
                                                            flexDirection: note.role === "ai" ? "row-reverse" : "row",
                                                        }}>
                                                            <div style={{
                                                                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                                                                background: note.role === "user" ? "rgba(0,242,255,0.12)" : note.role === "ai" ? "rgba(168,85,247,0.15)" : "rgba(148,163,184,0.12)",
                                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                            }}>
                                                                {note.role === "user"
                                                                    ? <Users size={12} color="var(--accent-cyan)" />
                                                                    : note.role === "ai"
                                                                        ? <Brain size={12} color="#c084fc" />
                                                                        : <Target size={12} color="var(--text-muted)" />}
                                                            </div>
                                                            <div style={{
                                                                maxWidth: note.role === "ai" ? "90%" : "75%",
                                                                padding: "0.5rem 0.75rem",
                                                                background: note.role === "user" ? "rgba(0,242,255,0.06)" : note.role === "ai" ? "rgba(168,85,247,0.06)" : "rgba(148,163,184,0.06)",
                                                                borderRadius: 8,
                                                                border: `1px solid ${note.role === "user" ? "rgba(0,242,255,0.15)" : note.role === "ai" ? "rgba(168,85,247,0.2)" : "rgba(148,163,184,0.15)"}`,
                                                            }}>
                                                                {note.role === "ai" && (
                                                                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6, fontSize: "0.65rem", fontWeight: 700, color: "#c084fc", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                                                        <Brain size={10} /> AI Analysis
                                                                    </div>
                                                                )}
                                                                <div style={{ fontSize: "0.8125rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{note.content}</div>
                                                                <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: 4 }}>
                                                                    {new Date(note.created_at).toLocaleString()}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                {/* Input */}
                                                <div style={{
                                                    display: "flex", gap: "0.5rem", padding: "0.75rem",
                                                    background: "var(--bg-glass)", border: "var(--glass-border)",
                                                    borderRadius: 10,
                                                }}>
                                                    <input
                                                        value={noteInput}
                                                        onChange={e => setNoteInput(e.target.value)}
                                                        onKeyDown={e => e.key === "Enter" && addNote()}
                                                        placeholder="Add a note about this claim…"
                                                        style={{
                                                            flex: 1, background: "none", border: "none", outline: "none",
                                                            color: "var(--text-primary)", fontSize: "0.8125rem",
                                                        }}
                                                    />
                                                    <button onClick={addNote} style={{
                                                        background: "rgba(0,242,255,0.12)", border: "1px solid rgba(0,242,255,0.25)",
                                                        borderRadius: 6, padding: "6px 12px", cursor: "pointer",
                                                        color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: 4,
                                                        fontSize: "0.75rem", fontWeight: 600,
                                                    }}>
                                                        <Send size={12} /> Send
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                )}

                {/* ═══════ NEXT STEPS VIEW ═══════ */}
                {activeView === "next-steps" && (
                    <>
                        {/* Left: Agency List */}
                        <div className="glass-panel" style={{
                            width: 320, flexShrink: 0, display: "flex", flexDirection: "column",
                            borderRadius: 0, borderRight: "1px solid var(--border-glass)", borderTop: "none",
                        }}>
                            <div style={{ padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1px solid var(--border-glass)" }}>
                                <Building2 size={14} color="var(--accent-emerald)" />
                                <span style={{ fontWeight: 700, fontSize: "0.8125rem" }}>Agency Submissions</span>
                            </div>
                            <div style={{ flex: 1, overflowY: "auto" }}>
                                {agencyLoading ? (
                                    <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>Loading…</div>
                                ) : agencies.map(agency => {
                                    const sc = STATUS_COLORS[agency.status] || STATUS_COLORS.draft;
                                    const isActive = selectedAgency?.slug === agency.slug;
                                    return (
                                        <div
                                            key={agency.slug}
                                            onClick={() => selectAgency(agency)}
                                            style={{
                                                padding: "0.75rem 1rem",
                                                borderBottom: "1px solid rgba(255,255,255,0.03)",
                                                cursor: "pointer",
                                                background: isActive ? "rgba(0,245,212,0.06)" : "transparent",
                                                borderLeft: isActive ? "3px solid var(--accent-emerald)" : "3px solid transparent",
                                                transition: "all 0.15s",
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                                                <span style={{
                                                    fontSize: "0.575rem", fontWeight: 700, textTransform: "uppercase",
                                                    color: "var(--text-muted)", padding: "1px 5px",
                                                    background: "rgba(255,255,255,0.04)", borderRadius: 3, letterSpacing: "0.06em",
                                                }}>{agency.agency_type}</span>
                                                <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-primary)" }}>{agency.title}</span>
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                                                <span style={{
                                                    display: "inline-flex", alignItems: "center", gap: 4,
                                                    background: sc.bg, color: sc.text, padding: "1px 6px",
                                                    borderRadius: 4, fontWeight: 600, fontSize: "0.625rem",
                                                    textTransform: "uppercase",
                                                }}>
                                                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: sc.dot }} />
                                                    {agency.status.replace("_", " ")}
                                                </span>
                                                <span><Shield size={10} /> {agency.claimCount} claims</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Center: Agency Detail */}
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                            {!selectedAgency ? (
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", flexDirection: "column", gap: "0.75rem" }}>
                                    <Building2 size={40} style={{ opacity: 0.15 }} />
                                    <span style={{ fontSize: "0.875rem" }}>Select an agency to build your submission</span>
                                </div>
                            ) : agencyDetailLoading ? (
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--accent-cyan)" }}>
                                    <Loader2 size={20} className="spin" />
                                </div>
                            ) : (
                                <>
                                    {/* Agency Header */}
                                    <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid var(--border-glass)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: "1.125rem" }}>{selectedAgency.title}</h3>
                                            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.25rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                                <span>📋 {selectedAgency.submission_method}</span>
                                                {(() => {
                                                    try {
                                                        const ci = JSON.parse(selectedAgency.contact_info || "{}");
                                                        return ci.url ? (
                                                            <a href={ci.url} target="_blank" rel="noreferrer" style={{ color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: 3 }}>
                                                                <ExternalLink size={10} /> Website
                                                            </a>
                                                        ) : null;
                                                    } catch { return null; }
                                                })()}
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", gap: "0.375rem" }}>
                                            {(["draft", "in_progress", "submitted", "acknowledged"] as const).map(s => {
                                                const sc = STATUS_COLORS[s];
                                                return (
                                                    <button key={s} onClick={() => updateAgencyStatus(selectedAgency.slug, s)} style={{
                                                        padding: "4px 10px", fontSize: "0.65rem", fontWeight: 600,
                                                        textTransform: "uppercase", borderRadius: 6, cursor: "pointer",
                                                        border: selectedAgency.status === s ? `1px solid ${sc.dot}` : "1px solid transparent",
                                                        background: selectedAgency.status === s ? sc.bg : "rgba(255,255,255,0.03)",
                                                        color: selectedAgency.status === s ? sc.text : "var(--text-muted)",
                                                        transition: "all 0.15s",
                                                    }}>{s.replace("_", " ")}</button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Linked Claims */}
                                    <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.5rem" }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                                            <h4 style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                                                <Shield size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
                                                Linked Claims
                                            </h4>
                                            <button onClick={() => setShowLinkClaim(true)} style={{
                                                background: "rgba(0,242,255,0.08)", border: "1px solid rgba(0,242,255,0.25)",
                                                borderRadius: 6, padding: "4px 10px", cursor: "pointer",
                                                display: "flex", alignItems: "center", gap: 4,
                                                color: "var(--accent-cyan)", fontSize: "0.7rem", fontWeight: 600,
                                            }}><Plus size={12} /> Link Claim</button>
                                        </div>

                                        {agencyLinkedClaims.length === 0 ? (
                                            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                                                <AlertTriangle size={24} style={{ opacity: 0.2, marginBottom: 8 }} />
                                                <br />No claims linked yet. Click &quot;Link Claim&quot; to connect charges to this submission.
                                            </div>
                                        ) : agencyLinkedClaims.map(lc => {
                                            const sv = SEVERITY_BADGES[lc.severity] || SEVERITY_BADGES.felony;
                                            const sc = STATUS_COLORS[lc.claim_status] || STATUS_COLORS.new;
                                            return (
                                                <div key={lc.claim_slug} style={{
                                                    display: "flex", alignItems: "center", gap: "0.75rem",
                                                    padding: "0.75rem 1rem", marginBottom: "0.375rem",
                                                    background: "rgba(255,255,255,0.02)", borderRadius: 8,
                                                    border: "1px solid rgba(255,255,255,0.04)",
                                                }}>
                                                    <Shield size={16} color={sv.color} />
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: "0.8125rem", fontWeight: 600 }}>{lc.claim_title}</div>
                                                        <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.65rem", marginTop: 2 }}>
                                                            <span style={{ color: sv.color, fontWeight: 700, textTransform: "uppercase" }}>{sv.label}</span>
                                                            <span style={{ background: sc.bg, color: sc.text, padding: "0 5px", borderRadius: 3, fontWeight: 600 }}>
                                                                {lc.claim_status}
                                                            </span>
                                                            <span style={{
                                                                color: lc.priority === "primary" ? "var(--accent-red)" : "var(--text-muted)",
                                                                fontWeight: 600, textTransform: "uppercase",
                                                            }}>{lc.priority}</span>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => unlinkClaimFromAgency(lc.claim_slug)} style={{
                                                        background: "none", border: "none", cursor: "pointer",
                                                        color: "var(--text-muted)", padding: 4, opacity: 0.5,
                                                    }}><Trash2 size={14} /></button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* ═══════ ADD CLAIM MODAL ═══════ */}
            {showAddClaim && (
                <>
                    <div className="workbench-overlay" onClick={() => setShowAddClaim(false)} />
                    <div className="workbench-modal" style={{ maxWidth: 420 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                            <h3 style={{ margin: 0, fontSize: "1rem" }}>Add Claim</h3>
                            <button onClick={() => setShowAddClaim(false)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}><X size={18} /></button>
                        </div>
                        <input
                            value={newClaimTitle}
                            onChange={e => setNewClaimTitle(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && addClaim()}
                            placeholder="Claim title (e.g. Tax Evasion)"
                            style={{
                                width: "100%", padding: "0.625rem 0.75rem", background: "var(--bg-glass)",
                                border: "var(--glass-border)", borderRadius: 8, color: "var(--text-primary)",
                                fontSize: "0.875rem", marginBottom: "0.75rem", outline: "none",
                            }}
                            autoFocus
                        />
                        <div style={{ display: "flex", gap: "0.375rem", marginBottom: "1rem" }}>
                            {["criminal", "civil", "regulatory"].map(cat => (
                                <button key={cat} onClick={() => setNewClaimCategory(cat)} style={{
                                    padding: "4px 12px", fontSize: "0.75rem", fontWeight: 600,
                                    textTransform: "uppercase", borderRadius: 6, cursor: "pointer",
                                    border: newClaimCategory === cat ? "1px solid var(--accent-cyan)" : "1px solid rgba(255,255,255,0.1)",
                                    background: newClaimCategory === cat ? "rgba(0,242,255,0.12)" : "transparent",
                                    color: newClaimCategory === cat ? "var(--accent-cyan)" : "var(--text-muted)",
                                }}>{cat}</button>
                            ))}
                        </div>
                        <button onClick={addClaim} style={{
                            width: "100%", padding: "0.625rem",
                            background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))",
                            border: "none", borderRadius: 8, color: "#fff", fontSize: "0.875rem",
                            fontWeight: 700, cursor: "pointer",
                        }}>Create Claim</button>
                    </div>
                </>
            )}

            {/* ═══════ LINK CLAIM TO AGENCY MODAL ═══════ */}
            {showLinkClaim && (
                <>
                    <div className="workbench-overlay" onClick={() => setShowLinkClaim(false)} />
                    <div className="workbench-modal">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                            <h3 style={{ margin: 0, fontSize: "1rem" }}>Link Claim to {selectedAgency?.title}</h3>
                            <button onClick={() => setShowLinkClaim(false)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}><X size={18} /></button>
                        </div>
                        <div className="workbench-assign-sections">
                            {claims
                                .filter(c => !agencyLinkedClaims.some(lc => lc.claim_slug === c.slug))
                                .map(c => {
                                    const sv = SEVERITY_BADGES[c.severity] || SEVERITY_BADGES.felony;
                                    return (
                                        <div key={c.slug} className="workbench-assign-option" onClick={() => linkClaimToAgency(c.slug)}>
                                            <Shield size={14} color={sv.color} />
                                            <span>{c.title}</span>
                                            <span style={{ marginLeft: "auto", fontSize: "0.6rem", color: sv.color, fontWeight: 700 }}>{sv.label}</span>
                                            <ChevronRight size={14} style={{ opacity: 0.4 }} />
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </>
            )}

            {/* ═══════ LINK EVIDENCE MODAL ═══════ */}
            {showLinkEvidence && (
                <>
                    <div className="workbench-overlay" onClick={() => setShowLinkEvidence(false)} />
                    <div className="workbench-modal" style={{ maxWidth: 560, maxHeight: "70vh", display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexShrink: 0 }}>
                            <h3 style={{ margin: 0, fontSize: "1rem" }}>
                                <LinkIcon size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />
                                Link Evidence to &quot;{selectedClaim?.title}&quot;
                            </h3>
                            <button onClick={() => setShowLinkEvidence(false)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}><X size={18} /></button>
                        </div>

                        {/* Relevance input */}
                        <div style={{ marginBottom: "0.75rem", flexShrink: 0 }}>
                            <input
                                value={evidenceRelevance}
                                onChange={e => setEvidenceRelevance(e.target.value)}
                                placeholder="Relevance note (optional) — e.g. 'Proves wire transfer to personal acct'"
                                style={{
                                    width: "100%", padding: "0.5rem 0.75rem", background: "var(--bg-glass)",
                                    border: "var(--glass-border)", borderRadius: 8, color: "var(--text-primary)",
                                    fontSize: "0.8125rem", outline: "none",
                                }}
                            />
                        </div>

                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.5rem", flexShrink: 0 }}>
                            Click an item to link it. The relevance note above will be attached.
                        </div>

                        {/* Workbench items */}
                        <div style={{ flex: 1, overflowY: "auto" }}>
                            {wbLoading ? (
                                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                                    <Loader2 size={18} className="spin" /> Loading workbench evidence…
                                </div>
                            ) : workbenchItems.length === 0 ? (
                                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                                    No unlinked workbench evidence found. Assign evidence in the Workbench first, or all items are already linked.
                                </div>
                            ) : workbenchItems.map(item => {
                                const typeIcon = item.type === "email" ? <Mail size={14} color="var(--accent-cyan)" />
                                    : item.type === "text" ? <Smartphone size={14} color="var(--accent-emerald)" />
                                        : <FileText size={14} color="var(--accent-purple)" />;
                                return (
                                    <div
                                        key={`${item.id}-${item.type}`}
                                        onClick={() => linkEvidence(item)}
                                        style={{
                                            display: "flex", alignItems: "center", gap: "0.75rem",
                                            padding: "0.625rem 0.75rem", marginBottom: "0.25rem",
                                            borderRadius: 6, cursor: "pointer",
                                            border: "1px solid rgba(255,255,255,0.04)",
                                            transition: "background 0.15s",
                                        }}
                                        onMouseOver={e => (e.currentTarget.style.background = "rgba(0,242,255,0.06)")}
                                        onMouseOut={e => (e.currentTarget.style.background = "transparent")}
                                    >
                                        {typeIcon}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{item.title}</div>
                                            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                                                {item.type} · {item.subtitle}
                                                {item.date ? ` · ${item.date}` : ""}
                                            </div>
                                        </div>
                                        <Plus size={14} color="var(--accent-cyan)" style={{ opacity: 0.6 }} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            {/* ═══════ TOAST ═══════ */}
            {toastMsg && (
                <div style={{
                    position: "fixed", bottom: "2rem", right: "2rem",
                    background: toastMsg.error ? "#fef2f2" : "#f0fdf4",
                    color: toastMsg.error ? "#991b1b" : "#166534",
                    border: `1px solid ${toastMsg.error ? "#f87171" : "#86efac"}`,
                    padding: "1rem 1.5rem", borderRadius: 8,
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    zIndex: 9999, display: "flex", alignItems: "center", gap: "0.5rem",
                    fontWeight: 500, fontSize: "0.875rem",
                }}>
                    <span>{toastMsg.msg}</span>
                </div>
            )}

            {/* ─── Evidence Preview Drawer ─── */}
            {previewEv && (
                <div style={{
                    position: "fixed", top: 0, right: 0, bottom: 0,
                    width: "clamp(360px, 42vw, 680px)",
                    background: "var(--bg-sidebar, #0d1117)",
                    borderLeft: "1px solid var(--border-glass)",
                    display: "flex", flexDirection: "column",
                    zIndex: 500,
                    boxShadow: "-8px 0 32px rgba(0,0,0,0.5)",
                    animation: "slideInRight 0.2s ease",
                }}>
                    {/* Drawer header */}
                    <div style={{
                        padding: "1rem 1.25rem",
                        borderBottom: "1px solid var(--border-glass)",
                        display: "flex", alignItems: "flex-start", gap: "0.75rem",
                        flexShrink: 0,
                    }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: 4 }}>
                                {previewEv.evidence_type === "email" ? <Mail size={13} color="var(--accent-cyan)" /> :
                                    previewEv.evidence_type === "text" ? <Smartphone size={13} color="var(--accent-emerald)" /> :
                                        <FileText size={13} color="var(--accent-purple)" />}
                                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>
                                    {previewEv.evidence_type}
                                </span>
                            </div>
                            <div style={{ fontSize: "0.8rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--accent-cyan)", wordBreak: "break-all" }}>
                                {previewEv.evidence_id}
                            </div>
                            {previewEv.relevance && (
                                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.5 }}>
                                    {previewEv.relevance}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => { setPreviewEv(null); setPreviewHtml(null); }}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, flexShrink: 0 }}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Drawer content */}
                    <div style={{ flex: 1, overflow: "auto", padding: "1rem" }}>
                        {previewLoading ? (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, gap: 8, color: "var(--text-muted)" }}>
                                <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                                Loading preview...
                            </div>
                        ) : previewHtml ? (
                            <iframe
                                srcDoc={previewHtml}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    minHeight: 500,
                                    border: "none",
                                    borderRadius: 8,
                                    background: "#fff",
                                }}
                                sandbox="allow-same-origin"
                                title={`Preview: ${previewEv.evidence_id}`}
                            />
                        ) : (
                            <div style={{ padding: "2rem", textAlign: "center" }}>
                                <FolderOpen size={32} style={{ opacity: 0.2, marginBottom: 12 }} />
                                <div style={{ color: "var(--text-muted)", fontSize: "0.8125rem", marginBottom: 8 }}>
                                    No indexed content found for this evidence ID.
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 300, margin: "0 auto" }}>
                                    This evidence item may need to be imported into the communications index,
                                    or you can view it directly in the Communications pod.
                                </div>
                                {previewEv.relevance && (
                                    <div style={{
                                        marginTop: 16, padding: "1rem", background: "rgba(255,255,255,0.03)",
                                        border: "1px solid var(--border-glass)", borderRadius: 8,
                                        textAlign: "left", fontSize: "0.8rem", lineHeight: 1.6,
                                        color: "var(--text-secondary)",
                                    }}>
                                        <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Relevance Note</div>
                                        {previewEv.relevance}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
