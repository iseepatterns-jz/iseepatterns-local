"use client";

import { useEffect, useState, useCallback } from "react";
import {
    ChevronLeft,
    ChevronRight,
    Shield,
    Scale,
    Users,
    AlertTriangle,
    FileText,
    Building2,
    Briefcase,
    Mail,
    MapPin,
    Target,
    Network,
    Gavel,
    BarChart3,
    Clock,
    ArrowRight,
    ExternalLink,
    Maximize2,
    Minimize2,
} from "lucide-react";

/* ═══ Types ═══ */

interface ClaimPlayer {
    claim_id: number;
    player_slug: string;
    player_name: string;
    role: string;
    notes: string;
}

interface ClaimEvidence {
    claim_id: number;
    evidence_id: string;
    evidence_type: string;
    relevance: string;
}

interface Claim {
    id: number;
    slug: string;
    title: string;
    category: string;
    severity: string;
    legal_elements: string[];
    description: string;
    sort_order: number;
    players: ClaimPlayer[];
    evidence: ClaimEvidence[];
}

interface Agency {
    id: number;
    slug: string;
    title: string;
    agency_type: string;
    submission_method: string;
    contact_info: string;
    status: string;
    sort_order: number;
}

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
    summary: string;
    avatar: string | null;
}

interface BriefingData {
    case: { caption: string; caseId: string; client: string; date: string };
    claims: Claim[];
    agencies: Agency[];
    players: Player[];
    stats: {
        emails: number;
        messages: number;
        cocRecords: number;
        claims: number;
        agencies: number;
        players: number;
    };
}

/* ═══ Constants ═══ */

const SEVERITY_COLORS: Record<string, string> = {
    felony: "#e63946",
    misdemeanor: "#f77f00",
    civil: "#7b68ee",
    regulatory: "#48cae4",
};

const CATEGORY_ICONS: Record<string, string> = {
    criminal: "⚖️",
    civil: "📋",
    regulatory: "🏛️",
};

const ROLE_COLORS: Record<string, string> = {
    defendant: "#e63946",
    "co-conspirator": "#f77f00",
    accomplice: "#ef476f",
    witness: "#48cae4",
    victim: "#06d6a0",
};

/* ═══ Key Players for the Conspiracy Network ═══ */
const CONSPIRACY_NETWORK = [
    {
        name: "Lucas Guariglia",
        role: "Primary Subject",
        company: "Rowboat Creative / All World Merch",
        color: "#e63946",
        connections: ["Pamela Visvardis", "Thomas Nitschke", "Leonard Mayersky", "Suzanne Guariglia", "Keith Murphy", "Heather Blaise"],
        x: 50,
        y: 30,
    },
    {
        name: "Pamela Visvardis",
        role: "Sock Puppet Attorney",
        company: "BNI Member",
        color: "#7b68ee",
        connections: ["Lucas Guariglia"],
        x: 15,
        y: 15,
    },
    {
        name: "Thomas Nitschke",
        role: "Conflicted Attorney",
        company: "Blaise & Nitschke, P.C.",
        color: "#7b68ee",
        connections: ["Lucas Guariglia", "Heather Blaise", "Keith Murphy"],
        x: 85,
        y: 15,
    },
    {
        name: "Heather Blaise",
        role: "Conflicted Attorney",
        company: "Blaise & Nitschke, P.C.",
        color: "#7b68ee",
        connections: ["Thomas Nitschke", "Keith Murphy"],
        x: 80,
        y: 50,
    },
    {
        name: "Leonard Mayersky",
        role: "Bank Conspirator",
        company: "Fifth Third Bank",
        color: "#f77f00",
        connections: ["Lucas Guariglia"],
        x: 20,
        y: 55,
    },
    {
        name: "Keith Murphy",
        role: "BNI Referral Conduit",
        company: "MSM Connect, LLC",
        color: "#f77f00",
        connections: ["Lucas Guariglia", "Thomas Nitschke", "Heather Blaise"],
        x: 70,
        y: 70,
    },
    {
        name: "Suzanne Guariglia",
        role: "Identity Fraud / Alias",
        company: "Rowboat Creative",
        color: "#ef476f",
        connections: ["Lucas Guariglia"],
        x: 35,
        y: 70,
    },
];

