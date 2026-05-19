"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Mail,
  Users,
  Calendar,
  Shield,
  Activity,
  Database,
  Search,
  MessageSquare,
  FileText,
  Scale,
  Headphones,
  X,
  ArrowRight,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Source = {
  source_file: string;
  page: string;
  category?: string;
  score: number;
};

type BrainSubtask = {
  description: string;
  done: boolean;
  order_idx: number;
};

type BrainTask = {
  title: string;
  status: string;
  order_idx: number;
  subtasks: BrainSubtask[];
};

type ReadybagRun = {
  started_at: string;
  finished_at: string;
  status: string;
  notes?: string | null;
};

type BrainStatus = {
  case_id: string;
  summary?: string;
  version?: number;
  tasks: BrainTask[];
  readybag_runs: ReadybagRun[];
  updated_at?: string;
};

interface Stats {
  totalEmails: number;
  uniqueSenders: number;
  uniqueAccounts: number;
  dateRange: { earliest: string; latest: string };
  cocRecords: number;
}

interface CocRecord {
  id: number;
  source_path: string;
  sha256: string;
  ingested_at: string;
  ingested_by: string;
  row_count: number;
}

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  date: string | null;
  link: string;
}

interface SearchResults {
  emails: SearchResult[];
  messages: SearchResult[];
  transcripts: SearchResult[];
  legal: SearchResult[];
  players: SearchResult[];
}

