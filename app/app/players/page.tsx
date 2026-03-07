"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Search,
    Users,
    Building2,
    ExternalLink,
    Mail,
    Phone,
    MapPin,
    Briefcase,
    X,
    Tag,
    ChevronRight,
    AlertTriangle,
} from "lucide-react";

/* ── Types ── */
interface Player {
    id: number;
    slug: string;
    display_name: string;
    title: string;
    company: string;
    location: string;
    profile_type: string;
    skills: string;
    linkedin_url: string;
    aliases: string;
    email_addresses: string;
    phone_numbers: string;
    notes: string;
    summary?: string;
    avatar?: string;
}

/* ── Helpers ── */
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

function getRoleColor(player: Player): string {
    const c = player.company?.toLowerCase() || "";
    const t = player.title?.toLowerCase() || "";
    if (c.includes("rowboat")) return "var(--accent-cyan)";
    if (c.includes("rally") || t.includes("receiver")) return "var(--accent-red)";
    if (c.includes("dragonfly") || c.includes("holland") || t.includes("attorney") || t.includes("partner"))
        return "var(--accent-purple)";
    if (c.includes("mb financial") || c.includes("old national") || c.includes("jpmorgan") || c.includes("fifth third") || t.includes("bank"))
        return "var(--accent-orange)";
    if (c.includes("mueller") || c.includes("spark") || t.includes("account"))
        return "var(--accent-emerald)";
    if (player.profile_type === "entity") return "var(--text-secondary)";
    return "var(--accent-cyan)";
}

function parseJson(s: string | null): string[] {
    if (!s) return [];
    try {
        return JSON.parse(s);
    } catch {
        return [];
    }
}