/* ═══ Whistleblower Timeline ═══ */
const WHISTLEBLOWER_TIMELINE = [
    { date: "2017-10", event: "Keith Murphy (BNI) introduces LG to Heather Blaise", type: "conspiracy" },
    { date: "2018-01", event: "Nitschke thanks LG for lunch, solicits his business", type: "conspiracy" },
    { date: "2018–2022", event: "52 emails document ongoing 5-year Nitschke/LG relationship", type: "evidence" },
    { date: "2022-05", event: "JZ discovers embezzlement — LG redirecting clients to All World Merch", type: "discovery" },
    { date: "2022-10", event: "JZ files whistleblower report with Fifth Third — speaks with Kaya", type: "action" },
    { date: "2022-11", event: "JZ meets Fifth Third banker Cruz Barraza in person at branch", type: "action" },
    { date: "2023-01", event: "JZ reports Leonard Mayersky to Fifth Third corporate compliance", type: "action" },
    { date: "2023-03", event: "LG impersonates attorney Thomas Chandler (Holland Hart LLP) via email", type: "fraud" },
    { date: "2023-05", event: "Blaise & Nitschke accepts JZ $5,000 retainer — conflict NOT disclosed", type: "betrayal" },
    { date: "2023-07", event: "Blaise & Nitschke withdraws from JZ Sprint Nextel case", type: "betrayal" },
    { date: "2023-09-13", event: "Sprint Nextel case DISMISSED for want of prosecution (21 L 9748)", type: "damage" },
    { date: "2023-11", event: "JZ WGN Radio podcast documents case publicly", type: "action" },
    { date: "2024-06", event: "611,044 emails indexed — forensic pattern analysis begins", type: "evidence" },
];

const TIMELINE_COLORS: Record<string, string> = {
    conspiracy: "#7b68ee",
    evidence: "#48cae4",
    discovery: "#06d6a0",
    action: "#00f5d4",
    fraud: "#e63946",
    betrayal: "#f77f00",
    damage: "#ef476f",
};

/* ═══ Helpers ═══ */

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

function getRoleColor(company: string, title: string): string {
    const c = company?.toLowerCase() || "";
    const t = title?.toLowerCase() || "";
    if (c.includes("rowboat") || c.includes("all world")) return "#e63946";
    if (c.includes("fifth third") || c.includes("old national") || t.includes("bank")) return "#f77f00";
    if (t.includes("attorney") || t.includes("partner") || c.includes("blaise") || c.includes("holland")) return "#7b68ee";
    if (c.includes("bni") || c.includes("msm")) return "#06d6a0";
    if (c.includes("spark") || t.includes("account")) return "#48cae4";
    return "#999";
}

function parseJson(s: string | null): string[] {
    if (!s) return [];
    try { return JSON.parse(s); } catch { return []; }
}

function formatNumber(n: number): string {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(0) + "K";
    return n.toString();
}

/* ═══ Component ═══ */

