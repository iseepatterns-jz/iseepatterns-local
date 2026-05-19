"use client";

import { Brain } from "lucide-react";

export default function LegalResearchPage() {
    return (
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "4rem 1.5rem" }}>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                <div
                    style={{
                        width: 64,
                        height: 64,
                        borderRadius: 16,
                        background: "linear-gradient(135deg, #a855f7, #06b6d4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 1.5rem",
                        boxShadow: "0 0 30px rgba(168, 85, 247, 0.2)",
                    }}
                >
                    <Brain size={32} color="#fff" strokeWidth={2} />
                </div>
                <h1
                    style={{
                        fontSize: "1.75rem",
                        fontWeight: 800,
                        fontFamily: "var(--font-heading)",
                        margin: 0,
                    }}
                >
                    Legal Research
                </h1>
            </div>

            <div
                className="glass-panel"
                style={{
                    padding: "2rem",
                    textAlign: "center",
                    borderLeft: "3px solid #f59e0b",
                }}
            >
                <h3 style={{ margin: "0 0 1rem", color: "#f59e0b", fontSize: "1rem" }}>
                    Research Backend Deprecated
                </h3>
                <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 1.5rem", fontSize: "0.9375rem" }}>
                    The hybrid RAG engine (BM25 + Vector search via Ollama qwen2.5) that powered this page
                    has been removed. The backend FastAPI service on port 8000 was decommissioned as part
                    of the LawModel1 consolidation to Next.js API routes.
                </p>
                <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 1.5rem", fontSize: "0.9375rem" }}>
                    For AI-powered legal research and analysis, use the{" "}
                    <strong>Rowboat Discovery</strong> notebook in NotebookLM, which provides
                    Gemini 2.5-powered answers grounded on the full case evidence record.
                </p>
                <a
                    href="https://notebooklm.google.com/notebook/e80f2ca1-8bea-4654-a49d-cfc0114c1fc2"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: "inline-block",
                        padding: "0.75rem 1.5rem",
                        background: "linear-gradient(135deg, #a855f7, #06b6d4)",
                        color: "#fff",
                        borderRadius: 10,
                        textDecoration: "none",
                        fontWeight: 600,
                        fontSize: "0.875rem",
                    }}
                >
                    Open Rowboat Discovery
                </a>
            </div>
        </div>
    );
}
