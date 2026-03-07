"use client";

import { useEffect, useState, useCallback } from "react";
import {
    FolderOpen,
    Mail,
    MessageSquare,
    FileText,
    Search,
    ChevronRight,
    Eye,
    Send,
    AlertTriangle,
    CheckCircle,
    Paintbrush,
    Edit3,
    X,
    Hash,
    ChevronLeft,
    ChevronDown,
    Loader2,
    Plus,
} from "lucide-react";

/* ── Types ── */

interface SectionInfo {
    name: string;
    prefix: string;
    types: string[];
    pdfCount: number;
    emlCount: number;
    totalItems: number;
}

interface EvidenceItem {
    id: string;
    type: "email" | "text" | "transcript";
    title: string;
    subtitle: string;
    date: string;
    preview: string;
    source: string;
    batesNumber?: string;
}

interface CleaningIssue {
    line: number;
    type: string;
    text: string;
}

/* ── Evidence Type Icons ── */
const TYPE_ICONS: Record<string, typeof Mail> = {
    email: Mail,
    text: MessageSquare,
    transcript: FileText,
    document: FolderOpen,
};

const TYPE_COLORS: Record<string, string> = {
    email: "var(--accent-cyan)",
    text: "var(--accent-purple)",
    transcript: "var(--accent-orange)",
    document: "var(--text-secondary)",
};

/* ── Main Page ── */