export default function BriefingPage() {
    const [data, setData] = useState<BriefingData | null>(null);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        fetch("/api/briefing")
            .then((r) => r.json())
            .then((d) => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    // Keyboard navigation
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight" || e.key === " ") {
                e.preventDefault();
                setCurrentSlide((s) => Math.min(s + 1, totalSlides - 1));
            }
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                setCurrentSlide((s) => Math.max(s - 1, 0));
            }
            if (e.key === "Home") setCurrentSlide(0);
            if (e.key === "End") setCurrentSlide(totalSlides - 1);
            if (e.key === "Escape" && isFullscreen) setIsFullscreen(false);
            if (e.key === "f" || e.key === "F") setIsFullscreen((f) => !f);
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    });

    const totalSlides = data
        ? 1 + 1 + 1 + (data.claims?.length || 0) + 1 + 1 + 1
        : 7;
    // Slides: Cover, Overview, Key Players, [each charge], Conspiracy Network, Timeline, Next Steps

    const goTo = useCallback((n: number) => setCurrentSlide(Math.max(0, Math.min(n, totalSlides - 1))), [totalSlides]);

    if (loading) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--text-muted)" }}>
                <Shield size={32} style={{ animation: "pulse 1.5s ease-in-out infinite" }} />
                <span style={{ marginLeft: 12, fontSize: "1.125rem" }}>Loading briefing...</span>
            </div>
        );
    }

    if (!data) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--accent-red)" }}>
                <AlertTriangle size={24} />
                <span style={{ marginLeft: 8 }}>Failed to load briefing data</span>
            </div>
        );
    }

    const claims = data.claims || [];
    const agencies = data.agencies || [];
    const players = data.players || [];
    const stats = data.stats;

    /* ── Slide renderers ── */

    const renderCover = () => (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: "2rem" }}>
            <div style={{ width: 80, height: 80, borderRadius: 20, background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 40px rgba(0,245,212,0.3)", marginBottom: "2rem" }}>
                <Shield size={40} color="#fff" />
            </div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 800, background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", lineHeight: 1.15, marginBottom: "0.75rem" }}>
                {data.case.caption}
            </h1>
            <div style={{ fontSize: "1.25rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                Forensic Evidence Briefing
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "2rem" }}>
                Case {data.case.caseId} · {data.case.date}
            </div>
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", justifyContent: "center" }}>
                {[
                    { label: "Charges", value: claims.length, color: "#e63946" },
                    { label: "Emails Indexed", value: stats.emails, color: "var(--accent-cyan)" },
                    { label: "iMessages", value: stats.messages, color: "var(--accent-purple)" },
                    { label: "Players", value: stats.players, color: "var(--accent-orange)" },
                ].map((s) => (
                    <div key={s.label} className="glass-panel" style={{ padding: "1rem 1.5rem", minWidth: 120, textAlign: "center" }}>
                        <div style={{ fontSize: "1.75rem", fontWeight: 800, color: s.color, fontFamily: "var(--font-mono)" }}>
                            {formatNumber(s.value)}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4 }}>
                            {s.label}
                        </div>
                    </div>
                ))}
            </div>
            <div style={{ marginTop: "2.5rem", padding: "0.625rem 1.25rem", background: "rgba(230, 57, 70, 0.1)", border: "1px solid rgba(230, 57, 70, 0.3)", borderRadius: 8, fontSize: "0.75rem", fontWeight: 700, color: "#e63946", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Privileged &amp; Confidential — Attorney Work Product
            </div>
        </div>
    );

    const renderOverview = () => (
        <div style={{ padding: "2.5rem", maxWidth: 900, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
                <Scale size={28} style={{ color: "var(--accent-cyan)" }} />
                <h2 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: "1.75rem" }}>Case Overview</h2>
            </div>
            <div className="glass-panel" style={{ padding: "1.75rem", marginBottom: "1.5rem" }}>
                <p style={{ fontSize: "1rem", lineHeight: 1.8, color: "var(--text-primary)", margin: 0 }}>
                    Joseph Zangrilli (JZ) co-owned <strong>Rowboat Creative LLC</strong> with Lucas Guariglia (LG).
                    Beginning in 2019, LG systematically embezzled company assets — redirecting clients, revenue, and
                    intellectual property to a personally-controlled entity (<strong>All World Merch / All World Agency</strong>)
                    while using company funds for personal expenses including a pizza restaurant venture.
                    His wife, <strong>Suzanne Ronayne Guariglia</strong>, participated in identity fraud, unauthorized
                    access to company email accounts, and Amazon account misappropriation.
                </p>
                <p style={{ fontSize: "1rem", lineHeight: 1.8, color: "var(--text-primary)", margin: "1rem 0 0" }}>
                    LG weaponized a network of <strong>BNI business referral contacts</strong> — attorneys, bankers, and
                    accountants — to obstruct JZ&apos;s remedies, impersonate attorneys, commit wire fraud via &quot;sock puppet&quot;
                    legal communications, and ultimately cause the dismissal of JZ&apos;s unrelated Sprint Nextel case
                    through a conflicted law firm.
                </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
                {[
                    { label: "Criminal Charges", value: claims.filter((c) => c.category === "criminal").length, icon: Gavel, color: "#e63946" },
                    { label: "Civil Claims", value: claims.filter((c) => c.category === "civil").length, icon: FileText, color: "#7b68ee" },
                    { label: "Culpable Parties", value: players.filter((p) => p.profile_type === "person").length, icon: Users, color: "#f77f00" },
                    { label: "Agencies to File", value: agencies.length, icon: Building2, color: "#06d6a0" },
                ].map((item) => (
                    <div key={item.label} className="glass-panel" style={{ padding: "1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <item.icon size={20} style={{ color: item.color, flexShrink: 0 }} />
                        <div>
                            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: item.color, fontFamily: "var(--font-mono)" }}>{item.value}</div>
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderKeyPlayers = () => {
        // Show top 8 most relevant players
        const keyPlayerSlugs = [
            "lucas-guariglia-5258ab19",
            "suzanne-ronayne-b4a717370:",
            "pamela-visvardis",
            "thomasjnitschke",
            "len-mayersky-mba-a57a342",
            "kaseyanton",
            "nicholas-kurz-50182011",
            "ryan-hayes-4a62a627",
        ];
        const keyPlayers = keyPlayerSlugs
            .map((slug) => players.find((p) => p.slug === slug || p.slug.startsWith(slug.replace(/[^a-z0-9-]/g, ''))))
            .filter((p): p is Player => !!p);
        const displayPlayers = keyPlayers.length > 0 ? keyPlayers : players.slice(0, 8);

        return (
            <div style={{ padding: "2rem", maxWidth: 1100, margin: "0 auto" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
                    <Users size={28} style={{ color: "var(--accent-orange)" }} />
                    <h2 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: "1.75rem" }}>Key Players</h2>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" }}>
                    {displayPlayers.map((p) => {
                        const roleColor = getRoleColor(p.company, p.title);
                        const emails = parseJson(p.email_addresses);
                        const aliases = parseJson(p.aliases);
                        return (
                            <div key={p.id} className="glass-panel" style={{ padding: 0, overflow: "hidden", transition: "transform 0.2s, box-shadow 0.2s", cursor: "default" }}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px ${roleColor}22`; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
                            >
                                {/* LinkedIn-style gradient header */}
                                <div style={{ height: 36, background: `linear-gradient(135deg, ${roleColor} 0%, ${roleColor}44 100%)`, position: "relative" }} />

                                <div style={{ padding: "0 1rem 1rem", marginTop: -20 }}>
                                    {/* Avatar */}
                                    <div style={{
                                        width: 56, height: 56, borderRadius: "50%", border: "3px solid var(--bg-surface)",
                                        background: `${roleColor}22`,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        color: roleColor, fontSize: "1.125rem", fontWeight: 700,
                                        boxShadow: "var(--shadow-card)", marginBottom: "0.5rem", overflow: "hidden",
                                        position: "relative", zIndex: 2,
                                    }}>
                                        {p.avatar ? (
                                            <img src={p.avatar} alt={p.display_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                        ) : p.profile_type === "entity" ? (
                                            <Building2 size={22} />
                                        ) : (
                                            getInitials(p.display_name)
                                        )}
                                    </div>

                                    <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--text-primary)" }}>{p.display_name}</div>
                                    {p.title && <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: 2 }}>{p.title}</div>}
                                    {p.company && (
                                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                                            <Briefcase size={10} /> {p.company}
                                        </div>
                                    )}
                                    {p.location && (
                                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                                            <MapPin size={10} /> {p.location}
                                        </div>
                                    )}
                                    {emails.length > 0 && (
                                        <div style={{ fontSize: "0.675rem", color: "var(--accent-cyan)", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                                            <Mail size={10} /> {emails[0]}
                                        </div>
                                    )}
                                    {aliases.length > 0 && (
                                        <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                                            {aliases.map((a: string) => (
                                                <span key={a} style={{ fontSize: "0.6rem", background: "rgba(230,57,70,0.15)", color: "#e63946", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>
                                                    <AlertTriangle size={8} style={{ display: "inline", verticalAlign: "middle", marginRight: 2 }} />{a}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {p.notes && (
                                        <div style={{ fontSize: "0.7rem", color: "var(--accent-orange)", background: "rgba(249,115,22,0.08)", padding: "6px 8px", borderRadius: 6, marginTop: 8, lineHeight: 1.4 }}>
                                            {p.notes}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderCharge = (claim: Claim) => (
        <div style={{ padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${SEVERITY_COLORS[claim.severity] || "#999"}22`, display: "flex", alignItems: "center", justifyContent: "center", color: SEVERITY_COLORS[claim.severity], fontSize: "1.25rem", fontWeight: 800, fontFamily: "var(--font-mono)" }}>
                    {claim.id}
                </div>
                <div>
                    <h2 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: "1.5rem" }}>{claim.title}</h2>
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: 4 }}>
                        <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: `${SEVERITY_COLORS[claim.severity]}22`, color: SEVERITY_COLORS[claim.severity], textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            {claim.severity}
                        </span>
                        <span style={{ fontSize: "0.65rem", fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "var(--bg-glass)", color: "var(--text-secondary)" }}>
                            {CATEGORY_ICONS[claim.category]} {claim.category}
                        </span>
                    </div>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: "1.25rem", marginTop: "1rem", marginBottom: "1rem" }}>
                <p style={{ margin: 0, fontSize: "0.9375rem", lineHeight: 1.7, color: "var(--text-primary)" }}>{claim.description}</p>
            </div>

            {/* Legal Elements */}
            {claim.legal_elements.length > 0 && (
                <div style={{ marginBottom: "1rem" }}>
                    <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                        Required Legal Elements
                    </div>
                    <div style={{ display: "grid", gap: "0.375rem" }}>
                        {claim.legal_elements.map((el, i) => (
                            <div key={i} className="glass-panel" style={{ padding: "0.5rem 0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent-emerald)", boxShadow: "0 0 6px var(--accent-emerald)", flexShrink: 0 }} />
                                <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>{el}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Involved Players */}
            {claim.players.length > 0 && (
                <div style={{ marginBottom: "1rem" }}>
                    <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                        Involved Parties
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        {claim.players.map((p) => (
                            <div key={p.player_slug} className="glass-panel" style={{ padding: "0.375rem 0.75rem", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                                <div style={{ width: 20, height: 20, borderRadius: "50%", background: `${ROLE_COLORS[p.role] || "#999"}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.55rem", fontWeight: 700, color: ROLE_COLORS[p.role] || "#999" }}>
                                    {getInitials(p.player_name)}
                                </div>
                                <span style={{ fontSize: "0.775rem", fontWeight: 600 }}>{p.player_name}</span>
                                <span style={{ fontSize: "0.6rem", padding: "1px 6px", borderRadius: 3, background: `${ROLE_COLORS[p.role] || "#999"}22`, color: ROLE_COLORS[p.role] || "#999", fontWeight: 600 }}>
                                    {p.role}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Evidence */}
            {claim.evidence.length > 0 && (
                <div>
                    <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                        Supporting Evidence
                    </div>
                    <div style={{ display: "grid", gap: "0.375rem" }}>
                        {claim.evidence.map((e, i) => (
                            <div key={i} className="glass-panel" style={{ padding: "0.5rem 0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <FileText size={12} style={{ color: "var(--accent-cyan)", flexShrink: 0 }} />
                                <span style={{ fontSize: "0.775rem", fontFamily: "var(--font-mono)", color: "var(--accent-cyan)" }}>{e.evidence_id}</span>
                                <span style={{ fontSize: "0.675rem", color: "var(--text-muted)" }}>({e.evidence_type})</span>
                                {e.relevance && <span style={{ fontSize: "0.675rem", color: "var(--text-secondary)", marginLeft: "auto" }}>{e.relevance}</span>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const renderConspiracyNetwork = () => (
        <div style={{ padding: "2rem", maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
                <Network size={28} style={{ color: "var(--accent-purple)" }} />
                <h2 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: "1.75rem" }}>BNI Conspiracy Network</h2>
            </div>
            <div className="glass-panel" style={{ padding: "1.5rem", position: "relative", minHeight: 400, overflow: "hidden" }}>
                {/* SVG Connection Lines */}
                <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                    {CONSPIRACY_NETWORK.map((node) =>
                        node.connections.map((targetName) => {
                            const target = CONSPIRACY_NETWORK.find((n) => n.name === targetName);
                            if (!target) return null;
                            return (
                                <line
                                    key={`${node.name}-${targetName}`}
                                    x1={`${node.x}%`} y1={`${node.y}%`}
                                    x2={`${target.x}%`} y2={`${target.y}%`}
                                    stroke={node.color}
                                    strokeWidth="1"
                                    strokeOpacity="0.3"
                                    strokeDasharray="4 4"
                                />
                            );
                        })
                    )}
                </svg>

                {/* Nodes */}
                {CONSPIRACY_NETWORK.map((node) => (
                    <div key={node.name} style={{
                        position: "absolute",
                        left: `${node.x}%`, top: `${node.y}%`,
                        transform: "translate(-50%, -50%)",
                        zIndex: 10,
                    }}>
                        <div className="glass-panel" style={{
                            padding: "0.625rem 0.875rem",
                            textAlign: "center",
                            minWidth: 120,
                            borderColor: `${node.color}44`,
                            transition: "transform 0.2s, box-shadow 0.2s",
                            cursor: "default",
                        }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1.08)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${node.color}33`; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
                        >
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${node.color}22`, border: `2px solid ${node.color}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.375rem", fontSize: "0.7rem", fontWeight: 700, color: node.color }}>
                                {getInitials(node.name)}
                            </div>
                            <div style={{ fontSize: "0.775rem", fontWeight: 700, color: "var(--text-primary)" }}>{node.name}</div>
                            <div style={{ fontSize: "0.6rem", color: node.color, fontWeight: 600, marginTop: 2 }}>{node.role}</div>
                            <div style={{ fontSize: "0.575rem", color: "var(--text-muted)", marginTop: 2 }}>{node.company}</div>
                        </div>
                    </div>
                ))}
            </div>
            <div style={{ marginTop: "0.75rem", fontSize: "0.7rem", color: "var(--text-muted)", textAlign: "center" }}>
                Dashed lines indicate documented communication or referral relationships within the BNI network
            </div>
        </div>
    );

    const renderTimeline = () => (
        <div style={{ padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
                <Clock size={28} style={{ color: "var(--accent-emerald)" }} />
                <h2 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: "1.75rem" }}>Whistleblower Timeline</h2>
            </div>
            <div style={{ position: "relative", paddingLeft: 24 }}>
                {/* Vertical line */}
                <div style={{ position: "absolute", left: 7, top: 0, bottom: 0, width: 2, background: "var(--border-glass)" }} />

                {WHISTLEBLOWER_TIMELINE.map((item, i) => (
                    <div key={i} style={{ position: "relative", marginBottom: "0.75rem", paddingLeft: "1.25rem" }}>
                        <div style={{ position: "absolute", left: -20, top: 6, width: 12, height: 12, borderRadius: "50%", background: TIMELINE_COLORS[item.type] || "#999", boxShadow: `0 0 8px ${TIMELINE_COLORS[item.type] || "#999"}66`, border: "2px solid var(--bg-surface)" }} />
                        <div className="glass-panel" style={{ padding: "0.625rem 0.875rem", display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: TIMELINE_COLORS[item.type], fontWeight: 700, minWidth: 70, flexShrink: 0, marginTop: 2 }}>
                                {item.date}
                            </div>
                            <div style={{ fontSize: "0.8125rem", color: "var(--text-primary)", lineHeight: 1.5, flex: 1 }}>
                                {item.event}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderNextSteps = () => (
        <div style={{ padding: "2rem", maxWidth: 1000, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
                <Target size={28} style={{ color: "var(--accent-red)" }} />
                <h2 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: "1.75rem" }}>Recommended Actions</h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.75rem" }}>
                {agencies.map((a) => {
                    const contact = (() => { try { return JSON.parse(a.contact_info || "{}"); } catch { return {}; } })();
                    const typeColors: Record<string, string> = { federal: "#e63946", state: "#7b68ee", local: "#48cae4" };
                    return (
                        <div key={a.id} className="glass-panel" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span style={{ fontSize: "0.6rem", fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: `${typeColors[a.agency_type] || "#999"}22`, color: typeColors[a.agency_type] || "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    {a.agency_type}
                                </span>
                                <span style={{ fontSize: "0.6rem", fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: "var(--bg-glass)", color: "var(--text-muted)" }}>
                                    {a.submission_method}
                                </span>
                            </div>
                            <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--text-primary)" }}>{a.title}</div>
                            {contact.url && (
                                <a href={contact.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.7rem", color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
                                    <ExternalLink size={10} /> {contact.url.replace(/^https?:\/\//, "").split("/")[0]}
                                </a>
                            )}
                            {contact.phone && (
                                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>📞 {contact.phone}</div>
                            )}
                            {contact.notes && (
                                <div style={{ fontSize: "0.7rem", color: "var(--accent-orange)", background: "rgba(249,115,22,0.08)", padding: "4px 8px", borderRadius: 4 }}>
                                    {contact.notes}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="glass-panel" style={{ padding: "1.25rem", marginTop: "1.5rem", borderColor: "rgba(230,57,70,0.3)" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#e63946", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
                    Priority: RICO Predicate Acts Established
                </div>
                <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
                    The pattern of {claims.length} documented charges across wire fraud, embezzlement, identity deception,
                    attorney impersonation, and coordinated obstruction through the BNI network constitutes
                    sufficient predicate acts for a <strong style={{ color: "var(--text-primary)" }}>RICO</strong> filing
                    under 18 U.S.C. §§ 1961–1968.
                </p>
            </div>
        </div>
    );

    /* ── Slide map ── */

    const getSlide = (idx: number) => {
        if (idx === 0) return renderCover();
        if (idx === 1) return renderOverview();
        if (idx === 2) return renderKeyPlayers();
        if (idx >= 3 && idx < 3 + claims.length) return renderCharge(claims[idx - 3]);
        if (idx === 3 + claims.length) return renderConspiracyNetwork();
        if (idx === 4 + claims.length) return renderTimeline();
        if (idx === 5 + claims.length) return renderNextSteps();
        return null;
    };

    const getSlideLabel = (idx: number): string => {
        if (idx === 0) return "Cover";
        if (idx === 1) return "Overview";
        if (idx === 2) return "Key Players";
        if (idx >= 3 && idx < 3 + claims.length) return `Charge ${claims[idx - 3].id}`;
        if (idx === 3 + claims.length) return "Network";
        if (idx === 4 + claims.length) return "Timeline";
        if (idx === 5 + claims.length) return "Actions";
        return "";
    };

    const containerStyle: React.CSSProperties = isFullscreen
        ? { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: "var(--bg-base)", display: "flex", flexDirection: "column" }
        : { display: "flex", flexDirection: "column", height: "calc(100vh - 2rem)", maxWidth: "100%" };

    return (
        <div style={containerStyle}>
            {/* ── Top Bar ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 1rem", borderBottom: "1px solid var(--border-glass)", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <Shield size={18} style={{ color: "var(--accent-cyan)" }} />
                    <span style={{ fontFamily: "var(--font-heading)", fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        Briefing Room
                    </span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                        {data.case.caption} · {data.case.caseId}
                    </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                        {currentSlide + 1} / {totalSlides}
                    </span>
                    <button onClick={() => setIsFullscreen(!isFullscreen)} className="workbench-action-btn" title={isFullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"} style={{ padding: 6 }}>
                        {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                </div>
            </div>

            {/* ── Slide Content ── */}
            <div style={{ flex: 1, overflow: "auto", position: "relative" }}>
                {getSlide(currentSlide)}
            </div>

            {/* ── Bottom Nav ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 1rem", borderTop: "1px solid var(--border-glass)", flexShrink: 0 }}>
                <button
                    onClick={() => goTo(currentSlide - 1)}
                    disabled={currentSlide === 0}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "0.375rem 0.75rem", borderRadius: 6, border: "1px solid var(--border-glass)", background: currentSlide === 0 ? "transparent" : "var(--bg-glass)", color: currentSlide === 0 ? "var(--text-muted)" : "var(--text-primary)", cursor: currentSlide === 0 ? "default" : "pointer", fontSize: "0.8125rem", fontWeight: 600, opacity: currentSlide === 0 ? 0.3 : 1 }}
                >
                    <ChevronLeft size={16} /> Previous
                </button>

                {/* Progress dots */}
                <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap", justifyContent: "center", maxWidth: "60%" }}>
                    {Array.from({ length: totalSlides }).map((_, i) => (
                        <button
                            key={i}
                            onClick={() => goTo(i)}
                            title={getSlideLabel(i)}
                            style={{
                                width: currentSlide === i ? 24 : 8,
                                height: 8,
                                borderRadius: 4,
                                border: "none",
                                background: currentSlide === i
                                    ? "var(--accent-cyan)"
                                    : i < currentSlide
                                        ? "var(--accent-cyan)"
                                        : "var(--border-glass)",
                                opacity: currentSlide === i ? 1 : i < currentSlide ? 0.5 : 0.3,
                                cursor: "pointer",
                                transition: "all 0.2s",
                                padding: 0,
                            }}
                        />
                    ))}
                </div>

                <button
                    onClick={() => goTo(currentSlide + 1)}
                    disabled={currentSlide === totalSlides - 1}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "0.375rem 0.75rem", borderRadius: 6, border: "none", background: currentSlide === totalSlides - 1 ? "var(--bg-glass)" : "var(--accent-cyan)", color: currentSlide === totalSlides - 1 ? "var(--text-muted)" : "#000", cursor: currentSlide === totalSlides - 1 ? "default" : "pointer", fontSize: "0.8125rem", fontWeight: 600, opacity: currentSlide === totalSlides - 1 ? 0.3 : 1 }}
                >
                    Next <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}