export default function PlayersPage() {
    const [players, setPlayers] = useState<Player[]>([]);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<"" | "person" | "entity">("");
    const [selected, setSelected] = useState<Player | null>(null);
    const [detail, setDetail] = useState<Player | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchPlayers = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (search) params.set("q", search);
        if (typeFilter) params.set("type", typeFilter);
        try {
            const res = await fetch(`/api/players?${params}`);
            const data = await res.json();
            setPlayers(data.players || []);
        } catch (e) {
            console.error("Failed to fetch players:", e);
        }
        setLoading(false);
    }, [search, typeFilter]);

    useEffect(() => {
        fetchPlayers();
    }, [fetchPlayers]);

    const selectPlayer = async (p: Player) => {
        setSelected(p);
        try {
            const res = await fetch(`/api/players/${encodeURIComponent(p.slug)}`);
            const data = await res.json();
            if (data.player) setDetail(data.player);
        } catch (e) {
            console.error("Failed to fetch player detail:", e);
        }
    };

    const people = players.filter((p) => p.profile_type === "person");
    const entities = players.filter((p) => p.profile_type !== "person");

    return (
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            {/* Header */}
            <div className="page-header">
                <h1 style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <Users size={28} />
                    Players Directory
                </h1>
                <p>LinkedIn profiles and known identities cross-referenced with communications</p>
            </div>

            {/* Search & Filters */}
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", alignItems: "center" }}>
                <div style={{ position: "relative", flex: 1, maxWidth: 400 }}>
                    <Search
                        size={16}
                        style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
                    />
                    <input
                        className="input-glass"
                        placeholder="Search players by name, company, role..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ paddingLeft: 34 }}
                    />
                </div>
                <button
                    className={`workbench-type-tab ${typeFilter === "" ? "active" : ""}`}
                    onClick={() => setTypeFilter("")}
                >
                    All ({players.length})
                </button>
                <button
                    className={`workbench-type-tab ${typeFilter === "person" ? "active" : ""}`}
                    onClick={() => setTypeFilter("person")}
                >
                    <Users size={14} /> People ({people.length})
                </button>
                <button
                    className={`workbench-type-tab ${typeFilter === "entity" ? "active" : ""}`}
                    onClick={() => setTypeFilter("entity")}
                >
                    <Building2 size={14} /> Entities ({entities.length})
                </button>
            </div>

            {/* Content Grid with Detail Panel */}
            <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 380px" : "1fr", gap: "1rem" }}>
                {/* Player Grid */}
                <div className="player-grid">
                    {loading && (
                        <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                            Loading players...
                        </div>
                    )}
                    {!loading && players.length === 0 && (
                        <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                            No players found
                        </div>
                    )}
                    {players.map((p) => {
                        const roleColor = getRoleColor(p);
                        const emails = parseJson(p.email_addresses);
                        const isActive = selected?.id === p.id;
                        return (
                            <div
                                key={p.id}
                                className={`player-card ${isActive ? "active" : ""}`}
                                onClick={() => selectPlayer(p)}
                            >
                                {/* Avatar */}
                                <div
                                    className="player-avatar"
                                    style={{
                                        background: p.avatar ? 'none' : `${roleColor}22`,
                                        border: `1px solid ${roleColor}44`,
                                        color: roleColor,
                                        overflow: 'hidden',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    {p.avatar ? (
                                        <img src={p.avatar} alt={p.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : p.profile_type === "entity" ? (
                                        <Building2 size={18} />
                                    ) : (
                                        getInitials(p.display_name)
                                    )}
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="player-name">{p.display_name}</div>
                                    {p.title && <div className="player-title">{p.title}</div>}
                                    {p.company && (
                                        <div className="player-company">
                                            <Briefcase size={11} /> {p.company}
                                        </div>
                                    )}
                                    {emails.length > 0 && (
                                        <div className="player-email">
                                            <Mail size={10} /> {emails[0]}
                                        </div>
                                    )}
                                </div>

                                {/* Type badge */}
                                <div style={{ alignSelf: "flex-start" }}>
                                    {p.profile_type === "alias" ? (
                                        <span className="badge badge-red" style={{ fontSize: "0.55rem" }}>
                                            <AlertTriangle size={9} /> Alias
                                        </span>
                                    ) : p.profile_type === "entity" ? (
                                        <span className="badge badge-orange" style={{ fontSize: "0.55rem" }}>Org</span>
                                    ) : (
                                        <ChevronRight size={14} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Detail Panel */}
                {selected && detail && (
                    <div className="player-detail-panel glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                        {/* LinkedIn Cover Section */}
                        <div style={{ height: 100, background: `linear-gradient(135deg, ${getRoleColor(detail)} 0%, var(--bg-elevated) 100%)`, position: 'relative' }}>
                            <button
                                className="workbench-action-btn"
                                onClick={() => {
                                    setSelected(null);
                                    setDetail(null);
                                }}
                                style={{ position: 'absolute', right: 12, top: 12, zIndex: 10, background: 'rgba(0,0,0,0.3)', border: 'none', color: '#fff' }}
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {/* Profile Header */}
                        <div style={{ padding: '0 1.5rem 1.5rem', marginTop: -40, position: 'relative' }}>
                            <div style={{
                                width: 100,
                                height: 100,
                                borderRadius: '50%',
                                border: '4px solid var(--bg-surface)',
                                background: detail.avatar ? 'none' : `${getRoleColor(detail)}22`,
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: getRoleColor(detail),
                                fontSize: '2rem',
                                fontWeight: 700,
                                marginBottom: '1rem',
                                boxShadow: 'var(--shadow-card)'
                            }}>
                                {detail.avatar ? (
                                    <img src={detail.avatar} alt={detail.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    getInitials(detail.display_name)
                                )}
                            </div>

                            <h2 style={{ margin: '0 0 0.25rem 0' }}>{detail.display_name}</h2>
                            {detail.title && (
                                <div style={{ color: "var(--text-primary)", fontSize: "0.9375rem", fontWeight: 500 }}>
                                    {detail.title}
                                </div>
                            )}
                            {detail.company && (
                                <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: '2px' }}>
                                    {detail.company}
                                </div>
                            )}
                            {detail.location && (
                                <div style={{ color: "var(--text-muted)", fontSize: "0.8125rem", marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <MapPin size={12} /> {detail.location}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
                                {detail.linkedin_url && (
                                    <a
                                        href={detail.linkedin_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-primary"
                                        style={{ flex: 1, textAlign: 'center', textDecoration: 'none', fontSize: '0.8125rem', padding: '0.625rem' }}
                                    >
                                        View Profile
                                    </a>
                                )}
                                <button className="workbench-ctrl-btn" style={{ flex: 1, justifyContent: 'center', padding: '0.625rem' }}>
                                    Message
                                </button>
                            </div>
                        </div>

                        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-glass)' }}>
                            {/* Rest of the details */}

                            {/* Company */}
                            {detail.company && (
                                <div className="player-detail-row">
                                    <Briefcase size={14} />
                                    <span>{detail.company}</span>
                                </div>
                            )}

                            {/* Location */}
                            {detail.location && (
                                <div className="player-detail-row">
                                    <MapPin size={14} />
                                    <span>{detail.location}</span>
                                </div>
                            )}

                            {/* Emails */}
                            {parseJson(detail.email_addresses).length > 0 && (
                                <div style={{ marginTop: "1rem" }}>
                                    <div className="player-detail-label">
                                        <Mail size={12} /> Known Email Addresses
                                    </div>
                                    {parseJson(detail.email_addresses).map((em: string) => (
                                        <div key={em} className="player-detail-value" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <span>{em}</span>
                                            <a href={`/correlator?email=${encodeURIComponent(em)}`} className="btn-primary" style={{ padding: "0.2rem 0.5rem", fontSize: "0.6rem", textDecoration: "none" }}>See emails</a>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Phone */}
                            {parseJson(detail.phone_numbers).length > 0 && (
                                <div style={{ marginTop: "0.75rem" }}>
                                    <div className="player-detail-label">
                                        <Phone size={12} /> Phone Numbers
                                    </div>
                                    {parseJson(detail.phone_numbers).map((ph: string) => (
                                        <div key={ph} className="player-detail-value" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <span>{ph}</span>
                                            <a href={`/correlator?phone=${encodeURIComponent(ph)}`} className="btn-primary" style={{ padding: "0.2rem 0.5rem", fontSize: "0.6rem", textDecoration: "none" }}>See texts</a>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Skills */}
                            {detail.skills && (
                                <div style={{ marginTop: "0.75rem" }}>
                                    <div className="player-detail-label">
                                        <Tag size={12} /> Skills / Specialties
                                    </div>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "0.25rem" }}>
                                        {detail.skills.split(",").map((s: string) => (
                                            <span key={s.trim()} className="badge badge-cyan" style={{ fontSize: "0.6rem" }}>
                                                {s.trim()}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Summary */}
                            {detail.summary && (
                                <div style={{ marginTop: "0.75rem" }}>
                                    <div className="player-detail-label">Summary</div>
                                    <div style={{ fontSize: "0.775rem", color: "var(--text-secondary)", lineHeight: 1.5, marginTop: "0.25rem" }}>
                                        {detail.summary}
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            {detail.notes && (
                                <div style={{ marginTop: "0.75rem" }}>
                                    <div className="player-detail-label">
                                        <AlertTriangle size={12} /> Notes
                                    </div>
                                    <div style={{
                                        fontSize: "0.775rem",
                                        color: "var(--accent-orange)",
                                        background: "rgba(249, 115, 22, 0.08)",
                                        padding: "0.5rem 0.75rem",
                                        borderRadius: 6,
                                        marginTop: "0.25rem",
                                    }}>
                                        {detail.notes}
                                    </div>
                                </div>
                            )}

                            {/* Aliases */}
                            {parseJson(detail.aliases).length > 0 && (
                                <div style={{ marginTop: "0.75rem" }}>
                                    <div className="player-detail-label">Aliases</div>
                                    {parseJson(detail.aliases).map((a: string) => (
                                        <span key={a} className="badge badge-red" style={{ marginRight: 4, fontSize: "0.6rem" }}>
                                            {a}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* LinkedIn Link */}
                            {detail.linkedin_url && (
                                <a
                                    href={detail.linkedin_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-primary"
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                        marginTop: "1.25rem",
                                        textDecoration: "none",
                                        fontSize: "0.775rem",
                                    }}
                                >
                                    <ExternalLink size={14} /> View LinkedIn Profile
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