export default function WorkbenchPage() {
    // Sections
    const [sections, setSections] = useState<SectionInfo[]>([]);
    const [selectedSection, setSelectedSection] = useState<string | null>(null);
    const [sectionsLoading, setSectionsLoading] = useState(true);

    // Evidence
    const [evidenceType, setEvidenceType] = useState<"email" | "text" | "transcript">("email");
    const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
    const [evidenceLoading, setEvidenceLoading] = useState(false);
    const [evidencePage, setEvidencePage] = useState(1);
    const [evidenceTotal, setEvidenceTotal] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");

    // Preview
    const [previewHtml, setPreviewHtml] = useState<string>("");
    const [previewIssues, setPreviewIssues] = useState<CleaningIssue[]>([]);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);

    // Assignment modal
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [assignTarget, setAssignTarget] = useState<EvidenceItem | null>(null);

    // Description editor
    const [descEditorOpen, setDescEditorOpen] = useState(false);
    const [descContent, setDescContent] = useState("");
    const [descSaving, setDescSaving] = useState(false);

    // Template gallery collapsed
    const [templatesOpen, setTemplatesOpen] = useState(true);

    // Create Section Modal
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [newSecName, setNewSecName] = useState("");
    const [newSecPrefix, setNewSecPrefix] = useState("");
    const [isCreatingSection, setIsCreatingSection] = useState(false);

    /* ── Load sections ── */
    const loadSections = useCallback(() => {
        setSectionsLoading(true);
        fetch("/api/workbench/sections")
            .then(r => r.json())
            .then(data => {
                setSections(data.sections || []);
                setSectionsLoading(false);
            })
            .catch(() => setSectionsLoading(false));
    }, []);

    useEffect(() => {
        loadSections();
    }, [loadSections]);

    /* ── Load evidence ── */
    const loadEvidence = useCallback(async () => {
        if (!selectedSection && evidenceType !== "text") return;
        setEvidenceLoading(true);
        const params = new URLSearchParams({
            type: evidenceType,
            page: String(evidencePage),
            limit: "50",
        });
        if (selectedSection) params.set("section", selectedSection);
        if (searchQuery) params.set("q", searchQuery);

        try {
            const res = await fetch(`/api/workbench/evidence?${params}`);
            const data = await res.json();
            setEvidenceItems(data.items || []);
            setEvidenceTotal(data.total || 0);
        } catch {
            setEvidenceItems([]);
        }
        setEvidenceLoading(false);
    }, [selectedSection, evidenceType, evidencePage, searchQuery]);

    useEffect(() => {
        loadEvidence();
    }, [loadEvidence]);

    /* ── Load preview ── */
    const loadPreview = useCallback(async (item: EvidenceItem) => {
        setSelectedEvidence(item);
        setPreviewLoading(true);
        setPreviewHtml("");
        setPreviewIssues([]);

        const params = new URLSearchParams({
            type: item.type,
            id: item.id,
        });
        if (selectedSection) params.set("section", selectedSection);

        try {
            const res = await fetch(`/api/workbench/preview?${params}`);
            const data = await res.json();
            setPreviewHtml(data.html || "");
            setPreviewIssues(data.issues || []);
        } catch {
            setPreviewHtml("<div style='padding:24px;color:#999;'>Preview unavailable</div>");
        }
        setPreviewLoading(false);
    }, [selectedSection]);

    /* ── Assign evidence ── */
    const handleAssign = async (targetSection: string) => {
        if (!assignTarget) return;

        await fetch("/api/workbench/assign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                evidenceId: assignTarget.id,
                evidenceType: assignTarget.type,
                targetSection,
            }),
        });

        setAssignModalOpen(false);
        setAssignTarget(null);
    };

    /* ── Save description ── */
    const handleSaveDescription = async () => {
        if (!selectedSection) return;
        setDescSaving(true);

        setDescSaving(false);
        setDescEditorOpen(false);
    };

    /* ── Create Section ── */
    const handleCreateSection = async () => {
        if (!newSecName || !newSecPrefix) return;
        setIsCreatingSection(true);

        try {
            const res = await fetch("/api/workbench/sections", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newSecName,
                    prefix: newSecPrefix,
                }),
            });
            const data = await res.json();
            if (data.success) {
                loadSections();
                setCreateModalOpen(false);
                setNewSecName("");
                setNewSecPrefix("");
            } else {
                alert(data.error || "Failed to create section");
            }
        } catch {
            alert("Failed to create section");
        }
        setIsCreatingSection(false);
    };

    /* ── Load description on section change ── */
    useEffect(() => {
        if (!selectedSection) return;
        fetch(`/api/workbench/descriptions?targetType=section&targetId=${selectedSection}`)
            .then(r => r.json())
            .then(data => {
                setDescContent(data.current?.content || "");
            })
            .catch(() => setDescContent(""));
    }, [selectedSection]);

    /* ── Template definitions ── */
    const templates = [
        { name: "Email Evidence", icon: Mail, color: "var(--accent-cyan)", desc: "Bates-numbered email with header table and cleaned body" },
        { name: "Text Message", icon: MessageSquare, color: "var(--accent-purple)", desc: "iMessage-style bubbles with timestamps and sender labels" },
        { name: "Transcript", icon: FileText, color: "var(--accent-orange)", desc: "Speaker-labeled court transcript with timestamps" },
        { name: "Table of Contents", icon: Hash, color: "var(--accent-emerald)", desc: "Auto-generated TOC with section names and Bates ranges" },
    ];

    const totalEvPages = Math.ceil(evidenceTotal / 50);

    return (
        <div className="animate-in">
            {/* Header */}
            <div className="page-header">
                <h1>Lawyer Package Workbench</h1>
                <p>
                    {sections.length} exhibit sections •{" "}
                    {sections.reduce((s, x) => s + x.totalItems, 0).toLocaleString()} total items •{" "}
                    Chain of custody preserved
                </p>
            </div>

            {/* Three-Panel Layout */}
            <div className="workbench-layout">
                {/* ═══ LEFT PANEL — Sections + Templates ═══ */}
                <div className="workbench-left">
                    {/* Section Header */}
                    <div className="workbench-panel-header">
                        <FolderOpen size={14} color="var(--accent-cyan)" />
                        <span>Exhibit Sections</span>
                        <div style={{ marginLeft: "auto", display: "flex", gap: "0.25rem", alignItems: "center" }}>
                            <button
                                className="workbench-action-btn"
                                style={{ width: 22, height: 22 }}
                                onClick={() => setCreateModalOpen(true)}
                                title="Add New Section"
                            >
                                <Plus size={14} />
                            </button>
                            <span className="badge badge-cyan">
                                {sections.length}
                            </span>
                        </div>
                    </div>

                    {/* Section List */}
                    <div className="workbench-section-list">
                        {sectionsLoading ? (
                            <div style={{ padding: "1rem", color: "var(--text-muted)", textAlign: "center" }}>
                                <Loader2 size={16} className="spin" /> Loading…
                            </div>
                        ) : (
                            sections.map(sec => (
                                <div
                                    key={sec.name}
                                    className={`workbench-section-item ${selectedSection === sec.name ? "active" : ""}`}
                                    onClick={() => {
                                        setSelectedSection(sec.name);
                                        setEvidencePage(1);
                                        setSelectedEvidence(null);
                                        setPreviewHtml("");
                                    }}
                                >
                                    <div className="workbench-section-name">
                                        {sec.name.replace(/_/g, " ").replace(/^\d+\s/, "")}
                                    </div>
                                    <div className="workbench-section-meta">
                                        <span className="workbench-section-prefix">{sec.prefix}</span>
                                        <span>{sec.totalItems} items</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Template Gallery */}
                    <div className="workbench-panel-header" style={{ marginTop: "0.5rem", cursor: "pointer" }}
                        onClick={() => setTemplatesOpen(!templatesOpen)}>
                        {templatesOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <span>Templates</span>
                    </div>
                    {templatesOpen && (
                        <div style={{ padding: "0 0.5rem 0.5rem" }}>
                            {templates.map(t => {
                                const Icon = t.icon;
                                return (
                                    <div key={t.name} className="workbench-template-card">
                                        <Icon size={16} color={t.color} />
                                        <div>
                                            <div style={{ fontSize: "0.775rem", fontWeight: 600 }}>{t.name}</div>
                                            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", lineHeight: 1.3 }}>{t.desc}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ═══ CENTER PANEL — Evidence List ═══ */}
                <div className="workbench-center">
                    {/* Type Tabs + Search */}
                    <div className="workbench-center-header">
                        <div className="workbench-type-tabs">
                            {(["email", "text", "transcript"] as const).map(t => {
                                const Icon = TYPE_ICONS[t] || Mail;
                                return (
                                    <button
                                        key={t}
                                        className={`workbench-type-tab ${evidenceType === t ? "active" : ""}`}
                                        onClick={() => {
                                            setEvidenceType(t);
                                            setEvidencePage(1);
                                            setSelectedEvidence(null);
                                            setPreviewHtml("");
                                        }}
                                    >
                                        <Icon size={13} />
                                        {t.charAt(0).toUpperCase() + t.slice(1)}
                                    </button>
                                );
                            })}
                        </div>
                        <div style={{ position: "relative", flex: 1 }}>
                            <Search size={13} style={{
                                position: "absolute", left: 8, top: "50%",
                                transform: "translateY(-50%)", color: "var(--text-muted)",
                            }} />
                            <input
                                className="input-glass"
                                placeholder="Search evidence…"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && loadEvidence()}
                                style={{ paddingLeft: "1.75rem", fontSize: "0.775rem", height: "30px" }}
                            />
                        </div>
                    </div>

                    {/* Evidence Items */}
                    <div className="workbench-evidence-list">
                        {evidenceLoading ? (
                            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                                <Loader2 size={18} className="spin" /> Loading evidence…
                            </div>
                        ) : evidenceItems.length === 0 ? (
                            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                                {selectedSection
                                    ? `No ${evidenceType} evidence in this section`
                                    : evidenceType === "text"
                                        ? "Loading text messages…"
                                        : "Select a section to view evidence"}
                            </div>
                        ) : (
                            evidenceItems.map(item => {
                                const Icon = TYPE_ICONS[item.type] || Mail;
                                const isSelected = selectedEvidence?.id === item.id;
                                return (
                                    <div
                                        key={item.id}
                                        className={`workbench-evidence-item ${isSelected ? "active" : ""}`}
                                        onClick={() => loadPreview(item)}
                                    >
                                        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                                            <Icon size={14} color={TYPE_COLORS[item.type]} style={{ marginTop: 2, flexShrink: 0 }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div className="workbench-ev-title">{item.title}</div>
                                                <div className="workbench-ev-subtitle">{item.subtitle}</div>
                                                <div className="workbench-ev-date">{item.date}</div>
                                            </div>
                                        </div>
                                        <div className="workbench-ev-actions">
                                            <button
                                                className="workbench-action-btn"
                                                title="Preview"
                                                onClick={e => { e.stopPropagation(); loadPreview(item); }}
                                            >
                                                <Eye size={12} />
                                            </button>
                                            <button
                                                className="workbench-action-btn"
                                                title="Assign to section"
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    setAssignTarget(item);
                                                    setAssignModalOpen(true);
                                                }}
                                            >
                                                <Send size={12} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Pagination */}
                    {evidenceTotal > 50 && (
                        <div className="workbench-pagination">
                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                                Page {evidencePage} of {totalEvPages} • {evidenceTotal} items
                            </span>
                            <div style={{ display: "flex", gap: "0.25rem" }}>
                                <button
                                    className="workbench-action-btn"
                                    disabled={evidencePage <= 1}
                                    onClick={() => setEvidencePage(p => Math.max(1, p - 1))}
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <button
                                    className="workbench-action-btn"
                                    disabled={evidencePage >= totalEvPages}
                                    onClick={() => setEvidencePage(p => p + 1)}
                                >
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ═══ RIGHT PANEL — Preview + Controls ═══ */}
                <div className="workbench-right">
                    <div className="workbench-panel-header">
                        <Eye size={14} color="var(--accent-emerald)" />
                        <span>Live Preview</span>
                        {previewIssues.length > 0 && (
                            <span className="badge badge-orange" style={{ marginLeft: "auto" }}>
                                {previewIssues.length} issues
                            </span>
                        )}
                    </div>

                    {/* Preview Frame */}
                    <div className="workbench-preview-frame">
                        {previewLoading ? (
                            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                                <Loader2 size={20} className="spin" /><br />
                                Generating preview…
                            </div>
                        ) : previewHtml ? (
                            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                        ) : (
                            <div style={{
                                padding: "3rem 2rem", textAlign: "center", color: "var(--text-muted)",
                                fontSize: "0.8125rem",
                            }}>
                                Select an evidence item to preview how it will appear in the Lawyer Evidence Package
                            </div>
                        )}
                    </div>

                    {/* Controls (visible when preview is loaded) */}
                    {selectedEvidence && previewHtml && (
                        <div className="workbench-preview-controls">
                            {/* Cleaning Issues */}
                            {previewIssues.length > 0 && (
                                <div className="workbench-issues-panel">
                                    <div style={{
                                        display: "flex", alignItems: "center", gap: "0.5rem",
                                        marginBottom: "0.5rem", fontSize: "0.7rem", fontWeight: 700,
                                        letterSpacing: "0.06em", textTransform: "uppercase",
                                        color: "var(--accent-orange)",
                                    }}>
                                        <AlertTriangle size={12} /> Cleaning Issues
                                    </div>
                                    {previewIssues.slice(0, 8).map((issue, i) => (
                                        <div key={i} className="workbench-issue-row">
                                            <span className={`workbench-issue-badge ${issue.type}`}>
                                                {issue.type.replace("_", " ")}
                                            </span>
                                            <span>Line {issue.line}: {issue.text}</span>
                                        </div>
                                    ))}
                                    {previewIssues.length > 8 && (
                                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                                            +{previewIssues.length - 8} more issues
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                <button
                                    className="workbench-ctrl-btn"
                                    onClick={() => {
                                        setAssignTarget(selectedEvidence);
                                        setAssignModalOpen(true);
                                    }}
                                >
                                    <Send size={12} /> Assign to Section
                                </button>
                                <button className="workbench-ctrl-btn" onClick={() => setDescEditorOpen(true)}>
                                    <Edit3 size={12} /> Edit Description
                                </button>
                                <button className="workbench-ctrl-btn">
                                    <Paintbrush size={12} /> Flag for Cleaning
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ Assignment Modal ═══ */}
            {assignModalOpen && assignTarget && (
                <>
                    <div className="workbench-overlay" onClick={() => setAssignModalOpen(false)} />
                    <div className="workbench-modal">
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                            <h3 style={{ margin: 0, fontSize: "1rem" }}>
                                Assign Evidence to Section
                            </h3>
                            <button
                                onClick={() => setAssignModalOpen(false)}
                                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div style={{ marginBottom: "1rem", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                            <strong>{assignTarget.title}</strong><br />
                            {assignTarget.subtitle} • {assignTarget.date}
                        </div>
                        <div className="workbench-assign-sections">
                            {sections.map(sec => (
                                <div
                                    key={sec.name}
                                    className="workbench-assign-option"
                                    onClick={() => handleAssign(sec.name)}
                                >
                                    <FolderOpen size={14} color="var(--accent-cyan)" />
                                    <span>{sec.name.replace(/_/g, " ").replace(/^\d+\s/, "")}</span>
                                    <ChevronRight size={14} style={{ marginLeft: "auto", opacity: 0.4 }} />
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* ═══ Description Editor Modal ═══ */}
            {descEditorOpen && selectedSection && (
                <>
                    <div className="workbench-overlay" onClick={() => setDescEditorOpen(false)} />
                    <div className="workbench-modal" style={{ maxWidth: 600 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                            <h3 style={{ margin: 0, fontSize: "1rem" }}>
                                Edit Section Description
                            </h3>
                            <button
                                onClick={() => setDescEditorOpen(false)}
                                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div style={{ marginBottom: "0.75rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            {selectedSection.replace(/_/g, " ")} — Version-controlled, original evidence unmodified
                        </div>
                        <textarea
                            className="input-glass"
                            value={descContent}
                            onChange={e => setDescContent(e.target.value)}
                            rows={10}
                            style={{
                                width: "100%", resize: "vertical", fontFamily: "var(--font-mono)",
                                fontSize: "0.775rem", lineHeight: 1.7,
                            }}
                        />
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.75rem" }}>
                            <button
                                className="workbench-ctrl-btn"
                                onClick={() => setDescEditorOpen(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleSaveDescription}
                                disabled={descSaving}
                                style={{ fontSize: "0.8125rem", padding: "0.375rem 1rem" }}
                            >
                                {descSaving ? "Saving…" : "Save Version"}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* ═══ Create Section Modal ═══ */}
            {createModalOpen && (
                <>
                    <div className="workbench-overlay" onClick={() => setCreateModalOpen(false)} />
                    <div className="workbench-modal" style={{ maxWidth: 400 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                            <h3 style={{ margin: 0, fontSize: "1rem" }}>
                                New Exhibit Section
                            </h3>
                            <button
                                onClick={() => setCreateModalOpen(false)}
                                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="form-group" style={{ marginBottom: "1rem" }}>
                            <label style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.5rem", display: "block" }}>
                                SECTION NAME (e.g. 25_DISPUTED_INVOICES)
                            </label>
                            <input
                                className="input-glass"
                                placeholder="XX_NAME"
                                value={newSecName}
                                onChange={e => setNewSecName(e.target.value.toUpperCase())}
                                style={{ width: "100%", fontSize: "0.8125rem" }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                            <label style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.5rem", display: "block" }}>
                                BATES PREFIX (e.g. INV)
                            </label>
                            <input
                                className="input-glass"
                                placeholder="ABC"
                                value={newSecPrefix}
                                onChange={e => setNewSecPrefix(e.target.value.toUpperCase())}
                                style={{ width: "100%", fontSize: "0.8125rem" }}
                                maxLength={8}
                            />
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                            <button
                                className="workbench-ctrl-btn"
                                onClick={() => setCreateModalOpen(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleCreateSection}
                                disabled={isCreatingSection || !newSecName || !newSecPrefix}
                                style={{ fontSize: "0.8125rem", padding: "0.375rem 1rem" }}
                            >
                                {isCreatingSection ? "Creating…" : "Create Section"}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
