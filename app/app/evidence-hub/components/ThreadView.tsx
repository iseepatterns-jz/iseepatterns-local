"use client";
import React, { useState } from "react";
import { Link2, RefreshCw, ChevronDown, ChevronUp, FolderOpen } from "lucide-react";
import type { ThreadEmail, WorkbenchSection } from "../types";

interface ThreadViewProps {
    threadEmails: ThreadEmail[];
    threadSubject: string;
    threadLoading: boolean;
    wbSections: WorkbenchSection[];
    assignToSection: (section: string, ids: string[], type: string) => void;
}

export default function ThreadView({
    threadEmails, threadSubject, threadLoading,
    wbSections, assignToSection
}: ThreadViewProps) {
    const [expanded, setExpanded] = useState<string | null>(null);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [showSectionPicker, setShowSectionPicker] = useState(false);

    return (
        <div className="eh-detail-section" style={{ overflow: "hidden", minWidth: 0 }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                <Link2 size={14} style={{ color: "#3b82f6", flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {threadSubject || "Email Thread"}
                </span>
                <span style={{ fontSize: 11, color: "#64748b", marginLeft: "auto", flexShrink: 0 }}>
                    {selected.size > 0 ? `${selected.size} selected` : `${threadEmails.length} message${threadEmails.length !== 1 ? "s" : ""}`}
                </span>
            </div>

            {/* Action bar */}
            {threadEmails.length > 0 && (
                <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                    <button
                        className="eh-btn"
                        onClick={() => {
                            if (selected.size === threadEmails.length) {
                                setSelected(new Set());
                            } else {
                                setSelected(new Set(threadEmails.map(t => t.row_id)));
                            }
                        }}
                        style={{ padding: "4px 8px", fontSize: 11 }}
                    >
                        {selected.size === threadEmails.length ? "Deselect All" : "Select All"}
                    </button>
                    {selected.size > 0 && wbSections.length > 0 && (
                        <div style={{ position: "relative" }}>
                            <button
                                className="eh-btn"
                                onClick={() => setShowSectionPicker(prev => !prev)}
                                style={{ padding: "4px 8px", fontSize: 11, background: "rgba(251, 191, 36, 0.1)", borderColor: "rgba(251, 191, 36, 0.3)" }}
                            >
                                <FolderOpen size={12} color="#fbbf24" />
                                <span style={{ color: "#fbbf24" }}>Assign {selected.size} to Section</span>
                            </button>
                            {showSectionPicker && (
                                <div className="eh-conv-dropdown" style={{ top: "110%", left: 0, zIndex: 50, maxHeight: 240, overflowY: "auto" }}>
                                    {wbSections.map(s => (
                                        <button key={s.name} onClick={() => {
                                            const ids = threadEmails.filter(t => selected.has(t.row_id)).map(t => t.msg_id);
                                            assignToSection(s.name, ids, "email");
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
                </div>
            )}

            {/* Content */}
            {threadLoading ? (
                <div className="eh-loading" style={{ padding: 40 }}>
                    <RefreshCw size={24} />
                    <p style={{ marginTop: 12 }}>Resolving thread…</p>
                </div>
            ) : threadEmails.length === 0 ? (
                <div className="eh-empty" style={{ padding: 30 }}>
                    <Link2 size={30} />
                    <p style={{ fontSize: 13 }}>No thread found. This may be a standalone email.</p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 0, minWidth: 0, overflow: "hidden" }}>
                    {threadEmails.map((t, idx) => {
                        const isExpanded = expanded === t.msg_id;
                        const isLast = idx === threadEmails.length - 1;
                        return (
                            <div key={t.row_id || idx} style={{ display: "flex", gap: 8, minWidth: 0 }}>
                                {/* Checkbox */}
                                <div style={{ display: "flex", alignItems: "flex-start", paddingTop: 12, flexShrink: 0 }}>
                                    <input
                                        type="checkbox"
                                        checked={selected.has(t.row_id)}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            setSelected(prev => {
                                                const next = new Set(prev);
                                                if (next.has(t.row_id)) next.delete(t.row_id);
                                                else next.add(t.row_id);
                                                return next;
                                            });
                                        }}
                                        style={{ accentColor: "#3b82f6", cursor: "pointer", width: 14, height: 14 }}
                                    />
                                </div>
                                {/* Timeline */}
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20, flexShrink: 0 }}>
                                    <div style={{
                                        width: 10, height: 10, borderRadius: "50%",
                                        background: idx === 0 ? "#3b82f6" : "rgba(100, 116, 139, 0.4)",
                                        border: `2px solid ${idx === 0 ? "#3b82f6" : "rgba(100, 116, 139, 0.3)"}`,
                                        flexShrink: 0, marginTop: 14
                                    }} />
                                    {!isLast && (
                                        <div style={{
                                            width: 2, flex: 1,
                                            background: "linear-gradient(to bottom, rgba(59, 130, 246, 0.3), rgba(100, 116, 139, 0.15))",
                                            minHeight: 20
                                        }} />
                                    )}
                                </div>

                                {/* Card */}
                                <div
                                    style={{
                                        flex: 1, minWidth: 0, borderRadius: 8, marginBottom: isLast ? 0 : 4,
                                        background: isExpanded ? "rgba(59, 130, 246, 0.06)" : "rgba(30, 41, 59, 0.5)",
                                        border: `1px solid ${isExpanded ? "rgba(59, 130, 246, 0.2)" : "rgba(51, 65, 85, 0.4)"}`,
                                        overflow: "hidden", cursor: "pointer",
                                        transition: "all 0.15s ease"
                                    }}
                                >
                                    <div
                                        onClick={() => setExpanded(isExpanded ? null : t.msg_id)}
                                        style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}
                                    >
                                        <span style={{
                                            fontSize: 10, fontWeight: 700, color: "#64748b",
                                            background: "rgba(100, 116, 139, 0.15)",
                                            padding: "2px 6px", borderRadius: 4, flexShrink: 0
                                        }}>
                                            {idx + 1}
                                        </span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                {t.sender || t.account}
                                            </div>
                                            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                                                {t.date ? new Date(t.date).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}
                                            </div>
                                        </div>
                                        {isExpanded ? <ChevronUp size={14} color="#64748b" /> : <ChevronDown size={14} color="#64748b" />}
                                    </div>

                                    {isExpanded && (
                                        <div style={{ padding: "0 12px 12px 12px", borderTop: "1px solid rgba(51, 65, 85, 0.3)" }}>
                                            <div style={{ fontSize: 11, color: "#94a3b8", padding: "8px 0 6px", lineHeight: 1.5 }}>
                                                {t.to_addr && <div><strong style={{ color: "#64748b" }}>To:</strong> {t.to_addr}</div>}
                                                {t.cc_addr && <div><strong style={{ color: "#64748b" }}>Cc:</strong> {t.cc_addr}</div>}
                                                {t.subject && <div><strong style={{ color: "#64748b" }}>Subject:</strong> {t.subject}</div>}
                                            </div>
                                            <pre style={{
                                                whiteSpace: "pre-wrap", wordBreak: "break-word",
                                                fontFamily: "var(--font-body, system-ui)",
                                                fontSize: 12.5, lineHeight: 1.6,
                                                color: "#cbd5e1", margin: 0,
                                                maxHeight: 400, overflowY: "auto",
                                                padding: "8px 0"
                                            }}>
                                                {t.cleaned_body || t.body || "(no body)"}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