const POD_CONFIG = [
    { key: "discovery", label: "Discovery Hub", icon: Search, color: "var(--accent-cyan)", href: "/evidence-hub", description: "Search across all emails, texts, and transcripts." },
    { key: "analyze", label: "Analyze", icon: Activity, color: "var(--accent-purple)", href: "/correlator", description: "Connect the dots between players and evidence." },
    { key: "strategy", label: "Strategy Hub", icon: Target, color: "var(--accent-red)", href: "/case-corner", description: "Build the theory of the case and manage claims." },
    { key: "presentation", label: "Briefing Room", icon: Scale, color: "var(--accent-emerald)", href: "/briefing", description: "Prepare outcomes for attorneys and court." },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [cocRecords, setCocRecords] = useState<CocRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);

  // DEPRECATED: brain + RAG state (FastAPI on port 8000 removed 2026-05-18)
  // const [brain, setBrain] = useState<BrainStatus | null>(null);
  // const [brainLoading, setBrainLoading] = useState(false);
  // const searchParams = useSearchParams();
  // const [question, setQuestion] = useState("");
  // const [answer, setAnswer] = useState("");
  // const [ragSources, setRagSources] = useState<Source[]>([]);
  // const [ragLoading, setRagLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/stats").then((r) => r.json()),
      fetch("/api/coc").then((r) => r.json()),
    ])
      .then(([statsData, cocData]) => {
        setStats(statsData);
        setCocRecords(cocData.records || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSearch = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const q = searchQuery.trim();
      if (!q) {
        setSearchResults(null);
        return;
      }
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSearchResults(data);
      } catch (err) {
        console.error("Search failed:", err);
      }
      setSearching(false);
    },
    [searchQuery]
  );

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
  };

  const totalResults = searchResults
    ? Object.values(searchResults).reduce((sum, arr) => sum + arr.length, 0)
    : 0;

  // DEPRECATED: RAG handler (FastAPI port 8000 removed 2026-05-18)
  // const handleAsk = useCallback(...) — disabled pending Next.js migration
  //
  // const handleLoadBrain = useCallback(...) — disabled
  // useEffect(() => { handleLoadBrain(); }, [handleLoadBrain]); — disabled

  const formatRunTime = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const hourStr = String(hours).padStart(2, "0");

    return `${year}-${month}-${day}, ${hourStr}:${minutes} ${ampm}`;
  };

  // DEPRECATED: readybag disabled (FastAPI port 8000 removed 2026-05-18)
  // const [readybagRunning, setReadybagRunning] = useState(false);
  // const handleReadybag = useCallback(async () => { ... }, [handleLoadBrain]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <div
          className="pulse-glow"
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Shield size={24} color="#fff" />
        </div>
      </div>
    );
  }

  const statCards = stats
    ? [
      {
        label: "Total Emails",
        value: stats.totalEmails.toLocaleString(),
        icon: Mail,
        color: "var(--accent-cyan)",
      },
      {
        label: "Unique Senders",
        value: stats.uniqueSenders.toLocaleString(),
        icon: Users,
        color: "var(--accent-purple)",
      },
      {
        label: "Accounts",
        value: stats.uniqueAccounts.toLocaleString(),
        icon: Database,
        color: "var(--accent-emerald)",
      },
      {
        label: "CoC Records",
        value: stats.cocRecords.toLocaleString(),
        icon: Shield,
        color: "var(--accent-orange)",
      },
    ]
    : [];

  return (
    <div className="animate-in">
      {/* Page Header */}
      <div className="page-header">
        <h1>Investigation Dashboard</h1>
        <p>
          Case{" "}
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent-cyan)" }}>
            rowboat-creative / RC-2026
          </span>
        </p>
      </div>

      {/* ═══ Unified Search ═══ */}
      <form
        onSubmit={handleSearch}
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: searchResults ? "1rem" : "2rem",
          alignItems: "center",
        }}
      >
        <div
          style={{
            position: "relative",
            flex: 1,
            maxWidth: 600,
          }}
        >
          <Search
            size={16}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
          <input
            className="input-glass"
            type="text"
            placeholder="Search across all pods — emails, messages, transcripts, legal, players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              paddingLeft: 36,
              fontSize: "0.85rem",
              width: "100%",
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              style={{ // Corrected style block for the button
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: 4,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={searching || !searchQuery.trim()}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: 8,
            border: "1px solid rgba(0,245,212,0.3)",
            background: "rgba(0,245,212,0.1)",
            color: "var(--accent-cyan)",
            cursor: "pointer",
            fontSize: "0.8rem",
            fontWeight: 600,
            opacity: searching || !searchQuery.trim() ? 0.4 : 1,
          }}
        >
          {searching ? "Searching..." : "Search All"}
        </button>
      </form>

      {/* ═══ Search Results ═══ */}
      {searchResults && (
        <div
          className="glass-panel"
          style={{
            padding: "1.25rem",
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Search size={16} style={{ color: "var(--accent-cyan)" }} />
              <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                {totalResults} result{totalResults !== 1 ? "s" : ""} for &ldquo;
                {searchQuery}
                &rdquo;
              </span>
            </div>
            <button
              onClick={clearSearch}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              <X size={16} />
            </button>
          </div>

          {totalResults === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "2rem",
                color: "var(--text-muted)",
                fontSize: "0.85rem",
              }}
            >
              No results found across any pod.
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[
              { key: "emails", label: "Emails", icon: Mail, color: "var(--accent-cyan)" },
              { key: "messages", label: "iMessages", icon: MessageSquare, color: "var(--accent-purple)" },
              { key: "transcripts", label: "Transcripts", icon: Headphones, color: "var(--accent-orange)" },
              { key: "legal", label: "Legal", icon: Scale, color: "var(--accent-red)" },
              { key: "players", label: "Players", icon: Users, color: "var(--accent-emerald)" },
            ].map(({ key, label, icon: Icon, color }) => {
              const items = (searchResults as any)[key];
              if (!items || items.length === 0) return null;
              return (
                <div key={key}>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <Icon size={14} style={{ color }} />
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color,
                      }}
                    >
                      {label}
                    </span>
                    <span
                      style={{
                        fontSize: "0.6rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      ({items.length})
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem",
                    }}
                  >
                    {items.map((item: any) => (
                      <Link
                        key={String(item.id)}
                        href={item.link}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.375rem 0.625rem",
                          borderRadius: 6,
                          background: "rgba(255,255,255,0.02)",
                          borderLeft: `2px solid ${color}`,
                          textDecoration: "none",
                          color: "inherit",
                          transition: "background 0.15s",
                        }}
                      >
                        {item.date && (
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "0.65rem",
                              color: "var(--text-muted)",
                              flexShrink: 0,
                              width: 82,
                            }}
                          >
                            {item.date.slice(0, 10)}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: "0.78rem",
                            color: "var(--text-primary)",
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.title}
                        </span>
                        {item.subtitle && (
                          <span
                            style={{
                              fontSize: "0.65rem",
                              color: "var(--text-muted)",
                              flexShrink: 0,
                              maxWidth: 180,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {item.subtitle}
                          </span>
                        )}
                        <ArrowRight
                          size={12}
                          style={{ color: "var(--text-muted)", flexShrink: 0 }}
                        />
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Hub Navigation ═══ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1.25rem",
          marginBottom: "2rem",
        }}
      >
        {POD_CONFIG.map((hub) => {
          const Icon = hub.icon;
          return (
            <Link
              key={hub.key}
              href={hub.href}
              className="glass-panel"
              style={{
                padding: "1.5rem",
                textDecoration: "none",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                transition: "all 0.2s ease",
                border: "1px solid var(--border-glass)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = hub.color;
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.background = `linear-gradient(135deg, rgba(255,255,255,0.03) 0%, ${hub.color}05 100%)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-glass)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.background = "var(--bg-glass)";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{
                  padding: "0.5rem",
                  borderRadius: "10px",
                  background: `${hub.color}15`,
                  color: hub.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <Icon size={20} />
                </div>
                <ArrowRight size={14} style={{ opacity: 0.3 }} />
              </div>
              <div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                  {hub.label}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                  {hub.description}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="stat-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Icon size={20} color={card.color} style={{ opacity: 0.7 }} />
              </div>
              <div className="stat-value">{card.value}</div>
              <div className="stat-label">{card.label}</div>
            </div>
          );
        })}
      </div>

      {/* Date Range Panel */}
      {stats?.dateRange && (
        <div
          className="glass-panel"
          style={{
            padding: "1.25rem 1.5rem",
            marginBottom: "2rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <Calendar size={20} color="var(--accent-cyan)" style={{ opacity: 0.6 }} />
          <div>
            <div
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-secondary)",
                marginBottom: "0.25rem",
              }}
            >
              Date Coverage
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>
              {stats.dateRange.earliest || "Unknown"} → {stats.dateRange.latest || "Unknown"}
            </div>
          </div>
        </div>
      )}

      {/* Chain of Custody Log */}
      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "1rem",
          }}
        >
          <Activity size={18} color="var(--accent-emerald)" />
          <h3 style={{ margin: 0, fontSize: "1rem" }}>Chain of Custody</h3>
          <span className="badge badge-emerald">Verified</span>
        </div>

        {cocRecords.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>SHA-256</th>
                <th>Rows</th>
                <th>Ingested</th>
              </tr>
            </thead>
            <tbody>
              {cocRecords.map((rec, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
                    {rec.source_path ? rec.source_path.split("/").pop() : "—"}
                  </td>
                  <td
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.7rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {rec.sha256 ? `${rec.sha256.slice(0, 12)}…${rec.sha256.slice(-8)}` : "—"}
                  </td>
                  <td>{rec.row_count?.toLocaleString() || "—"}</td>
                  <td style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    {rec.ingested_at || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            No chain of custody records found.
          </div>
        )}
      </div>

      {/* DISABLED: Forensic RAG Assistant (FastAPI port 8000 removed 2026-05-18) */}
      {/* DISABLED: Brain Status (FastAPI port 8000 removed 2026-05-18) */}
    </div>
  );
}
