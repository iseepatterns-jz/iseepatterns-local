"use client";

import { BookOpen, ExternalLink, FolderOpen, GitCommit } from "lucide-react";

export default function ObsidianVaultPage() {
    const vaultPath = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/obsidian_vault";

    const openInObsidian = () => {
        // Encode vault name for Obsidian URI
        const vaultName = encodeURIComponent("lawmodel1-obsidian");
        window.open(`obsidian://open?vault=${vaultName}`, "_blank");
    };

    const openInFinder = () => {
        // Open the vault folder in Finder via shell
        window.open(`file://${vaultPath}`, "_blank");
    };

    return (
        <div className="obsidian-page" style={{
            minHeight: "100vh",
            background: "linear-gradient(135deg, #0a0e1a 0%, #111827 50%, #0f172a 100%)",
            color: "#e2e8f0",
            padding: "2rem",
        }}>
            <div style={{ maxWidth: "800px", margin: "0 auto" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: 12,
                        background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 0 20px rgba(124, 58, 237, 0.3)",
                    }}>
                        <BookOpen size={24} color="#fff" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
                            Case Knowledge Graph
                        </h1>
                        <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: "4px 0 0" }}>
                            Obsidian vault — 49 notes, 20 entities, 11 claims, master timeline
                        </p>
                    </div>
                </div>

                <div className="glass-panel" style={{
                    padding: "1.5rem",
                    marginBottom: "1.5rem",
                    borderRadius: 12,
                    background: "rgba(15, 23, 42, 0.6)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(71, 85, 105, 0.3)",
                }}>
                    <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 1rem", color: "#c4b5fd" }}>
                        Open in Obsidian
                    </h2>
                    <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "1rem" }}>
                        The vault lives at <code style={{
                            background: "rgba(124, 58, 237, 0.15)",
                            padding: "2px 6px", borderRadius: 4, fontSize: "0.75rem",
                            fontFamily: "monospace",
                        }}>{vaultPath}</code>
                    </p>
                    <div style={{ display: "flex", gap: "0.75rem" }}>
                        <button
                            onClick={openInObsidian}
                            className="btn-primary"
                            style={{
                                display: "flex", alignItems: "center", gap: "0.5rem",
                                padding: "0.625rem 1.25rem",
                            }}
                        >
                            <ExternalLink size={16} />
                            Open in Obsidian
                        </button>
                        <button
                            onClick={openInFinder}
                            className="workbench-action-btn"
                            style={{
                                display: "flex", alignItems: "center", gap: "0.5rem",
                                padding: "0.625rem 1.25rem",
                            }}
                        >
                            <FolderOpen size={16} />
                            Open in Finder
                        </button>
                    </div>
                </div>

                <div className="glass-panel" style={{
                    padding: "1.5rem",
                    borderRadius: 12,
                    background: "rgba(15, 23, 42, 0.6)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(71, 85, 105, 0.3)",
                }}>
                    <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 1rem", color: "#c4b5fd" }}>
                        Vault Contents
                    </h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.75rem" }}>
                        {[
                            { label: "Entity Notes", count: 20, desc: "People, companies, banks" },
                            { label: "Claim Notes", count: 11, desc: "Partnership dissolution claims" },
                            { label: "Timeline", count: 265, desc: "Master chronological timeline (lines)" },
                            { label: "Dashboards", count: 3, desc: "Claim Status, Evidence Tracker, Witness Binder" },
                            { label: "Templates", count: 2, desc: "Reusable note templates" },
                        ].map(item => (
                            <div key={item.label} style={{
                                padding: "0.75rem",
                                borderRadius: 8,
                                background: "rgba(30, 41, 59, 0.5)",
                                border: "1px solid rgba(71, 85, 105, 0.2)",
                            }}>
                                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#e2e8f0" }}>
                                    {item.label}
                                </div>
                                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#a78bfa", margin: "0.25rem 0" }}>
                                    {item.count}
                                </div>
                                <div style={{ fontSize: "0.7rem", color: "#64748b" }}>{item.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ marginTop: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.7rem", color: "#475569" }}>
                    <GitCommit size={12} />
                    Synced via Obsidian Git plugin — commits pushed to iseepatterns-local
                </div>
            </div>
        </div>
    );
}
